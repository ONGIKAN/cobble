import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { compileProject } from '@cobble/blocks';
import { sendRun, setPlayerFrame } from '../bridge';
import { ProjectFileButtons } from './ProjectFileButtons';
import { openInputSettings } from '../input-settings';
import { StageSettings } from './StageSettings';
import { useEditorStore } from '../store';
import { useCoarsePointer } from '../useCompact';

const PLAYER_SRC = `${import.meta.env.BASE_URL}player.html`;

const DPAD_KEYS = ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'] as const;

type Rotation = 0 | 90 | -90;

interface Props {
  compact?: boolean;
}

export function StageView({ compact = false }: Props) {
  const { t } = useTranslation();
  const project = useEditorStore((state) => state.project);
  const running = useEditorStore((state) => state.running);
  const setRunning = useEditorStore((state) => state.setRunning);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const stageBodyRef = useRef<HTMLDivElement | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [rotation, setRotation] = useState<Rotation>(0);
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

  /**
   * 全屏时按游戏画幅（横屏/竖屏）适配设备方向：
   * 优先尝试 screen.orientation.lock；锁不住（桌面、iOS）时用 CSS 旋转兜底。
   */
  const syncFullscreen = useCallback(() => {
    const active = Boolean(document.fullscreenElement);
    setFullscreen(active);
    if (!active) {
      setRotation(0);
      const orientation = screen.orientation as ScreenOrientation & { unlock?: () => void };
      try {
        orientation.unlock?.();
      } catch {
        // 浏览器不支持时忽略
      }
      return;
    }
    const gameLandscape = project.stage.width >= project.stage.height;
    const deviceLandscape = window.innerWidth > window.innerHeight;
    const next: Rotation = gameLandscape === deviceLandscape ? 0 : gameLandscape ? 90 : -90;
    setRotation(next);
    try {
      const orientation = screen.orientation as ScreenOrientation & { lock?: (value: string) => Promise<void> };
      if (next !== 0) void orientation.lock?.(gameLandscape ? 'landscape' : 'portrait')?.catch?.(() => undefined);
    } catch {
      // 不支持方向锁时保留 CSS 旋转
    }
  }, [project.stage.width, project.stage.height]);

  useEffect(() => {
    document.addEventListener('fullscreenchange', syncFullscreen);
    window.addEventListener('resize', syncFullscreen);
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen);
      window.removeEventListener('resize', syncFullscreen);
    };
  }, [syncFullscreen]);

  const toggleFullscreen = useCallback(async () => {
    const element = stageBodyRef.current;
    if (!element) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await element.requestFullscreen({ navigationUI: 'hide' });
      }
    } catch {
      // 用户取消或浏览器拒绝时不改变状态
    }
  }, []);

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
        <button
          type="button"
          className="mini-btn stage-fullscreen-btn"
          data-testid="stage-fullscreen"
          onClick={toggleFullscreen}
        >
          {fullscreen ? t('stage.exitFullscreen') : t('stage.fullscreen')}
        </button>
        <StageSettings />
        {compact && <ProjectFileButtons variant="inline" />}
        {compact && (
          <button
            type="button"
            className="mini-btn stage-inputs-btn"
            data-testid="m-input-settings"
            onClick={openInputSettings}
          >
            {t('toolbar.controls')}
          </button>
        )}
      </div>
      <div
        ref={stageBodyRef}
        className={`stage-body${fullscreen ? ' is-fullscreen' : ''}${rotation !== 0 ? ' is-rotated' : ''}`}
      >
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
