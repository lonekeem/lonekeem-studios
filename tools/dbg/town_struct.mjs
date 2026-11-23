import { launch, context, page, enter, frames } from '../coop/lib.mjs';
const b = await launch(); const ctx = await context(b); const p = await page(ctx, 'A');
await enter(p, { name: 'Probe', room: 'test-probe-1' }); await frames(p, 10);
console.log(await p.evaluate(() => { const T = window.__mpTown, W = T.W; const r = { meshes: 0, inst: 0, big: 0, groups: W.root.children.length, top: {} };
  W.root.traverse(o => { if (o.isInstancedMesh) r.inst++; else if (o.isMesh) { r.meshes++; if (o.geometry.attributes.position.count > 5000) r.big++; } });
  W.root.children.forEach(c => { const k = c.type + ':' + (c.name || '') + ':' + c.children.length; r.top[k] = (r.top[k] || 0) + 1; }); r.top = Object.entries(r.top).sort((a, b) => b[1] - a[1]).slice(0, 25); r.statics = W.statics && (W.statics.length || Object.keys(W.statics)); return JSON.stringify(r); }));
await b.close();
