/**
 * Experiment roster — the "what you're brewing" label per round.
 * Each experiment has a payoff animation component ID.
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
  },
  {
    id: 'smoke-bomb',
    name: 'SMOKE BOMB',
    brewingLabel: 'Brewing: SMOKE BOMB 🧪',
    payoffText: 'SMOKE BOMB!',
    ingredient: '🌫️',
    emoji: '💨',
  },
  {
    id: 'toilet-attack',
    name: 'TOILET ATTACK',
    brewingLabel: 'Brewing: TOILET ATTACK 🧪',
    payoffText: 'TOILET ATTACK!',
    ingredient: '🚽',
    emoji: '💩',
  },
];

/** Pick a random experiment for the upcoming round. */
export function getRandomExperiment() {
  return EXPERIMENTS[Math.floor(Math.random() * EXPERIMENTS.length)];
}
