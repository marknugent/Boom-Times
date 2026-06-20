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
  'fanfare':         new Audio('/fanfare.mp3'),
  'meow':            new Audio('/meow.mp3'),
  'success-beep':    new Audio('/success-beep.mp3'),
  'barking':         new Audio('/barking.mp3'),
  'creepy':          new Audio('/creepy.mp3'),
  'awesome':         new Audio('/awesome.mp3'),
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
  'space-launch':      '/rocket.mp3',
  'nyan':              '/nyan.mp3',
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

// iOS suspends the audio session whenever the page is hidden (app switch,
// screen lock). Resetting `unlocked` here ensures the next tap re-runs the
// full HTMLAudioElement unlock sequence. The AudioContext is also eagerly
// resumed on return so Web Audio loops don't need a gesture to restart.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    unlocked = false;
  } else if (audioCtx) {
    audioCtx.resume().catch(() => {});
  }
});

/** Call this inside any real user-gesture handler (onPointerDown, onClick…). */
export function unlockAudio() {
  if (unlocked) return;
  unlocked = true;

  const ctx = getAudioCtx();

  // Primary unlock: resume AudioContext + play a silent 1-sample buffer.
  // This is the correct iOS Safari technique — no audible output.
  ctx.resume().catch(() => {});
  const silentBuf = ctx.createBuffer(1, 1, 22050);
  const silentSrc = ctx.createBufferSource();
  silentSrc.buffer = silentBuf;
  silentSrc.connect(ctx.destination);
  silentSrc.start(0);

  // Secondary unlock for HTMLAudioElement (so SFX can fire from timers/effects).
  // Zero volume before play so there's no audible blip if the .then() callback
  // is slow — iOS Safari resolves the Promise later than desktop, leaking audio.
  Object.values(SOUNDS).forEach(a => {
    a.volume = 0;
    a.play()
      .then(() => { a.pause(); a.currentTime = 0; a.volume = 0.8; })
      .catch(() => { a.volume = 0.8; });
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

/**
 * Single countdown beep — clean electronic tick for the bomb countdown.
 * Call at each step: 5, 4, 3, 2, 1.
 */
export function playCountdownBeep() {
  const ctx = getAudioCtx();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type            = 'square';
  osc.frequency.value = 880;

  const t = ctx.currentTime;
  gain.gain.setValueAtTime(0.22, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.10);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.10);
}

/**
 * Synthesised rocket ignition thud — fired at launch moment.
 * Lighter and shorter than the explosion boom: sub-bass pulse + low rumble
 * + sharp ignition crack. Designed to punch through the rocket.mp3 loop.
 */
export function playRocketIgnitionBoom() {
  const ctx = getAudioCtx();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  const now = ctx.currentTime;

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -4;
  comp.knee.value      = 8;
  comp.ratio.value     = 18;
  comp.attack.value    = 0.001;
  comp.release.value   = 0.30;
  comp.connect(ctx.destination);

  function noise(durationSec) {
    const len  = Math.floor(ctx.sampleRate * durationSec);
    const buf  = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src  = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  // 1. Ultra-low sub pulse — deepest thud
  const sub1     = ctx.createOscillator();
  const sub1Gain = ctx.createGain();
  sub1.type = 'sine';
  sub1.frequency.setValueAtTime(42, now);
  sub1.frequency.exponentialRampToValueAtTime(10, now + 0.9);
  sub1Gain.gain.setValueAtTime(5.0, now);
  sub1Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
  sub1.connect(sub1Gain); sub1Gain.connect(comp);
  sub1.start(now); sub1.stop(now + 0.9);

  // 2. Sub-bass sweep — chest thump
  const sub2     = ctx.createOscillator();
  const sub2Gain = ctx.createGain();
  sub2.type = 'sine';
  sub2.frequency.setValueAtTime(75, now);
  sub2.frequency.exponentialRampToValueAtTime(20, now + 1.3);
  sub2Gain.gain.setValueAtTime(4.0, now);
  sub2Gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
  sub2.connect(sub2Gain); sub2Gain.connect(comp);
  sub2.start(now); sub2.stop(now + 1.3);

  // 3. Mid-bass punch noise — adds body to the low end
  const punch     = noise(0.6);
  const punchBP   = ctx.createBiquadFilter();
  punchBP.type    = 'bandpass';
  punchBP.frequency.value = 90;
  punchBP.Q.value = 0.7;
  const punchGain = ctx.createGain();
  punchGain.gain.setValueAtTime(3.0, now);
  punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
  punch.connect(punchBP); punchBP.connect(punchGain); punchGain.connect(comp);
  punch.start(now); punch.stop(now + 0.6);

  // 4. Heavy low rumble — sustaining ignition roar
  const rumble     = noise(2.8);
  const rumbleLP   = ctx.createBiquadFilter();
  rumbleLP.type    = 'lowpass';
  rumbleLP.frequency.value = 320;
  const rumbleGain = ctx.createGain();
  rumbleGain.gain.setValueAtTime(3.2, now);
  rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 2.8);
  rumble.connect(rumbleLP); rumbleLP.connect(rumbleGain); rumbleGain.connect(comp);
  rumble.start(now); rumble.stop(now + 2.8);

  // 5. Ignition crack — brief high transient
  const crack     = noise(0.08);
  const crackBP   = ctx.createBiquadFilter();
  crackBP.type    = 'bandpass';
  crackBP.frequency.value = 1800;
  crackBP.Q.value = 0.5;
  const crackGain = ctx.createGain();
  crackGain.gain.setValueAtTime(1.4, now);
  crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  crack.connect(crackBP); crackBP.connect(crackGain); crackGain.connect(comp);
  crack.start(now); crack.stop(now + 0.08);
}

/**
 * Synthesised explosion boom — six layered sources through a compressor.
 * No audio file required.
 *
 * Layers (all → compressor → destination):
 *   1. Heavy lowpass noise body   (300 Hz, 4 s)
 *   2. Mid-range rumble           (120 Hz bandpass, 2.5 s)
 *   3. Sub-bass pitch sweep       (90→20 Hz sine, 1.3 s)
 *   4. Ultra-low sub pulse        (45→12 Hz sine, 0.6 s)
 *   5. Sharp crack                (3000 Hz bandpass, 0.15 s)
 *   6. High-frequency debris hiss (5000 Hz highpass, 2 s)
 */
export function playExplosionBoom() {
  const ctx = getAudioCtx();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  const now = ctx.currentTime;

  // Master compressor — lets each layer be loud without hard clipping
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -6;
  comp.knee.value      = 6;
  comp.ratio.value     = 20;
  comp.attack.value    = 0.001;
  comp.release.value   = 0.25;
  comp.connect(ctx.destination);

  function noise(durationSec) {
    const len  = Math.floor(ctx.sampleRate * durationSec);
    const buf  = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src  = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  // 1. Heavy noise body
  const body     = noise(4.0);
  const bodyLP   = ctx.createBiquadFilter();
  bodyLP.type    = 'lowpass';
  bodyLP.frequency.value = 300;
  const bodyGain = ctx.createGain();
  bodyGain.gain.setValueAtTime(2.2, now);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 4.0);
  body.connect(bodyLP); bodyLP.connect(bodyGain); bodyGain.connect(comp);
  body.start(now); body.stop(now + 4.0);

  // 2. Mid-range rumble
  const rumble     = noise(2.5);
  const rumbleBP   = ctx.createBiquadFilter();
  rumbleBP.type    = 'bandpass';
  rumbleBP.frequency.value = 120;
  rumbleBP.Q.value = 0.7;
  const rumbleGain = ctx.createGain();
  rumbleGain.gain.setValueAtTime(1.8, now);
  rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
  rumble.connect(rumbleBP); rumbleBP.connect(rumbleGain); rumbleGain.connect(comp);
  rumble.start(now); rumble.stop(now + 2.5);

  // 3. Sub-bass sweep (chest-thump)
  const sub1     = ctx.createOscillator();
  const sub1Gain = ctx.createGain();
  sub1.type = 'sine';
  sub1.frequency.setValueAtTime(90, now);
  sub1.frequency.exponentialRampToValueAtTime(20, now + 1.3);
  sub1Gain.gain.setValueAtTime(2.5, now);
  sub1Gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
  sub1.connect(sub1Gain); sub1Gain.connect(comp);
  sub1.start(now); sub1.stop(now + 1.3);

  // 4. Ultra-low sub pulse
  const sub2     = ctx.createOscillator();
  const sub2Gain = ctx.createGain();
  sub2.type = 'sine';
  sub2.frequency.setValueAtTime(45, now);
  sub2.frequency.exponentialRampToValueAtTime(12, now + 0.6);
  sub2Gain.gain.setValueAtTime(3.0, now);
  sub2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
  sub2.connect(sub2Gain); sub2Gain.connect(comp);
  sub2.start(now); sub2.stop(now + 0.6);

  // 5. Sharp crack
  const crack     = noise(0.15);
  const crackBP   = ctx.createBiquadFilter();
  crackBP.type    = 'bandpass';
  crackBP.frequency.value = 3000;
  crackBP.Q.value = 0.3;
  const crackGain = ctx.createGain();
  crackGain.gain.setValueAtTime(2.0, now);
  crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  crack.connect(crackBP); crackBP.connect(crackGain); crackGain.connect(comp);
  crack.start(now); crack.stop(now + 0.15);

  // 6. High-frequency debris hiss
  const hiss     = noise(2.0);
  const hissHP   = ctx.createBiquadFilter();
  hissHP.type    = 'highpass';
  hissHP.frequency.value = 5000;
  const hissGain = ctx.createGain();
  hissGain.gain.setValueAtTime(0.6, now);
  hissGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
  hiss.connect(hissHP); hissHP.connect(hissGain); hissGain.connect(comp);
  hiss.start(now); hiss.stop(now + 2.0);
}

/**
 * Synthesised fireworks burst — no audio file required.
 *
 * Fires 5 staggered noise-burst "shells" using the Web Audio API.
 * Each shell is bandpass-filtered white noise with an exponential
 * volume decay, giving a realistic firework crack/pop.
 */
export function playLevelUpSound() {
  const ctx = getAudioCtx();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  function shell(offsetSec, freq, vol) {
    const dur    = 0.6;
    const bufLen = Math.floor(ctx.sampleRate * dur);
    const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type            = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value         = 0.7;

    const gain = ctx.createGain();
    const t    = ctx.currentTime + offsetSec;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(t);
    noise.stop(t + dur);
  }

  // Five shells at staggered offsets — feels like a multi-burst firework
  shell(0.00, 1100, 0.55);
  shell(0.18,  800, 0.45);
  shell(0.38, 1400, 0.40);
  shell(0.60,  650, 0.35);
  shell(0.82, 1000, 0.30);
}
