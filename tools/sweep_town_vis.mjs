// Town visual walk (local solo room, Supabase blocked): grid of free (non-collider) spots, 4 headings each at a road-level 3rd-person cam.
import { launch, context, page, enter, frames } from './coop/lib.mjs'; import fs from 'fs';
const OUT = process.env.OUT || '/workspace/atq-sweep-proof/town-vis'; fs.mkdirSync(OUT, { recursive: true });
const b = await launch(); const ctx = await context(b); const p = await page(ctx, 'A');
await enter(p, { name: 'Vis', room: 'test-vis-1' }); await frames(p, 10);
await p.evaluate(() => { const T = window.__mpTown; T.ACT.TUT.skip && T.ACT.TUT.skip(); T.setWeather('clear'); T.setDay(.42); });
const STEP = +(process.env.STEP || 60), YAWS = (process.env.YAWS || '0,1.57,3.14,4.71').split(',').map(Number);
const pts = await p.evaluate((S) => { const W = window.__mpTown.W, B = W.bounds, out = []; const free = (x, z) => !W.col.hit(x, z, 1.2);
  for (let x = -B.x + 20; x <= B.x - 20; x += S) for (let z = -B.z + 20; z <= B.z - 20; z += S) { let f = null; for (let d = 0; d < 20 && !f; d += 2) for (let a = 0; a < 8 && !f; a++) { const nx = x + Math.cos(a * .785) * d, nz = z + Math.sin(a * .785) * d; if (free(nx, nz)) f = [+nx.toFixed(1), +nz.toFixed(1)]; } if (f) out.push(f); } return out; }, STEP);
console.log('points', pts.length); let k = 0; const log = [];
for (const [x, z] of pts) for (const yaw of YAWS) { const n = `v${String(k++).padStart(3, '0')}_${x}_${z}_${yaw}`;
  await p.evaluate(([x, z, yaw]) => { const T = window.__mpTown; T.setPos(x, z); T.me.ry = yaw; T.setCam(yaw, .22, 9); }, [x, z, yaw]); await frames(p, 8); await p.waitForTimeout(250);
  await p.screenshot({ path: `${OUT}/${n}.png` }); }
const info = await p.evaluate(() => window.__mpTown.stats()); info.errs = p.errs; info.nf = p.nf; console.log(JSON.stringify(info)); fs.writeFileSync(`${OUT}/info.json`, JSON.stringify({ pts, info }, null, 1)); await b.close();
