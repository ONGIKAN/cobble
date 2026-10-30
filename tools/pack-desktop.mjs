// 构建 Windows 桌面版：编辑器构建 -> Tauri release -> NSIS 安装包 + 便携 exe
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const target = path.join(root, 'apps/desktop/src-tauri/target/release');
const out = path.join(root, 'dist-release');

console.log(`== build editor (v${version}) ==`);
execSync('npm run build', { stdio: 'inherit', cwd: root });

console.log('== build tauri bundle ==');
execSync('tools\\build-tauri.bat tauri --bundles nsis', {
  stdio: 'inherit',
  cwd: root,
  shell: 'cmd.exe',
});

mkdirSync(out, { recursive: true });

const exe = path.join(target, 'cobble-studio.exe');
if (!existsSync(exe)) throw new Error(`missing exe: ${exe}`);
const portable = path.join(out, `CobbleStudio-${version}-portable.exe`);
copyFileSync(exe, portable);

const nsisDir = path.join(target, 'bundle/nsis');
const installers = [];
if (existsSync(nsisDir)) {
  for (const file of readdirSync(nsisDir)) {
    if (!file.endsWith('.exe')) continue;
    copyFileSync(path.join(nsisDir, file), path.join(out, file));
    installers.push(file);
  }
}

console.log('== artifacts ==');
console.log(`portable:  ${portable}`);
for (const file of installers) console.log(`installer: ${path.join(out, file)}`);
console.log('注意：便携 exe 请放在纯英文路径下运行（WebView2 在含中文的目录里可能无法创建窗口）。');
