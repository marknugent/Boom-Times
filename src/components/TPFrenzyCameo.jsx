/**
 * TPFrenzyCameo — "TP FRENZY!" bonus screen, the one cameo you play: swipe
 * down on a toilet roll as fast as you can for ten seconds and see how many
 * feet come off. Emptied rolls are replaced on the spot, the paper heaps up
 * on the floor, and the total goes on a shared record list.
 *
 * The clock always runs its full length whether or not anyone is swiping —
 * nobody's turn gets cut short for being slow to start.
 *
 * All the rules live in tpFrenzySim.js; this component owns input, the
 * requestAnimationFrame loop, sound, and drawing (one SVG at the app's fixed
 * 560 × 932 design size, so sim coordinates are drawing coordinates). Same
 * ref-driven shape as the mini-games: mutate refs in the loop and force a
 * re-render with a cheap `bump()`.
 *
 * Props:
 *   onDismiss:  () => void — called once the result has been shown
 *   playerName: string — whose total this is, for the record list
 */
import { useEffect, useRef, useState } from 'react';
import {
  ROUND_SECONDS, ROLL_CX, ROLL_CY, ROLL_W, ROLL_R_EMPTY, GRAB_ZONE, SHEET_PX,
  createGame, stepGame, pull, inGrabZone, feetUnrolled, rollRadius,
} from '../tpFrenzySim.js';
import {
  playSound, stopSound, playLaserCatch, playTpTick, playTpNewRoll,
  startTpFrenzyMusic, stopTpFrenzyMusic,
} from '../sounds.js';
import { createLeaderboard } from '../leaderboard.js';
import { TEST_PLAYER } from '../players.js';

const { loadLeaderboard, addScore } = createLeaderboard('pudge_tp_scores_v1');

const VIEW_W = 560;
const VIEW_H = 932;

const INTRO_SECONDS = 1.8;  // read the instructions; the clock hasn't started
const RESULT_MS     = 4200; // admire the total before the next question
const MAX_FRAME_DT  = 0.05;

const FLOOR_Y       = 842;
const TAIL_PX       = 110;  // paper already hanging before the first swipe
const END_SQUASH    = 0.2;  // how much of the roll's end face we see
const TOP_SPEED     = 4500; // matches the sim's cap; used to pitch the ticks
const TICK_GAP_S    = 0.04;

const DROP_SECONDS  = 0.32; // a fresh roll falling onto the holder
const TUBE_SECONDS  = 0.75; // the empty tube tumbling away
const HOP_SECONDS   = 0.35; // Pudge's little jump at each milestone
const MISS_SECONDS  = 0.45; // the swipe zone flashing after a touch outside it

// The heap of paper on the floor: one big billowing fold per FOLD_PX
// unrolled, each about as wide as the paper coming off the roll (anything
// narrower reads as confetti next to it). Folds drop into a few broad columns
// so the heap mounds up in the middle, and it sits a little right of the roll
// so it only ever covers Pudge's near side.
//
// The folds are drawn to merge into one soft mound rather than a stack of
// separate objects: every fold's outline goes down first and every fill on
// top, so only the heap's outer edge gets a firm line, and each fold shows
// just a pale crease along its top.
const FOLD_PX       = 560;
const MAX_FOLDS     = 56;
const PILE_COLS     = 5;
const PILE_COL_W    = 44;
const PILE_CX       = ROLL_CX + 22;
const PILE_MAX_H    = 280; // a column this tall sends new folds to the lowest one instead

const PUDGE = { x: 2, w: 156, h: 172 }; // sits on the floor at the left

function displayName(name) { return name === TEST_PLAYER ? 'TEST' : name; }

