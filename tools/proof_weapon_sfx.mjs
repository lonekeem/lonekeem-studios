// Headless before/after: which sound id plays for pistol, rifle, shotgun, flamer, saw, chainsaw, ally shots.
// Also records synth fallback (old oscillator gun) and loop start for the flamethrower.
// usage: node proof_weapon_sfx.mjs <url> <outfile.json>
import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.argv[2] || 'http://127.0.0.1:5178/';
const OUT = process.argv[3] || '/workspace/atq-sfx-proof/before.json';

const GUNS = ['pistol', 'rifle', 'shotgun', 'flamer', 'saw'];
const ALLIES = ['pistol', 'shotgun', 'rifle', 'smg'];

const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => {
  localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'med', gore: true, hints: false, vol: 1, music: 0, sfxVol: 1, voices: false }));
  localStorage.setItem('atq_prologue_seen', '1');
  localStorage.setItem('atq.gate', JSON.stringify({ birthYear: 1990, agreedVersion: 1 }));
});
const p = await ctx.newPage();
p.setDefaultTimeout(180000);
const errs = [];
const sfxReqs = [];
p.on('pageerror', e => errs.push(String(e.message || e).slice(0, 240)));
p.on('dialog', d => d.accept());
p.on('request', req => {
  const u = req.url();
  if (u.includes('/sfx/') && (u.includes('gun_') || u.includes('flame') || u.includes('melee_saw') || u.includes('cloth') || u.includes('punch') || u.includes('bat'))) {
    const i = u.indexOf('/sfx/');
    sfxReqs.push(u.slice(i));
  }
});

await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 180000 });
for (let i = 0; i < 40; i++) {
  const r = await p.evaluate(() => {
    const s = document.getElementById('gateSkip');
    if (s && s.offsetParent) { s.click(); return 'skip'; }
    const w = document.getElementById('btnWarn');
    if (w && w.offsetParent) { w.click(); return 'warn'; }
    const st = document.getElementById('studio');
    if (st && st.offsetParent && !st.classList.contains('hidden')) { st.click(); return 'studio'; }
    const t = document.getElementById('title');
    const l = document.getElementById('loading');
    const audio = window.__atq && window.__atq.audio;
    if (audio) return 'audio';
    return (t && !t.classList.contains('hidden') && (!l || l.classList.contains('hidden'))) ? 'ok' : '';
  });
  if (r === 'audio' || r === 'ok') break;
  await p.waitForTimeout(400);
}
await p.evaluate(() => { const t = document.getElementById('title'); if (t) t.click(); }).catch(() => {});
await p.waitForFunction(() => window.__atq && window.__atq.audio, null, { timeout: 120000 });
await p.waitForTimeout(400);

