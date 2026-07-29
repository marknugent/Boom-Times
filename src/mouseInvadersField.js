/**
 * MOUSE INVADERS — pure field constants + grid helpers.
 *
 * No maze here (unlike pudgeManMaze.js) — just a plain rectangular field.
 * The invader formation is a block of `alive` cells (col,row keyed, local
 * to the formation) that marches as one unit; its on-field position is the
 * local coordinates plus a shared (offsetX, offsetRowsDown) — see
 * MouseInvadersGame.jsx for the stepping logic itself.
 */

export const FIELD_COLS = 8;
export const FIELD_ROWS = 12;
export const PUDGE_ROW  = FIELD_ROWS - 1;

export const INVADER_COLS = 6;
export const INVADER_ROWS = 4;
export const TOTAL_INVADERS = INVADER_COLS * INVADER_ROWS;

// Formation starts centered with a one-column margin on each side, so it
// has room to shuffle before hitting a field edge.
export const FORMATION_START_OFFSET_X = 1;

// Row sprites, top (farthest from Pudge) to bottom (closest / most
// dangerous — the mice get the front line since they're the established
// PUDGE-MAN threat).
export const ROW_KINDS = [
  { glyph: '👽' },
  { glyph: '👾' },
  { img: '/mouseghost-vulnerable.png' },
  { img: '/mouseghost-scary.png' },
];

export function cellKey(col, row) {
  return `${col},${row}`;
}

export function parseCellKey(key) {
  const [col, row] = key.split(',').map(Number);
  return { col, row };
}

export function createFormation() {
  const alive = new Set();
  for (let row = 0; row < INVADER_ROWS; row++) {
    for (let col = 0; col < INVADER_COLS; col++) {
      alive.add(cellKey(col, row));
    }
  }
  return alive;
}

/** Column bounds (local, formation-relative) spanning every still-alive cell. */
export function aliveColumnBounds(alive) {
  let min = null;
  let max = null;
  for (const key of alive) {
    const { col } = parseCellKey(key);
    if (min === null || col < min) min = col;
    if (max === null || col > max) max = col;
  }
  return { min, max };
}
