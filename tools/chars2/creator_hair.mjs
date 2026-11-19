// creator proof: set a hair style through the real creator, full view at 4 angles + face zoom, for each [base, hairId, colour] on argv
import { chromium } from 'playwright'; import fs from 'fs';
const OUT = process.env.OUT || 'docs/mp-hair/creator'; fs.mkdirSync(OUT, { recursive: true });
const items = process.argv.slice(2).map(a => a.split(':')); // base:hair:col:col2
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1.5 }); const p = await ctx.newPage(); p.on('pageerror', e => console.log('ERR', e.message));
await p.goto(`http://127.0.0.1:${process.env.PORT || 5263}/`); await p.waitForSelector('#btnWarn'); await p.click('#btnWarn'); await p.waitForSelector('#btnMP'); await p.click('#btnMP');
await p.waitForFunction(() => window.__mpCreator && window.__mpCreator.av(), null, { timeout: 180000 });
const box = await p.evaluate(() => { const c = document.querySelector('#mpc .stage'); const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
for (const [base, hair, col, col2] of items) {
  await p.evaluate(async ([b, h, c, c2]) => { const c0 = window.__mpCreator; const K = await import('/src/mp/look.js'); const L = K.defaultLook(b); L.hair = { id: h, c: c || L.hair.c, c2: c2 || L.hair.c2, hl: L.hair.hl }; await c0.setLook(L); c0.setView('full'); c0.spinTo(0); }, [base, hair, col, col2]); await p.waitForTimeout(2500);
  for (const [k, a] of [[0, 0], [1, Math.PI / 4], [2, Math.PI], [3, Math.PI * 1.5]]) { await p.evaluate(a => window.__mpCreator.spinTo(a), a); await p.waitForTimeout(1500); await p.screenshot({ path: `${OUT}/${base}_${hair}_${k}.png` }); }
  await p.evaluate(() => window.__mpCreator.spinTo(0)); await p.waitForTimeout(500); await p.mouse.dblclick(box.x + box.w * .5, box.y + box.h * .4); await p.waitForTimeout(2200); await p.screenshot({ path: `${OUT}/${base}_${hair}_face.png` });
  await p.evaluate(() => window.__mpCreator.setView('full')); await p.waitForTimeout(500); }
await b.close();
