import { launch, client, ctxOpts } from './townlib.mjs';
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await client(ctx, 'A');
console.log(await p.evaluate(async () => { let n = 0; const t0 = performance.now(); await new Promise(res => { const f = () => { n++; if (performance.now() - t0 > 4000) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f); }); return { fps: n / 4, ...window.__mpTown.stats() }; }));
await b.close();
