// v2 head: an analytic (signed-distance) cartoon head in the Bitmoji-like style. The SDF is sampled along rays from the head
// centre into a dense sphere grid, so the surface is perfectly smooth, normals come from the SDF gradient, and every other
// part (hair caps, beards, hats, glasses, earrings) can sit on the exact same surface function -> nothing floats or clips.
import * as THREE from 'three';

const len3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z);
function sdEll(px, py, pz, rx, ry, rz) { const k0 = len3(px / rx, py / ry, pz / rz), k1 = len3(px / (rx * rx), py / (ry * ry), pz / (rz * rz)); return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(rx, ry, rz); }
function sdCaps(px, py, pz, ax, ay, az, bx, by, bz, r) { const pax = px - ax, pay = py - ay, paz = pz - az, bax = bx - ax, bay = by - ay, baz = bz - az; const h = Math.min(1, Math.max(0, (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz))); return len3(pax - bax * h, pay - bay * h, paz - baz * h) - r; }
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const smax = (a, b, k) => -smin(-a, -b, k);

// shape parameters (metres, head-local frame: +x = character's left, +y up, +z forward). Morph sliders offset these.
export function headParams(g, m = {}) {
  const f = g === 'f'; const M = k => m[k] || 0;
  return {
    f, W: (f ? .117 : .121) * (1 + .07 * M('faceW')), Ht: (f ? .131 : .133) * /* v1.9.28: rounder cranium (was .142/.145 = egg) */ (1 + .06 * M('forehead')), Hb: (f ? .148 : .155) * (1 + .07 * M('faceLen') + .04 * M('chin')), D: (f ? .123 : .127), yc: .0,
    taper: (f ? .34 : .28) - .14 * M('jaw'), chinW: 1 + .3 * M('chinW'), chinFwd: .012 + .006 * M('chin'), cheek: .5 + .45 * M('cheekFull') + .2 * M('cheekbone'),
    noseW: 1 + .3 * M('noseW'), noseLen: 1 + .3 * M('noseLen'), noseBridge: M('noseBridge'), noseTip: M('noseTip'), noseSize: f ? .95 : 1.22,
    earS: 1 + .15 * M('earSize'), earOut: M('earOut'),
  };
}
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function makeSDF(H) {
  const fz = H.D * .97; const ty0 = -.04 - .006 * (H.noseLen - 1) * 2; const nr = .0125 * H.noseSize;
  return (x, y, z) => {
    // one egg-shaped volume: round cranium, the lower face tapers (domain warp) to a soft rounded chin pushed slightly forward
    const yy = y - H.yc; const lo = ss(-.015, -.15, yy); const tp = 1 - H.taper * Math.pow(lo, 1.25) * (1 - .25 * (H.chinW - 1) * lo);
    const zz = z - H.chinFwd * lo - .004; const ry = yy > 0 ? H.Ht : H.Hb; const rz = zz > 0 ? H.D : H.D * .98;
    let d = sdEll(x / tp, yy, zz, H.W, ry, rz) * Math.min(1, tp + .15);
    // soft cheek fullness
    if (H.cheek > .01) d = smin(d, sdEll(Math.abs(x) - .05, y + .045, z - .05, .045 * H.cheek + .01, .04, .04), .05);
    // nose: soft button tip + faint bridge + small alae
    const tz = fz + .013 + .004 * H.noseTip, ty = ty0 + .004 * H.noseTip;
    let n = sdEll(x, y - ty, z - tz, nr * 1.05 * H.noseW, nr * .95, nr * .95);
    n = smin(n, sdCaps(x, y, z, 0, .006, fz - .004 + .004 * H.noseBridge, 0, ty + .005, tz - .003, .0055 * (1 + .2 * H.noseBridge)), .012);
    n = smin(n, sdEll(Math.abs(x) - .0105 * H.noseW, y - ty + .004, z - tz + .008, .0078 * H.noseW, .0065, .007), .007);
    d = smin(d, n, .012);
    return d;
  };
}
export function sdfNormal(sdf, x, y, z, out) { const e = .0008; const nx = sdf(x + e, y, z) - sdf(x - e, y, z), ny = sdf(x, y + e, z) - sdf(x, y - e, z), nz = sdf(x, y, z + e) - sdf(x, y, z - e); const l = len3(nx, ny, nz) || 1; return out.set(nx / l, ny / l, nz / l); }
// outermost surface distance along a ray from the head centre
export function rayR(sdf, dx, dy, dz) { let t = .3; while (t > 0 && sdf(dx * t, dy * t, dz * t) > 0) t -= .004; let a = t, b = t + .004; for (let i = 0; i < 18; i++) { const m = (a + b) / 2; if (sdf(dx * m, dy * m, dz * m) > 0) b = m; else a = m; } return (a + b) / 2; }

