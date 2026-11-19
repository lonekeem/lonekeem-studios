import { boot, OUT } from './lib.mjs';
const { b, p } = await boot();
await p.evaluate(() => { const T = window.__mpTown; T.setPos(46, -11); T.me.ry = 0; T.setCam(0, .3, 6); }); await p.waitForTimeout(3500); await p.screenshot({ path: OUT + '/_store_before.png' }); await b.close();
