// v2.2 TOWN LIFE — living townspeople events for story mode (feat/town-npcs). Self-contained module: game.js only calls
// townUpdate(g, dt) once per frame and townReset(g) from clearActors(). Everything else (hinged house doors, yard fences,
// panicking NPCs, escapes, bodies) lives here. Other systems (gore/wounds, raiders, audio) are NOT touched.
//
// GORE HOOK (for the gore/wounds worker): replace any of g.town.hooks.* (or edit TOWN_HOOKS below). They are called with plain data:
//   hooks.grab(g, npc, zombies)      the first zombie has hold of the NPC (they are being dragged down)
//   hooks.down(g, npc, zombies)      the NPC is on the ground and being fed on — spawn blood, pools, wounds here
//   hooks.body(g, npc)               the NPC stopped moving; the body now stays in the world for the rest of the step
// Defaults only use the existing g.blood()/g.decal()/g.audio.shout() helpers.
import * as THREE from 'three';
import { Char } from './chars.js';
import { randomLook } from './looks.js';
import { addWound, bloodyMouth, makePool, setHandBlood } from './gore.js';
const angDiff = (a, b) => ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const hyp = Math.hypot;

// v1.9.16: wired to the gore module (gore.js): lasting wounds, spreading pools, feeders with bloody mouths/hands, small streak/splat blood.
export const TOWN_HOOKS = {
  grab(g, n, zs) { if (!g.settings.gore) return; g.blood(new THREE.Vector3(n.root.position.x, 1.1, n.root.position.z), new THREE.Vector3(0, .6, 0), 5, 2, .6); g.woundFrom(n, zs[0] ? zs[0].root.position : null, 'melee'); },
  down(g, n, zs) { const p = n.root.position; n.bleed = false; n.pose = Math.random(); n.life = 1;
    if (g.settings.gore) { n.pool = makePool(g, p.x, p.z, .5, 2.4); n.poolFix = 1.6; g.decal(p.x + .6, p.z - .4, 0.8); addWound(n, { kind: 'torn', part: 'belly', nz: 1, size: .1, run: .3 }); addWound(n, { kind: 'bite', part: zs.length > 1 ? 'thighL' : 'uarmR', nz: 1, nx: .3, size: .06 }); g.blood(new THREE.Vector3(p.x, .3, p.z), new THREE.Vector3(0, .8, 0), 10, 2.4, .6);
      // feeders kneel on the far side and flanks (away from the player) so the body and pool stay readable
      zs.forEach((z, i) => { z.eatOff = i; if (g.placeFeeder) g.placeFeeder(z, n, i, zs.length); else { const a = Math.atan2(g.player.root.position.x - p.x, g.player.root.position.z - p.z) + Math.PI; z.root.position.set(p.x + Math.sin(a) * .55, (g.groundAt ? g.groundAt(p.x, p.z) : 0), p.z + Math.cos(a) * .55); z.root.rotation.y = Math.atan2(p.x - z.root.position.x, p.z - z.root.position.z); } bloodyMouth(z, 1.2 + i * .3); setHandBlood(z, .6); }); } },
  body(g, n) { n.bleed = false; },
};

