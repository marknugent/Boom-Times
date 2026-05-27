/**
 * FireworksEffect — burst particles for the level-up banner.
 *
 * Renders several "shells" across the overlay, each firing 12 coloured
 * particles radially outward using the firework-particle CSS keyframe.
 * Shells are staggered so they pop one after another rather than all at once.
 */
import { useMemo } from 'react';

const COLORS = [
  '#ff3cac', '#ffd93d', '#4cc9f0', '#7bf1a8',
  '#ffffff',  '#ff6b35', '#a855f7', '#f97316',
];

// Shell origins (% of overlay) + staggered delays (ms)
const SHELLS = [
  { cx: '10%', cy: '15%', delay:   0 },
  { cx: '85%', cy: '10%', delay: 200 },
  { cx: '50%', cy: '22%', delay: 400 },
  { cx: '15%', cy: '65%', delay: 130 },
  { cx: '80%', cy: '60%', delay: 340 },
  { cx: '38%', cy: '80%', delay: 520 },
  { cx: '70%', cy: '82%', delay: 240 },
];

const PARTICLE_COUNT = 12;

function Shell({ cx, cy, delay }) {
  // Randomise particles once on mount — stays stable across re-renders
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
    }), []);   // empty deps — intentional: randomise once

  return (
    <div className="absolute pointer-events-none" style={{ left: cx, top: cy }}>
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width:     p.size,
            height:    p.size,
            background: p.color,
            boxShadow: `0 0 ${p.size + 2}px ${p.color}`,
            '--fx': `${p.fx}px`,
            '--fy': `${p.fy}px`,
            animation: `firework-particle 1.5s ease-out ${delay}ms both`,
          }}
        />
      ))}
    </div>
  );
}

export default function FireworksEffect() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1 }}>
      {SHELLS.map((s, i) => (
        <Shell key={i} cx={s.cx} cy={s.cy} delay={s.delay} />
      ))}
    </div>
  );
}
