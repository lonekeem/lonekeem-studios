import { launch, client, ctxOpts } from './townlib.mjs';
const out = '/workspace/atqtown/docs/mp-town-proof/';
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await client(ctx, 'A'); await p.evaluate(() => { window.__MP_DTCAP = .15;
  window.__t = (sel, type, dx = 0, dy = 0, id = 7) => { const e = document.querySelector(sel); const r = e.getBoundingClientRect(); const x = r.left + r.width / 2 + dx, y = r.top + r.height / 2 + dy; const t = new Touch({ identifier: id, target: e, clientX: x, clientY: y, pageX: x, pageY: y }); e.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], targetTouches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true })); }; });
const T = (sel, type, dx, dy, id) => p.evaluate(([s, t, dx, dy, id]) => window.__t(s, t, dx, dy, id), [sel, type, dx, dy, id]);
const st = () => p.evaluate(() => { const m = window.__mpTown; return { x: +m.me.x.toFixed(2), z: +m.me.z.toFixed(2), y: +m.me.y.toFixed(2), crouch: m.shim.state.crouch, run: m.inp.run, hp: m.me.hp }; });
await p.evaluate(() => { window.__mpTown.Z.killNear(0, 0, 400, 9999); });
console.log('start', JSON.stringify(await st()));
// stick: drag up from the base centre => walk forward
await T('#stickZone', 'touchstart', -150, 100, 7); await T('#stickZone', 'touchmove', -150, 40, 7); await p.waitForTimeout(2500); console.log('walking', JSON.stringify(await st())); await p.screenshot({ path: out + 'ctl_walk.png' });
await T('#tRun', 'touchstart'); await p.waitForTimeout(2500); console.log('run toggled', JSON.stringify(await st())); await T('#stickZone', 'touchend', -150, 40, 7); await T('#tRun', 'touchstart');
await T('#tCrouch', 'touchstart'); await p.waitForTimeout(600); console.log('crouch', JSON.stringify(await st())); await T('#tCrouch', 'touchstart');
await T('#tJump', 'touchstart'); await p.waitForTimeout(250); console.log('jump', JSON.stringify(await st()));
await p.waitForTimeout(1500); await T('#tRoll', 'touchstart'); await p.waitForTimeout(300); console.log('roll', JSON.stringify(await st())); await p.screenshot({ path: out + 'ctl_roll.png' });
await T('#btnView', 'touchstart'); await p.waitForTimeout(800); await p.screenshot({ path: out + 'ctl_firstperson.png' }); await T('#btnView', 'touchstart');
await T('#btnSwap', 'touchstart'); await T('#btnGren', 'touchstart'); await p.waitForTimeout(500); await p.screenshot({ path: out + 'ctl_toast.png' });
// look drag on the right half
await p.evaluate(() => { window.__y0 = 0; }); const y0 = await p.evaluate(() => window.__mpTown.cam.rotation.y); await T('#stage', 'touchstart', 100, -80, 9); await T('#stage', 'touchmove', 220, -80, 9); await T('#stage', 'touchend', 220, -80, 9); await p.waitForTimeout(800); console.log('look moved camera', y0, await p.evaluate(() => window.__mpTown.cam.rotation.y));
// fire at a zombie
await p.evaluate(() => { const T = window.__mpTown; const z = T.Z.spawnAt(T.me.x + 1.0, T.me.z + 1.0, { runner: false }); window.__z = z; T.me.ry = Math.atan2(z.root.position.x - T.me.x, z.root.position.z - T.me.z); });
for (let i = 0; i < 8; i++) { if (await p.evaluate(() => window.__z.dead)) break; await p.evaluate(() => { const T = window.__mpTown, q = window.__z.root.position; T.me.ry = Math.atan2(q.x - T.me.x, q.z - T.me.z); T.me.hitCd = 0; }); await T('#tAtk', 'touchstart'); await T('#tAtk', 'touchend'); await p.waitForTimeout(900); }
console.log('FIRE killed zombie', await p.evaluate(() => window.__z.dead));
// pause
await T('#btnPause', 'touchstart'); await p.waitForTimeout(500); await p.screenshot({ path: out + 'ctl_pause.png' });
await b.close();
