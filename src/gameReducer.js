/**
 * Game state reducer.
 *
 * All mutable game state lives here and is managed via useReducer.
 * SRS state and progression state are mirrored in React state and kept
 * in sync with localStorage via their own save functions (called in
 * recordAnswer and recordRoundCompletion).
 *
 * Round lifecycle:
 *   START_ROUND  → build queue, introduce new facts, show first question
 *   KEYPAD_*     → manage input, CONFIRM scores and shows feedback
 *   NEXT_QUESTION→ (dispatched after 800ms feedback delay) move forward or end round
 *   DISMISS_HINT → clear hint overlay, start response timer
 *   NAVIGATE     → switch screens
 */

import {
  loadSRSState,
  saveSRSState,
  recordAnswer,
  buildRoundQueue,
  getRecord,
  parseFactId,
  getEasyTablePreset,
} from './srs.js';

import {
  defaultProgression,
  loadProgression,
  getFactsToIntroduce,
  recordRoundCompletion,
  TABLE_GROUPS,
} from './progression.js';

import {
  getRandomExperiment,
  loadPendingExperiment,
  savePendingExperiment,
  clearPendingExperiment,
  recordShownExperiment,
} from './experiments.js';
import { shouldShowHint, getHintText } from './hints.js';
import { pudge, PUDGE } from './pudge.js';
import { getLevelFromSrs } from './levels.js';
import {
  saveInProgressRound,
  loadInProgressRound,
  clearInProgressRound,
} from './roundPersistence.js';
import { recordCorrectAnswer } from './playStats.js';

// ─────────────────────────────────────────────
// Action type constants
// ─────────────────────────────────────────────

export const A = {
  NAVIGATE:        'NAVIGATE',
  SELECT_PLAYER:   'SELECT_PLAYER',
  START_ROUND:     'START_ROUND',
  KEYPAD_DIGIT:    'KEYPAD_DIGIT',
  KEYPAD_BACK:     'KEYPAD_BACK',
  KEYPAD_CONFIRM:  'KEYPAD_CONFIRM',
  NEXT_QUESTION:   'NEXT_QUESTION',
  DISMISS_HINT:    'DISMISS_HINT',
  DISMISS_SPEECH:  'DISMISS_SPEECH',
  CLEAR_UNLOCK:    'CLEAR_UNLOCK',
  CLEAR_LEVEL_UP:  'CLEAR_LEVEL_UP',
};

// ─────────────────────────────────────────────
// Initial state factory
// ─────────────────────────────────────────────

export function createInitialState() {
  return {
    /** Current screen. */
    screen: 'home',

    /** Which player is currently active. null = player selection shown. */
    currentPlayer: null,

    /** Full SRS records object — loaded when a player is selected. */
    srsState: {},

    /** Progression state — loaded when a player is selected. */
    progression: defaultProgression(),

    // Greet with sleeping Pudge on first load
    speechBubble: { text: pudge.idle(), type: 'reaction' },

    /**
     * Active round state. null when not in a round.
     * {
     *   experiment: object,
     *   upcomingFacts: string[],   — queue of factIds left to answer (re-queued facts are appended)
     *   answeredCorrectly: string[], — factIds correctly answered this round
     *   firstAttemptFacts: string[], — factIds that have been shown at least once (to detect first-attempt)
     *   firstAttemptCorrect: number, — count of facts correct on first presentation
     * }
     */
    round: null,

    /**
     * Active question state. null between questions / on other screens.
     * {
     *   factId: string,
     *   a: number, b: number, answer: number,
     *   startTime: number,       — Date.now() when question became active (after hint dismissed)
     *   input: string,           — digits typed so far (max 3 chars)
     *   feedback: null | { correct: bool, correctAnswer: number, responseTimeMs: number },
     *   showHint: boolean,
     *   hintText: string | null,
     *   hintDismissed: boolean,
     * }
     */
    question: null,

    /** Pudge visual state. */
    pudgeState: PUDGE.ASLEEP,

    // (speechBubble declared above — this comment intentionally replaces the duplicate)

    /**
     * FactIds that already received a hint this session.
     * Stored as plain array for serializability.
     */
    hintsShownThisSession: [],

    /**
     * Set when a new table group just unlocked, cleared after acknowledgement.
     * null | { groupIndex: number, tables: number[] }
     */
    newUnlock: null,

    /**
     * Set when the player levels up during a round, cleared after they
     * acknowledge the banner. null | { level: number, name: string, emoji: string }
     */
    levelUp: null,
  };
}

