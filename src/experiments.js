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
    bgMusic: 'space-launch',   // loops rocket.mp3 for the full payoff
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
];

// Experiments currently in rotation — excludes anything flagged `disabled`.
const ACTIVE_EXPERIMENTS = EXPERIMENTS.filter(e => !e.disabled);

/** Pick a random experiment, re-rolling once if it matches the previous round. */
let lastExperimentId = null;

export function getRandomExperiment() {
  let pick;
  do {
    pick = ACTIVE_EXPERIMENTS[Math.floor(Math.random() * ACTIVE_EXPERIMENTS.length)];
  } while (pick.id === lastExperimentId && ACTIVE_EXPERIMENTS.length > 1);
  lastExperimentId = pick.id;
  return pick;
}

/**
 * Record the experiment actually shown to the player this round, whether it
 * came from getRandomExperiment() or was reused from a locked pending
 * experiment. Keeps the "no repeat" check in getRandomExperiment honest —
 * without this, reused pending experiments don't update lastExperimentId,
 * so the next fresh pick could repeat the one the player just saw.
 */
export function recordShownExperiment(id) {
  lastExperimentId = id;
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
}

/**
 * Clear the pending experiment after a round completes successfully.
 * The next round will pick a fresh random experiment.
 */
export function clearPendingExperiment(playerName) {
  try {
    localStorage.removeItem(pendingKey(playerName));
  } catch { /* non-fatal */ }
}
