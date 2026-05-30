/**
 * Fuzz Bomb payoff animation.
 *
 * Phase 0 (0–480 ms):   🧶 yarn ball pops in, wobbles, then detonates
 * Phase 1 (0–240 ms):   Dense fuzz burst from centre (all 360°)
 * Phase 2 (50–2030 ms): Secondary fuzz wave, slower linger
 * Phase 3 (0–180 ms):   Close-range inner fill
 * Phase 4 (250–2050 ms): Fuzz pieces rain from screen top
 * Background:            10 rapid rainbow flashes cycle through the screen
 * Shake:                 Whole container quakes at t=0 for the detonation hit
 */

// ── Vibrant confetti palette ──────────────────────────────────────────
const COLORS = [
  '#ff3cac', // hot pink
  '#ffd93d', // vivid yellow
  '#06d6a0', // mint green
  '#a855f7', // purple
  '#ff6b35', // orange
  '#4cc9f0', // electric cyan
  '#f72585', // magenta
  '#7bf1a8', // light green
  '#ff9f1c', // warm amber
  '#ffffff', // white
  '#b5179e', // deep fuchsia
  '#48cae4', // sky blue
  '#ffbe0b', // gold
  '#8338ec', // violet
  '#ff595e', // coral red
];

// ── SVG shape types — fuzzy/woolly replacements ───────────────────────
// pompom: spiky circle (like a yarn pompom)
// strand: wavy bezier path (loose yarn strand)
// circle: soft dot
// squiggle: wiggly line (already yarn-like)
// curl:   curled yarn hook
// star:   spiky — fuzz has pointy bits too
// tuft:   cluster of small soft dots
// blob:   irregular organic rounded shape
const SHAPE_TYPES = ['pompom', 'strand', 'circle', 'squiggle', 'curl', 'star', 'tuft', 'blob'];

function Shape({ type, color }) {
  switch (type) {
    case 'pompom':
      // Circle core with 8 short radiating spikes
      return (
        <g>
          <circle cx="0" cy="0" r="6" fill={color} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
            const rad = (deg * Math.PI) / 180;
            return (
              <line
                key={i}
                x1={Math.cos(rad) * 6}  y1={Math.sin(rad) * 6}
                x2={Math.cos(rad) * 13} y2={Math.sin(rad) * 13}
                stroke={color} strokeWidth="2.5" strokeLinecap="round"
              />
            );
          })}
        </g>
      );
    case 'strand':
      // Wavy yarn strand — bezier S-curve
      return (
        <path
          stroke={color} strokeWidth="3.5" strokeLinecap="round" fill="none"
          d="M-12,-4 C-6,-13 2,5 8,-6 C11,-12 13,0 11,7"
        />
      );
    case 'circle':
      return <circle cx="0" cy="0" r="8" fill={color} />;
    case 'squiggle':
      return (
        <path
          stroke={color} strokeWidth="3.5" strokeLinecap="round" fill="none"
          d="M-10,0 Q-5,-8 0,0 Q5,8 10,0"
        />
      );
    case 'curl':
      // Curled yarn loop
      return (
        <path
          stroke={color} strokeWidth="3" strokeLinecap="round" fill="none"
          d="M-7,8 C-9,-6 9,-6 7,5 C5,14 -4,13 -3,6"
        />
      );
    case 'star':
      return (
        <path
          fill={color}
          d="M0,-11 L2.6,-3.6 L10.5,-3.4 L4.2,1.3 L6.5,8.9 L0,4.4 L-6.5,8.9 L-4.2,1.3 L-10.5,-3.4 L-2.6,-3.6 Z"
        />
      );
    case 'tuft':
      // Small cluster of fuzz dots — like a pulled-apart pompom
      return (
        <g fill={color}>
          <circle cx="0"  cy="-7" r="4"   />
          <circle cx="-6" cy="3"  r="3.5" />
          <circle cx="6"  cy="3"  r="3.5" />
          <circle cx="0"  cy="2"  r="3"   />
        </g>
      );
    case 'blob':
      // Irregular organic blob — no hard edges
      return (
        <path
          fill={color}
          d="M0,-11 C6,-11 13,-4 11,3 C9,9 4,13 0,12 C-4,12 -11,7 -11,0 C-11,-7 -6,-11 0,-11 Z"
        />
      );
    default:
      return <circle cx="0" cy="0" r="7" fill={color} />;
  }
}

// ── Burst origin — screen centre ──────────────────────────────────────
const CX = '50%';
const CY = '44%';

// ── Expanding poof clouds at centre on detonation ─────────────────────
const POOF_CLOUDS = [
  { size: 50, delay:   0, dur:  700, color: '#ffd93d', scale: 9  },
  { size: 40, delay:  40, dur:  900, color: '#f0abfc', scale: 10 },
  { size: 60, delay:  80, dur:  800, color: '#ff3cac', scale: 7  },
  { size: 45, delay: 120, dur: 1000, color: '#bfdbfe', scale: 11 },
  { size: 35, delay: 160, dur:  650, color: '#fde68a', scale: 8  },
];

