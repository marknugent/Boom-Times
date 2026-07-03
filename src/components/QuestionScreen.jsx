/**
 * Question screen — core gameplay loop.
 *
 * Layout:
 *   Beaker       → upper-left  (passive fill indicator)
 *   Question     → upper-right, right-aligned, no "= ?" suffix
 *   Pudge        → lower-left  (eyes face right into screen)
 *   SpeechBubble → floats above Pudge, tail points down toward him
 *
 * Feedback effects:
 *   Correct → hearts flutter up from Pudge + green question text
 *   Wrong   → full-screen red pulse + 😵 face flash + red question text
 */
import { useEffect, useRef, useState } from 'react';
import { A } from '../gameReducer.js';
import { playSound, playWrongAnswerBoop } from '../sounds.js';
import SpongeBobCameo  from './SpongeBobCameo.jsx';
import CatCloseupCameo from './CatCloseupCameo.jsx';
import DoggieCameo          from './DoggieCameo.jsx';
import DadIsWatchingCameo   from './DadIsWatchingCameo.jsx';
import AwesomeCameo         from './AwesomeCameo.jsx';
import TrainDogCameo        from './TrainDogCameo.jsx';
import HotStreakBanner from './HotStreakBanner.jsx';
import { TEST_PLAYER, VISIBLE_PLAYERS } from '../players.js';
import Keypad       from './Keypad.jsx';
import Beaker       from './Beaker.jsx';
import Pudge        from './Pudge.jsx';
import SpeechBubble from './SpeechBubble.jsx';

const CORRECT_FEEDBACK_MS = 2000;
const WRONG_FEEDBACK_MS   = 5250;

// Hearts that flutter up from Pudge on a correct answer.
// Positions are % of the main area — calibrated to float from Pudge's body.
const HEARTS = [
  { left: '12%', bottom: '58%', delay:   '0ms', emoji: '🧡', size: '2rem'   },
  { left: '22%', bottom: '65%', delay: '110ms', emoji: '❤️', size: '2.4rem' },
  { left:  '7%', bottom: '62%', delay: '220ms', emoji: '🧡', size: '1.7rem' },
  { left: '30%', bottom: '58%', delay:  '55ms', emoji: '💛', size: '2rem'   },
  { left: '18%', bottom: '70%', delay: '170ms', emoji: '❤️', size: '1.5rem' },
];

