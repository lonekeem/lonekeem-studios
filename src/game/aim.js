// v1.9.28 aim: shots, the gun and Keem's upper body all agree with the crosshair.
//  * hitChar(): bullets are tested against capsules fitted to each character's VISIBLE skinned mesh (per bone, measured once per rig from the
//    bind pose), so a lunging / hunched / big-bellied zombie is hit wherever the crosshair sits on it (the old test was one thin vertical
//    capsule through the zombie's feet, which missed most of a close or wide body).
//  * updateAimPose(): while aiming / firing, the upper body takes a two-arm aim pose and the spine twists + pitches so the arms point at the
//    exact spot the crosshair ray hits; the legs keep their own locomotion (walk / strafe / backpedal) underneath.
//  * the held gun is turned so its barrel points at that spot, and the muzzle flash + tracer start at the real barrel tip every frame.
import * as THREE from 'three';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _pr = new THREE.Vector3(), _ps = new THREE.Vector3(), _v = new THREE.Vector3(), _w = new THREE.Vector3();
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _m = new THREE.Matrix4(), _up = new THREE.Vector3(0, 1, 0);
const CAPS = new Map(); // rig key -> capsule list (bone-local endpoints + radius)

function skinOf(c) { if (c.skin && c.skin.isSkinnedMesh) return c.skin; let s = null; c.model && c.model.traverse(o => { if (!s && o.isSkinnedMesh && o.visible !== false && o.skeleton) s = o; }); return s; }

// fit one capsule per weighted bone: segment from the bone joint to its child joint (or along its vertex cloud for end bones),
// radius = 92nd percentile of the vertex distances to that segment (bone-local bind space, so it follows any pose / scale later)
function buildCaps(skin) {
  const geo = skin.geometry, pos = geo.attributes.position, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight; if (!pos || !si || !sw) return [];
  const bones = skin.skeleton.bones, inv = skin.skeleton.boneInverses, n = bones.length; const pts = Array.from({ length: n }, () => []);
  const step = Math.max(1, Math.floor(pos.count / 6000));
  for (let i = 0; i < pos.count; i += step) { let bi = -1, bw = 0; for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; bi = si.getComponent(i, k); } } if (bi < 0 || bw < .45) continue;
    _v.fromBufferAttribute(pos, i).applyMatrix4(skin.bindMatrix).applyMatrix4(inv[bi]); pts[bi].push(_v.clone()); }
  const idx = new Map(bones.map((b, i) => [b, i])); const out = [];
  for (let i = 0; i < n; i++) { const P = pts[i]; if (P.length < 6) continue;
    // child joint with its own vertices (the next segment of the limb / spine), expressed in this bone's bind frame
    let B = null; let best = 0; for (const ch of bones[i].children) { const j = idx.get(ch); if (j == null) continue; const cnt = pts[j].length; if (cnt < 6 && !(ch.children && ch.children.length)) continue;
      const p = new THREE.Vector3().applyMatrix4(_m.copy(inv[j]).invert()).applyMatrix4(inv[i]); const L = p.length(); if (L > best) { best = L; B = p; } }
    const A = new THREE.Vector3(); if (!B || best < 1e-4) { const c = new THREE.Vector3(); P.forEach(p => c.add(p)); c.multiplyScalar(1 / P.length); B = c.multiplyScalar(1.5); }
    const seg = new THREE.Line3(A, B), cp = new THREE.Vector3(); const ds = P.map(p => { seg.closestPointToPoint(p, true, cp); return cp.distanceTo(p); }).sort((x, y) => x - y);
    const r = ds[Math.min(ds.length - 1, Math.floor(ds.length * .92))];
    out.push({ bi: i, A, B, r, head: /head/i.test(bones[i].name) && !/end|top|front/i.test(bones[i].name) }); }
  return out;
}
export function capsOf(c) { const skin = skinOf(c); if (!skin) return null; const key = c.skin && c.look && c.look.rig ? 'rig:' + c.look.rig : skin.geometry.uuid;
  let caps = CAPS.get(key); if (!caps) { try { caps = buildCaps(skin); } catch (e) { caps = []; } CAPS.set(key, caps); } return caps.length ? { skin, caps } : null; }

