/**
 * SRS Engine — simplified SM-2 with response-time weighting.
 *
 * Each fact (e.g. "7x8") tracks:
 *   timesSeen          — total presentations
 *   timesCorrect       — total correct answers
 *   interval           — days until next review
 *   easeFactor         — SM-2 difficulty multiplier (default 2.5, min 1.3)
 *   nextDue            — ISO date string of next scheduled review
 *   avgResponseTime    — rolling average response time (ms); null until first answer
 *   consecutiveCorrect — streak of correct answers (resets on wrong)
 *
 * Response-time tiers:
 *   FAST   < 3 000ms  → full interval advance, ease factor +0.1
 *   MEDIUM 3–6 000ms  → interval × 0.85 modifier, ease factor unchanged
 *   SLOW   > 6 000ms  → interval × 0.65 modifier, ease factor −0.05
 */

import { syncField } from './sync.js';

const SRS_KEY_BASE = 'pudge_srs_v1';

/** Returns the localStorage key for a given player (or the legacy global key). */
function getSrsKey(playerName) {
  return playerName ? `${SRS_KEY_BASE}__${playerName}` : SRS_KEY_BASE;
}

const EASE_DEFAULT = 2.5;
const EASE_MIN = 1.3;
const EASE_MAX = 2.8;

const FAST_MS = 3000;
const SLOW_MS = 6000;

// ─────────────────────────────────────────────
// Fact ID helpers
// ─────────────────────────────────────────────

/** Create a fact ID from two multipliers. */
export function createFactId(a, b) {
  return `${a}x${b}`;
}

/** Parse a fact ID into { a, b, answer }. */
export function parseFactId(id) {
  const [a, b] = id.split('x').map(Number);
  return { a, b, answer: a * b };
}

/** Return all 12 fact IDs for a given table (table×1 through table×12). */
export function getFactIdsForTable(table) {
  return Array.from({ length: 12 }, (_, i) => createFactId(table, i + 1));
}

// ─────────────────────────────────────────────
// Default record
// ─────────────────────────────────────────────

function defaultRecord() {
  return {
    timesSeen: 0,
    timesCorrect: 0,
    interval: 1,
    easeFactor: EASE_DEFAULT,
    nextDue: new Date().toISOString(), // due immediately
    avgResponseTime: null,
    consecutiveCorrect: 0,
  };
}

// ─────────────────────────────────────────────
// localStorage I/O
// ─────────────────────────────────────────────

