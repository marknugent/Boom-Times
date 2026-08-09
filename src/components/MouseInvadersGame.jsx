/**
 * MouseInvadersGame — MOUSE INVADERS, a simplified Space-Invaders-style
 * mini-game. One round: it ends when Pudge dies or the screen is cleared.
 * No score is kept, no barriers — Pudge dodges by moving, not hiding.
 *
 * Same ref-driven game-loop shape as PudgeManGame.jsx: mutate a single
 * `gameRef` directly from interval callbacks and force re-renders with a
 * cheap `bump()` tick, rather than routing fast-moving state through React
 * state (which is prone to stale-closure bugs in setInterval callbacks).
 *
 * The invader formation moves as one block — a shared (offsetX,
 * offsetRowsDown) applied to every still-alive (localCol, localRow) cell —
 * and speeds up as invaders are destroyed (fewer alive ⇒ shorter tick),
 * mirroring the classic "last one is a scramble" feel without the original
 * game's much steeper ramp.
 *
 * Props:
 *   onGameEnd: (outcome: 'won' | 'lost' | 'skipped') => void
 */
import { useEffect, useRef, useState } from 'react';
import {
  FIELD_COLS, FIELD_ROWS, PUDGE_ROW, TOTAL_INVADERS,
  FORMATION_START_OFFSET_X, ROW_KINDS,
  createFormation, aliveColumnBounds, parseCellKey,
} from '../mouseInvadersField.js';
import {
  playInvaderShoot, playInvaderPop, playInvaderMarchStep, playInvadersWin,
  playPudgeDeath,
} from '../sounds.js';

const FORMATION_DRIVER_MS  = 30;   // fine-grained scheduler tick — see BASE/MIN_TICK_MS
const BASE_TICK_MS         = 130;  // formation step interval with a full field
const MIN_TICK_MS          = 78;   // formation step interval with one invader left
const STEP_COLS            = 0.16; // horizontal shuffle per formation step

const PUDGE_MOVE_MS        = 90;   // column step while a direction is held
const PROJECTILE_STEP_MS   = 45;   // row step for Pudge's shot

const END_FREEZE_MS        = 3000; // beat to see the "invasion repelled" banner before handing off (win only — skip is instant)
const DEATH_FREEZE_MS      = 700;  // everything holds still right where it was on contact
const DEATH_SHRINK_MS      = 650;  // how long Pudge's shrink-to-nothing takes

const PUDGE_UP_TRANSFORM = 'rotate(270deg)'; // facing up — see PudgeManGame's DIR_TRANSFORM.up

// Emoji glyphs render far smaller than their font-size (side bearing eats
// into the box), so to visually match the image-based rows — which fill
// 100% of their cell — this needs to run noticeably bigger than the cell
// itself. Built from the same `min(97vw, 368px)` expression as the field's
// own width (see the field container below) so it tracks the field exactly
// at every viewport size instead of drifting on narrower phones.
const EMOJI_FONT_SIZE = `calc(min(97vw, 368px) / ${FIELD_COLS} * 1.15)`;

const KEY_TO_MOVE = { ArrowLeft: 'left', ArrowRight: 'right' };
const FIRE_KEYS = new Set(['ArrowUp', ' ', 'Spacebar']);

function tickMsFor(aliveCount) {
  const killedFrac = 1 - aliveCount / TOTAL_INVADERS;
  return BASE_TICK_MS - (BASE_TICK_MS - MIN_TICK_MS) * killedFrac;
}

function createInitialGame() {
  return {
    pudgeCol: Math.floor(FIELD_COLS / 2),
    moveDir: null,
    projectile: null, // { col, row } | null — only one in flight at a time
    formation: {
      alive: createFormation(),
      offsetX: FORMATION_START_OFFSET_X,
      offsetRowsDown: 0,
      dir: 'right',
      nextMoveAt: 0,
    },
  };
}

