import { launch, client, ctxOpts } from './townlib.mjs';
const b = await launch(); const ctx = await b.newContext(ctxOpts);
const t0 = Date.now(); const p = await client(ctx, 'A'); console.log('A in town after', Date.now() - t0, 'ms');
const st = async pg => pg.evaluate(() => document.querySelector('#obj').innerText.replace(/\n/g, ' '));
console.log('A hud:', await st(p));
if (process.env.TWO) { const ctx2 = await b.newContext(ctxOpts); const q = await client(ctx2, 'B'); await q.evaluate(() => window.__mpTown.setPos(-2, 21.5)); await p.waitForTimeout(5000); console.log('A hud:', await st(p), '| B hud:', await st(q)); console.log('A peers', await p.evaluate(() => [...window.__mpTown.net.peers.values()].map(x => x.name + ':' + (x.s ? x.s.x : '?')))); console.log('B peers', await q.evaluate(() => [...window.__mpTown.net.peers.values()].map(x => x.name + ':' + (x.s ? x.s.x : '?')))); await p.screenshot({ path: process.env.OUT || '/tmp/online_A.png' }); await q.screenshot({ path: (process.env.OUT || '/tmp/online_A.png').replace('A.png', 'B.png') }); }
await b.close();
