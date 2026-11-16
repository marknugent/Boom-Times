/**
 * LASER CHASE simulation — arena constants, initial state, and the per-frame
 * step, kept free of React and audio so it can be driven headlessly (same
 * split as pudgeManMaze.js / mouseInvadersField.js). stepGame() mutates the
 * game object in place and returns the events the frame produced, which
 * LaserChaseGame.jsx turns into sounds and visual effects.
 *
 * All positions are in arena pixels (the app renders at a fixed design size
 * inside ScaledViewport, so the arena is always exactly ARENA_W × ARENA_H)
 * and all times are seconds of game time — accumulated from frame deltas, so
 * a backgrounded tab pauses the round instead of eating it.
 */

export const ARENA_W = 536;
export const ARENA_H = 750;
export const ROUND_SECONDS = 40;

export const PUDGE_R = 36;
export const MOUSE_R = 24;
export const PUDDLE_RX = 60;
export const PUDDLE_RY = 30;
export const DOG_R = 34;

// Pudge is an underdamped spring pulled toward the laser dot: stiff enough to
// lunge, loose enough to overshoot and swing back. That overshoot IS the
// game — raising DAMPING toward 2·√SPRING makes him obedient and boring.
const SPRING    = 20;
const DAMPING   = 3.2;
const MAX_ACCEL = 5200;
const MAX_SPEED = 1150;
const WALL_BOUNCE = 0.55;
const BONK_SPEED  = 320; // wall hits slower than this are silent

const SKID_MIN_SPEED = 360;

const SLIP_SECONDS        = 1.15;
const SLIP_IMMUNE_SECONDS = 0.9; // after a slip ends, so sliding back over the same puddle doesn't re-trigger
const SLIP_DAMPING        = 0.5;
const SLIP_MIN_SPEED      = 430;

const CHAIN_WINDOW = 1.2; // seconds between catches to keep a combo going
const MAX_CHAIN_POINTS = 3;

const SCARE_RADIUS = 135;
const SCARE_SPEED_MULT = 1.35;
const SCARE_TURN_RATE = 7; // radians per second a scared mouse can swing away from Pudge
const MOUSE_EXIT_MARGIN = 50;

// All puddles are on the floor before the first touch, so the player can
// plan around them rather than have one appear under Pudge mid-chase.
const PUDDLE_COUNT = 3;
const PUDDLE_CLEARANCE = 150; // from Pudge's start, the dog's corner, and other puddles

// One dog per round. He's a slow, steady threat rather than a hunter: he
// trots straight at Pudge at well under mouse speed and sits down for a
// breather every few seconds, so he shapes where it's safe to play without
// ever running anyone down. Getting caught ends the round — but he can only
// grab a Pudge who is going slowly. Pudge has too much momentum to steer
// round anything reliably, so a rule of "any touch" ends nearly every round
// in the first ten seconds; at speed he just rockets past ('dodge' event).
// What the dog punishes is parking near him, not skidding into him.
const DOG_DODGE_SPEED   = 300; // Pudge moving faster than this can't be grabbed
const DOG_DODGE_COOLDOWN = 1;  // seconds between 'dodge' events
// ...and he needs Pudge slow and in reach for this long. Pudge's speed drops
// through zero for an instant every time he overshoots and swings back, and
// that mustn't count as standing still.
const DOG_GRAB_SECONDS  = 0.3;
const DOG_WAKE_SECONDS  = 3;   // he only glares for the first few seconds, and is harmless until he's up
const DOG_GLOAT_DIST    = 88;  // he sits this far from a caught Pudge, so both can be seen
const DOG_SPEED_START   = 78;
const DOG_SPEED_END     = 112;
const DOG_STEER         = 3.5; // per second — how quickly he swings round to a new heading
const DOG_RUN_SECONDS   = [5, 7.5];
const DOG_REST_SECONDS  = [1.8, 2.6];
const DOG_CATCH_DIST    = PUDGE_R + DOG_R - 16; // forgiving: the sprites visibly overlap first
const DOG_CORNER_INSET  = { x: 82, y: 92 };

function lerp(a, b, t) { return a + (b - a) * t; }
function rand(min, max) { return min + Math.random() * (max - min); }

function roundFrac(g) { return Math.min(1, g.t / ROUND_SECONDS); }

function maxMice(frac) { return Math.round(lerp(4, 7, frac)); }

function nextSpawnGap(frac) {
  return rand(lerp(0.6, 0.3, frac), lerp(1.2, 0.7, frac));
}