export default function MouseInvadersGame({ onGameEnd }) {
  const gameRef  = useRef(null);
  const endedRef = useRef(false);
  const [, setTick] = useState(0);
  const [status, setStatus] = useState('playing'); // 'playing' | 'won' | 'lost' | 'skipped'
  // null | 'frozen' | 'shrinking' — everything holds still on contact, then
  // (after a beat) Pudge shrinks away. Mirrors PudgeManGame's death beat.
  const [deathPhase, setDeathPhase] = useState(null);

  if (!gameRef.current) gameRef.current = createInitialGame();
  const bump = () => setTick((t) => t + 1);

  function endGame(outcome) {
    if (endedRef.current) return;
    endedRef.current = true;
    setStatus(outcome); // freezes the intervals immediately

    if (outcome === 'lost') {
      playPudgeDeath();
      setDeathPhase('frozen');
      setTimeout(() => setDeathPhase('shrinking'), DEATH_FREEZE_MS);
      setTimeout(() => onGameEnd?.(outcome), DEATH_FREEZE_MS + DEATH_SHRINK_MS);
    } else {
      if (outcome === 'won') playInvadersWin();
      setTimeout(() => onGameEnd?.(outcome), outcome === 'skipped' ? 0 : END_FREEZE_MS);
    }
  }

  // Pudge horizontal movement — steps while a direction is held (D-pad or
  // arrow keys), rather than one column per press, so dodging under a
  // descending row doesn't require frantic re-tapping.
  useEffect(() => {
    if (status !== 'playing') return;
    const id = setInterval(() => {
      const g = gameRef.current;
      if (!g.moveDir) return;
      const next = g.pudgeCol + (g.moveDir === 'right' ? 1 : -1);
      g.pudgeCol = Math.max(0, Math.min(FIELD_COLS - 1, next));
      bump();
    }, PUDGE_MOVE_MS);
    return () => clearInterval(id);
  }, [status]);

  // Pudge's shot — one in flight at a time; moves up a row at a time and
  // is cleared on a hit or on leaving the field. Checked *before* stepping,
  // not after — the shot spawns already sitting on the bottom row an
  // invader can occupy, and checking post-decrement skipped that starting
  // row every time, so a bottom-row invader could never be hit even when
  // it visibly lined up with the shot.
  useEffect(() => {
    if (status !== 'playing') return;
    const id = setInterval(() => {
      const g = gameRef.current;
      if (!g.projectile) return;

      for (const key of g.formation.alive) {
        const { col, row } = parseCellKey(key);
        const actualCol = Math.round(col + g.formation.offsetX);
        const actualRow = row + g.formation.offsetRowsDown;
        if (actualCol === g.projectile.col && actualRow === g.projectile.row) {
          g.formation.alive.delete(key);
          g.projectile = null;
          playInvaderPop();
          if (g.formation.alive.size === 0) endGame('won');
          bump();
          return;
        }
      }

      g.projectile.row -= 1;
      if (g.projectile.row < 0) g.projectile = null;
      bump();
    }, PROJECTILE_STEP_MS);
    return () => clearInterval(id);
  }, [status]);

  // Invader formation — a fine-grained driver tick that only actually
  // steps the formation once its own nextMoveAt has passed, so the march
  // speed (tickMsFor) can change smoothly as invaders are destroyed
  // instead of needing the interval itself re-created every kill.
  useEffect(() => {
    if (status !== 'playing') return;
    const id = setInterval(() => {
      const g = gameRef.current;
      const f = g.formation;
      if (f.alive.size === 0) return; // already won, waiting for the freeze beat
      const now = Date.now();
      if (now < f.nextMoveAt) return;
      f.nextMoveAt = now + tickMsFor(f.alive.size);

      f.offsetX += STEP_COLS * (f.dir === 'right' ? 1 : -1);

      const { min, max } = aliveColumnBounds(f.alive);
      if (min !== null) {
        const leftEdge  = min + f.offsetX;
        const rightEdge = max + f.offsetX + 1;
        if (f.dir === 'right' && rightEdge >= FIELD_COLS) {
          f.offsetX = FIELD_COLS - 1 - max;
          f.dir = 'left';
          f.offsetRowsDown += 1;
          playInvaderMarchStep();
        } else if (f.dir === 'left' && leftEdge <= 0) {
          f.offsetX = -min;
          f.dir = 'right';
          f.offsetRowsDown += 1;
          playInvaderMarchStep();
        }
      }

      // Contact check — Pudge only ever occupies PUDGE_ROW, so an invader
      // reaching that row in his column means it got to him. He's safe
      // from a row that reaches his row in a *different* column — that's
      // the dodge the D-pad is for, in place of a barrier to hide behind.
      for (const key of f.alive) {
        const { col, row } = parseCellKey(key);
        const actualCol = Math.round(col + f.offsetX);
        const actualRow = row + f.offsetRowsDown;
        if (actualRow >= PUDGE_ROW && actualCol === g.pudgeCol) {
          endGame('lost');
          break;
        }
      }

      bump();
    }, FORMATION_DRIVER_MS);
    return () => clearInterval(id);
  }, [status]);

  function setMoveDir(dir) {
    if (status !== 'playing') return;
    gameRef.current.moveDir = dir;
  }
  function clearMoveDir() {
    gameRef.current.moveDir = null;
  }

  function fire() {
    const g = gameRef.current;
    if (status !== 'playing' || g.projectile) return;
    g.projectile = { col: g.pudgeCol, row: PUDGE_ROW - 1 };
    playInvaderShoot();
    bump();
  }

  // Arrow keys mirror the D-pad, Space/Up mirrors Fire — handy for testing
  // on a keyboard, not just touch.
  useEffect(() => {
    function onKeyDown(e) {
      if (KEY_TO_MOVE[e.key]) {
        e.preventDefault();
        setMoveDir(KEY_TO_MOVE[e.key]);
        return;
      }
      if (FIRE_KEYS.has(e.key)) {
        e.preventDefault();
        fire();
      }
    }
    function onKeyUp(e) {
      const dir = KEY_TO_MOVE[e.key];
      if (dir && gameRef.current.moveDir === dir) clearMoveDir();
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [status]);

  const g = gameRef.current;
  const f = g.formation;
  const marchTransitionMs = tickMsFor(f.alive.size);

  return (
    <div className="w-full h-full flex flex-col items-center bg-lab-bg select-none">
      {/* HUD */}
      <div className="w-full flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
        <div className="font-display text-lab-green text-lg">MOUSE INVADERS</div>
        <div className="font-body text-lab-chalk/70 text-sm">{f.alive.size} left</div>
        <button
          className="font-body text-xs text-lab-chalk/40 hover:text-lab-chalk/70 px-2 py-1"
          onPointerDown={() => endGame('skipped')}
        >
          Skip
        </button>
      </div>

      {/* Field */}
      <div className="relative mt-1" style={{ width: 'min(97vw, 368px)' }}>
        <div
          className="relative overflow-hidden"
          style={{
            width: '100%',
            aspectRatio: `${FIELD_COLS} / ${FIELD_ROWS}`,
          }}
        >
          {/* Invaders */}
          {Array.from(f.alive).map((key) => {
            const { col, row } = parseCellKey(key);
            const kind = ROW_KINDS[row];
            const style = {
              width:  `${100 / FIELD_COLS}%`,
              height: `${100 / FIELD_ROWS}%`,
              left: `${((col + f.offsetX) / FIELD_COLS) * 100}%`,
              top:  `${((row + f.offsetRowsDown) / FIELD_ROWS) * 100}%`,
              transition: `left ${marchTransitionMs}ms linear, top 220ms ease-out`,
            };
            return (
              <div key={key} className="absolute pointer-events-none flex items-center justify-center" style={style}>
                {kind.img
                  ? <img src={kind.img} alt="" draggable={false} className="w-full h-full" />
                  : <span style={{ fontSize: EMOJI_FONT_SIZE, lineHeight: 1 }}>{kind.glyph}</span>}
              </div>
            );
          })}

          {/* Pudge's shot */}
          {g.projectile && (
            <div
              className="absolute pointer-events-none bg-lab-green rounded-full"
              style={{
                width:  `${100 / FIELD_COLS * 0.14}%`,
                height: `${100 / FIELD_ROWS * 0.6}%`,
                left: `${((g.projectile.col + 0.5) / FIELD_COLS) * 100}%`,
                top:  `${((g.projectile.row + 0.2) / FIELD_ROWS) * 100}%`,
                transform: 'translateX(-50%)',
                transition: `top ${PROJECTILE_STEP_MS}ms linear`,
                boxShadow: '0 0 6px 1px #4ade80',
              }}
            />
          )}

          {/* Pudge — always facing up, mouth closed (no chomp — he's not eating
              here), shrinks away as the final beat of the death sequence */}
          <img
            src="/pudgeman-close.png"
            alt=""
            draggable={false}
            className="absolute pointer-events-none"
            style={{
              width:  `${100 / FIELD_COLS}%`,
              height: `${100 / FIELD_ROWS}%`,
              left: `${(g.pudgeCol / FIELD_COLS) * 100}%`,
              top:  `${(PUDGE_ROW / FIELD_ROWS) * 100}%`,
              transform: deathPhase === 'shrinking'
                ? `${PUDGE_UP_TRANSFORM} scale(0)`
                : PUDGE_UP_TRANSFORM,
              transition: deathPhase === 'shrinking'
                ? `transform ${DEATH_SHRINK_MS}ms ease-in`
                : `left ${PUDGE_MOVE_MS}ms linear, transform 120ms ease-in-out`,
            }}
          />

          {status === 'won' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="font-display text-2xl text-lab-green text-center px-5 py-3 rounded-2xl bg-lab-bg/85 animate-pop-in">
                INVASION REPELLED!
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls — direction on the left (thumb toggles ◀/▶), fire on the
          right, rather than all three inline. Splitting them across hands
          reads much easier than reaching across the middle for FIRE. */}
      <div className="w-full flex-1 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <DpadBtn
            label="◀"
            onDown={() => setMoveDir('left')}
            onUp={clearMoveDir}
          />
          <DpadBtn
            label="▶"
            onDown={() => setMoveDir('right')}
            onUp={clearMoveDir}
          />
        </div>
        <button
          className="keypad-btn text-lg min-h-[76px] min-w-[76px] bg-red-800 hover:bg-red-700 active:bg-red-900"
          onPointerDown={(e) => { e.preventDefault(); fire(); }}
        >
          FIRE
        </button>
      </div>
    </div>
  );
}

function DpadBtn({ label, onDown, onUp }) {
  return (
    <button
      className="keypad-btn text-2xl min-h-[60px] min-w-[60px]"
      onPointerDown={(e) => { e.preventDefault(); onDown(); }}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      onPointerCancel={onUp}
    >
      {label}
    </button>
  );
}
