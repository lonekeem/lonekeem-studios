import { boot, freecam } from '../mpfix/lib.mjs';
const OUT = '/workspace/atq1919/docs/mp-fix2'; const { b, p } = await boot();
await p.evaluate(() => window.__mpTown.setPos(-4, -26));
await freecam(p, [-6, 2.2, -33], [3, 1.8, -14]); await p.waitForTimeout(3500); await p.screenshot({ path: OUT + '/store_street_after.png' });
await freecam(p, [-30, 22, -48], [0, 0, -16]); await p.waitForTimeout(3500); await p.screenshot({ path: OUT + '/store_top_after.png' });
await b.close();
