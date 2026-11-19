import { launch, client, ctxOpts } from './townlib.mjs';
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await client(ctx, 'A'); await p.evaluate(() => { window.__MP_DTCAP = .15; }); await p.waitForTimeout(2500);
const spots = { spawn: [-6, 21.5, 0], crossing: [0, 0, 0.8], gas: [35, -8, 1.5], eastEnd: [60, 24, 1.6], west: [-50, -24, 0.3], driveNorth: [-24, -20, 3.14] };
for (const k in spots) { const [x, z, yaw] = spots[k]; await p.evaluate(([x, z, yaw]) => { const T = window.__mpTown; T.setPos(x, z); T.setCam && T.setCam(yaw); }, [x, z, yaw]); await p.waitForTimeout(2500);
  console.log(k, await p.evaluate(() => { const T = window.__mpTown, R = T.renderer; R.info.autoReset = false; R.info.reset(); R.render(T.scene, T.cam); const i = R.info.render; const o = { calls: i.calls, tris: i.triangles }; R.info.autoReset = true; return JSON.stringify(o); })); }
await b.close();
