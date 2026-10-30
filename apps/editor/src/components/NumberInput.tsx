import { useEffect, useState } from 'react';

interface NumberInputProps {
  value: number;
  onCommit: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  ariaLabel?: string;
  testId?: string;
}

function clamp(value: number, min?: number, max?: number): number {
  let next = value;
  if (typeof min === 'number') next = Math.max(min, next);
  if (typeof max === 'number') next = Math.min(max, next);
  return next;
}

/**
 * 数字输入框：编辑期间保留原始文本，允许清空/只输入负号，
 * 避免受控 number 输入把空串变成 0 导致「输入 100 变成 0100」。
 */
export function NumberInput({ value, onCommit, min, max, step, className, ariaLabel, testId }: NumberInputProps) {
  const [draft, setDraft] = useState<string>(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);

  const commit = (): void => {
    const text = draft.trim();
    if (text === '' || text === '-' || text === '.') {
      setDraft(String(value));
      return;
    }
    const parsed = Number(text);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    const next = clamp(parsed, min, max);
    setDraft(String(next));
    if (next !== value) onCommit(next);
  };

  return (
    <input
      className={className}
      type="number"
      inputMode="decimal"
      step={step}
      aria-label={ariaLabel}
      data-testid={testId}
      value={draft}
      onFocus={(event) => {
        setFocused(true);
        event.currentTarget.select();
      }}
      onBlur={() => {
        setFocused(false);
        commit();
      }}
      onChange={(event) => {
        const text = event.target.value;
        setDraft(text);
        if (text.trim() === '' || text === '-' || text === '.') return;
        const parsed = Number(text);
        if (Number.isFinite(parsed)) onCommit(clamp(parsed, min, max));
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur();
        }
      }}
    />
  );
}
