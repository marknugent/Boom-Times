/**
 * BombDetonationAnimation — countdown-to-explosion payoff screen.
 *
 * Countdown 5→1 at 1200 ms / step, then explosion at 0.
 *
 * Timing:
 *   0 ms    — count 5, beep
 *   1200 ms — count 4, beep
 *   2400 ms — count 3, beep
 *   3600 ms — count 2, beep
 *   4800 ms — count 1, beep
 *   6000 ms — count 0 → ex.gif + explosion boom + pounce-pop-parade
 *   7000 ms — pete sprite launches
 *   9470 ms — gifDone → ex.gif replaced with ex1.png (3470 ms = one GIF cycle)
 *
 * Audio is self-managed. The experiment sets bgMusic to a fake ID so
 * PayoffScreen's audio hooks silently no-op; this component owns all sound.
 *
 * z-stack (all absolute within inset-0 parent):
 *   (default)  background image (ex1.png → ex.gif)
 *   z=5        countdown number + bomb emoji
 *   z=10       pudge sprite
 */
import { useState, useEffect, useMemo } from 'react';
import { playSound, stopSound, playCountdownBeep, playExplosionBoom } from '../sounds.js';

const STEP_MS = 1200;
const GIF_DURATION_MS = 3470; // one full cycle of ex.gif (52 frames @ ~67ms each)
const BOMB_TOP = 'calc(55% - 75px)'; // shared by bomb, debris, and pete origin

const PETE_FRAMES = [
  '/pete8.png','/pete9.png','/pete10.png','/pete11.png','/pete12.png',
  '/pete1.png','/pete2.png','/pete3.png','/pete4.png','/pete5.png','/pete6.png','/pete7.png',
];
const PETE_FRAME_MS  = 143;
const PETE_DELAY_MS  = 700;   // ms after detonation before pete appears
const PETE_LAUNCH_MS = 3000;  // travel duration (matches pete-launch keyframe)

const SQ_FRAMES = Array.from({ length: 12 }, (_, i) => `/sq${i + 1}.png`);
const SQ_FRAME_MS  = 143;
const SQ_DELAY_MS  = 2500;  // ms after detonation before sq appears
const SQ_LAUNCH_MS = 3000;

const TOASTA_DELAY_MS  = 1750; // ms after detonation before toaster appears
const TOASTA_LAUNCH_MS = 3000;

const SQ_PEEK_DELAY_MS = 6200; // ms after detonation — after sq fully exits (2500+3000+buffer)
const SQ_PEEK_TOTAL_MS = 3400; // 0.8s slide in + 1.8s pause + 0.8s slide out

// Shared origin: bomb emoji center ≈ top:55% left:50%
const SPRITE_ORIGIN   = { top: '55%', left: '50%' };
const SPRITE_MARGIN_X = -75;   // centres a 150px-wide sprite horizontally
const SPRITE_MARGIN_Y = -142;  // centres vertically + shifts origin up 67px total

const DEBRIS_COLORS = ['#ff6b00', '#ffcc00', '#ff3300', '#cccccc', '#ff8800', '#ffffff', '#ff4400'];

function makeDebris() {
  const count = 16;
  return Array.from({ length: count }, (_, i) => ({
    angle:    (360 / count) * i + (Math.random() - 0.5) * 22,
    dist:     Math.round(200 + Math.random() * 230),
    scale:    parseFloat((2.5 + Math.random() * 2.5).toFixed(1)),
    duration: Math.round(900 + Math.random() * 700),
    delay:    Math.round(Math.random() * 200),
    w:        Math.round(6 + Math.random() * 9),
    h:        Math.round(5 + Math.random() * 10),
    color:    DEBRIS_COLORS[Math.floor(Math.random() * DEBRIS_COLORS.length)],
  }));
}

function getPudgeSprite(count) {
  if (count === 0) return '/pudex2.png';
  if (count >= 5)  return '/pudex1.png';
  if (count === 4) return '/pudex2.png';
  if (count === 3) return '/pudex3.png';
  return '/pudex4.png';
}

