/**
 * Beaker — CSS shape filled from the bottom proportional to accuracy.
 *
 * Props:
 *   fillPercent {number}   — 0–100
 *   dropping    {boolean}  — true briefly after a correct answer
 *   ingredient  {string}   — emoji to drop
 *   glow        {boolean}  — true on PayoffScreen (bright overflow effect)
 */
import { useEffect, useState } from 'react';

export default function Beaker({
  fillPercent = 0,
  dropping = false,
  ingredient = '💧',
  glow = false,
}) {
  const [dropKey, setDropKey] = useState(0);

  useEffect(() => {
    if (dropping) setDropKey(k => k + 1);
  }, [dropping]);

  const clampedFill = Math.max(0, Math.min(100, fillPercent));

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Beaker body */}
      <div className={`relative w-14 h-24 flex flex-col items-center justify-end ${glow ? 'beaker-payoff-glow' : ''}`}>

        {/* Ingredient drop */}
        {dropping && (
          <div
            key={dropKey}
            className="absolute top-0 left-1/2 -translate-x-1/2 z-10 text-lg animate-ingredient-drop pointer-events-none"
          >
            {ingredient}
          </div>
        )}

        {/* Overflow drips — only on payoff */}
        {glow && (
          <>
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-4 bg-lab-green/70 rounded-b-full overflow-drip" style={{ animationDelay: '0ms' }} />
            <div className="absolute -top-1 left-1/3 w-1.5 h-3 bg-lab-green/50 rounded-b-full overflow-drip" style={{ animationDelay: '200ms' }} />
            <div className="absolute -top-2 right-1/3 w-1.5 h-4 bg-lab-green/60 rounded-b-full overflow-drip" style={{ animationDelay: '400ms' }} />
          </>
        )}

        {/* Beaker outline */}
        <div className={`relative w-full h-full overflow-hidden rounded-b-xl border-2 bg-lab-panel ${glow ? 'border-lab-green' : 'border-lab-green/70'}`}>
          {/* Liquid fill */}
          <div
            className={`absolute bottom-0 left-0 right-0 transition-all duration-500 ease-out ${glow ? 'bg-lab-green/70' : 'bg-lab-green/40'}`}
            style={{ height: `${clampedFill}%` }}
          >
            {clampedFill > 0 && (
              <div className={`absolute top-0 left-0 right-0 h-1 rounded-full ${glow ? 'bg-lab-green' : 'bg-lab-green/60'}`} />
            )}
          </div>
        </div>

        {/* Neck / opening */}
        <div className={`absolute -top-1.5 left-1/2 -translate-x-1/2 w-10 h-3 border-t-2 border-x-2 rounded-t-sm bg-transparent ${glow ? 'border-lab-green' : 'border-lab-green/70'}`} />
      </div>

      {/* Percentage label — larger and bolder */}
      <div className={`text-base font-display tabular-nums ${glow ? 'text-lab-green' : 'text-lab-green/80'}`}>
        {clampedFill}%
      </div>
    </div>
  );
}
