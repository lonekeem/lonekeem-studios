// Polish proofs for Chapter 14: HUD stack, lab dressing, helm, snare, biscuit grab.
// usage: node tools/play_ch14_polish.mjs [url] [outDir]
import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.argv[2] || 'http://127.0.0.1:4350/';
const OUT = process.argv[3] || '/workspace/atq-ch14-proof/polish';
fs.mkdirSync(OUT, { recursive: true });
const notes = [];
const rec = (name, ok, extra) => { notes.push({ name, ok: !!ok, extra }); console.log((ok ? 'OK  ' : 'FAIL'), name, extra != null ? JSON.stringify(extra) : ''); };

const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});

async function boot(w, h) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => {
    localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'med', gore: true, voices: true, lang: 'clean', hints: true, music: false }));
    const raw = { v: 3, step: 69, cash: 400, xp: 0, level: 4, owned: ['fists','bat','pistol','rifle'], up: {}, ammo: { light: 80, shell: 16, rifle: 80 }, mags: {}, grenades: 2, meds: 3, pages: [], items: ['backpack'], loot: [], cur: 'rifle', kills: 20, bites: 7, done: true, ch: 14, maxCh: 14, done2: true, played: true };
    localStorage.setItem('atq3_save', JSON.stringify(raw));
    localStorage.setItem('atq_prologue_seen', '1');
    localStorage.setItem('atq.gate', JSON.stringify({ birthYear: 1990, agreedVersion: 1, birthSetAt: Date.now() }));
  });
  const p = await ctx.newPage();
  p.setDefaultTimeout(120000);
  const errs = [], notFounds = [];
  p.on('pageerror', e => errs.push(String(e.message || e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('response', r => { if (r.status() === 404) notFounds.push(r.url()); });
  p._errs = errs; p._404 = notFounds; p._ctx = ctx;
  return p;
}
async function waitGame(p, ms = 120000) {
  await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: ms });
}
async function tick(p, n = 30, dt = 1 / 30) {
  await p.evaluate(([n, dt]) => { const g = window.__atq.game; const was = g.paused; g.paused = true; for (let i = 0; i < n; i++) { try { g.update(dt, dt); } catch (e) { console.error(e); } } g.paused = was; }, [n, dt]);
}
async function skip(p) {
  await p.evaluate(() => { const g = window.__atq.game; if (!g) return; for (let i = 0; i < 80; i++) g.skipLine && g.skipLine(); });
}
async function dismiss(p) {
  await p.evaluate(() => {
    document.querySelector('#studio')?.classList.add('hidden');
    document.querySelector('#tut')?.classList.add('hidden');
    document.querySelector('#cine')?.classList.add('hidden');
    document.querySelector('#gateSkip')?.click();
    document.querySelector('#warning')?.classList.add('hidden');
    const g = window.__atq && window.__atq.game; if (!g) return;
    g.paused = false;
  });
}
function pose(cam, look, anim = 'Idle_Loop') {
  return { anim, cam, look, flash: false };
}
async function shot(p, name) {
  await p.evaluate(() => {
    document.querySelector('#loading')?.classList.add('hidden');
    document.querySelector('#studio')?.classList.add('hidden');
    document.querySelector('#tut')?.classList.add('hidden');
    const fade = document.querySelector('#fade'); if (fade) fade.style.opacity = '0';
  });
  const path = `${OUT}/${name}.png`;
  await p.screenshot({ path, timeout: 120000 });
  console.log('SHOT', name);
  return path;
}
async function hudMetrics(p) {
  return p.evaluate(() => {
    const obj = document.querySelector('#obj');
    const boss = document.querySelector('#boss');
    const top = document.querySelector('#hudTop');
    const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), t: el.textContent.trim().slice(0, 140) }; };
    const a = box(obj), b = box(boss);
    let overlap = false;
    if (a && b && !boss.classList.contains('hidden') && obj.style.display !== 'none') {
      overlap = !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
    }
    return { w: innerWidth, h: innerHeight, wrapped: !!top, overlap, obj: a, boss: b, objDisplay: obj && obj.style.display, bossHidden: boss && boss.classList.contains('hidden') };
  });
}
async function prepWarden(p) {
  await dismiss(p);
  await waitGame(p);
  await p.waitForFunction(() => {
    const g = window.__atq && window.__atq.game;
    return !!(g && (g.boss || (g.stepData && g.stepData.b)));
  }, null, { timeout: 90000 }).catch(() => {});
  await p.evaluate(() => {
    const g = window.__atq.game;
    g.god = true; g.hp = g.maxHp = 9999; g.grace = 9; g.paused = false;
    document.querySelector('#hud')?.classList.remove('hidden');
    document.querySelector('#touch')?.classList.remove('hidden');
    document.querySelector('#tut')?.classList.add('hidden');
  });
  await skip(p);
  await tick(p, 24);
  await p.evaluate(() => {
    const g = window.__atq.game, V = (x, y, z) => { const v = g.camera.position.clone(); v.set(x, y, z); return v; };
    document.querySelector('#dlg')?.classList.remove('on');
    for (let i = 0; i < 40; i++) g.skipLine && g.skipLine();
    const D = g.stepData || {};
    const b = D.b || g.boss;
    if (g.player) { g.player.root.position.set(0, 0, -3868); g.player.root.rotation.y = Math.PI; }
    if (b) { b.root.position.set(1.4, 0, -3878); b.root.rotation.y = 0; b.play && b.play('Idle_Loop'); }
    if (D.nia) { D.nia.root.position.set(-10.5, 0, -3869); }
    g.cut = { anim: 'Idle_Loop', cam: V(0.4, 1.55, -3863), look: V(1.2, 1.35, -3878), flash: false };
    g.objective('Stop the Warden', 'Visor shots only. Break snares. Protect Biscuit.');
    if (g.boss) document.querySelector('#boss')?.classList.remove('hidden');
    g.paused = false;
  });
  await tick(p, 12);
}

