// story-mode zombies, same layout as variants.mjs. usage: PORT=5271 DIST=5 node story_variants.mjs
import { openGame } from '../proof_lib.mjs';
const OUT = process.env.OUT || '/workspace/atqzomb/docs/mp-zombies', D = +(process.env.DIST || 5), PORT = process.env.PORT || '5271';
const ALL = [null, 'zombie2', 'zombie_male', 'zombie_office', 'zombie_elder', 'zombie_big', 'zombie_cop', 'zombie_worker']; const RIGS = process.env.ONLY ? process.env.ONLY.split(',').map(i => ALL[+i]) : ALL;
const { b, p, errs } = await openGame(PORT, 1, { w: 1000, h: 520, skip: false });
await p.addStyleTag({ content: '#hud,#touch,#dlg,#xhair,#vignette,#lowhp,#prompt,#wp,#obj{display:none!important}' });
await p.evaluate(([RIGS, D]) => { const g = window.__atq.game; g.dlgQ = []; g.dlgCur = null; g.god = true; g.horde = () => {}; g.alive().forEach(z => { if (z.st !== 'eat') z.root.position.set(900, 0, 900); });
  Object.values(g.npcs).forEach(n => { n.root.visible = false; }); g.player.root.position.set(-30, 0, 60); g.player.root.visible = false;
  const zs = RIGS.map((r, i) => { const z = g.spawnZ(0, 0, { rig: r, runner: false, still: true }); z.st = 'idle'; z.hp = 1e9; z.speed = 0; z.noHead = false; return z; }); window.__vz = zs;
  const V = g.camera.position.constructor; const mc = { anim: 'Idle_Loop', cam: new V(), look: new V(), flash: false }; g.cut = mc; const gap = D < 8 ? 1.15 : D < 20 ? 1.5 : 2.4; const n = zs.length;
  const ou = g.update.bind(g); g.update = (a, c) => { ou(a, c); g.cut = mc; g.dlgQ = []; g.convo = null; zs.forEach((z, i) => { z.root.position.set(D, 0, 60 + (i - (n - 1) / 2) * gap); z.root.rotation.y = -Math.PI / 2; z.vel.set(0, 0, 0); z.root.visible = true; });
    mc.look.set(D, 1.1, 60); mc.cam.set(0, 1.55, 60); g.camera.position.copy(mc.cam); g.camera.lookAt(mc.look); g._lk = mc.look.clone(); g.player.root.visible = false; }; }, [RIGS, D]);
for (let i = 0; i < 6; i++) await p.evaluate(() => { const g = window.__atq.game; g.paused = true; for (let k = 0; k < 10; k++) g.update(1 / 30, 1 / 30); if (!g.__pl) { g.__pl = new g.faceL.constructor('#fff0dc', 2.2, 12, 1.4); g.scene.add(g.__pl); } g.__pl.position.copy(g.camera.position); });
await p.waitForTimeout(800); await p.screenshot({ path: `${OUT}/story_variants_${process.env.TAG || ''}${D}m.png` }); console.log(errs.slice(0, 3)); await b.close();
