import { launch, client, ctxOpts } from './townlib.mjs';
const out = (process.env.OUT || '/workspace/atqtown/docs/mp-town-proof/') + '';
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await client(ctx, 'A'); await p.evaluate(() => { window.__MP_DTCAP = .15; });
const go = async (name, x, z, yaw, pitch = .3, dist = 4.6, wait = 2200) => { await p.evaluate(([x, z, yaw, pitch, dist]) => { const T = window.__mpTown; T.setPos(x, z); T.me.ry = yaw; T.setCam(yaw, pitch, dist); }, [x, z, yaw, pitch, dist]); await p.waitForTimeout(wait); await p.screenshot({ path: out + name + '.png' }); };
// view dir = (sin yaw, cos yaw)
await go('place_store_front', 0, -7, Math.PI, .28, 6.5);           // store is at (0,-18) facing +z
await go('place_store_inside', 0, -16, Math.PI, .55, 5.5, 3000);
await go('place_gas_forecourt', 36, -13.5, Math.PI / 2, .27, 6, 3000);
await go('place_gas_kiosk', 46, -9, Math.PI, .3, 5.5);
// pump refuel with the car parked at the pumps
console.log('pump cars', JSON.stringify(await p.evaluate(() => window.__mpTown.cars.filter(c => c.x > 38 && c.z > -16 && c.z < -10).map(c => [c.id, c.x, c.z, c.fuel.toFixed(1)]))));
await p.evaluate(() => { const T = window.__mpTown; const c = T.cars.find(c => c.id === 'c7'); window.__c = c; c.fuel = 3; T.setPos(c.x - 2.2, c.z + 1.2); T.setCam(Math.PI / 2, .3, 5); });
await p.waitForTimeout(3000); console.log('acts', JSON.stringify(await p.evaluate(() => window.__mpTown.acts()))); await p.screenshot({ path: out + 'place_pump_prompt.png' });
await p.evaluate(() => window.__mpTown.useHold(true)); await p.waitForTimeout(9000); await p.evaluate(() => window.__mpTown.useHold(false)); await p.waitForTimeout(1500);
console.log('fuel after', await p.evaluate(() => window.__c.fuel)); await p.screenshot({ path: out + 'place_pump_refueled.png' });
// exterior wrecked houses along streets
await go('place_street_houses_1', -24, -2, 0, .2, 7);   // N-S street x=-24 looking +z
await go('place_street_houses_2', 20, 24, Math.PI / 2, .18, 6);
await go('place_street_corner', -24, 24, Math.PI / 4, .22, 8);
await b.close();
