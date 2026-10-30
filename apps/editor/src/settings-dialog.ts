/** 设置面板的全局开关：工程管理页与编辑器都能打开同一个设置弹窗 */
type Listener = (open: boolean) => void;

const listeners = new Set<Listener>();

export function openSettings(): void {
  for (const listener of listeners) listener(true);
}

export function onSettings(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
