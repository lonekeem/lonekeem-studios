import { launch, client, ctxOpts } from './townlib.mjs';
const out = process.argv[2] || '/workspace/atqtown/docs/mp-town-proof/cars_colors';
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await client(ctx, 'A'); await p.evaluate(() => { window.__MP_DTCAP = .12; });
// line up all cars' colors in one frame: park a copy row near the player using the existing cars (teleport 6 of them)
await p.evaluate((process_yaw) => { const T = window.__mpTown; const row = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6']; row.forEach((id, i) => { const c = T.cars.find(c => c.id === id); c.x = -10 + i * 4.2; c.z = 25 + (i % 2) * 2.5; c.ry = Math.PI / 2 + (i % 2 ? .3 : -.2); c.v = 0; }); T.setPos(+(process_yaw) > 0 ? -12 : 13, 22.3); T.setCam(process_yaw, .22, 6); }, +(process.argv[3] || 0));
await p.waitForTimeout(4000); await p.screenshot({ path: out + '.png' }); await b.close();
