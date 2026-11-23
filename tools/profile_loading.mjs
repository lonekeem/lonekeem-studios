// Profile After the Quiet load + first-use hitches.
// usage: node profile_load.mjs [chromium|webkit] [outPrefix] [port] [cpuRate]
import { chromium, webkit, devices } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const kind = process.argv[2] || 'chromium';
const prefix = process.argv[3] || '/workspace/atq-loading-proof/before-chromium';
const port = process.argv[4] || '5471';
const cpuRate = Math.max(1, +process.argv[5] || 6);
mkdirSync(dirname(prefix), { recursive: true });

const url = `http://127.0.0.1:${port}/`;
const iphone = devices['iPhone 13'] || {};
const viewport = { width: 844, height: 390 }; // iPhone landscape

const launchOpts = { args: [] };
if (kind === 'chromium') {
  launchOpts.executablePath = '/usr/bin/google-chrome';
  launchOpts.args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--disable-dev-shm-usage'];
}

const browserType = kind === 'webkit' ? webkit : chromium;
const b = await browserType.launch(launchOpts);
const ctx = await b.newContext({
  viewport,
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent: iphone.userAgent || undefined,
});
await ctx.addInitScript(() => {
  localStorage.setItem('atq3.settings', JSON.stringify({
    qual: 'low', gore: true, hints: false, ctl: 'twin', hudv2: false,
    music: 0.2, vol: 0.2, voices: true, sfxVol: 0.2,
  }));
  localStorage.setItem('atq_prologue_seen', '1');
  localStorage.setItem('atq.tut.seen', '1');

  const st = window.__prof = {
    long: [], frames: [], json: [], decode: [], compile: [], link: [], tex: [],
    bootStart: performance.now(),
  };
  try {
    const po = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.duration >= 50) st.long.push({ d: +e.duration.toFixed(1), t: +e.startTime.toFixed(1), n: e.name });
      }
    });
    po.observe({ type: 'longtask', buffered: true });
    st.po = po;
  } catch (e) { /* webkit may lack longtask */ }

  let last = performance.now();
  const tick = (t) => {
    const d = t - last; last = t;
    if (d >= 50) st.frames.push({ d: +d.toFixed(1), t: +t.toFixed(1) });
    if (!st._stopFrames) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  const _jp = JSON.parse;
  JSON.parse = function (s) {
    const t0 = performance.now();
    const r = _jp.apply(this, arguments);
    const d = performance.now() - t0;
    if (d >= 20) st.json.push({ d: +d.toFixed(1), n: typeof s === 'string' ? s.length : 0 });
    return r;
  };

  const wrapAudio = () => {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || AC.__profWrapped) return;
    AC.__profWrapped = true;
    const proto = AC.prototype;
    const _dec = proto.decodeAudioData;
    proto.decodeAudioData = function () {
      const t0 = performance.now();
      const ret = _dec.apply(this, arguments);
      const done = () => {
        const d = performance.now() - t0;
        if (d >= 8) st.decode.push({ d: +d.toFixed(1), t: +t0.toFixed(1) });
      };
      if (ret && ret.then) ret.then(done, done);
      else done();
      return ret;
    };
  };
  wrapAudio();

  const wrapGL = (proto, label) => {
    if (!proto || proto.__profWrapped) return;
    proto.__profWrapped = true;
    if (proto.compileShader) {
      const _c = proto.compileShader;
      proto.compileShader = function () {
        const t0 = performance.now();
        const r = _c.apply(this, arguments);
        const d = performance.now() - t0;
        if (d >= 8) st.compile.push({ d: +d.toFixed(1), t: +t0.toFixed(1) });
        return r;
      };
    }
    if (proto.linkProgram) {
      const _l = proto.linkProgram;
      proto.linkProgram = function () {
        const t0 = performance.now();
        const r = _l.apply(this, arguments);
        const d = performance.now() - t0;
        if (d >= 8) st.link.push({ d: +d.toFixed(1), t: +t0.toFixed(1) });
        return r;
      };
    }
    if (proto.texImage2D) {
      const _t = proto.texImage2D;
      proto.texImage2D = function () {
        const t0 = performance.now();
        const r = _t.apply(this, arguments);
        const d = performance.now() - t0;
        if (d >= 8) st.tex.push({ d: +d.toFixed(1), t: +t0.toFixed(1) });
        return r;
      };
    }
  };
  try { wrapGL(window.WebGLRenderingContext && window.WebGLRenderingContext.prototype); } catch (e) {}
  try { wrapGL(window.WebGL2RenderingContext && window.WebGL2RenderingContext.prototype); } catch (e) {}
});

