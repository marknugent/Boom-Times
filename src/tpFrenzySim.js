/**
 * TP FRENZY simulation — geometry, state, and the per-frame step for the
 * toilet-paper bonus screen, kept free of React and audio so it can be driven
 * headlessly (same split as laserChaseSim.js). TPFrenzyCameo.jsx feeds it
 * finger movement through pull() and turns the events stepGame() returns into
 * sounds and effects.
 *
 * All positions and lengths are in design pixels (the app renders at a fixed
 * 560 × 932 inside ScaledViewport) and all times are seconds of game time.
 */

export const ROUND_SECONDS = 10;

// The roll hangs here. ROLL_W is its length along the holder; the radius
// shrinks from FULL to EMPTY (the bare cardboard tube) as paper comes off.
export const ROLL_CX = 280;
export const ROLL_CY = 262;
export const ROLL_W  = 170;
export const ROLL_R_FULL  = 76;
export const ROLL_R_EMPTY = 27;

// A swipe has to START inside this box — the roll plus one roll-width of
// slack on every side — but can travel anywhere once it has.
const GRAB_MARGIN = ROLL_W;
export const GRAB_ZONE = {
  left:   ROLL_CX - ROLL_W / 2 - GRAB_MARGIN,
  right:  ROLL_CX + ROLL_W / 2 + GRAB_MARGIN,
  top:    ROLL_CY - ROLL_R_FULL - GRAB_MARGIN,
  bottom: ROLL_CY + ROLL_R_FULL + GRAB_MARGIN,
};

export const SHEET_PX    = 96;  // perforation to perforation
export const PX_PER_FOOT = 120;
export const ROLL_FEET   = 60;  // paper on a full roll before a fresh one drops in
export const MILESTONE_FEET = 50;

// The paper keeps running after a swipe, but not for long: FRICTION is high
// enough that the total rewards swiping again and again rather than one big
// flick. MAX_SPEED stops a glitchy pointer event from unrolling a mile.
const FRICTION  = 2.2;  // per second
const MAX_SPEED = 4500; // px per second
const FINGER_SMOOTHING = 0.5; // how much of each frame's finger speed is taken on

const ROLL_PX = ROLL_FEET * PX_PER_FOOT;

export function createGame() {
  return {
    t: 0,
    over: false,
    pulledPx: 0,    // total paper unrolled this round
    rollPx: 0,      // paper taken off the roll currently on the holder
    rolls: 0,       // rolls emptied so far
    speed: 0,       // px per second the paper is currently running at
    pendingPull: 0, // finger movement since the last step
  };
}

export function inGrabZone(x, y) {
  return x >= GRAB_ZONE.left && x <= GRAB_ZONE.right && y >= GRAB_ZONE.top && y <= GRAB_ZONE.bottom;
}

/** A finger moved `dy` design pixels. Only downward movement pulls paper. */
export function pull(g, dy) {
  if (!g.over && dy > 0) g.pendingPull += dy;
}

export function feetUnrolled(g) { return Math.floor(g.pulledPx / PX_PER_FOOT); }

/** 1 for a fresh roll, 0 for a bare tube. */
export function rollRemaining(g) { return 1 - g.rollPx / ROLL_PX; }

/** Current radius — shrinks with the paper's cross-section area, like a real roll. */
export function rollRadius(g) {
  const full  = ROLL_R_FULL * ROLL_R_FULL;
  const empty = ROLL_R_EMPTY * ROLL_R_EMPTY;
  return Math.sqrt(empty + rollRemaining(g) * (full - empty));
}

/** Advance the round by dt seconds. Returns this frame's events. */
export function stepGame(g, dt) {
  const events = [];
  if (g.over || dt <= 0) return events;

  g.t += dt;
  if (g.t >= ROUND_SECONDS) {
    g.t = ROUND_SECONDS;
    g.over = true;
    g.pendingPull = 0;
    return events;
  }

  // The paper moves with the finger or under its own momentum, whichever is
  // further — so a slow drag never brakes a roll that's already flying.
  g.speed *= Math.exp(-FRICTION * dt);
  let moved = g.speed * dt;
  if (g.pendingPull > 0) {
    const fingerSpeed = Math.min(MAX_SPEED, g.pendingPull / dt);
    g.speed = Math.max(g.speed, g.speed + (fingerSpeed - g.speed) * FINGER_SMOOTHING);
    moved = Math.max(moved, Math.min(g.pendingPull, MAX_SPEED * dt));
    g.pendingPull = 0;
  }
  if (moved <= 0) return events;

  const sheetsBefore = Math.floor(g.pulledPx / SHEET_PX);
  const feetBefore   = feetUnrolled(g);

  g.pulledPx += moved;
  g.rollPx   += moved;

  const sheets = Math.floor(g.pulledPx / SHEET_PX) - sheetsBefore;
  if (sheets > 0) events.push({ type: 'sheet', count: sheets });

  if (g.rollPx >= ROLL_PX) {
    g.rollPx -= ROLL_PX;
    g.rolls += 1;
    events.push({ type: 'newRoll', rolls: g.rolls });
  }

  const feet = feetUnrolled(g);
  if (Math.floor(feet / MILESTONE_FEET) > Math.floor(feetBefore / MILESTONE_FEET)) {
    events.push({ type: 'milestone', feet: Math.floor(feet / MILESTONE_FEET) * MILESTONE_FEET });
  }

  return events;
}
