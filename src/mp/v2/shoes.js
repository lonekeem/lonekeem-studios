// v2 shoes: lofted cartoon meshes fitted to each foot. Original procedural designs, © Lone Keem Studios.
import * as THREE from 'three';
import { skinTo, bindMesh } from './headrig.js';
import * as C from '../catalog.js';

// per style: sole thickness, toe roundness (0 pointy .. 1 round), toe bulk, collar (m above the foot top at the heel), detail flags
// d: 1 laces, 2 clog holes, 3 canvas toecap + laces, 4 heel strap, 5 slip-on / loafer, 6 plain/dress, 7 open sandal
export const SHOE_STYLE = {
  sneaker: { sole: .022, toe: .9, bulk: .012, col: .012, d: 1, line: 1 },
  lowtop: { sole: .012, toe: .95, bulk: .006, col: .0, d: 3, line: 1 },
  hightop: { sole: .016, toe: .95, bulk: .008, col: .045, d: 3, line: 1 },
  runner: { sole: .02, toe: .85, bulk: .009, col: .008, d: 1, line: 1 },
  boot: { sole: .016, toe: .85, bulk: .012, col: .16, d: 6 },
  ankleboot: { sole: .014, toe: .7, bulk: .008, col: .11, d: 6 },
  combat: { sole: .02, toe: .9, bulk: .014, col: .18, d: 1 },
  kneeboot: { sole: .012, toe: .6, bulk: .008, col: .32, d: 6 },
  thighboot: { sole: .012, toe: .6, bulk: .01, col: .48, d: 6 },
  flat: { sole: .006, toe: .6, bulk: .003, col: -.012, d: 6 },
  loafer: { sole: .01, toe: .7, bulk: .005, col: -.006, d: 5 },
  dress: { sole: .01, toe: .55, bulk: .005, col: -.004, d: 6 },
  chunky: { sole: .036, toe: 1, bulk: .016, col: .014, d: 1, line: 1 },
  work: { sole: .022, toe: 1, bulk: .013, col: .16, d: 1 },
  rain: { sole: .014, toe: .9, bulk: .01, col: .14, d: 6 },
  clog: { sole: .03, toe: 1, bulk: .02, col: -.01, d: 2, strap: 1 },
  platform: { sole: .05, toe: .95, bulk: .014, col: .012, d: 1, line: 1 },
  midtop: { sole: .016, toe: .95, bulk: .008, col: .028, d: 3, line: 1 },
  chelsea: { sole: .016, toe: .72, bulk: .009, col: .13, d: 6, elastic: 1 },
  hiking: { sole: .028, toe: .9, bulk: .016, col: .15, d: 1, line: 1 },
  slides: { sole: .024, toe: 1, bulk: .008, col: -.02, d: 7, slide: 1, vampStrap: 1 },
  mule: { sole: .016, toe: .85, bulk: .008, col: -.014, d: 6, openHeel: 1 },
  desert: { sole: .014, toe: .8, bulk: .01, col: .12, d: 6 },
  maryjane: { sole: .008, toe: .95, bulk: .004, col: -.01, d: 6, vampStrap: 1 },
  // new silhouettes
  slipon: { sole: .014, toe: .95, bulk: .007, col: .0, d: 5, line: 1 },
  skate: { sole: .018, toe: 1, bulk: .015, col: .006, d: 1, line: 1 },
  basketball: { sole: .024, toe: .95, bulk: .02, col: .055, d: 1, line: 1 },
  dadshoe: { sole: .044, toe: 1, bulk: .022, col: .01, d: 1, line: 1 },
  court: { sole: .01, toe: .9, bulk: .005, col: .0, d: 3, line: 1 },
  sockrun: { sole: .018, toe: .9, bulk: .004, col: .006, d: 6 },
  cowboy: { sole: .014, toe: .16, bulk: .006, col: .24, d: 6, heel: .05, cowboyV: 1 },
  snowboot: { sole: .036, toe: 1, bulk: .028, col: .22, d: 6, puffy: 1 },
  welly: { sole: .016, toe: .9, bulk: .015, col: .3, d: 6 },
  shearling: { sole: .022, toe: 1, bulk: .024, col: .18, d: 6, puffy: 1 },
  chukka: { sole: .014, toe: .75, bulk: .009, col: .1, d: 1 },
  riding: { sole: .01, toe: .5, bulk: .006, col: .3, d: 6, heel: .02 },
  motoboots: { sole: .022, toe: .68, bulk: .014, col: .16, d: 1, heel: .022 },
  flipflop: { sole: .012, toe: 1, bulk: .004, col: -.02, d: 7, openToe: 1, openHeel: 1, thong: 1 },
  sportsand: { sole: .016, toe: 1, bulk: .006, col: -.016, d: 7, openToe: 1, openHeel: 1, straps: [.3, .5] },
  gladiator: { sole: .01, toe: .9, bulk: .005, col: -.016, d: 7, openToe: 1, straps: [.22, .38, .54], ankleRing: 1 },
  wedgesand: { sole: .01, toe: .95, bulk: .006, col: -.016, d: 7, openToe: 1, openHeel: 1, heel: .05, wedge: 1, vampStrap: 1 },
  platsand: { sole: .042, toe: 1, bulk: .008, col: -.016, d: 7, openToe: 1, openHeel: 1, vampStrap: 1 },
  fisherman: { sole: .012, toe: .88, bulk: .006, col: -.012, d: 7, openToe: 1, straps: [.48, .7] },
  oxford: { sole: .01, toe: .48, bulk: .005, col: -.004, d: 6, captoe: 1 },
  derby: { sole: .012, toe: .55, bulk: .006, col: -.002, d: 1 },
  monk: { sole: .01, toe: .55, bulk: .005, col: -.004, d: 6, vampStrap: 1 },
  brogue: { sole: .01, toe: .5, bulk: .005, col: -.004, d: 6, brogue: 1, captoe: 1 },
  boat: { sole: .012, toe: .85, bulk: .007, col: -.006, d: 5, line: 1 },
  espadrille: { sole: .02, toe: .9, bulk: .006, col: -.01, d: 6 },
  moccasin: { sole: .008, toe: .95, bulk: .009, col: -.008, d: 5 },
  driving: { sole: .006, toe: .9, bulk: .005, col: -.01, d: 5 },
  pump: { sole: .008, toe: .32, bulk: .003, col: -.012, d: 6, heel: .052 },
  blockheel: { sole: .01, toe: .42, bulk: .004, col: -.01, d: 6, heel: .048, block: 1 },
  stiletto: { sole: .006, toe: .26, bulk: .002, col: -.012, d: 6, heel: .072, spike: 1 },
  kitten: { sole: .007, toe: .38, bulk: .003, col: -.012, d: 6, heel: .028 },
  wedgeheel: { sole: .01, toe: .48, bulk: .005, col: -.01, d: 6, heel: .05, wedge: 1 },
  platheel: { sole: .04, toe: .42, bulk: .006, col: -.008, d: 6, heel: .055 },
  ballet: { sole: .005, toe: .85, bulk: .002, col: -.016, d: 6 },
  pointflat: { sole: .006, toe: .28, bulk: .002, col: -.012, d: 6 },
  tstrap: { sole: .008, toe: .9, bulk: .003, col: -.01, d: 6, vampStrap: 1, tstrap: 1 },
  cleat: { sole: .016, toe: .85, bulk: .01, col: .01, d: 1, cleats: 1 },
  football: { sole: .02, toe: .9, bulk: .012, col: .06, d: 1, cleats: 2 },
  trackspike: { sole: .012, toe: .68, bulk: .008, col: .004, d: 1, cleats: 3 },
  slipper: { sole: .01, toe: 1, bulk: .014, col: -.006, d: 6, puffy: 1 },
  jazz: { sole: .006, toe: .8, bulk: .003, col: -.006, d: 5 },
  watershoe: { sole: .01, toe: 1, bulk: .008, col: .0, d: 2 },
  platclog: { sole: .046, toe: 1, bulk: .02, col: -.01, d: 2, strap: 1 },
  tassel: { sole: .01, toe: .7, bulk: .005, col: -.006, d: 5, tassel: 1 },
  heelboot: { sole: .014, toe: .52, bulk: .008, col: .12, d: 6, heel: .042 },
};