// ---------------------------------------------------------------- hinged doors
// The old house door was a static slab painted on the wall. Each generic house now gets a real door: hinged at one edge, swings out
// onto the porch, with a dark doorway behind it, a frame and a knob. open(h) / shut(h) are animated by updateDoors().
function buildDoors(g, T) {
  const W = g.world, scene = g.scene; T.doors = [];
  const frame = new THREE.MeshStandardMaterial({ color: '#24190f', roughness: .9 }), inside = new THREE.MeshBasicMaterial({ color: '#0b0806' }), knobM = new THREE.MeshStandardMaterial({ color: '#b8a070', metalness: .8, roughness: .3 });
  const doorMat = new THREE.MeshStandardMaterial({ color: '#4a3526', roughness: .78 });
  for (const h of W.houses || []) {
    const f = h.face, wallX = h.cx + f * h.w / 2; h.door.visible = false;
    const hz = h.cz + .55, pivot = new THREE.Group(); pivot.position.set(wallX + f * .035, 0, hz); scene.add(pivot);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(.06, 2.1, 1.1), doorMat); slab.position.set(0, 1.05, -.55); slab.castShadow = true; pivot.add(slab);
    [.6, 1.5].forEach(y => { const p = new THREE.Mesh(new THREE.BoxGeometry(.075, .7, .8), doorMat); p.position.set(f * .01, y + .0, -.55); p.scale.set(1, 1, 1); pivot.add(p); }); // raised panels
    const knob = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), knobM); knob.position.set(f * .06, 1.0, -1.0); pivot.add(knob);
    const dark = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.1), inside); dark.position.set(wallX + f * .012, 1.05, h.cz); dark.rotation.y = f > 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(dark);
    const mk = (sx, sy, sz, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), frame); m.position.set(wallX + f * .045, y, z); scene.add(m); };
    mk(.1, .08, 1.28, 2.14, h.cz); mk(.1, 2.14, .09, 1.07, h.cz - .6); mk(.1, 2.14, .09, 1.07, h.cz + .6); // frame
    const porchTop = .25; const step = new THREE.Mesh(new THREE.BoxGeometry(.5, .12, 1.3), new THREE.MeshStandardMaterial({ color: '#5c5048', roughness: 1 })); step.position.set(wallX + f * 2.0, .06, h.cz); scene.add(step);
    const D = { h, pivot, k: 0, to: 0, f, wallX, porchX: wallX + f * 1.15, standX: wallX + f * .9, cz: h.cz, hingeZ: hz, snd: 0, busy: 0 };
    T.doors.push(D); h.tdoor = D; setDoorK(D, 0);
  }
}
function setDoorK(D, k) { D.k = k; D.pivot.rotation.y = -D.f * k * 1.75; }
function updateDoors(g, T, dt) { for (const D of T.doors) { if (D.k === D.to) continue; const sp = D.to > D.k ? 3.4 : 5.2; const k = D.k + clamp(D.to - D.k, -sp * dt, sp * dt); setDoorK(D, k); if (D.to === 0 && D.k === 0 && g.audio.play && D.snd !== 2) { D.snd = 2; } } }
export function doorOpen(g, D) { if (D.to !== 1) { D.to = 1; D.snd = 1; if (g.audio.play && near(g, D.wallX, D.cz, 45)) g.audio.play('door_open', { vol: .6, pos: { x: D.wallX, y: 1, z: D.cz }, ref: 4, maxD: 40 }); } }
export function doorShut(g, D) { D.to = 0; }
const near = (g, x, z, r) => hyp(g.player.root.position.x - x, g.player.root.position.z - z) < r;

// ---------------------------------------------------------------- state
function fresh(g) { const T = { world: g.world, doors: [], pool: [], npcs: [], bodies: [], ev: null, cd: 10, t: 0, hooks: Object.assign({}, TOWN_HOOKS), built: false, count: 0, log: [] }; T.force = (fate, o) => startEvent(g, T, fate, o); return T; }
function kill(g, T, n, dispose) { const i = T.npcs.indexOf(n); if (i >= 0) T.npcs.splice(i, 1); delete g.npcs[n.key]; g.scene.remove(n.root); if (dispose) { n.mixer.stopAllAction(); n.mixer.uncacheRoot(n.model); g.disposeTree && g.disposeTree(n.root); } }
export function townReset(g) {
  const T = g.town; if (!T) return; for (const n of T.npcs.slice()) kill(g, T, n, true); for (const b of T.bodies) { g.scene.remove(b.root); b.mixer.stopAllAction(); b.mixer.uncacheRoot(b.model); g.disposeTree && g.disposeTree(b.root); } T.bodies = [];
  T.ev = null; T.cd = 10; for (const D of T.doors) { D.to = 0; setDoorK(D, 0); }
}
// ---------------------------------------------------------------- NPC townspeople
const _fr = new THREE.Frustum(), _m = new THREE.Matrix4(), _v = new THREE.Vector3();
function onScreen(g, x, z, pad = 6) { g.camera.updateMatrixWorld(); _m.multiplyMatrices(g.camera.projectionMatrix, g.camera.matrixWorldInverse); _fr.setFromProjectionMatrix(_m);
  for (const [dx, dz] of [[0, 0], [pad, 0], [-pad, 0], [0, pad], [0, -pad]]) for (const y of [0.2, 1.6]) if (_fr.containsPoint(_v.set(x + dx, y, z + dz))) return true; return false; }
