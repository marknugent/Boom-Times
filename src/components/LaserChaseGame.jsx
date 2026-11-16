/**
 * LaserChaseGame — LASER CHASE, a timed touch mini-game. The player's finger
 * is a laser pointer dot; Pudge chases it with far too much momentum,
 * overshooting and swinging back, and bowls over any mouse he ploughs
 * through. Puddles send him sliding out of control for a moment, and a slow
 * but determined bulldog ends the round early if he catches Pudge dawdling.
 * Score goes to a shared top-10 leaderboard, same as WHACK-A-MOUSE.
 *
 * The dot stays lit where the finger last was, so tapping ("go there") works
 * as well as dragging ("follow me") — small kids do both.
 *
 * All the rules and physics live in laserChaseSim.js; this component owns
 * input, the requestAnimationFrame loop, sound, and drawing. Same ref-driven
 * shape as the other mini-games: mutate `gameRef` in the loop and force a
 * re-render with a cheap `bump()`. The round doesn't start until the first
 * touch, so nobody loses time reading the instructions.
 *
 * Props:
 *   onGameEnd:  ({ skipped: true } | { skipped: false, score, madeTop10, rank, leaderboard }) => void
 *   playerName: string — whose score this is, for the leaderboard entry
 */
import { useEffect, useRef, useState } from 'react';
import {
  ARENA_W, ARENA_H, ROUND_SECONDS, PUDDLE_RX, PUDDLE_RY,
  createGame, stepGame, isSlipping,
} from '../laserChaseSim.js';
import {
  playLaserCatch, playLaserSlip, playLaserBonk, playLaserBark,
  playPudgeDeath, playWhackRoundEnd,
  startLaserChaseMusic, stopLaserChaseMusic,
} from '../sounds.js';
import { createLeaderboard } from '../leaderboard.js';

const { addScore } = createLeaderboard('pudge_laser_scores_v1');

const END_FREEZE_MS = 3000; // beat to see the final score before handing off
const MAX_FRAME_DT  = 0.05; // seconds — a dropped frame can't teleport anyone through a wall

const MOUSE_SIZE = 54;

// Natural pixel sizes of each pose. Every pose of a character is drawn at the
// same scale in its file, so rendering all of them at (natural size × one
// factor) keeps him the same size on the floor as the pose changes.
const PUDGE_POSES = {
  sit:  { src: '/laser-pudge-sit.png',  w: 455, h: 504 },
  run1: { src: '/laser-pudge-run1.png', w: 513, h: 431 },
  run2: { src: '/laser-pudge-run2.png', w: 530, h: 452 },
  slip: { src: '/laser-pudge-slip.png', w: 559, h: 531 },
  dead: { src: '/laser-pudge-dead.png', w: 508, h: 515 },
};
const PUDGE_SCALE = 0.2;

const DOG_POSES = {
  sit:  { src: '/laser-dog-sit.png',  w: 584, h: 667 },
  run1: { src: '/laser-dog-run1.png', w: 593, h: 520 },
  run2: { src: '/laser-dog-run2.png', w: 823, h: 538 },
};
const DOG_SCALE = 0.18;

const PUDGE_RUN_MIN_SPEED = 70;   // below this he's sitting, not running
const PUDGE_RUN_FRAME_S   = 0.11;
const DOG_RUN_FRAME_S     = 0.17;

const TRAIL_LENGTH = 10;
const DUST_EVERY_S = 0.07;
const FX_LIFE_S    = { poof: 0.38, float: 0.8 };

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function comboLabel(chain) {
  if (chain >= 4) return 'FRENZY!';
  if (chain === 3) return 'TRIPLE!';
  if (chain === 2) return 'DOUBLE!';
  return null;
}

