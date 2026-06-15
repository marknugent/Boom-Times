/**
 * SpongeBobCameo — surprise interstitial that fires randomly during gameplay.
 *
 * Four Spongebob GIFs parade across the screen at staggered heights and
 * timings.  Two walk left-to-right, two walk right-to-left (flipped with
 * scaleX(-1)).
 *
 * Layering (all position:fixed, no overflow:hidden):
 *   z=250  dark backdrop
 *   z=251  Spongebob parade
 *   z=252  headline
 *
 * Using fixed siblings rather than overflow:hidden children avoids the
 * browser compositor bug where elements starting off the right edge of
 * an overflow:hidden container are never painted even when animated in.
 *
 * Props:
 *   onDismiss  {() => void}  — called when the cameo ends (auto-dismiss only)
 */
import { useEffect, useRef } from 'react';

const CAMEO_DURATION_MS = 8000;

// keyframe: 'sponge-walk-ltr' or 'sponge-walk-rtl' — hardcoded, no custom props
// flip:     scaleX(-1) so rightward-facing GIFs look correct when walking left
const SPONGEBS = [
  // ── Left → right ─────────────────────────────────────────
  {
    src:      '/spongebob1.gif',
    left:     '-210px',
    top:      '20%',
    keyframe: 'sponge-walk-ltr',
    dur:      5000,
    delay:    300,
    size:     326,   // +10 %
    flip:     false,
  },
  {
    src:      '/spongebob3.gif',
    left:     '-220px',
    top:      '54%',
    keyframe: 'sponge-walk-ltr',
    dur:      5400,
    delay:    1100,
    size:     308,   // +10 %
    flip:     false,
  },
  // ── Right → left ─────────────────────────────────────────
  // layout position is left:0 (inside viewport) so the browser creates
  // a compositing layer; the keyframe's 0% transform pushes the element
  // off-screen right visually, then it crosses leftward.
  {
    src:      '/spongebob2.gif',
    left:     '0px',
    top:      '36%',
    keyframe: 'sponge-walk-rtl',
    dur:      15000,  // slow — gives the GIF animation time to play through
    delay:    0,
    size:     308,   // +10 %
    flip:     true,
  },
  {
    src:      '/spongebob-dance.gif',
    left:     '0px',
    top:      '66%',
    keyframe: 'sponge-walk-rtl',
    // dur extended so the right edge (~60 px in from left) is still
    // clearly on screen when the cameo auto-dismisses at 8000 ms.
    dur:      9000,
    delay:    1700,
    size:     296,   // +10 %
    flip:     true,
  },
  {
    src:      '/spongebob4.gif',
    left:     '-210px',
    top:      '80%',
    keyframe: 'sponge-walk-ltr',
    dur:      5200,
    delay:    2200,
    size:     308,   // +10 %
    flip:     false,
  },
];

export default function SpongeBobCameo({ onDismiss }) {
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, CAMEO_DURATION_MS);
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <>
      {/* ── z=250: Dark backdrop ───────────────────────────────────── */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 250, background: 'rgba(0, 14, 50, 0.88)' }}
      />

      {/* ── z=251: Spongebob parade ────────────────────────────────── */}
      {SPONGEBS.map((sb, i) => (
        <div
          key={`sb-${i}`}
          className="fixed pointer-events-none select-none"
          style={{
            left:      sb.left,
            top:       sb.top,
            zIndex:    251,
            animation: `${sb.keyframe} ${sb.dur}ms ease-in-out ${sb.delay}ms both`,
          }}
        >
          <img
            src={sb.src}
            alt=""
            draggable={false}
            style={{
              width:     sb.size,
              height:    'auto',
              transform: sb.flip ? 'scaleX(-1)' : 'none',
            }}
          />
        </div>
      ))}

      {/* ── z=252: Headline ────────────────────────────────────────── */}
      <div
        className="fixed inset-x-0 flex flex-col items-center gap-1 pointer-events-none select-none"
        style={{ top: '5%', zIndex: 252 }}
      >
        <div
          className="font-display text-5xl leading-tight animate-pop-in"
          style={{
            color:      '#fde047',
            textShadow: '0 0 28px #f59e0b, 0 3px 10px rgba(0,0,0,0.95)',
          }}
        >
          🧽 BONUS 🧽
        </div>
        <div
          className="font-display text-5xl leading-tight animate-pop-in"
          style={{
            color:             '#ffffff',
            textShadow:        '0 0 28px #38bdf8, 0 3px 10px rgba(0,0,0,0.95)',
            animationDelay:    '350ms',
            animationFillMode: 'backwards',
          }}
        >
          SPONGEBOB
        </div>
        <div
          className="font-display text-5xl leading-tight animate-pop-in"
          style={{
            color:             '#fde047',
            textShadow:        '0 0 28px #f59e0b, 0 3px 10px rgba(0,0,0,0.95)',
            animationDelay:    '700ms',
            animationFillMode: 'backwards',
          }}
        >
          BREAK! 🎉
        </div>
      </div>

    </>
  );
}
