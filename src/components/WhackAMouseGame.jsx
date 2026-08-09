/**
 * WhackAMouseGame — WHACK-A-MOUSE, a timed reflex mini-game. A grid of
 * holes; mice pop up in random holes at irregular intervals — including
 * genuine gaps of no mice at all, and the occasional very brief flash — and
 * more than one at a time once the round is underway. Score is persisted
 * to a shared top-10 leaderboard across players (see whackAMouseScores.js)
 * — unlike PUDGE-MAN/MOUSE INVADERS, there's no win/lose, just a final
 * score.
 *
 * Same ref-driven game-loop shape as the other mini-games: mutate a single
 * `gameRef` directly from interval callbacks and force re-renders with a
 * cheap `bump()` tick.
 *
 * Each hole is a "back" ellipse (the pit) behind the mouse image, plus a
 * "front" ellipse (the ground's near lip) drawn in front of it — the
 * classic two-ellipse whack-a-mole sandwich that sells a hole viewed from
 * front-and-above, with the mouse sliding up through it. A whacked mouse
 * doesn't play that slide back down (a miss does) — it vanishes instantly
 * in a puff of smoke instead, since the point is smashing it, not just
 * pushing it back in its hole.
 *
 * Props:
 *   onGameEnd:  ({ skipped: true } | { skipped: false, score, madeTop10, rank, leaderboard }) => void
 *   playerName: string — whose score this is, for the leaderboard entry
 */
import { useEffect, useRef, useState } from 'react';
import { playWhackHit, playWhackRoundEnd } from '../sounds.js';
import { addScore } from '../whackAMouseScores.js';

const GRID_COLS = 3;
const GRID_ROWS = 3; // +1 row over the original 2 — spreads holes across more of the screen,
                      // closer to how a physical board makes you watch a wider area
const HOLE_COUNT = GRID_COLS * GRID_ROWS;

const ROUND_DURATION_MS = 30000; // +10s over the original 20s, to give the slower/gappier cadence room to breathe
const SPAWN_DRIVER_MS   = 50;

// Gap between one mouse retreating and the next spawn attempt, and how long
// a spawned mouse stays up — both randomized per-spawn (not just smoothly
// ramped) so the game feels unpredictable rather than metronomic, and both
// ranges tighten as the round goes on so the last stretch is a scramble.
const SPAWN_GAP_MIN_START_MS = 500;
const SPAWN_GAP_MAX_START_MS = 1400;
const SPAWN_GAP_MIN_END_MS   = 150;
const SPAWN_GAP_MAX_END_MS   = 500;

const POP_DURATION_MIN_START_MS = 550;
const POP_DURATION_MAX_START_MS = 1200;
const POP_DURATION_MIN_END_MS   = 350;
const POP_DURATION_MAX_END_MS   = 700;

const POP_UP_MS   = 140; // quick rise
const POP_DOWN_MS = 220; // slower settle — only for a miss; a whack is instant (see retreatMode)

const END_FREEZE_MS = 3000; // beat to see the final score before handing off

const MOUSE_IMAGES = ['/mouseghost-vulnerable.png', '/mouseghost-scary.png'];

function lerp(a, b, t) { return a + (b - a) * t; }
function randRange(min, max) { return min + Math.random() * (max - min); }

// 1 mole at a time early on, ramping to up to 3 near the end.
function maxConcurrentFor(frac) {
  if (frac < 0.34) return 1;
  if (frac < 0.7) return 2;
  return 3;
}

function randomMouseImg() {
  return MOUSE_IMAGES[Math.floor(Math.random() * MOUSE_IMAGES.length)];
}

function elapsedFrac(g, now) {
  return Math.min(1, Math.max(0, (now - g.startedAt) / ROUND_DURATION_MS));
}

// The idle gap before the *next* spawn attempt — scheduled from the moment
// a mouse retreats (whacked or missed), not from when it appeared. Scheduling
// it at spawn time instead would let nextSpawnAt pass while the mouse was
// still up (since gaps and pop durations overlap), so a new one could spawn
// the instant the old one disappeared — exactly the "always something up"
// feel this is meant to avoid.
function nextGapMs(frac) {
  return randRange(
    lerp(SPAWN_GAP_MIN_START_MS, SPAWN_GAP_MIN_END_MS, frac),
    lerp(SPAWN_GAP_MAX_START_MS, SPAWN_GAP_MAX_END_MS, frac),
  );
}

