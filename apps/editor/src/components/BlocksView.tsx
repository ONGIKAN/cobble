import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import * as Blockly from 'blockly';
import { buildToolbox } from '@cobble/blocks';
import { createBlocklyTheme, registerSquareRenderer } from '../blockly-theme';
import { useEditorStore } from '../store';

export function BlocksView() {
  const { t } = useTranslation();
  const theme = useEditorStore((state) => state.theme);
  const selectedSpriteId = useEditorStore((state) => state.selectedSpriteId);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const loadedSpriteRef = useRef<string>('');
  const loadingRef = useRef(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const translate = (key: string, options?: Record<string, unknown>): string =>
      String(i18n.t(key, options as never));
    const initialState = useEditorStore.getState();
    registerSquareRenderer();
    const workspace = Blockly.inject(host, {
      toolbox: buildToolbox(translate) as unknown as NonNullable<Blockly.BlocklyOptions['toolbox']>,
      theme: createBlocklyTheme(initialState.theme),
      renderer: 'square',
      media: '',
      trashcan: false,
      sounds: false,
      grid: { spacing: 32, length: 2, colour: initialState.theme === 'dark' ? '#1f2227' : '#e0e0d6', snap: false },
      zoom: { controls: false, wheel: true, pinch: true, startScale: 0.85, minScale: 0.3, maxScale: 2.2 },
      move: { scrollbars: true, drag: true, wheel: true },
    });
    workspaceRef.current = workspace;

    const onChange = () => {
      if (loadingRef.current || !loadedSpriteRef.current) return;
      const state = Blockly.serialization.workspaces.save(workspace);
      useEditorStore.getState().setWorkspace(loadedSpriteRef.current, state);
    };
    workspace.addChangeListener(onChange);

    const fitBlocks = () => {
      Blockly.svgResize(workspace);
      workspace.zoomToFit();
      // zoomToFit 对长脚本会缩得过小；限制最小缩放并回到脚本顶部，保证 hat 可见
      if (workspace.scale < 0.78) {
        workspace.setScale(0.78);
        workspace.scroll(24, 24);
      }
    };
    const requestFit = () => {
      window.setTimeout(() => {
        window.requestAnimationFrame(fitBlocks);
      }, 0);
    };

    const onResize = () => Blockly.svgResize(workspace);
    window.addEventListener('resize', onResize);
    const resizeObserver = new ResizeObserver(() => Blockly.svgResize(workspace));
    resizeObserver.observe(host);
    requestFit();

    return () => {
      window.removeEventListener('resize', onResize);
      resizeObserver.disconnect();
      workspace.dispose();
      workspaceRef.current = null;
      loadedSpriteRef.current = '';
    };
  }, []);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    workspace.setTheme(createBlocklyTheme(theme));
  }, [theme]);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    loadingRef.current = true;
    workspace.clear();
    const state = useEditorStore.getState().workspaces[selectedSpriteId];
    if (state) {
      try {
        Blockly.serialization.workspaces.load(
          state as Record<string, unknown> as never,
          workspace,
        );
      } catch {
        // 忽略损坏的自动保存数据
      }
    }
    loadedSpriteRef.current = selectedSpriteId;
    loadingRef.current = false;
    window.setTimeout(() => {
      Blockly.svgResize(workspace);
      workspace.zoomToFit();
    }, 0);
  }, [selectedSpriteId]);

  return (
    <section className="blocks-panel">
      <div className="panel-head">
        <span className="panel-label">{t('panels.blocks')}</span>
        <span className="panel-meta">{t('toolbar.autosave')}</span>
      </div>
      <div className="blocks-host" data-testid="blocks-host" ref={hostRef} />
    </section>
  );
}
