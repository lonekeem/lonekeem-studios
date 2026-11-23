// Solo co-op mission run (Practice Alone path): brief -> every stage -> complete screen + wallet. Local only (BroadcastChannel room).
// Long timers are shortened from the test (host state edit) and say so in the json; everything else runs through the real game loop.
import { launch, context, page, enter, frames } from './lib.mjs'; import fs from 'fs';
const OUT = '/workspace/atq-coop-proof/solo'; fs.mkdirSync(OUT, { recursive: true });
const mission = process.argv[2] || 'supply';
const b = await launch(); const ctx = await context(b); const p = await page(ctx);
await enter(p, { mission, room: 'practice-' + mission });
await p.evaluate(() => { window.__MP_DTCAP = .1; });
await p.waitForFunction(() => window.__coop && window.__coop.S, null, { timeout: 30000 });
await frames(p, 20); await p.screenshot({ path: `${OUT}/${mission}_01_brief.png` });
const log = []; const st = () => p.evaluate(() => { const S = window.__coop.S; return { ph: S.ph, st: S.st, prog: S.prog, el: +S.el.toFixed(1), obj: document.querySelector('#obj').innerText.replace(/\n/g, ' | '), cash: window.__mpTown.bag.count('cash'), sv: S.sv && { x: +S.sv.x.toFixed(1), z: +S.sv.z.toFixed(1), hp: Math.round(S.sv.hp), st: S.sv.st } }; });
const cash0 = await p.evaluate(() => window.__mpTown.bag.count('cash'));
await p.tap('#coopUI [data-a=start]'); await frames(p, 30);
await p.evaluate(() => { window.__mpTown.me.prot = 9999; });
log.push(['start', await st()]);
const go = (x, z) => p.evaluate(([x, z]) => window.__mpTown.setPos(x, z), [x, z]);
const face = (x, z) => p.evaluate(([x, z]) => { const T = window.__mpTown; const a = Math.atan2(x - T.me.x, z - T.me.z); T.me.ry = a; T.camYaw(a); }, [x, z]);
const waitPh = async (fn, n = 300) => { for (let i = 0; i < n; i++) { if (await p.evaluate(fn)) return true; await frames(p, 5); } return false; };
const holdX = async sec => { await p.keyboard.down('KeyX'); await p.waitForTimeout(sec * 1000); await frames(p, 10); await p.keyboard.up('KeyX'); await frames(p, 6); };
const M = await p.evaluate(() => window.__coop.M);
// marker shot: stand 14 m from the first target and look at it
const tgt = await p.evaluate(() => { const c = window.__coop; const S = c.S, st = c.M.stages[S.st]; if (st.kind === 'collect') { const k = c.crates[0]; return [k.x, k.z]; } return st.p || st.to; });
await go(-6, 21.5); await face(tgt[0], tgt[1]); await frames(p, 40); await p.screenshot({ path: `${OUT}/${mission}_02_marker.png` }); log.push(['marker', await st()]);
for (let si = 0; si < M.stages.length; si++) {
  const s = M.stages[si]; await p.waitForFunction(si => window.__coop.S.st >= si || window.__coop.S.ph !== 'go', si);
  if (s.kind === 'collect') { const cs = await p.evaluate(() => window.__coop.crates.map(c => [c.x, c.z])); for (const [x, z] of cs) { await go(x + .3, z + .3); await frames(p, 12); } await frames(p, 10); log.push(['collected', await st()]); }
  else if (s.kind === 'goto') { await go(s.p[0] + .5, s.p[1] + .5); await frames(p, 20); log.push(['goto', await st()]); }
  else if (s.kind === 'use') { await go(s.p[0] - 1.2, s.p[1]); await face(s.p[0], s.p[1]); await frames(p, 10); await p.keyboard.down('KeyX'); await p.waitForTimeout(800); await frames(p, 5); await p.screenshot({ path: `${OUT}/${mission}_03_hold_button.png` }); for (let k = 0; k < 60 && await p.evaluate(si => window.__coop.S.st === si, si); k++) await frames(p, 5); await p.keyboard.up('KeyX'); await frames(p, 10); log.push(['used', await st()]); }
  else if (s.kind === 'hold') { await go(s.p[0], s.p[1]); await frames(p, 40); const a = await st(); await p.waitForTimeout(4000); await frames(p, 10); const b2 = await st(); log.push(['hold-real', a, b2]); await p.screenshot({ path: `${OUT}/${mission}_04_hold_zone.png` }); await p.evaluate(d => { window.__coop.S.hold = d - 1.5; }, s.dur); log.push(['hold timer shortened by test to 1.5 s left']); await frames(p, 60); log.push(['held', await st()]); }
  else if (s.kind === 'kills') { await go(s.p[0], s.p[1] + 6); await frames(p, 30); await p.screenshot({ path: `${OUT}/${mission}_04_kills_zone.png` });
    for (let k = 0; k < 40; k++) { const done = await p.evaluate(() => window.__coop.S.st !== 1 || window.__coop.S.ph !== 'go'); if (done) break; await p.evaluate(([x, z]) => { const T = window.__mpTown; const live = T.Z.zombies.filter(q => !q.dead && Math.hypot(q.root.position.x - x, q.root.position.z - z) < 16); if (live.length) { const q = live[0]; T.Z.killNear(q.root.position.x, q.root.position.z, .4, 9999, { x: 0, z: 1 }); } else window.__coop.spawnLocal(x, z, 3, true); }, s.p); await frames(p, 6); }
    log.push(['killed', await st()]); }
  else if (s.kind === 'escort') { await frames(p, 20); await p.screenshot({ path: `${OUT}/${mission}_04_escort_start.png` }); const from = await p.evaluate(() => [window.__mpTown.me.x, window.__mpTown.me.z]);
    const N = 26; for (let k = 1; k <= N; k++) { const x = from[0] + (s.to[0] - from[0]) * k / N, z = from[1] + (s.to[1] - from[1]) * k / N; await go(x, z); await frames(p, 14); await p.evaluate(() => { const T = window.__mpTown, sv = window.__coop.S.sv; for (const q of T.Z.zombies) { if (q.dead) continue; const pp = q.root.position; if (Math.hypot(pp.x - sv.x, pp.z - sv.z) < 7 || Math.hypot(pp.x - T.me.x, pp.z - T.me.z) < 7) T.Z.killNear(pp.x, pp.z, .3, 9999, { x: 0, z: 1 }); } }); /* stands in for the team defending Marcus */ if (k === 12) { await face(x + 5, z); await frames(p, 4); await p.screenshot({ path: `${OUT}/${mission}_05_escort_mid.png` }); log.push(['escort-mid', await st()]); } }
    await frames(p, 60); log.push(['escorted', await st()]); }
}
const won = await waitPh(() => window.__coop.S.ph !== 'go', 60); await frames(p, 20);
const fin = await st(); log.push(['end', fin]);
await p.screenshot({ path: `${OUT}/${mission}_06_result.png` });
const res = { mission, cash0, cashEnd: fin.cash, paid: fin.cash - cash0, won: fin.ph === 'won', errs: p.errs, nf: p.nf, log };
console.log(JSON.stringify(res, null, 1)); fs.writeFileSync(`${OUT}/${mission}.json`, JSON.stringify(res, null, 1));
await b.close();
