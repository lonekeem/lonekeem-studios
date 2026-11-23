// Cartoon hands + a single per-item hold table (story, online, NPCs, store items).
// Original low-poly procedural hands (© Lone Keem Studios): palm, thumb and four fingers,
// with baked grip poses so fingers curl around a handle. Phone-friendly: one merged mesh per hand.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const _v = new THREE.Vector3(), _mm = new THREE.Matrix4();
const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();

function sampleColor(tex, uvs) {
  try {
    const im = tex.image; const w = im.width, h = im.height, c = document.createElement('canvas');
    c.width = w > 2048 ? 1024 : w; c.height = h > 2048 ? 1024 : h;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, c.width, c.height);
    const col = [];
    for (const [u, v] of uvs) {
      const px = x.getImageData(Math.min(c.width - 1, Math.max(0, Math.round(u * c.width))), Math.min(c.height - 1, Math.max(0, Math.round((tex.flipY ? 1 - v : v) * c.height))), 1, 1).data;
      col.push([px[0], px[1], px[2]]);
    }
    col.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
    const m = col[Math.floor(col.length / 2)] || [150, 110, 90];
    return new THREE.Color().setRGB(m[0] / 255, m[1] / 255, m[2] / 255, THREE.SRGBColorSpace);
  } catch (e) { return new THREE.Color('#9a7058'); }
}

const HANDS = new WeakMap();
// Cut the generated hand blobs off a skinned mesh and return per-side sizing so a cartoon hand can sit on the wrist.
export function processHands(skin) {
  const g0 = skin.geometry; if (HANDS.has(g0)) return HANDS.get(g0);
  const sk = skin.skeleton, si = g0.attributes.skinIndex, sw = g0.attributes.skinWeight, pos = g0.attributes.position, uv = g0.attributes.uv, n = pos.count;
  const out = { geo: g0, hands: {} }; const sides = ['Left', 'Right']; const W = {};
  const idxOf = {}; sides.forEach(sd => { idxOf[sd] = sk.bones.findIndex(b => b.name === sd + 'Hand'); W[sd] = new Float32Array(n); });
  for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) { const b = si.getComponent(i, k); sides.forEach(sd => { if (b === idxOf[sd]) W[sd][i] += sw.getComponent(i, k); }); }
  const ix = g0.index; if (!ix) { HANDS.set(g0, out); return out; }
  const keep = []; const TH = .5;
  for (let t = 0; t < ix.count; t += 3) { const a = ix.getX(t), b = ix.getX(t + 1), c = ix.getX(t + 2); let del = false; for (const sd of sides) if (W[sd][a] > TH && W[sd][b] > TH && W[sd][c] > TH) del = true; if (!del) keep.push(a, b, c); }
  g0.setIndex(keep); out.geo = g0;
  for (const sd of sides) {
    const bi = idxOf[sd]; if (bi < 0) continue; _mm.multiplyMatrices(sk.boneInverses[bi], skin.bindMatrix);
    const pts = [], uvs = []; for (let i = 0; i < n; i++) if (W[sd][i] > TH) { pts.push(_v.fromBufferAttribute(pos, i).applyMatrix4(_mm).clone()); if (uv) uvs.push([uv.getX(i), uv.getY(i)]); }
    if (pts.length < 10) continue; const c = new THREE.Vector3(); pts.forEach(p => c.add(p)); c.divideScalar(pts.length); const a = c.clone().normalize();
    let L = 0; pts.forEach(p => { L = Math.max(L, p.dot(a)); });
    let r0 = 0, rM = 0; pts.forEach(p => { const pr = p.dot(a), pp = p.clone().addScaledVector(a, -pr).length(); if (pr < .3 * L) r0 = Math.max(r0, pp); rM = Math.max(rM, pp); });
    const near = []; for (let i = 0; i < n; i++) if (W[sd][i] <= TH) { const p = _v.fromBufferAttribute(pos, i).applyMatrix4(_mm); const pr = p.dot(a); if (pr > -.45 * L && pr < .12 * L) { const pp = p.clone().addScaledVector(a, -pr); if (pp.length() < rM * 1.5) near.push(pp); } }
    let rf = r0 * .8, cf = new THREE.Vector3(); if (near.length > 8) { near.forEach(p => cf.add(p)); cf.divideScalar(near.length); const ds = near.map(p => p.distanceTo(cf)).sort((x, y) => x - y); rf = ds[Math.floor(ds.length * .8)]; } else cf.set(0, 0, 0);
    out.hands[sd] = { rf, cf, axis: a, L, r0, rM, color: sampleColor(skin.material.map, uvs), centroid: c };
  }
  HANDS.set(g0, out); return out;
}