const dFromP = (g, x, z) => hyp(g.player.root.position.x - x, g.player.root.position.z - z);

function makeChar(g) { const seed = (Math.random() * 1e6) | 0, look = randomLook(seed, false); look.blood = 0; look.grime = .25;
  const c = new Char(g.lib, look, rnd(.95, 1.02)); c.female = look.rig === 'genf' ? true : look.rig === 'genm' ? false : Math.random() < .5;
  // head look-back / forward lean ride on top of the animation mixer (bones the clips drive, so nothing accumulates)
  const mu = c.mixer.update; c.mixer.update = function (dt) { const r = mu.call(this, dt); overlay(c); return r; }; return c; }
function overlay(c) { const s = c.tn; if (!s || s.frozen) return; const B = (n) => c.bone(n), h = B('DEF-head'), nk = B('DEF-neck'), sp = B('DEF-spine.003'), sp1 = B('DEF-spine.001');
  if (h) h.rotateY(s.hy * .55); if (nk) nk.rotateY(s.hy * .3); if (sp) sp.rotateY(s.hy * .35); if (sp1) sp1.rotateX(.16 * s.lean);
  if (s.reach > .01) { for (const k of ['L', 'R']) { const ua = B('DEF-upper_arm.' + k), fa = B('DEF-forearm.' + k); if (ua) ua.rotateX(1.3 * s.reach); if (fa) fa.rotateX(.25 * s.reach); } } }


// measured-speed locomotion (feet follow the ground speed actually covered): Walk<->Jog<->Sprint blend via Char.locomote (self-contained; main has no autoLoco)
let FR = 0; // frame counter (main's Char has none)
function loco(c, dt, idle = 'Idle_Loop') { const p = c.root.position, lp = c._lp || (c._lp = { x: p.x, z: p.z, f: FR - 1 }); let sp = c._as || 0;
  if (dt > 0 && lp.f === FR - 1) { const inst = hyp(p.x - lp.x, p.z - lp.z) / dt; if (inst < 14) sp += (inst - sp) * Math.min(1, dt * (inst > sp ? 9 : 6)); } else if (lp.f < FR - 1) sp = 0;
  lp.x = p.x; lp.z = p.z; lp.f = FR; c._as = sp; const on = c.locoOn ? sp > .12 : sp > .22;
  if (on) { if (!c.locomote(sp, 1, dt, 6.4)) c.play(sp > 2.5 ? 'Jog_Fwd_Loop' : 'Walk_Loop'); return true; } c.play(idle); return false; }

// move toward (tx,tz) at speed with whisker steering around colliders; returns remaining distance
function steer(g, c, tx, tz, spd, dt, col = true) { const p = c.root.position, s = c.tn; let dx = tx - p.x, dz = tz - p.z; const d = hyp(dx, dz) || 1e-3; let a = Math.atan2(dx, dz);
  if (col) { const free = (an) => !g.inCol(p.x + Math.sin(an) * 1.3, p.z + Math.cos(an) * 1.3, .3); if (!free(a)) { for (const o of [.5, -.5, 1.0, -1.0, 1.6, -1.6]) if (free(a + o)) { a += o; break; } } }
  s.sv += (spd - s.sv) * Math.min(1, dt * 5); const st = Math.min(d, s.sv * dt), yaw = c.root.rotation.y; c.root.rotation.y = yaw + angDiff(yaw, a) * Math.min(1, dt * 10);
  const mx = Math.sin(c.root.rotation.y) * st, mz = Math.cos(c.root.rotation.y) * st; if (col) g.moveCollide(p, mx, mz, .28); else { p.x += mx; p.z += mz; } return d; }

