// Close-up check of the Ch12 breaker cutscene camera (local, no lobby).
import { launch, context, page, frames, URL } from '../coop/lib.mjs'; import fs from 'fs';
const OUT = process.env.OUT || '/workspace/atq-sweep-proof/ch12-breaker'; fs.mkdirSync(OUT, { recursive: true });
const b = await launch(); const ctx = await context(b);
await ctx.addInitScript(() => { localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true, voices: false })); localStorage.setItem('atq3_save', JSON.stringify({ v: 3, maxCh: 24, done: true, done2: true, step: 0, cash: 100, played: true })); });
const p = await page(ctx, 'A'); p.on('pageerror', e => console.log('PE', e.message)); p.on('framenavigated', f => { if (f === p.mainFrame()) console.log('NAV', f.url()); }); p.on('console', m => { if (m.type() === 'error') console.log('CE', m.text().slice(0, 200)); }); await p.goto(URL); await p.waitForFunction(() => window.__atq && window.__atq.story, null, { timeout: 240000 });
const tap = async sel => { await p.waitForFunction(s => { const e = document.querySelector(s); const l = document.getElementById('loading'); return e && e.offsetParent && (!l || l.classList.contains('hidden')); }, sel, { timeout: 120000 }); const q = await p.evaluate(s => { const e = document.querySelector(s); e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel); await p.touchscreen.tap(q.x, q.y); await p.waitForTimeout(600); };
const vis = sel => p.evaluate(s => { const e = document.querySelector(s); return !!(e && e.offsetParent); }, sel);
await p.waitForTimeout(3000); if (await vis('#btnWarn')) await tap('#btnWarn'); if (!(await vis('#btnChapters'))) await tap('#btnStory'); await tap('#btnChapters'); await tap('#btnCh12');
await p.waitForFunction(() => window.__atq.state === 'play' && window.__atq.game && window.__atq.game.running, null, { timeout: 240000 });
for (let k = 0; k < 6; k++) { const id = await p.evaluate(() => window.__atq.story[window.__atq.game.step].id); console.log('step', id); if (id === 'c12_boiler') break; await p.evaluate(() => window.__atq.game.skipObjective()); await p.waitForTimeout(4000); }
const pk = await p.evaluate(() => { const g = window.__atq.game; const f = g.pickups.filter(q => q.l && q.l.kind === 'fuse'); const keys = g.pickups[0] ? Object.keys(g.pickups[0]).join(',') : 'none'; f.forEach(q => { const fn = q.l.onTake; if (fn) fn(g); }); return { n: f.length, keys, fuses: g.stepData.fuses, uses: (g.stepData.uses || []).map(u => u.label) }; });
console.log(JSON.stringify(pk));
await p.evaluate(() => { const g = window.__atq.game; g.horde = () => {}; (g.zombies || []).forEach(z => { z.hp = 0; }); g.stepData.uses[0].fn(g); });
console.log('st', await p.evaluate(() => window.__atq.state + ' cut=' + !!window.__atq.game.cut)); for (const [k, ms] of [['a', 150], ['b', 600], ['c', 1200]]) { await p.waitForTimeout(ms); await p.screenshot({ path: `${OUT}/breaker-${k}.png` }); }
console.log('cut', JSON.stringify(await p.evaluate(() => { const c = window.__atq.game.cut; return c && { cam: c.cam && c.cam.toArray(), look: c.look && c.look.toArray() }; })));
await b.close();
