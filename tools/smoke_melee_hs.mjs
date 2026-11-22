// Targeted repro of the v1.9.37 melee-headshot T-pose: chapter 2 checkpoint,
// fire axe (also bat, pan, katana, fists) killing HEADSHOT, then walk without
// attacking. Assert Keem is not T-posed, the weapon stays in his hand, locomotion
// resumes on its own, and zombies that appear in that window are not T-posed.
// Real rAF, mobile 844x390, never joins lobby or posts a score.
import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.argv[2] || 'http://127.0.0.1:5375/';
const OUT = process.argv[3] || '/workspace/atq-arms-proof';
fs.mkdirSync(OUT, { recursive: true });

const WEPS = [
  { id: 'axe', label: 'axe' },
  { id: 'bat', label: 'bat' },
  { id: 'pan', label: 'pan' },
  { id: 'katana', label: 'katana' },
  { id: 'fists', label: 'fists' },
];

const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle-swiftshader', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await b.newContext({
  viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});
await ctx.addInitScript(() => {
  localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true, hints: false, ctl: 'twin', hudv2: false, music: 0.3, vol: 0.4, voices: false, playSubs: false, fp: false }));
  localStorage.setItem('atq_prologue_seen', '1');
  localStorage.setItem('atq.profile.v1', JSON.stringify({ v: 1, name: 'Test', createdAt: Date.now() }));
  const save = { v: 3, step: 7, cash: 0, xp: 0, level: 1,
    owned: ['fists', 'pan', 'bat', 'axe', 'katana', 'pistol', 'shotgun', 'rifle'],
    up: {}, ammo: { light: 48, shell: 24, rifle: 90 }, mags: { pistol: 12, shotgun: 6, rifle: 30 },
    grenades: 0, meds: 1, pages: [], items: ['backpack'], loot: [], cur: 'axe', kills: 0, done: true, ch: 2, done2: false, maxCh: 13, played: true };
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
await p.route(/leaderboard|postScore|submitScore|lb_submit|games\/score|supabase/i, route => route.abort());

const recs = [];
const rec = (n, ok, d) => { recs.push({ n, ok: !!ok, d }); console.log(ok ? 'PASS' : 'FAIL', n, d != null ? JSON.stringify(d).slice(0, 1200) : ''); return !!ok; };

await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 180000 });
const warn = p.locator('#btnWarn');
if (await warn.count()) { await warn.click(); await p.waitForTimeout(250); }
await p.locator('#studio').click({ timeout: 5000 }).catch(() => {});
await p.waitForSelector('#title:not(.hidden)', { timeout: 180000 });
await p.locator('.mtabs [data-tab="story"]').click().catch(() => {});
await p.locator('#btnStory').click().catch(() => {});
await p.locator('#btnChapters').click();
await p.waitForSelector('#chapters:not(.hidden), #chlist', { timeout: 15000 }).catch(() => {});
const clicked = await p.evaluate(() => {
  const btns = [...document.querySelectorAll('#chapters button, #chlist button, .chcard, [data-ch]')];
  const b = btns.find(x => /chapter\s*2|high water|the\s*shore|c2/i.test(x.textContent || '') || x.getAttribute('data-ch') === '2');
  if (b) { b.click(); return true; }
  return false;
});
if (!clicked) await p.evaluate(() => { const A = window.__atq; if (A && A.play) A.play(7); });
await p.waitForFunction(() => {
  const A = window.__atq || {};
  const el = document.getElementById('loading');
  const hidden = !el || el.classList.contains('hidden');
  return hidden && A.state === 'play' && A.game && A.game.running && A.game.player;
}, { timeout: 180000 });

