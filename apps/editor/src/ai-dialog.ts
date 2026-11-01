/** AI 创作弹窗的全局开关 */
type Listener = (open: boolean) => void;

const listeners = new Set<Listener>();

export function openAi(): void {
  for (const listener of listeners) listener(true);
}

export function onAi(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
