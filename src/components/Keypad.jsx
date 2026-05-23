/**
 * Phone-style numeric keypad.
 * Layout: 1-2-3 / 4-5-6 / 7-8-9 / ← 0 ✓
 * All buttons meet 48px minimum tap target (72px actual in default layout).
 *
 * Props:
 *   onDigit   {(digit: string) => void}
 *   onBack    {() => void}
 *   onConfirm {() => void}
 *   disabled  {boolean}
 */
export default function Keypad({ onDigit, onBack, onConfirm, disabled = false }) {
  const rows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['back', '0', 'confirm'],
  ];

  function handleKey(key) {
    if (disabled) return;
    if (key === 'back') onBack();
    else if (key === 'confirm') onConfirm();
    else onDigit(key);
  }

  return (
    <div className="grid grid-cols-3 gap-2 w-full max-w-[320px]">
      {rows.flat().map((key) => {
        const isBack    = key === 'back';
        const isConfirm = key === 'confirm';
        const isAction  = isBack || isConfirm;

        return (
          <button
            key={key}
            onPointerDown={(e) => {
              e.preventDefault(); // prevent double-fire on touch
              handleKey(key);
            }}
            disabled={disabled}
            aria-label={isBack ? 'Backspace' : isConfirm ? 'Submit answer' : key}
            className={[
              isConfirm
                ? 'keypad-btn-confirm'
                : isAction
                ? 'keypad-btn-action'
                : 'keypad-btn',
              disabled ? 'opacity-40 cursor-not-allowed' : '',
            ].join(' ')}
          >
            {isBack    ? '⌫' : isConfirm ? '✓' : key}
          </button>
        );
      })}
    </div>
  );
}
