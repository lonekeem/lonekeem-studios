// v2.1 car doors + visible boarding / exiting. The truck's real cab-door triangles are cut out of the Kenney body mesh and hung on a hinge,
// so a closed door matches the body exactly; opening reveals a simple dark cab interior. The player is seen walking to the door,
// reaching, the door swinging open, stepping in and sitting, then the door closing (and the reverse for exiting).
import * as THREE from 'three';
import { walkTo, turnTo, sstep, angDiff } from './motion.js';
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const HIN = 0.70, OPEN = 1.2; // hinge x (car-local) and max swing (rad ≈ 69°)

export function prepCarDoors(car, sides = [1, -1]) {
  const body = car.getObjectByName('body'); if (!body || !body.geometry || car.userData.doors) return car.userData.doors || null;
  car.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(car.matrixWorld).invert(), M = new THREE.Matrix4().multiplyMatrices(inv, body.matrixWorld), NM = new THREE.Matrix3().getNormalMatrix(M);
  const src = body.geometry.index ? body.geometry.toNonIndexed() : body.geometry; const P = src.attributes.position, N = src.attributes.normal, UV = src.attributes.uv; const nt = P.count / 3;
  const a = V(), b = V(), c = V(), n = V(); const pick = { 1: [], '-1': [] }; const keep = [];
  for (let t = 0; t < nt; t++) { a.fromBufferAttribute(P, t * 3).applyMatrix4(M); b.fromBufferAttribute(P, t * 3 + 1).applyMatrix4(M); c.fromBufferAttribute(P, t * 3 + 2).applyMatrix4(M);
    n.copy(b).sub(a).cross(c.clone().sub(a)).normalize(); const cx = (a.x + b.x + c.x) / 3, cy = (a.y + b.y + c.y) / 3, cz = (a.z + b.z + c.z) / 3; let took = false;
    for (const s of sides) if (n.x * s > 0.9 && cz > -0.5 && cz < 0.97 && cy > 0.6 && cy < 1.7 && Math.abs(cx) > 0.55 && Math.abs(cx) < 0.72 && Math.abs(a.x - b.x) < 0.2 && Math.abs(a.x - c.x) < 0.2) { pick[s].push(t); took = true; break; }
    if (!took) keep.push(t); }
  const sub = (list, off) => { const pos = new Float32Array(list.length * 9), nor = new Float32Array(list.length * 9), uv = new Float32Array(list.length * 6); const q = V();
    list.forEach((t, i) => { for (let k = 0; k < 3; k++) { q.fromBufferAttribute(P, t * 3 + k).applyMatrix4(M); if (off) q.sub(off); pos.set([q.x, q.y, q.z], i * 9 + k * 3); q.fromBufferAttribute(N, t * 3 + k).applyMatrix3(NM).normalize(); nor.set([q.x, q.y, q.z], i * 9 + k * 3); if (UV) uv.set([UV.getX(t * 3 + k), UV.getY(t * 3 + k)], i * 6 + k * 2); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); if (UV) g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g; };
  // remaining body (still in the body's own space)
  { const pos = new Float32Array(keep.length * 9), nor = new Float32Array(keep.length * 9), uv = new Float32Array(keep.length * 6); keep.forEach((t, i) => { for (let k = 0; k < 3; k++) { pos.set([P.getX(t * 3 + k), P.getY(t * 3 + k), P.getZ(t * 3 + k)], i * 9 + k * 3); nor.set([N.getX(t * 3 + k), N.getY(t * 3 + k), N.getZ(t * 3 + k)], i * 9 + k * 3); if (UV) uv.set([UV.getX(t * 3 + k), UV.getY(t * 3 + k)], i * 6 + k * 2); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); if (UV) g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); body.geometry = g; }
  const mat = (Array.isArray(body.material) ? body.material[0] : body.material).clone(); mat.side = THREE.DoubleSide;
  const doors = {};
  for (const s of sides) { const list = pick[s]; if (!list.length) continue; const hinge = V(s * HIN, 0, 0.93); const geo = sub(list, hinge); const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    const pivot = new THREE.Group(); pivot.position.copy(hinge); pivot.add(mesh); car.add(pivot); doors[s] = { side: s, pivot, mesh, k: 0, tris: list.length }; }
  // dark cab interior seen through an open door (inside faces only)
  const cab = new THREE.Group(); const dark = new THREE.MeshStandardMaterial({ color: '#17120e', roughness: 1, side: THREE.BackSide }), seat = new THREE.MeshStandardMaterial({ color: '#2c2219', roughness: .95 }), wheel = new THREE.MeshStandardMaterial({ color: '#0d0d0d', roughness: .6 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.95, 1.55), dark); box.position.set(0, 1.12, 0.3); cab.add(box);
  [-1, 1].forEach(s => { const sb = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.5), seat); sb.position.set(s * 0.33, 0.62, -0.05); cab.add(sb); const bk = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.62, 0.12), seat); bk.position.set(s * 0.33, 0.98, -0.34); bk.rotation.x = -0.12; cab.add(bk); });
  const sw = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.022, 6, 16), wheel); sw.position.set(0.33, 1.02, 0.55); sw.rotation.x = -1.1; cab.add(sw);
  car.add(cab); car.userData.doors = doors; car.userData.cab = cab; return doors; }

