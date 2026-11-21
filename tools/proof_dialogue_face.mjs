// Headless proofs for dialogue facing: Pell "stay PUT" exchange + the garage truck talk,
// plus a peek-scene regression. Desktop and mobile viewports.
// usage: node tools/proof_dialogue_face.mjs [port] [outDir]
import { chromium } from 'playwright';
import fs from 'fs';

const port = process.argv[2] || '4388';
const out = process.argv[3] || '/workspace/atq-face/proof';
fs.mkdirSync(out, { recursive: true });

function facingInfo() {
  const g = window.__atq.game;
  const P = g.player;
  const npcs = {};
  const dot = (a, b) => {
    if (!a || !b) return null;
    const yaw = a.root.rotation.y;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const dx = b.root.position.x - a.root.position.x, dz = b.root.position.z - a.root.position.z;
    const len = Math.hypot(dx, dz) || 1e-6;
    return +((fx * dx + fz * dz) / len).toFixed(3);
  };
  const rec = (k, c) => {
    if (!c || !c.root) return;
    const p = c.root.position;
    npcs[k] = { x: +p.x.toFixed(2), z: +p.z.toFixed(2), y: +p.y.toFixed(2), yaw: +c.root.rotation.y.toFixed(3), anim: c.curName, loco: !!c.locoOn, vis: c.root.visible !== false };
  };
  rec('keem', P);
  for (const k of Object.keys(g.npcs)) rec(k, g.npcs[k]);
  const dad = g.npcs.marcus, nia = g.npcs.nia;
  return {
    step: g.step, who: g.dlgCur && g.dlgCur.who, text: g.dlgCur && (g.dlgCur.text || '').slice(0, 80),
    cut: !!(g.cut), phase: g.stepData && g.stepData.phase,
    faceActive: !!(g.dlgFace && g.dlgFace.active),
    dots: { keemDad: dot(P, dad), dadKeem: dad && dot(dad, P), niaKeem: nia && dot(nia, P), keemNia: nia && dot(P, nia), dadNia: dad && nia && dot(dad, nia), niaDad: dad && nia && dot(nia, dad) },
    npcs
  };
}

async function open(step, { w, h, skip = false, qual = 'med' } = {}) {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: h > w, isMobile: h > w });
  await ctx.addInitScript((q) => localStorage.setItem('atq3.settings', JSON.stringify({ qual: q, gore: true, auto: false, text: 1, lang: 'on' })), qual);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(`http://localhost:${port}/?step=${step}&god`, { waitUntil: 'load', timeout: 120000 });
  await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 120000 });
  await p.waitForTimeout(2000);
  await p.evaluate(() => { const g = window.__atq.game; g.god = true; g.paused = true; g.settings.auto = false; });
  if (skip) await p.evaluate(() => { const g = window.__atq.game; for (let i = 0; i < 80; i++) g.skipLine && g.skipLine(); });
  return { b, ctx, p, errs };
}

async function step(p, n = 18, dt = 1 / 30) {
  await p.evaluate(([n, dt]) => {
    const g = window.__atq.game;
    g.paused = true;
    for (let i = 0; i < n; i++) g.update(dt, dt);
    if (!g.__pl) { g.__pl = new g.faceL.constructor('#fff0dc', 2.0, 14, 1.4); g.scene.add(g.__pl); }
    g.__pl.position.copy(g.camera.position).add({ x: 0, y: 0.5, z: 0 });
    g.__pl.visible = true;
  }, [n, dt]);
  await p.waitForTimeout(200);
}

async function shot(p, name) {
  const path = `${out}/${name}.png`;
  await p.screenshot({ path, timeout: 120000 });
  return path;
}

async function sideCam(p, kind) {
  await p.evaluate((kind) => {
    const g = window.__atq.game, P = g.player.root.position;
    const dad = g.npcs.marcus && g.npcs.marcus.root.position;
    const nia = g.npcs.nia && g.npcs.nia.root.position;
    const cx = (P.x + (dad ? dad.x : P.x) + (nia ? nia.x : P.x)) / (1 + !!dad + !!nia);
    const cz = (P.z + (dad ? dad.z : P.z) + (nia ? nia.z : P.z)) / (1 + !!dad + !!nia);
    const look = new g.player.root.position.constructor(cx, 1.15, cz);
    let cam;
    if (kind === 'side') cam = new g.player.root.position.constructor(cx + 4.2, 1.7, cz - 1.2);
    else if (kind === 'high') cam = new g.player.root.position.constructor(cx + 2.4, 3.2, cz + 3.4);
    else cam = new g.player.root.position.constructor(cx - 0.4, 1.55, cz + 3.6);
    g.cut = Object.assign(g.cut || {}, { cam, look, anim: (g.cut && g.cut.anim) || 'Idle_Loop', flash: true });
    g.camera.position.copy(cam);
    g.camera.lookAt(look);
  }, kind);
  await step(p, 8);
}

const report = [];
function log(s) { console.log(s); report.push(s); }

