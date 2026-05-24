/**
 * Brewing anticipation screen.
 *
 * Shown for ~1.3 s between the last question answer and the payoff screen.
 * The beaker is shown at the round's final fill level with the glowing
 * variant, and the whole assembly quakes with escalating intensity to build
 * tension before the payoff erupts.
 *
 * Auto-dispatches NAVIGATE → 'payoff' after BREW_MS milliseconds.
 */
import { useEffect } from 'react';
import { A } from '../gameReducer.js';
import Beaker from './Beaker.jsx';

const BREW_MS = 1350;

export default function BrewingScreen({ state, dispatch }) {
  const { round } = state;

  // Auto-advance to payoff
  useEffect(() => {
    const t = setTimeout(
      () => dispatch({ type: A.NAVIGATE, screen: 'payoff' }),
      BREW_MS,
    );
    return () => clearTimeout(t);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  if (!round) return null;

  const { experiment, firstAttemptCorrect } = round;
  const denominator = 15;
  const beakerFill  = Math.round((firstAttemptCorrect / denominator) * 100);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden">

      {/* Ambient radial glow — builds toward payoff */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(74,222,128,0.22) 0%, transparent 72%)',
          animation: `brew-glow ${BREW_MS}ms ease-in both`,
        }}
      />

      {/* Secondary halo ring for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 90% 70% at 50% 52%, rgba(74,222,128,0.08) 0%, transparent 65%)',
          animation: `brew-glow ${BREW_MS * 0.8}ms ease-in ${BREW_MS * 0.2}ms both`,
        }}
      />

      {/* Quaking beaker + labels */}
      <div
        className="flex flex-col items-center gap-5 z-10"
        style={{ animation: `quake ${BREW_MS * 0.92}ms ease-in both` }}
      >
        {/* Beaker at round fill, always glowing */}
        <Beaker
          fillPercent={beakerFill}
          ingredient={experiment.ingredient}
          glow
        />

        {/* "BREWING..." headline */}
        <div
          className="font-display text-4xl sm:text-5xl text-lab-green tracking-widest select-none"
          style={{
            animation:       'brew-pulse 0.38s ease-in-out alternate infinite',
            textShadow:      '0 0 18px rgba(74,222,128,0.55)',
          }}
        >
          BREWING...
        </div>

        {/* Experiment name — smaller, subdued */}
        <div className="font-body text-sm text-lab-chalk/40 tracking-wide -mt-1 select-none">
          {experiment.brewingLabel}
        </div>
      </div>
    </div>
  );
}
