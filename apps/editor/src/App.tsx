import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditorStore } from './store';
import { findEntry, mirrorNative, updateEntry } from './library';
import { routeToProjects } from './routes';
import { bootstrapBlocks, refreshAssetBlocks } from './block-defs';
import { TEMPLATES } from './templates';
import { Topbar } from './components/Topbar';
import { SpriteRail } from './components/SpriteRail';
import { StageView } from './components/StageView';
import { BlocksView } from './components/BlocksView';
import { Inspector } from './components/Inspector';
import { StatusBar } from './components/StatusBar';
import { MobileTabs } from './components/MobileTabs';
import { NewProjectDialog } from './components/NewProjectDialog';
import { InputSettingsDialog } from './components/InputSettingsDialog';
import { MobileBlocksDrawer } from './components/MobileBlocksDrawer';
import { AssetLibrary, onAssetLibrary } from './components/AssetLibrary';
import { PaneSplitter } from './components/PaneSplitter';
import { onNewProjectDialog } from './new-project';
import { onInputSettings } from './input-settings';
import { useCompact, type MobileTab } from './useCompact';

let bootstrapped = false;

const PANES_KEY = 'cobble.panes';
interface PaneSizes { rail: number; inspector: number; stage: number }

function defaultPanes(): PaneSizes {
  const wide = window.innerWidth >= 1100;
  const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  return {
    rail: wide ? 240 : 216,
    inspector: wide ? 300 : 268,
    stage: coarse ? 470 : wide ? 380 : 330,
  };
}

function loadPanes(): PaneSizes {
  try {
    const raw = localStorage.getItem(PANES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PaneSizes>;
      if (typeof parsed.rail === 'number' && typeof parsed.inspector === 'number' && typeof parsed.stage === 'number') {
        return { rail: parsed.rail, inspector: parsed.inspector, stage: parsed.stage };
      }
    }
  } catch {
    // ignore broken storage
  }
  return defaultPanes();
}

function bootstrap(): void {
  if (bootstrapped) return;
  bootstrapped = true;
  bootstrapBlocks();
}

