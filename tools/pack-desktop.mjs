// 构建 Windows 便携 EXE：先构建编辑器，再把 dist 拷进 Electron 壳，最后用 electron-builder 打包。
// 用法：node tools/pack-desktop.mjs [--skip-build]
import { cpSync, existsSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const skipBuild = process.argv.includes('--skip-build');
const desktopDir = path.join(root, 'apps', 'desktop');
const dist = path.join(root, 'apps', 'editor', 'dist');
const target = path.join(desktopDir, 'editor-dist');

if (!skipBuild) {
  console.log('[pack-desktop] building editor…');
  execSync('npm run build', { stdio: 'inherit', cwd: root });
}
if (!existsSync(path.join(dist, 'index.html'))) {
  console.error('[pack-desktop] apps/editor/dist/index.html missing — run the build first');
  process.exit(1);
}
rmSync(target, { recursive: true, force: true });
cpSync(dist, target, { recursive: true });
console.log('[pack-desktop] editor dist copied → apps/desktop/editor-dist');

console.log('[pack-desktop] running electron-builder…');
execSync('npx electron-builder --win portable --x64', { stdio: 'inherit', cwd: desktopDir });
console.log('[pack-desktop] done — see apps/desktop/release/');
