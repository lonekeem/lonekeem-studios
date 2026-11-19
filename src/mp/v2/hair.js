// v2 hair: sculpted hair built ON the analytic head surface. A cap is a polar grid around the crown whose outer ring follows the
// style's hairline curve exactly (so the hairline is a smooth curve, never a jagged triangle cut) and whose last ring tucks just under
// the skin. Thickness, locks (grooves), fringe tips and volume are smooth functions; long styles continue the same sheet off the head
// and hang down as a closed slab. Extras (braids, buns, ponytails, puffs, locs) are separate lofted shapes on the same surface.
import * as THREE from 'three';
import { rayR, sdfNormal } from './head.js';

const D2R = Math.PI / 180; const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
function interp(pts, x) { // catmull-rom through [[x, y]...] (x ascending), clamped ends
  if (x <= pts[0][0]) return pts[0][1]; const n = pts.length; if (x >= pts[n - 1][0]) return pts[n - 1][1];
  let i = 0; while (pts[i + 1][0] < x) i++; const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)]; const t = (x - p1[0]) / (p2[0] - p1[0]);
  const m1 = (p2[1] - p0[1]) / (p2[0] - p0[0] || 1) * (p2[0] - p1[0]), m2 = (p3[1] - p1[1]) / (p3[0] - p1[0] || 1) * (p2[0] - p1[0]); const t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * m2; }
const hash = n => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
const vnoise1 = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; };

// ---------- hairline presets (|azimuth| deg -> elevation deg; region = above the line). 0 = forehead, 90 = over the ear, 180 = nape
export const LINES = {
  std: [[0, 42], [22, 40], [42, 33], [60, 25], [72, 6], [80, 2], [88, 12], [100, 14], [118, -2], [140, -22], [180, -30]], // short men's: sideburns, above the ears, nape
  low: [[0, 37], [25, 35], [45, 29], [62, 21], [72, 4], [80, 0], [88, 10], [100, 12], [118, -4], [140, -24], [180, -32]],
  high: [[0, 44], [25, 41], [45, 34], [62, 27], [72, 14], [85, 16], [100, 18], [120, 4], [150, -10], [180, -16]], // fades / receding
  recede: [[0, 47], [20, 46], [38, 32], [55, 24], [72, 6], [80, 2], [88, 12], [100, 14], [118, -2], [140, -22], [180, -30]],
  fem: [[0, 40], [22, 38], [42, 30], [60, 16], [72, -2], [82, -10], [95, -20], [120, -28], [150, -34], [180, -36]], // covers the ears (long styles)
  back: [[0, 40], [22, 38], [42, 30], [58, 21], [70, 10], [80, 6], [92, 10], [105, 6], [125, -8], [150, -22], [180, -28]], // pulled back (braids / buns / ponytails): ears free
};

