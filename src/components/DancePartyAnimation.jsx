/**
 * Dance Party payoff animation.
 *
 * Effects:
 *   - Dark overlay so the lights pop against a near-black BG
 *   - 🪩 disco ball at top-centre bobbing gently
 *   - Two counter-rotating conic-gradient discs create sweeping
 *     coloured beams across the whole screen (disco ball effect)
 *   - Six pulsing coloured floor spotlights along the bottom
 *   - Four dancing GIFs bouncing around the screen
 *   - Payoff text with rainbow text-shadow glow
 */

// Disco ball position (percentage — matches the conic-gradient centre)
const BALL_TOP  = '13%';
const BALL_LEFT = '50%';

// ── Floor spotlight pools ─────────────────────────────────────────────
// Each is a coloured ellipse that pulses in opacity + scale.
const SPOTS = [
  { color: 'rgba(255, 60,172,0.55)', left: '10%', dur: '2.1s', delay: '0.0s', rx: 70, ry: 28 },
  { color: 'rgba( 76,201,240,0.50)', left: '30%', dur: '1.8s', delay: '0.4s', rx: 90, ry: 32 },
  { color: 'rgba(255,211, 61,0.48)', left: '52%', dur: '2.4s', delay: '0.9s', rx: 80, ry: 30 },
  { color: 'rgba(131, 56,236,0.50)', left: '72%', dur: '2.0s', delay: '0.2s', rx: 75, ry: 26 },
  { color: 'rgba(123,241,168,0.45)', left: '88%', dur: '1.9s', delay: '0.7s', rx: 60, ry: 24 },
  { color: 'rgba(255,107, 53,0.48)', left: '20%', dur: '2.3s', delay: '1.1s', rx: 65, ry: 22 },
];

// ── Dancing GIFs ──────────────────────────────────────────────────────
const GIFS = [
  {
    src: '/dance-cat.gif',
    style: { width: 200, left: '4%',  top: '18%', zIndex: 20 },
    bobDur: '0.55s', bobDelay: '0.0s',
  },
  {
    src: '/dance-gru.gif',
    style: { width: 220, right: '4%', top: '12%', zIndex: 20 },
    bobDur: '0.60s', bobDelay: '0.18s',
  },
  {
    src: '/dance-st2.gif',
    style: { width: 200, left: '38%', top: '38%', zIndex: 22 },
    bobDur: '0.50s', bobDelay: '0.08s',
  },
  {
    src: '/elmo.gif',
    style: { width: 180, left: '6%',  top: '52%', zIndex: 20 },
    bobDur: '0.58s', bobDelay: '0.25s',
  },
  {
    src: '/spongebob-dance.gif',
    style: { width: 175, right: '3%', top: '50%', zIndex: 20 },
    bobDur: '0.52s', bobDelay: '0.33s',
  },
];

