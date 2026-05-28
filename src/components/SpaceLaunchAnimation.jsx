/**
 * Space Launch payoff animation.
 *
 * The rocket stays centered while the world moves around it:
 *   • Blue sky overlay fades out, revealing deep space
 *   • Green ground slides off the bottom (no hardware platform)
 *   • Emoji celestial bodies — planets, aliens, satellites — stream downward
 *   • Fire/smoke exhaust blasts from the nozzle in 4 timed waves
 *   • White ignition flash + expanding boom rings + 💥 at t ≈ 380 ms
 *   • Ground smoke billows from the launch base in the foreground
 *   • Large translucent clouds drift downward in the foreground
 *   • Payoff text fades in above the rocket
 *
 * z-layer stack:
 *   z=1   space background
 *   z=2   blue sky overlay (fades out via sky-to-space)
 *   z=5   space objects (planets, stars, aliens, satellites)
 *   z=10  ground fill (slides off via ground-recede)
 *   z=20  exhaust particles
 *   z=30  rocket
 *   z=31  boom rings
 *   z=32  boom burst emoji
 *   z=33  ground facade (hides nozzle while parked, slides off with ground)
 *   z=35  ignition flash
 *   z=38  foreground clouds (pass in front of rocket)
 *   z=40  payoff text
 *   z=50  foreground launch smoke (highest — in front of everything)
 */

// ── Background star field ──────────────────────────────────────────────────
// Small CSS pixel-dots at z=4 — behind emoji objects (z=5) and the ground
// (z=10), so they only appear in the sky/space area.  Durations 9 – 14 s
// make them drift noticeably slower than the foreground objects, adding
// convincing depth.  Uses the same star-scroll keyframe (--sy, --op).
const BG_STARS = [
  // ── On-screen (positive sy) ──
  { left:  2, sy:  80, op: 0.65, s: 2, dur:  9800, delay:   0 },
  { left:  8, sy: 200, op: 0.50, s: 1, dur:  8600, delay: 150 },
  { left: 14, sy: 430, op: 0.60, s: 2, dur: 10400, delay: 300 },
  { left: 20, sy: 690, op: 0.45, s: 1, dur:  9200, delay: 100 },
  { left: 26, sy: 290, op: 0.70, s: 2, dur: 11000, delay: 450 },
  { left: 33, sy: 560, op: 0.55, s: 1, dur:  9600, delay: 200 },
  { left: 39, sy: 130, op: 0.65, s: 2, dur: 10800, delay: 350 },
  { left: 45, sy: 790, op: 0.40, s: 1, dur:  8800, delay:  50 },
  { left: 52, sy: 380, op: 0.72, s: 2, dur: 10200, delay: 500 },
  { left: 58, sy: 220, op: 0.58, s: 1, dur:  9400, delay: 250 },
  { left: 65, sy: 640, op: 0.62, s: 2, dur: 11200, delay: 400 },
  { left: 71, sy: 100, op: 0.48, s: 1, dur:  9000, delay: 100 },
  { left: 78, sy: 460, op: 0.68, s: 2, dur: 10600, delay: 300 },
  { left: 84, sy: 320, op: 0.54, s: 1, dur:  9200, delay: 200 },
  { left: 90, sy: 860, op: 0.42, s: 2, dur:  8600, delay: 600 },
  { left: 96, sy: 180, op: 0.70, s: 2, dur: 10000, delay: 350 },
  // ── Streaming in from above (negative sy) ──
  { left:  5, sy:  -100, op: 0.62, s: 2, dur: 10500, delay: 200 },
  { left: 11, sy:  -280, op: 0.50, s: 1, dur:  9800, delay: 400 },
  { left: 18, sy:  -520, op: 0.68, s: 2, dur: 11800, delay: 100 },
  { left: 24, sy:  -170, op: 0.55, s: 1, dur: 10200, delay: 550 },
  { left: 30, sy:  -650, op: 0.45, s: 2, dur: 12000, delay: 300 },
  { left: 37, sy:  -390, op: 0.72, s: 2, dur: 11000, delay: 150 },
  { left: 43, sy:  -820, op: 0.38, s: 1, dur: 13000, delay: 500 },
  { left: 49, sy:  -230, op: 0.65, s: 2, dur: 10400, delay: 250 },
  { left: 56, sy:  -450, op: 0.58, s: 1, dur: 11400, delay: 400 },
  { left: 62, sy:  -310, op: 0.70, s: 2, dur: 10800, delay:  50 },
  { left: 69, sy:  -680, op: 0.48, s: 2, dur: 12400, delay: 350 },
  { left: 75, sy:  -140, op: 0.75, s: 2, dur:  9600, delay: 200 },
  { left: 82, sy:  -520, op: 0.52, s: 1, dur: 11600, delay: 450 },
  { left: 88, sy:  -850, op: 0.42, s: 2, dur: 13500, delay: 600 },
  { left: 94, sy:  -360, op: 0.60, s: 2, dur: 10600, delay: 150 },
  { left: 10, sy:  -730, op: 0.45, s: 1, dur: 12800, delay: 700 },
  { left: 36, sy:  -160, op: 0.68, s: 2, dur: 10000, delay: 300 },
  { left: 73, sy:  -990, op: 0.38, s: 2, dur: 14000, delay: 800 },
  { left: 53, sy:  -580, op: 0.55, s: 1, dur: 11900, delay: 450 },
];