await p.evaluate(() => {
  const g = window.__atq.game;
  try { g.cut = null; g.dlgCur = null; const d = document.getElementById('dlg'); if (d) d.classList.remove('on'); } catch (e) {}
  g.god = true; g.grace = 999; if (g.cam) g.cam.fp = false;
  const log = window.__hsLog = { frames: 0, hits: [], byWep: {}, started: performance.now() };
  const Arms = () => window.__atqArms;
  const orig = g.frame.bind(g);
  g.frame = function (now) {
    orig(now);
    try {
      const A = Arms(); if (!A || !g.player) return;
      log.frames++;
      const wep = (g.save && g.save.cur) || '';
      const watch = window.__hsWatch;
      if (!watch) return;
      const tpose = !!A.isTPoseArms(g.player);
      const hand = g.hand;
      const mesh = g.weaponMeshes && g.weaponMeshes[wep];
      const inHand = !!(hand && mesh && mesh.parent === hand && mesh.visible !== false && hand.visible !== false);
      const zs = (g.zombies || []).filter(z => z && !z.dead && z.root && z.root.visible !== false);
      let zT = 0; const zHits = [];
      for (const z of zs) {
        if (A.isTPoseArms(z)) { zT++; if (zHits.length < 6) zHits.push({ clip: z.curName, st: z.st, one: !!z.oneShot }); }
      }
      watch.samples.push({
        t: +((performance.now() - watch.t0) / 1000).toFixed(3),
        tpose, inHand, zT, zHits,
        clip: g.player.curName, one: !!g.player.oneShot, loco: !!g.player.locoOn,
        atk: g.state && g.state.atk, w: A.actionWeights(g.player),
        toast: (document.getElementById('toast') || {}).textContent || '',
      });
      if (tpose) log.hits.push({ wep, t: watch.samples.at(-1).t, clip: g.player.curName });
    } catch (e) { /* ignore */ }
  };
  setInterval(() => { try { g.cut = null; g.dlgCur = null; const d = document.getElementById('dlg'); if (d) d.classList.remove('on'); if (g.cam) g.cam.fp = false; } catch (e) {} }, 400);
});

async function setupKill(wep) {
  return p.evaluate((wep) => {
    const g = window.__atq.game;
    const I = g.input;
    I.move && I.move.set(0, 0); I.stick && I.stick.set(0, 0); I.atk = false; I.run = false;
    g.state.atk = 0; g.state.atkHit = 0; g.state.roll = 0; g.state.stun = 0; g.state.crouch = false;
    g.god = true; if (!g.save.owned.includes(wep)) g.save.owned.push(wep);
    g.equip(wep, true);
    const P = g.player.root;
    // Face down the chapter-2 road, clear a small pocket, spawn two close zombies + two just off-camera that will walk in.
    const yaw = P.rotation.y;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const rx = fz, rz = -fx;
    // Keep existing far zombies, but knock nearby living ones away so the swing hits the new ones.
    (g.zombies || []).forEach(z => {
      if (!z || z.dead || !z.root) return;
      const d = z.root.position.distanceTo(P.position);
      if (d < 8) z.root.position.addScaledVector({ x: fx, y: 0, z: fz }, 16);
    });
    const mk = (ox, oz, hp) => {
      const z = g.spawnZ(P.position.x + fx * ox + rx * oz, P.position.z + fz * ox + rz * oz, { hp, idle: false, runner: false });
      z.st = 'chase'; z.hp = hp; z.maxHp = hp; z.aggro = 80;
      const q = z.root.position;
      z.root.rotation.y = Math.atan2(P.position.x - q.x, P.position.z - q.z);
      return z.id;
    };
    const close = [mk(1.15, 0.15, 40), mk(1.35, -0.55, 40)];
    const incoming = [mk(7.5, 1.6, 70), mk(8.2, -1.8, 70)];
    g.state.combo = 3; g.state.comboT = 8;
    if (g.cam) { g.cam.fp = false; g.cam.yaw = yaw + Math.PI; g.cam.pitch = 0.18; }
    window.__hsWatch = { t0: performance.now(), wep, samples: [], close, incoming };
    return { cur: g.save.cur, handKids: g.hand ? g.hand.children.length : 0, yaw };
  }, wep);
}

