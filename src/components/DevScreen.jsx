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
import { playSound, stopSound, playLevelUpSound } from '../sounds.js';
import SpongeBobCameo  from './SpongeBobCameo.jsx';
import CatCloseupCameo from './CatCloseupCameo.jsx';
import DoggieCameo        from './DoggieCameo.jsx';
import DadIsWatchingCameo from './DadIsWatchingCameo.jsx';
import AwesomeCameo from './AwesomeCameo.jsx';
import { LEVELS } from '../levels.js';
import FireworksEffect from './FireworksEffect.jsx';
import Beaker       from './Beaker.jsx';
import DancingCat   from './DancingCat.jsx';
import BrewingScreen           from './BrewingScreen.jsx';
import FartBombAnimation       from './FartBombAnimation.jsx';
import SlimeExplosionAnimation from './SlimeExplosionAnimation.jsx';
import FuzzBombAnimation       from './FuzzBombAnimation.jsx';
import SmokeBombAnimation      from './SmokeBombAnimation.jsx';
import ToiletAttackAnimation   from './ToiletAttackAnimation.jsx';
import DancePartyAnimation     from './DancePartyAnimation.jsx';
import SpaceLaunchAnimation    from './SpaceLaunchAnimation.jsx';
import UsaAnimation            from './UsaAnimation.jsx';
import DanceCat                from './DanceCat.jsx';
import BombDetonationAnimation from './BombDetonationAnimation.jsx';

// Fake round state for the brewing preview
const MOCK_BREWING_STATE = {
  round: {
    experiment: {
      ingredient:    '🧪',
      brewingLabel:  'Unstable Compound #7',
    },
    answeredCorrectly: Array(15).fill(null), // 15/15 = 100% — beaker always full at Brewing
  },
};

const EXPERIMENTS = [
  { id: 'fart-bomb',       label: 'FART BOMB 💨',       Anim: FartBombAnimation       },
  { id: 'slime-explosion', label: 'SLIME EXPLOSION 🟢', Anim: SlimeExplosionAnimation },
  { id: 'fuzz-bomb',       label: 'FUZZ BOMB 🧶',       Anim: FuzzBombAnimation,  disabled: true },
  { id: 'smoke-bomb',      label: 'SMOKE BOMB 🌫️',      Anim: SmokeBombAnimation, disabled: true },
  { id: 'toilet-attack',   label: 'TOILET ATTACK 🚽',   Anim: ToiletAttackAnimation   },
  { id: 'dance-party',     label: 'DANCE PARTY 🪩',       Anim: DancePartyAnimation, bgMusic: 'dance-party', danceCat: true },
  { id: 'space-launch',   label: 'SPACE LAUNCH 🚀',      Anim: SpaceLaunchAnimation, bgMusic: 'space-launch' },
  { id: 'usa-usa-usa',       label: 'USA! USA! USA! 🎆',     Anim: UsaAnimation,            bgMusic: 'nyan',             hideCat: true },
  { id: 'bomb-detonation',  label: 'BOMB DETONATION 💥',   Anim: BombDetonationAnimation, bgMusic: 'bomb-detonation',  hideCat: true },
  { id: 'brewing',          label: 'BREWING... 🧫',        isBrewing: true               },
];

/**
 * Payoff animation preview. Level-up banner is triggered manually via the
 * "🎖️ level up now" button — matching real PayoffScreen which only shows it
 * on player-initiated navigation.
 */
