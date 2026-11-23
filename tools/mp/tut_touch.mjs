// Local-only: real touch taps on the free-roam tutorial (solo room, Supabase blocked). Checks Next/Skip/X work and that skip is saved.
import { launch, context, page, enter, frames } from '../coop/lib.mjs';
const OUT = process.env.OUT || '/workspace/atq-tutfix-proof'; const R = {};
const b = await launch(); const ctx = await context(b); const p = await page(ctx, 'A');
await p.evaluate(() => localStorage.removeItem('atq.town.tut'));
await enter(p, { name: 'TutTest', room: 'test-tut-1' }); await frames(p, 20);
await p.waitForFunction(() => __mpTown.ACT.TUT.on, null, { timeout: 15000 }).catch(() => {});
const info = () => p.evaluate(() => { const T = __mpTown.ACT.TUT; const bx = T.box || [...document.querySelectorAll('div')].find(d => /TUTORIAL ·/.test(d.textContent) && d.querySelector('button')); const bs = bx ? [...bx.querySelectorAll('button')].map(q => { const r = q.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2; const hit = document.elementFromPoint(cx, cy); return { t: q.textContent, cx, cy, hitOk: hit === q || q.contains(hit), hit: hit && (hit.id || hit.className || hit.tagName) }; }) : []; const r = bx && bx.getBoundingClientRect(); return { on: T.on, text: bx && bx.textContent.slice(0, 40), rect: r && [r.left, r.top, r.width, r.height].map(Math.round), bs }; });
R.before = await info(); await p.screenshot({ path: OUT + '/' + (process.env.TAG || 'x') + '-1-tutorial.png' });
const tap = async t => { const s = await info(); const q = s.bs.find(x => x.t === t); if (!q) return 'nobutton'; await p.touchscreen.tap(q.cx, q.cy); await frames(p, 10); return (await info()).text; };
R.afterNext = await tap('Next'); R.afterNext2 = await tap('Next');
R.mid = await info(); await p.screenshot({ path: OUT + '/' + (process.env.TAG || 'x') + '-2-after-next.png' });
R.afterSkip = await tap(process.env.CLOSE || 'Skip'); R.end = await info();
R.saved = await p.evaluate(() => localStorage.getItem('atq.town.tut'));
R.errs = p.errs; R.nf = p.nf; console.log(JSON.stringify(R, null, 1)); await b.close();
