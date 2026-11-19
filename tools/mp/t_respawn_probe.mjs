import { launch, client, ctxOpts } from '../mpfix/lib.mjs';
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await client(ctx, 'A');
p.on('pageerror', e => console.log('PAGEERR', e.message));
await p.evaluate(() => { window.__MP_DTCAP = .3; window.__mpTown.Z.killNear(0, 0, 400, 9999); });
const snap = () => p.evaluate(() => { const t = window.__mpTown; const P = t.me.av.motion; return { hp: t.me.hp, dead: +t.me.dead.toFixed(3), prot: t.me.prot, x: +t.me.x.toFixed(1), z: +t.me.z.toFixed(1), vis: t.me.av.root.visible, rootpos: t.me.av.root.position.toArray().map(v => +v.toFixed(1)), cur: P && P.curName, hud: document.querySelector('#hpTxt').textContent.slice(0, 20), dispDead: document.querySelector('#mpt .dead').style.display, ammo: document.querySelector('#ammoTxt').textContent.slice(0, 30) }; });
await p.evaluate(() => window.__mpTown.hurt(46)); await p.evaluate(() => window.__mpTown.hurt(100));
for (let i = 0; i < 14; i++) { await p.waitForTimeout(700); console.log(i, JSON.stringify(await snap())); }
await p.evaluate(() => window.__mpTown.hurt(30)); await p.waitForTimeout(700); console.log('after hurt30', JSON.stringify(await snap()));
await p.evaluate(() => { const t = window.__mpTown; t.GS.cd = 0; t.GS.rl = 0; t.fireGun(); }); console.log('after fire', JSON.stringify(await snap()));
await b.close();
