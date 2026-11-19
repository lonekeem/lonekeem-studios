// story-mode zombies, same layout as variants.mjs. usage: PORT=5271 DIST=3,12,35 [POSE=punch|death|hit] [ONLY=..] OUT=dir node story_variants.mjs
import { openGame } from '../proof_lib.mjs';
const OUT = process.env.OUT || '/workspace/atqzomb/docs/mp-zombies/story', dists = (process.env.DIST || '3,12,35').split(',').map(Number), PORT = process.env.PORT || '5271', POSE = process.env.POSE || '', TAG = process.env.TAG || 'idle';
const ALL = [null, 'zombie2', 'zombie_male', 'zombie_office', 'zombie_elder', 'zombie_big', 'zombie_cop', 'zombie_worker']; const RIGS = process.env.ONLY ? process.env.ONLY.split(',').map(i => ALL[+i]) : ALL;
const { b, p, errs } = await openGame(PORT, 1, { w: 1000, h: 520, skip: false });
await p.addStyleTag({ content: '#hud,#touch,#dlg,#xhair,#vignette,#lowhp,#prompt,#wp,#obj{display:none!important}' });
await p.evaluate(([RIGS]) => { const g = window.__atq.game; g.dlgQ = []; g.dlgCur = null; g.god = true; g.horde = () => {}; g.alive().forEach(z => { if (z.st !== 'eat') z.root.position.set(900, 0, 900); });
  Object.values(g.npcs).forEach(n => { n.root.visible = false; }); g.player.root.position.set(-30, 0, 60); g.player.root.visible = false;
  window.__vz = RIGS.map((r) => { const z = g.spawnZ(0, 0, { rig: r, runner: false, still: true }); z.st = 'idle'; z.hp = 1e9; z.speed = 0; return z; });
  const V = g.camera.position.constructor; window.__mc = { anim: 'Idle_Loop', cam: new V(), look: new V(), flash: false }; g.cut = window.__mc; window.__D = 3;
  const ou = g.update.bind(g); g.update = (a, c) => { ou(a, c); g.cut = window.__mc; g.dlgQ = []; g.convo = null; const D = window.__D, n = window.__vz.length, gap = D < 8 ? 1.15 : D < 20 ? 1.5 : 2.4; window.__vz.forEach((z, i) => { z.root.position.set(D, 0, 60 + (i - (n - 1) / 2) * gap); z.root.rotation.y = -Math.PI / 2; z.vel.set(0, 0, 0); z.root.visible = true; });
    const mc = window.__mc; mc.look.set(D, 1.1, 60); mc.cam.set(0, 1.55, 60); g.camera.fov = D < 8 ? 55 : 45; g.camera.updateProjectionMatrix(); g.camera.position.copy(mc.cam); g.camera.lookAt(mc.look); g._lk = mc.look.clone(); g.player.root.visible = false; }; }, [RIGS]);
const adv = (n, extra) => p.evaluate(([n]) => { const g = window.__atq.game; g.paused = true; for (let k = 0; k < n; k++) g.update(1 / 30, 1 / 30); if (!g.__pl) { g.__pl = new g.faceL.constructor('#fff0dc', 2.2, 12, 1.4); g.scene.add(g.__pl); } g.__pl.position.copy(g.camera.position); }, [n]);
for (const D of dists) {
  await p.evaluate((D) => { window.__D = D; window.__vz.forEach(z => { if (!z.dead) z.play('Walk_Loop', { force: true, speed: .62 }); }); }, D); await adv(30);
  if (POSE === 'punch') { await p.evaluate(() => window.__vz.forEach(z => { z.play('Punch_Jab', { once: true, force: true, speed: .35 }); })); await adv(12); }
  if (POSE === 'hit') { await p.evaluate(() => window.__vz.forEach(z => { z.play('Hit_Chest', { once: true, force: true, speed: .3 }); })); await adv(8); }
  if (POSE === 'death') { await p.evaluate(() => { const g = window.__atq.game; const V = g.camera.position.constructor; window.__vz.forEach(z => { z.hp = 1; g.damageZ(z, 5, new V(1, 0, 0), {}); }); }); await adv(40); }
  await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/story_${TAG}_${D}m.png` });
}
console.log(errs.slice(0, 3)); await b.close();