// ---------- style table. T thickness (m), top extra, side factor, front volume, locks, lockAmp, fringe tips, curl bumps, drop (long), extras
// drop: { len (m below head centre), front (|az| where the drop starts), flare }
const S = (o) => Object.assign({ line: 'std', T: .007, top: .006, side: .8, front: 0, frontLift: 0, locks: 0, lockAmp: 0, tips: 0, curl: 0, tilt: 14, drop: null, ex: [], ears: true, part: 0, sweep: 0 }, o);
export const STYLES = {
  bald: null,
  buzz: S({ T: .0022, top: .0006, side: 1, locks: 0, line: 'std' }),
  crew: S({ T: .006, top: .008, side: .55, locks: 26, lockAmp: .0016, tips: .2 }),
  caesar: S({ T: .006, top: .005, side: .6, locks: 30, lockAmp: .001, tips: .5, line: 'low' }),
  lowfade: S({ T: .007, top: .012, side: .35, locks: 24, lockAmp: .002, tips: .25, line: 'std', fade: .5 }),
  midfade: S({ T: .008, top: .016, side: .25, locks: 22, lockAmp: .0024, tips: .3, line: 'high', fade: .7 }),
  highfade: S({ T: .009, top: .02, side: .15, locks: 20, lockAmp: .0028, tips: .3, line: 'high', fade: .9 }),
  waves: S({ T: .0045, top: .003, side: .8, waves: 1 }),
  curlcrop: S({ T: .01, top: .016, side: .55, curl: .006, curlN: 22 }),
  curlfade: S({ T: .01, top: .028, side: .2, curl: .007, curlN: 20, line: 'high', fade: .8 }),
  afro: S({ T: .05, top: .025, side: .95, curl: .006, curlN: 16, line: 'low', ears: false, round: 1 }),
  afromini: S({ T: .026, top: .014, side: .9, curl: .005, curlN: 18, line: 'low', round: .6 }),
  sidepart: S({ T: .008, top: .012, side: .6, front: .008, locks: 30, lockAmp: .0016, part: 1, sweep: 1 }),
  slickback: S({ T: .0075, top: .01, side: .7, locks: 40, lockAmp: .0012, sweep: 0, tilt: 40 }),
  quiff: S({ T: .008, top: .014, side: .45, front: .03, frontLift: 1, locks: 22, lockAmp: .0025, tips: .3, fade: .4 }),
  pomp: S({ T: .009, top: .018, side: .45, front: .045, frontLift: 1.3, locks: 30, lockAmp: .002, fade: .3, tilt: 30 }),
  undercut: S({ T: .009, top: .022, side: .1, front: .022, frontLift: 1, locks: 22, lockAmp: .003, tips: .3, line: 'high', fade: 1 }),
  messy: S({ T: .009, top: .024, side: .22, front: .016, frontLift: .6, locks: 11, lockAmp: .005, tips: 1.3, sweep: .6, fade: .35 }), // tousled (guy reference)
  spiky: S({ T: .008, top: .012, side: .5, locks: 14, lockAmp: .006, tips: 1, spikes: .03 }),
  mohawk: S({ T: .006, top: .03, side: .0, locks: 12, lockAmp: .004, tips: .6, mohawk: 1, line: 'high', fade: 1 }),
  receding: S({ T: .006, top: .008, side: .6, locks: 28, lockAmp: .0014, line: 'recede' }),
  bowl: S({ T: .012, top: .012, side: .9, locks: 40, lockAmp: .0015, line: 'low', bangs: 1, ears: false }),
  manbun: S({ T: .007, top: .006, side: .7, locks: 40, lockAmp: .0013, line: 'back', tilt: 40, ex: [['bun', 'top', .045]] }),
  ponylow: S({ T: .0075, top: .006, side: .75, locks: 44, lockAmp: .0013, line: 'back', tilt: 40, ex: [['pony', 'low', .26]] }),
  ponyhigh: S({ T: .0075, top: .006, side: .75, locks: 44, lockAmp: .0013, line: 'back', tilt: 25, ex: [['pony', 'high', .3]] }),
  bunhigh: S({ T: .0075, top: .006, side: .75, locks: 44, lockAmp: .0013, line: 'back', tilt: 30, ex: [['bun', 'top', .058]] }),
  bunlow: S({ T: .0075, top: .006, side: .75, locks: 44, lockAmp: .0013, line: 'back', tilt: 45, ex: [['bun', 'low', .055]] }),
  spacebuns: S({ T: .0075, top: .006, side: .75, locks: 44, lockAmp: .0013, line: 'back', tilt: 20, ex: [['puffs', .05, 0]] }),
  afropuffs: S({ T: .009, top: .006, side: .75, curl: .003, curlN: 26, line: 'back', tilt: 20, ex: [['puffs', .07, 1]] }),
  pigtails: S({ T: .0075, top: .006, side: .75, locks: 44, lockAmp: .0013, line: 'back', tilt: 20, part: 2, ex: [['pigtails', .24]] }),
  braids2: S({ T: .0085, top: .006, side: .8, locks: 0, line: 'back', tilt: 30, part: 2, cornrow: 2, ex: [['dutch', .4]] }), // two Dutch braids (girl reference)
  braidpony: S({ T: .0075, top: .006, side: .75, locks: 44, lockAmp: .0013, line: 'back', tilt: 35, ex: [['braidpony', .45]] }),
  cornrows: S({ T: .0045, top: .0, side: 1, cornrow: 8, line: 'std', tilt: 30 }),
  bob: S({ T: .011, top: .012, side: .95, locks: 36, lockAmp: .0016, line: 'fem', ears: false, part: 1, drop: { len: .16, front: 50, flare: .02, curve: .5 } }),
  lob: S({ T: .011, top: .012, side: .95, locks: 36, lockAmp: .0016, line: 'fem', ears: false, part: 1, drop: { len: .25, front: 46, flare: .025, curve: .3 } }),
  pixie: S({ T: .009, top: .016, side: .5, front: .012, locks: 20, lockAmp: .0028, tips: .8, sweep: 1, fade: .3 }),
  shoulder: S({ T: .011, top: .012, side: .95, locks: 40, lockAmp: .0016, line: 'fem', ears: false, part: 1, drop: { len: .3, front: 42, flare: .03, curve: .2 } }),
  longstr: S({ T: .011, top: .012, side: .95, locks: 44, lockAmp: .0016, line: 'fem', ears: false, part: 1, drop: { len: .48, front: 40, flare: .03, curve: .1 } }),
  longwave: S({ T: .012, top: .014, side: .95, locks: 30, lockAmp: .0024, line: 'fem', ears: false, part: 1, drop: { len: .46, front: 40, flare: .045, curve: .1, wave: .012 } }),
  longcurl: S({ T: .014, top: .016, side: .95, curl: .004, curlN: 20, line: 'fem', ears: false, drop: { len: .42, front: 40, flare: .06, curve: .1, wave: .02 } }),
  curtain: S({ T: .011, top: .012, side: .95, locks: 44, lockAmp: .0016, line: 'fem', ears: false, part: 3, bangs: .6, drop: { len: .46, front: 30, flare: .03, curve: .1 } }),
  dreads: S({ T: .006, top: .004, side: .9, line: 'low', ears: false, locsN: 30, ex: [['locs', .3]] }),
  twists: S({ T: .007, top: .004, side: .9, line: 'std', locsN: 44, ex: [['locs', .07]] }),
};
// aliases for old saved ids (removed styles -> closest kept style)
export const ALIAS = { dreadsshort: 'twists', afrotaper: 'afromini', wavefade: 'waves', hitop: 'curlfade', fauxhawk: 'mohawk', mullet: 'shoulder', shag: 'lob', balding: 'receding', topknot: 'manbun', bantu: 'spacebuns', curlybob: 'bob', sidebang: 'curtain', halfup: 'longstr', boxbraids: 'braids2', bobbraids: 'braids2', fringe: 'bowl' };
export const styleOf = id => STYLES[id] !== undefined ? STYLES[id] : STYLES[ALIAS[id]] !== undefined ? STYLES[ALIAS[id]] : STYLES.crew;