function nearestThreat(g, T, c) { let b = null, bd = 99; for (const z of T.ev ? T.ev.zs : []) { if (z.dead || z.st === 'eat') continue; const d = dist(z.root.position, c.root.position); if (d < bd) { bd = d; b = z; } } c.tn.threat = b; c.tn.td = bd; return b; }
const dist = (a, b) => hyp(a.x - b.x, a.z - b.z);

function panic(g, T, c, dt) { const s = c.tn, th = nearestThreat(g, T, c); s.lean += ((s.sv > 3 ? 1 : 0) - s.lean) * Math.min(1, dt * 4);
  s.gt -= dt; if (s.gt < 0) { s.gt = rnd(1.1, 2.1); s.gd = .8; } if (s.gd > 0) s.gd -= dt;
  let want = 0; if (th && s.td < 16 && s.gd > 0 && s.sv > 1) { want = clamp(angDiff(c.root.rotation.y, Math.atan2(th.root.position.x - c.root.position.x, th.root.position.z - c.root.position.z)), -1.45, 1.45); }
  s.hy += (want - s.hy) * Math.min(1, dt * 9);
  s.sc -= dt; if (th && s.td < 18 && s.sc <= 0) { s.sc = rnd(3.2, 5); g.audio.shout && g.audio.shout(c.female ? 'npcf_scream' : 'npcm_scream', false, c.root.position); } }

function tick(g, T, c, dt) { const s = c.tn, ev = T.ev; if (!ev) return; const p = c.root.position;
  if (s.state === 'run') { panic(g, T, c, dt); steer(g, c, s.tx, s.tz, s.spd, dt); loco(c, dt); s.stuck = (s.stuck || 0) + dt; if (s.lp === undefined || hyp(p.x - s.lp[0], p.z - s.lp[1]) > .8) { s.lp = [p.x, p.z]; s.stuck = 0; }
    if (s.stuck > 4.5 && !onScreen(g, p.x, p.z, 0)) return finish(g, T, c, 'stuck');
    if (s.fate === 'caught') { const z = ev.catcher; if (z && !z.dead && dist(z.root.position, p) < 1.15) return grab(g, T, c); }
    if (s.fate === 'door') { if (hyp(p.x - s.tx, p.z - s.tz) < .7) { s.state = 'open'; s.t = 0; c.play('Idle_Loop', { force: true }); s.reach = 1; doorOpen(g, s.D); } }
    else if (s.fate === 'away') { if (hyp(p.x - s.tx, p.z - s.tz) < 1.5 || (dFromP(g, p.x, p.z) > 52 && !onScreen(g, p.x, p.z, 0) && s.t > 4)) return finish(g, T, c, 'away'); }
    s.t += dt; }
  else if (s.state === 'open') { s.t += dt; panic(g, T, c, dt); const yaw = Math.atan2(-s.D.f * 0, 0); c.root.rotation.y += angDiff(c.root.rotation.y, s.D.f > 0 ? -Math.PI / 2 : Math.PI / 2) * Math.min(1, dt * 12); if (s.t > .55) { s.state = 'in'; s.t = 0; s.reach = 0; } loco(c, dt); }
  else if (s.state === 'in') { s.t += dt; const D = s.D; steer(g, c, D.wallX - D.f * 1.1, D.cz, 2.6, dt, false); loco(c, dt); if (-(p.x - D.wallX) * D.f > .5 || s.t > 2.5) { c.root.visible = false; doorShut(g, D); s.state = 'hidden'; s.t = 0; } }
  else if (s.state === 'hidden') { s.t += dt; if (s.t > .8) finish(g, T, c, 'door'); }
  else if (s.state === 'grabbed') { s.t += dt; if (s.t > .7 && !s.fell) { s.fell = 1; down(g, T, c); } }
  else if (s.state === 'down') { s.t += dt; if (s.t > 9) bodyDone(g, T, c); } }

