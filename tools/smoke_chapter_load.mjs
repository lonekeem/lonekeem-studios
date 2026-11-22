// Chapter-load + story-audio leak smoke.
// Measures the longest frame / long-task around chapter select, confirms the loading
// overlay paints, then story -> menu -> solo town with no leftover story audio.
// Never joins the lobby or posts a score.
// usage: node tools/smoke_chapter_load.mjs <url> <outdir> [label]
import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.argv[2] || 'http://127.0.0.1:5371/';
const OUT = process.argv[3] || '/workspace/atq-chload-proof';
const LABEL = process.argv[4] || 'run';
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => {
  localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true, hints: false, ctl: 'twin', hudv2: false, music: 0.6, vol: 0.9, voices: true }));
  localStorage.setItem('atq_prologue_seen', '1');
  localStorage.setItem('atq.profile.v1', JSON.stringify({ v: 1, name: 'Test', createdAt: Date.now() }));
});
const p = await ctx.newPage();
p.setDefaultTimeout(180000);
const errs = [];
const notFounds = [];
p.on('pageerror', e => errs.push(String(e.message || e).slice(0, 300)));
p.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text().slice(0, 240)); });
p.on('response', r => { if (r.status() === 404) notFounds.push(r.url()); });
p.on('dialog', d => d.accept());

// Never post scores or join a remote lobby
await p.route(/leaderboard|postScore|submitScore|supabase\.co|firestore|games\/score/i, route => route.abort());

const results = [];
const rec = (n, ok, d) => { results.push(!!ok); console.log(ok ? 'PASS' : 'FAIL', n, d != null ? JSON.stringify(d).slice(0, 600) : ''); return !!ok; };
const shot = async (n) => { const f = `${OUT}/${LABEL}_${n}.png`; await p.screenshot({ path: f }); console.log('SHOT', f); return f; };

const audit = () => p.evaluate(() => {
  const A = window.__atq && window.__atq.audio;
  if (!A) return { missing: true, storyPlaying: false };
  if (typeof A.audit === 'function') return A.audit();
  return {
    mode: A.mode || null,
    session: A._session || 'none',
    rainOn: !!A.rainOn,
    beatOn: !!A._bt,
    droneOn: !!A._dr,
    engineOn: !!(A._en || A.truckSrc),
    voiceOn: !!A.vSrc,
    loops: ['rainSrc', 'windSrc', 'truckSrc', 'tireSrc'].filter(k => A[k]).map(k => k),
    loopCount: ['rainSrc', 'windSrc', 'truckSrc', 'tireSrc'].filter(k => A[k]).length + (A._loops ? A._loops.size : 0),
    storyPlaying: !!(A.rainSrc || A._bt || A._dr || A._en || A.truckSrc || A.tireSrc || A.vSrc || (A._loops && A._loops.size) || A.rainOn),
    gameRunning: !!(window.__atq.game && window.__atq.game.running),
    state: window.__atq.state,
  };
});

await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 180000 });
const warn = p.locator('#btnWarn');
if (await warn.count()) { await warn.click(); await p.waitForTimeout(400); }
await p.locator('#studio').click({ timeout: 5000 }).catch(() => {});
await p.waitForSelector('#title:not(.hidden)', { timeout: 180000 });
await p.waitForTimeout(800);
await shot('title');

// arm observers before the chapter click
await p.evaluate(() => {
  const st = window.__lt = { long: [], frames: [], clickAt: null, loadShownAt: null, loadHidAt: null, loadVis: false, maxBar: 0, kick: '', name: '' };
  try {
    const po = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) st.long.push({ d: +e.duration.toFixed(1), t: +e.startTime.toFixed(1) });
    });
    po.observe({ type: 'longtask', buffered: true });
    st.po = po;
  } catch (e) { /* longtask may be missing */ }
  let last = performance.now();
  const tick = (t) => {
    const d = t - last; last = t;
    if (st.clickAt != null) st.frames.push(+d.toFixed(1));
    const el = document.getElementById('loading');
    const vis = !!(el && !el.classList.contains('hidden') && getComputedStyle(el).display !== 'none');
    if (vis) {
      st.loadVis = true;
      if (st.clickAt != null && st.loadShownAt == null) st.loadShownAt = +(t - st.clickAt).toFixed(1);
      const bar = document.querySelector('#loading .lb i');
      if (bar) st.maxBar = Math.max(st.maxBar, parseFloat(bar.style.width) || 0);
      const kick = document.querySelector('#loading .lkick');
      const name = document.querySelector('#loading .lname');
      if (kick) st.kick = kick.textContent || st.kick;
      if (name) st.name = name.textContent || st.name;
    } else if (st.loadShownAt != null && st.loadHidAt == null && st.clickAt != null) {
      st.loadHidAt = +(t - st.clickAt).toFixed(1);
    }
    if (st.arm) requestAnimationFrame(tick);
  };
  st.arm = true;
  requestAnimationFrame(tick);
});

