// Pose bench: Dad (Idle_Loop) in front + side views for each action pose.
import { openGame, stepShot, sheet } from './proof_lib.mjs';
import fs from 'fs';
const port = process.argv[2] || 4301, out = '/workspace/atqr-proof/poses'; fs.mkdirSync(out, { recursive: true });
const poses = (process.argv[3] || 'showL,rollL,guardL').split(',');
const { b, p, errs } = await openGame(port, 2, { skip: false });
await p.evaluate(() => { const g = window.__atq.game; g.dlgQ = []; g.dlgCur = null; g.cut = null; const d = g.npcs.marcus; d.root.visible = true; d.update = null; g.alive().forEach(z => z.root.position.set(900, 0, 900)); g.npcs.nia.root.visible = false;
  d.root.position.set(-11, 0, 19.2); d.root.rotation.y = 0; g.player.root.position.set(-30, 0, 19); const V = g.camera.position.constructor; window.__V = V; const mc = { anim: 'Idle_Loop', cam: new V(), look: new V(-11, 1.15, 19.2), flash: false }; g.cut = mc;
  const L = new g.faceL.constructor('#fff2e0', 3, 8, 1.5); g.scene.add(L); g.world.walls.forEach(w => { w.visible = false; }); window.__view = 'front';
  const ou = g.update.bind(g); g.update = (a, c) => { ou(a, c); g.cut = mc; g.convo = null; g.dlgQ = []; d.root.rotation.y = 0; d.root.position.set(-11, 0, 19.2); const bs = d.skin.skeleton.bones, fb = bs.find(x => x.name === 'LeftForeArm'), hb = bs.find(x => x.name === 'LeftHand'), hd = bs.find(x => x.name === 'Head'); const A = fb.getWorldPosition(new V()), B = hb.getWorldPosition(new V()), H = hd.getWorldPosition(new V()); const mid = A.add(B).multiplyScalar(0.5).lerp(H, 0.25); const o = { front: [0, 0.1, 1.5], fl: [0.9, 0.1, 1.2], side: [1.6, 0.1, 0.05] }[window.__view]; mc.look.copy(mid); mc.cam.set(mid.x + o[0], mid.y + o[1], mid.z + o[2]); L.position.set(mc.cam.x + 0.3, mc.cam.y + 1.2, mc.cam.z + 0.3); g.camera.position.copy(mc.cam); g._lk = mc.look.clone(); }; });
await p.evaluate(() => { const g = window.__atq.game; for (let i = 0; i < 20; i++) g.update(1 / 30, 1 / 30); });
const files = [];
for (const pose of poses) for (const view of ['front', 'fl', 'side']) { await p.evaluate(([pose, view]) => { const g = window.__atq.game, d = g.npcs.marcus; window.__view = view; d.ax = null; const a = g.ACT.actStart(d, { pose, hold: true }); a.w = 1; }, [pose, view]);
  const f = `${out}/${pose}_${view}.png`; await stepShot(p, f, 4, 1 / 30, 1000); files.push(f); }
sheet(files, `${out}/POSES_sheet.png`, 3, 0.8); console.log(errs.slice(0, 3)); await b.close();
