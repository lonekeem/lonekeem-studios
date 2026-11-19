// "Quiet Falls": a starter grid town (2x2 streets, 25 houses: 7 enterable with real doors, 18 closed instanced exteriors), a store, a gas station,
// sheds, forest edge. Layout is generated from ROADS/LOT rules so the grid can grow towards 100 houses by extending ROADS + EXT.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Builder, boxGeo, mulberry, makeMats, bloodTex, crackTex, weedTex, signTex, groundTex, klTex } from './kit.js';
import { makeBuilding, gableGeo, plain, hash, COLORS, FACE_ROT, H } from './building.js';

export const CFG = { ZR: [-24, 24], XR: [-24, 24], EXT: 80, HOUSES: 25, ENTERABLE: 7, ROAD_HALF: 4 }; // grow: add roads to ZR/XR, raise EXT/HOUSES (max 100)
export const BOUNDS = { x: 118, z: 88 }; export const ROAD_HALF = 4;

// ---------- spatial grid of rect colliders ----------
export class Colliders {
  constructor(cell = 8) { this.cell = cell; this.g = new Map(); this.list = []; this.nav = null; }
  key(i, j) { return i * 4096 + j; }
  add(x0, x1, z0, z1, tag = '', active = true) { const c = { x0, x1, z0, z1, tag, active: false }; this.list.push(c); const C = this.cell; for (let i = Math.floor(x0 / C); i <= Math.floor(x1 / C); i++) for (let j = Math.floor(z0 / C); j <= Math.floor(z1 / C); j++) { const k = this.key(i, j); (this.g.get(k) || this.g.set(k, []).get(k)).push(c); } this.set(c, active); return c; }
  set(c, on) { if (c.active === on) return; c.active = on; if (this.nav) this.nav.mark(c, on ? 1 : -1); }
  push(x, z, r, ignore) { const C = this.cell; let hit = false;
    for (let it = 0; it < 2; it++) for (let i = Math.floor((x - r) / C); i <= Math.floor((x + r) / C); i++) for (let j = Math.floor((z - r) / C); j <= Math.floor((z + r) / C); j++) { const L = this.g.get(this.key(i, j)); if (!L) continue;
      for (const c of L) { if (!c.active || c === ignore) continue; const qx = Math.max(c.x0, Math.min(x, c.x1)), qz = Math.max(c.z0, Math.min(z, c.z1)); const dx = x - qx, dz = z - qz; const d2 = dx * dx + dz * dz; if (d2 >= r * r) continue; hit = true;
        if (d2 > 1e-8) { const d = Math.sqrt(d2); x = qx + dx / d * r; z = qz + dz / d * r; } else { const l = x - c.x0, rr = c.x1 - x, t = z - c.z0, b = c.z1 - z, m = Math.min(l, rr, t, b); if (m === l) x = c.x0 - r; else if (m === rr) x = c.x1 + r; else if (m === t) z = c.z0 - r; else z = c.z1 + r; } } }
    return [x, z, hit]; }
  hit(x, z, r) { return this.push(x, z, r)[2]; }
  los(x0, z0, x1, z1) { const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0)); for (let i = 1; i < n; i++) { const t = i / n; if (this.hit(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, .05)) return false; } return true; }
}
const NDX = [1, -1, 0, 0, 1, -1, 1, -1], NDZ = [0, 0, 1, -1, 1, 1, -1, -1];
export class Nav { // 1 m grid, counted blockers (doors toggle), BFS flow field to the player
  constructor(col) { this.W = BOUNDS.x * 2; this.Hh = BOUNDS.z * 2; this.ox = -BOUNDS.x; this.oz = -BOUNDS.z; this.cnt = new Uint8Array(this.W * this.Hh); this.dist = new Float32Array(this.W * this.Hh).fill(1e9); this.q = new Int32Array(this.W * this.Hh); col.nav = this; }
  mark(c, d) { const m = .32; const i0 = Math.max(0, Math.floor(c.x0 - m - this.ox)), i1 = Math.min(this.W - 1, Math.floor(c.x1 + m - this.ox)), j0 = Math.max(0, Math.floor(c.z0 - m - this.oz)), j1 = Math.min(this.Hh - 1, Math.floor(c.z1 + m - this.oz)); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const k = j * this.W + i; this.cnt[k] = Math.max(0, this.cnt[k] + d); } }
  idx(x, z) { const i = Math.floor(x - this.ox), j = Math.floor(z - this.oz); return i < 0 || j < 0 || i >= this.W || j >= this.Hh ? -1 : j * this.W + i; }
  field(gx, gz) { let s = this.idx(gx, gz); if (s < 0) return; if (this.cnt[s]) { let best = -1; for (let r = 1; r < 5 && best < 0; r++) for (let dj = -r; dj <= r && best < 0; dj++) for (let di = -r; di <= r; di++) { const k = s + dj * this.W + di; if (k >= 0 && k < this.cnt.length && !this.cnt[k]) { best = k; break; } } if (best < 0) return; s = best; }
    const D = this.dist, W = this.W, N = D.length, q = this.q; D.fill(1e9); let h = 0, t = 0; q[t++] = s; D[s] = 0;
    while (h < t) { const c = q[h++], cd = D[c], ci = c % W; for (let k = 0; k < 8; k++) { const di = NDX[k], dj = NDZ[k], ni = ci + di; if (ni < 0 || ni >= W) continue; const n = c + dj * W + di; if (n < 0 || n >= N || this.cnt[n]) continue; if (k > 3 && (this.cnt[c + di] || this.cnt[c + dj * W])) continue; const nd = cd + (k > 3 ? 1.414 : 1); if (nd < D[n]) { D[n] = nd; q[t++] = n; } } } }
  dir(x, z) { const c = this.idx(x, z); if (c < 0) return null; const W = this.W, D = this.dist; let best = D[c], bk = -1; const ci = c % W; for (let k = 0; k < 8; k++) { const di = NDX[k], dj = NDZ[k], ni = ci + di; if (ni < 0 || ni >= W) continue; const n = c + dj * W + di; if (n < 0 || n >= D.length) continue; if (k > 3 && (this.cnt[c + di] || this.cnt[c + dj * W])) continue; if (D[n] < best - 1e-3) { best = D[n]; bk = k; } } if (bk < 0) return D[c] >= 1e8 ? null : [0, 0]; const l = Math.hypot(NDX[bk], NDZ[bk]); return [NDX[bk] / l, NDZ[bk] / l]; }
}

