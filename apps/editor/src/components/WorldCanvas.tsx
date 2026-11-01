import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import type { SpriteDef } from '@cobble/project';
import { ASSET_MIME, openAssetLibrary } from './AssetLibrary';
import { useEditorStore } from '../store';

/**
 * 编辑器「无限画布」：以舞台中心 (0,0) 为原点的世界坐标视图。
 * - 摄像机框 = 工程 stage 尺寸（运行时的游戏画面范围）
 * - 画布本身可以平移/缩放，画布上的角色可以任意拖到摄像机框外
 * 运行游戏时切回 game viewport（iframe），只显示摄像机范围。
 */

interface ViewState {
  /** 世界原点的屏幕坐标（px，相对画布左上角） */
  ox: number;
  oy: number;
  zoom: number;
}

const ZOOM_MIN = 0.2;
const ZOOM_MAX = 2.5;
const GRID_STEP = 60;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function rotationTransform(sprite: SpriteDef): string {
  if (sprite.rotationStyle === 'all-around') {
    return `rotate(${sprite.rotation - 90}deg)`;
  }
  if (sprite.rotationStyle === 'left-right') {
    const cos = Math.cos((sprite.rotation * Math.PI) / 180);
    return cos < 0 ? 'scaleX(-1)' : 'none';
  }
  return 'none';
}