function addPileFold(pile) {
  // Two dice make the middle columns likelier than the edges.
  let col = Math.floor((Math.random() + Math.random()) / 2 * PILE_COLS);
  if (pile.heights[col] > PILE_MAX_H) col = pile.heights.indexOf(Math.min(...pile.heights));

  const w = ROLL_W * (0.42 + Math.random() * 0.14); // half-width: the paper's own width, give or take
  const h = 40 + Math.random() * 22;
  // Lopsided on purpose — identical domes look like a stack of hats.
  const leanL = 0.7 + Math.random() * 0.5;
  const leanR = 0.7 + Math.random() * 0.5;
  const top = `M ${-w} 0 C ${-w * leanL} ${-h * 1.3} ${w * leanR} ${-h * 1.3} ${w} 0`;
  pile.folds.push({
    x: PILE_CX + (col - (PILE_COLS - 1) / 2) * PILE_COL_W + (Math.random() - 0.5) * 26,
    y: FLOOR_Y - pile.heights[col] + 2,
    rot: (Math.random() - 0.5) * 26,
    top, // the crease along its upper edge
    outline: `${top} C ${w * 0.5} ${h * 0.2} ${-w * 0.5} ${h * 0.2} ${-w} 0 Z`,
    // Some folds show a perforation running over them.
    seam: Math.random() < 0.4 ? `M ${-w * 0.8} ${-h * 0.3} Q 0 ${-h * 1.02} ${w * 0.8} ${-h * 0.3}` : null,
    shade: Math.random() < 0.5 ? '#ffffff' : '#f1f5f9',
  });
  pile.heights[col] += 9;
  if (col > 0) pile.heights[col - 1] += 4;
  if (col < PILE_COLS - 1) pile.heights[col + 1] += 4;
}

