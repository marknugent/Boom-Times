/**
 * WHACK-A-MOUSE high scores — see leaderboard.js for how the shared top-10
 * works.
 */
import { createLeaderboard } from './leaderboard.js';

// Bumped to v2 to reset the board after the swing-cooldown fix — old scores
// were set under mashable conditions and aren't a fair comparison anymore.
export const { loadLeaderboard, addScore } = createLeaderboard('pudge_whack_scores_v2');
