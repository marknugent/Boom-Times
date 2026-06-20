/**
 * Payoff screen — full-screen experiment animation + summary.
 *
 * Secret: triple-tap the bottom-left quarter to replay the animation.
 */
import { useEffect, useState, useRef } from 'react';
import { A }             from '../gameReducer.js';
import { playSound, stopSound, playLevelUpSound } from '../sounds.js';
import Beaker            from './Beaker.jsx';
import DancingCat        from './DancingCat.jsx';
import DanceCat          from './DanceCat.jsx';
import FartBombAnimation       from './FartBombAnimation.jsx';
import SlimeExplosionAnimation from './SlimeExplosionAnimation.jsx';
import FuzzBombAnimation       from './FuzzBombAnimation.jsx';
import SmokeBombAnimation      from './SmokeBombAnimation.jsx';
import ToiletAttackAnimation   from './ToiletAttackAnimation.jsx';
import DancePartyAnimation     from './DancePartyAnimation.jsx';
import SpaceLaunchAnimation    from './SpaceLaunchAnimation.jsx';
import UsaAnimation            from './UsaAnimation.jsx';
import BombDetonationAnimation from './BombDetonationAnimation.jsx';
import FireworksEffect   from './FireworksEffect.jsx';
import { TABLE_GROUPS }  from '../progression.js';

const ANIMATION_MAP = {
  'fart-bomb':       FartBombAnimation,
  'slime-explosion': SlimeExplosionAnimation,
  'fuzz-bomb':       FuzzBombAnimation,
  'smoke-bomb':      SmokeBombAnimation,
  'toilet-attack':   ToiletAttackAnimation,
  'dance-party':     DancePartyAnimation,
  'space-launch':    SpaceLaunchAnimation,
  'usa-usa-usa':       UsaAnimation,
  'bomb-detonation':   BombDetonationAnimation,
};

const TRIPLE_TAP_MS = 600;

