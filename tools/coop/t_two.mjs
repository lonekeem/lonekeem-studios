// Two local clients in ONE private test room (BroadcastChannel between two tabs of one isolated browser context).
// Never the public lobby / Supabase (all supabase.co requests are blocked by the context). Checks host-authoritative sync,
// downed + revive, shared crate progress, "everyone at evac", rewards on both, team wipe fail, play again, host migration.
import { launch, context, page, enter, frames } from './lib.mjs'; import fs from 'fs';
const OUT = '/workspace/atq-coop-proof/two'; fs.mkdirSync(OUT, { recursive: true });
const ROOM = 'test-coop-' + Date.now().toString(36);
const b = await launch(); const ctx = await context(b);
const A = await page(ctx, 'A'); await enter(A, { name: 'Keem', mission: 'supply', room: ROOM });
const B = await page(ctx, 'B'); await enter(B, { name: 'Nova', mission: 'supply', room: ROOM });
for (const p of [A, B]) await p.evaluate(() => { window.__MP_DTCAP = .1; });
const both = async n => { await Promise.all([frames(A, n), frames(B, n)]); };
const res = { room: ROOM, steps: [] }; const step = (k, v) => { res.steps.push([k, v]); console.log(k, JSON.stringify(v)); };
const info = p => p.evaluate(() => { const c = window.__coop, S = c.S; return S && { host: c.isHost(), run: S.run, ph: S.ph, st: S.st, prog: S.prog, need: S.need, downs: S.downs, taken: S.taken, players: c.players().map(q => q.name + (q.down ? '(down)' : '')), myDown: c.L.down, cash: window.__mpTown.bag.count('cash'), obj: document.querySelector('#obj').innerText.replace(/\n/g, ' | '), peers: window.__mpTown.peers() }; });
for (let i = 0; i < 60; i++) { const [a, b2] = [await info(A), await info(B)]; if (a && b2 && a.run === b2.run && a.peers && b2.peers) break; await both(10); }
const host = (await info(A)).host ? A : B, guest = host === A ? B : A; const hn = host === A ? 'Keem' : 'Nova';
step('joined', { A: await info(A), B: await info(B), host: hn });
await both(10); await guest.screenshot({ path: `${OUT}/01_guest_brief.png` }); await host.screenshot({ path: `${OUT}/01_host_brief.png` });
step('guest has start button?', await guest.evaluate(() => !!document.querySelector('#coopUI [data-a=start]')));
await host.tap('#coopUI [data-a=start]'); await both(30);
for (const p of [A, B]) await p.evaluate(() => { window.__mpTown.me.prot = 9999; window.__mpTown.Z.killNear(0, 0, 400, 9999); });
step('started', { A: await info(A), B: await info(B) });
await guest.evaluate(() => { const T = window.__mpTown; T.me.prot = 0; T.die(); }); await both(20);
step('guest downed', { host: await info(host), guest: await info(guest) });
const gp = await guest.evaluate(() => [window.__mpTown.me.x, window.__mpTown.me.z]);
await host.evaluate(([x, z]) => { const T = window.__mpTown; T.setPos(x + 1.4, z + .6); const a = Math.atan2(-1.4, -.6); T.me.ry = a; T.camYaw(a); }, gp); await both(30);
await host.screenshot({ path: `${OUT}/02_host_sees_downed_teammate.png` }); await guest.screenshot({ path: `${OUT}/02_guest_downed_screen.png` });
step('host hold button', await host.evaluate(() => { const e = document.querySelector('#coopUI .chold'); return { on: e.classList.contains('on'), text: e.innerText }; }));
await host.keyboard.down('KeyX'); for (let i = 0; i < 40 && await guest.evaluate(() => window.__coop.L.down); i++) await both(5); await host.keyboard.up('KeyX'); await both(20);
step('after revive', { host: await info(host), guest: await info(guest), guestHp: await guest.evaluate(() => window.__mpTown.me.hp) });
await guest.screenshot({ path: `${OUT}/03_guest_revived.png` });
await guest.evaluate(() => { window.__mpTown.me.prot = 9999; });
const cs = await host.evaluate(() => window.__coop.crates.map(c => [c.x, c.z]));
for (let i = 0; i < cs.length; i++) { const p = i < 3 ? guest : host; await p.evaluate(([x, z]) => window.__mpTown.setPos(x + .3, z + .3), cs[i]); await both(14); if (i === 2) step('guest picked 3', { host: await info(host), guest: await info(guest) }); }
await both(20); step('all crates', { host: await info(host), guest: await info(guest) });
await host.evaluate(() => window.__mpTown.setPos(-6, 24)); await both(30); step('host at evac alone', { host: await info(host), guest: await info(guest) });
await host.screenshot({ path: `${OUT}/04_host_waiting_at_evac.png` });
await guest.evaluate(() => window.__mpTown.setPos(-5, 23)); await both(40);
step('both at evac', { host: await info(host), guest: await info(guest) });
await host.screenshot({ path: `${OUT}/05_host_complete.png` }); await guest.screenshot({ path: `${OUT}/05_guest_complete.png` });
await guest.evaluate(() => document.querySelector('#coopUI [data-a=again]')?.click()); await both(30); step('after replay request', { host: await info(host), guest: await info(guest) });
await host.evaluate(() => { window.__coop.S.bt = 0; }); await both(30);
for (const p of [A, B]) await p.evaluate(() => { const T = window.__mpTown; T.me.prot = 0; T.die(); }); await both(40);
step('team wipe', { host: await info(host), guest: await info(guest) });
await guest.screenshot({ path: `${OUT}/06_guest_failed.png` });
await host.evaluate(() => document.querySelector('#coopUI [data-a=again]')?.click()); await both(20); await host.evaluate(() => { window.__coop.S.bt = 0; }); await both(40);
const before = await info(guest); await host.close(); for (let i = 0; i < 30; i++) { await frames(guest, 20); const g = await info(guest); if (g.host && g.peers === 0) break; }
await frames(guest, 60); const el0 = await guest.evaluate(() => window.__coop.S.el); await frames(guest, 40); const el1 = await guest.evaluate(() => window.__coop.S.el);
step('host left', { before, after: await info(guest), timerAdvancing: el1 > el0, el0, el1 });
res.errs = { A: A.errs, B: B.errs }; res.nf = { A: A.nf, B: B.nf };
fs.writeFileSync(`${OUT}/two.json`, JSON.stringify(res, null, 1)); console.log('errs', JSON.stringify(res.errs), 'nf', JSON.stringify(res.nf)); await b.close();
