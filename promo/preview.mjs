import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

mkdirSync('promo/preview', { recursive: true });
const times = [1.2, 2.6, 5.8, 9.6, 13.2, 16.9, 20.4, 23.2];
const browser = await chromium.launch({ channel: 'msedge' });

for (const ratio of ['169', '916']) {
  const [W, H] = ratio === '916' ? [1080, 1920] : [1920, 1080];
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.goto(`${pathToFileURL(resolve('promo/scene.html')).href}?ratio=${ratio}`, { waitUntil: 'load' });
  await page.evaluate(() => window.__ready);
  for (const t of times) {
    await page.evaluate((time) => window.__render(time), t);
    await page.screenshot({ path: `promo/preview/${ratio}-${String(t).replace('.', '_')}.png` });
  }
  await page.close();
}
await browser.close();
console.log('preview done');
