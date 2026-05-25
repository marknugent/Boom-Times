/**
 * Slime Explosion payoff animation — MAXIMUM DRAMA edition.
 *
 * Everything originates from the beaker — nothing pre-splotched.
 *
 * Phase 1 — Flying blobs (0–600 ms):
 *   40 organic SVG blobs burst outward in all directions from the beaker.
 *
 * Phase 2 — Screen hits (150–2000 ms):
 *   10 travel globs launch from the beaker, fly to fixed screen positions,
 *   squish on arrival, then the landing splat mark blooms in place.
 *   Splat sizes range from 100 px to 620 px — massive screen coverage.
 *
 * Phase 3 — Drips (600–4500 ms):
 *   Teardrop drips (width proportional to splat size) grow downward
 *   from each splat center.
 *
 * Phase 4 — Screen wash: deep green tint pulses 6 times.
 */

// Beaker centre on PayoffScreen
const OX = 44;
const OY = 112;

// ── Slime colour palette ──────────────────────────────────────────────
const SLIME = ['#4ade80', '#86efac', '#16a34a', '#65a30d', '#a3e635', '#22c55e', '#15803d', '#84cc16'];

// ── Deterministic organic blob path (Catmull-Rom through polar-jittered pts) ─
function blobPath(r, segments, seed) {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const angle  = (i / segments) * Math.PI * 2;
    const h      = ((seed * 17 + i * 31) % 21) / 21;
    const radius = r * (0.62 + 0.38 * h);
    pts.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  const n = pts.length, t = 0.38;
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i];
    const p2 = pts[(i + 1) % n],     p3 = pts[(i + 2) % n];
    const cp1x = p1[0] + (p2[0] - p0[0]) * t;
    const cp1y = p1[1] + (p2[1] - p0[1]) * t;
    const cp2x = p2[0] - (p3[0] - p1[0]) * t;
    const cp2y = p2[1] - (p3[1] - p1[1]) * t;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + 'Z';
}

// Pre-compute all blob paths at module level
// Bigger radius (30 vs 25) and more segments (9) for flying blobs
// Much bigger radius (42) and more segments (12) for splat marks
const BLOB_PATHS  = Array.from({ length: 10 }, (_, i) => blobPath(30, 9,  i * 7));
const SPLAT_PATHS = Array.from({ length: 10 }, (_, i) => blobPath(42, 12, i * 11 + 3));

// Drip teardrop: anchored at y=0, tapers to point at y=h.
// w controls half-width — fat drips for huge splats.
function dripPath(h, w = 5) {
  const w2 = (w * 0.4).toFixed(1);
  return `M-${w},2 C-${w},${(h * 0.3).toFixed(0)} -${w2},${(h * 0.72).toFixed(0)} 0,${h}` +
         ` C${w2},${(h * 0.72).toFixed(0)} ${w},${(h * 0.3).toFixed(0)} ${w},2` +
         ` C${w},-1 -${w},-1 -${w},2Z`;
}

// 10 satellite splatter dots around a splat — naturally scale with the SVG
function SplatDots({ color }) {
  return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    const d = 36 + (i % 4) * 14;  // 36, 50, 64, 78 SVG units
    const r = 4   + (i % 4) * 1.5; //  4, 5.5, 7, 8.5 SVG units
    return (
      <circle key={i}
        cx={(Math.cos(a) * d).toFixed(1)}
        cy={(Math.sin(a) * d).toFixed(1)}
        r={r} fill={color} opacity="0.65" />
    );
  });
}

// ── 40 flying blobs from beaker — all directions ──────────────────────
const BLOBS = Array.from({ length: 40 }, (_, i) => {
  const angle = (i / 40) * Math.PI * 2 + (i % 3) * 0.18;
  const dist  = 90 + (i % 6) * 60;   // 90 → 390 px radius
  return {
    dx:    Math.round(Math.cos(angle) * dist),
    dy:    Math.round(Math.sin(angle) * dist),
    rot:   `${(i * 43) % 360 - 180}deg`,
    delay: i * 14,                     // fast stagger — all out within 560 ms
    dur:   1700 + (i % 5) * 320,
    color: SLIME[i % SLIME.length],
    path:  BLOB_PATHS[i % BLOB_PATHS.length],
    size:  80 + (i % 4) * 20,         // 80, 100, 120, 140 px
  };
});

