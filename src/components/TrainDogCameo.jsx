/**
 * TrainDogCameo — "TRAIN DOG BREAK!" interstitial.
 *
 * train-dog.mp4 plays full-bleed (object-cover) for 11 s, muted/looped for
 * reliable autoplay on iOS. Headline sits in the bottom third, skewed and
 * blinking.
 */
import { useEffect, useRef } from 'react';

const CAMEO_DURATION_MS = 11000;

export default function TrainDogCameo({ onDismiss }) {
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, CAMEO_DURATION_MS);
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <>
      {/* ── z=250: Video — scaled to cover the full viewport ── */}
      <video
        src="/train-dog.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover pointer-events-none select-none"
        style={{ zIndex: 250 }}
      />

      {/* ── z=251: Gradient overlay — darkens bottom third for legibility */}
      <div
        className="fixed inset-x-0 bottom-0 pointer-events-none"
        style={{
          zIndex:     251,
          height:     '38%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)',
        }}
      />

      {/* ── z=252: Headline — bottom third, skewed + blinking ── */}
      <div
        className="fixed inset-x-0 flex items-center justify-center pointer-events-none select-none"
        style={{ zIndex: 252, bottom: 'calc(8% + 90px)' }}
      >
        <div
          className="font-display text-5xl text-center leading-tight"
          style={{
            color:      '#fde047',
            textShadow: '0 0 24px rgba(0,0,0,1), 0 3px 10px rgba(0,0,0,1)',
            transform:  'skewX(-8deg) rotate(-2deg)',
            animation:  'headline-blink 1.1s ease-in-out 400ms infinite',
          }}
        >
          TRAIN DOG BREAK!
        </div>
      </div>
    </>
  );
}