// nearest hit of a ray on a character's visible body: { t, head } or null (t measured from ray.origin)
export function hitChar(ray, c, maxT = 1e9) {
  const C = capsOf(c); if (!C) return null; const bones = C.skin.skeleton.bones; let best = null;
  // cheap reject: ray more than ~2 m from the character's vertical axis
  const rp = c.root.position; _a.set(rp.x, rp.y, rp.z); _b.set(rp.x, rp.y + 2.6 * (c.scale || 1) * (c.root.scale.y || 1), rp.z); if (ray.distanceSqToSegment(_a, _b) > 4.4) return null;
  for (const k of C.caps) { const bn = bones[k.bi]; if (!bn) continue; const mw = bn.matrixWorld; const s = mw.getMaxScaleOnAxis(); if (s < 1e-3) continue; // severed limb / head (scaled to ~0)
    _a.copy(k.A).applyMatrix4(mw); _b.copy(k.B).applyMatrix4(mw); const r = k.r * s + .02; if (r < .01) continue;
    const d2 = ray.distanceSqToSegment(_a, _b, _pr, _ps); if (d2 > r * r) continue; const t = _pr.distanceTo(ray.origin) - Math.sqrt(Math.max(0, r * r - d2));
    if (t > 0 && t < maxT && (!best || t < best.t)) best = { t, head: k.head }; }
  return best;
}

// the clip pose the arms take while aiming (both hands up on the weapon), captured once from the clip's first frame
const POSE_BONES = ['DEF-spine.002', 'DEF-spine.003', 'DEF-neck', 'DEF-shoulder.L', 'DEF-upper_arm.L', 'DEF-forearm.L', 'DEF-hand.L', 'DEF-shoulder.R', 'DEF-upper_arm.R', 'DEF-forearm.R', 'DEF-hand.R'];
function aimPoseOf(P) { if (P._aimPose !== undefined) return P._aimPose; const clip = P.lib && P.lib.clips && P.lib.clips.Pistol_Aim_Neutral; const out = [];
  if (clip) for (const n of POSE_BONES) { const b = P.bone(n); if (!b) continue; const tr = clip.tracks.find(t => t.name === b.name + '.quaternion'); if (!tr) continue; out.push({ b, q: new THREE.Quaternion(tr.values[0], tr.values[1], tr.values[2], tr.values[3]) }); }
  return (P._aimPose = out.length ? out : null); }

// rotate a bone about a WORLD axis (keeps everything below it attached)
function rotWorld(b, axis, ang) { if (!b || Math.abs(ang) < 1e-5) return; b.parent.getWorldQuaternion(_q2); _v.copy(axis).applyQuaternion(_q3.copy(_q2).invert()).normalize(); _q.setFromAxisAngle(_v, ang); b.quaternion.premultiply(_q); b.updateMatrixWorld(true); }
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// where the crosshair ray (no spread) lands: first wall or character body, else 60 m out
export function aimTarget(g, out) { const ray = g.aimRay(1, true); const nr = ray.near || 0; let bd = 60 + nr;
  const rc = g._aimRc || (g._aimRc = new THREE.Raycaster()); rc.set(ray.at(nr, _w), ray.direction); rc.near = 0; rc.far = 60; const wh = rc.intersectObjects(g.world.walls, false)[0]; if (wh) bd = wh.distance + nr;
  for (const z of g.zombies) { if (z.dead) continue; const h = hitChar(ray, z, bd); if (h) bd = h.t; }
  return ray.at(Math.max(bd, nr + 1.2), out); }

