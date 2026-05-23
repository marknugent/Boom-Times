import { useRef } from 'react';
import { A }          from '../gameReducer.js';
import { PLAYERS, TEST_PLAYER } from '../players.js';
import Pudge          from './Pudge.jsx';
import SpeechBubble   from './SpeechBubble.jsx';
import { PUDGE }      from '../pudge.js';

const TRIPLE_TAP_MS = 600;

export default function HomeScreen({ state, dispatch }) {
  const { speechBubble, pudgeState } = state;

  // Triple-tap on the game title → hidden test profile
  const tapRef   = useRef(0);
  const timerRef = useRef(null);

  function handleTitleTap() {
    tapRef.current += 1;
    clearTimeout(timerRef.current);

    if (tapRef.current >= 3) {
      tapRef.current = 0;
      dispatch({ type: A.SELECT_PLAYER, playerName: TEST_PLAYER });
    } else {
      timerRef.current = setTimeout(() => {
        tapRef.current = 0;
      }, TRIPLE_TAP_MS);
    }
  }

  function selectPlayer(name) {
    dispatch({ type: A.SELECT_PLAYER, playerName: name });
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-between px-6 py-8 relative">

      {/* ── Game title — triple-tap opens test profile ── */}
      <div
        className="text-center select-none cursor-default"
        onPointerDown={handleTitleTap}
      >
        <h1 className="font-display text-3xl text-lab-green leading-tight">
          Professor Pudge's
        </h1>
        <h2 className="font-display text-4xl text-lab-chalk leading-tight">
          BOOM TIMES 🧪
        </h2>
      </div>

      {/* ── Pudge with speech bubble above (no layout shift) ── */}
      <div className="relative flex flex-col items-center">
        {/* Bubble is absolutely positioned above Pudge so its
            appearance / disappearance never moves the cat */}
        {speechBubble && (
          <div
            className="absolute left-1/2 -translate-x-1/2 w-max max-w-[230px] z-10"
            style={{ bottom: 'calc(100% + 10px)' }}
          >
            <SpeechBubble
              text={speechBubble.text}
              type={speechBubble.type}
              side="down"
              onDismiss={() => dispatch({ type: A.DISMISS_SPEECH })}
            />
          </div>
        )}
        <Pudge state={pudgeState} size="lg" />
      </div>

      {/* ── Player selection ── */}
      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <div className="font-display text-lg text-lab-chalk/60 tracking-widest uppercase">
          Run Experiment
        </div>
        <div className="flex flex-col gap-3 w-full">
          {PLAYERS.map(name => (
            <button
              key={name}
              className="btn-primary w-full text-xl py-4"
              onClick={() => selectPlayer(name)}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Progress link ── */}
      <button
        className="absolute bottom-4 right-6 btn-secondary text-sm py-2 px-3"
        onClick={() => dispatch({ type: A.NAVIGATE, screen: 'progress' })}
      >
        Progress 📊
      </button>
    </div>
  );
}
