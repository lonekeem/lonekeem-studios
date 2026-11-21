// Headless proofs for dialogue facing: Pell "stay PUT" exchange + the garage truck talk,
// plus a peek-scene regression. Desktop and landscape-mobile viewports.
// usage: node tools/proof_dialogue_face.mjs [port] [outDir]
import { chromium } from 'playwright';
import fs from 'fs';

const port = process.argv[2] || '4388';
const out = process.argv[3] || '/workspace/atq-face/proof';
fs.mkdirSync(out, { recursive: true });

function facingInfo() {
  const g = window.__atq.game;
  const wrap = (y) => Math.atan2(Math.sin(y), Math.cos(y));
  const P = g.player;
  const npcs = {};
  const dot = (a, b) => {
    if (!a || !b) return null;
    const yaw = wrap(a.root.rotation.y);
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const dx = b.root.position.x - a.root.position.x, dz = b.root.position.z - a.root.position.z;
    const len = Math.hypot(dx, dz) || 1e-6;
    return +((fx * dx + fz * dz) / len).toFixed(3);
  };
  const rec = (k, c) => {
    if (!c || !c.root) return;
    const p = c.root.position;
    npcs[k] = { x: +p.x.toFixed(2), z: +p.z.toFixed(2), yaw: +wrap(c.root.rotation.y).toFixed(3), anim: c.curName, loco: !!c.locoOn, vis: c.root.visible !== false };
  };
  rec('keem', P);
  for (const k of Object.keys(g.npcs)) rec(k, g.npcs[k]);
  const dad = g.npcs.marcus, nia = g.npcs.nia;
  return {
    step: g.step, who: g.dlgCur && g.dlgCur.who, text: g.dlgCur && (g.dlgCur.text || '').slice(0, 90),
    cut: !!(g.cut), phase: g.stepData && g.stepData.phase,
    faceActive: !!(g.dlgFace && g.dlgFace.active),
    dots: { keemDad: dot(P, dad), dadKeem: dad && dot(dad, P), niaKeem: nia && dot(nia, P), keemNia: nia && dot(P, nia), dadNia: dad && nia && dot(dad, nia), niaDad: dad && nia && dot(nia, dad) },
    npcs
  };
}

async function open(step, { w, h } = {}) {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  await ctx.addInitScript((q) => localStorage.setItem('atq3.settings', JSON.stringify({ qual: q, gore: true, auto: false, text: 1, lang: 'on' })), 'med');
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e.message || e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(`http://localhost:${port}/?step=${step}&god`, { waitUntil: 'load', timeout: 120000 });
  await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 120000 });
  await p.evaluate(() => { const g = window.__atq.game; g.paused = true; g.god = true; g.settings.auto = false; });
  await p.waitForTimeout(800);
  return { b, ctx, p, errs };
}

async function step(p, n = 30, dt = 1 / 30) {
  await p.evaluate(([n, dt]) => {
    const g = window.__atq.game;
    g.paused = true;
    for (let i = 0; i < n; i++) g.update(dt, dt);
    if (!g.__pl) { g.__pl = new g.faceL.constructor('#fff0dc', 2.4, 16, 1.3); g.scene.add(g.__pl); }
    if (g.camera) g.__pl.position.copy(g.camera.position).add({ x: 0.2, y: 0.8, z: 0.2 });
    g.__pl.visible = true;
    g.render && g.render(dt);
  }, [n, dt]);
  await p.waitForTimeout(250);
}

async function shot(p, name) {
  const path = `${out}/${name}.png`;
  await p.screenshot({ path, timeout: 120000 });
  return path;
}

// Place a readable camera around the talking group (Dad / Nia / Keem if present).
async function placeCam(p, kind) {
  await p.evaluate((kind) => {
    const g = window.__atq.game, V = (x, y, z) => new g.player.root.position.constructor(x, y, z);
    const bodies = [g.player, g.npcs.marcus, g.npcs.nia].filter(c => c && c.root && c.root.visible !== false);
    let sx = 0, sz = 0, n = 0;
    for (const c of bodies) { sx += c.root.position.x; sz += c.root.position.z; n++; }
    const cx = sx / n, cz = sz / n;
    // Prefer a view along the Keem–Dad line so faces are readable
    const keem = g.player.root.position, dad = g.npcs.marcus && g.npcs.marcus.root.position;
    let cam, look = V(cx, 1.15, cz);
    if (kind === 'threeq' && dad) {
      // three-quarter from Keem's street side, slightly elevated
      const dx = dad.x - keem.x, dz = dad.z - keem.z, len = Math.hypot(dx, dz) || 1;
      const px = -dz / len, pz = dx / len;
      cam = V(cx - dx / len * 3.2 + px * 3.4, 1.85, cz - dz / len * 3.2 + pz * 3.4);
    } else if (kind === 'side' && dad) {
      const dx = dad.x - keem.x, dz = dad.z - keem.z, len = Math.hypot(dx, dz) || 1;
      const px = -dz / len, pz = dx / len;
      cam = V(cx + px * 5.2, 1.7, cz + pz * 5.2);
    } else if (kind === 'close' && dad) {
      const dx = dad.x - keem.x, dz = dad.z - keem.z, len = Math.hypot(dx, dz) || 1;
      cam = V((keem.x + dad.x) / 2 + (-dz / len) * 2.6, 1.55, (keem.z + dad.z) / 2 + (dx / len) * 2.6);
      look = V((keem.x + dad.x) / 2, 1.25, (keem.z + dad.z) / 2);
    } else {
      cam = V(cx + 4.2, 1.8, cz + 1.4);
    }
    g.cut = Object.assign(g.cut || {}, { cam, look, anim: (g.cut && g.cut.anim) || 'Idle_Loop', flash: true });
    g.camera.position.copy(cam);
    g.camera.lookAt(look);
  }, kind);
  await step(p, 10);
}

