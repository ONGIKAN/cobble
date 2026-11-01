import { useEffect, useState } from 'react';
import type { ProjectDoc } from '@cobbox/project';
import { useEditorStore } from './store';

/**
 * 编辑器撤销/重做历史。
 * - 监听工程与积木工作区状态，400ms 防抖后记录一次快照
 * - Ctrl/Cmd+Z 撤销、Ctrl/Cmd+Shift+Z 或 Ctrl+Y 重做
 * - 编辑过程中不会因为撤销本身再次记录快照
 */

export interface HistoryStatus {
  canUndo: boolean;
  canRedo: boolean;
}

interface Snapshot {
  project: ProjectDoc;
  workspaces: Record<string, unknown>;
}

const MAX_HISTORY = 60;
const SNAPSHOT_DEBOUNCE = 400;

let past: Snapshot[] = [];
let future: Snapshot[] = [];
let last: Snapshot | null = null;
let timer: number | null = null;
let applying = false;
let started = false;

const listeners = new Set<(status: HistoryStatus) => void>();

const status = (): HistoryStatus => ({ canUndo: past.length > 0, canRedo: future.length > 0 });

const notify = (): void => {
  const next = status();
  listeners.forEach((listener) => listener(next));
};

const takeSnapshot = (): Snapshot => {
  const state = useEditorStore.getState();
  return { project: state.project, workspaces: state.workspaces };
};

const clearTimer = (): void => {
  if (timer !== null) {
    window.clearTimeout(timer);
    timer = null;
  }
};

const record = (): void => {
  if (applying) return;
  clearTimer();
  const next = takeSnapshot();
  if (last && last.project === next.project && last.workspaces === next.workspaces) return;
  if (last) {
    past.push(last);
    if (past.length > MAX_HISTORY) past.shift();
  }
  last = next;
  future = [];
  notify();
};

const schedule = (): void => {
  if (applying) return;
  clearTimer();
  timer = window.setTimeout(record, SNAPSHOT_DEBOUNCE);
};

export function resetHistory(): void {
  past = [];
  future = [];
  clearTimer();
  last = takeSnapshot();
  notify();
}

export function startHistory(): void {
  if (started) return;
  started = true;
  last = takeSnapshot();
  useEditorStore.subscribe(() => {
    if (applying) return;
    schedule();
  });
}

export function undo(): void {
  if (past.length === 0) return;
  clearTimer();
  const current = takeSnapshot();
  const target = past.pop() as Snapshot;
  future.push(current);
  applying = true;
  useEditorStore.getState().restoreSnapshot(target.project, target.workspaces);
  applying = false;
  last = target;
  notify();
}

export function redo(): void {
  if (future.length === 0) return;
  clearTimer();
  const current = takeSnapshot();
  const target = future.pop() as Snapshot;
  past.push(current);
  applying = true;
  useEditorStore.getState().restoreSnapshot(target.project, target.workspaces);
  applying = false;
  last = target;
  notify();
}

export function subscribeHistory(listener: (status: HistoryStatus) => void): () => void {
  listeners.add(listener);
  listener(status());
  return () => {
    listeners.delete(listener);
  };
}

export function useHistoryStatus(): HistoryStatus {
  const [current, setCurrent] = useState<HistoryStatus>(status);
  useEffect(() => subscribeHistory(setCurrent), []);
  return current;
}
