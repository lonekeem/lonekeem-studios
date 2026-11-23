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


// ---- hat shape helpers (all in bind-pose metres; unit-circle profiles scaled to the head ellipse by sz = rz/rx) ----
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// lathe: pts = [[r, y], ...] bottom -> top; rib = [amp, count] radial ribs (knit / folds); fn(x, y, z, rel) optional vertex shaper
function lathe(B, mat, pts, cx, cy, cz, sz, rib, fn, seg = 40) { const g = new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg); const p = g.attributes.position; const y0 = pts[0][1], y1 = pts[pts.length - 1][1];
  for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const rel = (y - y0) / Math.max(1e-6, y1 - y0); if (rib) { const th = Math.atan2(x, z); const k = 1 + rib[0] * Math.sin(th * rib[1]); x *= k; z *= k; } if (fn) { const o = fn(x, y, z, rel); if (o) { x = o[0]; y = o[1]; z = o[2]; } } p.setXYZ(i, x, y, z); }
  g.computeVertexNormals(); return B.add(g, mat, [cx, cy, cz], [0, 0, 0], [1, 1, sz]); }
const dome = (R, H, n = 9, sq = 1) => { const a = []; for (let k = 0; k <= n; k++) { const t = k / n * Math.PI / 2; a.push([R * Math.pow(Math.cos(t), sq), H * Math.sin(t)]); } return a; };
// closed solid fan / brim: theta in [t0, t1], radius rIn(theta) -> rOut(theta), height yFn(theta, t) with thickness th (top, underside and edge walls, flat-shaded edge)
function solidFan(B, mat, cx, cy, cz, sz, o) { const nT = o.nT || 36, nR = o.nR || 6; const full = Math.abs((o.t1 - o.t0) - Math.PI * 2) < 1e-3; const T = [], Bm = [];
  for (let i = 0; i <= nT; i++) { const th = o.t0 + (o.t1 - o.t0) * i / nT, rI = o.rIn(th), rO = o.rOut(th); const rowT = [], rowB = []; for (let j = 0; j <= nR; j++) { const t = j / nR, r = rI + (rO - rI) * t; const y = o.y(th, t); rowT.push([Math.sin(th) * r, y, Math.cos(th) * r]); rowB.push([Math.sin(th) * r, y - o.th * (1 - .4 * t), Math.cos(th) * r]); } T.push(rowT); Bm.push(rowB); }
  const grid = (A, flip, up) => { const pos = [], idx = []; for (let i = 0; i <= nT; i++) for (let j = 0; j <= nR; j++) pos.push(...A[i][j]); for (let i = 0; i < nT; i++) for (let j = 0; j < nR; j++) { const a = i * (nR + 1) + j, b = a + nR + 1; if (flip) idx.push(a, a + 1, b, b, a + 1, b + 1); else idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); if (up) { const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, n.getX(i) * .3, -(Math.abs(n.getY(i)) * .9 + .25), n.getZ(i) * .3); } return g; };
  B.add(grid(T, false), mat, [cx, cy, cz], [0, 0, 0], [1, 1, sz]); B.add(grid(Bm, true, true), mat, [cx, cy, cz], [0, 0, 0], [1, 1, sz]);
  const wall = pts => { const pos = [], idx = []; pts.forEach(([a, b]) => { pos.push(...a, ...b); }); for (let k = 0; k < pts.length - 1; k++) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return B.add(g, mat, [cx, cy, cz], [0, 0, 0], [1, 1, sz]); };
  wall(T.map((row, i) => [row[nR], Bm[i][nR]])); wall(T.map((row, i) => [row[0], Bm[i][0]]));
  if (!full) { wall(T[0].map((p, j) => [p, Bm[0][j]])); wall(T[nT].map((p, j) => [p, Bm[nT][j]])); } }