export default function TPFrenzyCameo({ onDismiss, playerName }) {
  const gameRef  = useRef(null);
  const rootRef  = useRef(null);
  const viewRef  = useRef({
    clock: 0,              // seconds since mount, for animation
    started: false,        // intro over, clock running
    pulled: false,         // anyone swiped yet? (hides the hint)
    fingers: new Map(),    // pointerId → last y, for fingers that started in the zone
    lastTickAt: -1,
    dropAt: -10,           // when the current roll dropped in
    hopAt: -10,
    missAt: -10,
    tubes: [],             // { born } — empty tubes tumbling away
    floats: [],            // { id, text, until }
    nextId: 1,
    pile: { folds: [], heights: new Array(PILE_COLS).fill(0) },
  });
  const finishedRef = useRef(false);
  const [, setTick] = useState(0);
  const [result, setResult] = useState(null); // { feet, rolls, isRecord, record } | null

  if (!gameRef.current) gameRef.current = createGame();
  const bump = () => setTick((t) => t + 1);

  function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    stopTpFrenzyMusic();
    playSound('toilet-attack', { fadeStartMs: 2800, fadeDurationMs: 1000 });

    const g = gameRef.current;
    const feet = feetUnrolled(g);
    // A round nobody touched doesn't go on the list.
    const { leaderboard, rank } = feet > 0
      ? addScore(playerName, feet)
      : { leaderboard: loadLeaderboard(), rank: null };
    setResult({ feet, rolls: g.rolls, isRecord: rank === 1, record: leaderboard[0] ?? null });
  }

  useEffect(() => () => {
    stopTpFrenzyMusic();
    stopSound('toilet-attack');
  }, []);

  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(onDismiss, RESULT_MS);
    return () => clearTimeout(timer);
  }, [result]);

  useEffect(() => {
    let raf;
    let last = performance.now();

    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.max(0, Math.min(MAX_FRAME_DT, (now - last) / 1000));
      last = now;

      const g = gameRef.current;
      const v = viewRef.current;
      v.clock += dt;

      if (!v.started && v.clock >= INTRO_SECONDS) {
        v.started = true;
        startTpFrenzyMusic();
      }

      if (v.started && !g.over) {
        for (const ev of stepGame(g, dt)) {
          if (ev.type === 'sheet') {
            if (v.clock - v.lastTickAt >= TICK_GAP_S) {
              v.lastTickAt = v.clock;
              playTpTick(g.speed / TOP_SPEED);
            }
          } else if (ev.type === 'newRoll') {
            playTpNewRoll();
            v.dropAt = v.clock;
            v.hopAt  = v.clock;
            v.tubes.push({ born: v.clock });
            v.floats.push({ id: v.nextId++, text: 'NEW ROLL!', until: v.clock + 0.8 });
          } else if (ev.type === 'milestone') {
            playLaserCatch(ev.feet / 50);
            v.hopAt = v.clock;
            v.floats.push({ id: v.nextId++, text: `${ev.feet} FEET!`, until: v.clock + 0.8 });
          }
        }
        if (g.pulledPx > 0) v.pulled = true;

        // The first fold lands as the tail of the paper reaches the floor.
        const onFloorPx = g.pulledPx - (FLOOR_Y - ROLL_CY - TAIL_PX);
        const wanted = onFloorPx < 0 ? 0 : Math.min(MAX_FOLDS, 1 + Math.floor(onFloorPx / FOLD_PX));
        while (v.pile.folds.length < wanted) addPileFold(v.pile);

        if (g.over) finish();
      }

      v.tubes  = v.tubes.filter((tube) => v.clock - tube.born < TUBE_SECONDS);
      v.floats = v.floats.filter((f) => v.clock < f.until);
      bump();
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  // The whole app is CSS-scaled by ScaledViewport, so map screen pixels back
  // to design pixels through this overlay's on-screen rect.
  function toDesign(e) {
    const rect = rootRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (VIEW_W / rect.width),
      y: (e.clientY - rect.top) * (VIEW_H / rect.height),
    };
  }

  function onPointerDown(e) {
    e.preventDefault();
    const v = viewRef.current;
    if (!v.started || gameRef.current.over) return;
    const pt = toDesign(e);
    if (inGrabZone(pt.x, pt.y)) v.fingers.set(e.pointerId, pt.y);
    else v.missAt = v.clock;
  }

  function onPointerMove(e) {
    const v = viewRef.current;
    if (!v.fingers.has(e.pointerId)) return;
    const { y } = toDesign(e);
    pull(gameRef.current, y - v.fingers.get(e.pointerId));
    v.fingers.set(e.pointerId, y);
  }

  function onPointerEnd(e) {
    viewRef.current.fingers.delete(e.pointerId);
  }

  const g = gameRef.current;
  const v = viewRef.current;
  const feet = feetUnrolled(g);
  const secondsLeft = Math.max(0, Math.ceil(ROUND_SECONDS - g.t));
  const playing = v.started && !g.over;

  // ── Roll geometry ────────────────────────────────────────────────────
  const R = rollRadius(g);
  const left  = ROLL_CX - ROLL_W / 2;
  const right = ROLL_CX + ROLL_W / 2;
  const dropAge = v.clock - v.dropAt;
  const dropY = dropAge < DROP_SECONDS ? -Math.pow(1 - dropAge / DROP_SECONDS, 2) * 250 : 0;

  // Perforations. The paper leaves the roll at its front, level with the
  // axle: below that line seams ride the hanging sheet, above it they come
  // round the roll's face toward us.
  const seamOffset = g.pulledPx % SHEET_PX;
  const sheetLen = Math.min(FLOOR_Y - ROLL_CY, TAIL_PX + g.pulledPx);
  const sheetSeams = [];
  for (let s = seamOffset; s < sheetLen - 4; s += SHEET_PX) sheetSeams.push(ROLL_CY + s);
  const rollSeams = [];
  for (let a = SHEET_PX - seamOffset; a < R * Math.PI / 2; a += SHEET_PX) rollSeams.push(ROLL_CY - R * Math.sin(a / R));

  const blur = Math.min(1, g.speed / 2200); // fast paper: fainter seams, a little shake
  const shake = playing ? Math.sin(v.clock * 46) * 2.5 * blur : 0;
  const spin = (g.pulledPx / R) * 180 / Math.PI;

  const hopAge = v.clock - v.hopAt;
  const hop = hopAge < HOP_SECONDS ? -Math.sin(hopAge / HOP_SECONDS * Math.PI) * 26 : 0;
  const missAge = v.clock - v.missAt;
  const zoneGlow = missAge < MISS_SECONDS ? 1 - missAge / MISS_SECONDS : 0;
  const hintY = (v.clock * 1.25 % 1) * 150; // the pointing hand sliding down the paper

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[250] overflow-hidden select-none"
      style={{ touchAction: 'none', backgroundColor: '#17324a' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <pattern id="tp-tiles" width="70" height="70" patternUnits="userSpaceOnUse">
            <rect width="70" height="70" fill="#1c3c58" />
            <path d="M70 0 H0 V70" fill="none" stroke="#2a5173" strokeWidth="2" />
          </pattern>
          <linearGradient id="tp-roll" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#cdd6e0" />
            <stop offset="0.3" stopColor="#ffffff" />
            <stop offset="0.6" stopColor="#f1f5f9" />
            <stop offset="1" stopColor="#b8c2ce" />
          </linearGradient>
          <linearGradient id="tp-sheet" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#dfe6ee" />
            <stop offset="0.12" stopColor="#ffffff" />
            <stop offset="0.88" stopColor="#ffffff" />
            <stop offset="1" stopColor="#dfe6ee" />
          </linearGradient>
        </defs>

        {/* Bathroom: tiled wall, darker floor */}
        <rect width={VIEW_W} height={FLOOR_Y} fill="url(#tp-tiles)" />
        <rect y={FLOOR_Y - 14} width={VIEW_W} height={VIEW_H - FLOOR_Y + 14} fill="#10202f" />
        <rect y={FLOOR_Y - 14} width={VIEW_W} height="5" fill="#2a5173" />

        {/* Where a swipe has to start */}
        <rect
          x={GRAB_ZONE.left} y={GRAB_ZONE.top}
          width={GRAB_ZONE.right - GRAB_ZONE.left} height={GRAB_ZONE.bottom - GRAB_ZONE.top}
          rx="36" fill={`rgba(255,255,255,${0.03 + zoneGlow * 0.1})`}
          stroke="#ffffff" strokeOpacity={0.14 + zoneGlow * 0.6} strokeWidth="3" strokeDasharray="14 12"
        />

        {/* Holder: wall plates and the bar through the roll */}
        <rect x={left - 46} y={ROLL_CY - 30} width="20" height="60" rx="7" fill="#7d8ea3" />
        <rect x={right + 30} y={ROLL_CY - 30} width="20" height="60" rx="7" fill="#7d8ea3" />
        <rect x={left - 34} y={ROLL_CY - 6} width={ROLL_W + 72} height="12" rx="6" fill="#a9b7c8" />

        {/* Empty tubes tumbling away */}
        {v.tubes.map((tube) => {
          const age = v.clock - tube.born;
          return (
            <g key={tube.born} transform={`translate(${ROLL_CX + 430 * age} ${ROLL_CY - 420 * age + 1100 * age * age}) rotate(${age * 760})`}>
              <rect x="-42" y="-17" width="84" height="34" rx="8" fill="#b98b5e" stroke="#8a6238" strokeWidth="3" />
              <ellipse cx="38" cy="0" rx="6" ry="13" fill="#5b4632" />
            </g>
          );
        })}

        {/* Roll */}
        <g transform={`translate(0 ${dropY})`}>
          <ellipse cx={left} cy={ROLL_CY} rx={R * END_SQUASH} ry={R} fill="#c3ccd8" />
          <rect x={left} y={ROLL_CY - R} width={ROLL_W} height={R * 2} fill="url(#tp-roll)" />
          {rollSeams.map((y, i) => (
            <line key={i} x1={left + 3} x2={right - 3} y1={y} y2={y} stroke="#b4bfcc" strokeWidth="2" strokeDasharray="7 6" opacity={1 - blur * 0.6} />
          ))}
          <ellipse cx={right} cy={ROLL_CY} rx={R * END_SQUASH} ry={R} fill="#e8edf3" stroke="#b4bfcc" strokeWidth="2" />
          {/* Marks on the end face, so you can see it spin */}
          <g transform={`translate(${right} ${ROLL_CY}) scale(${END_SQUASH} 1) rotate(${spin})`}>
            {[0, 120, 240].map((deg) => (
              <line key={deg} x1={ROLL_R_EMPTY + 3} x2={R - 5} y1="0" y2="0" stroke="#aab6c4" strokeWidth="5" strokeLinecap="round" transform={`rotate(${deg})`} />
            ))}
          </g>
          <ellipse cx={right} cy={ROLL_CY} rx={ROLL_R_EMPTY * END_SQUASH} ry={ROLL_R_EMPTY} fill="#b98b5e" />
          <ellipse cx={right} cy={ROLL_CY} rx={(ROLL_R_EMPTY - 6) * END_SQUASH} ry={ROLL_R_EMPTY - 6} fill="#4a3826" />
        </g>

        {/* Hanging paper */}
        <g transform={`translate(${shake} 0)`}>
          <rect x={left} y={ROLL_CY} width={ROLL_W} height={sheetLen} fill="url(#tp-sheet)" />
          <rect x={left} y={ROLL_CY} width={ROLL_W} height="10" fill="rgba(120,140,165,0.28)" />
          {sheetSeams.map((y, i) => (
            <line key={i} x1={left + 3} x2={right - 3} y1={y} y2={y} stroke="#b4bfcc" strokeWidth="2" strokeDasharray="7 6" opacity={1 - blur * 0.6} />
          ))}
        </g>

        {/* Pudge, watching — he hops at every milestone and slowly gets buried */}
        <image href="/laser-pudge-sit.png" x={PUDGE.x} y={FLOOR_Y - PUDGE.h + 4 + hop} width={PUDGE.w} height={PUDGE.h} />

        {/* The heap */}
        {v.pile.folds.map((fold, i) => (
          <path
            key={i} d={fold.outline}
            transform={`translate(${fold.x} ${fold.y}) rotate(${fold.rot})`}
            fill="#a9b5c3" stroke="#a9b5c3" strokeWidth="6" strokeLinejoin="round"
          />
        ))}
        {v.pile.folds.map((fold, i) => (
          <g key={i} transform={`translate(${fold.x} ${fold.y}) rotate(${fold.rot})`} fill="none">
            <path d={fold.outline} fill={fold.shade} />
            <path d={fold.top} stroke="#c3ccd8" strokeWidth="2.5" strokeLinecap="round" />
            {fold.seam && <path d={fold.seam} stroke="#c3ccd8" strokeWidth="2" strokeDasharray="7 6" />}
          </g>
        ))}
      </svg>

      {/* HUD */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-3 pointer-events-none">
        <div className="flex items-center gap-1.5 bg-lab-panel/80 rounded-full px-3 py-1">
          <span className="text-lg leading-none">⏱️</span>
          <span className={`font-display text-2xl leading-none ${secondsLeft <= 3 && playing ? 'text-red-400' : 'text-lab-chalk'}`}>
            {secondsLeft}s
          </span>
        </div>
        <div className="font-display text-lab-green text-xl">TP FRENZY!</div>
        <div className="flex items-center gap-1 bg-lab-panel/80 rounded-full px-3 py-1">
          <span className="text-lg leading-none">🧻</span>
          <span className="font-display text-2xl leading-none text-lab-chalk">×{g.rolls}</span>
        </div>
      </div>

      <div className="absolute inset-x-0 flex justify-center pointer-events-none" style={{ top: 58 }}>
        {/* Remounted at each milestone so the bump animation replays. */}
        <div
          key={Math.floor(feet / 50)}
          className="font-display text-6xl text-lab-yellow leading-none animate-score-bump"
          style={{ textShadow: '0 3px 0 rgba(0,0,0,0.5)' }}
        >
          {feet} <span className="text-3xl">ft</span>
        </div>
      </div>

      {v.floats.map((f) => (
        <div key={f.id} className="absolute inset-x-0 flex justify-center pointer-events-none" style={{ top: 196 }}>
          <div className="animate-float-up font-display text-3xl text-lab-orange whitespace-nowrap" style={{ textShadow: '0 2px 0 rgba(0,0,0,0.55)' }}>
            {f.text}
          </div>
        </div>
      ))}

      {/* Swipe hint — until the first pull */}
      {playing && !v.pulled && (
        <div
          className="absolute pointer-events-none text-6xl"
          style={{ left: ROLL_CX + 96, top: ROLL_CY - 20 + hintY, opacity: 1 - hintY / 150, transform: 'translateX(-50%)' }}
        >
          👇
        </div>
      )}

      {!v.started && (
        <div className="absolute inset-x-0 flex justify-center pointer-events-none" style={{ top: 420 }}>
          <div className="font-display text-center px-6 py-4 rounded-2xl bg-lab-bg/90 animate-pop-in flex flex-col items-center gap-2 max-w-[420px]">
            <div className="text-4xl text-lab-green">TP FRENZY!</div>
            <div className="font-body text-lg text-lab-chalk">
              Swipe down on the roll as fast as you can!
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="font-display text-center px-7 py-5 rounded-2xl bg-lab-bg/90 animate-pop-in flex flex-col items-center gap-1 min-w-[330px]">
            <div className="text-xl text-lab-chalk">TIME'S UP!</div>
            <div className="text-6xl text-lab-yellow leading-none">{result.feet} <span className="text-3xl">ft</span></div>
            <div className="font-body text-base text-lab-chalk/80">
              of toilet paper{result.rolls > 0 && ` — ${result.rolls} whole roll${result.rolls === 1 ? '' : 's'}!`}
            </div>
            {result.isRecord ? (
              <div className="text-2xl text-lab-green mt-2">🏆 NEW RECORD!</div>
            ) : result.record && (
              <div className="font-body text-base text-lab-chalk/70 mt-2">
                Record: {result.record.score} ft — {displayName(result.record.playerName)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