const chBtn = p.locator('#btnChapters');
await chBtn.click();
await p.waitForSelector('#chapters:not(.hidden)', { timeout: 15000 });
await shot('chapters');

const loadWait = p.waitForFunction(() => {
  const el = document.getElementById('loading');
  return el && !el.classList.contains('hidden');
}, { timeout: 8000 }).catch(() => null);

await p.evaluate(() => { if (window.__lt) window.__lt.clickAt = performance.now(); });
await p.locator('#btnCh1').click();
const sawLoad = !!(await loadWait);
if (sawLoad) {
  await p.waitForTimeout(80);
  await shot('loading');
  const layout = await p.evaluate(() => {
    const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { t: +b.top.toFixed(1), b: +b.bottom.toFixed(1), l: +b.left.toFixed(1), r: +b.right.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
    const q = (s) => document.querySelector(s);
    const ov = (a, b) => !!(a && b && a.t < b.b - 0.5 && b.t < a.b - 0.5 && a.l < b.r - 0.5 && b.l < a.r - 0.5);
    const brand = r(q('#loading .lbrand')), center = r(q('#loading .lcenter')), status = r(q('#loading .lt')), bar = r(q('#loading .lb')), tipLab = r(q('#loading .ltip b')), tipTxt = r(q('#loading .ltip span'));
    const gaps = {
      statusToBar: status && bar ? +(bar.t - status.b).toFixed(1) : null,
      barToTip: bar && tipLab ? +(tipLab.t - bar.b).toFixed(1) : null,
      labToTxt: tipLab && tipTxt ? +(tipTxt.t - tipLab.b).toFixed(1) : null,
      quoteToStatus: r(q('#loading .lquote')) && status ? +(status.t - r(q('#loading .lquote')).b).toFixed(1) : null,
    };
    const overlaps = {
      statusBar: ov(status, bar), statusTipLab: ov(status, tipLab), statusTipTxt: ov(status, tipTxt),
      barTipLab: ov(bar, tipLab), barTipTxt: ov(bar, tipTxt), tipLabTxt: ov(tipLab, tipTxt),
      centerFoot: ov(center, status) || ov(center, bar) || ov(center, tipLab) || ov(center, tipTxt),
      brandCenter: ov(brand, center),
    };
    return { vw: innerWidth, vh: innerHeight, brand, center, status, bar, tipLab, tipTxt, gaps, overlaps };
  });
  const ovAny = layout.overlaps && Object.values(layout.overlaps).some(Boolean);
  const tight = layout.gaps && (layout.gaps.statusToBar < 6 || layout.gaps.barToTip < 8 || layout.gaps.labToTxt < 4);
  rec('loading_layout_clean', !ovAny && !tight, layout);
}

// wait until play (loading hidden and game running) or timeout
const ready = await p.waitForFunction(() => {
  const A = window.__atq || {};
  const el = document.getElementById('loading');
  const hidden = !el || el.classList.contains('hidden');
  return hidden && A.state === 'play' && A.game && A.game.running;
}, { timeout: 180000 }).then(() => true).catch(() => false);

await p.waitForTimeout(400);
const metrics = await p.evaluate(() => {
  const st = window.__lt || {};
  if (st.arm) st.arm = false;
  const frames = st.frames || [];
  const long = st.long || [];
  const maxFrame = frames.reduce((a, b) => Math.max(a, b), 0);
  const maxLong = long.reduce((a, e) => Math.max(a, e.d), 0);
  const longOver50 = long.filter(e => e.d >= 50).length;
  const longOver200 = long.filter(e => e.d >= 200).length;
  const longOver500 = long.filter(e => e.d >= 500).length;
  return {
    loadVis: !!st.loadVis,
    loadShownAt: st.loadShownAt,
    loadHidAt: st.loadHidAt,
    maxBar: st.maxBar,
    kick: st.kick,
    name: st.name,
    maxFrame: +maxFrame.toFixed(1),
    maxLong: +maxLong.toFixed(1),
    longOver50, longOver200, longOver500,
    nFrames: frames.length,
    nLong: long.length,
    topLong: long.slice().sort((a, b) => b.d - a.d).slice(0, 8),
    topFrames: frames.slice().sort((a, b) => b - a).slice(0, 8),
    state: window.__atq && window.__atq.state,
    running: !!(window.__atq && window.__atq.game && window.__atq.game.running),
    step: window.__atq && window.__atq.game && window.__atq.game.step,
  };
});
await shot('chapter1');
const inStory = ready && metrics.state === 'play';
rec('chapter_ready', inStory, { state: metrics.state, running: metrics.running, step: metrics.step });
rec('loading_shown', metrics.loadVis || sawLoad, { sawLoad, loadShownAt: metrics.loadShownAt, kick: metrics.kick, name: metrics.name, maxBar: metrics.maxBar });
console.log('METRICS', JSON.stringify(metrics));
fs.writeFileSync(`${OUT}/${LABEL}_metrics.json`, JSON.stringify(metrics, null, 2));

const audStory = await audit();
console.log('AUDIT_STORY', JSON.stringify(audStory));
console.log('INFO story_audio_in_chapter', JSON.stringify(audStory));

// leave chapter to menu
const pause = p.locator('#btnPause');
if (await pause.count()) await pause.click({ force: true }).catch(() => {});
await p.waitForTimeout(300);
const quit = p.locator('#btnQuit');
if (await quit.isVisible().catch(() => false)) await quit.click();
else {
  await p.evaluate(() => {
    const b = document.getElementById('btnQuit');
    if (b) b.click();
  });
}
await p.waitForSelector('#title:not(.hidden)', { timeout: 30000 });
await p.waitForTimeout(500);
await shot('menu_after_story');
const audMenu = await audit();
console.log('AUDIT_MENU', JSON.stringify(audMenu));
const menuClean = audMenu && !audMenu.storyPlaying && !audMenu.rainOn && !audMenu.beatOn && !audMenu.engineOn && !audMenu.voiceOn && audMenu.session !== 'story' && !audMenu.gameRunning;
rec('no_story_audio_on_menu', menuClean, audMenu);

// enter town solo: stay offline so goOnline returns immediately, never a lobby/score
await p.evaluate(() => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
});
const mp = p.locator('#btnMP');
rec('has_town_button', await mp.count() > 0, { text: await mp.textContent().catch(() => '') });
if (await mp.count()) {
  const tab = p.locator('.mtabs [data-tab="online"]');
  if (await tab.count()) await tab.click();
  await mp.click();
  // wait for town (solo) to appear
  const townOk = await p.waitForFunction(() => !!(window.__mpTown), { timeout: 180000 }).then(() => true).catch(() => false);
  await p.waitForTimeout(800);
  await shot('town');
  rec('town_entered_solo', townOk && await p.evaluate(() => !!(window.__mpTown)), {});
} else {
  rec('town_entered_solo', false, { reason: 'no btnMP' });
}
const audTown = await audit();
console.log('AUDIT_TOWN', JSON.stringify(audTown));
const townClean = audTown && !audTown.storyPlaying && !audTown.rainOn && !audTown.beatOn && !audTown.engineOn && !audTown.voiceOn && audTown.session !== 'story' && !audTown.gameRunning;
rec('no_story_audio_in_town', townClean, audTown);