// ---------- surface helpers (head-local metres)
export function surf(head, d) { const r = rayR(head.sdf, d.x, d.y, d.z); return d.clone().multiplyScalar(r); }
const _n = new THREE.Vector3();
export function normalAt(head, p) { return sdfNormal(head.sdf, p.x, p.y, p.z, new THREE.Vector3()); }
function frame(tilt) { const A = new THREE.Vector3(0, Math.cos(tilt * D2R), -Math.sin(tilt * D2R)); const F = new THREE.Vector3(0, 0, 1).addScaledVector(A, -A.z).normalize(); const X = new THREE.Vector3(1, 0, 0); return { A, F, X }; }
const dirOf = (fr, th, ph) => fr.A.clone().multiplyScalar(Math.cos(th)).addScaledVector(fr.F, Math.sin(th) * Math.cos(ph)).addScaledVector(fr.X, Math.sin(th) * Math.sin(ph));
const azEl = d => [Math.atan2(d.x, d.z) / D2R, Math.asin(clamp(d.y, -1, 1)) / D2R];

// ---------- the cap (+ optional hanging drop)
export function buildCap(head, st, opt = {}) {
  const line = LINES[st.line] || LINES.std; const fr = frame(st.tilt); const NPH = 160, NU = 40;
  const lineAt = (a, e) => { const aa = Math.abs(a); let l = interp(line, aa); if (st.bangs && aa < 40) l = Math.min(l, l - 16 * st.bangs * Math.cos(aa / 40 * Math.PI / 2)); if (st.mohawk && aa < 150) l = Math.max(l, 90 - 12 * (1 - aa / 150) - (aa > 0 ? 0 : 0)) ; return l; };
  const inside = d => { const [a, e] = azEl(d); if (st.mohawk) { if (Math.abs(d.x) > .036) return false; return e > -30; } return e > lineAt(a, e); };
  // boundary angle per column
  const thB = new Float32Array(NPH);
  for (let j = 0; j < NPH; j++) { const ph = j / NPH * Math.PI * 2; let th = 0; while (th < 175 * D2R && inside(dirOf(fr, th, ph))) th += 1 * D2R; let a = th - D2R, b = th; for (let k = 0; k < 14; k++) { const m = (a + b) / 2; if (inside(dirOf(fr, m, ph))) a = m; else b = m; } thB[j] = (a + b) / 2; }
  // fringe tips: scallop the boundary on the front half with the lock pattern
  const lockPh = ph => { const w = st.locks || 1; return ph * w + 2.4 * (vnoise1(ph * 2.3 + 4) - .5) * 2 + .8 * Math.sin(ph * 3 + 1); };
  if (st.tips) for (let j = 0; j < NPH; j++) { const ph = j / NPH * Math.PI * 2; const d = dirOf(fr, thB[j], ph); const [a] = azEl(d); const fw = ss(110, 30, Math.abs(a)); const g = .5 + .5 * Math.cos(lockPh(ph)); thB[j] *= 1 + st.tips * fw * .07 * (Math.pow(g, 2) - .35); }
  { const tmp = Float32Array.from(thB); for (let j = 0; j < NPH; j++) thB[j] = (tmp[(j + NPH - 1) % NPH] + 2 * tmp[j] + tmp[(j + 1) % NPH]) / 4; }
  const pos = [], tan = [], aux = [], idx = []; const drop = st.drop;
  const thick = (d, u, ph) => { const [a, e] = azEl(d); const top = ss(-.25, .9, d.y); let t = st.T * (st.side + (1 - st.side) * top) + st.top * Math.pow(top, 1.5);
    if (st.fade) t *= 1 - st.fade * .75 * ss(.35, -.15, d.y) ;
    if (st.front) { const fw = ss(60, 0, Math.abs(a)) * ss(.0, .55, d.y) * ss(.98, .6, d.y); t += st.front * fw * (st.frontLift ? 1 : .6); }
    if (st.round) t += st.T * .25 * ss(-.3, .5, d.y);
    if (st.locks && st.lockAmp) { const g = .5 + .5 * Math.cos(lockPh(ph)); const amp = .6 + .8 * vnoise1(ph * 5.7 + 2); t += st.lockAmp * amp * (Math.sqrt(g) - .55) * (1 - .5 * ss(.85, 1, u)); }
    if (st.curl) { const k = st.curlN || 20; const c = Math.sin(d.x * k * 6.3 + Math.sin(d.y * k * 4) * 1.5) * Math.sin(d.y * k * 6.3 + d.z * k * 3) * Math.sin(d.z * k * 6.3 + d.x * k * 2); t += st.curl * (Math.abs(c) - .3); }
    if (st.spikes) { const g = Math.pow(.5 + .5 * Math.cos(lockPh(ph)), 4); t += st.spikes * g * ss(.2, .9, d.y); }
    if (st.cornrow) { const k = st.cornrow * 2; const v = Math.abs(Math.sin(Math.atan2(d.x, .35) * k * 1.2)); t += .0028 * (Math.pow(v, .5) - .5); }
    if (st.waves) { const v = Math.sin(Math.hypot(d.x * 3, d.z + .3, d.y - .9) * 70); t += .0012 * v; }
    if (st.part) { const px = st.part === 1 ? .045 : st.part === 3 ? 0 : 0; const pd = Math.abs(d.x - (st.part === 2 ? 0 : px)); if (d.y > .4 && d.z > -.3) t -= .004 * ss(.012, .0, pd) * ss(.4, .7, d.y); }
    return Math.max(.0012, t); };
  // rows: u in [0, 1] crown -> hairline, then a tuck ring just under the skin
  const cols = [];
  for (let j = 0; j <= NPH; j++) { const jj = j % NPH, ph = jj / NPH * Math.PI * 2; const col = [];
    for (let i = 0; i <= NU; i++) { const u = i / NU; const th = thB[jj] * u * (1.55 - .55 * u); const d = dirOf(fr, Math.max(th, 1e-4), ph); const p = surf(head, d); const n = normalAt(head, p); const edge = ss(1, .8, u);
      let t = thick(d, u, ph) * Math.pow(edge, .6) + .0009 * (1 - edge); const q = p.clone().addScaledVector(n, t); col.push({ q, n, d, u, ph, t }); }
    { const d = dirOf(fr, thB[jj] + 1.2 * D2R, ph); const p = surf(head, d); const n = normalAt(head, p); col.push({ q: p.clone().addScaledVector(n, -.0025), n, d, u: 1.02, ph, t: -.0025 }); }
    cols.push(col); }
  const NR = cols[0].length;
  // flow tangent (crown -> hairline) and lock groove value for the shader
  for (let j = 0; j <= NPH; j++) for (let i = 0; i < NR; i++) { const c = cols[j][i], nx = cols[j][Math.min(NR - 1, i + 1)], pv = cols[j][Math.max(0, i - 1)]; const t = nx.q.clone().sub(pv.q).normalize(); const g = st.locks ? .5 + .5 * Math.cos(lockPh(c.ph)) : .5;
    pos.push(c.q.x, c.q.y, c.q.z); tan.push(t.x, t.y, t.z); aux.push(g, c.u, c.ph / (Math.PI * 2), 0); }
  for (let j = 0; j < NPH; j++) for (let i = 0; i < NR - 1; i++) { const a = j * NR + i, b = (j + 1) * NR + i; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  let geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('aT', new THREE.Float32BufferAttribute(tan, 3)); geo.setAttribute('aH', new THREE.Float32BufferAttribute(aux, 4)); geo.setIndex(idx); geo.computeVertexNormals();
  const parts = [geo];
  if (drop) parts.push(buildDrop(head, st, fr, cols, thB, NPH, NR));
  return parts;
}

// long hair: from the hairline ring on the sides / back, the sheet leaves the head and hangs down (closed slab: outer + inner + tips)
function buildDrop(head, st, fr, cols, thB, NPH, NR) {
  const dr = st.drop; const L = head.L; const yEnd = -dr.len - .1; const pos = [], tan = [], aux = [], idx = []; const NS = 22;
  const rows = []; const useCols = [];
  for (let j = 0; j <= NPH; j++) { const jj = j % NPH; const c = cols[j][NR - 3]; const [a] = azEl(c.d); const aa = Math.abs(a); const w = ss(dr.front, dr.front + 30, aa); useCols.push(w); }
  for (let j = 0; j <= NPH; j++) { const c0 = cols[j][NR - 4], c1 = cols[j][NR - 3]; const w = useCols[j]; const start = c1.q.clone(); const dir = c1.q.clone().sub(c0.q).normalize(); const [a] = azEl(c1.d);
    const side = Math.sin(a * D2R), back = -Math.cos(a * D2R); const len = (start.y - yEnd) * w; const row = [];
    for (let k = 0; k <= NS; k++) { const t = k / NS; const y = start.y - len * t; // gentle fall: tangent at the start, then straight down, sweeping behind the shoulders
      const out = (.012 + dr.flare * t + (dr.curve || 0) * .02 * Math.sin(t * Math.PI)) ; const p = new THREE.Vector3(start.x + dir.x * .02 * Math.min(1, t * 4) * w + side * out * w, y, start.z + dir.z * .02 * Math.min(1, t * 4) * w + back * out * w);
      const bodyZ = -.03 - .06 * ss(-.12, -.3, y); if (y < -.14 && Math.abs(p.x) > .07) { p.z = Math.min(p.z, bodyZ + (p.z - bodyZ) * (1 - ss(-.14, -.26, y))); const sx = Math.abs(p.x); p.x = Math.sign(p.x) * Math.max(.04, sx - (sx - .09) * ss(-.14, -.3, y) * .6); }
      if (dr.wave) p.addScaledVector(new THREE.Vector3(side, 0, back), dr.wave * Math.sin(t * 9 + j * .3) * t * w);
      row.push(p); }
    rows.push(row); }
  // outer + inner sheets
  const TH = .009; const base = 0;
  const push = (p, tg, g, u) => { pos.push(p.x, p.y, p.z); tan.push(tg.x, tg.y, tg.z); aux.push(g, u, 0, 1); };
  const nrm = (j, k) => { const a = rows[Math.max(0, j - 1)][k], b = rows[Math.min(NPH, j + 1)][k]; const c = rows[j][Math.max(0, k - 1)], d = rows[j][Math.min(NS, k + 1)]; return b.clone().sub(a).cross(d.clone().sub(c)).normalize(); };
  const lockPh = ph => { const w = st.locks || 1; return ph * w; };
  for (const layer of [0, 1]) for (let j = 0; j <= NPH; j++) for (let k = 0; k <= NS; k++) { const p = rows[j][k].clone(); const n = nrm(j, k); const tg = rows[j][Math.min(NS, k + 1)].clone().sub(rows[j][Math.max(0, k - 1)]).normalize(); const g = .5 + .5 * Math.cos(lockPh(j / NPH * Math.PI * 2));
    const tip = ss(.75, 1, k / NS); if (layer === 1) p.addScaledVector(n, TH * (1 - .5 * tip) * useCols[j]); else p.addScaledVector(n, -.001 - (st.lockAmp || 0) * g * (1 - tip));
    push(p, tg, g, 1 + k / NS); }
  const NC = (NPH + 1) * (NS + 1);
  for (let j = 0; j < NPH; j++) { if (useCols[j] < .01 && useCols[j + 1] < .01) continue; for (let k = 0; k < NS; k++) { const a = j * (NS + 1) + k, b = (j + 1) * (NS + 1) + k; idx.push(a, b, a + 1, b, b + 1, a + 1); idx.push(NC + a, NC + a + 1, NC + b, NC + b, NC + a + 1, NC + b + 1); }
    const a = j * (NS + 1) + NS, b = (j + 1) * (NS + 1) + NS; idx.push(a, b, NC + a, b, NC + b, NC + a); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aT', new THREE.Float32BufferAttribute(tan, 3)); g.setAttribute('aH', new THREE.Float32BufferAttribute(aux, 4)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

// ---------- extras
function lumpChain(pts, r0, r1, opt = {}) { // braid-like lumps along a polyline (3-strand look: alternating tilted ellipsoids)
  const curve = new THREE.CatmullRomCurve3(pts); const Ls = curve.getLength(); const N = Math.max(4, Math.round(Ls / (opt.step || .016))); const geos = []; const up = new THREE.Vector3();
  for (let i = 0; i <= N; i++) { const t = i / N; const p = curve.getPointAt(t), tg = curve.getTangentAt(t); const r = r0 + (r1 - r0) * t; const side = i % 2 ? 1 : -1;
    up.set(0, 0, 1); if (Math.abs(up.dot(tg)) > .9) up.set(1, 0, 0); const bx = new THREE.Vector3().crossVectors(tg, up).normalize(); const by = new THREE.Vector3().crossVectors(bx, tg).normalize();
    const g = new THREE.SphereGeometry(1, 12, 8); const m = new THREE.Matrix4(); const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(bx, tg, by)); const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), side * .55);
    m.compose(p.clone().addScaledVector(bx, side * r * .32), q.multiply(tilt), new THREE.Vector3(r * .72, r * 1.45, r * .62)); g.applyMatrix4(m);
    const n = g.attributes.position.count; const T = new Float32Array(n * 3), A = new Float32Array(n * 4); const tw = tg.clone().applyAxisAngle(by, side * .55);
    for (let k = 0; k < n; k++) { T[k * 3] = tw.x; T[k * 3 + 1] = tw.y; T[k * 3 + 2] = tw.z; A[k * 4] = .5; A[k * 4 + 1] = .5; A[k * 4 + 3] = 2; }
    g.setAttribute('aT', new THREE.BufferAttribute(T, 3)); g.setAttribute('aH', new THREE.BufferAttribute(A, 4)); g.deleteAttribute('uv'); geos.push(g); }
  return geos;
}
function tube(pts, r0, r1, opt = {}) { const c = new THREE.CatmullRomCurve3(pts); const seg = opt.seg || 24, rad = opt.rad || 10; const g = new THREE.TubeGeometry(c, seg, 1, rad, false); const pa = g.attributes.position; const n = rad + 1; const T = new Float32Array(pa.count * 3), A = new Float32Array(pa.count * 4); const v = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) { const t = i / seg, pt = c.getPointAt(t), tg = c.getTangentAt(t); const k = (r0 + (r1 - r0) * Math.pow(t, opt.pow || 1)) * (opt.tipRound ? Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, (t - .85) / .15), 2))) * .85 + .15 : 1); for (let j = 0; j < n; j++) { const id = i * n + j; v.fromBufferAttribute(pa, id).sub(pt).multiplyScalar(k); if (opt.groove) v.multiplyScalar(1 + opt.groove * Math.cos(j / rad * Math.PI * 2 * 5)); v.add(pt); pa.setXYZ(id, v.x, v.y, v.z); T[id * 3] = tg.x; T[id * 3 + 1] = tg.y; T[id * 3 + 2] = tg.z; A[id * 4] = .5 + .5 * Math.cos(j / rad * Math.PI * 2 * 5); A[id * 4 + 1] = t; A[id * 4 + 3] = 3; } }
  g.computeVertexNormals(); g.setAttribute('aT', new THREE.BufferAttribute(T, 3)); g.setAttribute('aH', new THREE.BufferAttribute(A, 4)); g.deleteAttribute('uv'); return [g]; }
