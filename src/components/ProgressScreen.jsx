/**
 * Progress screen — 12-table grid showing locked / in-progress / mastered status.
 * A segmented control at the top lets you browse any player's stats without
 * affecting the active game session.
 */
import { useState, useMemo, useEffect, useRef } from 'react';
import { A } from '../gameReducer.js';
import { TABLE_GROUPS, loadProgression } from '../progression.js';
import { getFactIdsForTable, isFactMastered, loadSRSState } from '../srs.js';
import { VISIBLE_PLAYERS, TEST_PLAYER } from '../players.js';
import { getLevelFromPct } from '../levels.js';
import { downloadBackup, validateBackup, restoreBackup } from '../backup.js';
import { getCorrectStats } from '../playStats.js';
import { APP_VERSION } from 'virtual:build-info';

// All 12 table numbers in display order
const ALL_TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function getTableStatus(tableNum, progression, srsState) {
  const { unlockedGroupIndex } = progression;
  const groupIdx = TABLE_GROUPS.findIndex(g => g.includes(tableNum));

  if (groupIdx > unlockedGroupIndex) return 'locked';

  // Check mastery: all 12 facts for this table meet mastery threshold
  const factIds = getFactIdsForTable(tableNum);
  const masteredCount = factIds.filter(id => {
    const rec = srsState[id];
    return rec && isFactMastered(rec);
  }).length;

  return masteredCount === 12 ? 'mastered' : 'active';
}

// Rounds-completed stats are derived from roundHistory (each entry is one
// completed round = one payoff screen fired), scoped to rounds completed on
// or after this feature's ship date. Excludes older history — including
// dev/test rounds played before this existed — so the counters start clean
// instead of silently folding in noise.
//
// Correct-answer counts come from playStats.js instead of roundHistory —
// see that file for why: a round's completion timestamp doesn't reflect
// when its answers were actually submitted, since round-persistence lets a
// round resume across days.
const STATS_START = new Date('2026-07-15T00:00:00').getTime();

function getRoundStats(roundHistory) {
  const now = new Date();
  const todayY = now.getFullYear(), todayM = now.getMonth(), todayD = now.getDate();

  let roundsToday = 0, roundsTotal = 0;

  roundHistory.forEach(r => {
    if (r.timestamp < STATS_START) return;
    roundsTotal += 1;

    const d = new Date(r.timestamp);
    if (d.getFullYear() === todayY && d.getMonth() === todayM && d.getDate() === todayD) {
      roundsToday += 1;
    }
  });

  return { roundsToday, roundsTotal };
}

function getConfidencePct(tableNum, progression, srsState) {
  const { introducedFacts } = progression;
  const factIds = getFactIdsForTable(tableNum);
  const introduced = factIds.filter(id => introducedFacts.includes(id));

  if (introduced.length === 0) return 0;

  const mastered = introduced.filter(id => {
    const rec = srsState[id];
    return rec && isFactMastered(rec);
  }).length;

  return Math.round((mastered / factIds.length) * 100);
}

function TableCell({ tableNum, status, confidence }) {
  const isLocked   = status === 'locked';
  const isMastered = status === 'mastered';
  const isActive   = status === 'active';

  return (
    <div
      className={[
        'lab-panel flex flex-col items-center justify-center gap-1',
        'aspect-square rounded-2xl p-2 relative',
        isLocked   ? 'opacity-40' : '',
        isMastered ? 'border-yellow-400/60' : '',
        isActive   ? 'border-lab-green/40'  : '',
      ].join(' ')}
    >
      {/* Table number */}
      <span className="font-display text-xl text-lab-chalk leading-none">
        {tableNum}s
      </span>

      {/* Status icon */}
      {isLocked   && <span className="text-lg">🔒</span>}
      {isMastered && <span className="text-lg">⭐</span>}
      {isActive   && (
        <div className="flex flex-col items-center gap-0.5 w-full">
          {/* Mini progress bar */}
          <div className="w-full h-1.5 bg-lab-border rounded-full overflow-hidden">
            <div
              className="h-full bg-lab-green/70 rounded-full transition-all duration-500"
              style={{ width: `${confidence}%` }}
            />
          </div>
          <span className="font-body text-[10px] text-lab-green/70">
            {confidence}%
          </span>
        </div>
      )}
    </div>
  );
}

