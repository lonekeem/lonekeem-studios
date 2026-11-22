// Player must hold rifle/pistol/shotgun/melee correctly (idle + walk), not in a T-pose
// with the gun stuck out to the side. Also samples story zombies. Never joins lobby or posts a score.
// usage: node tools/smoke_player_hold.mjs <url> <outdir>
import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.argv[2] || 'http://127.0.0.1:5373/';
const OUT = process.argv[3] || '/workspace/atq-hotfix-proof/phold';
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy-no-user-gesture-required', '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => {
  localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true, hints: false, ctl: 'twin', hudv2: false, music: 0.4, vol: 0.5, voices: false, playSubs: false, fp: false }));
  localStorage.setItem('atq_prologue_seen', '1');
  localStorage.setItem('atq.profile.v1', JSON.stringify({ v: 1, name: 'Test', createdAt: Date.now() }));
  const save = { v: 3, step: 7, cash: 0, xp: 0, level: 1, owned: ['fists', 'bat', 'pistol', 'shotgun', 'rifle'], up: {}, ammo: { light: 48, shell: 24, rifle: 90 }, mags: { pistol: 12, shotgun: 6, rifle: 30 }, grenades: 0, meds: 1, pages: [], items: ['backpack'], loot: [], cur: 'rifle', kills: 0, done: true, ch: 2, done2: false, maxCh: 13, played: true };
  localStorage.setItem('atq3_save', JSON.stringify(save));
  localStorage.setItem('atq3_save.bak', JSON.stringify(save));
});
const p = await ctx.newPage();
p.setDefaultTimeout(180000);
const errs = [], notFounds = [];
p.on('pageerror', e => errs.push(String(e.message || e).slice(0, 300)));
p.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text().slice(0, 240)); });
p.on('response', r => { if (r.status() === 404) notFounds.push(r.url()); });
p.on('dialog', d => d.accept());
await p.route(/leaderboard|postScore|submitScore|supabase\.co|firestore|games\/score/i, route => route.abort());

const recs = [];
const rec = (n, ok, d) => { recs.push(!!ok); console.log(ok ? 'PASS' : 'FAIL', n, d != null ? JSON.stringify(d).slice(0, 800) : ''); return !!ok; };

const measure = () => p.evaluate(() => {
  const world = (b) => { if (!b) return null; const w = new (b.position.constructor)(); b.getWorldPosition(w); return { x: +w.x.toFixed(3), y: +w.y.toFixed(3), z: +w.z.toFixed(3) }; };
  const g = window.__atq && window.__atq.game;
  if (!g || !g.player) return { err: 'no player' };
  const P = g.player;
  const bone = (n) => P.bone && P.bone(n);
  const pos = (n) => world(bone(n));
  const shL = pos('DEF-shoulder.L') || pos('DEF-upper_arm.L');
  const shR = pos('DEF-shoulder.R') || pos('DEF-upper_arm.R');
  const hL = pos('DEF-hand.L');
  const hR = pos('DEF-hand.R');
  if (!shL || !shR || !hL || !hR) return { err: 'bones', has: Object.keys(P.bones || {}).slice(0, 8) };
  const downL = +(shL.y - hL.y).toFixed(3);
  const downR = +(shR.y - hR.y).toFixed(3);
  const span = +Math.hypot(hL.x - hR.x, hL.z - hR.z).toFixed(3);
  const shSpan = +Math.hypot(shL.x - shR.x, shL.z - shR.z).toFixed(3);
  const ry = P.root.rotation.y;
  const fwd = { x: Math.sin(ry), z: Math.cos(ry) };
  const hips = P.root.position;
  const handFwd = +((hR.x - hips.x) * fwd.x + (hR.z - hips.z) * fwd.z).toFixed(3);
  // T-pose: hands nearly as high as the shoulders and stretched out sideways.
  const tpose = downL < 0.16 && downR < 0.16 && span > 0.75;
  // A held gun should have the right hand in front of the body, not out to the side. Melee may hang lower.
  const side = Math.abs((hR.x - hips.x) * fwd.z - (hR.z - hips.z) * fwd.x);
  const heldOk = !tpose && (g.save && g.save.cur && ['bat','machete','axe','pan','katana','tomahawk','longsword','chainsaw','fists'].includes(g.save.cur) ? true : (handFwd > 0.08 || span < 0.55));
  const zs = (g.zombies || []).filter(z => z && !z.dead && z.root && z.root.visible !== false);
  const zT = [];
  for (const z of zs) {
    const zb = (n) => z.bone && z.bone(n);
    const zpos = (n) => world(zb(n));
    const sL = zpos('DEF-shoulder.L') || zpos('DEF-upper_arm.L');
    const sR = zpos('DEF-shoulder.R') || zpos('DEF-upper_arm.R');
    const kL = zpos('DEF-hand.L'); const kR = zpos('DEF-hand.R');
    if (!sL || !sR || !kL || !kR) continue;
    const dL = sL.y - kL.y, dR = sR.y - kR.y;
    const zspan = Math.hypot(kL.x - kR.x, kL.z - kR.z);
    const zsh = Math.hypot(sL.x - sR.x, sL.z - sR.z);
    const tp = dL < 0.16 && dR < 0.16 && zspan > Math.max(0.7, zsh * 1.8);
    if (tp) zT.push({ rig: (z.look && z.look.rig) || '', st: z.st || '', name: z.curName || '' });
  }
  const corpses = (g.zombies || []).filter(z => z && z.dead);
  const stood = corpses.filter(z => z._deadHeld && z.root && z.root.position.y > 0.35).length;
  return { tpose, heldOk, downL, downR, span, shSpan, handFwd, side: +side.toFixed(3), cur: P.curName, gun: g.save && g.save.cur, fp: !!(g.cam && g.cam.fp), aimW: +((g.state && g.state.aimW) || 0).toFixed(2), locoOn: !!P.locoOn, nZ: zs.length, nZtpose: zT.length, zT, nDead: corpses.length, stood, step: g.step };
});