function ball(c, r, sq = [1, 1, 1], curl = 0) { const g = new THREE.SphereGeometry(1, 28, 20); const p = g.attributes.position; const n = p.count; const T = new Float32Array(n * 3), A = new Float32Array(n * 4); const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) { v.fromBufferAttribute(p, i); const sw = Math.atan2(v.x, v.z); const bump = curl ? curl * Math.abs(Math.sin(v.x * 9 + Math.sin(v.y * 7) * 2) * Math.sin(v.y * 9 + v.z * 5) * Math.sin(v.z * 9 + v.x * 4)) : .04 * Math.cos(sw * 8 + v.y * 3); const k = r * (1 + bump); p.setXYZ(i, c.x + v.x * k * sq[0], c.y + v.y * k * sq[1], c.z + v.z * k * sq[2]); const t = new THREE.Vector3(-Math.cos(sw), 0, Math.sin(sw)); T[i * 3] = t.x; T[i * 3 + 1] = t.y + .3; T[i * 3 + 2] = t.z; A[i * 4] = .5 + .5 * Math.cos(sw * 8 + v.y * 3); A[i * 4 + 1] = .5; A[i * 4 + 3] = 4; }
  g.computeVertexNormals(); g.setAttribute('aT', new THREE.BufferAttribute(T, 3)); g.setAttribute('aH', new THREE.BufferAttribute(A, 4)); g.deleteAttribute('uv'); return [g]; }
