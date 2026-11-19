// Drivable real-world-style cars (CC0 low-poly bodies, no manufacturer marks) wearing the original "KL" emblem. Fuel, break-in, loot, wrecks.
import { stepVehicle } from '../../game/pctl.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BASE, klTex, mulberry } from './kit.js';
import { CAR_SPAWNS } from './map.js';

const KEYS = ['sedan', 'suv', 'truck', 'van', 'hatchback-sports', 'suv-luxury', 'debris-tire', 'debris-door', 'debris-bumper'];
export async function loadCarModels() { const M = {}; await Promise.all(KEYS.map(k => new GLTFLoader().loadAsync(BASE + 'models/cars/' + k + '.glb').then(g => { M[k] = g.scene; }).catch(e => console.warn('car model', k, e)))); return M; }
const LEN = { truck: 5.2, van: 5, 'hatchback-sports': 4, sedan: 4.5, suv: 4.6, 'suv-luxury': 4.7 };
const _klMat = { m: null }; const klMat = () => _klMat.m || (_klMat.m = new THREE.MeshBasicMaterial({ map: klTex(), transparent: false }));
const mcache = {}; const tmpB = new THREE.Box3(); const lenOf = {};
export const CAP = 55; // litres

export class Car {
  constructor(spec, models) {
    this.spec = spec; this.id = spec.id; this.kind = spec.m; this.g = new THREE.Group(); const src = models[spec.m]; this.L = LEN[spec.m] || 4.5; this.rad = .95;
    if (src) { const m = src.clone(true); if (!lenOf[spec.m]) { tmpB.setFromObject(src); lenOf[spec.m] = tmpB.max.z - tmpB.min.z; } m.scale.set(1.27, 1.27, this.L / lenOf[spec.m]); this.m = m; this.g.add(m);
      const tint = new THREE.Color(spec.tint || '#888').lerp(new THREE.Color('#ffffff'), .12).multiplyScalar(1.05);
      m.traverse(o => { if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true; const key = o.material.uuid + spec.tint; o.material = mcache[key] || (mcache[key] = (() => { const mm = o.material.clone(); mm.roughness = .62; mm.metalness = .2; mm.color.copy(tint); return mm; })()); }); }
    // KL emblem front grille + rear
    const kl = new THREE.Mesh(new THREE.CircleGeometry(.15, 20), klMat()); kl.position.set(0, .66, this.L / 2 + .035); this.g.add(kl); const kl2 = kl.clone(); kl2.position.set(0, .8, -this.L / 2 - .035); kl2.rotation.y = Math.PI; this.g.add(kl2);
    const lm = (c, e, i) => new THREE.MeshStandardMaterial({ color: c, emissive: e, emissiveIntensity: i }); this.tailM = lm('#3a0808', '#200000', 1); this.headM = lm('#6a6a60', '#000', 1);
    for (const hx of [-.62, .62]) { const h = new THREE.Mesh(new THREE.BoxGeometry(.3, .13, .04), this.headM); h.position.set(hx, .78, this.L / 2 + .02); this.g.add(h); const t = new THREE.Mesh(new THREE.BoxGeometry(.28, .1, .04), this.tailM); t.position.set(hx, .86, -this.L / 2 - .02); this.g.add(t); }
    this.wheels = ['wheel-front-left', 'wheel-front-right', 'wheel-back-left', 'wheel-back-right'].map(n => this.m && this.m.getObjectByName(n)).filter(Boolean);
    // state
    const r = mulberry((spec.id.length * 977 + spec.x * 13 + spec.z * 7) | 0);
    this.x = spec.x; this.z = spec.z; this.ry = spec.ry; this.v = 0; this.steer = 0; this.fuel = spec.fuel * CAP; this.engine = false; this.driver = null; this.lock = spec.lock; this.hp = 100; this.spin = 0; this.crashed = false; this.net = null;
    this.broken = spec.lock !== 1; // 0 unlocked, 1 locked, 2 window already smashed
    this.cabin = { id: spec.id + ':cabin', table: 'car', label: 'Glovebox and seats', x: this.x, z: this.z, reach: 2.4, looted: false, car: this, need: 'cabin', kind: 'car' };
    this.trunk = { id: spec.id + ':trunk', table: 'trunk', label: 'Trunk', x: this.x, z: this.z, reach: 3.4, looted: false, car: this, need: 'trunk', kind: 'car' };
    if (spec.crashed) this.crashed = true; this.sync();
    if (spec.wreck && models['debris-tire']) { const t = models['debris-tire'].clone(true); t.scale.setScalar(1.27); t.position.set(1.7, .2, .4); t.rotation.set(0, .8, 1.4); this.g.add(t); }
    if (this.broken && this.lock === 2) this.smash(true);
  }
  smash() { this.broken = true; if (this.m) { /* shatter: darken glass-ish by tinting window mesh is not possible (single mesh), show shards on the ground */ } this.shards = this.shards || (() => { const g = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .7), new THREE.MeshStandardMaterial({ color: '#9fc3d6', transparent: true, opacity: .55, roughness: .1 })); g.rotation.x = -Math.PI / 2; g.position.set(this.spec.id.length % 2 ? -1.6 : 1.6, .03, .6); this.g.add(g); return g; })(); }
  sync() { this.g.position.set(this.x, 0, this.z); this.g.rotation.y = this.ry; this.cabin.x = this.trunk.x = this.x; this.cabin.z = this.trunk.z = this.z; const s = Math.sin(this.ry), c = Math.cos(this.ry); this.trunk.x = this.x - s * (this.L / 2 + .2); this.trunk.z = this.z - c * (this.L / 2 + .2); this.cabin.x = this.x + c * 1.3; this.cabin.z = this.z - s * 1.3; }
  // collision circles (front, rear)
  circles() { const s = Math.sin(this.ry), c = Math.cos(this.ry), o = this.L / 2 - this.rad; return [[this.x + s * o, this.z + c * o], [this.x - s * o, this.z - c * o]]; }
  get fuelFrac() { return this.fuel / CAP; }
  update(dt, ctl, col, others) { // ctl: {gas -1..1, steer -1..1, brake bool}
    const dr = this.driver === 'me'; if (dr) { const on = this.engine && this.fuel > 0; // v2: the SAME arcade vehicle model as story mode (pctl.stepVehicle): steering right turns right, BRAKE (REV) reverses from a stop, same speeds
      const T = this._T || (this._T = { v: 0, head: this.ry, st: 0 }); T.v = this.v; T.head = this.ry; let crashSp = 0;
      const R = stepVehicle(T, ctl.I, ctl.D, dt, { noGas: !on, move: (fx, fz) => { this.ry = T.head; this.x += fx; this.z += fz;
        // collisions: circles vs rect colliders and other cars
        let hit = 0; for (let pass = 0; pass < 2; pass++) { const cs = this.circles(); let ax = 0, az = 0; for (const [cx, cz] of cs) { const [px, pz, h] = col.push(cx, cz, this.rad); if (h) { ax += px - cx; az += pz - cz; hit = Math.max(hit, 1); } } for (const o of others) { if (o === this) continue; const oc = o.circles(); for (const [cx, cz] of cs) for (const [ox, oz] of oc) { const dx = cx - ox, dz = cz - oz, d = Math.hypot(dx, dz); if (d < this.rad * 2 && d > 1e-4) { const k = (this.rad * 2 - d) / d * .5; ax += dx * k * 2; az += dz * k * 2; hit = Math.max(hit, 2); if (o.driver !== 'me') { o.x -= dx * k * .5; o.z -= dz * k * .5; o.sync(); } } } } this.x += ax * .5; this.z += az * .5; }
        return !!hit; }, onHit: sp => { crashSp = sp; } });
      this.v = T.v; this.ry = T.head; this.steer = -T.st * .5; // wheel visual: positive = left, like before
      if (on) { this.fuel = Math.max(0, this.fuel - (.015 + Math.abs(this.v) * .0042 + R.gas * .012) * dt); if (this.fuel <= 0 && this.engine) { this.engine = false; this.stalled = true; } }
      if (crashSp > 3) { this.hp = Math.max(0, this.hp - crashSp * 1.5); this.onCrash && this.onCrash(crashSp); }
    } else if (this.net) { const n = this.net; this.x += (n.x - this.x) * Math.min(1, dt * 10); this.z += (n.z - this.z) * Math.min(1, dt * 10); let d = n.ry - this.ry; d = Math.atan2(Math.sin(d), Math.cos(d)); this.ry += d * Math.min(1, dt * 10); this.v = n.v; this.steer = (n.steer || 0); this.fuel = n.fuel ?? this.fuel; this.engine = !!n.engine; }
    else { this.v *= Math.max(0, 1 - dt * 3); }
    this.spin += this.v * dt / .38; for (const w of this.wheels) { w.rotation.x = this.spin; if (w.name.includes('front')) w.rotation.y = -this.steer * .9; }
    this.tailM.emissive.setHex(this.engine ? (this.v < -.3 ? 0xffffff : 0x661008) : 0x100000); this.headM.emissive.setHex(this.engine ? 0xfff3d0 : 0); this.headM.emissiveIntensity = this.engine ? 2 : 1;
    this.sync(); }
  netState() { return { id: this.id, x: this.x, z: this.z, ry: this.ry, v: this.v, steer: this.steer, fuel: this.fuel, engine: this.engine ? 1 : 0, broken: this.broken ? 1 : 0 }; }
}