// ---------- lots (generated) ----------
export function genLots() { // houses along every east-west road, both sides, in spans between/outside the north-south roads
  const lots = []; const R = ROAD_HALF; const spans = []; const xs = [-CFG.EXT, ...CFG.XR.flatMap(x => [x - R - 4, x + R + 4]), CFG.EXT];
  for (let i = 0; i < xs.length; i += 2) spans.push([xs[i], xs[i + 1]]);
  for (const z0 of CFG.ZR) for (const side of [-1, 1]) for (const [a, b] of spans) { const pitch = 11, n = Math.floor((b - a) / pitch); if (n < 1) continue; const off = (b - a - n * pitch) / 2;
    for (let k = 0; k < n; k++) { const cx = a + off + (k + .5) * pitch; const d = 9; const cz = z0 + side * (10 + d / 2); lots.push({ cx, cz, w: 9, d, face: side > 0 ? 'N' : 'S', road: z0, side }); } }
  lots.sort((p, q) => Math.hypot(p.cx, p.cz) - Math.hypot(q.cx, q.cz)); lots.forEach((l, i) => { l.id = 'L' + i; }); return lots;
}
export const SPECIAL = [{ id: 'store', kind: 'store', cx: 0, cz: -18, w: 18, d: 12, face: 'S', ci: 3, locked: 0 },   { id: 'shed1', kind: 'shed', cx: -40, cz: 1, w: 4, d: 3.4, face: 'S', ci: 1, locked: 1 }, { id: 'shed2', kind: 'shed', cx: 40, cz: 6, w: 4, d: 3.4, face: 'W', ci: 4, locked: 0 }, { id: 'shed3', kind: 'shed', cx: -14, cz: 0, w: 4, d: 3.4, face: 'N', ci: 8, locked: 1 }];
// Reserved free lot for the gas station (faces the road z=-24, i.e. pumps near z=-13.5, kiosk behind): x 31..62, z -20..-1. Houses never use it.
export const GAS_LOT = { x0: 31, x1: 62, z0: -20, z1: -1, roadZ: -24, pumpZ: -13.5, kioskCX: 46, kioskCZ: -5.5 };
// Player start (a few steps from c1/c13 on the main cross street) and respawn.
export const SPAWN = { x: -6, z: 21.5, ry: Math.PI / 2 };
export const CAR_SPAWNS = [
  { id: 'c1', m: 'sedan', x: -12, z: 26.1, ry: Math.PI / 2, fuel: .55, lock: 0, tint: '#8a3b34' }, { id: 'c2', m: 'suv', x: 8, z: 21.8, ry: -Math.PI / 2 + .06, fuel: .22, lock: 1, tint: '#3d5a73' },
  { id: 'c3', m: 'hatchback-sports', x: 33, z: 25.5, ry: Math.PI / 2 + .35, fuel: .8, lock: 1, tint: '#c2a23a' }, { id: 'c4', m: 'van', x: -26, z: 10, ry: .05, fuel: .08, lock: 1, tint: '#d8d4c6' },
  { id: 'c5', m: 'sedan', x: -10, z: -21.8, ry: Math.PI / 2 + .1, fuel: .4, lock: 1, tint: '#4b6b4b' }, { id: 'c6', m: 'suv-luxury', x: 10, z: -26.2, ry: -Math.PI / 2 - .12, fuel: .7, lock: 1, tint: '#232529' },
  { id: 'c7', m: 'truck', x: 41, z: -15.9, ry: Math.PI / 2, fuel: .0, lock: 0, tint: '#8e5b2e' }, { id: 'c8', m: 'sedan', x: 52, z: -11.1, ry: -Math.PI / 2, fuel: .12, lock: 0, tint: '#7a7f86' },
  { id: 'c9', m: 'hatchback-sports', x: 2, z: -12, ry: .55, fuel: .35, lock: 2, tint: '#a8322d' }, { id: 'c10', m: 'suv', x: -48, z: -26, ry: Math.PI / 2, fuel: .9, lock: 1, tint: '#6b7a52' },
  { id: 'c11', m: 'sedan', x: 22, z: -8, ry: Math.PI + .1, fuel: .5, lock: 1, tint: '#9a8f78' }, { id: 'c12', m: 'van', x: -23.8, z: -44, ry: .1, fuel: .3, lock: 0, tint: '#3c4a63' },
  { id: 'c13', m: 'sedan', x: 20, z: -22, ry: -Math.PI / 2, fuel: .65, lock: 0, tint: '#b8b3a6' }, { id: 'c14', m: 'suv', x: 24.2, z: 44, ry: Math.PI + .6, fuel: .45, lock: 1, tint: '#7c3b52' },
];
export const BODIES = [{ x: -4, z: 23, ry: 1.1, k: 'h' }, { x: -1, z: 25.5, ry: 2.4, k: 'z' }, { x: 12, z: -22, ry: .3, k: 'h' }, { x: 26, z: -24, ry: 4, k: 'z' }, { x: -24.5, z: 0, ry: 5, k: 'h' }, { x: -23, z: -12, ry: 1.7, k: 'z' }, { x: 24.5, z: 12, ry: 2, k: 'h' },
  { x: 44, z: -10, ry: 3, k: 'h' }, { x: 49, z: -11, ry: 1, k: 'z' }, { x: -7, z: -17, ry: 2.8, k: 'h' }, { x: 1, z: -11.5, ry: .2, k: 'z' }, { x: 5, z: 23.5, ry: 4.4, k: 'h' }, { x: -23.5, z: 33, ry: 1.9, k: 'h' }, { x: -34, z: -22, ry: 5.7, k: 'z' }];

