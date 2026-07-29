/**
 * PudgeManGame — PUDGE-MAN, a simplified Pac-Man-style maze mini-game.
 *
 * Grid-based movement is driven by intervals that mutate a single ref
 * (`gameRef`) directly, rather than through React state — a fast-moving
 * game loop built on setInterval + React state is prone to stale-closure
 * bugs (the interval callback captures whatever state existed when the
 * effect was set up). Reading/writing through a ref sidesteps that
 * entirely; a cheap render-tick state bump just forces a re-render each
 * tick, and the render function always reads the ref's current values.
 *
 * Play doesn't start (Pudge and the ghosts stay still) until the first
 * D-pad press — otherwise Pudge would auto-drift in his default facing
 * direction before the player's even oriented, possibly burning a power
 * pellet for free.
 *
 * Props:
 *   onGameEnd: (outcome: 'won' | 'lost' | 'skipped') => void
 */
import { useEffect, useRef, useState } from 'react';
import {
  COLS, ROWS, PUDGE_START, GHOST_HOME, GHOST_SPAWNS,
  isWall, freshDots, freshPellets, stepCell, chooseGhostStep, cellKey,
} from '../pudgeManMaze.js';
import {
  playPudgeDotEat, playPudgePowerPellet, playPudgeGhostEat, playPudgeDeath,
  startPudgeManMusic, stopPudgeManMusic,
  startPudgeManVulnerableMusic, stopPudgeManVulnerableMusic,
} from '../sounds.js';

const PUDGE_STEP_MS          = 220;
const GHOST_DRIVER_MS        = 50;          // fine-grained scheduler tick; see per-ghost stepMs below
const GHOST_STEP_MS_BY_INDEX = [270, 330];  // one slightly faster, one slightly slower — see createInitialGame
const POWER_DURATION_MS      = 7000;
const GHOST_RELEASE_DELAY_MS = 500;
const MOUTH_TOGGLE_MS        = 150;
const END_FREEZE_MS          = 3000; // beat to see the "board cleared" banner before handing off (win only — skip is instant)
const DEATH_FREEZE_MS        = 1000; // everything holds still right where it was on collision
const DEATH_BEAT_MS          = 500;  // pause between the mice vanishing and Pudge starting to shrink
const DEATH_SHRINK_MS        = 650;  // how long Pudge's shrink-to-nothing takes

const KEY_TO_DIR = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
};

// right/left mirror the sprite (keeps it right-side up) rather than rotating
// 180° into an upside-down pose; up/down still rotate since there's no
// "upside down" reading at 90°/270°.
const DIR_TRANSFORM = {
  right: 'none',
  left:  'scaleX(-1)',
  down:  'rotate(90deg)',
  up:    'rotate(270deg)',
};

function createInitialGame() {
  return {
    pudge: { x: PUDGE_START.x, y: PUDGE_START.y, dir: 'right', desiredDir: 'right', mouthOpen: true },
    // Distinct stepMs per ghost (plus decision randomness in chooseGhostStep)
    // keeps two identically-behaved ghosts from computing the exact same
    // move every tick — which otherwise reads as them fusing into one ghost
    // whenever they happen to share a cell.
    ghosts: GHOST_SPAWNS.map((pos, i) => ({
      id: i, x: pos.x, y: pos.y, dir: 'up', state: 'scary', releaseAt: 0,
      stepMs: GHOST_STEP_MS_BY_INDEX[i] ?? 300,
      nextMoveAt: 0,
    })),
    dots:    freshDots(),
    pellets: freshPellets(),
    score:   0,
    vulnerableUntil: 0,
  };
}

function checkCollisions(g, endGame) {
  for (const gh of g.ghosts) {
    if (gh.x === g.pudge.x && gh.y === g.pudge.y) {
      if (gh.state === 'scary') {
        endGame('lost');
        return;
      }
      if (gh.state === 'vulnerable') {
        gh.state = 'eyes';
        gh.releaseAt = 0;
        g.score += 200;
        playPudgeGhostEat();
      }
    }
  }
}