export default function PayoffScreen({ state, dispatch }) {
  const { round, newUnlock, levelUp } = state;

  // Incrementing this key remounts <PayoffAnim />, restarting the animation
  const [animKey, setAnimKey] = useState(0);

  // Level-up banner — shown only when the player actively tries to move on,
  // so it never cuts into an in-progress animation.
  const [showLevelUp, setShowLevelUp] = useState(false);
  const pendingActionRef = useRef(null);

  function handleNavigate(action) {
    if (levelUp) {
      pendingActionRef.current = action;
      setShowLevelUp(true);
      playLevelUpSound();
    } else {
      dispatch(action);
    }
  }

  // Secret triple-tap bottom-left → replay
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef(null);

  function handleTap(e) {
    const el   = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const cx   = e.clientX ?? e.touches?.[0]?.clientX;
    const cy   = e.clientY ?? e.touches?.[0]?.clientY;
    if (cx == null) return;

    const inBottomLeft =
      cx - rect.left <  rect.width  * 0.5 &&
      cy - rect.top  >  rect.height * 0.75;

    if (!inBottomLeft) {
      tapCountRef.current = 0;
      clearTimeout(tapTimerRef.current);
      return;
    }

    tapCountRef.current += 1;
    clearTimeout(tapTimerRef.current);

    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      // Remount animation + replay sound
      setAnimKey(k => k + 1);
      playSound(round?.experiment.id);
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, TRIPLE_TAP_MS);
    }
  }

  // Play experiment SFX on mount and on replay (animKey bump).
  // Dance-party has no separate SFX — its music IS the payoff sound.
  // Toilet attack fades out after 7 s so it doesn't blare forever.
  useEffect(() => {
    if (!round) return;
    const id = round.experiment.id;
    // dance-party, space-launch, and usa-usa-usa use bgMusic only — no separate SFX
    if (id === 'dance-party' || id === 'space-launch' || id === 'usa-usa-usa') return;
    if (id === 'toilet-attack') {
      playSound(id, { fadeStartMs: 7000, fadeDurationMs: 3000 });
    } else {
      playSound(id);
    }
  }, [animKey, round?.experiment.id]);

  // Background music — use the experiment's bgMusic track if specified,
  // otherwise default to pounce-pop-parade. Stop on unmount.
  // bgMusicDelay (ms) defers start until the animation fires (e.g. space-launch).
  useEffect(() => {
    if (!round) return;
    const track = round.experiment.bgMusic ?? 'pounce-pop-parade';
    const delay = round.experiment.bgMusicDelay ?? 0;
    if (delay > 0) {
      const t = setTimeout(() => playSound(track), delay);
      return () => { clearTimeout(t); stopSound(track); };
    }
    playSound(track);
    return () => stopSound(track);
  }, []);

  if (!round) return null;

  const { experiment, firstAttemptCorrect, answeredCorrectly, totalAttempts } = round;
  // correct = facts eventually answered correctly (= round size, always)
  // total   = every confirmed answer, including re-tries for missed facts
  // e.g. 15 correct, 2 missed → total = 17, shows "15 / 17"
  const correct = answeredCorrectly.length;
  const total   = totalAttempts ?? correct;   // fallback for old saved rounds
  const pct     = total > 0 ? Math.round((correct / total) * 100) : 0;
  const highAcc = pct >= 80;

  const PayoffAnim = ANIMATION_MAP[experiment.id] ?? FartBombAnimation;

  // Level-up screen — replaces the payoff entirely when the player presses a
  // navigation button. Doing it as an early return (not an overlay) means the
  // animation, beaker, and cat all unmount cleanly first.
  if (showLevelUp && levelUp) {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center bg-lab-bg
                   animate-pop-in cursor-pointer select-none"
        onPointerDown={() => {
          dispatch({ type: A.CLEAR_LEVEL_UP });
          if (pendingActionRef.current) {
            dispatch(pendingActionRef.current);
            pendingActionRef.current = null;
          }
        }}
      >
        <FireworksEffect />
        <div className="flex flex-col items-center gap-4 px-8 text-center relative" style={{ zIndex: 2 }}>
          <div style={{ fontSize: '7rem', lineHeight: 1 }}>{levelUp.emoji}</div>
          <div className="font-display text-lab-green text-3xl tracking-widest uppercase">
            Level {levelUp.level} achieved
          </div>
          <div className="font-display text-lab-chalk text-4xl leading-tight">
            {levelUp.name}
          </div>
          <div className="font-body text-lab-chalk/40 text-sm mt-4">
            tap to continue
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full flex flex-col relative overflow-hidden bg-lab-bg"
      onPointerDown={handleTap}
    >
      {/* ── Full-screen animation — key forces full remount on replay ── */}
      <PayoffAnim key={animKey} />

      {/* ── Beaker — same position as QuestionScreen, glowing ── */}
      <div className="absolute z-20 animate-beaker-glow beaker-payoff-glow" style={{ top: 56, left: 16 }}>
        <Beaker fillPercent={100} glow />
      </div>

      {/* ── Dancing cat — bottom-right, ~100 px above the very edge ── */}
      {!experiment.hideCat && (
        <div className="absolute z-50 pointer-events-none" style={{ bottom: 118, right: 0 }}>
          {experiment.danceCat ? <DanceCat size={246} /> : <DancingCat size={246} />}
        </div>
      )}

      {/* ── Overlay content (z-30) ── */}
      <div className="absolute inset-0 z-30 flex flex-col pointer-events-none">

        {/* Unlock notification banner */}
        {newUnlock && (
          <div
            className="pointer-events-auto bg-yellow-400/90 text-[#1a1a00] font-display
                       text-sm px-4 py-2 flex items-center justify-between animate-pop-in
                       cursor-pointer shrink-0"
            onClick={() => dispatch({ type: A.CLEAR_UNLOCK })}
          >
            <span>
              🔓 Unlocked:{' '}
              {newUnlock.tables.length > 0
                ? newUnlock.tables.map(t => `${t}s`).join(' & ')
                : 'Wild Mix!'}{' '}
              tables!
            </span>
            <span className="text-xs opacity-60">tap to dismiss</span>
          </div>
        )}

        {/* Spacer — pushes content to bottom half */}
        <div className="flex-1" />

        {/* Score card + buttons anchored to bottom */}
        <div className="pointer-events-auto flex flex-col items-center gap-4 pb-6 px-4">

          {/* Score card */}
          <div
            className="lab-panel px-6 py-4 text-center backdrop-blur-sm bg-lab-panel/85 animate-pop-in"
            style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}
          >
            <div className={`font-display text-5xl ${highAcc ? 'text-lab-green' : 'text-red-400'}`}>
              {correct} / {total}
            </div>
            <div className="font-body text-sm text-lab-chalk/60 mt-1">
              {pct === 100
                ? `PERFECT BATCH! ⭐`
                : highAcc
                ? `${pct}% — almost perfect batch!`
                : `${pct}% — we'll do better next time.`}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col items-center gap-3 w-full max-w-xs">
            <button
              className="btn-primary w-full text-xl py-5"
              onClick={() => handleNavigate({ type: A.START_ROUND })}
            >
              ANOTHER EXPERIMENT 🧪
            </button>
            <button
              className="btn-secondary w-full text-sm"
              onClick={() => handleNavigate({ type: A.NAVIGATE, screen: 'home' })}
            >
              Take a break
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