// ── Screen hits — each blob travels from beaker then leaves a splat ───
//
// tx/ty: pixel offset from beaker (OX=44, OY=112) to landing centre.
//        Calibrated for a ~390×844 viewport.
//
// travelDur: how long the travel blob animates (blob arrives at ~62% of this)
// splatDelay ≈ travelDelay + travelDur × 0.62
// size: rendered SVG px for the splat — ranges from 100 to 620 px
//
const SCREEN_HITS = [
  // Top-right
  {
    tx: 237, ty:  -11, travelDelay: 250, travelDur:  880,
    splatDelay:  796, size:  140,
    path: SPLAT_PATHS[0], color: '#4ade80', dripH: 150,
  },
  // Upper centre
  {
    tx:  65, ty:  -61, travelDelay: 460, travelDur:  710,
    splatDelay:  900, size:  300,
    path: SPLAT_PATHS[1], color: '#86efac', dripH: 260,
  },
  // Far right mid
  {
    tx: 307, ty:  226, travelDelay: 180, travelDur: 1060,
    splatDelay:  837, size:  100,
    path: SPLAT_PATHS[2], color: '#16a34a', dripH: 100,
  },
  // Left side — GIANT splat bleeding off screen edge
  {
    tx: -28, ty:   74, travelDelay: 610, travelDur:  700,
    splatDelay: 1044, size:  580,
    path: SPLAT_PATHS[3], color: '#65a30d', dripH: 380,
  },
  // Lower right
  {
    tx: 268, ty:  378, travelDelay: 760, travelDur: 1160,
    splatDelay: 1479, size:  200,
    path: SPLAT_PATHS[4], color: '#4ade80', dripH: 180,
  },
  // Top centre — large
  {
    tx: 159, ty:  -78, travelDelay: 390, travelDur:  815,
    splatDelay:  895, size:  420,
    path: SPLAT_PATHS[5], color: '#a3e635', dripH: 340,
  },
  // Bottom centre
  {
    tx: 165, ty:  540, travelDelay: 340, travelDur: 1180,
    splatDelay: 1072, size:  240,
    path: SPLAT_PATHS[6], color: '#22c55e', dripH: 200,
  },
  // Left low — large
  {
    tx:  10, ty:  410, travelDelay: 530, travelDur:  960,
    splatDelay: 1125, size:  360,
    path: SPLAT_PATHS[7], color: '#84cc16', dripH: 290,
  },
  // Top far right
  {
    tx: 325, ty:  -50, travelDelay: 150, travelDur:  980,
    splatDelay:  757, size:  180,
    path: SPLAT_PATHS[8], color: '#15803d', dripH: 160,
  },
  // Centre mid — MASSIVE, dominates the screen
  {
    tx: 145, ty:  290, travelDelay: 680, travelDur: 1040,
    splatDelay: 1325, size:  620,
    path: SPLAT_PATHS[9], color: '#4ade80', dripH: 440,
  },
];