// ---------- hats ----------
export const HAT = {
  cap(B, c, o) { const R = c.rx * 1.05, sz = c.rz / c.rx, H = c.ry * 1.02, y0 = c.crownY - .012; // rounded crown with panel seams + button, curved bill in front
    lathe(B, 'a', dome(R, H, 10, .9), 0, y0, c.zc, sz, null, (x, y, z, rel) => [x, y + .006 * rel * Math.max(0, z / R), z]);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + .26; const pts = []; for (let m = 0; m <= 10; m++) { const t = m / 10 * Math.PI / 2 * .97; pts.push([Math.sin(a) * R * Math.cos(t) * 1.006, y0 + H * Math.sin(t) * 1.006 + .001, c.zc + Math.cos(a) * R * Math.cos(t) * sz * 1.006]); } B.tube(pts, .0028, 'b', false, 16, 4); }
    B.sphere(.011, [0, y0 + H * 1.0, c.zc], [1, .7, 1], 'b');
    const L = o.brim ?? .09; solidFan(B, 'a', 0, y0 + .012, c.zc, sz, { t0: -1.12, t1: 1.12, nT: 28, nR: 6, th: .006, rIn: () => R * .985, rOut: th => R * .985 + L * (1 - .25 * (th / 1.12) ** 2), y: (th, t) => -(.035 * Math.pow(t, 1.5) * (L / .09) + .013 * Math.sin(th) ** 2 * t) });
    ring(B, 'b', 0, y0 + .006, c.zc, R * 1.0, R * 1.0 * sz, .004); },
  beanie(B, c, o) { const R = c.rx * 1.05, sz = c.rz / c.rx, tall = o.tall ?? 1.1, H = c.ry * tall * 1.0, y0 = c.crownY - .02; // knit dome that hugs the head + a folded cuff
    lathe(B, 'a', dome(R * 1.0, H, 10, .8), 0, y0 + .018, c.zc - .004, sz, [.012, 46], tall > 1.3 ? (x, y, z, rel) => [x, y, z - .02 * rel * rel] : null);
    lathe(B, 'b', [[R * .97, y0 - .012], [R * 1.06, y0 - .009], [R * 1.085, y0 + .012], [R * 1.07, y0 + .038], [R * 1.0, y0 + .046], [R * .97, y0 + .03]], 0, 0, c.zc - .004, sz, [.014, 56]);
    if (o.pom) B.sphere(.042, [0, y0 + .018 + H * 1.0 + .018, c.zc - .004 - (tall > 1.3 ? .02 : 0)], null, 'b'); },
  bucket(B, c, o) { const R = c.rx * 1.05, sz = c.rz / c.rx, H = c.ry * .98, y0 = c.crownY + .008; // tapered crown + a downward-sloping brim all round
    lathe(B, 'a', [[R * 1.04, y0 - .01], [R * .99, y0 + H * .35], [R * .92, y0 + H * .75], [R * .84, y0 + H * .96], [R * .66, y0 + H * 1.01], [R * .3, y0 + H * 1.02], [0, y0 + H * 1.02]], 0, 0, c.zc, sz, null);
    solidFan(B, 'a', 0, y0, c.zc, sz, { t0: -Math.PI, t1: Math.PI, nT: 40, nR: 6, th: .008, rIn: () => R * 1.0, rOut: () => R * 1.68, y: (th, t) => -.034 * Math.pow(t, 1.15) });
    ring(B, 'b', 0, y0 + .004, c.zc, R * 1.012, R * 1.012 * sz, .005); },
  brimmed(B, c, o) { const R = c.rx * 1.05, sz = c.rz / c.rx, st = o.style || 'fedora', w = o.wide ?? 1.9; const y0 = c.crownY + .008;
    if (st === 'sun') { lathe(B, 'a', dome(R * 1.02, c.ry * .78, 10, .75), 0, y0 - .004, c.zc, sz, [.004, 64]); solidFan(B, 'a', 0, y0 - .002, c.zc, sz, { t0: -Math.PI, t1: Math.PI, nT: 48, nR: 8, th: .007, rIn: () => R * 1.0, rOut: () => R * w * .98, y: (th, t) => -.03 * Math.pow(t, 1.6) + .006 * Math.sin(th * 3) * t * t }); lathe(B, 'b', [[R * 1.05, y0 + .004], [R * 1.07, y0 + .014], [R * 1.07, y0 + .03], [R * 1.045, y0 + .034]], 0, 0, c.zc, sz); return; }
    const H = c.ry * (st === 'western' ? 1.12 : 1.18);
    const pinch = (x, y, z, rel) => { const q = sstep(.45, 1, rel); const front = .55 + .45 * Math.max(0, z / (R * sz)); const dent = (st === 'western' ? .012 : .02) * Math.exp(-Math.pow(x / (R * .28), 2)) * sstep(.55, 1, rel); return [x * (1 - (st === 'western' ? .1 : .28) * q * front), y - dent, z * (1 + .05 * q)]; };
    lathe(B, 'a', [[R * 1.03, y0 - .012], [R * .99, y0 + H * .3], [R * .92, y0 + H * .62], [R * .86, y0 + H * .9], [R * .7, y0 + H * 1.0], [R * .35, y0 + H * 1.0], [0, y0 + H * 1.0]], 0, 0, c.zc, sz, null, pinch);
    lathe(B, 'b', [[R * 1.045, y0 - .006], [R * 1.055, y0 + .004], [R * 1.045, y0 + .026], [R * 1.02, y0 + .03]], 0, 0, c.zc, sz);
    const ww = st === 'western' ? 2.05 : 1.62; solidFan(B, 'a', 0, y0 - .004, c.zc, sz, { t0: -Math.PI, t1: Math.PI, nT: 56, nR: 8, th: .008, rIn: () => R * 1.0, rOut: () => R * ww,
      y: (th, t) => st === 'western' ? Math.pow(t, 1.5) * (.058 * Math.sin(th) ** 2 - .026 * Math.max(0, Math.cos(th))) : Math.pow(t, 1.4) * (.012 * Math.sin(th) ** 2 - .022 * Math.cos(th) ** 2) }); },
  beret(B, c) { const R = c.rx * 1.05, sz = c.rz / c.rx, y0 = c.crownY - .012; // flat, floppy disc pulled to one side, tight rim band + stalk
    lathe(B, 'a', [[R * 1.0, y0], [R * 1.14, y0 + .012], [R * 1.3, y0 + .03], [R * 1.34, y0 + .052], [R * 1.22, y0 + .082], [R * .8, y0 + .1], [R * .3, y0 + .106], [0, y0 + .105]], .014, 0, c.zc - .004, sz, [.016, 9], (x, y, z, rel) => [x, y - .02 * Math.max(0, x / R) * rel, z]);
    ring(B, 'b', 0, y0 + .003, c.zc, R * 1.0, R * 1.0 * sz, .007); B.cyl(.0055, .0065, .016, [.014 - .004, y0 + .112, c.zc - .004], 'b'); },
  headband(B, c, o) { ring(B, 'a', 0, c.eyeY + .09, c.zc, c.rx * 1.03, c.rz * 1.03, o.thick ?? .016); },
  bandana(B, c) { hemi(B, 'a', 0, c.crownY - .02, c.zc, c.rx * 1.04, c.ry * 1.0, c.rz * 1.04, .86); B.add(new THREE.ConeGeometry(.035, .13, 6), 'a', [.05, c.crownY - .08, c.back - .01], [-2.6, 0, 0]); B.add(new THREE.ConeGeometry(.035, .12, 6), 'a', [-.04, c.crownY - .08, c.back - .01], [-2.9, 0, 0]); },
  hardhat(B, c) { const R = c.rx * 1.08, sz = c.rz / c.rx, H = c.ry * 1.1, y0 = c.crownY - .01; // ridged shell, short brim all round with a longer front peak
    lathe(B, 'a', dome(R, H, 10, .85), 0, y0, c.zc, sz, null);
    for (const xo of [0, .055, -.055]) { const pts = []; for (let m = 0; m <= 16; m++) { const t = (-1.15 + 2.3 * m / 16); const zz = Math.sin(t) * R * sz * .98, rr = Math.max(.01, Math.cos(t)); const yy = y0 + H * Math.sqrt(Math.max(0, 1 - Math.pow(xo / R, 2))) * Math.pow(Math.cos(t), .85) ; pts.push([xo * Math.min(1, rr + .3), yy + .004, c.zc + zz]); } B.tube(pts, xo === 0 ? .0105 : .0075, 'a', false, 30, 6); }
    solidFan(B, 'a', 0, y0 + .002, c.zc, sz, { t0: -Math.PI, t1: Math.PI, nT: 48, nR: 5, th: .011, rIn: () => R * 1.0, rOut: th => R * 1.14 + .042 * Math.pow(Math.max(0, Math.cos(th)), 2.2) * R / .13, y: (th, t) => -.008 * t - .006 * Math.max(0, Math.cos(th)) * t });
    ring(B, 'b', 0, y0 + .008, c.zc, R * 1.0, R * 1.0 * sz, .005); },
  visor(B, c) { ring(B, 'a', 0, c.crownY - .01, c.zc, c.rx * 1.1, c.rz * 1.1, .01, PI * 1.6, -PI * .8 + PI); B.add(new THREE.CylinderGeometry(c.rx * 1.35, c.rx * 1.35, .005, 22, 1, false, -.9, 1.8), 'a', [0, c.crownY - .01, c.zc + c.rz * .15]); },
  crown(B, c, o) { ring(B, 'm', 0, c.crownY + .02, c.zc, c.rx * 1.0, c.rz * 1.0, .012); for (let i = 0; i < 7; i++) { const a = i / 7 * PI * 2; B.cone(.014, .06, [Math.sin(a) * c.rx, c.crownY + .06, c.zc + Math.cos(a) * c.rz], 'm'); B.sphere(.008, [Math.sin(a) * c.rx, c.crownY + .095, c.zc + Math.cos(a) * c.rz], null, 'g'); } },
  ears(B, c, o) { hemi(B, 'a', 0, c.crownY - .02, c.zc, c.rx * 1.04, c.ry * 1.0, c.rz * 1.04, .9); for (const s of [-1, 1]) B.cone(.04, .1, [s * c.rx * .6, c.crownY + c.ry * .95, c.zc + .01], 'a', [0, 0, -s * .15]); },
  hood(B, c) { // v1.9.28: a real hood - wraps the top, back and sides of the head down past the jaw, open at the face (was a bowl over the eyes)
    const g = new THREE.SphereGeometry(1, 48, 28, 0, PI * 2, 0, PI * .78); const pa = g.attributes.position; const F = new THREE.Vector3(0, -.3, 1).normalize(), A = .9; const v = new THREE.Vector3(), t = new THREE.Vector3();
    for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i); const d = v.dot(F); if (d <= Math.cos(A)) continue; t.copy(v).addScaledVector(F, -d); if (t.lengthSq() < 1e-6) t.set(0, 1, 0); t.normalize(); v.copy(F).multiplyScalar(Math.cos(A)).addScaledVector(t, Math.sin(A)); pa.setXYZ(i, v.x, v.y, v.z); } // face opening: pull those points onto one smooth rim
    g.computeVertexNormals(); const S = [c.rx * 1.1, c.ry * 1.15 + .02, c.rz * 1.12], O = [0, c.crownY - .02, c.zc - .006]; B.add(g, 'a', O, [0, 0, 0], S);
    const rim = []; for (let k = 0; k <= 48; k++) { const a = k / 48 * PI * 2; t.set(Math.cos(a), 0, 0); const up = new THREE.Vector3().crossVectors(F, new THREE.Vector3(1, 0, 0)).normalize().multiplyScalar(-1); t.multiplyScalar(1).addScaledVector(up, Math.sin(a)).normalize(); if (t.y < -Math.sin(.78 * PI - PI / 2) - .02 && false) continue; v.copy(F).multiplyScalar(Math.cos(A)).addScaledVector(t, Math.sin(A)); if (Math.acos(Math.max(-1, Math.min(1, v.y))) > PI * .78) continue; rim.push([O[0] + v.x * S[0], O[1] + v.y * S[1], O[2] + v.z * S[2]]); }
    if (rim.length > 3) B.tube(rim, .006, 'b', false, 60, 6); // hem round the face opening
    B.sphere(c.rx * .7, [0, c.eyeY - .11, c.zc - c.rz * .75], [1.15, 1.1, .7], 'a'); },
  helmet(B, c) { hemi(B, 'a', 0, c.crownY - .04, c.zc, c.rx * 1.12, c.ry * 1.18, c.rz * 1.1, 1.18); B.add(new THREE.CylinderGeometry(c.rz * 1.16, c.rz * 1.16, .05, 24, 1, true, -1.05, 2.1), 'k', [0, c.eyeY + .025, c.zc], [0, 0, 0], [c.rx / c.rz, 1, 1]); },
  // Original hijab: thin cloth hugging the skull, a clean oval face opening,
  // a close U-wrap under the chin, and a soft drape that sits on the shoulders then hangs. Not a copy of any brand.
  hijab(B, c) {
    const NU = 128, NV = 88, pos = [], inside = [];
    const zc = c.zc, hw = c.hw || c.rx;
    const faceZ = (x, y) => (c.faceZ ? c.faceZ(x, y) : (c.front || (zc + c.rz)));
    const torsoZ = (y) => (c.torsoZ ? c.torsoZ(y) : zc);
    const browY = c.eyeY + 0.034;
    const lipY = (c.mouthY || (c.chinY + 0.04)) - 0.012;
    const openCy = (browY + lipY) * 0.5;
    const openH = (browY - lipY) * 0.5 * 1.12;
    const openW = hw * 0.76;
    const pad = 0.010;
    const hcy = c.crownY;
    const ry = Math.max(0.05, (c.top - hcy) * 0.92 + pad);
    const rx0 = hw * 1.01 + pad;
    const rz0 = Math.max(hw * 0.96, (c.front - zc) * 0.97) + pad;
    const neckY = (c.P && c.P.neck ? c.P.neck.y : c.chinY - 0.08);
    const shBone = c.P && c.P.LeftShoulder;
    const shY = shBone ? shBone.y : (neckY - 0.05);
    const shX = hw * 1.72;
    const neckRx = hw * 0.42;
    const vSplit = 0.52;
    const thJaw = Math.PI * 0.74;
    const mix = (front, side, back, f, s, b) => {
      const w = front + side + back || 1;
      return (front * f + side * s + back * b) / w;
    };
    const midYof = (F, S, B) => mix(F, S, B, neckY - 0.015, shY + 0.008, shY - 0.01);
    const midRxof = (F, S, B) => mix(F, S, B, neckRx * 1.2, shX * 0.92, hw * 1.18);
    const midRzof = (F, S, B) => mix(F, S, B, 0.045, rz0 * 0.55, rz0 * 0.9);
    const hemYof = (F, S, B) => mix(F, S, B, neckY - 0.07, shY - 0.18, shY - 0.22);
    const hemRxof = (F, S, B) => mix(F, S, B, neckRx * 1.25 + hw * 0.08, shX * 0.78, hw * 1.12);
    const hemRzof = (F, S, B) => mix(F, S, B, 0.04, rz0 * 0.5, rz0 * 0.8 + 0.02);
    const hemRing = [];
    for (let j = 0; j <= NV; j++) {
      const v = j / NV;
      for (let i = 0; i <= NU; i++) {
        const a = i / NU * Math.PI * 2;
        const front = Math.max(0, Math.cos(a)), back = Math.max(0, -Math.cos(a)), side = Math.abs(Math.sin(a));
        let y, x, z, rx, rz;
        if (v <= vSplit) {
          const th = (v / vSplit) * thJaw;
          y = hcy + Math.cos(th) * ry;
          rx = Math.max(0.001, Math.sin(th) * rx0);
          rz = Math.max(0.001, Math.sin(th) * rz0);
          x = Math.sin(a) * rx; z = zc + Math.cos(a) * rz;
        } else {
          const tt = (v - vSplit) / (1 - vSplit), s = tt * tt * (3 - 2 * tt);
          const yJaw = hcy + Math.cos(thJaw) * ry;
          const rxJaw = Math.sin(thJaw) * rx0, rzJaw = Math.sin(thJaw) * rz0;
          const yH = hemYof(front, side, back), rH = hemRxof(front, side, back), zH = hemRzof(front, side, back);
          const e = s * s * (3 - 2 * s);
          y = yJaw + (yH - yJaw) * e;
          rx = rxJaw + (rH - rxJaw) * e;
          rz = rzJaw + (zH - rzJaw) * e;
          x = Math.sin(a) * rx;
          const zLip = faceZ(0, lipY) + 0.007;
          const zChin = faceZ(0, c.chinY) + 0.006;
          const zNeck = torsoZ(y) + 0.016;
          let zu;
          if (s < 0.2) zu = zLip + (zChin - zLip) * (s / 0.2);
          else zu = zChin + (zNeck - zChin) * Math.min(1, (s - 0.2) / 0.8);
          const zShell = zc + Math.cos(a) * rz;
          z = zShell + (zu - zShell) * Math.min(1, front / 0.65);
        }
        const nx = x / Math.max(openW, 1e-4), nyv = (y - openCy) / Math.max(openH, 1e-4);
        const ell = nx * nx + nyv * nyv;
        const isFront = z > zc + rz0 * 0.15;
        if (isFront && ell > 0.7 && ell < 1.22) {
          const k = 1 / (Math.sqrt(ell) || 1e-4);
          x *= k; y = openCy + (y - openCy) * k;
          z = faceZ(x, y) + 0.01;
        }
        const inHole = isFront && ell < 0.9;
        inside.push(inHole ? 1 : 0);
        if (j === NV) hemRing.push([x, y, z, a]);
        pos.push(x, y, z);
      }
    }
    const idx = [];
    for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
      const a = j * (NU + 1) + i, b = a + NU + 1;
      if (!(inside[a] && inside[a + 1] && inside[b])) idx.push(a, b, a + 1);
      if (!(inside[a + 1] && inside[b] && inside[b + 1])) idx.push(a + 1, b, b + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    B.add(g, 'a');
    // Smooth fabric frame around the face: a flat ribbon on an exact ellipse.
    const NR = 128, NW = 5, rPos = [], rIdx = [];
    for (let w = 0; w <= NW; w++) {
      const sc = 0.9 + 0.2 * (w / NW);
      for (let k = 0; k <= NR; k++) {
        const ang = k / NR * Math.PI * 2;
        const rx = Math.sin(ang) * openW * sc, ryv = openCy + Math.cos(ang) * openH * sc;
        const rzv = faceZ(rx, ryv) + 0.011 - 0.003 * (w / NW);
        rPos.push(rx, ryv, rzv);
      }
    }
    for (let w = 0; w < NW; w++) for (let k = 0; k < NR; k++) {
      const a = w * (NR + 1) + k, b = a + NR + 1;
      rIdx.push(a, a + 1, b, b, a + 1, b + 1);
    }
    const rim = new THREE.BufferGeometry();
    rim.setAttribute('position', new THREE.Float32BufferAttribute(rPos, 3));
    rim.setIndex(rIdx); rim.computeVertexNormals();
    B.add(rim, 'a');
    // Flat finished hem following the rounded lower edge.
    if (hemRing.length >= 3) {
      const HW = 4, hPos = [], hIdx = [], nH = NU;
      for (let w = 0; w <= HW; w++) {
        const u = w / HW, band = 0.012 * u;
        for (let k = 0; k <= nH; k++) {
          const p = hemRing[k], a = p[3];
          hPos.push(p[0] + Math.sin(a) * band, p[1] - 0.003 * u, p[2] + Math.cos(a) * band * 0.45);
        }
      }
      for (let w = 0; w < HW; w++) for (let k = 0; k < nH; k++) {
        const a = w * (nH + 1) + k, b = a + nH + 1;
        hIdx.push(a, a + 1, b, b, a + 1, b + 1);
      }
      const hem = new THREE.BufferGeometry();
      hem.setAttribute('position', new THREE.Float32BufferAttribute(hPos, 3));
      hem.setIndex(hIdx); hem.computeVertexNormals();
      B.add(hem, 'a');
    }
  },
  // Original head wrap / turban: stacked cloth bands on the crown with a side fold. Covers the hair.
  wrap(B, c) {
    const y0 = c.crownY + .01, R = c.rx * 1.08, sz = c.rz / c.rx;
    hemi(B, 'a', 0, y0 - .02, c.zc, R, c.ry * .7, R * sz, 1.05);
    ring(B, 'b', 0, y0 + .01, c.zc, R * 1.02, R * 1.02 * sz, .018);
    ring(B, 'a', 0, y0 + .04, c.zc, R * .98, R * .98 * sz, .02);
    ring(B, 'b', 0, y0 + .07, c.zc, R * .88, R * .88 * sz, .016);
    B.add(new THREE.SphereGeometry(1, 16, 12), 'b', [c.rx * .85, y0 + .02, c.zc], [0, 0, .4], [.05, .04, .06]);
  },
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
  goggles(B, c, o) { // v1.9.28 scavenger goggles: two rounded lens cups in a chunky frame, a nose bridge and a strap around the back of the head
    const hs = c.hs, w = .026 * hs, h = .019 * hs, ex = c.hw * .38, y = c.eyeY - .004, sy = y + .004; // v1.9.28: sized to the eyes, flush to the face
    const rim = (x, z, k) => { const pts = []; for (let i = 0; i < 24; i++) { const a = i / 24 * PI * 2; const px = Math.cos(a), py = Math.sin(a); pts.push([x + Math.sign(px) * Math.pow(Math.abs(px), .6) * w * k, y + Math.sign(py) * Math.pow(Math.abs(py), .6) * h * k, z]); } return pts; };
    const zs = []; for (const s of [-1, 1]) { const x = s * ex, z = Math.max(c.faceZ(x, y), c.faceZ(x * .7, y + .01)) + .007; zs.push(z);
      B.add(new THREE.CylinderGeometry(1, 1.12, .014, 24), 'k', [x, y, z - .006], [PI / 2, 0, 0], [w * 1.02, 1, h * 1.02]); // cup (frame body)
      B.add(new THREE.CylinderGeometry(1, 1, .003, 24), 'g', [x, y, z + .001], [PI / 2, 0, 0], [w * .86, 1, h * .86]); // lens
      B.tube(rim(x, z + .001, 1.0), .0042 * hs, 'a', true, 40, 6); // front rim
      const ez = c.ears[s > 0 ? 0 : 1]; B.tube([[x + s * w * 1.05, y, z - .006], [s * c.hw * .84, sy, (z + ez.z) / 2], [s * c.hw * .86, sy, ez.z]], .007 * hs, 'k', false, 12, 6); } // strap from cup along the temple to the ear
    B.tube([[-ex + w * .9, y + h * .1, zs[0] - .004], [0, y + h * .3, Math.max(zs[0], zs[1]) + .002], [ex - w * .9, y + h * .1, zs[1] - .004]], .006 * hs, 'k', false, 12, 5); // bridge
    { const e0 = c.ears[0], e1 = c.ears[1], d = c.faceZ(0, y) - e0.z, bz = e0.z - d * .8; B.tube([[c.hw * .86, sy, e0.z], [c.hw * .74, sy, e0.z - d * .45], [0, sy, bz], [-c.hw * .74, sy, e1.z - d * .45], [-c.hw * .86, sy, e1.z]], .007 * hs, 'k', false, 30, 6); } }, // strap round the back
};
// ---------- jewellery ----------
export const EAR = { // each is built for one side (s = +1 / -1); lobe position from the mesh
  stud(B, c, s, o) { const l = c.lobes[s > 0 ? 0 : 1]; const r = o.r ?? .006; B.sphere(r, [l.x + s * .002, l.y, l.z + r * .55], null, o.gem ? 'g' : 'm'); },
  hoop(B, c, s, o) { const l = c.lobes[s > 0 ? 0 : 1]; const R = o.R ?? .018; B.torus(R, o.t ?? .0028, [l.x + s * .001, l.y - R, l.z], 'm', [0, PI / 2, 0]); },
  drop(B, c, s, o) { const l = c.lobes[s > 0 ? 0 : 1]; B.sphere(.004, [l.x + s * .002, l.y, l.z + .003], null, 'm'); B.tube([[l.x + s * .002, l.y, l.z + .003], [l.x + s * .002, l.y - (o.len ?? .03), l.z + .003]], .0014, 'm', false, 6, 4); B.sphere(.007, [l.x + s * .002, l.y - (o.len ?? .03) - .006, l.z + .003], [1, 1.3, 1], 'g'); },
  cuff(B, c, s, o) { const e = c.ears[s > 0 ? 0 : 1]; B.torus(.016, .003, [e.x + s * .004, e.y + .015, e.z + .002], 'm', [0, PI / 2, 0], PI * 1.6); },
  cross(B, c, s, o) { const l = c.lobes[s > 0 ? 0 : 1]; const y = l.y - .02; B.tube([[l.x + s * .003, l.y + .01, l.z + .004], [l.x + s * .003, y + .01, l.z + .004]], .0014, 'm', false, 6, 4); B.box(.003, .02, .003, [l.x + s * .003, y, l.z + .004], 'm'); B.box(.003, .003, .012, [l.x + s * .003, y + .005, l.z + .004], 'm'); },
  chain(B, c, s, o) { const l = c.lobes[s > 0 ? 0 : 1], e = c.ears[s > 0 ? 0 : 1]; B.tube([[l.x + s * .003, l.y + .01, l.z + .004], [l.x + s * .008, (l.y + e.y) / 2 - .02, l.z - .005], [e.x + s * .004, e.y + .015, e.z + .002]], .0016, 'm', false, 12, 4); B.sphere(.005, [l.x + s * .003, l.y + .01, l.z + .004], null, 'g'); },
};
export const PIERCE = {
  nose(B, c, o) { const s = o.side || 1; const x = s * c.hw * .12, y = c.noseY + .002; B.sphere(.004, [x, y, c.faceZ(x, y) + .005], null, o.gem ? 'g' : 'm'); },
  noseRing(B, c, o) { const s = o.side || 1; const x = s * c.hw * .12, y = c.noseY - .002; B.torus(.007, .0017, [x, y, c.faceZ(x, y) + .003], 'm', [0, PI / 2, 0]); },
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