// Spilled-water outlines, drawn in a 130×66 box that slightly overhangs the
// PUDDLE_RX × PUDDLE_RY ellipse the sim tests against. Each is one closed run
// of smooth curves (S commands) — a corner anywhere makes it read as a cloud.
const PUDDLE_SHAPES = [
  {
    outline: 'M8 34 C6 22 18 16 32 17 S46 10 62 9 S92 9 102 18 S125 26 123 37 S110 50 98 50 S76 60 62 57 S42 60 28 57 S10 46 8 34 Z',
    glints:  ['M22 27 C29 22 38 22 46 18', 'M53 15.5 L59 14.5'],
    droplet: { cx: 115, cy: 57 },
  },
  {
    outline: 'M10 30 C10 18 24 12 40 13 S66 16 78 13 S108 10 118 20 S124 40 112 44 S96 44 88 52 S62 60 48 54 S26 54 16 48 S10 40 10 30 Z',
    glints:  ['M24 22 C34 18 48 19 58 21', 'M66 21 L72 20'],
    droplet: { cx: 104, cy: 57 },
  },
];
const PUDDLE_SCALE = 1.12;

// Flat water with the depth only at the rim: a darker copy of the outline
// peeks out below the surface, and a glint sits just inside the top edge.
function Puddle({ hazard }) {
  const shape = PUDDLE_SHAPES[hazard.id % PUDDLE_SHAPES.length];
  const flip  = Math.floor(hazard.id / PUDDLE_SHAPES.length) % 2 === 1;
  return (
    <svg
      viewBox="0 0 130 66"
      className="absolute pointer-events-none"
      style={{
        left: hazard.x, top: hazard.y,
        width: PUDDLE_RX * 2 * PUDDLE_SCALE, height: PUDDLE_RY * 2 * PUDDLE_SCALE,
        transform: `translate(-50%, -50%) scaleX(${flip ? -1 : 1})`,
        overflow: 'visible',
        zIndex: 1,
      }}
    >
      <path d={shape.outline} fill="#1c6aa3" transform="translate(0 3.5)" />
      <path d={shape.outline} fill="#3aa5e3" stroke="#74c8f4" strokeWidth="1.5" />
      {shape.glints.map((d) => (
        <path key={d} d={d} fill="none" stroke="#dcf3ff" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
      ))}
      <ellipse cx={shape.droplet.cx} cy={shape.droplet.cy + 1.5} rx="5.5" ry="3" fill="#1c6aa3" />
      <ellipse cx={shape.droplet.cx} cy={shape.droplet.cy} rx="5.5" ry="3" fill="#3aa5e3" />
    </svg>
  );
}

// A character centred on (x, y). Every pose stays mounted and only the active
// one is visible, so swapping poses never waits on an image decode.
function Actor({ x, y, poses, pose, scale, transform, zIndex }) {
  return (
    <div className="absolute pointer-events-none" style={{ left: x, top: y, width: 0, height: 0, zIndex }}>
      {Object.entries(poses).map(([name, sprite]) => {
        const w = sprite.w * scale;
        const h = sprite.h * scale;
        return (
          <img
            key={name}
            src={sprite.src}
            alt=""
            draggable={false}
            className="absolute max-w-none"
            style={{
              width: w, height: h, left: -w / 2, top: -h / 2,
              transform,
              visibility: name === pose ? 'visible' : 'hidden',
            }}
          />
        );
      })}
    </div>
  );
}

function FloorShadow({ x, y, width }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: x, top: y, width, height: width * 0.27,
        transform: 'translate(-50%, -50%)',
        background: 'rgba(0,0,0,0.35)',
        filter: 'blur(4px)',
        zIndex: 3,
      }}
    />
  );
}

// An effect's wrapper only positions it; the animation runs on the child, so
// its transform keyframes can't fight the centring translate.
function Fx({ x, y, children }) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{ left: x, top: y, width: 0, height: 0, zIndex: 5 }}
    >
      <div className="absolute" style={{ transform: 'translate(-50%, -50%)' }}>
        {children}
      </div>
    </div>
  );
}