// ── Wave 1: 160 particles, dense poof, 0–240 ms stagger ──────────────
const WAVE1 = Array.from({ length: 160 }, (_, i) => {
  const angle = (i / 160) * Math.PI * 2 + (i % 9) * 0.06;
  const dist  = 130 + (i % 8) * 62;
  return {
    dx:    Math.round(Math.cos(angle) * dist),
    dy:    Math.round(Math.sin(angle) * dist),
    rot:   `${((i * 137) % 900) - 450}deg`,
    delay: (i % 18) * 14,
    dur:   1800 + (i % 7) * 240,
    color: COLORS[i % COLORS.length],
    shape: SHAPE_TYPES[i % SHAPE_TYPES.length],
    size:  32 + (i % 4) * 8,
  };
});

// ── Wave 2: 100 particles, offset angles, heavier linger ──────────────
const WAVE2 = Array.from({ length: 100 }, (_, i) => {
  const angle = (i / 100) * Math.PI * 2 + Math.PI / 100 + (i % 5) * 0.09;
  const dist  = 85 + (i % 7) * 68;
  return {
    dx:    Math.round(Math.cos(angle) * dist),
    dy:    Math.round(Math.sin(angle) * dist),
    rot:   `${((i * 97)  % 720) - 360}deg`,
    delay: 50 + i * 20,
    dur:   2200 + (i % 5) * 280,
    color: COLORS[(i + 5) % COLORS.length],
    shape: SHAPE_TYPES[(i + 3) % SHAPE_TYPES.length],
    size:  24 + (i % 5) * 6,
  };
});

// ── Wave 3: 40 inner close-range pieces for dense centre fill ─────────
const WAVE3 = Array.from({ length: 40 }, (_, i) => {
  const angle = (i / 40) * Math.PI * 2 + 0.2;
  const dist  = 30 + (i % 5) * 22;
  return {
    dx:    Math.round(Math.cos(angle) * dist),
    dy:    Math.round(Math.sin(angle) * dist),
    rot:   `${((i * 71) % 540) - 270}deg`,
    delay: (i % 10) * 20,
    dur:   1200 + (i % 4) * 180,
    color: COLORS[(i + 8) % COLORS.length],
    shape: SHAPE_TYPES[(i + 5) % SHAPE_TYPES.length],
    size:  20 + (i % 3) * 6,
  };
});

// ── Wave 4: confetti rain from screen top ─────────────────────────────
const RAIN = Array.from({ length: 80 }, (_, i) => ({
  left:  `${1 + (i * 1.24) % 97}%`,
  delay: `${250 + (i * 68) % 1800}ms`,
  dur:   `${1700 + (i * 115) % 1300}ms`,
  color: COLORS[(i + 2) % COLORS.length],
  shape: SHAPE_TYPES[(i + 1) % SHAPE_TYPES.length],
  size:  26 + (i % 5) * 7,
}));

// ── Rainbow background strobes ────────────────────────────────────────
const WASHES = [
  { color: '#ffd93d', delay:    0, dur: '0.45s', peak: 0.80 },
  { color: '#f72585', delay:   55, dur: '0.55s', peak: 0.50 },
  { color: '#ffd93d', delay:  180, dur: '0.55s', peak: 0.45 },
  { color: '#06d6a0', delay:  320, dur: '0.55s', peak: 0.42 },
  { color: '#4cc9f0', delay:  460, dur: '0.55s', peak: 0.45 },
  { color: '#8338ec', delay:  600, dur: '0.60s', peak: 0.45 },
  { color: '#ff6b35', delay:  740, dur: '0.60s', peak: 0.40 },
  { color: '#ff595e', delay:  875, dur: '0.55s', peak: 0.40 },
  { color: '#f72585', delay: 1010, dur: '0.55s', peak: 0.38 },
  { color: '#7bf1a8', delay: 1140, dur: '0.60s', peak: 0.35 },
  { color: '#b5179e', delay: 1270, dur: '0.60s', peak: 0.38 },
  { color: '#48cae4', delay: 1400, dur: '0.65s', peak: 0.32 },
  { color: '#ffbe0b', delay: 1540, dur: '0.70s', peak: 0.30 },
  { color: '#ff3cac', delay: 1680, dur: '0.75s', peak: 0.25 },
  { color: '#4cc9f0', delay: 1830, dur: '1.00s', peak: 0.18 },
  { color: '#8338ec', delay: 2000, dur: '1.80s', peak: 0.10 },
];

