/**
 * DoggieCameo — "BONUS DOGGIE BREAK" interstitial.
 *
 * Five dog images fill the viewport sequentially, each zooming 100→130%
 * (same cat-closeup keyframe) and crossfading with the next.
 *
 * Timing:
 *   IMAGE_DUR    = 2200 ms per image
 *   IMAGE_STRIDE = 1700 ms between starts  (500 ms crossfade overlap)
 *   Total        ≈ 9500 ms
 *
 * z-stack (all position:fixed):
 *   z=250-254  dog images
 *   z=255      gradient overlay so headline text pops
 *   z=256      headline + "tap to continue"
 *   z=257      transparent click-catcher
 */
import { useEffect, useRef } from 'react';

const CAMEO_DURATION_MS = 9500;
const IMAGE_DUR         = 2200;
const IMAGE_STRIDE      = 1700;

const IMAGES = [
  '/dog1.png',
  '/dog2.png',
  '/dog3.png',
  '/dog4.png',
  '/dog5.png',
];

const DOGGIES = IMAGES.map((src, i) => ({
  src,
  delay: i * IMAGE_STRIDE,
  dur:   i === IMAGES.length - 1 ? IMAGE_DUR + 600 : IMAGE_DUR,
}));

export default function DoggieCameo({ onDismiss }) {
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
      {/* ── z=250-254: Dog images — stacked so later ones sit on top ── */}
      {DOGGIES.map((img, i) => (
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

      {/* ── z=255: Gradient overlay — darkens top for headline legibility */}
      <div
        className="fixed inset-x-0 top-0 pointer-events-none"
        style={{
          zIndex:     255,
          height:     '38%',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.70) 0%, transparent 100%)',
        }}
      />

      {/* ── z=256: Headline ─────────────────────────────────────────── */}
      <div
        className="fixed inset-x-0 flex flex-col items-center gap-1 pointer-events-none select-none"
        style={{ top: '6%', zIndex: 256 }}
      >
        <div
          className="font-display text-5xl leading-tight animate-pop-in"
          style={{
            color:      '#fde047',
            textShadow: '0 0 24px rgba(0,0,0,1), 0 3px 10px rgba(0,0,0,1)',
          }}
        >
          🐶 BONUS 🐶
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
          DOGGIE
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
          BREAK! 🎉
        </div>
      </div>

      {/* ── z=256: Tap hint ─────────────────────────────────────────── */}
      <div
        className="fixed inset-x-0 bottom-10 flex justify-center pointer-events-none select-none"
        style={{ zIndex: 256 }}
      >
        <p className="font-body text-sm text-white/50 tracking-widest uppercase">
          tap to continue
        </p>
      </div>

      {/* ── z=257: Transparent click-catcher ───────────────────────── */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 257 }}
        onPointerDown={dismiss}
      />
    </>
  );
}
