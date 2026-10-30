type Listener = () => void;

const listeners = new Set<Listener>();

/** 顶栏/手机舞台头部的「输入」按钮统一走这里打开设置弹层 */
export function openInputSettings(): void {
  for (const listener of listeners) listener();
}

export function onInputSettings(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
