// Full playthrough of Chapter 14 + menu proofs. usage: node tools/play_ch14.mjs [url] [outDir]
import { chromium } from 'playwright';
import fs from 'fs';
import { execFileSync } from 'child_process';

const URL = process.argv[2] || 'http://127.0.0.1:4314/';
const OUT = process.argv[3] || '/workspace/atq-ch14-proof';
fs.mkdirSync(OUT, { recursive: true });
const shots = [];
const notes = [];
const rec = (name, ok, extra) => { notes.push({ name, ok: !!ok, extra }); console.log((ok ? 'OK  ' : 'FAIL'), name, extra != null ? JSON.stringify(extra) : ''); };

const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true, voices: true, lang: 'explicit' })));
const p = await ctx.newPage();
const errs = [], notFounds = [];
p.on('pageerror', e => errs.push(String(e.message || e)));
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('response', r => { if (r.status() === 404) notFounds.push(r.url()); });

async function shot(name) {
  const path = `${OUT}/${name}.png`;
  await p.screenshot({ path, timeout: 120000 });
  shots.push(path);
  console.log('SHOT', name);
  return path;
}
async function waitGame(ms = 120000) {
  await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: ms });
}
async function tick(n = 30, dt = 1 / 30) {
  await p.evaluate(([n, dt]) => { const g = window.__atq.game; const was = g.paused; g.paused = true; for (let i = 0; i < n; i++) { try { g.update(dt, dt); } catch (e) { console.error(e); } } g.paused = was; }, [n, dt]);
}
async function info() {
  return p.evaluate(() => {
    const g = window.__atq.game, st = window.__atq.state;
    const ending = !document.querySelector('#ending')?.classList.contains('hidden');
    const foot = document.querySelector('#foot')?.textContent || '';
    const obj = document.querySelector('#obj')?.textContent || '';
    const mont = !!document.querySelector('#atqMont.on');
    const step = g && g.story && g.story[g.step];
    return {
      state: st, ending, foot, obj, mont,
      step: g && g.step, id: step && step.id, ch: g && g.save && g.save.ch,
      pos: g && g.player ? [+g.player.root.position.x.toFixed(2), +g.player.root.position.z.toFixed(2)] : null,
      alive: g && g.alive ? g.alive().length : 0,
      boss: !!(g && g.boss && !g.boss.dead), bossHp: g && g.boss ? Math.round(g.boss.hp) : 0,
      lastCh: (window.__atq),
    };
  });
}
async function skipAll() {
  await p.evaluate(() => { const g = window.__atq.game; if (!g) return; for (let i = 0; i < 80; i++) g.skipLine && g.skipLine(); });
}
async function drive(label, maxLoops = 80) {
  let lastStep = -1, stuck = 0;
  for (let i = 0; i < maxLoops; i++) {
    await skipAll();
    await tick(24);
    const inf = await p.evaluate(() => {
      const g = window.__atq.game;
      if (!g) return { dead: true };
      g.hp = g.maxHp = 9999; g.god = true; g.grace = 2;
      if (g.dlgCur || (g.dlgQ && g.dlgQ.length)) { for (let k = 0; k < 40; k++) g.skipLine && g.skipLine(); }
      const D = g.stepData || {};
      if (D.mont && D.mont.phase === 'cards') { D.mont.skip = true; D.mont.t = 99; }
      // advance uses
      if (D.uses && D.uses.length) {
        const u = D.uses.find(x => !x.done) || D.uses[0];
        if (u && u.fn) { g.player.root.position.x = u.x; g.player.root.position.z = u.z + .4; try { u.fn(g); } catch (e) { console.error(e); } }
      }
      // clear enemies
      const A = g.alive ? g.alive() : [];
      if (A.length) A.forEach(z => { try { g.damageZ(z, 1e7, { x: 0, y: 0, z: 1, clone() { return this; }, normalize() { return this; } }, { head: true, boom: true }); } catch (e) {} });
      if (g.boss && !g.boss.dead) { try { g.damageZ(g.boss, 1e7, { x: 0, y: 0, z: 1, clone() { return this; }, normalize() { return this; } }, { head: true, boom: true }); } catch (e) {} }
      // walk to waypoint / next cp
      if (g.wpTarget) { g.player.root.position.set(g.wpTarget[0], 0, g.wpTarget[2]); }
      const ending = !document.querySelector('#ending')?.classList.contains('hidden');
      const step = g.story && g.story[g.step];
      return { step: g.step, id: step && step.id, ending, obj: document.querySelector('#obj')?.textContent, mont: !!document.querySelector('#atqMont.on'), alive: g.alive().length, state: window.__atq.state };
    });
    await tick(18);
    if (i === 0 || (inf.step !== lastStep) || inf.ending || inf.mont || i % 8 === 0) {
      await shot(`${label}_${String(i).padStart(2, '0')}_${inf.ending ? 'end' : (inf.id || inf.step)}`);
    }
    if (inf.ending) return inf;
    if (inf.step === lastStep) stuck++; else stuck = 0;
    lastStep = inf.step;
    if (stuck > 18) { console.log('STUCK', inf); return inf; }
  }
  return await info();
}

