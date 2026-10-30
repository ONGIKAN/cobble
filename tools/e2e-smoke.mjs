import { chromium } from 'playwright-core';
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

  // 1. 编辑器加载
  await page.waitForSelector('[data-testid="blocks-host"] .blocklySvg', { timeout: 15000 });
  record('editor boots', true, 'blockly workspace mounted');

  const spriteCards = await page.locator('.sprite-card').count();
  record('sprite rail', spriteCards === 2, `${spriteCards} sprites`);

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

  const readCat = () =>
    frame.evaluate(() => {
      const state = window.__cobbleRuntime.getSpriteState('sprite_cat');
      return { x: state?.x ?? NaN, y: state?.y ?? NaN };
    });

  const holdUntil = async (key, condition, maxMs = 3000) => {
    await page.keyboard.down(key);
    const startedAt = Date.now();
    let state = await readCat();
    try {
      while (Date.now() - startedAt < maxMs && !condition(state)) {
        await page.waitForTimeout(80);
        state = await readCat();
      }
    } finally {
      await page.keyboard.up(key);
    }
    return state;
  };

  const initial = await readCat();
  const moved = await holdUntil('ArrowRight', (state) => state.x >= 120);
  record('arrow key moves cat', Number.isFinite(moved.x) && moved.x > initial.x, `x ${initial.x} -> ${moved.x}`);

  // 3. 吃金币：向右对准金币，再向上靠近，撞到金币后分数 +1
  await holdUntil('ArrowUp', (state) => state.y >= 40);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${shotDir}/03-playing.png` });
  const score = await frame.evaluate(() => {
    const variable = window.__cobbleRuntime.getVariables().find((item) => item.id === 'var_score');
    return variable?.value ?? 0;
  });
  record('coin collision scores', Number(score) >= 1, `score=${score}`);

  // 4. 停止按钮
  await page.click('[data-testid="stop"]');
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
    savedDoc.project?.meta?.name === '小猫吃金币' &&
    Object.keys(savedDoc.workspaces ?? {}).length === 2;
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