function grab(g, T, c) { const s = c.tn, ev = T.ev; s.state = 'grabbed'; s.t = 0; c.endLoco(); c.play('Hit_Chest', { once: true, force: true, speed: .8, cb: () => { c.curName = ''; } }); s.hy = 0; s.lean = 0;
  for (const z of ev.zs) if (!z.dead) { z.tgt = null; z.tgT = 0; } T.hooks.grab(g, c, ev.zs); g.audio.shout && g.audio.shout(c.female ? 'npcf_help' : 'npcm_help', true, c.root.position); }
function down(g, T, c) { const s = c.tn, ev = T.ev, p = c.root.position; s.state = 'down'; s.t = 0; c.play('Idle_Loop', { force: true, speed: 0 }); if (g.freezeClip) g.freezeClip(c, 'Idle_Loop', 0); c.isVictim = true; c.struggle = 1; c.jolt = 0; c.screamT = rnd(.5, 1.5); c.id = Math.random() * 10; c.life = 1; if (g.layOnBack) g.layOnBack(c);
  let i = 0; const zs = ev.zs.filter(z => !z.dead); for (const z of zs) { z.st = 'eat'; z.eat = c; z.eatOff = i; if (g.placeFeeder) g.placeFeeder(z, c, i, zs.length); else { const a = i / zs.length * 6.28; z.root.position.set(p.x + Math.cos(a) * .55, (g.groundAt ? g.groundAt(p.x, p.z) : 0), p.z + Math.sin(a) * .55); z.root.rotation.y = Math.atan2(p.x - z.root.position.x, p.z - z.root.position.z); } i++; }
  T.hooks.down(g, c, zs); ev.done = true; T.bodiesPending = c; }
function bodyDone(g, T, c) { c.isVictim = false; c.struggle = 0; T.hooks.body(g, c); c.tn.frozen = true; const i = T.npcs.indexOf(c); if (i >= 0) T.npcs.splice(i, 1); delete g.npcs[c.key]; c.update = null; c.tn.bornAt = T.t; T.bodies.push(c); T.bodiesPending = null; }
function finish(g, T, c, why) { const ev = T.ev; for (const z of ev.zs) if (!z.dead && z.st !== 'eat') { z.tgt = null; z.tgT = 0; z.speed = Math.min(z.speed, 1.6); } ev.done = true; T.log.push(why); kill(g, T, c, true); }

