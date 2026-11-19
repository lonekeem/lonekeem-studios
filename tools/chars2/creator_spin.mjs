// creator proof: real pointer drags spin the body a full 360 (0/90/180/270), plus the face zoom (double-tap head view) for both bases
import { chromium } from 'playwright'; import fs from 'fs';
const OUT = process.env.OUT || 'docs/mp-chars-v2/creator'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1.5 }); const p = await ctx.newPage(); p.on('pageerror', e => console.log('ERR', e.message));
await p.goto(`http://127.0.0.1:${process.env.PORT||5262}/`); await p.waitForSelector('#btnWarn'); await p.click('#btnWarn'); await p.waitForSelector('#btnMP'); await p.click('#btnMP');
await p.waitForFunction(() => window.__mpCreator && window.__mpCreator.av(), null, { timeout: 180000 });
const rot = () => p.evaluate(() => +(window.__mpCreator.av().root.rotation.y).toFixed(3));
const box = await p.evaluate(() => { const c = document.querySelector('#mpc .stage'); const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }); console.log('stage', JSON.stringify(box));
const log = [];
for (const [nm, base] of [['guy', 'mp_m1'], ['girl', 'mp_f1']]) {
  await p.evaluate(async b => { const c = window.__mpCreator; const K = await import('/src/mp/look.js'); await c.setLook(K.defaultLook(b)); c.setView('full'); c.spinTo(0); }, base); await p.waitForTimeout(2500);
  const cx = box.x + box.w * .5, cy = box.y + box.h * .55;
  for (let k = 0; k < 4; k++) {
    if (k > 0) { await p.mouse.move(cx, cy); await p.mouse.down(); const px = (Math.PI / 2) / .012; for (let s = 1; s <= 20; s++) await p.mouse.move(cx + px * s / 20, cy, { steps: 1 }); await p.waitForTimeout(250); await p.mouse.move(cx + px, cy); await p.mouse.up(); await p.waitForTimeout(900); }
    const r = await rot(); log.push([nm, k * 90, r, +(r * 180 / Math.PI).toFixed(1)]); await p.screenshot({ path: `${OUT}/${nm}_spin_${k * 90}.png` }); }
  // face zoom via double-tap on the stage
  await p.evaluate(() => window.__mpCreator.spinTo(0)); await p.waitForTimeout(400); await p.mouse.dblclick(box.x + box.w * .5, box.y + box.h * .4); await p.waitForTimeout(2000); await p.screenshot({ path: `${OUT}/${nm}_facezoom.png` });
  await p.evaluate(() => window.__mpCreator.setView('full')); await p.waitForTimeout(800);
}
console.log(JSON.stringify(log)); fs.writeFileSync(`${OUT}/spin_log.json`, JSON.stringify(log, null, 1)); await b.close();
