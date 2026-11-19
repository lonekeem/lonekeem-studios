import { launch, client, ctxOpts } from './townlib.mjs';
const out = '/workspace/atqtown/docs/mp-town-proof/zombie';
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await client(ctx, 'A'); await p.evaluate(() => { window.__MP_DTCAP = .25;
  // pop-in monitor: every new zombie is checked for "visible to the camera and inside the fog" at the moment it first exists
  const T = window.__mpTown; const seen = new Set(T.Z.zombies); window.__pop = { n: 0, bad: 0, minDist: 1e9, offscreen: 0, beyondFog: 0 };
  const v = T.cam.position.clone(); setInterval(() => { T.cam.updateMatrixWorld(); for (const z of T.Z.zombies) if (!seen.has(z)) { seen.add(z); const P = window.__pop; P.n++; const q = z.root.position; const d = Math.hypot(q.x - T.me.x, q.z - T.me.z); P.minDist = Math.min(P.minDist, d); v.set(q.x, 1, q.z).applyMatrix4(T.cam.matrixWorldInverse).applyMatrix4(T.cam.projectionMatrix); const on = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05; if (!on) P.offscreen++; else if (d > 105) P.beyondFog++; else P.bad++; } }, 50); });
// 1) never-ending: wipe every live zombie, watch the count come back from the edges
const zs = () => p.evaluate(() => { const s = window.__mpTown.Z.stats; return { alive: s.alive, dead: s.dead, spawned: s.spawned, killed: s.killed }; });
console.log('start', JSON.stringify(await zs()));
await p.evaluate(() => { const T = window.__mpTown; T.setPos(0, 21.5); T.Z.killNear(0, 0, 400, 9999); }); await p.waitForTimeout(500); console.log('wiped', JSON.stringify(await zs()));
await p.waitForTimeout(60000); console.log('after 60s', JSON.stringify(await zs()), JSON.stringify(await p.evaluate(() => window.__pop)));
// 2) zombie near, chase, hit
const place = () => p.evaluate(() => { const T = window.__mpTown; const z = T.Z.zombies.find(z => !z.dead); const q = z.root.position; window.__z = z; T.setPos(q.x + 5, q.z + 5); T.setCam(Math.atan2(-5, -5), .28, 4.6); return { x: q.x, z: q.z, st: z.st }; });
console.log('placed', JSON.stringify(await place())); await p.waitForTimeout(4000); await p.screenshot({ path: out + '_1_notice.png' });
await p.waitForTimeout(5000); console.log('state', JSON.stringify(await p.evaluate(() => ({ st: window.__z.st, hp: window.__mpTown.me.hp, d: Math.hypot(window.__z.root.position.x - window.__mpTown.me.x, window.__z.root.position.z - window.__mpTown.me.z) })))); await p.screenshot({ path: out + '_2_chase.png' });
// face the zombie and hit
await p.evaluate(() => { const T = window.__mpTown, z = window.__z, q = z.root.position; T.me.ry = Math.atan2(q.x - T.me.x, q.z - T.me.z); T.hit(); }); await p.waitForTimeout(1500);
for (let i = 0; i < 6 && !(await p.evaluate(() => window.__z.dead)); i++) { await p.evaluate(() => { const T = window.__mpTown, z = window.__z, q = z.root.position; T.me.ry = Math.atan2(q.x - T.me.x, q.z - T.me.z); T.me.hitCd = 0; T.hit(); }); await p.waitForTimeout(2200); }
console.log('dead?', await p.evaluate(() => window.__z.dead), JSON.stringify(await zs())); await p.waitForTimeout(3000); await p.screenshot({ path: out + '_3_melee_kill.png' });
// 3) body stays: wait, still counted + visible
await p.waitForTimeout(20000); console.log('body after 20s', await p.evaluate(() => ({ dead: window.__z.dead, vis: window.__z.root.visible, inScene: !!window.__z.root.parent }))); await p.screenshot({ path: out + '_4_body_stays.png' });
console.log('popin', JSON.stringify(await p.evaluate(() => window.__pop)), JSON.stringify(await p.evaluate(() => window.__mpTown.stats())));
await b.close();
