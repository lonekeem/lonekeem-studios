// Local-only: job arrow (on foot + driving), morning start, night brightness. Solo room; Supabase blocked.
import { launch, context, page, enter, frames } from '../coop/lib.mjs';
const OUT = process.env.OUT || '/workspace/atq-tutfix-proof/an'; const fs = await import('fs'); fs.mkdirSync(OUT, { recursive: true });
const b = await launch(); const ctx = await context(b); await ctx.addInitScript(() => localStorage.setItem('atq.town.tut', '1')); const p = await page(ctx, 'A'); const R = {};
await enter(p, { name: 'ArrowTest', room: 'test-arrow-1' }); await frames(p, 30);
R.start = await p.evaluate(() => { const S = __mpTown.DN && __mpTown.DN.state; return S ? { p: +S.p.toFixed(3), label: S.label } : null; });
await p.waitForTimeout(800); await p.screenshot({ path: OUT + '/01-start-morning.png' });
const ev = (f, a) => p.evaluate(f, a);
await ev(() => { const T = __mpTown; T.setWeather('clear'); T.setDay(.45); T.ACT.startJob('dlv-food'); }); await frames(p, 20);
R.job = await ev(() => { const A = __mpTown.ACT, T = __mpTown; const t = A.state.job && A.state.job.target; return { job: A.state.job && A.state.job.def.id, t: t && [Math.round(t.x), Math.round(t.z)], me: [Math.round(T.me.x), Math.round(T.me.z)] }; });
await p.waitForTimeout(600); await p.screenshot({ path: OUT + '/02-arrow-foot.png' });
// drive: put the player in the nearest car
R.drive = await ev(() => { const T = __mpTown; const c = T.cars.slice().sort((a, b) => Math.hypot(a.x - T.me.x, a.z - T.me.z) - Math.hypot(b.x - T.me.x, b.z - T.me.z)).find(c => !c.locked) || T.cars[0]; T.setPos(c.x + 2, c.z); const g = T.gather().find(a => /^.?\s*Enter /.test(a.label)); g && g.run(); return { drv: !!T.me.drv, label: g && g.label }; });
await frames(p, 40); await p.waitForTimeout(600); await p.screenshot({ path: OUT + '/03-arrow-driving.png' });
R.arrowTxt = await ev(() => [...document.querySelectorAll('#mpt div')].filter(d => / (m|km)$/.test(d.textContent) && d.style.display !== 'none').map(d => d.textContent));
// night at spawn
await ev(() => { const T = __mpTown; T.ACT.state.job && (T.ACT.state.job = null); }); 
await ev(() => { const T = __mpTown; if (T.me.drv && T.exitCar) T.exitCar(); T.setPos(-6, 21.5); T.setDay(.02); T.setCam(1.57, .25, 9); }); await frames(p, 40); await p.waitForTimeout(800); await p.screenshot({ path: OUT + '/04-night-spawn.png' });
await ev(() => { const T = __mpTown; T.setDay(.9); }); await frames(p, 30); await p.waitForTimeout(500); await p.screenshot({ path: OUT + '/05-night-late.png' });
R.errs = p.errs; R.nf = p.nf; console.log(JSON.stringify(R)); await b.close();
