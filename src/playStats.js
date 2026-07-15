/**
 * Correct-answer submission tracking — per player, per calendar day.
 *
 * Deliberately independent of round completion. A round can be resumed
 * across days (round-persistence lets a round started yesterday finish
 * today after just one or two more answers), so "rounds completed today"
 * alone can't verify how much real work happened today. This counts every
 * individual correct submission at the moment it happens, so it can be used
 * as a backstop against rounds-completed (e.g. 3 rounds should come with
 * roughly 45+ correct answers, not 45 carried over from previous days).
 */
import { syncField } from './sync.js';

const STATS_KEY_BASE = 'pudge_correct_stats_v1';

function statsKey(playerName) {
  return playerName ? `${STATS_KEY_BASE}__${playerName}` : STATS_KEY_BASE;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function defaultStats() {
  return {
    cumulativeCorrect: 0,
    // Per-day counts, e.g. { "2026-07-15": 22 }
    daily: {},
  };
}

function loadStats(playerName) {
  try {
    const raw = localStorage.getItem(statsKey(playerName));
    if (!raw) return defaultStats();
    return { ...defaultStats(), ...JSON.parse(raw) };
  } catch {
    return defaultStats();
  }
}

function saveStats(playerName, stats) {
  try {
    localStorage.setItem(statsKey(playerName), JSON.stringify(stats));
  } catch { /* non-fatal */ }
  syncField(playerName, 'correctStats', stats);
}

/** Call once per correct answer submission (KEYPAD_CONFIRM with correct=true). */
export function recordCorrectAnswer(playerName) {
  const stats = loadStats(playerName);
  const today = todayStr();
  stats.cumulativeCorrect += 1;
  stats.daily[today] = (stats.daily[today] ?? 0) + 1;
  saveStats(playerName, stats);
}

/** { correctToday, correctTotal } for display. */
export function getCorrectStats(playerName) {
  const stats = loadStats(playerName);
  return {
    correctToday: stats.daily[todayStr()] ?? 0,
    correctTotal: stats.cumulativeCorrect,
  };
}
