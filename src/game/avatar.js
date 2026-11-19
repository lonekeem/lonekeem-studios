// v2.1 real-3D character skins: a smooth, textured, rigged avatar model is driven by the game's existing animation
// skeleton (Quaternius clips), so every animation/hit/death/aim behaviour in the game is untouched. The old mannequin
// stays in the scene graph (hidden) as the "motion source"; each frame its bone rotations are retargeted onto the avatar rig.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

// source (game skeleton) -> avatar rig bone names
const MAP = [['DEF-hips', 'Hips'], ['DEF-spine.001', 'Spine02'], ['DEF-spine.002', 'Spine01'], ['DEF-spine.003', 'Spine'], ['DEF-neck', 'neck'], ['DEF-head', 'Head'],
  ['DEF-shoulder.L', 'LeftShoulder'], ['DEF-upper_arm.L', 'LeftArm'], ['DEF-forearm.L', 'LeftForeArm'], ['DEF-hand.L', 'LeftHand'],
  ['DEF-shoulder.R', 'RightShoulder'], ['DEF-upper_arm.R', 'RightArm'], ['DEF-forearm.R', 'RightForeArm'], ['DEF-hand.R', 'RightHand'],
  ['DEF-thigh.L', 'LeftUpLeg'], ['DEF-shin.L', 'LeftLeg'], ['DEF-foot.L', 'LeftFoot'], ['DEF-toe.L', 'LeftToeBase'],
  ['DEF-thigh.R', 'RightUpLeg'], ['DEF-shin.R', 'RightLeg'], ['DEF-foot.R', 'RightFoot'], ['DEF-toe.R', 'RightToeBase']];


// --- clean cartoon hands: the generated hand blobs are cut away and replaced with smooth mitten-style hands (skin or glove colour sampled from the texture)
const HANDS = new WeakMap(); const _v = new THREE.Vector3(), _mm = new THREE.Matrix4();
export function sampleColor(tex, uvs) { try { const im = tex.image; const w = im.width, h = im.height, c = document.createElement('canvas'); c.width = w > 2048 ? 1024 : w; c.height = h > 2048 ? 1024 : h; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, c.width, c.height);
    const col = []; for (const [u, v] of uvs) { const px = x.getImageData(Math.min(c.width - 1, Math.max(0, Math.round(u * c.width))), Math.min(c.height - 1, Math.max(0, Math.round((tex.flipY ? 1 - v : v) * c.height))), 1, 1).data; col.push([px[0], px[1], px[2]]); }
    col.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2])); const m = col[Math.floor(col.length / 2)] || [150, 110, 90]; return new THREE.Color().setRGB(m[0] / 255, m[1] / 255, m[2] / 255, THREE.SRGBColorSpace); } catch (e) { return new THREE.Color('#9a7058'); } }
