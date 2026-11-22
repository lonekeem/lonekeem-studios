// Walking zombies must not hold the bind T-pose (arms straight out to the sides).
// Samples several live walkers over ~2s in Survival and solo town, and crops them.
// Never joins the lobby or posts a score.
// usage: node tools/smoke_zombie_arms.mjs <url> <outdir>
import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.argv[2] || 'http://127.0.0.1:5372/';
const OUT = process.argv[3] || '/workspace/atq-chload-proof/zarms';
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => {
  localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true, hints: false, ctl: 'twin', hudv2: false, music: 0.6, vol: 0.9, voices: true, playSubs: false }));
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
await p.route(/leaderboard|postScore|submitScore|supabase\.co|firestore|games\/score/i, route => route.abort());

const recs = [];
const rec = (n, ok, d) => { recs.push(!!ok); console.log(ok ? 'PASS' : 'FAIL', n, d != null ? JSON.stringify(d).slice(0, 800) : ''); return !!ok; };

const measure = () => p.evaluate(() => {
  const list = [];
  const g = window.__atq && window.__atq.game;
  const T = window.__mpTown;
  const zs = (T && T.Z && T.Z.zombies) || (g && g.zombies) || [];
  const me = g && g.player ? g.player.root.position : (T && T.me ? { x: T.me.x, z: T.me.z } : { x: 0, z: 0 });
  const V3 = (b) => {
    if (!b) return null;
    const v = { x: 0, y: 0, z: 0 };
    const w = new (b.position.constructor)();
    b.getWorldPosition(w);
    v.x = +w.x.toFixed(3); v.y = +w.y.toFixed(3); v.z = +w.z.toFixed(3);
    return v;
  };
  for (const z of zs) {
    if (!z || z.dead || !z.root || z.root.visible === false) continue;
    const bone = (n) => z.bone && z.bone(n);
    const shL = V3(bone('DEF-shoulder.L') || bone('DEF-upper_arm.L'));
    const shR = V3(bone('DEF-shoulder.R') || bone('DEF-upper_arm.R'));
    const hL = V3(bone('DEF-hand.L'));
    const hR = V3(bone('DEF-hand.R'));
    if (!shL || !shR || !hL || !hR) continue;
    const downL = +(shL.y - hL.y).toFixed(3);
    const downR = +(shR.y - hR.y).toFixed(3);
    const span = +Math.hypot(hL.x - hR.x, hL.z - hR.z).toFixed(3);
    const shSpan = +Math.hypot(shL.x - shR.x, shL.z - shR.z).toFixed(3);
    const mid = { x: (shL.x + shR.x) / 2, z: (shL.z + shR.z) / 2 };
    // T-pose: hands nearly as high as the shoulders and stretched out sideways (span >> shoulder width).
    const tpose = downL < 0.16 && downR < 0.16 && span > Math.max(0.7, shSpan * 1.8);
    const dist = +Math.hypot((z.root.position.x) - me.x, (z.root.position.z) - me.z).toFixed(1);
    const w = z.cur && z.cur.getEffectiveWeight ? +z.cur.getEffectiveWeight().toFixed(2) : (z.locoOn ? 1 : 0);
    list.push({ tpose, downL, downR, span, shSpan, dist, name: z.curName || '', w, runner: !!z.runner, rig: (z.look && z.look.rig) || '', st: z.st || '' });
  }
  list.sort((a, b) => a.dist - b.dist);
  const nT = list.filter(x => x.tpose).length;
  return { n: list.length, nTpose: nT, zs: list.slice(0, 12) };
});


const boot = async () => {
  await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 180000 });
  const warn = p.locator('#btnWarn');
  if (await warn.count()) { await warn.click(); await p.waitForTimeout(300); }
  await p.locator('#studio').click({ timeout: 5000 }).catch(() => {});
  await p.waitForSelector('#title:not(.hidden)', { timeout: 180000 });
};

await boot();

// ---------- Survival ----------
await p.locator('.mtabs [data-tab="survival"]').click();
await p.locator('#btnSurvival').click();
await p.waitForFunction(() => {
  const A = window.__atq || {};
  const el = document.getElementById('loading');
  const hidden = !el || el.classList.contains('hidden');
  return hidden && A.state === 'play' && A.game && A.game.running;
}, { timeout: 180000 });

// Wait until a few living zombies exist, then stand near a cluster.
await p.waitForFunction(() => {
  const g = window.__atq && window.__atq.game;
  return g && g.zombies && g.zombies.filter(z => z && !z.dead).length >= 3;
}, { timeout: 60000 }).catch(() => false);

await p.evaluate(() => {
  const g = window.__atq.game;
  const zs = (g.zombies || []).filter(z => z && !z.dead && z.root);
  if (!zs.length) return;
  const z = zs.sort((a, b) => a.root.position.distanceTo(g.player.root.position) - b.root.position.distanceTo(g.player.root.position))[0];
  const p = z.root.position;
  g.player.root.position.set(p.x - 3.2, 0, p.z + 1.2);
  if (g.cam) { g.cam.yaw = Math.PI * 0.15; g.cam.pitch = 0.12; }
});
await p.waitForTimeout(400);

