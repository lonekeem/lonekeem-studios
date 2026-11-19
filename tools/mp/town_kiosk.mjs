import { launch, client, ctxOpts } from './townlib.mjs';
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await client(ctx, 'A'); await p.evaluate(() => { window.__MP_DTCAP = .15; });
await p.evaluate(() => { const T = window.__mpTown; T.setPos(44, -18.5); T.me.ry = 0; T.setCam(0.5, .5, 11); }); await p.waitForTimeout(3500); await p.screenshot({ path: '/workspace/atqtown/docs/mp-town-proof/place_gas_kiosk.png' }); await b.close();
