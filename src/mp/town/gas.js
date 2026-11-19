// "KL Fuel" gas station: canopy, 4 pumps on 2 islands, small shop (the kiosk building) and a pole sign. Original look, no real brand marks.
//   town:  buildTown(scene, { hooks: [addGas] })           // before statics are merged
//   game:  pumpNear(W,x,z) / refuelCar(pump,car,dt) / fillCan(pump,bag) / pourCan(bag,car)
import * as THREE from 'three';
import { signTex, klTex } from './kit.js';
import { makeBuilding } from './building.js';
import { GAS_LOT } from './map.js';

export const PRICE = 0;        // $ per litre: 0 = free fill-ups for now (pass `pay(cost)->bool` / set PRICE to charge)
export const GAS_CAN_L = 5;    // litres in a full gas can
export const PUMP_RATE = 7;    // litres per second while fuelling
const CX = 46, CZ = -13.5;     // station centre (pumps line, matches GAS_LOT.pumpZ)

export function addGas(W) {
  const { B, col, root, M } = W; const box = (m, x0, x1, y0, y1, z0, z1, c, s) => B.bounds(m, x0, x1, y0, y1, z0, z1, c, s);
  W.pumps = W.pumps || [];
  // shop (kiosk building from building.js), door faces the pumps
  const bd = makeBuilding(W, { id: 'kiosk', kind: 'kiosk', cx: GAS_LOT.kioskCX, cz: GAS_LOT.kioskCZ, w: 9, d: 7, face: 'N', ci: 5, locked: 0 }); W.enterable.push(bd); W.kiosk = bd;
  // forecourt slab + canopy
  box('concrete', CX - 14, CX + 14, 0, .07, CZ - 7.5, CZ + 4, '#c9c6bb');
  box('paint', CX - 13, CX + 13, 4.55, 4.95, CZ - 4.4, CZ + 4.4, '#f1efe6');           // canopy roof
  box('paint', CX - 13.05, CX + 13.05, 4.55, 4.95, CZ - 4.45, CZ - 4.3, '#2e8b57');   // green fascia stripes
  box('paint', CX - 13.05, CX + 13.05, 4.55, 4.95, CZ + 4.3, CZ + 4.45, '#2e8b57');
  box('paint', CX - 13.1, CX + 13.1, 4.15, 4.55, CZ - 4.5, CZ - 4.35, '#f2c230');     // yellow band
  box('paint', CX - 13.1, CX + 13.1, 4.15, 4.55, CZ + 4.35, CZ + 4.5, '#f2c230');
  for (const ix of [40, 52]) {
    box('concrete', ix - 3, ix + 3, 0, .22, CZ - .7, CZ + .7, '#d8d5ca');             // island
    box('paint', ix - 3, ix + 3, .22, .26, CZ - .15, CZ + .15, '#f2c230');
    for (const cx of [ix - 2.8, ix + 2.8]) { box('paint', cx - .22, cx + .22, 0.22, 4.55, CZ - .22, CZ + .22, '#e9e6dc'); col.add(cx - .3, cx + .3, CZ - .3, CZ + .3, 'prop'); }
    for (const dx of [-1.25, 1.25]) { const px = ix + dx;
      box('paint', px - .38, px + .38, .26, 1.5, CZ - .27, CZ + .27, '#d8392f');       // body
      box('paint', px - .42, px + .42, 1.5, 1.66, CZ - .31, CZ + .31, '#f4f1e8');      // cap
      box('dark', px - .27, px + .27, 1.05, 1.38, CZ - .285, CZ + .285, '#1a1d22');    // display band (both sides)
      box('paint', px - .1, px + .1, 1.12, 1.3, CZ - .29, CZ + .29, '#6df08a');        // green digits glow
      box('paint', px - .38, px + .38, .26, .4, CZ - .29, CZ + .29, '#f2c230');        // yellow kick
      for (const s of [-1, 1]) { box('dark', px - .09, px + .09, .72, 1.0, CZ + s * .27, CZ + s * .38, '#23262b'); box('dark', px + .09, px + .13, .5, .98, CZ + s * .31, CZ + s * .36, '#23262b'); } // nozzle holsters
      col.add(px - .45, px + .45, CZ - .35, CZ + .35, 'prop');
      W.pumps.push({ id: 'pump' + W.pumps.length, x: px, z: CZ, island: ix, fuel: 240, max: 240, reach: 3.2 });
    }
  }
  // pole sign by the road
  box('metal', CX - 17 - .15, CX - 17 + .15, 0, 7.4, -20.2 - .15, -20.2 + .15, '#8d9296'); col.add(CX - 17.2, CX - 16.8, -20.4, -20, 'prop');
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.6), new THREE.MeshStandardMaterial({ map: signTex(['KL FUEL', 'GAS · SNACKS'], '#1f6f45', '#fff6d6', 512, 320), roughness: .7, side: THREE.DoubleSide, emissive: '#2f9a63', emissiveIntensity: .4 })); sg.position.set(CX - 17, 8.1, -20.2); sg.rotation.y = Math.PI; root.add(sg);
  const badge = new THREE.Mesh(new THREE.CircleGeometry(.7, 24), new THREE.MeshBasicMaterial({ map: klTex() })); badge.rotation.y = Math.PI; badge.position.set(CX - 17, 10.0, -20.25); root.add(badge); const b2 = badge.clone(); b2.rotation.y = 0; b2.position.z = -20.15; root.add(b2);
  // canopy underside light panels (cheap emissive look) + fuel-pump KL badges
  const lm = new THREE.MeshBasicMaterial({ color: '#fff4cf' }); for (const x of [-9, -3, 3, 9]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(2.2, .5), lm); l.rotation.x = Math.PI / 2; l.position.set(CX + x, 4.52, CZ); root.add(l); }
  // small cartoon props: tyre stack + oil drums by the shop (no collision needed beyond a rect)
  const tyre = (x, z, y) => { const g = new THREE.CylinderGeometry(.42, .42, .26, 14); g.rotateZ(0); g.translate(x, y, z); B.addGeo('dark', g, null, '#202226'); };
  for (let k = 0; k < 4; k++) tyre(GAS_LOT.x1 - 2, -4, .13 + k * .26); col.add(GAS_LOT.x1 - 2.5, GAS_LOT.x1 - 1.5, -4.5, -3.5, 'prop');
  for (const [x, z, c] of [[GAS_LOT.x0 + 2, -2.8, '#c8402c'], [GAS_LOT.x0 + 3.1, -2.6, '#2f6fb0']]) { const g = new THREE.CylinderGeometry(.34, .34, .9, 12); g.translate(x, .45, z); B.addGeo('metal', g, null, c); col.add(x - .36, x + .36, z - .36, z + .36, 'prop'); }
}

