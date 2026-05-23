/**
 * Smoke Bomb payoff animation.
 *
 * Gray billowing clouds fill the screen — visibility drops to near zero.
 *
 * Detonation sequence (t = 0–1 000 ms):
 *   💣 cherry bomb pops in at the beaker, then 💥 explosion emoji
 *   rapidly expands and fades, signalling the release of smoke.
 *
 * Phase 1 — Cloud puffs (500–1 800 ms):
 *   20 large heavily-blurred circles erupt from the beaker, drifting
 *   upward and sideways as they expand.
 *
 * Phase 2 — Screen fill (500–6 200 ms):
 *   8 staggered smoke-fill overlays stack up. Combined CSS opacity
 *   compounds to ≈ 97 % peak coverage — nearly total blackout.
 *
 * Phase 3 — Vector fog layers (1 200–2 400 ms stagger):
 *   4 translucent SVG fog bands with wavy edges drift slowly
 *   across different depths. The densest layer sits at z=55,
 *   in front of the dancing cat.
 */

// Beaker centre on PayoffScreen
const OX = 44;
const OY = 112;

const GRAY = ['#9ca3af', '#6b7280', '#d1d5db', '#374151', '#4b5563', '#e5e7eb'];

// Smoke puffs start after the explosion flash
const PUFF_DELAY_BASE = 500;

// ── Circular cloud puffs erupting from the beaker ─────────────────────
const PUFFS = Array.from({ length: 20 }, (_, i) => {
  const angle = (i / 20) * Math.PI * 2;
  const driftX = Math.cos(angle) * (52 + (i % 5) * 22);
  const driftY = Math.sin(angle) * 36 - 96 - (i % 4) * 30;
  return {
    fx:    Math.round(driftX),
    fy:    Math.round(driftY),
    sc:    3.5 + (i % 5) * 0.7,
    size:  154 + (i % 5) * 30,
    blur:  34  + (i % 4) * 12,
    delay: PUFF_DELAY_BASE + i * 65,
    dur:   2800 + (i % 5) * 500,
    op:    0.62 + (i % 4) * 0.07,
    color: GRAY[i % GRAY.length],
  };
});

// ── Full-screen fill overlays (compound to near-total opacity) ─────────
// Delays offset by 500 ms so the explosion lands first
const FILL_LAYERS = [
  { color: '#6b7280', delay:  500, dur: 4800, peak: 0.50, hold: 0.40 },
  { color: '#4b5563', delay: 1000, dur: 4400, peak: 0.60, hold: 0.52 },
  { color: '#9ca3af', delay: 1400, dur: 4000, peak: 0.55, hold: 0.48 },
  { color: '#374151', delay: 1800, dur: 3800, peak: 0.65, hold: 0.58 },
  { color: '#6b7280', delay: 2200, dur: 3400, peak: 0.70, hold: 0.62 },
  { color: '#4b5563', delay: 2600, dur: 3200, peak: 0.72, hold: 0.65 },
  { color: '#1f2937', delay: 3000, dur: 3000, peak: 0.75, hold: 0.68 },
  { color: '#374151', delay: 3400, dur: 2800, peak: 0.78, hold: 0.70 },
];

