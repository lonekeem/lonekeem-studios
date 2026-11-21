// v1.9.23 polish smoke: intro, menu cover, loading overlay, scored audio, story + MP still start.
// usage: node tools/smoke_v1923.mjs <url> <outdir>
import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.argv[2] || 'http://127.0.0.1:4173/';
const OUT = process.argv[3] || '/workspace/atq1923/docs/v1923-proof';
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox']
});
const opts = { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, hasTouch: true, isMobile: false };
const res = [];
const rec = (n, ok, d) => { res.push({ n, ok, d }); console.log(ok ? 'PASS' : 'FAIL', n, JSON.stringify(d)); };
const mk = async () => {
  const ctx = await b.newContext(opts);
  await ctx.addInitScript(() => localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true, music: 0.6, vol: 0.9 })));
  const p = await ctx.newPage();
  p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message.slice(0, 200)));
  p.on('console', m => {
    if (m.type() === 'error' && !/Failed to load resource|supabase|WebSocket|net::|AudioContext/.test(m.text())) p.errs.push(m.text().slice(0, 200));
  });
  p.on('dialog', d => d.accept());
  return p;
};

const p = await mk();
await p.goto(URL, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('#btnWarn');
const version = await p.evaluate(() => document.querySelector('#foot')?.textContent || '');
rec('footer is v1.9.23', /v1\.9\.23/.test(version), { version });

// dismiss warning -> intro
await p.click('#btnWarn');
await p.waitForSelector('#studio:not(.hidden)');
await p.waitForFunction(() => {
  const v = document.querySelector('#studioVid');
  return v && v.readyState >= 2 && v.currentTime > 0.05;
}, null, { timeout: 15000 }).catch(() => {});
await p.waitForTimeout(600);
await p.screenshot({ path: `${OUT}/1_intro.png` });
await p.screenshot({ path: `${OUT}/1_intro_closeup.png`, clip: { x: 420, y: 80, width: 440, height: 560 } });
const intro = await p.evaluate(() => {
  const v = document.querySelector('#studioVid');
  const st = document.querySelector('#studio');
  return {
    visible: st && !st.classList.contains('hidden'),
    src: v && (v.currentSrc || v.src),
    w: v && v.videoWidth,
    h: v && v.videoHeight,
    t: v && +v.currentTime.toFixed(2),
    paused: v && v.paused,
    muted: v && v.muted
  };
});
rec('intro video is playing and skippable', !!(intro.visible && intro.src && /lks-intro/.test(intro.src) && intro.h > intro.w && intro.t > 0 && !intro.paused), intro);

// skip to title
await p.click('#studio');
await p.waitForSelector('#title:not(.hidden)', { timeout: 8000 });
await p.waitForTimeout(400);
await p.screenshot({ path: `${OUT}/2_menu.png` });
await p.screenshot({ path: `${OUT}/2_menu_closeup.png`, clip: { x: 200, y: 0, width: 880, height: 520 } });
const menu = await p.evaluate(() => {
  const t = document.querySelector('#title');
  const bg = t && t.querySelector('.tbg');
  const cs = bg && getComputedStyle(bg);
  return {
    visible: t && !t.classList.contains('hidden'),
    bg: cs && cs.backgroundImage,
    logoHidden: (() => { const l = t.querySelector('.logo'); const s = l && getComputedStyle(l); return !l || s.width === '0px' || s.clip !== 'auto' || s.position === 'absolute'; })()
  };
});
rec('title menu uses the store cover', !!(menu.visible && /title-cover/.test(menu.bg || '')), menu);

const audio = await p.evaluate(async () => {
  const a = window.__atq && window.__atq.audio;
  if (!a) return { ok: false };
  try { await a.loadTracks(); } catch (e) { return { ok: false, err: String(e) }; }
  const keys = a._tbuf ? Object.keys(a._tbuf) : [];
  return {
    ok: !!(a._tbuf && a._tbuf.menu && a._tbuf.sting && a._tbuf.loading),
    keys,
    mode: a.mode,
    ctx: a.ctx && a.ctx.state,
    musicVol: a.s && a.s.music,
    menuPlaying: !!(a._tplay && a._tplay.menu),
    connectedToMusic: !!(a.music)
  };
});
rec('scored tracks decode and menu theme starts', !!(audio.ok && audio.ctx === 'running' && audio.menuPlaying && audio.musicVol > 0), audio);

// loading overlay
await p.evaluate(() => window.__atq.showLoading({ ch: 1, title: 'The Day Before' }));
await p.waitForSelector('#loading:not(.hidden)');
await p.waitForFunction(() => {
  const tip = document.querySelector('#loading .ltip span');
  const q = document.querySelector('#loading .lquote');
  return tip && tip.textContent.trim().length > 8 && q && q.textContent.trim().length > 8;
}, null, { timeout: 5000 });
await p.evaluate(() => window.__atq.setProgress(0.42));
await p.waitForTimeout(300);
await p.screenshot({ path: `${OUT}/3_loading.png` });
await p.screenshot({ path: `${OUT}/3_loading_closeup.png`, clip: { x: 240, y: 80, width: 800, height: 560 } });
const loading = await p.evaluate(() => {
  const el = document.querySelector('#loading');
  const a = window.__atq.audio;
  const bg = getComputedStyle(el.querySelector('.lbg')).backgroundImage;
  return {
    kick: el.querySelector('.lkick')?.textContent,
    name: el.querySelector('.lname')?.textContent,
    quote: el.querySelector('.lquote')?.textContent,
    tip: el.querySelector('.ltip span')?.textContent,
    bar: el.querySelector('.lb i')?.style.width,
    bg,
    mode: a && a.mode,
    loadingPlaying: !!(a && a._tplay && a._tplay.loading)
  };
});
rec('loading overlay shows chapter, bar, tip/quote and loading music', !!(loading.kick === 'CHAPTER 1' && /Day Before/.test(loading.name) && loading.quote && loading.tip && loading.bar === '42%' && /loading-bg/.test(loading.bg) && loading.loadingPlaying), loading);

await p.evaluate(() => window.__atq.hideLoading());

// story
await p.click('#btnNew');
const storyLoadVisible = await p.waitForSelector('#loading:not(.hidden)', { timeout: 3000 }).then(() => true).catch(() => false);
if (storyLoadVisible) {
  await p.screenshot({ path: `${OUT}/3b_loading_newgame.png` });
}
await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 120000 });
await p.waitForTimeout(2500);
const story = await p.evaluate(() => {
  const g = window.__atq.game;
  const a = window.__atq.audio;
  return { step: g.step, ch: g.save && g.save.ch, hp: g.hp, mood: a && a.mode, menuStill: !!(a && a._tplay && a._tplay.menu), loadingStill: !!(a && a._tplay && a._tplay.loading) };
});
await p.screenshot({ path: `${OUT}/4_story_ch1.png` });
rec('story mode starts (New Game)', story.ch === 1 && story.hp > 0 && !story.menuStill && !story.loadingStill, story);