await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 180000 });
const warn = p.locator('#btnWarn');
if (await warn.count()) { await warn.click(); await p.waitForTimeout(300); }
await p.locator('#studio').click({ timeout: 5000 }).catch(() => {});
await p.waitForSelector('#title:not(.hidden)', { timeout: 180000 });
await p.locator('#btnStory').click().catch(() => {});
await p.locator('#btnChapters').click();
await p.waitForSelector('#chapters:not(.hidden), #chlist', { timeout: 15000 }).catch(() => {});
// pick chapter 2 if the list is visible, else kick loadStep
const clicked = await p.evaluate(() => {
  const btns = [...document.querySelectorAll('#chapters button, #chlist button, .chcard, [data-ch]')];
  const b = btns.find(x => /chapter\s*2|the\s*shore|c2/i.test(x.textContent || '') || x.getAttribute('data-ch') === '2');
  if (b) { b.click(); return true; }
  return false;
});
if (!clicked) {
  await p.evaluate(() => { const A = window.__atq; if (A && A.play) A.play(7); });
}
await p.waitForFunction(() => {
  const A = window.__atq || {};
  const el = document.getElementById('loading');
  const hidden = !el || el.classList.contains('hidden');
  return hidden && A.state === 'play' && A.game && A.game.running && A.game.player;
}, { timeout: 180000 });

// get control of the player: skip dialogue/cut, third person, stand in the open
await p.evaluate(() => {
  const g = window.__atq.game;
  try { g.cut = null; g.dlgCur = null; const d = document.getElementById('dlg'); if (d) d.classList.remove('on'); } catch (e) {}
  if (g.cam) g.cam.fp = false;
  if (g.save && !g.save.owned.includes('rifle')) { ['bat', 'pistol', 'shotgun', 'rifle'].forEach(id => { if (!g.save.owned.includes(id)) g.save.owned.push(id); }); }
  if (g.give) { /* keep current */ }
  const p = g.player.root.position;
  // nudge to a clear spot if possible
  g.player.root.position.set(p.x, 0, p.z);
  if (g.cam) { g.cam.yaw = g.player.root.rotation.y + Math.PI; g.cam.pitch = 0.18; }
  if (g.input && g.input.stick) g.input.stick.set(0, 0);
});
await p.waitForTimeout(500);

const WEPS = [
  { id: 'rifle', label: 'rifle' },
  { id: 'pistol', label: 'pistol' },
  { id: 'shotgun', label: 'shotgun' },
  { id: 'bat', label: 'melee' },
];

