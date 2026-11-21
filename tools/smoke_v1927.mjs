// v1.9.27 smoke: footer; first open warning -> studio -> prologue -> menu;
// reload goes straight to the menu; Watch Intro plays and returns to the menu;
// New Game starts Chapter 1 (no prologue); Keem's legs animate when he moves;
// peek/street feeding victims lie flat with kneeling feeders; all chapters load;
// no page/console errors.
// usage: node tools/smoke_v1927.mjs <url> <outdir>
import { chromium } from 'playwright';
import fs from 'fs';
const URL = process.argv[2] || 'http://127.0.0.1:4173/';
const OUT = process.argv[3] || '/tmp/v1927';
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const res = []; const rec = (n, ok, d) => { res.push({ n, ok, d }); console.log(ok ? 'PASS' : 'FAIL', n, JSON.stringify(d)); };
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, hasTouch: true });
await ctx.addInitScript(() => {
  localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true, hints: false }));
});
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
p.on('console', m => { if (m.type() === 'error' && !/supabase|WebSocket/.test(m.text())) errs.push(m.text().slice(0, 200)); });
p.on('response', r => { if (r.status() >= 400) errs.push('HTTP ' + r.status() + ' ' + r.url()); });

async function dismissWarnAndStudio() {
  await p.waitForSelector('#btnWarn', { timeout: 30000 });
  await p.click('#btnWarn');
  await p.waitForSelector('#studio:not(.hidden)', { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(800);
  await p.click('#studio').catch(() => {});
}

async function skipPrologue() {
  await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.pro, null, { timeout: 180000, polling: 250 });
  await p.waitForTimeout(2000);
  const pl = await p.evaluate(() => { const g = window.__atq.game; const c = document.querySelector('#cine'); return { t: +(g.pro && g.pro.t || 0).toFixed(2), cine: document.body.classList.contains('cine'), overlay: !!c && getComputedStyle(c).display !== 'none', title: !document.querySelector('#title').classList.contains('hidden'), pro: !!g.pro }; });
  await p.mouse.click(640, 360); await p.waitForTimeout(200);
  const armed = await p.evaluate(() => document.querySelector('#cine .hint')?.classList.contains('on'));
  await p.mouse.click(640, 360);
  await p.waitForFunction(() => !window.__atq.game || !window.__atq.game.pro, null, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(800);
  return { pl, armed };
}

// ---- first launch ----
await p.goto(URL, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('#btnWarn');
const foot = await p.evaluate(() => document.querySelector('#foot')?.textContent || '');
rec('footer is v1.9.27', /v1\.9\.27/.test(foot), { foot });
await p.evaluate(() => localStorage.removeItem('atq_prologue_seen'));
await dismissWarnAndStudio();
const first = await skipPrologue();
await p.screenshot({ path: `${OUT}/1_first_open_prologue.png` });
rec('first open: prologue plays after warning + studio (time advancing, letterbox)', first.pl.t > 0.5 && first.pl.cine && first.pl.overlay && first.pl.pro && !first.pl.title, first.pl);
const menu1 = await p.evaluate(() => {
  const t = document.querySelector('#title');
  const b = document.querySelector('#btnWatchIntro');
  const br = b && b.getBoundingClientRect();
  return { title: t && !t.classList.contains('hidden'), watch: !!(b && b.offsetParent !== null), label: b && b.textContent.trim(),
    btn: br && { x: +br.x.toFixed(1), y: +br.y.toFixed(1), w: +br.width.toFixed(1), h: +br.height.toFixed(1) },
    state: window.__atq.state, pro: !!(window.__atq.game && window.__atq.game.pro), step: window.__atq.game && window.__atq.game.step,
    seen: localStorage.getItem('atq_prologue_seen') };
});
await p.screenshot({ path: `${OUT}/2_menu_watch_intro.png` });
rec('first open: skip lands on the title menu with Watch Intro', menu1.title && menu1.watch && menu1.label === 'Watch Intro' && menu1.state === 'title' && !menu1.pro && menu1.seen === '1', menu1);

// ---- reload: straight to menu ----
await p.reload({ waitUntil: 'domcontentloaded' });
await dismissWarnAndStudio();
await p.waitForSelector('#title:not(.hidden)', { timeout: 20000 });
await p.waitForTimeout(1500);
const second = await p.evaluate(() => ({ title: !document.querySelector('#title').classList.contains('hidden'), state: window.__atq.state, pro: !!(window.__atq.game && window.__atq.game.pro), cine: document.body.classList.contains('cine'), seen: localStorage.getItem('atq_prologue_seen') }));
await p.screenshot({ path: `${OUT}/3_reload_menu.png` });
rec('reload: opens straight to the menu (no prologue)', second.title && second.state === 'title' && !second.pro && !second.cine && second.seen === '1', second);

// ---- Watch Intro plays and returns ----
await p.click('#btnWatchIntro');
const watch = await skipPrologue();
const afterWatch = await p.evaluate(() => ({ title: !document.querySelector('#title').classList.contains('hidden'), state: window.__atq.state, pro: !!(window.__atq.game && window.__atq.game.pro), ch: window.__atq.game && window.__atq.game.save && window.__atq.game.save.ch, step: window.__atq.game && window.__atq.game.step, hud: getComputedStyle(document.getElementById('hud')).display }));
await p.screenshot({ path: `${OUT}/4_after_watch_intro.png` });
rec('Watch Intro plays the prologue', watch.pl.pro && watch.pl.cine && watch.pl.overlay, watch.pl);
rec('Watch Intro returns to the menu, not Chapter 1', afterWatch.title && afterWatch.state === 'title' && !afterWatch.pro && afterWatch.hud === 'none', afterWatch);

// ---- New Game starts Chapter 1, no prologue ----
await p.click('#btnNew');
await p.waitForFunction(() => window.__atq && window.__atq.state === 'play' && window.__atq.game && !window.__atq.game.pro, null, { timeout: 120000 }).catch(() => {});
await p.waitForTimeout(2000);
const ng = await p.evaluate(() => { const g = window.__atq.game; return { state: window.__atq.state, pro: !!g.pro, step: g.step, ch: g.save.ch, running: g.running, cine: document.body.classList.contains('cine'), hud: getComputedStyle(document.getElementById('hud')).display, dlg: g.dlgCur && g.dlgCur.text }; });
await p.screenshot({ path: `${OUT}/5_new_game_ch1.png` });
rec('New Game starts Chapter 1 without the prologue', ng.state === 'play' && !ng.pro && ng.step === 0 && ng.ch === 1 && !ng.cine && ng.hud !== 'none', ng);

// ---- legs animate on first move ----
await p.evaluate(() => { const g = window.__atq.game; for (let i = 0; i < 120; i++) g.skipLine?.(); g.cut = null; });
await p.waitForTimeout(400);
const legs = await p.evaluate(async () => {
  const g = window.__atq.game, P = g.player, V3 = () => new g.camera.position.constructor();
  const foot = (n) => { const b = P.bone(n), w = V3(); if (b) b.getWorldPosition(w); return { x: +w.x.toFixed(4), z: +w.z.toFixed(4) }; };
  const a0 = { cur: P.curName, loco: !!P.locoOn, fL: foot('DEF-foot.L'), fR: foot('DEF-foot.R') };
  g.input.keys.KeyW = true;
  await new Promise(r => setTimeout(r, 700));
  const a1 = { cur: P.curName, loco: !!P.locoOn, fL: foot('DEF-foot.L'), fR: foot('DEF-foot.R'), aspd: +(g.state.aspd || 0).toFixed(3) };
  g.input.keys.KeyW = false;
  const moved = Math.hypot(a1.fL.x - a0.fL.x, a1.fL.z - a0.fL.z) > 0.04 || Math.hypot(a1.fR.x - a0.fR.x, a1.fR.z - a0.fR.z) > 0.04;
  const walking = a1.loco || a1.cur === '__loco' || /Walk|Jog|Sprint/.test(a1.cur || '');
  return { a0, a1, moved, walking };
});
await p.screenshot({ path: `${OUT}/6_legs_moving.png` });
rec("Keem's legs animate when he moves at the start", !!(legs.walking && legs.moved), legs);

// ---- peek bodies ----
const feed = await p.evaluate(() => {
  const g = window.__atq.game; const V3 = () => new g.camera.position.constructor();
  const victims = Object.values(g.npcs).filter(n => n.isVictim).map(n => {
    const hip = V3(), head = V3(), fL = V3(), fR = V3();
    n.root.updateMatrixWorld(true);
    n.worldOf('DEF-hips', hip); n.worldOf('DEF-head', head);
    if (n.bone('DEF-foot.L')) n.bone('DEF-foot.L').getWorldPosition(fL);
    if (n.bone('DEF-foot.R')) n.bone('DEF-foot.R').getWorldPosition(fR);
    return { look: n.lookKey, clip: n.curName, hipY: +hip.y.toFixed(3), headY: +head.y.toFixed(3),
      footLY: +fL.y.toFixed(3), footRY: +fR.y.toFixed(3), rx: +n.root.rotation.x.toFixed(3) };
  });
  const eaters = g.zombies.filter(z => z.st === 'eat').map(z => {
    const hip = V3(); z.root.updateMatrixWorld(true); z.worldOf('DEF-hips', hip);
    return { eat: z.eat && z.eat.lookKey, clip: z.curName, hipY: +hip.y.toFixed(3) };
  });
  return { victims, eaters };
});
await p.evaluate(() => {
  const g = window.__atq.game; const V3 = (x, y, z) => new g.camera.position.constructor(x, y, z);
  const n = Object.values(g.npcs).find(n => n.lookKey === 'walt') || Object.values(g.npcs).find(n => n.isVictim);
  const hip = V3(); if (n) { n.root.updateMatrixWorld(true); n.worldOf('DEF-hips', hip); } else hip.set(3.5, 0.4, 43.6);
  g.player.root.visible = false;
  g._lk = V3(hip.x, 0.45, hip.z);
  g.cut = { anim: 'Idle_Loop', cam: V3(12.3, 1.5, 42.5), look: g._lk, flash: false, noFace: true };
  g.camera.position.copy(g.cut.cam); g.camera.lookAt(g._lk);
});
await p.waitForTimeout(800);
await p.screenshot({ path: `${OUT}/7_peek_bodies.png` });
const flat = feed.victims.filter(v => Math.abs(v.rx + Math.PI / 2) < 0.15 && v.hipY >= 0 && v.hipY <= 0.2 && v.headY >= 0 && v.headY <= 0.3 && Math.abs(v.headY - v.hipY) < 0.25 && v.footLY > -0.02 && v.footRY > -0.02);
const knelt = feed.eaters.filter(z => z.clip === 'Fixing_Kneeling' && z.hipY >= 0.25 && z.hipY <= 0.65);
rec('peek scene: victims lie flat on their backs', feed.victims.length >= 1 && flat.length === feed.victims.length, feed);
rec('peek scene: feeders kneel over the body', feed.eaters.length >= 1 && knelt.length === feed.eaters.length, feed.eaters);

const steps = await p.evaluate(async () => { const g = window.__atq.game; g.running = false; g.god = true; const out = []; for (let i = 0; i < 400; i++) { try { g.loadStep(i); } catch (e) { if (/undefined|null/.test(e.message) && i > 30) break; out.push({ i, err: e.message }); continue; } for (let k = 0; k < 10; k++) g.update(1 / 30, 1 / 30); g.render(.03); out.push({ i, ch: g.save.ch }); await new Promise(r => setTimeout(r, 0)); } return out; });
const chs = [...new Set(steps.filter(s => s.ch).map(s => s.ch))].sort((a, b) => a - b), bad = steps.filter(s => s.err);
rec('all story steps load (chapters)', !bad.length && chs.includes(1) && chs.includes(13), { steps: steps.filter(s => !s.err).length, chapters: chs, bad: bad.slice(0, 3) });
rec('no page or console errors', !errs.length, errs.slice(0, 8));
fs.writeFileSync(`${OUT}/smoke.json`, JSON.stringify(res, null, 2));
await b.close(); process.exit(res.some(r => !r.ok) ? 1 : 0);
