// Pop-in audit (multiplayer): every visibility change of a zombie / corpse while the player sprints along the road toward and past them.
import { boot } from '../mpfix/lib.mjs'; import fs from 'fs';
const OUT = '/workspace/atq1919/docs/mp-fix2/surv'; fs.mkdirSync(OUT, { recursive: true });
const { b, p } = await boot(); const fr = n => p.evaluate(n => new Promise(r => { let k = 0; const f = () => { if (++k >= n) r(); else requestAnimationFrame(f); }; requestAnimationFrame(f); }), n);
await p.evaluate(() => { const T = window.__mpTown; T.setPos(-58, 21.5); T.me.ry = Math.PI / 2; T.camYaw(Math.PI / 2);
  // corpses + live zombies spread along the road ahead (50..110 m) and behind
  window.__pz = []; for (let i = 0; i < 8; i++) { const q = T.Z.spawnAt(-58 + 50 + i * 9, 21 + (i % 2) * 1.4, {}); q.st = 'idle'; if (i % 2) q.hp = -1; window.__pz.push(q); }
  window.__log = []; const prev = new Map(); const V = T.cam.position.constructor; window.__tick = () => { const cam = T.cam; cam.updateMatrixWorld(); for (const q of T.Z.zombies) { const P = q.root.position, d = Math.hypot(P.x - T.me.x, P.z - T.me.z); const v = new V(P.x, 1, P.z).project(cam); const inF = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05; const was = prev.get(q); const vis = q.root.visible; if (was === undefined) { if (window.__armed && vis && inF) window.__log.push({ ev: 'appears(new)', dead: !!q.dead, d: +d.toFixed(0), fog: +Math.min(1, Math.max(0, (d - 28) / 77)).toFixed(2) }); } else if (was !== vis && inF) window.__log.push({ ev: vis ? 'shows' : 'hides', dead: !!q.dead, d: +d.toFixed(0), fog: +Math.min(1, Math.max(0, (d - 28) / 77)).toFixed(2) }); prev.set(q, vis); } }; });
// kill the odd ones for real (they are dead bodies from now on)
await p.evaluate(() => { for (const q of window.__pz) if (q.hp <= 0) window.__mpTown.Z.killNear(q.root.position.x, q.root.position.z, .3, 999); });
await fr(2); await p.evaluate(() => { window.__tick(); window.__armed = true; });
await p.evaluate(() => { const T = window.__mpTown; T.key('KeyW', true); T.key('ShiftLeft', true); });
let shots = 0;
for (let i = 0; i < 120; i++) { await fr(1); await p.evaluate(() => window.__tick()); const x = await p.evaluate(() => window.__mpTown.me.x); if ((i === 30 || i === 70) && shots < 2) { await p.screenshot({ path: `${OUT}/popin_run${shots++}.png` }); } if (x > 60) break; }
await p.evaluate(() => { const T = window.__mpTown; T.key('KeyW', false); T.key('ShiftLeft', false); });
const r = await p.evaluate(() => ({ log: window.__log, x: window.__mpTown.me.x, n: window.__mpTown.Z.zombies.length }));
const bad = r.log.filter(e => e.fog < .85); console.log(JSON.stringify({ playerX: +r.x.toFixed(1), zombiesTracked: r.n, visibilityChangesInView: r.log.length, withFogUnder85pct: bad.length, bad, sample: r.log.slice(0, 6) }, null, 1));
fs.writeFileSync(OUT + '/popin_mp.json', JSON.stringify({ x: r.x, log: r.log, bad }, null, 1)); await b.close();