// Each hole's <img> stays mounted for the whole round — only `up` toggles —
// so the slide transition always has a real "from" state to animate. An
// img that gets removed/re-added from the DOM on every spawn/despawn can't
// transition; it just pops in and out instantly.
function createInitialGame() {
  const now = Date.now();
  return {
    score: 0,
    holes: Array.from({ length: HOLE_COUNT }, () => ({
      img: randomMouseImg(),
      up: false,
      hideAt: 0,
      freeAt: 0,          // can't be reused as a spawn target until this passes
      retreatMode: null,  // 'timeout' | 'whacked' — which animation the last retreat used
      poofKey: 0,         // bumped on every whack to remount (and replay) the smoke puff
    })),
    nextSpawnAt: 0,
    startedAt: now,
    endsAt: now + ROUND_DURATION_MS,
  };
}

export default function WhackAMouseGame({ onGameEnd, playerName }) {
  const gameRef  = useRef(null);
  const endedRef = useRef(false);
  const [, setTick] = useState(0);
  const [status, setStatus] = useState('playing'); // 'playing' | 'ended' | 'skipped'
  const [finalInfo, setFinalInfo] = useState(null); // { score, madeTop10, rank } | null

  if (!gameRef.current) gameRef.current = createInitialGame();
  const bump = () => setTick((t) => t + 1);

  function endGame() {
    if (endedRef.current) return;
    endedRef.current = true;
    const g = gameRef.current;
    const { leaderboard, madeTop10, rank } = addScore(playerName, g.score);
    setFinalInfo({ score: g.score, madeTop10, rank });
    setStatus('ended');
    playWhackRoundEnd();
    setTimeout(() => onGameEnd?.({ skipped: false, score: g.score, madeTop10, rank, leaderboard }), END_FREEZE_MS);
  }

  function skip() {
    if (endedRef.current) return;
    endedRef.current = true;
    setStatus('skipped');
    onGameEnd?.({ skipped: true });
  }

  // Spawn/despawn driver — a fine-grained tick that retracts expired mice
  // and spawns new ones once nextSpawnAt has passed, so cadence can vary
  // per-spawn and ramp with elapsed time instead of needing the interval
  // itself re-created.
  useEffect(() => {
    if (status !== 'playing') return;
    const id = setInterval(() => {
      const g = gameRef.current;
      const now = Date.now();

      if (now >= g.endsAt) { endGame(); return; }
      const frac = elapsedFrac(g, now);

      g.holes.forEach((hole) => {
        if (hole.up && now >= hole.hideAt) {
          hole.up = false; // missed — no penalty, just retracts
          hole.retreatMode = 'timeout';
          hole.freeAt = now + POP_DOWN_MS;
          g.nextSpawnAt = now + nextGapMs(frac);
        }
      });

      const activeCount = g.holes.filter((h) => h.up).length;
      if (now >= g.nextSpawnAt && activeCount < maxConcurrentFor(frac)) {
        const freeIdxs = g.holes.reduce((acc, h, i) => { if (!h.up && now >= h.freeAt) acc.push(i); return acc; }, []);
        if (freeIdxs.length > 0) {
          const idx  = freeIdxs[Math.floor(Math.random() * freeIdxs.length)];
          const hole = g.holes[idx];
          hole.img = randomMouseImg();
          hole.up  = true;
          hole.retreatMode = null;
          hole.hideAt = now + randRange(
            lerp(POP_DURATION_MIN_START_MS, POP_DURATION_MIN_END_MS, frac),
            lerp(POP_DURATION_MAX_START_MS, POP_DURATION_MAX_END_MS, frac),
          );
        }
      }

      bump();
    }, SPAWN_DRIVER_MS);
    return () => clearInterval(id);
  }, [status]);

  function whack(idx) {
    const g = gameRef.current;
    const hole = g.holes[idx];
    if (status !== 'playing' || !hole.up) return;
    const now = Date.now();
    hole.up = false;
    hole.retreatMode = 'whacked'; // instant vanish + puff, not the normal slide-down
    hole.poofKey += 1;
    hole.freeAt = now + 100; // no slide animation to wait out, so a short cooldown is enough
    g.nextSpawnAt = now + nextGapMs(elapsedFrac(g, now));
    g.score += 1;
    playWhackHit();
    bump();
  }

  const g = gameRef.current;
  const secondsLeft = Math.max(0, Math.ceil((g.endsAt - Date.now()) / 1000));

  return (
    <div className="w-full h-full flex flex-col items-center bg-lab-bg select-none">
      {/* HUD */}
      <div className="w-full flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
        <div className="font-display text-lab-green text-lg">WHACK-A-MOUSE</div>
        <button
          className="font-body text-xs text-lab-chalk/40 hover:text-lab-chalk/70 px-2 py-1"
          onPointerDown={skip}
        >
          Skip
        </button>
      </div>

      {/* Score — the whole point of the round, so it gets center stage:
          big, and punches on every hit (remounted via key={g.score} so the
          score-bump animation replays from scratch each time). */}
      <div className="flex flex-col items-center mt-1">
        <div className="font-body text-xs text-lab-chalk/50 uppercase tracking-widest">Score</div>
        <div key={g.score} className="font-display text-6xl text-lab-green leading-none animate-score-bump">
          {g.score}
        </div>
      </div>

      {/* Countdown — large, but its own badge off to the side, deliberately
          not next to the score so the two don't read as one stat. */}
      {status === 'playing' && (
        <div className="w-full flex justify-start pl-6 mt-2">
          <div className="flex items-center gap-1.5 bg-lab-panel/70 rounded-full px-3 py-1">
            <span className="text-lg leading-none">⏱️</span>
            <span className="font-display text-2xl text-lab-chalk leading-none">{secondsLeft}s</span>
          </div>
        </div>
      )}

      {/* Board */}
      <div className="relative mt-3" style={{ width: 'min(97vw, 368px)' }}>
        <div
          className="relative"
          style={{
            width: '100%',
            aspectRatio: `${GRID_COLS} / ${GRID_ROWS}`,
            display: 'grid',
            gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
            gap: '4%',
          }}
        >
          {g.holes.map((hole, i) => {
            const up = hole.up;
            const downTransitionMs = hole.retreatMode === 'whacked' ? 0 : POP_DOWN_MS;
            return (
              <div
                key={i}
                className="relative"
                onPointerDown={(e) => { e.preventDefault(); whack(i); }}
              >
                {/* Back ellipse — the pit */}
                <div
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    width: '80%', height: '38%',
                    left: '50%', bottom: '6%',
                    transform: 'translateX(-50%)',
                    background: 'radial-gradient(ellipse at 50% 40%, #3a2718 0%, #1a1008 70%, #0d0806 100%)',
                    boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.6)',
                  }}
                />

                {/* Mouse — slides fully out of view (100%, not a partial
                    reveal) when down, so there's no ear-tip peeking above
                    the hole between spawns. */}
                <div
                  className="absolute overflow-hidden pointer-events-none"
                  style={{
                    width: '58%', height: '82%',
                    left: '50%', bottom: '10%',
                    transform: 'translateX(-50%)',
                  }}
                >
                  <img
                    src={hole.img}
                    alt=""
                    draggable={false}
                    className="absolute w-full h-full"
                    style={{
                      left: 0,
                      transform: `translateY(${up ? '0%' : '100%'})`,
                      transition: `transform ${up ? POP_UP_MS : downTransitionMs}ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
                    }}
                  />
                </div>

                {/* Front ellipse — the near lip, sits in front of the mouse's
                    lower body so it always reads as tucked into the hole. */}
                <div
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    width: '70%', height: '20%',
                    left: '50%', bottom: '2%',
                    transform: 'translateX(-50%)',
                    background: 'linear-gradient(to bottom, #2a1c11, #120b06)',
                  }}
                />

                {/* Puff of smoke — plays once per whack (remounted via
                    poofKey), replacing the normal retreat for a hit. */}
                {hole.poofKey > 0 && (
                  <div
                    key={hole.poofKey}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none animate-poof"
                    style={{ fontSize: '2.1rem', zIndex: 5 }}
                  >
                    💨
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {status === 'ended' && finalInfo && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="font-display text-center px-5 py-4 rounded-2xl bg-lab-bg/90 animate-pop-in flex flex-col items-center gap-1">
              <div className="text-xl text-lab-chalk">TIME'S UP!</div>
              <div className="text-4xl text-lab-green">{finalInfo.score}</div>
              {finalInfo.madeTop10 && (
                <div className="text-sm text-lab-yellow">new high score — #{finalInfo.rank}!</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