export const SOCK_IDS = new Set(['socks', 'kneesock']);

const NU = 30, NV = 28;
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

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
  { const x0 = B.map(b => b.x0), x1 = B.map(b => b.x1); for (let k = 0; k < NU; k++) { for (let d = -3; d <= 3; d++) { const j = k + d; if (j < 0 || j >= NU) continue; B[k].x0 = Math.min(B[k].x0, x0[j] + Math.abs(d) * .002); B[k].x1 = Math.max(B[k].x1, x1[j] - Math.abs(d) * .002); } } }
  ['x0', 'x1', 'y1'].forEach(sm);
  return av[key] = { B, z0, z1, ground: Math.min(...B.map(b => b.y0)) };
}

function heelDrop(st, u) {
  const h = st.heel || 0; if (!h) return 0;
  const span = st.wedge ? 0.92 : 0.64;
  return h * Math.pow(1 - Math.min(1, u / span), st.wedge ? 0.7 : 1.35);
}

function loft(av, sd, st) {
  const { B, z0, z1, ground } = footBins(av, sd); const m = .006 + st.bulk * .35; const len = z1 - z0;
  const P = av.tpl.P, ank = P[(sd > 0 ? 'Left' : 'Right') + 'Foot'];
  const pos = [], uv = [], idx = [];
  const rings = []; const capN = 5;
  const heelB = B[Math.min(2, NU - 1)];
  const heelHalf = (heelB.x1 - heelB.x0) / 2;
  const sect = (k) => {
    const b = B[k]; const u = (k + .5) / NU;
    const pad = .014 + st.bulk * .5;
    let x0 = b.x0 - pad, x1 = b.x1 + pad;
    const toeK = Math.max(0, (u - .7) / .3); const extra = st.bulk * Math.sin(Math.min(1, u * 1.4) * Math.PI * .5);
    x0 -= extra * .4; x1 += extra * .4;
    const instep = Math.sin(Math.PI * ss(.16, .28, u) * (1 - ss(.58, .8, u)));
    let top = b.y1 + pad + extra * .6 + instep * .01;
    if (st.col > .06) {
      const shaft = ank.y + .02 + st.col;
      const fade0 = st.cowboyV ? .12 : .08, fade1 = st.cowboyV ? .52 : .42;
      const heel = 1 - ss(fade0, fade1, u);
      let shaftTop = shaft;
      if (st.cowboyV) shaftTop = shaft - 0.042 * ss(.16, .48, u);
      top = Math.max(top, shaftTop * heel + top * (1 - heel));
      const xc = (x0 + x1) / 2;
      const footHalf = (x1 - x0) / 2;
      let shaftHalf = heelHalf + pad + .005 + (st.puffy ? .016 : 0);
      shaftHalf += (st.cowboyV ? .01 : .004) * heel * ss(.55, 1, (shaftTop - (b.y1 + pad)) / Math.max(.04, st.col));
      const half = footHalf * (1 - heel) + shaftHalf * heel;
      x0 = xc - half; x1 = xc + half;
    } else if (st.col >= 0) {
      top = Math.min(top, ank.y + .028 + st.col + .04 * ss(.22, .42, u) * (1 - ss(.55, .8, u)));
    } else {
      // Low, level U-shaped opening around the ankle; rise only over the vamp.
      const cover = b.y1 + .012 + instep * .01;
      const collar = Math.max(ground + st.sole + .018, ank.y - 0.022 + Math.min(st.col, 0) * 0.5);
      const open = 1 - ss(.26, .60, u);
      top = cover * (1 - open) + collar * open;
      if (open < 0.45) top = Math.max(top, cover);
    }
    // Wedges fill the arch; post heels keep a thin sole so the heel reads as a separate piece.
    const drop = st.wedge ? heelDrop(st, u) : 0;
    const y0 = ground - .003 - drop;
    if (st.col >= 0) {
      top = Math.max(top, ground + st.sole + .025 * (1 - toeK * .6));
      top = Math.max(top, b.y1 + .01);
    } else if (u > 0.48) {
      top = Math.max(top, b.y1 + .012 + instep * .008);
    }
    if (st.puffy && st.col < .06) { x0 -= .006; x1 += .006; top += .006; }
    const soleLip = y0 + st.sole + drop + .006;
    if (st.thong || (st.straps && st.openToe)) {
      top = soleLip + (st.thong ? .002 : .005);
    } else if (st.slide) {
      const band = Math.exp(-Math.pow((u - 0.40) / 0.10, 2));
      top = soleLip + (Math.min(top, ank.y + .01) - soleLip) * band;
    } else {
      if (st.openToe) { const cut = ss(.52, .74, u); top = soleLip + (top - soleLip) * (1 - cut); }
      if (st.openHeel) { const cut = 1 - ss(.16, .40, u); top = soleLip + (top - soleLip) * (1 - cut * .96); }
    }
    return { x0, x1, y0, y1: top, z: z0 + u * len, u, bx0: b.x0, bx1: b.x1, by1: b.y1 };
  };
  for (let k = 0; k < NU; k++) rings.push(sect(k));
  for (let it = 0; it < 4; it++) {
    const y = rings.map(r => r.y1), x0s = rings.map(r => r.x0), x1s = rings.map(r => r.x1);
    for (let k = 1; k < NU - 1; k++) {
      rings[k].y1 = (y[k - 1] + 2 * y[k] + y[k + 1]) / 4;
      rings[k].x0 = (x0s[k - 1] + 2 * x0s[k] + x0s[k + 1]) / 4;
      rings[k].x1 = (x1s[k - 1] + 2 * x1s[k] + x1s[k + 1]) / 4;
    }
  }
  if (st.col >= 0) for (let k = 1; k < NU; k++) { const r = rings[k], pr = rings[k - 1]; const drop = (st.col > .06 ? .9 : 1.3) * (r.z - pr.z); r.y1 = Math.max(r.y1, Math.min(pr.y1, pr.y1 - drop)); }
  const heel = rings[0], toe = rings[NU - 1]; const out = [];
  const heelLip = heel.y0 + st.sole + .008;
  for (let c = capN; c >= 1; c--) { const a = c / capN * Math.PI / 2; const f = Math.cos(a); const r = { ...heel }; const hw = (heel.x1 - heel.x0) / 2, xc = (heel.x1 + heel.x0) / 2; r.x0 = xc - hw * Math.max(.15, f); r.x1 = xc + hw * Math.max(.15, f); r.y1 = heel.y0 + (heel.y1 - heel.y0) * Math.max(.3, .3 + .7 * f); if (st.openHeel || st.slide) r.y1 = heelLip + Math.max(0, f) * .006; r.z = heel.z - .028 * Math.sin(a) - m * .3; r.u = 0; out.push(r); }
  rings.forEach((r, k) => { r.u = (k + .5) / NU; out.push(r); });
  const tr = st.toe; const toeLip = toe.y0 + st.sole + .008;
  for (let c = 1; c <= capN; c++) { const a = c / capN * Math.PI / 2; const f = Math.cos(a); const r = { ...toe }; const hw = (toe.x1 - toe.x0) / 2, xc = (toe.x1 + toe.x0) / 2; const wf = Math.max(.12, Math.pow(f, .6 + (1 - tr) * .8)); r.x0 = xc - hw * wf; r.x1 = xc + hw * wf; r.y1 = toe.y0 + (toe.y1 - toe.y0) * Math.max(.25, Math.pow(f, .5)); if (st.openToe || st.slide) r.y1 = toeLip + Math.max(0, f) * (st.thong ? .002 : .005); r.z = toe.z + (.012 + st.bulk * .8 + (1 - tr) * .02) * Math.sin(a); r.u = 1; out.push(r); }
  const N = out.length;
  for (let k = 0; k < N; k++) { const r = out[k]; const xc = (r.x0 + r.x1) / 2, hw = (r.x1 - r.x0) / 2, yc = (r.y0 + r.y1) / 2, hh = (r.y1 - r.y0) / 2;
    const fx0 = (r.bx0 != null ? r.bx0 : r.x0 + .004) - .006, fx1 = (r.bx1 != null ? r.bx1 : r.x1 - .004) + .006, fy1 = (r.by1 != null ? r.by1 : r.y1) + .006, fy0 = r.y0 + .002;
    for (let j = 0; j <= NV; j++) { const th = j / NV * Math.PI * 2; const c = Math.cos(th), s = Math.sin(th);
      const nX = s < 0 ? 6 : 8, nY = s < 0 ? 6 : 8;
      let x = xc + hw * Math.sign(c) * Math.pow(Math.abs(c), 2 / nX), y = yc + hh * Math.sign(s) * Math.pow(Math.abs(s), 2 / nY);
      if (x > fx0 && x < fx1 && y > fy0 && y < fy1) {
        const dx = x - xc, dy = y - yc; let t = 1e9;
        if (dx > 1e-6) t = Math.min(t, (fx1 - xc) / dx);
        if (dx < -1e-6) t = Math.min(t, (fx0 - xc) / dx);
        if (dy > 1e-6) t = Math.min(t, (fy1 - yc) / dy);
        if (dy < -1e-6) t = Math.min(t, (fy0 - yc) / dy);
        if (t < 1e8) { x = xc + dx * t; y = yc + dy * t; }
      }
      pos.push(x, y, r.z); uv.push(k / (N - 1), j / NV, (y - r.y0) / Math.max(.001, r.y1 - r.y0), (x - xc) / Math.max(.001, hw)); } }
  for (let k = 0; k < N - 1; k++) for (let j = 0; j < NV; j++) { const a = k * (NV + 1) + j, b = a + NV + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const cap = (k, flip) => { const c0 = pos.length / 3; const r = out[k]; pos.push((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, r.z); uv.push(k / (N - 1), .25, .5, 0); for (let j = 0; j < NV; j++) { const a = k * (NV + 1) + j; flip ? idx.push(c0, a + 1, a) : idx.push(c0, a, a + 1); } };
  cap(0, false); cap(N - 1, true);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(uv, 4)); g.setIndex(idx); g.computeVertexNormals();
  return { g, ground, ank, len, z0, z1 };
}

function tagTube(g, u, v, hr) {
  const n = g.attributes.position.count; const a = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { a[i * 4] = u; a[i * 4 + 1] = v; a[i * 4 + 2] = hr; a[i * 4 + 3] = 0; }
  g.setAttribute('aS', new THREE.BufferAttribute(a, 4)); if (g.getAttribute('uv')) g.deleteAttribute('uv'); return g;
}
function strap(av, sd, st, L) {
  const { ank } = L; const pts = []; for (let i = 0; i <= 16; i++) { const a = Math.PI * (i / 16); pts.push(new THREE.Vector3(ank.x + Math.cos(a) * .046, ank.y - .012 - Math.sin(a) * .01, ank.z - Math.sin(a) * .05 + .012)); }
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, .006, 8, false); return tagTube(g, .1, .25, .6);
}
function vampAt(av, sd, st, L, u, thick) {
  const { z0, len, ground } = L; const { B } = footBins(av, sd);
  const k = Math.min(NU - 1, Math.max(0, Math.floor(NU * u)));
  const b = B[k]; const xc = (b.x0 + b.x1) / 2, hw = Math.max(0.02, (b.x1 - b.x0) / 2 + 0.006);
  const z = z0 + len * u;
  const y0 = ground + st.sole + 0.003, y1 = b.y1 + (st.slide ? 0.016 : 0.014);
  const pts = [];
  for (let i = 0; i <= 16; i++) { const a = Math.PI * (i / 16); pts.push(new THREE.Vector3(xc + Math.cos(a) * hw, y0 + Math.pow(Math.sin(a), 1.35) * (y1 - y0), z)); }
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, thick, 8, false); return tagTube(g, u, .25, .7);
}
function vampStrap(av, sd, st, L) { return vampAt(av, sd, st, L, st.slide ? 0.40 : 0.36, st.slide ? 0.010 : 0.0045); }
function tStrap(av, sd, st, L) {
  const { z0, len, ground, ank } = L; const { B } = footBins(av, sd);
  const k = Math.min(NU - 1, Math.floor(NU * 0.36));
  const b = B[k]; const xc = (b.x0 + b.x1) / 2;
  const zMid = z0 + len * 0.36, zAnk = ank.z;
  const y = b.y1 + 0.008;
  const pts = [new THREE.Vector3(xc, y, zMid), new THREE.Vector3(xc, Math.max(y, ank.y + .01), (zMid + zAnk) / 2), new THREE.Vector3(xc, ank.y + .012, zAnk + .01)];
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.0035, 6, false); return tagTube(g, .3, .25, .75);
}
function thong(av, sd, st, L) {
  const { z0, len, ground } = L; const { B } = footBins(av, sd);
  const k = Math.min(NU - 1, Math.floor(NU * 0.80));
  const b = B[k]; const hw = Math.max(0.016, (b.x1 - b.x0) / 2);
  const xc = (b.x0 + b.x1) / 2 + sd * hw * 0.22;
  const z = z0 + len * 0.80;
  const y0 = ground + st.sole + 0.002, y1 = b.y1 + 0.01;
  const post = [new THREE.Vector3(xc, y0, z), new THREE.Vector3(xc, y1, z)];
  const g1 = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(post), 6, 0.0032, 6, false);
  const k2 = Math.min(NU - 1, Math.floor(NU * 0.42));
  const b2 = B[k2]; const z2 = z0 + len * 0.42; const y2 = ground + st.sole + 0.004;
  const left = [new THREE.Vector3(xc, y1, z), new THREE.Vector3(b2.x0 - 0.004, (y1 + y2) * .5, (z + z2) * .5), new THREE.Vector3(b2.x0 - 0.002, y2, z2)];
  const right = [new THREE.Vector3(xc, y1, z), new THREE.Vector3(b2.x1 + 0.004, (y1 + y2) * .5, (z + z2) * .5), new THREE.Vector3(b2.x1 + 0.002, y2, z2)];
  const g2 = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(left), 10, 0.0036, 6, false);
  const g3 = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(right), 10, 0.0036, 6, false);
  return [tagTube(g1, .8, .25, .8), tagTube(g2, .5, .25, .75), tagTube(g3, .5, .25, .75)];
}
function ankleRing(av, sd, st, L) {
  const { ank } = L; const { B } = footBins(av, sd);
  const hb = B[Math.min(3, NU - 1)];
  const r = Math.max(0.026, (hb.x1 - hb.x0) / 2 + 0.008);
  const pts = []; for (let i = 0; i <= 20; i++) { const a = (i / 20) * Math.PI * 2; pts.push(new THREE.Vector3(ank.x + Math.cos(a) * r, ank.y + .006, ank.z + Math.sin(a) * r * 0.7)); }
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.0042, 6, true); return tagTube(g, .15, .25, .7);
}
function heelPost(av, sd, st, L) {
  const { z0, len, ground } = L; const { B } = footBins(av, sd);
  const u = 0.10; const k = Math.max(0, Math.floor(NU * u)); const b = B[k];
  const xc = (b.x0 + b.x1) / 2, z = z0 + len * u;
  const y1 = ground + 0.001;
  const y0 = ground - (st.heel || 0) - 0.002;
  const h = Math.max(0.012, y1 - y0);
  const topR = st.block ? 0.015 : (st.spike ? 0.0038 : (st.cowboyV ? 0.009 : 0.007));
  const botR = st.block ? 0.017 : (st.spike ? 0.0065 : (st.cowboyV ? 0.012 : 0.0095));
  const g = new THREE.CylinderGeometry(topR, botR, h, st.spike ? 8 : 12);
  g.translate(xc, (y0 + y1) / 2, z);
  return tagTube(g, 0.08, 0.75, 0.05);
}
function cleatStuds(av, sd, st, L) {
  const { z0, len, ground } = L; const { B } = footBins(av, sd);
  const kind = st.cleats || 1;
  const us = kind === 3 ? [0.22, 0.4, 0.62, 0.8, 0.9] : kind === 2 ? [0.18, 0.32, 0.5, 0.62, 0.78, 0.9] : [0.2, 0.38, 0.55, 0.72, 0.86];
  const geos = [];
  for (const u of us) {
    const k = Math.min(NU - 1, Math.max(0, Math.floor(NU * u)));
    const b = B[k]; const z = z0 + len * u;
    const y = ground - 0.002 - heelDrop(st, u);
    const xs = kind === 3 ? [(b.x0 + b.x1) / 2] : [b.x0 + 0.008, b.x1 - 0.008];
    for (const x of xs) {
      const h = kind === 3 ? 0.01 : 0.012;
      const g = new THREE.ConeGeometry(kind === 3 ? 0.0035 : 0.0055, h, 6);
      g.rotateX(Math.PI); g.translate(x, y - h * 0.45, z);
      geos.push(tagTube(g, u, 0.75, 0.02));
    }
  }
  return geos;
}
function tasselDrops(av, sd, st, L) {
  const { z0, len } = L; const { B } = footBins(av, sd);
  const k = Math.min(NU - 1, Math.floor(NU * 0.52));
  const b = B[k]; const xc = (b.x0 + b.x1) / 2, z = z0 + len * 0.52;
  const y = b.y1 + 0.01;
  const geos = [];
  for (const s of [-1, 1]) {
    const g = new THREE.SphereGeometry(0.006, 10, 8);
    g.scale(0.7, 2.1, 0.7); g.translate(xc + s * 0.013, y - 0.006, z + 0.014);
    geos.push(tagTube(g, 0.52, 0.25, 0.85));
  }
  return geos;
}

