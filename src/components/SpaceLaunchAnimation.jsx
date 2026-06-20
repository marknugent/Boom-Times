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

import { useEffect, useState } from 'react';
import DancingCat from './DancingCat.jsx';
import { playRocketIgnitionBoom } from '../sounds.js';

// Extra ms of stillness before ignition — lets Pudge dance visibly on the ground.
// Must match bgMusicDelay in experiments.js / DevScreen.jsx.
const LAUNCH_OFFSET = 1500;

// ── Petey easter egg ───────────────────────────────────────────────────────
const PETE_FRAMES   = ['/pete1.png','/pete2.png','/pete3.png','/pete4.png','/pete5.png','/pete6.png','/pete7.png','/pete8.png','/pete9.png','/pete10.png','/pete11.png','/pete12.png'];
const PETE_FRAME_MS = 120;   // slightly faster than bomb-detonation for comedy
const PETE_DELAY_MS = 20000; // 20 s from screen appearance (not affected by LAUNCH_OFFSET)
const PETE_DUR_MS   = 9000;  // time to traverse the screen
const PETE_SY       = -200;  // starts 200 px above viewport

// ── Background star field ──────────────────────────────────────────────────
// Small CSS pixel-dots at z=4 — behind emoji objects (z=5) and the ground
// (z=10), so they only appear in the sky/space area.  Durations 9 – 14 s
// make them drift noticeably slower than the foreground objects, adding
// convincing depth.  Uses the same star-scroll keyframe (--sy, --op).
// dur is inversely proportional to size (bigger = closer = faster), ×1.667 vs prior.
// s:1 → ~22000-27000ms  s:2 → ~17000-19000ms  s:3 → ~12500-14000ms  s:4 → ~9000-10000ms
// All delays offset by LAUNCH_OFFSET so stars only stream in after the rocket fires.
const BG_STARS = [
  // ── On-screen (positive sy) ──
  { left:  2, sy:  80, op: 0.65, s: 3, dur: 13000, delay:    0 + LAUNCH_OFFSET },
  { left:  8, sy: 200, op: 0.50, s: 1, dur: 24200, delay:  150 + LAUNCH_OFFSET },
  { left: 14, sy: 430, op: 0.60, s: 4, dur:  9700, delay:  300 + LAUNCH_OFFSET },
  { left: 20, sy: 690, op: 0.45, s: 1, dur: 22500, delay:  100 + LAUNCH_OFFSET },
  { left: 26, sy: 290, op: 0.70, s: 3, dur: 13300, delay:  450 + LAUNCH_OFFSET },
  { left: 33, sy: 560, op: 0.55, s: 1, dur: 25000, delay:  200 + LAUNCH_OFFSET },
  { left: 39, sy: 130, op: 0.65, s: 2, dur: 17500, delay:  350 + LAUNCH_OFFSET },
  { left: 45, sy: 790, op: 0.40, s: 1, dur: 23300, delay:   50 + LAUNCH_OFFSET },
  { left: 52, sy: 380, op: 0.72, s: 4, dur:  9200, delay:  500 + LAUNCH_OFFSET },
  { left: 58, sy: 220, op: 0.58, s: 1, dur: 24200, delay:  250 + LAUNCH_OFFSET },
  { left: 65, sy: 640, op: 0.62, s: 3, dur: 13700, delay:  400 + LAUNCH_OFFSET },
  { left: 71, sy: 100, op: 0.48, s: 1, dur: 22500, delay:  100 + LAUNCH_OFFSET },
  { left: 78, sy: 460, op: 0.68, s: 4, dur: 10000, delay:  300 + LAUNCH_OFFSET },
  { left: 84, sy: 320, op: 0.54, s: 1, dur: 23300, delay:  200 + LAUNCH_OFFSET },
  { left: 90, sy: 860, op: 0.42, s: 2, dur: 16700, delay:  600 + LAUNCH_OFFSET },
  { left: 96, sy: 180, op: 0.70, s: 3, dur: 12500, delay:  350 + LAUNCH_OFFSET },
  // ── Streaming in from above (negative sy) ──
  { left:  5, sy:  -100, op: 0.62, s: 2, dur: 16700, delay:  200 + LAUNCH_OFFSET },
  { left: 11, sy:  -280, op: 0.50, s: 1, dur: 24200, delay:  400 + LAUNCH_OFFSET },
  { left: 18, sy:  -520, op: 0.68, s: 4, dur:  9700, delay:  100 + LAUNCH_OFFSET },
  { left: 24, sy:  -170, op: 0.55, s: 1, dur: 23300, delay:  550 + LAUNCH_OFFSET },
  { left: 30, sy:  -650, op: 0.45, s: 2, dur: 18300, delay:  300 + LAUNCH_OFFSET },
  { left: 37, sy:  -390, op: 0.72, s: 3, dur: 13300, delay:  150 + LAUNCH_OFFSET },
  { left: 43, sy:  -820, op: 0.38, s: 1, dur: 26700, delay:  500 + LAUNCH_OFFSET },
  { left: 49, sy:  -230, op: 0.65, s: 2, dur: 17500, delay:  250 + LAUNCH_OFFSET },
  { left: 56, sy:  -450, op: 0.58, s: 1, dur: 25000, delay:  400 + LAUNCH_OFFSET },
  { left: 62, sy:  -310, op: 0.70, s: 4, dur:  9200, delay:   50 + LAUNCH_OFFSET },
  { left: 69, sy:  -680, op: 0.48, s: 2, dur: 18300, delay:  350 + LAUNCH_OFFSET },
  { left: 75, sy:  -140, op: 0.75, s: 3, dur: 12500, delay:  200 + LAUNCH_OFFSET },
  { left: 82, sy:  -520, op: 0.52, s: 1, dur: 24200, delay:  450 + LAUNCH_OFFSET },
  { left: 88, sy:  -850, op: 0.42, s: 2, dur: 19200, delay:  600 + LAUNCH_OFFSET },
  { left: 94, sy:  -360, op: 0.60, s: 2, dur: 17500, delay:  150 + LAUNCH_OFFSET },
  { left: 10, sy:  -730, op: 0.45, s: 1, dur: 25800, delay:  700 + LAUNCH_OFFSET },
  { left: 36, sy:  -160, op: 0.68, s: 4, dur:  9700, delay:  300 + LAUNCH_OFFSET },
  { left: 73, sy:  -990, op: 0.38, s: 2, dur: 19200, delay:  800 + LAUNCH_OFFSET },
  { left: 53, sy:  -580, op: 0.55, s: 1, dur: 25000, delay:  450 + LAUNCH_OFFSET },
];

