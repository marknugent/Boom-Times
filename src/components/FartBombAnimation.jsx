/**
 * Fart Bomb payoff animation.
 *
 * Particles burst FROM the beaker position and expand outward.
 * The beaker sits at approximately (OX, OY) on the PayoffScreen.
 *
 * Phase 1 (0–600 ms):  Initial tight cloud erupts from beaker
 * Phase 2 (300–3 s):   Multiple expanding rings sweep across the screen
 * Phase 3 (500–4 s):   Screen gets a rolling green tint wave
 * Phase 4 (300–4 s):   Stink lines radiate outward from beaker area
 * Payoff text lands at 700 ms
 */

// Beaker centre on the PayoffScreen (matches Beaker's absolute position)
const OX = 44;  // px from left  (left:16px + beaker half-width ~28px)
const OY = 112; // px from top   (top:60px  + beaker half-height ~48px + top-bar)

// Cloud particles: each bursts from (OX, OY) and translates to (OX+dx, OY+dy)
const CLOUDS = [
  { dx:   10, dy: -40,  scale: 7,   delay:   0, dur: 3800, size: '5rem' },
  { dx:  220, dy:  -80, scale: 5,   delay: 150, dur: 3500, size: '4rem' },
  { dx: -160, dy:  100, scale: 6,   delay: 280, dur: 3600, size: '4.5rem' },
  { dx:  300, dy:  200, scale: 4.5, delay: 120, dur: 3200, size: '3.5rem' },
  { dx: -240, dy: -120, scale: 5,   delay: 400, dur: 3400, size: '3.5rem' },
  { dx:   60, dy:  280, scale: 6,   delay: 220, dur: 3700, size: '5rem' },
  { dx:  350, dy:   60, scale: 4,   delay: 500, dur: 3000, size: '3rem' },
  { dx: -100, dy:  300, scale: 5,   delay: 350, dur: 3500, size: '4rem' },
  { dx:  180, dy: -200, scale: 3.5, delay: 600, dur: 2800, size: '3rem' },
  { dx: -280, dy:  200, scale: 4.5, delay: 450, dur: 3200, size: '3.5rem' },
];

// Stink lines: radiate from the beaker
const LINES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => ({
  angle,
  delay: `${i * 60}ms`,
  length: 70 + (i % 4) * 30,
}));

// Extreme-displeasure emojis scattered around the screen as accents
const DISGUST = [
  { emoji: '🤢', top:  '10%', left: '63%', delay: 380,  size: '3.2rem' },
  { emoji: '🤮', top:   '7%', left: '22%', delay: 620,  size: '2.6rem' },
  { emoji: '😷', top:  '36%', left: '80%', delay: 270,  size: '2.9rem' },
  { emoji: '💀', top:  '20%', left: '46%', delay: 840,  size: '2.5rem' },
  { emoji: '😫', top:  '60%', left: '73%', delay: 510,  size: '2.7rem' },
  { emoji: '🤕', top:  '72%', left: '13%', delay: 730,  size: '2.2rem' },
  { emoji: '😵‍💫', top: '50%', left: '54%', delay: 960,  size: '2.7rem' },
  { emoji: '🫠', top:  '17%', left: '85%', delay: 1120, size: '2.3rem' },
  { emoji: '👎', top:  '82%', left: '52%', delay: 790,  size: '2.3rem' },
  { emoji: '🙀', top:  '44%', left: '10%', delay: 670,  size: '2.7rem' },
  { emoji: '🫣', top:  '29%', left: '67%', delay: 1040, size: '2.1rem' },
  { emoji: '🤢', top:  '77%', left: '87%', delay: 860,  size: '2.3rem' },
];

export default function FartBombAnimation() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">

      {/* Rolling green screen wash — two waves for drama */}
      <div
        className="absolute inset-0 bg-green-500"
        style={{
          animation: 'colour-wash 3.5s ease-out 0.3s forwards',
          '--peak': 0.18,
        }}
      />
      <div
        className="absolute inset-0 bg-green-400"
        style={{
          animation: 'colour-wash 2.8s ease-out 1.2s forwards',
          '--peak': 0.12,
        }}
      />

      {/* Cloud particles — burst from beaker */}
      {CLOUDS.map((c, i) => (
        <div
          key={i}
          className="absolute select-none"
          style={{
            top:  OY,
            left: OX,
            fontSize: c.size,
            '--dx':    `${c.dx}px`,
            '--dy':    `${c.dy}px`,
            '--scale': c.scale,
            animation: `cloud-burst ${c.dur}ms ease-out ${c.delay}ms forwards`,
          }}
        >
          💨
        </div>
      ))}

      {/* Stink lines radiating from beaker area */}
      {LINES.map((l, i) => (
        <div
          key={i}
          className="absolute origin-left stink-line"
          style={{
            top:  OY,
            left: OX,
            width: `${l.length}px`,
            height: '3px',
            background: 'linear-gradient(to right, rgba(134,239,172,0.9), transparent)',
            borderRadius: '2px',
            transform: `rotate(${l.angle}deg)`,
            '--delay': l.delay,
          }}
        />
      ))}

      {/* Disgust emoji accents — pop in around the screen */}
      {DISGUST.map((d, i) => (
        <div
          key={`disgust-${i}`}
          className="absolute select-none pointer-events-none"
          style={{
            top:      d.top,
            left:     d.left,
            fontSize: d.size,
            opacity:  0,
            animation: `disgust-pop 3200ms ease-out ${d.delay}ms forwards`,
          }}
        >
          {d.emoji}
        </div>
      ))}

      {/* Payoff text — pops in after the initial burst */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ paddingBottom: '30%' }}
      >
        <div
          className="text-center animate-payoff-text"
          style={{ animationDelay: '700ms', animationFillMode: 'backwards' }}
        >
          <div className="font-display text-5xl sm:text-6xl text-green-300 drop-shadow-lg leading-tight">
            FART BOMB
          </div>
          <div className="font-display text-3xl text-green-400/90 mt-1">
            COMPLETE 💨
          </div>
        </div>
      </div>
    </div>
  );
}