export function setDoor(d, k) { if (!d) return; d.k = k; d.pivot.rotation.y = -d.side * k * OPEN; }

// car-local -> world helpers
const _w = V(); export function carPt(car, x, y, z, out = V()) { return car.localToWorld(out.set(x, y, z)); }
// where the player stands outside the driver door (side +1 = left/driver)
export const outPoint = (car, side = 1, out = V()) => carPt(car, side * 1.5, 0, -0.05, out);
export const seatPoint = (car, side = 1, out = V()) => carPt(car, side * 0.3, 0, -0.08, out);

// ---------------- sequences ----------------
function camFor(g, car, side) { const look = carPt(car, side * 0.9, 1.0, 0.0), cam = carPt(car, side * 3.7, 2.25, -1.9); // from the door side, slightly toward the rear: door, hand and body in frame
  const dir = cam.clone().sub(look), L = dir.length(); dir.divideScalar(L); const rc = new THREE.Raycaster(look, dir, 0, L); const h = rc.intersectObjects(g.world.walls, false)[0]; if (h) cam.copy(look).addScaledVector(dir, Math.max(1.6, h.distance - 0.3)); return { cam, look }; }
function begin(g, kind, side, done, opts) { const T = g.truck, car = T.g; prepCarDoors(car); const doors = car.userData.doors; const door = doors && doors[side]; if (!door) return false;
  const { cam, look } = camFor(g, car, side); g.carSeq = { kind, side, car, door, ph: 0, t: 0, done, opts: opts || {}, y0: 0 }; g.cut = { anim: null, cam, look, flash: false, seq: true }; g.dlgQ = g.dlgQ || []; g.paused = false; T.col.skip = true; return true; }
export function boardTruck(g, done) { const P = g.player; if (!begin(g, 'enter', 1, done)) { done && done(); return; } g.audio.footstep && 0; g.state.crouch = false; g.state.aim = false; g.vm && (g.vm.visible = false); }
export function leaveTruck(g, done, opts) { const P = g.player; const T = g.truck;
  if (!begin(g, 'exit', 1, done, opts)) { done && done(); return; } const S = g.carSeq; const sp = seatPoint(T.g, 1); P.root.position.set(sp.x, 0.26, sp.z); P.root.rotation.y = T.g.rotation.y; P.root.visible = true; P.model.visible = true; P.play('Sitting_Idle_Loop', { force: true }); }

