/**
 * HotStreakBanner — non-blocking toast shown on every 3-in-a-row streak.
 *
 * Slides in from the top, holds for ~1.3 s, then fades out.
 * pointer-events:none so the keypad stays fully live during display.
 *
 * Props:
 *   streakCount  {number}    — current streak (3, 6, 9 …)
 *   onDismiss    {() => void}
 */
import { useEffect, useRef } from 'react';

const BANNER_DURATION_MS = 2000;

export default function HotStreakBanner({ streakCount, onDismiss }) {
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, BANNER_DURATION_MS);
    return () => clearTimeout(timerRef.current);
  }, []);

  // 1 fire per 5-in-a-row, capped at 5
  const fireCount = Math.min(Math.floor(streakCount / 5), 5);
  const fires     = '🔥'.repeat(fireCount);
  const isPerfect = streakCount >= 15;

  return (
    <div
      className="fixed inset-x-0 flex justify-center pointer-events-none select-none"
      style={{ top: 56, zIndex: 150, animation: `streak-banner ${BANNER_DURATION_MS}ms ease-out both` }}
    >
      <div
        className="flex flex-col items-center gap-0.5 px-8 py-3 rounded-2xl"
        style={{
          background:  isPerfect
            ? 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)'
            : 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
          boxShadow:   isPerfect
            ? '0 4px 24px rgba(168,85,247,0.60), 0 2px 8px rgba(0,0,0,0.4)'
            : '0 4px 24px rgba(249,115,22,0.55), 0 2px 8px rgba(0,0,0,0.4)',
        }}
      >
        <div className="font-display text-2xl leading-none tracking-wide text-white">
          {streakCount} IN A ROW!
        </div>
        {isPerfect && (
          <div className="font-display text-lg leading-tight text-yellow-300 tracking-widest">
            PERFECT ROUND! ⭐
          </div>
        )}
        <div style={{ fontSize: '1.6rem', lineHeight: 1 }}>
          {fires}
        </div>
      </div>
    </div>
  );
}
