import { launch, client, ctxOpts } from './townlib.mjs';
const out = '/workspace/atqtown/docs/mp-town-proof/car';
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await client(ctx, 'A'); await p.evaluate(() => { window.__MP_DTCAP = .12; });
const near = (id, dx = 0, dz = 3.2, yaw) => p.evaluate(([id, dx, dz, yaw]) => { const T = window.__mpTown; const c = T.cars.find(c => c.id === id); window.__car = c; T.setPos(c.x + dx, c.z + dz); T.setCam(yaw ?? Math.atan2(-dx, -dz), .3, 4.4); return { x: c.x, z: c.z, ry: c.ry, lock: c.lock, broken: c.broken, fuel: c.fuel }; }, [id, dx, dz, yaw]);
// locked suv c10: break-in
console.log('c10', JSON.stringify(await near('c10', 2.2, 0, -Math.PI / 2))); await p.waitForTimeout(3500); console.log('acts', await p.evaluate(() => window.__mpTown.acts())); await p.screenshot({ path: out + '_1_locked_prompt.png' });
await p.evaluate(() => window.__mpTown.useHold(true)); await p.waitForTimeout(6000); await p.evaluate(() => window.__mpTown.useHold(false)); await p.waitForTimeout(1500);
console.log('after smash broken=', await p.evaluate(() => window.__car.broken), await p.evaluate(() => window.__mpTown.acts())); await p.screenshot({ path: out + '_2_smashed.png' });
// search cabin
await p.evaluate(() => { const T = window.__mpTown, c = window.__car; T.openLoot(c.cabin); }); await p.waitForTimeout(1500); await p.screenshot({ path: out + '_3_cabin_loot.png' }); await p.evaluate(() => window.__mpTown.closePanel());
// unlocked sedan c1: enter + drive
console.log('c1', JSON.stringify(await near('c1', 2.2, 0, -Math.PI / 2))); await p.waitForTimeout(3000);
await p.evaluate(() => { const T = window.__mpTown; T.enter(window.__car); T.key('KeyW', true); }); await p.waitForTimeout(9000);
console.log('drive', JSON.stringify(await p.evaluate(() => { const c = window.__car; return { x: c.x, z: c.z, v: c.v, fuel: c.fuel, eng: c.engine }; }))); await p.screenshot({ path: out + '_4_driving_gauge.png' });
// run out of fuel
await p.evaluate(() => { window.__car.fuel = .03; }); await p.waitForTimeout(8000);
console.log('empty', JSON.stringify(await p.evaluate(() => { const c = window.__car; return { v: c.v, fuel: c.fuel, eng: c.engine }; }))); await p.screenshot({ path: out + '_5_out_of_fuel.png' });
await p.evaluate(() => { const T = window.__mpTown; T.key('KeyW', false); T.exitCar(); T.bag.add('gascan', 1); }); await p.waitForTimeout(3500); console.log('acts', await p.evaluate(() => window.__mpTown.acts()));
await p.evaluate(() => window.__mpTown.alt()); await p.evaluate(() => window.__mpTown.useHold(true)); await p.waitForTimeout(5000); await p.evaluate(() => window.__mpTown.useHold(false)); await p.waitForTimeout(1500);
console.log('refuel', JSON.stringify(await p.evaluate(() => ({ fuel: window.__car.fuel, gas: window.__mpTown.bag.count('gascan'), empty: window.__mpTown.bag.count('emptycan') })))); await p.screenshot({ path: out + '_6_refuel.png' });
await b.close();
