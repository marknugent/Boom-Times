/**
 * SpeechBubble — comic-style bubble with a directional tail.
 *
 * Props:
 *   text      {string}                    — dialogue text
 *   type      {'reaction'|'hint'}         — 'hint' gets pale-yellow lab-note styling
 *   side      {'left'|'right'|'down'}     — which edge the tail appears on:
 *                                           'left'  → tail on left  (Pudge is to the left)
 *                                           'right' → tail on right (Pudge is to the right)
 *                                           'down'  → tail on bottom center (Pudge is below)
 *   onDismiss {function}                  — called when tapped
 *
 * Shadow note:
 *   We use filter:drop-shadow on the wrapper rather than box-shadow on the
 *   body — drop-shadow traces the actual visual shape (bubble + tail triangle),
 *   so the shadow follows the full outline including the tail.
 *
 * Gap note:
 *   CSS border-triangles positioned flush at -10px land exactly on the
 *   bubble's outer border edge, leaving a 1px subpixel gap. Nudging to -9px
 *   overlaps by 1px and closes it cleanly.
 */
export default function SpeechBubble({ text, type = 'reaction', side = 'down', onDismiss }) {
  if (!text) return null;

  const isHint      = type === 'hint';
  const bubbleColor = isHint ? '#fef08a' : 'white';
  const borderStyle = isHint ? '2px solid #d4b800' : '1px solid #e0e0e0';

  return (
    <div
      className="relative cursor-pointer select-none"
      onClick={onDismiss}
      role="button"
      aria-label="Dismiss"
      style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.30))' }}
    >
      {/* Bubble body — no shadow-lg here; drop-shadow on wrapper covers both */}
      <div
        className={[
          'rounded-2xl px-4 py-3',
          'font-body text-lg font-bold leading-snug',
          isHint
            ? 'bg-[#fef08a] text-[#1a1a00]'
            : 'bg-white text-[#1a1a2e]',
        ].join(' ')}
        style={{ border: borderStyle }}
      >
        {isHint && (
          <div className="text-[12px] font-extrabold text-[#b08000] mb-1 tracking-wide uppercase">
            Lab Note
          </div>
        )}
        <span className="font-body italic">{text}</span>
      </div>

      {/* Tails — nudged 1px inside the bubble body to close the subpixel gap */}

      {side === 'left' && (
        <div
          className="absolute top-1/2 -translate-y-1/2 w-0 h-0"
          style={{
            left: -9,
            borderTop:    '8px solid transparent',
            borderBottom: '8px solid transparent',
            borderRight:  `10px solid ${bubbleColor}`,
          }}
        />
      )}

      {side === 'right' && (
        <div
          className="absolute top-1/2 -translate-y-1/2 w-0 h-0"
          style={{
            right: -9,
            borderTop:    '8px solid transparent',
            borderBottom: '8px solid transparent',
            borderLeft:   `10px solid ${bubbleColor}`,
          }}
        />
      )}

      {side === 'down' && (
        <div
          className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
          style={{
            bottom: -9,
            borderLeft:  '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop:   `10px solid ${bubbleColor}`,
          }}
        />
      )}
    </div>
  );
}
