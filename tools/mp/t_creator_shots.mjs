// creator close-ups of the default male + female (head, full) for the Bitmoji-style comparison
import { launch, URL as U, ctxOpts } from '../mpfix/lib.mjs'; import fs from 'fs'; const OUT = process.env.OUT || '/workspace/atq1919/docs/mp-fix2/chars'; fs.mkdirSync(OUT, { recursive: true }); const tag = process.env.TAG || 'before';
const b = await launch(); const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); const p = await ctx.newPage(); p.on('pageerror', e => console.log('ERR', e.message));
await p.goto(U); await p.waitForSelector('#btnWarn'); await p.click('#btnWarn'); await p.waitForSelector('#btnMP'); await p.click('#btnMP');
await p.waitForFunction(() => window.__mpCreator && window.__mpCreator.av(), null, { timeout: 120000 });
for (const [nm, base] of [['guy', 'mp_m1'], ['girl', 'mp_f1']]) {
  await p.evaluate(async b => { const c = window.__mpCreator; const L = JSON.parse(JSON.stringify(c.look)); L.base = b; await c.setLook(L); }, base); await p.waitForTimeout(1500);
  for (const v of ['head', 'full']) { await p.evaluate(v => window.__mpCreator.setView(v), v); await p.waitForTimeout(1800); await p.screenshot({ path: `${OUT}/${nm}_${v}_${tag}.png` }); }
}
await b.close();
