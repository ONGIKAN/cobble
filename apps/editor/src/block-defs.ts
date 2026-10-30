import i18n from 'i18next';
import { defineAssetBlocks, defineGameBlocks } from '@cobble/blocks';
import { useEditorStore } from './store';
import { buildDemoWorkspaces } from './demo-scripts';

export const translate = (key: string, options?: Record<string, unknown>): string =>
  String(i18n.t(key, options as never));

let bootstrapped = false;

/** 首次启动：定义全部积木，并为内置演示工程生成示例脚本 */
export function bootstrapBlocks(): void {
  if (bootstrapped) return;
  bootstrapped = true;
  const state = useEditorStore.getState();
  defineGameBlocks({ t: translate, project: state.project });
  if (Object.keys(state.workspaces).length === 0 && state.project.meta.id === 'demo-cat-coin') {
    for (const [spriteId, workspace] of Object.entries(buildDemoWorkspaces(state.project))) {
      state.setWorkspace(spriteId, workspace);
    }
  }
}

/** 新增/删除角色、声音后刷新受影响积木的下拉选项 */
export function refreshAssetBlocks(): void {
  defineAssetBlocks({ t: translate, project: useEditorStore.getState().project });
}
