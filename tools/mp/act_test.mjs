// Local-only test of the free-roam activities (jobs, dailies, safe house, barricades, traps, horde boss). Solo room; never joins the public lobby.
import { launch, context, page, enter, frames } from '../coop/lib.mjs';
import { mkdirSync, writeFileSync } from 'fs';
const OUT = process.env.OUT || '/workspace/atq-world-proof/act'; mkdirSync(OUT, { recursive: true });
const b = await launch(); const ctx = await context(b); const p = await page(ctx, 'A');
await enter(p, { name: 'ActTest', room: 'test-act-1' }); await frames(p, 20);
const R = {}; const shot = async n => { await frames(p, 10); await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/${n}.png` }); };
const ev = (f, a) => p.evaluate(f, a); const PARTS = process.env.PARTS || 'job,bar,horde,tut';
await ev(() => { const T = __mpTown; T.setWeather('clear'); T.setDay(.45); T.ACT.TUT.skip && T.ACT.TUT.skip(); });
if (PARTS.includes('job')) {
// 1) job: clear Falls Field, then kill its zombies
R.job = await ev(() => { const T = __mpTown, A = T.ACT; const c0 = T.bag.count('cash'); A.startJob('clr-field'); return { c0, job: A.state.job && A.state.job.def.id, n: A.state.job && A.state.job.spawned.length }; });
await frames(p, 20); await shot('job-start');
const jp = await ev(() => { const A = __mpTown.ACT; return A.jobPos['clr-field']; });
await ev(([x, z]) => { const T = __mpTown; T.setPos(x + 3, z + 3); T.setCam(0.8, .35, 14); }, [jp.x, jp.z]); await frames(p, 30); await shot('job-field');
for (let i = 0; i < 6; i++) { await ev(() => { const T = __mpTown, A = T.ACT; const s = A.state.job; if (!s) return; for (const z of s.spawned) if (!z.dead) T.Z.hurt(z, 9999, { x: 0, z: 1 }); }); await frames(p, 15); }
R.jobEnd = await ev(() => { const T = __mpTown, A = T.ACT; return { job: !!A.state.job, cash: T.bag.count('cash'), save: window.__atq.save.cash }; });
}
if (PARTS.includes('bar')) {
// 2) safe house + barricade + traps
R.safe = await ev(() => { const T = __mpTown, A = T.ACT, W = T.W; const ds = W.doors.filter(D => { const bb = W.buildings.find(q => q.cfg && q.cfg.id === D.bid); return bb && bb.kind === 'house'; });
  ds.sort((a, c) => Math.hypot(a.x + 6, a.z - 21.5) - Math.hypot(c.x + 6, c.z - 21.5)); const D = ds[0]; const bb = W.buildings.find(q => q.cfg.id === D.bid);
  const cx = (bb.rect.x0 + bb.rect.x1) / 2, cz = (bb.rect.z0 + bb.rect.z1) / 2; T.setPos(cx, cz); const L1 = T.gather().map(a => a.label);
  const a = T.gather().find(a => /safe house/.test(a.label)); a && a.run(); const sp = A.safeSpawn();
  const ox = D.x - Math.sin(D.ang || 0) * 1.3 * Math.sign((D.x - cx) * Math.sin(D.ang || 0) + (D.z - cz) * Math.cos(D.ang || 0) || 1), oz = D.z - Math.cos(D.ang || 0) * 1.3 * Math.sign((D.x - cx) * Math.sin(D.ang || 0) + (D.z - cz) * Math.cos(D.ang || 0) || 1);
  window.__tD = { D: { x: D.x, z: D.z, ang: D.ang }, cx, cz };
  return { door: D.id, bid: D.bid, L1, claimed: A.state.safe, sp }; });
R.bar = await ev(() => { const T = __mpTown, A = T.ACT; const { D, cx, cz } = window.__tD; const vx = D.x - cx, vz = D.z - cz, l = Math.hypot(vx, vz); T.setPos(D.x + vx / l * 1.4, D.z + vz / l * 1.4);
  T.bag.add('cash', 300); T.syncBagToSave(); T.me.ry = Math.atan2(vx, vz); const L = T.gather().map(a => a.label); const a = T.gather().find(a => /Barricade doorway/.test(a.label)); const c0 = T.bag.count('cash'); a && a.run(); const L2 = T.gather().map(a => a.label);
  const t1 = A.placeTrap('spike'); T.setPos(D.x + vx / l * 2.6, D.z + vz / l * 2.6); const t2 = A.placeTrap('snare');
  return { L, built: A.bars.length, cost: c0 - T.bag.count('cash'), L2, traps: A.traps.length }; });
await ev(() => { const T = __mpTown; const { D, cx, cz } = window.__tD; const vx = D.x - cx, vz = D.z - cz, l = Math.hypot(vx, vz); const yaw = Math.atan2(-vx, -vz); T.setPos(D.x + vx / l * 3.2, D.z + vz / l * 3.2); T.setCam(yaw, .3, 5); });
await shot('barricade');
// zombies at the barricade: put the player inside, spawn walkers outside
R.siege0 = await ev(() => { const T = __mpTown, A = T.ACT; const { D, cx, cz } = window.__tD; const vx = D.x - cx, vz = D.z - cz, l = Math.hypot(vx, vz); T.setPos(D.x - vx / l * 1.6, D.z - vz / l * 1.6); T.me.god = true;
  const zs = []; for (let i = 0; i < 6; i++) { const z = T.Z.spawnAt(D.x + vx / l * (5 + i * .7) + (i % 3 - 1) * .8, D.z + vz / l * (5 + i * .7) + (i % 2 ? .6 : -.6)); if (z) { z.st = 'chase'; zs.push(z); } } window.__tZ = zs; return { sp: zs.length, k0: T.Z.stats().killed, hp: A.bars[0] && A.bars[0].hp }; });
for (let i = 0; i < 8; i++) { await frames(p, 30); }
R.siege1 = await ev(() => { const T = __mpTown, A = T.ACT; return { k: T.Z.stats().killed, hp: A.bars[0] ? A.bars[0].hp : 'broken', traps: A.traps.map(t => t.k + ':' + t.uses), daily: A.state.daily.list.map(c => c.k + ' ' + c.got + '/' + c.n), hp_me: T.me.hp }; });
await ev(() => { const T = __mpTown; const { D, cx, cz } = window.__tD; const vx = D.x - cx, vz = D.z - cz, l = Math.hypot(vx, vz); const yaw = Math.atan2(vx, vz); T.setCam(yaw, .35, 4); });
await shot('siege');
}
if (PARTS.includes('horde')) {
// 3) horde night -> boss before dawn
await ev(() => { const T = __mpTown; T.setPos(-6, 21.5); T.setDay(.05); }); for (let i = 0; i < 6; i++) await frames(p, 20);
R.night = await ev(() => { const T = __mpTown, A = T.ACT; return { horde: A.state.horde.night, target: T.Z.target }; });
await shot('horde-night');
await ev(() => { __mpTown.ACT.state.horde.nightT = 999; __mpTown.setDay(.2); }); for (let i = 0; i < 8; i++) await frames(p, 20);
R.boss = await ev(() => { const T = __mpTown, A = T.ACT; const bz = A.state.horde.boss; return bz ? { hp: bz.hp, max: bz.maxHp, x: bz.root.position.x, z: bz.root.position.z, sc: bz.root.scale.x } : null; });
if (R.boss) { await ev(([x, z]) => { const T = __mpTown; T.setPos(x + 5, z + 5); const yaw = Math.atan2(-5, -5); T.me.ry = yaw; T.setCam(yaw, .25, 8); }, [R.boss.x, R.boss.z]); await frames(p, 10); await shot('boss'); }
R.bossKill = await ev(() => { const T = __mpTown, A = T.ACT; const bz = A.state.horde.boss; if (!bz) return null; const c0 = T.bag.count('cash'); T.Z.hurt(bz, 99999, { x: 0, z: 1 }); return c0; });
await frames(p, 20); R.bossAfter = await ev(() => ({ cash: __mpTown.bag.count('cash'), done: __mpTown.ACT.state.horde.bossDone }));
}
// 4) tutorial + phone check
await ev(() => { const T = __mpTown; T.setDay(.45); T.setPos(-6, 21.5); T.setCam(1.57, .2, 9); T.ACT.TUT.start(true); }); await shot('tutorial');
R.stats = await ev(() => __mpTown.stats()); R.errs = p.errs; R.nf = p.nf;
console.log(JSON.stringify(R, null, 1)); writeFileSync(`${OUT}/info.json`, JSON.stringify(R, null, 1)); await b.close();