// point on the hair surface above the scalp in direction (az, el) degrees, lifted by `up`
export function scalpPt(head, az, el, up = .008) { const d = new THREE.Vector3(Math.sin(az * D2R) * Math.cos(el * D2R), Math.sin(el * D2R), Math.cos(az * D2R) * Math.cos(el * D2R)); const p = surf(head, d); return p.addScaledVector(normalAt(head, p), up); }

export function buildExtras(head, st) {
  const out = []; const T = st.T + .004;
  for (const e of st.ex || []) { const [k, a1, a2] = e;
    if (k === 'bun') { const el = a1 === 'top' ? 75 : a1 === 'crown' ? 50 : 5; const r = a2; const p = scalpPt(head, 180, el, T + r * .7); out.push(...ball(p, r, [1, .82, 1])); }
    else if (k === 'puffs') { for (const sd of [-1, 1]) { const p = scalpPt(head, sd * 70, 55, T + a1 * .55); out.push(...ball(p, a1, [1, .95, .95], a2 ? .12 : 0)); } }
    else if (k === 'pony' || k === 'braidpony') { const high = a1 === 'high'; const el = high ? 45 : 5; const p0 = scalpPt(head, 180, el, T + .006); const len = k === 'braidpony' ? a1 : a2; const pts = [p0, p0.clone().add(new THREE.Vector3(0, -.03, -.035)), p0.clone().add(new THREE.Vector3(0, -.03 - len * .35, -.05)), p0.clone().add(new THREE.Vector3(0, -len * .7, -.045)), p0.clone().add(new THREE.Vector3(0, -len, -.03))];
      out.push(...ball(p0.clone().add(new THREE.Vector3(0, 0, -.006)), .019, [1.1, 1, .7])); if (k === 'braidpony') out.push(...lumpChain(pts.slice(1), .022, .014)); else out.push(...tube(pts, .028, .006, { seg: 30, rad: 12, groove: .12, pow: .7, tipRound: 1 })); }
    else if (k === 'pigtails') { for (const sd of [-1, 1]) { const p0 = scalpPt(head, sd * 105, 5, T + .006); const L = a1; const pts = [p0, p0.clone().add(new THREE.Vector3(sd * .035, -.03, -.01)), p0.clone().add(new THREE.Vector3(sd * .05, -L * .5, -.01)), p0.clone().add(new THREE.Vector3(sd * .045, -L, .0))]; out.push(...ball(p0, .016)); out.push(...tube(pts, .024, .006, { seg: 24, rad: 10, groove: .12, pow: .7, tipRound: 1 })); } }
    else if (k === 'dutch') { // two Dutch braids from the front hairline over the head, then hanging down behind the shoulders
      for (const sd of [-1, 1]) { const pts = []; for (const [az, el] of [[sd * 16, 40], [sd * 20, 54], [sd * 30, 66], [sd * 70, 70], [sd * 128, 52], [sd * 148, 28], [sd * 155, 6]]) pts.push(scalpPt(head, az, el, st.T + .0015)); const last = pts[pts.length - 1]; pts.push(last.clone().add(new THREE.Vector3(sd * .01, -.05, -.03)), last.clone().add(new THREE.Vector3(sd * .03, -.15, -.07)), last.clone().add(new THREE.Vector3(sd * .05, -a1 * .75, -.08)), last.clone().add(new THREE.Vector3(sd * .055, -a1, -.07)));
        out.push(...lumpChain(pts, .017, .011, { step: .0105 })); const tip = pts[pts.length - 1]; out.push(...tube([tip.clone().add(new THREE.Vector3(0, .01, 0)), tip.clone().add(new THREE.Vector3(sd * .003, -.03, .002)), tip.clone().add(new THREE.Vector3(sd * .006, -.06, .006))], .011, .003, { seg: 8, rad: 8, groove: .15 })); } }
    else if (k === 'locs') { const N = st.locsN || 30; for (let i = 0; i < N; i++) { const az = -170 + 340 * (i + .5) / N; if (Math.abs(az) < 50 && a1 > .1) continue; const el = 20 + 25 * Math.cos(i * 2.3) * .3; const p0 = scalpPt(head, az, el, st.T); const n = p0.clone().normalize(); const L = a1 * (.8 + .4 * hash(i)); const pts = [p0, p0.clone().addScaledVector(n, .03).add(new THREE.Vector3(0, -.02, 0)), p0.clone().addScaledVector(n, .045).add(new THREE.Vector3(0, -L * .5, 0)), p0.clone().addScaledVector(n, .05).add(new THREE.Vector3(0, -L, 0))]; out.push(...tube(pts, .008, .006, { seg: 12, rad: 6, groove: .18, tipRound: 1 })); } }
  }
  return out;
}

