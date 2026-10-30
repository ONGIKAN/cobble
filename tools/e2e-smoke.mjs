import { chromium } from 'playwright-core';
import { resolve } from 'node:path';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const url = process.env.FORGE_URL ?? 'http://127.0.0.1:5183/';
const shotDir = process.env.FORGE_SHOTS ?? 'tools/shots';
mkdirSync(shotDir, { recursive: true });

const results = [];
const record = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => consoleErrors.push(String(error)));

const playerFrame = () => page.frames().find((frame) => frame.url().includes('player.html'));

try {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // 0. 工程管理页（启动首页）
  await page.waitForSelector('[data-testid="hub-new"]', { timeout: 15000 });
  const hubCount = await page.locator('[data-testid^="project-card-"]').count();
  record('hub lists projects', hubCount >= 1, `${hubCount} project(s)`);
  await page.screenshot({ path: `${shotDir}/00-hub.png` });
  await page.getByTestId('hub-new').click();
  await page.waitForSelector('[data-testid="new-project-dialog"]', { timeout: 8000 });
  record('hub new-project dialog opens', true);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  await page.locator('[data-testid^="project-open-"]').first().click();
  await page.waitForTimeout(1500);
  record('open project from hub', page.url().includes('#/editor/'), page.url());
  await page.waitForSelector('[data-testid="blocks-host"] .blocklySvg', { timeout: 20000 });

  // 1. 编辑器加载
  await page.waitForSelector('[data-testid="blocks-host"] .blocklySvg', { timeout: 15000 });
  record('editor boots', true, 'blockly workspace mounted');
  const toolboxLabels = (await page.locator('.blocklyToolboxCategory').allInnerTexts()).map((t) => t.trim());
  record('interaction category', toolboxLabels.includes('交互'), toolboxLabels.join(','));

  const spriteCards = await page.locator('.sprite-card').count();
  record('sprite rail', spriteCards >= 8, `${spriteCards} sprites`);

  const blockCount = await page.evaluate(() => document.querySelectorAll('.blocklyBlockCanvas .blocklyDraggable').length);
  record('demo scripts rendered', blockCount >= 8, `${blockCount} blocks`);

  // 2. 预览 iframe 与运行时
  const frame = playerFrame();
  record('player iframe', Boolean(frame), frame?.url() ?? 'missing');
  if (!frame) throw new Error('player iframe missing');

  await page.waitForFunction(
    () => {
      const child = document.querySelector('iframe');
      const win = child?.contentWindow;
      return Boolean(win && win.__cobbleRuntime);
    },
    { timeout: 20000 },
  );
  record('runtime started', true, 'window.__cobbleRuntime available');

  const readSnake = () =>
    frame.evaluate(() => {
      const state = window.__cobbleRuntime.getSpriteState('sprite_snake_head');
      return { x: state?.x ?? NaN, y: state?.y ?? NaN };
    });

  const holdUntil = async (key, condition, maxMs = 3000) => {
    await page.keyboard.down(key);
    const startedAt = Date.now();
    let state = await readSnake();
    try {
      while (Date.now() - startedAt < maxMs && !condition(state)) {
        await page.waitForTimeout(80);
        state = await readSnake();
      }
    } finally {
      await page.keyboard.up(key);
    }
    return state;
  };

  // 贪吃蛇会自动前进，先重开一局再测方向输入（避免开局撞墙导致线程已停止）
  await page.getByTestId('run').click();
  await page.waitForTimeout(250);
  const initial = await readSnake();
  const moved = await holdUntil('ArrowUp', (state) => state.y >= initial.y + 60);
  // 预览 iframe 隔离：沙箱属性必须存在（阻止顶层跳转 / 弹窗等）
  const sandboxAttr = await page.getAttribute('[data-testid="stage-iframe"]', 'sandbox');
  record('preview iframe sandboxed', Boolean(sandboxAttr && sandboxAttr.includes('allow-scripts')), sandboxAttr ?? 'missing');

  // 快捷键：Ctrl+S 下载 .gproj（合成键盘事件，避免浏览器占用真实快捷键）
  const shortcutDownload = page.waitForEvent('download', { timeout: 8000 }).then((d) => d.suggestedFilename()).catch(() => '');
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', code: 'KeyS', ctrlKey: true, bubbles: true }));
  });
  const savedName = await shortcutDownload;
  record('ctrl+s saves project', savedName.endsWith('.gproj'), savedName || 'no download');

  record('arrow keys steer snake', Number.isFinite(moved.y) && moved.y > initial.y, `y ${initial.y} -> ${moved.y}`);

  // 3. 贪吃蛇运行态：苹果存在、分数变量可读
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${shotDir}/03-playing.png` });
  const snakeState = await frame.evaluate(() => {
    const runtime = window.__cobbleRuntime;
    const apple = runtime.getSpriteState('sprite_apple');
    const score = runtime.getVariables().find((item) => item.id === 'var_score');
    return { appleX: apple?.x ?? null, score: score?.value ?? null };
  });
  record('snake apple on stage', Number.isFinite(snakeState.appleX), `apple x=${snakeState.appleX} score=${snakeState.score}`);

  // 4. 停止按钮（重新运行后手动停止）
  await page.getByTestId('run').click();
  await page.waitForTimeout(250);
  await page.getByTestId('stop').click();
  await page.waitForTimeout(400);
  const stopped = await page.evaluate(() => {
    const child = document.querySelector('iframe');
    return !child?.contentWindow?.__cobbleRuntime;
  });
  record('stop clears runtime', stopped, 'iframe runtime gone');

  // 5. .gproj 保存：下载文件里应带工程与积木数据
  const downloadPromise = page.waitForEvent('download');
  await page.click('[data-testid="save-project"]');
  const download = await downloadPromise;
  const savedPath = await download.path();
  const savedDoc = JSON.parse(readFileSync(savedPath, 'utf8'));
  const savedOk =
    savedDoc.format === 'cobble-studio' &&
    savedDoc.version === 1 &&
    savedDoc.project?.meta?.name === '贪吃蛇' &&
    Object.keys(savedDoc.workspaces ?? {}).length >= 6;
  record('project save (.gproj)', savedOk, `file=${download.suggestedFilename()}`);

  // 6. .gproj 打开：改名后重新打开应整页重载并载入新工程
  const importPath = `${shotDir}/tmp-import.gproj`;
  savedDoc.project.meta.name = '导入测试工程';
  writeFileSync(importPath, JSON.stringify(savedDoc));
  await page.setInputFiles('[data-testid="open-project-input"]', importPath);
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('[data-testid="blocks-host"] .blocklySvg', { timeout: 15000 });
  await page.waitForTimeout(1000);
  const importedName = await page.locator('.project-name-text').innerText();
  const importedBlocks = await page.evaluate(() => document.querySelectorAll('.blocklyBlockCanvas .blocklyDraggable').length);
  record('project open (.gproj)', importedName === '导入测试工程' && importedBlocks >= 8, `name=${importedName} blocks=${importedBlocks}`);
  rmSync(importPath, { force: true });

  // 恢复演示工程，后续截图仍用标准示例
  await page.click('[data-testid="reset-project"]');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('[data-testid="hub-new"]', { timeout: 15000 });
  await page.locator('[data-testid^="project-open-"]').first().click();
  await page.waitForTimeout(1500);
  await page.waitForSelector('[data-testid="blocks-host"] .blocklySvg', { timeout: 15000 });
  await page.waitForTimeout(1200);

  // 素材与角色管理 (v0.2.0)
  const spriteCount = () => page.locator('.sprite-card').count();
  const costumeRows = () => page.locator('[data-testid^="costume-row-"]').count();

  const before = await spriteCount();
  await page.click('[data-testid="add-sprite"]');
  await page.waitForTimeout(400);
  const after = await spriteCount();
  const newName = await page.locator('[data-testid="sprite-name"]').inputValue();
  record('add sprite', after === before + 1 && /角色/.test(newName), `sprites ${before} -> ${after}, name=${newName}`);

  await page.fill('[data-testid="sprite-name"]', '敌人');
  await page.waitForTimeout(300);
  const renamed = await page.locator(`.sprite-card:has-text("敌人")`).count();
  record('rename sprite', renamed === 1, 'sprite card shows 敌人');

  const beforeVars = await page.locator('[data-testid^="var-row-"]').count();
  await page.click('[data-testid="add-variable"]');
  await page.waitForTimeout(400);
  const afterVars = await page.locator('[data-testid^="var-row-"]').count();
  record('add variable', afterVars === beforeVars + 1, `variables ${beforeVars} -> ${afterVars}`);

  const pixelPath = `${shotDir}/tmp-pixel.png`;
  writeFileSync(
    pixelPath,
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    ),
  );
  const beforeCostumes = await costumeRows();
  await page.setInputFiles('[data-testid="costume-add-input"]', pixelPath);
  await page.waitForTimeout(600);
  const afterCostumes = await costumeRows();
  record('upload costume', afterCostumes === beforeCostumes + 1, `costumes ${beforeCostumes} -> ${afterCostumes}`);
  await page.click(`[data-testid="costume-remove-${afterCostumes - 1}"]`);
  await page.waitForTimeout(400);
  record('remove costume', (await costumeRows()) === beforeCostumes, 'costume removed');
  rmSync(pixelPath, { force: true });

  await page.click('[data-testid="stage-settings-toggle"]');
  await page.waitForTimeout(300);
  await page.fill('[data-testid="stage-background"]', '#112233');
  await page.selectOption('[data-testid="stage-size"]', '1280x720');
  await page.waitForTimeout(400);
  const stageBg = await page.locator('[data-testid="stage-background"]').inputValue();
  const stageSize = await page.locator('[data-testid="stage-size"]').inputValue();
  record('stage settings', stageBg === '#112233' && stageSize === '1280x720', `bg=${stageBg} size=${stageSize}`);
  await page.click('[data-testid="stage-settings-toggle"]');

  // 输入事件 (v0.5.0)
  await page.click('[data-testid="input-settings"]');
  await page.waitForTimeout(300);
  const bindingRows = await page.locator('[data-testid="binding-row"]').count();
  const rightRow = page.locator('[data-testid="binding-row"]').nth(1);
  const chipsBefore = await rightRow.locator('.key-chip').count();
  await rightRow.locator('[data-testid^="add-key-"]').click();
  await page.keyboard.press('f');
  await page.waitForTimeout(250);
  const chipsAfter = await rightRow.locator('.key-chip').count();
  await page.screenshot({ path: `${shotDir}/05-input-settings.png` });
  await page.click('[data-testid="input-settings-close"]');
  await page.waitForTimeout(200);
  record('input settings dialog', bindingRows === 6 && chipsAfter === chipsBefore + 1, `bindings=${bindingRows} keys ${chipsBefore}→${chipsAfter}`);

  // 触屏模式/尺寸：每个工程独立保存
  await page.click('[data-testid="input-settings"]');
  await page.waitForTimeout(300);
  await page.click('[data-testid="input-tab-touch"]');
  await page.waitForTimeout(200);
  const hasModeRow = await page.locator('[data-testid="input-touch-mode"]').isVisible();
  await page.click('[data-testid="touch-mode-direct"]');
  await page.waitForTimeout(150);
  const directActive = String(await page.locator('[data-testid="touch-mode-direct"]').getAttribute('class') ?? '');
  await page.click('[data-testid="input-settings-save"]');
  await page.waitForTimeout(500);
  await page.click('[data-testid="input-settings"]');
  await page.waitForTimeout(300);
  await page.click('[data-testid="input-tab-touch"]');
  await page.waitForTimeout(200);
  const savedDirect = String(await page.locator('[data-testid="touch-mode-direct"]').getAttribute('class') ?? '');
  await page.click('[data-testid="touch-mode-pad"]');
  await page.waitForTimeout(250);
  const joySize = await page.locator('[data-testid="input-joystick-size"]').inputValue();
  await page.click('[data-testid="input-settings-save"]');
  await page.waitForTimeout(400);
  record(
    'touch mode per project',
    hasModeRow && directActive.includes('is-active') && savedDirect.includes('is-active') && joySize === 'lg',
    `modeRow=${hasModeRow} saved=${savedDirect.includes('is-active')} joy=${joySize}`,
  );



  // 数字输入框：清空后继续输入不应变成 0100 (v0.12.4)
  const numField = page.locator('.inspector .field-grid input').first();
  await numField.click();
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  await page.keyboard.type('100', { delay: 40 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  const numValue = await numField.inputValue();
  record('number input clearing', numValue === '100', `value=${numValue}`);

  page.once('dialog', (dialog) => dialog.accept());
  await page.click('[data-testid="delete-sprite"]');
  await page.waitForTimeout(500);
  record('delete sprite', (await spriteCount()) === before, `sprites back to ${before}`);

  // 资源库：点击 / 拖拽创建角色，全屏退出按钮 (v0.13.0)
  await page.click('[data-testid="asset-library-toggle"]');
  await page.waitForTimeout(400);
  const libraryVisible = await page.locator('[data-testid="asset-library"]').isVisible();
  const assetsInLibrary = await page.locator('[data-testid^="asset-card-"]').count();
  await page.screenshot({ path: `${shotDir}/06-asset-library.png` });
  await page.locator('[data-testid="asset-card-coin"]').click();
  await page.waitForTimeout(600);
  await page.click('[data-testid="asset-library-close"]');
  await page.waitForTimeout(300);
  const afterAssetClick = await spriteCount();
  record(
    'asset library click adds sprite',
    libraryVisible && assetsInLibrary > 10 && afterAssetClick === before + 1,
    `assets=${assetsInLibrary} sprites ${before}->${afterAssetClick}`,
  );

  const stageBox = await page.evaluate(() => {
    const frame = document.querySelector('.stage-frame');
    const rect = frame.getBoundingClientRect();
    const dt = new DataTransfer();
    dt.setData(
      'application/x-cobble-asset',
      JSON.stringify({
        name: '拖入星星',
        dataUrl:
          'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><polygon points="20,2 25,15 39,15 28,24 32,38 20,30 8,38 12,24 1,15 15,15" fill="%23ffd166"/></svg>',
      }),
    );
    const clientX = rect.left + rect.width * 0.25;
    const clientY = rect.top + rect.height * 0.75;
    frame.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, clientX, clientY }));
    frame.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, clientX, clientY }));
    return { w: Math.round(rect.width), h: Math.round(rect.height) };
  });
  await page.waitForTimeout(700);
  const afterDrag = await spriteCount();
  record('asset library drag drop', afterDrag === afterAssetClick + 1, `sprites ${afterAssetClick}->${afterDrag} stage=${stageBox.w}x${stageBox.h}`);

  await page.click('[data-testid="stage-fullscreen"]');
  await page.waitForTimeout(600);
  const fsExitVisible = await page.locator('[data-testid="stage-exit-fullscreen"]').isVisible();
  const fsOn = await page.evaluate(() => Boolean(document.fullscreenElement));
  await page.click('[data-testid="stage-exit-fullscreen"]');
  await page.waitForTimeout(500);
  const fsOff = await page.evaluate(() => Boolean(document.fullscreenElement));
  record('fullscreen exit button', fsOn && fsExitVisible && !fsOff, `on=${fsOn} btn=${fsExitVisible} off=${!fsOff}`);

  // 可拖动分栏：左右面板 + 上下区域 (v0.13.0)
  const splitterCount = await page.locator('.pane-splitter').count();
  const railWidth = async () =>
    page.evaluate(() => {
      const layout = document.querySelector('.layout');
      return layout ? parseFloat(getComputedStyle(layout).gridTemplateColumns.split(' ')[0]) : 0;
    });
  const stageHeight = async () =>
    page.evaluate(() => {
      const el = document.querySelector('.center-stage');
      return el ? Math.round(el.getBoundingClientRect().height) : 0;
    });
  const railStart = await railWidth();
  const railSplitter = await page.locator('[data-testid="splitter-rail"]').boundingBox();
  await page.mouse.move(railSplitter.x + 3, railSplitter.y + railSplitter.height / 2);
  await page.mouse.down();
  await page.mouse.move(railSplitter.x + 73, railSplitter.y + railSplitter.height / 2, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const railEnd = await railWidth();
  record('pane splitter rail', splitterCount === 3 && railEnd > railStart + 40, `count=${splitterCount} rail ${Math.round(railStart)}->${Math.round(railEnd)}`);

  const stageStart = await stageHeight();
  const stageSplitter = await page.locator('[data-testid="splitter-stage"]').boundingBox();
  await page.mouse.move(stageSplitter.x + stageSplitter.width / 2, stageSplitter.y + 3);
  await page.mouse.down();
  await page.mouse.move(stageSplitter.x + stageSplitter.width / 2, stageSplitter.y - 77, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const stageEnd = await stageHeight();
  record('pane splitter stage', stageEnd < stageStart - 40, `stage ${stageStart}->${stageEnd}`);


  await page.click('[data-testid="reset-project"]');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('[data-testid="hub-new"]', { timeout: 15000 });
  await page.locator('[data-testid^="project-open-"]').first().click();
  await page.waitForTimeout(2500);
  await page.waitForSelector('[data-testid="blocks-host"] .blocklySvg', { timeout: 15000 });
  await page.waitForTimeout(1200);

  // 5. 深色截图（先重新运行）
  await page.click('[data-testid="run"]');
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${shotDir}/01-editor-dark.png` });

  // 6. 浅色主题
  await page.click('[data-testid="theme-toggle"]');
  await page.waitForTimeout(500);
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  record('theme toggle', theme === 'light', `data-theme=${theme}`);
  await page.screenshot({ path: `${shotDir}/02-editor-light.png` });

  // 7. 切换英文（整页重载）
  await page.click('[data-testid="lang-en"]');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('[data-testid="blocks-host"] .blocklySvg', { timeout: 15000 });
  await page.waitForTimeout(1200);
  const lang = await page.evaluate(() => document.documentElement.lang);
  const runLabel = await page.locator('[data-testid="run"]').innerText();
  record('locale switch', lang === 'en' && /run/i.test(runLabel), `lang=${lang} run="${runLabel}"`);
  await page.screenshot({ path: `${shotDir}/04-editor-en.png` });

  // 8. 语言持久化后回到中文（清理会话状态）
  await page.click('[data-testid="lang-zh"]');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);

  // 9. 导出单文件 HTML5：下载 → 本地打开 → 运行时启动
  const [exportDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.click('[data-testid="export-html5"]'),
  ]);
  const exportPath = resolve(shotDir, 'tmp-export.html');
  await exportDownload.saveAs(exportPath);
  const game = await browser.newPage({ viewport: { width: 1000, height: 620 } });
  const gameErrors = [];
  game.on('pageerror', (error) => gameErrors.push(String(error)));
  await game.goto(`file:///${exportPath.replaceAll('\\', '/')}`);
  await game.waitForFunction(() => Boolean(window.__cobbleRuntime), null, { timeout: 20000 });
  const hud = await game.$$eval('.hud-var', (items) => items.length);
  record('export html5', hud >= 1 && gameErrors.length === 0, `download=${exportDownload.suggestedFilename()} hud=${hud} errors=${gameErrors.length}`);
  await game.close();

  // 导出 Windows EXE（网页版应提示需要桌面版）+ 安卓导出内测提示（v0.13.0）
  let exeHint = '';
  page.once('dialog', async (dialog) => {
    exeHint = dialog.message();
    await dialog.accept();
  });
  await page.click('[data-testid="export-exe"]');
  await page.waitForTimeout(500);
  record('export exe desktop hint', exeHint.includes('桌面版'), exeHint.slice(0, 60));

  let androidHint = '';
  page.once('dialog', async (dialog) => {
    androidHint = dialog.message();
    await dialog.accept();
  });
  await page.click('[data-testid="export-android"]');
  await page.waitForTimeout(400);
  record('android export beta hint', androidHint.includes('内测'), androidHint.slice(0, 60));

  // 10. 新建工程：默认模板只有 空白 + 贪吃蛇（v0.13.0）
  await page.click('[data-testid="new-project"]');
  await page.waitForSelector('[data-testid="new-project-dialog"]', { timeout: 5000 });
  const templateCards = await page.locator('.template-card').count();
  const snakeCard = await page.locator('[data-testid="template-snake"]').count();
  page.once('dialog', (dialog) => void dialog.accept());
  await page.click('[data-testid="template-snake"]');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('[data-testid="blocks-host"] .blocklySvg', { timeout: 15000 });
  await page.waitForTimeout(900);
  const tmplSprites = await page.locator('.sprite-card').count();
  const tmplBlocks = await page.locator('.blocklyBlockCanvas .blocklyDraggable').count();
  const tmplName = await page.locator('.project-name-text').innerText();
  record('new project template', templateCards === 2 && snakeCard === 1 && tmplSprites === 10 && tmplBlocks > 60 && tmplName.includes('贪吃蛇'), `cards=${templateCards} sprites=${tmplSprites} blocks=${tmplBlocks} name=${tmplName}`);

  // 10b. 贪吃蛇能跑：蛇头在运行中会移动
  await page.getByTestId('run').click();
  await page.waitForTimeout(350);
  const snakeFrame = page.frames().find((item) => item.url().includes('player.html'));
  const headA = snakeFrame ? await snakeFrame.evaluate(() => window.__cobbleRuntime?.getSpriteState?.('sprite_snake_head')) : null;
  await page.waitForTimeout(420);
  const headB = snakeFrame ? await snakeFrame.evaluate(() => window.__cobbleRuntime?.getSpriteState?.('sprite_snake_head')) : null;
  record('snake game runs', Boolean(headA && headB) && Math.abs((headB?.x ?? 0) - (headA?.x ?? 0)) + Math.abs((headB?.y ?? 0) - (headA?.y ?? 0)) > 0, `head ${headA?.x},${headA?.y} -> ${headB?.x},${headB?.y}`);

  // 回到工程管理页，避免模板工程影响下次运行
  page.once('dialog', (dialog) => void dialog.accept());
  await page.click('[data-testid="reset-project"]');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('[data-testid="hub-new"]', { timeout: 15000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${shotDir}/06-hub-light.png` });

  record('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
} catch (error) {
  record('smoke run', false, String(error));
  await page.screenshot({ path: `${shotDir}/99-failure.png` });
} finally {
  await browser.close();
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