// head landmarks in head-local metres (shared by face paint, hair, beards, hats, glasses, earrings)
export function landmarks(H, sdf) {
  const surfZ = (x, y) => { let z = .25; while (z > -.05 && sdf(x, y, z) > 0) z -= .002; let a = z, b = z + .002; for (let i = 0; i < 14; i++) { const m = (a + b) / 2; if (sdf(x, y, m) > 0) b = m; else a = m; } return (a + b) / 2; };
  let top = 0; { let y = .3; while (sdf(0, y, 0) > 0) y -= .002; top = y; }
  let chin = 0; { let y = -.3; while (sdf(0, y, .03) > 0 && y < 0) y += .001; chin = y; }
  let sideX = 0; { let x = .3; while (sdf(x, .0, -.01) > 0) x -= .001; sideX = x; }
  let back = 0; { let z = -.3; while (sdf(0, .02, z) > 0) z += .002; back = z; }
  const eyeY = H.f ? -.008 : -.01, eyeX = H.f ? .05 : .05;
  return { top, chin, sideX, back, eyeY, eyeX, browY: eyeY + (H.f ? .04 : .037), noseY: -.04 - .006 * (H.noseLen - 1) * 2, mouthY: H.f ? -.083 : -.086, earY: -.022, earZ: -.012, surfZ, front: surfZ(0, -.04) };
}

// sphere-grid mesh of the analytic head (with UVs for the painted face)
export function buildHeadGeometry(H, sdf, seg = 112, rings = 84) {
  const pos = [], nrm = [], uv = [], idx = []; const n = new THREE.Vector3();
  for (let j = 0; j <= rings; j++) { const v = j / rings, th = v * Math.PI; // th from +y (crown) to -y
    for (let i = 0; i <= seg; i++) { const u = i / seg, ph = u * Math.PI * 2; const dx = Math.sin(th) * Math.sin(ph), dy = Math.cos(th), dz = Math.sin(th) * Math.cos(ph);
      const r = rayR(sdf, dx, dy, dz); const x = dx * r, y = dy * r, z = dz * r; pos.push(x, y, z); sdfNormal(sdf, x, y, z, n); nrm.push(n.x, n.y, n.z); uv.push(.5 + x / FACE_SPAN, .5 + (y - FACE_Y0) / FACE_SPAN); } }
  for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) { const a = j * (seg + 1) + i, b = a + seg + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g;
}
export const FACE_SPAN = .3, FACE_Y0 = -.03; // face texture covers a 30 cm square centred 3 cm below the head centre

// simple sculpted cartoon ear (C-shaped rim + bowl), built in ear-local space then placed on the head side
export function buildEarGeometry(side, L, H) {
  const g = new THREE.SphereGeometry(1, 20, 14); const p = g.attributes.position; const s = H.earS;
  for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    // flattened disc, outer rim thicker, inner bowl pushed in
    const r = Math.hypot(y, z); const bowl = x > 0 ? Math.max(0, 1 - r * 1.25) * .55 : 0;
    x = x * .32 - bowl * .28; y *= 1; z *= .72; const tilt = .18; const yy = y * Math.cos(tilt) - z * Math.sin(tilt), zz = y * Math.sin(tilt) + z * Math.cos(tilt);
    p.setXYZ(i, side * (x * .03 * s), yy * .03 * s, zz * .03 * s); }
  if (side < 0) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i]; ix[i] = ix[i + 1]; ix[i + 1] = t; } }
  g.computeVertexNormals(); const ex = side * (L.sideX - .006 + .004 * H.earOut); g.rotateY(side * (.25 + .15 * H.earOut)); g.translate(ex, L.earY, L.earZ); return g;
}
