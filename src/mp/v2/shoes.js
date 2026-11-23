// v2 shoes: real lofted shoe meshes fitted to each foot (no toe-shaped shells). Original procedural design, © Lone Keem Studios.
import * as THREE from 'three';
import { skinTo, bindMesh } from './headrig.js';

// per style: sole thickness, toe roundness (0 pointy .. 1 round), toe bulk, collar (m above the foot top at the heel), detail flags
// d: 1 laces, 2 clog holes, 3 canvas toecap, 4 heel strap, 5 slip-on (loafer), 6 plain/dress
export const SHOE_STYLE = {
  sneaker: { sole: .022, toe: .9, bulk: .012, col: .012, d: 1, line: 1 }, lowtop: { sole: .012, toe: .95, bulk: .006, col: .0, d: 3, line: 1 }, hightop: { sole: .016, toe: .95, bulk: .008, col: .045, d: 3, line: 1 },
  runner: { sole: .02, toe: .85, bulk: .009, col: .008, d: 1, line: 1 }, boot: { sole: .016, toe: .85, bulk: .012, col: .16, d: 6 }, ankleboot: { sole: .014, toe: .7, bulk: .008, col: .11, d: 6 },
  combat: { sole: .02, toe: .9, bulk: .014, col: .18, d: 1 }, kneeboot: { sole: .012, toe: .6, bulk: .008, col: .32, d: 6 }, thighboot: { sole: .012, toe: .6, bulk: .01, col: .48, d: 6 },
  flat: { sole: .006, toe: .6, bulk: .003, col: -.012, d: 6 }, loafer: { sole: .01, toe: .7, bulk: .005, col: -.006, d: 5 }, dress: { sole: .01, toe: .55, bulk: .005, col: -.004, d: 6 },
  chunky: { sole: .036, toe: 1, bulk: .016, col: .014, d: 1, line: 1 }, work: { sole: .022, toe: 1, bulk: .013, col: .16, d: 1 }, rain: { sole: .014, toe: .9, bulk: .01, col: .14, d: 6 },
  clog: { sole: .03, toe: 1, bulk: .02, col: -.01, d: 2, strap: 1 },
  platform: { sole: .05, toe: .95, bulk: .014, col: .012, d: 1, line: 1 },
  midtop: { sole: .016, toe: .95, bulk: .008, col: .028, d: 3, line: 1 },
  chelsea: { sole: .016, toe: .72, bulk: .009, col: .13, d: 6, elastic: 1 },
  hiking: { sole: .028, toe: .9, bulk: .016, col: .15, d: 1, line: 1 },
  slides: { sole: .024, toe: 1, bulk: .008, col: -.02, d: 7, slide: 1, vampStrap: 1 },
  mule: { sole: .016, toe: .85, bulk: .008, col: -.014, d: 6, openHeel: 1 },
  desert: { sole: .014, toe: .8, bulk: .01, col: .12, d: 6 },
  maryjane: { sole: .008, toe: .95, bulk: .004, col: -.01, d: 6, vampStrap: 1 },
};
const NU = 30, NV = 28;
function footBins(av, sd) {
  const key = '_fb' + sd; if (av[key]) return av[key];
  const g = av.skin.geometry, p = g.attributes.aP0 || g.attributes.position, w2 = g.attributes.aW2, n = p.count;
  let z0 = 9, z1 = -9; const pts = [];
  const ankY = av.tpl.P[(sd > 0 ? 'Left' : 'Right') + 'Foot'].y;
  for (let i = 0; i < n; i++) { const x = p.getX(i); if (Math.sign(x) !== sd) continue; const y = p.getY(i), z = p.getZ(i); if (!(w2.getZ(i) > .5 || (y < ankY + .09 && w2.getY(i) + w2.getZ(i) > .5))) continue; pts.push([x, y, z]); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const B = []; for (let k = 0; k < NU; k++) B.push({ x0: 9, x1: -9, y0: 9, y1: -9, n: 0 });
  for (const [x, y, z] of pts) { const k = Math.min(NU - 1, Math.floor((z - z0) / (z1 - z0) * NU)); const b = B[k]; b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x); b.y0 = Math.min(b.y0, y); b.y1 = Math.max(b.y1, y); b.n++; }
  for (let k = 0; k < NU; k++) if (!B[k].n) Object.assign(B[k], B[k - 1] || B[k + 1]);
  const sm = f => { for (let it = 0; it < 3; it++) { const v = B.map(b => b[f]); for (let k = 1; k < NU - 1; k++) B[k][f] = (v[k - 1] + 2 * v[k] + v[k + 1]) / 4; } };
  // the top of the foot falls monotonically from ankle to toe (cut the ankle bulge off at the heel)
  { const x0 = B.map(b => b.x0), x1 = B.map(b => b.x1); for (let k = 0; k < NU; k++) { for (let d = -3; d <= 3; d++) { const j = k + d; if (j < 0 || j >= NU) continue; B[k].x0 = Math.min(B[k].x0, x0[j] + Math.abs(d) * .002); B[k].x1 = Math.max(B[k].x1, x1[j] - Math.abs(d) * .002); } } }
  ['x0', 'x1', 'y1'].forEach(sm);
  return av[key] = { B, z0, z1, ground: Math.min(...B.map(b => b.y0)) };
}
function loft(av, sd, st) {
  const { B, z0, z1, ground } = footBins(av, sd); const m = .006 + st.bulk * .35; const len = z1 - z0;
  const P = av.tpl.P, ank = P[(sd > 0 ? 'Left' : 'Right') + 'Foot'];
  const pos = [], uv = [], idx = [];
  const rings = []; const capN = 5;
  const sect = (k) => { const b = B[k]; const u = (k + .5) / NU; let x0 = b.x0 - m, x1 = b.x1 + m; const toeK = Math.max(0, (u - .7) / .3); const extra = st.bulk * Math.sin(Math.min(1, u * 1.4) * Math.PI * .5); x0 -= extra * .4; x1 += extra * .4;
    let top = b.y1 + m + extra * .6;
    if (st.col > .06) { const shaft = ank.y + .02 + st.col; const heel = 1 - ss(.08, .4, u); top = Math.max(top, shaft * heel + top * (1 - heel)); const widen = .006 * heel * Math.min(1, st.col / .16); x0 -= widen; x1 += widen; }
    else if (st.col >= 0) top = Math.min(top, ank.y + .03 + st.col + .045 * ss(.22, .42, u) * (1 - ss(.55, .8, u)));
    else { const lo = ank.y + st.col; top = u < .5 ? Math.min(top, lo + (top - lo) * ss(.25, .6, u)) : top; }
    top = Math.max(top, ground + st.sole + .025 * (1 - toeK * .6));
    const soleLip = ground + st.sole + .006;
    if (st.slide) {
      const band = Math.exp(-Math.pow((u - 0.40) / 0.10, 2));
      top = soleLip + (Math.min(top, ank.y + .01) - soleLip) * band;
    } else {
      if (st.openToe) { const cut = ss(.52, .74, u); top = soleLip + (top - soleLip) * (1 - cut); }
      if (st.openHeel) { const cut = 1 - ss(.16, .40, u); top = soleLip + (top - soleLip) * (1 - cut * .96); }
    }
    return { x0, x1, y0: ground - .003, y1: top, z: z0 + u * len }; };
  for (let k = 0; k < NU; k++) rings.push(sect(k)); if (st.col >= 0) for (let k = 1; k < NU; k++) { const r = rings[k], pr = rings[k - 1]; const drop = (st.col > .06 ? .9 : 1.3) * (r.z - pr.z); r.y1 = Math.max(r.y1, Math.min(pr.y1, pr.y1 - drop)); }
  // rounded heel and toe caps
  const heel = rings[0], toe = rings[NU - 1]; const out = [];
  const soleLip = ground + st.sole + .008;
  for (let c = capN; c >= 1; c--) { const a = c / capN * Math.PI / 2; const f = Math.cos(a); const r = { ...heel }; const hw = (heel.x1 - heel.x0) / 2, xc = (heel.x1 + heel.x0) / 2; r.x0 = xc - hw * Math.max(.15, f); r.x1 = xc + hw * Math.max(.15, f); r.y1 = heel.y0 + (heel.y1 - heel.y0) * Math.max(.3, .3 + .7 * f); if (st.openHeel || st.slide) r.y1 = soleLip + Math.max(0, f) * .006; r.z = heel.z - .028 * Math.sin(a) - m * .3; r.u = 0; out.push(r); }
  rings.forEach((r, k) => { r.u = (k + .5) / NU; out.push(r); });
  const tr = st.toe; for (let c = 1; c <= capN; c++) { const a = c / capN * Math.PI / 2; const f = Math.cos(a); const r = { ...toe }; const hw = (toe.x1 - toe.x0) / 2, xc = (toe.x1 + toe.x0) / 2; const wf = Math.max(.12, Math.pow(f, .6 + (1 - tr) * .8)); r.x0 = xc - hw * wf; r.x1 = xc + hw * wf; r.y1 = toe.y0 + (toe.y1 - toe.y0) * Math.max(.25, Math.pow(f, .5)); if (st.openToe || st.slide) r.y1 = soleLip + Math.max(0, f) * .008; r.z = toe.z + (.012 + st.bulk * .8 + (1 - tr) * .02) * Math.sin(a); r.u = 1; out.push(r); }
  const N = out.length;
  for (let k = 0; k < N; k++) { const r = out[k]; const xc = (r.x0 + r.x1) / 2, hw = (r.x1 - r.x0) / 2, yc = (r.y0 + r.y1) / 2, hh = (r.y1 - r.y0) / 2;
    for (let j = 0; j <= NV; j++) { const th = j / NV * Math.PI * 2; const c = Math.cos(th), s = Math.sin(th); const e = s < 0 ? 4 : 2.6; const x = xc + hw * Math.sign(c) * Math.pow(Math.abs(c), 2 / e), y = yc + hh * Math.sign(s) * Math.pow(Math.abs(s), 2 / (s < 0 ? 6 : 2.4));
      pos.push(x, y, r.z); uv.push(k / (N - 1), j / NV, (y - r.y0) / Math.max(.001, r.y1 - r.y0), (x - xc) / hw); } }
  for (let k = 0; k < N - 1; k++) for (let j = 0; j < NV; j++) { const a = k * (NV + 1) + j, b = a + NV + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  // close ends
  const cap = (k, flip) => { const c0 = pos.length / 3; const r = out[k]; pos.push((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, r.z); uv.push(k / (N - 1), .25, .5, 0); for (let j = 0; j < NV; j++) { const a = k * (NV + 1) + j; flip ? idx.push(c0, a + 1, a) : idx.push(c0, a, a + 1); } };
  cap(0, false); cap(N - 1, true);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(uv, 4)); g.setIndex(idx); g.computeVertexNormals();
  if (sd < 0) { /* winding flips with mirrored x order? keep consistent: our ring order is the same handedness for both feet */ }
  return { g, ground, ank, len, z0 };
}
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function strap(av, sd, st, L) { // clog heel strap: half ring behind the ankle
  const { ank } = L; const pts = []; for (let i = 0; i <= 16; i++) { const a = Math.PI * (i / 16); pts.push(new THREE.Vector3(ank.x + Math.cos(a) * .046, ank.y - .012 - Math.sin(a) * .01, ank.z - Math.sin(a) * .05 + .012)); }
  const curve = new THREE.CatmullRomCurve3(pts); const g = new THREE.TubeGeometry(curve, 24, .006, 8, false); const n = g.attributes.position.count; const a = new Float32Array(n * 4).fill(0); for (let i = 0; i < n; i++) { a[i * 4] = .1; a[i * 4 + 1] = .25; a[i * 4 + 2] = .6; } g.setAttribute('aS', new THREE.BufferAttribute(a, 4)); g.deleteAttribute('uv'); return g; }
function vampStrap(av, sd, st, L) { // Mary Jane / slide instep strap over the midfoot
  const { ank, z0, len, ground } = L; const { B } = footBins(av, sd);
  const k = Math.min(NU - 1, Math.max(0, Math.floor(NU * 0.40)));
  const b = B[k]; const xc = (b.x0 + b.x1) / 2, hw = Math.max(0.02, (b.x1 - b.x0) / 2 + 0.006);
  const z = z0 + len * (st.slide ? 0.40 : 0.36);
  const y0 = ground + st.sole + 0.003, y1 = b.y1 + (st.slide ? 0.016 : 0.009);
  const pts = [];
  for (let i = 0; i <= 16; i++) { const a = Math.PI * (i / 16); pts.push(new THREE.Vector3(xc + Math.cos(a) * hw, y0 + Math.pow(Math.sin(a), 1.35) * (y1 - y0), z)); }
  const thick = st.slide ? 0.010 : 0.0045;
  const curve = new THREE.CatmullRomCurve3(pts); const g = new THREE.TubeGeometry(curve, 24, thick, 8, false);
  const n = g.attributes.position.count; const a = new Float32Array(n * 4).fill(0);
  for (let i = 0; i < n; i++) { a[i * 4] = .4; a[i * 4 + 1] = .25; a[i * 4 + 2] = .7; }
  g.setAttribute('aS', new THREE.BufferAttribute(a, 4)); g.deleteAttribute('uv'); return g; }
const MATS = new Map();
function shoeMaterial(up, sole, st) {
  const key = up + sole + st.d + (st.line || 0); if (MATS.has(key)) return MATS.get(key);
  const m = new THREE.MeshStandardMaterial({ color: '#fff', roughness: .62, metalness: 0, side: THREE.DoubleSide });
  const U = { uUp: { value: new THREE.Color(up) }, uSo: { value: new THREE.Color(sole) }, uSt: { value: new THREE.Vector4(st.d, st.sole, st.line || 0, st.strap ? 1 : (st.elastic ? 2 : 0)) } };
  m.onBeforeCompile = sh => { Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aS; varying vec4 vS; varying vec3 vB;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvS = aS; vB = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec4 vS; varying vec3 vB; uniform vec3 uUp, uSo; uniform vec4 uSt; float sH = 0.0;
vec3 shoeCol(){ float u = vS.x, v = vS.y, hr = vS.z, sx = vS.w; float d = uSt.x; vec3 c = uUp; float top = smoothstep(0.55, 0.85, hr);
  float soleT = uSt.y + 0.003; float yb = vB.y; float gy = yb - (vB.y - hr * 0.0); 
  return c; }
vec3 bumpS(vec3 surf, vec3 nrm, float hgt){ vec3 dx = dFdx(surf), dy = dFdy(surf); float hx = dFdx(hgt), hy = dFdy(hgt); vec3 r1 = cross(dy, nrm), r2 = cross(nrm, dx); float det = dot(dx, r1); vec3 g = sign(det) * (hx * r1 + hy * r2); return normalize(abs(det) * nrm - g); }
`).replace('#include <color_fragment>', `#include <color_fragment>
{ float u = vS.x, v = vS.y, hr = vS.z, sx = vS.w; float d = uSt.x; vec3 c = uUp; float h = 0.0;
  float sole = 1.0 - step(uSt.y, vB.y - uGround); float sl = 1.0 - smoothstep(0.0, 0.0025, abs(vB.y - uGround - uSt.y));
  bool topF = v > 0.08 && v < 0.42; float cx = abs(v - 0.25);
  if (d < 1.5) { // laces + tongue
    float lz = step(0.42, u) * step(u, 0.78) * step(cx, 0.05) * step(0.6, hr); float bar = step(0.55, fract(u * 30.0)); c = mix(c, c * 0.82, step(0.42, u) * step(u, 0.8) * step(cx, 0.075) * step(0.55, hr)); c = mix(c, vec3(0.96), lz * bar); h += 0.0012 * lz * bar;
    float eyelet = step(0.42, u) * step(u, 0.78) * (1.0 - smoothstep(0.004, 0.008, abs(cx - 0.062))) * step(0.6, hr); c *= 1.0 - 0.3 * eyelet; }
  if (d > 1.5 && d < 2.5) { vec2 q = vec2(u * 26.0, v * 44.0); vec2 f = fract(q) - 0.5; float hole = (1.0 - smoothstep(0.18, 0.26, length(f))) * step(0.52, u) * step(u, 0.95) * step(cx, 0.13) * step(0.5, hr); c = mix(c, c * 0.25, hole); h -= 0.0012 * hole; }
  if (d > 2.5 && d < 3.5) { float cap = step(0.86, u) * step(hr, 0.9); c = mix(c, uSo, cap * 0.9); float lz = step(0.4, u) * step(u, 0.8) * step(cx, 0.045) * step(0.6, hr) * step(0.5, fract(u * 26.0)); c = mix(c, vec3(0.97), lz); }
  if (d > 4.5 && d < 5.5) { float sd = (1.0 - smoothstep(0.0, 0.004, abs(u - 0.62))) * step(cx, 0.12) * step(0.5, hr); c *= 1.0 - 0.25 * sd; }
  if (d > 5.7 && d < 6.5 && uSt.w > 1.5) { float el = step(0.12, u) * step(u, 0.55) * step(0.02, cx) * step(cx, 0.22) * step(0.45, hr); c = mix(c, c * 0.45, el); }
  if (u < 0.3 && hr > 0.88) { c *= 0.85; h += 0.001; } // padded collar
  c = mix(c, uSo, sole); c *= 1.0 - 0.35 * sl; h += 0.0015 * sl;
  if (uSt.z > 0.5) { float st = (1.0 - smoothstep(0.0, 0.0018, abs(vB.y - uGround - uSt.y - 0.006))) * step(0.18, u) * step(u, 0.95); c = mix(c, c * 0.8, st); }
  if (sole > 0.5) { h += 0.0008 * step(0.5, fract((vB.y - uGround) * 300.0)) * step(abs(v - 0.75), 0.2); }
  float fib = fract(sin(dot(floor(vB * 1500.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453); c *= 0.97 + 0.05 * fib;
  diffuseColor.rgb = c; sH = h; }`).replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n normal = bumpS(-vViewPosition, normal, sH * 1.0);').replace('uniform vec3 uUp, uSo;', 'uniform vec3 uUp, uSo; uniform float uGround;'); sh.uniforms.uGround = m.userData.ground; };
  m.userData.ground = { value: 0 }; m.customProgramCacheKey = () => 'shoe2';
  MATS.set(key, m); return m;
}
export function buildShoes(av, piece) {
  if (av.shoes2) { av.shoes2.forEach(m => { m.parent && m.parent.remove(m); m.geometry.dispose(); }); av.shoes2 = null; }
  if (!piece || piece.id === 'socks') return false; const st = SHOE_STYLE[piece.id] || SHOE_STYLE.sneaker;
  const P = av.tpl.P; const out = [];
  for (const sd of [1, -1]) { const S = sd > 0 ? 'Left' : 'Right'; const L = loft(av, sd, st); const geos = [L.g]; if (st.strap) geos.push(strap(av, sd, st, L)); if (st.vampStrap) geos.push(vampStrap(av, sd, st, L));
    const toe = P[S + 'ToeBase']; const mat = shoeMaterial(piece.c, piece.sole || '#f2f2f0', st); mat.userData.ground.value = L.ground;
    for (const g of geos) { skinTo(av, g, (i, x, y, z) => { const k = ss(toe.z - .02, toe.z + .025, z); return k > 0 ? [[S + 'Foot', 1 - k], [S + 'ToeBase', k]] : [[S + 'Foot', 1]]; });
      const mesh = new THREE.SkinnedMesh(g, mat); bindMesh(av, mesh, 1); out.push(mesh); } }
  av.shoes2 = out; return true;
}
