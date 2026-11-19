// Procedural accessory families (hats, glasses, jewellery, bags, hair extras). Everything is built in bind-pose metres from the
// avatar's measured head/body landmarks, merged per material key and rigidly skinned to one bone. Original geometry, no logos.
import * as THREE from 'three';
import { Builder } from './build.js';
const PI = Math.PI;

function measure(av) { // head landmarks of the *current* (morphed) mesh
  const T = av.tpl, P = T.P, pos = av.pos, n = pos.count, hwt = T.headW; let minY = 9, maxY = -9, front = -9, back = 9; const ax = [];
  for (let i = 0; i < n; i++) if (T.used[i] && hwt[i] > .5 && pos.getY(i) > P.neck.y + .03) { const y = pos.getY(i), z = pos.getZ(i); maxY = Math.max(maxY, y); back = Math.min(back, z); if (z > P.Head.z + .02) minY = Math.min(minY, y); front = Math.max(front, z); ax.push(Math.abs(pos.getX(i))); }
  ax.sort((a, b) => a - b); const hw = ax[Math.floor(ax.length * .86)]; const earC = [new THREE.Vector3(), new THREE.Vector3()], earN = [0, 0], low = [null, null];
  for (let i = 0; i < n; i++) if (T.used[i] && hwt[i] > .5) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), fy = (y - minY) / hw; if (Math.abs(x) > hw * .98 && fy > 1.0 && fy < 2.6) { const k = x > 0 ? 0 : 1; earC[k].add(new THREE.Vector3(x, y, z)); earN[k]++; if (!low[k] || y < low[k].y) low[k] = new THREE.Vector3(x, y, z); } }
  const ears = earC.map((c, k) => earN[k] ? c.divideScalar(earN[k]) : new THREE.Vector3((k ? -1 : 1) * hw * 1.05, minY + hw * 1.7, P.Head.z));
  return { cx: 0, chinY: minY, hw, front, back, zc: (front + back) / 2, top: maxY, ears, lobes: low.map((l, k) => l || ears[k]) };
}
export function makeCtx(av) {
  const T = av.tpl, L = measure(av), P = T.P, hs = 1; const pos = av.pos.array, n = av.pos.count, headW = T.headW, aR = T.aR;
  const hw = L.hw * hs, eyeY = L.chinY + 1.83 * L.hw, mouthY = L.chinY + .815 * L.hw, noseY = L.chinY + 1.07 * L.hw, zc = L.zc;
  const grid = new Map(); const key = (x, y) => Math.round(x / .006) + ',' + Math.round(y / .006);
  const tgrid = new Map();
  for (let i = 0; i < n; i++) { const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2]; if (headW[i] > .5) { const k = key(Math.abs(x), y); if (!(grid.get(k) > z)) grid.set(k, z); } else if (aR[i * 4] === 2) { const k = Math.round(y / .01); const e = tgrid.get(k) || [-9, 9]; if (z > e[0] && Math.abs(x) < .12) e[0] = z; if (z < e[1] && Math.abs(x) < .12) e[1] = z; tgrid.set(k, e); } }
  const faceZ = (x, y) => { let best = -9; for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const v = grid.get(key(Math.abs(x) + dx * .006, y + dy * .006)); if (v !== undefined && v > best) best = v; } return best > -9 ? best : L.front * .7; };
  const torsoZ = (y, back) => { const e = tgrid.get(Math.round(y / .01)); return e ? (back ? e[1] : e[0]) : (back ? -.1 : .1); };
  const c = { L, P, hw, hs, eyeY, mouthY, noseY, zc, top: L.top, chinY: L.chinY, front: L.front, back: L.back, faceZ, torsoZ, ears: L.ears, lobes: L.lobes, earY: L.chinY + 1.7 * L.hw,
    skY: eyeY, crownY: eyeY + .035 * hs, ry: (L.top - eyeY) * 1.0, rx: hw * 1.04, rz: (L.front - L.back) / 2 * 1.02 };
  return c;
}
const hemi = (B, mat, cx, cy, cz, rx, ry, rz, frac = 1, rot) => B.add(new THREE.SphereGeometry(1, 22, 12, 0, PI * 2, 0, PI / 2 * frac), mat, [cx, cy, cz], rot, [rx, ry, rz]);
const ring = (B, mat, cx, cy, cz, rx, rz, r, arc = PI * 2, a0 = 0) => { const pts = []; for (let i = 0; i <= 24; i++) { const a = a0 + arc * i / 24; pts.push([cx + Math.sin(a) * rx, cy, cz + Math.cos(a) * rz]); } B.tube(pts, r, mat, false, 30, 5); };

