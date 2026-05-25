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
 *   sound AND resumes the AudioContext. Any subsequent .play() call — even
 *   from a timer — is then allowed.
 *
 * Gapless looping (pounce-pop-parade, dance-party):
 *   HTMLAudioElement.loop has a ~50 ms seek gap at the loop point.
 *   We use the Web Audio API (AudioBufferSourceNode.loop = true) for these
 *   tracks instead — it loops at the hardware level with zero audible gap.
 *   The buffers are fetched and decoded at module load so they're ready
 *   long before the user reaches the payoff screen.
 */

// ─── One-shot SFX (HTMLAudioElement is fine for these) ────────────────
const SOUNDS = {
  'fart-bomb':       new Audio('/fart.mp3'),
  'slime-explosion': new Audio('/splat.mp3'),
  'fuzz-bomb':       new Audio('/poof.mp3'),
  'smoke-bomb':      new Audio('/poof.mp3'),
  'toilet-attack':   new Audio('/toilet.mp3'),
  'success':         new Audio('/success.mp3'),
  'wrong':           new Audio('/wrong.mp3'),
};

// Per-sound base volumes (defaults to 0.8)
const BASE_VOLUME = {
  'pounce-pop-parade': 0.55,
  'dance-party':       0.65,
};

// Pre-load SFX so they're buffered before they're needed
Object.values(SOUNDS).forEach(a => {
  a.preload = 'auto';
  a.volume  = 0.8;
  a.load();
});

// ─── Web Audio API — gapless looping tracks ───────────────────────────
// AudioBufferSourceNode.loop is seamless; HTMLAudioElement.loop is not.

let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

// Tracks whose looping must be gapless
const LOOP_URLS = {
  'pounce-pop-parade': '/pounce_pop_parade.mp3',
  'dance-party':       '/dance.mp3',
};

// id → Promise<AudioBuffer | null>  (resolved once at module load)
const loopBuffers = {};
// id → { source: AudioBufferSourceNode, gain: GainNode }
const loopNodes   = {};

// Kick off decoding immediately — buffers will be ready well before
// the user reaches a payoff screen.
Object.entries(LOOP_URLS).forEach(([id, url]) => {
  loopBuffers[id] = fetch(url)
    .then(r => r.arrayBuffer())
    .then(arr => getAudioCtx().decodeAudioData(arr))
    .catch(err => {
      console.warn('[sounds] loop buffer failed to load:', id, err);
      return null;
    });
});

async function playLoop(id) {
  const ctx = getAudioCtx();
  // Resume context if it was suspended (iOS requires this inside a gesture;
  // unlockAudio() handles the primary resume — this is a safety net).
  if (ctx.state === 'suspended') await ctx.resume();

  const buf = await loopBuffers[id];
  if (!buf) return; // decode failed — silent fallback

  stopLoop(id); // stop any already-playing instance

  const gain = ctx.createGain();
  gain.gain.value = BASE_VOLUME[id] ?? 0.8;
  gain.connect(ctx.destination);

  const source = ctx.createBufferSource();
  source.buffer = buf;
  source.loop   = true;   // gapless hardware loop
  source.connect(gain);
  source.start(0);

  loopNodes[id] = { source, gain };
}

function stopLoop(id) {
  const node = loopNodes[id];
  if (!node) return;
  try { node.source.stop(0); } catch (_) {}
  try { node.gain.disconnect(); } catch (_) {}
  delete loopNodes[id];
}

// ─── Unlock ───────────────────────────────────────────────────────────
let unlocked = false;

/** Call this inside any real user-gesture handler (onPointerDown, onClick…). */
export function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  // Resume Web Audio context — must happen inside a user gesture on iOS
  getAudioCtx().resume().catch(() => {});
  // Unlock HTML Audio elements with the silent play+pause trick
  Object.values(SOUNDS).forEach(a => {
    a.play()
      .then(() => { a.pause(); a.currentTime = 0; })
      .catch(() => {});
  });
}

// ─── Fade timers (for toilet-attack fade-out) ─────────────────────────
const FADE_TIMERS = {};

// ─── Public API ───────────────────────────────────────────────────────

/**
 * Play a sound by ID. Safe to call from timers / useEffect.
 *
 * @param {string} id              — key from SOUNDS or LOOP_URLS
 * @param {object} [opts]
 * @param {number} [opts.fadeStartMs]    — ms after play() to begin fading
 * @param {number} [opts.fadeDurationMs] — ms over which to fade to silence
 */
export function playSound(id, { fadeStartMs = null, fadeDurationMs = 2000 } = {}) {
  // Looping tracks → Web Audio API for gapless looping
  if (LOOP_URLS[id]) {
    playLoop(id);
    return;
  }

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
  // Looping tracks → Web Audio API
  if (LOOP_URLS[id]) {
    stopLoop(id);
    return;
  }

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