export function updateCarSeq(g, dt) { const S = g.carSeq; if (!S) return false; const P = g.player, car = S.car, d = S.door, side = S.side, root = P.root; S.t += dt; g.grace = Math.max(g.grace || 0, 0.6);
  const out = outPoint(car, side, _w).clone(), seat = seatPoint(car, side, V()), thr = carPt(car, side * 0.82, 0, -0.08, V());
  const faceDoorYaw = car.rotation.y + Math.atan2(-side, 0), carYaw = car.rotation.y;
  const y = (v) => { root.position.y = v; };
  if (S.kind === 'enter') {
    if (S.ph === 0) { const arrived = walkTo(P, out.x, out.z, dt, { speed: 3.0 }); if (arrived) { const e = turnTo(root, faceDoorYaw, dt, 12); if (e < 0.08) { S.ph = 1; S.t = 0; P.play('Interact', { once: true, force: true, speed: 1.5, cb: () => { P.curName = ''; } }); } } }
    else if (S.ph === 1) { turnTo(root, faceDoorYaw, dt, 8); if (S.t > 0.4 && !S.snd) { S.snd = 1; g.audio.play && g.audio.play('door_open', { vol: .7, flat: true }); } if (S.t > 0.4) setDoor(d, sstep((S.t - 0.4) / 0.75)); if (S.t > 1.25) { S.ph = 2; S.t = 0; } }
    else if (S.ph === 2) { const s0 = S.s0 = S.s0 || 0; const a = walkTo(P, thr.x, thr.z, dt, { speed: 1.8, keepYaw: false }); y(0.0); if (a) { S.ph = 3; S.t = 0; root.position.x = thr.x; root.position.z = thr.z; } }
    else if (S.ph === 3) { // step in + sit: ease onto the seat while the sit-down clip plays
      if (!S.sit) { S.sit = 1; S.from = root.position.clone(); P.play('Sitting_Enter', { once: true, force: true, speed: 1.15, cb: () => { S.sat = true; P.play('Sitting_Idle_Loop', { force: true }); } }); }
      const k = sstep(S.t / 0.9); root.position.x = S.from.x + (seat.x - S.from.x) * k; root.position.z = S.from.z + (seat.z - S.from.z) * k; y(0.26 * k); turnTo(root, carYaw, dt, 9); if (S.t > 1.45) { S.ph = 4; S.t = 0; P.play('Sitting_Idle_Loop', { force: true }); } }
    else if (S.ph === 4) { if (S.t > 0.25) { setDoor(d, 1 - sstep((S.t - 0.25) / 0.55)); } if (S.t > 0.8 && !S.snd2) { S.snd2 = 1; g.audio.play && g.audio.play('metal', { vol: .45, flat: true }); } if (S.t > 1.0) { finish(g, S); return true; } }
  } else {
    if (S.ph === 0) { if (S.t > 0.35 && !S.snd) { S.snd = 1; g.audio.play && g.audio.play('door_open', { vol: .7, flat: true }); } if (S.t > 0.35) setDoor(d, sstep((S.t - 0.35) / 0.75)); if (S.t > 1.2) { S.ph = 1; S.t = 0; P.play('Sitting_Exit', { once: true, force: true, speed: 1.0, cb: () => { P.curName = ''; } }); S.from = root.position.clone(); } }
    else if (S.ph === 1) { const k = sstep(S.t / 0.9); root.position.x = S.from.x + (thr.x - S.from.x) * k; root.position.z = S.from.z + (thr.z - S.from.z) * k; y(0.26 * (1 - k)); turnTo(root, faceDoorYaw, dt, 8); if (S.t > 1.0) { S.ph = 2; S.t = 0; y(0); } }
    else if (S.ph === 2) { const a = walkTo(P, out.x, out.z, dt, { speed: 1.9 }); if (a) { S.ph = 3; S.t = 0; } }
    else if (S.ph === 3) { // close the door (player turns to it), then walk off to the next spot
      const e = turnTo(root, faceDoorYaw, dt, 10); if (S.t > 0.15 && !S.snd2) { S.snd2 = 1; P.play('Interact', { once: true, force: true, speed: 1.6, cb: () => { P.curName = ''; } }); } if (S.t > 0.45) setDoor(d, 1 - sstep((S.t - 0.45) / 0.55)); if (S.t > 0.95 && !S.snd3) { S.snd3 = 1; g.audio.play && g.audio.play('metal', { vol: .45, flat: true }); }
      if (S.t > 1.15) { S.ph = 4; S.t = 0; } }
    else if (S.ph === 4) { const w = S.opts.walkTo; if (!w) { finish(g, S); return true; } const a = walkTo(P, w[0], w[1], dt, { speed: 2.6 }); if (a || S.t > 6) { finish(g, S); return true; } }
  }
  // camera follows the action a little
  const c = g.cut; if (c) { const mid = carPt(car, side * 1.0, 1.0, -0.05, _w); c.look.lerp(mid, Math.min(1, dt * 3)); }
  return true; }

function finish(g, S) { const T = g.truck, P = g.player; g.carSeq = null; g.cut = null; T.col.skip = T.driving; setDoor(S.door, S.kind === 'enter' ? 0 : 0);
  if (S.kind === 'enter') { P.root.visible = false; P.root.position.y = 0; } else { P.root.position.y = 0; P.play('Idle_Loop'); g.cam.yaw = P.root.rotation.y + Math.PI; g.cam.pitch = -0.1; }
  g.last = performance.now(); S.done && S.done(); }