// ---------- unit-space rig (Y = fingers, X = thumb, Z = palm / what you hold) ----------
const GEO = {
  sph: new THREE.SphereGeometry(1, 12, 10),
  cap: new THREE.CapsuleGeometry(1, 1, 4, 8),
  cone: new THREE.ConeGeometry(1, 1, 8),
};
const TMP_MAT = new THREE.MeshBasicMaterial();

function addMesh(parent, geo, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, TMP_MAT); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz); parent.add(m); return m;
}
function joint(parent, x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }

// One finger: 3 joints that curl around +X toward +Z (into the palm).
function makeFinger(parent, x, y, z, lens, rad, claw) {
  const j1 = joint(parent, x, y, z);
  addMesh(j1, GEO.cap, 0, lens[0] * .5, 0, rad, lens[0], rad);
  const j2 = joint(j1, 0, lens[0], 0);
  addMesh(j2, GEO.cap, 0, lens[1] * .5, 0, rad * .88, lens[1], rad * .88);
  const j3 = joint(j2, 0, lens[1], 0);
  addMesh(j3, GEO.cap, 0, lens[2] * .5, 0, rad * .72, lens[2], rad * .72);
  if (claw) addMesh(j3, GEO.cone, 0, lens[2] + .035, 0, rad * .55, .07, rad * .55);
  return [j1, j2, j3];
}

function makeUnitHand(claw) {
  const root = new THREE.Group();
  // wrist + palm
  addMesh(root, GEO.sph, 0, .06, 0, .13, .16, .11);
  addMesh(root, GEO.sph, 0, .32, .015, .20, .22, .09);
  // knuckles
  addMesh(root, GEO.sph, 0, .48, .01, .19, .07, .07);
  // index .. pinky (thumb is +X, so index is the most +X)
  const xs = [.13, .045, -.04, -.125];
  const lens = claw
    ? [[.14, .11, .09], [.15, .12, .10], [.14, .11, .09], [.11, .09, .07]]
    : [[.13, .10, .08], [.14, .11, .085], [.13, .10, .08], [.11, .085, .07]];
  const rads = [.032, .034, .032, .027];
  const fingers = xs.map((x, i) => makeFinger(root, x, .50, .01, lens[i], rads[i], claw));
  // thumb: out on +X, slightly toward the palm, two joints
  const th = joint(root, .16, .26, .04); th.rotation.set(0.15, 0, -0.85);
  addMesh(th, GEO.cap, 0, .07, 0, .038, .14, .038);
  const th2 = joint(th, 0, .14, 0); th2.rotation.set(0.2, 0, 0);
  addMesh(th2, GEO.cap, 0, .055, 0, .032, .11, .032);
  if (claw) addMesh(th2, GEO.cone, 0, .12, 0, .025, .05, .025);
  root.userData.fingers = fingers; root.userData.thumb = [th, th2];
  return root;
}

// pose name -> curl radians per joint [index..pinky][j1,j2,j3] + thumb [j1x, j1z, j2x]
const POSES = {
  open:  { f: [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]], t: [0.15, -0.85, 0.2] },
  relax: { f: [[.25, .2, .15], [.28, .22, .16], [.3, .24, .18], [.34, .26, .2]], t: [0.25, -0.7, 0.35] },
  fist:  { f: [[1.15, 1.35, 1.0], [1.2, 1.4, 1.05], [1.2, 1.4, 1.05], [1.15, 1.3, .95]], t: [0.55, -0.35, 0.9] },
  grip:  { f: [[.85, 1.05, .75], [.9, 1.1, .8], [.92, 1.12, .82], [.88, 1.05, .75]], t: [0.45, -0.4, 0.7] },
  pistol:{ f: [[.2, .15, .1], [.85, 1.0, .7], [.9, 1.05, .75], [.88, 1.0, .7]], t: [0.35, -0.25, 0.5] },
  claw:  { f: [[.45, .7, .55], [.5, .75, .6], [.48, .72, .55], [.42, .65, .5]], t: [0.35, -0.55, 0.55] },
};

