/**
 * Experiment roster — the "what you're brewing" label per round.
 * Each experiment has a payoff animation component ID.
 *
 * Pending-experiment persistence
 * ────────────────────────────────
 * To prevent players gaming payoffs by restarting rounds, the chosen
 * experiment is committed to localStorage at round-start and only cleared
 * when the round actually completes. Exits, refreshes, and "Another
 * Experiment" presses before payoff all return the same locked experiment.
 */

import { syncField } from './sync.js';

export const EXPERIMENTS = [
  {
    id: 'fart-bomb',
    name: 'FART BOMB',
    brewingLabel: 'Brewing: FART BOMB 🧪',
    payoffText: 'FART BOMB COMPLETE',
    ingredient: '🫧',
    emoji: '💨',
  },
  {
    id: 'slime-explosion',
    name: 'SLIME EXPLOSION',
    brewingLabel: 'Brewing: SLIME EXPLOSION 🧪',
    payoffText: 'SLIME EXPLOSION!',
    ingredient: '💚',
    emoji: '🟢',
    disabled: true,
  },
  {
    id: 'fuzz-bomb',
    name: 'FUZZ BOMB',
    brewingLabel: 'Brewing: FUZZ BOMB 🧪',
    payoffText: 'FUZZ BOMB DETONATED',
    ingredient: '🌿',
    emoji: '🧶',
    disabled: true, // temporarily out of rotation
  },
  {
    id: 'smoke-bomb',
    name: 'SMOKE BOMB',
    brewingLabel: 'Brewing: SMOKE BOMB 🧪',
    payoffText: 'SMOKE BOMB!',
    ingredient: '🌫️',
    emoji: '💨',
    disabled: true, // temporarily out of rotation
  },
  {
    id: 'toilet-attack',
    name: 'TOILET ATTACK',
    brewingLabel: 'Brewing: TOILET ATTACK 🧪',
    payoffText: 'TOILET ATTACK!',
    ingredient: '🚽',
    emoji: '💩',
  },
  {
    id: 'dance-party',
    name: 'DANCE PARTY',
    brewingLabel: 'Brewing: DANCE PARTY 🎉',
    payoffText: 'DANCE PARTY!',
    ingredient: '🎉',
    emoji: '🪩',
    bgMusic:  'dance-party',  // replaces pounce-pop-parade on payoff screen
    danceCat: true,           // use DanceCat frame loop instead of DancingCat
  },
  {
    id: 'space-launch',
    name: 'SPACE LAUNCH',
    brewingLabel: 'Brewing: SPACE LAUNCH 🚀',
    payoffText: 'SPACE LAUNCH!',
    ingredient: '🚀',
    emoji: '🚀',
    bgMusic:      'space-launch',  // loops rocket.mp3 for the full payoff
    bgMusicDelay: 1900,            // LAUNCH_OFFSET + 400ms visual-to-audio sync
    hideCat:      true,            // DancingCat rendered inside the animation, on the ground
  },
  {
    id: 'bomb-detonation',
    name: 'BOMB DETONATION',
    brewingLabel: 'Brewing: BOMB DETONATION 💣',
    payoffText: 'KABOOM!',
    ingredient: '💣',
    emoji: '💥',
    // bgMusic is a fake ID — the animation component self-manages all audio
    // (countdown beeps, explosion boom, pounce-pop-parade at detonation).
    bgMusic:  'bomb-detonation',
    hideCat:  true,
  },
  {
    id: 'usa-usa-usa',
    name: 'USA! USA! USA!',
    brewingLabel: 'Brewing: USA! USA! USA! 🎆',
    payoffText: 'USA! USA! USA!',
    ingredient: '🎆',
    emoji: '🎆',
    bgMusic:  'nyan',
    hideCat:  true,
  },
  {
    id: 'pudge-man',
    name: 'PUDGE-MAN',
    brewingLabel: 'Brewing: PUDGE-MAN 🕹️',
    payoffText: 'PUDGE-MAN!',
    ingredient: '🕹️',
    emoji: '🕹️',
    // bgMusic is a fake ID (matches no LOOP_URLS/SOUNDS entry, so this is a
    // safe no-op) — PudgeManGame self-manages all audio, same pattern as
    // bomb-detonation.
    bgMusic:    'pudge-man',
    hideCat:    true,
    interactive: true, // PayoffScreen renders the game instead of a passive animation
  },
];

// Experiments currently in rotation — excludes anything flagged `disabled`.
const ACTIVE_EXPERIMENTS = EXPERIMENTS.filter(e => !e.disabled);

