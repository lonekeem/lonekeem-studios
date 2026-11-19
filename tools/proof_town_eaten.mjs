// close-up of a townsperson being eaten (gore hooks): node tools/proof_town_eaten.mjs <port> <outdir> [camdx camdy camdz]
import { openGame, stepShot } from './proof_lib.mjs';
import fs from 'fs';
const [,, port = '4310', out = '/workspace/atqg-proof/eaten4', cx = '1.8', cy = '1.5', cz = '1.7'] = process.argv; fs.mkdirSync(out, { recursive: true });
const { b, p, errs } = await openGame(port, 1, { skip: true });
await p.addStyleTag({ content: '#hud,#touch,#dlg,#xhair,#vignette,#lowhp,#prompt,#wp,#mini,#obj{display:none!important}' });
await p.evaluate(([cx, cy, cz]) => { const g = window.__atq.game; g.dlgQ = []; g.dlgCur = null; g.cut = null; g.wpTarget = null; g.alive().forEach(z => z.root.position.set(900, 0, 900)); g.pickups.forEach(k => { k.mesh.visible = false; });
  g.player.root.position.set(6.5, 0, 9); g.hp = g.maxHp = 9999; g.paused = true; for (let i = 0; i < 12; i++) g.update(1 / 30, 1 / 30); g.player.root.visible = false;
  g.town.force('caught', { near: true, dir: -1, at: [0.5, 14] });
  const V = g.camera.position.constructor; const mc = { anim: 'Idle_Loop', cam: new V(), look: new V(), flash: false }; window.__down = 0;
  const ou = g.update.bind(g); g.update = (a, c) => { ou(a, c); const T = g.town, n = T.npcs[0] || T.bodies[T.bodies.length - 1]; if (n && n.tn && n.tn.state === 'down') window.__down += a; if (!n || !(n.tn.state === 'down' || n.tn.frozen)) return; g.cut = mc; const h = new V(); n.worldOf('DEF-hips', h); mc.look.set(h.x, .3, h.z); mc.cam.set(h.x + cx, cy, h.z + cz); g.camera.position.copy(mc.cam); g.camera.lookAt(mc.look); g._lk = mc.look.clone(); g.player.root.visible = false; g.pickups.forEach(k => { k.mesh.visible = false; });
    if (!g.__pl) { g.__pl = new g.faceL.constructor('#fff0dc', 2.4, 12, 1.4); g.scene.add(g.__pl); } g.__pl.position.copy(mc.cam).add({ x: 0, y: .6, z: 0 }); g.__pl.visible = true; }; }, [+cx, +cy, +cz]);
// run until the NPC is down
for (let i = 0; i < 900; i++) { const d = await p.evaluate(() => { const g = window.__atq.game; for (let k = 0; k < 6; k++) g.update(1 / 30, 1 / 30); return window.__down; }); if (d > 0.1) break; }
const times = [1.5, 4, 7, 10]; let last = 0;
for (let i = 0; i < times.length; i++) { const need = times[i]; await p.evaluate((need) => { const g = window.__atq.game; while (window.__down < need) g.update(1 / 30, 1 / 30); }, need); await stepShot(p, `${out}/e${i}.png`, 3, 1 / 30, 600); }
console.log(errs.slice(0, 5)); await b.close();