function mouseSpeed(frac) {
  return rand(lerp(105, 160, frac), lerp(165, 250, frac));
}

let nextId = 1;

function makeMouse(x, y, heading, speed, now) {
  return {
    id: nextId++,
    x, y, heading, speed,
    facing: Math.cos(heading) >= 0 ? 1 : -1,
    scared: false,
    pauseUntil: 0,
    turnAt: now + rand(0.7, 1.7),
  };
}

function spawnMouseFromEdge(g) {
  const edge = Math.floor(Math.random() * 4);
  const m = MOUSE_EXIT_MARGIN - 10;
  let x, y;
  if (edge === 0)      { x = -m;          y = rand(60, ARENA_H - 60); }
  else if (edge === 1) { x = ARENA_W + m; y = rand(60, ARENA_H - 60); }
  else if (edge === 2) { x = rand(60, ARENA_W - 60); y = -m; }
  else                 { x = rand(60, ARENA_W - 60); y = ARENA_H + m; }
  // Aim somewhere in the middle of the floor so every mouse crosses real ground.
  const tx = rand(ARENA_W * 0.25, ARENA_W * 0.75);
  const ty = rand(ARENA_H * 0.25, ARENA_H * 0.75);
  g.mice.push(makeMouse(x, y, Math.atan2(ty - y, tx - x), mouseSpeed(roundFrac(g)), g.t));
}

function placePuddle(g) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const x = rand(PUDDLE_RX + 20, ARENA_W - PUDDLE_RX - 20);
    const y = rand(PUDDLE_RY + 20, ARENA_H - PUDDLE_RY - 20);
    const clearOfPudge = Math.hypot(x - g.pudge.x, y - g.pudge.y) > PUDDLE_CLEARANCE;
    const clearOfDog = Math.hypot(x - g.dog.x, y - g.dog.y) > PUDDLE_CLEARANCE;
    const clearOfOthers = g.hazards.every((h) => Math.hypot(x - h.x, y - h.y) > PUDDLE_CLEARANCE);
    if (clearOfPudge && clearOfDog && clearOfOthers) {
      g.hazards.push({ id: nextId++, type: 'puddle', x, y });
      return;
    }
  }
}

export function createGame() {
  // The dog starts in a top corner: as far from Pudge as the floor allows,
  // and clear of the two mice that open the round in the lower half.
  const dogOnLeft = Math.random() < 0.5;
  const g = {
    t: 0,
    started: false,
    over: false,
    caught: false, // true when the round ended because the dog got Pudge
    score: 0,
    chain: 0,
    lastCatchAt: -Infinity,
    laser: { on: false, x: ARENA_W / 2, y: ARENA_H / 2 },
    pudge: {
      x: ARENA_W / 2, y: ARENA_H / 2, vx: 0, vy: 0,
      facing: 1, skidding: false,
      slipUntil: 0, slipImmuneUntil: 0,
    },
    dog: {
      x: dogOnLeft ? DOG_CORNER_INSET.x : ARENA_W - DOG_CORNER_INSET.x,
      y: DOG_CORNER_INSET.y,
      vx: 0, vy: 0,
      facing: dogOnLeft ? 1 : -1,
      running: false,
      woken: false, // false until his first bark; he can't catch anyone before it
      sitUntil: DOG_WAKE_SECONDS,
      runUntil: 0,
      nextDodgeAt: 0,
      grab: 0, // seconds Pudge has been slow and within reach
    },
    mice: [],
    hazards: [],
    nextSpawnAt: 0.6,
  };
  for (let i = 0; i < PUDDLE_COUNT; i++) placePuddle(g);
  // Two mice already on the floor so the goal is visible before the first touch.
  g.mice.push(makeMouse(ARENA_W * 0.2, ARENA_H * 0.62, rand(0, Math.PI * 2), 130, 0));
  g.mice.push(makeMouse(ARENA_W * 0.8, ARENA_H * 0.82, rand(0, Math.PI * 2), 130, 0));
  return g;
}

export function isSlipping(g) { return g.t < g.pudge.slipUntil; }