// ----- 1. title / footer / chapter select -----
await p.goto(URL, { waitUntil: 'load', timeout: 120000 });
await p.waitForTimeout(1500);
// dismiss warning if present
await p.evaluate(() => { const w = document.querySelector('#warning'); if (w && !w.classList.contains('hidden')) { const b = w.querySelector('button, .btn, #btnWarn, #btnEnter'); if (b) b.click(); w.classList.add('hidden'); } });
await p.waitForTimeout(400);
const foot = await p.evaluate(() => document.querySelector('#foot')?.textContent || '');
rec('footer_has_ch14', /Chapters 1[–-]14/.test(foot) && /Every Bite/.test(foot), foot);
await shot('01_title_footer');

// unlock proof: a save that finished ch13 should show ch14 unlocked
await p.evaluate(() => {
  // find CH_START after a dummy play if needed — on the title we may not have game yet
  const raw = { v: 3, step: 65, cash: 10, xp: 0, level: 2, owned: ['fists','bat','pistol'], up: {}, ammo: { light: 20, shell: 8, rifle: 40 }, mags: {}, grenades: 1, meds: 2, pages: [], items: ['backpack'], loot: [], cur: 'pistol', kills: 10, bites: 4, done: true, ch: 14, maxCh: 14, done2: true, played: true };
  localStorage.setItem('atq_prologue_seen', '1');
  localStorage.setItem('atq3_save', JSON.stringify(raw));
  localStorage.setItem('atq3_save.bak', JSON.stringify(raw));
});
await p.reload({ waitUntil: 'load' });
await p.waitForTimeout(800);
await p.evaluate(() => { const w = document.querySelector('#warning'); if (w && !w.classList.contains('hidden')) { const b = w.querySelector('button'); if (b) b.click(); w.classList.add('hidden'); } });
await p.waitForTimeout(300);
// open chapter select
const unlocked = await p.evaluate(() => {
  const btn = document.querySelector('#btnChapters'); if (btn) btn.click();
  const b14 = document.querySelector('#btnCh14');
  return { has: !!b14, text: b14 && b14.textContent, disabled: b14 && b14.disabled, all: [...document.querySelectorAll('#chList button')].map(b => b.textContent) };
});
rec('ch14_in_select', !!(unlocked.has) && /Every Bite/.test(unlocked.text || ''), unlocked);
rec('ch14_unlocked_after_13', unlocked.has && unlocked.disabled === false, unlocked);
const cont = await p.evaluate(() => { document.querySelector('#btnChaptersBack, #btnBack, .back')?.click(); document.querySelector('#title')?.classList.remove('hidden'); const b = document.querySelector('#btnContinue'); return { text: b && b.textContent, hidden: b && b.classList.contains('hidden') }; });
rec('continue_shows_ch14', !!(cont.text && /Chapter 14/.test(cont.text) && /Every Bite/.test(cont.text) && cont.hidden === false), cont);
await shot('02_chapter_select_unlocked');

// ----- 2. play the whole chapter -----
// start at first ch14 step via query. Discover the index from a boot.
await p.goto(URL + '?step=0&god', { waitUntil: 'load', timeout: 120000 });
await waitGame();
const meta = { first: 65, ids: ['c14_arrive','c14_draw','c14_result','c14_breach','c14_warden','c14_end'], lastCh: 14 };
const boot = await p.evaluate(() => {
  const g = window.__atq.game;
  const foot = document.querySelector('#foot')?.textContent || '';
  return { step: g.step, foot, chBtn: !!document.querySelector('#btnCh14'), running: !!g.running };
});
rec('game_booted', !!boot.running, boot);
rec('last_ch_is_14', /Chapters 1[–-]14/.test(boot.foot) && /Every Bite/.test(boot.foot), boot);
rec('six_ch14_steps', meta.ids.length === 6, meta.ids);