export default function QuestionScreen({ state, dispatch }) {
  const { round, question, pudgeState, speechBubble, currentPlayer } = state;

  // Display name for the brewing label — uppercase, "TEST" for test profile
  const playerLabel = currentPlayer === TEST_PLAYER
    ? 'TEST'
    : (currentPlayer ?? '').toUpperCase();

  // null | 'spongebob' | 'cat' — which bonus cameo is currently showing
  const [activeCameo, setActiveCameo] = useState(null);

  // Hot streak tracking — ref so incrementing doesn't cause re-renders
  const streakRef              = useRef(0);
  const [streakCount, setStreakCount] = useState(0); // shown in banner
  const [showStreak,  setShowStreak]  = useState(false);

  // Bonus cameo "pity timer" — ref so incrementing doesn't cause re-renders.
  // Tracks correct answers since the last bonus cameo; the longer the dry
  // spell, the higher the chance, so no one goes too long without a bonus.
  const sinceBonusRef = useRef(0);

  const feedbackTimerRef = useRef(null);
  const hintTimerRef     = useRef(null);

  // Play correct / wrong sound as soon as feedback lands
  useEffect(() => {
    if (!question?.feedback) return;
    if (question.feedback.correct) {
      playSound('success');
    } else {
      playWrongAnswerBoop();
    }
  }, [question?.feedback]);

  // Auto-advance after feedback delay.
  // Also tracks hot streak and randomly triggers bonus cameos.
  useEffect(() => {
    if (!question?.feedback) return;

    if (question.feedback.correct) {
      // Track streak; fire banner on every multiple of 5
      streakRef.current += 1;
      if (streakRef.current % 5 === 0) {
        setStreakCount(streakRef.current);
        setShowStreak(true);
        playSound('success-beep');
      }

      // Bonus cameo chance — 18% baseline, with a "pity timer" floor that
      // ramps up the odds the longer the player goes without one.
      sinceBonusRef.current += 1;
      const bonusChance =
        sinceBonusRef.current < 8  ? 0.18 :
        sinceBonusRef.current < 15 ? 0.30 :
        0.75;

      if (Math.random() < bonusChance) {
        sinceBonusRef.current = 0;
        // "<player> is awesome" is only valid for Louisa/Marjorie, not the test profile
        const cameoPool = VISIBLE_PLAYERS.includes(currentPlayer)
          ? ['spongebob', 'cat', 'doggie', 'dad', 'awesome', 'traindog']
          : ['spongebob', 'cat', 'doggie', 'dad', 'traindog'];
        const pick = cameoPool[Math.floor(Math.random() * cameoPool.length)];
        setActiveCameo(pick);
        // traindog has no separate SFX — its video audio track is muted for
        // reliable autoplay, and it doesn't need a sting on top of that.
        const sfx  = { spongebob: 'fanfare', cat: 'meow', doggie: 'barking', dad: 'creepy', awesome: 'awesome' };
        playSound(sfx[pick]);
        return; // cameo's onDismiss fires NEXT_QUESTION when it ends
      }
    } else {
      // Wrong answer — reset streak
      streakRef.current = 0;
    }

    const delay = question.feedback.correct ? CORRECT_FEEDBACK_MS : WRONG_FEEDBACK_MS;
    feedbackTimerRef.current = setTimeout(
      () => dispatch({ type: A.NEXT_QUESTION }),
      delay,
    );
    return () => clearTimeout(feedbackTimerRef.current);
  }, [question?.feedback]);

  // Auto-dismiss hint after 5 s
  useEffect(() => {
    if (!question?.showHint || question?.hintDismissed) return;
    hintTimerRef.current = setTimeout(
      () => dispatch({ type: A.DISMISS_HINT }),
      5000,
    );
    return () => clearTimeout(hintTimerRef.current);
  }, [question?.showHint, question?.hintDismissed]);

  if (!round || !question) return null;

  const { experiment, firstAttemptCorrect, answeredCorrectly } = round;
  const denominator     = 15;
  const beakerFill      = Math.round((answeredCorrectly.length / denominator) * 100);

  const hasFeedback     = question.feedback !== null;
  const feedbackOk      = hasFeedback && question.feedback.correct;
  const feedbackBad     = hasFeedback && !question.feedback.correct;
  const showHintOverlay = question.showHint && !question.hintDismissed;

  const questionColor = hasFeedback
    ? feedbackOk  ? 'text-lab-green'
    : feedbackBad ? 'text-red-400'
    : 'text-lab-chalk'
    : 'text-lab-chalk';

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative">

      {/* ── Full-screen wrong-answer effects (fixed so they cover keypad too) ── */}
      {feedbackBad && (
        <>
          {/* Red pulse */}
          <div className="fixed inset-0 bg-red-600 pointer-events-none animate-wrong-pulse" style={{ zIndex: 200 }} />
          {/* 😵 face */}
          <div
            className="fixed inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 201, paddingBottom: '3vh' }}
          >
            <div className="select-none animate-wrong-face" style={{ fontSize: '7rem', lineHeight: 1 }}>
              😵
            </div>
          </div>
        </>
      )}

      {/* ── Top bar ─────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-4 pt-3 pb-1">
        <div className="font-body text-sm text-lab-chalk/50 tracking-wide">
          {playerLabel} is brewing: {experiment.name} 🧪
        </div>
        <div className="flex items-center gap-3">
          <div className="font-body text-xs text-lab-chalk/40">
            {answeredCorrectly.length} / {denominator} done
          </div>
          {/* Exit — large enough tap target, visible but not distracting */}
          <button
            className="font-body text-xl text-lab-chalk/50 hover:text-lab-chalk/90
                       transition-colors leading-none px-2 py-1"
            onClick={() => dispatch({ type: A.NAVIGATE, screen: 'home' })}
            aria-label="Exit round"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 relative min-h-0">

        {/* Beaker — upper-left */}
        <div className="absolute top-3 left-4 z-10">
          <Beaker
            fillPercent={beakerFill}
            dropping={feedbackOk}
            ingredient={experiment.ingredient}
          />
        </div>

        {/* Question — upper-right, right-aligned, no "= ?" */}
        <div className="absolute top-16 right-16 z-10 text-right pointer-events-none">
          <div className={`font-display leading-none select-none text-[5.5rem] sm:text-7xl ${questionColor}`}>
            {question.a} × {question.b}
          </div>
          {/* Wrong-answer reveal sits right below the question */}
          <div className="h-10 mt-2 flex items-center justify-end">
            {feedbackBad && (
              <span className="font-display text-2xl text-red-400 animate-answer-flash">
                = {question.answer}
              </span>
            )}
          </div>
        </div>

        {/* Hearts fluttering up on correct answer */}
        {feedbackOk && HEARTS.map((h, i) => (
          <div
            key={i}
            className="absolute select-none pointer-events-none"
            style={{
              bottom:    h.bottom,
              left:      h.left,
              fontSize:  h.size,
              zIndex:    50,
              animation: `heart-float 1.6s ease-out ${h.delay} forwards`,
            }}
          >
            {h.emoji}
          </div>
        ))}

        {/* Dark overlay when hint is active */}
        {showHintOverlay && (
          <div
            className="absolute inset-0 z-20"
            onClick={() => dispatch({ type: A.DISMISS_HINT })}
          />
        )}

        {/* Reaction bubble — sibling of Pudge so it's never clipped by
            portrait-oriented images that overflow the main area height.
            Pinned to a safe absolute position; tail points down toward Pudge. */}
        {speechBubble && !showHintOverlay && (
          <div className="absolute bottom-[36%] right-12 z-40 animate-pop-in max-w-[260px]">
            <SpeechBubble
              text={speechBubble.text}
              type={speechBubble.type}
              side="left"
              onDismiss={() => dispatch({ type: A.DISMISS_SPEECH })}
            />
          </div>
        )}

        {/* Hint bubble — above the dark overlay (z-40 > z-20) */}
        {showHintOverlay && (
          <div
            className="absolute bottom-[36%] right-4 z-40 animate-pop-in max-w-[260px]"
            onClick={() => dispatch({ type: A.DISMISS_HINT })}
          >
            <SpeechBubble
              text={question.hintText}
              type="hint"
              side="left"
              onDismiss={() => dispatch({ type: A.DISMISS_HINT })}
            />
            <p className="text-xs text-lab-chalk/40 mt-2">tap to dismiss</p>
          </div>
        )}

        {/* Pudge — lower-left. Portrait-orientation poses may extend above the
            main area top; that's fine — his body stays visible at the bottom.
            On correct answers (impressed) he's nudged 12 px left and scaled
            down 7 % so the wider pose doesn't crowd the layout. */}
        <div
          className="absolute bottom-3 z-30"
          style={{ left: pudgeState === 'impressed' ? 'calc(8% - 12px)' : '8%' }}
        >
          <Pudge
            state={pudgeState}
            size="md"
            widthPx={pudgeState === 'impressed' ? 335 : undefined}
          />
        </div>
      </div>

      {/* ── Hot streak banner (non-blocking) ── */}
      {showStreak && (
        <HotStreakBanner
          streakCount={streakCount}
          onDismiss={() => setShowStreak(false)}
        />
      )}

      {/* ── Bonus cameo interstitials ── */}
      {activeCameo === 'spongebob' && (
        <SpongeBobCameo
          onDismiss={() => { setActiveCameo(null); dispatch({ type: A.NEXT_QUESTION }); }}
        />
      )}
      {activeCameo === 'cat' && (
        <CatCloseupCameo
          onDismiss={() => { setActiveCameo(null); dispatch({ type: A.NEXT_QUESTION }); }}
        />
      )}
      {activeCameo === 'doggie' && (
        <DoggieCameo
          onDismiss={() => { setActiveCameo(null); dispatch({ type: A.NEXT_QUESTION }); }}
        />
      )}
      {activeCameo === 'dad' && (
        <DadIsWatchingCameo
          onDismiss={() => { setActiveCameo(null); dispatch({ type: A.NEXT_QUESTION }); }}
        />
      )}
      {activeCameo === 'awesome' && (
        <AwesomeCameo
          player={currentPlayer}
          onDismiss={() => { setActiveCameo(null); dispatch({ type: A.NEXT_QUESTION }); }}
        />
      )}
      {activeCameo === 'traindog' && (
        <TrainDogCameo
          onDismiss={() => { setActiveCameo(null); dispatch({ type: A.NEXT_QUESTION }); }}
        />
      )}

      {/* ── Answer display + keypad ── */}
      <div className="shrink-0 flex flex-col items-center gap-3 px-4 pb-10 pt-2">
        <div
          className={[
            'lab-panel w-full max-w-[320px] h-16 flex items-center justify-center',
            'font-display text-5xl tracking-widest',
            feedbackOk  ? 'border-lab-green text-lab-green' : '',
            feedbackBad ? 'border-red-500/60 text-red-400'  : '',
          ].join(' ')}
        >
          {question.input
            ? question.input
            : <span className="text-lab-chalk/20 text-3xl">_ _ _</span>
          }
        </div>

        <Keypad
          onDigit={(d) => dispatch({ type: A.KEYPAD_DIGIT, digit: d })}
          onBack={() => dispatch({ type: A.KEYPAD_BACK })}
          onConfirm={() => dispatch({ type: A.KEYPAD_CONFIRM })}
          disabled={hasFeedback || showHintOverlay}
        />
      </div>
    </div>
  );
}
