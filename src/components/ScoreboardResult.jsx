/**
 * ScoreboardResult — the payoff-screen resting state (score card + nav
 * buttons, rendered by PayoffScreen around this) for the score-attack
 * mini-games: final score plus that game's shared top-10 leaderboard.
 */
export default function ScoreboardResult({ outcome, title }) {
  if (!outcome || outcome.skipped) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 animate-pop-in">
        <div className="font-display text-3xl text-center px-6 text-lab-chalk">{title}</div>
      </div>
    );
  }

  const { score, madeTop10, rank, leaderboard } = outcome;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 animate-pop-in px-6">
      <div className="font-display text-xl text-lab-chalk">TIME'S UP!</div>
      <div className="font-display text-5xl text-lab-green">{score}</div>
      {madeTop10 && (
        <div className="font-display text-base text-lab-yellow">new high score — #{rank}!</div>
      )}

      <div className="lab-panel px-4 py-3 w-full max-w-xs mt-2">
        <div className="font-body text-xs text-lab-chalk/60 uppercase tracking-widest mb-2 text-center">
          Top Scores
        </div>
        <ol className="font-body text-sm text-lab-chalk flex flex-col gap-1 max-h-[150px] overflow-y-auto">
          {leaderboard.map((entry, i) => (
            <li
              key={i}
              className={`flex justify-between px-1 ${madeTop10 && i === rank - 1 ? 'text-lab-green font-bold' : ''}`}
            >
              <span>{i + 1}. {entry.playerName}</span>
              <span>{entry.score}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