function applyPose(root, pose) {
  const P = POSES[pose] || POSES.relax;
  const fs = root.userData.fingers, th = root.userData.thumb;
  fs.forEach((js, i) => { const c = P.f[i]; js[0].rotation.x = c[0]; js[1].rotation.x = c[1]; js[2].rotation.x = c[2]; });
  th[0].rotation.set(P.t[0], 0, P.t[1]); th[1].rotation.set(P.t[2], 0, 0);
}

const BAKED = {};
function bakePose(pose, claw) {
  const key = (claw ? 'c:' : '') + pose;
  if (BAKED[key]) return BAKED[key];
  const rig = makeUnitHand(!!claw);
  applyPose(rig, pose);
  rig.updateMatrixWorld(true);
  const geos = [];
  rig.traverse(o => { if (o.isMesh) { const ng = o.geometry.clone(); ng.applyMatrix4(o.matrixWorld); geos.push(ng); } });
  const merged = mergeGeometries(geos, false);
  merged.computeVertexNormals();
  BAKED[key] = merged;
  geos.forEach(g => { if (g !== merged) g.dispose(); });
  return merged;
}

export function buildCartoonHand(info, thumbDir, mat, opt = {}) {
  const grp = new THREE.Group(); const { axis: a, L } = info;
  const up = new THREE.Vector3(0, 1, 0);
  const u = thumbDir.clone().addScaledVector(a, -thumbDir.dot(a));
  if (u.lengthSq() < 1e-8) u.set(1, 0, 0).addScaledVector(a, -a.x); u.normalize();
  const X = u, Y = a.clone(), Z = new THREE.Vector3().crossVectors(X, Y).normalize();
  grp.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
  const claw = !!opt.claw; const pose = opt.pose || (claw ? 'claw' : 'relax');
  const mesh = new THREE.Mesh(bakePose(pose, claw), mat);
  mesh.scale.setScalar(L); mesh.castShadow = true; mesh.name = 'handMesh'; grp.add(mesh);
  // close the cut at the real forearm
  if (info.cf) {
    const cfl = info.cf.clone().addScaledVector(a, -info.cf.dot(a));
    mesh.position.add(cfl.applyQuaternion(grp.quaternion.clone().invert()));
  }
  // grip dummy lives on the scaled mesh so it stays in the visual palm
  const grip = new THREE.Object3D(); grip.name = 'grip';
  grip.position.set(0, 0.34, 0.05);
  mesh.add(grip);
  grp.userData = {
    pose, claw, L, grip, mesh, mat,
    setPose(p) { if (p === grp.userData.pose) return; mesh.geometry = bakePose(p, claw); grp.userData.pose = p; },
  };
  return grp;
}

export function tintHands(owner, color) {
  const c = color.isColor ? color : new THREE.Color(color);
  const hands = owner.hands || {};
  for (const sd of ['Left', 'Right']) {
    const h = hands[sd]; if (!h) continue;
    const mat = (h.userData && h.userData.mat) || (h.children[0] && h.children[0].material);
    if (mat) { mat.color.copy(c); if (mat.emissive) mat.emissive.copy(c); }
  }
}

