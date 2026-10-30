import type { CompiledProject } from '@cobble/project';

let frame: HTMLIFrameElement | null = null;

export function setPlayerFrame(element: HTMLIFrameElement | null): void {
  frame = element;
}

export function sendRun(project: CompiledProject): void {
  frame?.contentWindow?.postMessage({ type: 'run', project }, '*');
}

export function sendStop(): void {
  frame?.contentWindow?.postMessage({ type: 'stop' }, '*');
}

/** 编辑器外部摇杆/按钮把当前激活的输入事件发给 iframe */
export function sendTouch(bindings: string[]): void {
  frame?.contentWindow?.postMessage({ type: 'touch', bindings }, '*');
}