// ---------- closed (instanced) house variants ----------
function part(geos, mat, x0, x1, y0, y1, z0, z1, color) { const g = boxGeo(x1 - x0, y1 - y0, z1 - z0, 2, [(x0 * 3.1) % 1, (y0 * 1.7) % 1]); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); const n = g.attributes.position.count, c = new THREE.Color(color), a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); geos.push(g.toNonIndexed()); }
function variantGeos(v, w, d) { const hw = w / 2, hd = d / 2, g = []; const two = v === 1, Hh = two ? 5.4 : v === 3 ? 3.0 : 2.8; part(g, 0, -hw, hw, 0, Hh, -hd, hd, '#ffffff');
  const dx = v === 2 ? -hw / 3 : hw / 3; part(g, 0, dx - .5, dx + .5, 0, 2.1, hd, hd + .05, '#5b4632'); part(g, 0, dx - .6, dx + .6, 2.1, 2.22, hd, hd + .07, '#3f332a'); part(g, 0, dx - .6, dx - .5, 0, 2.2, hd, hd + .07, '#3f332a'); part(g, 0, dx + .5, dx + .6, 0, 2.2, hd, hd + .07, '#3f332a');
  const wins = [[-hw / 2 - (v === 2 ? 0 : 0), 1.5], [hw / 3 * -1 + (v === 2 ? hw * .9 : 0), 1.5]]; if (two) wins.push([-hw / 2, 4.1], [hw / 3, 4.1], [0, 4.1]); const px = v === 2 ? [hw * .55] : [-hw / 2];
  for (const [x, y] of (v === 2 ? [[hw * .5, 1.5], [-hw * .05, 1.5]] : wins)) { part(g, 0, x - .65, x + .65, y - .6, y + .6, hd, hd + .04, '#1e262d'); part(g, 0, x - .72, x + .72, y + .6, y + .68, hd, hd + .06, '#3f332a'); part(g, 0, x - .72, x + .72, y - .68, y - .6, hd, hd + .07, '#3f332a'); }
  for (const s of [-1, 1]) for (const z of [-hd / 2, hd / 2]) part(g, 0, s * hw, s * hw + s * .04, 1.1, 2.0, z - .55, z + .55, '#1e262d');
  if (v === 0 || v === 2) { part(g, 0, dx - 1.4, dx + 1.4, 0, .22, hd, hd + 1.5, '#9a978d'); for (const s of [-1, 1]) part(g, 0, dx + s * 1.3 - .05, dx + s * 1.3 + .05, .22, 2.4, hd + 1.4, hd + 1.5, '#e0dcd0'); part(g, 0, dx - 1.5, dx + 1.5, 2.4, 2.5, hd - .05, hd + 1.6, '#55504a'); }
  if (v === 1) part(g, 0, hw * .6, hw * .6 + .8, Hh, Hh + 1.6, -hd * .4, -hd * .4 + .8, '#8d7062'); if (v === 3) part(g, 0, -hw, hw, Hh, Hh + .35, -hd, hd, '#8a8883');
  return { hi: mergeGeometries(g), Hh, hasGable: v !== 3 }; }
