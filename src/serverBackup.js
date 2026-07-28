/**
 * Session-start reconciliation with the Redis-backed server copy.
 *
 * localStorage remains the fast path during play (see sync.js for the
 * per-write pushes). This module runs once, at the moment a player is
 * selected, and answers "which copy — local or server — is further along?":
 *
 *   - If local has no data at all (iOS wiped it, app was deleted and
 *     re-added, or this is a brand new device), the server copy always wins.
 *   - Otherwise, both sides are compared by total rounds completed — a
 *     monotonic count that only ever increases — and whichever is ahead is
 *     adopted wholesale, overwriting the other. This is what makes it safe
 *     to open the game in a browser other than the primary device: a
 *     behind-or-equal local copy can never silently fork away from the
 *     real progress and later overwrite it.
 *
 * The empty-local case retries the fetch a few times with backoff, since
 * that's the highest-stakes moment (a transient blip there would otherwise
 * look like total data loss). The already-has-data case only tries once —
 * local is presumably fine either way, so there's no reason to make every
 * single "tap a name to play" action wait on retries, especially offline.
 *
 * Imported only by UI components (HomeScreen, DevScreen) — never by the
 * data modules themselves, so it can safely import all of them without
 * creating a cycle back through sync.js.
 */
import { syncField, allowSync } from './sync.js';
import { loadSRSState, saveSRSState } from './srs.js';
import { loadProgression, saveProgression } from './progression.js';
import {
  loadPendingExperiment, savePendingExperiment, clearPendingExperiment,
  loadRecentIds, restoreRecentIds,
} from './experiments.js';
import { loadInProgressRound, saveInProgressRound, clearInProgressRound } from './roundPersistence.js';
import { loadRawStats, restoreStats } from './playStats.js';

export function syncAllToServer(playerName) {
  if (!playerName) return Promise.resolve();
  return Promise.all([
    syncField(playerName, 'srs', loadSRSState(playerName)),
    syncField(playerName, 'progression', loadProgression(playerName)),
    syncField(playerName, 'round', loadInProgressRound(playerName)),
    syncField(playerName, 'pendingExperiment', loadPendingExperiment(playerName)?.id ?? null),
    syncField(playerName, 'recentExperiments', loadRecentIds(playerName)),
    syncField(playerName, 'correctStats', loadRawStats(playerName)),
  ]);
}

const RETRY_DELAYS_MS = [0, 400, 1000];
const FETCH_TIMEOUT_MS = 2500;

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {boolean} retry — true for the empty-local case (worth waiting for),
 *   false for the already-has-data case (one quick attempt, fail fast).
 */
async function fetchServerData(playerName, retry) {
  const delays = retry ? RETRY_DELAYS_MS : [0];
  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt] > 0) await new Promise(r => setTimeout(r, delays[attempt]));
    try {
      const res = await fetchWithTimeout(`/api/sync?player=${encodeURIComponent(playerName)}`);
      if (res.ok) return await res.json();
      console.warn(`[serverBackup] fetch returned ${res.status} (attempt ${attempt + 1}/${delays.length})`);
    } catch (err) {
      console.warn(`[serverBackup] fetch failed (attempt ${attempt + 1}/${delays.length}):`, err);
    }
  }
  return null;
}

function adoptServerBundle(playerName, data) {
  if (data.srs)          saveSRSState(data.srs, playerName);
  if (data.progression)  saveProgression(data.progression, playerName);

  if (data.round) saveInProgressRound(playerName, data.round);
  else            clearInProgressRound(playerName);

  if (data.pendingExperiment) savePendingExperiment(playerName, { id: data.pendingExperiment });
  else                        clearPendingExperiment(playerName);

  if (data.recentExperiments) restoreRecentIds(playerName, data.recentExperiments);
  if (data.correctStats)      restoreStats(playerName, data.correctStats);
}

/** Resolves once reconciliation (if any) is complete. Never throws. */
export async function reconcileWithServer(playerName) {
  if (!playerName) return;

  const hasLocalData = Object.keys(loadSRSState(playerName)).length > 0;
  const data = await fetchServerData(playerName, /* retry */ !hasLocalData);

  if (!data) {
    if (!hasLocalData) {
      console.warn(`[serverBackup] no server data for ${playerName} after retries — proceeding with empty local state`);
    }
    return; // offline / server down — proceed with local as-is; do NOT allowSync, we
            // have no confirmed basis for knowing local is safe to push upstream
  }

  // We got a real round-trip with the server, so we now know where local
  // stands relative to it — safe to resume pushing local writes upstream.
  allowSync(playerName);

  if (!hasLocalData) {
    adoptServerBundle(playerName, data);
    return;
  }

  // Both sides have data — whichever has completed more rounds wins outright.
  // Comparing wholesale (not merging field-by-field) avoids ending up with,
  // say, a newer progression paired with a round-in-progress that no longer
  // matches it.
  const serverRounds = data.progression?.roundHistory?.length ?? 0;
  const localRounds  = loadProgression(playerName).roundHistory.length;

  if (serverRounds > localRounds) {
    adoptServerBundle(playerName, data);
  }
  // else: local is ahead or tied — keep local, nothing to do.
}