const results = [];
for (const w of WEPS) {
  await p.evaluate((id) => {
    const g = window.__atq.game;
    if (g.input && g.input.stick) g.input.stick.set(0, 0);
    if (g.equip) g.equip(id, true);
    if (g.cam) { g.cam.fp = false; g.cam.yaw = g.player.root.rotation.y + Math.PI; g.cam.pitch = 0.18; }
  }, w.id);
  await p.waitForTimeout(500);
  const idle = await measure();
  const idleShot = `${OUT}/${w.label}_idle.png`;
  const idleCrop = `${OUT}/${w.label}_idle_crop.png`;
  await p.screenshot({ path: idleShot });
  await p.screenshot({ path: idleCrop, clip: { x: 220, y: 30, width: 400, height: 340 } });
  rec(`player_${w.label}_idle_no_tpose`, !idle.tpose && idle.heldOk, idle);

  await p.evaluate(() => {
    const g = window.__atq.game;
    if (g.input && g.input.stick) g.input.stick.set(0, -1);
    if (g.cam) { g.cam.fp = false; g.cam.yaw = g.player.root.rotation.y + Math.PI; g.cam.pitch = 0.18; }
  });
  await p.waitForTimeout(900);
  const walk = await measure();
  const walkShot = `${OUT}/${w.label}_walk.png`;
  const walkCrop = `${OUT}/${w.label}_walk_crop.png`;
  await p.screenshot({ path: walkShot });
  await p.screenshot({ path: walkCrop, clip: { x: 200, y: 20, width: 440, height: 350 } });
  rec(`player_${w.label}_walk_no_tpose`, !walk.tpose && walk.heldOk, walk);
  results.push({ wep: w.label, idle, walk, idleCrop, walkCrop });

  await p.evaluate(() => { const g = window.__atq.game; if (g.input && g.input.stick) g.input.stick.set(0, 0); });
  await p.waitForTimeout(200);
}

// story zombies in chapter 2
await p.evaluate(() => {
  const g = window.__atq.game;
  if (g.input && g.input.stick) g.input.stick.set(0, 0);
  const zs = (g.zombies || []).filter(z => z && !z.dead && z.root);
  if (!zs.length) return;
  const z = zs.sort((a, b) => a.root.position.distanceTo(g.player.root.position) - b.root.position.distanceTo(g.player.root.position))[0];
  const p = z.root.position;
  g.player.root.position.set(p.x - 6.2, 0, p.z + 2.4);
  if (g.cam) { g.cam.yaw = Math.PI * 0.2; g.cam.pitch = 0.14; }
});
await p.waitForTimeout(800);
const zSamples = [];
for (const ms of [0, 800, 1600]) {
  if (ms) await p.waitForTimeout(800);
  const m = await measure();
  await p.screenshot({ path: `${OUT}/story_z_t${ms}.png` });
  await p.screenshot({ path: `${OUT}/story_z_t${ms}_crop.png`, clip: { x: 160, y: 20, width: 540, height: 350 } });
  zSamples.push(m);
  console.log('SAMPLE story zombies', ms, JSON.stringify(m).slice(0, 500));
}
const zT = Math.max(...zSamples.map(s => s.nZtpose || 0));
const zN = Math.max(...zSamples.map(s => s.nZ || 0));
rec('story_zombies_present', zN >= 1, { n: zN, nTpose: zT });
rec('story_zombies_no_tpose', zT === 0, { nTpose: zT, samples: zSamples.map(s => ({ nZ: s.nZ, nT: s.nZtpose, zT: s.zT })) });
rec('dead_not_standing', zSamples.every(s => !s.stood), { samples: zSamples.map(s => ({ nDead: s.nDead, stood: s.stood })) });

const pageErrs = errs.filter(e => !/AbortError|Failed to fetch|ERR_ABORTED|ERR_FAILED|online unavailable|status of 404/i.test(e));
rec('zero_page_errors', pageErrs.length === 0, pageErrs.slice(0, 8));
rec('zero_404s', notFounds.length === 0, notFounds.slice(0, 8));

const fail = recs.some(x => !x);
console.log(fail ? 'FAIL PLAYER-HOLD SMOKE' : 'PLAYER-HOLD SMOKE OK', 'errs', pageErrs.length, '404s', notFounds.length);
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ ok: !fail, results, zSamples, errs: pageErrs, notFounds }, null, 2));
await b.close();
process.exit(fail ? 1 : 0);