// Attach cartoon hands to a Char or Avatar (cuts the generated hand triangles once).
export function applyCartoonHands(owner, opt = {}) {
  const skin = opt.skin || owner.skin; if (!skin || !skin.skeleton) return null;
  const B = opt.bones || {};
  if (!Object.keys(B).length) skin.skeleton.bones.forEach(b => { B[b.name] = b; });
  const existingR = B.RightHand && B.RightHand.getObjectByName('RightCartoonHand');
  const existingL = B.LeftHand && B.LeftHand.getObjectByName('LeftCartoonHand');
  if (existingR || existingL) {
    owner.hands = { Left: existingL, Right: existingR };
    if (opt.handColor) tintHands(owner, opt.handColor);
    return owner.hands;
  }
  const H = processHands(skin); skin.geometry = H.geo;
  const hands = {};
  const claw = !!opt.claw;
  ['Left', 'Right'].forEach(sd => {
    const hi = H.hands[sd]; const hb = B[sd + 'Hand']; if (!hi || !hb) return;
    const hc = opt.handColor ? new THREE.Color(opt.handColor) : (hi.color ? hi.color.clone().multiplyScalar(.86) : new THREE.Color('#9a7058'));
    const mat = new THREE.MeshStandardMaterial({ color: hc, roughness: opt.glove ? .8 : .62, metalness: 0, emissive: hc, emissiveIntensity: opt.lift || 0 });
    const ib = skin.skeleton.bones.indexOf(hb);
    _m.copy(skin.skeleton.boneInverses[ib]).invert().decompose(_p, _q, _s);
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(_q.clone().invert());
    const hand = buildCartoonHand(hi, fwd, mat, { claw, pose: opt.pose || (claw ? 'claw' : 'relax') });
    hand.name = sd + 'CartoonHand'; hb.add(hand); hands[sd] = hand;
  });
  owner.hands = hands;
  owner.handMats = { Left: hands.Left && hands.Left.userData.mat, Right: hands.Right && hands.Right.userData.mat };
  return hands;
}

// ---------- hold table ----------
// Transforms are in the GAME right-hand bone frame (the same space `attachSkin` uses).
// item space: grip at origin, barrel / shaft along +Z.
// guns: barrel along the bone (historical rot [PI/2,0,0], pos [0, .08, .02]).
// melee / tools: shaft across the fist (rot [0,0,0]); `along` slides the handle through the palm (metres).
// After attach, mountHeld snaps the grip origin to the cartoon palm, then applies `along`.
const PI = Math.PI;
const MELEE = { kind: 'melee', pose: 'grip', hands: 1, bonePos: [0, 0.02, 0.05], boneRot: [0, 0, 0], along: 0.10 };
const BLADE = { kind: 'melee', pose: 'grip', hands: 1, bonePos: [0, 0.02, 0.04], boneRot: [0, 0, 0], along: 0.05 };
const PISTOL = { kind: 'pistol', pose: 'pistol', hands: 1, bonePos: [0, 0.08, 0.02], boneRot: [PI / 2, 0, 0] };
const GUN2 = { kind: 'gun', pose: 'pistol', hands: 2, bonePos: [0, 0.08, 0.02], boneRot: [PI / 2, 0, 0], left: [0, 0, 0.28] };
const ITEM = { kind: 'item', pose: 'grip', hands: 1, bonePos: [0, 0.02, 0.05], boneRot: [0, 0, 0], along: 0.04 };

export const HOLDS = {
  default: { kind: 'gun', pose: 'grip', hands: 1, bonePos: [0, 0.08, 0.02], boneRot: [PI / 2, 0, 0] },
  fists: { kind: 'empty', pose: 'fist', hands: 0, hide: true, bonePos: [0, 0, 0], boneRot: [0, 0, 0] },
  pan: { ...MELEE, along: 0.10 },
  bat: { ...MELEE, along: 0.12 },
  crowbar: { ...MELEE, along: 0.12 },
  machete: { ...BLADE, along: 0.04 },
  axe: { ...MELEE, along: 0.12 },
  tomahawk: { ...MELEE, along: 0.08 },
  katana: { ...BLADE, along: 0.06 },
  longsword: { ...BLADE, hands: 2, along: 0.08, left: [0, 0, 0.35] },
  chainsaw: { ...MELEE, hands: 2, along: 0.08, left: [0, 0.04, 0.22] },
  hammer: { ...MELEE, along: 0.08 },
  plank: { ...ITEM, along: 0.12 },
  pistol: { ...PISTOL },
  revolver: { ...PISTOL },
  handcannon: { ...PISTOL },
  smg: { ...GUN2, left: [0, 0, 0.18] },
  shotgun: { ...GUN2, left: [0, 0, 0.32] },
  rifle: { ...GUN2, left: [0, 0, 0.30] },
  sniper: { ...GUN2, left: [0, 0, 0.36] },
  saw: { ...GUN2, left: [0, 0, 0.34] },
  lever: { ...GUN2, left: [0, 0, 0.30] },
  auto12: { ...GUN2, left: [0, 0, 0.26] },
  harpoon: { ...GUN2, left: [0, 0, 0.36] },
  minigun: { ...GUN2, left: [0, 0, 0.22] },
  crossbow: { ...GUN2, left: [0, 0, 0.22] },
  flamer: { ...GUN2, left: [0, 0, 0.28] },
  launcher: { ...GUN2, left: [0, 0, 0.24] },
  flashlight: { ...ITEM, along: 0.05 },
  grenade: { kind: 'item', pose: 'grip', hands: 1, bonePos: [0, 0.04, 0.03], boneRot: [0, 0, 0] },
};