/** 触屏舞台页底部的角色快捷条：不用切到「角色」页也能看到并切换当前角色 */
function CompactSpriteStrip() {
  const { t } = useTranslation();
  const project = useEditorStore((state) => state.project);
  const selectedSpriteId = useEditorStore((state) => state.selectedSpriteId);
  const selectSprite = useEditorStore((state) => state.selectSprite);

  return (
    <div className="sprite-strip" data-testid="sprite-strip">
      <span className="sprite-strip-label">{t('panels.sprites')}</span>
      <div className="sprite-strip-items">
        {project.sprites.map((sprite) => {
          const costume = sprite.costumes[0];
          const asset = project.assets.find((entry) => entry.id === costume?.assetId);
          const active = sprite.id === selectedSpriteId;
          return (
            <button
              key={sprite.id}
              type="button"
              className={`sprite-chip${active ? ' is-active' : ''}`}
              onClick={() => selectSprite(sprite.id)}
              data-testid={`chip-${sprite.id}`}
            >
              {asset?.dataUrl ? <img src={asset.dataUrl} alt="" /> : null}
              <span>{sprite.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function App({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const compact = useCompact();
  const [tab, setTab] = useState<MobileTab>('stage');
  const [ready, setReady] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inputOpen, setInputOpen] = useState(false);
  const [blocksOpen, setBlocksOpen] = useState(false);
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [panes, setPanes] = useState<PaneSizes>(() => loadPanes());

  useEffect(() => onNewProjectDialog(() => setDialogOpen(true)), []);
  useEffect(() => onInputSettings(() => setInputOpen(true)), []);
  useEffect(() => onAssetLibrary(() => setAssetsOpen(true)), []);
  useEffect(() => {
    try {
      localStorage.setItem(PANES_KEY, JSON.stringify(panes));
    } catch {
      // ignore storage errors
    }
  }, [panes]);
  const setPane = (key: keyof PaneSizes) => (value: number) => setPanes((prev) => ({ ...prev, [key]: value }));

  // 安卓返回键：先关掉打开的浮层，其余交给原生壳（回工程管理 / 退出应用）
  useEffect(() => {
    const onNativeBack = (event: Event): void => {
      if (assetsOpen) {
        setAssetsOpen(false);
        event.preventDefault();
        return;
      }
      if (blocksOpen) {
        setBlocksOpen(false);
        event.preventDefault();
      }
    };
    window.addEventListener('cobble:native-back', onNativeBack);
    return () => window.removeEventListener('cobble:native-back', onNativeBack);
  }, [assetsOpen, blocksOpen]);

  // 常用快捷键：Ctrl/Cmd+S 保存工程、Ctrl/Cmd+O 打开工程、Ctrl/Cmd+E 导出 HTML5
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      const target = event.target as HTMLElement | null;
      const typing =
        Boolean(target) &&
        (target!.tagName === 'INPUT' || target!.tagName === 'TEXTAREA' || target!.isContentEditable);
      const click = (selector: string): boolean => {
        const button = document.querySelector<HTMLButtonElement>(selector);
        if (!button) return false;
        button.click();
        return true;
      };
      if (key === 's') {
        event.preventDefault();
        click('[data-testid="save-project"]') || click('[data-testid="m-save-project"]');
      } else if (key === 'o') {
        event.preventDefault();
        click('[data-testid="open-project"]') || click('[data-testid="m-open-project"]');
      } else if (key === 'e' && !typing) {
        event.preventDefault();
        click('[data-testid="export-html5"]') || click('[data-testid="m-export-html5"]');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const loaded = useEditorStore.getState().loadProject(projectId);
    if (!loaded) {
      routeToProjects();
      return;
    }
    bootstrap();
    // 从模板新建的工程：首次打开时按模板生成积木脚本（此时积木已按该工程注册）
    const entry = findEntry(projectId);
    if (entry?.templateId && Object.keys(useEditorStore.getState().workspaces).length === 0) {
      const template = TEMPLATES.find((item) => item.id === entry.templateId);
      if (template) {
        for (const [spriteId, state] of Object.entries(template.workspaces())) {
          useEditorStore.getState().setWorkspace(spriteId, state);
        }
      }
    }
    setReady(true);
  }, [projectId]);

  useEffect(() => {
    let timer: number | undefined;
    const unsubscribe = useEditorStore.subscribe((state, previous) => {
      if (state.project === previous.project && state.workspaces === previous.workspaces) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        try {
          updateEntry(projectId, state.project, state.workspaces);
          void mirrorNative(findEntry(projectId));
          useEditorStore.getState().markSaved();
        } catch {
          // 存储配额不足时静默失败，不影响编辑
        }
      }, 350);
    });
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, [projectId]);

  useEffect(() => {
    let timer: number | undefined;
    const unsubscribe = useEditorStore.subscribe((state, previous) => {
      if (state.project === previous.project) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => refreshAssetBlocks(), 300);
    });
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  if (!ready) {
    return (
      <div className="splash">
        <span className="splash-mark">CB</span>
        <p className="splash-tagline">{t('app.tagline')}</p>
      </div>
    );
  }

  const handleTabChange = (next: MobileTab): void => {
    if (next === 'blocks') {
      setBlocksOpen(true);
      return;
    }
    setBlocksOpen(false);
    setTab(next);
  };

  return (
    <div className={`app${compact ? ' app-compact' : ''}`}>
      <Topbar />
      {compact ? (
        <div className="layout layout-compact" data-tab={tab}>
          <main className="center">
            <div className={`stage-slot${tab === 'stage' ? '' : ' is-hidden'}`}>
              <StageView compact />
              <CompactSpriteStrip />
            </div>
          </main>
          {tab === 'sprites' && <SpriteRail />}
          {tab === 'props' && <Inspector />}
        </div>
      ) : (
        <div
          className="layout"
          style={
            {
              '--rail-w': `${panes.rail}px`,
              '--inspector-w': `${panes.inspector}px`,
              '--stage-h': `${panes.stage}px`,
            } as unknown as React.CSSProperties
          }
        >
          <SpriteRail />
          <PaneSplitter direction="vertical" value={panes.rail} min={160} max={420} onChange={setPane('rail')} testId="splitter-rail" />
          <main className="center">
            <div className="center-stage">
              <StageView />
            </div>
            <PaneSplitter direction="horizontal" value={panes.stage} min={220} max={680} onChange={setPane('stage')} testId="splitter-stage" />
            <BlocksView />
          </main>
          <PaneSplitter direction="vertical" value={panes.inspector} min={200} max={460} onChange={setPane('inspector')} testId="splitter-inspector" />
          <Inspector />
        </div>
      )}
      {compact && (
        <>
          <MobileTabs value={blocksOpen ? 'blocks' : tab} onChange={handleTabChange} />
          <MobileBlocksDrawer open={blocksOpen} onClose={() => setBlocksOpen(false)} />
        </>
      )}
      <NewProjectDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      <InputSettingsDialog open={inputOpen} onClose={() => setInputOpen(false)} />
      <AssetLibrary open={assetsOpen} onClose={() => setAssetsOpen(false)} />
      <StatusBar />
    </div>
  );
}
