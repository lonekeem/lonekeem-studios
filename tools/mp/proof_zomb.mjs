import { open } from './pshot.mjs';
const { b, p } = await open(5211, 1000, 700); const out = '/workspace/atqtown2/docs/mp-props-proof';
const r1 = await p.evaluate(async () => { H.players[0].x = 0; H.players[0].z = 21.5; const Z = await H.mkZ({ target: 14 }); const t0 = performance.now(); H.step(60, 1 / 30); const dt = performance.now() - t0;
  const P = Z.zombies.filter(z => !z.dead).map(z => [+z.root.position.x.toFixed(0), +z.root.position.z.toFixed(0), z.st]); return { stats: { ...Z.stats() }, ms60: Math.round(dt), P }; });
console.log(JSON.stringify(r1));
// wander: positions after 20 s of game time
const r2 = await p.evaluate(() => { const Z = H.Z; const before = Z.zombies.map(z => [z.root.position.x, z.root.position.z]); H.step(30 * 20, 1 / 30); const moved = Z.zombies.map((z, i) => Math.hypot(z.root.position.x - before[i][0], z.root.position.z - before[i][1])); return { avgMoved: +(moved.reduce((a, b) => a + b, 0) / moved.length).toFixed(1), stats: { ...Z.stats() }, states: Z.zombies.map(z => z.st).join(',') }; });
console.log(JSON.stringify(r2));
// chase scene: 5 zombies spawned 12 m away on the main street, player stands still
const r3 = await p.evaluate(() => { const Z = H.Z; Z.zombies.forEach(z => { z.root.visible = false; z.dead = true; z.deadT = 99; }); const pl = H.players[0]; pl.x = 0; pl.z = 21.5; H.hits = 0;
  const zs = [[-12, 20.5, false], [-14, 22.5, false], [14, 21, true], [18, 23, false], [-10, 24, true]].map(([x, z, r]) => Z.spawnAt(x, z, { runner: r })); zs.forEach(z => { z.st = 'chase'; z.lose = 0; });
  H.chaseZ = zs; H.step(30 * 4, 1 / 30); const d = zs.map(z => +Math.hypot(z.root.position.x - pl.x, z.root.position.z - pl.z).toFixed(1)); H.look(-4, 2.0, 15.5, 2, 1.1, 24); return { dist: d, hits: H.hits }; });
console.log(JSON.stringify(r3)); await p.waitForTimeout(300); await p.screenshot({ path: out + '/zombies_chase.png' });
const r4 = await p.evaluate(() => { const Z = H.Z, pl = H.players[0]; H.step(30 * 3, 1 / 30); const near = Z.killNear(pl.x, pl.z, 1.8, 30); H.step(15, 1 / 30); const k1 = Z.killNear(pl.x, pl.z, 3, 100); H.step(60, 1 / 30);
  const dead = H.chaseZ.filter(z => z.dead).length; H.look(-3, 2.2, 17, 1, .5, 22); return { hits: H.hits, melee1: near, melee2: k1, deadOfFive: dead, stats: { ...Z.stats() } }; });
console.log(JSON.stringify(r4)); await p.waitForTimeout(300); await p.screenshot({ path: out + '/zombies_bodies.png' });
// run over with the car
const r5 = await p.evaluate(() => { const Z = H.Z; Z.zombies.forEach(z => { if (!z.dead) { z.dead = true; } }); const car = H.cars.byId.c13; car.x = -12; car.z = 22.7; car.ry = Math.PI / 2; car.driver = 'me'; car.engine = true; car.fuel = 50; H.players[0].car = car; H.players[0].x = 30; H.players[0].z = 22;
  const zs = [0, 6, 12].map((x, i) => Z.spawnAt(x, 22.7 + (i - 1) * .6, { runner: false })); zs.forEach(z => { z.st = 'wander'; z.node = -1; }); let n = 0, vmax = 0; for (let i = 0; i < 150; i++) { H.step(1, 1 / 30, { gas: 1, steer: 0, brake: false }); n += Z.runOver(car); vmax = Math.max(vmax, car.v); if (n >= 3) { H.step(10, 1/30, { gas: 0, steer: 0, brake: true }); break; } }
  H.look(car.x - 3, 2.6, car.z - 7.5, car.x + 4, .6, car.z + .5); return { ranOver: n, vmax: +vmax.toFixed(1), carHp: +car.hp.toFixed(1), killed: zs.filter(z => z.dead).length, carX: +car.x.toFixed(1) }; });
console.log(JSON.stringify(r5)); await p.waitForTimeout(300); await p.screenshot({ path: out + '/zombies_runover.png' });
await b.close();
