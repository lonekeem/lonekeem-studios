// Close-ups of character hands and held items. usage:
//   node tools/proof_hands.mjs <url> <outdir> [before|after]
import { chromium } from 'playwright';
import { sheet } from './proof_lib.mjs';
import fs from 'fs';

const URL = process.argv[2] || 'http://127.0.0.1:5277/';
const OUT = process.argv[3] || '/workspace/atq-hands-proof/after';
fs.mkdirSync(OUT, { recursive: true });

const WEAPONS = ['pan', 'bat', 'crowbar', 'machete', 'katana', 'longsword', 'pistol', 'rifle', 'shotgun', 'flashlight', 'grenade', 'hammer'];
const ANIMS = { idle: 'Idle_Loop', run: 'Jog_Fwd_Loop', swing: 'Sword_Attack', shoot: 'Pistol_Shoot' };

const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
});
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => {
  localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'medium', gore: true, fp: false }));
  localStorage.setItem('atq_prologue_seen', '1');
});
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.goto(URL + (URL.includes('?') ? '&' : '?') + 'step=0', { waitUntil: 'load', timeout: 120000 });
await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 180000 });
await p.waitForTimeout(2000);
await p.addStyleTag({ content: '#touch,#dlg,#prompt,#wp,#hud,#cine,.bar,.cap,#boss{display:none!important}' });

async function shot(name, fn, arg, frames = 8) {
  if (typeof arg === 'number' && frames === 8 && fn.length < 1) { frames = arg; arg = undefined; }
  if (arg === undefined) await p.evaluate(fn);
  else await p.evaluate(fn, arg);
  await p.evaluate((n) => {
    const g = window.__atq.game; const dt = 1 / 60;
    for (let i = 0; i < n; i++) { if (g.update) g.update(dt, dt); if (g.render) g.render(dt); }
  }, frames);
  await p.waitForTimeout(250);
  const f = `${OUT}/${name}.png`;
  await p.screenshot({ path: f });
  return f;
}

const files = [];

// --- idle / walk / swing / shoot close-ups per item (camera on the right hand) ---
for (const wpn of WEAPONS) {
  for (const [tag, anim] of [['idle', 'Idle_Loop'], ['run', 'Jog_Fwd_Loop']]) {
    const f = await shot(`${wpn}-${tag}-front`, ([wpn, anim]) => {
      const g = window.__atq.game; const THREE = window.THREE || g.camera.constructor; // fallback
      g.paused = true; for (let i = 0; i < 40; i++) g.skipLine && g.skipLine();
      const S = g.save; if (S && wpn) { if (!S.owned.includes(wpn)) S.owned.push(wpn); try { g.equip(wpn, true); } catch (e) { /* item may not be in WEAPON_ORDER; still try mount */ } }
      if (wpn === 'flashlight' || wpn === 'grenade' || wpn === 'hammer' || wpn === 'crowbar') {
        try {
          const { weaponMesh } = window.__atqHands || {};
          const mesh = (g.weaponMeshes && g.weaponMeshes[wpn]) || (window.__atqBuildWeapon && window.__atqBuildWeapon(wpn));
          if (mesh && g.hand) { g.hand.clear(); g.hand.add(mesh); if (window.__atqMountHeld) window.__atqMountHeld(g.player, g.hand, wpn); }
        } catch (e) { /* before-fix path may not have these helpers */ }
      }
      const P = g.player; P.root.position.set(16, 0, 42.6); P.root.rotation.y = 0;
      P.play(anim, { force: true, fade: 0, speed: 1 });
      const dt = 1 / 60; for (let i = 0; i < 40; i++) g.update(dt, dt);
      const hand = P.bone('DEF-hand.R') || P.bone('RightHand');
      const hp = new (P.root.position.constructor)();
      if (hand && hand.getWorldPosition) hand.getWorldPosition(hp); else hp.set(16.25, 1.05, 42.7);
      const V = hp.constructor;
      const cam = new V(hp.x + 0.38, hp.y + 0.08, hp.z + 0.22);
      g.cut = { anim, cam, look: new V(hp.x, hp.y, hp.z), flash: true, fov: 40, snap: true, noFace: true };
      g.camera.position.copy(cam); g.camera.lookAt(hp);
      if (!g.__hl) { g.__hl = new g.faceL.constructor('#fff4e0', 4, 6, 1); g.scene.add(g.__hl); }
      g.__hl.position.copy(cam);
      g.camera.fov = 40; g.camera.updateProjectionMatrix();
    }, [wpn, anim], 6);
    files.push(f);
  }
}