// hair material: flow-aligned anisotropic highlight, lock grooves, root-to-tip tone, soft rim. One material per colour (shared).
const _mats = new Map();
export function hairMaterial(c1, c2, hl = .35) {
  const key = c1 + c2 + hl.toFixed(2); if (_mats.has(key)) return _mats.get(key);
  const m = new THREE.MeshStandardMaterial({ color: c1, roughness: .55, metalness: 0, side: THREE.FrontSide });
  const U = { uC2: { value: new THREE.Color(c2) }, uHl: { value: hl } };
  m.onBeforeCompile = sh => { Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aT; attribute vec4 aH; varying vec3 vT; varying vec4 vH; varying vec3 vObjP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvH = aH; vObjP = position; vT = normalize(normalMatrix * aT);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uC2; uniform float uHl; varying vec3 vT; varying vec4 vH; varying vec3 vObjP;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float g = vH.x; float fine = sin(vH.z * 900.0 + sin(vObjP.y * 300.0) * 2.0) * 0.5 + 0.5;
        vec3 c = diffuseColor.rgb * (0.72 + 0.38 * g) * (0.94 + 0.08 * fine);
        c = mix(c, uC2, uHl * 0.25 * smoothstep(0.4, 1.0, g));
        diffuseColor.rgb = c;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { vec3 V = normalize(vViewPosition); vec3 N = normalize(vNormal); vec3 T = normalize(vT - N * dot(vT, N));
          vec3 L = normalize(vec3(0.35, 0.8, 0.5)); vec3 Hh = normalize(L + V); float th = dot(T, Hh); float sinTH = sqrt(max(0.0, 1.0 - th * th));
          float spec = pow(sinTH, 60.0) * 0.35 + pow(sinTH, 12.0) * 0.08; float rimF = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.5);
          totalEmissiveRadiance += mix(diffuseColor.rgb, vec3(1.0), 0.35) * spec * (0.5 + 0.5 * vH.x) + diffuseColor.rgb * (0.05 + rimF * 0.2); }`);
  };
  m.customProgramCacheKey = () => 'v2hair'; _mats.set(key, m); return m;
}

// ---------- facial hair: polar band around the mouth. Inner edge = first entry into the mask, outer edge = exit; both edges tuck under
// the skin, so beards have clean smooth outlines and a clean opening around the lips.
export const BEARD_STYLES = { // mask(p, a, L) on head-local surface points; T thickness, curl
  full: { T: .0075, curl: .0018, mask: (p, a, L) => Math.abs(a) < 84 && offNeck(p) && p.y < topLine(a, L, 1) && !mouthHole(p, L, .009) },
  boxed: { T: .004, curl: .0008, mask: (p, a, L) => Math.abs(a) < 84 && offNeck(p) && p.y < topLine(a, L, .8) && !mouthHole(p, L, .008) },
  lumber: { T: .013, curl: .003, mask: (p, a, L) => Math.abs(a) < 86 && offNeck(p) && p.y < topLine(a, L, 1.15) && !mouthHole(p, L, .01) },
  goatee: { T: .006, curl: .0015, mask: (p, a, L) => Math.abs(p.x) < .034 && p.y < L.mouthY - .006 && p.z > .02 },
  circle: { T: .006, curl: .0015, mask: (p, a, L) => Math.abs(p.x) < .036 + .006 * Math.max(0, (L.mouthY - p.y) * 20) && p.y < L.mouthY + .022 && p.z > .02 && !mouthHole(p, L, .007) },
  strap: { T: .0045, curl: .001, mask: (p, a, L) => Math.abs(a) < 84 && offNeck(p) && p.y < topLine(a, L, 1) && p.y < jawBand(p, a, L) && !mouthHole(p, L, .02) && !(Math.abs(p.x) < .06 && p.y > L.mouthY - .024) },
  curtain: { T: .006, curl: .0015, mask: (p, a, L) => Math.abs(a) < 84 && offNeck(p) && p.y < topLine(a, L, 1) && p.y < jawBand(p, a, L) + .02 && !(Math.abs(p.x) < .05 && p.y > L.mouthY - .02) },
  mutton: { T: .006, curl: .0015, mask: (p, a, L) => Math.abs(a) < 86 && Math.abs(a) > 40 && offNeck(p) && p.y < topLine(a, L, 1) && p.y > L.mouthY - .03 },
  soul: { T: .005, curl: 0, mask: (p, a, L) => Math.abs(p.x) < .009 && p.y < L.mouthY - .012 && p.y > L.mouthY - .03 && p.z > .02 },
};
export const STACHE_STYLES = {
  chevron: { T: .007, mask: (p, a, L) => p.z > .02 && Math.abs(p.x) < .033 && p.y > L.mouthY + .008 - Math.abs(p.x) * .15 && p.y < L.mouthY + .024 - Math.abs(p.x) * .2 },
  pencil: { T: .003, mask: (p, a, L) => p.z > .02 && Math.abs(p.x) < .03 && p.y > L.mouthY + .009 && p.y < L.mouthY + .0145 },
  handlebar: { T: .006, mask: (p, a, L) => p.z > .02 && Math.abs(p.x) < .046 && p.y > L.mouthY + .008 + Math.max(0, Math.abs(p.x) - .03) * 1.2 - Math.abs(p.x) * .1 && p.y < L.mouthY + .02 + Math.max(0, Math.abs(p.x) - .03) * 1.8 - Math.abs(p.x) * .12 },
  walrus: { T: .011, mask: (p, a, L) => p.z > .02 && Math.abs(p.x) < .04 && p.y > L.mouthY + .0 && p.y < L.mouthY + .026 - Math.abs(p.x) * .15 },
  horseshoe: { T: .007, mask: (p, a, L) => p.z > .02 && ((Math.abs(p.x) < .034 && p.y > L.mouthY + .008 && p.y < L.mouthY + .022) || (Math.abs(p.x) > .027 && Math.abs(p.x) < .038 && p.y < L.mouthY + .022 && p.y > L.mouthY - .04)) },
};
export const BEARD_ALIAS = { anchor: 'goatee', vandyke: 'circle', jawline: 'strap' }; export const STACHE_ALIAS = { toothbrush: 'pencil', fumanchu: 'horseshoe', imperial: 'handlebar', painter: 'chevron' };
function topLine(a, L, k) { const aa = Math.abs(a); return interp([[0, L.mouthY + .024], [16, L.mouthY + .025], [28, -.052 + .01 * (k - 1)], [45, -.04 + .015 * (k - 1)], [62, -.026 + .02 * (k - 1)], [78, -.004 + .01 * (k - 1)], [86, .006]], aa); }
const offNeck = p => Math.hypot(p.x, p.z + .025) > .056 || p.y > -.08;
function jawBand(p, a, L) { return -.112 + Math.abs(p.x) * .9 * Math.min(1, Math.abs(a) / 90 + .2); }
function mouthHole(p, L, m) { const a = p.x / (.032 + m), b = (p.y - L.mouthY + .002) / (.012 + m * .55); return a * a + b * b < 1 && p.z > .03; }
export function buildBand(head, st, opt = {}) {
  const L = head.L; const ax = new THREE.Vector3(0, L.mouthY, .13).normalize(); const up = new THREE.Vector3(0, 1, 0); const F = up.clone().addScaledVector(ax, -ax.dot(up)).normalize(); const X = new THREE.Vector3().crossVectors(F, ax).normalize();
  const fr = { A: ax, F, X }; const NPH = 140, NU = 18; const inM = d => { const p = surf(head, d); const a = Math.atan2(p.x, p.z) / D2R; return st.mask(p, a, L); };
  const tin = new Float32Array(NPH), tout = new Float32Array(NPH);
  for (let j = 0; j < NPH; j++) { const ph = j / NPH * Math.PI * 2; let th = 0, st0 = -1, en = -1; let prev = inM(dirOf(fr, 0, ph));
    if (prev) st0 = 0; for (th = 1.2 * D2R; th < 100 * D2R; th += 1.2 * D2R) { const c = inM(dirOf(fr, th, ph)); if (c && !prev && st0 < 0) st0 = th; if (!c && prev && st0 >= 0) { en = th; break; } prev = c; }
    if (st0 < 0) { tin[j] = tout[j] = -1; continue; } if (en < 0) en = 100 * D2R;
    const bis = (a, b, wantIn) => { for (let k = 0; k < 12; k++) { const m = (a + b) / 2; if (inM(dirOf(fr, m, ph)) === wantIn) b = m; else a = m; } return (a + b) / 2; };
    tin[j] = st0 > 0 ? bis(st0 - 1.2 * D2R, st0, true) : 0; tout[j] = bis(en - 1.2 * D2R, en, false); }
  // fill empty columns with a zero-width band at the neighbour's position (keeps one closed grid), then smooth
  for (let j = 0; j < NPH; j++) if (tin[j] < 0) { let k = 1; while (k < NPH && tin[(j + k) % NPH] < 0 && tin[(j - k + NPH) % NPH] < 0) k++; const src = tin[(j + k) % NPH] >= 0 ? (j + k) % NPH : (j - k + NPH) % NPH; const m = (tin[src] + tout[src]) / 2; tin[j] = -m - 10; tout[j] = m; }
  const fix = arr => { const t = Float32Array.from(arr); for (let j = 0; j < NPH; j++) { const a = t[(j + NPH - 1) % NPH], b = t[j], c = t[(j + 1) % NPH]; arr[j] = (a + 2 * b + c) / 4; } };
  const empty = Array.from(tin, v => v < -5); for (let j = 0; j < NPH; j++) if (empty[j]) tin[j] = tout[j]; fix(tin); fix(tout);
  const pos = [], tan = [], aux = [], idx = []; const NR = NU + 3;
  for (let j = 0; j <= NPH; j++) { const jj = j % NPH, ph = jj / NPH * Math.PI * 2; const w0 = tin[jj], w1 = tout[jj]; const band = Math.max(0, w1 - w0); const zero = empty[jj] || band < .5 * D2R;
    for (let i = 0; i < NR; i++) { let th, t; if (i === 0) { th = Math.max(0, w0 - 1 * D2R); t = -.0025; } else if (i === NR - 1) { th = w1 + 1 * D2R; t = -.0025; } else { const u = (i - 1) / (NU); th = w0 + band * u; const e = ss(0, .2, u) * ss(1, .62, u); t = zero ? -.0025 : st.T * Math.pow(e, .7) + .0008 * (1 - e); }
      const d = dirOf(fr, th, ph); const p = surf(head, d); const n = normalAt(head, p); if (t > 0 && !opt.flat) t *= .5 + .5 * ss(-.03, -.13, p.y) + .15 * ss(.03, 0, Math.abs(p.x)); if (st.curl && t > 0) t += st.curl * (Math.abs(Math.sin(p.x * 260 + Math.sin(p.y * 200) * 2) * Math.sin(p.y * 260 + p.z * 150)) - .3) * (t / st.T); const q = p.addScaledVector(n, t);
      pos.push(q.x, q.y, q.z); const tg = new THREE.Vector3(0, -1, 0).addScaledVector(n, -(-n.y)).normalize(); tan.push(tg.x, tg.y, tg.z); aux.push(.5 + .5 * Math.sin(ph * 40), i / NR, ph / 6.283, 5); } }
  for (let j = 0; j < NPH; j++) for (let i = 0; i < NR - 1; i++) { const a = j * NR + i, b = (j + 1) * NR + i; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aT', new THREE.Float32BufferAttribute(tan, 3)); g.setAttribute('aH', new THREE.Float32BufferAttribute(aux, 4)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
