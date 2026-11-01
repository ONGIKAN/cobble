// 构建独立游戏播放器 EXE：
// 1) 复用单文件导出的 IIFE 播放器 bundle；
// 2) 组装 Tauri 播放器前端（dist/index.html）；
// 3) cargo/tauri 构建 exe（不打包安装器）；
// 4) 把 exe 复制到桌面编辑器的 resources，随安装包分发。
// 用法：node tools/build-game-player.mjs
import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const editorDir = path.join(root, 'apps', 'editor');
const playerDir = path.join(root, 'apps', 'game-player');
const distDir = path.join(playerDir, 'dist');
const resourcesDir = path.join(root, 'apps', 'desktop', 'src-tauri', 'resources');

console.log('[game-player] building player bundle…');
execSync('node tools/build-standalone.mjs', { stdio: 'inherit', cwd: root });

const bundleSource = path.join(editorDir, 'dist-standalone', 'cobbox-player.js');
if (!existsSync(bundleSource)) throw new Error(`missing ${bundleSource}`);
mkdirSync(distDir, { recursive: true });
copyFileSync(bundleSource, path.join(distDir, 'cobbox-player.js'));

const indexHtml = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CobBox Game</title>
    <style>
      :root { color-scheme: dark; }
      html, body { margin: 0; height: 100%; background: #0d0f12; overflow: hidden; }
      #stage { position: absolute; inset: 0; }
      #hud { position: absolute; left: 12px; top: 12px; display: flex; flex-wrap: wrap; gap: 8px; z-index: 10; }
      .hud-var { display: inline-flex; align-items: baseline; gap: 6px; padding: 2px 8px; background: rgba(13, 15, 18, 0.82); border: 1px solid #3a3f4a; color: #f2efe6; font: 12px/1.6 "Segoe UI", "Microsoft YaHei", sans-serif; }
      .hud-name { opacity: 0.72; }
      .hud-value { font-weight: 700; color: #c9b8ff; }
      #error { position: absolute; inset: 0; display: none; align-items: center; justify-content: center; color: #f2efe6; font: 14px/1.8 "Segoe UI", "Microsoft YaHei", sans-serif; text-align: center; padding: 32px; }
    </style>
  </head>
  <body>
    <div id="stage"></div>
    <div id="hud"></div>
    <div id="error"></div>
    <script id="cobbox-project" type="application/json">{}</script>
    <script>
      (async () => {
        try {
          const payload = await window.__TAURI__.core.invoke('load_game');
          document.getElementById('cobbox-project').textContent = payload;
        } catch (error) {
          const node = document.getElementById('error');
          node.style.display = 'flex';
          node.textContent = '无法读取游戏数据：' + String(error);
          return;
        }
        const script = document.createElement('script');
        script.src = './cobbox-player.js';
        document.body.appendChild(script);
      })();
    </script>
  </body>
</html>
`;
writeFileSync(path.join(distDir, 'index.html'), indexHtml, 'utf8');

console.log('[game-player] building exe (tauri build --no-bundle)…');
execSync('cmd /c "tools\\\\build-tauri.bat player"', { stdio: 'inherit', cwd: root });

const exePath = path.join(playerDir, 'src-tauri', 'target', 'release', 'cobbox-game-player.exe');
if (!existsSync(exePath)) throw new Error(`missing ${exePath}`);
mkdirSync(resourcesDir, { recursive: true });
const target = path.join(resourcesDir, 'cobbox-game-player.exe');
copyFileSync(exePath, target);
const size = readFileSync(target).length;
console.log(`[game-player] wrote ${path.relative(root, target)} (${(size / 1024 / 1024).toFixed(2)} MB)`);

// 供本地验证：把模板 exe 复制到 dist-release（可选）
const releaseDir = path.join(root, 'dist-release');
mkdirSync(releaseDir, { recursive: true });
copyFileSync(exePath, path.join(releaseDir, 'CobBoxPlayer-template.exe'));
console.log('[game-player] done');
