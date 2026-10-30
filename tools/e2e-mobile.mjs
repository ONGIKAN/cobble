// 触屏（手机 / 平板）冒烟：验证紧凑布局、底部标签、方向键、积木页与属性页。
// 用法：node tools/e2e-mobile.mjs（需要 dev server 已在 127.0.0.1:5183 运行）
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5183/';
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

mkdirSync('tools/shots', { recursive: true });

const browser = await chromium.launch({ channel: 'msedge' });

async function runtimeState(page) {
  return page.evaluate(() => {
    const frame = document.querySelector('[data-testid="stage-iframe"]');
    const runtime = frame?.contentWindow?.__cobbleRuntime;
    if (!runtime) return null;
    const cat = runtime.getSpriteState('sprite_cat');
    const vars = runtime.getVariables();
    return { cat, score: vars.find((entry) => entry.id === 'var_score')?.value };
  });
}

async function holdDpad(page, direction, ms) {
  await page.evaluate((dir) => {
    const button = document.querySelector(`[data-testid="dpad-${dir}"]`);
    button?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7, pointerType: 'touch' }));
  }, direction);
  await page.waitForTimeout(ms);
  await page.evaluate((dir) => {
    const button = document.querySelector(`[data-testid="dpad-${dir}"]`);
    button?.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7, pointerType: 'touch' }));
  }, direction);
  await page.waitForTimeout(150);
}

async function runPhone() {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);

  check('phone boots', (await page.locator('[data-testid="stage-iframe"]').count()) === 1);
  check('compact layout', (await page.locator('.layout-compact').count()) === 1);
  check('4 bottom tabs', (await page.locator('.mobile-tab').count()) === 4);
  check('dpad visible', await page.locator('[data-testid="dpad"]').isVisible());
  check('phone save/open buttons', await page.locator('[data-testid="m-save-project"]').isVisible() && (await page.locator('[data-testid="m-open-project"]').isVisible()));
  check('phone topbar files hidden', !(await page.locator('[data-testid="save-project"]').isVisible()));

  const before = await runtimeState(page);
  check('phone runtime running', Boolean(before?.cat));

  await holdDpad(page, 'right', 450);
  const after = await runtimeState(page);
  check('dpad right moves cat', Boolean(after && before && after.cat.x > before.cat.x), `x ${before?.cat.x} → ${after?.cat.x}`);

  check('sprite strip visible', await page.locator('[data-testid="sprite-strip"]').isVisible());
  await page.screenshot({ path: 'tools/shots/m-phone-stage.png' });

  // 舞台页快捷条切换角色 → 属性页应显示金币
  await page.locator('[data-testid="chip-sprite_coin"]').tap();
  await page.waitForTimeout(300);
  await page.locator('[data-testid="tab-props"]').tap();
  await page.waitForTimeout(400);
  const selectedName = await page.locator('.inspector input').first().inputValue();
  check('sprite strip selects coin', selectedName === '金币', `name=${selectedName}`);
  await page.locator('[data-testid="tab-stage"]').tap();
  await page.waitForTimeout(300);
  await page.locator('[data-testid="chip-sprite_cat"]').tap();
  await page.waitForTimeout(300);

  await page.locator('[data-testid="tab-blocks"]').tap();
  await page.waitForTimeout(1200);
  check('blocks tab shows workspace', await page.locator('[data-testid="blocks-host"] .blocklySvg').isVisible());
  const blockCount = await page.locator('[data-testid="blocks-host"] .blocklyBlockCanvas .blocklyDraggable').count();
  check('blocks rendered', blockCount > 5, `${blockCount} blocks`);
  await page.screenshot({ path: 'tools/shots/m-phone-blocks.png' });

  await page.locator('[data-testid="tab-sprites"]').tap();
  await page.waitForTimeout(500);
  check('sprites tab shows 2 sprites', (await page.locator('.sprite-card').count()) === 2);
  await page.screenshot({ path: 'tools/shots/m-phone-sprites.png' });

  await page.locator('[data-testid="tab-props"]').tap();
  await page.waitForTimeout(500);
  check('props tab shows inspector', (await page.locator('.inspector input').count()) >= 4);
  await page.screenshot({ path: 'tools/shots/m-phone-props.png' });

  await page.locator('[data-testid="tab-stage"]').tap();
  await page.waitForTimeout(400);
  await page.locator('[data-testid="theme-toggle"]').tap();
  await page.waitForTimeout(500);
  check('theme toggles on phone', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'light');
  await page.screenshot({ path: 'tools/shots/m-phone-light.png' });

  check('phone no console errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await context.close();
}

async function runTablet() {
  const context = await browser.newContext({
    viewport: { width: 820, height: 1180 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);

  check('tablet compact layout', (await page.locator('.layout-compact').count()) === 1);
  check('tablet stage running', Boolean(await runtimeState(page)));
  check('tablet dpad visible', await page.locator('[data-testid="dpad"]').isVisible());
  await page.screenshot({ path: 'tools/shots/m-tablet-stage.png' });

  await page.locator('[data-testid="tab-blocks"]').tap();
  await page.waitForTimeout(1200);
  check('tablet blocks rendered', (await page.locator('[data-testid="blocks-host"] .blocklySvg').isVisible()));
  await page.screenshot({ path: 'tools/shots/m-tablet-blocks.png' });

  check('tablet no console errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await context.close();
}

await runPhone();
await runTablet();
await browser.close();

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
