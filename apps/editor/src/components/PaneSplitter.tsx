import { useRef } from 'react';

export type PaneDirection = 'vertical' | 'horizontal';

interface PaneSplitterProps {
  direction: PaneDirection;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  testId?: string;
}

/**
 * 可拖动的小白条：调整左右面板宽度（vertical）或上下区域高度（horizontal）。
 * 使用 pointer capture，触屏/鼠标通用。
 */
export function PaneSplitter({ direction, value, min, max, onChange, testId }: PaneSplitterProps) {
  const drag = useRef<{ start: number; value: number } | null>(null);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0) return;
    event.preventDefault();
    drag.current = {
      start: direction === 'vertical' ? event.clientX : event.clientY,
      value,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // 合成事件没有 pointer capture 时忽略
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!drag.current) return;
    const position = direction === 'vertical' ? event.clientX : event.clientY;
    const delta = position - drag.current.start;
    const next = Math.min(max, Math.max(min, Math.round(drag.current.value + delta)));
    if (next !== value) onChange(next);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!drag.current) return;
    drag.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  };

  return (
    <div
      role="separator"
      aria-orientation={direction === 'vertical' ? 'vertical' : 'horizontal'}
      className={`pane-splitter pane-splitter-${direction}`}
      data-testid={testId}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    />
  );
}
