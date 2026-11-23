// Local proof for Runner / Tank / Spitter + visual variety. Does not join a lobby or post scores.
import { chromium, webkit } from 'playwright';
import fs from 'fs';
import { execFileSync } from 'child_process';

const URL = process.argv[2] || 'http://127.0.0.1:5450/';
const OUT = process.argv[3] || '/workspace/atq-zedkinds-proof';
fs.mkdirSync(OUT, { recursive: true });

const rec = (n, ok, d) => { console.log(ok ? 'PASS' : 'FAIL', n, d ? JSON.stringify(d).slice(0, 400) : ''); return !!ok; };
let fails = 0;
const ok = (n, v, d) => { if (!rec(n, v, d)) fails++; };

const chromeArgs = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'];

async function boot(engine, name, { w = 844, h = 390, dpr = 2 } = {}) {
  const launch = engine === 'webkit'
    ? () => webkit.launch({ args: [] })
    : () => chromium.launch({ executablePath: '/usr/bin/google-chrome', args: chromeArgs });
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => {
    localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'med', gore: false, voices: false, playSubs: false, hints: false, still: true }));
    localStorage.setItem('atq_prologue_seen', '1');
    localStorage.setItem('atq.tut.seen', '1');
    localStorage.setItem('atq.gate', JSON.stringify({ birthYear: 1990, agreedVersion: 1 }));
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('video').forEach(v => { try { v.pause(); v.removeAttribute('src'); v.load(); v.remove(); } catch (e) {} });
    });
  });
  const p = await ctx.newPage();
  p.setDefaultTimeout(180000);
  p.errs = [];
  p.on('pageerror', e => p.errs.push(String(e.message || e).slice(0, 240)));
  await p.goto(URL.replace(/\/?$/, '/') + '?step=3&god', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 180000 });
  await p.evaluate(async () => {
    document.querySelectorAll('video').forEach(v => { try { v.remove(); } catch (e) {} });
    const g = window.__atq.game;
    g.god = true; g.dlgQ = []; g.dlgCur = null; g.cut = null;
    ['#touch','#dlg','#prompt','#wp','#obj','#hud','#mini','#warn','#studio','#gateAge','#gateAgree','#gateKids','#warning','#rwToast'].forEach(s => {
      const n = document.querySelector(s); if (n) n.style.display = 'none';
    });
    try {
      const mod = await import('/src/game/story.js');
      if (mod.SURVIVAL_STEP >= 0 && !g.survival) await g.start(mod.SURVIVAL_STEP, { overlay: false });
    } catch (e) { console.warn('surv start', e); }
    g.god = true; g.dlgQ = []; g.dlgCur = null;
    if (g.stepData) { g.stepData.left = 0; g.stepData.gap = 999; g.stepData.clear = true; g.stepData.wave = 6; }
    g.horde = () => {};
  });
  await p.waitForTimeout(800);
  p.browser = b;
  p.engine = name;
  return p;
}

async function step(p, n = 12, dt = 1 / 30) {
  await p.evaluate(([n, dt]) => {
    const g = window.__atq.game;
    g.paused = true;
    const pin = g.zombies.filter(z => z._photo).map(z => ({ z, x: z.root.position.x, zed: z.root.position.z, ry: z.root.rotation.y }));
    for (let i = 0; i < n; i++) {
      g.update(dt, dt);
      pin.forEach(p => { p.z.st = 'idle'; p.z.cd = 999; p.z.aggro = 0; if (p.z._photoSp != null) p.z.speed = p.z._photoSp; p.z.root.position.set(p.x, 0, p.zed); p.z.root.rotation.y = p.ry; });
    }
    if (!g.__pl) {
      const C = g.faceL ? g.faceL.constructor : null;
      if (C) { g.__pl = new C('#fff0dc', 2.4, 14, 1.3); g.scene.add(g.__pl); }
    }
    if (g.__pl) { g.__pl.position.copy(g.camera.position); g.__pl.position.y += .5; g.__pl.visible = true; }
    const t = document.getElementById('rwToast'); if (t) t.style.display = 'none';
  }, [n, dt]);
}

