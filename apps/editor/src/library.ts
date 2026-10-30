import { createDemoProject, type ProjectDoc } from '@cobble/project';
import { parseProjectFile } from './project-file';
import {
  deleteNativeProject,
  isDesktopApp,
  listNativeProjectIds,
  readNativeProject,
  writeNativeProject,
} from './native';

export const LIBRARY_KEY = 'cobble.library';
export const AUTOSAVE_KEY = 'cobble.autosave';

export interface ProjectEntry {
  /** 新建时使用的模板 id，编辑器首次打开时据此生成脚本 */
  templateId?: string;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  project: ProjectDoc;
  workspaces: Record<string, unknown>;
}

interface LibraryDoc {
  version: 1;
  projects: ProjectEntry[];
}

export function newProjectId(): string {
  const random = Math.random().toString(36).slice(2, 6);
  return `p_${Date.now().toString(36)}_${random}`;
}

function isEntry(value: unknown): value is ProjectEntry {
  const entry = value as ProjectEntry;
  return Boolean(entry && typeof entry.id === 'string' && entry.project && entry.project.schemaVersion === 1);
}

function createDemoEntry(): ProjectEntry {
  const project = createDemoProject();
  const now = new Date().toISOString();
  return {
    id: newProjectId(),
    name: project.meta.name,
    createdAt: now,
    updatedAt: now,
    project,
    workspaces: {},
  };
}

/** 读取工程库；首次使用时把旧版单工程自动保存迁移成一条工程记录 */
export function loadLibrary(): LibraryDoc {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LibraryDoc>;
      const projects = Array.isArray(parsed.projects) ? parsed.projects.filter(isEntry) : [];
      if (projects.length > 0) return { version: 1, projects };
    }
  } catch {
    // 数据损坏时重建
  }

  const migrated = migrateAutosave();
  const library: LibraryDoc = { version: 1, projects: [migrated ?? createDemoEntry()] };
  saveLibrary(library);
  return library;
}

function migrateAutosave(): ProjectEntry | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { project?: ProjectDoc; workspaces?: Record<string, unknown> };
    if (!data.project || data.project.schemaVersion !== 1) return null;
    const now = new Date().toISOString();
    return {
      id: newProjectId(),
      name: data.project.meta.name,
      createdAt: now,
      updatedAt: now,
      project: data.project,
      workspaces: data.workspaces ?? {},
    };
  } catch {
    return null;
  }
}

export function saveLibrary(library: LibraryDoc): void {
  const sorted = { ...library, projects: [...library.projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) };
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(sorted));
}

export function findEntry(projectId: string): ProjectEntry | null {
  return loadLibrary().projects.find((entry) => entry.id === projectId) ?? null;
}

export function createEntry(
  project: ProjectDoc,
  workspaces: Record<string, unknown>,
  templateId?: string,
): ProjectEntry {
  const library = loadLibrary();
  const now = new Date().toISOString();
  const entry: ProjectEntry = {
    id: newProjectId(),
    name: project.meta.name,
    createdAt: now,
    updatedAt: now,
    project,
    workspaces,
    templateId,
  };
  library.projects.unshift(entry);
  saveLibrary(library);
  return entry;
}

export function updateEntry(
  projectId: string,
  project: ProjectDoc,
  workspaces: Record<string, unknown>,
): void {
  const library = loadLibrary();
  const index = library.projects.findIndex((entry) => entry.id === projectId);
  if (index < 0) return;
  const previous = library.projects[index];
  library.projects[index] = {
    ...previous,
    name: project.meta.name || previous.name,
    updatedAt: new Date().toISOString(),
    project,
    workspaces,
  };
  saveLibrary(library);
}

export function renameEntry(projectId: string, name: string): void {
  const library = loadLibrary();
  const entry = library.projects.find((item) => item.id === projectId);
  if (!entry) return;
  const trimmed = name.trim() || entry.name;
  entry.name = trimmed;
  entry.project = { ...entry.project, meta: { ...entry.project.meta, name: trimmed } };
  entry.updatedAt = new Date().toISOString();
  saveLibrary(library);
}

