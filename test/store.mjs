import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('.');
const ext = path.resolve(root, '../extension');
const out = path.resolve(root, 'store');
const server = http.createServer((req, res) => {
  const f = path.join(root, req.url === '/' ? 'demo.html' : req.url.split('?')[0]);
  if (fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { 'content-type': 'text/html' }); res.end(fs.readFileSync(f)); }
  else { res.writeHead(404); res.end('nope'); }
}).listen(8766);
const ctx = await chromium.launchPersistentContext('/tmp/ls-store-' + Date.now(), {
  headless: false, executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, '--no-sandbox'],
  viewport: { width: 880, height: 800 }, deviceScaleFactor: 1
});
let [sw] = ctx.serviceWorkers();
if (!sw) sw = await ctx.waitForEvent('serviceworker');
const id = new URL(sw.url()).host;
const page = await ctx.newPage();
await page.goto('http://localhost:8766/');
const panel = await ctx.newPage();
await panel.setViewportSize({ width: 400, height: 800 });
await panel.goto(`chrome-extension://${id}/panel.html?tab=0`);
const tabId = await panel.evaluate(async () => (await chrome.tabs.query({ url: 'http://localhost:8766/*' }))[0].id);
await panel.goto(`chrome-extension://${id}/panel.html?tab=${tabId}`);
await panel.waitForSelector('[data-row]');
await panel.waitForTimeout(800);
async function snap(name) {
  await page.bringToFront(); await page.waitForTimeout(450);
  await page.screenshot({ path: `${out}/${name}-page.png` });
  await panel.bringToFront(); await panel.waitForTimeout(300);
  await panel.screenshot({ path: `${out}/${name}-panel.png` });
}
// 1 overview
await snap('1');
// 2 selected row, page scrolled to it
await panel.locator('[data-row]', { hasText: 'Submit order' }).click();
await panel.waitForTimeout(400);
await snap('2');
// 3 hover card on page
await page.bringToFront();
const b = await page.locator('button', { hasText: 'Submit order' }).first().boundingBox();
await page.mouse.move(5, 5); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 5 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/3-page.png` });
await panel.bringToFront(); await panel.waitForTimeout(200);
await panel.screenshot({ path: `${out}/3-panel.png` });
await page.mouse.move(5, 5);
// 4 warnings filter, first row open
await panel.locator('[data-sev=warn]').click(); await panel.waitForTimeout(300);
await panel.locator('[data-row]').first().click(); await panel.waitForTimeout(400);
await snap('4');
// 5 no name filter
await panel.locator('[data-sev=warn]').click();
await panel.locator('[data-sev=error]').click(); await panel.waitForTimeout(300);
await panel.locator('[data-row]').first().click(); await panel.waitForTimeout(400);
await snap('5');
// 6 paused
await panel.locator('[data-sev=error]').click();
await panel.locator('#pauseBtn').click(); await panel.waitForTimeout(600);
await snap('6');
await ctx.close(); server.close();
