import { launch, client, ctxOpts } from './townlib.mjs';
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await client(ctx, 'A');
console.log(JSON.stringify(await p.evaluate(() => { const c = window.__mpTown.cars[0]; const r = []; c.m.traverse(o => { if (o.isMesh) r.push([o.name, o.material.name, '#' + o.material.color.getHexString(), !!o.material.map, !!o.geometry.attributes.color, o.geometry.attributes.position.count]); }); return r; })));
await b.close();