// ── Vector fog layers ──────────────────────────────────────────────────
//
// Each layer is an absolutely-positioned div wider than the screen
// (left: -60px / right: -60px) so horizontal drift never reveals a gap.
// The SVG uses a vertical gradient for natural fog density, and the
// overall element fades in via fog-appear + oscillates via fog-drift.
//
// z=12  bottom bank  — behind score card (z=30), adds floor haze
// z=22  mid band     — behind score card, adds mid atmosphere
// z=38  upper roll   — ABOVE score card (z=30), real visibility hit
// z=55  front dense  — ABOVE dancing cat (z=50), maximum drama
//
// Delays offset by ~500 ms vs. originals so fog rolls in after the
// explosion and the first wave of smoke puffs.
//
// viewBox is "0 0 520 <H>" — paths use these coords.
// Gradient x1/y1/x2/y2 in SVG user units (0–1 of the bounding box).
//
const FOG_LAYERS = [
  {
    id: 0,
    zIndex: 12,
    bottom: 0,
    height: 320,
    svgH: 320,
    color: '#9ca3af',
    // Fills from wavy edge (y≈84–112) down to bottom
    path: 'M0,100 C65,80 130,120 195,96 C260,72 325,112 390,88 C430,74 475,96 520,84 L520,320 L0,320 Z',
    // Gradient: transparent at top of path, opaque toward bottom
    stops: [{ o: '0%', op: 0 }, { o: '30%', op: 0.70 }, { o: '100%', op: 0.70 }],
    delay: 1200,
    appearDur: 2800,
    driftDur: 9200,
    drift: '32px',
    blur: 9,
  },
  {
    id: 1,
    zIndex: 22,
    top: 195,
    height: 260,
    svgH: 260,
    color: '#6b7280',
    // Closed band — wavy top AND bottom
    path: 'M0,80 C52,62 104,96 156,74 C208,52 260,86 312,64 C364,42 416,72 520,58 ' +
          'L520,220 C416,232 364,208 312,222 C260,236 208,210 156,222 C104,234 52,210 0,220 Z',
    // Gradient: transparent at both ends, opaque in middle
    stops: [{ o: '0%', op: 0 }, { o: '20%', op: 0.58 }, { o: '80%', op: 0.58 }, { o: '100%', op: 0 }],
    delay: 1600,
    appearDur: 3200,
    driftDur: 11500,
    drift: '-38px',
    blur: 14,
  },
  {
    id: 2,
    zIndex: 38,
    top: 0,
    height: 270,
    svgH: 270,
    color: '#d1d5db',
    // Fills from top of SVG down to a wavy bottom edge
    path: 'M0,0 L520,0 L520,228 C476,246 428,218 390,234 ' +
          'C338,254 278,222 224,240 C166,260 108,226 54,244 C26,252 0,238 0,246 Z',
    // Gradient: opaque at top, transparent at wavy bottom
    stops: [{ o: '0%', op: 0.65 }, { o: '65%', op: 0.40 }, { o: '100%', op: 0 }],
    delay: 2000,
    appearDur: 3600,
    driftDur: 10200,
    drift: '24px',
    blur: 18,
  },
  {
    id: 3,
    zIndex: 55,   // IN FRONT OF the dancing cat (z-50)
    bottom: 0,
    height: 440,
    svgH: 440,
    color: '#4b5563',
    // Dense bottom bank — fills from wavy line (y≈98–128) to bottom
    path: 'M0,118 C52,96 104,138 156,112 C208,86 260,130 312,104 C364,78 416,114 520,98 L520,440 L0,440 Z',
    // Gradient: transparent at top, dense toward bottom
    stops: [{ o: '0%', op: 0 }, { o: '25%', op: 0.62 }, { o: '100%', op: 0.78 }],
    delay: 2400,
    appearDur: 3000,
    driftDur: 7800,
    drift: '-28px',
    blur: 12,
  },
];