function stepPudge(g, dt, events) {
  const p = g.pudge;
  const slipping = isSlipping(g);

  let ax = 0, ay = 0;
  if (!slipping && g.laser.on) {
    ax = (g.laser.x - p.x) * SPRING;
    ay = (g.laser.y - p.y) * SPRING;
    const a = Math.hypot(ax, ay);
    if (a > MAX_ACCEL) { ax *= MAX_ACCEL / a; ay *= MAX_ACCEL / a; }
  }

  const speedBefore = Math.hypot(p.vx, p.vy);
  const accel = Math.hypot(ax, ay);
  // Skidding = pulling hard against the way he's already travelling.
  p.skidding = !slipping && speedBefore > SKID_MIN_SPEED
    && (ax * p.vx + ay * p.vy) < -0.4 * accel * speedBefore;

  const damping = slipping ? SLIP_DAMPING : DAMPING;
  p.vx += (ax - p.vx * damping) * dt;
  p.vy += (ay - p.vy * damping) * dt;

  const speed = Math.hypot(p.vx, p.vy);
  if (speed > MAX_SPEED) { p.vx *= MAX_SPEED / speed; p.vy *= MAX_SPEED / speed; }

  p.x += p.vx * dt;
  p.y += p.vy * dt;

  let bonk = 0;
  if (p.x < PUDGE_R)           { p.x = PUDGE_R;           if (p.vx < 0) { bonk = Math.max(bonk, -p.vx); p.vx *= -WALL_BOUNCE; } }
  if (p.x > ARENA_W - PUDGE_R) { p.x = ARENA_W - PUDGE_R; if (p.vx > 0) { bonk = Math.max(bonk,  p.vx); p.vx *= -WALL_BOUNCE; } }
  if (p.y < PUDGE_R)           { p.y = PUDGE_R;           if (p.vy < 0) { bonk = Math.max(bonk, -p.vy); p.vy *= -WALL_BOUNCE; } }
  if (p.y > ARENA_H - PUDGE_R) { p.y = ARENA_H - PUDGE_R; if (p.vy > 0) { bonk = Math.max(bonk,  p.vy); p.vy *= -WALL_BOUNCE; } }
  if (bonk > BONK_SPEED) events.push({ type: 'bonk', x: p.x, y: p.y });

  if (Math.abs(p.vx) > 50) p.facing = p.vx > 0 ? 1 : -1;
}

function stepHazards(g, events) {
  const p = g.pudge;
  if (isSlipping(g) || g.t < p.slipImmuneUntil) return;
  for (const h of g.hazards) {
    const dx = (p.x - h.x) / PUDDLE_RX;
    const dy = (p.y - h.y) / PUDDLE_RY;
    if (dx * dx + dy * dy >= 1) continue;

    p.slipUntil = g.t + SLIP_SECONDS;
    p.slipImmuneUntil = p.slipUntil + SLIP_IMMUNE_SECONDS;
    const speed = Math.hypot(p.vx, p.vy);
    if (speed < SLIP_MIN_SPEED) {
      const dir = speed > 20 ? Math.atan2(p.vy, p.vx) : rand(0, Math.PI * 2);
      p.vx = Math.cos(dir) * SLIP_MIN_SPEED;
      p.vy = Math.sin(dir) * SLIP_MIN_SPEED;
    }
    g.chain = 0;
    events.push({ type: 'slip', x: p.x, y: p.y });
    return;
  }
}

function stepMice(g, dt, events) {
  const p = g.pudge;
  const slipping = isSlipping(g);
  const frac = roundFrac(g);

  if (g.t >= g.nextSpawnAt && g.mice.length < maxMice(frac)) {
    spawnMouseFromEdge(g);
    g.nextSpawnAt = g.t + nextSpawnGap(frac);
  }

  g.mice = g.mice.filter((m) => {
    const dist = Math.hypot(m.x - p.x, m.y - p.y);

    if (!slipping && dist < PUDGE_R + MOUSE_R - 6) {
      g.chain = g.t - g.lastCatchAt < CHAIN_WINDOW ? g.chain + 1 : 1;
      g.lastCatchAt = g.t;
      const points = Math.min(g.chain, MAX_CHAIN_POINTS);
      g.score += points;
      events.push({ type: 'catch', x: m.x, y: m.y, points, chain: g.chain });
      return false;
    }

    m.scared = dist < SCARE_RADIUS;
    if (m.scared) {
      // Veer away from Pudge rather than snapping round, so a fast Pudge
      // still catches a mouse that noticed him too late.
      const away = Math.atan2(m.y - p.y, m.x - p.x);
      const diff = Math.atan2(Math.sin(away - m.heading), Math.cos(away - m.heading));
      const maxTurn = SCARE_TURN_RATE * dt;
      m.heading += Math.max(-maxTurn, Math.min(maxTurn, diff));
    }

    // Scurry, freeze, scurry — a scared mouse never stops to think.
    if (g.t >= m.turnAt) {
      m.pauseUntil = g.t + rand(0.25, 0.6);
      m.heading += rand(-1.1, 1.1);
      m.turnAt = m.pauseUntil + rand(0.8, 1.8);
    }
    if (m.scared || g.t >= m.pauseUntil) {
      const speed = m.speed * (m.scared ? SCARE_SPEED_MULT : 1);
      m.x += Math.cos(m.heading) * speed * dt;
      m.y += Math.sin(m.heading) * speed * dt;
      const fx = Math.cos(m.heading);
      if (Math.abs(fx) > 0.2) m.facing = fx > 0 ? 1 : -1;
    }

    return m.x > -MOUSE_EXIT_MARGIN && m.x < ARENA_W + MOUSE_EXIT_MARGIN
        && m.y > -MOUSE_EXIT_MARGIN && m.y < ARENA_H + MOUSE_EXIT_MARGIN;
  });
}