// Shake intensity ramps up as count drops. null = no shake.
const SHAKE = {
  4: { period: 400, amp: 4  },
  3: { period: 300, amp: 8  },
  2: { period: 200, amp: 14 },
  1: { period: 130, amp: 20 },
};

export default function BombDetonationAnimation() {
  const [count, setCount] = useState(5);
  const [gifDone, setGifDone] = useState(false);
  const [peteFrame, setPeteFrame]   = useState(0);
  const [peteVisible, setPeteVisible] = useState(false);
  const [sqFrame, setSqFrame]       = useState(0);
  const [sqVisible, setSqVisible]   = useState(false);
  const [toastaVisible, setToastaVisible] = useState(false);
  const [sqPeekVisible, setSqPeekVisible] = useState(false);
  const exploded = count === 0;
  const debris = useMemo(makeDebris, []);

  // Preload all sprite frames immediately so they're cached by the time
  // they're needed (Pete at +7s, SQ at +8.5s from component mount)
  useEffect(() => {
    [...PETE_FRAMES, ...SQ_FRAMES, '/toasta.png', '/sq-peek.png', '/ex.gif', '/ex1.png'].forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    playCountdownBeep();

    const timers = [];
    for (let i = 1; i <= 5; i++) {
      const next = 5 - i;
      timers.push(setTimeout(() => {
        setCount(next);
        if (next > 0) {
          playCountdownBeep();
        } else {
          playExplosionBoom();
          playSound('pounce-pop-parade');
          // Remove GIF after one full cycle so it doesn't loop
          timers.push(setTimeout(() => setGifDone(true), GIF_DURATION_MS));
        }
      }, i * STEP_MS));
    }
    return () => timers.forEach(clearTimeout);
  }, []);

  // Stop music if component unmounts before countdown finishes (e.g. dev replay)
  useEffect(() => () => stopSound('pounce-pop-parade'), []);

  // Pete: appears 1s after detonation, exits top-right
  useEffect(() => {
    if (!exploded) return;
    let frameTimer = null;
    const showTimer = setTimeout(() => {
      setPeteVisible(true);
      frameTimer = setInterval(
        () => setPeteFrame(f => (f + 1) % PETE_FRAMES.length),
        PETE_FRAME_MS,
      );
    }, PETE_DELAY_MS);
    return () => { clearTimeout(showTimer); if (frameTimer) clearInterval(frameTimer); };
  }, [exploded]);

  // Sq: appears 2.5s after detonation, exits bottom-right
  useEffect(() => {
    if (!exploded) return;
    let frameTimer = null;
    const showTimer = setTimeout(() => {
      setSqVisible(true);
      frameTimer = setInterval(
        () => setSqFrame(f => (f + 1) % SQ_FRAMES.length),
        SQ_FRAME_MS,
      );
    }, SQ_DELAY_MS);
    return () => { clearTimeout(showTimer); if (frameTimer) clearInterval(frameTimer); };
  }, [exploded]);

  // Toasta: appears 1.75s after detonation, rotates out top-left
  useEffect(() => {
    if (!exploded) return;
    const showTimer = setTimeout(() => setToastaVisible(true), TOASTA_DELAY_MS);
    return () => clearTimeout(showTimer);
  }, [exploded]);

  // Sq peek: slides in from left after sq sprite fully exits (~5.5s after detonation)
  useEffect(() => {
    if (!exploded) return;
    const showTimer = setTimeout(() => setSqPeekVisible(true), SQ_PEEK_DELAY_MS);
    return () => clearTimeout(showTimer);
  }, [exploded]);

  const shake = SHAKE[count] ?? null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ background: '#000' }}>

      {/* ── Background image: full width, centred vertically ─────── */}
      <img
        key={gifDone ? 'still' : exploded ? 'gif' : 'png'}
        src={gifDone ? '/ex1.png' : exploded ? '/ex.gif' : '/ex1.png'}
        alt=""
        draggable={false}
        className="absolute inset-x-0 w-full select-none"
        style={{ top: '50%', transform: 'translateY(-50%)' }}
      />

      {/* ── Countdown + bomb (hidden after explosion) ─────────────── */}
      {!exploded && (
        <>
          {/* Number — key forces remount so animate-pop-in replays each tick */}
          <div
            key={count}
            className="absolute inset-x-0 flex justify-center animate-pop-in"
            style={{ top: '10%', zIndex: 5 }}
          >
            <div
              className="font-display select-none"
              style={{
                fontSize:   '12rem',
                lineHeight: 1,
                color:      '#ff2020',
                textShadow: '0 0 80px rgba(255,30,0,0.95), 0 0 30px rgba(255,30,0,0.6), 0 4px 24px rgba(0,0,0,1)',
              }}
            >
              {count}
            </div>
          </div>

          {/* Bomb emoji — shakes with increasing intensity */}
          <div
            className="absolute inset-x-0 flex justify-center"
            style={{
              top:           BOMB_TOP,
              zIndex:        5,
              animation:     shake ? `bomb-shake ${shake.period}ms ease-in-out infinite` : 'none',
              '--shake-amp': shake ? `${shake.amp}px` : '0px',
            }}
          >
            <div style={{ fontSize: '5.6rem', lineHeight: 1 }} className="select-none">
              💣
            </div>
          </div>
        </>
      )}

      {/* ── Debris particles — fly out from bomb origin at explosion ── */}
      {exploded && (
        <div
          className="absolute inset-x-0 flex justify-center pointer-events-none"
          style={{ top: BOMB_TOP, zIndex: 6 }}
        >
          <div style={{ position: 'relative', width: 0, height: 0 }}>
            {debris.map((p, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: 0, left: 0,
                  transform: `rotate(${p.angle}deg)`,
                }}
              >
                <div
                  style={{
                    width:          p.w,
                    height:         p.h,
                    marginTop:      -p.h / 2,
                    borderRadius:   '35%',
                    background:     p.color,
                    animation:      `debris-fly ${p.duration}ms ${p.delay}ms ease-out both`,
                    '--fly-dist':   `${p.dist}px`,
                    '--fly-scale':  p.scale,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Pete — exits top-right; Sq — exits bottom-left ──────────── */}
      {peteVisible && (
        <img
          src={PETE_FRAMES[peteFrame]}
          alt="" draggable={false}
          className="absolute select-none pointer-events-none"
          style={{
            ...SPRITE_ORIGIN,
            width:      150,
            marginLeft: SPRITE_MARGIN_X,
            marginTop:  SPRITE_MARGIN_Y,
            zIndex:     11,
            animation:  `pete-launch ${PETE_LAUNCH_MS}ms ease-in both`,
          }}
        />
      )}
      {sqVisible && (
        <img
          src={SQ_FRAMES[sqFrame]}
          alt="" draggable={false}
          className="absolute select-none pointer-events-none"
          style={{
            ...SPRITE_ORIGIN,
            width:      150,
            marginLeft: SPRITE_MARGIN_X,
            marginTop:  SPRITE_MARGIN_Y,
            zIndex:     11,
            animation:  `sq-launch ${SQ_LAUNCH_MS}ms ease-in both`,
          }}
        />
      )}

      {toastaVisible && (
        <img
          src="/toasta.png"
          alt="" draggable={false}
          className="absolute select-none pointer-events-none"
          style={{
            ...SPRITE_ORIGIN,
            width:      150,
            marginLeft: SPRITE_MARGIN_X,
            marginTop:  SPRITE_MARGIN_Y,
            zIndex:     11,
            animation:  `toasta-launch ${TOASTA_LAUNCH_MS}ms ease-in both`,
          }}
        />
      )}

      {/* ── Sq peek — slides in from left after sq sprite exits ─── */}
      {sqPeekVisible && (
        <img
          src="/sq-peek.png"
          alt="" draggable={false}
          className="absolute select-none pointer-events-none"
          style={{
            bottom:    '12%',
            right:     0,
            width:     260,
            zIndex:    15,
            animation: `sq-peek-slide ${SQ_PEEK_TOTAL_MS}ms linear both`,
          }}
        />
      )}

      {/* ── Pudge sprite — bottom-left ──────────────────────────── */}
      <img
        src={getPudgeSprite(count)}
        alt=""
        draggable={false}
        className="absolute select-none"
        style={{ bottom: 70, left: 0, width: 200, zIndex: 10 }}
      />

    </div>
  );
}