// ---------------------------------------------------------------- scheduler
const noTown = (g) => g.cut || g.dlgCur || g.dying || g.dead || g.boss || g.carSeq || g.useSeq || g.convo || g.truck.driving || g.step === 0 || (g.stepData && g.stepData.noTown) || g.survival;
export function townUpdate(g, dt) {
  let T = g.town; if (!T || T.world !== g.world) T = g.town = fresh(g);
  if (!T.built) { T.built = true; try { buildDoors(g, T); } catch (e) { console.error('town build', e); } }
  FR++; T.t += dt; updateDoors(g, T, dt);
  // old bodies stay a good while; only once they are long gone (2.5 min), far away (>45 m, deep in fog) and out of view are they quietly removed (never a pop in view)
  if (T.bodies.length && (FR & 31) === 0) for (const b of T.bodies.slice()) { const P = b.root.position; if (T.t - (b.tn.bornAt || 0) > 150 && dFromP(g, P.x, P.z) > 45 && !onScreen(g, P.x, P.z, 0)) { T.bodies.splice(T.bodies.indexOf(b), 1); g.scene.remove(b.root); b.mixer.stopAllAction(); b.mixer.uncacheRoot(b.model); g.disposeTree && g.disposeTree(b.root); } }
  if (T.ev && T.ev.done && !T.npcs.length) T.ev = null;
  if (T.spare === undefined && T.t > 3) { T.spare = null; }
  if (T.ev || noTown(g)) { if (!T.ev) T.cd = Math.max(T.cd, 3); return; }
  if (!T.spare && T.cd < 3.5) { try { T.spare = makeChar(g); } catch (e) { console.error(e); } }
  T.cd -= dt; if (T.cd > 0) return;
  if (g.alive().filter(z => z.st !== 'eat').length > 5 || T.npcs.length) { T.cd = 8; return; }
  startEvent(g, T, null) ? (T.cd = rnd(40, 70)) : (T.cd = 6);
}
export function startEvent(g, T, force, o = {}) { const SD = o.sd || 46;
  const P = g.player.root.position, houses = (g.world.houses || []).filter(h => h.tdoor && dFromP(g, h.fx, h.cz) > 9 && dFromP(g, h.fx, h.cz) < 34); if (!houses.length) return false;
  const fate = force || pick(['door', 'door', 'caught', 'caught', 'away']); let H = null, spawn = null, dir = o.dir || (Math.random() < .5 ? 1 : -1);
  for (let k = 0; k < 8 && !spawn; k++, dir = o.dir ? dir : -dir) {
    const lane = (Math.random() < .5 ? 1 : -1) * rnd(2.2, 3.8), tryPts = fate === 'away' ? [[-Math.sign(P.x || 1) * 48, P.z + rnd(-12, 12), 'woods'], [lane, P.z + dir * SD, 'road']] : [[lane, P.z + dir * SD, 'road']];
    for (const [x, z, kind] of tryPts) { if (g.inCol(x, z, 1) || (!o.near && (onScreen(g, x, z, 8) || dFromP(g, x, z) < 30))) continue; spawn = { x, z, kind, dir }; break; } }
  if (o.at) spawn = { x: o.at[0], z: o.at[1], kind: 'road', dir: o.dir || 1 };
  if (!spawn) return false;
  if (fate === 'door') { H = houses.sort((a, b) => Math.abs(a.cz - P.z) - Math.abs(b.cz - P.z))[0]; }
  const c = T.spare || makeChar(g); T.spare = null; const key = 'tn' + (++T.count);
  c.tn = { state: 'run', reach: 0, fate, spd: fate === 'caught' ? 4.3 : 4.9, sv: fate === 'caught' ? 4.3 : 4.9, hy: 0, lean: 0, gt: rnd(.2, 1), gd: 0, sc: rnd(.3, 1), t: 0, D: H && H.tdoor }; c.key = key; c.lookKey = ''; c.update = (dt) => tick(g, T, c, dt);
  c.root.position.set(spawn.x, 0, spawn.z); g.scene.add(c.root); g.npcs[key] = c; T.npcs.push(c); c.play('Jog_Fwd_Loop');
  const away = new THREE.Vector3(spawn.kind === 'woods' ? Math.sign(spawn.x) : 0, 0, spawn.kind === 'woods' ? 0 : spawn.dir).normalize();
  const D = H && H.tdoor; if (D) { c.tn.tx = D.porchX; c.tn.tz = D.cz; } else if (spawn.kind === 'woods') { c.tn.tx = -spawn.x; c.tn.tz = spawn.z + rnd(-6, 6); } else { c.tn.tx = (Math.random() < .5 ? 1 : -1) * 3; c.tn.tz = P.z - spawn.dir * 70; }
  c.root.rotation.y = Math.atan2(c.tn.tx - spawn.x, c.tn.tz - spawn.z);
  const zs = [], n = fate === 'caught' ? 2 : 2 + (Math.random() < .4 ? 1 : 0);
  for (let i = 0; i < n; i++) { const gap = i === 0 ? 3.6 : 6 + i * 2.2; const zx = spawn.x + away.x * gap + rnd(-.6, .6), zz = spawn.z + away.z * gap + rnd(-.6, .6);
    const z = g.spawnZ(zx, zz, { runner: true, aggro: 90 }); z.speed = i === 0 && fate === 'caught' ? 5.0 : rnd(3.3, 3.8); z.tgt = c; z.tgT = 1e9; z.root.rotation.y = Math.atan2(c.tn.tx - zx, c.tn.tz - zz); z.play('Jog_Fwd_Loop', { speed: 1.1 }); zs.push(z); }
  T.ev = { fate, zs, catcher: fate === 'caught' ? zs[0] : null, done: false, c }; return true;
}