// ── Space objects ──────────────────────────────────────────────────────────
// Parallax rule: larger = closer = faster (shorter dur). Excludes PNG_OBJECTS.
// All delays include LAUNCH_OFFSET so nothing moves before the rocket fires.
// dur values are ~1.67× prior pass (40% speed reduction).
const SPACE_OBJECTS = [
  // ── Stars / sparkles — small, slowest (far away) ──
  { emoji: '⭐', left:  5, sy:  80, op: 0.90, s: '1.4rem', dur: 11700, delay:    0 + LAUNCH_OFFSET },
  { emoji: '🌟', left: 44, sy: 150, op: 0.92, s: '1.8rem', dur:  9700, delay:  150 + LAUNCH_OFFSET },
  { emoji: '💫', left: 83, sy:  70, op: 0.82, s: '1.5rem', dur: 10800, delay:  400 + LAUNCH_OFFSET },
  // ── Planets & moons — medium size, medium speed ──
  { emoji: '🪐', left: 15, sy: -200, op: 1.0,  s: '3.2rem', dur: 5300, delay: 3200 + LAUNCH_OFFSET },
  { emoji: '🌙', left: 78, sy:  200, op: 0.95, s: '2.8rem', dur: 6000, delay: 3000 + LAUNCH_OFFSET },
  // ── Comet — medium-large, noticeably faster ──
  { emoji: '☄️', left: 32, sy: -380, op: 0.95, s: '2.6rem', dur: 6300, delay: 2900 + LAUNCH_OFFSET },
  // ── Fun objects — large, fastest (closest layer) ──
  { emoji: '👽',  left: 73, sy:  -300, op: 1.0,  s: '3.5rem', dur: 4300, delay: 3800 + LAUNCH_OFFSET },
  { emoji: '🛸',  left: 20, sy:  -500, op: 1.0,  s: '3.8rem', dur: 4000, delay: 4200 + LAUNCH_OFFSET },
  { emoji: '🛰️', left: 62, sy:  -150, op: 1.0,  s: '3.0rem', dur: 5300, delay: 3500 + LAUNCH_OFFSET },
  { emoji: '👾',  left: 36, sy: -1050, op: 1.0,  s: '3.4rem', dur: 4700, delay: 5500 + LAUNCH_OFFSET },
];

