// Local solo room: start a delivery job, get in the nearest car via the real ✋ action, then DRIVE to the target with real keyboard input
// (W + A/D steering autopilot, reverse when stuck) until the job completes. Screens: arrow on foot, while driving, and on arrival.
import { launch, context, page, enter, frames } from './coop/lib.mjs'; import fs from 'fs';
const OUT = process.env.OUT || '/workspace/atq-sweep-proof/drive'; fs.mkdirSync(OUT, { recursive: true });
const JOB = process.env.JOB || 'dlv-food';
const b = await launch(); const ctx = await context(b); await ctx.addInitScript(() => localStorage.setItem('atq.town.tut', '1')); const p = await page(ctx, 'A');
await enter(p, { name: 'Driver', room: 'test-drive-1' }); await frames(p, 20); await p.evaluate(() => { window.__MP_DTCAP = .1; });
const ev = (f, a) => p.evaluate(f, a); const R = { job: JOB, log: [] };
await ev((j) => { const T = __mpTown; T.setWeather('clear'); T.setDay(.45); T.ACT.startJob(j); }, JOB); await frames(p, 20);
const st = () => ev(() => { const T = __mpTown, A = T.ACT, s = A.state.job; const car = T.me.drv; const tg = s && (s.target || s.dest); const arrow = [...document.querySelectorAll('#mpt div, body > div')].filter(d => /^\d+(\.\d+)? ?(m|km)$/.test(d.textContent.trim()) && d.offsetParent).map(d => d.textContent.trim());
  return { job: s ? s.def.id : null, status: s && s.status, t: tg && [+tg.x.toFixed(1), +tg.z.toFixed(1)], me: [+T.me.x.toFixed(1), +T.me.z.toFixed(1)], drv: !!car, v: car ? +car.v.toFixed(1) : 0, ry: car ? car.ry : T.me.ry, cash: T.bag.count('cash'), arrow }; });
let s0 = await st(); R.start = s0; await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/01-foot-arrow.png` });
// nearest unlocked car; stand by its door and use the real gather action (same as tapping ✋)
R.enter = await ev(() => { const T = __mpTown; const c = T.cars.slice().sort((a, b) => Math.hypot(a.x - T.me.x, a.z - T.me.z) - Math.hypot(b.x - T.me.x, b.z - T.me.z)).find(c => c.broken && c.fuel > 6) || T.cars[0]; let g = null; for (const [ox, oz] of [[2, 0], [-2, 0], [0, 2], [0, -2], [1.6, 1.6], [-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6]]) { T.setPos(c.x + ox, c.z + oz); g = T.gather().find(a => /^.?\s*Enter /.test(a.label)); if (g) break; } g && g.run(); return { label: g && g.label, drv: !!T.me.drv, fuel: c.fuel, broken: !!c.broken, at: [c.x, c.z] }; });
await frames(p, 20); await p.screenshot({ path: `${OUT}/02-in-car.png` });
const keyDown = k => p.keyboard.down(k), keyUp = k => p.keyboard.up(k);
// phase 1: real input on the street by the spawn: gas 3 s, then steer-left 1.5 s (learn which key raises ry)
let a = await st(); await keyDown('w'); await p.waitForTimeout(3000); let a2 = await st(); await keyDown('a'); await p.waitForTimeout(1500); await keyUp('a'); await keyUp('w'); let c = await st();
R.calib = { start: a.me, afterGas: a2.me, vGas: a2.v, afterLeft: c.me, ry0: +a2.ry.toFixed(2), ry1: +c.ry.toFixed(2) }; const leftRaises = c.ry > a2.ry;
await keyDown('s'); await p.waitForTimeout(1500); await keyUp('s');
// phase 2: put the car on open ground ~45 m short of the target, then drive in for real
R.place = await ev(() => { const T = __mpTown, W = T.W, s = T.ACT.state.job, tg = s.target || s.dest, car = T.me.drv; let best = null;
  for (let r = 40; r <= 70 && !best; r += 5) for (let k = 0; k < 24 && !best; k++) { const an = k / 24 * 6.283, x = tg.x + Math.sin(an) * r, z = tg.z + Math.cos(an) * r; let ok = true; for (let q = 0; q <= 1; q += .1) { const px = x + (tg.x - x) * q * .85, pz = z + (tg.z - z) * q * .85; if (W.col.hit(px, pz, 1.8)) { ok = false; break; } } if (ok) best = [x, z]; }
  if (!best) return null; car.x = best[0]; car.z = best[1]; car.v = 0; car.ry = Math.atan2(tg.x - best[0], tg.z - best[1]); return { at: best.map(v => +v.toFixed(1)), ry: +car.ry.toFixed(2) }; });
await frames(p, 10);
const wrap = x => Math.atan2(Math.sin(x), Math.cos(x));
const t0 = Date.now(); let last = await st(), stuckT = 0, shotMid = false, done = false, best = 1e9;
while (Date.now() - t0 < 150000) { const S = await st(); if (!S.job) { done = true; R.end = S; break; } if (!S.drv) { R.log.push(['fell out of car', S]); break; }
  const d = Math.hypot(S.t[0] - S.me[0], S.t[1] - S.me[1]); best = Math.min(best, d);
  const diff = wrap(Math.atan2(S.t[0] - S.me[0], S.t[1] - S.me[1]) - S.ry); const mv = Math.hypot(S.me[0] - last.me[0], S.me[1] - last.me[1]);
  if (mv < .15 && Date.now() - t0 > 4000) stuckT++; else stuckT = 0;
  if (stuckT > 8) { await keyUp('w'); await keyDown('s'); await p.waitForTimeout(1200); await keyUp('s'); stuckT = 0; R.log.push(['unstick', S.me]); last = await st(); continue; }
  await keyUp('a'); await keyUp('d'); if (Math.abs(diff) > .1) await keyDown((diff > 0) === leftRaises ? 'a' : 'd');
  if (S.v > 9) await keyUp('w'); else await keyDown('w');
  if (!shotMid && d < 30) { shotMid = true; await p.screenshot({ path: `${OUT}/03-driving-arrow.png` }); R.mid = S; }
  if (Math.random() < .15) R.log.push([+((Date.now() - t0) / 1000).toFixed(0), +d.toFixed(0), S.v, +diff.toFixed(2), S.arrow[0] || '']);
  last = S; await p.waitForTimeout(150); }
for (const k of ['w', 'a', 's', 'd']) await keyUp(k);
R.done = done; R.best = best; R.secs = Math.round((Date.now() - t0) / 1000); await frames(p, 10); await p.screenshot({ path: `${OUT}/04-arrival.png` });
R.after = await st(); R.errs = p.errs; R.nf = p.nf; fs.writeFileSync(`${OUT}/drive-${JOB}.json`, JSON.stringify(R, null, 1)); console.log(JSON.stringify({ done, best: R.best, secs: R.secs, start: R.start, enter: R.enter, calib: R.calib, end: R.end, cash: R.after.cash, errs: R.errs, nf: R.nf, tail: R.log.slice(-8) })); await b.close();