// How many recent picks to exclude from the next selection.
// With 6 active experiments this comfortably avoids A→B→A patterns.
const HISTORY_SIZE = 2;

// Namespaced per player and persisted to localStorage — without this, the
// "avoid the last two shown" history lived only in memory and reset to
// empty on every app reload/relaunch, letting a repeat slip through the
// very next time the app was reopened.
const HISTORY_KEY_BASE = 'pudge_recent_exp';

function historyKey(playerName) {
  return playerName ? `${HISTORY_KEY_BASE}__${playerName}` : HISTORY_KEY_BASE;
}

export function loadRecentIds(playerName) {
  try {
    const raw = localStorage.getItem(historyKey(playerName));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function pushRecent(playerName, id) {
  const ids = loadRecentIds(playerName);
  // Guard against recording the same "shown" experiment twice in a row —
  // e.g. if a locked pendingExperiment ever gets reused across two separate
  // recordShownExperiment calls for what's really one continuous pick. A
  // duplicate here would fill both anti-repeat history slots with the same
  // id, silently degrading "avoid the last 2 distinct experiments" down to
  // "avoid the last 1".
  if (ids[ids.length - 1] === id) return;
  ids.push(id);
  if (ids.length > HISTORY_SIZE) ids.shift();
  try {
    localStorage.setItem(historyKey(playerName), JSON.stringify(ids));
  } catch { /* non-fatal */ }
  syncField(playerName, 'recentExperiments', ids);
}

/**
 * Write the recent-picks history directly (no push/shift) — used only to
 * restore a heal payload pulled from the server wholesale, as opposed to
 * pushRecent's incremental "record one more pick" role.
 */
export function restoreRecentIds(playerName, ids) {
  try {
    localStorage.setItem(historyKey(playerName), JSON.stringify(ids));
  } catch { /* non-fatal */ }
}

/**
 * Pick a random experiment, avoiding the last two shown to this player.
 * Does NOT record the pick — every call site is responsible for calling
 * recordShownExperiment() afterward (it must also cover picks reused from
 * a locked pending experiment, so recording lives in one place, not here).
 */
export function getRandomExperiment(playerName) {
  const recentIds = loadRecentIds(playerName);
  // Only filter if there are more options than the history window;
  // otherwise we'd loop forever with very few active experiments.
  const canFilter = ACTIVE_EXPERIMENTS.length > HISTORY_SIZE;
  let pick;
  do {
    pick = ACTIVE_EXPERIMENTS[Math.floor(Math.random() * ACTIVE_EXPERIMENTS.length)];
  } while (canFilter && recentIds.includes(pick.id));
  return pick;
}

/**
 * Record the experiment actually shown to the player this round, whether it
 * came from getRandomExperiment() or was reused from a locked pending
 * experiment. Keeps the history honest — without this, reused pending
 * experiments don't update recentIds, so the next fresh pick could repeat
 * the one the player just saw.
 */
export function recordShownExperiment(playerName, id) {
  pushRecent(playerName, id);
}

// ─── Pending-experiment persistence ──────────────────────────────────────────
// Namespaced per player so each kid's locked experiment is independent.

const PENDING_KEY_BASE = 'pudge_pending_exp';

function pendingKey(playerName) {
  return playerName ? `${PENDING_KEY_BASE}__${playerName}` : PENDING_KEY_BASE;
}

/**
 * Load the pending (locked) experiment for a player from localStorage.
 * Returns null if none is stored or the stored id no longer exists in the roster.
 */
export function loadPendingExperiment(playerName) {
  try {
    const raw = localStorage.getItem(pendingKey(playerName));
    if (!raw) return null;
    const stored = JSON.parse(raw);
    // Re-hydrate from the live roster so any future property additions are included.
    // Ignore stale locks pointing at experiments that have since been disabled.
    const experiment = EXPERIMENTS.find(e => e.id === stored.id) ?? null;
    return experiment?.disabled ? null : experiment;
  } catch {
    return null;
  }
}

/**
 * Persist the chosen experiment for a player.
 * Call this at round-start so it survives exits and refreshes.
 */
export function savePendingExperiment(playerName, experiment) {
  try {
    localStorage.setItem(pendingKey(playerName), JSON.stringify({ id: experiment.id }));
  } catch { /* storage full — non-fatal */ }
  syncField(playerName, 'pendingExperiment', experiment.id);
}

/**
 * Clear the pending experiment after a round completes successfully.
 * The next round will pick a fresh random experiment.
 */
export function clearPendingExperiment(playerName) {
  try {
    localStorage.removeItem(pendingKey(playerName));
  } catch { /* non-fatal */ }
  syncField(playerName, 'pendingExperiment', null);
}