// ── Space objects ──────────────────────────────────────────────────────────
// Emoji celestial bodies that stream downward as the rocket ascends.
// sy = starting translateY in px: positive = already on-screen, negative = above viewport.
// s  = font-size CSS string. Uses the star-scroll keyframe.
const SPACE_OBJECTS = [
  // ── Stars / sparkles (small, numerous, fast) ──
  { emoji: '⭐', left:  5, sy:  80, op: 0.90, s: '1.4rem', dur: 4800, delay:   0 },
  { emoji: '✨', left: 18, sy: 250, op: 0.80, s: '1.2rem', dur: 4400, delay: 100 },
  { emoji: '💫', left: 31, sy: 420, op: 0.85, s: '1.6rem', dur: 5000, delay: 200 },
  { emoji: '🌟', left: 44, sy: 150, op: 0.92, s: '1.8rem', dur: 4600, delay: 150 },
  { emoji: '⭐', left: 57, sy: 560, op: 0.78, s: '1.2rem', dur: 4200, delay:  50 },
  { emoji: '✨', left: 70, sy: 330, op: 0.88, s: '1.4rem', dur: 4700, delay: 300 },
  { emoji: '💫', left: 83, sy:  70, op: 0.82, s: '1.5rem', dur: 5100, delay: 400 },
  { emoji: '🌟', left: 93, sy: 480, op: 0.70, s: '1.3rem', dur: 4300, delay: 250 },
  { emoji: '⭐', left: 12, sy: 720, op: 0.65, s: '1.2rem', dur: 4100, delay: 500 },
  { emoji: '✨', left: 25, sy: 130, op: 0.88, s: '1.6rem', dur: 4900, delay: 350 },
  { emoji: '💫', left: 62, sy: 860, op: 0.55, s: '1.1rem', dur: 4000, delay: 100 },
  { emoji: '⭐', left: 87, sy: 290, op: 0.80, s: '1.4rem', dur: 4600, delay: 450 },
  { emoji: '✨', left:  8, sy: -150, op: 0.85, s: '1.3rem', dur: 5500, delay: 400 },
  { emoji: '⭐', left: 22, sy: -320, op: 0.72, s: '1.5rem', dur: 5800, delay: 200 },
  { emoji: '💫', left: 48, sy: -180, op: 0.88, s: '1.4rem', dur: 5200, delay: 600 },
  { emoji: '🌟', left: 75, sy: -420, op: 0.76, s: '1.6rem', dur: 6000, delay: 350 },
  { emoji: '⭐', left: 91, sy:  -90, op: 0.82, s: '1.2rem', dur: 5000, delay: 150 },
  { emoji: '✨', left: 38, sy: -560, op: 0.68, s: '1.3rem', dur: 6300, delay: 500 },
  { emoji: '💫', left: 65, sy: -280, op: 0.80, s: '1.5rem', dur: 5600, delay: 250 },
  { emoji: '⭐', left: 14, sy: -700, op: 0.60, s: '1.2rem', dur: 6800, delay: 700 },
  { emoji: '✨', left: 55, sy: 640,  op: 0.68, s: '1.1rem', dur: 4100, delay: 600 },
  { emoji: '⭐', left: 40, sy: 380,  op: 0.75, s: '1.3rem', dur: 4500, delay: 450 },
  { emoji: '💫', left: 96, sy: 180,  op: 0.80, s: '1.4rem', dur: 4700, delay: 200 },
  // ── Planets & moons — delay until ground is off screen (~3000ms) ──
  { emoji: '🪐', left: 15, sy: -200, op: 1.0,  s: '3.2rem', dur: 7200, delay: 3200 },
  { emoji: '🌙', left: 78, sy:  200, op: 0.95, s: '2.8rem', dur: 6500, delay: 3000 },
  { emoji: '🪐', left: 52, sy: -650, op: 1.0,  s: '2.5rem', dur: 8000, delay: 3800 },
  { emoji: '🌕', left: 88, sy: -420, op: 0.90, s: '2.4rem', dur: 7400, delay: 3400 },
  { emoji: '🌙', left:  4, sy:  450, op: 0.85, s: '2.2rem', dur: 6200, delay: 3200 },
  { emoji: '🪐', left: 72, sy: -850, op: 1.0,  s: '3.0rem', dur: 8600, delay: 4200 },
  // ── Comets — start appearing as sky fades ──
  { emoji: '☄️', left: 32, sy: -380, op: 0.95, s: '2.6rem', dur: 6800, delay: 2900 },
  { emoji: '☄️', left: 82, sy: -550, op: 1.0,  s: '2.8rem', dur: 7000, delay: 2800 },
  { emoji: '☄️', left: 10, sy: -850, op: 0.95, s: '2.4rem', dur: 7800, delay: 3500 },
  // ── Fun objects — aliens, UFOs, satellite — well after ground is gone ──
  { emoji: '👽',  left: 73, sy:  -300, op: 1.0,  s: '3.5rem', dur: 8500, delay: 3800 },
  { emoji: '🛸',  left: 20, sy:  -500, op: 1.0,  s: '3.8rem', dur: 9000, delay: 4200 },
  { emoji: '🛰️', left: 62, sy:  -150, op: 1.0,  s: '3.0rem', dur: 7600, delay: 3500 },
  { emoji: '👽',  left: 88, sy:  -800, op: 0.95, s: '2.8rem', dur: 8200, delay: 4800 },
  { emoji: '🛸',  left:  7, sy:  -600, op: 1.0,  s: '3.2rem', dur: 8800, delay: 5200 },
  { emoji: '🛰️', left: 45, sy:  -900, op: 0.90, s: '2.6rem', dur: 9200, delay: 4500 },
  { emoji: '👾',  left: 36, sy: -1050, op: 1.0,  s: '3.4rem', dur: 9500, delay: 5500 },
  { emoji: '🌌',  left: 58, sy:  -700, op: 0.70, s: '4.0rem', dur: 9800, delay: 5800 },
];