// tighter 3/4 of the frying pan (the reported bug)
files.push(await shot('pan-close-34', () => {
  const g = window.__atq.game; g.paused = true;
  const S = g.save; if (!S.owned.includes('pan')) S.owned.push('pan'); g.equip('pan', true);
  const P = g.player; P.root.position.set(16, 0, 42.6); P.root.rotation.y = 0.4;
  P.play('Idle_Loop', { force: true, fade: 0 });
  const dt = 1 / 60; for (let i = 0; i < 30; i++) g.update(dt, dt);
  const hand = P.bone('DEF-hand.R'); const hp = new P.root.position.constructor(); hand.getWorldPosition(hp);
  const cam = hp.clone(); cam.x += 0.28; cam.y += 0.12; cam.z += 0.28;
  g.cut = { anim: 'Idle_Loop', cam, look: hp.clone(), flash: true, fov: 32, snap: true, noFace: true };
  g.camera.fov = 32; g.camera.updateProjectionMatrix(); g.camera.position.copy(cam); g.camera.lookAt(hp);
}, null, 8));

// mid-swing pan + mid-shoot pistol
for (const [wpn, anim, frac, tag] of [['pan', 'Sword_Attack', 0.35, 'swing'], ['pistol', 'Pistol_Shoot', 0.25, 'shoot'], ['rifle', 'Pistol_Aim_Neutral', 0.0, 'aim']]) {
  files.push(await shot(`${wpn}-${tag}-front`, ([wpn, anim, frac]) => {
    const g = window.__atq.game; g.paused = true;
    const S = g.save; if (!S.owned.includes(wpn)) S.owned.push(wpn); g.equip(wpn, true);
    const P = g.player; P.root.position.set(16, 0, 42.6); P.root.rotation.y = 0;
    P.play(anim, { force: true, fade: 0, once: true });
    const a = P.actions[anim] || P.cur; if (a && a.getClip) a.time = a.getClip().duration * frac;
    P.mixer.update(0);
    const hand = P.bone('DEF-hand.R'); const hp = new P.root.position.constructor(); hand.getWorldPosition(hp);
    const cam = hp.clone(); cam.x += 0.42; cam.y += 0.1; cam.z += 0.18;
    g.cut = { anim, cam, look: hp.clone(), flash: true, fov: 38, snap: true, noFace: true };
    g.camera.fov = 38; g.camera.updateProjectionMatrix(); g.camera.position.copy(cam); g.camera.lookAt(hp);
  }, [wpn, anim, frac], 4));
}

// open-hand portraits: Keem, Nia, Dad (no item)
for (const [who, look, x] of [['keem', null, 16], ['nia', 'nia', 17.2], ['dad', 'marcus', 14.8]]) {
  files.push(await shot(`openhand-${who}`, ([who, look, x]) => {
    const g = window.__atq.game; g.paused = true;
    let C = g.player;
    if (look) {
      if (g.npcs && g.npcs['proof_' + who]) C = g.npcs['proof_' + who];
      else C = g.npc('proof_' + who, look, x, 42.6, 0, 'Idle_Loop', look === 'nia' ? 0.62 : 0.98);
    } else {
      try { g.equip('fists', true); } catch (e) {}
      C.root.position.set(x, 0, 42.6); C.root.rotation.y = 0;
    }
    C.root.position.set(x, 0, 42.6); C.root.rotation.y = 0;
    C.play('Idle_Loop', { force: true, fade: 0 });
    const dt = 1 / 60; for (let i = 0; i < 30; i++) g.update(dt, dt);
    const hand = C.bone('DEF-hand.R'); const hp = new C.root.position.constructor(); hand.getWorldPosition(hp);
    const cam = hp.clone(); cam.x += 0.32; cam.y += 0.08; cam.z += 0.2;
    g.cut = { anim: 'Idle_Loop', cam, look: hp.clone(), flash: true, fov: 34, snap: true, noFace: true };
    g.camera.fov = 34; g.camera.updateProjectionMatrix(); g.camera.position.copy(cam); g.camera.lookAt(hp);
  }, [who, look, x], 6));
}

