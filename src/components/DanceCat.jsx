/**
 * DanceCat — cycles break1.png … break6.png at ~4.3 fps (≈ 234 ms/frame).
 * At 128 BPM techno that's roughly 2 frames per beat — groovy, not frantic.
 * Used on the Dance Party payoff screen in place of DancingCat.
 */
import { useState, useEffect } from 'react';

export default function DanceCat({ size = 280 }) {
  const [frame, setFrame] = useState(1);

  useEffect(() => {
    // 6 frames (break1–break6), ~234 ms each ≈ 2 frames per beat at 128 BPM
    const id = setInterval(() => setFrame(f => (f % 6) + 1), 234);
    return () => clearInterval(id);
  }, []);

  return (
    <img
      src={`/break${frame}.png`}
      alt=""
      aria-hidden="true"
      draggable="false"
      className="select-none object-contain"
      style={{ width: size, height: 'auto' }}
    />
  );
}
