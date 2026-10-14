import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const ext = path.resolve(root, '../extension');
const out = path.resolve(root, 'shots');
fs.mkdirSync(out, { recursive: true });

const server = http.createServer((req, res) => {
  const f = path.join(root, req.url === '/' ? 'demo.html' : req.url.split('?')[0]);
  if (fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { 'content-type': 'text/html' }); res.end(fs.readFileSync(f)); }
  else { res.writeHead(404); res.end('nope'); }
}).listen(8765);

const ctx = await chromium.launchPersistentContext('/tmp/ls-profile-' + Date.now(), {
  headless: false,
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, '--no-sandbox'],
  viewport: { width: 1040, height: 848 }
});
const errors = [];
let [sw] = ctx.serviceWorkers();
for (let i = 0; !sw && i < 40; i++) { await new Promise((r) => setTimeout(r, 250)); [sw] = ctx.serviceWorkers(); }
if (!sw) sw = await ctx.waitForEvent('serviceworker');
const id = new URL(sw.url()).host;
console.log('extension id', id);

const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push('page: ' + e.message));
await page.goto('http://localhost:8765/');

const panel = await ctx.newPage();
await panel.setViewportSize({ width: 400, height: 900 });
panel.on('pageerror', (e) => errors.push('panel: ' + e.message));
panel.on('console', (m) => { if (m.type() === 'error') errors.push('panel console: ' + m.text()); });
await panel.goto(`chrome-extension://${id}/panel.html?tab=0`);
const tabId = await panel.evaluate(async () => (await chrome.tabs.query({ url: 'http://localhost:8765/*' }))[0].id);
await panel.goto(`chrome-extension://${id}/panel.html?tab=${tabId}`);
await panel.waitForSelector('[data-row]', { timeout: 10000 });
await panel.waitForTimeout(500);
await panel.screenshot({ path: out + '/1-panel.png' });

// dump what was found
const items = await panel.evaluate(() => [...document.querySelectorAll('[data-row]')].map((r) => r.innerText.replace(/\n+/g, ' | ')));
console.log(items.join('\n'));

// open the Submit order row
await panel.locator('[data-row]', { hasText: 'Submit order' }).click();
await panel.waitForTimeout(400);
await panel.screenshot({ path: out + '/2-panel-open.png', fullPage: false });
await page.bringToFront();
await page.waitForTimeout(400);
await page.screenshot({ path: out + '/2-page-selected.png' });

// show all names
await panel.bringToFront();
console.log('eyes by default:', await panel.evaluate(() => [...document.querySelectorAll('[data-eye]')].map((b) => b.dataset.eye + '=' + b.getAttribute('aria-pressed')).join(' ')));
await page.bringToFront();
await page.waitForTimeout(400);
await page.screenshot({ path: out + '/3-page-all.png' });

// hover card
await page.mouse.move(10, 700);
await page.waitForTimeout(100);
await page.mouse.move(62, 548, { steps: 4 });
await page.waitForTimeout(400);
await page.screenshot({ path: out + '/4-page-hover.png' });

// clicking a link while names are shown never navigates
await page.click('a.read-more >> nth=0', { force: true });
await page.click('nav a[href="/help"]', { force: true });
await page.waitForTimeout(400);
console.log('url after link click (should be unchanged):', page.url());

// clicking a tag picks its element, not what is under it
await page.mouse.click(110, 186);
await page.waitForTimeout(500);
await panel.bringToFront();
await panel.waitForTimeout(300);
console.log('open row after tag click:', await panel.evaluate(() => { const r = document.querySelector('[data-row][aria-expanded=true]'); return r ? r.innerText.split('\n')[0] : 'none'; }));
await panel.screenshot({ path: out + '/5-panel-picked.png' });

// eye: hide form controls only
await panel.locator('[data-eye=forms]').click();
await panel.waitForTimeout(300);
await panel.screenshot({ path: out + '/5b-panel-eyes.png' });
await page.bringToFront();
await page.waitForTimeout(400);
await page.screenshot({ path: out + '/5c-page-no-forms.png' });
await panel.bringToFront();

// issues filter + search
await panel.locator('[data-sev=warn]').click();
console.log('warn rows:', await panel.locator('[data-row]').count());
await panel.waitForTimeout(200);
await panel.screenshot({ path: out + '/6-issues.png' });
await panel.locator('#searchOpen').click();
await panel.keyboard.type('button');
await panel.waitForTimeout(200);
await panel.screenshot({ path: out + '/7-search.png' });

// pause: highlights clear and the page works normally
await panel.locator('#pauseBtn').click();
await panel.waitForTimeout(500);
await panel.screenshot({ path: out + '/7b-paused.png' });
await page.bringToFront();
console.log('overlay while paused:', await page.evaluate(() => !!document.querySelector('labelseek-overlay')));
await page.click('#later');
await page.waitForTimeout(300);
console.log('url after link click while paused (should end with #):', page.url());
await panel.bringToFront();
await panel.locator('#resumeBtn').click();
await panel.waitForTimeout(800);
await page.bringToFront();
await page.waitForTimeout(300);
console.log('overlay after resume:', await page.evaluate(() => !!document.querySelector('labelseek-overlay')));
await panel.bringToFront();

// late added element should show after mutation rescan
await panel.locator('#searchClose').click();
await panel.locator('[data-sev=warn]').click();
await panel.locator('[data-filter=all]').click();
await panel.waitForTimeout(2500);
const late = await panel.locator('[data-row]', { hasText: 'Added later' }).count();
console.log('late button found:', late);

// copy all
await panel.evaluate(() => { navigator.clipboard.writeText = async (t) => { window.__clip = t; }; });
await panel.locator('#menuBtn').click();
await panel.screenshot({ path: out + '/8a-menu-open.png' });
await panel.locator('#copyAll').click();
await panel.waitForTimeout(300);
const clip = await panel.evaluate(() => window.__clip || 'nothing copied');
fs.writeFileSync(out + '/tickets.md', clip);
fs.writeFileSync(out + '/export.csv', await panel.evaluate(() => csv()));
await panel.screenshot({ path: out + '/8-toast.png' });

// keyboard: menu
await panel.locator('#menuBtn').focus();
await panel.keyboard.press('ArrowDown');
const focused = await panel.evaluate(() => document.activeElement.textContent.trim());
console.log('menu focus:', focused);
await panel.screenshot({ path: out + '/9-menu.png' });
await panel.keyboard.press('Escape');

// close: highlights should clear
await panel.close();
await page.waitForTimeout(500);
const overlayLeft = await page.evaluate(() => !!document.querySelector('labelseek-overlay'));
console.log('overlay after close:', overlayLeft);

console.log('errors:', errors.length ? errors : 'none');
await ctx.close();
server.close();
