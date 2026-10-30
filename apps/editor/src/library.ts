import { createDemoProject, type ProjectDoc } from '@cobble/project';

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
    name: name ?? project.meta.name,
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
