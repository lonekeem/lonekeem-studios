// Vertex-level scan: ANY static geometry taller than 0.9 m (world y) that has vertices inside the roadway (not sidewalk, 0.15 m margin) is reported.
// Covers merged (Builder) meshes and InstancedMesh houses, not just lot rectangles. Roads come from CFG.ZR / CFG.XR / ROAD_HALF in map.js.
import { boot } from '../mpfix/lib.mjs';
const { b, p } = await boot();
const r = await p.evaluate(async (process_detail) => { const T = window.__mpTown; const { CFG, ROAD_HALF, BOUNDS } = await import('/src/mp/town/map.js'); const R = ROAD_HALF; const MX = BOUNDS.x + 30, MZ = BOUNDS.z + 30;
  const roads = []; for (const z of CFG.ZR) roads.push({ n: 'EW z=' + z, x0: -MX, x1: MX, z0: z - R + .15, z1: z + R - .15 }); for (const x of CFG.XR) roads.push({ n: 'NS x=' + x, x0: x - R + .15, x1: x + R - .15, z0: -MZ, z1: MZ });
  const gas = { x0: 28, x1: 64, z0: -30, z1: 0 }; // paved forecourt of the KL station (canopy, pumps stand on it on purpose)
  const out = { roads: roads.map(r => r.n), meshes: 0, instances: 0, offenders: {} }; const V = T.scene.position.constructor; const v = new V(); const cars = new Set(); for (const c of T.cars) c.g.traverse(o => cars.add(o));
  T.scene.updateMatrixWorld(true); const M4 = T.scene.matrixWorld.constructor; const im = new M4();
  T.W.root.traverse(o => { if (!o.isMesh || cars.has(o) || !o.geometry || !o.geometry.attributes.position || !o.visible) return; out.meshes++; const pos = o.geometry.attributes.position; const n = o.isInstancedMesh ? o.count : 1; const key = (o.name || o.material?.name || o.geometry.type) + '|' + (o.isInstancedMesh ? 'inst' : 'mesh') + '|' + pos.count;
    for (let k = 0; k < n; k++) { if (o.isInstancedMesh) { o.getMatrixAt(k, im); im.premultiply(o.matrixWorld); out.instances++; } else im.copy(o.matrixWorld);
      for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(im); if (v.y < .9 || v.y > 12) continue; if (v.x > gas.x0 && v.x < gas.x1 && v.z > gas.z0 && v.z < gas.z1) continue; for (const rd of roads) if (v.x > rd.x0 && v.x < rd.x1 && v.z > rd.z0 && v.z < rd.z1) { const e = out.offenders[key + '|' + rd.n] || (out.offenders[key + '|' + rd.n] = { verts: 0, x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9, ymax: 0 }); e.verts++; e.x0 = Math.min(e.x0, v.x); e.x1 = Math.max(e.x1, v.x); e.z0 = Math.min(e.z0, v.z); e.z1 = Math.max(e.z1, v.z); e.ymax = Math.max(e.ymax, v.y); if (process_detail && key.startsWith('BoxGeometry|mesh|24')) (e.pts = e.pts || []).push([+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)]); } } } });
  for (const e of Object.values(out.offenders)) for (const k of ['x0', 'x1', 'z0', 'z1', 'ymax']) e[k] = +e[k].toFixed(1); return out; }, !!process.env.DETAIL);
console.log(JSON.stringify(r, null, 1)); await b.close();
