import { launch, context, page, enter, frames } from '../coop/lib.mjs';
const b = await launch(); const ctx = await context(b); const p = await page(ctx, 'A');
await enter(p, { name: 'Probe', room: 'test-probe-2' }); await frames(p, 10);
console.log(await p.evaluate(() => { const T = window.__mpTown, W = T.W; const pts = [[150, 120], [150, 40], [-150, 120]]; return JSON.stringify(pts.map(([x, z]) => { const bs = W.buildings.filter(b => b.rect && x > b.rect.x0 && x < b.rect.x1 && z > b.rect.z0 && z < b.rect.z1).map(b => b.id + ':' + b.kind); const lots = W.lots.filter(l => { const r = l.rect || l; return x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1; }).map(l => l.kind || l.type || l.id).slice(0, 3);
  T.setPos(x, z); const me = T.me; return { x, z, bs, lots, me: [me.x ?? (me.pos && me.pos.x), me.z ?? (me.pos && me.pos.z)].map(v => v && +v.toFixed(1)), col: typeof W.col === 'function' ? 'fn' : W.col && (W.col.hit ? W.col.hit(x, z, .3) : Object.keys(W.col).slice(0, 8)) }; })); }));
await b.close();
