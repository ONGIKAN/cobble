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
import { onNewProjectDialog } from './new-project';
import { onInputSettings } from './input-settings';
import { useCompact, type MobileTab } from './useCompact';

let bootstrapped = false;

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

  useEffect(() => onNewProjectDialog(() => setDialogOpen(true)), []);
  useEffect(() => onInputSettings(() => setInputOpen(true)), []);

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
            {tab === 'blocks' && <BlocksView />}
          </main>
          {tab === 'sprites' && <SpriteRail />}
          {tab === 'props' && <Inspector />}
        </div>
      ) : (
        <div className="layout">
          <SpriteRail />
          <main className="center">
            <StageView />
            <BlocksView />
          </main>
          <Inspector />
        </div>
      )}
      {compact && <MobileTabs value={tab} onChange={setTab} />}
      <NewProjectDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      <InputSettingsDialog open={inputOpen} onClose={() => setInputOpen(false)} />
      <StatusBar />
    </div>
  );
}
