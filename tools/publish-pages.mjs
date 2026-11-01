// 组装 GitHub Pages 产物（官网 + 在线演示），并可选推送到 gh-pages。
//
// 用法：
//   node tools/publish-pages.mjs                       # 构建两个通道，便于本地验证
//   node tools/publish-pages.mjs --channel beta        # 只重建 beta 通道（稳定版 demo 保持现状）
//   node tools/publish-pages.mjs --channel stable      # 只重建稳定版通道（beta 保持现状）
//   GH_TOKEN=... node tools/publish-pages.mjs --push
//
// 通道约定：常规小版本先进 beta（/demo-beta/，标记「实验版」），验证后再发 stable（/demo/，标记「稳定版」）。
//
// 产物结构：
//   pages-dist/index.html     官网（site/index.html）
//   pages-dist/demo/...       编辑器演示（apps/editor/dist）
import { cpSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync, execSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const REPO = process.env.REPO_SLUG ?? 'ONGIKAN/cobbox';
const PAGES_BRANCH = process.env.PAGES_BRANCH ?? 'gh-pages';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const git = 'git';

const root = resolve('.');
const staging = resolve('pages-dist');
const backupDemo = resolve('.pages-demo-backup');
const backupBeta = resolve('.pages-demo-beta-backup');
const site = resolve('site');
const dist = resolve('apps/editor/dist');

const channelIndex = process.argv.indexOf('--channel');
const channel = channelIndex === -1 ? 'both' : (process.argv[channelIndex + 1] ?? 'both');
if (!['both', 'stable', 'beta', 'site'].includes(channel)) {
  throw new Error(`--channel must be one of both | stable | beta | site (got "${channel}")`);
}
const buildsStable = channel === 'both' || channel === 'stable';
const buildsBeta = channel === 'both' || channel === 'beta';
const keepStable = !buildsStable && existsSync(join(staging, 'demo'));
const keepBeta = !buildsBeta && existsSync(join(staging, 'demo-beta'));

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

// 1) 需要重建的通道先保留旧产物，再构建编辑器（官网是纯静态，无需构建）
if (keepStable) {
  console.log('== keep previous stable demo ==');
  rmSync(backupDemo, { recursive: true, force: true });
  renameSync(join(staging, 'demo'), backupDemo);
}
if (keepBeta) {
  console.log('== keep previous beta demo ==');
  rmSync(backupBeta, { recursive: true, force: true });
  renameSync(join(staging, 'demo-beta'), backupBeta);
}

if (buildsStable) {
  console.log('== build standalone player ==');
  execSync('npm run build:standalone', { stdio: 'inherit', cwd: root });

  console.log('== build editor (stable) ==');
  execSync('npm --workspace @cobbox/editor run build', {
    stdio: 'inherit',
    cwd: root,
    env: { ...process.env, VITE_CHANNEL: 'stable' },
  });
  if (!existsSync(dist)) {
    throw new Error(`missing build output: ${dist}`);
  }
}

// 2) 组装 staging
console.log('== assemble pages-dist ==');
rmSync(staging, { recursive: true, force: true });
mkdirSync(staging, { recursive: true });
cpSync(site, staging, { recursive: true });
writeFileSync(join(staging, '.nojekyll'), '');

if (buildsStable) {
  cpSync(dist, join(staging, 'demo'), { recursive: true });
} else if (existsSync(backupDemo)) {
  cpSync(backupDemo, join(staging, 'demo'), { recursive: true });
  rmSync(backupDemo, { recursive: true, force: true });
}
writeFileSync(join(staging, 'demo', '.nojekyll'), '');

if (buildsBeta) {
  console.log('== build editor (beta) ==');
  execSync('npm --workspace @cobbox/editor run build', {
    stdio: 'inherit',
    cwd: root,
    env: { ...process.env, VITE_CHANNEL: 'beta' },
  });
  cpSync(dist, join(staging, 'demo-beta'), { recursive: true });
} else if (existsSync(backupBeta)) {
  cpSync(backupBeta, join(staging, 'demo-beta'), { recursive: true });
  rmSync(backupBeta, { recursive: true, force: true });
}
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
    ['-c', `user.name=${REPO.split('/')[0]}`, '-c', `user.email=${REPO.split('/')[0]}@users.noreply.github.com`, 'commit', '-m', 'site: publish CobBox landing page + live demo'],
    { cwd: staging },
  );
  run(git, ['push', '--force', remote, `HEAD:${PAGES_BRANCH}`], { cwd: staging, capture: true });
  console.log(`pushed ${staging} -> ${REPO}#${PAGES_BRANCH}`);
}

console.log('== done ==');
console.log('preview: node tools/serve.mjs --port 8133 --root pages-dist');
console.log(`pages:   https://${REPO.split('/')[0].toLowerCase()}.github.io/${REPO.split('/')[1]}/`);
