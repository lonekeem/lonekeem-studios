import { launch, client, ctxOpts } from './townlib.mjs';
const out = process.argv[2] || '/workspace/atqtown/docs/mp-town-proof/hud_mp.png';
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await client(ctx, 'A'); await p.evaluate(() => { window.__MP_DTCAP = .15; });
await p.waitForTimeout(3500); await p.screenshot({ path: out });
console.log(await p.evaluate(() => JSON.stringify({ hud: !document.querySelector('#hud').classList.contains('hidden'), touch: !document.querySelector('#touch').classList.contains('hidden'), acts: window.__mpTown.acts() })));
await b.close();
