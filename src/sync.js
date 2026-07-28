/**
 * Low-level push to the server-side backup (Upstash Redis via a Vercel
 * serverless function). localStorage remains the source of truth during
 * play — this just keeps a passive off-device copy so progress survives
 * iOS clearing local storage after a period of app inactivity.
 *
 * Deliberately has no dependencies of its own so any data module
 * (srs.js, progression.js, experiments.js, roundPersistence.js) can import
 * it without creating an import cycle.
 *
 * Gated on `allowSync`: a device only writes to the server once, this
 * session, it has actually confirmed via a real round-trip (serverBackup.js's
 * reconcileWithServer) where it stands relative to the server copy. Without
 * this gate, a device whose local storage was wiped (iOS) or was simply
 * never caught up, hitting a flaky network moment at exactly the wrong time
 * (reconcile's fetch fails, so it silently leaves local as-is) would still
 * go on to push that stale/empty local state to every field as the game is
 * played, permanently clobbering good server data. Gating means: no
 * confirmed round-trip yet this session → local-only play, nothing pushed,
 * until the next reconcile attempt succeeds.
 */
const syncAllowed = new Set();

export function allowSync(playerName) {
  if (playerName) syncAllowed.add(playerName);
}

const SYNC_TIMEOUT_MS = 4000;

export function syncField(playerName, field, value) {
  if (!playerName || !syncAllowed.has(playerName)) return Promise.resolve();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);

  return fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player: playerName, field, value }),
    signal: controller.signal,
  })
    .catch(() => {}) // offline / API down — the next write retries with current state
    .finally(() => clearTimeout(timer));
}