const page = await ctx.newPage();
page.setDefaultTimeout(240000);
const errs = [];
const notFounds = [];
page.on('pageerror', e => errs.push(String(e.message || e).slice(0, 280)));
page.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text().slice(0, 220)); });
page.on('response', r => { if (r.status() === 404) notFounds.push(r.url()); });
page.on('dialog', d => d.accept());
await page.route(/leaderboard|postScore|submitScore|supabase\.co|firestore|games\/score/i, route => route.abort());

const snap = async (name) => {
  const f = `${prefix}-${name}.png`;
  try { await page.screenshot({ path: f, timeout: 60000 }); console.log('SHOT', f); } catch (e) { console.log('SHOT_FAIL', name, e.message); }
  return f;
};
const stats = (arr, key = 'd') => {
  const a = (arr || []).map(x => (typeof x === 'number' ? x : x[key])).filter(n => n != null).sort((x, y) => x - y);
  if (!a.length) return { n: 0, max: 0, sum: 0, over50: 0, over200: 0, over500: 0, over1000: 0 };
  return {
    n: a.length,
    max: +a[a.length - 1].toFixed(1),
    sum: +a.reduce((s, v) => s + v, 0).toFixed(1),
    over50: a.filter(v => v >= 50).length,
    over200: a.filter(v => v >= 200).length,
    over500: a.filter(v => v >= 500).length,
    over1000: a.filter(v => v >= 1000).length,
    top: a.slice(-8).reverse().map(v => +v.toFixed(1)),
  };
};

console.log('GOTO', url, kind, 'cpu', cpuRate);
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });

if (kind === 'chromium') {
  try {
    const client = await ctx.newCDPSession(page);
    await client.send('Emulation.setCPUThrottlingRate', { rate: cpuRate });
    console.log('CPU throttle', cpuRate);
  } catch (e) { console.log('no cpu throttle', e.message); }
}

const warn = page.locator('#btnWarn');
if (await warn.count()) {
  try { await warn.click({ timeout: 8000 }); } catch (e) {}
  await page.waitForTimeout(300);
}
try { await page.locator('#studio').click({ timeout: 8000 }); } catch (e) {}

const bootT0 = await page.evaluate(() => performance.now());
await page.waitForSelector('#title:not(.hidden)', { timeout: 240000 });
// dismiss first-time tutorial offer if it appears
try { await page.locator('#tutSkip').click({ timeout: 2000 }); } catch (e) {}
await page.waitForSelector('#btnStory', { state: 'visible', timeout: 30000 });
// wait until ensureGame finishes (loads behind the menu / studio)
await page.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.renderer, null, { timeout: 240000 });
const boot = await page.evaluate((t0) => {
  const st = window.__prof || {};
  const g = window.__atq && window.__atq.game;
  return {
    titleAt: performance.now() - t0,
    abs: performance.now(),
    gameReady: !!(g && g.renderer),
    long: (st.long || []).slice(),
    frames: (st.frames || []).slice(),
    json: (st.json || []).slice(),
    decode: (st.decode || []).slice(),
    compile: (st.compile || []).slice(),
    link: (st.link || []).slice(),
    tex: (st.tex || []).slice(),
  };
}, bootT0);
console.log('TITLE after', boot.titleAt.toFixed(0), 'ms, gameReady', boot.gameReady);
await snap('title');

// Reset phase markers, then start Chapter 1
await page.evaluate(() => {
  const st = window.__prof;
  st.phase2 = { long0: st.long.length, frames0: st.frames.length, clickAt: performance.now() };
  st.loadShownAt = null; st.loadHidAt = null;
  const el = document.getElementById('loading');
  const obs = new MutationObserver(() => {
    const vis = el && !el.classList.contains('hidden');
    if (vis && st.loadShownAt == null) st.loadShownAt = performance.now();
    if (!vis && st.loadShownAt != null && st.loadHidAt == null) st.loadHidAt = performance.now();
  });
  if (el) obs.observe(el, { attributes: true, attributeFilter: ['class'] });
  if (el && !el.classList.contains('hidden')) st.loadShownAt = performance.now();
});