class Closed { // all closed houses = 4 instanced variants; LOD swaps hi/lo body by camera distance and culls past the fog
  constructor(W, scene) { this.W = W; this.items = []; this.var = []; const M = W.M; const w = 9, d = 9;
    for (let v = 0; v < 4; v++) { const dims = [[9, 8], [8.6, 8], [11, 7], [9, 8]][v]; const vg = variantGeos(v, dims[0], dims[1]); const lo = boxGeo(dims[0], vg.Hh, dims[1], 2); lo.translate(0, vg.Hh / 2, 0); { const n = lo.attributes.position.count, a = new Float32Array(n * 3).fill(1); lo.setAttribute('color', new THREE.BufferAttribute(a, 3)); }
      const roofG = vg.hasGable ? gableGeo(dims[0] + .8, dims[1] + 1, (dims[1] + 1) * .3) : null; if (roofG) roofG.translate(0, vg.Hh, 0); if (v === 1 && roofG) { /* two-storey roof sits on top */ }
      this.var.push({ dims, vg, lo, roofG, hiM: null, loM: null, roofM: null, list: [] }); } }
  add(l, v, color, roofColor) { this.var[v].list.push({ l, color: new THREE.Color(color), roofColor: new THREE.Color(roofColor), rot: FACE_ROT[l.face] }); }
  init(scene) { const mk = (geo, mat, n, shadow) => { const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n)); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.count = 0; m.castShadow = shadow; m.receiveShadow = true; m.frustumCulled = false; m.setColorAt(0, new THREE.Color('#fff')); scene.add(m); return m; };
    for (const V of this.var) { const n = V.list.length; V.hiM = mk(V.vg.hi, this.W.M.siding, n, true); V.loM = mk(V.lo, this.W.M.siding, n, false); if (V.roofG) { const rm = this.W.M.roofmat.clone(); V.roofM = mk(V.roofG, rm, n, true); } } }
  update(cx, cz) { const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
    for (const V of this.var) { let hi = 0, lo = 0, rf = 0; for (const it of V.list) { const dx = it.l.cx - cx, dz = it.l.cz - cz, dd = Math.hypot(dx, dz); if (dd > 150) continue; q.setFromAxisAngle(up, it.rot); p.set(it.l.cx, 0, it.l.cz); m.compose(p, q, s);
        if (dd < 55) { V.hiM.setMatrixAt(hi, m); V.hiM.setColorAt(hi, it.color); hi++; } else { V.loM.setMatrixAt(lo, m); V.loM.setColorAt(lo, it.color); lo++; }
        if (V.roofM) { V.roofM.setMatrixAt(rf, m); V.roofM.setColorAt(rf, it.roofColor); rf++; } }
      V.hiM.count = hi; V.loM.count = lo; if (V.roofM) V.roofM.count = rf; for (const mm of [V.hiM, V.loM, V.roofM]) { if (!mm) continue; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; } this.stats = { hi: (this.stats?.hi || 0) }; }
    this.shown = this.var.reduce((a, V) => a + V.hiM.count + V.loM.count, 0); this.shownHi = this.var.reduce((a, V) => a + V.hiM.count, 0); }
}

