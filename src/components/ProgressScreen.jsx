/**
 * Progress screen — 12-table grid showing locked / in-progress / mastered status.
 */
import { A } from '../gameReducer.js';
import { TABLE_GROUPS } from '../progression.js';
import { getFactIdsForTable, isFactMastered } from '../srs.js';

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

export default function ProgressScreen({ state, dispatch }) {
  const { progression, srsState } = state;

  // Overall mastery: percentage of all 144 facts mastered
  const totalFacts   = 144;
  const masteredCount = Object.entries(srsState)
    .filter(([, rec]) => isFactMastered(rec))
    .length;
  const overallPct   = Math.round((masteredCount / totalFacts) * 100);

  // Current active group label
  const { unlockedGroupIndex } = progression;
  const currentGroupTables = unlockedGroupIndex < TABLE_GROUPS.length
    ? TABLE_GROUPS[unlockedGroupIndex]
    : null;

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
        <h2 className="font-display text-xl text-lab-chalk">Blueprint 📊</h2>
        <div className="w-16" /> {/* spacer */}
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
            const status     = getTableStatus(tableNum, progression, srsState);
            const confidence = status === 'active'
              ? getConfidencePct(tableNum, progression, srsState)
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
    </div>
  );
}