// ---------------- gameplay helpers (no rendering) ----------------
export function pumpNear(W, x, z, r = 3.4) { let best = null, bd = r; for (const p of W.pumps || []) { const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = p; } } return best; }
/** Fill a car from a pump (call every frame while the player holds "refuel"). Returns litres added this call. pay(cost)->bool is optional. */
export function refuelCar(pump, car, dt, { pay, rate = PUMP_RATE, cap = car.cap || 55 } = {}) {
  if (!pump || !car || pump.fuel <= 0 || Math.abs(car.v) > .8) return 0; const want = Math.min(rate * dt, cap - car.fuel, pump.fuel); if (want <= 0) return 0;
  if (PRICE && pay && !pay(want * PRICE)) return 0; car.fuel += want; pump.fuel -= want; if (car.fuel > 0) car.stalled = false; return want; }
/** Fill an empty gas can in the bag (5 L). Returns true when it worked. */
export function fillCan(pump, bag, { pay } = {}) {
  if (!pump || pump.fuel < GAS_CAN_L || !bag.count('emptycan')) return false; if (PRICE && pay && !pay(GAS_CAN_L * PRICE)) return false; if (!bag.can('gascan')) return false; bag.remove('emptycan', 1); bag.add('gascan', 1); pump.fuel -= GAS_CAN_L; return true; }
/** Pour a full gas can into a car (+5 L, you get the empty can back). */
export function pourCan(bag, car, cap = car.cap || 55) { if (!bag.count('gascan') || car.fuel >= cap - .1) return false; bag.remove('gascan', 1); bag.add('emptycan', 1); car.fuel = Math.min(cap, car.fuel + GAS_CAN_L); car.stalled = false; return true; }
/**
 * Prompt entries in the town's gather() format ({label,d,alt,dur,run}) for the pumps. Works on foot (car parked at the pump) or while sitting in the car.
 *   L.push(...gasActions(W, { me, bag, cars, toast }))   // cars = the town's car array (or W.cars)
 */
export function gasActions(W, { me, bag, cars = W.cars || [], toast = () => {}, cap = 55 } = {}) {
  const L = []; const p = pumpNear(W, me.x, me.z, 3.6); if (!p) return L;
  let car = me.drv || null; if (!car) { let bd = 4.6; for (const c of cars) { const d = Math.hypot(c.x - p.x, c.z - p.z); if (d < bd && c.broken !== undefined) { bd = d; car = c; } } }
  if (car && Math.abs(car.v) < .8 && car.fuel < cap - 1 && p.fuel > 0 && (!car.driver || car.driver === 'me')) {
    const want = Math.min(cap - car.fuel, p.fuel); L.push({ label: 'Refuel ' + (car.kind || 'car') + ' (' + Math.round(car.fuel) + '/' + cap + ' L)', d: .3, dur: Math.max(.8, Math.min(8, want / PUMP_RATE)), run: () => { const n = Math.min(cap - car.fuel, p.fuel); car.fuel += n; p.fuel -= n; car.stalled = false; toast('+' + Math.round(n) + ' L'); if (car.driver === 'me' && !car.engine && car.fuel > 0) { car.engine = true; toast('Engine started'); } } }); }
  return L;
}