export default function SlimeExplosionAnimation() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">

      {/* Pulsing green washes — staggered so the screen throbs */}
      <div className="absolute inset-0 bg-green-600"   style={{ animation: 'colour-wash 0.8s ease-out 0.0s both', '--peak': 0.45 }} />
      <div className="absolute inset-0 bg-lime-400"    style={{ animation: 'colour-wash 0.7s ease-out 0.9s both', '--peak': 0.35 }} />
      <div className="absolute inset-0 bg-green-500"   style={{ animation: 'colour-wash 0.7s ease-out 1.7s both', '--peak': 0.28 }} />
      <div className="absolute inset-0 bg-emerald-500" style={{ animation: 'colour-wash 0.8s ease-out 2.5s both', '--peak': 0.22 }} />
      <div className="absolute inset-0 bg-lime-500"    style={{ animation: 'colour-wash 0.9s ease-out 3.3s both', '--peak': 0.16 }} />
      <div className="absolute inset-0 bg-green-400"   style={{ animation: 'colour-wash 0.9s ease-out 4.2s both', '--peak': 0.10 }} />

      {/* ── 40 flying blobs burst from beaker ────────────────────── */}
      {BLOBS.map((b, i) => (
        <div key={`blob-${i}`} className="absolute select-none"
          style={{
            top: OY, left: OX,
            '--dx': `${b.dx}px`, '--dy': `${b.dy}px`,
            '--rot': b.rot, '--scale': 1,
            animation: `slime-burst ${b.dur}ms cubic-bezier(0.15, 0.85, 0.35, 1) ${b.delay}ms both`,
          }}
        >
          <svg width={b.size} height={b.size} viewBox="-35 -35 70 70" overflow="visible">
            <path d={b.path} fill={b.color} opacity="0.92" />
            <ellipse cx="-6" cy="-8" rx="7" ry="4" fill="white" opacity="0.25"
                     transform="rotate(-20)" />
          </svg>
        </div>
      ))}

      {/* ── Travel globs (fly from beaker to each splat position) ─── */}
      {SCREEN_HITS.map((h, i) => (
        <div key={`travel-${i}`} className="absolute select-none"
          style={{
            top: OY, left: OX,
            '--tx': `${h.tx}px`, '--ty': `${h.ty}px`,
            animation: `slime-travel ${h.travelDur}ms cubic-bezier(0.3, 0.0, 0.7, 1) ${h.travelDelay}ms both`,
          }}
        >
          {/* Bigger travel blob — 88 px so it reads clearly in flight */}
          <svg width={88} height={88} viewBox="-35 -35 70 70" overflow="visible">
            <path d={BLOB_PATHS[i % BLOB_PATHS.length]} fill={h.color} opacity="0.9" />
          </svg>
        </div>
      ))}

      {/* ── Splat marks (appear when travel glob arrives) ─────────── */}
      {SCREEN_HITS.map((h, i) => (
        <div key={`splat-${i}`} className="absolute select-none"
          style={{
            // Pixel-absolute — translate(-50%,-50%) in keyframe centres on this point
            top:  OY + h.ty,
            left: OX + h.tx,
            animation: `slime-hit 3600ms ease-out ${h.splatDelay}ms both`,
          }}
        >
          <svg width={h.size} height={h.size} viewBox="-55 -55 110 110" overflow="visible">
            <path d={h.path} fill={h.color} opacity="0.95" />
            {/* SplatDots are in SVG-coordinate space, so they auto-scale with the SVG */}
            <SplatDots color={h.color} />
            <ellipse cx="-8" cy="-10" rx="10" ry="5" fill="white" opacity="0.28"
                     transform="rotate(-25)" />
          </svg>
        </div>
      ))}

      {/* ── Drips sliding down from each splat ───────────────────── */}
      {SCREEN_HITS.map((h, i) => {
        // Drip width scales with splat size — fat rivers for big splats
        const dripW = Math.max(5, Math.min(18, Math.round(h.size * 0.028)));
        const svgW  = dripW * 2 + 4;
        return (
          <div key={`drip-${i}`} className="absolute select-none"
            style={{
              top:             OY + h.ty + Math.round(h.size * 0.42),
              left:            OX + h.tx,
              transformOrigin: 'top center',
              animation:       `slime-drip-grow 3400ms ease-in ${h.splatDelay + 180}ms both`,
            }}
          >
            <svg
              width={svgW}
              height={h.dripH + 4}
              viewBox={`-${dripW + 2} -2 ${svgW} ${h.dripH + 4}`}
              overflow="visible"
            >
              <path d={dripPath(h.dripH, dripW)} fill={h.color} opacity="0.88" />
            </svg>
          </div>
        );
      })}

      {/* Payoff text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center"
           style={{ paddingBottom: '28%' }}>
        <div className="text-center animate-payoff-text"
             style={{ animationDelay: '600ms', animationFillMode: 'backwards' }}>
          <div className="font-display text-5xl sm:text-6xl text-green-300 drop-shadow-lg leading-tight">
            SLIME
          </div>
          <div className="font-display text-5xl sm:text-6xl text-green-400 drop-shadow-lg leading-tight">
            EXPLOSION! 🟢
          </div>
        </div>
      </div>
    </div>
  );
}
