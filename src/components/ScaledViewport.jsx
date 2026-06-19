/**
 * ScaledViewport — renders the app at a fixed design size then scales it
 * uniformly to fill the available screen, preserving aspect ratio.
 *
 * Why this beats breakpoints for a fixed-layout game UI:
 *   • Every font, padding, absolute position, and animation scales together
 *   • No per-screen refactor needed
 *   • On iPad the app looks exactly like a larger version of the phone view
 *
 * Letterbox bars (lab-bg colour) appear on whichever axis isn't the
 * scale constraint — typically the sides on a portrait tablet.
 *
 * CSS transform quirk (working in our favour):
 *   When a positioned ancestor has a non-identity transform, any
 *   `position: fixed` children are positioned relative to THAT ancestor,
 *   not the viewport. So overlays (wrong-pulse, level-up banner, etc.)
 *   stay inside the scaled app area and don't bleed into the bars.
 *
 * ─── Tuning ───────────────────────────────────────────────────────────
 * Adjust DESIGN_W / DESIGN_H to match the "canonical" size you design at.
 * Current values = iPhone 14 Pro Max (430 × 932 CSS px).
 */

import { useState, useEffect } from 'react';

const DESIGN_W    = 560;
const DESIGN_H    = 932;
const EXTRA_TOP   = 10; // px of extra breathing room above scaled content

/**
 * Read the iOS safe-area-inset-top via the --sat CSS variable we set in
 * index.css. Returns 0 in non-PWA contexts (where the env() resolves to 0).
 */
function getSafeAreaTop() {
  try {
    return parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--sat')
    ) || 0;
  } catch {
    return 0;
  }
}

function getTopPad() {
  // Use whichever is larger: the device safe area or our minimum breathing room.
  return Math.max(getSafeAreaTop(), EXTRA_TOP);
}

function getViewportSize() {
  // visualViewport excludes browser chrome (iOS address bar, bottom toolbar).
  // Falls back to innerWidth/innerHeight on older browsers.
  const vv = window.visualViewport;
  return {
    w: vv ? vv.width  : window.innerWidth,
    // Subtract top padding so the scale calculation matches the available space.
    h: (vv ? vv.height : window.innerHeight) - getTopPad(),
  };
}

function getScale() {
  const { w, h } = getViewportSize();
  return Math.min(w / DESIGN_W, h / DESIGN_H);
}

export default function ScaledViewport({ children }) {
  const [scale,  setScale]  = useState(getScale);
  const [topPad, setTopPad] = useState(getTopPad);

  useEffect(() => {
    function onResize() {
      setTopPad(getTopPad());
      setScale(getScale());
    }
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    /*
     * Outer shell: full viewport, lab-bg fill so letterbox bars match
     * the app background, flex-centred so the inner box sits in the middle.
     * paddingTop reserves space for the iOS status bar (PWA mode) + extra room.
     */
    <div
      style={{
        width:           '100vw',
        height:          '100dvh',
        paddingTop:      topPad,
        background:      '#0f1923',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        overflow:        'hidden',
        boxSizing:       'border-box',
      }}
    >
      {/*
       * Inner shell: exactly the design size, scaled uniformly.
       * flexShrink:0 prevents flex from squeezing it before the transform.
       */}
      <div
        style={{
          width:           DESIGN_W,
          height:          DESIGN_H,
          transform:       `scale(${scale})`,
          transformOrigin: 'center center',
          overflow:        'hidden',
          flexShrink:      0,
          position:        'relative',
        }}
      >
        {children}
      </div>
    </div>
  );
}
