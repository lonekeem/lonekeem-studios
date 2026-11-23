// Roaming zombies for the multiplayer town. Reuses the story game's Char / CharLib / zombie2 rig + zombie looks (src/game), same walk/jog/punch/death clips.
//   const Z = await createZombies({ scene, W, camera, getPlayers, onHitPlayer, bodies: BODIES });   // W = buildTown() result (loads its own models unless `models` has `.lib`)
//   each frame:  Z.update(dt);   melee: Z.killNear(x,z,r,dmg,dir);   car:  Z.runOver(car);   also Z.near / Z.noise / Z.list / Z.stats()
// Behaviour: wander the road graph -> notice a player (14 m, 7 m if crouched) -> chase (nav flow field) -> punch. Edge spawns keep the count up (off-camera). Bodies stay.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CharLib, Char } from '../../game/chars.js';
import { loadRigs } from '../../game/avatar.js';
import { randomLook, zVoiceAssign } from '../../game/looks.js';
import { mixTownKind, applyKindLook, kindStats, dressKind, tickSpecialZed, tickKindFx, poseKindBones } from '../../game/zedKinds.js';
import { addWound, bloodyMouth, setHandBlood } from '../../game/gore.js'; // the story's wound / blood shader marks (rigged zombies)
import { BASE, mulberry, bloodTex, angDiff } from './kit.js';
import { CFG, BOUNDS } from './map.js';

let _models = null;
export function loadZombieModels(base = BASE) { return _models || (_models = (async () => { const gltf = await new GLTFLoader().loadAsync(base + 'models/AnimationLibrary_Godot_Standard.gltf');
  const lib = new CharLib(gltf); lib.rigs = await loadRigs(base, ['zombie2', 'genm', 'genf', 'zombie_male', 'zombie_office', 'zombie_elder', 'zombie_big', 'zombie_cop', 'zombie_worker']); /* the full story zombie set (was only zombie2 -> every other zombie fell back to the headless procedural body) */ return { lib }; })()); }

// road graph: nodes at the road ends, intersections and two spurs (store door, gas station) -> zombies drift along the streets
function roadGraph() {
  const nodes = [], edges = []; const add = (x, z) => nodes.push({ x, z, n: [] }) - 1; const link = (a, b) => { nodes[a].n.push(b); nodes[b].n.push(a); };
  const BX = BOUNDS.x - 6, BZ = BOUNDS.z - 6; const grid = {};
  for (const zr of CFG.ZR) for (const xr of CFG.XR) grid[xr + ',' + zr] = add(xr, zr);
  for (const zr of CFG.ZR) { const row = CFG.XR.map(xr => grid[xr + ',' + zr]); const a = add(-BX, zr), b = add(BX, zr);
    const spurs = []; if (zr === CFG.ZR[0]) { spurs.push([0, -18.6], [46, -15]); }
    const pts = [{ x: -BX, i: a }, ...CFG.XR.map(xr => ({ x: xr, i: grid[xr + ',' + zr] })), { x: BX, i: b }];
    for (const [sx, sz] of spurs) { const s = add(sx, sz); const r = add(sx, zr); pts.push({ x: sx, i: r }); link(r, s); } pts.sort((p, q) => p.x - q.x); for (let k = 0; k < pts.length - 1; k++) link(pts[k].i, pts[k + 1].i); }
  for (const xr of CFG.XR) { const a = add(xr, -BZ), b = add(xr, BZ); const col = CFG.ZR.map(zr => grid[xr + ',' + zr]); link(a, col[0]); for (let k = 0; k < col.length - 1; k++) link(col[k], col[k + 1]); link(col[col.length - 1], b); }
  return nodes;
}

