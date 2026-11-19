import { launch, client, ctxOpts } from './townlib.mjs';
const out = process.env.OUT || '/workspace/atqtown/docs/mp-town-final/';
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await client(ctx, 'A'); await p.evaluate(() => { window.__MP_DTCAP = .15; });
await p.waitForTimeout(3500); await p.screenshot({ path: out + 'start_street.png' });
console.log('start stats', await p.evaluate(() => { const T = window.__mpTown, R = T.renderer; R.info.autoReset = false; R.info.reset(); R.render(T.scene, T.cam); const i = R.info.render; const o = { calls: i.calls, tris: i.triangles, zombies: T.Z.stats() }; R.info.autoReset = true; return JSON.stringify(o); }));
// run-over: car on the south road z=26.1 heading +x, zombies ahead in the lane
await p.evaluate(() => { const T = window.__mpTown; T.Z.killNear(0, 0, 400, 9999); const c = T.cars[0]; window.__c = c; T.setPos(c.x + 2, c.z); T.enter(c); });
await p.waitForTimeout(1200);
await p.evaluate(() => { const T = window.__mpTown, c = window.__c; window.__zs = []; for (let i = 0; i < 4; i++) { const z = T.Z.spawnAt(c.x + 22 + i * 3.5, c.z + (i % 2 ? .6 : -.6), {}); window.__zs.push(z); } document.querySelector('#dGas').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' })); });
let shot = 0; for (let i = 0; i < 16; i++) { await p.waitForTimeout(700); const st = await p.evaluate(() => ({ v: +window.__c.v.toFixed(1), x: +window.__c.x.toFixed(1), dead: window.__zs.filter(z => z.dead).length })); console.log(JSON.stringify(st)); if (st.dead >= 1 && shot < 2) { await p.screenshot({ path: out + 'runover_' + (++shot) + '.png' }); } if (st.dead >= 3) break; }
console.log('runover dead', await p.evaluate(() => window.__zs.filter(z => z.dead).length)); await b.close();
