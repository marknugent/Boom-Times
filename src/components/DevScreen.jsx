/**
 * Secret developer screen for previewing payoff animations.
 * Reached by triple-tapping the upper-right quarter of any screen.
 *
 * The playing view mirrors PayoffScreen's stage exactly:
 * beaker (top-left), dancing cat (bottom-right), and sound — so what you
 * see here is what players see.
 */
import { useState } from 'react';
import { A }        from '../gameReducer.js';
import { playSound } from '../sounds.js';
import Beaker       from './Beaker.jsx';
import DancingCat   from './DancingCat.jsx';
import FartBombAnimation       from './FartBombAnimation.jsx';
import SlimeExplosionAnimation from './SlimeExplosionAnimation.jsx';
import FuzzBombAnimation       from './FuzzBombAnimation.jsx';
import SmokeBombAnimation      from './SmokeBombAnimation.jsx';
import ToiletAttackAnimation   from './ToiletAttackAnimation.jsx';

const EXPERIMENTS = [
  { id: 'fart-bomb',       label: 'FART BOMB 💨',       Anim: FartBombAnimation       },
  { id: 'slime-explosion', label: 'SLIME EXPLOSION 🟢', Anim: SlimeExplosionAnimation },
  { id: 'fuzz-bomb',       label: 'FUZZ BOMB 🧶',       Anim: FuzzBombAnimation       },
  { id: 'smoke-bomb',      label: 'SMOKE BOMB 🌫️',      Anim: SmokeBombAnimation      },
  { id: 'toilet-attack',   label: 'TOILET ATTACK 🚽',   Anim: ToiletAttackAnimation   },
];

export default function DevScreen({ dispatch }) {
  const [playing, setPlaying] = useState(null);
  // playKey changes on each launch so CSS animations restart cleanly
  const [playKey, setPlayKey] = useState(0);

  function launch(exp) {
    setPlaying(exp);
    setPlayKey(k => k + 1);
    if (exp.id === 'toilet-attack') {
      playSound(exp.id, { fadeStartMs: 7000, fadeDurationMs: 3000 });
    } else {
      playSound(exp.id);
    }
  }

  if (playing) {
    const { Anim, label } = playing;
    return (
      <div className="w-full h-full relative bg-lab-bg overflow-hidden">

        {/* Animation fills the screen */}
        <Anim key={playKey} />

        {/* Beaker — same position as PayoffScreen */}
        <div className="absolute z-20 animate-beaker-glow beaker-payoff-glow" style={{ top: 56, left: 16 }}>
          <Beaker fillPercent={100} glow />
        </div>

        {/* Dancing cat — matches PayoffScreen exactly */}
        <div className="absolute right-3 z-40 pointer-events-none" style={{ bottom: 62 }}>
          <DancingCat size={280} />
        </div>

        {/* Controls — sit above everything */}
        <div className="absolute bottom-8 inset-x-0 flex flex-col items-center gap-3 z-50 pointer-events-none">
          <div className="font-display text-white/60 text-sm tracking-widest uppercase">
            {label}
          </div>
          <div className="flex gap-3 pointer-events-auto">
            <button
              className="btn-secondary text-sm"
              onClick={() => setPlaying(null)}
            >
              ← experiments
            </button>
            <button
              className="btn-secondary text-sm"
              onClick={() => launch(playing)}
            >
              ↺ replay
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-lab-bg px-6">
      <div className="font-body text-lab-chalk/30 text-xs tracking-[0.3em] uppercase mb-1">
        🔧 dev mode
      </div>
      <div className="font-display text-3xl text-lab-chalk mb-2">
        Experiment Lab
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        {EXPERIMENTS.map(exp => (
          <button
            key={exp.id}
            className="btn-primary w-full text-xl py-5"
            onClick={() => launch(exp)}
          >
            {exp.label}
          </button>
        ))}
      </div>

      <button
        className="btn-secondary mt-8 px-8"
        onClick={() => dispatch({ type: A.NAVIGATE, screen: 'home' })}
      >
        ← Exit dev mode
      </button>
    </div>
  );
}