export function duplicateEntry(projectId: string): ProjectEntry | null {
  const source = findEntry(projectId);
  if (!source) return null;
  const now = new Date().toISOString();
  const copy: ProjectEntry = {
    ...source,
    id: newProjectId(),
    name: `${source.name} 副本`,
    createdAt: now,
    updatedAt: now,
    project: { ...source.project, meta: { ...source.project.meta, name: `${source.name} 副本` } },
  };
  const library = loadLibrary();
  library.projects.unshift(copy);
  saveLibrary(library);
  return copy;
}

export function deleteEntry(projectId: string): void {
  const library = loadLibrary();
  library.projects = library.projects.filter((entry) => entry.id !== projectId);
  saveLibrary(library);
}

/** 用第一个角色的第一个图片造型当卡片缩略图 */
export function entryThumb(entry: ProjectEntry): string {
  const { project } = entry;
  for (const sprite of project.sprites) {
    const asset = project.assets.find((item) => item.id === sprite.costumes[0]?.assetId);
    if (asset?.dataUrl) return asset.dataUrl;
  }
  const fallback = project.assets.find((item) => item.kind === 'image' && item.dataUrl);
  return fallback?.dataUrl ?? '';
}

export function relativeTime(iso: string, locale: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diff = Date.now() - then;
  const minutes = Math.round(diff / 60000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (minutes < 1) return formatter.format(0, 'minute');
  if (minutes < 60) return formatter.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return formatter.format(-hours, 'hour');
  const days = Math.round(hours / 24);
  if (days < 30) return formatter.format(-days, 'day');
  return new Date(iso).toLocaleDateString(locale);
}

/** 工程的可持久化快照（磁盘 .gproj 与导出的 .gproj 同格式） */
export function entrySnapshot(entry: ProjectEntry): string {
  return JSON.stringify(
    { format: 'cobble-studio', version: 1, project: entry.project, workspaces: entry.workspaces },
    null,
    2,
  );
}

/**
 * 桌面版启动时把工程库与磁盘上的 .gproj 对齐：
 * 磁盘有而本地没有的导入，本地有而磁盘没有的补写，两边都有的取较新的版本。
 */
export async function syncDesktopLibrary(): Promise<boolean> {
  if (!isDesktopApp()) return false;
  let changed = false;
  try {
    const ids = new Set(await listNativeProjectIds());
    const library = loadLibrary();
    for (const id of ids) {
      try {
        const parsed = parseProjectFile(await readNativeProject(id));
        if (!parsed.ok) continue;
        const { project, workspaces } = parsed.value;
        const existing = library.projects.find((entry) => entry.id === id);
        if (!existing) {
          library.projects.push({
            id,
            name: project.meta.name,
            createdAt: project.meta.updatedAt,
            updatedAt: project.meta.updatedAt,
            project,
            workspaces,
          });
          changed = true;
        } else if (project.meta.updatedAt > existing.updatedAt) {
          existing.name = project.meta.name || existing.name;
          existing.updatedAt = project.meta.updatedAt;
          existing.project = project;
          existing.workspaces = workspaces;
          changed = true;
        }
      } catch {
        // 单个文件读失败不影响其它工程
      }
    }
    if (changed) saveLibrary(library);
    for (const entry of library.projects) {
      if (!ids.has(entry.id)) {
        try {
          await writeNativeProject(entry.id, entrySnapshot(entry));
        } catch {
          // 首次补写失败时下次启动再试
        }
      }
    }
  } catch {
    return false;
  }
  return changed;
}

/** 桌面版：把一条工程写回磁盘（自动保存与手动操作共用） */
export async function mirrorNative(entry: ProjectEntry | null): Promise<void> {
  if (!entry || !isDesktopApp()) return;
  try {
    await writeNativeProject(entry.id, entrySnapshot(entry));
  } catch {
    // 磁盘写入失败不影响编辑，localStorage 里仍有副本
  }
}

/** 桌面版：删除磁盘上的工程文件 */
export async function deleteNative(projectId: string): Promise<void> {
  if (!isDesktopApp()) return;
  try {
    await deleteNativeProject(projectId);
  } catch {
    // 文件不存在或权限不足时忽略
  }
}