async function shot(p, name) {
  const path = `${OUT}/${p.engine}_${name}.png`;
  await p.evaluate(() => {
    const t = document.getElementById('rwToast'); if (t) t.style.display = 'none';
    const g = window.__atq && window.__atq.game;
    if (g && g.cut && g.cut.cam) {
      g.cut.snap = true; g._lk = g.cut.look && g.cut.look.clone ? g.cut.look.clone() : g._lk;
      g.camera.position.copy(g.cut.cam); if (g.cut.look) g.camera.lookAt(g.cut.look);
    }
    try { g && g.render(1 / 30); } catch (e) {}
  });
  await p.waitForTimeout(80);
  await p.screenshot({ path, timeout: 30000, animations: 'disabled' });
  return path;
}

async function clearAndLineup(p, list, { spacing = 1.55, zOff = 4 } = {}) {
  return p.evaluate(({ list, spacing, zOff }) => {
    const g = window.__atq.game;
    g.zombies.slice().forEach(z => { try { g.scene.remove(z.root); } catch (e) {} });
    g.zombies.length = 0;
    Object.values(g.npcs || {}).forEach(n => { if (n && n.root) n.root.visible = false; });
    if (g.player) g.player.root.visible = false;
    const base = { x: 0, z: -236 };
    if (g.player) g.player.root.position.set(base.x, 0, base.z);
    const mid = (list.length - 1) / 2;
    const info = [];
    list.forEach((kind, i) => {
      const x = (i - mid) * spacing;
      const z = g.spawnZ(base.x + x, base.z + zOff, { kind, idle: true, aggro: 0, wave: 6 });
      z.st = 'idle'; z.cd = 999; z.aggro = 0; z._photo = true; z._photoSp = z.speed;
      z.root.rotation.y = Math.PI; z.root.position.y = 0;
      try { z.play && z.play('Idle_Loop'); z.mixer.update(0.35); g.zBones(z); } catch (e) {}
      info.push({
        kind: z.kind, runner: !!z.runner, tank: !!z.tank, spitter: !!z.spitter,
        hp: z.hp, speed: +z.speed.toFixed(2), scale: +z.scale.toFixed(2),
        outfit: z.look && z.look.outfit, hair: z.look && z.look.hair,
        build: z.look && +((z.look.build || 0).toFixed(2)),
        height: z.look && +((z.look.height || 0).toFixed(2)),
        skin: z.look && z.look.skin, decay: z.look && z.look.decayTint,
        extras: z.look && z.look.zedExtras, fem: !!(z.look && z.look.fem),
        rig: z.look && z.look.rig, mesh: (z._kindMesh || []).length,
      });
    });
    const camZ = base.z + 0.15;
    const V = g.player.root.position.constructor;
    const cam = new V(0, 1.55, camZ), look = new V(0, 1.15, base.z + zOff);
    g.cut = { cam, look, anim: 'Idle_Loop', flash: false, snap: true };
    g._lk = look.clone(); g.camera.position.copy(cam); g.camera.lookAt(look);
    try { g.render(1 / 30); } catch (e) {}
    return info;
  }, { list, spacing, zOff });
}

function applyCut(cam, look, snap = true) {
  const g = window.__atq.game; const V = g.player.root.position.constructor;
  const c = cam.isVector3 ? cam : new V(cam.x, cam.y, cam.z);
  const l = look.isVector3 ? look : new V(look.x, look.y, look.z);
  g.cut = { cam: c, look: l, anim: 'Idle_Loop', flash: false, snap: !!snap };
  g._lk = l.clone();
  g.camera.position.copy(c);
  g.camera.lookAt(l);
  try { g.render(1 / 30); } catch (e) {}
}

async function frameOne(p, i, { dist = 2.2, y = 1.45 } = {}) {
  await p.evaluate(([i, dist, y]) => {
    const g = window.__atq.game;
    g.zombies.forEach((z, k) => { if (z && z.root) z.root.visible = (k === i); });
    const z = g.zombies[i]; if (!z) return;
    const p0 = z.root.position;
    const V = p0.constructor;
    const hy = z.tank ? 2.15 : Math.max(1.35, y);
    const d = z.tank ? Math.max(dist, 5.2) : dist;
    const cam = new V(p0.x, hy, p0.z - d);
    const look = new V(p0.x, hy * 0.72, p0.z);
    // inlined apply — function is in module scope, not in the page
    g.cut = { cam, look, anim: 'Idle_Loop', flash: false, snap: true };
    g._lk = look.clone();
    g.camera.position.copy(cam);
    g.camera.lookAt(look);
    try { g.render(1 / 30); } catch (e) {}
  }, [i, dist, y]);
}