// back to title then MP
await p.evaluate(() => { try { window.__atq && window.__atq.game && (window.__atq.game.paused = true); } catch (e) {} });
await p.goto(URL, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('#btnWarn');
await p.click('#btnWarn');
await p.waitForSelector('#studio:not(.hidden)');
await p.click('#studio');
await p.waitForSelector('#btnMP', { timeout: 15000 });
await p.click('#btnMP');
const creatorOk = await p.waitForFunction(() => window.__mpCreator && window.__mpCreator.av(), null, { timeout: 120000 }).then(() => true).catch(() => false);
await p.waitForTimeout(1500);
await p.screenshot({ path: `${OUT}/5_mp_creator.png` });
rec('multiplayer character creator starts', creatorOk, { creatorOk });
if (creatorOk) {
  await p.evaluate(() => window.__mpCreator.close(true));
  const townOk = await p.waitForFunction(() => window.__mpTown, null, { timeout: 180000 }).then(() => true).catch(() => false);
  await p.waitForTimeout(2000);
  const town = await p.evaluate(() => {
    const t = window.__mpTown;
    return t ? { hasMe: !!(t.me && t.me.av), loadingHidden: document.getElementById('loading')?.classList.contains('hidden') } : { hasMe: false };
  });
  await p.screenshot({ path: `${OUT}/6_mp_town.png` });
  rec('multiplayer town starts', !!(townOk && town.hasMe && town.loadingHidden), { townOk, ...town });
}

rec('no page or console errors', !p.errs.length, p.errs);
fs.writeFileSync(`${OUT}/smoke.json`, JSON.stringify(res, null, 2));
await p.context().close();
await b.close();
process.exit(res.some(r => !r.ok) ? 1 : 0);
