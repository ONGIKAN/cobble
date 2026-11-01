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
    const runtime = frame?.contentWindow?.__cobboxRuntime;
    if (!runtime) return null;
    const snake = runtime.getSpriteState('sprite_snake_head');
    const vars = runtime.getVariables();
    return { snake, score: vars.find((entry) => entry.id === 'var_score')?.value };
  });
}

async function holdJoystick(page, direction, ms) {
  const box = await page.locator('[data-testid="pad-joystick"]').boundingBox();
  if (!box) return;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const dx = direction === 'left' ? -box.width * 0.45 : direction === 'right' ? box.width * 0.45 : 0;
  const dy = direction === 'up' ? -box.height * 0.45 : direction === 'down' ? box.height * 0.45 : 0;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + dx, cy + dy, { steps: 6 });
  await page.waitForTimeout(ms);
  await page.mouse.up();
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

  await page.waitForSelector('[data-testid="hub-new"]', { timeout: 15000 });
  check('phone hub visible', (await page.locator('[data-testid^="project-card-"]').count()) >= 1);
  await page.screenshot({ path: 'tools/shots/m-phone-hub.png' });
  await page.locator('[data-testid^="project-open-"]').first().click();
  await page.waitForTimeout(2200);

  check('phone boots', (await page.locator('[data-testid="stage-iframe"]').count()) === 1);
  check('compact layout', (await page.locator('.layout-compact').count()) === 1);
  check('4 bottom tabs', (await page.locator('.mobile-tab').count()) === 4);
  check('phone edit mode hint', await page.locator('[data-testid="stage-edit-hint"]').isVisible());
  check('phone pad hidden in edit mode', (await page.locator('[data-testid="stage-pad"]').count()) === 0);
  check('phone world canvas visible', await page.locator('[data-testid="world-canvas"]').isVisible());
  check('phone save/open buttons', await page.locator('[data-testid="m-save-project"]').isVisible() && (await page.locator('[data-testid="m-open-project"]').isVisible()) && (await page.locator('[data-testid="m-export-html5"]').isVisible()));
  check('phone topbar files hidden', !(await page.locator('[data-testid="save-project"]').isVisible()));

  // 点「运行」进入运行模式，摇杆才会出现
  await page.getByTestId('run').click();
  await page.waitForTimeout(400);
  check('phone pad visible when running', await page.locator('[data-testid="stage-pad"]').isVisible());
  const before = await runtimeState(page);
  check('phone runtime running', Boolean(before?.snake));

  await holdJoystick(page, 'right', 600);
  const after = await runtimeState(page);
  check('joystick right moves snake', Boolean(after && before && after.snake.x > before.snake.x), `x ${before?.snake.x} → ${after?.snake.x}`);

  // 贪吃蛇模板：摇杆为大号（joystickSize lg）
  const joyBox = await page.locator('[data-testid="pad-joystick"]').boundingBox();
  check('snake large joystick', (joyBox?.width ?? 0) >= 110, `w=${Math.round(joyBox?.width ?? 0)}`);

  check('sprite strip visible', await page.locator('[data-testid="sprite-strip"]').isVisible());
  await page.screenshot({ path: 'tools/shots/m-phone-stage.png' });

  // 舞台页快捷条切换角色 → 属性页应显示苹果
  await page.locator('[data-testid="chip-sprite_apple"]').tap();
  await page.waitForTimeout(300);
  await page.locator('[data-testid="tab-props"]').tap();
  await page.waitForTimeout(400);
  const selectedName = await page.locator('.inspector input').first().inputValue();
  check('sprite strip selects apple', selectedName === '苹果', `name=${selectedName}`);
  await page.locator('[data-testid="tab-stage"]').tap();
  await page.waitForTimeout(300);
  await page.locator('[data-testid="chip-sprite_snake_head"]').tap();
  await page.waitForTimeout(300);

  await page.locator('[data-testid="tab-blocks"]').tap();
  await page.waitForTimeout(1200);
  check('blocks tab shows workspace', await page.locator('[data-testid="blocks-host"] .blocklySvg').isVisible());
  const blockCount = await page.locator('[data-testid="blocks-host"] .blocklyBlockCanvas .blocklyDraggable').count();
  check('blocks rendered', blockCount > 5, `${blockCount} blocks`);
  const sheetHalf = await page.locator('[data-testid="blocks-drawer"]').boundingBox();
  await page.screenshot({ path: 'tools/shots/m-phone-blocks.png' });
  check('blocks drawer from bottom', Boolean(sheetHalf) && sheetHalf.y > 300, `y=${Math.round(sheetHalf?.y ?? 0)}`);
  await page.locator('[data-testid="blocks-drawer-grip"]').tap();
  await page.waitForTimeout(500);
  const sheetFull = await page.locator('[data-testid="blocks-drawer"]').boundingBox();
  check('blocks drawer expands', Boolean(sheetHalf && sheetFull) && sheetFull.height > sheetHalf.height * 1.2, `${Math.round(sheetHalf?.height ?? 0)} -> ${Math.round(sheetFull?.height ?? 0)}`);
  await page.screenshot({ path: 'tools/shots/m-phone-blocks-sheet.png' });
  const sheetOptions = await page.locator('[data-testid="sheet-sprite-select"] option').count();
  check('sheet sprite select lists sprites', sheetOptions >= 3, `${sheetOptions} options`);
  if (!(await page.locator('[data-testid="sheet-stop"]').isDisabled())) {
    await page.locator('[data-testid="sheet-stop"]').tap();
    await page.waitForTimeout(500);
  }
  await page.locator('[data-testid="sheet-run"]').tap();
  await page.waitForTimeout(900);
  check('sheet run starts game', Boolean(await runtimeState(page)));
  await page.locator('[data-testid="sheet-stop"]').tap();
  await page.waitForTimeout(600);
  check('sheet stop returns to canvas', !(await runtimeState(page)));
  await page.locator('[data-testid="blocks-drawer-close"]').tap();
  await page.waitForTimeout(400);
  check('blocks drawer closes', (await page.locator('[data-testid="blocks-drawer"]').count()) === 0);

  await page.locator('[data-testid="tab-sprites"]').tap();
  await page.waitForTimeout(500);
  check('sprites tab shows 10 sprites', (await page.locator('.sprite-card').count()) === 10, '10 sprites');
  await page.screenshot({ path: 'tools/shots/m-phone-sprites.png' });

  await page.locator('[data-testid="add-sprite"]').tap();
  await page.waitForTimeout(500);
  check('phone add sprite', (await page.locator('.sprite-card').count()) === 11, '11 sprites after add');
  await page.locator('[data-testid="tab-props"]').tap();
  await page.waitForTimeout(400);
  check('phone costume upload visible', await page.locator('[data-testid="costume-add-input"]').count() === 1);
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('[data-testid="delete-sprite"]').tap();
  await page.waitForTimeout(500);
  await page.locator('[data-testid="tab-sprites"]').tap();
  await page.waitForTimeout(400);
  check('phone delete sprite', (await page.locator('.sprite-card').count()) === 10, 'sprites back to 10');

  await page.locator('[data-testid="tab-stage"]').tap();
  await page.waitForTimeout(400);
  check('phone stage settings visible', await page.locator('[data-testid="stage-settings-toggle"]').isVisible());
  await page.locator('[data-testid="stage-settings-toggle"]').tap();
  await page.waitForTimeout(300);
  check('phone stage settings panel', await page.locator('[data-testid="stage-background"]').isVisible());
  await page.locator('[data-testid="stage-settings-toggle"]').tap();
  await page.waitForTimeout(200);

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

  await page.locator('[data-testid="tab-sprites"]').tap();
  await page.waitForTimeout(400);
  const addGroupBtn = page.locator('[data-testid="add-group"]').first();
  await addGroupBtn.tap();
  await page.waitForTimeout(400);
  const phoneGroups = await page.locator('[data-testid^="sprite-group-"]').count();
  check('phone sprite group created', phoneGroups >= 1, `${phoneGroups} group(s)`);
  await page.screenshot({ path: 'tools/shots/m-phone-groups.png' });
  const spritesBeforeAsset = await page.locator('.sprite-card').count();
  await page.locator('[data-testid="tab-stage"]').tap();
  await page.waitForTimeout(300);
  const libraryButton = await page.locator('[data-testid="m-asset-library"]').isVisible();
  await page.locator('[data-testid="m-asset-library"]').tap();
  await page.waitForTimeout(500);
  const librarySheet = await page.locator('[data-testid="asset-library"]').isVisible();
  await page.screenshot({ path: 'tools/shots/m-phone-asset-library.png' });
  await page.locator('[data-testid="asset-card-star"]').tap();
  await page.waitForTimeout(600);
  await page.locator('[data-testid="asset-library-close"]').tap();
  await page.waitForTimeout(300);
  await page.locator('[data-testid="tab-sprites"]').tap();
  await page.waitForTimeout(400);
  const spritesAfterAsset = await page.locator('.sprite-card').count();
  check(
    'phone asset library adds sprite',
    libraryButton && librarySheet && spritesAfterAsset === spritesBeforeAsset + 1,
    `btn=${libraryButton} sheet=${librarySheet} ${spritesBeforeAsset}->${spritesAfterAsset}`,
  );
  await page.locator('[data-testid="tab-stage"]').tap();
  await page.waitForTimeout(300);

  check('phone uses compact tabs without splitters', (await page.locator('.pane-splitter').count()) === 0);
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
  await page.waitForSelector('[data-testid="hub-new"]', { timeout: 15000 });
  await page.locator('[data-testid^="project-open-"]').first().click();
  await page.waitForTimeout(2200);

  check('tablet compact layout', (await page.locator('.layout-compact').count()) === 1);
  await page.getByTestId('run').click();
  await page.waitForTimeout(400);
  check('tablet stage running', Boolean(await runtimeState(page)));
  check('tablet pad visible', await page.locator('[data-testid="stage-pad"]').isVisible());
  await page.screenshot({ path: 'tools/shots/m-tablet-stage.png' });

  await page.locator('[data-testid="tab-blocks"]').tap();
  await page.waitForTimeout(1200);
  check('tablet blocks rendered', (await page.locator('[data-testid="blocks-host"] .blocklySvg').isVisible()));
  check('tablet blocks drawer', await page.locator('[data-testid="blocks-drawer"]').isVisible());
  await page.screenshot({ path: 'tools/shots/m-tablet-blocks.png' });

  await page.locator('[data-testid="tab-stage"]').tap();
  await page.waitForTimeout(300);
  check('tablet new project entry', await page.locator('[data-testid="m-new-project"]').isVisible());
  check('tablet asset library entry', await page.locator('[data-testid="m-asset-library"]').isVisible());
  await page.locator('[data-testid="m-new-project"]').tap();
  await page.waitForTimeout(600);
  check('tablet template dialog', await page.locator('[data-testid="new-project-dialog"]').isVisible());
  await page.locator('.modal-close').tap();
  await page.waitForTimeout(300);

  // 贪吃蛇模板：大号摇杆 + 直接触摸模式切换（v0.13.0）
  page.once('dialog', (dialog) => void dialog.accept());
  await page.locator('[data-testid="m-new-project"]').tap();
  await page.waitForTimeout(400);
  await page.locator('[data-testid="template-snake"]').tap();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1600);
  await page.getByTestId('run').click();
  await page.waitForTimeout(400);
  const tabletJoy = await page.locator('[data-testid="pad-joystick"]').boundingBox();
  check('tablet snake joystick', (tabletJoy?.width ?? 0) >= 110, `w=${Math.round(tabletJoy?.width ?? 0)}`);

  await page.locator('[data-testid="m-input-settings"]').tap();
  await page.waitForTimeout(400);
  await page.locator('[data-testid="input-tab-touch"]').tap();
  await page.waitForTimeout(300);
  await page.locator('[data-testid="touch-mode-direct"]').tap();
  await page.locator('[data-testid="input-settings-save"]').tap();
  await page.waitForTimeout(1200);
  await page.getByTestId('run').click();
  await page.waitForTimeout(400);
  const directPad = await page.locator('[data-testid="stage-pad"]').count();
  const directHint = await page.locator('[data-testid="stage-direct-hint"]').count();
  check('direct touch mode', directPad === 0 && directHint === 1, `pad=${directPad} hint=${directHint}`);

  page.once('dialog', (dialog) => void dialog.accept());
  await page.locator('[data-testid="reset-project"]').tap().catch(() => {});
  await page.waitForTimeout(800);

  check('tablet no console errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await context.close();
}

await runPhone();
await runTablet();
await browser.close();

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
