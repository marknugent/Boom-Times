/**
 * DadJokeCameo — "DAD JOKE BREAK!" interstitial.
 *
 * Unlike every other bonus cameo, this one is interactive and has no
 * auto-dismiss timer: two riddle-style jokes are revealed one at a time via
 * "Show Answer!" buttons, and a "Done" button (only shown once both
 * punchlines are visible) is what actually dismisses it.
 *
 * elevator-music.mp3 loops for the duration via the same gapless Web Audio
 * loop system used for bgMusic elsewhere — started on mount, stopped on
 * unmount/dismiss.
 */
import { useEffect, useState } from 'react';
import { playSound, stopSound } from '../sounds.js';
import { getRandomJokes } from '../dadJokes.js';

const REVEAL_PAUSE_MS = 3400; // let joke 1's punchline sink in before joke 2 appears

export default function DadJokeCameo({ onDismiss }) {
  const [jokes] = useState(() => getRandomJokes(2));
  const [answer1Shown, setAnswer1Shown] = useState(false);
  const [showJoke2, setShowJoke2] = useState(false);
  const [answer2Shown, setAnswer2Shown] = useState(false);

  useEffect(() => {
    playSound('dad-joke-break');
    return () => stopSound('dad-joke-break');
  }, []);

  function revealAnswer1() {
    setAnswer1Shown(true);
    setTimeout(() => setShowJoke2(true), REVEAL_PAUSE_MS);
  }

  const [joke1, joke2] = jokes;

  return (
    <div className="fixed inset-0 z-[250] flex flex-col overflow-hidden">
      {/* Background — full-bleed, scaled to cover */}
      <img
        src="/dad-jokes-bg.jpg"
        alt=""
        draggable={false}
        className="fixed inset-0 w-full h-full object-cover select-none"
      />

      {/* Content */}
      <div className="relative flex-1 flex flex-col items-center gap-5 px-6 pt-12 pb-8">
        {/* Headline — on top of the page */}
        <div
          className="font-display text-4xl text-center leading-tight animate-pop-in"
          style={{
            color:      '#fde047',
            textShadow: '0 0 24px rgba(0,0,0,1), 0 3px 10px rgba(0,0,0,1)',
          }}
        >
          DAD JOKE BREAK!
        </div>

        {/* Joke 1 */}
        <div className="lab-panel backdrop-blur-sm bg-lab-panel/85 px-5 py-4 w-full max-w-sm flex flex-col items-center gap-3 animate-pop-in">
          <p className="font-body text-lab-chalk text-center text-lg leading-snug">
            {joke1.setup}
          </p>
          {!answer1Shown ? (
            <button className="btn-primary text-sm px-6 py-2" onClick={revealAnswer1}>
              Show Answer!
            </button>
          ) : (
            <p className="font-display text-lab-green text-center text-xl leading-snug animate-pop-in">
              {joke1.punchline}
            </p>
          )}
        </div>

        {/* Joke 2 — appears after a beat once joke 1's answer is shown */}
        {showJoke2 && (
          <div className="lab-panel backdrop-blur-sm bg-lab-panel/85 px-5 py-4 w-full max-w-sm flex flex-col items-center gap-3 animate-pop-in">
            <p className="font-body text-lab-chalk text-center text-lg leading-snug">
              {joke2.setup}
            </p>
            {!answer2Shown ? (
              <button className="btn-primary text-sm px-6 py-2" onClick={() => setAnswer2Shown(true)}>
                Show Answer!
              </button>
            ) : (
              <p className="font-display text-lab-green text-center text-xl leading-snug animate-pop-in">
                {joke2.punchline}
              </p>
            )}
          </div>
        )}

        {/* Done — appears once both punchlines are showing; this is the only dismiss */}
        {answer2Shown && (
          <button className="btn-secondary text-sm px-10 py-2 mt-2 animate-pop-in" onClick={onDismiss}>
            Done
          </button>
        )}
      </div>
    </div>
  );
}
