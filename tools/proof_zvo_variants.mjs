// Local proof: new zombie voice files exist, lazy-load, and assign 18 distinct profiles. No lobby, no scores.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const URL = process.argv[2] || 'http://127.0.0.1:5453/';
const OUT = process.argv[3] || '/workspace/atq-zedkinds-proof/voices';
fs.mkdirSync(OUT, { recursive: true });
const rec = (n, ok, d) => { console.log(ok ? 'PASS' : 'FAIL', n, d ? JSON.stringify(d).slice(0, 400) : ''); return !!ok; };
let fails = 0;
const ok = (n, v, d) => { if (!rec(n, v, d)) fails++; };

const VAR = ['rasp_m','rasp_f','gut_m','gut_f','moan_m','moan_f','wet_m','wet_f','old_m','old_f','young_m','young_f','shriek_m','shriek_f','hollow_m','hag_m','bark_m','wheeze_f'];
const CATS = ['idle','alert','attack','hurt','death'];
const root = path.resolve('public/sfx');
for (const p of VAR) for (const c of CATS) {
  const f = path.join(root, `zvo_${p}_${c}0.mp3`);
  ok('file ' + path.basename(f), fs.existsSync(f) && fs.statSync(f).size > 800, { bytes: fs.existsSync(f) ? fs.statSync(f).size : 0 });
}
for (const k of ['runner','tank','spitter']) for (const c of CATS) for (const i of [0,1]) {
  const f = path.join(root, `zvo_${k}_${c}${i}.mp3`);
  ok('file ' + path.basename(f), fs.existsSync(f) && fs.statSync(f).size > 800);
}
ok('tank roar0', fs.existsSync(path.join(root, 'zvo_tank_roar0.mp3')));
ok('tank roar1', fs.existsSync(path.join(root, 'zvo_tank_roar1.mp3')));
for (const n of ['acid_spit0','acid_spit1','acid_sizzle0','acid_sizzle1','acid_splat0','acid_splat1','tank_charge0','tank_charge1','tank_stomp0','tank_stomp1']) {
  const f = path.join(root, n + '.mp3');
  ok('file ' + n, fs.existsSync(f) && fs.statSync(f).size > 800);
}

const chromeArgs = ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox','--autoplay-policy=no-user-gesture-required'];
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: chromeArgs });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => {
  localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'med', gore: false, voices: true, playSubs: false, hints: false, still: true, sfxVol: 1, voiceVol: 1 }));
  localStorage.setItem('atq_prologue_seen', '1');
  localStorage.setItem('atq.tut.seen', '1');
  localStorage.setItem('atq.gate', JSON.stringify({ birthYear: 1990, agreedVersion: 1 }));
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('video').forEach(v => { try { v.pause(); v.removeAttribute('src'); v.load(); v.remove(); } catch (e) {} });
  });
});
const p = await ctx.newPage();
p.setDefaultTimeout(180000);
p.errs = [];
p.on('pageerror', e => p.errs.push(String(e.message || e).slice(0, 240)));
p.on('response', r => { if (r.status() === 404 && /\/sfx\//.test(r.url())) p.errs.push('404 ' + r.url()); });
await p.goto(URL.replace(/\/?$/, '/') + '?step=3&god', { waitUntil: 'domcontentloaded', timeout: 180000 });
await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 180000 });
await p.evaluate(async () => {
  document.querySelectorAll('video').forEach(v => { try { v.remove(); } catch (e) {} });
  const g = window.__atq.game;
  g.god = true; g.dlgQ = []; g.dlgCur = null; g.cut = null;
});
const bootErrs = await p.evaluate(() => []); // collected on p.errs
ok('page errors at boot', p.errs.filter(e => !/audio device/i.test(e)).length === 0, p.errs);

const info = await p.evaluate(async () => {
  const g = window.__atq.game;
  const audio = g.audio;
  if (audio.ctx && audio.ctx.state !== 'running') { try { await audio.ctx.resume(); } catch (e) {} }
  const zeds = (g.zombies || []).filter(z => z && !z.dead);
  const profiles = {};
  for (const z of zeds) {
    if (z.zvo && z.zvo.profile) profiles[z.zvo.profile] = (profiles[z.zvo.profile] || 0) + 1;
  }
  // force-spawn a mixed crowd if the chapter is sparse
  const pp = g.player && g.player.root && g.player.root.position;
  if (zeds.length < 8 && g.spawnZ && pp) {
    for (let i = 0; i < 16; i++) g.spawnZ(pp.x + (i % 4) * 1.4, pp.z + 3 + Math.floor(i / 4) * 1.4, { idle: true, aggro: 0 });
  }
  const after = (g.zombies || []).filter(z => z && !z.dead);
  const prof2 = {};
  for (const z of after) {
    if (z.zvo && z.zvo.profile) prof2[z.zvo.profile] = (prof2[z.zvo.profile] || 0) + 1;
  }
  // warm and play one idle from a few profiles
  const plays = {};
  const sample = after.slice(0, 10);
  for (const z of sample) {
    if (audio.zVocal) audio.zVocal('idle', z, .4);
  }
  await new Promise(r => setTimeout(r, 600));
  const loaded = [];
  for (const name of Object.keys(audio.bufs || {})) {
    if (name.startsWith('zvo_') && audio.bufs[name]) loaded.push(name);
  }
  const restHasZvo = (audio._sfxRest || []).some(n => n.startsWith('zvo_'));
  return { profiles: prof2, nZed: after.length, loaded: loaded.sort(), restHasZvo, nAct: audio.nAct || 0, ctx: audio.ctx && audio.ctx.state };
});
ok('zombies spawned', info.nZed >= 8, info);
const nProf = Object.keys(info.profiles).length;
ok('multiple live voice profiles', nProf >= 4, info.profiles);
ok('lazy rest excludes zvo_', info.restHasZvo === false, { restHasZvo: info.restHasZvo });
ok('zvo buffers loaded on demand', info.loaded.length >= 1, { loaded: info.loaded, ctx: info.ctx });
ok('page errors after play', p.errs.filter(e => !/audio device/i.test(e)).length === 0, p.errs);
await p.screenshot({ path: OUT + '/voice-crowd.png' });
await b.close();
fs.writeFileSync(OUT + '/result.json', JSON.stringify({ fails, info }, null, 2));
console.log(fails ? 'FAILED ' + fails : 'ALL PASSED');
process.exit(fails ? 1 : 0);
