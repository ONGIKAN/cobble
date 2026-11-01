/** 设置面板的全局开关：工程管理页与编辑器都能打开同一个设置弹窗 */
export type SettingsTab = 'general' | 'editor' | 'data' | 'ai' | 'about';

interface OpenOptions {
  tab?: SettingsTab;
}

type Listener = (open: boolean, options?: OpenOptions) => void;

const listeners = new Set<Listener>();

export function openSettings(options?: OpenOptions): void {
  for (const listener of listeners) listener(true, options);
}

export function onSettings(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
