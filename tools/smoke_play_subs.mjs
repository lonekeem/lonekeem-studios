// In-gameplay subtitles are off by default: voices play, the #dlg box stays hidden
// while the player can move. Cutscenes still show the box. A line with no voice
// still shows its text. Never joins the lobby or posts a score.
// usage: node tools/smoke_play_subs.mjs <url> <outdir>
import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.argv[2] || 'http://127.0.0.1:5372/';
const OUT = process.argv[3] || '/workspace/atq-chload-proof/playsubs';
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
  const save = { v: 3, step: 7, cash: 0, xp: 0, level: 1, owned: ['fists', 'bat', 'pistol'], up: {}, ammo: { light: 48, shell: 0, rifle: 0 }, mags: {}, grenades: 0, meds: 1, pages: [], items: ['backpack'], loot: [], cur: 'pistol', kills: 0, done: true, ch: 2, done2: false, maxCh: 13, played: true };
  localStorage.setItem('atq3_save', JSON.stringify(save));
  localStorage.setItem('atq3_save.bak', JSON.stringify(save));
});
const p = await ctx.newPage();
p.setDefaultTimeout(180000);
const errs = [];
const notFounds = [];
p.on('pageerror', e => errs.push(String(e.message || e).slice(0, 300)));
p.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text().slice(0, 240)); });
p.on('response', r => { if (r.status() === 404) notFounds.push(r.url()); });
p.on('dialog', d => d.accept());
await p.route(/leaderboard|postScore|submitScore|supabase\.co|firestore|games\/score/i, route => route.abort());

const recs = [];
const rec = (n, ok, d) => { recs.push(!!ok); console.log(ok ? 'PASS' : 'FAIL', n, d != null ? JSON.stringify(d).slice(0, 700) : ''); return !!ok; };

await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 180000 });
const warn = p.locator('#btnWarn');
if (await warn.count()) { await warn.click(); await p.waitForTimeout(400); }
await p.locator('#studio').click({ timeout: 5000 }).catch(() => {});
await p.waitForSelector('#title:not(.hidden)', { timeout: 180000 });

// Settings: checkbox exists and is off by default
await p.locator('#btnSettings').click();
await p.locator('#btnSettings').click();
await p.waitForSelector('#settings:not(.hidden)', { timeout: 10000 });
const set = await p.evaluate(() => {
  const el = document.getElementById('sPlaySubs');
  const lab = el && (el.closest('label')?.textContent || '').replace(/\s+/g, ' ').trim();
  return { exists: !!el, checked: !!(el && el.checked), label: lab };
});
await p.screenshot({ path: `${OUT}/settings.png` });
rec('settings_toggle_off', set.exists && set.checked === false && /Subtitles during play/i.test(set.label || ''), set);
await p.locator('#settings .back, #settings button.back, #settings .primary').first().click().catch(() => {});
// go back to title if still on settings
await p.evaluate(() => { const b = document.querySelector('#settings button.back'); if (b) b.click(); });
await p.waitForSelector('#title:not(.hidden)', { timeout: 15000 }).catch(() => {});

await p.locator('#btnStory').click();
await p.locator('#btnChapters').click();
await p.waitForSelector('#chapters:not(.hidden)', { timeout: 15000 });
await p.locator('#btnCh2').click();
await p.waitForFunction(() => {
  const A = window.__atq || {};
  const el = document.getElementById('loading');
  const hidden = !el || el.classList.contains('hidden');
  return hidden && A.state === 'play' && A.game && A.game.running;
}, { timeout: 180000 });

// wait until a lettered dialogue line is current (ch2 opening talk)
const ready = await p.waitForFunction(() => {
  const g = window.__atq && window.__atq.game;
  if (!g || !g.dlgCur) return false;
  const t = (g.dlgCur.vtext || g.dlgCur.text || '');
  return /[A-Za-z0-9]/.test(t);
}, { timeout: 30000 }).then(() => true).catch(() => false);

