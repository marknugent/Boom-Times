/**
 * In-progress round persistence.
 *
 * Namespaced per player, mirroring experiments.js's pending-experiment lock.
 * Saved whenever a new question becomes current (SELECT_PLAYER, START_ROUND,
 * NEXT_QUESTION) so a round survives app exits, refreshes, or backgrounding.
 * Cleared on normal round completion. Deliberately NOT saved on KEYPAD_CONFIRM —
 * leaving the snapshot pointed at the still-unanswered current question means
 * an app kill during the brief feedback window just re-asks that one question
 * rather than risking a duplicate entry in answeredCorrectly.
 */
import { syncField } from './sync.js';

const ROUND_KEY_BASE = 'pudge_round_v1';

function roundKey(playerName) {
  return playerName ? `${ROUND_KEY_BASE}__${playerName}` : ROUND_KEY_BASE;
}

/** snapshot is a plain object — see gameReducer.js's roundSnapshot() for shape. */
export function saveInProgressRound(playerName, snapshot) {
  try {
    localStorage.setItem(roundKey(playerName), JSON.stringify(snapshot));
  } catch { /* storage full — non-fatal */ }
  syncField(playerName, 'round', snapshot);
}

export function loadInProgressRound(playerName) {
  try {
    const raw = localStorage.getItem(roundKey(playerName));
    if (!raw) return null;
    const saved = JSON.parse(raw);
    return saved?.currentFactId ? saved : null;
  } catch {
    return null;
  }
}

export function clearInProgressRound(playerName) {
  try {
    localStorage.removeItem(roundKey(playerName));
  } catch { /* non-fatal */ }
  syncField(playerName, 'round', null);
}
