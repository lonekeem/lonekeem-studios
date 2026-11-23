import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PORT = process.env.PORT || 5388;
const OUT = process.env.OUT || '/workspace/atq-story-quality';
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
p.on('pageerror', e => console.log('ERR', e.message));
p.on('console', m => { if (m.type() === 'error') console.log('CE', m.text().slice(0, 300)); });
await p.goto(`http://127.0.0.1:${PORT}/tools/story_quality.html`, { waitUntil: 'load', timeout: 120000 });
await p.waitForFunction(() => document.title === 'done' || document.title.startsWith('fail'), null, { timeout: 180000 });
const info = await p.evaluate(() => window.info);
console.log('INFO', JSON.stringify(info));
await p.screenshot({ path: `${OUT}/story-trio.png` });
// also individual tighter shots via URL
for (const who of ['keem', 'nia', 'marcus']) {
  const p2 = await ctx.newPage();
  p2.on('pageerror', e => console.log('ERR', who, e.message));
  await p2.goto(`http://127.0.0.1:${PORT}/tools/story_quality.html?who=${who}&w=900&h=1200`, { waitUntil: 'load', timeout: 120000 });
  await p2.waitForFunction(() => document.title === 'done' || document.title.startsWith('fail'), null, { timeout: 180000 });
  await p2.screenshot({ path: `${OUT}/story-${who}.png` });
  await p2.close();
}
await b.close();
console.log('wrote', OUT);
