import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditorStore } from '../store';
import { BlocksView } from './BlocksView';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * 移动端积木编辑抽屉：从底部弹出，默认约六成屏高，可拖拽/点击把手在
 * 半屏与全屏之间切换；点遮罩或关闭按钮收起。桌面端不使用该组件。
 */
export function MobileBlocksDrawer({ open, onClose }: Props) {
  const { t } = useTranslation();
  const project = useEditorStore((state) => state.project);
  const selectedSpriteId = useEditorStore((state) => state.selectedSpriteId);
  const sprite = project.sprites.find((item) => item.id === selectedSpriteId);
  const [expanded, setExpanded] = useState(false);
  const dragRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) setExpanded(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const toggle = (): void => setExpanded((value) => !value);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    dragRef.current = event.clientY;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (dragRef.current === null) return;
    const delta = event.clientY - dragRef.current;
    if (delta < -32) {
      setExpanded(true);
      dragRef.current = null;
    } else if (delta > 32) {
      setExpanded(false);
      dragRef.current = null;
    }
  };

  const handlePointerEnd = (): void => {
    dragRef.current = null;
  };

  return (
    <>
      <div className="sheet-overlay" data-testid="blocks-drawer-overlay" onPointerDown={onClose} />
      <section
        className={`blocks-sheet${expanded ? ' is-expanded' : ''}`}
        data-testid="blocks-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={t('panels.blocks')}
      >
        <div
          className="sheet-grip"
          data-testid="blocks-drawer-grip"
          role="button"
          tabIndex={0}
          aria-label={expanded ? t('sheet.collapse') : t('sheet.expand')}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onClick={toggle}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') toggle();
          }}
        >
          <span className="sheet-grip-bar" />
        </div>
        <header className="sheet-head">
          <div className="sheet-title">
            <strong>{t('panels.blocks')}</strong>
            {sprite ? <span className="sheet-sprite">{sprite.name}</span> : null}
          </div>
          <button type="button" className="btn ghost sheet-close" data-testid="blocks-drawer-close" onClick={onClose}>
            {t('sheet.close')}
          </button>
        </header>
        <div className="sheet-body">
          <BlocksView />
        </div>
      </section>
    </>
  );
}