function shoeMaterial(piece, st) {
  const up = piece.c || '#222'; const sole = piece.sole || '#f2f2f0';
  const acc = piece.c2 || '#ffffff'; const lace = piece.lace || '#f2f2f0';
  const pat = piece.sp != null ? piece.sp : 0;
  const m = new THREE.MeshStandardMaterial({ color: '#fff', roughness: pat === 8 ? .38 : .62, metalness: pat === 8 ? .18 : 0, side: THREE.DoubleSide });
  const U = {
    uUp: { value: new THREE.Color(up) }, uSo: { value: new THREE.Color(sole) },
    uAc: { value: new THREE.Color(acc) }, uLace: { value: new THREE.Color(lace) },
    uSt: { value: new THREE.Vector4(st.d, st.sole, st.line || 0, (st.strap ? 1 : 0) + (st.elastic ? 2 : 0) + (st.captoe ? 4 : 0) + (st.brogue ? 8 : 0)) },
    uPat: { value: new THREE.Vector4(pat, 0, 0, 0) },
  };
  m.onBeforeCompile = sh => { Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aS; varying vec4 vS; varying vec3 vB;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvS = aS; vB = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec4 vS; varying vec3 vB; uniform vec3 uUp, uSo, uAc, uLace; uniform vec4 uSt, uPat; uniform float uGround; float sH = 0.0;
vec3 bumpS(vec3 surf, vec3 nrm, float hgt){ vec3 dx = dFdx(surf), dy = dFdy(surf); float hx = dFdx(hgt), hy = dFdy(hgt); vec3 r1 = cross(dy, nrm), r2 = cross(nrm, dx); float det = dot(dx, r1); vec3 g = sign(det) * (hx * r1 + hy * r2); return normalize(abs(det) * nrm - g); }
float hash21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec3 shoePat(vec3 base, vec3 ac, float u, float v, float hr){
  float id = uPat.x;
  if (id < 0.5) return base;
  if (id < 1.5) { // two-tone: accent toe + heel panel
    float zone = step(0.78, u) + step(u, 0.18);
    return mix(base, ac, zone * step(0.15, hr));
  }
  if (id < 2.5) { // stripes along the shoe
    float s = step(0.5, fract((u * 7.0 + v * 0.2)));
    return mix(base, ac, s * step(0.2, hr));
  }
  if (id < 3.5) { // camo blobs
    float a = hash21(floor(vec2(u, v) * vec2(14.0, 18.0)));
    float b = hash21(floor(vec2(u, v) * vec2(8.0, 10.0) + 3.1));
    float k = smoothstep(0.45, 0.7, a) * 0.7 + smoothstep(0.55, 0.8, b) * 0.5;
    return mix(base, mix(ac, base * 0.55, b), k * step(0.18, hr));
  }
  if (id < 4.5) { // checker
    float ck = step(0.5, fract(floor(u * 10.0) * 0.5 + floor(v * 8.0) * 0.5));
    return mix(base, ac, ck * step(0.18, hr));
  }
  if (id < 5.5) { // splatter
    float sp = hash21(floor(vec2(u, hr) * 40.0));
    float drop = smoothstep(0.78, 0.92, sp);
    return mix(base, ac, drop * step(0.2, hr));
  }
  if (id < 6.5) { // flames from the toe
    float t = smoothstep(0.45, 0.95, u);
    float w = 0.5 + 0.5 * sin(v * 18.0 + u * 10.0);
    float fl = t * smoothstep(0.15, 0.7, w) * step(0.2, hr);
    return mix(base, mix(ac, vec3(1.0, 0.55, 0.12), 1.0 - t), fl);
  }
  if (id < 7.5) { // stars
    vec2 g = fract(vec2(u, v) * vec2(8.0, 6.0)) - 0.5;
    float star = 1.0 - smoothstep(0.08, 0.16, length(g) * (1.0 + 0.6 * abs(g.x * g.y) * 40.0));
    return mix(base, ac, star * step(0.22, hr));
  }
  // glitter-ish: sparkly accent flecks
  float g1 = hash21(floor(vB.xy * 220.0));
  float g2 = hash21(floor(vB.zy * 180.0 + 4.2));
  float spark = step(0.86, g1) * (0.5 + 0.5 * g2);
  return mix(base, mix(ac, vec3(1.0), 0.45), 0.15 + 0.85 * spark) * (0.92 + 0.16 * g2);
}
`).replace('#include <color_fragment>', `#include <color_fragment>
{ float u = vS.x, v = vS.y, hr = vS.z, sx = vS.w; float d = uSt.x; vec3 c = uUp; float h = 0.0;
  float sole = 1.0 - step(uSt.y, vB.y - uGround); float sl = 1.0 - smoothstep(0.0, 0.0025, abs(vB.y - uGround - uSt.y));
  bool topF = v > 0.08 && v < 0.42; float cx = abs(v - 0.25);
  c = shoePat(c, uAc, u, v, hr);
  if (d < 1.5) { // laces + tongue
    float lz = step(0.42, u) * step(u, 0.78) * step(cx, 0.05) * step(0.6, hr); float bar = step(0.55, fract(u * 30.0)); c = mix(c, c * 0.82, step(0.42, u) * step(u, 0.8) * step(cx, 0.075) * step(0.55, hr)); c = mix(c, uLace, lz * bar); h += 0.0012 * lz * bar;
    float eyelet = step(0.42, u) * step(u, 0.78) * (1.0 - smoothstep(0.004, 0.008, abs(cx - 0.062))) * step(0.6, hr); c *= 1.0 - 0.3 * eyelet; }
  if (d > 1.5 && d < 2.5) { vec2 q = vec2(u * 26.0, v * 44.0); vec2 f = fract(q) - 0.5; float hole = (1.0 - smoothstep(0.18, 0.26, length(f))) * step(0.52, u) * step(u, 0.95) * step(cx, 0.13) * step(0.5, hr); c = mix(c, c * 0.25, hole); h -= 0.0012 * hole; }
  if (d > 2.5 && d < 3.5) { float cap = step(0.86, u) * step(hr, 0.9); c = mix(c, uAc, cap * 0.85); float lz = step(0.4, u) * step(u, 0.8) * step(cx, 0.045) * step(0.6, hr) * step(0.5, fract(u * 26.0)); c = mix(c, uLace, lz); }
  if (d > 4.5 && d < 5.5) { float sd = (1.0 - smoothstep(0.0, 0.004, abs(u - 0.62))) * step(cx, 0.12) * step(0.5, hr); c *= 1.0 - 0.25 * sd; }
  if (d > 5.7 && d < 6.5 && uSt.w > 1.5 && uSt.w < 3.5) { float el = step(0.12, u) * step(u, 0.55) * step(0.02, cx) * step(cx, 0.22) * step(0.45, hr); c = mix(c, c * 0.45, el); }
  if (uSt.w > 3.5) { float cap = step(0.78, u) * step(hr, 0.92) * step(0.2, hr); c = mix(c, uAc, cap * 0.8); }
  if (uSt.w > 7.5) { vec2 q = vec2(u * 22.0, v * 28.0); vec2 f = fract(q) - 0.5; float hole = (1.0 - smoothstep(0.16, 0.24, length(f))) * step(0.7, u) * step(0.25, hr); c = mix(c, c * 0.55, hole); }
  if (u < 0.3 && hr > 0.88) { c *= 0.85; h += 0.001; }
  c = mix(c, uSo, sole); c *= 1.0 - 0.35 * sl; h += 0.0015 * sl;
  if (uSt.z > 0.5) { float stl = (1.0 - smoothstep(0.0, 0.0018, abs(vB.y - uGround - uSt.y - 0.006))) * step(0.18, u) * step(u, 0.95); c = mix(c, c * 0.8, stl); }
  if (sole > 0.5) { h += 0.0008 * step(0.5, fract((vB.y - uGround) * 300.0)) * step(abs(v - 0.75), 0.2); }
  float fib = fract(sin(dot(floor(vB * 1500.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453); c *= 0.97 + 0.05 * fib;
  diffuseColor.rgb = c; sH = h; }`).replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n normal = bumpS(-vViewPosition, normal, sH * 1.0);'); };
  m.userData.ground = { value: 0 }; m.customProgramCacheKey = () => 'shoe3pat';
  // bind uGround after compile via onBeforeCompile already referencing m.userData.ground
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = sh => { prev(sh); sh.uniforms.uGround = m.userData.ground; };
  return m;
}

function cuffStyle(st, pants) {
  if (!pants || !pants.id) return st;
  const row = C.PANTS.find(t => t[0] === pants.id); if (!row) return st;
  const le = row[3];
  if (le > 0.85 && st.col > 0.05) return { ...st, col: Math.min(st.col, 0.018) };
  return st;
}

export function buildShoes(av, piece, pants) {
  if (av.shoes2) { av.shoes2.forEach(m => { m.parent && m.parent.remove(m); m.geometry && m.geometry.dispose(); }); av.shoes2 = null; }
  if (!piece || SOCK_IDS.has(piece.id)) return false;
  const st0 = SHOE_STYLE[piece.id] || SHOE_STYLE.sneaker;
  const st = cuffStyle(st0, pants);
  const P = av.tpl.P; const out = [];
  for (const sd of [1, -1]) {
    const S = sd > 0 ? 'Left' : 'Right';
    const L = loft(av, sd, st);
    const geos = [L.g];
    if (st.strap) geos.push(strap(av, sd, st, L));
    if (st.vampStrap) geos.push(vampStrap(av, sd, st, L));
    if (st.tstrap) geos.push(tStrap(av, sd, st, L));
    if (st.thong) geos.push(...thong(av, sd, st, L));
    if (st.straps) for (const u of st.straps) geos.push(vampAt(av, sd, st, L, u, 0.0048));
    if (st.ankleRing) geos.push(ankleRing(av, sd, st, L));
    if ((st.heel || 0) > 0.016 && !st.wedge) geos.push(heelPost(av, sd, st, L));
    if (st.cleats) geos.push(...cleatStuds(av, sd, st, L));
    if (st.tassel) geos.push(...tasselDrops(av, sd, st, L));
    const toe = P[S + 'ToeBase'];
    const mat = shoeMaterial(piece, st); mat.userData.ground.value = L.ground;
    for (const g of geos) {
      skinTo(av, g, (i, x, y, z) => { const k = ss(toe.z - .02, toe.z + .025, z); return k > 0 ? [[S + 'Foot', 1 - k], [S + 'ToeBase', k]] : [[S + 'Foot', 1]]; });
      const mesh = new THREE.SkinnedMesh(g, mat); bindMesh(av, mesh, 1); out.push(mesh);
    }
  }
  av.shoes2 = out; return true;
}
