/**
 * DancingCat — cycles through three dance-frame PNGs in a loop.
 * Each frame is shown for FRAME_MS milliseconds.
 */
import { useState, useEffect } from 'react';

const FRAMES    = ['/dance1.png', '/dance2.png', '/dance3.png'];
const FRAME_MS  = 600;

export default function DancingCat({ size = 140 }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setFrame(f => (f + 1) % FRAMES.length), FRAME_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <img
      src={FRAMES[frame]}
      alt=""
      aria-hidden="true"
      draggable="false"
      className="select-none object-contain"
      style={{ width: size, height: 'auto' }}
    />
  );
}
