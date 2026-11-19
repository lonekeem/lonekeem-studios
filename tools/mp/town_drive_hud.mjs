import { launch, client, ctxOpts } from './townlib.mjs';
const out = '/workspace/atqtown/docs/mp-town-proof/';
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await client(ctx, 'A'); await p.evaluate(() => { window.__MP_DTCAP = .15; window.__mpTown.Z.killNear(0, 0, 400, 9999); });
await p.waitForTimeout(800); await p.screenshot({ path: out + 'hud_mp.png' });
const info = await p.evaluate(() => { const T = window.__mpTown; const c = T.cars[0]; T.setPos(c.x + 2, c.z); T.enter(c); return { id: c.id, drv: !!T.me.drv, fuel: c.fuel }; }); console.log(JSON.stringify(info));
await p.waitForTimeout(1500);
await p.evaluate(() => { const e = document.querySelector('#dGas'); const r = e.getBoundingClientRect(); const t = new Touch({ identifier: 5, target: e, clientX: r.left + 8, clientY: r.top + 8 }); e.dispatchEvent(new TouchEvent('touchstart', { touches: [t], changedTouches: [t], bubbles: true, cancelable: true })); });
const p0 = await p.evaluate(() => [window.__mpTown.me.x, window.__mpTown.me.z]); await p.waitForTimeout(4500); const p1 = await p.evaluate(() => [window.__mpTown.me.x, window.__mpTown.me.z]);
console.log('moved', JSON.stringify(p0), JSON.stringify(p1), 'driving', await p.evaluate(() => document.body.classList.contains('driving'))); await p.screenshot({ path: out + 'hud_mp_driving.png' }); await b.close();
