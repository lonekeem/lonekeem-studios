import { launch, client, ctxOpts } from './townlib.mjs';
const out = '/workspace/atqtown/docs/mp-town-proof/zombie';
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await client(ctx, 'A'); await p.evaluate(() => { window.__MP_DTCAP = .5; });
const until = async (fn, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(fn)) return true; await p.waitForTimeout(500); } return false; };
await p.evaluate(() => { const T = window.__mpTown; T.Z.killNear(0, 0, 400, 9999); T.setPos(-6, 24); T.me.ry = Math.PI / 2; T.setCam(Math.PI / 2, .38, 7); window.__z = T.Z.spawnAt(-2, 29.5, { runner: false }); window.__z2 = T.Z.spawnAt(-4, 18.5, { runner: true }); });
await p.waitForTimeout(2500); await p.screenshot({ path: out + '_1_notice.png' });
await until(() => { const T = window.__mpTown; return Math.hypot(window.__z.root.position.x - T.me.x, window.__z.root.position.z - T.me.z) < 3.0 || window.__z2.dead; }, 90000);
await p.screenshot({ path: out + '_2_chase.png' }); console.log('chase', JSON.stringify(await p.evaluate(() => ({ st: window.__z.st, st2: window.__z2.st, hp: window.__mpTown.me.hp }))));
for (let i = 0; i < 10; i++) { if (await p.evaluate(() => window.__z.dead)) break; await p.evaluate(() => { const T = window.__mpTown, z = window.__z, q = z.root.position; T.me.ry = Math.atan2(q.x - T.me.x, q.z - T.me.z); T.me.hitCd = 0; T.hit(); }); await p.waitForTimeout(1200); if (i === 1) await p.screenshot({ path: out + '_2b_fighting.png' }); }
console.log('dead?', await p.evaluate(() => window.__z.dead), 'hp', await p.evaluate(() => window.__mpTown.me.hp));
for (let i = 0; i < 8; i++) { if (await p.evaluate(() => window.__z2.dead)) break; await p.evaluate(() => { const T = window.__mpTown, z = window.__z2, q = z.root.position; T.me.ry = Math.atan2(q.x - T.me.x, q.z - T.me.z); T.me.hitCd = 0; T.hit(); }); await p.waitForTimeout(1000); }
await p.waitForTimeout(3500); await p.screenshot({ path: out + '_3_melee_kill.png' });
console.log('both dead', await p.evaluate(() => [window.__z.dead, window.__z2.dead, window.__mpTown.me.hp]));
await p.evaluate(() => window.__mpTown.setCam(null, .5, 9)); await p.waitForTimeout(25000); await p.screenshot({ path: out + '_4_body_stays.png' });
console.log('bodies still there', await p.evaluate(() => [window.__z, window.__z2].map(z => [z.dead, z.root.visible, !!z.root.parent])));
await b.close();