function uniqueKey(z) {
  return [z.kind, z.outfit, z.hair, z.skin, z.decay, z.build, z.height, z.rig, z.fem, JSON.stringify(z.extras)].join('|');
}

async function runEngine(engine, name) {
  const p = await boot(engine, name);
  ok(name + ' game running', await p.evaluate(() => !!(window.__atq && window.__atq.game && window.__atq.game.running)));
  ok(name + ' spawnZ exists', await p.evaluate(() => typeof window.__atq.game.spawnZ === 'function'));

  const crowdKinds = ['walker','runner','spitter','tank','walker','runner','spitter','walker','tank','runner','walker','spitter'];
  const crowd = await clearAndLineup(p, crowdKinds, { spacing: 1.45, zOff: 4.2 });
  await step(p, 18);
  const crowdPath = await shot(p, 'crowd');
  ok(name + ' crowd spawned 12', crowd.length === 12, { n: crowd.length });
  const keys = crowd.map(uniqueKey);
  ok(name + ' no two zombies share the same look', new Set(keys).size === keys.length, { unique: new Set(keys).size, n: keys.length, sample: crowd.map(z => ({ kind: z.kind, outfit: z.outfit, hair: z.hair, build: z.build, height: z.height, skin: z.skin, decay: z.decay })) });
  const outfits = new Set(crowd.map(z => z.outfit));
  const hairs = new Set(crowd.map(z => z.hair));
  const skins = new Set(crowd.map(z => z.skin));
  const builds = new Set(crowd.map(z => z.build));
  ok(name + ' several outfits in the crowd', outfits.size >= 5, [...outfits]);
  ok(name + ' several hairstyles in the crowd', hairs.size >= 3, [...hairs]);
  ok(name + ' several skin tones in the crowd', skins.size >= 4, [...skins]);
  ok(name + ' several body builds in the crowd', builds.size >= 4, [...builds]);
  ok(name + ' some have bandages or torn cloth', crowd.some(z => z.extras && (z.extras.bandageL || z.extras.headWrap || z.extras.flap || z.extras.ragArm)), crowd.map(z => z.extras));

  // close-up of the whole line, then tighter on each kind
  await p.evaluate(() => {
    const g = window.__atq.game; const V = g.player.root.position.constructor;
    const zs = g.zombies.filter(z => z && z.root);
    let cx = 0, cz = 0; zs.forEach(z => { cx += z.root.position.x; cz += z.root.position.z; });
    if (zs.length) { cx /= zs.length; cz /= zs.length; }
    const cam = new V(cx, 1.7, cz - 4.4), look = new V(cx, 1.2, cz);
    g.cut = { cam, look, anim: 'Idle_Loop', flash: false, snap: true };
    g._lk = look.clone(); g.camera.position.copy(cam); g.camera.lookAt(look);
    try { g.render(1 / 30); } catch (e) {}
  });
  await step(p, 8);
  await shot(p, 'crowd-close');

  const singles = [
    { kind: 'runner', dist: 2.6, y: 1.45 },
    { kind: 'tank', dist: 5.2, y: 1.85 },
    { kind: 'spitter', dist: 2.6, y: 1.4 },
    { kind: 'walker', dist: 2.6, y: 1.45 },
  ];
  const one = await clearAndLineup(p, singles.map(s => s.kind), { spacing: 3.4, zOff: 5.2 });
  await step(p, 16);
  await shot(p, 'four-kinds');
  for (let i = 0; i < singles.length; i++) {
    await frameOne(p, i, singles[i]);
    await step(p, 6);
    await frameOne(p, i, singles[i]);
    await shot(p, singles[i].kind + '-close');
  }
  const by = Object.fromEntries(one.map(z => [z.kind, z]));
  ok(name + ' runner is fast and leaner HP', by.runner && by.runner.speed >= 4 && by.runner.hp <= 90, by.runner);
  ok(name + ' tank is slow with high HP', by.tank && by.tank.speed <= 1.3 && by.tank.hp >= 200, by.tank);
  ok(name + ' spitter mid speed, mid HP', by.spitter && by.spitter.speed >= 1 && by.spitter.speed < 3 && by.spitter.hp >= 70, by.spitter);

  // behavior: tank telegraph + charge, spitter glob + puddle, runner speed, tank armor
  const beh = await p.evaluate(() => {
    const g = window.__atq.game;
    g.zombies.slice().forEach(z => { try { g.scene.remove(z.root); } catch (e) {} });
    g.zombies.length = 0;
    const P = g.player; P.root.visible = true; P.root.position.set(0, 0, -236);
    g.god = true;
    const tank = g.spawnZ(0, -242, { kind: 'tank', aggro: 99 });
    const spit = g.spawnZ(2.2, -244, { kind: 'spitter', aggro: 99 });
    const run = g.spawnZ(-2.2, -244, { kind: 'runner', aggro: 99 });
    const walk = g.spawnZ(-4, -244, { kind: 'walker', aggro: 99 });
    tank.st = spit.st = run.st = walk.st = 'chase';
    const hp0 = tank.hp;
    g.damageZ(tank, 40, { x: 0, y: 0, z: 1, clone() { return this; }, normalize() { return this; } }, { head: false });
    const afterBody = tank.hp;
    const hp1 = tank.hp;
    g.damageZ(tank, 40, { x: 0, y: 0, z: 1, clone() { return this; }, normalize() { return this; } }, { head: true });
    const afterHead = tank.hp;
    tank.hp = Math.max(tank.hp, 200);
    tank.dead = false;
    tank.mode = 'wind'; tank.mt = .85; tank.cd = 0;
    const V = P.root.position.constructor;
    g.cut = { cam: new V(3.2, 1.8, -238.5), look: new V(0.4, 1.1, -243), anim: 'Idle_Loop', flash: false };
    for (let i = 0; i < 90; i++) g.update(1 / 30, 1 / 30);
    const fx = g.scene.userData && g.scene.userData._zedFx;
    const puddles = fx ? fx.puddles.filter(q => q.m.visible).length : 0;
    const globs = fx ? fx.globs.filter(q => q.m.visible).length : 0;
    return {
      tankMode: tank.mode, tankStun: tank.stun, runSpeed: run.speed, walkSpeed: walk.speed,
      bodyDmg: +(hp0 - afterBody).toFixed(1), headDmg: +(hp1 - afterHead).toFixed(1),
      puddles, globs, spitMode: spit.mode, spitCd: +(spit.cd || 0).toFixed(2),
      btnLobby: !!document.getElementById('btnLobby'),
    };
  });
  await shot(p, 'behavior');
  ok(name + ' runner faster than walker', beh.runSpeed > beh.walkSpeed + 2, beh);
  ok(name + ' tank charged or is charging / recovering', beh.tankMode === 'charge' || beh.tankMode === null || beh.tankStun > 0, beh);
  ok(name + ' tank body shots are armored (less than head)', beh.bodyDmg < beh.headDmg * 0.7, beh);
  ok(name + ' spitter left a glob or puddle (or is winding/cooling)', beh.puddles > 0 || beh.globs > 0 || beh.spitMode === 'wind' || beh.spitCd > 0, beh);
  ok(name + ' #btnLobby id kept in DOM', beh.btnLobby);
  const realErrs = p.errs.filter(e => !/Failed to start the audio device/.test(e));
  ok(name + ' no page errors', realErrs.length === 0, realErrs);

  const playKeem = await p.evaluate(async () => {
    for (const u of ['./src/mp/creator.js', './src/mp/profileui.js']) {
      try { const t = await (await fetch(u)).text(); if (/Play as Keem/.test(t)) return true; } catch (e) {}
    }
    return false;
  });
  ok(name + " 'Play as Keem' still in sources", playKeem);

  await p.browser.close();
  return { crowdPath, crowd };
}

if (!process.env.ONLY || process.env.ONLY === 'chromium') await runEngine('chromium', 'chromium');
if (!process.env.ONLY || process.env.ONLY === 'webkit') {
  try { await runEngine('webkit', 'webkit'); }
  catch (e) { rec('webkit run', false, String(e).slice(0, 300)); fails++; }
}


console.log('FAILS', fails);
process.exit(fails ? 1 : 0);
