import ScoreboardResult from './ScoreboardResult.jsx';

/** WHACK-A-MOUSE's settled payoff state — final score and the shared top 10. */
export default function WhackAMouseResult({ outcome }) {
  return <ScoreboardResult outcome={outcome} title="WHACK-A-MOUSE" />;
}
