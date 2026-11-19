// Procedural animation on the shared 24-bone rig: every pose is a set of world-axis rotations applied to the *rest* orientation, so it works
// identically for all base meshes (no clips to author, no retargeting). Positive X = pitch backward in this rig, so forward swing = -x.
import * as THREE from 'three';
const _q = new THREE.Quaternion(), _p = new THREE.Quaternion(), _d = new THREE.Quaternion(), _e = new THREE.Euler();
export function prepare(av) {
  if (av._anim) return av._anim; const bones = av.skin.skeleton.bones; const depth = b => { let d = 0; for (let o = b; o.parent; o = o.parent) d++; return d; };
  const order = bones.map(b => ({ b, d: depth(b) })).sort((a, b) => a.d - b.d).map(o => o.b); const restW = {}; av.obj.updateMatrixWorld(true);
  bones.forEach(b => { restW[b.name] = b.getWorldQuaternion(new THREE.Quaternion()); });
  return av._anim = { order, restW, restLocal: Object.fromEntries(bones.map(b => [b.name, b.quaternion.clone()])), hips: av.bones.Hips.position.clone() };
}
export function pose(av, deltas, hipsOffset) { // deltas: { boneName: [rx, ry, rz] } world-axis radians
  const A = prepare(av);
  for (const b of A.order) { const d = deltas[b.name]; if (!b.parent) continue; if (!d) { b.quaternion.copy(A.restLocal[b.name]); } else { _e.set(d[0], d[1], d[2], 'XYZ'); _d.setFromEuler(_e); _d.multiply(A.restW[b.name]); b.parent.getWorldQuaternion(_p); b.quaternion.copy(_p.invert().multiply(_d)); } b.updateMatrixWorld(true); }
  if (hipsOffset) av.bones.Hips.position.set(A.hips.x + hipsOffset[0], A.hips.y + hipsOffset[1], A.hips.z + hipsOffset[2]); else av.bones.Hips.position.copy(A.hips);
}
const ARM_DOWN = .52;
export function animate(av, t, speed, mode = 'ground') { // speed 0 idle, ~1 walk, ~2 run
  const w = Math.min(1, speed), run = Math.max(0, Math.min(1, speed - 1)); const ph = t * (5.2 + 2.6 * run) * (speed > .05 ? 1 : 0) + (av.phase || 0); av.phase = ph; const s = Math.sin(ph), c = Math.cos(ph);
  const breathe = Math.sin(t * 1.9) * .012, sway = Math.sin(t * .9) * .015; const sw = (.62 + .35 * run) * w, k = (.78 + .5 * run) * w;
  const th = x => -x; const d = {};
  const arm = (side, swing) => [swing * -.55 * w * (1 + run * .6), 0, side * (-ARM_DOWN + breathe * 3) ];
  d.LeftArm = [-.5 * s * w * (1 + run * .5) * -1 * -1 + 0, 0, -ARM_DOWN + breathe * 2]; d.RightArm = [.5 * s * w * (1 + run * .5) * -1 * -1, 0, ARM_DOWN - breathe * 2];
  d.LeftArm[0] = -.45 * s * w * (1 + run * .6) * -1; d.RightArm[0] = -.45 * s * w * (1 + run * .6) * 1; d.LeftArm[0] = .45 * s * w * (1 + run * .6) ; d.RightArm[0] = -.45 * s * w * (1 + run * .6);
  d.LeftForeArm = [-(.18 + .5 * run) * w - .06, 0, -ARM_DOWN * .9]; d.RightForeArm = [-(.18 + .5 * run) * w - .06, 0, ARM_DOWN * .9];
  d.LeftUpLeg = [th(sw * s), 0, -.04]; d.RightUpLeg = [th(-sw * s), 0, .04];
  d.LeftLeg = [Math.max(0, -c) * k * (s > -2 ? 1 : 1) * .0 + Math.max(0, Math.sin(ph + 1.2)) * k, 0, 0]; d.RightLeg = [Math.max(0, Math.sin(ph + 1.2 + Math.PI)) * k, 0, 0];
  d.LeftFoot = [-Math.max(0, Math.sin(ph + 1.2)) * k * .4, 0, 0]; d.RightFoot = [-Math.max(0, Math.sin(ph + 1.2 + Math.PI)) * k * .4, 0, 0];
  d.Spine = [-.04 * w - .01 * run, .1 * s * w, 0]; d.Spine01 = [breathe * 2, -.06 * s * w, sway * .3]; d.Spine02 = [breathe * 2.5 - .02 * run, -.05 * s * w, 0]; d.Head = [.02 * w - breathe, -.04 * s * w, 0];
  if (mode === 'sit') { d.LeftUpLeg = [-1.45, 0, -.06]; d.RightUpLeg = [-1.45, 0, .06]; d.LeftLeg = [1.5, 0, 0]; d.RightLeg = [1.5, 0, 0]; d.LeftArm = [-.9, 0, -.3]; d.RightArm = [-.9, 0, .3]; d.LeftForeArm = [-.9, 0, 0]; d.RightForeArm = [-.9, 0, 0]; }
  pose(av, d, [0, -Math.abs(c) * .02 * w * (1 + run) + (mode === 'sit' ? -.34 : 0) + breathe * .3, mode === 'sit' ? -.1 : 0]);
}
