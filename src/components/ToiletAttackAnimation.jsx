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
 * Toilet vortex — two overlaid SVG swirls (thick arcs centered on a
 * drain hole) spin at different rates, simulating looking down at a
 * flushing toilet.
 *
 * Layer 1 — Foreground  (20 items, 68–88 px, 1.6–2.2 s fall, z=30)
 * Layer 2 — Middle      (20 items, 40–52 px, 2.4–3.0 s fall, z=20)
 * Layer 3 — Background  (15 items, 20–29 px, 3.4–4.6 s fall, z=10)
 * Images   — z=5 / z=3  (behind all emoji layers)
 * Vortex   — z=1 / z=2  (deepest background)
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

// ── Toilet vortex SVG ──────────────────────────────────────────────────
//
// Old approach (stroked arcs only) left dark "gutters" between rings
// because the background showed through the gaps.
//
// New approach:
//   1. Fill the ENTIRE water disc with a solid blue — no gaps possible.
//   2. Overlay a radial depth gradient to darken toward the drain.
//   3. Draw swirl arms as subtle LIGHTER highlights on top of the fill —
//      they describe surface swirl without creating ring gutters.
//
// Each SVG instance gets a unique gradient ID (uid prop) so the two
// spinning instances don't share / clobber each other's <defs>.
//
function VortexSVG({ uid = 0, size, spinDur, spinDelay = '0s', opacity = 1, zIndex }) {
  const gid = `vortexDepth${uid}`;
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: '50%', top: '45%',
        width: size, height: size,
        transform: 'translate(-50%, -50%)',
        zIndex,
      }}
    >
      <svg
        viewBox="0 0 400 400"
        width={size}
        height={size}
        style={{
          display: 'block',
          opacity,
          animation: `vortex-spin ${spinDur}s linear ${spinDelay} infinite`,
        }}
      >
        <defs>
          {/* Radial gradient: opaque dark at centre (drain depth), transparent at rim */}
          <radialGradient id={gid} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#050d1a" stopOpacity="0.70" />
            <stop offset="30%"  stopColor="#050d1a" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#050d1a" stopOpacity="0"    />
          </radialGradient>
        </defs>

        {/* ── 1. Continuous water fill — covers the whole disc, no gutters ── */}
        <circle cx="200" cy="200" r="185" fill="#1e40af" opacity="0.55" />

        {/* ── 2. Depth overlay — darkens toward the drain ── */}
        <circle cx="200" cy="200" r="185" fill={`url(#${gid})`} />

        {/* ── 3. Swirl arm highlights — surface crests on the water ── */}
        {/* Outer: 300° CW at r=165 */}
        <path d="M 365,200 A 165,165 0 1,1 283,57"
          stroke="#93c5fd" strokeWidth="42" fill="none"
          strokeLinecap="round" opacity="0.28" />
        {/* Mid: 240° CW at r=105 (offset 60°) */}
        <path d="M 253,291 A 105,105 0 1,1 253,109"
          stroke="#bfdbfe" strokeWidth="34" fill="none"
          strokeLinecap="round" opacity="0.25" />
        {/* Inner tail: 180° CW at r=48 */}
        <path d="M 200,248 A 48,48 0 0,1 200,152"
          stroke="#dbeafe" strokeWidth="20" fill="none"
          strokeLinecap="round" opacity="0.22" />

        {/* ── 4. Drain hole ── */}
        <circle cx="200" cy="200" r="26" fill="#050d1a" />
      </svg>
    </div>
  );
}

export default function ToiletAttackAnimation() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">

      {/* Amber/brown "toilet water" tint washes */}
      <div className="absolute inset-0 bg-amber-950"  style={{ animation: 'colour-wash 0.7s ease-out 0.0s both', '--peak': 0.28 }} />
      <div className="absolute inset-0 bg-yellow-900" style={{ animation: 'colour-wash 0.8s ease-out 0.8s both', '--peak': 0.22 }} />
      <div className="absolute inset-0 bg-amber-900"  style={{ animation: 'colour-wash 0.8s ease-out 1.7s both', '--peak': 0.18 }} />
      <div className="absolute inset-0 bg-yellow-800" style={{ animation: 'colour-wash 0.9s ease-out 2.6s both', '--peak': 0.15 }} />

      {/* ── Toilet vortex — two swirls spinning at different rates ──
          z=1 / z=2 keeps them below everything else.
          Second instance starts 30% into its cycle (animationDelay -1.4s)
          so the arms are offset and create an interference pattern.      */}
      <VortexSVG uid={1} size={700} spinDur={7.5}                   opacity={0.50} zIndex={1} />
      <VortexSVG uid={2} size={700} spinDur={4.6} spinDelay="-1.4s" opacity={0.32} zIndex={2} />

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
          '--dx':    '120px',
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
          '--dx':    '-104px',
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
