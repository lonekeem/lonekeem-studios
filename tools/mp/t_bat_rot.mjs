import { boot, freecam } from '../mpfix/lib.mjs'; import fs from 'fs';
const OUT = '/workspace/atq1919/docs/mp-fix3/bat'; const { b, p } = await boot(); const fr = n => p.evaluate(n => new Promise(r => { let k = 0; const f = () => { if (++k >= n) r(); else requestAnimationFrame(f); }; requestAnimationFrame(f); }), n);
await p.evaluate(() => { const t = window.__mpTown; t.Z.killNear(0, 0, 400, 9999); t.setPos(-6, 21.5); t.me.ry = Math.PI / 2; t.camYaw(Math.PI / 2); t.bag.add('bat', 1); });
const C = JSON.parse(process.env.ROTS); let k = 0;
for (const r of C) { await p.evaluate(r => { window.__batRot = r.slice(0, 3); const t = window.__mpTown; t.bag.pref = 'fists'; }, r); await fr(3); await p.evaluate(() => { window.__mpTown.bag.pref = 'bat'; window.__MP_DTCAP = .15; }); await fr(4);
  const [x, z] = await p.evaluate(() => [window.__mpTown.me.x, window.__mpTown.me.z]); await freecam(p, [x + .2, 1.3, z + 2.4], [x, 1.0, z]); await fr(2); await p.screenshot({ path: `${OUT}/rot${k}_rest.png`, clip: { x: 230, y: 40, width: 400, height: 350 } });
  await p.evaluate(() => { window.__MP_DTCAP = .03; window.__mpTown.hit(); }); await fr(6); await p.screenshot({ path: `${OUT}/rot${k}_swing.png`, clip: { x: 230, y: 40, width: 400, height: 350 } }); await fr(30); k++; }
await b.close();
