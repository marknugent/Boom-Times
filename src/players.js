/**
 * Hardcoded player profiles.
 *
 * Each player's SRS and progression data is stored under a
 * namespaced localStorage key so profiles never share state.
 *
 * TEST_PLAYER is a hidden profile reachable by triple-tapping
 * the game title on the home screen — useful for demoing a
 * fresh-start experience without wiping any kid's real data.
 *
 * VISIBLE_PLAYERS controls which profiles appear on the home screen
 * and progress screen. Players in PLAYERS but not VISIBLE_PLAYERS
 * are hidden from the UI and have their localStorage data cleared
 * at module load (safe to run repeatedly — removing absent keys
 * is a no-op).
 */

// Full roster — keep this intact so the data structure stays valid.
export const PLAYERS = ['Louisa', 'Marjorie', 'Spencer'];

// Only these players appear on the home / progress screens.
export const VISIBLE_PLAYERS = ['Louisa', 'Marjorie'];

export const TEST_PLAYER = '__test__';

// ── Clear data for any hidden player ─────────────────────────────────
const HIDDEN_PLAYERS = PLAYERS.filter(p => !VISIBLE_PLAYERS.includes(p));
HIDDEN_PLAYERS.forEach(name => {
  try {
    localStorage.removeItem(`pudge_srs_v1__${name}`);
    localStorage.removeItem(`pudge_progression_v1__${name}`);
    localStorage.removeItem(`pudge_pending_exp__${name}`);
  } catch (_) { /* localStorage unavailable — non-fatal */ }
});