function processHands(skin) {
  const g0 = skin.geometry; if (HANDS.has(g0)) return HANDS.get(g0);
  const sk = skin.skeleton, si = g0.attributes.skinIndex, sw = g0.attributes.skinWeight, pos = g0.attributes.position, uv = g0.attributes.uv, n = pos.count;
  const out = { geo: g0, hands: {} }; const sides = ['Left', 'Right']; const W = {};
  const idxOf = {}; sides.forEach(sd => { idxOf[sd] = sk.bones.findIndex(b => b.name === sd + 'Hand'); W[sd] = new Float32Array(n); });
  for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) { const b = si.getComponent(i, k); sides.forEach(sd => { if (b === idxOf[sd]) W[sd][i] += sw.getComponent(i, k); }); }
  const ix = g0.index; if (!ix) { HANDS.set(g0, out); return out; }
  const keep = []; const TH = .5;
  for (let t = 0; t < ix.count; t += 3) { const a = ix.getX(t), b = ix.getX(t + 1), c = ix.getX(t + 2); let del = false; for (const sd of sides) if (W[sd][a] > TH && W[sd][b] > TH && W[sd][c] > TH) del = true; if (!del) keep.push(a, b, c); }
  const g = g0.clone(); g.setIndex(keep); out.geo = g;
  for (const sd of sides) { const bi = idxOf[sd]; if (bi < 0) continue; _mm.multiplyMatrices(sk.boneInverses[bi], skin.bindMatrix);
    const pts = [], uvs = []; for (let i = 0; i < n; i++) if (W[sd][i] > TH) { pts.push(_v.fromBufferAttribute(pos, i).applyMatrix4(_mm).clone()); if (uv) uvs.push([uv.getX(i), uv.getY(i)]); }
    if (pts.length < 10) continue; const c = new THREE.Vector3(); pts.forEach(p => c.add(p)); c.divideScalar(pts.length); const a = c.clone().normalize();
    let L = 0; pts.forEach(p => { L = Math.max(L, p.dot(a)); });
    let r0 = 0, rM = 0; pts.forEach(p => { const pr = p.dot(a), pp = p.clone().addScaledVector(a, -pr).length(); if (pr < .3 * L) r0 = Math.max(r0, pp); rM = Math.max(rM, pp); });
    // forearm cross-section just above the wrist (kept vertices): radius + centre, so the mitten's wrist matches the real arm
    const near = []; for (let i = 0; i < n; i++) if (W[sd][i] <= TH) { const p = _v.fromBufferAttribute(pos, i).applyMatrix4(_mm); const pr = p.dot(a); if (pr > -.45 * L && pr < .12 * L) { const pp = p.clone().addScaledVector(a, -pr); if (pp.length() < rM * 1.5) near.push(pp); } }
    let rf = r0 * .8, cf = new THREE.Vector3(); if (near.length > 8) { near.forEach(p => cf.add(p)); cf.divideScalar(near.length); const ds = near.map(p => p.distanceTo(cf)).sort((x, y) => x - y); rf = ds[Math.floor(ds.length * .8)]; } else cf.set(0, 0, 0);
    out.hands[sd] = { rf, cf, axis: a, L, r0, rM, color: sampleColor(skin.material.map, uvs), centroid: c }; }
  HANDS.set(g0, out); return out;
}
function buildMitten(info, thumbDir, mat) {
  const grp = new THREE.Group(); const { axis: a, L } = info; const palmW = Math.max(info.rM * .7, L * .27) * .8, palmT = palmW * .6, wr = Math.min(info.rf * .98, info.rM * .7);
  const up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion().setFromUnitVectors(up, a); const u = thumbDir.clone().addScaledVector(a, -thumbDir.dot(a)).normalize(); // thumb side
  // basis: local Y = bone axis, local X = thumb side, local Z = palm normal
  const X = u, Y = a.clone(), Z = new THREE.Vector3().crossVectors(X, Y).normalize(); const bm = new THREE.Matrix4().makeBasis(X, Y, Z); grp.quaternion.setFromRotationMatrix(bm);
  const mk = (geo, x, y, z, sx, sy, sz, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.z = rz; m.castShadow = true; grp.add(m); return m; };
  const S = new THREE.SphereGeometry(1, 16, 12), C = new THREE.CapsuleGeometry(1, 1, 6, 12);
  { const wm = mk(S, 0, L * .06, 0, wr, L * .24, wr * .9); const cfl = info.cf.clone().addScaledVector(a, -info.cf.dot(a)); wm.position.add(cfl.applyQuaternion(grp.quaternion.clone().invert())); } // rounded wrist that closes the cut inside the sleeve, centred on the real forearm
  mk(S, 0, L * .52, 0, palmW * .92, L * .38, palmT); // palm + fingers as one rounded mitten
  const th = mk(C, palmW * .88, L * .46, palmT * .15, palmT * .5, L * .12, palmT * .5, -0.5); // thumb
  return grp;
}

