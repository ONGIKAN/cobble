import { compileProject } from '@cobbox/blocks';
import type { ProjectDoc } from '@cobbox/project';

interface TauriInternals {
  invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
}

function tauriInternals(): TauriInternals | null {
  const candidate = (window as unknown as { __TAURI_INTERNALS__?: TauriInternals }).__TAURI_INTERNALS__;
  return candidate && typeof candidate.invoke === 'function' ? candidate : null;
}

/** 是否运行在 Windows 桌面安装版（Tauri）里 */
export function isDesktopRuntime(): boolean {
  return Boolean(tauriInternals());
}

/**
 * 导出可双击运行的 Windows 游戏 EXE：
 * 把编译后的工程 JSON 追加到独立播放器模板（cobbox-game-player.exe）末尾，写到下载目录。
 * 仅桌面版可用；网页版会抛错，由调用方给出提示。
 */
export async function exportGameExe(
  project: ProjectDoc,
  workspaces: Record<string, unknown>,
): Promise<string> {
  const api = tauriInternals();
  if (!api) throw new Error('desktop-only');
  const compiled = compileProject(project, workspaces);
  const title = project.meta.name || 'CobBox';
  const savedPath = await api.invoke('export_game_exe', {
    title,
    payload: JSON.stringify(compiled),
  });
  return String(savedPath);
}