// bg-pause return while in town should not restart story audio
await p.evaluate(() => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
  document.dispatchEvent(new Event('visibilitychange'));
  window.dispatchEvent(new Event('pagehide'));
});
await p.waitForTimeout(250);
await p.evaluate(() => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  document.dispatchEvent(new Event('visibilitychange'));
  window.dispatchEvent(new Event('pageshow'));
});
await p.waitForTimeout(400);
const audTown2 = await audit();
console.log('AUDIT_TOWN_AFTER_BG', JSON.stringify(audTown2));
rec('bg_return_no_story_audio', audTown2 && !audTown2.storyPlaying && audTown2.session !== 'story' && !audTown2.rainOn && !audTown2.beatOn, audTown2);

const pageErrs = errs.filter(e => !/AbortError|Failed to fetch|ERR_ABORTED|online unavailable|status of 404/i.test(e));
rec('zero_page_errors', pageErrs.length === 0, pageErrs.slice(0, 8));
rec('zero_404s', notFounds.length === 0, notFounds.slice(0, 8));

const fail = results.some(x => !x);
console.log(fail ? 'FAIL CHAPTER-LOAD SMOKE' : 'CHAPTER-LOAD SMOKE OK', LABEL, 'errs', pageErrs.length);
fs.writeFileSync(`${OUT}/${LABEL}_summary.json`, JSON.stringify({ label: LABEL, ok: !fail, metrics, audStory, audMenu, audTown, audTown2, errs: pageErrs, notFounds }, null, 2));
await b.close();
process.exit(fail ? 1 : 0);