export function loadSRSState(playerName = null) {
  try {
    const raw = localStorage.getItem(getSrsKey(playerName));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveSRSState(state, playerName = null) {
  try {
    localStorage.setItem(getSrsKey(playerName), JSON.stringify(state));
  } catch (e) {
    console.warn('SRS save failed:', e);
  }
  syncField(playerName, 'srs', state);
}

/** Get record for a fact, returning default if unseen. */
export function getRecord(srsState, factId) {
  return srsState[factId] ?? defaultRecord();
}

// ─────────────────────────────────────────────
// Answer recording
// ─────────────────────────────────────────────

/**
 * Record an answer and return the new SRS state (immutable update).
 * Also persists to localStorage.
 */
export function recordAnswer(srsState, factId, correct, responseTimeMs, playerName = null) {
  const record = { ...getRecord(srsState, factId) };

  record.timesSeen += 1;

  // Rolling average response time (70% old, 30% new)
  record.avgResponseTime =
    record.avgResponseTime === null
      ? responseTimeMs
      : Math.round(record.avgResponseTime * 0.7 + responseTimeMs * 0.3);

  const now = new Date();

  if (correct) {
    record.timesCorrect += 1;
    record.consecutiveCorrect += 1;

    // Interval calculation — first two reps are fixed, then SM-2 scaling
    let newInterval;
    if (record.consecutiveCorrect === 1) {
      newInterval = 1;
    } else if (record.consecutiveCorrect === 2) {
      newInterval = 3;
    } else {
      const speedMod =
        responseTimeMs < FAST_MS ? 1.0 :
        responseTimeMs < SLOW_MS ? 0.85 :
        0.65;
      newInterval = Math.round(record.interval * record.easeFactor * speedMod);
    }

    // Ease factor update based on speed
    if (responseTimeMs < FAST_MS) {
      record.easeFactor = Math.min(EASE_MAX, record.easeFactor + 0.1);
    } else if (responseTimeMs > SLOW_MS) {
      record.easeFactor = Math.max(EASE_MIN, record.easeFactor - 0.05);
    }

    record.interval = Math.max(1, newInterval);

    const due = new Date(now);
    due.setDate(due.getDate() + record.interval);
    record.nextDue = due.toISOString();

  } else {
    // Wrong: reset streak, short interval, penalise ease
    record.consecutiveCorrect = 0;
    record.interval = 1;
    record.easeFactor = Math.max(EASE_MIN, record.easeFactor - 0.2);

    const due = new Date(now);
    due.setDate(due.getDate() + 1);
    record.nextDue = due.toISOString();
  }

  const newState = { ...srsState, [factId]: record };
  saveSRSState(newState, playerName);
  return newState;
}

// ─────────────────────────────────────────────
// Round queue building
// ─────────────────────────────────────────────

/**
 * Priority score for sorting the active pool.
 * Higher score = show sooner.
 * New facts score 0 (handled separately).
 *
 * 1× and 10× tables are de-prioritised because children learn
 * them trivially fast and shouldn't have them crowding out
 * harder facts once they've been seen a couple of times.
 */
function priorityScore(record, factId) {
  if (record.timesSeen === 0) return 0;
  const daysOverdue =
    (Date.now() - new Date(record.nextDue).getTime()) / 86_400_000;

  if (factId) {
    const [a, b] = factId.split('x').map(Number);
    // 1× table: only surfaces when ≈4× more overdue than harder facts
    if (a === 1 || b === 1)  return daysOverdue * 0.25;
    // 10× table: modestly de-prioritised
    if (a === 10 || b === 10) return daysOverdue * 0.55;
  }
  return daysOverdue;
}

/**
 * Pre-seeded SRS record for trivially easy tables (1× and 10×).
 *
 * When these facts are first introduced they receive a head-start on
 * the interval so the SRS pushes them to multi-day gaps much faster.
 * They're still due "today" (nextDue = now) so the kid sees them in
 * the very first session — but after a fast correct answer the next
 * review falls 8–10 days out instead of 1.
 *
 * @param {string} factId  e.g. "1x6" or "10x7"
 * @returns {object|null}  a pre-seeded record, or null for normal tables
 */
export function getEasyTablePreset(factId) {
  const [a, b] = factId.split('x').map(Number);
  const isOne = a === 1 || b === 1;
  const isTen = a === 10 || b === 10;
  if (!isOne && !isTen) return null;

  const now = new Date().toISOString();

  if (isOne) {
    // Treat as already seen twice and answered correctly both times.
    // After this session's fast answer: consecutiveCorrect → 3,
    // newInterval = 3 × 2.7 × 1.0 ≈ 8 days.  Gone for a week+.
    return {
      timesSeen:          2,
      timesCorrect:       2,
      interval:           3,
      easeFactor:         2.7,
      nextDue:            now,          // due today — still shows up
      avgResponseTime:    750,
      consecutiveCorrect: 2,
    };
  }

  // 10× table: treated as seen once.
  // After this session's fast answer: consecutiveCorrect → 2,
  // newInterval = 3 (fixed SM-2 step 2).
  // Session after that: 3 × 2.6 ≈ 8 days.
  return {
    timesSeen:          1,
    timesCorrect:       1,
    interval:           2,
    easeFactor:         2.6,
    nextDue:            now,
    avgResponseTime:    1200,
    consecutiveCorrect: 1,
  };
}

/**
 * Build an ordered list of fact IDs for a round.
 *
 * @param {object}   srsState      — current SRS records
 * @param {string[]} activeFactIds — introduced facts eligible for this round
 * @param {number}   count         — target round length (default 15)
 * @returns {string[]} shuffled selection, length ≤ count
 */
export function buildRoundQueue(srsState, activeFactIds, count = 15) {
  if (activeFactIds.length === 0) return [];

  const scored = activeFactIds.map(id => ({
    id,
    score: priorityScore(getRecord(srsState, id), id),
    isNew: getRecord(srsState, id).timesSeen === 0,
  }));

  const reviews = scored.filter(f => !f.isNew).sort((a, b) => b.score - a.score);
  const newFacts = scored.filter(f => f.isNew);

  // Reserve up to 3 slots for new facts; if reviews can't fill their quota,
  // expand new-fact slots to fill the gap (handles early sessions where
  // all facts are unseen).
  const targetNew    = Math.min(3, newFacts.length);
  const targetReview = count - targetNew;
  const fromReviews  = reviews.slice(0, targetReview);
  // Fill any remaining capacity with new facts
  const fromNew      = newFacts.slice(0, Math.max(targetNew, count - fromReviews.length));

  const selected = [...fromReviews, ...fromNew].slice(0, count);

  // Light shuffle so the queue doesn't feel mechanical
  return shuffleArray(selected.map(f => f.id));
}

// ─────────────────────────────────────────────
// Mastery check
// ─────────────────────────────────────────────

/**
 * A fact is "mastered" once it has been answered correctly and quickly
 * at a multi-day SRS interval with a stable streak.
 */
export function isFactMastered(record) {
  return (
    record.interval >= 3 &&
    record.avgResponseTime !== null &&
    record.avgResponseTime < 4000 &&
    record.consecutiveCorrect >= 2
  );
}

// ─────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────

/** Fisher-Yates shuffle — returns a new array. */
export function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