// ---- Pell house: stay PUT ----
for (const [tag, w, h] of [['desk', 1280, 720], ['mobile', 390, 844]]) {
  const { b, p, errs } = await open(2, { w, h, skip: false });
  await step(p, 24); // finish the 0.3s turn
  let info = await p.evaluate(facingInfo);
  log(`pell-${tag}-dad ${JSON.stringify(info)}`);
  await shot(p, `pell-${tag}-dad-cut`);
  await sideCam(p, 'side');
  await shot(p, `pell-${tag}-dad-side`);
  await sideCam(p, 'front');
  await shot(p, `pell-${tag}-dad-front`);
  // skip to Keem's reply
  await p.evaluate(() => { const g = window.__atq.game; g.skipLine(); });
  await step(p, 24);
  info = await p.evaluate(facingInfo);
  log(`pell-${tag}-keem ${JSON.stringify(info)}`);
  await sideCam(p, 'side');
  await shot(p, `pell-${tag}-keem-side`);
  await sideCam(p, 'front');
  await shot(p, `pell-${tag}-keem-front`);
  // skip to Nia's biscuit line
  await p.evaluate(() => { const g = window.__atq.game; g.skipLine(); g.skipLine(); });
  await step(p, 24);
  info = await p.evaluate(facingInfo);
  log(`pell-${tag}-nia ${JSON.stringify(info)}`);
  await sideCam(p, 'side');
  await shot(p, `pell-${tag}-nia-side`);
  if (errs.length) log(`pell-${tag}-errs ${errs.slice(0, 6).join(' | ')}`);
  await b.close();
}

// ---- Truck / Hank's garage talk (step 4) ----
for (const [tag, w, h] of [['desk', 1280, 720], ['mobile', 390, 844]]) {
  const { b, p, errs } = await open(4, { w, h, skip: false });
  await step(p, 24);
  let info = await p.evaluate(facingInfo);
  log(`truck-${tag} ${JSON.stringify(info)}`);
  await shot(p, `truck-${tag}-cut`);
  await sideCam(p, 'side');
  await shot(p, `truck-${tag}-side`);
  await p.evaluate(() => { const g = window.__atq.game; g.skipLine(); });
  await step(p, 24);
  info = await p.evaluate(facingInfo);
  log(`truck-${tag}-keem ${JSON.stringify(info)}`);
  await sideCam(p, 'side');
  await shot(p, `truck-${tag}-keem-side`);
  if (errs.length) log(`truck-${tag}-errs ${errs.slice(0, 6).join(' | ')}`);
  await b.close();
}

// ---- Peek regression: Keem must still face the window, Dube still runs ----
{
  const { b, p, errs } = await open(0, { w: 1280, h: 720, skip: false });
  // skip wake lines so the peek prompt appears, then trigger peek
  const peek = await p.evaluate(() => {
    const g = window.__atq.game;
    for (let i = 0; i < 20; i++) g.skipLine && g.skipLine();
    g.cut = null;
    g.stepData.phase = 'walk';
    const st = window.__atq.game;
    const story = g.constructor ? null : null;
    // call the step peek if present
    const step = (g.stepData);
    // STORY is not on window; use the use list after skipping, or call peek via load
    return { phase: g.stepData.phase, rot: g.player.root.rotation.y, pos: [g.player.root.position.x, g.player.root.position.z] };
  });
  // Advance into peek the same way the game does: invoke the step's peek via uses or direct
  const after = await p.evaluate(() => {
    const g = window.__atq.game;
    // find house step peek by walking to the window and triggering the use, or call it if still on the enter callback path
    const uses = g.stepData.uses || [];
    const peekFn = uses.find(u => /Peek/.test(u.label || ''));
    if (peekFn) peekFn.fn(g);
    else {
      // if uses were cleared, reconstruct: the first step object is not exported, but peek sets cut + say
      g.stepData.phase = 'walk';
    }
    for (let i = 0; i < 20; i++) g.update(1 / 30, 1 / 30);
    const dube = g.npcs.dube;
    return {
      phase: g.stepData.phase, cut: !!(g.cut), cutAnim: g.cut && g.cut.anim,
      playerYaw: +g.player.root.rotation.y.toFixed(3),
      playerAnim: g.player.curName, faceActive: !!(g.dlgFace && g.dlgFace.active),
      dube: dube ? { x: +dube.root.position.x.toFixed(2), z: +dube.root.position.z.toFixed(2), yaw: +dube.root.rotation.y.toFixed(3), anim: dube.curName } : null,
      who: g.dlgCur && g.dlgCur.who
    };
  });
  log(`peek-pre ${JSON.stringify(peek)}`);
  log(`peek-after ${JSON.stringify(after)}`);
  await shot(p, 'peek-regression');
  if (errs.length) log(`peek-errs ${errs.slice(0, 6).join(' | ')}`);
  await b.close();
}

fs.writeFileSync(out + '/report.json', report.join('\n') + '\n');
console.log('WROTE', out);