// ---------------- manager: spawn all cars, enter / exit / break in / drive, collisions with the player ----------------
export function createCars({ scene, W, models, specs = CAR_SPAWNS, onCrash }) {
  const cars = specs.map(s => { const c = new Car(s, models); scene.add(c.g); c.onCrash = (sp) => onCrash && onCrash(c, sp); return c; }); const byId = Object.fromEntries(cars.map(c => [c.id, c]));
  W.cars = cars; W.carPush = (x, z, r) => pushOut(x, z, r);
  function pushOut(x, z, r, ignore) { let hit = false; for (const c of cars) { if (c === ignore) continue; if (Math.abs(c.x - x) > 4 || Math.abs(c.z - z) > 4) continue; for (const [cx, cz] of c.circles()) { const dx = x - cx, dz = z - cz, rr = c.rad + r, d2 = dx * dx + dz * dz; if (d2 < rr * rr) { const d = Math.sqrt(d2) || .01; x = cx + dx / d * rr; z = cz + dz / d * rr; hit = true; } } } return [x, z, hit]; }
  const api = {
    cars, byId, pushOut,
    nearest(x, z, r = 3.2) { let b = null, bd = r; for (const c of cars) { const d = Math.min(Math.hypot(c.x - x, c.z - z), ...c.circles().map(([cx, cz]) => Math.hypot(cx - x, cz - z) + .6)); if (d < bd) { bd = d; b = c; } } return b; },
    canEnter(car) { return car.driver ? 'occupied' : car.hp <= 0 ? 'wrecked' : (car.lock === 1 && !car.broken) ? 'locked' : 'ok'; },
    /** crowbar (bag.hasPry()) smashes the window of a locked car. Returns true if it is now open. */
    breakIn(car, bag) { if (car.broken || car.lock !== 1) return true; if (!bag || !bag.hasPry()) return false; car.smash(); return true; },
    /** sit down: engine starts at once (no hotwire). Returns 'ok' | 'locked' | 'occupied' | 'wrecked'. */
    enter(car, who = 'me') { const r = api.canEnter(car); if (r !== 'ok') return r; car.driver = who; car.engine = car.fuel > 0; car.stalled = !car.engine; return 'ok'; },
    /** step out on the free side; returns {x,z} for the player. */
    exit(car) { car.driver = null; car.engine = false; const s = Math.sin(car.ry), c = Math.cos(car.ry); for (const side of [1, -1]) for (const k of [1.9, 2.4]) { const x = car.x + c * k * side, z = car.z - s * k * side; if (!W.col.hit(x, z, .4) && !pushOut(x, z, .4, car)[2]) return { x, z }; } return { x: car.x + c * 2, z: car.z - s * 2 }; },
    seat(car) { return { x: car.x, z: car.z, ry: car.ry }; },
    /** per frame: ctl = {gas, steer, brake} for the car the local player drives */
    update(dt, ctl) { for (const c of cars) { if (c.driver && !c.engine && c.fuel > 0 && c.hp > 0) { c.engine = true; c.stalled = false; } /* engine restarts by itself once there is fuel again (no hotwire) */ c.update(dt, c.driver === 'me' ? ctl : {}, W.col, cars); if (c.hp <= 0 && c.engine) { c.engine = false; c.stalled = true; } } },
  };
  return api;
}
