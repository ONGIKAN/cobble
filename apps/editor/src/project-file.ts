import { parseProject, type ProjectDoc } from '@cobble/project';

/** .gproj 文件格式：外层包一层元信息，便于以后演进；老文件（裸 ProjectDoc）也能打开 */
export interface ProjectFileShape {
  format: 'cobble-studio';
  version: 1;
  project: ProjectDoc;
  workspaces: Record<string, unknown>;
}

export interface OpenedProject {
  project: ProjectDoc;
  workspaces: Record<string, unknown>;
}

export type OpenResult = { ok: true; value: OpenedProject } | { ok: false; error: string };

/** 由工程名生成文件名：保留字母数字（含中文），其余折叠成连字符 */
export function projectFileName(project: ProjectDoc): string {
  const base =
    project.meta.name
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || 'untitled';
  return `${base}.gproj`;
}

export function serializeProject(project: ProjectDoc, workspaces: Record<string, unknown>): string {
  const doc: ProjectFileShape = {
    format: 'cobble-studio',
    version: 1,
    // 积木数据放在 workspaces 里，工程文档里的 scripts 不再重复存
    project: { ...project, meta: { ...project.meta, updatedAt: new Date().toISOString() }, scripts: {} },
    workspaces,
  };
  return JSON.stringify(doc, null, 2);
}

export function downloadProject(project: ProjectDoc, workspaces: Record<string, unknown>): void {
  const blob = new Blob([serializeProject(project, workspaces)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = projectFileName(project);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseProjectFile(text: string): OpenResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'file is not valid JSON' };
  }
  if (!isRecord(raw)) return { ok: false, error: 'file is not a project' };
  const wrapped = 'format' in raw || 'project' in raw;
  const parsed = parseProject(wrapped ? raw.project : raw);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const workspaces = wrapped && isRecord(raw.workspaces) ? raw.workspaces : {};
  return { ok: true, value: { project: { ...parsed.project, scripts: {} }, workspaces } };
}

export async function readProjectFile(file: File): Promise<OpenResult> {
  return parseProjectFile(await file.text());
}
