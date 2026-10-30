type Listener = () => void;

const listeners = new Set<Listener>();

/** 顶栏 / 手机舞台头部的「新建」按钮触发，App 里打开模板选择弹层 */
export function openNewProjectDialog(): void {
  for (const listener of listeners) listener();
}

export function onNewProjectDialog(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
