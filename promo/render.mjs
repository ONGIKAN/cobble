import { chromium } from 'playwright-core';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const FPS = 30;
const DURATION = 24.0;
const TOTAL = Math.round(FPS * DURATION);

const ratio = process.argv.includes('--ratio=916') ? '916' : '169';
const [W, H] = ratio === '916' ? [1080, 1920] : [1920, 1080];

const outDir = resolve(`promo/frames-${ratio}`);
if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const pageUrl = `${pathToFileURL(resolve('promo/scene.html')).href}?ratio=${ratio}`;
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.goto(pageUrl, { waitUntil: 'load' });
await page.evaluate(() => window.__ready);
await page.waitForTimeout(200);

const t0 = Date.now();
for (let i = 0; i < TOTAL; i += 1) {
  const t = i / FPS;
  await page.evaluate((time) => window.__render(time), t);
  await page.screenshot({
    path: `${outDir}/${String(i).padStart(4, '0')}.jpg`,
    type: 'jpeg',
    quality: 94,
  });
  if (i % 120 === 0) console.log(`[${ratio}] ${i}/${TOTAL} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
console.log(`[${ratio}] done ${TOTAL} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${outDir}`);
await browser.close();