export function getHold(id) { return HOLDS[id] || HOLDS.default; }
// New store / loot items can register a hold (or inherit a preset via `base: 'melee'|'pistol'|'gun'`).
export function registerHold(id, spec = {}) {
  const base = typeof spec.base === 'string' ? (HOLDS[spec.base] || ({ melee: MELEE, blade: BLADE, pistol: PISTOL, gun: GUN2, item: ITEM }[spec.base])) : null;
  HOLDS[id] = Object.assign({}, base || HOLDS.default, spec, { base: undefined });
  return HOLDS[id];
}

export function applyHoldTransform(group, id) {
  const h = getHold(id);
  group.visible = !h.hide;
  const pos = h.bonePos || (h.kind === 'melee' || h.kind === 'item' ? [0, 0.02, 0.05] : [0, 0.08, 0.02]);
  const rot = h.boneRot || (h.kind === 'melee' || h.kind === 'item' ? [0, 0, 0] : [Math.PI / 2, 0, 0]);
  group.position.set(...pos);
  group.rotation.set(...rot);
  group.scale.set(1, 1, 1);
  let lg = group.getObjectByName('leftGrip');
  if (h.hands === 2) {
    if (!lg) { lg = new THREE.Object3D(); lg.name = 'leftGrip'; group.add(lg); }
    lg.position.set(...(h.left || [0, 0, 0.28]));
  } else if (lg) lg.parent.remove(lg);
  return h;
}

// Attach (via attachSkin so meter-scale models match the avatar) then snap the grip into the cartoon palm.
export function mountHeld(ch, group, id, side = 'Right') {
  if (!ch || !group) return false;
  // if a previous revision parented this group to the cartoon grip, detach and reset scale
  if (group.parent && group.parent.name === 'grip') { group.parent.remove(group); group.scale.set(1, 1, 1); }
  const boneName = side === 'Right' ? 'DEF-hand.R' : 'DEF-hand.L';
  if (!group.parent) {
    if (ch.attach) ch.attach(boneName, group);
    else { const b = ch.bone && ch.bone(boneName); if (b) b.add(group); }
  }
  const hold = applyHoldTransform(group, id);
  const hand = ch.hands && ch.hands[side];
  if (hand && hand.userData && hand.userData.setPose) {
    const emptyPose = hand.userData.claw ? 'claw' : (hold.pose || 'fist');
    hand.userData.setPose(hold.hide ? emptyPose : (hold.pose || 'grip'));
  }
  const other = side === 'Right' ? 'Left' : 'Right';
  if (ch.hands && ch.hands[other] && ch.hands[other].userData.setPose) {
    if (hold.hands === 2) ch.hands[other].userData.setPose(hold.leftPose || 'grip');
    else if (!ch._keepOtherPose) ch.hands[other].userData.setPose(ch.hands[other].userData.claw ? 'claw' : 'relax');
  }
  // snap item origin to the cartoon palm, then slide along the handle
  const grip = hand && hand.userData && hand.userData.grip;
  if (grip && !hold.hide && group.parent) {
    try {
      if (ch.root && ch.root.updateMatrixWorld) ch.root.updateMatrixWorld(true);
      const gp = new THREE.Vector3(), ip = new THREE.Vector3(), bp = new THREE.Vector3();
      grip.getWorldPosition(gp); group.getWorldPosition(ip);
      const hb = (side === 'Right' ? (ch.hands && ch.hands.Right) : (ch.hands && ch.hands.Left));
      if (hb && hb.getWorldPosition) hb.getWorldPosition(bp);
      // only snap when the palm dummy really sits in the hand (not a scaled-space miss)
      const close = !hb || gp.distanceTo(bp) < 0.22;
      if (close) {
        const par = group.parent; par.updateWorldMatrix(true, false);
        group.position.add(par.worldToLocal(gp.clone()).sub(par.worldToLocal(ip.clone())));
      }
      if (hold.along) group.translateZ(hold.along);
    } catch (e) { /* keep bone-space offset */ }
  }
  ch._holdId = id; ch._hold = hold;
  ch._leftGrip = (hold.hands === 2 && side === 'Right') ? group.getObjectByName('leftGrip') : null;
  return !!group.parent;
}