export default function LaserChaseGame({ onGameEnd, playerName }) {
  const gameRef    = useRef(null);
  const fxRef      = useRef({ items: [], nextId: 1, lastDustAt: 0, trail: [] });
  const arenaRef   = useRef(null);
  const pointerRef = useRef(null); // id of the finger currently steering the laser
  const endedRef   = useRef(false);
  const [, setTick] = useState(0);
  const [status, setStatus] = useState('playing'); // 'playing' | 'ended' | 'skipped'
  const [finalInfo, setFinalInfo] = useState(null); // { score, madeTop10, rank, caught } | null

  if (!gameRef.current) gameRef.current = createGame();
  const bump = () => setTick((t) => t + 1);

  function endGame() {
    if (endedRef.current) return;
    endedRef.current = true;
    stopLaserChaseMusic();
    const g = gameRef.current;
    const { leaderboard, madeTop10, rank } = addScore(playerName, g.score);
    setFinalInfo({ score: g.score, madeTop10, rank, caught: g.caught });
    setStatus('ended');
    if (!g.caught) playWhackRoundEnd(); // being caught already played its own sound
    setTimeout(() => onGameEnd?.({ skipped: false, score: g.score, madeTop10, rank, leaderboard }), END_FREEZE_MS);
  }

  function skip() {
    if (endedRef.current) return;
    endedRef.current = true;
    stopLaserChaseMusic();
    setStatus('skipped');
    onGameEnd?.({ skipped: true });
  }

  useEffect(() => () => stopLaserChaseMusic(), []);

  function addFx(type, x, y, extra) {
    const fx = fxRef.current;
    fx.items.push({ id: fx.nextId++, type, x, y, until: gameRef.current.t + FX_LIFE_S[type], ...extra });
  }

  useEffect(() => {
    if (status !== 'playing') return;
    let raf;
    let last = performance.now();

    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(MAX_FRAME_DT, (now - last) / 1000);
      last = now;

      const g = gameRef.current;
      if (!g.started) return;

      for (const ev of stepGame(g, dt)) {
        if (ev.type === 'catch') {
          playLaserCatch(ev.chain);
          addFx('poof', ev.x, ev.y);
          addFx('float', ev.x, ev.y - 26, { text: `+${ev.points}`, label: comboLabel(ev.chain) });
        } else if (ev.type === 'slip') {
          playLaserSlip();
          addFx('float', ev.x, ev.y - 50, { text: 'WHOOPS!', color: 'text-sky-300' });
        } else if (ev.type === 'bonk') {
          playLaserBonk();
        } else if (ev.type === 'bark') {
          playLaserBark();
          // Kept inside the floor — he starts in a top corner.
          addFx('float', clamp(ev.x, 70, ARENA_W - 70), Math.max(70, ev.y - 66), { text: 'WOOF!', color: 'text-red-400' });
        } else if (ev.type === 'dodge') {
          playLaserBark();
          addFx('float', ev.x, Math.max(60, ev.y - 56), { text: 'PHEW!' });
        } else if (ev.type === 'caught') {
          playPudgeDeath();
        }
      }

      const fx = fxRef.current;
      const p  = g.pudge;
      if (p.skidding && g.t - fx.lastDustAt > DUST_EVERY_S) {
        fx.lastDustAt = g.t;
        addFx('poof', p.x, p.y + 22, { small: true });
      }
      fx.items = fx.items.filter((item) => g.t < item.until);
      fx.trail.push({ x: g.laser.x, y: g.laser.y });
      if (fx.trail.length > TRAIL_LENGTH) fx.trail.shift();

      if (g.over) { endGame(); return; }
      bump();
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [status]);

  // The whole app is CSS-scaled by ScaledViewport, so map screen pixels back
  // to arena pixels through the arena's on-screen rect.
  function aimLaser(e) {
    const rect = arenaRef.current.getBoundingClientRect();
    const g = gameRef.current;
    g.laser.x = clamp((e.clientX - rect.left) * (ARENA_W / rect.width), 0, ARENA_W);
    g.laser.y = clamp((e.clientY - rect.top) * (ARENA_H / rect.height), 0, ARENA_H);
  }

  function onPointerDown(e) {
    if (status !== 'playing') return;
    e.preventDefault();
    const g = gameRef.current;
    pointerRef.current = e.pointerId;
    aimLaser(e);
    g.laser.on = true;
    if (!g.started) {
      g.started = true;
      startLaserChaseMusic();
    }
  }

  function onPointerMove(e) {
    if (status === 'playing' && e.pointerId === pointerRef.current) aimLaser(e);
  }

  function onPointerEnd(e) {
    if (e.pointerId === pointerRef.current) pointerRef.current = null;
  }

  const g  = gameRef.current;
  const fx = fxRef.current;
  const p  = g.pudge;
  const d  = g.dog;
  const secondsLeft = Math.max(0, Math.ceil(ROUND_SECONDS - g.t));

  const speed    = Math.hypot(p.vx, p.vy);
  const slipping = isSlipping(g);
  const running  = !g.caught && !slipping && speed > PUDGE_RUN_MIN_SPEED;
  const pudgePose = g.caught ? 'dead'
    : slipping ? 'slip'
    : running ? (Math.floor(g.t / PUDGE_RUN_FRAME_S) % 2 ? 'run2' : 'run1')
    : 'sit';
  // Running, he pitches into the direction of travel; sliding, he wobbles.
  // scaleX(facing) is outermost so the same pitch reads correctly either way.
  const tilt = running
    ? clamp(Math.atan2(p.vy, Math.abs(p.vx)) * 180 / Math.PI, -30, 30) * Math.min(1, speed / 300)
    : slipping ? Math.sin(g.t * 17) * 9 : 0;
  const pudgeTransform = `scaleX(${p.facing}) rotate(${tilt}deg)`;

  const dogPose = d.running ? (Math.floor(g.t / DOG_RUN_FRAME_S) % 2 ? 'run2' : 'run1') : 'sit';
  const dogBob  = d.running ? -Math.abs(Math.sin(g.t * Math.PI / DOG_RUN_FRAME_S / 2)) * 5 : 0;
  const dogTransform = `translateY(${dogBob}px) scaleX(${d.facing})`;

  return (
    <div className="w-full h-full flex flex-col items-center bg-lab-bg select-none">
      {/* HUD */}
      <div className="w-full flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
        <div className="font-display text-lab-green text-lg">LASER CHASE</div>
        <button
          className="font-body text-xs text-lab-chalk/40 hover:text-lab-chalk/70 px-2 py-1"
          onPointerDown={skip}
        >
          Skip
        </button>
      </div>

      <div className="relative w-full flex items-center justify-center shrink-0" style={{ height: 62 }}>
        <div className="absolute left-4 flex items-center gap-1.5 bg-lab-panel/70 rounded-full px-3 py-1">
          <span className="text-lg leading-none">⏱️</span>
          <span className={`font-display text-2xl leading-none ${secondsLeft <= 5 && g.started ? 'text-red-400' : 'text-lab-chalk'}`}>
            {secondsLeft}s
          </span>
        </div>
        {/* Remounted via key so the score-bump animation replays on every catch. */}
        <div key={g.score} className="font-display text-6xl text-lab-green leading-none animate-score-bump">
          {g.score}
        </div>
      </div>

      {/* Arena — the lab floor */}
      <div
        ref={arenaRef}
        className="relative overflow-hidden rounded-2xl mt-2 shrink-0"
        style={{
          width: ARENA_W,
          height: ARENA_H,
          touchAction: 'none',
          backgroundColor: '#1a2a3b',
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.04) 2px, transparent 2px)',
          backgroundSize: '67px 75px',
          boxShadow: 'inset 0 0 0 2px #1e3050, inset 0 0 40px rgba(0,0,0,0.45)',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        {g.hazards.map((h) => <Puddle key={h.id} hazard={h} />)}

        {/* Laser trail */}
        {g.laser.on && fx.trail.map((pt, i) => (
          <div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: pt.x, top: pt.y, width: 8, height: 8,
              transform: 'translate(-50%, -50%)',
              background: '#ff3b3b',
              opacity: (i / TRAIL_LENGTH) * 0.35,
              zIndex: 2,
            }}
          />
        ))}

        {/* Mice — angry while scurrying, terrified once Pudge is close */}
        {g.mice.map((m) => {
          const moving = m.scared || g.t >= m.pauseUntil;
          const wobble = moving ? Math.sin(g.t * 24 + m.id) * 7 : 0;
          return (
            <img
              key={m.id}
              src={m.scared ? '/mouseghost-vulnerable.png' : '/mouseghost-scary.png'}
              alt=""
              draggable={false}
              className="absolute pointer-events-none"
              style={{
                left: m.x, top: m.y,
                width: MOUSE_SIZE, height: MOUSE_SIZE,
                objectFit: 'contain',
                transform: `translate(-50%, -50%) scaleX(${m.facing}) rotate(${wobble}deg)`,
                zIndex: 3,
              }}
            />
          );
        })}

        {/* Dog — drawn under Pudge so a caught Pudge stays in view */}
        <FloorShadow x={d.x} y={d.y + (d.running ? 44 : 54)} width={d.running ? 84 : 92} />
        <Actor x={d.x} y={d.y} poses={DOG_POSES} pose={dogPose} scale={DOG_SCALE} transform={dogTransform} zIndex={4} />

        {/* Pudge — the sitting pose has its own shadow drawn in */}
        {(running || slipping) && <FloorShadow x={p.x} y={p.y + 46} width={70} />}
        <Actor x={p.x} y={p.y} poses={PUDGE_POSES} pose={pudgePose} scale={PUDGE_SCALE} transform={pudgeTransform} zIndex={4} />

        {/* Effects */}
        {fx.items.map((item) => (
          <Fx key={item.id} x={item.x} y={item.y}>
            {item.type === 'poof' ? (
              <div className="animate-poof" style={{ fontSize: item.small ? '1.6rem' : '2.8rem', lineHeight: 1 }}>💨</div>
            ) : (
              <div
                className={`animate-float-up font-display text-center whitespace-nowrap leading-none ${item.color ?? 'text-lab-yellow'}`}
                style={{ textShadow: '0 2px 0 rgba(0,0,0,0.55)' }}
              >
                <div className={item.label ? 'text-4xl' : 'text-3xl'}>{item.text}</div>
                {item.label && <div className="text-xl text-lab-orange mt-1">{item.label}</div>}
              </div>
            )}
          </Fx>
        ))}

        {/* Laser dot — with a wide ring so it's still visible around a fingertip */}
        {g.laser.on && status === 'playing' && (
          <div
            className="absolute pointer-events-none"
            style={{ left: g.laser.x, top: g.laser.y, width: 0, height: 0, zIndex: 6 }}
          >
            <div
              className="absolute rounded-full"
              style={{
                width: 92, height: 92,
                transform: 'translate(-50%, -50%)',
                border: '2px solid rgba(255,70,70,0.35)',
                boxShadow: '0 0 18px rgba(255,40,40,0.25)',
              }}
            />
            <div className="absolute" style={{ transform: 'translate(-50%, -50%)' }}>
              <div
                className="rounded-full animate-laser-pulse"
                style={{
                  width: 18, height: 18,
                  background: 'radial-gradient(circle, #ffffff 0%, #ff6b6b 35%, #ff0000 75%)',
                  boxShadow: '0 0 12px 5px rgba(255,40,40,0.8), 0 0 30px 12px rgba(255,0,0,0.35)',
                }}
              />
            </div>
          </div>
        )}

        {!g.started && status === 'playing' && (
          <div className="absolute inset-x-0 flex justify-center pointer-events-none" style={{ top: '20%', zIndex: 10 }}>
            <div className="font-display text-center px-6 py-4 rounded-2xl bg-lab-bg/90 flex flex-col items-center gap-2 max-w-[400px]">
              <div className="text-3xl text-lab-green">TOUCH THE FLOOR!</div>
              <div className="font-body text-base text-lab-chalk">
                Pudge chases the red dot. Catch the mice. Dodge the puddles —
                and keep moving, or the dog will get you!
              </div>
              <div className="font-body text-sm italic text-lab-chalk/60">
                "Pudge knows it's a laser. Pudge does not care."
              </div>
            </div>
          </div>
        )}

        {status === 'ended' && finalInfo && (
          // When the dog got him, the panel moves to whichever half of the
          // floor Pudge isn't lying in.
          <div
            className="absolute inset-x-0 flex items-center justify-center pointer-events-none"
            style={finalInfo.caught
              ? { top: p.y > ARENA_H / 2 ? '14%' : '66%', zIndex: 10 }
              : { top: 0, bottom: 0, zIndex: 10 }}
          >
            <div className="font-display text-center px-5 py-4 rounded-2xl bg-lab-bg/90 animate-pop-in flex flex-col items-center gap-1">
              {finalInfo.caught
                ? <div className="text-xl text-red-400">THE DOG GOT PUDGE!</div>
                : <div className="text-xl text-lab-chalk">TIME'S UP!</div>}
              <div className="text-4xl text-lab-green">{finalInfo.score}</div>
              {finalInfo.madeTop10 && finalInfo.score > 0 && (
                <div className="text-sm text-lab-yellow">new high score — #{finalInfo.rank}!</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