export default function PudgeManGame({ onGameEnd }) {
  const gameRef  = useRef(null);
  const endedRef = useRef(false);
  const [, setTick]   = useState(0);
  const [status, setStatus]   = useState('playing'); // 'playing' | 'won' | 'lost' | 'skipped'
  const [started, setStarted] = useState(false);
  // null | 'frozen' | 'ghostsGone' | 'shrinking' — a small death flourish on
  // loss only: everything holds still right where it was on collision, then
  // the mice vanish, then (after a beat) Pudge shrinks away.
  const [deathPhase, setDeathPhase] = useState(null);

  if (!gameRef.current) gameRef.current = createInitialGame();
  const bump = () => setTick((t) => t + 1);

  function endGame(outcome) {
    if (endedRef.current) return;
    endedRef.current = true;
    stopPudgeManMusic();
    stopPudgeManVulnerableMusic(); // stop whichever loop happened to be active
    setStatus(outcome); // freezes the intervals immediately

    if (outcome === 'lost') {
      playPudgeDeath();
      setDeathPhase('frozen');
      setTimeout(() => setDeathPhase('ghostsGone'), DEATH_FREEZE_MS);
      setTimeout(() => setDeathPhase('shrinking'), DEATH_FREEZE_MS + DEATH_BEAT_MS);
      setTimeout(() => onGameEnd?.(outcome), DEATH_FREEZE_MS + DEATH_BEAT_MS + DEATH_SHRINK_MS);
    } else {
      setTimeout(() => onGameEnd?.(outcome), outcome === 'skipped' ? 0 : END_FREEZE_MS);
    }
  }

  useEffect(() => {
    startPudgeManMusic();
    return () => { stopPudgeManMusic(); stopPudgeManVulnerableMusic(); };
  }, []);

  // Mouth chomp — purely cosmetic, runs whenever the round is still live.
  useEffect(() => {
    if (status !== 'playing') return;
    const id = setInterval(() => {
      gameRef.current.pudge.mouthOpen = !gameRef.current.pudge.mouthOpen;
      bump();
    }, MOUTH_TOGGLE_MS);
    return () => clearInterval(id);
  }, [status]);

  // Pudge movement
  useEffect(() => {
    if (status !== 'playing' || !started) return;
    const id = setInterval(() => {
      const g = gameRef.current;
      const p = g.pudge;

      let dir = p.dir;
      const desiredNext = stepCell(p, p.desiredDir);
      if (!isWall(desiredNext.x, desiredNext.y)) {
        dir = p.desiredDir;
      } else {
        const forwardNext = stepCell(p, p.dir);
        if (isWall(forwardNext.x, forwardNext.y)) { bump(); return; } // fully blocked
      }
      const next = stepCell(p, dir);
      p.dir = dir; p.x = next.x; p.y = next.y;

      const key = cellKey(p.x, p.y);
      if (g.dots.has(key)) {
        g.dots.delete(key);
        g.score += 10;
        playPudgeDotEat();
      } else if (g.pellets.has(key)) {
        g.pellets.delete(key);
        g.score += 50;
        playPudgePowerPellet();
        g.vulnerableUntil = Date.now() + POWER_DURATION_MS;
        g.ghosts.forEach((gh) => { if (gh.state === 'scary') gh.state = 'vulnerable'; });
        // Swap to the faster/higher "vulnerable" loop so the window (and
        // its end) is obvious by ear, not just by ghost color.
        stopPudgeManMusic();
        startPudgeManVulnerableMusic();
      }

      checkCollisions(g, endGame);
      if (!endedRef.current && g.dots.size === 0 && g.pellets.size === 0) endGame('won');

      bump();
    }, PUDGE_STEP_MS);
    return () => clearInterval(id);
  }, [status, started]);

  // Ghost movement — a fine-grained driver tick that only actually moves a
  // given ghost once its own nextMoveAt has passed, so each ghost can run
  // on its own cadence (see stepMs in createInitialGame) instead of both
  // moving in perfect lockstep.
  useEffect(() => {
    if (status !== 'playing' || !started) return;
    const id = setInterval(() => {
      const g = gameRef.current;
      const now = Date.now();

      if (g.vulnerableUntil && now > g.vulnerableUntil) {
        g.vulnerableUntil = 0;
        g.ghosts.forEach((gh) => { if (gh.state === 'vulnerable') gh.state = 'scary'; });
        stopPudgeManVulnerableMusic();
        startPudgeManMusic();
      }

      g.ghosts.forEach((gh) => {
        if (now < gh.nextMoveAt) return; // not this ghost's turn yet
        gh.nextMoveAt = now + gh.stepMs;

        if (gh.state === 'eyes') {
          if (gh.x === GHOST_HOME.x && gh.y === GHOST_HOME.y) {
            if (!gh.releaseAt) gh.releaseAt = now + GHOST_RELEASE_DELAY_MS;
            if (now >= gh.releaseAt) { gh.state = 'scary'; gh.releaseAt = 0; }
            return;
          }
          const dirName = chooseGhostStep(gh, gh.dir, GHOST_HOME, false);
          if (dirName) {
            gh.dir = dirName;
            const next = stepCell(gh, dirName);
            gh.x = next.x; gh.y = next.y;
          }
          return;
        }

        const flee = gh.state === 'vulnerable';
        const dirName = chooseGhostStep(gh, gh.dir, g.pudge, flee);
        if (dirName) {
          gh.dir = dirName;
          const next = stepCell(gh, dirName);
          gh.x = next.x; gh.y = next.y;
        }
      });

      checkCollisions(g, endGame);
      bump();
    }, GHOST_DRIVER_MS);
    return () => clearInterval(id);
  }, [status, started]);

  function setDir(dirName) {
    if (status !== 'playing') return;
    gameRef.current.pudge.desiredDir = dirName;
    if (!started) setStarted(true);
  }

  // Arrow keys mirror the D-pad — handy for testing on a keyboard, not just touch.
  useEffect(() => {
    function onKeyDown(e) {
      const dirName = KEY_TO_DIR[e.key];
      if (!dirName) return;
      e.preventDefault(); // stop the page from scrolling
      setDir(dirName);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [status]);

  const g = gameRef.current;
  const dotsLeft = g.dots.size + g.pellets.size;

  return (
    <div className="w-full h-full flex flex-col items-center bg-lab-bg select-none">
      {/* HUD */}
      <div className="w-full flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
        <div className="font-display text-lab-green text-lg">PUDGE-MAN</div>
        <div className="font-body text-lab-chalk/70 text-sm">Score {g.score}</div>
        <button
          className="font-body text-xs text-lab-chalk/40 hover:text-lab-chalk/70 px-2 py-1"
          onPointerDown={() => endGame('skipped')}
        >
          Skip
        </button>
      </div>

      {/* Maze */}
      {/* ~15% larger than before (320px cap is what actually binds on
          nearly all phone widths, since 90vw typically exceeds it) */}
      <div className="relative mt-1" style={{ width: 'min(97vw, 368px)' }}>
        <div
          className="relative"
          style={{
            width: '100%',
            aspectRatio: `${COLS} / ${ROWS}`,
            display: 'grid',
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          }}
        >
          {Array.from({ length: ROWS }).map((_, y) =>
            Array.from({ length: COLS }).map((_, x) => {
              const key = cellKey(x, y);
              return (
                <div
                  key={key}
                  className="relative flex items-center justify-center"
                  style={{ gridColumn: x + 1, gridRow: y + 1 }}
                >
                  {isWall(x, y) && <div className="absolute inset-[1px] bg-[#1e3050] rounded-[2px]" />}
                  {g.dots.has(key) && <div className="w-[18%] h-[18%] rounded-full bg-lab-yellow" />}
                  {g.pellets.has(key) && (
                    <div className="w-[46%] h-[46%] rounded-full bg-lab-yellow animate-pulse" />
                  )}
                </div>
              );
            })
          )}

          {/* Pudge — shrinks away as the final beat of the death sequence */}
          <img
            src={g.pudge.mouthOpen ? '/pudgeman-open.png' : '/pudgeman-close.png'}
            alt=""
            draggable={false}
            className="absolute pointer-events-none"
            style={{
              width:  `${100 / COLS}%`,
              height: `${100 / ROWS}%`,
              left: `${(g.pudge.x / COLS) * 100}%`,
              top:  `${(g.pudge.y / ROWS) * 100}%`,
              transform: deathPhase === 'shrinking'
                ? (DIR_TRANSFORM[g.pudge.dir] === 'none' ? 'scale(0)' : `${DIR_TRANSFORM[g.pudge.dir]} scale(0)`)
                : DIR_TRANSFORM[g.pudge.dir],
              transition: deathPhase === 'shrinking'
                ? `transform ${DEATH_SHRINK_MS}ms ease-in`
                : `left ${PUDGE_STEP_MS}ms linear, top ${PUDGE_STEP_MS}ms linear, transform 120ms ease-in-out`,
            }}
          />

          {/* Ghosts — hold still through the freeze beat, then vanish before Pudge shrinks */}
          {(deathPhase === null || deathPhase === 'frozen') && g.ghosts.map((gh) => {
            const style = {
              width:  `${100 / COLS}%`,
              height: `${100 / ROWS}%`,
              left: `${(gh.x / COLS) * 100}%`,
              top:  `${(gh.y / ROWS) * 100}%`,
              transition: `left ${gh.stepMs}ms linear, top ${gh.stepMs}ms linear`,
            };
            if (gh.state === 'eyes') {
              return (
                <div key={gh.id} className="absolute pointer-events-none flex items-center justify-center text-[1.1rem]" style={style}>
                  👀
                </div>
              );
            }
            return (
              <img
                key={gh.id}
                src={gh.state === 'vulnerable' ? '/mouseghost-vulnerable.png' : '/mouseghost-scary.png'}
                alt=""
                draggable={false}
                className="absolute pointer-events-none"
                style={{ ...style, transform: gh.dir === 'left' ? 'scaleX(-1)' : 'none' }}
              />
            );
          })}
        </div>

        {!started && status === 'playing' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="font-body text-xs text-lab-chalk bg-lab-bg/80 px-3 py-1.5 rounded-full animate-pulse">
              tap a direction to start!
            </div>
          </div>
        )}

        {status === 'won' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="font-display text-2xl text-lab-green text-center px-5 py-3 rounded-2xl bg-lab-bg/85 animate-pop-in">
              BOARD CLEARED!
            </div>
          </div>
        )}
      </div>

      <div className="font-body text-lab-chalk/40 text-xs mt-1">{dotsLeft} left</div>

      {/* D-pad */}
      <div className="flex-1 flex items-center justify-center">
        <div className="grid grid-cols-3 grid-rows-3 gap-1.5">
          <div />
          <DpadBtn label="▲" onPress={() => setDir('up')} />
          <div />
          <DpadBtn label="◀" onPress={() => setDir('left')} />
          <div />
          <DpadBtn label="▶" onPress={() => setDir('right')} />
          <div />
          <DpadBtn label="▼" onPress={() => setDir('down')} />
          <div />
        </div>
      </div>
    </div>
  );
}

function DpadBtn({ label, onPress }) {
  return (
    <button
      className="keypad-btn text-2xl min-h-[60px] min-w-[60px]"
      onPointerDown={(e) => { e.preventDefault(); onPress(); }}
    >
      {label}
    </button>
  );
}