const result = await p.evaluate(async ({ GUNS, ALLIES }) => {
  const audio = window.__atq && window.__atq.audio;
  if (!audio) return { ok: false, reason: 'no audio' };
  audio._bgSuspended = false;
  try { audio.init(); audio.unlock && audio.unlock(); if (audio.ctx && audio.ctx.state !== 'running') await audio.ctx.resume(); } catch (e) { return { ok: false, reason: String(e) }; }

  const need = ['gun_pistol', 'gun_rifle', 'gun_shotgun', 'gun_smg', 'gun_flamer', 'gun_saw', 'flame_loop', 'melee_saw', 'cloth0', 'punch0', 'bat0', 'flesh0'];
  const start = Date.now();
  while (Date.now() - start < 15000) {
    const missing = need.filter(n => !audio.bufs || !audio.bufs[n]);
    if (!missing.length) break;
    await Promise.all(missing.map(n => audio.load(n)));
    await new Promise(r => setTimeout(r, 120));
  }
  const loaded = {};
  for (const n of need) loaded[n] = !!(audio.bufs && audio.bufs[n] && audio.bufs[n].duration > 0);

  const log = [];
  const origPlay = audio.play.bind(audio);
  audio.play = function (name, o) {
    const ret = origPlay(name, o);
    log.push({
      fn: 'play', asked: name, loop: !!(o && o.loop),
      started: !!(ret && !ret.dummy),
      resolved: ret && ret._atqName ? ret._atqName : name,
    });
    return ret;
  };
  let synthShots = 0;
  if (typeof audio.noise === 'function') {
    const origNoise = audio.noise.bind(audio);
    audio.noise = function (...a) { log.push({ fn: 'synth.noise', args: a.slice(0, 3) }); synthShots++; return origNoise(...a); };
  }
  if (typeof audio.tone === 'function') {
    const origTone = audio.tone.bind(audio);
    audio.tone = function (...a) { log.push({ fn: 'synth.tone', freq: a[0], type: a[2] }); return origTone(...a); };
  }

  const snap = (label, extra = {}) => {
    const plays = log.splice(0, log.length);
    const synth = plays.filter(x => String(x.fn).startsWith('synth'));
    return {
      label,
      plays: plays.filter(x => x.fn === 'play').map(x => ({ asked: x.asked, started: x.started, loop: x.loop, resolved: x.resolved })),
      synth: synth.map(x => x.fn + (x.freq != null ? ':' + x.freq : '')),
      usedSynth: synth.length > 0,
      flameSrc: !!(audio.flameSrc && !audio.flameSrc.dummy),
      ...extra,
    };
  };

  const shots = [];
  for (const id of GUNS) {
    if (audio.flame) audio.flame(false);
    audio.shot(id);
    shots.push(snap('shot:' + id));
  }

  // Ally / story companion shots go through the same audio.shot(kind)
  const allies = [];
  for (const id of ALLIES) {
    audio.shot(id);
    allies.push(snap('ally:' + id));
  }

  // Chainsaw melee — after the fix this is sawMotor(); before it is swing()/hit()
  const melee = [];
  if (audio.sawMotor) {
    audio.sawMotor();
    melee.push(snap('sawMotor'));
  } else {
    audio.swing();
    melee.push(snap('swing (no sawMotor API)'));
    audio.hit();
    melee.push(snap('hit (no sawMotor API)'));
  }

  // Fallback path: pretend flamer/saw buffers are missing (the old "gun noise" path)
  const fallback = [];
  const saved = { gun_flamer: audio.bufs.gun_flamer, gun_saw: audio.bufs.gun_saw, flame_loop: audio.bufs.flame_loop };
  delete audio.bufs.gun_flamer;
  delete audio.bufs.flame_loop;
  if (audio.flame) audio.flame(false);
  audio.shot('flamer');
  fallback.push(snap('shot:flamer (buffers missing)'));
  if (saved.gun_flamer) audio.bufs.gun_flamer = saved.gun_flamer;
  if (saved.flame_loop) audio.bufs.flame_loop = saved.flame_loop;

  delete audio.bufs.gun_saw;
  audio.shot('saw');
  fallback.push(snap('shot:saw (buffer missing)'));
  if (saved.gun_saw) audio.bufs.gun_saw = saved.gun_saw;

  if (audio.flame) {
    audio.flame(false);
    audio.flame(true);
    const on = snap('flame(true)');
    audio.flame(false);
    const off = snap('flame(false)');
    fallback.push(on, off);
  }

  return { ok: true, loaded, shots, allies, melee, fallback, ctx: audio.ctx && audio.ctx.state, hasFlame: typeof audio.flame === 'function', hasSawMotor: typeof audio.sawMotor === 'function', sfxVer: audio.SFX_VER || null };
}, { GUNS, ALLIES });

const out = { url: URL, errors: errs, sfxReqs: [...new Set(sfxReqs)].sort(), result };
fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
const rows = [];
const add = (arr) => (arr || []).forEach(s => {
  const ids = (s.plays || []).map(x => x.asked + (x.loop ? '[loop]' : '') + (x.started ? '' : '(miss)')).join(',') || '(none)';
  rows.push(`${s.label}: ${ids}${s.usedSynth ? '  SYNTH=' + s.synth.join(',') : ''}${s.flameSrc ? '  flameSrc=on' : ''}`);
});
add(result && result.shots);
add(result && result.allies);
add(result && result.melee);
add(result && result.fallback);
const table = rows.join('\n');
console.log(table);
console.log('loaded', JSON.stringify(result && result.loaded));
console.log('errors', errs.length, 'hasFlame', result && result.hasFlame, 'hasSawMotor', result && result.hasSawMotor);
fs.writeFileSync(OUT.replace(/\.json$/, '.txt'), table + '\n');
await b.close();
console.log('WROTE', OUT);
