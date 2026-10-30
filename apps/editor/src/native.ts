/**
 * 桌面版（Tauri）原生工程文件桥接。
 *
 * Web 版没有这些能力，所有函数都先做环境判断：
 * - 浏览器里 isDesktopApp() 返回 false，调用方直接走 localStorage；
 * - Tauri 里通过 window.__TAURI_INTERNALS__.invoke 调 Rust 命令读写磁盘上的 .gproj。
 */
interface TauriInternals {
  invoke: <T>(command: string, args?: Record<string, unknown>) => Promise<T>;
}

function tauri(): TauriInternals | null {
  const internals = (window as unknown as { __TAURI_INTERNALS__?: TauriInternals }).__TAURI_INTERNALS__;
  return internals && typeof internals.invoke === 'function' ? internals : null;
}

/** 是否运行在 Tauri 桌面 / 移动壳里 */
export function isDesktopApp(): boolean {
  return tauri() !== null;
}

async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const internals = tauri();
  if (!internals) throw new Error('not running inside the desktop shell');
  return internals.invoke<T>(command, args);
}

/** 磁盘上已有工程的 id 列表 */
export function listNativeProjectIds(): Promise<string[]> {
  return invoke<string[]>('list_projects');
}

/** 读取某个工程的 .gproj 文本 */
export function readNativeProject(id: string): Promise<string> {
  return invoke<string>('read_project', { id });
}

/** 覆盖写入某个工程的 .gproj 文本 */
export function writeNativeProject(id: string, contents: string): Promise<void> {
  return invoke<void>('write_project', { id, contents });
}

/** 删除某个工程的 .gproj */
export function deleteNativeProject(id: string): Promise<void> {
  return invoke<void>('delete_project', { id });
}

/** 工程文件所在目录（用于在界面里提示用户） */
export function nativeProjectsLocation(): Promise<string> {
  return invoke<string>('projects_location');
}
