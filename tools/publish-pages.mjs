// 组装 GitHub Pages 产物（官网 + 在线演示），并可选推送到 gh-pages。
//
// 用法：
//   node tools/publish-pages.mjs               # 只构建 pages-dist，便于本地验证
//   GH_TOKEN=... node tools/publish-pages.mjs --push
//
// 产物结构：
//   pages-dist/index.html     官网（site/index.html）
//   pages-dist/demo/...       编辑器演示（apps/editor/dist）
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync, execSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const REPO = process.env.REPO_SLUG ?? 'ONGIKAN/cobble';
const PAGES_BRANCH = process.env.PAGES_BRANCH ?? 'gh-pages';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const git = 'git';

const root = resolve('.');
const staging = resolve('pages-dist');
const site = resolve('site');
const dist = resolve('apps/editor/dist');

const sanitize = (text) => String(text).replace(/x-access-token:[^@]+@/g, 'x-access-token:***@');

const run = (command, args, options = {}) => {
  const { capture = false, ...rest } = options;
  console.log(`$ ${sanitize(`${command} ${args.join(' ')}`)}`);
  if (!capture) {
    execFileSync(command, args, { stdio: 'inherit', ...rest });
    return;
  }
  try {
    process.stdout.write(sanitize(execFileSync(command, args, { ...rest, stdio: ['ignore', 'pipe', 'pipe'] }).toString()));
  } catch (error) {
    if (error?.stdout) process.stdout.write(sanitize(error.stdout.toString()));
    if (error?.stderr) process.stderr.write(sanitize(error.stderr.toString()));
    throw error;
  }
};

// 1) 构建编辑器（官网是纯静态，无需构建）
//    稳定版 -> pages-dist/demo，测试版 -> pages-dist/demo-beta（VITE_CHANNEL=beta）
console.log('== build standalone player ==');
execSync('npm run build:standalone', { stdio: 'inherit', cwd: root });

console.log('== build editor (stable) ==');
execSync('npm --workspace @cobble/editor run build', {
  stdio: 'inherit',
  cwd: root,
  env: { ...process.env, VITE_CHANNEL: 'stable' },
});
if (!existsSync(dist)) {
  throw new Error(`missing build output: ${dist}`);
}

// 2) 组装 staging
console.log('== assemble pages-dist ==');
rmSync(staging, { recursive: true, force: true });
mkdirSync(staging, { recursive: true });
cpSync(site, staging, { recursive: true });
cpSync(dist, join(staging, 'demo'), { recursive: true });
writeFileSync(join(staging, '.nojekyll'), '');
writeFileSync(join(staging, 'demo', '.nojekyll'), '');

console.log('== build editor (beta) ==');
execSync('npm --workspace @cobble/editor run build', {
  stdio: 'inherit',
  cwd: root,
  env: { ...process.env, VITE_CHANNEL: 'beta' },
});
cpSync(dist, join(staging, 'demo-beta'), { recursive: true });
writeFileSync(join(staging, 'demo-beta', '.nojekyll'), '');

const walk = (dir) => {
  const entries = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) entries.push(...walk(full));
    else entries.push({ full, size: stat.size });
  }
  return entries;
};

const files = walk(staging);
const total = files.reduce((sum, file) => sum + file.size, 0);
console.log(`files: ${files.length}, total: ${(total / 1024 / 1024).toFixed(2)} MB`);
for (const file of files.filter((entry) => entry.size > 300 * 1024)) {
  console.log(`  ${(file.size / 1024).toFixed(0)} KB  ${file.full.slice(staging.length + 1)}`);
}

// 3) 可选推送
if (process.argv.includes('--push')) {
  const token = process.env.GH_TOKEN;
  if (!token) throw new Error('GH_TOKEN is required for --push');
  const remote = `https://x-access-token:${token}@github.com/${REPO}.git`;

  if (!existsSync(join(staging, '.git'))) {
    run(git, ['init', '-b', 'main'], { cwd: staging });
  }
  run(git, ['add', '-A'], { cwd: staging });
  run(
    git,
    ['-c', `user.name=${REPO.split('/')[0]}`, '-c', `user.email=${REPO.split('/')[0]}@users.noreply.github.com`, 'commit', '-m', 'site: publish Cobble landing page + live demo'],
    { cwd: staging },
  );
  run(git, ['push', '--force', remote, `HEAD:${PAGES_BRANCH}`], { cwd: staging, capture: true });
  console.log(`pushed ${staging} -> ${REPO}#${PAGES_BRANCH}`);
}

console.log('== done ==');
console.log('preview: node tools/serve.mjs --port 8133 --root pages-dist');
console.log(`pages:   https://${REPO.split('/')[0].toLowerCase()}.github.io/${REPO.split('/')[1]}/`);