export default function FuzzBombAnimation() {
  return (
    // Screen quake — whole container shakes at t=0 like a real detonation
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ animation: 'quake 480ms ease-out 0ms both' }}
    >

      {/* ── Rainbow background strobe ─────────────────────────────── */}
      {WASHES.map((w, i) => (
        <div
          key={`wash-${i}`}
          className="absolute inset-0"
          style={{
            background: w.color,
            animation:  `colour-wash ${w.dur} ease-out ${w.delay}ms both`,
            '--peak':   w.peak,
          }}
        />
      ))}

      {/* ── 🧶 Yarn ball: pops in, wobbles, then detonates ─────────── */}
      <div
        className="absolute select-none leading-none pointer-events-none"
        style={{
          left:      CX,
          top:       CY,
          fontSize:  '7rem',
          zIndex:    10,
          animation: 'yarn-detonate 520ms ease-out 0ms both',
        }}
      >
        🧶
      </div>

      {/* ── Expanding poof clouds at detonation point ─────────────── */}
      {POOF_CLOUDS.map((p, i) => (
        <div
          key={`poof-${i}`}
          className="absolute select-none"
          style={{
            top:       CY,
            left:      CX,
            '--dx':    '0px',
            '--dy':    '0px',
            '--scale': p.scale,
            animation: `cloud-burst ${p.dur}ms ease-out ${p.delay}ms forwards`,
          }}
        >
          <svg width={p.size} height={p.size} viewBox="-20 -20 40 40">
            <circle cx="0" cy="0" r="18" fill={p.color} opacity="0.6" />
          </svg>
        </div>
      ))}

      {/* ── Wave 1: dense fuzz burst ──────────────────────────────── */}
      {WAVE1.map((p, i) => (
        <div
          key={`w1-${i}`}
          className="absolute select-none"
          style={{
            top:       CY,
            left:      CX,
            '--dx':    `${p.dx}px`,
            '--dy':    `${p.dy}px`,
            '--rot':   p.rot,
            animation: `confetti-burst ${p.dur}ms cubic-bezier(0.04, 0.92, 0.22, 1) ${p.delay}ms forwards`,
          }}
        >
          <svg width={p.size} height={p.size} viewBox="-16 -16 32 32" overflow="visible">
            <Shape type={p.shape} color={p.color} />
          </svg>
        </div>
      ))}

      {/* ── Wave 2: secondary fill ───────────────────────────────── */}
      {WAVE2.map((p, i) => (
        <div
          key={`w2-${i}`}
          className="absolute select-none"
          style={{
            top:       CY,
            left:      CX,
            '--dx':    `${p.dx}px`,
            '--dy':    `${p.dy}px`,
            '--rot':   p.rot,
            animation: `confetti-burst ${p.dur}ms cubic-bezier(0.08, 0.85, 0.3, 1) ${p.delay}ms forwards`,
          }}
        >
          <svg width={p.size} height={p.size} viewBox="-16 -16 32 32" overflow="visible">
            <Shape type={p.shape} color={p.color} />
          </svg>
        </div>
      ))}

      {/* ── Wave 3: inner close-range fill ──────────────────────── */}
      {WAVE3.map((p, i) => (
        <div
          key={`w3-${i}`}
          className="absolute select-none"
          style={{
            top:       CY,
            left:      CX,
            '--dx':    `${p.dx}px`,
            '--dy':    `${p.dy}px`,
            '--rot':   p.rot,
            animation: `confetti-burst ${p.dur}ms cubic-bezier(0.02, 0.95, 0.2, 1) ${p.delay}ms forwards`,
          }}
        >
          <svg width={p.size} height={p.size} viewBox="-16 -16 32 32" overflow="visible">
            <Shape type={p.shape} color={p.color} />
          </svg>
        </div>
      ))}

      {/* ── Wave 4 (rain): SVG fuzz falls from screen top ────────── */}
      {RAIN.map((p, i) => (
        <div
          key={`rain-${i}`}
          className="absolute top-0 select-none"
          style={{
            left:      p.left,
            animation: `confetti-fall ${p.dur} ease-in ${p.delay} forwards`,
          }}
        >
          <svg width={p.size} height={p.size} viewBox="-16 -16 32 32" overflow="visible">
            <Shape type={p.shape} color={p.color} />
          </svg>
        </div>
      ))}

      {/* ── Payoff text ───────────────────────────────────────────── */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ paddingBottom: '30%' }}
      >
        <div
          className="text-center animate-payoff-text"
          style={{ animationDelay: '250ms', animationFillMode: 'backwards' }}
        >
          <div className="font-display text-5xl sm:text-6xl text-white drop-shadow-lg leading-tight"
               style={{ textShadow: '0 0 30px #f72585, 0 2px 8px rgba(0,0,0,0.6)' }}>
            FUZZ BOMB
          </div>
          <div className="font-display text-3xl mt-1"
               style={{ color: '#ffd93d', textShadow: '0 0 20px #f72585, 0 2px 4px rgba(0,0,0,0.5)' }}>
            DETONATED! 🧶
          </div>
        </div>
      </div>
    </div>
  );
}