export default function SmokeBombAnimation() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">

      {/* ── Detonation: 💣 cherry bomb pops in at the beaker ───
          Keyframe bomb-show uses translate(-50%,-50%) to centre
          the emoji exactly on the beaker origin (OX, OY).      */}
      <div
        className="absolute select-none leading-none"
        style={{
          left:      OX,
          top:       OY,
          fontSize:  52,
          zIndex:    62,
          animation: 'bomb-show 520ms ease-out 0ms both',
        }}
      >
        💣
      </div>

      {/* ── Detonation: 💥 explosion rapidly expands + fades ───
          Starts at t=300 ms (as bomb fades), expands to 8× and
          disappears by t=1 020 ms, leaving smoke in its wake.  */}
      <div
        className="absolute select-none leading-none"
        style={{
          left:      OX,
          top:       OY,
          fontSize:  80,
          zIndex:    62,
          animation: 'explosion-burst 720ms ease-out 300ms both',
        }}
      >
        💥
      </div>

      {/* ── Stacked smoke fills ────────────────────────────────── */}
      {FILL_LAYERS.map((l, i) => (
        <div key={`fill-${i}`} className="absolute inset-0"
          style={{
            backgroundColor: l.color,
            '--peak': l.peak,
            '--hold': l.hold,
            animation: `smoke-fill ${l.dur}ms ease-in-out ${l.delay}ms both`,
          }}
        />
      ))}

      {/* ── Blurry circular cloud puffs from beaker ───────────── */}
      {PUFFS.map((p, i) => (
        <div key={`puff-${i}`} className="absolute rounded-full"
          style={{
            top:  OY,
            left: OX,
            width:  p.size,
            height: p.size,
            backgroundColor: p.color,
            filter: `blur(${p.blur}px)`,
            '--fx': `${p.fx}px`,
            '--fy': `${p.fy}px`,
            '--sc': p.sc,
            '--op': p.op,
            animation: `smoke-puff ${p.dur}ms cubic-bezier(0.1, 0.8, 0.3, 1) ${p.delay}ms both`,
          }}
        />
      ))}

      {/* ── Vector fog bands ──────────────────────────────────── */}
      {FOG_LAYERS.map(fog => (
        <div key={`fog-${fog.id}`}
          className="absolute pointer-events-none"
          style={{
            left:   '-60px',
            right:  '-60px',
            ...(fog.top    !== undefined ? { top:    fog.top    } : {}),
            ...(fog.bottom !== undefined ? { bottom: fog.bottom } : {}),
            height: fog.height,
            zIndex: fog.zIndex,
            filter: `blur(${fog.blur}px)`,
            '--drift': fog.drift,
            animation:
              `fog-appear ${fog.appearDur}ms ease-in ${fog.delay}ms both, ` +
              `fog-drift ${fog.driftDur}ms ease-in-out ${fog.delay}ms infinite alternate`,
          }}
        >
          <svg
            width="100%"
            height={fog.svgH}
            viewBox={`0 0 520 ${fog.svgH}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={`smokeFog${fog.id}`} x1="0" y1="0" x2="0" y2="1">
                {fog.stops.map((s, si) => (
                  <stop key={si} offset={s.o} stopColor={fog.color} stopOpacity={s.op} />
                ))}
              </linearGradient>
            </defs>
            <path d={fog.path} fill={`url(#smokeFog${fog.id})`} />
          </svg>
        </div>
      ))}

      {/* Payoff text — bright white glow punches through the smoke (z=46,
          above general fog at z=38, still behind front fog at z=55).
          Delay nudged to 900 ms so it appears after the detonation.  */}
      <div className="absolute inset-0 flex flex-col items-center justify-center"
           style={{ paddingBottom: '28%', zIndex: 46 }}>
        <div className="text-center animate-payoff-text"
             style={{ animationDelay: '900ms', animationFillMode: 'backwards' }}>
          <div className="font-display text-5xl sm:text-6xl leading-tight"
               style={{ color: '#f9fafb', textShadow: '0 0 24px rgba(255,255,255,1), 0 0 48px rgba(255,255,255,0.7), 0 2px 10px rgba(0,0,0,1)' }}>
            SMOKE
          </div>
          <div className="font-display text-5xl sm:text-6xl leading-tight"
               style={{ color: '#e5e7eb', textShadow: '0 0 24px rgba(255,255,255,1), 0 0 48px rgba(255,255,255,0.7), 0 2px 10px rgba(0,0,0,1)' }}>
            BOMB! 🌫️
          </div>
        </div>
      </div>
    </div>
  );
}