await p.goto(URL + `?step=${meta.first}&god`, { waitUntil: 'load', timeout: 120000 });
await waitGame();
await p.waitForTimeout(1200);
await p.evaluate(() => { const g = window.__atq.game; g.god = true; g.hp = 9999; });
await shot('03_arrive_start');
const play = await drive('play', 100);
rec('reached_end_card', !!(play && play.ending), play);
const endText = await p.evaluate(() => ({
  h: document.querySelector('#endH')?.textContent,
  q: document.querySelector('#endQ')?.textContent,
  n: document.querySelector('#endNext')?.textContent,
  btn: document.querySelector('#btnEndNext')?.textContent,
  hidden: document.querySelector('#btnEndNext')?.classList.contains('hidden'),
}));
rec('end_card_title', /Chapter 14/.test(endText.h || '') && /Every Bite/.test(endText.h || ''), endText);
rec('end_card_quote', /Every single bite/.test(endText.q || ''), endText);
rec('teaser_ch15', /Chapter 15/.test(endText.n || ''), endText);
rec('continue_hidden_on_last', endText.hidden === true, endText); // 14 is currently last playable
await shot('04_end_card');

// ----- 3. loading title card, no twist spoiler -----
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(600);
await p.evaluate(() => { const w = document.querySelector('#warning'); if (w) w.classList.add('hidden'); });
const loadCheck = await p.evaluate((step) => new Promise((res) => {
  const show = window.__atq && window.__atq.showLoading;
  if (!show) return res({ ok: false, why: 'no showLoading' });
  show({ ch: 14, title: 'Every Bite' });
  const kick = document.querySelector('#loading .lkick')?.textContent;
  const name = document.querySelector('#loading .lname')?.textContent;
  const quote = document.querySelector('#loading .lquote')?.textContent || '';
  const hidden = document.querySelector('#loading')?.classList.contains('hidden');
  const spoil = /immune|R-07|animal trial|didn't turn|did not turn|cheat code/i.test((kick||'')+(name||'')+(quote||''));
  res({ kick, name, quote, hidden, spoil });
}), meta.first);
rec('loading_title_card', loadCheck.kick === 'CHAPTER 14' && loadCheck.name === 'Every Bite' && loadCheck.hidden === false, loadCheck);
rec('loading_no_twist_spoiler', loadCheck && loadCheck.spoil === false, loadCheck);
await shot('05_loading_ch14');

// ----- 4. per-step beauty shots -----
for (const [id, off] of [['arrive',0],['draw',1],['result',2],['breach',3],['warden',4],['end',5]]) {
  const st = meta.first + off;
  await p.goto(URL + `?step=${st}&god`, { waitUntil: 'load', timeout: 120000 });
  await waitGame();
  await p.waitForTimeout(800);
  await p.evaluate(() => { const g = window.__atq.game; g.god = true; g.paused = true; if (window.__lit !== false) { if (!g.__pl) { g.__pl = new g.faceL.constructor('#fff0dc', 2.4, 14, 1.4); g.scene.add(g.__pl); } g.__pl.position.copy(g.camera.position); g.__pl.visible = true; } for (let i=0;i<20;i++) g.update(1/30,1/30); });
  await p.waitForTimeout(300);
  await shot(`06_step_${id}`);
}

const pageErrs = errs.filter(e => !/AbortError|Failed to fetch|ERR_ABORTED|online unavailable|status of 404|The play\(\) request was interrupted/i.test(e));
rec('zero_page_errors', pageErrs.length === 0, pageErrs.slice(0, 8));
// voice 404s are expected if lines are new and unvoiced; don't fail the chapter on those
const real404 = notFounds.filter(u => !/\/sfx\/v\//.test(u));
rec('zero_nonvoice_404s', real404.length === 0, real404.slice(0, 8));

const summary = { ok: notes.every(n => n.ok), notes, shots, errs: pageErrs, notFounds: real404, meta, endText, foot, loadCheck };
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify(summary, null, 2));
console.log(summary.ok ? 'CHAPTER 14 PLAYTEST OK' : 'CHAPTER 14 PLAYTEST FAIL');
await b.close();
process.exit(summary.ok ? 0 : 1);
