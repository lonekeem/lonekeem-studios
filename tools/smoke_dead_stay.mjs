// After a kill, the corpse must stay down for ~3s (no idle stand-up).
// Measures head/hips world Y and crops the body. Story/Survival and solo town.
// usage: node tools/smoke_dead_stay.mjs <url> <outdir>
import { chromium } from 'playwright';
import fs from 'fs';
import { execFileSync } from 'child_process';

const URL = process.argv[2] || 'http://127.0.0.1:5372/';
const OUT = process.argv[3] || '/workspace/atq-chload-proof/dead';
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => {
  localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true, hints: false, ctl: 'twin', hudv2: false }));
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
await p.route(/leaderboard|postScore|submitScore|supabase\.co/i, route => route.abort());

const recs = [];
const rec = (n, ok, d) => { recs.push(!!ok); console.log(ok ? 'PASS' : 'FAIL', n, d != null ? JSON.stringify(d).slice(0, 700) : ''); return !!ok; };

const measure = () => p.evaluate(() => {
  const THREE = window.THREE || (window.__atq && window.__atq.game && window.__atq.game.renderer && { Vector3: window.__atq.game.player.root.position.constructor });
  const g = window.__atq && window.__atq.game;
  const T = window.__mpTown;
  const z = window.__deadZ;
  if (!z || !z.root) return null;
  const V = (n) => {
    const b = z.bone && z.bone(n);
    if (!b) return null;
    const v = b.getWorldPosition(new z.root.position.constructor());
    return { x: +v.x.toFixed(3), y: +v.y.toFixed(3), z: +v.z.toFixed(3) };
  };
  const hips = V('DEF-hips'), head = V('DEF-head');
  const cam = T ? T.cam : g && g.camera;
  const proj = (wp) => {
    if (!cam || !wp) return null;
    const v = new z.root.position.constructor(wp.x, wp.y, wp.z);
    v.project(cam);
    return { x: Math.round((v.x * .5 + .5) * innerWidth), y: Math.round((-v.y * .5 + .5) * innerHeight), z: +v.z.toFixed(3) };
  };
  return {
    dead: !!z.dead, held: !!z._deadHeld, cur: z.curName, deadT: +(z.deadT || 0).toFixed(2),
    hips, head, upright: (hips && head) ? +(head.y - hips.y).toFixed(3) : null,
    scrHips: proj(hips), scrHead: proj(head),
    town: !!T, step: g ? g.step : null,
  };
});

async function cropAround(src, dest, m) {
  const pts = [m && m.scrHips, m && m.scrHead].filter(Boolean);
  if (!pts.length) { fs.copyFileSync(src, dest); return dest; }
  const py = `
from PIL import Image
im=Image.open(${JSON.stringify(src)})
w,h=im.size
# screenshot is 844*2 x 390*2
sx,sy=w/844,h/390
xs=[p['x']*sx for p in ${JSON.stringify(pts)}]
ys=[p['y']*sy for p in ${JSON.stringify(pts)}]
cx=sum(xs)/len(xs); cy=sum(ys)/len(ys)
cw,ch=520,520
x0=max(0,int(cx-cw/2)); y0=max(0,int(cy-ch/2))
x1=min(w,x0+cw); y1=min(h,y0+ch)
im.crop((x0,y0,x1,y1)).save(${JSON.stringify(dest)})
`;
  fs.writeFileSync('/tmp/_crop_dead.py', py);
  try { execFileSync('python3', ['/tmp/_crop_dead.py']); } catch (e) { fs.copyFileSync(src, dest); }
  return dest;
}

async function sampleKill(label, setup) {
  const series = [];
  const okSetup = await setup();
  rec(label + '_setup', !!okSetup, okSetup);
  if (!okSetup) return { series, ok: false };
  // Wait until the death clip has finished (or 20s wall) so we prove the corpse
  // stays down *after* the fall, which is when the stand-up bug happened.
  await p.waitForFunction(() => {
    const z = window.__deadZ;
    return z && z.dead && (z._deadHeld || (z.deadT || 0) >= 3);
  }, { timeout: 20000 }).catch(() => null);
  for (const t of [200, 1000, 2000, 3000]) {
    await p.waitForTimeout(t - (series[series.length - 1]?.ms || 0));
    const m = await measure();
    const shot = `${OUT}/${label}_t${t}.png`;
    await p.screenshot({ path: shot });
    const crop = `${OUT}/${label}_t${t}_crop.png`;
    await cropAround(shot, crop, m);
    series.push({ ms: t, ...m, shot, crop });
    console.log('SAMPLE', label, t, JSON.stringify(m));
  }
  const late = series.filter(s => s.ms >= 1000);
  const minHead = Math.min(...late.map(s => s.head ? s.head.y : 99));
  const last = series[series.length - 1];
  const rose = last.head && (last.head.y - minHead > 0.45);
  const standing = last.upright != null && last.upright > 0.55 && last.head && last.head.y > 1.0;
  rec(label + '_stays_down', !rose && !standing && last.dead, { rose, standing, minHead, last, held: last.held, upright: late.map(s => s.upright) });
  rec(label + '_held_pose', !!last.held, { held: last.held, cur: last.cur });
  return { series, ok: !rose && !standing };
}

