// 验证 GitHub Pages 产物（官网 + 在线演示 + 三页互链），本地先跑通再推送。
// 用法：node tools/serve.mjs --port 8133 --root pages-dist  然后 node tools/e2e-pages.mjs
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const BASE = process.env.PAGES_BASE ?? 'http://127.0.0.1:8133';
const SITE = `${BASE}/`;
const DEMO = `${BASE}/demo/`;
const REPO = 'https://github.com/ONGIKAN/cobble';
const SHOTS = 'tools/shots';
mkdirSync(SHOTS, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch({ channel: 'msedge' });

const errors = [];
const watch = (page, label) => {
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`[${label}] ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`[${label}] ${error.message}`));
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText ?? '';
    if (failure.includes('ERR_ABORTED')) return;
    errors.push(`[${label}] request failed: ${request.url()} ${failure}`);
  });
};

// ---------- 官网 ----------
const site = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const sitePage = await site.newPage();
watch(sitePage, 'site');
await sitePage.goto(SITE, { waitUntil: 'networkidle' });

check('site: title', (await sitePage.title()).includes('Cobble'), await sitePage.title());
check('site: hero heading', (await sitePage.locator('h1').innerText()).length > 4);
const imgOk = await sitePage.locator('img').evaluateAll((nodes) => nodes.every((node) => node.naturalWidth > 0));
check('site: screenshots loaded', imgOk);
const demoHref = await sitePage.locator('a[href="./demo/"]').first().getAttribute('href');
check('site: links to demo', demoHref === './demo/', String(demoHref));
check('site: links to repo', (await sitePage.locator(`a[href="${REPO}"]`).count()) > 0);
await sitePage.screenshot({ path: `${SHOTS}/site-zh.png` });

await sitePage.locator('#lang-toggle').click();
await sitePage.waitForTimeout(150);
check('site: switch to en', (await sitePage.evaluate(() => document.documentElement.lang)) === 'en');
check('site: en title', (await sitePage.title()).includes('Cobble'));
await sitePage.screenshot({ path: `${SHOTS}/site-en.png` });

// 官网 -> 演示（点击真实跳转，验证相对路径）
await sitePage.locator('a[href="./demo/"]').first().click();
await sitePage.waitForLoadState('networkidle');
check('site -> demo navigation', sitePage.url().startsWith(DEMO), sitePage.url());
await sitePage.waitForSelector('[data-testid="run"]');
check('demo: editor boots from site', true);

// 演示页互链
const siteLink = sitePage.locator('[data-testid="site-link"]').first();
const repoLink = sitePage.locator('[data-testid="repo-link"]').first();
check('demo: site link href', (await siteLink.getAttribute('href')) === 'https://ongikan.github.io/cobble/');
check('demo: repo link href', (await repoLink.getAttribute('href')) === REPO);
check('demo: status bar links', (await sitePage.locator('[data-testid="status-site-link"]').count()) > 0);

// 演示运行（调试句柄挂在 player iframe 的 window 上）
const runtimeState = async (page) => {
  const frame = page.frames().find((item) => item.url().includes('player.html'));
  if (!frame) return null;
  return frame.evaluate(() => {
    const runtime = window.__cobbleRuntime;
    return runtime ? { running: runtime.isRunning } : null;
  });
};

await sitePage.locator('[data-testid="run"]').click();
await sitePage.waitForTimeout(1200);
const state = await runtimeState(sitePage);
check('demo: runtime running', state?.running === true, JSON.stringify(state));
await sitePage.screenshot({ path: `${SHOTS}/pages-demo.png` });

// 演示 -> 官网（链接存在且可点）
check('demo: site link visible', await siteLink.isVisible());
await site.close();

// ---------- 手机官网 ----------
const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});
const phone = await mobile.newPage();
watch(phone, 'phone');
await phone.goto(SITE, { waitUntil: 'networkidle' });
const overflow = await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
check('mobile site: no horizontal overflow', overflow);
await phone.screenshot({ path: `${SHOTS}/site-phone.png`, fullPage: false });
await phone.goto(DEMO, { waitUntil: 'networkidle' });
await phone.waitForSelector('[data-testid="run"]');
check('mobile demo: compact tabs', (await phone.locator('[data-testid="tab-blocks"]').count()) > 0);
await phone.locator('[data-testid="run"]').click();
await phone.waitForTimeout(1000);
check('mobile demo: runtime running', (await runtimeState(phone))?.running === true);
await phone.screenshot({ path: `${SHOTS}/pages-demo-phone.png` });
await mobile.close();

// ---------- 资源与报错 ----------
const cssResponse = await fetch(`${BASE}/style.css`);
check('style.css served', cssResponse.status === 200, String(cssResponse.status));

check('no console errors / failed requests', errors.length === 0, errors.slice(0, 5).join(' | '));

await browser.close();

const failed = results.filter((entry) => !entry.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) process.exitCode = 1;
