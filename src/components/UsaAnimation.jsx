/**
 * USA! USA! USA! payoff animation.
 *
 * Effects:
 *   - Red/white/blue striped backdrop over a navy base
 *   - Fireworks bursts staggered across the full ~10 s runtime
 *   - Four usa*.gif characters bobbing at the screen's corners,
 *     framing — but not covering — the centered video
 *   - nyan.mp4 plays centered, with nyan.mp3 as the soundtrack
 *   - "U... S... A!" chant text, looping, red/white/blue
 *
 * z-layer stack:
 *   z=1   navy base + flag stripes
 *   z=2   fireworks
 *   z=10  corner gifs
 *   z=20  center video
 *   z=30  payoff text
 */
import { useEffect, useMemo, useState } from 'react';

// "U... S... A!" chant cycle — each letter pops in, all hold, then reset.
// Build (pop-in timing) is 15% faster than the original 250/650/1050ms;
// the complete "USA!" holds for 25% less time before resetting.
const CHANT_CYCLE_MS = 2000;
const CHANT_STEPS = [
  { step: 1, at:  215 }, // "U"
  { step: 2, at:  555 }, // "S"
  { step: 3, at:  895 }, // "A!"
  { step: 0, at: 1645 }, // reset (fade out before looping)
];

const CHANT_LETTERS = [
  { text: 'U',  color: '#f87171', glow: 'rgba(248,113,113,0.65)' },
  { text: 'S',  color: '#ffffff', glow: 'rgba(255,255,255,0.65)' },
  { text: 'A!', color: '#60a5fa', glow: 'rgba(96,165,250,0.65)' },
];

const COLORS = ['#b91c1c', '#ffffff', '#3b82f6', '#fde047'];

// Firework shells staggered across the full ~10 s animation.
const SHELLS = [
  { cx: '12%', cy: '14%', delay:    0 },
  { cx: '85%', cy: '10%', delay:  300 },
  { cx: '50%', cy: '20%', delay:  900 },
  { cx: '20%', cy: '70%', delay: 1500 },
  { cx: '80%', cy: '65%', delay: 2200 },
  { cx: '45%', cy: '12%', delay: 3000 },
  { cx: '15%', cy: '40%', delay: 3900 },
  { cx: '88%', cy: '35%', delay: 4800 },
  { cx: '55%', cy: '75%', delay: 5800 },
  { cx: '30%', cy: '18%', delay: 6800 },
  { cx: '75%', cy: '15%', delay: 7800 },
  { cx: '40%', cy: '68%', delay: 8800 },
];

const PARTICLE_COUNT = 12;

function Shell({ cx, cy, delay }) {
  const particles = useMemo(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = (360 / PARTICLE_COUNT) * i + (Math.random() * 14 - 7);
      const rad   = (angle * Math.PI) / 180;
      const dist  = 55 + Math.random() * 90;
      return {
        fx:    Math.cos(rad) * dist,
        fy:    Math.sin(rad) * dist,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size:  4 + Math.random() * 5,
      };
    }), []);

  return (
    <div className="absolute pointer-events-none" style={{ left: cx, top: cy }}>
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width:      p.size,
            height:     p.size,
            background: p.color,
            boxShadow:  `0 0 ${p.size + 2}px ${p.color}`,
            '--fx': `${p.fx}px`,
            '--fy': `${p.fy}px`,
            animation: `firework-particle 1.5s ease-out ${delay}ms both`,
          }}
        />
      ))}
    </div>
  );
}