await page.locator('#btnStory').click();
await page.waitForSelector('#btnNew', { state: 'visible', timeout: 10000 });
await page.locator('#btnNew').click();

await page.waitForFunction(() => window.__atq && window.__atq.state === 'play' && window.__atq.game && window.__atq.game.running, null, { timeout: 240000 });
await page.waitForTimeout(400);

const ch1 = await page.evaluate(() => {
  const st = window.__prof || {};
  const p2 = st.phase2 || { long0: 0, frames0: 0, clickAt: 0 };
  const now = performance.now();
  const slice = (arr, n0) => (arr || []).slice(n0);
  const long = slice(st.long, p2.long0);
  const frames = slice(st.frames, p2.frames0);
  const load = document.getElementById('loading');
  return {
    clickToPlay: now - p2.clickAt,
    loadShownAt: st.loadShownAt,
    loadHidAt: st.loadHidAt,
    loadMs: (st.loadHidAt && st.loadShownAt) ? st.loadHidAt - st.loadShownAt : null,
    loadVis: !!(load && !load.classList.contains('hidden')),
    kick: document.querySelector('#loading .lkick')?.textContent || '',
    name: document.querySelector('#loading .lname')?.textContent || '',
    bar: document.querySelector('#loading .lb i')?.style.width || '',
    step: window.__atq.game.step,
    running: window.__atq.game.running,
    state: window.__atq.state,
    long, frames,
    json: st.json, decode: st.decode, compile: st.compile, link: st.link, tex: st.tex,
    programs: (window.__atq.game.renderer.info.programs || []).length,
  };
});
console.log('CH1 clickToPlay', ch1.clickToPlay?.toFixed?.(0) || ch1.clickToPlay, 'loadMs', ch1.loadMs);
await snap('ch1');

// First-use: spawn unused zombie rigs, fire, explode, swap weapons
const firstUse = await page.evaluate(async () => {
  const g = window.__atq.game, I = g.input, dt = 1 / 60;
  g.paused = true; g.god = true; g.timeScale = 1; g.hitstop = 0; g.slowT = 0;
  for (let i = 0; i < 60; i++) g.skipLine && g.skipLine();
  g.dlgCur = null; g.cut = null;
  const P = g.player.root.position;
  const marks = [];
  const mark = (name, fn) => {
    const t0 = performance.now();
    const r = fn();
    const d = performance.now() - t0;
    marks.push({ name, d: +d.toFixed(1) });
    return r;
  };
  const stepN = (n) => { for (let i = 0; i < n; i++) { I.poll(dt); g.update(dt, dt); g.render(dt); } };

  const idle = [];
  for (let i = 0; i < 20; i++) {
    const t0 = performance.now();
    I.poll(dt); g.update(dt, dt); g.render(dt);
    idle.push(+(performance.now() - t0).toFixed(2));
  }

  const zTimes = [];
  const rigs = Object.keys(g.lib.rigs || {});
  for (const rig of rigs) {
    const t0 = performance.now();
    let z = null;
    try { z = g.spawnZ(P.x + 2, P.z - 4); if (z && z.look) { /* already random */ } } catch (e) { zTimes.push({ rig, d: -1, err: String(e) }); continue; }
    I.poll(dt); g.update(dt, dt); g.render(dt);
    zTimes.push({ rig: (z && z.look && z.look.rig) || 'proc', d: +(performance.now() - t0).toFixed(1) });
  }
  // force one of each known rig if spawnZ is random
  if (typeof g.spawnZ === 'function') {
    const looks = ['zombie_male', 'zombie_office', 'zombie_elder', 'zombie_big', 'zombie_cop', 'zombie_worker', 'zombie2', 'raider'];
    for (const rig of looks) {
      const t0 = performance.now();
      try {
        const z = g.spawnZ(P.x + 3, P.z - 5);
        if (z && z.look) z.look.rig = rig;
        // reconstruct? just render current
        I.poll(dt); g.update(dt, dt); g.render(dt);
        zTimes.push({ rig: 'spawn+' + rig, d: +(performance.now() - t0).toFixed(1) });
      } catch (e) { zTimes.push({ rig, d: -1, err: String(e).slice(0, 80) }); }
    }
  }

  const S = g.save;
  const guns = ['pistol', 'shotgun', 'rifle', 'smg', 'axe', 'bat', 'pan', 'katana'];
  const weap = [];
  for (const id of guns) {
    if (!S.owned.includes(id)) S.owned.push(id);
    if (S.mags && S.mags[id] != null) S.mags[id] = 999;
    if (S.ammo) { for (const k of Object.keys(S.ammo)) S.ammo[k] = 999; }
    const t0 = performance.now();
    try { g.equip(id, true); } catch (e) {}
    I.poll(dt); g.update(dt, dt); g.render(dt);
    weap.push({ id, d: +(performance.now() - t0).toFixed(1) });
  }

  const fire = [];
  try {
    g.equip('rifle', true);
    S.mags.rifle = 999; S.ammo.rifle = 999;
    for (let i = 0; i < 8; i++) {
      g.state.fireCd = 0; g.state.reload = 0;
      I.btn.atk = true; I.atk = true; I.edge.atk = true;
      const t0 = performance.now();
      I.poll(dt); g.update(dt, dt); g.render(dt);
      fire.push(+(performance.now() - t0).toFixed(2));
      I.btn.atk = false; I.atk = false; I.edge.atk = false;
    }
  } catch (e) { fire.push(-1); }

  let explode = null;
  try {
    const t0 = performance.now();
    g.explode(P.clone ? P.clone() : { x: P.x, y: 1, z: P.z - 3 }, 6, 10);
    I.poll(dt); g.update(dt, dt); g.render(dt);
    explode = +(performance.now() - t0).toFixed(1);
  } catch (e) { explode = String(e).slice(0, 80); }

  const st = window.__prof;
  return {
    idle, zTimes, weap, fire, explode,
    programs: (g.renderer.info.programs || []).length,
    long: st.long, frames: st.frames,
    compile: st.compile, link: st.link, tex: st.tex, decode: st.decode, json: st.json,
  };
});
await snap('firstuse');