export default function ProgressScreen({ state, dispatch, onTestUserViewChange }) {
  const { currentPlayer } = state;

  // Which player's stats are being viewed (defaults to the active player,
  // or the first in the list if the active player is the test profile)
  const defaultViewed = VISIBLE_PLAYERS.includes(currentPlayer) ? currentPlayer : VISIBLE_PLAYERS[0];
  const [viewedPlayer, setViewedPlayer] = useState(defaultViewed);

  // Backup / restore state
  const fileInputRef    = useRef(null);
  const [confirmBackup, setConfirmBackup] = useState(null);  // parsed JSON pending confirmation
  const [importError,   setImportError]   = useState(null);

  function handleFileChange(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const { ok, error } = validateBackup(parsed);
        if (!ok) { setImportError(error); return; }
        setConfirmBackup(parsed);
      } catch {
        setImportError('Could not read the file — make sure it is a valid .json backup.');
      }
    };
    reader.readAsText(file);
  }

  function handleRestoreConfirm() {
    restoreBackup(confirmBackup);
    window.location.reload();
  }

  // Always start un-armed — only the explicit "Test User" tap arms dev mode.
  useEffect(() => { onTestUserViewChange?.(false); }, []);

  // Load viewed player's data fresh from localStorage each time they switch.
  // localStorage is always in sync (every answer + round-end saves immediately).
  const viewedSrsState   = useMemo(() => loadSRSState(viewedPlayer),   [viewedPlayer]);
  const viewedProgression = useMemo(() => loadProgression(viewedPlayer), [viewedPlayer]);

  // Overall mastery: percentage of all 144 facts mastered
  const totalFacts    = 144;
  const masteredCount = Object.values(viewedSrsState)
    .filter(rec => isFactMastered(rec))
    .length;
  const overallPct    = Math.round((masteredCount / totalFacts) * 100);
  const currentLevel  = getLevelFromPct(overallPct);

  // Current active group label
  const { unlockedGroupIndex } = viewedProgression;
  const currentGroupTables = unlockedGroupIndex < TABLE_GROUPS.length
    ? TABLE_GROUPS[unlockedGroupIndex]
    : null;

  // Rounds completed (payoff screens fired) + correct answers submitted,
  // today and cumulative — two independent signals since a round's
  // completion day and its answers' submission days can differ.
  const roundStats   = getRoundStats(viewedProgression.roundHistory);
  const correctStats = getCorrectStats(viewedPlayer);

  return (
    <div className="w-full h-full flex flex-col px-4 py-4 gap-4 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <button
          className="btn-secondary text-sm py-2 px-3"
          onClick={() => dispatch({ type: A.NAVIGATE, screen: 'home' })}
        >
          ← Back
        </button>
        <h2 className="font-display text-xl text-lab-chalk">Progress 📊</h2>
        <div className="w-16" /> {/* spacer */}
      </div>

      {/* Player selector — segmented control OR "Test User" heading */}
      {viewedPlayer === TEST_PLAYER ? (
        <div className="flex items-center gap-3 shrink-0">
          <button
            className="font-body text-xs text-lab-chalk/40 hover:text-lab-chalk/70 transition-colors"
            onClick={() => { setViewedPlayer(defaultViewed); onTestUserViewChange?.(false); }}
          >
            ← kids
          </button>
          <span className="font-display text-base text-lab-chalk/70 tracking-widest uppercase flex-1 text-center">
            Test User
          </span>
          {/* spacer to balance the back link */}
          <div className="w-10" />
        </div>
      ) : (
        <div className="flex gap-1 bg-lab-border/20 rounded-xl p-1 shrink-0">
          {VISIBLE_PLAYERS.map(name => (
            <button
              key={name}
              className={[
                'flex-1 py-1.5 rounded-lg font-body text-sm transition-colors duration-150',
                viewedPlayer === name
                  ? 'bg-lab-panel text-lab-chalk border border-lab-green/25 shadow-sm'
                  : 'text-lab-chalk/40 hover:text-lab-chalk/60',
              ].join(' ')}
              onClick={() => setViewedPlayer(name)}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Level badge */}
      <div className="lab-panel px-4 py-3 flex items-center gap-3 shrink-0">
        <span style={{ fontSize: '2rem', lineHeight: 1 }}>{currentLevel.emoji}</span>
        <div>
          <div className="font-body text-xs text-lab-chalk/40 uppercase tracking-widest leading-none mb-0.5">
            Level {currentLevel.level}
          </div>
          <div className="font-display text-base text-lab-chalk leading-tight">
            {currentLevel.name}
          </div>
        </div>
      </div>

      {/* Play stats — rounds completed & correct answers submitted, today + cumulative */}
      <div className="lab-panel px-4 py-3 shrink-0">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <div className="font-display text-3xl text-lab-green">{roundStats.roundsToday}</div>
            <div className="font-body text-[10px] text-lab-chalk/40 uppercase tracking-widest mt-0.5">
              Rounds Today
            </div>
          </div>
          <div>
            <div className="font-display text-3xl text-lab-green">{correctStats.correctToday}</div>
            <div className="font-body text-[10px] text-lab-chalk/40 uppercase tracking-widest mt-0.5">
              Correct Today
            </div>
          </div>
        </div>
        <div className="text-xs text-lab-chalk/40 font-body text-center mt-3 pt-2 border-t border-lab-border/30">
          All-time: {roundStats.roundsTotal} rounds · {correctStats.correctTotal} correct
        </div>
      </div>

      {/* Overall progress */}
      <div className="lab-panel px-4 py-3 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="font-body text-sm text-lab-chalk/70">Overall mastery</span>
          <span className="font-display text-lg text-lab-green">{overallPct}%</span>
        </div>
        <div className="w-full h-2 bg-lab-border rounded-full overflow-hidden">
          <div
            className="h-full bg-lab-green rounded-full transition-all duration-700"
            style={{ width: `${overallPct}%` }}
          />
        </div>
        <p className="text-xs text-lab-chalk/40 mt-1 text-right">
          {masteredCount} / {totalFacts} facts mastered
        </p>
      </div>

      {/* Currently active group */}
      {currentGroupTables && (
        <div className="text-xs text-lab-chalk/40 font-body text-center shrink-0">
          Currently working on: {currentGroupTables.map(t => `${t}s`).join(' & ')} tables
        </div>
      )}

      {/* 12-table grid */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="grid grid-cols-4 gap-2">
          {ALL_TABLES.map(tableNum => {
            const status     = getTableStatus(tableNum, viewedProgression, viewedSrsState);
            const confidence = status === 'active'
              ? getConfidencePct(tableNum, viewedProgression, viewedSrsState)
              : status === 'mastered' ? 100 : 0;

            return (
              <TableCell
                key={tableNum}
                tableNum={tableNum}
                status={status}
                confidence={confidence}
              />
            );
          })}
        </div>
      </div>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Test User link — arms dev-mode triple-tap; only shown when viewing kids */}
      {viewedPlayer !== TEST_PLAYER && !confirmBackup && !importError && (
        <button
          className="font-body text-xs text-lab-chalk/25 hover:text-lab-chalk/50 transition-colors shrink-0 py-1 text-center"
          onClick={() => { setViewedPlayer(TEST_PLAYER); onTestUserViewChange?.(true); }}
        >
          Test User
        </button>
      )}

      {/* ── Backup / restore ── */}
      {confirmBackup ? (
        /* Confirmation panel */
        <div className="lab-panel px-4 py-3 shrink-0 flex flex-col gap-2">
          <p className="font-body text-xs text-lab-chalk/70 text-center leading-snug">
            Replace all progress with backup from{' '}
            <span className="text-lab-chalk">
              {new Date(confirmBackup.exportedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
            ?{' '}
            <span className="text-red-400">This cannot be undone.</span>
          </p>
          <div className="flex gap-2">
            <button
              className="flex-1 font-body text-xs py-2 rounded-lg bg-red-700/60 hover:bg-red-700 text-white transition-colors"
              onClick={handleRestoreConfirm}
            >
              Yes, restore
            </button>
            <button
              className="flex-1 font-body text-xs py-2 rounded-lg bg-lab-border/30 hover:bg-lab-border/50 text-lab-chalk/60 transition-colors"
              onClick={() => setConfirmBackup(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : importError ? (
        /* Error panel */
        <div className="lab-panel px-4 py-3 shrink-0 flex flex-col gap-2">
          <p className="font-body text-xs text-red-400 text-center leading-snug">{importError}</p>
          <button
            className="font-body text-xs text-lab-chalk/40 hover:text-lab-chalk/70 transition-colors text-center"
            onClick={() => setImportError(null)}
          >
            Dismiss
          </button>
        </div>
      ) : (
        /* Export / restore buttons */
        <div className="flex gap-3 justify-center shrink-0">
          <button
            className="font-body text-xs text-lab-chalk/25 hover:text-lab-chalk/50 transition-colors py-1"
            onClick={() => downloadBackup(APP_VERSION)}
          >
            Export Progress (All Players)
          </button>
          <span className="text-lab-chalk/15 text-xs self-center">·</span>
          <button
            className="font-body text-xs text-lab-chalk/25 hover:text-lab-chalk/50 transition-colors py-1"
            onClick={() => { setImportError(null); fileInputRef.current?.click(); }}
          >
            Restore Progress
          </button>
        </div>
      )}

    </div>
  );
}