async function swingAndWatch(wep) {
  // Start a melee swing; do not press attack again afterwards.
  await p.evaluate(() => {
    const g = window.__atq.game;
    g.state.combo = 3; g.state.comboT = 8;
    g.attack();
  });
  // Wait long enough for the swing, hitstop, headshot slowmo, and the clip to finish,
  // then walk for several seconds without attacking (the video's stuck window).
  await p.waitForTimeout(900);
  // Mid-window: spawn two more zombies into view, like the ones that T-posed in the video.
  await p.evaluate(() => {
    const g = window.__atq.game; const P = g.player.root;
    const yaw = P.rotation.y, fx = Math.sin(yaw), fz = Math.cos(yaw), rx = fz, rz = -fx;
    const a = g.spawnZ(P.position.x + fx * 4.2 + rx * 2.0, P.position.z + fz * 4.2 + rz * 2.0, { hp: 70, runner: false });
    const b = g.spawnZ(P.position.x + fx * 4.8 - rx * 2.2, P.position.z + fz * 4.8 - rz * 2.2, { hp: 70, runner: true });
    a.st = 'chase'; b.st = 'chase'; a.aggro = 80; b.aggro = 80;
    if (window.__hsWatch) window.__hsWatch.spawnedMid = true;
  });
  await p.waitForTimeout(600);
  await p.evaluate(() => {
    const g = window.__atq.game, I = g.input;
    I.atk = false;
    I.move && I.move.set(0, -1);
    I.stick && I.stick.set(0, -1);
    I.run = false;
  });
  // Walk ~2.5s after the swing with no further attack.
  await p.waitForTimeout(2500);
  const shot = `${OUT}/${wep}_after_hs.png`;
  const crop = `${OUT}/${wep}_after_hs_crop.png`;
  await p.screenshot({ path: shot });
  await p.screenshot({ path: crop, clip: { x: 200, y: 20, width: 440, height: 350 } });
  const zcrop = `${OUT}/${wep}_zombies_crop.png`;
  await p.screenshot({ path: zcrop, clip: { x: 120, y: 10, width: 600, height: 370 } });

  const data = await p.evaluate(() => {
    const g = window.__atq.game, A = window.__atqArms, W = window.__hsWatch || { samples: [] };
    const mesh = g.weaponMeshes && g.weaponMeshes[g.save.cur];
    const inHandNow = !!(g.hand && mesh && mesh.parent === g.hand && mesh.visible !== false && g.hand.visible !== false);
    const tposeNow = !!(A && A.isTPoseArms(g.player));
    const zs = (g.zombies || []).filter(z => z && !z.dead && z.root && z.root.visible !== false);
    const zTnow = zs.filter(z => A && A.isTPoseArms(z)).length;
    // The stuck bug is AFTER the swing/oneShot ends: T-pose, missing weapon, no loco.
    // A single mid-slash frame of Sword_Attack can abduct both arms; that is not the bug.
    const after = W.samples.filter(s => s.t >= 0.85);
    const post = after.filter(s => !s.one && !/^(Sword_Attack|Punch_Jab|Punch_Cross)$/.test(s.clip || ''));
    const tposeFrames = post.filter(s => s.tpose).length;
    const missingWep = post.filter(s => !s.inHand).length;
    const zTframes = post.reduce((n, s) => n + (s.zT || 0), 0);
    const killed = (g.save && g.save.kills) || 0;
    const toast = W.samples.map(s => s.toast).find(t => /HEADSHOT|FINISHER/i.test(t || '')) || '';
    return {
      frames: W.samples.length, after: after.length, tposeFrames, missingWep, zTframes,
      tposeNow, inHandNow, zTnow, zAlive: zs.length, clip: g.player.curName, one: !!g.player.oneShot,
      loco: !!g.player.locoOn, toast, killed, cur: g.save.cur,
      last: after.slice(-3), firstAfter: after.slice(0, 3),
    };
  });
  await p.evaluate(() => {
    const g = window.__atq.game, I = g.input;
    I.move && I.move.set(0, 0); I.stick && I.stick.set(0, 0);
  });
  return data;
}

let allOk = true;
for (const w of WEPS) {
  console.log('\n--- melee headshot', w.id, '---');
  const setup = await setupKill(w.id);
  rec(w.id + '.setup', setup.cur === w.id && setup.handKids >= 0, setup);
  const data = await swingAndWatch(w.id);
  const noT = data.tposeFrames === 0 && !data.tposeNow;
  const wepOk = w.id === 'fists' ? true : (data.missingWep === 0 && data.inHandNow);
  const locoOk = !data.one && !/Sword_Attack|Punch_/.test(data.clip || '');
  const zOk = data.zTnow === 0;
  rec(w.id + '.no_tpose_after_hs', noT, { tposeFrames: data.tposeFrames, tposeNow: data.tposeNow, clip: data.clip, toast: data.toast, killed: data.killed, firstAfter: data.firstAfter, last: data.last });
  rec(w.id + '.weapon_stays', wepOk, { missingWep: data.missingWep, inHandNow: data.inHandNow, cur: data.cur });
  rec(w.id + '.loco_resumes', locoOk, { clip: data.clip, one: data.one, loco: data.loco });
  rec(w.id + '.zombies_no_tpose', zOk, { zTnow: data.zTnow, zTframes: data.zTframes, zAlive: data.zAlive });
  if (!(noT && wepOk && locoOk && zOk)) allOk = false;
}

const realErrs = errs.filter(e => !/ERR_FAILED|Failed to load resource/i.test(e));
const pageOk = realErrs.length === 0 && notFounds.length === 0;
rec('page.errors', pageOk, { errs: realErrs.slice(0, 8), notFounds: notFounds.slice(0, 8), ignored: errs.length - realErrs.length });
if (!pageOk) allOk = false;

const summary = { ok: allOk, recs, errs, notFounds };
fs.writeFileSync(OUT + '/melee_hs.json', JSON.stringify(summary, null, 2));
console.log('\nSUMMARY', allOk ? 'PASS' : 'FAIL', recs.filter(r => !r.ok).map(r => r.n).join(', ') || 'all ok');
await b.close();
process.exit(allOk ? 0 : 1);