// ---------- hats ----------
export const HAT = {
  cap(B, c, o) { const r = 1.02; hemi(B, 'a', 0, c.crownY - .01, c.zc, c.rx * r, c.ry * 1.02, c.rz * r); B.add(new THREE.CylinderGeometry(c.rx * 1.02, c.rx * 1.02, .01, 22, 1, false), 'a', [0, c.crownY - .005, c.zc], [0, 0, 0], [1, 1, c.rz / c.rx]);
    const L = o.brim ?? .09; const g = new THREE.CylinderGeometry(c.rx * 1.05 + L, c.rx * 1.05 + L, .006, 22, 1, false, -.9, 1.8); B.add(g, 'a', [0, c.crownY - .008, c.zc + c.rz * .15], [0, 0, 0], [1, 1, 1.0]); B.cyl(.009, .009, .004, [0, c.crownY + c.ry * 1.0, c.zc], 'b'); },
  beanie(B, c, o) { hemi(B, 'a', 0, c.crownY - .02, c.zc - .005, c.rx * 1.05, c.ry * (o.tall ?? 1.1), c.rz * 1.05); ring(B, 'b', 0, c.crownY - .005, c.zc, c.rx * 1.04, c.rz * 1.04, .018); if (o.pom) B.sphere(.04, [0, c.crownY + c.ry * (o.tall ?? 1.1) + .02, c.zc], null, 'b'); },
  bucket(B, c, o) { hemi(B, 'a', 0, c.crownY - .02, c.zc, c.rx * 1.05, (c.ry + .02) * 1.04, c.rz * 1.05); B.add(new THREE.CylinderGeometry(c.rx * 1.25, c.rx * 1.75, .03, 28, 1, false), 'a', [0, c.crownY - .028, c.zc], [0, 0, 0], [1, 1, c.rz / c.rx]); },
  brimmed(B, c, o) { const w = o.wide ?? 1.9; hemi(B, 'a', 0, c.crownY + .0, c.zc, c.rx * 1.05, c.ry * Math.max(1.05, (o.crown ?? .8) * 1.35), c.rz * 1.05); B.add(new THREE.CylinderGeometry(c.rx * w, c.rx * w, .006, 28), 'a', [0, c.crownY + .002, c.zc], [0, 0, 0], [1, 1, c.rz / c.rx]); ring(B, 'b', 0, c.crownY + .018, c.zc, c.rx * 1.06, c.rz * 1.06, .012); },
  beret(B, c) { hemi(B, 'a', .015, c.crownY + .002, c.zc - .005, c.rx * 1.18, c.ry * 1.02, c.rz * 1.18); B.cyl(.005, .005, .012, [.015, c.crownY + c.ry * 1.02, c.zc], 'a'); },
  headband(B, c, o) { ring(B, 'a', 0, c.eyeY + .09, c.zc, c.rx * 1.03, c.rz * 1.03, o.thick ?? .016); },
  bandana(B, c) { hemi(B, 'a', 0, c.crownY - .02, c.zc, c.rx * 1.04, c.ry * 1.0, c.rz * 1.04, .86); B.add(new THREE.ConeGeometry(.035, .13, 6), 'a', [.05, c.crownY - .08, c.back - .01], [-2.6, 0, 0]); B.add(new THREE.ConeGeometry(.035, .12, 6), 'a', [-.04, c.crownY - .08, c.back - .01], [-2.9, 0, 0]); },
  hardhat(B, c) { hemi(B, 'a', 0, c.crownY - .005, c.zc, c.rx * 1.08, c.ry * 1.1, c.rz * 1.08); B.add(new THREE.CylinderGeometry(c.rx * 1.3, c.rx * 1.3, .012, 22, 1, false, -1.2, 2.4), 'a', [0, c.crownY - .004, c.zc + c.rz * .2]); B.box(.03, .02, c.rz * 1.9, [0, c.crownY + c.ry * 1.1, c.zc], 'a'); },
  visor(B, c) { ring(B, 'a', 0, c.crownY - .01, c.zc, c.rx * 1.1, c.rz * 1.1, .01, PI * 1.6, -PI * .8 + PI); B.add(new THREE.CylinderGeometry(c.rx * 1.35, c.rx * 1.35, .005, 22, 1, false, -.9, 1.8), 'a', [0, c.crownY - .01, c.zc + c.rz * .15]); },
  crown(B, c, o) { ring(B, 'm', 0, c.crownY + .02, c.zc, c.rx * 1.0, c.rz * 1.0, .012); for (let i = 0; i < 7; i++) { const a = i / 7 * PI * 2; B.cone(.014, .06, [Math.sin(a) * c.rx, c.crownY + .06, c.zc + Math.cos(a) * c.rz], 'm'); B.sphere(.008, [Math.sin(a) * c.rx, c.crownY + .095, c.zc + Math.cos(a) * c.rz], null, 'g'); } },
  ears(B, c, o) { hemi(B, 'a', 0, c.crownY - .02, c.zc, c.rx * 1.04, c.ry * 1.0, c.rz * 1.04, .9); for (const s of [-1, 1]) B.cone(.04, .1, [s * c.rx * .6, c.crownY + c.ry * .95, c.zc + .01], 'a', [0, 0, -s * .15]); },
  hood(B, c) { hemi(B, 'a', 0, c.crownY - .04, c.zc - .03, c.rx * 1.2, c.ry * 1.25, c.rz * 1.25, 1.0); B.sphere(c.rx * .75, [0, c.eyeY - .1, c.zc - c.rz * .7], [1, 1.3, .8], 'a'); },
  helmet(B, c) { hemi(B, 'a', 0, c.crownY - .04, c.zc, c.rx * 1.12, c.ry * 1.18, c.rz * 1.1, 1.18); B.add(new THREE.CylinderGeometry(c.rz * 1.16, c.rz * 1.16, .05, 24, 1, true, -1.05, 2.1), 'k', [0, c.eyeY + .025, c.zc], [0, 0, 0], [c.rx / c.rz, 1, 1]); },
};
// ---------- glasses ----------
const lens = (B, c, shape, x, y, z, w, h, mat) => { const g = shape === 'round' ? new THREE.CylinderGeometry(1, 1, .004, 20) : shape === 'square' ? new THREE.BoxGeometry(2, .004, 2) : shape === 'hex' ? new THREE.CylinderGeometry(1, 1, .004, 6) : new THREE.CylinderGeometry(1, .9, .004, 14); B.add(g, mat, [x, y, z], [PI / 2, 0, 0], [w, 1, h]); };
export const GLASSES = {
  frame(B, c, o) { const shape = o.shape || 'round', w = (o.w ?? .027) * c.hs, h = (o.h ?? .022) * c.hs, ex = c.hw * .41, th = o.th ?? .0035;
    for (const s of [-1, 1]) { const x = s * ex, z = c.faceZ(x, c.eyeY) + .012; lens(B, c, shape, x, c.eyeY, z, w, h, o.dark ? 'k' : 'g');
      const pts = []; const N = 20; for (let i = 0; i < N; i++) { const a = i / N * PI * 2; let px = Math.cos(a), py = Math.sin(a); if (shape === 'square') { px = Math.sign(px) * Math.pow(Math.abs(px), .35); py = Math.sign(py) * Math.pow(Math.abs(py), .35); } if (shape === 'cat') py += (px * s > 0 ? .35 * Math.abs(px) * (py > 0 ? 1 : .2) : 0) * (s > 0 ? 1 : 1); if (shape === 'hex') { const k = 6; const aa = Math.round(a / (PI * 2 / k)) * (PI * 2 / k); px = Math.cos(aa); py = Math.sin(aa); } pts.push([x + px * w, c.eyeY + py * h, z]); }
      B.tube(pts, th, 'a', true, 40, 5); // temple arm to ear
      const ez = c.ears[s > 0 ? 0 : 1]; B.tube([[x + s * w, c.eyeY + h * .3, z - .004], [s * (c.hw * .98), c.eyeY + .01, (z + ez.z) / 2], [s * c.hw * 1.0, c.eyeY - .005, ez.z + .01]], th * .9, 'a', false, 14, 4); }
    B.tube([[-ex + w, c.eyeY + h * .25, c.faceZ(0, c.eyeY) + .012], [0, c.eyeY + h * .38, c.faceZ(0, c.eyeY + .01) + .02], [ex - w, c.eyeY + h * .25, c.faceZ(0, c.eyeY) + .012]], th, 'a', false, 14, 4);
    if (o.aviator) B.tube([[-ex + w, c.eyeY + h * 1.0, c.faceZ(0, c.eyeY) + .014], [ex - w, c.eyeY + h * 1.0, c.faceZ(0, c.eyeY) + .014]], th * .8, 'a', false, 10, 4); },
  visor(B, c, o) { for (const s of [-1, 1]) { B.add(new THREE.BoxGeometry(c.hw * .7, .004, c.hw * .35), 'g', [0, c.eyeY, c.front * .9 + .02]); } B.add(new THREE.CylinderGeometry(c.rx * 1.02, c.rx * 1.02, .03, 22, 1, true, -1.2, 2.4), 'a', [0, c.eyeY, c.zc]); },
  goggles(B, c, o) { for (const s of [-1, 1]) { const x = s * c.hw * .41, z = c.faceZ(x, c.eyeY) + .018; B.add(new THREE.CylinderGeometry(.03, .03, .02, 18), 'g', [x, c.eyeY, z], [PI / 2, 0, 0]); B.torus(.032, .006, [x, c.eyeY, z + .01], 'a', [0, 0, 0]); } B.add(new THREE.TorusGeometry(c.rx * 1.02, .01, 6, 30, PI * 1.5), 'a', [0, c.eyeY, c.zc], [PI / 2, 0, PI * .75], [1, c.rz / c.rx, 1]); },
};
// ---------- jewellery ----------
export const EAR = { // each is built for one side (s = +1 / -1); lobe position from the mesh
  stud(B, c, s, o) { const l = c.lobes[s > 0 ? 0 : 1]; B.sphere((o.r ?? .006), [l.x + s * .002, l.y + .012, l.z + .004], null, o.gem ? 'g' : 'm'); },
  hoop(B, c, s, o) { const l = c.lobes[s > 0 ? 0 : 1]; const R = o.R ?? .018; B.torus(R, o.t ?? .0028, [l.x + s * .002, l.y + .012 - R + .004, l.z + .004], 'm', [0, PI / 2, 0]); },
  drop(B, c, s, o) { const l = c.lobes[s > 0 ? 0 : 1]; B.sphere(.005, [l.x + s * .002, l.y + .012, l.z + .004], null, 'm'); B.tube([[l.x + s * .003, l.y + .01, l.z + .004], [l.x + s * .003, l.y - (o.len ?? .03), l.z + .004]], .0014, 'm', false, 6, 4); B.sphere(.007, [l.x + s * .003, l.y - (o.len ?? .03) - .006, l.z + .004], [1, 1.3, 1], 'g'); },
  cuff(B, c, s, o) { const e = c.ears[s > 0 ? 0 : 1]; B.torus(.016, .003, [e.x + s * .004, e.y + .015, e.z + .002], 'm', [0, PI / 2, 0], PI * 1.6); },
  cross(B, c, s, o) { const l = c.lobes[s > 0 ? 0 : 1]; const y = l.y - .02; B.tube([[l.x + s * .003, l.y + .01, l.z + .004], [l.x + s * .003, y + .01, l.z + .004]], .0014, 'm', false, 6, 4); B.box(.003, .02, .003, [l.x + s * .003, y, l.z + .004], 'm'); B.box(.003, .003, .012, [l.x + s * .003, y + .005, l.z + .004], 'm'); },
  chain(B, c, s, o) { const l = c.lobes[s > 0 ? 0 : 1], e = c.ears[s > 0 ? 0 : 1]; B.tube([[l.x + s * .003, l.y + .01, l.z + .004], [l.x + s * .008, (l.y + e.y) / 2 - .02, l.z - .005], [e.x + s * .004, e.y + .015, e.z + .002]], .0016, 'm', false, 12, 4); B.sphere(.005, [l.x + s * .003, l.y + .01, l.z + .004], null, 'g'); },
};
export const PIERCE = {
  nose(B, c, o) { const s = o.side || 1; const x = s * c.hw * .115, y = c.noseY + .004; B.sphere(.004, [x, y, c.faceZ(x, y) + .001], null, o.gem ? 'g' : 'm'); },
  noseRing(B, c, o) { const s = o.side || 1; const x = s * c.hw * .115, y = c.noseY + .0; B.torus(.007, .0017, [x * 1.1, y - .004, c.faceZ(x, y) - .002], 'm', [0, PI / 2, 0]); },
  septum(B, c) { B.torus(.008, .0018, [0, c.noseY - .012, c.faceZ(0, c.noseY - .012) + .004], 'm', [PI / 2, 0, 0], PI * 1.5); },
  brow(B, c, o) { const s = o.side || 1; const x = s * c.hw * .55, y = c.eyeY + .045; B.sphere(.0035, [x, y, c.faceZ(x, y) + .001], null, 'm'); B.sphere(.0035, [x + s * .006, y + .01, c.faceZ(x, y + .01) + .001], null, 'm'); },
  lip(B, c, o) { const s = o.side || 1; const x = s * c.hw * .14, y = c.mouthY - .019; B.torus(.006, .0016, [x, y, c.faceZ(x, y) + .001], 'm', [0, 0, 0], PI * 1.6); },
  eyebrowBar(B, c, o) { const x = c.hw * .55, y = c.eyeY + .05; B.cyl(.0022, .0022, .016, [x, y, c.faceZ(x, y) + .001], 'm', [0, 0, .5]); },
  tragus(B, c, o) { const s = o.side || 1; const e = c.ears[s > 0 ? 0 : 1]; B.sphere(.004, [e.x - s * .003, e.y - .006, e.z + .01], null, 'm'); },
};
export const NECK = {
  chain(B, c, o) { const y0 = c.P.neck.y + .005, w = o.drop ?? .13, fz = c.torsoZ(y0 - w * .5); const pts = []; for (let i = 0; i <= 14; i++) { const a = i / 14 * PI - PI / 2; const k = Math.sin((i / 14) * PI); const x = Math.sin(a) * .066 * (1 - 0 * k), y = y0 - k * w * .55 + (1 - Math.abs(Math.sin(a))) * 0; pts.push([x, y0 - (1 - Math.cos(a * 1)) * 0 - Math.pow(k, 1.5) * w, c.torsoZ(y0 - Math.pow(k, 1.5) * w) * 1 + .008]); } B.tube(pts, o.t ?? .0026, 'm', false, 40, 5); const pl = pts[7]; if (o.pend === 'orb') B.sphere(.012, [0, pl[1] - .012, pl[2] + .004], null, 'g'); if (o.pend === 'cross') { B.box(.006, .04, .004, [0, pl[1] - .02, pl[2] + .004], 'm'); B.box(.026, .006, .004, [0, pl[1] - .008, pl[2] + .004], 'm'); } if (o.pend === 'tag') B.box(.02, .034, .003, [0, pl[1] - .02, pl[2] + .004], 'm'); if (o.pend === 'ring') B.torus(.011, .003, [0, pl[1] - .012, pl[2] + .004], 'm'); if (o.pend === 'heart') { B.sphere(.008, [-.006, pl[1] - .01, pl[2] + .004], null, 'g'); B.sphere(.008, [.006, pl[1] - .01, pl[2] + .004], null, 'g'); B.cone(.012, .02, [0, pl[1] - .024, pl[2] + .004], 'g', [PI, 0, 0]); } },
  choker(B, c, o) { const y = c.P.neck.y + .028; ring(B, o.mat || 'k', 0, y, c.P.neck.z + .004, .052, .056, .005); if (o.pend) B.sphere(.007, [0, y - .006, c.P.neck.z + .06], null, 'g'); },
  pearls(B, c, o) { const y0 = c.P.neck.y + .008; for (let i = 0; i < 27; i++) { const a = -PI / 2 + i / 26 * PI; const k = Math.sin(i / 26 * PI); const yy = y0 - Math.pow(k, 1.4) * (o.drop ?? .1); B.sphere(.0058, [Math.sin(a) * .066, yy, c.torsoZ(yy) + .009], null, 'g'); } for (let i = 0; i < 12; i++) { const a = i / 12 * PI + PI; B.sphere(.0058, [Math.sin(a) * .066, y0 + .0, c.P.neck.z - Math.cos(a) * .05], null, 'g'); } },
  beads(B, c, o) { const y0 = c.P.neck.y; for (let i = 0; i < 19; i++) { const a = -PI / 2 + i / 18 * PI; const k = Math.sin(i / 18 * PI); const yy = y0 - Math.pow(k, 1.4) * .15; B.sphere(.008, [Math.sin(a) * .07, yy, c.torsoZ(yy) + .01], null, i % 2 ? 'g' : 'a'); } },
  scarf(B, c, o) { ring(B, 'a', 0, c.P.neck.y + .012, c.P.neck.z + .004, .066, .07, .028); ring(B, 'a', 0, c.P.neck.y - .02, c.P.neck.z + .006, .07, .075, .026); B.box(.07, .2, .018, [.04, c.P.neck.y - .13, c.torsoZ(c.P.neck.y - .13) + .015], 'a', [0, 0, .06]); },
  lanyard(B, c, o) { const pts = []; for (let i = 0; i <= 10; i++) { const a = -1 + i / 5; pts.push([a * .062, c.P.neck.y + .004 - (1 - a * a) * .22, c.torsoZ(c.P.neck.y - (1 - a * a) * .22) + .008]); } B.tube(pts, .004, 'a', false, 30, 4); B.box(.05, .07, .004, [0, c.P.neck.y - .26, c.torsoZ(c.P.neck.y - .26) + .01], 'b'); },
};
// forearm / wrist things: bone-space helpers
export function limb(c, side, s) { const sd = side > 0 ? 'Left' : 'Right'; const e = c.P[sd + 'ForeArm'], h = c.P[sd + 'Hand']; const p = e.clone().lerp(h, s); const d = h.clone().sub(e).normalize(); return { p, d }; }
export const WRIST = {
  band(B, c, o) { for (const s of o.sides || [1]) { const { p, d } = limb(c, s, o.at ?? .86); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); const e = new THREE.Euler().setFromQuaternion(q); B.add(new THREE.CylinderGeometry(.036, .034, o.w ?? .018, 18, 1, true), o.mat || 'a', [p.x, p.y, p.z], [e.x, e.y, e.z]); } },
  bangle(B, c, o) { for (const s of o.sides || [1]) { const { p, d } = limb(c, s, .86); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d); const e = new THREE.Euler().setFromQuaternion(q); for (let i = 0; i < (o.n ?? 3); i++) B.add(new THREE.TorusGeometry(.036, .0035, 8, 22), 'm', [p.x - d.x * i * .011, p.y - d.y * i * .011, p.z - d.z * i * .011], [e.x, e.y, e.z]); } },
  watch(B, c, o) { for (const s of o.sides || [1]) { const { p, d } = limb(c, s, .86); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); const e = new THREE.Euler().setFromQuaternion(q); B.add(new THREE.CylinderGeometry(.034, .034, .016, 18, 1, true), 'k', [p.x, p.y, p.z], [e.x, e.y, e.z]); const up = new THREE.Vector3(0, 0.7, 0.7).normalize().multiplyScalar(.036); B.add(new THREE.CylinderGeometry(.021, .021, .012, 20), 'm', [p.x + up.x, p.y + up.y, p.z + up.z], [e.x + PI / 4, e.y, e.z]); B.add(new THREE.CylinderGeometry(.017, .017, .014, 20), 'g', [p.x + up.x * 1.03, p.y + up.y * 1.03, p.z + up.z * 1.03], [e.x + PI / 4, e.y, e.z]); } },
  cuffs(B, c, o) { for (const s of [1, -1]) { const { p, d } = limb(c, s, .9); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); const e = new THREE.Euler().setFromQuaternion(q); B.add(new THREE.CylinderGeometry(.04, .038, .045, 18, 1, true), 'a', [p.x, p.y, p.z], [e.x, e.y, e.z]); } },
};
export const RING = {
  band(B, c, o) { for (const s of o.sides || [1]) { const sd = s > 0 ? 'Left' : 'Right'; const h = c.P[sd + 'Hand'], e = c.P[sd + 'ForeArm']; const d = h.clone().sub(e).normalize(); const p = h.clone().addScaledVector(d, .052).add(new THREE.Vector3(s * .0, -0.0, .0)); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d); const eu = new THREE.Euler().setFromQuaternion(q); B.add(new THREE.TorusGeometry(.013, .0028, 8, 18), 'm', [p.x, p.y, p.z], [eu.x, eu.y, eu.z]); if (o.gem) B.sphere(.0045, [p.x, p.y + .013, p.z], null, 'g'); } },
};
// ---------- bags / belts ----------
export const BAG = {
  pack(B, c, o) { const y = c.P.Spine01.y + .02, z = c.torsoZ(y, true) - (o.d ?? .09) / 2 - .01, h = o.h ?? .36, w = o.w ?? .27, d = o.d ?? .1; B.add(new THREE.BoxGeometry(w, h, d, 1, 1, 1), 'a', [0, y, z], [0, 0, 0]); B.box(w * .8, h * .35, d * .5, [0, y - h * .18, z - d * .45], 'b'); B.box(w * .92, .02, d * 1.02, [0, y + h * .5 - .06, z], 'b');
    for (const s of [-1, 1]) B.tube([[s * .07, y + h * .45, z + d * .5], [s * .085, y + h * .25, c.torsoZ(y + .22, false) * .8 - .02], [s * .09, y - .02, c.torsoZ(y, false) * .75 - .015], [s * .07, y - h * .45, z + d * .5]], .016, 'b', false, 24, 6); },
  small(B, c, o) { const y = c.P.Spine01.y + .06, z = c.torsoZ(y, true) - .045; B.add(new THREE.BoxGeometry(.22, .26, .07), 'a', [0, y, z]); B.box(.19, .08, .075, [0, y - .08, z], 'b'); for (const s of [-1, 1]) B.tube([[s * .065, y + .13, z + .035], [s * .085, y + .1, c.torsoZ(y + .1, false) * .8 - .015], [s * .09, y - .03, c.torsoZ(y, false) * .75], [s * .065, y - .13, z + .035]], .013, 'b', false, 24, 6); },
  cross(B, c, o) { const y0 = c.P.Spine.y; const pts = []; for (let i = 0; i <= 12; i++) { const k = i / 12; pts.push([(-.12 + k * .26) * 1.0, y0 + .02 - k * .36, (k < .2 || k > .85 ? c.torsoZ(y0 - k * .36, false) + .016 : (k < .5 ? c.torsoZ(y0 - k * .36, false) + .02 : c.torsoZ(y0 - k * .36, true) - .016))]); } B.tube(pts, .014, 'b', false, 30, 6); B.add(new THREE.BoxGeometry(.2, .14, .06), 'a', [.12, y0 - .3, c.torsoZ(y0 - .3, true) - .036]); },
  duffel(B, c, o) { const y = c.P.Spine01.y - .02, z = c.torsoZ(y, true) - .075; B.cyl(.07, .07, .4, [0, y, z], 'a', [0, 0, PI / 2]); B.tube([[-.18, y + .02, z], [-.07, y + .2, z + .01], [.07, y + .2, z + .01], [.18, y + .02, z]], .01, 'b', false, 20, 6); },
};
export const BELT = {
  belt(B, c, o) { const y = c.P.Hips.y + .06; const ez = c.torsoZ(y); const bz = c.torsoZ(y, true); const rx = .15 * (o.rx ?? 1), rz = (ez - bz) / 2 + .012; ring(B, 'a', 0, y, (ez + bz) / 2, rx * (1 + 0 * rz), rz, .009); B.box(.036, .028, .008, [0, y, ez + .014], 'm'); },
};
