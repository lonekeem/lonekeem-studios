import { launch, client, ctxOpts } from './townlib.mjs';
const out = process.argv[2] || '/workspace/atqtown/docs/mp-town-proof/smoke';
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await client(ctx, 'A');
console.log('stats', JSON.stringify(await p.evaluate(() => window.__mpTown.stats())));
await p.screenshot({ path: out + '_start.png' }); await b.close();
