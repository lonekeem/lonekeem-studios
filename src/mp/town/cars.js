// Drivable real-world-style cars (CC0 low-poly bodies, no manufacturer marks) wearing the original "KL" emblem. Fuel, break-in, loot, wrecks.
import { stepVehicle } from '../../game/pctl.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BASE, klTex, mulberry } from './kit.js';
import { CAR_SPAWNS } from './map.js';

const KEYS = ['sedan', 'suv', 'truck', 'van', 'hatchback-sports', 'suv-luxury', 'police', 'taxi', 'ambulance', 'debris-tire', 'debris-door', 'debris-bumper'];
export async function loadCarModels() { const M = {}; await Promise.all(KEYS.map(k => new GLTFLoader().loadAsync(BASE + 'models/cars/' + k + '.glb').then(g => { M[k] = g.scene; }).catch(e => console.warn('car model', k, e)))); return M; }
const LEN = { truck: 5.2, van: 5, 'hatchback-sports': 4, sedan: 4.5, suv: 4.6, 'suv-luxury': 4.7, police: 4.6, taxi: 4.5, ambulance: 5.6 };
const _klMat = { m: null }; const klMat = () => _klMat.m || (_klMat.m = new THREE.MeshBasicMaterial({ map: klTex(), transparent: false }));
const mcache = {}; const tmpB = new THREE.Box3(); const lenOf = {};
export const CAP = 55; // litres
// v1.9.62 car lights (shared, built once)
export const NIGHT = { k: 0 }; export function setCarNight(k) { NIGHT.k = k; const m = _L.beam; if (m) m.uniforms.uK.value = k; if (_L.pool) _L.pool.opacity = .55 * k; }
const LIGHT_Y = { sedan: .36, suv: .4, 'suv-luxury': .4, truck: .38, van: .32, 'hatchback-sports': .38, police: .36, taxi: .36, ambulance: .3 };
const _L = {}; const glowTex = (r, g, b) => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, `rgba(${r},${g},${b},1)`); gr.addColorStop(.35, `rgba(${r},${g},${b},.45)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); };
const SIREN_G = () => _L.siren || (_L.siren = new THREE.BoxGeometry(.34, .14, .26));
const GLOW_G = () => _L.glow || (_L.glow = new THREE.PlaneGeometry(.7, .45));
const TAIL_M = () => _L.tail || (_L.tail = new THREE.MeshBasicMaterial({ map: glowTex(255, 40, 20), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .9 }));
const POOL_G = () => _L.poolG || (_L.poolG = new THREE.PlaneGeometry(4.2, 8.5).rotateX(-Math.PI / 2));
const POOL_M = () => _L.pool || (_L.pool = new THREE.MeshBasicMaterial({ map: glowTex(255, 236, 200), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -4 }));
const BEAM_G = () => { if (_L.beamG) return _L.beamG; const L = 11, g = new THREE.CylinderGeometry(.12, 1.7, L, 14, 1, true); g.translate(0, -L / 2, 0); g.rotateX(-Math.PI / 2); const p = g.attributes.position, n = p.count, a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = Math.pow(Math.max(0, 1 - p.getZ(i) / L), 1.8); g.setAttribute('fade', new THREE.BufferAttribute(a, 1)); return (_L.beamG = g); };
const BEAM_M = () => _L.beam || (_L.beam = new THREE.ShaderMaterial({ uniforms: { uK: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
  vertexShader: 'attribute float fade; varying float vF; varying vec3 vN; varying vec3 vV; void main(){ vF = fade; vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
  fragmentShader: 'uniform float uK; varying float vF; varying vec3 vN; varying vec3 vV; void main(){ float rim = pow(abs(dot(normalize(vN), normalize(vV))), 1.3); gl_FragColor = vec4(vec3(1.,.95,.82) * vF * rim * .16 * uK, 1.); }' }));

export class Car {
  constructor(spec, models) {
    this.spec = spec; this.id = spec.id; this.kind = spec.m; this.g = new THREE.Group(); const src = models[spec.m]; this.L = LEN[spec.m] || 4.5; this.rad = .95;
    if (src) { const m = src.clone(true); if (!lenOf[spec.m]) { tmpB.setFromObject(src); lenOf[spec.m] = tmpB.max.z - tmpB.min.z; } m.scale.set(1.27, 1.27, this.L / lenOf[spec.m]); this.m = m; this.g.add(m);
      const tint = new THREE.Color(spec.tint || '#888').lerp(new THREE.Color('#ffffff'), .12).multiplyScalar(1.05);
      m.traverse(o => { if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true; const key = o.material.uuid + (spec.noTint ? 'livery' : spec.tint); o.material = mcache[key] || (mcache[key] = (() => { const mm = o.material.clone(); mm.roughness = .62; mm.metalness = .2; if (!spec.noTint) mm.color.copy(tint); return mm; })()); }); }
    // KL emblem front grille + rear
    const kl = new THREE.Mesh(new THREE.CircleGeometry(.15, 20), klMat()); kl.position.set(0, .66, this.L / 2 + .035); this.g.add(kl); const kl2 = kl.clone(); kl2.position.set(0, .8, -this.L / 2 - .035); kl2.rotation.y = Math.PI; this.g.add(kl2);
    // v1.9.62 lights: head/tail lenses placed from the model's own bounds, additive beams + road pool when the engine runs (brighter at night),
    // brake/reverse lamps, flashing roof lights on police + ambulance. No real lights per car (phone budget); town.js moves ONE spot light onto the car you drive.
    const bb = this.m ? new THREE.Box3().setFromObject(this.m) : new THREE.Box3(new THREE.Vector3(-.9, 0, -this.L / 2), new THREE.Vector3(.9, 1.5, this.L / 2));
    const fz = bb.max.z, rz = bb.min.z, hw = Math.min(.95, (bb.max.x - bb.min.x) / 2), ly = bb.min.y + (bb.max.y - bb.min.y) * (LIGHT_Y[spec.m] ?? .36); this.box = bb;
    const lm = (c, e, i) => new THREE.MeshStandardMaterial({ color: c, emissive: e, emissiveIntensity: i, roughness: .3 }); this.tailM = lm('#3a0808', '#200000', 1); this.headM = lm('#c8c8bc', '#000', 1);
    const lx = hw - .3;
    const pair = (w, h, y, z) => mergeGeometries([-lx, lx].map(x => new THREE.BoxGeometry(w, h, .04).translate(x, y, z)));
    { const hm = new THREE.Mesh(pair(.34, .14, ly, fz), this.headM), tm = new THREE.Mesh(pair(.36, .12, ly + .08, rz), this.tailM); hm.userData.lt = tm.userData.lt = 1; this.g.add(hm, tm); }
    this.beams = new THREE.Group(); this.beams.userData.lt = 1; this.beams.visible = false; this.g.add(this.beams);
    for (const hx of [-lx, lx]) { const b = new THREE.Mesh(BEAM_G(), BEAM_M()); b.position.set(hx, ly, fz + .05); b.rotation.x = -.06; b.renderOrder = 4; b.frustumCulled = false; this.beams.add(b); }
    { const pool = new THREE.Mesh(POOL_G(), POOL_M()); pool.position.set(0, .06, fz + 5.2); pool.renderOrder = 3; this.beams.add(pool); }
    this.tails = new THREE.Group(); this.tails.userData.lt = 1; this.tails.visible = false; this.g.add(this.tails);
    for (const hx of [-lx, lx]) { const t = new THREE.Mesh(GLOW_G(), TAIL_M()); t.position.set(hx, ly + .08, rz - .05); t.rotation.y = Math.PI; t.renderOrder = 4; this.tails.add(t); }
    if (spec.m === 'police' || spec.m === 'ambulance') { this.siren = []; const zb = spec.m === 'police' ? (bb.min.z + bb.max.z) / 2 - .15 : fz - .55; const yb = bb.max.y - (spec.m === 'police' ? .02 : .03);
      for (const [sx, col] of [[-.32, '#ff2a1a'], [.32, spec.m === 'police' ? '#2a5bff' : '#ff2a1a'], [0, '#ffffff']]) { const mm = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }); const q = new THREE.Mesh(SIREN_G(), mm); q.position.set(sx, yb, zb); q.scale.set(sx === 0 ? .6 : 1, 1, 1); q.renderOrder = 5; q.userData.lt = 1; this.g.add(q); this.siren.push(q); } }
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
      this.v = T.v; this.ry = T.head; this.brk = R.brk; this.steer = -T.st * .5; // wheel visual: positive = left, like before
      if (on) { this.fuel = Math.max(0, this.fuel - (.015 + Math.abs(this.v) * .0042 + R.gas * .012) * dt); if (this.fuel <= 0 && this.engine) { this.engine = false; this.stalled = true; } }
      if (crashSp > 3) { this.hp = Math.max(0, this.hp - crashSp * 1.5); this.onCrash && this.onCrash(crashSp); }
    } else if (this.net) { const n = this.net; this.x += (n.x - this.x) * Math.min(1, dt * 10); this.z += (n.z - this.z) * Math.min(1, dt * 10); let d = n.ry - this.ry; d = Math.atan2(Math.sin(d), Math.cos(d)); this.ry += d * Math.min(1, dt * 10); this.v = n.v; this.steer = (n.steer || 0); this.fuel = n.fuel ?? this.fuel; this.engine = !!n.engine; }
    else { this.v *= Math.max(0, 1 - dt * 3); }
    this.spin += this.v * dt / .38; for (const w of this.wheels) { w.rotation.x = this.spin; if (w.name.includes('front')) w.rotation.y = -this.steer * .9; }
    this.lights(dt);
    this.sync(); }
  lights(dt) { const on = this.engine && this.hp > 0, nk = NIGHT.k; const rev = this.v < -.3, brake = on && (this.brk > .05 || (this.net && this._pv != null && this.v < this._pv - dt * 4)); this._pv = this.v;
    this.headM.emissive.setHex(on ? 0xfff3d0 : 0); this.headM.emissiveIntensity = on ? 1.6 + nk * 2.5 : 1;
    this.tailM.emissive.setHex(on ? (rev ? 0xffffff : 0xff1a0a) : 0x100000); this.tailM.emissiveIntensity = on ? (brake || rev ? 3 : 1.1 + nk) : 1;
    this.beams.visible = on && nk > .02; this.tails.visible = on; if (this.tails.visible) for (const t of this.tails.children) t.scale.setScalar(brake ? 1.35 : .8 + nk * .3);
    if (this.siren) { const ph = (performance.now() / 1000 + this.L) * 3.2; const a = on ? (Math.sin(ph * Math.PI) > 0 ? 1 : .08) : 0, b = on ? (Math.sin(ph * Math.PI) > 0 ? .08 : 1) : 0; this.siren[0].material.opacity = a * .95; this.siren[1].material.opacity = b * .95; this.siren[2].material.opacity = on ? (Math.sin(ph * Math.PI * 2) > .6 ? .7 : 0) : 0; } }
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