export function WorldCanvas() {
  const { t } = useTranslation();
  const project = useEditorStore((state) => state.project);
  const selectedSpriteId = useEditorStore((state) => state.selectedSpriteId);
  const selectSprite = useEditorStore((state) => state.selectSprite);
  const updateSprite = useEditorStore((state) => state.updateSprite);
  const addSpriteFromAsset = useEditorStore((state) => state.addSpriteFromAsset);
  const removeSprite = useEditorStore((state) => state.removeSprite);
  const duplicateSprite = useEditorStore((state) => state.duplicateSprite);

  const hostRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState<ViewState>({ ox: 320, oy: 240, zoom: 0.6 });
  const [menu, setMenu] = useState<{ x: number; y: number; spriteId: string } | null>(null);
  const initializedRef = useRef(false);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{
    distance: number;
    zoom: number;
    worldX: number;
    worldY: number;
  } | null>(null);
  const [sizes, setSizes] = useState<Record<string, { width: number; height: number }>>({});
  const [panning, setPanning] = useState(false);

  const stage = project.stage;

  const fitView = useCallback((zoomHint?: number) => {
    const host = hostRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const zoom =
      zoomHint ??
      clamp(
        Math.min((rect.width - 96) / stage.width, (rect.height - 96) / stage.height),
        ZOOM_MIN,
        1.4,
      );
    setView({ ox: rect.width / 2, oy: rect.height / 2, zoom });
  }, [stage.width, stage.height]);

  useEffect(() => {
    if (initializedRef.current) return;
    const host = hostRef.current;
    if (!host || host.clientWidth === 0) return;
    initializedRef.current = true;
    fitView();
  }, [fitView]);

  // 预加载图片素材的自然尺寸（角色大小按素材原尺寸百分比缩放）
  useEffect(() => {
    let cancelled = false;
    const next: Record<string, { width: number; height: number }> = {};
    const pending: Promise<void>[] = [];
    for (const asset of project.assets) {
      if (asset.kind !== 'image' || !asset.dataUrl) continue;
      pending.push(
        new Promise((resolve) => {
          const image = new Image();
          image.onload = () => {
            if (!cancelled) next[asset.id] = { width: image.naturalWidth || 100, height: image.naturalHeight || 100 };
            resolve();
          };
          image.onerror = () => resolve();
          image.src = asset.dataUrl as string;
        }),
      );
    }
    void Promise.all(pending).then(() => {
      if (!cancelled) setSizes(next);
    });
    return () => {
      cancelled = true;
    };
  }, [project.assets]);

  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const host = hostRef.current;
    if (!host) return { x: 0, y: 0 };
    const rect = host.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    return {
      x: (px - view.ox) / view.zoom,
      y: (view.oy - py) / view.zoom,
    };
  }, [view]);

  const startPan = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0 && event.button !== 1) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    panRef.current = { startX: event.clientX, startY: event.clientY, ox: view.ox, oy: view.oy };
    setPanning(true);
  };

  const startDragSprite = (sprite: SpriteDef) => (event: ReactPointerEvent<HTMLImageElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    selectSprite(sprite.id);
    const world = screenToWorld(event.clientX, event.clientY);
    dragRef.current = { id: sprite.id, offsetX: sprite.x - world.x, offsetY: sprite.y - world.y };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (pointersRef.current.has(event.pointerId)) {
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (pointersRef.current.size >= 2) {
      const points = Array.from(pointersRef.current.values());
      const [a, b] = points;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const host = hostRef.current;
      if (!host) return;
      const rect = host.getBoundingClientRect();
      const midX = (a.x + b.x) / 2 - rect.left;
      const midY = (a.y + b.y) / 2 - rect.top;
      if (!pinchRef.current) {
        const world = screenToWorld((a.x + b.x) / 2, (a.y + b.y) / 2);
        pinchRef.current = { distance, zoom: view.zoom, worldX: world.x, worldY: world.y };
        dragRef.current = null;
        panRef.current = null;
        return;
      }
      const pinch = pinchRef.current;
      const zoom = clamp(pinch.zoom * (distance / Math.max(1, pinch.distance)), ZOOM_MIN, ZOOM_MAX);
      setView({ zoom, ox: midX - pinch.worldX * zoom, oy: midY + pinch.worldY * zoom });
      return;
    }
    if (panRef.current) {
      const deltaX = event.clientX - panRef.current.startX;
      const deltaY = event.clientY - panRef.current.startY;
      setView((current) => ({ ...current, ox: panRef.current!.ox + deltaX, oy: panRef.current!.oy + deltaY }));
      return;
    }
    if (dragRef.current) {
      const world = screenToWorld(event.clientX, event.clientY);
      updateSprite(dragRef.current.id, {
        x: Math.round(world.x + dragRef.current.offsetX),
        y: Math.round(world.y + dragRef.current.offsetY),
      });
    }
  };

  const onPointerUp = (event?: ReactPointerEvent<HTMLDivElement>): void => {
    if (event) pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    panRef.current = null;
    dragRef.current = null;
    setPanning(false);
  };

  const onWheel = (event: ReactWheelEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const host = hostRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
    setView((current) => {
      const zoom = clamp(current.zoom * factor, ZOOM_MIN, ZOOM_MAX);
      const ratio = zoom / current.zoom;
      return {
        zoom,
        ox: cursorX - (cursorX - current.ox) * ratio,
        oy: cursorY - (cursorY - current.oy) * ratio,
      };
    });
  };

  const zoomBy = (factor: number): void => {
    const host = hostRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    setView((current) => {
      const zoom = clamp(current.zoom * factor, ZOOM_MIN, ZOOM_MAX);
      const ratio = zoom / current.zoom;
      return {
        zoom,
        ox: centerX - (centerX - current.ox) * ratio,
        oy: centerY - (centerY - current.oy) * ratio,
      };
    });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (event.key.toLowerCase() === 'f') {
        event.preventDefault();
        fitView();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fitView]);

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
    const world = screenToWorld(event.clientX, event.clientY);
    addSpriteFromAsset({
      name: payload.name ?? 'Sprite',
      dataUrl: payload.dataUrl,
      x: Math.round(world.x),
      y: Math.round(world.y),
    });
  };

  const cameraLeft = view.ox - (stage.width / 2) * view.zoom;
  const cameraTop = view.oy - (stage.height / 2) * view.zoom;
  const cameraWidth = stage.width * view.zoom;
  const cameraHeight = stage.height * view.zoom;
  const gridSize = Math.max(12, GRID_STEP * view.zoom);

  return (
    <div className="world-canvas-wrap">
      <div
        ref={hostRef}
        className={`world-canvas${panning ? ' is-panning' : ''}`}
        data-testid="world-canvas"
        onPointerDownCapture={(event) => {
          pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        }}
        onPointerDown={(event) => {
          setMenu(null);
          if (event.target === event.currentTarget) startPan(event);
        }}
        onDoubleClick={(event) => {
          if (event.target === event.currentTarget) openAssetLibrary();
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={dropFromLibrary}
      >
        {/* 世界网格：点阵，随缩放变化 */}
        <div
          className="world-grid"
          style={{
            backgroundSize: `${gridSize}px ${gridSize}px`,
            backgroundPosition: `${view.ox}px ${view.oy}px`,
          }}
        />
        {/* 摄像机框 = 运行时游戏画面 */}
        <div
          className="camera-frame"
          data-testid="camera-frame"
          style={{
            left: cameraLeft,
            top: cameraTop,
            width: cameraWidth,
            height: cameraHeight,
            background: stage.background,
          }}
        >
          <span className="camera-frame-label mono">
            {t('stage.camera')} · {stage.width}×{stage.height}
          </span>
        </div>
        {project.sprites.map((sprite) => {
          const costume = sprite.costumes[0];
          const asset = project.assets.find((item) => item.id === costume?.assetId);
          if (!asset?.dataUrl) return null;
          const natural = sizes[asset.id] ?? { width: 96, height: 96 };
          const width = natural.width * (sprite.size / 100) * view.zoom;
          const height = natural.height * (sprite.size / 100) * view.zoom;
          const selected = sprite.id === selectedSpriteId;
          return (
            <img
              key={sprite.id}
              className={`world-sprite${selected ? ' is-selected' : ''}`}
              data-testid={`world-sprite-${sprite.id}`}
              src={asset.dataUrl}
              alt={sprite.name}
              draggable={false}
              onPointerDown={startDragSprite(sprite)}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                selectSprite(sprite.id);
                setMenu({ x: event.clientX, y: event.clientY, spriteId: sprite.id });
              }}
              style={{
                left: view.ox + sprite.x * view.zoom - width / 2,
                top: view.oy - sprite.y * view.zoom - height / 2,
                width,
                height,
                opacity: sprite.visible ? 1 : 0.35,
                zIndex: sprite.zIndex + 1,
                transform: rotationTransform(sprite),
                cursor: 'move',
              }}
            />
          );
        })}
        <div className="world-zoom">
          <button type="button" className="mini-btn" data-testid="world-zoom-out" onClick={() => zoomBy(1 / 1.2)}>
            −
          </button>
          <button type="button" className="mini-btn mono" data-testid="world-zoom-reset" onClick={() => fitView()}>
            {Math.round(view.zoom * 100)}%
          </button>
          <button type="button" className="mini-btn" data-testid="world-zoom-in" onClick={() => zoomBy(1.2)}>
            +
          </button>
        </div>
        <div className="world-camera-note mono" data-testid="world-camera-note">
          {t('stage.cameraNote')}
        </div>
        {menu ? (
          <div
            className="world-menu"
            data-testid="world-context-menu"
            style={{ left: menu.x, top: menu.y }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              data-testid="ctx-duplicate"
              onClick={() => {
                duplicateSprite(menu.spriteId);
                setMenu(null);
              }}
            >
              {t('stage.ctxDuplicate')}
            </button>
            <button
              type="button"
              data-testid="ctx-front"
              onClick={() => {
                const top = Math.max(...project.sprites.map((sprite) => sprite.zIndex));
                updateSprite(menu.spriteId, { zIndex: top + 1 });
                setMenu(null);
              }}
            >
              {t('stage.ctxFront')}
            </button>
            <button
              type="button"
              data-testid="ctx-back"
              onClick={() => {
                const bottom = Math.min(...project.sprites.map((sprite) => sprite.zIndex));
                updateSprite(menu.spriteId, { zIndex: bottom - 1 });
                setMenu(null);
              }}
            >
              {t('stage.ctxBack')}
            </button>
            <button
              type="button"
              className="is-danger"
              data-testid="ctx-delete"
              onClick={() => {
                removeSprite(menu.spriteId);
                setMenu(null);
              }}
            >
              {t('stage.ctxDelete')}
            </button>
          </div>
        ) : null}
      </div>
      <div className="stage-edit-hint" data-testid="stage-edit-hint">
        {t('stage.editHint')}
      </div>
    </div>
  );
}