function PayoffPreview({ playing, playKey, onBack, onReplay }) {
  const { Anim } = playing;
  const [bannerLevel, setBannerLevel] = useState(null);
  const [bannerIdx,   setBannerIdx]   = useState(0);

  function advanceBanner() {
    const next = bannerIdx + 1;
    if (next >= LEVELS.length) {
      setBannerLevel(null);
    } else {
      setBannerIdx(next);
      setBannerLevel(LEVELS[next]);
    }
  }

  return (
    <div className="w-full h-full relative bg-lab-bg overflow-hidden">

      {/* Animation fills the screen */}
      <Anim key={playKey} />

      {/* Beaker — same position as PayoffScreen */}
      <div className="absolute z-20 animate-beaker-glow beaker-payoff-glow" style={{ top: 56, left: 16 }}>
        <Beaker fillPercent={100} glow />
      </div>

      {/* Dancing cat — swap for DanceCat on dance-party; omitted entirely when hideCat */}
      {!playing.hideCat && (
        <div className="absolute right-3 z-40 pointer-events-none" style={{ bottom: 102 }}>
          {playing.danceCat ? <DanceCat size={280} /> : <DancingCat size={280} />}
        </div>
      )}

      {/* Controls — includes a manual level-up trigger */}
      <div className="absolute bottom-8 inset-x-0 flex flex-col items-center gap-3 z-50 pointer-events-none">
        <div className="font-display text-white/60 text-sm tracking-widest uppercase">
          {playing.label}
        </div>
        <div className="flex gap-2 pointer-events-auto flex-wrap justify-center">
          <button className="btn-secondary text-sm" onClick={onBack}>← experiments</button>
          <button className="btn-secondary text-sm" onClick={onReplay}>↺ replay</button>
          <button
            className="btn-secondary text-sm border-purple-500/50 text-purple-300"
            onClick={() => { setBannerIdx(0); setBannerLevel(LEVELS[0]); playLevelUpSound(); }}
          >
            🎖️ level up now
          </button>
        </div>
      </div>

      {/* Level-up banner overlay — same markup as PayoffScreen, tap cycles levels */}
      {bannerLevel && (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center z-[400]
                     animate-pop-in cursor-pointer select-none"
          style={{ background: 'rgba(8, 14, 22, 0.93)' }}
          onPointerDown={() => { advanceBanner(); playLevelUpSound(); }}
          onContextMenu={(e) => { e.preventDefault(); setBannerLevel(null); }}
        >
          <FireworksEffect />
          <div className="flex flex-col items-center gap-4 px-8 text-center relative" style={{ zIndex: 2 }}>
            <div style={{ fontSize: '7rem', lineHeight: 1 }}>{bannerLevel.emoji}</div>
            <div className="font-display text-lab-green text-3xl tracking-widest uppercase">
              Level {bannerLevel.level} achieved
            </div>
            <div className="font-display text-lab-chalk text-4xl leading-tight">
              {bannerLevel.name}
            </div>
            <div className="font-body text-lab-chalk/40 text-sm mt-4">
              tap to advance · right-click to dismiss · {bannerLevel.level} / {LEVELS.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DevScreen({ dispatch }) {
  const [playing, setPlaying] = useState(null);
  // playKey changes on each launch so CSS animations restart cleanly
  const [playKey, setPlayKey] = useState(0);
  // Level-up banner preview — cycles through LEVELS on each tap
  const [previewLevel, setPreviewLevel] = useState(null);
  const [levelIndex, setLevelIndex] = useState(0);
  // Cameo previews
  const [showCameo,    setShowCameo]    = useState(false);
  const [showCatCameo, setShowCatCameo] = useState(false);
  const [showDogCameo, setShowDogCameo] = useState(false);
  const [showDadCameo, setShowDadCameo] = useState(false);
  // 'Louisa' | 'Marjorie' | null — which player's "is awesome" cameo to preview
  const [showAwesomeCameo, setShowAwesomeCameo] = useState(null);

  function launch(exp) {
    setPlaying(exp);
    setPlayKey(k => k + 1);
    if (exp.isBrewing) return;
    // Experiment SFX (dance-party uses its bgMusic track instead)
    // dance-party, space-launch, and usa-usa-usa use bgMusic only — no separate SFX
    if (exp.id !== 'dance-party' && exp.id !== 'space-launch' && exp.id !== 'usa-usa-usa') {
      if (exp.id === 'toilet-attack') {
        playSound(exp.id, { fadeStartMs: 7000, fadeDurationMs: 3000 });
      } else {
        playSound(exp.id);
      }
    }
    // Background music
    const track = exp.bgMusic ?? 'pounce-pop-parade';
    playSound(track);
  }

  // Shared controls bar used in both preview modes
  function Controls({ label }) {
    return (
      <div className="absolute bottom-8 inset-x-0 flex flex-col items-center gap-3 z-50 pointer-events-none">
        <div className="font-display text-white/60 text-sm tracking-widest uppercase">
          {label}
        </div>
        <div className="flex gap-3 pointer-events-auto">
          <button className="btn-secondary text-sm" onClick={() => { stopSound(playing.bgMusic ?? 'pounce-pop-parade'); setPlaying(null); }}>
            ← experiments
          </button>
          <button className="btn-secondary text-sm" onClick={() => launch(playing)}>
            ↺ replay
          </button>
        </div>
      </div>
    );
  }

  if (playing) {

    // ── Brewing anticipation preview ──────────────────────────────────
    // BrewingScreen is self-contained (owns its beaker + text).
    // Intercept the auto-navigate so it just returns to the list.
    if (playing.isBrewing) {
      return (
        <div className="w-full h-full relative bg-lab-bg overflow-hidden">
          <BrewingScreen
            key={playKey}
            state={MOCK_BREWING_STATE}
            dispatch={(action) => {
              if (action.type === A.NAVIGATE) setPlaying(null);
            }}
          />
          <Controls label={playing.label} />
        </div>
      );
    }

    // ── Payoff animation preview ──────────────────────────────────────
    const { Anim, label } = playing;
    return (
      <PayoffPreview
        key={playKey}
        playing={playing}
        playKey={playKey}
        onBack={() => { stopSound(playing.bgMusic ?? 'pounce-pop-parade'); setPlaying(null); }}
        onReplay={() => launch(playing)}
      />
    );
  }

  // ── Level-up banner preview overlay ─────────────────────────────────
  if (previewLevel) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center z-[400]
                   bg-lab-bg/92 animate-pop-in cursor-pointer select-none"
        onPointerDown={() => {
          // Each tap advances to the next level; wraps around; last tap exits
          const next = levelIndex + 1;
          if (next >= LEVELS.length) {
            setPreviewLevel(null);
            setLevelIndex(0);
          } else {
            setLevelIndex(next);
            setPreviewLevel(LEVELS[next]);
          }
        }}
        onContextMenu={(e) => { e.preventDefault(); setPreviewLevel(null); setLevelIndex(0); }}
      >
        <div className="flex flex-col items-center gap-4 px-8 text-center">
          <div style={{ fontSize: '6rem', lineHeight: 1 }}>{previewLevel.emoji}</div>
          <div className="font-display text-lab-green text-2xl tracking-widest uppercase">
            Level {previewLevel.level} achieved
          </div>
          <div className="font-display text-lab-chalk text-4xl leading-tight">
            {previewLevel.name}
          </div>
          <div className="font-body text-lab-chalk/40 text-sm mt-4">
            tap to advance · right-click to dismiss · {previewLevel.level} / {LEVELS.length}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center gap-3 bg-lab-bg px-4 pt-6 pb-4 overflow-y-auto">
      <div className="font-body text-lab-chalk/30 text-xs tracking-[0.3em] uppercase">
        🔧 dev mode
      </div>
      <div className="font-display text-3xl text-lab-chalk">
        Experiment Lab
      </div>

      {/* ── Two-column button grid ── */}
      <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
        {EXPERIMENTS.map(exp => (
          <button
            key={exp.id}
            className="btn-primary w-full text-sm py-4 leading-tight"
            onClick={() => launch(exp)}
          >
            {exp.disabled ? `🚫 ${exp.label}` : exp.label}
          </button>
        ))}

        <button
          className="btn-primary w-full text-sm py-4 leading-tight bg-purple-600 hover:bg-purple-500 active:bg-purple-700"
          onClick={() => { setLevelIndex(0); setPreviewLevel(LEVELS[0]); }}
        >
          LEVEL UP BANNER 🎖️
        </button>

        <button
          className="btn-primary w-full text-sm py-4 leading-tight bg-cyan-700 hover:bg-cyan-600 active:bg-cyan-800"
          onClick={() => { setShowCameo(true); playSound('fanfare'); }}
        >
          SPONGEBOB BREAK 🧽
        </button>

        <button
          className="btn-primary w-full text-sm py-4 leading-tight bg-orange-700 hover:bg-orange-600 active:bg-orange-800"
          onClick={() => { setShowCatCameo(true); playSound('meow'); }}
        >
          CAT CLOSEUP 🐱
        </button>

        <button
          className="btn-primary w-full text-sm py-4 leading-tight bg-amber-700 hover:bg-amber-600 active:bg-amber-800"
          onClick={() => { setShowDogCameo(true); playSound('barking'); }}
        >
          DOGGIE BREAK 🐶
        </button>

        <button
          className="btn-primary col-span-2 w-full text-sm py-4 leading-tight bg-slate-700 hover:bg-slate-600 active:bg-slate-800"
          onClick={() => { setShowDadCameo(true); playSound('creepy'); }}
        >
          DAD IS WATCHING 👁️
        </button>

        <button
          className="btn-primary w-full text-sm py-4 leading-tight bg-pink-700 hover:bg-pink-600 active:bg-pink-800"
          onClick={() => { setShowAwesomeCameo('Louisa'); playSound('awesome'); }}
        >
          LOUISA IS AWESOME 🌟
        </button>

        <button
          className="btn-primary w-full text-sm py-4 leading-tight bg-pink-700 hover:bg-pink-600 active:bg-pink-800"
          onClick={() => { setShowAwesomeCameo('Marjorie'); playSound('awesome'); }}
        >
          MARJORIE IS AWESOME 🌟
        </button>
      </div>

      {showCameo && (
        <SpongeBobCameo onDismiss={() => setShowCameo(false)} />
      )}
      {showCatCameo && (
        <CatCloseupCameo onDismiss={() => setShowCatCameo(false)} />
      )}
      {showDogCameo && (
        <DoggieCameo onDismiss={() => setShowDogCameo(false)} />
      )}
      {showDadCameo && (
        <DadIsWatchingCameo onDismiss={() => setShowDadCameo(false)} />
      )}
      {showAwesomeCameo && (
        <AwesomeCameo player={showAwesomeCameo} onDismiss={() => setShowAwesomeCameo(null)} />
      )}

      <button
        className="btn-secondary mt-2 px-8"
        onClick={() => dispatch({ type: A.NAVIGATE, screen: 'home' })}
      >
        ← Exit dev mode
      </button>
    </div>
  );
}