// ─────────────────────────────────────────────
// In-progress round snapshot builder
// ─────────────────────────────────────────────
// Persistence itself lives in roundPersistence.js (separate module so it
// can depend on sync.js without creating an import cycle back into this file).

function roundSnapshot(round, question, hintsShownThisSession) {
  return {
    upcomingFacts:         round.upcomingFacts,
    answeredCorrectly:     round.answeredCorrectly,
    firstAttemptFacts:     round.firstAttemptFacts,
    firstAttemptCorrect:   round.firstAttemptCorrect,
    totalAttempts:         round.totalAttempts,
    levelAtRoundStart:     round.levelAtRoundStart,
    currentFactId:         question.factId,
    currentIsFirstAttempt: question.isFirstAttemptThisRound,
    hintsShownThisSession,
  };
}

// ─────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────

/**
 * Introduce new facts if needed.
 *
 * For trivially easy tables (1× and 10×) a pre-seeded SRS record is
 * injected so the spaced-repetition engine fast-tracks them to long
 * intervals without boring the player with repeated drilling.
 *
 * @param {string|null} playerName — used for player-namespaced saves
 * @returns {{ progression: object, srsState: object }}
 */
function introduceNewFacts(srsState, progression, playerName = null) {
  const newFacts = getFactsToIntroduce(progression);
  if (newFacts.length === 0) return { progression, srsState };

  // Pre-seed easy tables that haven't been seen yet
  let updatedSrsState = srsState;
  newFacts.forEach(factId => {
    if (getRecord(srsState, factId).timesSeen === 0) {
      const preset = getEasyTablePreset(factId);
      if (preset) {
        updatedSrsState = { ...updatedSrsState, [factId]: preset };
      }
    }
  });
  // Persist any pre-seeded records to localStorage immediately
  if (updatedSrsState !== srsState) {
    saveSRSState(updatedSrsState, playerName);
  }

  const updatedIntroduced = [
    ...new Set([...progression.introducedFacts, ...newFacts]),
  ];
  return {
    progression: { ...progression, introducedFacts: updatedIntroduced },
    srsState: updatedSrsState,
  };
}

/**
 * Build a question object for a given factId.
 * startTime is set to null here — it's started when the hint is dismissed
 * (or immediately if there's no hint).
 */
function buildQuestion(factId, srsState, firstAttemptFacts, hintsShownThisSession) {
  const { a, b, answer } = parseFactId(factId);
  const record = getRecord(srsState, factId);
  const isFirstIntro = record.timesSeen === 0;
  const isFirstAttemptThisRound = !firstAttemptFacts.includes(factId);

  const showHint = shouldShowHint(
    factId,
    record,
    isFirstIntro,
    hintsShownThisSession,
  );
  const hintText = showHint ? getHintText(factId) : null;

  return {
    factId,
    a,
    b,
    answer,
    // Timer starts after hint is dismissed (or immediately)
    startTime: showHint ? null : Date.now(),
    input: '',
    feedback: null,
    isFirstAttemptThisRound,
    showHint,
    hintText,
    hintDismissed: !showHint,
  };
}

// ─────────────────────────────────────────────
// Reducer
// ─────────────────────────────────────────────

