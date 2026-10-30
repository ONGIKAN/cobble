// 构建单文件导出模板：把 IIFE 播放器包内联进 tools/standalone/template.html，
// 产出 apps/editor/public/standalone-player.html（导出时只替换工程 JSON 与标题）。
// 用法：node tools/build-standalone.mjs
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const editorDir = path.join(root, 'apps', 'editor');

console.log('[standalone] building IIFE player bundle…');
execSync('npx vite build -c vite.standalone.config.ts', { stdio: 'inherit', cwd: editorDir });

const bundlePath = path.join(editorDir, 'dist-standalone', 'cobble-player.js');
const templatePath = path.join(root, 'tools', 'standalone', 'template.html');
const outPath = path.join(editorDir, 'public', 'standalone-player.html');

let bundle = readFileSync(bundlePath, 'utf8');
// 内联进 <script> 时避免提前闭合；`<\/` 在 JS 字符串/正则里等价于 `</`。
bundle = bundle.replaceAll('</script', '<\\/script');

const template = readFileSync(templatePath, 'utf8');
const html = template.replace('__COBBLE_PLAYER_JS__', () => bundle);
writeFileSync(outPath, html, 'utf8');

const sizeMb = Buffer.byteLength(html) / 1024 / 1024;
console.log(`[standalone] wrote ${path.relative(root, outPath)} (${sizeMb.toFixed(2)} MB)`);
