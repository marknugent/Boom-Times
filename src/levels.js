/**
 * Player level system — maps overall mastery % to a ranked title.
 *
 * Levels are purely a display layer over the existing mastery %.
 * Nothing in the game is gated on level; it's a cosmetic reward.
 *
 * Mastery % is NOT monotonic — a fact loses its "mastered" status the
 * moment it's missed again (see isFactMastered in srs.js), so the raw
 * percentage can legitimately drop during completely normal play. A
 * level, once reached, is expected to behave like a rank/achievement —
 * it should never appear to go backwards just because a couple of facts
 * slipped. `getRatchetedLevel`/`ratchetMasteryHigh` track an all-time-high
 * mastery % per player (persisted in progression.highestMasteryPct) and
 * display against that instead of the live, possibly-regressed value.
 */
import { isFactMastered } from './srs.js';
import { loadProgression, saveProgression } from './progression.js';

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

/** Raw mastery % (0–100) for an srsState snapshot — can go down as well as up. */
export function getMasteryPct(srsState) {
  const mastered = Object.values(srsState).filter(rec => isFactMastered(rec)).length;
  return Math.round((mastered / TOTAL_FACTS) * 100);
}

/** Raw (unratcheted) level for an srsState snapshot. Prefer getRatchetedLevel for display. */
export function getLevelFromSrs(srsState) {
  return getLevelFromPct(getMasteryPct(srsState));
}

/**
 * The level as it should be DISPLAYED — a high-water mark that never drops.
 * Pure read (safe to call on every render); pair with ratchetMasteryHigh
 * wherever srsState actually changes to keep the persisted high current.
 */
export function getRatchetedLevel(playerName, srsState) {
  const rawPct  = getMasteryPct(srsState);
  const highPct = loadProgression(playerName).highestMasteryPct ?? 0;
  return getLevelFromPct(Math.max(rawPct, highPct));
}

/**
 * Call after srsState changes (round completion) to record a new
 * all-time-high mastery %, if one was reached. No-ops otherwise.
 */
export function ratchetMasteryHigh(playerName, srsState) {
  const rawPct       = getMasteryPct(srsState);
  const progression   = loadProgression(playerName);
  if (rawPct > (progression.highestMasteryPct ?? 0)) {
    saveProgression({ ...progression, highestMasteryPct: rawPct }, playerName);
  }
}
