/**
 * Low-level fire-and-forget push to the server-side backup (Upstash Redis
 * via a Vercel serverless function). localStorage remains the source of
 * truth during play — this just keeps a passive off-device copy so
 * progress survives iOS clearing local storage after a period of app
 * inactivity.
 *
 * Deliberately has no dependencies of its own so any data module
 * (srs.js, progression.js, experiments.js, roundPersistence.js) can import
 * it without creating an import cycle.
 */
export function syncField(playerName, field, value) {
  if (!playerName) return;
  fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player: playerName, field, value }),
  }).catch(() => {}); // offline / API down — the next write retries with current state
}