const report = [];
function log(s) { console.log(s); report.push(s); }

const views = [['desk', 1280, 720], ['mobile', 844, 390]];

for (const [tag, w, h] of views) {
  const { b, p, errs } = await open(2, { w, h });
  await step(p, 30);
  let info = await p.evaluate(facingInfo);
  log(`pell-${tag}-dad ${JSON.stringify(info)}`);
  await placeCam(p, 'threeq');
  await shot(p, `pell-${tag}-dad-threeq`);
  await placeCam(p, 'close');
  await shot(p, `pell-${tag}-dad-close`);
  await p.evaluate(() => window.__atq.game.skipLine());
  await step(p, 30);
  info = await p.evaluate(facingInfo);
  log(`pell-${tag}-keem ${JSON.stringify(info)}`);
  await placeCam(p, 'threeq');
  await shot(p, `pell-${tag}-keem-threeq`);
  await placeCam(p, 'close');
  await shot(p, `pell-${tag}-keem-close`);
  await p.evaluate(() => { const g = window.__atq.game; g.skipLine(); g.skipLine(); });
  await step(p, 30);
  info = await p.evaluate(facingInfo);
  log(`pell-${tag}-nia ${JSON.stringify(info)}`);
  await placeCam(p, 'threeq');
  await shot(p, `pell-${tag}-nia-threeq`);
  await placeCam(p, 'close');
  await shot(p, `pell-${tag}-nia-close`);
  if (errs.length) log(`pell-${tag}-errs ${errs.slice(0, 8).join(' | ')}`);
  await b.close();
}

for (const [tag, w, h] of views) {
  const { b, p, errs } = await open(4, { w, h });
  await step(p, 30);
  let info = await p.evaluate(facingInfo);
  log(`truck-${tag}-dad ${JSON.stringify(info)}`);
  await placeCam(p, 'threeq');
  await shot(p, `truck-${tag}-dad-threeq`);
  await placeCam(p, 'side');
  await shot(p, `truck-${tag}-dad-side`);
  await p.evaluate(() => window.__atq.game.skipLine());
  await step(p, 30);
  info = await p.evaluate(facingInfo);
  log(`truck-${tag}-keem ${JSON.stringify(info)}`);
  await placeCam(p, 'threeq');
  await shot(p, `truck-${tag}-keem-threeq`);
  if (errs.length) log(`truck-${tag}-errs ${errs.slice(0, 8).join(' | ')}`);
  await b.close();
}

{
  const { b, p, errs } = await open(0, { w: 1280, h: 720 });
  const after = await p.evaluate(() => {
    const g = window.__atq.game;
    for (let i = 0; i < 30; i++) g.skipLine && g.skipLine();
    for (let i = 0; i < 8; i++) g.update(1 / 30, 1 / 30);
    const peek = (g.stepData.uses || []).find(u => /Peek/i.test(u.label || ''));
    if (peek) peek.fn(g);
    for (let i = 0; i < 24; i++) g.update(1 / 30, 1 / 30);
    const dube = g.npcs.dube;
    return {
      phase: g.stepData.phase, cut: !!(g.cut), cutAnim: g.cut && g.cut.anim,
      playerYaw: +g.player.root.rotation.y.toFixed(3),
      playerAnim: g.player.curName, faceActive: !!(g.dlgFace && g.dlgFace.active),
      dube: dube ? { x: +dube.root.position.x.toFixed(2), z: +dube.root.position.z.toFixed(2), yaw: +dube.root.rotation.y.toFixed(3), anim: dube.curName, hasUpdate: typeof dube.update === 'function' } : null,
      who: g.dlgCur && g.dlgCur.who, text: g.dlgCur && (g.dlgCur.text || '').slice(0, 70)
    };
  });
  log(`peek ${JSON.stringify(after)}`);
  await p.evaluate(() => {
    const g = window.__atq.game;
    if (!g.__pl) { g.__pl = new g.faceL.constructor('#fff0dc', 2.0, 14, 1.3); g.scene.add(g.__pl); }
    g.__pl.position.copy(g.camera.position).add({ x: 0, y: 0.6, z: 0 });
    g.__pl.visible = true;
    g.render && g.render(1 / 30);
  });
  await p.waitForTimeout(300);
  await shot(p, 'peek-regression');
  if (errs.length) log(`peek-errs ${errs.slice(0, 8).join(' | ')}`);
  await b.close();
}

fs.writeFileSync(out + '/report.json', report.join('\n') + '\n');
console.log('WROTE', out);
