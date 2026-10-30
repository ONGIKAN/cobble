import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { compileProject } from '@cobble/blocks';
import { inputConfig, type TouchButtonDef } from '@cobble/project';
import { sendRun, sendTouch, setPlayerFrame } from '../bridge';
import { ProjectFileButtons } from './ProjectFileButtons';
import { openInputSettings } from '../input-settings';
import { StageSettings } from './StageSettings';
import { ASSET_MIME, openAssetLibrary } from './AssetLibrary';
import { useEditorStore } from '../store';
import { useCoarsePointer } from '../useCompact';

const PLAYER_SRC = `${import.meta.env.BASE_URL}player.html`;

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
  const stageFrameRef = useRef<HTMLDivElement | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const touchSetRef = useRef<Set<string>>(new Set());
  const joystickRef = useRef<HTMLDivElement | null>(null);
  const joyActiveRef = useRef(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const input = inputConfig(project);
  const mode = input.touchMode ?? 'pad';
  const joystickSize = input.joystickSize ?? 'md';
  const buttonSize = input.buttonSize ?? 'md';
  const padButtons: TouchButtonDef[] =
    input.buttons.length > 0 ? input.buttons : [{ id: 'btn-jump', bindingId: 'jump', label: 'inputs.jumpButton' }];
  const padDirections = ['left', 'right', 'up', 'down'] as const;
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
        touchSetRef.current.clear();
        flushTouch();
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
    const active = Boolean(document.fullscreenElement?.contains(stageBodyRef.current));
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

  const flushTouch = (): void => {
    sendTouch([...touchSetRef.current]);
  };

  const setBinding = (id: string, active: boolean): void => {
    if (active) touchSetRef.current.add(id);
    else touchSetRef.current.delete(id);
    flushTouch();
  };

  const joystickMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!joyActiveRef.current) return;
    const element = joystickRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const limit = rect.width * 0.32;
    let dx = event.clientX - centerX;
    let dy = event.clientY - centerY;
    const length = Math.hypot(dx, dy);
    if (length > limit) {
      dx = (dx / length) * limit;
      dy = (dy / length) * limit;
    }
    setKnob({ x: dx, y: dy });
    for (const id of padDirections) touchSetRef.current.delete(id);
    const deadzone = rect.width * 0.16;
    if (dx < -deadzone) touchSetRef.current.add('left');
    if (dx > deadzone) touchSetRef.current.add('right');
    if (dy < -deadzone) touchSetRef.current.add('up');
    if (dy > deadzone) touchSetRef.current.add('down');
    flushTouch();
  };

  const joystickDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    event.preventDefault();
    joyActiveRef.current = true;
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // 合成触摸事件没有真实 pointerId，捕获失败时忽略
    }
    joystickMove(event);
  };

  const joystickUp = (event: ReactPointerEvent<HTMLDivElement>): void => {
    event.preventDefault();
    joyActiveRef.current = false;
    setKnob({ x: 0, y: 0 });
    for (const id of padDirections) touchSetRef.current.delete(id);
    flushTouch();
  };

  const pressBinding = (bindingId: string) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // 忽略
    }
    setBinding(bindingId, true);
  };

  const releaseBinding = (bindingId: string) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setBinding(bindingId, false);
  };

  const buttonLabel = (button: TouchButtonDef): string =>
    button.label.startsWith('inputs.') ? t(button.label) : button.label;

  /** 从资源库拖入素材：按落点在舞台上创建角色 */
  const dropFromLibrary = (event: ReactDragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const raw = event.dataTransfer.getData(ASSET_MIME) || event.dataTransfer.getData('text/plain');
    if (!raw) return;
    let payload: { name?: string; dataUrl?: string };
    try {
      payload = JSON.parse(raw) as { name?: string; dataUrl?: string };
    } catch {
      return;
    }
    if (!payload?.dataUrl) return;
    const rect = stageFrameRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    const stage = useEditorStore.getState().project.stage;
    const x = Math.round(((event.clientX - rect.left) / rect.width - 0.5) * stage.width);
    const y = Math.round((0.5 - (event.clientY - rect.top) / rect.height) * stage.height);
    useEditorStore.getState().addSpriteFromAsset({ name: payload.name ?? 'Sprite', dataUrl: payload.dataUrl, x, y });
    if (useEditorStore.getState().running) {
      const state = useEditorStore.getState();
      sendRun(compileProject(state.project, state.workspaces));
    }
  };

  const toggleFullscreen = useCallback(async () => {
    // 不要对 stage-body 本身进全屏：浏览器 UA 的 :fullscreen 规则会强制
    // transform:none / width:100% / height:100%，导致旋转兜底失效。
    // 改为让父级 stage-zone 进全屏，内部的 stage-body 再整体旋转。
    const element = stageBodyRef.current?.parentElement;
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
        {compact && (
          <button
            type="button"
            className="mini-btn stage-inputs-btn"
            data-testid="m-asset-library"
            onClick={openAssetLibrary}
          >
            {t('library.short')}
          </button>
        )}
      </div>
      <div
        ref={stageBodyRef}
        className={`stage-body${fullscreen ? ' is-fullscreen' : ''}${rotation !== 0 ? ' is-rotated' : ''}`}
      >
        <div
          className="stage-frame"
          ref={stageFrameRef}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={dropFromLibrary}
        >
          <iframe
          ref={iframeRef}
          className="stage-iframe"
          data-testid="stage-iframe"
          src={`${PLAYER_SRC}?touch=0`}
          title={t('panels.stage')}
          sandbox="allow-scripts allow-same-origin allow-pointer-lock"
        />
          {!playerReady && <div className="stage-loading">{t('stage.loading')}</div>}
        </div>
        {fullscreen && (
          <button type="button" className="fs-exit-btn" data-testid="stage-exit-fullscreen" onClick={toggleFullscreen}>
            {t('stage.exitFullscreen')}
          </button>
        )}
        {coarse && mode === 'pad' && (
          <div className={`stage-pad${fullscreen ? ' is-overlay' : ''}`} data-testid="stage-pad">
            <div
              ref={joystickRef}
              className={`pad-joystick pad-size-${joystickSize}`}
              data-testid="pad-joystick"
              onPointerDown={joystickDown}
              onPointerMove={joystickMove}
              onPointerUp={joystickUp}
              onPointerCancel={joystickUp}
              onLostPointerCapture={joystickUp}
              onContextMenu={(event) => event.preventDefault()}
            >
              <span className="pad-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
            </div>
            <div className="pad-buttons">
              {padButtons.map((button) => (
                <button
                  key={button.id}
                  type="button"
                  className={`pad-btn pad-btn-size-${buttonSize}`}
                  data-testid={`pad-btn-${button.bindingId}`}
                  onPointerDown={pressBinding(button.bindingId)}
                  onPointerUp={releaseBinding(button.bindingId)}
                  onPointerCancel={releaseBinding(button.bindingId)}
                  onLostPointerCapture={releaseBinding(button.bindingId)}
                  onContextMenu={(event) => event.preventDefault()}
                >
                  {buttonLabel(button)}
                </button>
              ))}
            </div>
          </div>
        )}
        {coarse && mode === 'direct' && (
          <div className="stage-direct-hint" data-testid="stage-direct-hint">
            {t('stage.directHint')}
          </div>
        )}
      </div>
    </section>
  );
}
