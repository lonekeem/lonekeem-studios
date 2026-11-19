// clean town-NPC proof: gameplay-height shoulder camera with wall/car clip protection, no waypoint/pickups.
// node tools/proof_town2.mjs port outDir scenario   (scenario: door | caught | away)
import { openGame } from './proof_lib.mjs';
import fs from 'fs';
const THREE_FILE = process.env.THREE_FILE || 'three.js?v=2e720a67';
const [,, port = '5391', out = '/workspace/atqnpc-proof/clean', scn = 'door'] = process.argv; fs.mkdirSync(out, { recursive: true });
const S = {
  door:   { fate: 'door',   pp: [4, 15.5], at: [3, -2],  dir: -1, frames: +(process.env.N || 46), every: 4, mode: 'door' },
  caught: { fate: 'caught', pp: [6.5, 9], at: [0.5, 14], dir: -1, frames: 40, every: 5, mode: 'follow' },
  away:   { fate: 'away',   pp: [6.5, 9], at: [0.5, 14], dir: -1, frames: 22, every: 5, mode: 'away' },
}[scn];
const { b, p, errs } = await openGame(port, 1, { skip: true });
await p.evaluate(async (u) => { window.__RC = (await import(u)).Raycaster; }, '/node_modules/.vite/deps/' + THREE_FILE);
await p.addStyleTag({ content: '#wp,#mini,#objective,#obj{display:none !important}' });
await p.evaluate((S) => { const g = window.__atq.game; g.dlgQ = []; g.dlgCur = null; g.cut = null; g.wpTarget = null; g.alive().forEach(z => z.root.position.set(900, 0, 900)); g.pickups.forEach(k => { k.mesh.visible = false; });
  g.player.root.position.set(S.pp[0], 0, S.pp[1]); g.hp = g.maxHp = 9999; g.paused = true; for (let i = 0; i < 12; i++) g.update(1 / 30, 1 / 30); g.player.root.visible = false; }, S);
const ok = await p.evaluate((S) => window.__atq.game.town.force(S.fate, { near: true, dir: S.dir, at: S.at }), S); console.log('started', ok);
for (let i = 0; i < S.frames; i++) {
  await p.evaluate(([every, mode]) => { const g = window.__atq.game, T = g.town; for (let k = 0; k < every; k++) g.update(1 / 30, 1 / 30); g.pickups.forEach(k => { k.mesh.visible = false; }); g.wpTarget = null;
    const c = T.npcs[0] || T.bodies[T.bodies.length - 1]; if (c) window.__c = c; const n = window.__c; if (!n) return; const q = n.root.position, yw = n.root.rotation.y; const V = g.camera.position.constructor; const R = g.camera.position.constructor;
    let look, want; if (mode === 'door' && T.doors.length) { const D = T.doors.reduce((a, d) => Math.hypot(d.wallX - q.x, d.cz - q.z) < Math.hypot(a.wallX - q.x, a.cz - q.z) ? d : a); look = new V(D.wallX + D.f * 1.6, 1.1, D.cz); want = new V(D.wallX + D.f * 4.6, 1.6, D.cz - 2.6); if (Math.hypot(D.wallX - q.x, D.cz - q.z) > 14) { look = new V(q.x, 1.1, q.z); want = new V(q.x - 3, 1.6, q.z - 3); } }
    else { const lb = mode === 'away' ? -1.5 : .5; look = new V(q.x + Math.sin(yw) * lb, 1.0, q.z + Math.cos(yw) * lb); const sd = mode === 'away' ? 3.5 : 2.9; want = new V(q.x + Math.cos(yw) * sd - Math.sin(yw) * 1.0, 1.55, q.z - Math.sin(yw) * sd - Math.cos(yw) * 1.0); }
    // clip protection: ray from the look point to the camera must not pass through walls / cars; shorten if it does, else try the other side
    const tgt = [...g.world.walls, ...g.world.cars.map(c => c.g)]; const ray = (w) => { const d = w.clone().sub(look), L = d.length(); d.normalize(); const rc = new (window.__RC)(look, d, 0, L); const h = rc.intersectObjects(tgt, true)[0]; return h ? h.distance : L; };
    const L0 = want.clone().sub(look).length(); let best = want, bl = ray(want);
    if (bl < L0 - .05 && mode !== 'door') { const alt = want.clone(); alt.x = q.x - (want.x - q.x) - 0; alt.z = q.z - (want.z - q.z); const la = ray(alt); if (la > bl) { best = alt; bl = la; } }
    const d = best.clone().sub(look).normalize(); const cam = look.clone().addScaledVector(d, Math.max(1.6, Math.min(bl - .35, L0)));
    g.cut = { anim: 'Idle_Loop', cam, look, flash: false }; g.camera.position.copy(cam); g._lk = look.clone(); g.camera.lookAt(look);
    if (!g.__pl) { g.__pl = new g.faceL.constructor('#fff0dc', 2.4, 12, 1.4); g.scene.add(g.__pl); } g.__pl.position.copy(cam).add({ x: 0, y: .6, z: 0 }); g.__pl.visible = true; }, [S.every, S.mode]);
  await p.waitForTimeout(400); const f = `${out}/${scn}_${String(i).padStart(2, '0')}.png`; await p.screenshot({ path: f, timeout: 120000 });
  console.log(i, await p.evaluate(() => { const g = window.__atq.game, T = g.town; const c = T.npcs[0]; return JSON.stringify({ st: c ? c.tn.state : '-', cur: c ? c.curName : '', vis: c ? c.root.visible : null, door: T.doors.filter(d => d.k > 0).map(d => +d.k.toFixed(2)), cam: g.camera.position.toArray().map(v => +v.toFixed(1)), npc: c ? [c.root.position.x, c.root.position.z].map(v => +v.toFixed(1)) : null, shot: !!g.cut, bodies: T.bodies.length, eat: g.zombies.filter(z => z.st === 'eat' && z.eat && z.eat.tn).length }); })); }
console.log(errs.slice(0, 5)); await b.close();
