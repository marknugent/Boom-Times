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
 */
export default function SpeechBubble({ text, type = 'reaction', side = 'down', onDismiss }) {
  if (!text) return null;

  const isHint = type === 'hint';
  const bubbleColor = isHint ? '#fef08a' : 'white';
  const borderStyle = isHint ? '2px solid #d4b800' : '1px solid #e0e0e0';

  return (
    <div
      className="relative cursor-pointer select-none"
      onClick={onDismiss}
      role="button"
      aria-label="Dismiss"
    >
      {/* Bubble body */}
      <div
        className={[
          'rounded-2xl px-4 py-3 shadow-lg',
          'font-body text-base font-bold leading-snug',
          isHint
            ? 'bg-[#fef08a] text-[#1a1a00]'
            : 'bg-white text-[#1a1a2e]',
        ].join(' ')}
        style={{ border: borderStyle }}
      >
        {isHint && (
          <div className="text-[10px] font-extrabold text-[#b08000] mb-1 tracking-wide uppercase">
            Lab Note
          </div>
        )}
        <span className="font-body italic">{text}</span>
      </div>

      {/* Tail */}
      {side === 'left' && (
        /* Left edge — Pudge is to the left */
        <div
          className="absolute left-[-10px] top-1/2 -translate-y-1/2 w-0 h-0"
          style={{
            borderTop: '8px solid transparent',
            borderBottom: '8px solid transparent',
            borderRight: `10px solid ${bubbleColor}`,
          }}
        />
      )}
      {side === 'right' && (
        /* Right edge — Pudge is to the right */
        <div
          className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-0 h-0"
          style={{
            borderTop: '8px solid transparent',
            borderBottom: '8px solid transparent',
            borderLeft: `10px solid ${bubbleColor}`,
          }}
        />
      )}
      {side === 'down' && (
        /* Bottom center — Pudge is below */
        <div
          className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
          style={{
            bottom: -10,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: `10px solid ${bubbleColor}`,
          }}
        />
      )}
    </div>
  );
}