// ── Corner gifs — frame the video without covering it ──────────────────
const USA_GIFS = [
  { src: '/usa1.gif', style: { width: 260, top:    '3%', left:  '2%' }, bobDur: '0.62s', bobDelay: '0.00s' },
  { src: '/usa2.gif', style: { width: 260, top:    '3%', right: '2%' }, bobDur: '0.58s', bobDelay: '0.15s' },
  // Bottom two sit 100px higher than the top two — in the real game the
  // on-screen buttons eat into the bottom of the screen and would otherwise
  // cover them.
  { src: '/usa3.gif', style: { width: 260, bottom: 'calc(3% + 100px)', left:  '2%' }, bobDur: '0.64s', bobDelay: '0.30s' },
  { src: '/usa4.gif', style: { width: 260, bottom: 'calc(3% + 100px)', right: '2%' }, bobDur: '0.60s', bobDelay: '0.45s' },
];

export default function UsaAnimation() {
  // Chant step: 0 = all hidden, 1 = "U", 2 = "U S", 3 = "U S A!"
  const [chantStep, setChantStep] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timers = [];

    function runCycle() {
      if (cancelled) return;
      setChantStep(0);
      CHANT_STEPS.forEach(({ step, at }) => {
        timers.push(setTimeout(() => !cancelled && setChantStep(step), at));
      });
      timers.push(setTimeout(() => !cancelled && runCycle(), CHANT_CYCLE_MS));
    }
    runCycle();

    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">

      {/* ── Navy base + flag stripes ─────────────────────────────────── */}
      <div className="absolute inset-0" style={{ background: '#0c1445', zIndex: 1 }} />
      <div
        className="absolute inset-0"
        style={{
          zIndex: 1,
          opacity: 0.35,
          background: [
            'repeating-linear-gradient(',
            'to bottom,',
            '#b91c1c 0%, #b91c1c 8%,',
            'transparent 8%, transparent 16%,',
            '#3b82f6 16%, #3b82f6 24%,',
            'transparent 24%, transparent 32%',
            ')',
          ].join(' '),
        }}
      />

      {/* ── Fireworks ────────────────────────────────────────────────── */}
      <div className="absolute inset-0" style={{ zIndex: 2 }}>
        {SHELLS.map((s, i) => (
          <Shell key={i} cx={s.cx} cy={s.cy} delay={s.delay} />
        ))}
      </div>

      {/* ── Corner gifs ──────────────────────────────────────────────── */}
      {USA_GIFS.map((g, i) => (
        <img
          key={`usa-gif-${i}`}
          src={g.src}
          alt=""
          draggable={false}
          className="absolute select-none"
          style={{
            ...g.style,
            zIndex:    10,
            animation: `disco-bob ${g.bobDur} ease-in-out ${g.bobDelay} infinite`,
          }}
        />
      ))}

      {/* ── Center video — shifted up 50px so the on-screen buttons in the
          real game (which eat into the bottom of the screen) obscure less
          of it ────────────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ zIndex: 20, transform: 'translateY(-50px)' }}
      >
        <video
          src="/nyan.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="rounded-xl"
          style={{
            width:     '88%',
            maxHeight: '70%',
            objectFit: 'cover',
            boxShadow: '0 0 0 4px #ffffff, 0 0 0 8px #3b82f6, 0 8px 30px rgba(0,0,0,0.6)',
          }}
        />
      </div>

      {/* ── Payoff text — "U... S... A!" chant, looping ────────────────── */}
      <div
        className="absolute inset-x-0 flex items-center justify-center gap-4"
        style={{ top: 'calc(6% + 150px)', zIndex: 30, transform: 'rotate(-15deg) scale(1.3)' }}
      >
        {CHANT_LETTERS.map((l, i) => (
          <div
            key={l.text}
            className="font-display text-6xl sm:text-7xl leading-tight select-none"
            style={{
              color:      l.color,
              textShadow: `0 2px 10px rgba(0,0,0,0.95), 0 0 24px ${l.glow}`,
              opacity:    chantStep >= i + 1 ? 1 : 0,
              transform:  chantStep >= i + 1 ? 'scale(1)' : 'scale(0.4)',
              transition: 'opacity 0.15s ease-out, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            {l.text}
          </div>
        ))}
      </div>
    </div>
  );
}
