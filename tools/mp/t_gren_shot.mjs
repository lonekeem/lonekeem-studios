import { boot } from '../mpfix/lib.mjs';
const { b, p } = await boot(); const fr = n => p.evaluate(n => new Promise(r => { let k = 0; const f = () => { if (++k >= n) r(); else requestAnimationFrame(f); }; requestAnimationFrame(f); }), n);
await p.evaluate(() => { const t = window.__mpTown; t.Z.killNear(t.me.x, t.me.z, 400, 9999); for (const d of [10.5, 12.5]) { const q = t.Z.spawnAt(t.me.x + Math.sin(t.me.ry) * d, t.me.z + Math.cos(t.me.ry) * d + (d > 11 ? 1.2 : 0), {}); q.st = 'idle'; } t.setCam(null, .5, 9); });
await p.keyboard.press('KeyG'); for (let k = 0; k < 40; k++) { await fr(1); if (await p.evaluate(() => !!window.__mpTown.S.lastBoom)) break; }
await p.evaluate(() => { window.__MP_DTCAP = .0005; }); await fr(4); await p.screenshot({ path: '/workspace/atq1919/docs/mp-fix2/ctl/grenade_fireball.png' }); await b.close();
