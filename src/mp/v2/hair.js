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
  std: [[0, 42], [22, 40], [42, 33], [60, 25], [72, 6], [80, 2], [88, 12], [100, 14], [118, -6], [140, -28], [180, -42]], // short men's: sideburns, above the ears, nape
  low: [[0, 37], [25, 35], [45, 29], [62, 21], [72, 4], [80, 0], [88, 10], [100, 12], [118, -8], [140, -30], [180, -44]],
  nat: [[0, 41], [12, 41.5], [24, 40], [34, 36.5], [44, 32.5], [53, 30], [61, 25], [66, 17], [71, -6], [77, -12], [83, -3], [89, 12], [100, 14], [118, -6], [140, -26], [180, -40]], // soft temple corners + sideburns
  high: [[0, 44], [25, 41], [45, 34], [62, 27], [72, 14], [85, 16], [100, 18], [120, 0], [150, -18], [180, -28]], // fades / receding
  recede: [[0, 47], [20, 46], [38, 32], [55, 24], [72, 6], [80, 2], [88, 12], [100, 14], [118, -6], [140, -28], [180, -42]],
  fem: [[0, 38], [22, 37], [38, 31], [49, 20], [57, 5], [64, -12], [74, -22], [95, -24], [120, -30], [150, -34], [180, -36]], // covers the ears (long styles)
  back: [[0, 40], [22, 38], [42, 30], [58, 21], [70, 10], [80, 6], [92, 10], [105, 6], [125, -12], [150, -28], [180, -38]], // pulled back (braids / buns / ponytails): ears free
};

