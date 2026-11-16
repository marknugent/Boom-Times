/**
 * Shared top-10 leaderboards for the score-attack mini-games — one list per
 * game, shared across all players (not per-player like playStats.js), since
 * the whole point is the kids competing for the same list.
 *
 * Local-only, deliberately not pushed through sync.js: it's a fun local
 * scoreboard, not progression data, and syncField's per-player-field model
 * doesn't fit a list that's shared across players anyway. Worst case on a
 * device wipe, the leaderboard resets — low stakes.
 */

const MAX_ENTRIES = 10;

export function createLeaderboard(storageKey) {
  function loadLeaderboard() {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Records a finished round's score and returns the updated top 10, plus
   * whether (and where) this particular score landed on it.
   */
  function addScore(playerName, score) {
    const scores = loadLeaderboard();
    const entry = { playerName, score, date: new Date().toISOString() };
    scores.push(entry);
    scores.sort((a, b) => b.score - a.score);
    const leaderboard = scores.slice(0, MAX_ENTRIES);
    const rankIndex = leaderboard.indexOf(entry);

    try {
      localStorage.setItem(storageKey, JSON.stringify(leaderboard));
    } catch { /* non-fatal */ }

    return {
      leaderboard,
      madeTop10: rankIndex !== -1,
      rank: rankIndex !== -1 ? rankIndex + 1 : null,
    };
  }

  return { loadLeaderboard, addScore };
}
