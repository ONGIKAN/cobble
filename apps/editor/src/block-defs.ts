import i18n from 'i18next';
import { defineAssetBlocks, defineGameBlocks } from '@cobbox/blocks';
import { useEditorStore } from './store';

export const translate = (key: string, options?: Record<string, unknown>): string =>
  String(i18n.t(key, options as never));

let bootstrapped = false;

/** 首次启动：定义全部积木（模板脚本由工程记录按需加载） */
export function bootstrapBlocks(): void {
  if (bootstrapped) return;
  bootstrapped = true;
  defineGameBlocks({ t: translate, project: useEditorStore.getState().project });
}

/** 新增/删除角色、声音后刷新受影响积木的下拉选项 */
export function refreshAssetBlocks(): void {
  defineAssetBlocks({ t: translate, project: useEditorStore.getState().project });
}
