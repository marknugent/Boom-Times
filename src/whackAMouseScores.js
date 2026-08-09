/**
 * WHACK-A-MOUSE high scores — a single shared top-10 leaderboard across all
 * players (not per-player like playStats.js/experiments.js), since the
 * whole point is Louisa and Marjorie competing for the same list.
 *
 * Local-only, deliberately not pushed through sync.js: it's a fun local
 * scoreboard, not progression data, and syncField's per-player-field model
 * doesn't fit a list that's shared across players anyway. Worst case on a
 * device wipe, the leaderboard resets — low stakes.
 */

const SCORES_KEY  = 'pudge_whack_scores_v1';
const MAX_ENTRIES = 10;

export function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Records a finished round's score and returns the updated top 10, plus
 * whether (and where) this particular score landed on it.
 */
export function addScore(playerName, score) {
  const scores = loadLeaderboard();
  const entry = { playerName, score, date: new Date().toISOString() };
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score);
  const leaderboard = scores.slice(0, MAX_ENTRIES);
  const rankIndex = leaderboard.indexOf(entry);

  try {
    localStorage.setItem(SCORES_KEY, JSON.stringify(leaderboard));
  } catch { /* non-fatal */ }

  return {
    leaderboard,
    madeTop10: rankIndex !== -1,
    rank: rankIndex !== -1 ? rankIndex + 1 : null,
  };
}
