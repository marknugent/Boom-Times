/**
 * Session-start backup/heal for the Redis-backed server copy.
 *
 * localStorage remains the source of truth during play (see sync.js for the
 * per-write pushes). This module only runs at the moment a player is
 * selected:
 *   - healFromServer  — if local storage is empty for this player (iOS
 *     cleared it after inactivity, or a fresh device), pull the server
 *     copy and hydrate localStorage from it before the round is built.
 *   - syncAllToServer — push everything currently in localStorage up to
 *     the server. Covers first deploy (backs up whatever history already
 *     exists locally) and just generally keeps the two in step.
 *
 * Imported only by UI components (HomeScreen, DevScreen) — never by the
 * data modules themselves, so it can safely import all of them without
 * creating a cycle back through sync.js.
 */
import { syncField } from './sync.js';
import { loadSRSState, saveSRSState } from './srs.js';
import { loadProgression, saveProgression } from './progression.js';
import { loadPendingExperiment, savePendingExperiment, loadRecentIds, restoreRecentIds } from './experiments.js';
import { loadInProgressRound, saveInProgressRound } from './roundPersistence.js';

export function syncAllToServer(playerName) {
  if (!playerName) return;
  syncField(playerName, 'srs', loadSRSState(playerName));
  syncField(playerName, 'progression', loadProgression(playerName));
  syncField(playerName, 'round', loadInProgressRound(playerName));
  syncField(playerName, 'pendingExperiment', loadPendingExperiment(playerName)?.id ?? null);
  syncField(playerName, 'recentExperiments', loadRecentIds(playerName));
}

// Local storage being empty is exactly the moment healing matters most
// (iOS wiped it, or the app was deleted and re-added), which makes it the
// worst possible moment to give up after a single transient network blip —
// e.g. WiFi still reconnecting right as the app launches. A few quick
// retries turn "one bad request = silently starts from zero" into a much
// rarer failure, at negligible cost (a couple hundred ms, only when local
// data is already empty).
const HEAL_RETRY_DELAYS_MS = [0, 400, 1000];

async function fetchHealData(playerName) {
  for (let attempt = 0; attempt < HEAL_RETRY_DELAYS_MS.length; attempt++) {
    if (HEAL_RETRY_DELAYS_MS[attempt] > 0) {
      await new Promise(r => setTimeout(r, HEAL_RETRY_DELAYS_MS[attempt]));
    }
    try {
      const res = await fetch(`/api/sync?player=${encodeURIComponent(playerName)}`);
      if (res.ok) return await res.json();
      console.warn(`[serverBackup] heal fetch returned ${res.status} (attempt ${attempt + 1}/${HEAL_RETRY_DELAYS_MS.length})`);
    } catch (err) {
      console.warn(`[serverBackup] heal fetch failed (attempt ${attempt + 1}/${HEAL_RETRY_DELAYS_MS.length}):`, err);
    }
  }
  return null;
}

/** Resolves once healing (if any) is complete. Never throws. */
export async function healFromServer(playerName) {
  if (!playerName) return;

  const hasLocalData = Object.keys(loadSRSState(playerName)).length > 0;
  if (hasLocalData) return; // local storage is intact — nothing to heal

  const data = await fetchHealData(playerName);
  if (!data) {
    console.warn(`[serverBackup] no heal data for ${playerName} after ${HEAL_RETRY_DELAYS_MS.length} attempts — proceeding with empty local state`);
    return;
  }

  if (data.srs)               saveSRSState(data.srs, playerName);
  if (data.progression)       saveProgression(data.progression, playerName);
  if (data.round)             saveInProgressRound(playerName, data.round);
  if (data.pendingExperiment) savePendingExperiment(playerName, { id: data.pendingExperiment });
  if (data.recentExperiments) restoreRecentIds(playerName, data.recentExperiments);
}