// ── Launch smoke ───────────────────────────────────────────────────────────
// Foreground smoke puffs that blast DOWNWARD from the rocket nozzle at ignition.
// Using only ☁️ — fog/wind emoji (🌫️ 💨) render as opaque rectangles at large
// scale in Chrome/WebKit, producing the white-box artifacts.
//
// Positive sdy = downward (toward bottom of screen). The rocket goes UP, so
// the exhaust + smoke are driven DOWN — this maintains the ascent illusion.
// z=50 puts these in front of everything.
const SMOKE_PUFFS = [
  // Central downward plume
  { sdx:    '0px', sdy: '230px', ssc: 5.0, size: '3.5rem', delay: 400, dur: 1800 },
  { sdx:   '22px', sdy: '310px', ssc: 4.8, size: '3.0rem', delay: 450, dur: 2000 },
  { sdx:  '-18px', sdy: '360px', ssc: 5.4, size: '4.0rem', delay: 480, dur: 1700 },
  // Fanning outward as they go down
  { sdx:   '75px', sdy: '260px', ssc: 4.2, size: '2.8rem', delay: 420, dur: 2200 },
  { sdx:  '-85px', sdy: '280px', ssc: 4.4, size: '2.8rem', delay: 460, dur: 2100 },
  { sdx:  '150px', sdy: '210px', ssc: 3.8, size: '2.4rem', delay: 500, dur: 2400 },
  { sdx: '-155px', sdy: '220px', ssc: 3.6, size: '2.4rem', delay: 490, dur: 2300 },
  // Trailing puffs — reach further down
  { sdx:   '32px', sdy: '410px', ssc: 5.5, size: '3.8rem', delay: 600, dur: 1600 },
  { sdx:  '-28px', sdy: '430px', ssc: 5.0, size: '3.5rem', delay: 650, dur: 1700 },
  { sdx:  '105px', sdy: '350px', ssc: 4.0, size: '3.0rem', delay: 570, dur: 2000 },
];

