import { boot } from './lib.mjs';
const { b, p } = await boot();
console.log(JSON.stringify(await p.evaluate(() => { const T = window.__mpTown; const out = {}; const V = T.me.constructor === Object ? null : null; for (const c of T.W.cars) { if (out[c.kind]) continue; const P = c.g.position, sv = [c.g.rotation.y, P.x, P.z]; c.g.rotation.y = 0; P.set(0, 0, 0); c.g.updateMatrixWorld(true); const V3 = P.constructor; let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  c.m.traverse(o => { if (!o.isMesh) return; o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox; for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) { const v = new V3(x, y, z).applyMatrix4(o.matrixWorld); mn = [Math.min(mn[0], v.x), Math.min(mn[1], v.y), Math.min(mn[2], v.z)]; mx = [Math.max(mx[0], v.x), Math.max(mx[1], v.y), Math.max(mx[2], v.z)]; } });
  out[c.kind] = { mn: mn.map(v => +v.toFixed(2)), mx: mx.map(v => +v.toFixed(2)) }; c.g.rotation.y = sv[0]; P.set(sv[1], 0, sv[2]); c.g.updateMatrixWorld(true); } return out; })));
await b.close();
