import { useReducer, useEffect, useRef, useState } from 'react';
import { gameReducer, createInitialState, A } from './gameReducer.js';
import { unlockAudio } from './sounds.js';

import HomeScreen     from './components/HomeScreen.jsx';
import QuestionScreen from './components/QuestionScreen.jsx';
import BrewingScreen  from './components/BrewingScreen.jsx';
import PayoffScreen   from './components/PayoffScreen.jsx';
import ProgressScreen from './components/ProgressScreen.jsx';
import DevScreen      from './components/DevScreen.jsx';
import ScaledViewport from './components/ScaledViewport.jsx';

// Triple-tap the upper-right quarter within this window to open dev mode
const TRIPLE_TAP_MS = 600;

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, null, createInitialState);

  // Auto-dismiss speech bubbles after 3 s (reaction type only)
  useEffect(() => {
    if (!state.speechBubble || state.speechBubble.type !== 'reaction') return;
    const t = setTimeout(() => dispatch({ type: A.DISMISS_SPEECH }), 3000);
    return () => clearTimeout(t);
  }, [state.speechBubble]);

  // ── Secret triple-tap → dev mode ─────────────────────────────────
  // Only armed while viewing the hidden Test User tab on the Progress
  // screen — keeps curious kids from stumbling into dev mode elsewhere.
  const [testUserView, setTestUserView] = useState(false);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef(null);

  function handleTap(e) {
    // Unlock audio on the very first real user gesture so sounds can play
    // later from timers without being blocked by the autoplay policy.
    unlockAudio();

    const el   = e.currentTarget;
    const rect = el.getBoundingClientRect();
    // clientX/Y on PointerEvent; fall back to touch/mouse
    const cx = e.clientX ?? e.touches?.[0]?.clientX;
    const cy = e.clientY ?? e.touches?.[0]?.clientY;
    if (cx == null) return;

    const inUpperRight =
      cx - rect.left > rect.width  * 0.5 &&
      cy - rect.top  < rect.height * 0.25;

    // Dev mode is only reachable from the Test User tab of the Progress screen.
    const devModeArmed = state.screen === 'progress' && testUserView;

    if (!inUpperRight || !devModeArmed) {
      // tap outside zone (or outside the armed screen) resets counter
      tapCountRef.current = 0;
      clearTimeout(tapTimerRef.current);
      return;
    }

    tapCountRef.current += 1;
    clearTimeout(tapTimerRef.current);

    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      dispatch({ type: A.NAVIGATE, screen: 'dev' });
    } else {
      // reset if the next tap doesn't come in time
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, TRIPLE_TAP_MS);
    }
  }

  return (
    <ScaledViewport>
      <div
        className="w-full h-full flex flex-col overflow-hidden"
        onPointerDown={handleTap}
      >
        {state.screen === 'home'     && <HomeScreen     state={state} dispatch={dispatch} />}
        {state.screen === 'question' && <QuestionScreen state={state} dispatch={dispatch} />}
        {state.screen === 'brewing'  && <BrewingScreen  state={state} dispatch={dispatch} />}
        {state.screen === 'payoff'   && <PayoffScreen   state={state} dispatch={dispatch} />}
        {state.screen === 'progress' && <ProgressScreen state={state} dispatch={dispatch} onTestUserViewChange={setTestUserView} />}
        {state.screen === 'dev'      && <DevScreen      dispatch={dispatch} />}
      </div>
    </ScaledViewport>
  );
}