// ---------- style table. T thickness (m), top extra, side factor, front volume, locks, lockAmp, fringe tips, curl bumps, drop (long), extras
// drop: { len (m below head centre), front (|az| where the drop starts), flare }
const S = (o) => Object.assign({ line: 'std', T: .007, top: .006, side: .8, front: 0, frontLift: 0, locks: 0, lockAmp: 0, tips: 0, curl: 0, tilt: 14, drop: null, ex: [], ears: true, part: 0, sweep: 0 }, o);
export const STYLES = {
  bald: null,
  buzz: S({ soft: 1, T: .0026, top: .0005, side: 1, locks: 0, line: 'std', hlFade: .05, fade: .35 }),
  crew: S({ T: .006, top: .008, side: .55, locks: 20, lockAmp: 0.0018, tips: .2 }),
  caesar: S({ T: .006, top: .005, side: .6, locks: 20, lockAmp: 0.0016, tips: .5, line: 'low' }),
  lowfade: S({ soft: 1, T: .007, top: .012, side: .35, locks: 24, lockAmp: .002, tips: .25, line: 'std', fade: .5 }),
  midfade: S({ soft: 1, T: .008, top: .016, side: .25, locks: 22, lockAmp: .0024, tips: .3, line: 'high', fade: .7 }),
  highfade: S({ soft: 1, T: .009, top: .02, side: .15, locks: 20, lockAmp: .0028, tips: .3, line: 'high', fade: .9 }),
  waves: S({ T: .0045, top: .003, side: .8, waves: 1 }),
  curlcrop: S({ T: .01, top: .016, side: .55, curl: .006, curlN: 22 }),
  curlfade: S({ T: .01, top: .028, side: .2, curl: .007, curlN: 20, line: 'high', fade: .8 }),
  afro: S({ T: .05, top: .025, side: .95, curl: .006, curlN: 16, line: 'low', ears: false, round: 1 }),
  afromini: S({ T: .026, top: .014, side: .9, curl: .005, curlN: 18, line: 'low', round: .6 }),
  sidepart: S({ T: .008, top: .012, side: .6, front: .008, locks: 16, lockAmp: 0.0022, part: 1, sweep: 1 }),
  slickback: S({ T: .0075, top: .01, side: .7, locks: 20, lockAmp: 0.0016, sweep: 0, tilt: 40 }),
  quiff: S({ T: .008, top: .014, side: .45, front: .03, frontLift: 1, locks: 22, lockAmp: .0025, tips: .3, fade: .4 }),
  pomp: S({ T: .009, top: .018, side: .45, front: .045, frontLift: 1.3, locks: 30, lockAmp: .002, fade: .3, tilt: 30 }),
  undercut: S({ soft: 1, T: .009, top: .022, side: .1, front: .022, frontLift: 1, locks: 22, lockAmp: .003, tips: .3, line: 'high', fade: 1 }),
  messy: S({ T: .009, top: .027, side: .2, front: .014, frontLift: .6, locks: 13, lockAmp: .006, tips: 1.5, sweep: .6, fade: .3, line: 'nat', tufts: 26, minT: .0038 }), // tousled (guy reference): volume from separate swept clumps
  spiky: S({ T: .008, top: .012, side: .5, locks: 14, lockAmp: .006, tips: 1, spikes: .03 }),
  mohawk: S({ soft: 1, T: .006, top: .03, side: .0, locks: 12, lockAmp: .004, tips: .6, mohawk: 1, line: 'high', fade: 1 }),
  receding: S({ T: .006, top: .008, side: .6, locks: 28, lockAmp: .0014, line: 'recede' }),
  bowl: S({ T: .012, top: .012, side: .9, locks: 16, lockAmp: 0.0026, line: 'low', bangs: 1, ears: false }),
  manbun: S({ T: .007, top: .006, side: .7, locks: 18, lockAmp: 0.0018, line: 'back', tilt: 40, ex: [['bun', 'top', .045]] }),
  ponylow: S({ T: .0075, top: .006, side: .75, locks: 18, lockAmp: 0.0018, line: 'back', tilt: 40, ex: [['pony', 'low', .26]] }),
  ponyhigh: S({ T: .0075, top: .006, side: .75, locks: 18, lockAmp: 0.0018, line: 'back', tilt: 25, ex: [['pony', 'high', .3]] }),
  bunhigh: S({ T: .0075, top: .006, side: .75, locks: 18, lockAmp: 0.0018, line: 'back', tilt: 30, ex: [['bun', 'top', .058]] }),
  bunlow: S({ T: .0075, top: .006, side: .75, locks: 18, lockAmp: 0.0018, line: 'back', tilt: 45, ex: [['bun', 'low', .055]] }),
  spacebuns: S({ T: .0075, top: .006, side: .75, locks: 18, lockAmp: 0.0018, line: 'back', tilt: 20, ex: [['puffs', .05, 0]] }),
  afropuffs: S({ T: .009, top: .006, side: .75, curl: .003, curlN: 26, line: 'back', tilt: 20, ex: [['puffs', .07, 1]] }),
  pigtails: S({ T: .0075, top: .006, side: .75, locks: 18, lockAmp: 0.0018, line: 'back', tilt: 20, part: 2, ex: [['pigtails', .24]] }),
  braids2: S({ T: .0085, top: .006, side: .8, locks: 0, line: 'back', tilt: 30, part: 2, cornrow: 2, ex: [['dutch', .4]] }), // two Dutch braids (girl reference)
  braidpony: S({ T: .0075, top: .006, side: .75, locks: 18, lockAmp: 0.0018, line: 'back', tilt: 35, ex: [['braidpony', .45]] }),
  cornrows: S({ T: .0065, top: .0, side: 1, cornrow: 8, line: 'std', tilt: 30 }),
  bob: S({ T: .011, top: .012, side: .95, locks: 15, lockAmp: 0.0026, line: 'fem', ears: false, part: 1, drop: { front: 62, end: -0.14, flare: .01, curve: .6, tipTurn: -.012 } }),
  lob: S({ T: .011, top: .012, side: .95, locks: 15, lockAmp: 0.0026, line: 'fem', ears: false, part: 1, drop: { front: 62, end: -0.18, flare: .015, curve: .4, tipTurn: -.006 } }),
  pixie: S({ T: .0085, top: .02, side: .45, front: .012, frontLift: .8, locks: 14, lockAmp: .005, tips: 1.1, sweep: 1.2, fade: .3, line: 'nat', tufts: 20, minT: .0036 }),
  shoulder: S({ T: .011, top: .012, side: .95, locks: 16, lockAmp: 0.0026, line: 'fem', ears: false, part: 1, drop: { front: 62, end: -0.2, flare: .02, curve: .3, tipTurn: .008 } }),
  longstr: S({ T: .011, top: .012, side: .95, locks: 16, lockAmp: 0.0026, line: 'fem', ears: false, part: 1, drop: { sh: .03, front: 60, end: -0.42, flare: .02, curve: .2 } }),
  longwave: S({ T: .012, top: .014, side: .95, locks: 13, lockAmp: 0.003, line: 'fem', ears: false, part: 1, drop: { sh: .03, front: 60, end: -0.4, flare: .03, curve: .2, wave: .014, waveN: 8 } }),
  longcurl: S({ T: .014, top: .016, side: .95, curl: .004, curlN: 20, line: 'fem', ears: false, drop: { sh: .03, front: 60, end: -0.36, flare: .04, curve: .3, wave: .02, waveN: 10, ring: .006 } }),
  curtain: S({ T: .011, top: .012, side: .95, locks: 16, lockAmp: 0.0026, line: 'fem', ears: false, part: 3, bangs: .6, drop: { sh: .03, front: 52, end: -0.42, flare: .02, curve: .2 } }),
  dreads: S({ T: .008, top: .007, side: .95, line: 'low', ears: false, locsN: 46, ex: [['locs', .3]] }),
  twists: S({ T: .007, top: .004, side: .9, line: 'std', locsN: 44, ex: [['locs', .07]] }),
  // New styles (original cartoon shapes, not copies of a brand). Long / ear-covering ones hide ears and earrings.
  mullet: S({ T: .009, top: .016, side: .35, front: .01, locks: 16, lockAmp: 0.0028, tips: .4, line: 'std', drop: { front: 105, end: -0.3, flare: .022, curve: .22 } }),
  shag: S({ T: .012, top: .018, side: .9, locks: 11, lockAmp: 0.0042, tips: .9, bangs: .55, line: 'fem', ears: false, part: 1, drop: { front: 52, end: -0.17, flare: .026, curve: .42, tipTurn: .01 } }),
  wolf: S({ T: .013, top: .024, side: .95, locks: 11, lockAmp: 0.0045, tips: 1, bangs: .7, line: 'fem', ears: false, part: 1, drop: { sh: .02, front: 48, end: -0.32, flare: .032, curve: .34 } }),
  halfup: S({ T: .011, top: .01, side: .95, locks: 16, lockAmp: 0.0024, line: 'fem', ears: false, part: 3, drop: { sh: .03, front: 58, end: -0.38, flare: .02, curve: .2 }, ex: [['bun', 'crown', .03]] }),
  topknot: S({ T: .006, top: .004, side: .4, fade: .45, line: 'back', tilt: 18, ex: [['bun', 'top', .036]] }),
  bantu: S({ T: .006, top: .002, side: .85, line: 'low', ex: [['knots', 7, .019]] }),
  curlybob: S({ T: .014, top: .016, side: .95, curl: .005, curlN: 18, line: 'fem', ears: false, part: 1, drop: { front: 62, end: -0.13, flare: .022, curve: .55 } }),
  sidebang: S({ T: .011, top: .012, side: .95, bangs: 1, part: 1, locks: 16, lockAmp: 0.0024, line: 'fem', ears: false, drop: { sh: .03, front: 48, end: -0.4, flare: .02, curve: .2 } }),
  bluntbangs: S({ T: .011, top: .012, side: .95, bangs: 1.1, part: 3, locks: 16, lockAmp: 0.002, line: 'fem', ears: false, drop: { sh: .03, front: 44, end: -0.4, flare: .014, curve: .12 } }),
  longlocs: S({ T: .008, top: .007, side: .95, line: 'low', ears: false, locsN: 48, ex: [['locs', .48]] }),
  coils: S({ T: .016, top: .02, side: .9, curl: .008, curlN: 28, line: 'low', round: .5 }),
  messybun: S({ T: .009, top: .01, side: .8, locks: 14, lockAmp: 0.003, tips: .6, line: 'back', ears: false, drop: { front: 80, end: -0.08, flare: .012 }, ex: [['bun', 'top', .07]] }),
  fringepony: S({ T: .0075, top: .006, side: .75, bangs: .85, line: 'back', tilt: 25, ex: [['pony', 'high', .3]] }),
  curlypony: S({ T: .01, top: .01, side: .8, curl: .004, curlN: 18, line: 'back', tilt: 25, ex: [['pony', 'high', .32]] }),
  braidedbun: S({ T: .008, top: .0, side: 1, cornrow: 6, line: 'back', tilt: 35, ex: [['bun', 'low', .052]] }),
  hime: S({ T: .011, top: .012, side: .95, bangs: 1, part: 3, line: 'fem', ears: false, drop: { sh: .025, front: 38, end: -0.36, flare: .01, curve: .1 } }),
  pineapple: S({ T: .012, top: .01, side: .8, curl: .005, curlN: 16, line: 'back', tilt: 15, ex: [['pony', 'high', .36]] }),
  doublepony: S({ T: .0075, top: .006, side: .75, line: 'back', tilt: 18, part: 2, ex: [['highpigtails', .28]] }),
  frenchbraid: S({ T: .007, top: .0, side: .85, cornrow: 1, line: 'back', tilt: 35, ex: [['braidpony', .5]] }),
  flipbob: S({ T: .011, top: .012, side: .95, locks: 14, lockAmp: 0.0028, line: 'fem', ears: false, part: 1, drop: { front: 62, end: -0.13, flare: .032, curve: .5, tipTurn: .02 } }),
  softcurl: S({ T: .013, top: .015, side: .95, curl: .004, curlN: 18, line: 'fem', ears: false, drop: { sh: .025, front: 58, end: -0.22, flare: .03, curve: .35, wave: .016, waveN: 8 } }),
  pageboy: S({ T: .01, top: .01, side: .85, locks: 18, lockAmp: 0.002, line: 'low', bangs: .4, ears: false }),
  layers: S({ T: .012, top: .014, side: .95, locks: 12, lockAmp: 0.0036, tips: .5, part: 3, line: 'fem', ears: false, drop: { sh: .03, front: 56, end: -0.4, flare: .026, curve: .28, tipTurn: .008 } }),
};
// aliases for old saved ids (removed styles -> closest kept style)
export const ALIAS = { dreadsshort: 'twists', afrotaper: 'afromini', wavefade: 'waves', hitop: 'curlfade', fauxhawk: 'mohawk', balding: 'receding', boxbraids: 'braids2', bobbraids: 'braids2', fringe: 'bowl' };
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
  const line = LINES[st.line] || LINES.std; const fr = frame(st.tilt); const NPH = 128, NU = 36;
  const lineAt = (a, e) => { const aa = Math.abs(a); let l = interp(line, aa); if (st.bangs && aa < 40) l = Math.min(l, l - 16 * st.bangs * Math.cos(aa / 40 * Math.PI / 2)); if (st.mohawk && aa < 150) l = Math.max(l, 90 - 12 * (1 - aa / 150) - (aa > 0 ? 0 : 0)) ; return l; };
  const inside = d => { const [a, e] = azEl(d); if (st.mohawk) { if (Math.abs(d.x) > .036) return false; return e > -30; } return e > lineAt(a, e); };
  // boundary angle per column
  const thB = new Float32Array(NPH);
  for (let j = 0; j < NPH; j++) { const ph = j / NPH * Math.PI * 2; let th = 0; while (th < 175 * D2R && inside(dirOf(fr, th, ph))) th += 1 * D2R; let a = th - D2R, b = th; for (let k = 0; k < 14; k++) { const m = (a + b) / 2; if (inside(dirOf(fr, m, ph))) a = m; else b = m; } thB[j] = (a + b) / 2; }
  // fringe tips: scallop the boundary on the front half with the lock pattern
  const lockPh = ph => { const w = st.locks || 1; return ph * w + 2.4 * (vnoise1(ph * 2.3 + 4) - .5) * 2 + .8 * Math.sin(ph * 3 + 1); };
  if (st.tips) for (let j = 0; j < NPH; j++) { const ph = j / NPH * Math.PI * 2; const d = dirOf(fr, thB[j], ph); const [a] = azEl(d); const fw = ss(110, 30, Math.abs(a)); const g = .5 + .5 * Math.cos(lockPh(ph)); thB[j] *= 1 + st.tips * fw * .07 * (Math.pow(g, 2) - .35); }
  for (let pass = 0; pass < 3; pass++) { const tmp = Float32Array.from(thB); for (let j = 0; j < NPH; j++) thB[j] = (tmp[(j + NPH - 1) % NPH] + 2 * tmp[j] + tmp[(j + 1) % NPH]) / 4; }
  const pos = [], tan = [], aux = [], aE = [], idx = []; const drop = st.drop;
  const thick = (d, u, ph) => { const [a, e] = azEl(d); const top = ss(-.25, .9, d.y); let t = st.T * (st.side + (1 - st.side) * top) + st.top * Math.pow(top, 1.5);
    if (st.fade) t *= 1 - st.fade * .75 * ss(.35, -.15, d.y) ;
    if (st.front) { const fw = ss(60, 0, Math.abs(a)) * ss(.0, .55, d.y) * ss(.98, .6, d.y); t += st.front * fw * (st.frontLift ? 1 : .6); }
    if (st.round) t += st.T * .25 * ss(-.3, .5, d.y);
    if (st.locks && st.lockAmp) { const g = .5 + .5 * Math.cos(lockPh(ph)); const amp = .6 + .8 * vnoise1(ph * 5.7 + 2); t += st.lockAmp * .65 * amp * (Math.sqrt(g) - .55) * (1 - .5 * ss(.85, 1, u)); }
    if (st.curl) { const k = st.curlN || 20; const c = Math.sin(d.x * k * 6.3 + Math.sin(d.y * k * 4) * 1.5) * Math.sin(d.y * k * 6.3 + d.z * k * 3) * Math.sin(d.z * k * 6.3 + d.x * k * 2); t += st.curl * (Math.abs(c) - .3); }
    if (st.spikes) { const g = Math.pow(.5 + .5 * Math.cos(lockPh(ph)), 4); t += st.spikes * g * ss(.2, .9, d.y); }
    if (st.cornrow) { const k = st.cornrow * 2; const v = Math.abs(Math.sin(Math.atan2(d.x, .35) * k * 1.2)); t += .0048 * (Math.pow(v, .5) - .5); }
    if (st.waves) { const v = Math.sin(Math.hypot(d.x * 3, d.z + .3, d.y - .9) * 70); t += .0012 * v; }
    if (st.part) { const px = st.part === 1 ? .045 : st.part === 3 ? 0 : 0; const pd = Math.abs(d.x - (st.part === 2 ? 0 : px)); if (d.y > .4 && d.z > -.3) t -= .004 * ss(.012, .0, pd) * ss(.4, .7, d.y); }
    if (st.ears === false) { const [aa] = azEl(d); const earAz = ss(55, 80, Math.abs(aa)) * ss(120, 95, Math.abs(aa)) * ss(.08, -0.06, d.y) * ss(-0.12, -0.02, d.y); t += 0.014 * earAz; }
    return Math.max(st.minT || .0012, t); };
  // rows: u in [0, 1] crown -> hairline, then a tuck ring just under the skin
  const cols = [];
  for (let j = 0; j <= NPH; j++) { const jj = j % NPH, ph = jj / NPH * Math.PI * 2; const col = []; const pe = surf(head, dirOf(fr, thB[jj], ph)); const useW = drop ? ss(drop.front - 2, drop.front + (drop.edge || 13), Math.abs(azEl(dirOf(fr, thB[jj], ph))[0])) : 0; const FL = st.hlFade || .02; const eF = p => 1 - Math.min(1, p.distanceTo(pe) / FL);
    for (let i = 0; i <= NU; i++) { const u = i / NU; const th = thB[jj] * u * (1.55 - .55 * u); const d = dirOf(fr, Math.max(th, 1e-4), ph); const p = surf(head, d); const n = normalAt(head, p); const edge = ss(1, .8, u);
      const lip = st.soft ? .0009 : .0026; const tk = thick(d, u, ph); const edgeF = st.round ? Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, (u - .45) / .55), 2.4))) : Math.pow(edge, .35); let t = Math.max(tk * edgeF, lip * ss(.5, .97, u)) * (1 - ss(.985, 1, u) * .35); t += (tk * ss(.9, 1, u) * .95 - t) * useW * ss(.7, 1, u); const q = p.clone().addScaledVector(n, t); col.push({ q, n, d, u, ph, t, e: eF(p), uw: useW }); }
    { const d = dirOf(fr, thB[jj] + 1.2 * D2R, ph); const p = surf(head, d); const n = normalAt(head, p); col.push({ q: p.clone().addScaledVector(n, -.0025), n, d, u: 1.02, ph, t: -.0025, e: 1 }); }
    cols.push(col); }
  const NR = cols[0].length;
  // flow tangent (crown -> hairline) and lock groove value for the shader
  for (let j = 0; j <= NPH; j++) for (let i = 0; i < NR; i++) { const c = cols[j][i], nx = cols[j][Math.min(NR - 1, i + 1)], pv = cols[j][Math.max(0, i - 1)]; const t = nx.q.clone().sub(pv.q).normalize(); const g = st.cornrow ? Math.pow(Math.abs(Math.sin(Math.atan2(c.d.x, .35) * st.cornrow * 2 * 1.2)), .5) * 1.1 - .05 : st.locks ? .5 + .5 * Math.cos(lockPh(c.ph)) : .5;
    pos.push(c.q.x, c.q.y, c.q.z); tan.push(t.x, t.y, t.z); aux.push(g, c.u, c.ph / (Math.PI * 2), st.soft ? .25 : st.cornrow ? .07 : c.uw > .02 ? .05 : 0); aE.push(c.e); }
  for (let j = 0; j < NPH; j++) for (let i = 0; i < NR - 1; i++) { const a = j * NR + i, b = (j + 1) * NR + i; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  let geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('aT', new THREE.Float32BufferAttribute(tan, 3)); geo.setAttribute('aH', new THREE.Float32BufferAttribute(aux, 4)); geo.setAttribute('aE', new THREE.Float32BufferAttribute(aE, 1)); geo.setIndex(idx); geo.computeVertexNormals();
  const parts = [geo];
  if (drop) parts.push(buildDrop(head, st, fr, cols, thB, NPH, NR));
  if (st.tufts) parts.push(...buildTufts(head, st, d => thick(d, .5, 0), d => inside(d)));
  return parts;
}