// ── Boom rings ────────────────────────────────────────────────────────────
// Three concentric expanding rings timed to the ignition flash.
// Positioned at the rocket center (left: 50%, top: 43%); the smoke-ring
// keyframe's translate(-50%, -50%) centers each ring on that point.
const BOOM_RINGS = [
  { color: '#f97316', border: 9, size:  60, dur:  580, delay: 360 },
  { color: '#fbbf24', border: 7, size:  70, dur:  740, delay: 420 },
  { color: '#fde68a', border: 5, size:  60, dur:  920, delay: 490 },
];

// ── Clouds ─────────────────────────────────────────────────────────────────
// Six large ☁️ emoji drift downward past the rocket as it climbs.
// Using emoji avoids the GPU rectangular-bounding-box artifact that CSS
// blob divs (background + border-radius + filter: blur) produce in some
// browsers when rendered in a composited layer.
//
// left : CSS left value (can go negative to partially bleed off-screen)
// cy   : starting translateY in px (negative → starts above viewport)
// cdx  : horizontal drift applied by the end of the animation (signed px string)
// cop  : peak opacity
// size : font-size CSS string
const CLOUDS = [
  { left:  '-8%', cy: -160, cdx:  '30px', cop: 0.70, size: '11rem', delay:  800, dur: 3600 },
  { left:  '45%', cy: -300, cdx: '-28px', cop: 0.58, size:  '8rem', delay: 1300, dur: 4100 },
  { left:   '8%', cy:  -80, cdx:  '24px', cop: 0.75, size: '10rem', delay: 2000, dur: 3500 },
  { left: '-14%', cy: -430, cdx:  '42px', cop: 0.52, size: '12rem', delay: 2700, dur: 4500 },
  { left:  '50%', cy: -240, cdx: '-30px', cop: 0.62, size:  '9rem', delay: 3300, dur: 3900 },
  { left:   '4%', cy: -480, cdx:  '18px', cop: 0.48, size: '10rem', delay: 1600, dur: 4800 },
];

// ── Exhaust particles ──────────────────────────────────────────────────────
// 4 waves × 8 particles.  Fire leads; smoke expands behind it.
// dx/dy/sc feed into the exhaust-launch keyframe's CSS custom properties.
function buildExhaust() {
  const EMOJIS = ['🔥', '🔥', '🔥', '🔥', '💨', '💨', '☁️', '💨'];
  const out = [];
  for (let wave = 0; wave < 4; wave++) {
    for (let pos = 0; pos < 8; pos++) {
      const emoji  = EMOJIS[pos];
      const isFire = emoji === '🔥';
      // Fan particles out horizontally; outer positions spread wider
      const spread = Math.round((pos - 3.5) * 32);
      out.push({
        emoji,
        dx:    `${spread}px`,
        dy:    `${170 + wave * 65}px`,
        sc:    isFire ? (0.55 + (pos % 3) * 0.18).toFixed(2) : (1.0 + (pos % 3) * 0.35).toFixed(2),
        size:  isFire ? 30 + (pos % 3) * 8 : 26 + (pos % 3) * 6,
        delay: 380 + wave * 310,
        dur:   680 + pos * 55,
      });
    }
  }
  return out;
}
const EXHAUST = buildExhaust();