function stepDog(g, dt, events) {
  const d = g.dog;
  const p = g.pudge;

  if (!d.running && g.t >= d.sitUntil) {
    d.running = true;
    d.woken = true;
    d.runUntil = g.t + rand(...DOG_RUN_SECONDS);
    events.push({ type: 'bark', x: d.x, y: d.y });
  } else if (d.running && g.t >= d.runUntil) {
    d.running = false;
    d.sitUntil = g.t + rand(...DOG_REST_SECONDS);
    d.vx = 0;
    d.vy = 0;
  }

  const dx = p.x - d.x;
  const dy = p.y - d.y;
  const dist = Math.hypot(dx, dy);

  if (d.running && dist > 1) {
    const speed = lerp(DOG_SPEED_START, DOG_SPEED_END, roundFrac(g));
    const blend = Math.min(1, DOG_STEER * dt);
    d.vx += (dx / dist * speed - d.vx) * blend;
    d.vy += (dy / dist * speed - d.vy) * blend;
    d.x += d.vx * dt;
    d.y += d.vy * dt;
  }
  // Sitting or trotting, he keeps his eyes on Pudge.
  if (Math.abs(dx) > 12) d.facing = dx > 0 ? 1 : -1;

  if (!d.woken || Math.hypot(p.x - d.x, p.y - d.y) >= DOG_CATCH_DIST) {
    d.grab = 0;
    return;
  }

  if (Math.hypot(p.vx, p.vy) > DOG_DODGE_SPEED) {
    d.grab = 0;
    if (g.t >= d.nextDodgeAt) {
      d.nextDodgeAt = g.t + DOG_DODGE_COOLDOWN;
      events.push({ type: 'dodge', x: p.x, y: p.y });
    }
    return;
  }

  d.grab += dt;
  if (d.grab >= DOG_GRAB_SECONDS) {
    g.over = true;
    g.caught = true;
    d.running = false;
    // Step back to sit beside him — on whichever side has the room.
    const gap = Math.hypot(d.x - p.x, d.y - p.y);
    const ux = gap > 1 ? (d.x - p.x) / gap : 1;
    const uy = gap > 1 ? (d.y - p.y) / gap : 0;
    const fits = (x, y) => x > DOG_R && x < ARENA_W - DOG_R && y > DOG_R && y < ARENA_H - DOG_R;
    const side = fits(p.x + ux * DOG_GLOAT_DIST, p.y + uy * DOG_GLOAT_DIST) ? 1 : -1;
    d.x = p.x + ux * DOG_GLOAT_DIST * side;
    d.y = p.y + uy * DOG_GLOAT_DIST * side;
    d.facing = d.x > p.x ? -1 : 1;
    p.vx = 0;
    p.vy = 0;
    p.skidding = false;
    p.slipUntil = 0;
    events.push({ type: 'caught', x: p.x, y: p.y });
  }
}

/** Advance the round by dt seconds. Returns this frame's events. */
export function stepGame(g, dt) {
  const events = [];
  if (!g.started || g.over) return events;

  g.t += dt;
  if (g.t >= ROUND_SECONDS) {
    g.t = ROUND_SECONDS;
    g.over = true;
    return events;
  }

  stepPudge(g, dt, events);
  stepHazards(g, events);
  stepMice(g, dt, events);
  stepDog(g, dt, events);
  return events;
}
