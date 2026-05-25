/**
 * Player level system — maps overall mastery % to a ranked title.
 *
 * Levels are purely a display layer over the existing mastery %.
 * Nothing in the game is gated on level; it's a cosmetic reward.
 */
import { isFactMastered } from './srs.js';

export const LEVELS = [
  { level:  1, min:   0, max:   9, name: 'Accidental Scientist',         emoji: '😬' },
  { level:  2, min:  10, max:  19, name: 'Lab Hazard',                   emoji: '☣️'  },
  { level:  3, min:  20, max:  29, name: 'Barely Adequate',              emoji: '🐌' },
  { level:  4, min:  30, max:  39, name: 'Shows Occasional Promise',     emoji: '💡' },
  { level:  5, min:  40, max:  54, name: 'Tolerable',                    emoji: '😑' },
  { level:  6, min:  55, max:  69, name: 'Almost Competent',             emoji: '🥼' },
  { level:  7, min:  70, max:  79, name: 'Grudgingly Capable',           emoji: '🔬' },
  { level:  8, min:  80, max:  89, name: 'Suspiciously Good',            emoji: '🤨' },
  { level:  9, min:  90, max:  99, name: 'Dangerously Close to Mastery', emoji: '⚡' },
  { level: 10, min: 100, max: 100, name: 'Times Tables Ninja',           emoji: '🥷' },
];

const TOTAL_FACTS = 144;

/** Returns the level object for a given mastery percentage (0–100). */
export function getLevelFromPct(pct) {
  return LEVELS.find(l => pct >= l.min && pct <= l.max) ?? LEVELS[0];
}

/** Convenience: compute mastery % from an srsState map, then return level. */
export function getLevelFromSrs(srsState) {
  const mastered = Object.values(srsState).filter(rec => isFactMastered(rec)).length;
  const pct      = Math.round((mastered / TOTAL_FACTS) * 100);
  return getLevelFromPct(pct);
}
