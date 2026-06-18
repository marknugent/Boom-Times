/**
 * AwesomeCameo — personalized "<Player> is awesome" bonus screen.
 *
 * Fades in awesome-<player>.png full-screen with the same slow
 * zoom creep as DadIsWatchingCameo, plus confetti drifting down
 * over it for extra sparkle. The poster image already carries
 * the "<PLAYER> IS AWESOME" text — no extra headline needed.
 * Auto-dismisses after 7 seconds.
 *
 * z-stack (all position:fixed):
 *   z=250  the image
 *   z=255  confetti
 */
import { useEffect, useMemo, useRef } from 'react';

const CAMEO_DURATION_MS = 7000;

const CONFETTI_COLORS = [
  '#ff3cac', '#ffd93d', '#06d6a0', '#a855f7', '#ff6b35',
  '#4cc9f0', '#f72585', '#7bf1a8', '#ffbe0b', '#ffffff',
];

const CONFETTI_COUNT = 56;

export default function AwesomeCameo({ player, onDismiss }) {
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, CAMEO_DURATION_MS);
    return () => clearTimeout(timerRef.current);
  }, []);

  const confetti = useMemo(() =>
    Array.from({ length: CONFETTI_COUNT }, () => ({
      left:   `${Math.random() * 100}%`,
      size:   6 + Math.random() * 8,
      color:  CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rot:    `${360 + Math.random() * 360}deg`,
      dur:    `${2.5 + Math.random() * 2.5}s`,
      delay:  `${Math.random() * CAMEO_DURATION_MS / 1000}s`,
      round:  Math.random() < 0.5,
    })), []);

  const src = `/awesome-${player.toLowerCase()}.png`;

  return (
    <>
      {/* ── z=250: Full-screen image with slow zoom ─────────────────── */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex:    250,
          animation: `dad-zoom ${CAMEO_DURATION_MS}ms ease-in-out both`,
        }}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          className="w-full h-full object-cover select-none"
        />
      </div>

      {/* ── z=255: Confetti drifting down ────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 255 }}>
        {confetti.map((c, i) => (
          <div
            key={i}
            className="absolute top-0"
            style={{
              left:       c.left,
              width:      c.size,
              height:     c.size,
              background: c.color,
              borderRadius: c.round ? '50%' : '2px',
              '--rot':    c.rot,
              animation:  `awesome-confetti-fall ${c.dur} linear ${c.delay} infinite backwards`,
            }}
          />
        ))}
      </div>
    </>
  );
}
