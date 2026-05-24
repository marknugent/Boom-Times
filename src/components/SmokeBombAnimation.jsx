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
 *   20 large heavily-blurred circles erupt from the beaker.
 *
 * Phase 2 — Screen fill (500–6 200 ms):
 *   8 staggered smoke-fill overlays compound to ≈ 97 % coverage.
 *
 * Phase 3 — Vector fog bands (1 200–2 400 ms stagger):
 *   4 SVG gradient fog bands at various z-depths, one in front of cat.
 *
 * Phase 4 — Cartoon clouds (600–2 300 ms stagger):
 *   6 crisp-edged SVG clouds (ellipse silhouettes) drift lazily across
 *   the screen at different depths. Two sit in front of the cat (z > 50).
 */

// Beaker centre on PayoffScreen
const OX = 44;
const OY = 112;

const GRAY = ['#9ca3af', '#6b7280', '#d1d5db', '#374151', '#4b5563', '#e5e7eb'];

const PUFF_DELAY_BASE = 500;

// ── Circular cloud puffs ───────────────────────────────────────────────
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

// ── Full-screen fill overlays ──────────────────────────────────────────
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

// ── Vector fog bands ───────────────────────────────────────────────────
const FOG_LAYERS = [
  {
    id: 0, zIndex: 12, bottom: 0, height: 320, svgH: 320,
    color: '#9ca3af',
    path: 'M0,100 C65,80 130,120 195,96 C260,72 325,112 390,88 C430,74 475,96 520,84 L520,320 L0,320 Z',
    stops: [{ o: '0%', op: 0 }, { o: '30%', op: 0.70 }, { o: '100%', op: 0.70 }],
    delay: 1200, appearDur: 2800, driftDur: 9200, drift: '32px', blur: 9,
  },
  {
    id: 1, zIndex: 22, top: 195, height: 260, svgH: 260,
    color: '#6b7280',
    path: 'M0,80 C52,62 104,96 156,74 C208,52 260,86 312,64 C364,42 416,72 520,58 ' +
          'L520,220 C416,232 364,208 312,222 C260,236 208,210 156,222 C104,234 52,210 0,220 Z',
    stops: [{ o: '0%', op: 0 }, { o: '20%', op: 0.58 }, { o: '80%', op: 0.58 }, { o: '100%', op: 0 }],
    delay: 1600, appearDur: 3200, driftDur: 11500, drift: '-38px', blur: 14,
  },
  {
    id: 2, zIndex: 38, top: 0, height: 270, svgH: 270,
    color: '#d1d5db',
    path: 'M0,0 L520,0 L520,228 C476,246 428,218 390,234 ' +
          'C338,254 278,222 224,240 C166,260 108,226 54,244 C26,252 0,238 0,246 Z',
    stops: [{ o: '0%', op: 0.65 }, { o: '65%', op: 0.40 }, { o: '100%', op: 0 }],
    delay: 2000, appearDur: 3600, driftDur: 10200, drift: '24px', blur: 18,
  },
  {
    id: 3, zIndex: 55, bottom: 0, height: 440, svgH: 440,
    color: '#4b5563',
    path: 'M0,118 C52,96 104,138 156,112 C208,86 260,130 312,104 C364,78 416,114 520,98 L520,440 L0,440 Z',
    stops: [{ o: '0%', op: 0 }, { o: '25%', op: 0.62 }, { o: '100%', op: 0.78 }],
    delay: 2400, appearDur: 3000, driftDur: 7800, drift: '-28px', blur: 12,
  },
];

// ── Cartoon cloud templates ────────────────────────────────────────────
//
// Each template is a set of overlapping ellipses + a base rect that fills
// the gaps between them. Combined fill = solid cloud silhouette with no
// blur — "definite edges" distinct from the gradient fog bands above.
//
// Ellipses are defined in the template's own viewBox coords.
// Adjacent ellipses overlap enough to merge cleanly.
//
const CLOUD_TEMPLATES = [
  // 0 — wide, 3 big bumps
  {
    vw: 240, vh: 100,
    els: [
      { cx: 52,  cy: 70, rx: 38, ry: 33 },
      { cx: 118, cy: 50, rx: 50, ry: 44 },
      { cx: 188, cy: 64, rx: 38, ry: 32 },
    ],
    base: { x: 15, y: 70, w: 212, h: 30 },
  },
  // 1 — compact, 4 bumps
  {
    vw: 200, vh: 85,
    els: [
      { cx: 36,  cy: 60, rx: 26, ry: 22 },
      { cx: 82,  cy: 43, rx: 35, ry: 31 },
      { cx: 132, cy: 48, rx: 33, ry: 28 },
      { cx: 170, cy: 60, rx: 24, ry: 21 },
    ],
    base: { x: 12, y: 60, w: 180, h: 25 },
  },
  // 2 — dramatic, 2 large overlapping bumps
  {
    vw: 210, vh: 110,
    els: [
      { cx: 70,  cy: 74, rx: 52, ry: 47 },
      { cx: 148, cy: 62, rx: 55, ry: 50 },
    ],
    base: { x: 18, y: 74, w: 175, h: 36 },
  },
  // 3 — elongated, 5 bumps (wide wispy cloud)
  {
    vw: 260, vh: 75,
    els: [
      { cx: 30,  cy: 55, rx: 26, ry: 23 },
      { cx: 72,  cy: 40, rx: 34, ry: 30 },
      { cx: 122, cy: 44, rx: 32, ry: 28 },
      { cx: 172, cy: 42, rx: 32, ry: 28 },
      { cx: 222, cy: 55, rx: 28, ry: 24 },
    ],
    base: { x: 5, y: 55, w: 250, h: 20 },
  },
];