const DEF_HAND_Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
// call right after the player's mixer update
export function updateAimPose(g, dt) {
  const P = g.player, s = g.state, I = g.input, w = g.save && g.save.cur; const gun = !!(g.ws && g.weaponMeshes[w] && g.weaponMeshes[w].getObjectByName('muzzle'));
  const want = gun && !g.cam.fp && !g.cut && !g.dying && !(g.truck && g.truck.driving) && !(s.roll > 0) && !(s.reload > 0) && !(s.stun > 0) && (s.aim || s.shotT > 0 || (I.atk && !g.dlgCur));
  // snap in on the first shot so the very first round already leaves a barrel that points at the crosshair; ease out
  s.aimW = want ? (s.shotT > 0 ? 1 : Math.min(1, (s.aimW || 0) + dt * 14)) : Math.max(0, (s.aimW || 0) - dt * 6);
  const W = s.aimW; const hand = g.hand;
  if (W <= 0.001) { if (hand && !hand.quaternion.equals(DEF_HAND_Q)) hand.quaternion.copy(DEF_HAND_Q); g._aimP = null; return; }
  const tgt = aimTarget(g, g._aimPt || (g._aimPt = new THREE.Vector3())); g._aimP = tgt;
  // 1) arms into the aim pose (blend over whatever the legs' animation left on them)
  const pose = aimPoseOf(P); if (pose) for (const { b, q } of pose) b.quaternion.slerp(q, W);
  P.root.updateMatrixWorld(true);
  // 2) twist / pitch the spine so the shoulder -> hand line points at the target (two passes: the arm line is not on the spine axis)
  const sh = P.bone('DEF-upper_arm.R'), hd = P.bone('DEF-hand.R'), sp = [P.bone('DEF-spine.001'), P.bone('DEF-spine.002'), P.bone('DEF-spine.003')].filter(Boolean);
  if (sh && hd && sp.length) for (let it = 0; it < 2; it++) {
    sh.getWorldPosition(_a); hd.getWorldPosition(_b); const cur = _b.sub(_a); const goal = _w.copy(tgt).sub(_a);
    const dy = wrapA(Math.atan2(goal.x, goal.z) - Math.atan2(cur.x, cur.z)); const yaw = Math.max(-1.75, Math.min(1.75, dy)) * W;
    sp.forEach((b, i) => rotWorld(b, _up, yaw * [.3, .3, .4][i]));
    sh.getWorldPosition(_a); hd.getWorldPosition(_b); const c2 = _b.sub(_a), gl = _w.copy(tgt).sub(_a); const ax = new THREE.Vector3(gl.z, 0, -gl.x).normalize(); // horizontal axis across the aim line
    const pc = Math.atan2(c2.y, Math.hypot(c2.x, c2.z)), pg = Math.atan2(gl.y, Math.hypot(gl.x, gl.z)); const pit = Math.max(-1.2, Math.min(1.2, pc - pg)) * W;
    sp.slice(-2).forEach((b, i) => rotWorld(b, ax, pit * [.45, .55][i]));
  }
  P.root.updateMatrixWorld(true); if (P.syncSkin) P.syncSkin();
  // 3) the gun itself: barrel (+Z of the weapon frame) at the target, upright
  if (hand && hand.parent) { hand.parent.updateWorldMatrix(true, false); hand.getWorldPosition(_a);
    _m.lookAt(tgt, _a, _up); _q.setFromRotationMatrix(_m); hand.parent.getWorldQuaternion(_q2); _q2.invert().multiply(_q); // parent-local
    hand.quaternion.copy(DEF_HAND_Q).slerp(_q2, W); hand.updateMatrixWorld(true); }
}

// muzzle world position of the held weapon (third person) or the view model (first person)
export function muzzleWorld(g, out) { const id = g.save.cur; const m = (g.cam.fp ? g.vmMesh : g.weaponMeshes[id]); const mz = m && m.getObjectByName('muzzle'); if (mz) { mz.updateWorldMatrix(true, false); return mz.getWorldPosition(out); } return g.player.worldOf('DEF-hand.R', out); }
// glue the flash / light / tracer start to the barrel tip (call after updateAimPose, every frame while they're visible)
export function placeShotFx(g) { if (!(g.mT > 0) && !(g.trT > 0)) return; const mz = muzzleWorld(g, _a);
  if (g.mT > 0) { g.muzzle.position.copy(mz); g.mLight.position.copy(mz); }
  if (g.trT > 0 && g._trEnd) { const tp = g.tracer.geometry.attributes.position; tp.setXYZ(0, mz.x, mz.y, mz.z); tp.setXYZ(1, g._trEnd.x, g._trEnd.y, g._trEnd.z); tp.needsUpdate = true; g.tracer.geometry.computeBoundingSphere(); } }