const survSeries = [];
for (const ms of [0, 700, 1400, 2100]) {
  if (ms) await p.waitForTimeout(700);
  const m = await measure();
  const shot = `${OUT}/survival_t${ms}.png`;
  await p.screenshot({ path: shot });
  const crop = `${OUT}/survival_t${ms}_crop.png`;
  await p.screenshot({ path: crop, clip: { x: 200, y: 40, width: 500, height: 330 } });
  m.shot = shot; m.crop = crop;
  survSeries.push(m);
  console.log('SAMPLE survival', ms, JSON.stringify(m).slice(0, 500));
}
const survT = Math.max(...survSeries.map(s => s.nTpose || 0));
const survN = Math.max(...survSeries.map(s => s.n || 0));
rec('survival_walkers', survN >= 1, { n: survN, nTpose: survT, last: survSeries[survSeries.length - 1] });
rec('survival_no_tpose', survT === 0, { nTpose: survT, samples: survSeries.map(s => ({ n: s.n, nT: s.nTpose, zs: s.zs })) });

// Back to title, then town
await p.evaluate(() => { const b = document.getElementById('btnPause'); if (b) b.click(); });
await p.waitForTimeout(200);
await p.evaluate(() => { const b = document.getElementById('btnQuit'); if (b) b.click(); });
await p.waitForSelector('#title:not(.hidden)', { timeout: 30000 });
await p.evaluate(() => { Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false }); });
await p.locator('.mtabs [data-tab="online"]').click();
await p.locator('#btnMP').click();
await p.waitForFunction(() => !!(window.__mpTown), { timeout: 180000 });
await p.waitForTimeout(600);

await p.evaluate(() => {
  const T = window.__mpTown;
  const zs = (T.Z && T.Z.zombies || []).filter(z => z && !z.dead && z.root && z.root.visible !== false);
  if (!zs.length) return;
  const z = zs[0];
  T.setPos(z.root.position.x - 4, z.root.position.z);
  if (T.setCam) T.setCam(0.4, 0.18, 4.2);
});
await p.waitForTimeout(400);

const townSeries = [];
for (const ms of [0, 700, 1400, 2100]) {
  if (ms) await p.waitForTimeout(700);
  const m = await measure();
  const shot = `${OUT}/town_t${ms}.png`;
  await p.screenshot({ path: shot });
  const crop = `${OUT}/town_t${ms}_crop.png`;
  await p.screenshot({ path: crop, clip: { x: 180, y: 30, width: 520, height: 340 } });
  m.shot = shot; m.crop = crop;
  townSeries.push(m);
  console.log('SAMPLE town', ms, JSON.stringify(m).slice(0, 500));
}
const townT = Math.max(...townSeries.map(s => s.nTpose || 0));
const townN = Math.max(...townSeries.map(s => s.n || 0));
rec('town_walkers', townN >= 1, { n: townN, nTpose: townT, last: townSeries[townSeries.length - 1] });
rec('town_no_tpose', townT === 0, { nTpose: townT, samples: townSeries.map(s => ({ n: s.n, nT: s.nTpose, zs: s.zs })) });

// Mid-distance town walkers (the old far-LOD band ~73–105m) must also be posed, not T-posed, while visible.
const mid = await p.evaluate(() => {
  const T = window.__mpTown;
  const zs = (T.Z && T.Z.zombies || []).filter(z => z && !z.dead && z.root);
  const me = { x: T.me.x, z: T.me.z };
  let pick = zs.find(z => {
    const d = Math.hypot(z.root.position.x - me.x, z.root.position.z - me.z);
    return d > 74 && d < 104;
  }) || zs.sort((a, b) => Math.hypot(b.root.position.x - me.x, b.root.position.z - me.z) - Math.hypot(a.root.position.x - me.x, a.root.position.z - me.z))[0];
  if (!pick) return { err: 'no zombie' };
  const p = pick.root.position;
  const dx = p.x - me.x, dz = p.z - me.z, d = Math.hypot(dx, dz) || 1;
  // Stand ~80m from this walker, looking at it, so it's in the old 'far but visible' band.
  const stand = 80;
  T.setPos(p.x - dx / d * stand, p.z - dz / d * stand);
  const yaw = Math.atan2(dx, dz);
  if (T.setCam) T.setCam(yaw, 0.08, 3.5);
  return { moved: true };
});
await p.waitForTimeout(500);
const midM = await measure();
await p.screenshot({ path: `${OUT}/town_mid.png` });
await p.screenshot({ path: `${OUT}/town_mid_crop.png`, clip: { x: 80, y: 20, width: 680, height: 360 } });
const midFar = (midM.zs || []).filter(z => z.dist > 60);
const midT = midFar.filter(z => z.tpose).length;
rec('town_mid_no_tpose', midFar.length === 0 || midT === 0, { mid, nFar: midFar.length, nTpose: midT, zs: midFar.slice(0, 8) });

const pageErrs = errs.filter(e => !/AbortError|Failed to fetch|ERR_ABORTED|ERR_FAILED|online unavailable|status of 404/i.test(e));
rec('zero_page_errors', pageErrs.length === 0, pageErrs.slice(0, 8));
rec('zero_404s', notFounds.length === 0, notFounds.slice(0, 8));

const fail = recs.some(x => !x);
console.log(fail ? 'FAIL ZOMBIE-ARMS SMOKE' : 'ZOMBIE-ARMS SMOKE OK', 'errs', pageErrs.length, '404s', notFounds.length);
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ ok: !fail, survSeries, townSeries, midM, errs: pageErrs, notFounds }, null, 2));
await b.close();
process.exit(fail ? 1 : 0);
