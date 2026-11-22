// Headless check: each inventory gun plays its own shot buffer; class reload/click too; 0 page errors.
// usage: node tools/smoke_gun_sfx.mjs <url> <outdir>
import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.argv[2] || 'http://127.0.0.1:5341/';
const OUT = process.argv[3] || '/workspace/atq-guns-proof';
fs.mkdirSync(OUT, { recursive: true });

const GUNS = ['pistol', 'revolver', 'smg', 'shotgun', 'rifle', 'saw', 'lever', 'auto12', 'handcannon', 'harpoon', 'minigun', 'sniper', 'crossbow', 'flamer', 'launcher'];
const RELOAD_OF = { pistol: 'pistol', handcannon: 'pistol', revolver: 'revolver', smg: 'smg', shotgun: 'shotgun', auto12: 'shotgun', rifle: 'rifle', sniper: 'rifle', saw: 'heavy', minigun: 'heavy', lever: 'lever', crossbow: 'crossbow', flamer: 'flamer', launcher: 'launcher', harpoon: 'harpoon' };
const CLICK_OF = { pistol: 'pistol', smg: 'pistol', handcannon: 'pistol', revolver: 'revolver', shotgun: 'shotgun', auto12: 'shotgun', rifle: 'rifle', saw: 'rifle', minigun: 'rifle', lever: 'rifle', sniper: 'rifle', crossbow: 'pistol', flamer: 'rifle', launcher: 'shotgun', harpoon: 'rifle' };

const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => {
  localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'med', gore: true, hints: false, vol: 1, music: 0, sfxVol: 1, voices: false }));
  localStorage.setItem('atq_prologue_seen', '1');
});
const p = await ctx.newPage();
p.setDefaultTimeout(180000);
const errs = [];
p.on('pageerror', e => errs.push(String(e.message || e).slice(0, 240)));
p.on('dialog', d => d.accept());

await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 180000 });
const warn = p.locator('#btnWarn');
if (await warn.count()) { await warn.click(); await p.waitForTimeout(300); }
await p.locator('#studio').click({ timeout: 5000 }).catch(() => {});
await p.waitForSelector('#title:not(.hidden)', { timeout: 120000 });
// unlock audio from a user gesture
await p.click('#title');
await p.waitForTimeout(400);

const result = await p.evaluate(async ({ GUNS, RELOAD_OF, CLICK_OF }) => {
  const audio = window.__atq && window.__atq.audio;
  if (!audio) return { ok: false, reason: 'no audio' };
  audio._bgSuspended = false;
  try { audio.init(); audio.unlock(); if (audio.ctx && audio.ctx.state !== 'running') await audio.ctx.resume(); } catch (e) { return { ok: false, reason: String(e) }; }
  // wait for buffers
  const names = GUNS.map(id => 'gun_' + id).concat(
    [...new Set(Object.values(RELOAD_OF))].map(c => 'reload_' + c),
    [...new Set(Object.values(CLICK_OF))].map(c => 'click_' + c),
  );
  const start = Date.now();
  while (Date.now() - start < 20000) {
    const missing = names.filter(n => !audio.bufs || !audio.bufs[n]);
    if (!missing.length) break;
    await Promise.all(missing.map(n => audio.load(n)));
    await new Promise(r => setTimeout(r, 150));
  }
  const loaded = {};
  for (const n of names) loaded[n] = !!(audio.bufs && audio.bufs[n] && audio.bufs[n].duration > 0);
  const missing = names.filter(n => !loaded[n]);

  const played = [];
  const orig = audio.play.bind(audio);
  audio.play = function (name, o) {
    const n = name;
    const ret = orig(name, o);
    // play may rewrite family names; record the requested name and whether a buffer existed
    played.push({ asked: n, resolved: (this.bufs && (this.bufs[n] ? n : null)), started: !!(ret && !ret.dummy) });
    return ret;
  };

  const shots = [];
  for (const id of GUNS) {
    played.length = 0;
    audio.shot(id);
    const gunPlays = played.filter(x => String(x.asked).startsWith('gun_'));
    const ok = gunPlays.some(x => x.asked === 'gun_' + id && x.started);
    shots.push({ id, ok, plays: played.map(x => x.asked) });
  }
  const clicks = [];
  for (const id of GUNS) {
    played.length = 0;
    audio.click(id);
    const expect = 'click_' + CLICK_OF[id];
    const ok = played.some(x => x.asked === expect && x.started);
    clicks.push({ id, ok, expect, plays: played.map(x => x.asked) });
  }
  const reloads = [];
  for (const id of GUNS) {
    played.length = 0;
    audio.reload(id);
    const expect = 'reload_' + RELOAD_OF[id];
    const ok = played.some(x => x.asked === expect && x.started);
    reloads.push({ id, ok, expect, plays: played.map(x => x.asked) });
  }

  // muted / background-pause: shots should no-op while suspended
  played.length = 0;
  audio._bgSuspended = true;
  audio.shot('pistol');
  audio.click('pistol');
  audio.reload('pistol');
  const pausedBlocked = played.length === 0;
  audio._bgSuspended = false;

  return { missing, loaded, shots, clicks, reloads, pausedBlocked, ctx: audio.ctx && audio.ctx.state };
}, { GUNS, RELOAD_OF, CLICK_OF });

const rec = (n, ok, d) => { console.log(ok ? 'PASS' : 'FAIL', n, d ? JSON.stringify(d).slice(0, 400) : ''); return !!ok; };
let pass = 0, fail = 0;
const mark = (n, ok, d) => { if (ok) pass++; else fail++; rec(n, ok, d); };

mark('no page errors', errs.length === 0, errs);
mark('audio unlocked', !!(result && result.ctx), result && result.ctx);
mark('all buffers loaded', result && (!result.missing || !result.missing.length), result && result.missing);
if (result && result.shots) for (const s of result.shots) mark('shot ' + s.id, s.ok, s.plays);
if (result && result.clicks) for (const s of result.clicks) mark('click ' + s.id, s.ok, { expect: s.expect, plays: s.plays });
if (result && result.reloads) for (const s of result.reloads) mark('reload ' + s.id, s.ok, { expect: s.expect, plays: s.plays });
mark('paused shots silent', result && result.pausedBlocked, result && { pausedBlocked: result.pausedBlocked });

const summary = { pass, fail, errors: errs, result };
fs.writeFileSync(`${OUT}/smoke_gun_sfx.json`, JSON.stringify(summary, null, 2));
console.log('SUMMARY', JSON.stringify({ pass, fail, errors: errs.length }));
await b.close();
process.exit(fail ? 1 : 0);
