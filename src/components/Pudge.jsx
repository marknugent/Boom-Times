/**
 * Pudge character display — individual PNGs per state.
 *
 * Each image is ~497-499 × 299-369 px (landscape). We fix the width and let
 * height scale automatically so every pose renders at its natural proportions.
 *
 * Props:
 *   state  {string}           — PUDGE constant
 *   size   {'sm'|'md'|'lg'}  — display width in px
 */
import { PUDGE } from '../pudge.js';

const SPRITE = {
  [PUDGE.IDLE]:       '/idle.png',
  [PUDGE.SUSPICIOUS]: '/suspicious.png',
  [PUDGE.IMPRESSED]:  '/reluctantly_impressed.png',
  [PUDGE.DISGUSTED]:  '/disgusted.png',
  [PUDGE.HINT]:       '/hint_mode.png',
  [PUDGE.ASLEEP]:     '/asleep.png',
};

const SIZE_PX = { sm: 200, md: 360, lg: 420 };

export default function Pudge({ state = PUDGE.IDLE, size = 'md', widthPx }) {
  const px  = widthPx ?? SIZE_PX[size] ?? SIZE_PX.md;
  const src = SPRITE[state] ?? SPRITE[PUDGE.IDLE];

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      draggable="false"
      className={[
        'select-none object-contain',
        state === PUDGE.ASLEEP || state === PUDGE.IDLE ? 'animate-float' : '',
      ].join(' ')}
      style={{ width: px, height: 'auto' }}
    />
  );
}
