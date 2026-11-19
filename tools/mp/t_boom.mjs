// Grenade explosion look: flash / fireball / smoke frames at 0.05, 0.3, 0.7, 1.5, 2.6 s after the blast
import { boot, freecam } from '../mpfix/lib.mjs'; import fs from 'fs';
const OUT = '/workspace/atq1919/docs/mp-fix3/boom'; fs.mkdirSync(OUT, { recursive: true }); const TAG = process.env.TAG || 'a';
const { b, p } = await boot(); const fr = n => p.evaluate(n => new Promise(r => { let k = 0; const f = () => { if (++k >= n) r(); else requestAnimationFrame(f); }; requestAnimationFrame(f); }), n);
await p.evaluate(() => { const t = window.__mpTown; t.Z.killNear(0, 0, 400, 9999); t.setPos(-6, 21.5); t.me.ry = Math.PI / 2; t.camYaw(Math.PI / 2); t.setCam(null, .35, 6); t.bag.add('grenade', 2); });
await fr(4); await p.keyboard.press('KeyG'); await fr(9); await p.evaluate(() => { window.__MP_DTCAP = .02; }); let k = 0; while (k++ < 60) { await fr(1); if (await p.evaluate(() => !!window.__mpTown.S.lastBoom)) break; }
await p.evaluate(() => { window.__MP_DTCAP = .0005; }); await fr(3);
let T = 0; for (const [name, t] of [['t0.05', .06], ['t0.3', .3], ['t0.7', .7], ['t1.5', 1.5], ['t2.6', 2.6]]) { const steps = Math.round((t - T) / .05); if (steps > 0) { await p.evaluate(() => { window.__MP_DTCAP = .05; }); await fr(steps); await p.evaluate(() => { window.__MP_DTCAP = .0005; }); await fr(3); } T = t; await p.screenshot({ path: `${OUT}/${TAG}_${name}.png` }); if (process.env.CLOSE) { const bm = await p.evaluate(() => window.__mpTown.S.lastBoom); await freecam(p, [bm.x - 9, 2.6, bm.z + 8], [bm.x, 2.2, bm.z]); await fr(3); await p.screenshot({ path: `${OUT}/${TAG}_close_${name}.png` }); } }
await b.close();
