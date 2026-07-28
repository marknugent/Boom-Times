/**
 * Progression & unlock system.
 *
 * Tables unlock in groups as the player demonstrates readiness:
 *   unlock condition — last 2+ completed rounds in the current group have ≥80% first-attempt accuracy
 *
 * "Session" = one completed 15-question round (per the player's choice at setup time).
 *
 * Gradual fact introduction:
 *   When a new group unlocks its facts are added to an "available" pool.
 *   Each round, up to 3 new facts are dripped from that pool into the "introduced" pool.
 *   If the introduced pool is below 15 facts, more are introduced to reach 15 (ensures
 *   the first round always has enough facts to fill a queue).
 */

import { getFactIdsForTable } from './srs.js';
import { syncField } from './sync.js';

const PROGRESSION_KEY_BASE = 'pudge_progression_v1';

/** Returns the localStorage key for a given player (or the legacy global key). */
function getProgressionKey(playerName) {
  return playerName ? `${PROGRESSION_KEY_BASE}__${playerName}` : PROGRESSION_KEY_BASE;
}

// ─────────────────────────────────────────────
// Table group definitions
// ─────────────────────────────────────────────

/**
 * Ordered unlock groups. Index 0 is active from the start.
 * Index 8 = "wild mix" (all tables) — handled separately.
 */
export const TABLE_GROUPS = [
  [1, 10],  // 0 — trivial confidence builders, unlocked from start
  [2, 5],   // 1 — familiar patterns
  [11],     // 2 — digit-repeat pattern
  [3, 4],   // 3
  [9],      // 4 — digit-sum trick
  [6, 7],   // 5 — trickiest pair
  [8],      // 6
  [12],     // 7
];

export const WILD_MIX_INDEX = 8; // virtual group — all 144 facts

// ─────────────────────────────────────────────
// Fact pool helpers
// ─────────────────────────────────────────────

/**
 * All table numbers that are unlocked at a given group index.
 */
export function getUnlockedTables(groupIndex) {
  const tables = [];
  const limit = Math.min(groupIndex, TABLE_GROUPS.length - 1);
  for (let i = 0; i <= limit; i++) tables.push(...TABLE_GROUPS[i]);
  return tables;
}

/**
 * All fact IDs available once groupIndex is unlocked.
 * At WILD_MIX_INDEX, returns all 144 facts.
 */
export function getAllUnlockedFactIds(groupIndex) {
  if (groupIndex >= WILD_MIX_INDEX) {
    const all = [];
    for (let a = 1; a <= 12; a++)
      for (let b = 1; b <= 12; b++)
        all.push(`${a}x${b}`);
    return all;
  }
  return getUnlockedTables(groupIndex).flatMap(t => getFactIdsForTable(t));
}

// ─────────────────────────────────────────────
// Default state
// ─────────────────────────────────────────────

export function defaultProgression() {
  return {
    /** Index of the highest unlocked group (0 = only group 0 active). */
    unlockedGroupIndex: 0,

    /**
     * History of completed rounds.
     * Each entry: { groupIndex, correct, total, timestamp }
     */
    roundHistory: [],

    /**
     * Fact IDs that have been drip-introduced and are eligible for rounds.
     * Starts empty; the first call to getFactsToIntroduce fills it.
     */
    introducedFacts: [],

    /** Rounds completed today (resets on new calendar day). */
    experimentsToday: 0,

    /** ISO date string of last activity (for daily counter). */
    lastActivityDate: null,

    /** All-time-high mastery % (0–100) — see levels.js. Ratchets up only. */
    highestMasteryPct: 0,
  };
}

// ─────────────────────────────────────────────
// localStorage I/O
// ─────────────────────────────────────────────

export function loadProgression(playerName = null) {
  try {
    const raw = localStorage.getItem(getProgressionKey(playerName));
    if (!raw) return defaultProgression();
    const saved = JSON.parse(raw);
    // Merge with defaults to handle schema additions gracefully
    return { ...defaultProgression(), ...saved };
  } catch {
    return defaultProgression();
  }
}