export default function SpaceLaunchAnimation() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">

      {/* ── 1. Deep-space base (always visible beneath sky overlay) ── */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, #020617 35%, #0c1445 100%)',
          zIndex: 1,
        }}
      />

      {/* ── 2. Blue sky overlay — fades out as we leave the atmosphere ── */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, #0284c7 0%, #38bdf8 45%, #7dd3fc 75%, #bae6fd 100%)',
          zIndex: 2,
          animation: 'sky-to-space 5500ms ease-in 600ms both',
        }}
      />

      {/* ── 3a. Background star field — slow CSS pixel-dots behind everything ── */}
      {BG_STARS.map((star, i) => (
        <div
          key={`bg-star-${i}`}
          className="absolute rounded-full"
          style={{
            left:            `${star.left}%`,
            top:             0,
            width:           star.s,
            height:          star.s,
            backgroundColor: '#e2e8f0',
            zIndex:          4,
            '--sy': `${star.sy}px`,
            '--op': star.op,
            animation: `star-scroll ${star.dur}ms linear ${star.delay}ms both`,
          }}
        />
      ))}

      {/* ── 3b. Space objects — planets, stars, aliens, satellites stream downward ── */}
      {SPACE_OBJECTS.map((obj, i) => (
        <div
          key={`space-${i}`}
          className="absolute select-none leading-none"
          style={{
            left:     `${obj.left}%`,
            top:      0,
            fontSize: obj.s,
            zIndex:   5,
            '--sy': `${obj.sy}px`,
            '--op': obj.op,
            animation: `star-scroll ${obj.dur}ms linear ${obj.delay}ms both`,
          }}
        >
          {obj.emoji}
        </div>
      ))}

      {/* ── 4a. Ground fill (z=10) — green base slides off bottom ── */}
      <div
        className="absolute inset-x-0"
        style={{
          top:       '52%',
          bottom:    0,
          zIndex:    10,
          animation: 'ground-recede 2400ms ease-in 480ms both',
        }}
      >
        <div className="absolute inset-0" style={{ backgroundColor: '#15803d' }} />
        <div
          className="absolute inset-x-0"
          style={{ top: 0, height: 6, backgroundColor: '#166534' }}
        />
      </div>

      {/* ── 4b. Ground facade (z=33) — green cover + launchpad platform.
               z=33 is ABOVE the rocket (z=30), so the green fill hides
               the rocket's nozzle + flame while it is parked on the pad.
               The platform sits on top of the green like a real launch pad.
               Slides away with the same ground-recede timing.           ── */}
      <div
        className="absolute inset-x-0"
        style={{
          top:       '52%',
          bottom:    0,
          zIndex:    33,
          animation: 'ground-recede 2400ms ease-in 480ms both',
        }}
      >
        {/* Green cover — hides nozzle below horizon */}
        <div className="absolute inset-0" style={{ backgroundColor: '#15803d' }} />
        {/* Launchpad platform — flat pad only, no arm or brace */}
        <div
          className="absolute"
          style={{
            left:            'calc(50% - 96px)',
            top:             -14,
            width:           192,
            height:          20,
            backgroundColor: '#64748b',
            borderRadius:    3,
          }}
        />
        <div
          className="absolute"
          style={{
            left:            'calc(50% - 92px)',
            top:             -14,
            width:           184,
            height:          4,
            backgroundColor: '#94a3b8',
            borderRadius:    '3px 3px 0 0',
          }}
        />
      </div>

      {/* ── 5. Exhaust particles — fire & smoke blast from nozzle ── */}
      {EXHAUST.map((p, i) => (
        <div
          key={`exhaust-${i}`}
          className="absolute select-none leading-none"
          style={{
            left:     '50%',
            top:      'calc(46% + 38px)',
            fontSize: p.size,
            zIndex:   20,
            '--dx':   p.dx,
            '--dy':   p.dy,
            '--sc':   p.sc,
            animation: `exhaust-launch ${p.dur}ms ease-out ${p.delay}ms both`,
          }}
        >
          {p.emoji}
        </div>
      ))}

      {/* ── 6. Boom rings — expanding shockwave circles at ignition ── */}
      {BOOM_RINGS.map((ring, i) => (
        <div
          key={`boom-ring-${i}`}
          className="absolute pointer-events-none"
          style={{
            left:         '50%',
            top:          'calc(46% + 30px)',
            width:        ring.size,
            height:       ring.size,
            borderRadius: '50%',
            border:       `${ring.border}px solid ${ring.color}`,
            zIndex:       31,
            animation:    `smoke-ring ${ring.dur}ms ease-out ${ring.delay}ms both`,
          }}
        />
      ))}

      {/* Boom burst emoji — pops in hard then fades while expanding */}
      <div
        className="absolute select-none leading-none pointer-events-none"
        style={{
          left:      '50%',
          top:       'calc(46% + 30px)',
          fontSize:  '5.5rem',
          zIndex:    32,
          animation: 'boom-burst 1300ms ease-out 340ms both',
        }}
      >
        💥
      </div>

      {/* ── 7. Rocket ── */}
      {/* (numbered in source order; rendered below clouds in z-stack) */}
      {/* Outer wrapper: horizontal ignition shake */}
      <div
        className="absolute"
        style={{
          left:      '50%',
          top:       '46%',
          zIndex:    30,
          animation: 'rocket-ignite 520ms ease-out 300ms both',
        }}
      >
        {/* Inner: center on pivot + rotate so rocket points up-left */}
        <div
          style={{
            transform:  'translate(-50%, -50%) rotate(-45deg)',
            fontSize:   '7rem',
            lineHeight: 1,
            filter:     'drop-shadow(0 0 22px rgba(251,191,36,0.80)) drop-shadow(0 0 8px rgba(255,120,0,0.60))',
          }}
        >
          🚀
        </div>
      </div>

      {/* ── 8. Ignition flash — brief white bloom over everything ── */}
      <div
        className="absolute inset-0 bg-white"
        style={{
          zIndex:    35,
          animation: 'colour-wash 300ms ease-out 360ms both',
          '--peak':  0.82,
        }}
      />

      {/* ── 9. Launch smoke — foreground puffs billowing from the pad ── */}
      {/* z=39: above clouds (z=38) but below the dancing cat (z=40 DevScreen / z=50 PayoffScreen). */}
      {SMOKE_PUFFS.map((p, i) => (
        <div
          key={`smoke-${i}`}
          className="absolute select-none leading-none pointer-events-none"
          style={{
            left:      '50%',
            top:       '52%',
            fontSize:  p.size,
            zIndex:    39,
            '--sdx':   p.sdx,
            '--sdy':   p.sdy,
            '--ssc':   p.ssc,
            animation: `ground-smoke ${p.dur}ms ease-out ${p.delay}ms both`,
          }}
        >
          ☁️
        </div>
      ))}

      {/* ── 10. Foreground clouds — ☁️ emoji drift downward past the rocket ── */}
      {CLOUDS.map((cloud, i) => (
        <div
          key={`cloud-${i}`}
          className="absolute select-none leading-none pointer-events-none"
          style={{
            left:      cloud.left,
            top:       0,
            fontSize:  cloud.size,
            zIndex:    38,
            '--cy':    `${cloud.cy}px`,
            '--cdx':   cloud.cdx,
            '--cop':   cloud.cop,
            animation: `cloud-drift ${cloud.dur}ms ease-in-out ${cloud.delay}ms both`,
          }}
        >
          ☁️
        </div>
      ))}

      {/* ── 11. Payoff text — amber glow, above the chaos ── */}
      <div
        className="absolute inset-x-0 flex flex-col items-center z-40"
        style={{ top: '11%' }}
      >
        <div
          className="text-center animate-payoff-text"
          style={{ animationDelay: '650ms', animationFillMode: 'backwards' }}
        >
          <div
            className="font-display text-5xl sm:text-6xl leading-tight"
            style={{
              color:      '#fef3c7',
              textShadow: '0 2px 14px rgba(0,0,0,0.95), 0 0 32px rgba(251,191,36,0.65)',
            }}
          >
            SPACE
          </div>
          <div
            className="font-display text-5xl sm:text-6xl leading-tight"
            style={{
              color:      '#fbbf24',
              textShadow: '0 2px 14px rgba(0,0,0,0.95), 0 0 32px rgba(251,191,36,0.65)',
            }}
          >
            LAUNCH! 🚀
          </div>
        </div>
      </div>

    </div>
  );
}
