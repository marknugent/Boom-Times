/**
 * CatCloseupCameo — "BONUS EXTREME CAT CLOSEUP" interstitial.
 *
 * Four cat closeup images fill the viewport sequentially.  Each one:
 *   • Fades in over ~12% of its duration
 *   • Holds at full opacity while slowly zooming 100% → 120% (Ken Burns)
 *   • Fades out over the last ~15%, overlapping with the next image
 *
 * Crossfade timing:
 *   IMAGE_DUR    = 2500 ms per image
 *   IMAGE_STRIDE = 2000 ms between starts  (= dur − 500 ms overlap)
 *
 * z-stack (all position:fixed):
 *   z=250-253  cat images (each subsequent on top for correct crossfade layering)
 *   z=254      dark overlay strip so headline text is always readable
 *   z=255      headline + "tap to continue"
 *   z=256      transparent click-catcher
 */
import { useEffect, useRef } from 'react';

const CAMEO_DURATION_MS = 9000;
const IMAGE_DUR         = 2500;   // ms each image is active
const IMAGE_STRIDE      = 2000;   // ms between each image starting

const IMAGES = [
  '/closeup1.png',
  '/closeup2.png',
  '/closeup3.png',
  '/closeup4.png',
];

// Pre-compute delay for each image; last image gets extra 500 ms to avoid
// the final fade-out landing before the cameo auto-dismisses.
const CLOSEUPS = IMAGES.map((src, i) => ({
  src,
  delay: i * IMAGE_STRIDE,
  dur:   i === IMAGES.length - 1 ? IMAGE_DUR + 500 : IMAGE_DUR,
}));

export default function CatCloseupCameo({ onDismiss }) {
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, CAMEO_DURATION_MS);
    return () => clearTimeout(timerRef.current);
  }, []);

  function dismiss() {
    clearTimeout(timerRef.current);
    onDismiss();
  }

  return (
    <>
      {/* ── z=250-253: Cat images — stacked so later ones sit on top ── */}
      {CLOSEUPS.map((img, i) => (
        <div
          key={i}
          className="fixed inset-0 pointer-events-none"
          style={{
            zIndex:    250 + i,
            animation: `cat-closeup ${img.dur}ms ease-in-out ${img.delay}ms both`,
          }}
        >
          <img
            src={img.src}
            alt=""
            draggable={false}
            className="w-full h-full object-cover select-none"
          />
        </div>
      ))}

      {/* ── z=254: Gradient overlay — darkens top so headline pops ──── */}
      <div
        className="fixed inset-x-0 top-0 pointer-events-none"
        style={{
          zIndex:     254,
          height:     '38%',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.70) 0%, transparent 100%)',
        }}
      />

      {/* ── z=255: Headline — tilted 10° and continuously pulsing ────── */}
      <div
        className="fixed inset-x-0 flex flex-col items-center gap-1 pointer-events-none select-none"
        style={{
          top:       '6%',
          zIndex:    255,
          animation: 'cat-headline-pulse 1.3s ease-in-out infinite',
        }}
      >
        <div
          className="font-display text-5xl leading-tight animate-pop-in"
          style={{
            color:      '#fde047',
            textShadow: '0 0 24px rgba(0,0,0,1), 0 3px 10px rgba(0,0,0,1)',
          }}
        >
          🐱 BONUS 🐱
        </div>
        <div
          className="font-display text-5xl leading-tight animate-pop-in"
          style={{
            color:             '#ffffff',
            textShadow:        '0 0 24px rgba(0,0,0,1), 0 3px 10px rgba(0,0,0,1)',
            animationDelay:    '350ms',
            animationFillMode: 'backwards',
          }}
        >
          EXTREME
        </div>
        <div
          className="font-display text-5xl leading-tight animate-pop-in"
          style={{
            color:             '#fde047',
            textShadow:        '0 0 24px rgba(0,0,0,1), 0 3px 10px rgba(0,0,0,1)',
            animationDelay:    '700ms',
            animationFillMode: 'backwards',
          }}
        >
          CAT CLOSEUP
        </div>
      </div>

      {/* ── z=255: Tap hint ─────────────────────────────────────────── */}
      <div
        className="fixed inset-x-0 bottom-10 flex justify-center pointer-events-none select-none"
        style={{ zIndex: 255 }}
      >
        <p className="font-body text-sm text-white/50 tracking-widest uppercase">
          tap to continue
        </p>
      </div>

      {/* ── z=256: Transparent click-catcher ───────────────────────── */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 256 }}
        onPointerDown={dismiss}
      />
    </>
  );
}
