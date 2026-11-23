import { launch, context, page, enter } from './lib.mjs';
const b = await launch(); const ctx = await context(b); const p = await page(ctx); await enter(p);
const r = await p.evaluate(() => { const T = window.__mpTown, W = T.W; const out = { buildings: W.buildings.map(b => ({ id: b.id, kind: b.kind, r: [b.rect.x0, b.rect.z0, b.rect.x1, b.rect.z1].map(v => +v.toFixed(1)), ent: !!b.enterable })), keys: Object.keys(W) };
  const grid = []; for (let z = -60; z <= 60; z += 6) { let row = ''; for (let x = -80; x <= 80; x += 4) row += W.col.hit(x, z, .6) ? '#' : '.'; grid.push(row); } out.grid = grid; out.look = Object.keys(T.me.av || {}); return out; });
console.log(JSON.stringify(r.buildings)); console.log(r.keys.join(',')); console.log(r.grid.join('\n')); console.log(p.errs); await b.close();
