/**
 * Pudge character — state constants, emoji placeholders, and reaction copy.
 * All dialogue is selected randomly from pools via pick().
 */

// ─────────────────────────────────────────────
// States
// ─────────────────────────────────────────────

export const PUDGE = {
  IDLE:      'idle',
  SUSPICIOUS: 'suspicious',
  IMPRESSED:  'impressed',
  DISGUSTED:  'disgusted',
  HINT:       'hint',
  ASLEEP:     'asleep',
};

// ─────────────────────────────────────────────
// Emoji placeholders (real PNGs come later)
// ─────────────────────────────────────────────

export const PUDGE_EMOJI = {
  [PUDGE.IDLE]:       '🐱',
  [PUDGE.SUSPICIOUS]: '🐱',
  [PUDGE.IMPRESSED]:  '😏',
  [PUDGE.DISGUSTED]:  '🤢',
  [PUDGE.HINT]:       '🤨',
  [PUDGE.ASLEEP]:     '😴',
};

// ─────────────────────────────────────────────
// Reaction copy pools
// ─────────────────────────────────────────────

const CORRECT = [
  "Fine.",
  "Obviously.",
  "...I'm impressed. Don't tell anyone.",
  "Took you long enough.",
  "Correct. Don't make it weird.",
  "Acceptable.",
  "Correct. Pudge remains unimpressed.",
  "Sure. Whatever. Good job.",
  "...Hm. Not terrible.",
  "Adequate.",
];

const WRONG = [
  "Hmm. No.",
  "That was a bold guess.",
  "Really. Really.",
  "Nope.",
  "Pudge is disappointed. Again.",
  "Bold strategy. Wrong, but bold.",
  "Even worse than Pudge expected.",
  "Did you even try?",
];

const ROUND_START = [
  "Pudge supposes we're doing this.",
  "Another experiment. Fine.",
  "Try not to embarrass yourself.",
];

const HIGH_ACCURACY = [
  "...Not bad. Don't let it go to your head.",
  "Fine. That was fine.",
];

const LOW_ACCURACY = [
  "Pudge has seen better. Pudge has also seen worse. Barely.",
  "We'll try again. Obviously.",
];

const IDLE_GREET = [
  "Hmm. You're back.",
  "You again.",
  "Ready when you are. No rush. Pudge was napping.",
];

// ─────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────

function pick(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─────────────────────────────────────────────
// Exported reaction functions
// ─────────────────────────────────────────────

export const pudge = {
  correct:      () => pick(CORRECT),
  wrong:        () => pick(WRONG),
  roundStart:   () => pick(ROUND_START),
  highAccuracy: () => pick(HIGH_ACCURACY),
  lowAccuracy:  () => pick(LOW_ACCURACY),
  idle:         () => pick(IDLE_GREET),
};
