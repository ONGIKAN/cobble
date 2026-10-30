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