export function gameReducer(state, action) {
  switch (action.type) {

    // ── Navigation ─────────────────────────
    case A.NAVIGATE: {
      if (action.screen === 'home') {
        return {
          ...state,
          screen:        'home',
          currentPlayer: null,              // back to player selection
          srsState:      {},
          progression:   defaultProgression(),
          round:         null,
          question:      null,
          pudgeState:    PUDGE.ASLEEP,
          speechBubble:  { text: pudge.idle(), type: 'reaction' },
        };
      }
      return { ...state, screen: action.screen };
    }

    // ── Select player + immediately start (or resume) round ────
    case A.SELECT_PLAYER: {
      const { playerName } = action;

      // Load this player's saved data from localStorage
      const rawSrs         = loadSRSState(playerName);
      const rawProgression = loadProgression(playerName);

      // Resume an in-progress round if one exists and its locked experiment
      // is still intact. srsState is already fully up to date (every answer
      // saves immediately), so no re-introduction of facts is needed here.
      const savedRound       = loadInProgressRound(playerName);
      const resumeExperiment = savedRound ? loadPendingExperiment(playerName) : null;

      if (savedRound && resumeExperiment) {
        // Deliberately NOT calling recordShownExperiment here — it was already
        // recorded once when this experiment was originally picked (below, or
        // in START_ROUND). Re-recording on every resume duplicates the same
        // id into the 2-slot anti-repeat history, degrading "avoid the last
        // 2 distinct experiments" down to "avoid the last 1" — a real bug
        // that fired routinely, since exiting and resuming an unfinished
        // round is completely normal play, not an edge case.
        const question = buildQuestion(
          savedRound.currentFactId,
          rawSrs,
          [],   // overridden below with the persisted flag
          savedRound.hintsShownThisSession ?? [],
        );
        question.isFirstAttemptThisRound = savedRound.currentIsFirstAttempt;

        const round = {
          experiment:          resumeExperiment,
          upcomingFacts:       savedRound.upcomingFacts ?? [],
          answeredCorrectly:   savedRound.answeredCorrectly ?? [],
          firstAttemptFacts:   savedRound.firstAttemptFacts ?? [savedRound.currentFactId],
          firstAttemptCorrect: savedRound.firstAttemptCorrect ?? 0,
          totalAttempts:       savedRound.totalAttempts ?? 0,
          levelAtRoundStart:   savedRound.levelAtRoundStart ?? getLevelFromSrs(rawSrs).level,
        };

        return {
          ...state,
          currentPlayer:         playerName,
          srsState:              rawSrs,
          progression:           rawProgression,
          screen:                'question',
          round,
          question,
          pudgeState:            question.showHint ? PUDGE.HINT : PUDGE.SUSPICIOUS,
          speechBubble:          question.showHint
            ? { text: question.hintText, type: 'hint' }
            : { text: pudge.roundStart(), type: 'reaction' },
          hintsShownThisSession: savedRound.hintsShownThisSession ?? [],
          newUnlock:             null,
        };
      }

      // Introduce new facts and pre-seed easy tables for this player
      const { progression: updatedProgression, srsState: updatedSrsState } =
        introduceNewFacts(rawSrs, rawProgression, playerName);

      const { introducedFacts } = updatedProgression;
      if (introducedFacts.length === 0) return state;

      const queue = buildRoundQueue(updatedSrsState, introducedFacts, 15);
      if (queue.length === 0) return state;

      // Use a locked pending experiment if one exists (prevents gaming payoffs
      // by restarting rounds), otherwise pick a fresh random one and lock it.
      const experiment = loadPendingExperiment(playerName) ?? getRandomExperiment(playerName);
      recordShownExperiment(playerName, experiment.id);
      savePendingExperiment(playerName, experiment);

      const firstFactId = queue[0];

      const round = {
        experiment,
        upcomingFacts:       queue.slice(1),
        answeredCorrectly:   [],
        firstAttemptFacts:   [firstFactId],
        firstAttemptCorrect: 0,
        totalAttempts:       0,
        levelAtRoundStart:   getLevelFromSrs(updatedSrsState).level,
      };

      const question = buildQuestion(
        firstFactId,
        updatedSrsState,
        [],   // firstAttemptFacts snapshot — empty before this fact
        [],   // hintsShownThisSession — fresh session
      );

      const hintsShownThisSession = question.hintText ? [firstFactId] : [];
      saveInProgressRound(playerName, roundSnapshot(round, question, hintsShownThisSession));

      return {
        ...state,
        currentPlayer:         playerName,
        srsState:              updatedSrsState,
        progression:           updatedProgression,
        screen:                'question',
        round,
        question,
        pudgeState:            question.showHint ? PUDGE.HINT : PUDGE.SUSPICIOUS,
        speechBubble:          question.showHint
          ? { text: question.hintText, type: 'hint' }
          : { text: pudge.roundStart(), type: 'reaction' },
        hintsShownThisSession,
        newUnlock:             null,
      };
    }

    // ── Start round ────────────────────────
    case A.START_ROUND: {
      // 1. Introduce new facts (gradual drip), pre-seeding easy tables
      const {
        progression: updatedProgression,
        srsState:    updatedSrsState,
      } = introduceNewFacts(state.srsState, state.progression, state.currentPlayer);

      const { introducedFacts } = updatedProgression;
      if (introducedFacts.length === 0) return state; // nothing to play yet

      // 2. Build the 15-fact queue using the updated SRS state (includes presets)
      const queue = buildRoundQueue(updatedSrsState, introducedFacts, 15);
      if (queue.length === 0) return state;

      // 3. Use locked pending experiment if one exists, otherwise pick fresh
      const experiment =
        loadPendingExperiment(state.currentPlayer) ?? getRandomExperiment(state.currentPlayer);
      recordShownExperiment(state.currentPlayer, experiment.id);
      savePendingExperiment(state.currentPlayer, experiment);

      // 4. Build round state
      const round = {
        experiment,
        upcomingFacts: queue,         // mutable during round (wrongs appended)
        answeredCorrectly: [],        // facts answered correctly this round
        firstAttemptFacts: [],        // facts presented at least once (for first-attempt tracking)
        firstAttemptCorrect: 0,       // first-attempt correct count
        totalAttempts: 0,             // every confirmed answer (correct + re-tries)
        levelAtRoundStart: getLevelFromSrs(updatedSrsState).level,
      };

      // 5. Build first question (use updatedSrsState so hint logic sees presets)
      const firstFactId = queue[0];
      const question = buildQuestion(
        firstFactId,
        updatedSrsState,
        round.firstAttemptFacts,
        state.hintsShownThisSession,
      );

      const newHints = question.hintText
        ? [...state.hintsShownThisSession, firstFactId]
        : state.hintsShownThisSession;

      // Mark first fact as "presented" immediately
      const roundWithFirstFact = {
        ...round,
        firstAttemptFacts: [firstFactId],
        upcomingFacts: queue.slice(1), // consumed; append re-queues here
      };

      saveInProgressRound(state.currentPlayer, roundSnapshot(roundWithFirstFact, question, newHints));

      return {
        ...state,
        screen: 'question',
        srsState:    updatedSrsState,   // carries pre-seeded easy-table records
        progression: updatedProgression,
        round: roundWithFirstFact,
        question,
        pudgeState: question.showHint ? PUDGE.HINT : PUDGE.SUSPICIOUS,
        speechBubble: question.showHint
          ? { text: question.hintText, type: 'hint' }
          : { text: pudge.roundStart(), type: 'reaction' },
        hintsShownThisSession: newHints,
        newUnlock: null,
      };
    }

    // ── Keypad: digit input ─────────────────
    case A.KEYPAD_DIGIT: {
      if (!state.question) return state;
      // Block input while feedback is showing or hint is active
      if (state.question.feedback !== null) return state;
      if (state.question.showHint && !state.question.hintDismissed) return state;
      if (state.question.input.length >= 3) return state;

      return {
        ...state,
        question: {
          ...state.question,
          input: state.question.input + action.digit,
        },
        pudgeState: PUDGE.SUSPICIOUS,
        speechBubble: null,
      };
    }

    // ── Keypad: backspace ───────────────────
    case A.KEYPAD_BACK: {
      if (!state.question) return state;
      if (state.question.feedback !== null) return state;

      return {
        ...state,
        question: {
          ...state.question,
          input: state.question.input.slice(0, -1),
        },
      };
    }

    // ── Keypad: confirm ─────────────────────
    case A.KEYPAD_CONFIRM: {
      if (!state.question) return state;
      if (!state.question.input) return state;          // nothing typed
      if (state.question.feedback !== null) return state; // already submitted

      const { factId, answer, startTime, input, isFirstAttemptThisRound } = state.question;
      const responseTimeMs = Date.now() - (startTime ?? Date.now());
      const playerAnswer   = parseInt(input, 10);
      const correct        = playerAnswer === answer;

      // Update SRS (player-namespaced save)
      const newSrsState = recordAnswer(state.srsState, factId, correct, responseTimeMs, state.currentPlayer);

      // Update round
      let updatedRound = { ...state.round };

      // Count every confirmed answer toward the denominator shown on the payoff screen
      updatedRound.totalAttempts = (updatedRound.totalAttempts ?? 0) + 1;

      if (correct) {
        updatedRound.answeredCorrectly = [...updatedRound.answeredCorrectly, factId];
        if (isFirstAttemptThisRound) {
          updatedRound.firstAttemptCorrect += 1;
        }
        recordCorrectAnswer(state.currentPlayer);

        // Peek ahead and persist what the round will look like once
        // NEXT_QUESTION fires, rather than waiting for that (delayed, timer-
        // driven) dispatch to do it. Without this, the persisted snapshot
        // still points at the just-answered question during the ~2s feedback
        // window — exiting the round in that window and resuming replayed
        // the same question, letting it be answered (and counted) repeatedly.
        // This doesn't touch what's actually rendered — the live feedback
        // animation and the real NEXT_QUESTION transition are unaffected.
        // Scoped to the correct-answer path only — see the else branch below
        // for why the wrong-answer path must NOT do this.
        const peekNextFactId = updatedRound.upcomingFacts[0];
        if (peekNextFactId) {
          const peekQuestion = buildQuestion(
            peekNextFactId,
            newSrsState,
            updatedRound.firstAttemptFacts,   // snapshot without peekNextFactId yet
            state.hintsShownThisSession,
          );
          const peekFirstAttemptFacts = updatedRound.firstAttemptFacts.includes(peekNextFactId)
            ? updatedRound.firstAttemptFacts
            : [...updatedRound.firstAttemptFacts, peekNextFactId];
          const peekHints = peekQuestion.hintText
            ? [...state.hintsShownThisSession, peekNextFactId]
            : state.hintsShownThisSession;

          saveInProgressRound(state.currentPlayer, roundSnapshot(
            { ...updatedRound, upcomingFacts: updatedRound.upcomingFacts.slice(1), firstAttemptFacts: peekFirstAttemptFacts },
            peekQuestion,
            peekHints,
          ));
        } else {
          // No facts left — the round is about to complete. Clear the snapshot
          // so exiting in this window can't resume back into a finished round;
          // it'll just start a fresh one next time instead of stale-repeating.
          clearInProgressRound(state.currentPlayer);
        }
      } else {
        // Re-queue at the end: will be shown again after remaining facts
        if (!updatedRound.upcomingFacts.includes(factId)) {
          updatedRound.upcomingFacts = [...updatedRound.upcomingFacts, factId];
        }
        // Deliberately do NOT touch the persisted round snapshot here. It
        // still points at this same fact as "current" from when it first
        // became current — exactly what we want. Advancing it now (like the
        // correct-answer path does) would let a kid submit a wrong guess,
        // immediately quit during the feedback window, and resume onto a
        // DIFFERENT question — dodging the one they just got wrong. Leaving
        // the old snapshot in place means quitting mid-feedback re-shows the
        // exact same question, whether or not they'd already attempted it.
      }

      return {
        ...state,
        srsState: newSrsState,
        round: updatedRound,
        question: {
          ...state.question,
          feedback: { correct, correctAnswer: answer, responseTimeMs },
        },
        pudgeState: correct ? PUDGE.IMPRESSED : PUDGE.DISGUSTED,
        speechBubble: {
          text: correct ? pudge.correct() : pudge.wrong(),
          type: 'reaction',
        },
      };
    }

    // ── Advance to next question ────────────
    case A.NEXT_QUESTION: {
      if (!state.round) return state;

      const { upcomingFacts, firstAttemptFacts } = state.round;

      // Round complete when no remaining facts to show
      if (upcomingFacts.length === 0) {
        return handleRoundComplete(state);
      }

      const nextFactId = upcomingFacts[0];
      const remainingQueue = upcomingFacts.slice(1);

      // IMPORTANT: build the question using the current firstAttemptFacts BEFORE
      // adding this fact to it — otherwise isFirstAttemptThisRound is always false.
      const question = buildQuestion(
        nextFactId,
        state.srsState,
        firstAttemptFacts,           // snapshot without nextFactId yet
        state.hintsShownThisSession,
      );

      // Now record that this fact has been presented at least once
      const updatedRound = {
        ...state.round,
        upcomingFacts: remainingQueue,
        firstAttemptFacts: firstAttemptFacts.includes(nextFactId)
          ? firstAttemptFacts
          : [...firstAttemptFacts, nextFactId],
      };

      const newHints = question.hintText
        ? [...state.hintsShownThisSession, nextFactId]
        : state.hintsShownThisSession;

      saveInProgressRound(state.currentPlayer, roundSnapshot(updatedRound, question, newHints));

      return {
        ...state,
        round: updatedRound,
        question,
        hintsShownThisSession: newHints,
        pudgeState: question.showHint ? PUDGE.HINT : PUDGE.SUSPICIOUS,
        speechBubble: question.showHint
          ? { text: question.hintText, type: 'hint' }
          : null,
      };
    }

    // ── Dismiss hint overlay ────────────────
    case A.DISMISS_HINT: {
      if (!state.question) return state;
      return {
        ...state,
        question: {
          ...state.question,
          showHint: false,
          hintDismissed: true,
          // Start the response timer now that the hint is gone
          startTime: Date.now(),
        },
        pudgeState: PUDGE.SUSPICIOUS,
        speechBubble: null,
      };
    }

    // ── Dismiss speech bubble ───────────────
    case A.DISMISS_SPEECH: {
      return { ...state, speechBubble: null };
    }

    // ── Clear unlock notification ───────────
    case A.CLEAR_UNLOCK: {
      return { ...state, newUnlock: null };
    }

    // ── Clear level-up banner ───────────────
    case A.CLEAR_LEVEL_UP: {
      return { ...state, levelUp: null };
    }

    default:
      return state;
  }
}

