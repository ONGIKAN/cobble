import { compileProject } from '@cobble/blocks';
import type { ProjectDoc } from '@cobble/project';

function slug(name: string): string {
  const cleaned = name
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'cobble-game';
}

/**
 * 把当前工程导出成一个单文件 HTML5：内联播放器 + 编译后的运行时指令 + 素材 dataURL。
 * 模板 apps/editor/public/standalone-player.html 由 tools/build-standalone.mjs 预先生成。
 */
export async function downloadStandaloneHtml(
  project: ProjectDoc,
  workspaces: Record<string, unknown>,
): Promise<void> {
  const compiled = compileProject(project, workspaces);
  const base = import.meta.env.BASE_URL;
  const response = await fetch(`${base}standalone-player.html`);
  if (!response.ok) {
    throw new Error(`standalone template ${response.status}`);
  }
  const template = await response.text();
  const json = JSON.stringify(compiled).replaceAll('<', '\\u003c');
  const html = template
    .replaceAll('__COBBLE_PROJECT__', json)
    .replaceAll('__COBBLE_TITLE__', project.meta.name);

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slug(project.meta.name)}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
