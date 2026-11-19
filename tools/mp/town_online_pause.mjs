import { launch, client, ctxOpts } from './townlib.mjs';
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await client(ctx, 'A'); await p.evaluate(() => { window.__MP_DTCAP = .15; });
await p.evaluate(() => { document.querySelector('#btnPause').dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true })); }); await p.waitForTimeout(2500); await p.screenshot({ path: '/workspace/atqtown/docs/mp-town-final/online_pause.png' }); await b.close();