// ─────────────────────────────────────────────
// Round completion handler (internal)
// ─────────────────────────────────────────────

function handleRoundComplete(state) {
  const { round, progression, currentPlayer } = state;
  const correct = round.firstAttemptCorrect;
  const total   = round.answeredCorrectly.length;

  const { progression: newProgression, unlocked, newGroupIndex } =
    recordRoundCompletion(progression, { correct, total }, currentPlayer);

  let newUnlock = null;
  if (unlocked && newGroupIndex !== null) {
    newUnlock = {
      groupIndex: newGroupIndex,
      tables: TABLE_GROUPS[newGroupIndex] ?? [],
    };
  }

  // Round completed — unlock a fresh experiment for next time, and drop the
  // in-progress-round snapshot since there's nothing left to resume.
  clearPendingExperiment(currentPlayer);
  clearInProgressRound(currentPlayer);

  // Detect level-up: compare level at round start with level now
  const newLevelObj = getLevelFromSrs(state.srsState);
  const levelUp = newLevelObj.level > round.levelAtRoundStart ? newLevelObj : null;

  const highAccuracy = total > 0 && correct / total >= 0.8;

  return {
    ...state,
    screen: 'brewing',
    progression: newProgression,
    question: null,
    pudgeState: highAccuracy ? PUDGE.IMPRESSED : PUDGE.DISGUSTED,
    speechBubble: {
      text: highAccuracy ? pudge.highAccuracy() : pudge.lowAccuracy(),
      type: 'reaction',
    },
    newUnlock,
    levelUp,
    hintsShownThisSession: [],
  };
}
