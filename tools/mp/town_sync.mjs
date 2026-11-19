import { launch, client, ctxOpts } from './townlib.mjs';
const out = '/workspace/atqtown/docs/mp-town-proof/sync';
const b = await launch(); const ctx = await b.newContext(ctxOpts); const A = await client(ctx, 'A'); const B = await client(ctx, 'B');
for (const p of [A, B]) await p.evaluate(() => { window.__MP_DTCAP = .15; });
await A.waitForTimeout(3000);
console.log('peers', await A.evaluate(() => window.__mpTown.peers()), await B.evaluate(() => window.__mpTown.peers()));
// both stand near the house with a door; A buys the door
const H = await A.evaluate(() => { const T = window.__mpTown; const bd = T.W.enterable.find(b => b.kind === 'house'); const D = bd.doors.find(d => d.name === 'front'); window.__D = D; const ang = { S: 0, E: Math.PI / 2, N: Math.PI, W: -Math.PI / 2 }[bd.cfg.face]; return { id: bd.id, x: D.x + Math.sin(ang) * 3.4, z: D.z + Math.cos(ang) * 3.4, yaw: Math.atan2(-Math.sin(ang), -Math.cos(ang)), dx: D.x, dz: D.z }; });
await B.evaluate(h => { const T = window.__mpTown; window.__D = T.W.enterable.find(b => b.id === h.id).doors.find(d => d.name === 'front'); T.setPos(h.x + 2.5, h.z + 0.5); T.setCam(h.yaw, .3, 5); }, H);
await A.evaluate(h => { const T = window.__mpTown; T.setPos(h.x, h.z); T.me.ry = h.yaw + Math.PI; T.setCam(h.yaw, .3, 4.6); T.bag.add('cash', 50); T.buyDoor(window.__D); }, H);
await A.waitForTimeout(2500);
console.log('door installed on A/B', await A.evaluate(() => window.__D.installed), await B.evaluate(() => window.__D.installed));
await B.screenshot({ path: out + '_B_sees_A_and_door.png' });
// A opens the door (stand next to it), B sees it open
await A.evaluate(h => { const T = window.__mpTown; T.setPos(h.x - Math.sin(Math.atan2(h.x - h.dx, h.z - h.dz)) * 0, h.z); T.setPos(h.dx + (h.x - h.dx) * .4, h.dz + (h.z - h.dz) * .4); T.use(); }, H);
await A.waitForTimeout(2500); console.log('door state A/B', await A.evaluate(() => window.__D.state), await B.evaluate(() => window.__D.state));
await B.screenshot({ path: out + '_B_sees_door_open.png' });
// A loots a car container -> B sees it looted
const L = await A.evaluate(() => { const T = window.__mpTown; const c = T.cars[0]; T.openLoot(c.trunk); T.take && T.closePanel(); return c.id; });
const r = await A.evaluate(() => { const T = window.__mpTown; const k = T.W.containers.find(c => c.id === 'lf2' || c.kind === 'prop-duffel'); T.setPos(k.x + 1.2, k.z); T.openLoot(k); T.closePanel(); return { id: k.id, looted: k.looted }; });
await A.waitForTimeout(1500);
console.log('container', r.id, 'A looted', await A.evaluate(id => window.__mpTown.W.containers.find(c => c.id === id).looted, r.id), 'B looted', await B.evaluate(id => window.__mpTown.W.containers.find(c => c.id === id).looted, r.id));
// car drive sync
await A.evaluate(() => { const T = window.__mpTown; const c = T.cars.find(c => c.id === 'c1'); window.__c = c; T.setPos(c.x + 2, c.z); T.enter(c); T.key('KeyW', true); }); await A.waitForTimeout(6000);
console.log('car A/B', await A.evaluate(() => [window.__c.x, window.__c.z].map(v => +v.toFixed(1))), await B.evaluate(() => { const c = window.__mpTown.cars.find(c => c.id === 'c1'); return [c.x, c.z].map(v => +v.toFixed(1)); }));
await B.evaluate(() => { const c = window.__mpTown.cars.find(c => c.id === 'c1'); window.__mpTown.setPos(c.x - 6, c.z + 3); window.__mpTown.setCam(Math.PI / 2, .3, 6); }); await B.waitForTimeout(2500); await B.screenshot({ path: out + '_B_sees_A_driving.png' });
await b.close();