// zombie claws
files.push(await shot('zombie-claws', () => {
  const g = window.__atq.game; g.paused = true;
  let z = (g.zombies || []).find(x => !x.dead);
  if (!z) z = g.spawnZ(16, 41.2, { idle: true, aggro: 0, det: 0.001 });
  z.root.position.set(16, 0, 41.5); z.root.rotation.y = 0; z.play('Idle_Loop', { force: true, fade: 0 });
  const dt = 1 / 60; for (let i = 0; i < 30; i++) g.update(dt, dt);
  const hand = z.bone('DEF-hand.R'); const hp = new z.root.position.constructor(); hand.getWorldPosition(hp);
  const cam = hp.clone(); cam.x += 0.34; cam.y += 0.1; cam.z += 0.2;
  g.cut = { anim: 'Idle_Loop', cam, look: hp.clone(), flash: true, fov: 34, snap: true, noFace: true };
  g.camera.fov = 34; g.camera.updateProjectionMatrix(); g.camera.position.copy(cam); g.camera.lookAt(hp);
}, null, 6));

// Dad boarding / hammering at the bedroom window (prologue pose)
files.push(await shot('dad-hammer-board', () => {
  const g = window.__atq.game; g.paused = true;
  const dad = g.npcs.proof_dad || g.npcs.pro_dad || g.npc('proof_dad', 'marcus', 12.75, 42.5, -Math.PI / 2, 'Interact');
  dad.root.position.set(12.75, 0, 42.5); dad.root.rotation.y = -Math.PI / 2;
  dad.play('Interact', { force: true, fade: 0 });
  if (window.__atqGiveHammer) window.__atqGiveHammer(dad);
  const dt = 1 / 60; for (let i = 0; i < 40; i++) g.update(dt, dt);
  const a = dad.actions.Interact || dad.cur; if (a && a.getClip) { a.time = a.getClip().duration * 0.35; dad.mixer.update(0); }
  const hand = dad.bone('DEF-hand.R'); const hp = new dad.root.position.constructor();
  if (hand) hand.getWorldPosition(hp); else hp.set(12.4, 1.25, 42.5);
  const cam = new hp.constructor(13.6, 1.45, 43.3);
  g.cut = { anim: 'Idle_Loop', cam, look: hp.clone(), flash: true, fov: 42, snap: true, noFace: true };
  g.camera.fov = 42; g.camera.updateProjectionMatrix(); g.camera.position.copy(cam); g.camera.lookAt(hp);
}, null, 8));

// wider body shot of Keem with the pan (matches the report framing more)
files.push(await shot('keem-pan-body', () => {
  const g = window.__atq.game; g.paused = true;
  const S = g.save; if (!S.owned.includes('pan')) S.owned.push('pan'); g.equip('pan', true);
  const P = g.player; P.root.position.set(16, 0, 42.6); P.root.rotation.y = 0.25;
  P.play('Idle_Loop', { force: true, fade: 0 });
  const dt = 1 / 60; for (let i = 0; i < 30; i++) g.update(dt, dt);
  const V = P.root.position.constructor;
  const cam = new V(17.3, 1.45, 44.0), look = new V(16, 1.05, 42.6);
  g.cut = { anim: 'Idle_Loop', cam, look, flash: true, fov: 46, snap: true, noFace: true };
  g.camera.fov = 46; g.camera.updateProjectionMatrix(); g.camera.position.copy(cam); g.camera.lookAt(look);
}, null, 8));

// sheets
const groups = [
  ['sheet-pan', files.filter(f => /\/pan-/.test(f) || /keem-pan/.test(f))],
  ['sheet-guns', files.filter(f => /pistol|rifle|shotgun/.test(f))],
  ['sheet-melee', files.filter(f => /bat-|crowbar|machete|katana|longsword/.test(f))],
  ['sheet-items', files.filter(f => /flashlight|grenade|hammer/.test(f))],
  ['sheet-people', files.filter(f => /openhand|zombie-claws|dad-hammer/.test(f))],
];
for (const [nm, list] of groups) {
  if (list.length) try { sheet(list, `${OUT}/${nm}.png`, Math.min(3, list.length), 0.55); } catch (e) { console.warn('sheet', nm, e.message); }
}

console.log(JSON.stringify({ out: OUT, n: files.length, errs: errs.slice(0, 8), files: files.map(f => f.split('/').pop()) }, null, 2));
await b.close();
