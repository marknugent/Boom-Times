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
import { loadPendingExperiment, savePendingExperiment } from './experiments.js';
import { loadInProgressRound, saveInProgressRound } from './roundPersistence.js';

export function syncAllToServer(playerName) {
  if (!playerName) return;
  syncField(playerName, 'srs', loadSRSState(playerName));
  syncField(playerName, 'progression', loadProgression(playerName));
  syncField(playerName, 'round', loadInProgressRound(playerName));
  syncField(playerName, 'pendingExperiment', loadPendingExperiment(playerName)?.id ?? null);
}

/** Resolves once healing (if any) is complete. Never throws. */
export async function healFromServer(playerName) {
  if (!playerName) return;

  const hasLocalData = Object.keys(loadSRSState(playerName)).length > 0;
  if (hasLocalData) return; // local storage is intact — nothing to heal

  try {
    const res = await fetch(`/api/sync?player=${encodeURIComponent(playerName)}`);
    if (!res.ok) return;
    const data = await res.json();
    if (!data) return;

    if (data.srs)               saveSRSState(data.srs, playerName);
    if (data.progression)       saveProgression(data.progression, playerName);
    if (data.round)             saveInProgressRound(playerName, data.round);
    if (data.pendingExperiment) savePendingExperiment(playerName, { id: data.pendingExperiment });
  } catch {
    // offline / API down — proceed with empty local state, same as before this existed
  }
}
