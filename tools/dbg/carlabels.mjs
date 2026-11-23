import { launch, context, page, enter, frames } from '../coop/lib.mjs';
const b = await launch(); const ctx = await context(b); await ctx.addInitScript(() => localStorage.setItem('atq.town.tut', '1')); const p = await page(ctx, 'A');
await enter(p, { name: 'P', room: 'test-cl-1' }); await frames(p, 10);
console.log(await p.evaluate(() => { const T = __mpTown; return JSON.stringify(T.cars.slice(0, 12).map(c => { T.setPos(c.x + 2, c.z); const L1 = T.gather().map(a => a.label); T.setPos(c.x, c.z + 2); const L2 = T.gather().map(a => a.label); return { k: c.kind || c.type, at: [Math.round(c.x), Math.round(c.z)], locked: c.locked, fuel: c.fuel && +c.fuel.toFixed(1), broken: c.broken, L1, L2 }; })); }));
await b.close();