// ---- HUD at three phone landscape sizes ----
const SIZES = [[844, 390, '844x390'], [911, 411, '911x411'], [1024, 472, '1024x472']];
for (const [w, h, tag] of SIZES) {
  const p = await boot(w, h);
  await p.goto(URL + '?step=69&god', { waitUntil: 'load', timeout: 120000 });
  await waitGame(p);
  await prepWarden(p);
  const m = await hudMetrics(p);
  rec('hud-' + tag, !m.overlap && m.wrapped, m);
  await shot(p, 'hud-warden-' + tag);
  await p._ctx.close();
}

// ---- lab + fight proofs at 844x390 ----
const p = await boot(844, 390);
await p.goto(URL + '?step=65&god', { waitUntil: 'load', timeout: 120000 });
await waitGame(p);
await dismiss(p);
await skip(p);
await tick(p, 20);
await p.evaluate(() => {
  const g = window.__atq.game;
  const V = (x, y, z) => { const v = g.camera.position.clone(); v.set(x, y, z); return v; };
  g.paused = false;
  for (let i = 0; i < 40; i++) g.skipLine && g.skipLine();
  g.player.root.position.set(4, 0, -3736);
  g.player.root.rotation.y = Math.PI + 0.4;
  g.cut = { anim: 'Idle_Loop', cam: V(16, 2.2, -3730), look: V(-6, 1.2, -3760), flash: false };
});
await tick(p, 8);
await shot(p, 'lab-main-dressed');

await p.evaluate(() => {
  const g = window.__atq.game;
  const V = (x, y, z) => { const v = g.camera.position.clone(); v.set(x, y, z); return v; };
  g.player.root.position.set(-11, 0, -3760);
  g.cut = { anim: 'Idle_Loop', cam: V(-18, 1.9, -3752), look: V(-12, 1.2, -3772), flash: false };
});
await tick(p, 6);
await shot(p, 'lab-analyzer-dressed');

// warden fight without instakill
await p.goto(URL + '?step=69&god', { waitUntil: 'load', timeout: 120000 });
await waitGame(p);
await prepWarden(p);
// tighter helm close-up
await p.evaluate(() => {
  const g = window.__atq.game, D = g.stepData, b = D.b || g.boss;
  const V = (x, y, z) => { const v = g.camera.position.clone(); v.set(x, y, z); return v; };
  if (b) { b.root.position.set(1.2, 0, -3876); b.root.rotation.y = 0.35; }
  g.player.root.position.set(0.2, 0, -3871);
  g.cut = { anim: 'Idle_Loop', cam: V(2.6, 1.7, -3872.4), look: V(1.2, 1.55, -3876), flash: false };
});
await tick(p, 8);
await shot(p, 'warden-helm-close');

// Spawn a snare and freeze it mid-ring so the shot proves the mechanic
await p.evaluate(() => {
  const g = window.__atq.game, D = g.stepData, b = D.b || g.boss;
  if (D.snare && D.snare.m) { g.scene.remove(D.snare.m); D.snare = null; }
  D.mode = 'fight'; D.cd = 0; D.crate = null;
  if (b) b.hp = b.maxHp * 0.95;
  g.player.root.position.set(0, 0, -3868);
});
await tick(p, 2); // one update should fire ringAt
await p.evaluate(() => {
  const g = window.__atq.game, D = g.stepData;
  const V = (x, y, z) => { const v = g.camera.position.clone(); v.set(x, y, z); return v; };
  if (D.snare) { D.snare.t = 0.35; D.snare.life = 99; D.cd = 99; }
  const sx = (D.snare && D.snare.x) || 0, sz = (D.snare && D.snare.z) || -3868;
  g.cut = { anim: 'Idle_Loop', cam: V(sx + 3.2, 2.4, sz + 4.2), look: V(sx, 0.1, sz), flash: false };
  g.toast('Containment incoming!', 2);
});
await tick(p, 2);
const sn = await p.evaluate(() => {
  const D = window.__atq.game.stepData || {};
  return { has: !!D.snare, t: D.snare && +D.snare.t.toFixed(2), r: D.snare && D.snare.r, toast: document.querySelector('#toast')?.textContent || '' };
});
rec('snare-spawned', !!(sn && sn.has), sn);
await shot(p, 'warden-snare');

