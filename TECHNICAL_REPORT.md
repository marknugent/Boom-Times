# Professor Pudge's Boom Times — Technical Report

A multiplication-tables learning game for kids (target age ~8), designed for mobile browser use.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 18 (functional components, hooks) |
| State | `useReducer` — single global reducer, no external state library |
| Build tool | Vite 5 |
| Styling | Tailwind CSS 3 + custom `@keyframes` in a single `index.css` |
| Language | Plain JavaScript (ES modules, no TypeScript) |
| Persistence | `localStorage` only — no backend, no auth, no network requests |
| Dependencies | `react`, `react-dom` — nothing else in production |
| Dev deps | `@vitejs/plugin-react`, `tailwindcss`, `autoprefixer`, `postcss` |

---

## Build Output

```
vite build → dist/
  index.html           0.88 kB
  assets/index.css    28.66 kB (gzip: 5.62 kB)
  assets/index.js    196.10 kB (gzip: 61.72 kB)
```

54 JS modules, no code splitting, single-bundle output. The JS is almost entirely React + application logic — there are zero runtime fetch calls and no external CDN dependencies in the bundle.

Static assets in `public/` (served as-is from root):
```
asleep.png, dance1.png, dance2.png, dance3.png   — Pudge sprite frames
disgusted.png, hint_mode.png, idle.png            — Pudge states
reluctantly_impressed.png, suspicious.png
pudge-sprites.png                                 — sprite sheet
bouncing-TP.webp, elmo.gif                        — toilet attack BG images
giphy.gif, giphy-1.gif, giphy-2.gif               — misc
fart.mp3, splat.mp3, poof.mp3, toilet.mp3         — sound effects (4 files)
```

Total public asset footprint is modest — the largest assets are the MP3s and animated GIFs.

---

## Architecture

### Single-Page App, Screen-Based Navigation

There is no router. Navigation is a `screen` field in app state:

```
'home'     → HomeScreen      player selection
'question' → QuestionScreen  core gameplay loop
'payoff'   → PayoffScreen    end-of-round animation + score
'progress' → ProgressScreen  12-table mastery grid
'dev'      → DevScreen       hidden developer/animation preview tool
```

`App.jsx` renders exactly one screen at a time via conditional rendering. Screen transitions are instant (no animated transitions between screens — the individual screen animations handle all the visual drama).

### State Management

All mutable state lives in a single `useReducer` call at the `App` level. State is passed down as props — no context, no Zustand, no Redux. Action constants are defined as `A.NAVIGATE`, `A.SELECT_PLAYER`, `A.KEYPAD_CONFIRM`, etc.

**State shape:**
```js
{
  screen: 'home' | 'question' | 'payoff' | 'progress' | 'dev',
  currentPlayer: string | null,       // 'Louisa', 'Marjorie', 'Spencer', '__test__'
  srsState: { [factId]: SRSRecord },  // e.g. { '7x8': { interval, easeFactor, ... } }
  progression: ProgressionState,
  round: RoundState | null,
  question: QuestionState | null,
  pudgeState: PUDGE enum,
  speechBubble: { text, type } | null,
  hintsShownThisSession: string[],
  newUnlock: { groupIndex, tables } | null,
}
```

State is **never persisted as a whole** — only `srsState` and `progression` are saved to localStorage (individually, via their own save functions called inside the reducer after mutations).

---

## Core Systems

### 1. Spaced Repetition (SRS) — `src/srs.js`

A simplified SM-2 algorithm with response-time weighting. Each of the 144 multiplication facts (1×1 through 12×12) has a record:

```js
{
  timesSeen, timesCorrect,
  interval,           // days until next review
  easeFactor,         // SM-2 multiplier (default 2.5, clamped 1.3–2.8)
  nextDue,            // ISO date string
  avgResponseTime,    // rolling 70/30 weighted average (ms)
  consecutiveCorrect, // streak; resets on wrong
}
```

**Response-time tiers:** Fast (<3s) → full interval advance, ease +0.1. Medium (3–6s) → interval ×0.85. Slow (>6s) → interval ×0.65, ease −0.05. Wrong → streak reset, interval back to 1, ease −0.2.

**Easy-table acceleration:** 1× and 10× tables get pre-seeded SRS records on first introduction (interval 3 / easeFactor 2.7 for 1×; interval 2 / easeFactor 2.6 for 10×). Their queue priority is also dampened (×0.25 for 1×, ×0.55 for 10×) so they don't crowd out harder facts once the child has seen them a couple of times.

**Mastery threshold:** `interval ≥ 3 days AND avgResponseTime < 4000ms AND consecutiveCorrect ≥ 2`.

localStorage key pattern: `pudge_srs_v1__Louisa`, `pudge_srs_v1__Marjorie`, etc.

### 2. Progression / Unlock System — `src/progression.js`

Tables are grouped into 8 ordered groups that unlock progressively:

```js
[1, 10]  // group 0 — always unlocked (trivial confidence builders)
[2, 5]   // group 1
[11]     // group 2 — digit-repeat pattern
[3, 4]   // group 3
[9]      // group 4 — digit-sum trick
[6, 7]   // group 5 — trickiest pair
[8]      // group 6
[12]     // group 7
// group 8 = "Wild Mix" — all 144 facts (virtual)
```

**Unlock condition:** At least 2 of the last 5 rounds at the current group level scored ≥80% first-attempt accuracy.

