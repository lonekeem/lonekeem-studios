// Finger spread for the base bodies: the Meshy hands have separately modelled fingers that are pressed together (they read as one fused
// block). Each finger (a connected piece of the hand mesh past the knuckles) is rotated rigidly about its own knuckle, fanning the fingers
// apart and curling them slightly; the thumb is left alone. Applied once to the template bind pose, so skinning, garments (gloves) and
// every animation keep working unchanged.
import * as THREE from 'three';
export function spreadFingers(geo, names, P, aW, opt = {}) {
  const pos = geo.attributes.position, nrm = geo.attributes.normal, ix = geo.index, n = pos.count; const v = new THREE.Vector3(); const log = [];
  const fanK = opt.fan ?? 3.2, curl = opt.curl ?? .1;
  for (const sd of [1, -1]) { const name = sd > 0 ? 'Left' : 'Right'; const Wp = P[name + 'Hand'], E = P[name + 'ForeArm']; if (!Wp || !E) continue;
    const V = []; for (let i = 0; i < n; i++) if (aW[i * 8 + 4] > .5 && Math.sign(pos.getX(i)) === sd) V.push(i); if (!V.length) continue;
    let far = 0; for (const i of V) { v.fromBufferAttribute(pos, i); far = Math.max(far, v.distanceTo(Wp)); }
    const D = new THREE.Vector3(); for (const i of V) { v.fromBufferAttribute(pos, i); if (v.distanceTo(Wp) > far * .8) D.add(v.clone().sub(Wp)); } D.normalize();
    const loc = new Map(); let dMax = 0; for (const i of V) { v.fromBufferAttribute(pos, i); const r = v.clone().sub(Wp); loc.set(i, r); dMax = Math.max(dMax, r.dot(D)); }
    const e1 = new THREE.Vector3(0, 0, 1).cross(D).normalize(), e2 = D.clone().cross(e1).normalize(); let sxx = 0, syy = 0, sxy = 0; const pts = [];
    for (const i of V) { const r = loc.get(i), t = r.dot(D); if (t > .1 * dMax && t < .4 * dMax) pts.push(r); }
    const c = new THREE.Vector3(); pts.forEach(r => c.add(r)); c.multiplyScalar(1 / Math.max(1, pts.length));
    for (const r of pts) { const a = r.clone().sub(c); const x = a.dot(e1), y = a.dot(e2); sxx += x * x; syy += y * y; sxy += x * y; }
    const th = .5 * Math.atan2(2 * sxy, sxx - syy); const Wd = e1.clone().multiplyScalar(Math.cos(th)).addScaledVector(e2, Math.sin(th)).normalize(); if (Wd.z < 0) Wd.negate();
    const N = D.clone().cross(Wd).normalize(); if (N.x * sd > 0) N.negate(); // palm side
    const dK = (opt.k ?? .55) * dMax; const cand = new Set(V.filter(i => loc.get(i).dot(D) > dK)); const par = new Map();
    const f = a => { while (par.get(a) !== a) { par.set(a, par.get(par.get(a))); a = par.get(a); } return a; }; const un = (a, b) => { a = f(a); b = f(b); if (a !== b) par.set(a, b); };
    for (const i of cand) par.set(i, i); const pk = new Map(); for (const i of cand) { v.fromBufferAttribute(pos, i); const k = v.toArray().map(a => Math.round(a * 1e5)).join(','); if (pk.has(k)) un(i, pk.get(k)); else pk.set(k, i); }
    for (let k = 0; k < ix.count; k += 3) { const a = ix.getX(k), b = ix.getX(k + 1), cc = ix.getX(k + 2); if (cand.has(a) && cand.has(b)) un(a, b); if (cand.has(b) && cand.has(cc)) un(b, cc); if (cand.has(a) && cand.has(cc)) un(a, cc); }
    const comps = new Map(); for (const i of cand) { const r = f(i); if (!comps.has(r)) comps.set(r, []); comps.get(r).push(i); }
    const list = [...comps.values()].filter(L => L.length > 12).map(L => { let x = 0, d = 0, dm = 0; for (const i of L) { const r = loc.get(i); x += r.dot(Wd); d += r.dot(D); dm = Math.max(dm, r.dot(D)); } return { L, x: x / L.length, d: d / L.length, dm }; });
    // the thumb is the piece furthest to the thumb side whose tip stops well short of the finger tips
    list.sort((a, b) => a.x - b.x); const tipMax = Math.max(...list.map(o => o.dm)); const last = list[list.length - 1];
    const thumb = last && last.dm < tipMax - .2 * (dMax - dK) ? last : null; const thumbSet = new Set(thumb ? thumb.L : []);
    // finger centres from the separate tips (k-means on the tip vertices, 4 fingers)
    const tips = []; for (const o of list) { if (o === thumb) continue; for (const i of o.L) { const r = loc.get(i); if (r.dot(D) > o.dm - .045) tips.push(r.dot(Wd)); } }
    tips.sort((a, b) => a - b); let cs = [0, 1, 2, 3].map(k => tips[Math.floor((k + .5) / 4 * tips.length)] ?? 0);
    for (let it = 0; it < 12; it++) { const sum = [0, 0, 0, 0], cnt = [0, 0, 0, 0]; for (const x of tips) { let b = 0; for (let k = 1; k < 4; k++) if (Math.abs(x - cs[k]) < Math.abs(x - cs[b])) b = k; sum[b] += x; cnt[b]++; } cs = cs.map((c0, k) => cnt[k] ? sum[k] / cnt[k] : c0); }
    cs.sort((a, b) => a - b); const xc = (cs[0] + cs[3]) / 2; const angs = cs.map(x => THREE.MathUtils.clamp(fanK * (x - xc), -.17, .17)); const curls = opt.curls || [.34, .24, .16, .08]; // pinky .. index
    const xThumb = thumb ? (cs[3] + thumb.x) / 2 : 9;
    const interp = x => { if (x <= cs[0]) return [angs[0], cs[0], curls[0]]; if (x >= cs[3]) return [angs[3], cs[3], curls[3]]; let k = 0; while (x > cs[k + 1]) k++; let t = (x - cs[k]) / (cs[k + 1] - cs[k]); t = t * t * (3 - 2 * t); return [angs[k] + (angs[k + 1] - angs[k]) * t, cs[k] + (cs[k + 1] - cs[k]) * t, curls[k] + (curls[k + 1] - curls[k]) * t]; };
    log.push({ sd, dMax: +dMax.toFixed(3), comps: list.map(o => [o.L.length, +o.x.toFixed(4), +o.dm.toFixed(3)]), cs: cs.map(x => +x.toFixed(4)), thumb: !!thumb });
    const sgn = N.clone().cross(D).dot(Wd) > 0 ? 1 : -1; const q = new THREE.Quaternion(); const nv = new THREE.Vector3(); const d0 = dK - .02;
    for (const i of V) { if (thumbSet.has(i)) continue; const r0 = loc.get(i); const d = r0.dot(D), x = r0.dot(Wd); if (d < d0 || x > xThumb) continue;
      const w = THREE.MathUtils.smoothstep(d, d0, dK + .015); const [ang, px, cu] = interp(x); q.setFromAxisAngle(N, ang * w * sgn); { const ax2 = D.clone().cross(N).normalize(); const q2 = new THREE.Quaternion().setFromAxisAngle(ax2, -cu * w); q.premultiply(q2); }
      const pivot = Wp.clone().addScaledVector(D, dK).addScaledVector(Wd, px); v.fromBufferAttribute(pos, i); const r = v.clone().sub(pivot); const along = Math.max(0, d - dK);
      r.applyQuaternion(q); r.addScaledVector(N, curl * w * along * along / Math.max(.01, dMax - dK)); v.copy(pivot).add(r); pos.setXYZ(i, v.x, v.y, v.z);
      if (nrm) { nv.fromBufferAttribute(nrm, i).applyQuaternion(q); nrm.setXYZ(i, nv.x, nv.y, nv.z); } } }
  pos.needsUpdate = true; if (nrm) nrm.needsUpdate = true; if (typeof window !== 'undefined') window.fingerLog = log; return log;
}