// long hair: from the hairline ring on the sides / back, the sheet leaves the head and hangs down (closed slab: outer + inner + tips)
function buildDrop(head, st, fr, cols, thB, NPH, NR) {
  const dr = st.drop; const yEnd = dr.end; const pos = [], tan = [], aux = [], idx = []; const NS = 26;
  const rows = []; const useCols = [], lenCols = [];
  for (let j = 0; j <= NPH; j++) { const c = cols[j][NR - 2]; const [a] = azEl(c.d); const aa = Math.abs(a); useCols.push(ss(dr.front - 2, dr.front + (dr.edge || 13), aa)); lenCols.push(.35 + .65 * ss(dr.front - 2, dr.front + (dr.slant ?? 22), aa)); }
  const lockPh0 = ph => ph * (st.locks || 1);
  // chest / upper-back keep-out (head-local metres, from the base body): hair rests on the shoulders, in front of the collarbones or behind the back, never inside the jacket
  const chestZ = (ax, y) => (.082 * ss(.105, .07, ax)) * ss(-.19, -.25, y);
  for (let j = 0; j <= NPH; j++) { const c0 = cols[j][NR - 3], c1 = cols[j][NR - 2]; const w = useCols[j]; const start = c1.q.clone().addScaledVector(c1.n, -.0095 * Math.min(1, w * 2)); const row = [];
    const th = Math.atan2(start.x, start.z), r0 = Math.hypot(start.x, start.z), sn = Math.sin(th), cs = Math.cos(th); const ph = j / NPH * Math.PI * 2;
    const rp = c0.q, rpr = Math.hypot(rp.x, rp.z); const dyc = start.y - rp.y; let m0 = Math.abs(dyc) > 1e-5 ? (r0 - rpr) / dyc : 0; m0 = Math.max(-.2, Math.min(.9, m0)); // cap slope dr/dy at the hairline
    const hem = 1 + .05 * (vnoise1(j * .5 + 3) - .5) * 2 * (dr.hem ?? 1) + .035 * (dr.hem ?? 1) * Math.cos(lockPh0(ph) * .5);
    const len = (start.y - yEnd) * (w > .01 ? lenCols[j] : 0) * hem;
    const rx1 = (dr.rx || .136) + (dr.flare || 0) * 1.6, rz1 = dr.rz || .12; let E = 1 / Math.sqrt((sn / rx1) ** 2 + (cs / rz1) ** 2); if (cs > 0) E *= 1 - .12 * cs; const rEnd = Math.max(r0 * .97, E);
    for (let k = 0; k <= NS; k++) { const t = k / NS; const y = start.y - len * t;
      // cubic Hermite radius: leaves the cap along its own slope (smooth shoulder of the hair mass), ends vertical at rEnd
      const t2 = t * t, t3 = t2 * t; const v0 = Math.min(0, -m0 * len) * 0 + m0 * (-len) * (dr.keep ?? .8); let r = (2 * t3 - 3 * t2 + 1) * r0 + (t3 - 2 * t2 + t) * v0 + (-2 * t3 + 3 * t2) * rEnd;
      r += (dr.curve || 0) * .1 * Math.sin(t * Math.PI) * Math.max(0, E) + (dr.tipTurn || 0) * ss(.7, 1, t);
      if (cs > 0) r *= 1 - .2 * cs * ss(-.12, -.3, y);
      let x = r * sn, z = r * cs;
      if (dr.wave) { const ww = dr.wave * Math.sin(t * (dr.waveN || 9) + j * .31) * t * w; x += sn * ww; z += cs * ww; x += cs * ww * .6; z -= sn * ww * .6; }
      if (dr.ring) { const rr = dr.ring * Math.sin(t * 38 + hash(j * .7) * 6.28 + j * .9) * Math.sin(t * Math.PI) * w; x += sn * rr + cs * rr * .8; z += cs * rr - sn * rr * .8; }
      // covering styles: lift the sheet out over the ear so the lobe never pokes through
      if (st.ears === false) {
        const ey = (head.L && ((head.L.browY + head.L.noseY) * 0.5)) || -0.02;
        const earBand = Math.exp(-Math.pow((y - ey) / 0.06, 2)) * Math.max(0, Math.abs(sn) - 0.25);
        const out = 0.022 * earBand * Math.max(w, 0.4);
        x += Math.sign(sn || 1) * out;
        z += out * 0.15;
      }
      // body keep-out (head-local metres, from the base body): the hair mass hangs behind the back, and in front of the collarbones at the sides / front
      const bb = ss(-.15, -.22, y); if (bb > 0) { const wbk = ss(-.05, -.35, cs), wfr = ss(-.12, .12, cs);
        if (wbk > 0) { const bz = -.125 - .035 * ss(-.2, -.42, y); z += (Math.min(z, bz) - z) * bb * wbk; }
        if (wfr > 0) { const fz = .03 + chestZ(Math.min(.09, Math.abs(x)), y) * 1.0; z += (Math.max(z, fz) - z) * bb * wfr * ss(.3, .0, sn * sn * 0 + (1 - wfr) * 0); }
        const xm = (dr.xmax || .14); if (Math.abs(x) > xm) x = Math.sign(x) * (xm + (Math.abs(x) - xm) * (1 - bb)); }
      row.push(new THREE.Vector3(x, y, z)); }
    rows.push(row); }
  // outer + inner sheets
  const TH = .009; const base = 0;
  const push = (p, tg, g, u, zc) => { pos.push(p.x, p.y, p.z); tan.push(tg.x, tg.y, tg.z); aux.push(g, u, zc, 1); };
  const nrm = (j, k) => { const a = rows[Math.max(0, j - 1)][k], b = rows[Math.min(NPH, j + 1)][k]; const c = rows[j][Math.max(0, k - 1)], d = rows[j][Math.min(NS, k + 1)]; return b.clone().sub(a).cross(d.clone().sub(c)).normalize(); };
  const lockPh = ph => { const w = st.locks || 1; return ph * w; };
  for (const layer of [0, 1]) for (let j = 0; j <= NPH; j++) for (let k = 0; k <= NS; k++) { const p = rows[j][k].clone(); const n = nrm(j, k); if (n.x * p.x + n.z * p.z < 0) n.negate(); const tg = rows[j][Math.min(NS, k + 1)].clone().sub(rows[j][Math.max(0, k - 1)]).normalize(); const g = .5 + .5 * Math.cos(lockPh(j / NPH * Math.PI * 2));
    const tip = ss(.75, 1, k / NS); if (layer === 1) p.addScaledVector(n, (TH * (1 - .7 * tip * tip) + (st.lockAmp || 0) * 1.4 * (g - .5) * (1 - tip)) * useCols[j]); else p.addScaledVector(n, -.001 - (st.lockAmp || 0) * g * (1 - tip));
    push(p, tg, g, 1 + k / NS, j / NPH); }
  const NC = (NPH + 1) * (NS + 1);
  for (let j = 0; j < NPH; j++) { if (useCols[j] < .3 && useCols[j + 1] < .3) continue; for (let k = 0; k < NS; k++) { const a = j * (NS + 1) + k, b = (j + 1) * (NS + 1) + k; idx.push(a, b, a + 1, b, b + 1, a + 1); idx.push(NC + a, NC + a + 1, NC + b, NC + b, NC + a + 1, NC + b + 1); }
    const a = j * (NS + 1) + NS, b = (j + 1) * (NS + 1) + NS; idx.push(a, b, NC + a, b, NC + b, NC + a);
    const lo = useCols[j] < .3 && useCols[j + 1] >= .3, hi = useCols[j] >= .3 && useCols[j + 1] < .3; if (lo || hi) { const c = lo ? j + 1 : j; for (let k = 0; k < NS; k++) { const a0 = c * (NS + 1) + k; idx.push(a0, NC + a0, a0 + 1, NC + a0, NC + a0 + 1, a0 + 1); } } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aT', new THREE.Float32BufferAttribute(tan, 3)); g.setAttribute('aH', new THREE.Float32BufferAttribute(aux, 4)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

// tousled clumps: tapered, grooved locks lying on the hair surface, swept forward / sideways from the crown, tips lifting off the surface
function buildTufts(head, st, thickAt, inside) {
  const out = []; const dirAE = (az, el) => new THREE.Vector3(Math.sin(az * D2R) * Math.cos(el * D2R), Math.sin(el * D2R), Math.cos(az * D2R) * Math.cos(el * D2R));
  const P = (az, el, lift) => { const d = dirAE(az, el); const p = surf(head, d); const n = normalAt(head, p); return p.addScaledVector(n, (inside(d) ? thickAt(d) : .002) + lift); };
  const N = st.tufts; for (let i = 0; i < N; i++) { const h1 = hash(i * 3.1 + 1), h2 = hash(i * 7.7 + 2), h3 = hash(i * 1.3 + 5);
    let az0, el0, az1, el1, tipLift; // start (crown side) -> tip
    if (i < N * .5) { const k = i / (N * .5); az0 = -55 + 110 * k + (h1 - .5) * 12; el0 = 70 + h2 * 8; az1 = az0 * .95 + 16 * st.sweep + (h3 - .5) * 18; el1 = 44 + h2 * 7 - Math.abs(az1) * .06; tipLift = .009 + .006 * h3; } // fringe: tips overhang the forehead
    else if (i < N * .82) { const k = (i - N * .5) / (N * .32); const sd = k < .5 ? -1 : 1; az0 = sd * (45 + 55 * ((k * 2) % 1)) + (h1 - .5) * 10; el0 = 62 + h2 * 8; az1 = az0 + sd * (10 + 10 * h3); el1 = 36 + h2 * 8; tipLift = .004 + .004 * h3; } // sides
    else { const k = (i - N * .82) / (N * .18); az0 = -140 + 280 * k + (h1 - .5) * 20; el0 = 74 + h2 * 6; az1 = az0 * 1.05 + (h3 - .5) * 16; el1 = 48 + h3 * 10; tipLift = .004; } // crown / back
    const r = .011 + .005 * h2;
    const pts = [P(az0, el0, -r * .4), P(az0 + (az1 - az0) * .4, el0 + (el1 - el0) * .4, r * .15), P(az0 + (az1 - az0) * .78, el0 + (el1 - el0) * .78, tipLift * .5 + r * .1), P(az1, el1, tipLift)];
    const [g] = tube(pts, r, .0032, { seg: 9, rad: 6, groove: .22, pow: .8, tipRound: 1 }); // blunter tips: thin needle tips read as straws in close-up
    { const pa = g.attributes.position, rad = 6, v = new THREE.Vector3(), c = new THREE.Vector3(); for (let ii = 0; ii <= 9; ii++) { c.set(0, 0, 0); for (let j = 0; j <= rad; j++) c.add(v.fromBufferAttribute(pa, ii * (rad + 1) + j)); c.multiplyScalar(1 / (rad + 1)); const n = c.clone().normalize();
      for (let j = 0; j <= rad; j++) { const id = ii * (rad + 1) + j; v.fromBufferAttribute(pa, id).sub(c); v.addScaledVector(n, -v.dot(n) * .5); v.add(c); pa.setXYZ(id, v.x, v.y, v.z); } } g.computeVertexNormals(); }
    out.push(g); }
  return out;
}

// ---------- extras
function lumpChain(pts, r0, r1, opt = {}) { // braid-like lumps along a polyline (3-strand look: alternating tilted ellipsoids)
  const curve = new THREE.CatmullRomCurve3(pts); const Ls = curve.getLength(); const N = Math.max(4, Math.round(Ls / (opt.step || .016))); const geos = []; const up = new THREE.Vector3();
  for (let i = 0; i <= N; i++) { const t = i / N; const p = curve.getPointAt(t), tg = curve.getTangentAt(t); const r = r0 + (r1 - r0) * t; const side = i % 2 ? 1 : -1;
    up.set(0, 0, 1); if (Math.abs(up.dot(tg)) > .9) up.set(1, 0, 0); const bx = new THREE.Vector3().crossVectors(tg, up).normalize(); const by = new THREE.Vector3().crossVectors(bx, tg).normalize();
    const g = new THREE.SphereGeometry(1, 9, 6); const m = new THREE.Matrix4(); const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(bx, tg, by)); const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), side * .55);
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
    else if (k === 'locs' && a1 < .1) { // short twists: small coils over the whole scalp
      let i = 0; for (let el = 14; el <= 86; el += 8) { const n2 = Math.max(5, Math.round(34 * Math.cos(el * Math.PI / 180))); for (let j = 0; j < n2; j++) { const az = -180 + 360 * (j + .5 * (Math.round(el / 8) % 2)) / n2; if (Math.abs(az) < 62 && el < 42) continue; i++; const dEl = Math.min(el, 11); const r = .0078; const up = st.T * .5 + .002;
        out.push(...tube([scalpPt(head, az, el + 4, up), scalpPt(head, az, el, up + .003), scalpPt(head, az, el - dEl * .55, up + .004), scalpPt(head, az, el - dEl, up + .001)], r, r * .75, { seg: 5, rad: 5, groove: .3, tipRound: 1 })); } } }
    else if (k === 'knots') { const n = a1 || 6, r = a2 || .02; for (let i = 0; i < n; i++) { const az = -160 + 320 * (i + .5) / n; const el = 38 + 22 * Math.cos(i * 1.8); const p = scalpPt(head, az, el, T + r * .55); out.push(...ball(p, r * (.92 + .16 * (i % 3 === 0 ? 1 : 0)), [1, .9, 1])); } }
    else if (k === 'highpigtails') { for (const sd of [-1, 1]) { const p0 = scalpPt(head, sd * 95, 42, T + .006); const L = a1; const pts = [p0, p0.clone().add(new THREE.Vector3(sd * .04, -.02, -.02)), p0.clone().add(new THREE.Vector3(sd * .06, -L * .5, -.03)), p0.clone().add(new THREE.Vector3(sd * .05, -L, -.01))]; out.push(...ball(p0, .016)); out.push(...tube(pts, .024, .006, { seg: 24, rad: 10, groove: .12, pow: .7, tipRound: 1 })); } }
    else if (k === 'locs') { const N = st.locsN || 30; for (let i = 0; i < N; i++) { const az = -172 + 344 * (i + .5) / N; if (Math.abs(az) < 56 && a1 > .1) continue; const el = 22 + 10 * Math.cos(i * 2.3) + (hash(i * 3.3) - .5) * 10; const p0 = scalpPt(head, az, el, st.T); const n = p0.clone().normalize(); const sd = Math.sin(az * D2R), bk = Math.cos(az * D2R); const L = a1 * (.78 + .44 * hash(i)); const sw = (hash(i * 5.1) - .5) * .03;
      const pts = [p0.clone().addScaledVector(n, -.006), p0.clone().addScaledVector(n, .012), p0.clone().addScaledVector(n, .03).add(new THREE.Vector3(sd * .01 + sw, -.03, bk * .006)), p0.clone().addScaledVector(n, .04).add(new THREE.Vector3(sd * .012 + sw * 1.4, -L * .55, bk * .01)), p0.clone().addScaledVector(n, .036).add(new THREE.Vector3(sd * .01 + sw * 1.8, -L, bk * .006))];
      out.push(...tube(pts, .0115, .0055, { seg: 16, rad: 7, groove: .2, tipRound: 1, pow: .8 })); } }
  }
  return out;
}