export const EXTRA = {}; // non-character models (Biscuit the rabbit)
// character lighting: characters sit in the scene's own lighting; only a faint lift/rim keeps silhouettes readable in the dark (?lift= / ?rim= for tuning)
const _qp = (k, d) => { try { const v = new URLSearchParams(location.search).get(k); return v == null ? d : +v; } catch (e) { return d; } };
const LIGHT = { lift: _qp('lift', 0.05), rim: _qp('rim', 0.1) };
export async function loadRigs(base, keys = ['keem', 'nia', 'dad', 'raider', 'zombie2', 'walt', 'ruth', 'dube', 'gus', 'reyes', 'tuck', 'vance', 'genm', 'genf', 'zombie_male', 'zombie_office', 'zombie_elder', 'zombie_big', 'zombie_cop', 'zombie_worker']) {
  const out = {}; const L = new GLTFLoader(); L.loadAsync(base + 'models/chars/biscuit.glb').then(g => { EXTRA.biscuit = g.scene; }).catch(() => { });
  await Promise.all(keys.map(k => L.loadAsync(base + 'models/chars/' + k + '.glb').then(g => { out[k] = g.scene; }).catch(() => { })));
  return out;
}

const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _q2 = new THREE.Quaternion();

export function attachRig(ch, scene, opt = {}) {
  const obj = SkeletonUtils.clone(scene); let skin = null; const B = {};
  obj.traverse(o => { if (o.isSkinnedMesh && !skin) skin = o; if (o.isBone) B[o.name] = o; });
  if (!skin) return null;
  skin.frustumCulled = false; skin.castShadow = true; skin.receiveShadow = false;
  const mat = skin.material; if (mat) { mat.side = THREE.FrontSide; mat.roughness = opt.rough || .62; mat.metalness = 0; if (mat.map) { mat.map.anisotropy = 8; mat.map.minFilter = THREE.LinearMipmapLinearFilter; mat.map.needsUpdate = true; } mat.needsUpdate = true; }
  if (opt.tint && mat) { skin.material = mat.clone(); const t = opt.tint; { const a = opt.tintK || .5, b = 1 - a / 2; skin.material.color.setRGB(b + t[0] * a * .98, b + t[1] * a * .98, b + t[2] * a * .98); if (opt.tintMul) skin.material.color.multiplyScalar(opt.tintMul); } } // per-body variety for crowds (shares geometry + texture)
  { // brighter, crisper character read: gentle self-lit lift (keeps the texture) + soft cool rim so figures separate from the dark street
    const m2 = skin.material; const lift = LIGHT.lift * (opt.tint ? .5 : 1); if (m2.map) { m2.emissiveMap = m2.map; m2.emissive = new THREE.Color('#ffffff'); m2.emissiveIntensity = lift; }
    m2.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n { float rimF = pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), 2.6); totalEmissiveRadiance += vec3(0.55, 0.68, 0.95) * rimF * ' + (LIGHT.rim * (opt.tint ? .7 : 1)).toFixed(3) + '; }'); };
    m2.customProgramCacheKey = () => 'avrim' + (opt.tint ? 'z' : 'h'); m2.needsUpdate = true; }
  ch.root.add(obj); ch.skin = skin; ch.skinRoot = obj;
  // swap the generated hands for clean mittens
  { const H = processHands(skin); skin.geometry = H.geo; const mats = {};
    ['Left', 'Right'].forEach(sd => { const hi = H.hands[sd]; const hb = B[sd + 'Hand']; if (!hi || !hb) return; const hc = opt.handColor ? new THREE.Color(opt.handColor) : hi.color.clone().multiplyScalar(.86); const mat = new THREE.MeshStandardMaterial({ color: hc, roughness: opt.handColor ? .8 : .62, metalness: 0, emissive: hc, emissiveIntensity: LIGHT.lift * (opt.tint ? .5 : 1) });
      const ib = skin.skeleton.bones.indexOf(hb); _m.copy(skin.skeleton.boneInverses[ib]).invert().decompose(_p, _q, _s); const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(_q.clone().invert()); // world +Z (front) in hand-local axes
      hb.add(buildMitten(hi, fwd, mat)); mats[sd] = mat; }); ch.handMats = mats; ch._H = H; }
  // the mannequin keeps animating but is no longer drawn
  ch.model.traverse(o => { if (o.isMesh || o.isSkinnedMesh || o.isPoints || o.isLine) o.visible = false; });
  ch.root.updateMatrixWorld(true);
  // rest orientations from the bind poses (inverse bind matrices) of both skeletons
  const restOf = (sk, bone) => { const i = sk.bones.indexOf(bone); _m.copy(sk.boneInverses[i]).invert(); _m.decompose(_p, _q, _s); return { q: _q.clone(), p: _p.clone() }; };
  let srcSkin = null; ch.model.traverse(o => { if (o.isSkinnedMesh && !srcSkin) srcSkin = o; });
  const pairs = [];
  for (const [sn, tn] of MAP) { const sb = ch.bone(sn), tb = B[tn]; if (!sb || !tb) continue; const sr = restOf(srcSkin.skeleton, sb), tr = restOf(skin.skeleton, tb); pairs.push({ sb, tb, sInv: sr.q.clone().invert(), tRest: tr.q.clone(), tn, sp: sr.p, tp: tr.p, par: null, tLocalRest: tb.quaternion.clone() }); }
  // the game skeleton rests in a T-pose, the avatar rests in an A-pose: pre-rotate each avatar bone's rest so its bone axis points
  // the way the matching game bone points at rest. After that, world-space deltas from the game animation map 1:1.
  const CHILD = { Hips: 'Spine02', Spine02: 'Spine01', Spine01: 'Spine', Spine: 'neck', neck: 'Head', LeftShoulder: 'LeftArm', LeftArm: 'LeftForeArm', LeftForeArm: 'LeftHand', LeftUpLeg: 'LeftLeg', LeftLeg: 'LeftFoot', LeftFoot: 'LeftToeBase',
    RightShoulder: 'RightArm', RightArm: 'RightForeArm', RightForeArm: 'RightHand', RightUpLeg: 'RightLeg', RightLeg: 'RightFoot', RightFoot: 'RightToeBase' };
  const byName = new Map(pairs.map(p => [p.tn, p])); const FIXPARENT = { Head: 'neck', LeftHand: 'LeftForeArm', RightHand: 'RightForeArm', LeftToeBase: 'LeftFoot', RightToeBase: 'RightFoot' };
  const fixOf = new Map();
  for (const p of pairs) { const c = byName.get(CHILD[p.tn]); if (!c) continue; const sd = c.sp.clone().sub(p.sp).normalize(), td = c.tp.clone().sub(p.tp).normalize(); fixOf.set(p.tn, new THREE.Quaternion().setFromUnitVectors(td, sd)); }
  { // head: align the avatar's head frame (up = head -> head_end, forward = head -> headfront) with the game's upright head, so the face doesn't tip down
    const hp = byName.get('Head'), he = B.head_end, hf = B.headfront; const rp = (b) => { const i = skin.skeleton.bones.indexOf(b); _m.copy(skin.skeleton.boneInverses[i]).invert().decompose(_p, _q, _s); return _p.clone(); };
    if (hp && he && hf) { const U = rp(he).sub(hp.tp).normalize(), F0 = rp(hf).sub(hp.tp); F0.addScaledVector(U, -F0.dot(U)).normalize(); const Z = F0, X = new THREE.Vector3().crossVectors(U, Z).normalize();
      const mt = new THREE.Matrix4().makeBasis(X, U, Z), us = new THREE.Vector3(0, 1, 0), zs = new THREE.Vector3(0, 0, 1), xs = new THREE.Vector3().crossVectors(us, zs), ms = new THREE.Matrix4().makeBasis(xs, us, zs);
      fixOf.set('Head', new THREE.Quaternion().setFromRotationMatrix(ms).multiply(new THREE.Quaternion().setFromRotationMatrix(mt).invert())); } }
  for (const p of pairs) { const f = fixOf.get(p.tn) || fixOf.get(FIXPARENT[p.tn]); if (f) p.tRest.premultiply(f); }
  // parent links among mapped target bones (nearest mapped ancestor), for local-from-world conversion
  const idx = new Map(pairs.map((p, i) => [p.tb, i])); pairs.forEach(p => { let a = p.tb.parent; while (a && !idx.has(a)) a = a.parent; p.par = a ? idx.get(a) : -1; });
  const hips = pairs[0]; const srcScale = ch.model.scale.x || 1;
  // fit: scale the avatar so its hips sit where the mannequin's hips sit; plant feet on the floor
  const hipsH = hips.sb.getWorldPosition(new THREE.Vector3()); ch.root.worldToLocal(hipsH);
  const tHipsH = hips.tp.y; // bind-pose hip height of the avatar in its own units (rig is in cm under a 0.01 armature, tp already world-scaled)
  const fit = (opt.fit || 1) * hipsH.y / Math.max(1e-4, tHipsH);
  obj.scale.setScalar(fit); obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj); obj.position.y -= box.min.y; obj.updateMatrixWorld(true);
  ch.skinFloor = obj.position.y;
  const rootQ = new THREE.Quaternion(), pw = new Array(pairs.length).fill(null).map(() => new THREE.Quaternion()), armQ = new THREE.Quaternion();
  const hipsRestLocal = hips.tb.position.clone(); const armature = hips.tb.parent;
  const sRestHips = hips.sb.getWorldPosition(new THREE.Vector3()); ch.root.worldToLocal(sRestHips);
  const sk = skin.skeleton, proto = THREE.Skeleton.prototype.update;
  const sync = () => {
    ch.root.matrixWorld.decompose(_p, rootQ, _s); const rootInv = rootQ.clone().invert();
    armature.matrixWorld.decompose(_p, armQ, _s); armQ.premultiply(rootInv); // armature orientation in the character-root frame
    for (let i = 0; i < pairs.length; i++) { const P = pairs[i];
      P.sb.matrixWorld.decompose(_p, _q, _s); _q.premultiply(rootInv); // source bone orientation in root frame
      _q2.copy(_q).multiply(P.sInv); // delta = now * inv(rest)  (all in the same frame)
      const want = pw[i].copy(_q2).multiply(P.tRest); // avatar bone orientation in root frame
      P.tb.quaternion.copy(P.par >= 0 ? pw[P.par] : armQ).invert().multiply(want);
    }
    // hips travel (bob / crouch / roll drop), expressed in the rig's own units
    hips.sb.getWorldPosition(_p); ch.root.worldToLocal(_p); const k = 1 / (fit * 0.01);
    hips.tb.position.set(hipsRestLocal.x + (_p.x - sRestHips.x) * k, hipsRestLocal.y + (_p.y - sRestHips.y) * k, hipsRestLocal.z + (_p.z - sRestHips.z) * k);
    // dismemberment hooks used by the game (head / arm bones scaled to ~0)
    const hs = ch.bone('DEF-head'); if (hs) B.Head.scale.setScalar(hs.scale.x < .05 ? .001 : 1);
    ['L', 'R'].forEach(s => { const a = ch.bone('DEF-upper_arm.' + s); if (a) B[(s === 'L' ? 'Left' : 'Right') + 'Arm'].scale.setScalar(a.scale.x < .05 ? .001 : 1); });
    obj.updateMatrixWorld(true);
  };
  sk.update = function () { sync(); proto.call(this); };
  // weapons / tools: hang them on the avatar's own hand (same grip offsets as the game bone, re-expressed in the avatar hand's frame)
  const bySrc = new Map(MAP.map(([sn, tn]) => [sn, tn]));
  ch.attachSkin = (boneName, mesh) => { const tn = bySrc.get(boneName.replace(/[.]/g, '') === boneName ? boneName : boneName); const P = pairs.find(p => p.tn === tn); if (!P || !/Hand/.test(tn)) return false;
    const wrap = new THREE.Group(); wrap.quaternion.copy(P.tRest).invert().multiply(_q2.copy(P.sInv).invert()); wrap.scale.setScalar((ch.model.scale.x || 1) / (fit * 0.01)); wrap.add(mesh); P.tb.add(wrap); return true; };
  ch.syncSkin = sync; ch._pairs = pairs;
  return obj;
}
