import ScoreboardResult from './ScoreboardResult.jsx';

/** LASER CHASE's settled payoff state — final score and the shared top 10. */
export default function LaserChaseResult({ outcome }) {
  return <ScoreboardResult outcome={outcome} title="LASER CHASE" />;
}