// hair material: flow-aligned anisotropic highlight, lock grooves, root-to-tip tone, soft rim. One material per colour (shared).
const _mats = new Map();
export function hairMaterial(c1, c2, hl = .35, skin = null) { // skin: blend the sparse edges toward the skin tone (soft hairline / beard line)
  const key = c1 + c2 + hl.toFixed(2) + (skin || ''); if (_mats.has(key)) return _mats.get(key);
  const m = new THREE.MeshStandardMaterial({ color: c1, roughness: .74, metalness: 0, side: THREE.FrontSide });
  const U = { uC2: { value: new THREE.Color(c2) }, uHl: { value: hl }, uSk: { value: new THREE.Color(skin || '#000') }, uSkF: { value: skin ? 1 : 0 } };
  m.onBeforeCompile = sh => { Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aT; attribute vec4 aH; attribute float aE; varying vec3 vT; varying vec4 vH; varying vec3 vObjP; varying float vE;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvH = aH; vE = aE; vObjP = position; vT = normalize(normalMatrix * aT);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uC2; uniform float uHl; uniform vec3 uSk; uniform float uSkF; varying vec3 vT; varying vec4 vH; varying vec3 vObjP; varying float vE; float gStr;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float g = vH.x; float sx = vH.z * 240.0; float s0 = floor(sx); float sf = fract(sx); sf = sf * sf * (3.0 - 2.0 * sf);
        float h0 = fract(sin(s0 * 12.9898) * 43758.5453), h1 = fract(sin((s0 + 1.0) * 12.9898) * 43758.5453); gStr = mix(h0, h1, sf);
        float lenv = 0.5 + 0.5 * sin(vH.y * 9.0 + h0 * 6.0); gStr = gStr * (0.65 + 0.35 * lenv);
        vec3 c = diffuseColor.rgb * (0.94 + (vH.w > 0.06 && vH.w < 0.09 ? 0.12 : 0.05) * g) * (0.97 + 0.035 * gStr);
        if (vH.w < 0.03) c *= 1.0 - 0.3 * smoothstep(0.9, 1.0, vH.y);
        c = mix(c, uC2, uHl * 0.25 * smoothstep(0.4, 1.0, g));
        if (vH.w > 5.5) { // mustache: wispy short-strand edge
          float u = vH.y; float r1 = fract(sin(floor(vH.z * 300.0) * 12.9898) * 43758.5453), r2 = fract(sin(floor(vH.z * 1100.0 + 3.0) * 78.233) * 43758.5453);
          float r3 = fract(sin(dot(floor(vObjP * 1500.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453); float fo = vE, fi = smoothstep(0.08, 0.0, u);
          if (max(fo, fi * 0.6) > 0.1 + 0.9 * (r1 * 0.35 + r2 * 0.25 + r3 * 0.4)) discard; float fs = smoothstep(0.0, 0.85, vE) * (0.75 + 0.25 * r2); c = mix(c * (1.0 + 0.15 * fs), uSk * 0.86, uSkF * fs * 0.62 * 0.3); }
        else if (vH.w > 4.5 && vH.w < 5.1) { // other beard styles: opaque shell, strand-wispy feathered edge
          float u = vH.y; float r1 = fract(sin(floor(vH.z * 300.0) * 12.9898) * 43758.5453), r2 = fract(sin(floor(vH.z * 1100.0 + 3.0) * 78.233) * 43758.5453);
          float r3 = fract(sin(dot(floor(vObjP * 1500.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453); float fo = vE, fi = smoothstep(0.08, 0.0, u);
          if (max(fo, fi * 0.6) > 0.1 + 0.9 * (r1 * 0.35 + r2 * 0.25 + r3 * 0.4)) discard; float fs = smoothstep(0.0, 0.85, vE) * (0.75 + 0.25 * r2); c = mix(c * (1.0 + 0.15 * fs), uSk * 0.86, uSkF * fs * 0.62); }
        else if (vH.w > 4.5) { // close-trimmed beard: thin fuzzy shell over the skin-shader stubble; fine stipple that thins out toward the cheek line / neck
          float u = vH.y; float r2 = fract(sin(floor(vH.z * 1100.0 + 3.0) * 78.233) * 43758.5453);
          float r3 = fract(sin(dot(floor(vObjP * 2400.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453); float fi = smoothstep(0.1, 0.0, u);
          float keep = (0.78 * smoothstep(0.0, 0.8, 1.0 - vE)) * (1.0 - fi * 0.8); if ((r3 * 0.85 + r2 * 0.15) > keep) discard;
          c = mix(c, uSk * 0.7, uSkF * 0.35 * smoothstep(0.1, 0.8, vE)); }
        else if (vH.w < 0.1) { // scalp hair: opaque, rolled hairline lip (no skin-tone band)
          if (vH.y > 1.005) discard; }
        else if (vH.w < 0.5) { // soft (buzz / fade) hair: fades into the skin tone toward the hairline
          float g2 = smoothstep(0.15, 1.0, max(smoothstep(0.88, 1.0, vH.y), vE)); if (max(smoothstep(0.995, 1.0, vE), smoothstep(0.995, 1.012, vH.y)) > 0.5) discard; c = mix(c, uSk * 0.9, uSkF * g2 * 0.97); }
        diffuseColor.rgb = c;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { vec3 V = normalize(vViewPosition); vec3 N = normalize(vNormal); vec3 T = normalize(vT - N * dot(vT, N));
          vec3 L = normalize(vec3(0.35, 0.8, 0.5)); vec3 Hh = normalize(L + V); float th = dot(T, Hh); float sinTH = sqrt(max(0.0, 1.0 - th * th));
          float spec = (pow(sinTH, 36.0) * 0.12 + pow(sinTH, 10.0) * 0.05) * (0.7 + 0.3 * gStr); float rimF = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
          totalEmissiveRadiance += mix(diffuseColor.rgb, vec3(1.0), 0.22) * spec * (0.4 + 0.35 * vH.x) + diffuseColor.rgb * (0.06 + rimF * 0.1); }`);
  };
  m.customProgramCacheKey = () => 'v2hair11'; _mats.set(key, m); return m;
}

// ---------- facial hair: polar band around the mouth. Inner edge = first entry into the mask, outer edge = exit; both edges tuck under
// the skin, so beards have clean smooth outlines and a clean opening around the lips.
export const BEARD_STYLES = { // mask(p, a, L) on head-local surface points; T thickness, curl
  full: { trim: 1, T: .009, curl: .0022, fade: .018, mask: (p, a, L) => Math.abs(a) < 91 && offNeck(p) && p.y < cheekY(Math.abs(p.x)) && p.y > fullFloor(p) && !mouthHole(p, L, .016) },
  boxed: { T: .008, curl: .0016, mask: (p, a, L) => Math.abs(a) < 90 && offNeck(p) && p.y < topLine(a, L, .8) && !mouthHole(p, L, .008) },
  lumber: { T: .016, curl: .004, mask: (p, a, L) => Math.abs(a) < 92 && offNeck(p) && p.y < topLine(a, L, 1.15) && !mouthHole(p, L, .01) },
  goatee: { T: .009, curl: .002, mask: (p, a, L) => Math.abs(p.x) < .034 && p.y < L.mouthY - .006 && p.z > .02 },
  circle: { T: .009, curl: .002, mask: (p, a, L) => Math.abs(p.x) < .036 + .006 * Math.max(0, (L.mouthY - p.y) * 20) && p.y < L.mouthY + .022 && p.z > .02 && !mouthHole(p, L, .007) },
  strap: { T: .0075, curl: .0016, mask: (p, a, L) => Math.abs(a) < 84 && offNeck(p) && p.y < topLine(a, L, 1) && p.y < jawBand(p, a, L) && !mouthHole(p, L, .02) && !(Math.abs(p.x) < .06 && p.y > L.mouthY - .024) },
  curtain: { T: .009, curl: .002, mask: (p, a, L) => Math.abs(a) < 84 && offNeck(p) && p.y < topLine(a, L, 1) && p.y < jawBand(p, a, L) + .02 && !(Math.abs(p.x) < .05 && p.y > L.mouthY - .02) },
  mutton: { T: .006, curl: .0015, mask: (p, a, L) => Math.abs(a) < 86 && Math.abs(a) > 40 && offNeck(p) && p.y < topLine(a, L, 1) && p.y > L.mouthY - .03 },
  soul: { T: .005, curl: 0, mask: (p, a, L) => Math.abs(p.x) < .009 && p.y < L.mouthY - .012 && p.y > L.mouthY - .03 && p.z > .02 },
};
export const STACHE_STYLES = {
  chevron: { T: .007, mask: (p, a, L) => p.z > .02 && Math.abs(p.x) < .033 && p.y > L.mouthY + .008 - Math.abs(p.x) * .15 && p.y < L.mouthY + .024 - Math.abs(p.x) * .2 },
  pencil: { T: .0042, mask: (p, a, L) => p.z > .02 && Math.abs(p.x) < .032 && p.y > L.mouthY + .007 && p.y < L.mouthY + .0165 - Math.abs(p.x) * .12 },
  handlebar: { T: .006, mask: (p, a, L) => p.z > .02 && Math.abs(p.x) < .046 && p.y > L.mouthY + .008 + Math.max(0, Math.abs(p.x) - .03) * 1.2 - Math.abs(p.x) * .1 && p.y < L.mouthY + .02 + Math.max(0, Math.abs(p.x) - .03) * 1.8 - Math.abs(p.x) * .12 },
  walrus: { T: .011, mask: (p, a, L) => p.z > .02 && Math.abs(p.x) < .04 && p.y > L.mouthY + .0 && p.y < L.mouthY + .026 - Math.abs(p.x) * .15 },
  horseshoe: { T: .007, mask: (p, a, L) => p.z > .02 && ((Math.abs(p.x) < .034 && p.y > L.mouthY + .008 && p.y < L.mouthY + .022) || (Math.abs(p.x) > .027 && Math.abs(p.x) < .038 && p.y < L.mouthY + .022 && p.y > L.mouthY - .04)) },
};
export const BEARD_ALIAS = { mutton: 'strap', anchor: 'goatee', vandyke: 'circle', jawline: 'strap' }; export const STACHE_ALIAS = { toothbrush: 'pencil', fumanchu: 'horseshoe', imperial: 'handlebar', painter: 'chevron' };
export const LIP_CUT = (p, L) => Math.abs(p.x) < .034 && p.y > L.mouthY + .004 && p.z > .03; // upper lip left to the mustache
function topLine(a, L, k) { const aa = Math.abs(a); return interp([[0, L.mouthY + .024], [16, L.mouthY + .025], [28, -.052 + .01 * (k - 1)], [45, -.04 + .015 * (k - 1)], [62, -.026 + .02 * (k - 1)], [78, -.004 + .01 * (k - 1)], [86, .006], [94, .012]], aa); }
// trimmed 'full' beard: curved natural cheek line (sideburn up by the ear, sweeping down to the mouth corners, no vertical wall),
// bottom edge close to the jaw. Mirrored in GLSL by beardMask() in headrig.js (skin underlay) — keep both in sync.
const cheekY = ax => -.08 + .068 * ss(.03, .12, ax); // v1.9.28: one smooth cheek line (was a 3-step staircase)
const cheekDrop = a => 0;
const fullFloor = p => -.148 + Math.abs(p.x) * .25;
const offNeck = p => Math.hypot(p.x, p.z + .025) > .056 || p.y > -.08;
function jawBand(p, a, L) { return -.112 + Math.abs(p.x) * .9 * Math.min(1, Math.abs(a) / 90 + .2); }
function mouthHole(p, L, m) { const a = p.x / (.032 + m), b = (p.y - L.mouthY + .002) / (.012 + m * .55); return a * a + b * b < 1 && p.z > .03; }
export function buildBand(head, st, opt = {}) {
  const L = head.L; const ax = new THREE.Vector3(0, L.mouthY, .13).normalize(); const up = new THREE.Vector3(0, 1, 0); const F = up.clone().addScaledVector(ax, -ax.dot(up)).normalize(); const X = new THREE.Vector3().crossVectors(F, ax).normalize();
  const fr = { A: ax, F, X }; const NPH = 140, NU = 18; const inM = d => { const p = surf(head, d); const a = Math.atan2(p.x, p.z) / D2R; return st.mask(p, a, L); };
  const tin = new Float32Array(NPH), tout = new Float32Array(NPH);
  for (let j = 0; j < NPH; j++) { const ph = j / NPH * Math.PI * 2; let th = 0, st0 = -1, en = -1; let prev = inM(dirOf(fr, 0, ph));
    if (prev) st0 = 0; for (th = 1.2 * D2R; th < 125 * D2R; th += 1.2 * D2R) { const c = inM(dirOf(fr, th, ph)); if (c && !prev && st0 < 0) st0 = th; if (!c && prev && st0 >= 0) { en = th; break; } prev = c; }
    if (st0 < 0) { tin[j] = tout[j] = -1; continue; } if (en < 0) en = 125 * D2R;
    const bis = (a, b, wantIn) => { for (let k = 0; k < 12; k++) { const m = (a + b) / 2; if (inM(dirOf(fr, m, ph)) === wantIn) b = m; else a = m; } return (a + b) / 2; };
    tin[j] = st0 > 0 ? bis(st0 - 1.2 * D2R, st0, true) : 0; tout[j] = bis(en - 1.2 * D2R, en, false); }
  // fill empty columns with a zero-width band at the neighbour's position (keeps one closed grid), then smooth
  for (let j = 0; j < NPH; j++) if (tin[j] < 0) { let k = 1; while (k < NPH && tin[(j + k) % NPH] < 0 && tin[(j - k + NPH) % NPH] < 0) k++; const src = tin[(j + k) % NPH] >= 0 ? (j + k) % NPH : (j - k + NPH) % NPH; const m = (tin[src] + tout[src]) / 2; tin[j] = -m - 10; tout[j] = m; }
  const fix = arr => { const t = Float32Array.from(arr); for (let j = 0; j < NPH; j++) { const a = t[(j + NPH - 1) % NPH], b = t[j], c = t[(j + 1) % NPH]; arr[j] = (a + 2 * b + c) / 4; } };
  const empty = Array.from(tin, v => v < -5); for (let j = 0; j < NPH; j++) if (empty[j]) tin[j] = tout[j]; for (let k = 0; k < 6; k++) { fix(tin); fix(tout); } // v1.9.28: extra passes = smooth cartoon beard edge
  const pos = [], tan = [], aux = [], aE = [], idx = []; const NR = NU + 3; const FL = st.fade || .03;
  for (let j = 0; j <= NPH; j++) { const jj = j % NPH, ph = jj / NPH * Math.PI * 2; const w0 = tin[jj], w1 = tout[jj]; const band = Math.max(0, w1 - w0); const zero = empty[jj] || band < .5 * D2R; const pe = surf(head, dirOf(fr, w1, ph));
    for (let i = 0; i < NR; i++) { let th, t; if (i === 0) { th = Math.max(0, w0 - 1 * D2R); t = -.0025; } else if (i === NR - 1) { th = w1 + 1 * D2R; t = -.0025; } else { const u = (i - 1) / (NU); th = w0 + band * u; const e = ss(0, .2, u) * ss(1, .62, u); t = zero ? -.0025 : st.T * Math.pow(e, .7) + .0008 * (1 - e); }
      const d = dirOf(fr, th, ph); const p = surf(head, d); const n = normalAt(head, p); if (t > 0 && !opt.flat) t *= .5 + .5 * ss(-.03, -.13, p.y) + .15 * ss(.03, 0, Math.abs(p.x)); if (st.curl && t > 0) t += st.curl * (Math.abs(Math.sin(p.x * 260 + Math.sin(p.y * 200) * 2) * Math.sin(p.y * 260 + p.z * 150)) - .3) * (t / st.T); const dE = p.distanceTo(pe); const q = p.addScaledVector(n, t); aE.push(zero ? 1 : 1 - Math.min(1, dE / FL));
      pos.push(q.x, q.y, q.z); const tg = new THREE.Vector3(0, -1, 0).addScaledVector(n, -(-n.y)).normalize(); tan.push(tg.x, tg.y, tg.z); aux.push(.5 + .5 * Math.sin(ph * 40), i / NR, ph / 6.283, st.trim ? 5.2 : 5); } }
  for (let j = 0; j < NPH; j++) for (let i = 0; i < NR - 1; i++) { const a = j * NR + i, b = (j + 1) * NR + i; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aT', new THREE.Float32BufferAttribute(tan, 3)); g.setAttribute('aH', new THREE.Float32BufferAttribute(aux, 4)); g.setAttribute('aE', new THREE.Float32BufferAttribute(aE, 1)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
