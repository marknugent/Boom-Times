/**
 * PudgeManResult — settles into the normal payoff-screen resting state
 * (score card + nav buttons, rendered by PayoffScreen around this) once
 * a PUDGE-MAN round has ended.
 */
export default function PudgeManResult({ outcome }) {
  const won = outcome === 'won';
  const text =
    outcome === 'won'     ? 'BOARD CLEARED!' :
    outcome === 'lost'    ? 'THE MOUSE GOT PUDGE!' :
    'PUDGE-MAN';

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 animate-pop-in">
      <img
        src={won ? '/pudgeman-open.png' : '/pudgeman-close.png'}
        alt=""
        draggable={false}
        className="w-40 h-40 select-none"
      />
      <div className={`font-display text-3xl text-center px-6 ${won ? 'text-lab-green' : 'text-red-400'}`}>
        {text}
      </div>
    </div>
  );
}
