// Bite/sleeve camera + pose bench: Dad facing +z, camera = Keem's view (front, slightly left). Variants of pose x wound angle.
import { openGame, stepShot, sheet } from './proof_lib.mjs';
import fs from 'fs';
const port = process.argv[2] || 4301, out = '/workspace/atqr-proof/bite'; fs.mkdirSync(out, { recursive: true });
const variants = JSON.parse(process.argv[3] || '[]');
const { b, p, errs } = await openGame(port, 2, { skip: false });
await p.evaluate(() => { const g = window.__atq.game; g.dlgQ = []; g.dlgCur = null; g.cut = null; const d = g.npcs.marcus; d.root.visible = true; d.update = null; g.alive().forEach(z => z.root.position.set(900, 0, 900)); g.npcs.nia.root.visible = false;
  d.root.position.set(-11, 0, 19.2); d.root.rotation.y = 0; g.player.root.position.set(-30, 0, 19); const V = g.camera.position.constructor; const mc = { anim: 'Idle_Loop', cam: new V(), look: new V(), flash: false }; g.cut = mc; g.world.walls.forEach(w => { w.visible = false; });
  window.__off = [0.35, 0.1, 1.15]; const ou = g.update.bind(g); g.update = (a, c) => { ou(a, c); g.cut = mc; g.convo = null; g.dlgQ = []; d.root.rotation.y = 0; d.root.position.set(-11, 0, 19.2); const bs = d.skin.skeleton.bones, f = (n) => bs.find(x => x.name === n).getWorldPosition(new V()); const mid = f('LeftForeArm').add(f('LeftHand')).multiplyScalar(0.5).lerp(f('Head'), 0.22); const o = window.__off; mc.look.copy(mid); mc.cam.set(mid.x + o[0], mid.y + o[1], mid.z + o[2]); g.camera.position.copy(mc.cam); g._lk = mc.look.clone(); }; });
await p.evaluate(() => { const g = window.__atq.game; for (let i = 0; i < 20; i++) g.update(1 / 30, 1 / 30); });
const files = [];
for (let i = 0; i < variants.length; i++) { const v = variants[i]; await p.evaluate((v) => { const g = window.__atq.game, d = g.npcs.marcus; window.__off = v.off || [0.35, 0.1, 1.15]; g.ACT.POSES.showL = v.pose; d.ax = null; const o = d._slLeft; if (o) { o.grp.parent.remove(o.grp); d._slLeft = null; } const a = g.ACT.actStart(d, { pose: 'showL', hold: true }); a.w = 1; const S = g.ACT.makeSleeve(d, 'Left', v.phi); S.set(1, 1, 1); }, v);
  const f = `${out}/v${i}.png`; await stepShot(p, f, 4, 1 / 30, 1100); files.push(f); }
sheet(files, `${out}/BITE_sheet.png`, 3, 0.8); console.log(errs.slice(0, 3)); await b.close();