export default function DancePartyAnimation() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">

      {/* ── Near-black base so lights pop ───────────────────────────── */}
      <div className="absolute inset-0 bg-black/65" />

      {/* ── Primary beam disc — rotates clockwise ──────────────────── */}
      {/* Outer div: pure positioning (translate). Inner div: pure rotation.   */}
      {/* Keeping them separate prevents the animation from overwriting the    */}
      {/* translate(-50%,-50%) centering transform.                            */}
      <div
        className="absolute pointer-events-none"
        style={{
          top:    BALL_TOP,
          left:   BALL_LEFT,
          width:  '320vmax',
          height: '320vmax',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div style={{
          width:        '100%',
          height:       '100%',
          borderRadius: '50%',
          background: [
            'conic-gradient(from 0deg at 50% 50%,',
            '  transparent 0deg,',
            '  rgba(255, 60,172,0.50) 7deg, transparent 16deg,',
            '  transparent 58deg,',
            '  rgba( 76,201,240,0.48) 66deg, transparent 75deg,',
            '  transparent 115deg,',
            '  rgba(255,211, 61,0.45) 124deg, transparent 133deg,',
            '  transparent 172deg,',
            '  rgba(131, 56,236,0.48) 181deg, transparent 190deg,',
            '  transparent 228deg,',
            '  rgba(123,241,168,0.45) 237deg, transparent 246deg,',
            '  transparent 290deg,',
            '  rgba(255,107, 53,0.46) 299deg, transparent 308deg,',
            '  transparent 360deg',
            ')',
          ].join(' '),
          animation: 'vortex-spin 9s linear infinite',
        }} />
      </div>

      {/* ── Secondary beam disc — counter-rotates, offset colours ───── */}
      <div
        className="absolute pointer-events-none"
        style={{
          top:    BALL_TOP,
          left:   BALL_LEFT,
          width:  '280vmax',
          height: '280vmax',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div style={{
          width:        '100%',
          height:       '100%',
          borderRadius: '50%',
          background: [
            'conic-gradient(from 45deg at 50% 50%,',
            '  transparent 0deg,',
            '  rgba(255,  0,128,0.42) 6deg, transparent 14deg,',
            '  transparent 80deg,',
            '  rgba( 48,213,200,0.42) 88deg, transparent 96deg,',
            '  transparent 148deg,',
            '  rgba(255,230,  0,0.40) 156deg, transparent 164deg,',
            '  transparent 215deg,',
            '  rgba(180, 50,255,0.42) 223deg, transparent 231deg,',
            '  transparent 275deg,',
            '  rgba( 80,255,120,0.40) 283deg, transparent 291deg,',
            '  transparent 360deg',
            ')',
          ].join(' '),
          animation: 'vortex-spin 6s linear reverse infinite',
        }} />
      </div>

      {/* ── 🪩 Disco ball ────────────────────────────────────────────── */}
      <div
        className="absolute select-none pointer-events-none"
        style={{
          top:       BALL_TOP,
          left:      BALL_LEFT,
          transform: 'translate(-50%, -50%)',
          fontSize:  '3.2rem',
          zIndex:    60,
          animation: 'disco-bob 1.8s ease-in-out infinite',
          filter:    'drop-shadow(0 0 12px rgba(255,255,255,0.6))',
        }}
      >
        🪩
      </div>

      {/* ── Coloured floor spotlights ─────────────────────────────────── */}
      {SPOTS.map((s, i) => (
        <div
          key={`spot-${i}`}
          className="absolute pointer-events-none"
          style={{
            bottom:    '-2%',
            left:      s.left,
            width:     s.rx * 2,
            height:    s.ry * 2,
            borderRadius: '50%',
            background: `radial-gradient(ellipse at center, ${s.color} 0%, transparent 70%)`,
            transform:  'translate(-50%, 0)',
            zIndex:     5,
            animation:  `disco-spot ${s.dur} ease-in-out ${s.delay} infinite`,
          }}
        />
      ))}

      {/* ── Dancing GIFs ─────────────────────────────────────────────── */}
      {GIFS.map((g, i) => (
        <img
          key={`gif-${i}`}
          src={g.src}
          alt=""
          draggable={false}
          className="absolute select-none"
          style={{
            ...g.style,
            animation: `disco-bob ${g.bobDur} ease-in-out ${g.bobDelay} infinite`,
          }}
        />
      ))}

      {/* ── Payoff text ───────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ paddingBottom: '28%', zIndex: 40 }}
      >
        <div
          className="text-center animate-payoff-text"
          style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}
        >
          <div
            className="font-display text-5xl sm:text-6xl leading-tight select-none"
            style={{
              color:      '#ffd93d',
              textShadow: '0 0 30px #ff3cac, 0 0 60px #8338ec, 0 2px 8px rgba(0,0,0,0.9)',
            }}
          >
            DANCE
          </div>
          <div
            className="font-display text-5xl sm:text-6xl leading-tight select-none"
            style={{
              color:      '#f0abfc',
              textShadow: '0 0 30px #4cc9f0, 0 0 60px #ff3cac, 0 2px 8px rgba(0,0,0,0.9)',
            }}
          >
            PARTY! 🎉
          </div>
        </div>
      </div>
    </div>
  );
}