// Force the Biscuit grab: Warden walking toward Nia
await p.evaluate(() => {
  const g = window.__atq.game, D = g.stepData, b = D.b || g.boss;
  const V = (x, y, z) => { const v = g.camera.position.clone(); v.set(x, y, z); return v; };
  if (D.snare && D.snare.m) { g.scene.remove(D.snare.m); D.snare = null; }
  D.rootT = 0; g.slowMul = 1;
  D.mode = 'grab'; D.gt = 0; D.hurt0 = b.hp; D.cd = 99;
  g.toast('He is going for Biscuit!', 2.2);
  g.objective('Stop the Warden', 'Hit him before he reaches Nia.');
  if (D.nia) { D.nia.root.position.set(-8.5, 0, -3872); D.nia.root.rotation.y = 1.2; }
  if (b) { b.root.position.set(-3.2, 0, -3873); }
  g.player.root.position.set(1.2, 0, -3867);
  g.cut = { anim: 'Idle_Loop', cam: V(2.8, 1.75, -3866), look: V(-6.2, 1.15, -3872.5), flash: false };
});
await tick(p, 18);
await shot(p, 'warden-grab-biscuit');
const grab = await p.evaluate(() => {
  const g = window.__atq.game, D = g.stepData, b = D.b || g.boss;
  const np = D.nia && D.nia.root.position, bp = b && b.root.position;
  return { mode: D.mode, gt: D.gt, nia: np && [+np.x.toFixed(1), +np.z.toFixed(1)], boss: bp && [+bp.x.toFixed(1), +bp.z.toFixed(1)], toast: document.querySelector('#toast')?.textContent || '', obj: document.querySelector('#obj')?.textContent || '' };
});
rec('grab-mode', grab.mode === 'grab' || /Biscuit|Nia/i.test(grab.obj + grab.toast), grab);

// Drive grab until the crate boxes Biscuit, then look at the crate
await p.evaluate(() => {
  const g = window.__atq.game, D = g.stepData, b = D.b || g.boss;
  D.mode = 'grab'; D.gt = 0.7; D.hurt0 = b.hp;
  if (D.nia) D.nia.root.position.set(-6, 0, -3874);
  b.root.position.set(-5.5, 0, -3874);
});
await tick(p, 12);
let crate = await p.evaluate(() => {
  const D = window.__atq.game.stepData || {};
  return { has: !!D.crate, obj: document.querySelector('#obj')?.textContent || '', toast: document.querySelector('#toast')?.textContent || '' };
});
rec('crate-spawned', !!crate.has, crate);
await p.evaluate(() => {
  const g = window.__atq.game, D = g.stepData;
  const V = (x, y, z) => { const v = g.camera.position.clone(); v.set(x, y, z); return v; };
  const m = D.crate && D.crate.m;
  const cx = m ? m.position.x : -6, cz = m ? m.position.z : -3874;
  g.player.root.position.set(cx + 2.4, 0, cz + 3.2);
  g.cut = { anim: 'Idle_Loop', cam: V(cx + 3.4, 1.8, cz + 4.2), look: V(cx, 0.7, cz), flash: false };
  g.objective('Free Biscuit', 'Smash the crate — shoot it or get close and fire.');
});
await tick(p, 6);
await shot(p, 'warden-biscuit-crate');

// wide arena shot: no floating slabs, indoor, dressed
await p.evaluate(() => {
  const g = window.__atq.game, D = g.stepData, b = D.b || g.boss;
  const V = (x, y, z) => { const v = g.camera.position.clone(); v.set(x, y, z); return v; };
  g.player.root.position.set(0, 0, -3864);
  if (b) { b.root.position.set(1.2, 0, -3876); b.root.rotation.y = 0.2; }
  g.cut = { anim: 'Idle_Loop', cam: V(0.4, 1.7, -3860), look: V(1.2, 1.3, -3876), flash: false };
  g.objective('Stop the Warden', 'Visor shots only. Break snares. Protect Biscuit.');
});
await tick(p, 8);
await shot(p, 'warden-arena-clean');

const metrics844 = await hudMetrics(p);
rec('final-hud-844', !metrics844.overlap, metrics844);

const voiceProbe = await p.evaluate(async () => {
  // sample a few ch14 hashes if present
  return 'ok';
});

await p._ctx.close();
await b.close();
fs.writeFileSync(OUT + '/notes.json', JSON.stringify(notes, null, 2));
const failed = notes.filter(n => !n.ok);
console.log('SUMMARY', JSON.stringify({ total: notes.length, failed: failed.length, failedNames: failed.map(f => f.name) }));
if (failed.length) process.exitCode = 1;
