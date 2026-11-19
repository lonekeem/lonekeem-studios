// Bat in hand: rest + swing phases, close-up (local view). OUT tag via env TAG
import { boot, freecam } from '../mpfix/lib.mjs'; import fs from 'fs';
const OUT = '/workspace/atq1919/docs/mp-fix3/bat'; fs.mkdirSync(OUT, { recursive: true }); const TAG = process.env.TAG || 'a';
const { b, p } = await boot(); const fr = n => p.evaluate(n => new Promise(r => { let k = 0; const f = () => { if (++k >= n) r(); else requestAnimationFrame(f); }; requestAnimationFrame(f); }), n);
await p.evaluate(() => { const t = window.__mpTown; t.Z.killNear(0, 0, 400, 9999); t.setPos(-6, 21.5); t.me.ry = Math.PI / 2; t.camYaw(Math.PI / 2); t.bag.add('bat', 1); t.bag.pref = 'bat'; });
await fr(6);
const cam = () => p.evaluate(() => { const t = window.__mpTown; return [t.me.x, t.me.z]; });
const shot = async (n, side) => { const [x, z] = await cam(); await freecam(p, side ? [x + 0.2, 1.3, z + 2.4] : [x + 1.2, 1.5, z + 1.8], [x, 1.0, z]); await fr(2); await p.screenshot({ path: `${OUT}/${TAG}_${n}.png`, clip: { x: 230, y: 40, width: 400, height: 350 } }); };
await shot('rest_front'); await shot('rest_side', 1);
await p.evaluate(() => { window.__MP_DTCAP = .03; window.__mpTown.hit(); });
for (let i = 0; i < 5; i++) { await fr(3); const a = await p.evaluate(() => window.__mpTown.S.atk.toFixed(2) + ' ' + window.__mpTown.me.av.motion.curName); console.log(i, a); await shot('swing' + i, 1); }
await b.close();
