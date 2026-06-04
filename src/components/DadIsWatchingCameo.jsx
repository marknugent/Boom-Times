/**
 * DadIsWatchingCameo — big-brother bonus screen.
 *
 * Fades in dadiswatching.png full-screen, slowly zooms 100→110%
 * (a gentle creep rather than a full Ken Burns), then fades out.
 * The image itself reads "DAD IS WATCHING" — no extra headline needed.
 * Auto-dismisses after 4 seconds or on tap.
 *
 * z-stack (all position:fixed):
 *   z=250  the image
 *   z=251  transparent click-catcher
 */
import { useEffect, useRef } from 'react';

const CAMEO_DURATION_MS = 4000;

export default function DadIsWatchingCameo({ onDismiss }) {
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, CAMEO_DURATION_MS);
    return () => clearTimeout(timerRef.current);
  }, []);

  function dismiss() {
    clearTimeout(timerRef.current);
    onDismiss();
  }

  return (
    <>
      {/* ── z=250: Full-screen image with slow zoom ─────────────────── */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex:    250,
          animation: `dad-zoom ${CAMEO_DURATION_MS}ms ease-in-out both`,
        }}
      >
        <img
          src="/dadiswatching.png"
          alt=""
          draggable={false}
          className="w-full h-full object-cover select-none"
        />
      </div>

      {/* ── z=251: Transparent click-catcher ───────────────────────── */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 251 }}
        onPointerDown={dismiss}
      />
    </>
  );
}
