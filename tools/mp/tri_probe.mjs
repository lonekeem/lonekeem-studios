import { launch, client, ctxOpts } from './townlib.mjs';
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await client(ctx, 'A');
console.log(JSON.stringify(await p.evaluate(() => { const T = window.__mpTown; const r = {}; const tri = o => { let n = 0; o.traverse(m => { if (m.isMesh && m.geometry) { const g = m.geometry; n += (g.index ? g.index.count : g.attributes.position.count) / 3 * (m.isInstancedMesh ? m.count : 1); } }); return n; };
 r.near = T.Z.zombies.filter(z=>z.root.visible && Math.hypot(z.root.position.x-T.me.x,z.root.position.z-T.me.z)<60).length; r.zombies = T.Z.zombies.length; r.zTriEach = T.Z.zombies[0] ? tri(T.Z.zombies[0].root) : 0; r.zVis = T.Z.zombies.filter(z => z.root.visible).length; r.perChild = T.scene.children.map(c => [c.type + ':' + (c.name || c.children.length), Math.round(tri(c))]).filter(x => x[1] > 20000); return r; })));
await b.close();
