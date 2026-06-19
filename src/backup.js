/**
 * backup.js — export / import all player progress data.
 *
 * Backup format:
 *   {
 *     schema:     "pudge-boom-times-v1",
 *     appVersion: "1.1.1",
 *     exportedAt: "<ISO string>",
 *     players: {
 *       Louisa:   { srs, progression, pendingExp },
 *       Marjorie: { srs, progression, pendingExp },
 *       ...
 *     }
 *   }
 *
 * All three per-player buckets may be null (player never played / fresh install).
 * Import restores only the keys present in the backup; players absent from
 * the file are left untouched.
 */

import { PLAYERS } from './players.js';

export const BACKUP_SCHEMA = 'pudge-boom-times-v1';

// ─── Key helpers (must match srs.js / progression.js / experiments.js) ──────
const srsKey         = name => `pudge_srs_v1__${name}`;
const progressionKey = name => `pudge_progression_v1__${name}`;
const pendingExpKey  = name => `pudge_pending_exp__${name}`;

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ─── Export ──────────────────────────────────────────────────────────────────

export function buildBackup(appVersion) {
  const players = {};
  for (const name of PLAYERS) {
    players[name] = {
      srs:         readJson(srsKey(name)),
      progression: readJson(progressionKey(name)),
      pendingExp:  readJson(pendingExpKey(name)),
    };
  }
  return {
    schema:     BACKUP_SCHEMA,
    appVersion: appVersion ?? 'unknown',
    exportedAt: new Date().toISOString(),
    players,
  };
}

export function downloadBackup(appVersion) {
  const backup = buildBackup(appVersion);
  const json   = JSON.stringify(backup, null, 2);
  const blob   = new Blob([json], { type: 'application/json' });
  const url    = URL.createObjectURL(blob);
  const date   = new Date().toISOString().slice(0, 10);
  const a      = document.createElement('a');
  a.href       = url;
  a.download   = `pudge-progress-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Validate ────────────────────────────────────────────────────────────────

export function validateBackup(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'Not a valid JSON object.' };
  }
  if (parsed.schema !== BACKUP_SCHEMA) {
    const found = parsed.schema ? `"${parsed.schema}"` : 'missing';
    return { ok: false, error: `Unrecognised backup format (schema: ${found}). This file may be from a different app.` };
  }
  if (typeof parsed.exportedAt !== 'string' || !Date.parse(parsed.exportedAt)) {
    return { ok: false, error: 'Backup is missing a valid export timestamp.' };
  }
  if (!parsed.players || typeof parsed.players !== 'object' || Array.isArray(parsed.players)) {
    return { ok: false, error: 'Backup is missing player data.' };
  }
  if (Object.keys(parsed.players).length === 0) {
    return { ok: false, error: 'Backup contains no player entries.' };
  }
  return { ok: true };
}

// ─── Restore ─────────────────────────────────────────────────────────────────

export function restoreBackup(parsed) {
  for (const [name, data] of Object.entries(parsed.players)) {
    if (data.srs != null) {
      localStorage.setItem(srsKey(name), JSON.stringify(data.srs));
    } else {
      localStorage.removeItem(srsKey(name));
    }
    if (data.progression != null) {
      localStorage.setItem(progressionKey(name), JSON.stringify(data.progression));
    } else {
      localStorage.removeItem(progressionKey(name));
    }
    if (data.pendingExp != null) {
      localStorage.setItem(pendingExpKey(name), JSON.stringify(data.pendingExp));
    } else {
      localStorage.removeItem(pendingExpKey(name));
    }
  }
}