const result = {
  kind, cpuRate, url, viewport,
  boot: {
    titleMs: +boot.titleAt.toFixed(1),
    gameReady: boot.gameReady,
    long: stats(boot.long),
    frames: stats(boot.frames),
    json: stats(boot.json),
    decode: stats(boot.decode),
    compile: stats(boot.compile),
    link: stats(boot.link),
    tex: stats(boot.tex),
    topLong: (boot.long || []).slice().sort((a, b) => b.d - a.d).slice(0, 8),
    topFrames: (boot.frames || []).slice().sort((a, b) => b.d - a.d).slice(0, 8),
    topJson: (boot.json || []).slice().sort((a, b) => b.d - a.d).slice(0, 5),
  },
  ch1: {
    clickToPlayMs: +(+ch1.clickToPlay).toFixed(1),
    loadMs: ch1.loadMs != null ? +(+ch1.loadMs).toFixed(1) : null,
    kick: ch1.kick, name: ch1.name, step: ch1.step, state: ch1.state,
    long: stats(ch1.long),
    frames: stats(ch1.frames),
    topLong: (ch1.long || []).slice().sort((a, b) => b.d - a.d).slice(0, 8),
    topFrames: (ch1.frames || []).slice().sort((a, b) => b.d - a.d).slice(0, 8),
    programs: ch1.programs,
  },
  firstUse: {
    idle: stats((firstUse.idle || []).map(d => ({ d }))),
    spawnMax: Math.max(0, ...((firstUse.zTimes || []).map(z => z.d) || [0])),
    weapMax: Math.max(0, ...((firstUse.weap || []).map(z => z.d) || [0])),
    fire: stats((firstUse.fire || []).map(d => ({ d }))),
    explode: firstUse.explode,
    zTimes: (firstUse.zTimes || []).slice().sort((a, b) => b.d - a.d).slice(0, 10),
    weap: (firstUse.weap || []).slice().sort((a, b) => b.d - a.d),
    programs: firstUse.programs,
    longAll: stats(firstUse.long),
    framesAll: stats(firstUse.frames),
    json: stats(firstUse.json),
    decode: stats(firstUse.decode),
    compile: stats(firstUse.compile),
    link: stats(firstUse.link),
    tex: stats(firstUse.tex),
  },
  errs: errs.slice(0, 12),
  notFounds: notFounds.slice(0, 12),
};

writeFileSync(prefix + '.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
await b.close();
