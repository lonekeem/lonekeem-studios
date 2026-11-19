import { launch, client, ctxOpts } from './townlib.mjs';
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await client(ctx, 'A'); await p.evaluate(() => { window.__MP_DTCAP = .15; });
await p.waitForTimeout(3000);
const r = await p.evaluate(() => { const T = window.__mpTown; const S = T.scene, C = T.cam; C.updateMatrixWorld(); const M = C.projectionMatrix.clone().multiply(C.matrixWorldInverse).elements; const pl = []; for (const [a, s] of [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]]) { const e = i => M[i * 4 + a] ; const v = [M[3] + s * M[a], M[7] + s * M[4 + a], M[11] + s * M[8 + a], M[15] + s * M[12 + a]]; const l = Math.hypot(v[0], v[1], v[2]); pl.push(v.map(x => x / l)); }
  const inF = (c, r) => pl.every(q => q[0] * c.x + q[1] * c.y + q[2] * c.z + q[3] > -r);
  const rows = {}; const add = (k, calls, tris) => { const o = rows[k] || (rows[k] = [0, 0]); o[0] += calls; o[1] += tris; };
  const zs = new Set(T.Z.zombies.map(z => z.root));
  S.traverse(m => { if (!m.isMesh || !m.isMesh) return; let v = true, a = m; while (a) { if (!a.visible) v = false; a = a.parent; } if (!v) return; const g = m.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); const c = g.boundingSphere.center.clone().applyMatrix4(m.matrixWorld); const sc = m.matrixWorld.getMaxScaleOnAxis(); const rad = g.boundingSphere.radius * sc; if (m.frustumCulled && !m.isInstancedMesh && !inF(c, rad)) return; const tr = (g.index ? g.index.count : g.attributes.position.count) / 3 * (m.isInstancedMesh ? m.count : 1);
    let a2 = m; let top = m; while (top.parent && top.parent !== S) top = top.parent; const key = zs.has(top) ? 'zombie' : m.isInstancedMesh ? 'inst:' + (m.name || g.attributes.position.count) : m.isSkinnedMesh ? 'skinned' : (top.name || top.type) + ':' + (m.material.name || m.material.type) + ':' + (g.attributes.position.count > 20000 ? 'BIG' : g.attributes.position.count); add(key, 1, tr); });
  return Object.entries(rows).sort((a, b) => b[1][1] - a[1][1]).slice(0, 30).map(([k, v]) => k + ' calls=' + v[0] + ' tris=' + Math.round(v[1])); });
console.log(r.join('\n')); await b.close();