const snap = await p.evaluate(() => {
  const g = window.__atq.game;
  const d = document.getElementById('dlg');
  const cs = d ? getComputedStyle(d) : null;
  const A = g.audio || {};
  const now = A.ctx ? A.ctx.currentTime : 0;
  return {
    ready: true,
    who: g.dlgCur && g.dlgCur.who,
    text: g.dlgCur && (g.dlgCur.text || '').slice(0, 80),
    cut: !!g.cut,
    playSubs: !!g.settings.playSubs,
    dlgOn: !!(d && d.classList.contains('on')),
    dlgOpacity: cs ? parseFloat(cs.opacity) : null,
    dlgPointer: cs ? cs.pointerEvents : null,
    voiceOn: !!(A.vSrc) || (now < (A.vEnd || 0)),
    vEnd: A.vEnd || 0,
    barkOp: (document.getElementById('bark') && getComputedStyle(document.getElementById('bark')).opacity) || '0',
  };
});
await p.screenshot({ path: `${OUT}/play_no_box.png` });
console.log('SHOT', `${OUT}/play_no_box.png`);
rec('gameplay_ready', ready && !snap.cut && snap.who, snap);
rec('voice_playing_no_box', snap.voiceOn && snap.dlgOn === false && (snap.dlgOpacity == null || snap.dlgOpacity < 0.15), snap);

// Missing/failed voice: show the text box briefly even during play
await p.evaluate(() => {
  const g = window.__atq.game;
  g.dlgQ = [];
  g.dlgCur = null;
  g.say([['nia', 'ZZZ_NO_VOICE_LINE_FOR_FALLBACK_TEST']]);
});
const fb = await p.waitForFunction(() => {
  const g = window.__atq && window.__atq.game;
  const d = document.getElementById('dlg');
  if (!g || !g.dlgCur) return false;
  if (!/ZZZ_NO_VOICE/.test(g.dlgCur.text || '')) return false;
  // wait until the voice() promise has settled (box should turn on)
  return d && d.classList.contains('on');
}, { timeout: 8000 }).then(() => true).catch(() => false);
const fbSnap = await p.evaluate(() => {
  const g = window.__atq.game;
  const d = document.getElementById('dlg');
  return { dlgOn: !!(d && d.classList.contains('on')), text: g.dlgCur && g.dlgCur.text, cut: !!g.cut };
});
await p.screenshot({ path: `${OUT}/fallback_box.png` });
rec('missing_voice_shows_box', fb && fbSnap.dlgOn && !fbSnap.cut, fbSnap);

// Cutscene (player can't move): box stays visible even with playSubs off
await p.evaluate(() => {
  const g = window.__atq.game;
  const P = g.player.root.position;
  g.cut = { anim: 'Idle_Loop', cam: P.clone().setY(1.8).add({ x: 2, y: 0, z: 2 }), look: P.clone().setY(1.2) };
  g.dlgQ = []; g.dlgCur = null;
  document.getElementById('dlg').classList.remove('on');
  g.say([['nia', "Dad's coming, right? Say he's coming."]]);
});
await p.waitForTimeout(600);
const cutSnap = await p.evaluate(() => {
  const g = window.__atq.game;
  const d = document.getElementById('dlg');
  const A = g.audio || {};
  const now = A.ctx ? A.ctx.currentTime : 0;
  return {
    cut: !!g.cut,
    dlgOn: !!(d && d.classList.contains('on')),
    who: g.dlgCur && g.dlgCur.who,
    text: g.dlgCur && (g.dlgCur.text || '').slice(0, 80),
    voiceOn: !!(A.vSrc) || (now < (A.vEnd || 0)),
  };
});
await p.screenshot({ path: `${OUT}/cutscene_box.png` });
rec('cutscene_shows_box', cutSnap.cut && cutSnap.dlgOn && cutSnap.who === 'nia', cutSnap);

const pageErrs = errs.filter(e => !/AbortError|Failed to fetch|ERR_ABORTED|online unavailable|status of 404/i.test(e));
rec('zero_page_errors', pageErrs.length === 0, pageErrs.slice(0, 8));
rec('zero_404s', notFounds.length === 0, notFounds.slice(0, 8));

const fail = recs.some(x => !x);
console.log(fail ? 'FAIL PLAY-SUBS SMOKE' : 'PLAY-SUBS SMOKE OK', 'errs', pageErrs.length, '404s', notFounds.length);
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ ok: !fail, snap, fbSnap, cutSnap, set, errs: pageErrs, notFounds }, null, 2));
await b.close();
process.exit(fail ? 1 : 0);
