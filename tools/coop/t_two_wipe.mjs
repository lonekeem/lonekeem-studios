// Remainder of the two-player test: team wipe fail, play again, host migration. Same private BroadcastChannel room, supabase blocked.
import { launch, context, page, enter, frames } from './lib.mjs'; import fs from 'fs';
const OUT = '/workspace/atq-coop-proof/two'; fs.mkdirSync(OUT, { recursive: true });
const ROOM = 'test-coop-wipe-' + Date.now().toString(36);
const b = await launch(); const ctx = await context(b);
const A = await page(ctx, 'A'); await enter(A, { name: 'Keem', mission: 'supply', room: ROOM });
const B = await page(ctx, 'B'); await enter(B, { name: 'Nova', mission: 'supply', room: ROOM });
for (const p of [A, B]) await p.evaluate(() => { window.__MP_DTCAP = .1; });
const both = async n => { await Promise.all([frames(A, n), frames(B, n)]); };
const info = p => p.evaluate(() => { const c = window.__coop, S = c.S; return S && { host: c.isHost(), run: S.run, ph: S.ph, why: S.why, cash: window.__mpTown.bag.count('cash'), peers: window.__mpTown.peers(), players: c.players().map(q => q.name + (q.down ? '(down)' : '')), el: +((S.el)||0).toFixed(1), obj: document.querySelector('#obj')?.innerText.replace(/\n/g,' | ') }; });
for (let i = 0; i < 50; i++) { const [a,b2]=[await info(A),await info(B)]; if (a && b2 && a.run===b2.run && a.peers && b2.peers) break; await both(10); }
const host = (await info(A)).host ? A : B, guest = host === A ? B : A;
await host.evaluate(() => document.querySelector('#coopUI [data-a=start]')?.click()); await both(30);
for (const p of [A, B]) await p.evaluate(() => { const T = window.__mpTown; T.me.prot = 0; T.die(); });
for (let i = 0; i < 40; i++) { const a = await info(host); if (a && a.ph === 'lost') break; await both(8); }
const wipe = { host: await info(host), guest: await info(guest) };
await guest.screenshot({ path: `${OUT}/06_guest_failed.png` });
await host.screenshot({ path: `${OUT}/06_host_failed.png` });
console.log('wipe', JSON.stringify(wipe));
await host.evaluate(() => document.querySelector('#coopUI [data-a=again]')?.click()); await both(20);
await host.evaluate(() => { if (window.__coop.S) window.__coop.S.bt = 0; }); await both(40);
const before = await info(guest);
await host.close();
for (let i = 0; i < 30; i++) { await frames(guest, 20); const g = await info(guest); if (g && g.host && g.peers === 0) break; }
await frames(guest, 50); const el0 = await guest.evaluate(() => window.__coop.S && window.__coop.S.el);
await frames(guest, 40); const el1 = await guest.evaluate(() => window.__coop.S && window.__coop.S.el);
const after = await info(guest);
const res = { wipe, before, after, timerAdvancing: el1 > el0, el0, el1, errs: { A: A.errs, B: B.errs }, nf: { A: A.nf, B: B.nf } };
console.log(JSON.stringify({ after, timerAdvancing: res.timerAdvancing, el0, el1, wipePh: wipe.host && wipe.host.ph, cash: wipe, errs: res.errs }, null, 1));
fs.writeFileSync(`${OUT}/wipe.json`, JSON.stringify(res, null, 1));
await b.close();
if (!(wipe.host && wipe.host.ph === 'lost' && wipe.guest.ph === 'lost' && res.timerAdvancing && after.host)) process.exit(1);
