// Fast close-up iterator. usage: node tools/proof_hands_quick.mjs <url> <outdir> [weapon] [anim]
import { chromium } from 'playwright';
import fs from 'fs';
const URL = process.argv[2] || 'http://127.0.0.1:5277/';
const OUT = process.argv[3] || '/workspace/atq-hands-proof/after';
const WPN = process.argv[4] || 'pan';
const ANIM = process.argv[5] || 'Idle_Loop';
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => { localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'medium', gore: true, fp: false })); localStorage.setItem('atq_prologue_seen', '1'); });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.message || e)));
await p.goto(URL + (URL.includes('?') ? '&' : '?') + 'step=0', { waitUntil: 'load', timeout: 120000 });
await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 180000 });
await p.waitForTimeout(1200);
await p.addStyleTag({ content: '#touch,#dlg,#prompt,#wp,#hud,#cine,.bar,.cap,#boss{display:none!important}' });

const info = await p.evaluate(async ([wpn, anim]) => {
  const g = window.__atq.game;
  g.paused = true; for (let i = 0; i < 40; i++) g.skipLine && g.skipLine();
  if (g.flash) g.flash.visible = false; if (g.faceL) g.faceL.intensity = 0.35;
  const S = g.save;
  if (wpn === 'dad-hammer') {
    const dad = g.npcs.proof_dad || g.npc('proof_dad', 'marcus', 12.75, 42.5, -Math.PI / 2, 'Interact');
    dad.root.position.set(12.75, 0, 42.5); dad.root.rotation.y = -Math.PI / 2;
    dad.play('Interact', { force: true, fade: 0 });
    if (window.__atqGiveHammer) window.__atqGiveHammer(dad, true);
    const dt = 1 / 60; for (let i = 0; i < 36; i++) g.update(dt, dt);
    const a = dad.actions.Interact || dad.cur; if (a && a.getClip) { a.time = a.getClip().duration * 0.35; dad.mixer.update(0); }
    const hand = dad.bone('DEF-hand.R'); const hp = new dad.root.position.constructor(); hand.getWorldPosition(hp);
    const cam = new hp.constructor(13.55, 1.4, 43.25);
    if (g.__hl) g.scene.remove(g.__hl);
    const L = new (g.faceL ? g.faceL.constructor : g.flash.constructor)('#fff2d6', 1.1, 5, 1.4); g.scene.add(L); g.__hl = L; L.position.copy(cam);
    g.cut = { anim: 'Idle_Loop', cam, look: hp.clone(), flash: false, fov: 40, snap: true, noFace: true };
    g.camera.fov = 40; g.camera.updateProjectionMatrix(); g.camera.position.copy(cam); g.camera.lookAt(hp);
    if (g.render) g.render(1 / 60);
    return { who: 'dad', hammer: !!dad._hammer, plank: !!dad._plank, pose: dad.hands && dad.hands.Right && dad.hands.Right.userData.pose, hp: { x: hp.x, y: hp.y, z: hp.z } };
  }
  if (S) { if (!S.owned.includes(wpn)) S.owned.push(wpn); try { g.equip(wpn, true); } catch (e) {} }
  if (['flashlight', 'grenade', 'hammer', 'crowbar'].includes(wpn)) {
    const mesh = (g.weaponMeshes && g.weaponMeshes[wpn]) || (window.__atqBuildWeapon && window.__atqBuildWeapon(wpn));
    if (mesh && g.hand) { g.hand.clear(); g.hand.add(mesh); if (window.__atqMountHeld) window.__atqMountHeld(g.player, g.hand, wpn); }
  }
  const P = g.player; P.root.position.set(16, 0, 42.6); P.root.rotation.y = 0.15;
  P.play(anim, { force: true, fade: 0, speed: 1 });
  const dt = 1 / 60; for (let i = 0; i < 36; i++) g.update(dt, dt);
  const hand = P.bone('DEF-hand.R'); const hp = new P.root.position.constructor(); hand.getWorldPosition(hp);
  const cam = hp.clone(); cam.x += 0.32; cam.y += 0.10; cam.z += 0.26;
  if (g.__hl) g.scene.remove(g.__hl);
  const L = new (g.faceL ? g.faceL.constructor : g.flash.constructor)('#fff2d6', 1.15, 5, 1.4); g.scene.add(L); g.__hl = L; L.position.copy(cam);
  g.cut = { anim, cam, look: hp.clone(), flash: false, fov: 36, snap: true, noFace: true };
  g.camera.fov = 36; g.camera.updateProjectionMatrix(); g.camera.position.copy(cam); g.camera.lookAt(hp);
  if (g.render) g.render(1 / 60);
  const hold = window.__atqGetHold && window.__atqGetHold(wpn);
  const ch = P.hands && P.hands.Right;
  return {
    cur: S && S.cur, pose: ch && ch.userData && ch.userData.pose, L: ch && ch.userData && ch.userData.L,
    hasHands: !!(P.hands && P.hands.Right), hold, hp: { x: +hp.x.toFixed(3), y: +hp.y.toFixed(3), z: +hp.z.toFixed(3) },
    kids: ch ? ch.children.map(c => c.name || c.type) : [],
  };
}, [WPN, ANIM]);
const tag = `${WPN}-${ANIM === 'Idle_Loop' ? 'idle' : ANIM}-front`;
const f = `${OUT}/${tag}.png`;
await p.screenshot({ path: f });
// also a 3/4 and a body shot for the main item
await p.evaluate(() => {
  const g = window.__atq.game; const P = g.player; const hand = P.bone('DEF-hand.R'); const hp = new P.root.position.constructor(); hand.getWorldPosition(hp);
  const cam = hp.clone(); cam.x += 0.18; cam.y += 0.16; cam.z += 0.36;
  g.cut.cam.copy(cam); g.cut.look.copy(hp); g.camera.position.copy(cam); g.camera.lookAt(hp); if (g.__hl) g.__hl.position.copy(cam); if (g.render) g.render(1 / 60);
});
await p.screenshot({ path: `${OUT}/${WPN}-34.png` });
await p.evaluate(() => {
  const g = window.__atq.game; const P = g.player; const V = P.root.position.constructor;
  const cam = new V(17.35, 1.5, 44.15), look = new V(16, 1.05, 42.6);
  g.cut.cam.copy(cam); g.cut.look.copy(look); g.cut.fov = 46; g.camera.fov = 46; g.camera.updateProjectionMatrix();
  g.camera.position.copy(cam); g.camera.lookAt(look); if (g.__hl) g.__hl.position.set(17.2, 1.8, 43.5); if (g.render) g.render(1 / 60);
});
await p.screenshot({ path: `${OUT}/${WPN}-body.png` });
console.log(JSON.stringify({ info, errs: errs.slice(0, 8), files: [f, `${OUT}/${WPN}-34.png`, `${OUT}/${WPN}-body.png`] }, null, 2));
await b.close();