export function buildTown(scene, opts = {}) {
  const M = makeMats(); const B = new Builder(); const col = new Colliders(); const nav = new Nav(col); const rnd = mulberry(4242);
  const root = new THREE.Group(); scene.add(root);
  const W = { M, B, col, nav, root, doors: [], containers: [], buildings: [], lots: [], decals: { blood: [], crack: [] }, closed: null, bounds: BOUNDS, enterable: [], rnd, hash };
  const R = ROAD_HALF, MX = BOUNDS.x + 30, MZ = BOUNDS.z + 30;
  // ground
  const gm = new THREE.MeshStandardMaterial({ map: groundTex(), roughness: 1 }); gm.map.repeat.set(70, 55); const ground = new THREE.Mesh(new THREE.PlaneGeometry(BOUNDS.x * 2 + 120, BOUNDS.z * 2 + 120), gm); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; root.add(ground); W.ground = ground;
  // roads: east-west full strips, north-south strips between east-west roads (no overlap at intersections)
  const roadMesh = (x0, x1, z0, z1) => { const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0) / 6, uv.getY(i) * (z1 - z0) / 6); const m = new THREE.Mesh(g, M.asphalt); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, .02, (z0 + z1) / 2); m.receiveShadow = true; root.add(m); };
  const zs = [...CFG.ZR].sort((a, b) => a - b), xsr = [...CFG.XR].sort((a, b) => a - b);
  for (const z of zs) roadMesh(-MX, MX, z - R, z + R);
  { const edges = [-MZ, ...zs.flatMap(z => [z - R, z + R]), MZ]; for (const x of xsr) for (let i = 0; i < edges.length; i += 2) roadMesh(x - R, x + R, edges[i], edges[i + 1]); }
  // paint + sidewalks
  const paint = []; const pline = (x0, z0, x1, z1, wd, c, dash) => { const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0); if (!dash) { paint.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, ang, l: len, w: wd, c }); return; } const n = Math.floor(len / 6); for (let i = 0; i < n; i++) { if (rnd() < .2) continue; const t = (i + .5) / n; paint.push({ x: x0 + (x1 - x0) * t, z: z0 + (z1 - z0) * t, ang, l: 2.6, w: wd, c }); } };
  const gaps = (a, b, G) => { const out = []; let s = a; for (const [g0, g1] of G.sort((p, q) => p[0] - q[0])) { if (g0 > s) out.push([s, g0]); s = Math.max(s, g1); } if (s < b) out.push([s, b]); return out; };
  const SW = (x0, x1, z0, z1) => B.bounds('concrete', x0, x1, 0, .16, z0, z1, '#cfcdc4', 2);
  for (const z of zs) { const G = xsr.map(x => [x - R - 2.2, x + R + 2.2]); for (const [a, b] of gaps(-MX, MX, G.map(g => g.slice()))) { SW(a, b, z - R - 2.2, z - R); SW(a, b, z + R, z + R + 2.2); }
    for (const [a, b] of gaps(-MX, MX, xsr.map(x => [x - R, x + R]))) { pline(a, z, b, z, .16, '#d6c25a', true); pline(a, z + R - .4, b, z + R - .4, .12, '#cfcfc4'); pline(a, z - R + .4, b, z - R + .4, .12, '#cfcfc4'); } }
  for (const x of xsr) { const G = zs.map(z => [z - R - 2.2, z + R + 2.2]); for (const [a, b] of gaps(-MZ, MZ, G)) { SW(x - R - 2.2, x - R, a, b); SW(x + R, x + R + 2.2, a, b); } for (const [a, b] of gaps(-MZ, MZ, zs.map(z => [z - R, z + R]))) { pline(x, a, x, b, .16, '#d6c25a', true); pline(x + R - .4, a, x + R - .4, b, .12, '#cfcfc4'); pline(x - R + .4, a, x - R + .4, b, .12, '#cfcfc4'); } }
  { const geos = paint.map(p => { const g = new THREE.PlaneGeometry(p.w, p.l); g.rotateX(-Math.PI / 2); g.rotateY(p.ang); g.translate(p.x, .04, p.z); const n = g.attributes.position.count, c = new THREE.Color(p.c), a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r * .75; a[i * 3 + 1] = c.g * .75; a[i * 3 + 2] = c.b * .75; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g.toNonIndexed(); }); const m = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, polygonOffset: true, polygonOffsetFactor: -2 })); m.receiveShadow = true; root.add(m); }
  // ----- lots -> houses -----
  const lots = genLots(); const occupied = (l) => SPECIAL.some(s => Math.abs(s.cx - l.cx) < (s.w + l.w) / 2 && Math.abs(s.cz - l.cz) < (s.d + l.d) / 2 + .5) || (l.cx > 31 && l.cx < 62 && l.cz > -20 && l.cz < -2);
  const free = lots.filter(l => !occupied(l)).slice(0, CFG.HOUSES); W.lots = free; const nEnt = CFG.ENTERABLE;
  const entIdx = new Set(); { const stride = Math.max(1, Math.floor(free.length / nEnt)); for (let i = 2; entIdx.size < nEnt && i < free.length * 3; i += stride) entIdx.add(i % free.length); }
  W.closed = new Closed(W, scene); const rr = mulberry(77);
  free.forEach((l, i) => { l.enterable = entIdx.has(i); l.ci = Math.floor(rr() * COLORS.length); if (l.enterable) { const kind = 'house'; const bd = makeBuilding(W, { id: l.id, kind, cx: l.cx, cz: l.cz, w: l.w, d: l.d, face: l.face, ci: l.ci, locked: rr() < .6 ? 1 : 0, back: rr() < .5 ? 1 : 0 }); l.bd = bd; W.enterable.push(bd); }
    else { const v = Math.floor(rr() * 4); const dims = [[9, 8], [8.6, 8], [11, 7], [9, 8]][v]; l.v = v; const tint = new THREE.Color(COLORS[l.ci]).multiplyScalar(.55 + rr() * .3); W.closed.add(l, v, tint, new THREE.Color(['#d0c0b0', '#a8a8a2', '#c8a08c', '#9aa296'][Math.floor(rr() * 4)]).multiplyScalar(1)); const fw = (Math.abs(Math.sin(l.face === 'E' || l.face === 'W' ? 1 : 0)) ? dims[1] : dims[0]); const swap = l.face === 'E' || l.face === 'W'; const hx = (swap ? dims[1] : dims[0]) / 2, hz = (swap ? dims[0] : dims[1]) / 2; col.add(l.cx - hx, l.cx + hx, l.cz - hz, l.cz + hz, 'wall', true); } });
  W.closed.init(scene);
  for (const s of SPECIAL) { const bd = makeBuilding(W, s); W.enterable.push(bd); }
  // gas station: owned by the props helper (gas.js). The lot is reserved (GAS_LOT) and addGas(W) is called from the town via opts.hooks (before the statics are merged).
  for (const h of (opts.hooks || [])) h(W);
  // street furniture, fences, junk, lamp poles
  const lampMat = plain(M, 'dark', '#2a2d33'); for (const z of zs) for (let x = -MX + 40; x < MX - 30; x += 24) { if (xsr.some(xr => Math.abs(x - xr) < 8)) continue; for (const s of [-1, 1]) { const g = new THREE.CylinderGeometry(.08, .11, 6, 6); g.translate(x, 3, z + s * (R + 1.1)); B.addGeo('dark', g, null, '#2a2d33'); } }
  for (const l of free) { if (rnd() < .5) { const a = rnd() * 6.28; const bx = l.cx + (l.face === 'N' ? 1 : -1) * 0, by = l.cz; /* yard junk */ const jx = l.cx + (rnd() - .5) * 6, jz = l.cz + (l.side || 1) * (6 + rnd() * 2); B.bounds(rnd() < .5 ? 'plank' : 'rust', jx - .4, jx + .4, 0, .5 + rnd() * .5, jz - .4, jz + .4, '#a09070', 1); } if (rnd() < .45) { const z0 = l.road + l.side * 7.4; for (let k = -4; k <= 4; k++) { if (rnd() < .25) continue; const fx = l.cx + k * 1.1; B.bounds('plank', fx - .06, fx + .06, 0, 1.0 - rnd() * .3, z0 - .02, z0 + .02, '#cbc3b0', 1); } } }
  // decals: blood by bodies + inside enterables, cracks on roads
  for (const b of BODIES) W.decals.blood.push({ x: b.x, z: b.z, s: 2.2 + rnd() * 1.2, r: rnd() * 6.28 }); for (let i = 0; i < 30; i++) { const z = zs[Math.floor(rnd() * zs.length)]; W.decals.crack.push({ x: (rnd() - .5) * 150, z: z + (rnd() - .5) * 6, s: 3 + rnd() * 4, r: rnd() * 6.28 }); }
  for (const bd of W.enterable) for (let i = 0; i < 2 + Math.floor(rnd() * 2); i++) { const [wx, wz] = bd.toW((rnd() - .5) * (bd.cfg.w - 2), (rnd() - .5) * (bd.cfg.d - 2)); W.decals.blood.push({ x: wx, z: wz, s: 1.2 + rnd() * 1.2, r: rnd() * 6.28, y: .075 }); }
  for (const [k, tx] of [['blood', bloodTex(3)], ['crack', crackTex()]]) { const L = W.decals[k]; if (!L.length) continue; const geos = L.map(d => { const g = new THREE.PlaneGeometry(d.s, d.s); g.rotateX(-Math.PI / 2); g.rotateY(d.r); g.translate(d.x, d.y || (k === 'crack' ? .045 : .05), d.z); return g; }); const m = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshStandardMaterial({ map: tx, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, roughness: k === 'blood' ? .3 : 1, opacity: 1 })); m.receiveShadow = true; m.renderOrder = 1; root.add(m); }
  W.statics = B.build(scene, M);
  // weeds + trees (instanced)
  { const wt = weedTex(); const wm = new THREE.MeshStandardMaterial({ map: wt, alphaTest: .4, side: THREE.DoubleSide, roughness: 1, color: '#9aa070' }); const n = 700; const q1 = new THREE.PlaneGeometry(1.1, 1), q2 = q1.clone(); q2.rotateY(Math.PI / 2); const wg = mergeGeometries([q1.translate(0, .5, 0), q2.translate(0, .5, 0)]); const im = new THREE.InstancedMesh(wg, wm, n); const m4 = new THREE.Matrix4(); let c = 0;
    for (let i = 0; i < n * 3 && c < n; i++) { const x = (rnd() - .5) * 2 * (CFG.EXT + 30), z = (rnd() - .5) * 2 * (Math.abs(zs[0]) + 40); if (zs.some(zz => Math.abs(z - zz) < R + 2.5) || xsr.some(xx => Math.abs(x - xx) < R + 2.5)) continue; if (col.hit(x, z, .3)) continue; m4.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6), new THREE.Vector3(1 + rnd(), .7 + rnd() * 1.1, 1 + rnd())); im.setMatrixAt(c++, m4); } im.count = c; im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; root.add(im); }
  { const tr = new THREE.CylinderGeometry(.22, .34, 3.2, 7); tr.translate(0, 1.6, 0); const cn = (r, h, y) => { const g = new THREE.ConeGeometry(r, h, 8); g.translate(0, y, 0); return g; }; const parts = [[tr, '#5a3f2a'], [cn(2.5, 4.2, 4.1), '#35602f'], [cn(1.9, 3.4, 6.0), '#3d6d34'], [cn(1.2, 2.6, 7.6), '#477a3b']].map(([g, c]) => { const n = g.attributes.position.count, cc = new THREE.Color(c), a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = cc.r; a[i * 3 + 1] = cc.g; a[i * 3 + 2] = cc.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g.index ? g.toNonIndexed() : g; });
    const spots = []; const inTown = (x, z) => Math.abs(x) < CFG.EXT + 16 && Math.abs(z) < Math.abs(zs[zs.length - 1]) + 40; const onRoad = (x, z) => zs.some(zz => Math.abs(z - zz) < R + 3) || xsr.some(xx => Math.abs(x - xx) < R + 3);
    for (let i = 0; i < 4000 && spots.length < 820; i++) { const x = (rnd() - .5) * 2 * (BOUNDS.x + 4), z = (rnd() - .5) * 2 * (BOUNDS.z + 4); if (inTown(x, z) || onRoad(x, z)) continue; spots.push([x, z]); }
    for (let i = 0; i < 90; i++) { const x = (rnd() - .5) * 2 * (CFG.EXT + 12), z = (rnd() - .5) * 2 * (Math.abs(zs[0]) + 36); if (onRoad(x, z) || col.hit(x, z, 3.2)) continue; if (Math.abs(z) < 20 && Math.abs(x) < CFG.EXT) continue; if (free.some(l => Math.hypot(l.cx - x, l.cz - z) < 9)) continue; spots.push([x, z]); }
    const im = new THREE.InstancedMesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), spots.length); const m4 = new THREE.Matrix4(), cc = new THREE.Color(); spots.forEach(([x, z], i) => { const s = .8 + rnd() * .8; m4.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6), new THREE.Vector3(s, s * (.9 + rnd() * .4), s)); im.setMatrixAt(i, m4); cc.setScalar(.8 + rnd() * .35); im.setColorAt(i, cc); col.add(x - .35, x + .35, z - .35, z + .35, 'tree', true); }); im.castShadow = true; im.frustumCulled = false; root.add(im); W.treeCount = spots.length; W.trees = spots; }
  return W;
}
