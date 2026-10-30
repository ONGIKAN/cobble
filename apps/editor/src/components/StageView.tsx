import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { compileProject } from '@cobble/blocks';
import { sendRun, setPlayerFrame } from '../bridge';
import { ProjectFileButtons } from './ProjectFileButtons';
import { StageSettings } from './StageSettings';
import { useEditorStore } from '../store';
import { useCoarsePointer } from '../useCompact';

const PLAYER_SRC = `${import.meta.env.BASE_URL}player.html`;

const DPAD_KEYS = ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'] as const;

interface Props {
  compact?: boolean;
}

export function StageView({ compact = false }: Props) {
  const { t } = useTranslation();
  const project = useEditorStore((state) => state.project);
  const running = useEditorStore((state) => state.running);
  const setRunning = useEditorStore((state) => state.setRunning);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const coarse = useCoarsePointer();

  const run = useCallback(() => {
    const state = useEditorStore.getState();
    sendRun(compileProject(state.project, state.workspaces));
    setRunning(true);
  }, [setRunning]);

  useEffect(() => {
    setPlayerFrame(iframeRef.current);
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as { type?: string } | null;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'ready') {
        setPlayerReady(true);
        run();
      } else if (data.type === 'stopped') {
        useEditorStore.getState().setRunning(false);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      setPlayerFrame(null);
    };
  }, [run]);

  /** 触屏方向键：把按键事件直接派发进 iframe，与键盘输入走同一条适配路径 */
  const dispatchKey = (key: string, type: 'keydown' | 'keyup'): void => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    // 运行时按 event.code 记录按键，合成事件必须同时带上 code
    const code = key === 'Space' ? 'Space' : key;
    const eventKey = key === 'Space' ? ' ' : key;
    try {
      win.dispatchEvent(new KeyboardEvent(type, { key: eventKey, code, bubbles: true }));
    } catch {
      // 跨窗口派发失败时忽略（例如 iframe 尚未加载完成）
    }
  };

  const pressKey = (key: string) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // 合成触摸事件没有真实 pointerId，捕获失败时忽略
    }
    dispatchKey(key, 'keydown');
  };

  const releaseKey = (key: string) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    dispatchKey(key, 'keyup');
  };

  return (
    <section className={`stage-zone${compact ? ' is-compact' : ''}`}>
      <div className="panel-head">
        <span className="panel-label">{t('panels.stage')}</span>
        <span className={`badge${running ? ' badge-live' : ''}`}>
          {running ? t('stage.running') : t('stage.idle')}
        </span>
        <span className="panel-meta mono">
          {t('stage.size', { w: project.stage.width, h: project.stage.height })}
        </span>
        <StageSettings />
        {compact && <ProjectFileButtons variant="inline" />}
      </div>
      <div className="stage-body">
        <div className="stage-frame">
          <iframe ref={iframeRef} className="stage-iframe" data-testid="stage-iframe" src={PLAYER_SRC} title={t('panels.stage')} />
          {!playerReady && <div className="stage-loading">{t('stage.loading')}</div>}
        </div>
        {coarse && (
          <div className="dpad" data-testid="dpad">
          {DPAD_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className={`dpad-btn dpad-${key.replace('Arrow', '').toLowerCase()}`}
              aria-label={t(`keys.${key}`)}
              data-testid={`dpad-${key.replace('Arrow', '').toLowerCase()}`}
              onPointerDown={pressKey(key)}
              onPointerUp={releaseKey(key)}
              onPointerCancel={releaseKey(key)}
              onLostPointerCapture={releaseKey(key)}
              onContextMenu={(event) => event.preventDefault()}
            >
              {key === 'ArrowUp' ? '▲' : key === 'ArrowDown' ? '▼' : key === 'ArrowLeft' ? '◀' : '▶'}
            </button>
          ))}
          </div>
        )}
      </div>
    </section>
  );
}
