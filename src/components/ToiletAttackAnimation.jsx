/**
 * Toilet Attack payoff animation.
 *
 * Cascading 🚽 💩 🧻 💦 emojis rain down from the top in three depth
 * layers, creating a parallax effect: large near items fall fast,
 * small distant ones fall slow.
 *
 * Background images (elmo.gif and bouncing-TP.webp) float behind all
 * the emoji layers — they fade in, drift slowly across the screen, and
 * fade out over ~6 s.
 *
 * Layer 1 — Foreground  (20 items, 68–88 px, 1.6–2.2 s fall, z=30)
 * Layer 2 — Middle      (20 items, 40–52 px, 2.4–3.0 s fall, z=20)
 * Layer 3 — Background  (15 items, 20–29 px, 3.4–4.6 s fall, z=10)
 * Images   — z=5 / z=3  (behind all emoji layers)
 */

const EMOJIS = ['🚽', '💩', '🚽', '💩', '🧻', '🚽', '💩', '💦'];

/**
 * Build one depth layer of falling items.
 * @param {number} count        number of items
 * @param {number} sizeBase     font-size of first item (px)
 * @param {number} sizeStep     font-size increment per (i % 4)
 * @param {number} durBase      animation duration of first item (ms)
 * @param {number} durStep      duration increment per (i % 4)
 * @param {number} delayStep    stagger between items (ms)
 * @param {number} zIndex       CSS z-index for this layer
 * @param {number} opBase       peak opacity (0–1)
 * @param {number} emojiOffset  shift into EMOJIS array
 */
function makeLayer(count, sizeBase, sizeStep, durBase, durStep, delayStep, zIndex, opBase, emojiOffset = 0) {
  return Array.from({ length: count }, (_, i) => ({
    emoji: EMOJIS[(i + emojiOffset) % EMOJIS.length],
    // Spread across the screen width with a slight jitter
    x:     Math.round((i / count) * 355 + (i % 3) * 6),
    size:  sizeBase  + (i % 4) * sizeStep,
    delay: i * delayStep,
    dur:   durBase   + (i % 4) * durStep,
    // Alternating tilts for organic look
    r0:    `${(i % 7 - 3) * 8}deg`,   // start tilt ≈ -24 → +24 °
    r1:    `${(i % 7 - 3) * 16}deg`,  // end   tilt ≈ -48 → +48 °
    op:    opBase,
    zIndex,
  }));
}

const LAYER1 = makeLayer(20, 68, 6,  1600, 200, 110, 30, 1.0,  0);
const LAYER2 = makeLayer(20, 40, 4,  2400, 200, 120, 20, 0.80, 2);
const LAYER3 = makeLayer(15, 20, 3,  3400, 400, 150, 10, 0.52, 1);

const ALL = [...LAYER1, ...LAYER2, ...LAYER3];

export default function ToiletAttackAnimation() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">

      {/* Amber/brown "toilet water" tint washes */}
      <div className="absolute inset-0 bg-amber-950"  style={{ animation: 'colour-wash 0.7s ease-out 0.0s forwards', '--peak': 0.28 }} />
      <div className="absolute inset-0 bg-yellow-900" style={{ animation: 'colour-wash 0.8s ease-out 0.8s forwards', '--peak': 0.22 }} />
      <div className="absolute inset-0 bg-amber-900"  style={{ animation: 'colour-wash 0.8s ease-out 1.7s forwards', '--peak': 0.18 }} />
      <div className="absolute inset-0 bg-yellow-800" style={{ animation: 'colour-wash 0.9s ease-out 2.6s forwards', '--peak': 0.15 }} />

      {/* ── Background drifting images — behind all emoji layers ──
          img-drift: fades in → holds visible → slowly drifts → fades.
          z=5 / z=3 keeps them below the lowest emoji layer (z=10).  */}
      <img
        src="/elmo.gif"
        alt=""
        draggable={false}
        className="absolute select-none"
        style={{
          width:     180,
          left:      '6%',
          top:       '22%',
          zIndex:    5,
          '--op':    0.88,
          '--dx':    '30px',
          animation: 'img-drift 6000ms ease-in-out 300ms both',
        }}
      />
      <img
        src="/bouncing-TP.webp"
        alt=""
        draggable={false}
        className="absolute select-none"
        style={{
          width:     155,
          right:     '5%',
          top:       '32%',
          zIndex:    3,
          '--op':    0.80,
          '--dx':    '-26px',
          animation: 'img-drift 6000ms ease-in-out 700ms both',
        }}
      />

      {/* ── Cascading emoji ───────────────────────────────────── */}
      {ALL.map((item, i) => (
        <div key={`toilet-${i}`} className="absolute select-none leading-none"
          style={{
            left:     item.x,
            top:      0,
            fontSize: item.size,
            zIndex:   item.zIndex,
            '--r0': item.r0,
            '--r1': item.r1,
            '--op':   item.op,
            animation: `toilet-fall ${item.dur}ms ease-in ${item.delay}ms both`,
          }}
        >
          {item.emoji}
        </div>
      ))}

      {/* Payoff text — warm glow over the chaos */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-40"
           style={{ paddingBottom: '28%' }}>
        <div className="text-center animate-payoff-text"
             style={{ animationDelay: '500ms', animationFillMode: 'backwards' }}>
          <div className="font-display text-5xl sm:text-6xl leading-tight"
               style={{ color: '#fef3c7', textShadow: '0 2px 14px rgba(0,0,0,0.95), 0 0 28px rgba(251,191,36,0.6)' }}>
            TOILET
          </div>
          <div className="font-display text-5xl sm:text-6xl leading-tight"
               style={{ color: '#fbbf24', textShadow: '0 2px 14px rgba(0,0,0,0.95), 0 0 28px rgba(251,191,36,0.6)' }}>
            ATTACK! 🚽
          </div>
        </div>
      </div>
    </div>
  );
}
