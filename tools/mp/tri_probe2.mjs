import { launch, client, ctxOpts } from './townlib.mjs';
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await client(ctx, 'A');
console.log(JSON.stringify(await p.evaluate(() => { const z = window.__mpTown.Z.zombies[0]; const r = []; z.root.traverse(m => { if (m.isMesh) r.push([m.name, m.geometry.index ? m.geometry.index.count / 3 : 0, m.material.name || m.material.type, !!m.castShadow]); }); return r; })));
await b.close();