// ── PNG celestial drifters ─────────────────────────────────────────────────
// Garfield and Spongebob tumble past the rocket on the way to space.
// Each entry uses the star-scroll keyframe on the wrapper (Y translation +
// opacity fade) while the inner <img> rotates independently via vortex-spin.
// max-width is capped at 150 px; height scales proportionally.
// `reverse` flips the spin direction so they don't all turn the same way.
// Sequence: G1 visible ~3200–11200ms · S1 visible ~11500–19500ms ·
//           G2 visible ~20000–28500ms · S2 visible ~29000–37500ms
// Each one is fully faded out before the next fades in.
// Spin durations are intentionally slow (~16–22 s per rotation).
const PNG_OBJECTS = [
  { src: '/garfield.png',  left: 20, sy:  -350, op: 1.0, dur: 8000, delay:  3200 + LAUNCH_OFFSET, spin: 18000, reverse: false },
  { src: '/spongebob.png', left: 62, sy:  -250, op: 1.0, dur: 8000, delay: 11500 + LAUNCH_OFFSET, spin: 16000, reverse: true  },
  { src: '/garfield.png',  left: 75, sy:  -800, op: 0.9, dur: 8500, delay: 20000 + LAUNCH_OFFSET, spin: 22000, reverse: true  },
  { src: '/spongebob.png', left:  8, sy:  -600, op: 0.9, dur: 8500, delay: 29000 + LAUNCH_OFFSET, spin: 20000, reverse: false },
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
  { sdx:    '0px', sdy: '230px', ssc: 5.0, size: '3.5rem', delay: 400 + LAUNCH_OFFSET, dur: 1800 },
  { sdx:   '22px', sdy: '310px', ssc: 4.8, size: '3.0rem', delay: 450 + LAUNCH_OFFSET, dur: 2000 },
  { sdx:  '-18px', sdy: '360px', ssc: 5.4, size: '4.0rem', delay: 480 + LAUNCH_OFFSET, dur: 1700 },
  // Fanning outward as they go down
  { sdx:   '75px', sdy: '260px', ssc: 4.2, size: '2.8rem', delay: 420 + LAUNCH_OFFSET, dur: 2200 },
  { sdx:  '-85px', sdy: '280px', ssc: 4.4, size: '2.8rem', delay: 460 + LAUNCH_OFFSET, dur: 2100 },
  { sdx:  '150px', sdy: '210px', ssc: 3.8, size: '2.4rem', delay: 500 + LAUNCH_OFFSET, dur: 2400 },
  { sdx: '-155px', sdy: '220px', ssc: 3.6, size: '2.4rem', delay: 490 + LAUNCH_OFFSET, dur: 2300 },
  // Trailing puffs — reach further down
  { sdx:   '32px', sdy: '410px', ssc: 5.5, size: '3.8rem', delay: 600 + LAUNCH_OFFSET, dur: 1600 },
  { sdx:  '-28px', sdy: '430px', ssc: 5.0, size: '3.5rem', delay: 650 + LAUNCH_OFFSET, dur: 1700 },
  { sdx:  '105px', sdy: '350px', ssc: 4.0, size: '3.0rem', delay: 570 + LAUNCH_OFFSET, dur: 2000 },
];

// ── Boom rings ────────────────────────────────────────────────────────────
// Three concentric expanding rings timed to the ignition flash.
// Positioned at the rocket center (left: 50%, top: 43%); the smoke-ring
// keyframe's translate(-50%, -50%) centers each ring on that point.
const BOOM_RINGS = [
  { color: '#f97316', border: 9, size:  60, dur:  580, delay: 360 + LAUNCH_OFFSET },
  { color: '#fbbf24', border: 7, size:  70, dur:  740, delay: 420 + LAUNCH_OFFSET },
  { color: '#fde68a', border: 5, size:  60, dur:  920, delay: 490 + LAUNCH_OFFSET },
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
  { left:  '-8%', cy: -160, cdx:  '30px', cop: 0.70, size: '11rem', delay:  800 + LAUNCH_OFFSET, dur: 3600 },
  { left:  '45%', cy: -300, cdx: '-28px', cop: 0.58, size:  '8rem', delay: 1300 + LAUNCH_OFFSET, dur: 4100 },
  { left:   '8%', cy:  -80, cdx:  '24px', cop: 0.75, size: '10rem', delay: 2000 + LAUNCH_OFFSET, dur: 3500 },
  { left: '-14%', cy: -430, cdx:  '42px', cop: 0.52, size: '12rem', delay: 2700 + LAUNCH_OFFSET, dur: 4500 },
  { left:  '50%', cy: -240, cdx: '-30px', cop: 0.62, size:  '9rem', delay: 3300 + LAUNCH_OFFSET, dur: 3900 },
  { left:   '4%', cy: -480, cdx:  '18px', cop: 0.48, size: '10rem', delay: 1600 + LAUNCH_OFFSET, dur: 4800 },
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
        delay: 380 + wave * 310 + LAUNCH_OFFSET,
        dur:   680 + pos * 55,
      });
    }
  }
  return out;
}
const EXHAUST = buildExhaust();

