// Head + body morphing of the shared body mesh (all values -1..1, 0 = the model as generated).
import * as THREE from 'three';
export const MORPHS = {
  // [key, label, group, default]
  head: [['headSize', 'Head size'], ['faceW', 'Face width'], ['faceLen', 'Face length'], ['forehead', 'Forehead'], ['browRidge', 'Brow ridge'], ['cheekbone', 'Cheekbones'], ['cheekFull', 'Cheek fullness'], ['jaw', 'Jaw width'], ['chin', 'Chin length'], ['chinW', 'Chin pointiness']],
  eyes: [['eyeDepth', 'Eye socket depth']],
  nose: [['noseW', 'Nose width'], ['noseLen', 'Nose length'], ['noseBridge', 'Nose bridge'], ['noseTip', 'Nose tip']],
  mouth: [['lipFull', 'Lip fullness']],
  ears: [['earSize', 'Ear size'], ['earOut', 'Ear stick-out'], ['earPoint', 'Ear point']],
  body: [['muscle', 'Muscle'], ['weight', 'Belly / weight'], ['chest', 'Chest'], ['shoulders', 'Shoulder width'], ['hips', 'Hips'], ['legs', 'Leg thickness'], ['neck', 'Neck thickness']],
};
const g = (dx, dy, dz, r) => Math.exp(-(dx * dx + dy * dy + dz * dz) / (2 * r * r));
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function applyMorph(av, M) {
  const T = av.tpl, L = T.lm, hw = L.hw, rest = av.rest, pos = av.pos, n = pos.count, headW = T.headW, aR = T.aR, P = T.P;
  const v = k => (M && M[k]) || 0; const zc = P.Head.z, neck = P.neck;
  const eyeY = 1.83, noseY = 1.07, mouthY = .815, front = L.front;
  const mus = v('muscle'), wgt = v('weight'), chest = v('chest'), sho = v('shoulders'), hips = v('hips'), legs = v('legs'), nk = v('neck');
  const axis = { L: [P.LeftArm, P.LeftHand], R: [P.RightArm, P.RightHand] };
  const leg = { L: [P.LeftUpLeg, P.LeftFoot], R: [P.RightUpLeg, P.RightFoot] };
  const hs = 1 + .14 * v('headSize'); const a = new THREE.Vector3(), b = new THREE.Vector3(), p = new THREE.Vector3(), d = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    let x = rest[i * 3], y = rest[i * 3 + 1], z = rest[i * 3 + 2]; const reg = aR[i * 4], s = aR[i * 4 + 1], t = aR[i * 4 + 2], side = aR[i * 4 + 3]; const w = headW[i];
    if (w > 0.01) {
      const fx = (x - L.cx) / hw, fy = (y - L.chinY) / hw, fz = (z - zc), ax = Math.abs(fx), sx = fx >= 0 ? 1 : -1, fr = sstep(-.02, .06, fz);
      let dx = 0, dy = 0, dz = 0;
      dx += x * v('faceW') * .12; dy += (y - L.chinY - 1.9 * hw) * v('faceLen') * .12;
      dx += x * v('jaw') * .24 * sstep(1.8, .5, fy);
      { const gg = g(fx, fy - .55, 0, .5); dy -= v('chin') * .5 * hw * gg * fr; dz += v('chin') * .15 * hw * gg * fr; dx -= x * v('chinW') * .45 * g(fx, fy - .6, 0, .6); }
      { const gg = g(ax - .85, fy - 1.45, 0, .5) * fr; dz += v('cheekbone') * .3 * hw * gg; dx += sx * v('cheekbone') * .12 * hw * gg; }
      { const gg = g(ax - .75, fy - 1.0, 0, .5) * fr; dx += sx * v('cheekFull') * .22 * hw * gg; dz += v('cheekFull') * .12 * hw * gg; }
      dz += v('forehead') * .16 * hw * sstep(2.1, 3.0, fy) * fr; dz += v('browRidge') * .16 * hw * g(fx, fy - 2.25, 0, .55) * fr;
      dz -= v('eyeDepth') * .14 * hw * g(ax - .4, fy - eyeY, 0, .38) * fr;
      { const gn = g(fx, fy - (noseY + .1), 0, .32) * fr; dx += x * v('noseW') * .7 * gn; const gt = g(fx, fy - (noseY + .02), 0, .28) * fr; dz += v('noseLen') * .4 * hw * gt; dy += v('noseTip') * .25 * hw * gt; dz += v('noseBridge') * .28 * hw * g(fx, fy - 1.55, 0, .4) * fr; }
      dz += v('lipFull') * .24 * hw * g(fx, fy - mouthY, 0, .32) * fr;
      { const ear = (ax > .85 && fy > 1.0 && fy < 2.6) ? 1 : 0; if (ear) { const ex = sx * 1.02 * hw, ey = L.chinY + 1.7 * hw; const es = v('earSize') * .55; dx += (x - ex) * es; dy += (y - ey) * es; dz += (z - zc) * es * .5; dx += sx * v('earOut') * .2 * hw; dy += Math.max(0, fy - 1.9) * v('earPoint') * .3 * hw; } }
      x += dx * w; y += dy * w; z += dz * w;
      if (hs !== 1) { const k = 1 + (hs - 1) * w; x = x * k; y = neck.y + (y - neck.y) * k; z = zc + (z - zc) * k; }
    }
    if (reg === 2 || reg === 5) { // torso + hips + upper legs (shared silhouette)
      const cz = P.Spine01.z; let k = 1 + .16 * mus;
      let rx = 1 + .16 * mus + sstep(.0, .35, t) * 0 + g(0, t - .12, 0, .22) * hips * .22 - (reg === 2 ? 0 : 0);
      rx += g(0, t - .75, 0, .22) * chest * .12; let rz = 1 + .16 * mus + g(0, t - .75, 0, .2) * chest * .22;
      rx += g(0, t - .28, 0, .22) * wgt * .26; const bz = g(0, t - .26, 0, .17) * wgt * .1 * sstep(cz - .02, cz + .04, z); rz += g(0, t - .28, 0, .25) * wgt * .2;
      if (reg === 2) { x = x * rx; z = cz + (z - cz) * rz + bz; x += side * g(0, t - .85, 0, .2) * sho * .035; }
    }
    if (reg === 2 && t > .8) { const nw = sstep(.82, 1.0, t); x *= 1 + nw * nk * .3; z = P.neck.z + (z - P.neck.z) * (1 + nw * nk * .3); }
    if (reg === 1) { x *= 1 + nk * .3; z = P.neck.z + (z - P.neck.z) * (1 + nk * .3); }
    if (reg === 3 || reg === 4) { const A = side > 0 ? axis.L : axis.R; a.copy(A[0]); b.copy(A[1]); d.copy(b).sub(a); const len = d.length(); d.divideScalar(len); p.set(x, y, z).sub(a); const pr = p.dot(d); const perp = p.clone().addScaledVector(d, -pr);
      const kk = (1 + .32 * mus) * (reg === 4 ? 1 : 1) ; const fall = reg === 4 ? 1 : 1; const sc = 1 + (kk - 1) * (1 - sstep(.85, 1.0, s)) * (reg === 4 ? 0 : 1) + (reg === 3 ? 0 : 0);
      perp.multiplyScalar(sc); const sh = side * sho * .03 * (1 - sstep(0, .5, s)); x = a.x + d.x * pr + perp.x + sh; y = a.y + d.y * pr + perp.y; z = a.z + d.z * pr + perp.z; }
    if (reg === 5 || reg === 6) { const A = side > 0 ? leg.L : leg.R; a.copy(A[0]); b.copy(A[1]); d.copy(b).sub(a); const len = d.length(); d.divideScalar(len); p.set(x, y, z).sub(a); const pr = p.dot(d); const perp = p.clone().addScaledVector(d, -pr);
      const sc = reg === 6 ? 1 : 1 + (.2 * mus + .3 * legs + hips * .1 * g(0, s, 0, .2)) * (1 - sstep(.7, .95, s)); perp.multiplyScalar(sc); x = a.x + d.x * pr + perp.x; y = a.y + d.y * pr + perp.y; z = a.z + d.z * pr + perp.z; }
    pos.setXYZ(i, x, y, z);
  }
  pos.needsUpdate = true; weldNormals(av.skin.geometry); eggNormals(av);
}
// face lumps from the generated mesh read as dirty patches under the key light: blend the cheek / brow / forehead normals toward a clean egg-shaped surface
function eggNormals(av) {
  const T = av.tpl, L = T.lm, pos = av.pos, nr = av.nrm, zw = T.zoneW; if (!zw) return; const cy = (L.chinY + L.top) / 2 + .01, ry = (L.top - L.chinY) / 2, rx = L.hw * 1.02, cz = (L.front + L.back) / 2 - .005, rz = (L.front - L.back) / 2; const v = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { const w = zw[i]; if (!w) continue; const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); v.set(x / (rx * rx), (y - cy) / (ry * ry), (z - cz) / (rz * rz)).normalize(); n.set(nr.getX(i), nr.getY(i), nr.getZ(i)).multiplyScalar(1 - w).addScaledVector(v, w).normalize(); nr.setXYZ(i, n.x, n.y, n.z); }
  nr.needsUpdate = true;
}
export function weldNormals(geo) {
  geo.computeVertexNormals(); const nr = geo.attributes.normal, grp = geo.userData.group, ng = geo.userData.ng, n = nr.count; if (!grp) { nr.needsUpdate = true; return; }
  const acc = new Float32Array(ng * 3); for (let i = 0; i < n; i++) { const q = grp[i]; acc[q * 3] += nr.getX(i); acc[q * 3 + 1] += nr.getY(i); acc[q * 3 + 2] += nr.getZ(i); }
  for (let i = 0; i < n; i++) { const q = grp[i]; const x = acc[q * 3], y = acc[q * 3 + 1], z = acc[q * 3 + 2], l = Math.hypot(x, y, z) || 1; nr.setXYZ(i, x / l, y / l, z / l); } nr.needsUpdate = true;
}
