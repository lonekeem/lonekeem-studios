import { boot, OUT, freecam } from './lib.mjs';
const { b, p } = await boot();
await p.evaluate(() => { const T = window.__mpTown; T.setPos(30, -16); });
// front (road side, -z face) seen from the road, and back (lot side, +z face) seen from the lot
await freecam(p, [29, 6, -29], [29, 8.1, -20.2]); await p.waitForTimeout(2500); await p.screenshot({ path: OUT + '/sign_road_side.png' });
await freecam(p, [29, 6, -12], [29, 8.1, -20.2]); await p.waitForTimeout(2500); await p.screenshot({ path: OUT + '/sign_lot_side.png' });
await b.close();