export default function SpaceLaunchAnimation() {
  const [peteFrame,   setPeteFrame]   = useState(0);
  const [peteVisible, setPeteVisible] = useState(false);

  useEffect(() => {
    // Preload Petey frames so there's no flicker when he arrives
    PETE_FRAMES.forEach(src => { const img = new Image(); img.src = src; });

    // Boom at ignition
    const boomTimer = setTimeout(playRocketIgnitionBoom, LAUNCH_OFFSET + 400);

    // Petey easter egg — appears at 20 s, exits ~9 s later
    let frameInterval;
    const showTimer = setTimeout(() => {
      setPeteVisible(true);
      frameInterval = setInterval(
        () => setPeteFrame(f => (f + 1) % PETE_FRAMES.length),
        PETE_FRAME_MS,
      );
      setTimeout(() => {
        clearInterval(frameInterval);
        setPeteVisible(false);
      }, PETE_DUR_MS + 500);
    }, PETE_DELAY_MS);

    return () => {
      clearTimeout(boomTimer);
      clearTimeout(showTimer);
      clearInterval(frameInterval);
    };
  }, []);

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
          animation: `sky-to-space 5500ms ease-in ${600 + LAUNCH_OFFSET}ms both`,
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
            animation: `star-scroll ${star.dur}ms linear ${star.delay}ms infinite both`,
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
            animation: `star-scroll ${obj.dur}ms linear ${obj.delay}ms infinite both`,
          }}
        >
          {obj.emoji}
        </div>
      ))}

      {/* ── 3c. PNG celestial drifters — Garfield & Spongebob tumble past ── */}
      {PNG_OBJECTS.map((obj, i) => (
        <div
          key={`png-obj-${i}`}
          className="absolute select-none pointer-events-none"
          style={{
            left:      `${obj.left}%`,
            top:       0,
            zIndex:    5,
            '--sy':    `${obj.sy}px`,
            '--op':    obj.op,
            animation: `star-scroll ${obj.dur}ms linear ${obj.delay}ms both`,
          }}
        >
          <img
            src={obj.src}
            alt=""
            draggable={false}
            style={{
              maxWidth:           150,
              height:             'auto',
              animation:          `vortex-spin ${obj.spin}ms linear infinite`,
              animationDirection: obj.reverse ? 'reverse' : 'normal',
            }}
          />
        </div>
      ))}

      {/* ── 4a. Ground fill (z=10) — green base slides off bottom ── */}
      <div
        className="absolute inset-x-0"
        style={{
          top:       '52%',
          bottom:    0,
          zIndex:    10,
          animation: `ground-recede 2400ms ease-in ${480 + LAUNCH_OFFSET}ms both`,
        }}
      >
        <div className="absolute inset-0" style={{ backgroundColor: '#15803d' }} />
        <div
          className="absolute inset-x-0"
          style={{ top: 0, height: 6, backgroundColor: '#166534' }}
        />
        {/* Pudge stands at the ground horizon and recedes with it */}
        <div
          className="absolute select-none pointer-events-none"
          style={{ right: '5%', bottom: '100%' }}
        >
          <DancingCat size={160} />
        </div>
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
          animation: `ground-recede 2400ms ease-in ${480 + LAUNCH_OFFSET}ms both`,
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
            top:          'calc(46% + 45px)',
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
          top:       'calc(46% + 45px)',
          fontSize:  '5.5rem',
          zIndex:    32,
          animation: `boom-burst 1300ms ease-out ${340 + LAUNCH_OFFSET}ms both`,
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
          animation: `rocket-ignite 520ms ease-out ${300 + LAUNCH_OFFSET}ms both`,
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
          animation: `colour-wash 300ms ease-out ${360 + LAUNCH_OFFSET}ms both`,
          '--peak':  0.82,
        }}
      />

      {/* ── 9. Launch smoke — foreground puffs billowing from the pad ── */}
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

      {/* ── 11. Petey easter egg — drifts down from above at 20 s ── */}
      {peteVisible && (
        <div
          className="absolute select-none pointer-events-none"
          style={{
            left:      '70%',
            top:       0,
            zIndex:    5,
            '--sy':    `${PETE_SY}px`,
            '--op':    1.0,
            animation: `star-scroll ${PETE_DUR_MS}ms linear 0ms both`,
          }}
        >
          <img
            src={PETE_FRAMES[peteFrame]}
            alt=""
            draggable={false}
            style={{ width: 140, height: 'auto' }}
          />
        </div>
      )}

      {/* ── 12. Payoff text — amber glow, above the chaos ── */}
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
