/**
 * sounds.js — centralised audio manager.
 *
 * Why this exists:
 *   Payoff screens are triggered by a setTimeout (2-second feedback delay),
 *   which is outside the browser's "transient user activation" window.
 *   Calling new Audio().play() at that point gets silently blocked by the
 *   autoplay policy on Chrome and always on iOS Safari.
 *
 * Solution — unlock on first tap:
 *   All Audio nodes are created and loaded at module load time.
 *   The first time the user taps anything (via App.jsx's onPointerDown),
 *   we call unlockAudio() which does a silent play+instant-pause on every
 *   sound. This "activates" them inside a real user-gesture call stack.
 *   Any subsequent .play() call — even from a timer — is then allowed.
 */

const SOUNDS = {
  'fart-bomb':         new Audio('/fart.mp3'),
  'slime-explosion':   new Audio('/splat.mp3'),
  'fuzz-bomb':         new Audio('/poof.mp3'),
  'smoke-bomb':        new Audio('/poof.mp3'),              // billowing cloud
  'toilet-attack':     new Audio('/toilet.mp3'),            // dedicated toilet sound
  'success':           new Audio('/success.mp3'),           // correct answer chime
  'wrong':             new Audio('/wrong.mp3'),             // wrong answer sting
  'pounce-pop-parade': new Audio('/pounce_pop_parade.mp3'), // payoff background music
};

// Per-sound base volumes (defaults to 0.8)
const BASE_VOLUME = {
  'pounce-pop-parade': 0.55, // sits under the SFX
};

// Sounds that should loop until explicitly stopped
const LOOPING = new Set(['pounce-pop-parade']);

// Pre-load so they're buffered before they're needed
Object.entries(SOUNDS).forEach(([id, a]) => {
  a.preload = 'auto';
  a.volume  = BASE_VOLUME[id] ?? 0.8;
  a.loop    = LOOPING.has(id);
  a.load();
});

let unlocked = false;

/** Call this inside any real user-gesture handler (onPointerDown, onClick…). */
export function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  Object.values(SOUNDS).forEach(a => {
    a.play()
      .then(() => { a.pause(); a.currentTime = 0; })
      .catch(() => {});
  });
}

// Tracks pending fade timers per sound ID so replaying a sound cancels
// any in-progress fade from a previous play.
const FADE_TIMERS = {};

/**
 * Play a sound by experiment ID. Safe to call from timers / useEffect.
 *
 * @param {string} id              — experiment id matching a SOUNDS key
 * @param {object} [opts]
 * @param {number} [opts.fadeStartMs]    — ms after play() to begin fading (optional)
 * @param {number} [opts.fadeDurationMs] — ms over which to fade from full to silent
 */
export function playSound(id, { fadeStartMs = null, fadeDurationMs = 2000 } = {}) {
  const a    = SOUNDS[id];
  if (!a) return;
  const base = BASE_VOLUME[id] ?? 0.8;

  // Cancel any in-progress fade for this sound
  const existing = FADE_TIMERS[id];
  if (existing) {
    clearTimeout(existing.startTimer);
    clearInterval(existing.fadeInterval);
    delete FADE_TIMERS[id];
  }

  // Reset and play
  a.currentTime = 0;
  a.volume = base;
  a.play().catch(err => console.warn('[sounds] play blocked:', err));

  if (fadeStartMs == null) return;

  // Schedule the fade-out
  const entry = { startTimer: null, fadeInterval: null };
  FADE_TIMERS[id] = entry;

  entry.startTimer = setTimeout(() => {
    const STEPS  = 30;
    const stepMs = fadeDurationMs / STEPS;
    let   step   = 0;

    entry.fadeInterval = setInterval(() => {
      step++;
      a.volume = Math.max(0, base * (1 - step / STEPS));

      if (step >= STEPS) {
        clearInterval(entry.fadeInterval);
        a.pause();
        a.currentTime = 0;
        a.volume = base;
        delete FADE_TIMERS[id];
      }
    }, stepMs);
  }, fadeStartMs);
}

/**
 * Immediately stop a sound and cancel any pending fade.
 * Safe to call even if the sound isn't playing.
 */
export function stopSound(id) {
  const a = SOUNDS[id];
  if (!a) return;
  const existing = FADE_TIMERS[id];
  if (existing) {
    clearTimeout(existing.startTimer);
    clearInterval(existing.fadeInterval);
    delete FADE_TIMERS[id];
  }
  a.pause();
  a.currentTime = 0;
  a.volume = BASE_VOLUME[id] ?? 0.8;
}
