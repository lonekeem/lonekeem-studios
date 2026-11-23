// Overlap check of every building / prop / collider / car against the road + sidewalk layout.
// usage: TOWN_URL=http://127.0.0.1:5330/ node tools/mp/overlap_check.mjs
import { launch, context, page, enter, frames } from '../coop/lib.mjs';
const b = await launch(); const ctx = await context(b); const p = await page(ctx, 'A'); await enter(p, { name: 'Probe', room: 'test-ovl-1' }); await frames(p, 10);
const r = await p.evaluate(() => { const T = window.__mpTown, W = T.W; const R = 4, SW = 2.2, Z = [-24, 24], X = [-24, 24];
  const hit = (a, r) => a.x0 < r.x1 && a.x1 > r.x0 && a.z0 < r.z1 && a.z1 > r.z0; const f = v => +v.toFixed(1);
  const walk = [], pave = []; // walk = road + sidewalk strips (nothing may stand here); pave = roadway only
  for (const z of Z) { walk.push({ n: 'street z=' + z, x0: -118, x1: 118, z0: z - R - SW, z1: z + R + SW }); pave.push({ n: 'roadway z=' + z, x0: -118, x1: 118, z0: z - R, z1: z + R }); }
  for (const x of X) { walk.push({ n: 'street x=' + x, x0: x - R - SW, x1: x + R + SW, z0: -88, z1: 88 }); pave.push({ n: 'roadway x=' + x, x0: x - R, x1: x + R, z0: -88, z1: 88 }); }
  const gas = { x0: 31, x1: 62, z0: -20, z1: -1 }; // KL station forecourt is paved on purpose
  const out = { buildingsChecked: 0, lotsChecked: W.lots.length, buildingOverlaps: [], lotOverlaps: [], collidersOnStreet: [], carsOnRoadway: 0, carsOffRoad: [], carsInsideBuildings: [] };
  for (const bd of W.enterable) { out.buildingsChecked++; for (const r of walk) if (hit(bd.rect, r)) out.buildingOverlaps.push((bd.cfg?.id || bd.id || bd.kind) + ' [' + [bd.rect.x0, bd.rect.x1, bd.rect.z0, bd.rect.z1].map(f) + '] x ' + r.n); }
  for (const l of W.lots) { const rc = { x0: l.cx - l.w / 2, x1: l.cx + l.w / 2, z0: l.cz - l.d / 2, z1: l.cz + l.d / 2 }; for (const r of walk) if (hit(rc, r)) out.lotOverlaps.push(l.id + ' [' + [rc.x0, rc.x1, rc.z0, rc.z1].map(f) + '] x ' + r.n); }
  const tags = {}; for (const c of W.col.list) { if (!c.active) continue; for (const r of pave) if (hit(c, r) && !hit(c, { ...gas, z0: -29, z1: 0 })) { out.collidersOnStreet.push((c.tag || 'col') + ' [' + [c.x0, c.x1, c.z0, c.z1].map(f) + '] on ' + r.n); } }
  out.collidersTotal = W.col.list.length;
  for (const k of T.cars) { const x = k.g.position.x, z = k.g.position.z; const on = pave.some(r => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1); if (on) out.carsOnRoadway++; else if (!(x > gas.x0 && x < gas.x1 && z > gas.z0 - 6 && z < gas.z1)) out.carsOffRoad.push(k.id + '@' + f(x) + ',' + f(z)); for (const bd of W.enterable) { const r = bd.rect; if (x > r.x0 - .5 && x < r.x1 + .5 && z > r.z0 - .5 && z < r.z1 + .5) out.carsInsideBuildings.push(k.id + ' in ' + (bd.cfg?.id || bd.kind)); } }
  const st = W.enterable.find(b => b.cfg?.kind === 'store' || b.kind === 'store'); out.store = st && [st.rect.x0, st.rect.x1, st.rect.z0, st.rect.z1].map(f); out.keys = Object.keys(W.enterable[0]).join(',');
  return out; });
console.log(JSON.stringify(r, null, 1)); await b.close();