// ---- Survival (from the title menu, so the loading path is also exercised) ----
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 180000 });
const warn0 = p.locator('#btnWarn');
if (await warn0.count()) { await warn0.click(); await p.waitForTimeout(300); }
await p.locator('#studio').click({ timeout: 5000 }).catch(() => {});
await p.waitForSelector('#title:not(.hidden)', { timeout: 180000 });
await p.locator('.mtabs [data-tab="survival"]').click();
await p.locator('#btnSurvival').click();
await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.survival && window.__atq.game.running && (!document.getElementById('loading') || document.getElementById('loading').classList.contains('hidden')), { timeout: 180000 });
await p.evaluate(() => { const g = window.__atq.game; g.god = true; g.hp = g.maxHp = 9999; g.paused = false; });
await p.waitForFunction(() => { const g = window.__atq && window.__atq.game; return g && (g.zombies || []).some(z => z && !z.dead); }, { timeout: 60000 });
await p.waitForTimeout(400);

const storyRes = await sampleKill('survival', async () => p.evaluate(() => {
  const g = window.__atq.game;
  g.god = true; g.paused = false; g.hp = 9999;
  // spawn or reuse a zombie in front of the camera
  let z = (g.zombies || []).find(q => q && !q.dead);
  if (!z) return { err: 'no zombie' };
  const P = g.player.root.position;
  const yaw = g.player.root.rotation.y;
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  z.root.position.set(P.x + fx * 3.1, 0, P.z + fz * 3.1);
  g.cam.yaw = yaw + Math.PI; g.cam.pitch = -0.18; g.cam.dist = 3.2;
  const V = P.clone().set(0, 0, 0); V.set(fx, 0, fz);
  g.killZ(z, V, { boom: true });
  window.__deadZ = z;
  // readable fill light
  try { if (!g.__pl) { g.__pl = g.faceL.clone(); g.scene.add(g.__pl); } g.__pl.intensity = 2; g.__pl.position.copy(g.camera.position); g.__pl.visible = true; } catch (e) {}
  return { ok: !!z.dead, name: z.curName, n: g.zombies.length };
}));

fs.writeFileSync(`${OUT}/survival_series.json`, JSON.stringify(storyRes.series, null, 2));

// ---- Town (solo, offline) ----
await p.evaluate(() => { try { window.__atq && window.__atq.game && window.__atq.game.leave && window.__atq.game.leave(); } catch (e) {} });
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 180000 });
const warn = p.locator('#btnWarn');
if (await warn.count()) { await warn.click(); await p.waitForTimeout(300); }
await p.locator('#studio').click({ timeout: 5000 }).catch(() => {});
await p.waitForSelector('#title:not(.hidden)', { timeout: 180000 });
await p.evaluate(() => { Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false }); });
await p.locator('.mtabs [data-tab="online"]').click();
await p.locator('#btnMP').click();
const townOk = await p.waitForFunction(() => !!(window.__mpTown && window.__mpTown.Z && window.__mpTown.Z.zombies), { timeout: 180000 }).then(() => true).catch(() => false);
rec('town_ready', townOk, {});
await p.waitForTimeout(1200);

const townRes = await sampleKill('town', async () => p.evaluate(() => {
  const T = window.__mpTown; if (!T || !T.Z) return { err: 'no town' };
  const zs = T.Z.zombies || [];
  let z = zs.find(q => q && !q.dead);
  if (!z) return { err: 'no zombie', n: zs.length };
  T.setPos(z.root.position.x - 3, z.root.position.z);
  T.setCam(Math.PI / 2, 0.35, 3.2);
  const dir = { x: 1, y: 0, z: 0 };
  if (T.Z.killNear) T.Z.killNear(z.root.position.x, z.root.position.z, 1.2, 999, dir);
  else z.hp = 0;
  // if still alive, call kill via hurt
  if (!z.dead && T.Z.shoot) T.Z.shoot(z.root.position.x - 1, z.root.position.z, 1, 0, 5, 999);
  window.__deadZ = z;
  return { ok: !!z.dead, name: z.curName, n: zs.length, held: !!z._deadHeld };
}));

fs.writeFileSync(`${OUT}/town_series.json`, JSON.stringify(townRes.series, null, 2));

const pageErrs = errs.filter(e => !/AbortError|Failed to fetch|ERR_ABORTED|online unavailable|status of 404/i.test(e));
rec('zero_page_errors', pageErrs.length === 0, pageErrs.slice(0, 8));
rec('zero_404s', notFounds.length === 0, notFounds.slice(0, 8));
const fail = recs.some(x => !x);
console.log(fail ? 'FAIL DEAD-STAY SMOKE' : 'DEAD-STAY SMOKE OK', 'errs', pageErrs.length, '404s', notFounds.length);
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ ok: !fail, survival: storyRes, town: townRes, errs: pageErrs, notFounds }, null, 2));
await b.close();
process.exit(fail ? 1 : 0);
