import { boot, OUT, freecam } from './lib.mjs';
const { b, p } = await boot();
await p.evaluate(() => { window.__mpTown.setPos(46, -16); });
await freecam(p, [46, 2.4, -14.5], [45.2, 1.7, -9]); await p.waitForTimeout(2500); await p.screenshot({ path: OUT + '/store_front_close.png' });
await freecam(p, [38, 3.0, -17.5], [46, 1.8, -9]); await p.waitForTimeout(2500); await p.screenshot({ path: OUT + '/store_front_wide.png' });
await b.close();