// Simple 2-bone IK so the off-hand can rest on a rifle forend / longsword hilt. Called after animation retarget.
export function reachLeftHand(ch, target, bones) {
  if (!ch || !target || !bones) return;
  const upper = bones.LeftArm, mid = bones.LeftForeArm, end = bones.LeftHand;
  if (!upper || !mid || !end) return;
  const t = new THREE.Vector3(), ee = new THREE.Vector3(), bp = new THREE.Vector3();
  target.getWorldPosition(t);
  end.getWorldPosition(ee);
  if (ee.distanceTo(t) > 1.15) return; // don't stretch across the map if the anim is a death / sit
  const q = new THREE.Quaternion(), pw = new THREE.Quaternion(), bw = new THREE.Quaternion();
  for (let i = 0; i < 6; i++) {
    for (const b of [mid, upper]) {
      end.getWorldPosition(ee); b.getWorldPosition(bp);
      const toE = ee.sub(bp); if (toE.lengthSq() < 1e-8) continue; toE.normalize();
      const toT = t.clone().sub(bp); if (toT.lengthSq() < 1e-8) continue; toT.normalize();
      q.setFromUnitVectors(toE, toT);
      if (b.parent) b.parent.getWorldQuaternion(pw); else pw.identity();
      b.getWorldQuaternion(bw); bw.premultiply(q);
      b.quaternion.copy(pw.clone().invert().multiply(bw));
      b.updateMatrixWorld(true);
    }
  }
}

export function giveHammer(dad, alsoPlank = true) {
  if (!dad) return;
  // lazy import avoided: caller may pass buildWeapon via opt, or we build a minimal hammer if gear isn't loaded
  const build = (typeof window !== 'undefined' && window.__atqBuildWeapon) || null;
  if (!dad._hammer) {
    const hg = new THREE.Group();
    const mesh = build ? build('hammer') : null;
    if (mesh) hg.add(mesh);
    else { const h = new THREE.Group(); const wood = new THREE.Mesh(new THREE.CylinderGeometry(.015, .013, .26, 8), new THREE.MeshStandardMaterial({ color: '#6b4527' })); wood.rotation.x = Math.PI / 2; wood.position.z = .12; h.add(wood); const head = new THREE.Mesh(new THREE.BoxGeometry(.05, .05, .12), new THREE.MeshStandardMaterial({ color: '#8a9098', metalness: .6, roughness: .4 })); head.position.z = .30; h.add(head); hg.add(h); }
    mountHeld(dad, hg, 'hammer'); dad._hammer = hg;
  }
  dad._hammer.visible = true;
  if (alsoPlank) {
    if (!dad._plank) {
      const pg = new THREE.Group();
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.018, 0.62), new THREE.MeshStandardMaterial({ color: '#7a6244', roughness: 1 }));
      m.castShadow = true; pg.add(m); mountHeld(dad, pg, 'plank', 'Left'); dad._plank = pg;
    }
    dad._plank.visible = true;
  } else if (dad._plank) dad._plank.visible = false;
}

if (typeof window !== 'undefined') {
  window.__atqMountHeld = mountHeld;
  window.__atqGetHold = getHold;
  window.__atqRegisterHold = registerHold;
  window.__atqGiveHammer = giveHammer;
}