**Gradual fact introduction (drip system):** When a new group unlocks, its facts don't all appear at once. Up to 3 new facts per round are dripped from an "available" pool into an "introduced" pool. If the introduced pool is below 15 facts (the round size), more are added immediately to fill it. This means a brand-new player starts with just the 1× and 10× facts and gradually encounters new material.

localStorage key pattern: `pudge_progression_v1__Louisa`, etc.

### 3. Round Queue Building — `src/srs.js → buildRoundQueue()`

Each 15-question round is built by:
1. Sorting introduced facts by priority score (days overdue × depth multiplier)
2. Reserving up to 3 slots for new (never-seen) facts
3. Shuffling the selected 15 with Fisher-Yates

Wrong answers are re-appended to the queue mid-round (child sees them again before the round ends). First-attempt accuracy is tracked separately from total-correct for scoring.

### 4. Hint System — `src/hints.js`

Hints are one-liner mnemonic tips keyed by table number (Pudge's voice). A hint appears when:
- The fact is brand new (first introduction)
- The child is struggling: <50% correct rate with ≥2 attempts on that fact
- 30% random chance on "hard facts" (6×7, 7×8, 8×9, etc.) that aren't yet well-established

Hints are suppressed for well-established facts (interval ≥ 3 AND streak ≥ 3) and never shown twice for the same fact in the same session.

---

## Player Profiles

Three hardcoded players: `Louisa`, `Marjorie`, `Spencer`. A hidden test profile (`__test__`) is accessible via triple-tap on the game title.

Each player's SRS and progression data is stored under namespaced localStorage keys. Selecting a player loads their data, introduces new facts, and jumps directly to the question screen — no intermediate loading step. Returning home clears all player state from memory.

All functions that touch localStorage accept `playerName = null` with a fallback to the legacy unnamespaced key — backward compatible if any pre-profile data exists.

---

## UI & Animation

### Layout

The app is a fixed-height viewport container (`w-full h-full`) sized to the device screen. All screens use absolute/flexbox positioning rather than scrolling. Designed for portrait mobile (roughly 390×844px iPhone), works in any modern mobile browser.

### Pudge

A cat character with 7 sprite states: `ASLEEP`, `IDLE`, `SUSPICIOUS`, `IMPRESSED`, `RELUCTANTLY_IMPRESSED`, `DISGUSTED`, `HINT`. Each state is a PNG. Pudge appears on the home screen (large), question screen (medium, lower-left), and payoff screen (dancing — 3-frame CSS sprite animation). Speech bubbles float above Pudge using absolute positioning so they never shift his position.

### Payoff Animations (5 experiments)

Each experiment has a dedicated full-screen animation component. All animations are pure CSS `@keyframes` — no canvas, no WebGL, no animation library. Key techniques used:

- **CSS custom properties in keyframes** (`var(--dx)`, `var(--op)`, `var(--r0)`, etc.) allow parametric per-element animations from a single keyframe definition
- **`animation-fill-mode: both`** prevents elements from flashing in at their initial state before their delay fires
- **SVG blobs** with Catmull-Rom → cubic Bézier conversion for organic shapes
- **Z-index stacking** to layer elements above/behind the dancing cat (z-50) without a new stacking context

The 5 experiments:

| ID | Animation | Notes |
|---|---|---|
| `fart-bomb` | Green cloud puffs + colour wash | |
| `slime-explosion` | 40 blobs fly outward + 10 splat hits + drips | Most complex — 40 SVG blobs, 6 green wash pulses |
| `fuzz-bomb` | Fuzzy particles burst out | |
| `smoke-bomb` | 💣→💥 detonation then billowing gray fog | 4 SVG fog layers with gradient fills; front layer (z=55) occludes the dancing cat |
| `toilet-attack` | 3-layer parallax cascade of 🚽💩🧻 + elmo.gif + bouncing-TP.webp floating in background | |

### Audio

`src/sounds.js` pre-instantiates `Audio` objects at module load time. A `unlockAudio()` function is called on the first user gesture (pointer down on the app container) to satisfy browser autoplay policy — this plays all 4 sounds at volume 0 silently to prime the audio context. Subsequent `playSound()` calls work from timers without blocking.

Toilet attack audio fades out after 7s (over 3s) using a `setInterval` step-down of 30 steps.

### Developer Tools

A hidden `DevScreen` (triple-tap top-right corner of app) lets you trigger any experiment animation on demand. Accessible without going through a full game round — useful for testing animation/sound changes.

---

## What This Is NOT

- **No server.** Zero backend. No API calls. No user accounts. No database.
- **No service worker / PWA.** Not installable as a native app, no offline caching beyond the browser's default.
- **No authentication.** Player selection is UI-only, not secured in any way.
- **No analytics.** No tracking pixels, no error reporting service.
- **No tests.** No test suite.
- **No environment variables.** The build is identical regardless of environment — there's nothing to configure.

---

## Deployment Characteristics

- **Fully static.** `vite build` produces a `dist/` folder of flat files (HTML + 2 assets + public files). Can be served from any static host with zero server-side logic.
- **Single-origin.** All assets are relative paths. Works from any base URL (though Vite's default `base: '/'` assumes root deployment).
- **No CDN dependency at runtime.** Everything is self-contained in the bundle.
- **Data stays on the device.** localStorage is per-browser, per-origin. If a child plays on a different device or clears browser storage, their progress is lost — there is currently no export/sync mechanism.
- **Build command:** `npm run build` → outputs to `dist/`
- **Preview command:** `npm run preview` → serves `dist/` locally for verification
