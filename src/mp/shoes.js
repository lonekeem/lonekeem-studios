// Real shoe geometry (original, procedural): lofted upper with toe box / instep / heel counter, separate sole with heel lift, laces + tongue, rubber toe bumper,
// padded collar and boot shafts that follow the measured leg. Replaces the old "shell" shoes so every style has its own silhouette.
import * as THREE from 'three';
import { Builder, rigid } from './build.js';

// toe: round-ness start u (higher = blunter), pt = pointed exponent; box = toe-box height (m); cut = how far the opening dips (1 = at ankle); shaft = y of top (m) or 0
export const SPEC = {
  sneaker: { sole: .016, heel: .005, ub: .8, box: .037, cut: 1.0, laces: 6, bump: 1, collar: 1 },
  lowtop: { sole: .010, heel: .002, ub: .8, box: .034, cut: .94, laces: 6, bump: 1, collar: 1, canvas: 1 },
  hightop: { sole: .018, heel: .004, ub: .8, box: .038, cut: 1.0, laces: 6, bump: 1, collar: 1, shaftUp: .08 },
  runner: { sole: .024, heel: .012, ub: .78, box: .033, cut: 1.0, laces: 5, bump: 0, collar: 1 },
  boot: { sole: .014, heel: .016, ub: .8, box: .04, cut: 1.0, laces: 0, bump: 0, collar: 0, sh: .72, cuff: 1 },
  ankleboot: { sole: .012, heel: .022, ub: .74, pt: 1.6, box: .036, cut: 1.0, laces: 0, bump: 0, collar: 0, shaftUp: .065, cuff: 1 },
  combat: { sole: .028, heel: .012, ub: .82, box: .046, cut: 1.0, laces: 7, bump: 1, collar: 0, sh: .78, lug: 1 },
  kneeboot: { sole: .012, heel: .024, ub: .72, pt: 1.7, box: .034, cut: 1.0, laces: 0, bump: 0, collar: 0, sh: .5, cuff: 1 },
  thighboot: { sole: .012, heel: .024, ub: .72, pt: 1.7, box: .034, cut: 1.0, laces: 0, bump: 0, collar: 0, sh: .28, cuff: 1 },
  flat: { sole: .006, heel: .002, ub: .72, pt: 1.5, box: .026, cut: .52, laces: 0, bump: 0, collar: 0, bow: 1 },
  loafer: { sole: .010, heel: .012, ub: .78, box: .032, cut: .72, laces: 0, bump: 0, collar: 0, strap: 1 },
  dress: { sole: .009, heel: .013, ub: .7, pt: 1.5, box: .03, cut: .72, laces: 3, bump: 0, collar: 0 },
  chunky: { sole: .04, heel: .012, ub: .86, box: .05, cut: 1.0, laces: 6, bump: 1, collar: 1 },
  work: { sole: .028, heel: .014, ub: .82, box: .05, cut: 1.0, laces: 6, bump: 1, collar: 0, sh: .8, lug: 1 },
  rain: { sole: .016, heel: .01, ub: .82, box: .04, cut: 1.0, laces: 0, bump: 0, collar: 0, sh: .6, gloss: 1, cuff: 1 },
};
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function interp(pts, u) { for (let i = 0; i < pts.length - 1; i++) { const [u0, v0] = pts[i], [u1, v1] = pts[i + 1]; if (u <= u1) return v0 + (v1 - v0) * ss(u0, u1, u); } return pts[pts.length - 1][1]; }
function geoLoop(rows, flip) { // rows[i][k]: closed loop in k
  const R = rows.length, K = rows[0].length; const pos = new Float32Array(R * K * 3), idx = [];
  for (let i = 0; i < R; i++) for (let k = 0; k < K; k++) pos.set(rows[i][k], (i * K + k) * 3);
  for (let i = 0; i < R - 1; i++) for (let k = 0; k < K; k++) { const k2 = (k + 1) % K, a = i * K + k, b = (i + 1) * K + k, c = i * K + k2, d = (i + 1) * K + k2; if (flip) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
export function buildShoe(D, id, side) { // D = tpl.dim; side +1 = left (x>0), -1 = right (mirrored)
  const sp0 = SPEC[id]; if (!sp0) return null; const sp = { ...sp0, box: Math.max(sp0.box, sp0.cut < 0.8 ? 0.052 : 0.041) }; const F = D.foot, sg = side, B = new Builder(); const flip = sg < 0;
  const X = x => x * sg;
  const cx = (F.x0 + F.x1) / 2, fw = (F.x1 - F.x0) / 2 * 1.04 + 0.006, z0 = F.z0 - 0.007, z1 = F.z1 + 0.006, Lf = z1 - z0; const ank = F.ank;
  const yA = Math.max(ank.y, 0.1), yIns = Math.max(F.y1 - 0.012, 0.085) + 0.004;
  const topPts = [[0, yA * (0.62 + 0.34 * sp.cut)], [0.16, yA * (0.72 + 0.28 * sp.cut)], [0.3, yIns * (0.9 + 0.1 * sp.cut)], [0.46, yIns * 1.0], [0.64, sp.sole + sp.box * 1.18], [0.88, sp.sole + sp.box * 0.95], [1, sp.sole + sp.box * 0.55]];
  if (sp.sh || sp.shaftUp) { topPts[0][1] = yA * 1.0; topPts[1][1] = yA * 1.1; topPts[2][1] = yIns * 1.04; }
  const wpf = u => { let w = fw * (0.7 + 0.3 * ss(0, 0.5, u)); if (u > sp.ub) { const t = (u - sp.ub) / (1 - sp.ub); w *= Math.pow(Math.max(0, 1 - Math.pow(t, sp.pt ? 1.0 + sp.pt * 0.6 : 2)), sp.pt ? 0.55 : 0.5); } return w; };
  const soleH = u => sp.sole + sp.heel * (1 - ss(0.0, 0.34, u));
  const K = 28, rows = [], soleRows = [], bumpRows = []; const us = [0, 0.008, 0.02, 0.04, 0.07]; for (let i = 1; i <= 44; i++) us.push(0.07 + (1 - 0.07) * (1 - Math.pow(1 - i / 44, 1.35)));
  const NU = us.length - 1;
  for (let i = 0; i <= NU; i++) { const u = us[i]; const z = z0 + u * Lf; const hf = u < 0.07 ? Math.sqrt(Math.max(0, 1 - Math.pow((0.07 - u) / 0.07, 2))) : 1; const w = Math.max(wpf(u) * hf, 0.0004), yb = soleH(u);
    const topU = interp(topPts, u); const tf = (u > sp.ub ? Math.pow(Math.max(wpf(u) / (fw * 0.95), 0), 0.8) : 1) * hf; const top = yb + Math.max(topU - yb, 0.002) * Math.min(1, tf + 0.001);
    const r = [], rs = [], rb = []; const end = i === 0 || i === NU, sgrow = 0.0042 * Math.min(1, hf * 3) * (u > sp.ub ? Math.min(1, wpf(u) / (fw * 0.2)) : 1);
    for (let k = 0; k < K; k++) { const t = (k / K) * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t);
      if (end) { const yy = yb + (top - yb) * 0.45; r.push([X(cx), yy, z]); rs.push([X(cx), yb * 0.5, z]); rb.push([X(cx), yb + (top - yb) * 0.3, z]); continue; }
      r.push([X(cx + w * c), sn > 0 ? yb + (top - yb) * Math.pow(sn, 0.6) : yb, z]);
      const sw = w + sgrow, sc = Math.sign(c) * Math.pow(Math.abs(c), 0.42), ssn = Math.sign(sn) * Math.pow(Math.abs(sn), 0.42);
      rs.push([X(cx + sw * sc), yb * 0.5 + yb * 0.5 * ssn, z]);
      rb.push([X(cx + (w + 0.0055 * Math.min(1, hf * 3)) * c), sn > 0 ? yb + (top - yb) * 0.62 * Math.pow(sn, 0.7) : yb - 0.001, z]); }
    rows.push(r); soleRows.push(rs); if (u > 0.76) bumpRows.push(rb); }
  B.add(geoLoop(rows, flip), 'a'); B.add(geoLoop(soleRows, flip), 'k'); if (sp.bump) B.add(geoLoop(bumpRows, flip), 'k');
  // lug / welt line for boots
  if (sp.lug) { const lr = []; for (let i = 0; i <= 24; i++) { const u = i / 24, z = z0 + u * Lf, w = Math.max(wpf(u), 0.0004), r = []; for (let k = 0; k < 16; k++) { const t = (k / 16) * Math.PI * 2; r.push([X(cx + (w + 0.0068) * Math.cos(t) * 1.0), soleH(u) + 0.004 + Math.sin(t) * 0.0028, z]); } lr.push(r); } B.add(geoLoop(lr, flip), 'b'); }
  // shaft: rings following the measured leg
  const legAt = y => { const L = F.leg; if (!L.length) return { cx: ank.x, hx: 0.03, cz: ank.z, hz: 0.035 }; let a = L[0], b = L[L.length - 1]; for (let i = 0; i < L.length - 1; i++) if (y <= L[i + 1].y) { a = L[i]; b = L[i + 1]; break; } const t = b.y === a.y ? 0 : Math.min(1, Math.max(0, (y - a.y) / (b.y - a.y)));
    const m = k => a[k] + (b[k] - a[k]) * t; return { cx: (m('x0') + m('x1')) / 2, hx: (m('x1') - m('x0')) / 2, cz: (m('z0') + m('z1')) / 2, hz: (m('z1') - m('z0')) / 2 }; };
  let yTop = sp.sh ? D.hipJ - sp.sh * (D.hipJ - D.ankleY) : yA * (0.62 + 0.38 * sp.cut) + (sp.shaftUp || 0) + (sp.collar ? 0.012 : 0);
  if (!sp.sh && !sp.shaftUp) yTop = yA * (0.7 + 0.3 * sp.cut) + (sp.collar ? 0.014 : 0);
  const yBase = Math.max(0.045, soleH(0.2) + 0.01); const nR = Math.max(3, Math.round((yTop - yBase) / 0.02)); const sr = [];
  for (let i = 0; i <= nR; i++) { const y = yBase + (yTop - yBase) * (i / nR); const L = legAt(Math.max(y, yA)); const pad = 0.01 + (sp.collar ? 0.004 : 0) + (sp.sh ? 0.008 : 0) + (sp.id === 'rain' ? 0.004 : 0); const r = [];
    const flare = y > yTop - 0.02 && (sp.cuff || sp.collar) ? 0.003 : 0;
    for (let k = 0; k < 24; k++) { const t = (k / 24) * Math.PI * 2; r.push([X(L.cx + (L.hx + pad + flare) * Math.cos(t)), y, L.cz + (L.hz + pad + flare) * Math.sin(t)]); } sr.push(r); }
  B.add(geoLoop(sr, flip), 'a');
  { const L = legAt(Math.max(yTop, yA)); const pts = []; for (let k = 0; k < 24; k++) { const t = (k / 24) * Math.PI * 2; pts.push([X(L.cx + (L.hx + 0.012) * Math.cos(t)), yTop, L.cz + (L.hz + 0.012) * Math.sin(t)]); }
    if (sp.collar || sp.cuff) B.tube(pts, sp.cuff ? 0.0055 : 0.006, sp.cuff ? 'a' : 'b', true, 36, 7); }
  // laces + tongue
  if (sp.laces) { const n = sp.laces, ua = 0.32, ub2 = 0.64; for (let i = 0; i < n; i++) { const u = ua + (ub2 - ua) * (i / Math.max(1, n - 1)), z = z0 + u * Lf, y = interp(topPts, u) + 0.0012; const slope = (interp(topPts, u + 0.02) - interp(topPts, u - 0.02)) / (0.04 * Lf);
      B.box(0.036, 0.0036, 0.0048, [X(cx), y, z], 'b', [-Math.atan(slope), 0, 0]); B.cyl(0.0022, 0.0022, 0.0044, [X(cx + 0.017), y, z], 'b', [0, 0, Math.PI / 2], 6); B.cyl(0.0022, 0.0022, 0.0044, [X(cx - 0.017), y, z], 'b', [0, 0, Math.PI / 2], 6); }
    const zt = z0 + (ua - 0.06) * Lf, yt = interp(topPts, ua - 0.06) + 0.004; B.box(0.036, 0.008, 0.04, [X(cx), yt - 0.003, zt], 'a', [0.45, 0, 0]); }
  if (sp.strap) { const u = 0.5, z = z0 + u * Lf, y = interp(topPts, u) + 0.001; B.box(fw * 1.55, 0.0045, 0.014, [X(cx), y, z], 'b', [-0.25, 0, 0]); }
  if (sp.bow) { const u = 0.74, z = z0 + u * Lf, y = interp(topPts, u) + 0.0015; B.sphere(0.0062, [X(cx + 0.007), y, z], [1.4, 0.55, 0.9], 'b'); B.sphere(0.0062, [X(cx - 0.007), y, z], [1.4, 0.55, 0.9], 'b'); B.sphere(0.0036, [X(cx), y, z], [1, 0.7, 1], 'b'); }
  B.topY = yTop; return B;
}
