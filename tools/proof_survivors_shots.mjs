// Story town survivors with screenshots: run -> caught -> body persists -> only removed far + off-screen after 2.5 min.  node tools/proof_survivors_shots.mjs <port> <outdir>
import { openGame, stepShot } from './proof_lib.mjs'; import fs from 'fs';
const [,, port = '5340', out = '/workspace/atq1919/docs/mp-fix2/surv'] = process.argv; fs.mkdirSync(out, { recursive: true });
const { b, p, errs } = await openGame(port, 1, { skip: true });
const log = [];
await p.evaluate(() => { const g = window.__atq.game; g.dlgQ = []; g.dlgCur = null; g.cut = null; g.wpTarget = null; g.alive().forEach(z => z.root.position.set(900, 0, 900)); g.player.root.position.set(6.5, 0, 9); g.hp = g.maxHp = 9999; g.paused = true; for (let i = 0; i < 12; i++) g.update(1 / 30, 1 / 30); g.town.force('caught', { near: true, dir: -1 }); });
const look = (d = 11) => p.evaluate((d) => { const g = window.__atq.game, T = g.town, f = T.npcs[0] || T.bodies[0]; if (!f) return; const B = f.root.position; const px = B.x, pz = B.z + d; g.player.root.position.set(px, 0, pz); g.cam.yaw = Math.atan2(-(B.x - px), -(B.z - pz)); g.cam.pitch = -.12; }, d);
const info = () => p.evaluate(() => { const g = window.__atq.game, T = g.town, f = T.npcs[0] || T.bodies[0]; if (!f) return null; const P = f.root.position; return { st: f.tn.state + (f.tn.frozen ? ':frozen' : ''), npcs: T.npcs.length, bodies: T.bodies.length, vis: f.root.visible, dist: +Math.hypot(P.x - g.player.root.position.x, P.z - g.player.root.position.z).toFixed(0), t: +T.t.toFixed(0) }; });
await look(14); await stepShot(p, `${out}/story_surv_1_run.png`, 20); log.push(['run', await info()]);
for (let i = 0; i < 30; i++) { await p.evaluate(() => { const g = window.__atq.game; for (let k = 0; k < 15; k++) g.update(1 / 30, 1 / 30); }); const s = await info(); if (s && s.bodies) break; }
await look(8); await stepShot(p, `${out}/story_surv_2_body.png`, 30); log.push(['body just formed', await info()]);
await look(8); await stepShot(p, `${out}/story_surv_3_body_30s.png`, 900); log.push(['30s later', await info()]);
await look(8); await stepShot(p, `${out}/story_surv_4_body_100s.png`, 2100); log.push(['100s later (still there)', await info()]);
// leave the area: far + off-screen, then 2.5 min passes -> quietly removed
await p.evaluate(() => { const g = window.__atq.game; g.player.root.position.set(6.5, 0, 90); g.cam.yaw = 0; });
await stepShot(p, `${out}/story_surv_5_far.png`, 3000); log.push(['84 m away but still IN VIEW at 209 s: stays', await info()]);
await p.evaluate(() => { window.__atq.game.cam.yaw = Math.PI; }); await stepShot(p, `${out}/story_surv_6_looked_away.png`, 120); log.push(['camera turned away: body removed quietly (bodies count)', await p.evaluate(() => { const g = window.__atq.game, T = g.town, b = T.bodies[0]; return { bodies: T.bodies.length, dbg: b && { born: b.tn.bornAt, t: T.t, d: Math.hypot(b.root.position.x - g.player.root.position.x, b.root.position.z - g.player.root.position.z), camPos: g.camera.position.toArray().map(v => +v.toFixed(0)), camDir: g.camera.getWorldDirection(new g.camera.position.constructor()).toArray().map(v => +v.toFixed(2)), body: b.root.position.toArray().map(v => +v.toFixed(0)), far: g.camera.far, FRcheck: (() => { g.camera.updateMatrixWorld(); const V = g.camera.position.constructor; const v = new V(b.root.position.x, 1.6, b.root.position.z).project(g.camera); return v.toArray().map(q => +q.toFixed(2)); })() } }; })]);
await p.evaluate(() => { window.__atq.game.cam.yaw = 0; }); await stepShot(p, `${out}/story_surv_7_looked_back.png`, 2);
console.log(JSON.stringify(log, null, 1)); console.log('errors', errs.slice(0, 3)); fs.writeFileSync(out + '/story_survivors.json', JSON.stringify(log, null, 1)); await b.close();