// ── Cloud layer instances ──────────────────────────────────────────────
//
// left + CSS translateX(--from) = start position (usually off-screen).
// Cloud drifts to left + translateX(--to) over the full duration.
//
// Three clear size tiers on a ~390px phone screen:
//   GIANT  ~400px — nearly full screen width, heavy atmosphere
//   MEDIUM ~200px — mid-scale billows
//   SMALL   ~85px — close wispy puffs (appear near/in front)
//
// z-index ladder (for reference):
//   z≤28  behind score card overlay (z=30)
//   z=36  above score card
//   z=46  above general fog, below front fog
//   z=52+ in front of dancing cat (z-50)
//
const CLOUD_LAYERS = [
  // ── GIANT ──────────────────────────────────────────────────
  // Massive bank enters from left, top — background
  { t: 0, c: '#b0bac4', op: 0.75, w: 420, top:  '8%', left:  '0%', z: 24, from: '-450px', to:  '28px', delay:  800, dur: 11000 },
  // Massive bank enters from right, lower — above score card
  { t: 2, c: '#7a8c9a', op: 0.82, w: 395, top: '55%', left: '10%', z: 48, from:  '430px', to: '-62px', delay: 1600, dur:  9500 },

  // ── MEDIUM ─────────────────────────────────────────────────
  // Medium billow enters from right, upper-mid
  { t: 1, c: '#c8d4dc', op: 0.65, w: 200, top: '28%', left: '52%', z: 36, from:  '240px', to: '-50px', delay: 1100, dur: 12000 },
  // Medium billow enters from left, bottom — in front of cat
  { t: 3, c: '#5e6e7c', op: 0.88, w: 215, top: '70%', left:  '2%', z: 58, from: '-245px', to:  '52px', delay: 2300, dur:  9000 },

  // ── SMALL ──────────────────────────────────────────────────
  // Tiny wisp enters from right, upper — deepest background
  { t: 2, c: '#9daab4', op: 0.52, w:  85, top: '18%', left: '72%', z: 16, from:  '110px', to: '-58px', delay:  600, dur:  8000 },
  // Tiny puff enters from left — IN FRONT of cat
  { t: 1, c: '#c8d8e4', op: 0.70, w:  80, top: '42%', left:  '5%', z: 53, from: '-105px', to:  '44px', delay: 1950, dur:  7500 },
];

// ── Cloud SVG renderer ─────────────────────────────────────────────────
function CloudShape({ tmpl, color }) {
  const t = CLOUD_TEMPLATES[tmpl];
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${t.vw} ${t.vh}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {t.els.map((e, i) => (
        <ellipse key={i} cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} fill={color} />
      ))}
      <rect x={t.base.x} y={t.base.y} width={t.base.w} height={t.base.h} fill={color} />
    </svg>
  );
}

export default function SmokeBombAnimation() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">

      {/* ── Detonation: 💣 cherry bomb ──────────────────────────── */}
      <div
        className="absolute select-none leading-none"
        style={{ left: OX, top: OY, fontSize: 52, zIndex: 62,
                 animation: 'bomb-show 520ms ease-out 0ms both' }}
      >
        💣
      </div>

      {/* ── Detonation: 💥 explosion expands + fades ────────────── */}
      <div
        className="absolute select-none leading-none"
        style={{ left: OX, top: OY, fontSize: 80, zIndex: 62,
                 animation: 'explosion-burst 720ms ease-out 300ms both' }}
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

      {/* ── Blurry circular cloud puffs ───────────────────────── */}
      {PUFFS.map((p, i) => (
        <div key={`puff-${i}`} className="absolute rounded-full"
          style={{
            top: OY, left: OX,
            width: p.size, height: p.size,
            backgroundColor: p.color,
            filter: `blur(${p.blur}px)`,
            '--fx': `${p.fx}px`, '--fy': `${p.fy}px`,
            '--sc': p.sc, '--op': p.op,
            animation: `smoke-puff ${p.dur}ms cubic-bezier(0.1, 0.8, 0.3, 1) ${p.delay}ms both`,
          }}
        />
      ))}

      {/* ── Gradient fog bands ────────────────────────────────── */}
      {FOG_LAYERS.map(fog => (
        <div key={`fog-${fog.id}`}
          className="absolute pointer-events-none"
          style={{
            left: '-60px', right: '-60px',
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
          <svg width="100%" height={fog.svgH} viewBox={`0 0 520 ${fog.svgH}`} preserveAspectRatio="none">
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

      {/* ── Cartoon clouds — crisp-edged, no blur ────────────────
          Each cloud drifts from --from to --to while fading in
          and out. Some sit above z=50 (in front of dancing cat). */}
      {CLOUD_LAYERS.map((cl, i) => {
        const tmpl = CLOUD_TEMPLATES[cl.t];
        const h = Math.round(cl.w * tmpl.vh / tmpl.vw);
        return (
          <div key={`cloud-${i}`}
            className="absolute pointer-events-none"
            style={{
              left:   cl.left,
              top:    cl.top,
              width:  cl.w,
              height: h,
              zIndex: cl.z,
              '--from': cl.from,
              '--to':   cl.to,
              '--op':   cl.op,
              animation: `cloud-drift-in ${cl.dur}ms ease-in-out ${cl.delay}ms both`,
            }}
          >
            <CloudShape tmpl={cl.t} color={cl.c} />
          </div>
        );
      })}

      {/* Payoff text — z=46: above general fog, below front fog/clouds */}
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