let blood = null; const BLOOD_MAX = 70;
// lying bodies must rest ON the road: measure the lowest skinned vertex once the fall animation is over and lift the root by what sank in (+3.5 cm)
const _sv = new THREE.Vector3();
function settleCorpse(z) { try { z.root.updateMatrixWorld(true); const ys = []; let done = 0; z.root.traverse(o => { if (!o.isSkinnedMesh || done) return; done = 1; o.skeleton.update(); const p = o.geometry.attributes.position; const st = Math.max(1, Math.floor(p.count / 1500)); for (let i = 0; i < p.count; i += st) { _sv.fromBufferAttribute(p, i); if (o.applyBoneTransform) o.applyBoneTransform(i, _sv); _sv.applyMatrix4(o.matrixWorld); ys.push(_sv.y); } });
  ys.sort((a, b) => a - b); const minY = ys.length ? ys[Math.floor(ys.length * .015)] : 1e9; // 4th percentile: ignore a stray toe / finger
  if (minY < 1e8) { z.root.position.y = Math.max(-.05, Math.min(.35, z.root.position.y + (.02 - minY))); z.root.updateMatrixWorld(true); } } catch (e) { /* ignore */ } }
const nd0 = z => { const g = window.__mpTown; return g && g.me ? Math.hypot(z.root.position.x - g.me.x, z.root.position.z - g.me.z) : 0; };
export async function createZombies({ scene, W, camera, getPlayers, onHitPlayer, onNoise, models, bodies = [], fogFar = 105, target = 14, seed = 7, deadVisible = 120, onEvent }) {
  let nightMul = 1; // v1.9.52: set by the day/night cycle (1 by day, up to 1.35 at night)
  if (!models || !models.lib) models = await loadZombieModels();
  const lib = models.lib, col = W.col, nav = W.nav, rnd = mulberry(seed * 7919 + 1), graph = roadGraph();
  const zs = []; const pools = []; const S = { alive: 0, dead: 0, spawned: 0, killed: 0, rendered: 0 }; const out = { zombies: zs, stats: () => S, target };
  let t = 0, navT = 0, spawnT = 2, zseed = 1, deadT = 0; const fr = new THREE.Frustum(), pm = new THREE.Matrix4(), tmpV = new THREE.Vector3();
  const R = (a, b) => a + rnd() * (b - a);
  const poolMesh = (x, z, s) => { if (!blood) { const mt = new THREE.MeshBasicMaterial({ map: bloodTex(3), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); blood = { g: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), mt }; }
    let m; if (pools.length >= BLOOD_MAX) { m = pools.shift(); } else { m = new THREE.Mesh(blood.g, blood.mt); m.renderOrder = 2; scene.add(m); } m.position.set(x, .045, z); m.rotation.y = R(0, 6.28); m.scale.setScalar(s); pools.push(m); return m; };

  function make(x, z, o = {}) {
    const look = Object.assign(randomLook((zseed++ * 7919 + (seed * 104729)) | 0, true), { grime: 1, blood: R(.5, 1) }); if (o.rig !== undefined) look.rig = o.rig; /* same override as story spawnZ */
    const kind = o.kind || (o.runner === true ? 'runner' : o.runner === false ? 'walker' : mixTownKind(rnd()));
    applyKindLook(look, kind);
    const ks = kindStats(kind, o, 0, look);
    const c = new Char(lib, look, ks.scale); c.root.position.set(x, 0, z); c.root.rotation.y = R(0, 6.28); scene.add(c.root);
    const runner = !!ks.runner;
    c.zvo = zVoiceAssign(look, { kind });
    Object.assign(c, { z: true, kind: ks.kind, hp: Math.round(ks.hp * nightMul), maxHp: Math.round(ks.maxHp * nightMul), runner, tank: !!ks.tank, spitter: !!ks.spitter, armor: ks.armor, speed: ks.speed * (1 + (nightMul - 1) * .4), st: 'wander', cd: R(0, 1), dead: false, deadT: 0, id: R(0, 10), vel: new THREE.Vector3(), off: [R(-2.6, 2.6), R(-2.6, 2.6)], node: -1, prev: -1, tgt: null, hitAt: 0, hitCd: 0, tgT: 0, hurtT: 0, noHead: false, hp0: Math.round(ks.hp * nightMul) });
    dressKind(c, kind);
    c.play(runner ? 'Jog_Fwd_Loop' : 'Walk_Loop', { speed: runner ? 1.2 : (c.tank ? .48 : .62) }); const a = c.act(runner ? 'Jog_Fwd_Loop' : 'Walk_Loop') || c.act('Walk_Loop'); if (a) a.time = R(0, a.getClip().duration);
    try { c.mixer.update(0); zBones(c); } catch (e) { /* first pose */ }
    pickNode(c); zs.push(c); S.spawned++; return c;
  }
  function nearestNode(x, z) { let b = 0, bd = 1e9; graph.forEach((n, i) => { const d = (n.x - x) ** 2 + (n.z - z) ** 2; if (d < bd) { bd = d; b = i; } }); return b; }
  function pickNode(c) { const p = c.root.position; if (c.node < 0) { c.node = nearestNode(p.x, p.z); return; } const n = graph[c.node]; let opts = n.n.filter(i => i !== c.prev); if (!opts.length) opts = n.n; const nx = opts[Math.floor(rnd() * opts.length)]; c.prev = c.node; c.node = nx; }

  // -------- spawns: scattered at start (loading time), then only at the road ends outside the camera / beyond the fog --------
  function inView(x, z) { if (!camera) return false; camera.updateMatrixWorld(); pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); fr.setFromProjectionMatrix(pm); return fr.containsPoint(tmpV.set(x, 1, z)); }
  function farFromPlayers(x, z, d) { for (const p of getPlayers()) if (Math.hypot(p.x - x, p.z - z) < d) return false; return true; }
  function seedScatter() { let n = 0, tries = 0; while (n < target && tries++ < 200) { const e = graph[Math.floor(rnd() * graph.length)]; const f = rnd(); const nb = graph[e.n[Math.floor(rnd() * e.n.length)]]; const x = e.x + (nb.x - e.x) * f + R(-2, 2), z = e.z + (nb.z - e.z) * f + R(-2, 2); if (Math.abs(x) > 100 || Math.abs(z) > 70 || !farFromPlayers(x, z, 30) || col.hit(x, z, .4)) continue; const c = make(x, z); c.node = -1; pickNode(c); n++; } }
  function edgeSpawn() { const ends = graph.filter(n => (Math.abs(n.x) >= BOUNDS.x - 7 || Math.abs(n.z) >= BOUNDS.z - 7)); for (let k = 0; k < 6; k++) { const e = ends[Math.floor(rnd() * ends.length)]; const x = e.x + R(-2.5, 2.5), z = e.z + R(-2.5, 2.5); if (!farFromPlayers(x, z, 60)) continue; if (inView(x, z) && !farFromPlayers(x, z, 98)) continue; /* never appear inside the visible, un-fogged area */ const c = make(x, z); c.node = -1; pickNode(c); return c; } return null; }
  seedScatter();

  // -------- damage / death --------
  function kill(z, dir, o = {}) { if (z.dead) return; z.dead = true; z.st = 'dead'; z.deadT = 0; S.killed++; z.play('Death01', { once: true, force: true, speed: o.car ? 1.6 : 1.05, fade: .1 }); if (dir) z.vel.set(dir.x * (o.car ? 7 : 2.2), 0, dir.z * (o.car ? 7 : 2.2));
    z.pool = poolMesh(z.root.position.x, z.root.position.z, .5); z.poolGrow = 1; onEvent && onEvent('kill', z); }
  function hurt(z, dmg, dir, o) { if (z.dead) return false; if (z.armor) dmg *= z.armor(o || {}); z.hp -= dmg; if (z.tank && !(o && o.head) && dmg < 20) { z.st = 'chase'; z.lose = 0; if (z.hp <= 0) { kill(z, dir, o); return true; } onEvent && onEvent('hurt', z); return false; } z.hurtT = z.tank ? .12 : .25; if (z.hp <= 0) { kill(z, dir, o); return true; } z.st = 'chase'; z.lose = 0; z.vel.set(dir.x * (z.tank ? .8 : 1.8), 0, dir.z * (z.tank ? .8 : 1.8)); z.play(rnd() < .5 ? 'Hit_Chest' : 'Hit_Head', { once: true, force: true, speed: 1.7, fade: .08, cb: () => { z.curName = ''; } }); onEvent && onEvent('hurt', z); return false; }
  out.hurt = (z, dmg, dir, o) => hurt(z, dmg, dir, o);
  out.alive = () => zs.filter(z => !z.dead);
  out.killNear = (x, z, r, dmg, dir0) => { let n = 0; for (const q of zs) { if (q.dead) continue; const p = q.root.position, dx = p.x - x, dz = p.z - z, d = Math.hypot(dx, dz); if (d < r) { const l = d || 1; hurt(q, dmg, dir0 || { x: dx / l, z: dz / l }); n++; } } return n; };
  // hitscan: nearest living zombie within .45 m of the ray (origin ox,oz heading dx,dz unit) inside `range`; returns {t,dead} or null
  out.shoot = (ox, oz, dx, dz, range, dmg) => { let best = null, bt = range; for (const q of zs) { if (q.dead) continue; const p = q.root.position, rx = p.x - ox, rz = p.z - oz, t = rx * dx + rz * dz; if (t < .2 || t >= bt) continue; if (Math.abs(rx * dz - rz * dx) < .45) { best = q; bt = t; } } if (!best) return null; const dead = hurt(best, dmg, { x: dx, z: dz }); return { t: bt, dead }; };
  out.runOver = (car) => { if (!car || Math.abs(car.v) < 3) return 0; let n = 0; const cs = car.circles(); for (const q of zs) { if (q.dead || q.hitCar > t) continue; const p = q.root.position; for (const [cx, cz] of cs) { const dx = p.x - cx, dz = p.z - cz; if (dx * dx + dz * dz < 1.5 * 1.5) { q.hitCar = t + .5; const dd = { x: Math.sin(car.ry) * Math.sign(car.v), z: Math.cos(car.ry) * Math.sign(car.v) }; hurt(q, Math.abs(car.v) * 12, dd, { car: true }); car.v *= .965; car.hp = Math.max(0, car.hp - .6); n++; break; } } } return n; };
  out.spawnAt = (x, z, o) => make(x, z, o);
  out.near = (x, z, r) => { for (const q of zs) { if (q.dead) continue; const p = q.root.position; if ((p.x - x) ** 2 + (p.z - z) ** 2 < r * r) return true; } return false; };
  out.list = () => zs.map(q => ({ x: q.root.position.x, z: q.root.position.z, dead: q.dead }));
  // noise (door breaking, swings, smashed windows): wanderers within `r` walk over to look
  out.noise = (x, z, r) => { for (const q of zs) { if (q.dead || q.st === 'chase') continue; const p = q.root.position, d = Math.hypot(p.x - x, p.z - z); if (d < r) { q.st = 'look'; q.look = [x, z]; q.lookT = 8; } } onNoise && onNoise(x, z, r); };
  // persistent corpses from the map (k:'h' human victim, k:'z' dead zombie)
  for (const [bi, b] of bodies.entries()) { const hum = b.k === 'h'; // human victims always wear the story NPC human rigs (genm / genf, never the zombie rig or zombie skin); fixed seed per body so they look the same every run
    const look = Object.assign(randomLook(5000 + bi * 131, !hum), hum ? { grime: .35, blood: .75, zed: false } : { grime: 1, blood: 1 }); if (hum) { if (!look.rig || !/^gen[mf]$/.test(look.rig) || !lib.rigs[look.rig]) look.rig = lib.rigs.genm ? 'genm' : null; look.zed = false; } const c = new Char(lib, look, 1); c.root.position.set(b.x, 0, b.z); c.root.rotation.y = b.ry || 0; scene.add(c.root);
    c.z = !hum; c.victim = hum; c.dead = true; c.deadT = 99; c.play('Death01', { once: true, force: true }); c.mixer.update(5); c.vel = new THREE.Vector3(); c.pool = poolMesh(b.x, b.z, hum ? 1.1 : .8); zs.push(c); }

  // -------- per-frame AI --------
  function update(dt) {
    dt = Math.min(dt, .1); t += dt; const P = getPlayers(); if (!P.length) return; const p0 = P[0];
    if ((navT -= dt) <= 0) { navT = .5; nav && nav.field(p0.x, p0.z); }
    const aud = (typeof window !== 'undefined' && window.__atq && window.__atq.audio) || null;
    tickKindFx(scene, dt, { x: p0.x, y: 0, z: p0.z }, (n, from) => { onHitPlayer && onHitPlayer(n, { x: from.x, z: from.z, id: 'me' }); }, aud, !!p0.drv);
    let alive = 0, dead = 0;
    for (let i = 0; i < zs.length; i++) { const z = zs[i], pp = z.root.position; if (z.hp < z.hp0) { { const vl = Math.hypot(z.vel.x, z.vel.z); if (vl > .05) wound(z, { x: z.vel.x / vl, z: z.vel.z / vl }, false); } z.hp0 = z.hp; if (z.hp > 0) z.mat.userData.u.uBlood.value = Math.min(1.3, z.mat.userData.u.uBlood.value + .15); }
      if (z.dead) { dead++; z.deadT += dt;
        if (!z._deadHeld) {
          z.mixer.update(dt);
          const a = z.cur; const dur = a && a.getClip ? a.getClip().duration : 2;
          const done = !a || a.paused || (a.timeScale === 0 && a.time >= dur * .96) || z.deadT > Math.max(2.4, dur + .4);
          if (done && z.holdDead) z.holdDead();
        } else if (z.restoreDeadPose) z.restoreDeadPose();
        if (z._deadHeld && !z.settled && z.root.visible && nd0(z) < 60) { z.settled = 1; settleCorpse(z); }
        if (z.deadT < 3.2) { if (z.vel.lengthSq() > .01) { const [nx, nz] = col.push(pp.x + z.vel.x * dt, pp.z + z.vel.z * dt, .3); pp.x = nx; pp.z = nz; z.vel.multiplyScalar(.9); } if (z.pool && z.poolGrow && z.pool.scale.x < 1.5) z.pool.scale.setScalar(z.pool.scale.x + dt * .5); }
        continue; }
      alive++; let near = null, nd = 1e9, ni = 0; P.forEach((p, k) => { const d = Math.hypot(p.x - pp.x, p.z - pp.z); if (d < nd) { nd = d; near = p; ni = k; } });
      const wasVis = z.root.visible;
      z.root.visible = nd < fogFar - (z.root.visible ? 1 : 5); // hysteresis, and only vanish once ~90% fogged (no pop in view)
      const far = nd > fogFar * .7; // far from everyone: cheap AI (no neighbor push / LOS cars)
      const vis = z.root.visible; // still tick walk clips while on-screen, or mid-fog zombies stay in the bind T-pose
      const appeared = vis && !wasVis;
      if (z.hurtT > 0) { z.hurtT -= dt; if (z.oneShot || z.hurtT > 0) { const [nx, nz] = col.push(pp.x + z.vel.x * dt, pp.z + z.vel.z * dt, .3); pp.x = nx; pp.z = nz; z.vel.multiplyScalar(.85); if (vis) { z.mixer.update(dt); zBones(z); } continue; } }
      // state: notice / lose
      if (!near) continue; const det = near.crouch ? 7 : 14;
      if (z.st === 'look') { if (near && nd < det && (nd < 5 || col.los(pp.x, pp.z, near.x, near.z))) { z.st = 'chase'; z.lose = 0; onEvent && onEvent('notice', z); } else if ((z.lookT -= dt) <= 0 || Math.hypot(z.look[0] - pp.x, z.look[1] - pp.z) < 1.5) { z.st = 'wander'; z.node = -1; } }
      if (z.st === 'wander') { if (near && nd < det && (nd < 5 || col.los(pp.x, pp.z, near.x, near.z))) { z.st = 'chase'; z.lose = 0; onEvent && onEvent('notice', z); } }
      else if (z.st === 'chase') { if (nd > det * (z.mission ? 6 : 2.2)) { z.lose += dt; if (z.lose > 3) { z.st = 'wander'; z.node = -1; pickNode(z); } } else z.lose = 0; }
      let dx, dz, sp = z.speed, move = true;
      if (z.st === 'chase' && (z.tank || z.spitter)) {
        const toP = new THREE.Vector3(near.x - pp.x, 0, near.z - pp.z);
        const handled = tickSpecialZed(z, dt, { d: nd, toP, zp: pp, pp: { x: near.x, y: 0, z: near.z }, driving: !!near.drv, scene, audio: aud,
          moveCollide: (dx, dz, r) => { const q = col.push(pp.x + dx, pp.z + dz, r || .4); const hit = Math.abs(q[0] - (pp.x + dx)) + Math.abs(q[1] - (pp.z + dz)) > 1e-4; pp.x = q[0]; pp.z = q[1]; return hit; },
          hurtPlayer: (n) => { onHitPlayer && onHitPlayer(n, { x: pp.x, z: pp.z, id: near.id }); },
          knock: () => {}, toast: null, shake: null });
        if (handled) { if (vis) { z.mixer.update(dt); zBones(z); } continue; }
      }
      if (z.st === 'chase') {
        const tx = near.x - pp.x, tz = near.z - pp.z; let d = nd;
        if (d < 1.05) { move = false; if ((z.cd -= dt) <= 0 && !near.drv) { z.cd = R(1.2, 1.8); z.play('Punch_Jab', { once: true, force: true, speed: .9, cb: () => { z.curName = ''; } }); z.hitAt = .35; } z.root.rotation.y += angDiff(z.root.rotation.y, Math.atan2(tx, tz)) * Math.min(1, dt * 8); if (!z.oneShot) z.play('Idle_Loop'); }
        else { let dir = null; if (ni === 0 && nav && d > 2.5) dir = nav.dir(pp.x, pp.z); if (dir) { dx = dir[0]; dz = dir[1]; } else { dx = tx / d; dz = tz / d; } }
      } else if (z.st === 'look') { const ex = z.look[0] - pp.x, ez = z.look[1] - pp.z, d = Math.hypot(ex, ez) || 1; dx = ex / d; dz = ez / d; sp *= .8;
      } else { // wander along the road graph
        if (z.node < 0) pickNode(z); const n = graph[z.node]; const wx = n.x + z.off[0], wz = n.z + z.off[1]; const ex = wx - pp.x, ez = wz - pp.z, d = Math.hypot(ex, ez); if (d < 2) { pickNode(z); } dx = ex / (d || 1); dz = ez / (d || 1); sp *= z.tank ? .85 : .7; if (z.runner) sp *= .4;
      }
      if (z.hitAt > 0) { z.hitAt -= dt; if (z.hitAt <= 0 && nd < 1.5 && !near.drv) { onHitPlayer && onHitPlayer(11, { x: pp.x, z: pp.z, idx: ni, id: near.id }); } }
      if (move && !z.oneShot) {
        // separate from neighbours
        let sx = dx * sp * dt, sz = dz * sp * dt; if (!far) for (let j = 0; j < zs.length; j++) { if (j === i) continue; const o = zs[j]; if (o.dead) continue; const q = o.root.position; const ex = pp.x - q.x, ez = pp.z - q.z, e2 = ex * ex + ez * ez; if (e2 < .5 && e2 > 1e-4) { sx += ex / e2 * dt * .25; sz += ez / e2 * dt * .25; } }
        let nx = pp.x + sx, nz = pp.z + sz; if (!far) { const r = col.push(nx, nz, .3); nx = r[0]; nz = r[1]; if (W.cars) for (const k of W.cars) { if (Math.abs(k.x - nx) > 4 || Math.abs(k.z - nz) > 4) continue; for (const [cx, cz] of k.circles()) { const ddx = nx - cx, ddz = nz - cz, rr = k.rad + .35, d2 = ddx * ddx + ddz * ddz; if (d2 < rr * rr) { const d = Math.sqrt(d2) || .01; nx = cx + ddx / d * rr; nz = cz + ddz / d * rr; } } } } pp.x = nx; pp.z = nz;
        const want = Math.atan2(dx, dz); z.root.rotation.y += angDiff(z.root.rotation.y, want) * Math.min(1, dt * 6);
        z.play(z.st === 'chase' ? (z.runner ? 'Jog_Fwd_Loop' : 'Walk_Loop') : 'Walk_Loop', { speed: z.st === 'chase' ? (z.runner ? 1.2 : (z.tank ? .48 : .62)) : (z.runner ? .5 : (z.tank ? .4 : .45)), fade: appeared ? 0 : 0.18 });
      }
      if (vis) { if (appeared) { try { z.mixer.update(0); } catch (e) { /* seed */ } } z.mixer.update(dt); zBones(z); }
    }
    S.alive = alive; S.dead = dead;
    // keep the count up: spawn at a road end when nobody can see it
    if (alive < Math.round(target * nightMul) && (spawnT -= dt) <= 0) { spawnT = 3; edgeSpawn(); }
    // bodies stay; only draw the nearest `deadVisible`
    if ((deadT -= dt) <= 0) { deadT = 1; const ds = zs.filter(z => z.dead); if (ds.length > deadVisible) { ds.forEach(z => { z._d = Math.hypot(z.root.position.x - p0.x, z.root.position.z - p0.z); }); ds.sort((a, b) => a._d - b._d); ds.forEach((z, k) => { z.root.visible = k < deadVisible; if (z.pool) z.pool.visible = k < deadVisible; }); } S.rendered = Math.min(ds.length, deadVisible); }
  }
  function zBones(z) { if (z.dead) return; poseKindBones(z, t); }
  // head hitbox, identical to story's shot test (game.js: z.worldOf('DEF-head') + .08*scale, radius .17 m; skip when z.noHead)
  const _hp = new THREE.Vector3(); out.HEAD_R = .17; out.headPos = (z, v = _hp) => { z.worldOf('DEF-head', v); v.y += .08 * z.scale; return v; };
  // story wound marks (gore.js addWound, same part picking as Game.woundFrom): a mark where a zombie was hit, on the rigged (skinned) zombie models
  function wound(z, dir, head) { if (!z.skin || !dir) return; const a = z.root.rotation.y; let wx = -dir.x, wz = -dir.z; const l = Math.hypot(wx, wz) || 1; wx /= l; wz /= l; const c = Math.cos(-a), sn = Math.sin(-a), lx = wx * c + wz * sn, lz = -wx * sn + wz * c; const side = lx > 0 ? 'L' : 'R', r = Math.random();
    const part = head ? 'head' : r < .3 ? 'chest' : r < .45 ? 'belly' : r < .7 ? (Math.random() < .5 ? 'uarm' : 'farm') + side : r < .85 ? 'thigh' + side : r < .95 ? 'shin' + side : 'neck'; addWound(z, { kind: 'bullet', part, nx: lx * .9, nz: lz * .9 || .1, size: .045 * R(.9, 1.2), run: R(.12, .3) }); }
  out.wound = wound;
  // co-op missions: spawn a zombie at a spot (already chasing) and change how many roam the town
  out.spawnAt = (x, z, o = {}) => { if (col.hit(x, z, .4)) return null; const c = make(x, z, o); c.node = -1; pickNode(c); if (o.chase !== false) { c.st = 'chase'; c.lose = 0; } c.mission = o.mission || null; return c; };
  out.setNight = k => { nightMul = k; };
  out.setTarget = n => { target = n; out.target = n; };
  out.update = update; return out;
}
