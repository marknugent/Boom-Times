/**
 * PUDGE-MAN — simplified maze layout + pure grid helpers.
 *
 * Legend: # wall · . dot · o power pellet · H ghost-house (open path,
 * ghosts spawn here/return here) · P Pudge's start cell (open path, no dot).
 *
 * Verified offline: every non-wall cell is reachable from Pudge's start
 * (flood fill) — no isolated dot pockets, so a full clear is always possible.
 */
const RAW_MAZE = [
  '###########',
  '#o.......o#',
  '#.##.#.##.#',
  '#.........#',
  '#.##.#.##.#',
  '#....#....#',
  '##.#...#.##',
  '#....H....#',
  '##.#...#.##',
  '#....#....#',
  '#.##.#.##.#',
  '#.........#',
  '#.##.#.##.#',
  '#o...P...o#',
  '###########',
];

export const COLS = RAW_MAZE[0].length;
export const ROWS = RAW_MAZE.length;

let pudgeStart = null;
let ghostHome  = null;
const wallSet    = new Set();
const initialDots    = new Set();
const initialPellets = new Set();

RAW_MAZE.forEach((row, y) => {
  [...row].forEach((ch, x) => {
    const key = `${x},${y}`;
    if (ch === '#') wallSet.add(key);
    if (ch === '.') initialDots.add(key);
    if (ch === 'o') initialPellets.add(key);
    if (ch === 'P') pudgeStart = { x, y };
    if (ch === 'H') ghostHome  = { x, y };
  });
});

export const PUDGE_START = pudgeStart;
export const GHOST_HOME  = ghostHome;
// Ghosts spawn either side of the house door so two ghosts don't stack.
export const GHOST_SPAWNS = [
  { x: ghostHome.x - 1, y: ghostHome.y },
  { x: ghostHome.x + 1, y: ghostHome.y },
];

export function cellKey(x, y) {
  return `${x},${y}`;
}

export function isWall(x, y) {
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return true;
  return wallSet.has(cellKey(x, y));
}

export function freshDots() {
  return new Set(initialDots);
}

export function freshPellets() {
  return new Set(initialPellets);
}

export const DIRS = {
  up:    { dx: 0, dy: -1 },
  down:  { dx: 0, dy: 1 },
  left:  { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export function stepCell({ x, y }, dirName) {
  const d = DIRS[dirName];
  return { x: x + d.dx, y: y + d.dy };
}

// Chance a ghost ignores the "optimal" move and picks a random legal
// direction instead. Two ghosts running identical pure-greedy logic always
// compute the exact same move given the same inputs — harmless normally,
// but the moment they land on the same cell they stay perfectly stacked
// forever after (reads as one ghost). This, plus randomized tie-breaking
// below and per-ghost speeds in PudgeManGame.jsx, keeps them from marching
// in lockstep without needing distinct chase "personalities".
const RANDOM_MOVE_CHANCE = 0.18;

/**
 * One greedy step toward (or, if `flee`, away from) a target cell —
 * picks the legal neighbor minimizing/maximizing straight-line distance.
 * Avoids reversing into where we just came from unless it's the only option.
 */
export function chooseGhostStep(current, dirName, target, flee) {
  const candidates = Object.keys(DIRS).filter((name) => {
    if (dirName && name === opposite(dirName)) return false; // no U-turns unless forced
    const next = stepCell(current, name);
    return !isWall(next.x, next.y);
  });

  const pool = candidates.length > 0
    ? candidates
    : Object.keys(DIRS).filter((name) => {
        const next = stepCell(current, name);
        return !isWall(next.x, next.y);
      });

  if (pool.length === 0) return null;

  if (Math.random() < RANDOM_MOVE_CHANCE) {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  let best = [];
  let bestDist = flee ? -Infinity : Infinity;
  for (const name of pool) {
    const next = stepCell(current, name);
    const dist = (next.x - target.x) ** 2 + (next.y - target.y) ** 2;
    if ((flee && dist > bestDist) || (!flee && dist < bestDist)) {
      bestDist = dist;
      best = [name];
    } else if (dist === bestDist) {
      best.push(name);
    }
  }
  // Randomize among ties instead of always taking the first one found —
  // otherwise two ghosts facing an identical choice always agree.
  return best[Math.floor(Math.random() * best.length)];
}

function opposite(dirName) {
  return { up: 'down', down: 'up', left: 'right', right: 'left' }[dirName];
}
