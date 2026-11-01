import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = 'http://127.0.0.1:8133';
mkdirSync('promo/assets', { recursive: true });

const browser = await chromium.launch({ channel: 'msedge' });

async function openDemo(page) {
  await page.goto(`${BASE}/demo/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.locator('[data-testid^="project-open-"]').first().click();
  await page.waitForTimeout(2600);
}

// desktop 16:9
{
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await openDemo(page);
  await page.screenshot({ path: 'promo/assets/desktop-edit.png' });
  await page.getByTestId('run').click();
  await page.waitForTimeout(420);
  await page.screenshot({ path: 'promo/assets/desktop-run.png' });
  // topbar crop for export buttons
  await page.screenshot({ path: 'promo/assets/desktop-topbar.png', clip: { x: 620, y: 0, width: 1300, height: 52 } });
  await page.goto(`${BASE}/demo/#/projects`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'promo/assets/desktop-hub.png' });
  await page.close();
}

// phone 9:16 (1170 x 2532)
{
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  });
  await openDemo(page);
  await page.screenshot({ path: 'promo/assets/phone-edit.png' });
  await page.getByTestId('run').click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'promo/assets/phone-run.png' });
  await page.close();
}

await browser.close();
console.log('captured');