export function saveProgression(progression, playerName = null) {
  try {
    localStorage.setItem(getProgressionKey(playerName), JSON.stringify(progression));
  } catch (e) {
    console.warn('Progression save failed:', e);
  }
  syncField(playerName, 'progression', progression);
}

// ─────────────────────────────────────────────
// Gradual fact introduction
// ─────────────────────────────────────────────

/**
 * Return a list of fact IDs to introduce this round.
 *
 * Rules:
 *  - Introduce enough to bring introducedFacts up to MIN_POOL if it's below it.
 *  - Otherwise introduce at most MAX_NEW_PER_ROUND new facts.
 *  - New facts are drawn from the front of the unlocked-but-not-yet-introduced pool.
 */
const MIN_POOL = 15;
const MAX_NEW_PER_ROUND = 3;

export function getFactsToIntroduce(progression) {
  const { unlockedGroupIndex, introducedFacts } = progression;
  const allUnlocked = getAllUnlockedFactIds(unlockedGroupIndex);
  const notYetIntroduced = allUnlocked.filter(id => !introducedFacts.includes(id));

  if (notYetIntroduced.length === 0) return [];

  // If pool is below minimum, introduce enough to reach it
  const deficit = Math.max(0, MIN_POOL - introducedFacts.length);
  const quota = Math.max(deficit, MAX_NEW_PER_ROUND);
  const count = Math.min(notYetIntroduced.length, quota);

  return notYetIntroduced.slice(0, count);
}

// ─────────────────────────────────────────────
// Unlock logic
// ─────────────────────────────────────────────

/**
 * Check whether the next group should unlock based on recent round performance.
 * Returns the new groupIndex if an unlock is triggered, otherwise null.
 */
export function checkUnlock(progression) {
  const { unlockedGroupIndex, roundHistory } = progression;

  if (unlockedGroupIndex >= WILD_MIX_INDEX) return null; // already at max

  // Rounds played while this group was the active unlock level
  const groupRounds = roundHistory.filter(r => r.groupIndex === unlockedGroupIndex);

  if (groupRounds.length < 2) return null;

  // Check that at least 2 of the last 5 rounds passed the 80% threshold
  const recent = groupRounds.slice(-5);
  const passing = recent.filter(r => r.total > 0 && r.correct / r.total >= 0.8);

  return passing.length >= 2 ? unlockedGroupIndex + 1 : null;
}

// ─────────────────────────────────────────────
// Round completion recording
// ─────────────────────────────────────────────

/**
 * Update progression after a round ends.
 *
 * @param {object} progression — current progression state
 * @param {{ correct: number, total: number }} stats — round results
 * @returns {{ progression: object, unlocked: boolean, newGroupIndex: number|null }}
 */
export function recordRoundCompletion(progression, { correct, total }, playerName = null) {
  const today = new Date().toISOString().split('T')[0];

  const newHistory = [
    ...progression.roundHistory,
    {
      groupIndex: progression.unlockedGroupIndex,
      correct,
      total,
      timestamp: Date.now(),
    },
  ];

  const experimentsToday =
    progression.lastActivityDate === today ? progression.experimentsToday + 1 : 1;

  let updated = {
    ...progression,
    roundHistory: newHistory,
    experimentsToday,
    lastActivityDate: today,
  };

  const newGroupIndex = checkUnlock(updated);
  if (newGroupIndex !== null) {
    updated = { ...updated, unlockedGroupIndex: newGroupIndex };
  }

  saveProgression(updated, playerName);
  return { progression: updated, unlocked: newGroupIndex !== null, newGroupIndex };
}

// ─────────────────────────────────────────────
// Progress screen helpers
// ─────────────────────────────────────────────

// Table-status and confidence helpers live in ProgressScreen.jsx
// to avoid a circular import (progression.js ← srs.js ← progression.js).
