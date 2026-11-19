import { open } from './pshot.mjs';
const { b, p } = await open(); const out = '/workspace/atqtown2/docs/mp-props-proof';
const log = await p.evaluate(async () => { await H.mkZ({ target: 0 }); const L = {}; const C = H.cars, car = C.byId.c7, pump = H.W.pumps[0];
  L.truckStart = { x: car.x, z: car.z, fuel: car.fuel, lock: car.lock };
  L.enterEmpty = C.enter(car); L.engineWithNoFuel = car.engine;
  H.pl = H.players[0]; H.pl.x = car.x; H.pl.z = car.z + 3;
  const pn = H.pumpNear(H.W, car.x - 1.2, H.W.pumps[0].z); L.pumpFound = pn && pn.id;
  let added = 0; for (let i = 0; i < 400; i++) added += H.refuelCar(pn, car, 1 / 30); L.refueled = { added: +added.toFixed(1), fuel: +car.fuel.toFixed(1), cap: H.CAP, pumpStock: pn.fuel };
  L.enter2 = C.enter(car); L.engineOn = car.engine;
  // locked car + crowbar
  const sd = C.byId.c2; L.lockedEnter = C.enter(sd); const bag = new H.Bag(); L.breakNoBar = C.breakIn(sd, bag); bag.add('crowbar', 1); L.breakBar = C.breakIn(sd, bag); L.afterBreak = C.enter(sd); C.exit(sd);
  // gas can
  const bg = new H.Bag(); bg.add('emptycan', 1); L.fillCan = H.fillCan(pn, bg); const c8 = C.byId.c8; const f0 = c8.fuel; L.pour = H.pourCan(bg, c8); L.canFuel = [+f0.toFixed(1), +c8.fuel.toFixed(1)]; L.bagAfter = JSON.stringify(bg.items);
  H.look(36, 2.4, -19, 41, 1, -15.9); return L; });
console.log(JSON.stringify(log, null, 1)); await p.screenshot({ path: out + '/car_at_pump.png' });
// drive 4 seconds out of the station onto the road
const drv = await p.evaluate(() => { const car = H.cars.byId.c7; car.driver = 'me'; H.players[0].car = car; const f0 = car.fuel, x0 = car.x, z0 = car.z; H.step(30 * 3, 1 / 30, { gas: 1, steer: 0, brake: false }); const mid = { x: car.x, z: car.z, v: car.v, ry: car.ry };
  H.step(30, 1 / 30, { gas: 1, steer: -.6, brake: false }); H.look(car.x - 9, 4.5, car.z - 9, car.x, 1, car.z); return { from: [x0, z0], mid, to: [+car.x.toFixed(1), +car.z.toFixed(1)], v: +car.v.toFixed(1), fuelUsed: +(f0 - car.fuel).toFixed(2), ry: +car.ry.toFixed(2) }; });
console.log(JSON.stringify(drv)); await p.waitForTimeout(300); await p.screenshot({ path: out + '/car_driving.png' });
await p.evaluate(() => { H.look(10, 1.8, 17, 8, 1, 21.8); }); await p.screenshot({ path: out + '/car_kl_front.png' });
await b.close();
