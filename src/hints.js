/**
 * Hint system.
 *
 * Hints appear:
 *  1. When a fact from a table is first introduced (isFirstIntroduction = true)
 *  2. When the same fact has been missed 2+ times (timesCorrect/timesSeen < 0.5
 *     with at least 2 presentations)
 *  3. Occasionally (30% chance) on "hard facts" that aren't yet well-established
 *
 * Hints fade out once a fact is well-established (interval ≥ 3 days, streak ≥ 3).
 * A hint is never shown twice for the same fact in the same session.
 */

// ─────────────────────────────────────────────
// Hint copy per table
// ─────────────────────────────────────────────

export const TABLE_HINTS = {
  1:  "Anything times 1 is just... itself. Pudge finds this obvious.",
  2:  "2s are just doubles. 2×7 = 7+7. You've got this.",
  3:  "Count by 3s. Or just remember them. Pudge recommends the second option.",
  4:  "4s are just 2s doubled. 4×6 = double 12 = 24.",
  5:  "Pudge has observed that 5s always end in 0 or 5. You're welcome.",
  6:  "6s are tricky. Pudge recommends memorizing them. Sorry.",
  7:  "7s are the worst. Pudge acknowledges this. Memorize them.",
  8:  "8s are 2s tripled. 8×7 = double double 14 = 56. Or just memorize it.",
  9:  "The digits of any 9× answer add up to 9. Don't ask me why.",
  10: "Just add a zero. 10×7 = 70. Pudge is almost insulted you needed a hint.",
  11: "11s just repeat the digit. 11×4 = 44. Embarrassingly easy.",
  12: "Think of it as 10× plus 2×. 12×7 = 70+14 = 84. Pudge out.",
};

// ─────────────────────────────────────────────
// Hard facts list
// ─────────────────────────────────────────────

/** Facts that get occasional hints even after some success. */
export const HARD_FACTS = new Set([
  '6x7', '7x6', '6x8', '8x6',
  '7x8', '8x7', '7x9', '9x7',
  '8x9', '9x8', '6x9', '9x6',
  '7x12', '12x7', '8x12', '12x8',
]);

// ─────────────────────────────────────────────
// Trigger logic
// ─────────────────────────────────────────────

/**
 * Decide whether to show a hint for this fact presentation.
 *
 * @param {string}   factId               — e.g. "7x8"
 * @param {object}   record               — SRS record for this fact
 * @param {boolean}  isFirstIntroduction  — true if timesSeen === 0
 * @param {string[]} hintsShownThisSession — factIds that already got hints this session
 * @returns {boolean}
 */
export function shouldShowHint(factId, record, isFirstIntroduction, hintsShownThisSession) {
  // Never repeat a hint for the same fact in one session
  if (hintsShownThisSession.includes(factId)) return false;

  // Always hint on first introduction
  if (isFirstIntroduction) return true;

  // Hint if the player is struggling: < 50% correct rate with ≥ 2 attempts
  if (record.timesSeen >= 2 && record.timesCorrect / record.timesSeen < 0.5) return true;

  // Occasional hints on hard facts not yet established
  if (HARD_FACTS.has(factId) && record.consecutiveCorrect < 3) {
    if (Math.random() < 0.3) return true;
  }

  // Suppress hints for well-established facts
  if (record.interval >= 3 && record.consecutiveCorrect >= 3) return false;

  return false;
}

/**
 * Get the hint text for a fact.
 * Uses the first multiplier (the "table" for this fact).
 */
export function getHintText(factId) {
  const a = parseInt(factId.split('x')[0], 10);
  return TABLE_HINTS[a] ?? null;
}
