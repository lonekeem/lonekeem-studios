// Local-only Quiet Falls world proof shots (solo room, Supabase blocked). Never joins the public lobby.
// SHOTS env: JSON [[name, x, z, yaw, pitch, dist, dayPhase|null, extraJS?], ...]  or FREE: [name,'free',[px,py,pz],[lx,ly,lz],phase]
import { launch, context, page, enter, frames, freecam, unfreecam } from '../coop/lib.mjs';
import { mkdirSync, writeFileSync } from 'fs';
const OUT = process.env.OUT || '/workspace/atq-world-proof/base'; mkdirSync(OUT, { recursive: true });
const SHOTS = JSON.parse(process.env.SHOTS || '[]');
const b = await launch(); const ctx = await context(b); const p = await page(ctx, 'A');
const t0 = Date.now(); await enter(p, { name: 'WorldTest', room: 'test-world-1' }); const loadMs = Date.now() - t0;
await frames(p, 20);
if (process.env.PRE) await p.evaluate(process.env.PRE);
for (const s of SHOTS) {
  const [name, x, z, yaw, pitch, dist, ph, js] = s;
  if (x === 'free') { await p.evaluate(ph => window.__mpTown.setDay(ph), s[4] ?? .5); if (s[5]) await p.evaluate(s[5]); await frames(p, 4); await freecam(p, z, yaw); await frames(p, 10); await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/${name}.png` }); await unfreecam(p); continue; }
  await p.evaluate(([x, z, yaw, pitch, dist, ph]) => { const T = window.__mpTown; T.setDay(ph ?? .5); T.setPos(x, z); T.me.ry = yaw; T.setCam(yaw, pitch, dist); }, [x, z, yaw, pitch, dist, ph]);
  if (js) await p.evaluate(js);
  await frames(p, 14); await p.waitForTimeout(700);
  await p.screenshot({ path: `${OUT}/${name}.png` });
}
const info = await p.evaluate(() => { const T = window.__mpTown; return { stats: T.stats(), bounds: T.W.bounds, lots: T.W.lots.length, ent: T.W.enterable.length, cars: T.cars.length, lamps: (T.W.lampPos || []).length }; });
info.loadMs = loadMs; info.errs = p.errs; info.nf = p.nf; console.log(JSON.stringify(info)); writeFileSync(`${OUT}/info.json`, JSON.stringify(info, null, 1));
await b.close();
