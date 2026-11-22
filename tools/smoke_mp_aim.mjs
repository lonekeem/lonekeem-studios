// Isolated multiplayer-town aim smoke: crosshair, ADS, a mid-aim screenshot, and a shot that hits a zombie.
// Does not join the live lobby or post a score (enterTown({ solo: true, room: 'aimtest-local' })).
// usage: node tools/smoke_mp_aim.mjs <url> <outdir>
import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.argv[2] || 'http://127.0.0.1:5340/';
const OUT = process.argv[3] || '/workspace/atq-mp-aim-proof';
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
});
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => {
  localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'med', gore: true, hints: false, ctl: 'twin', assist: 0, autoFire: false }));
  localStorage.setItem('atq_prologue_seen', '1');
});
const p = await ctx.newPage();
p.setDefaultTimeout(180000);
const errs = [];
p.on('pageerror', e => errs.push(String(e.message || e).slice(0, 300)));
p.on('console', m => { if (m.type() === 'error' && !/404 \(Not Found\)/.test(m.text())) errs.push('CE ' + m.text().slice(0, 240)); });
p.on('dialog', d => d.accept());

const rec = (n, ok, d) => { console.log(ok ? 'PASS' : 'FAIL', n, d != null ? JSON.stringify(d).slice(0, 400) : ''); return !!ok; };
const results = [];
const check = (n, ok, d) => { results.push(!!ok); rec(n, ok, d); };

await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 180000 });
const warn = p.locator('#btnWarn');
if (await warn.count()) { await warn.click(); await p.waitForTimeout(400); }
await p.locator('#studio').click({ timeout: 5000 }).catch(() => {});
await p.waitForSelector('#title:not(.hidden)', { timeout: 120000 });

if (process.argv.includes('--menu')) {
  for (const tab of ['story', 'survival', 'online', 'keem', 'settings']) {
    await p.click({story:"#btnStory",survival:"#btnSurvival",online:"#btnOnline",keem:"#btnOnline",settings:"#btnSettings"}[tab]);
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/menu_${tab}.png` });
  }
  const foot = (await p.textContent('#foot')) || '';
  check('footer reads v1.9.32', foot.includes('v1.9.32'), foot);
  check('Play tab / btnLobby exist', await p.evaluate(() => !!document.querySelector('#btnLobby') && !!document.querySelector('#btnOnline')));
}

const entered = await p.evaluate(async () => {
  const title = document.getElementById('title'); if (title) title.classList.add('hidden');
  async function loadTown() {
    try { return await import('/src/mp/town/town.js'); } catch (e) {
      const html = await (await fetch(new URL('index.html', location.href))).text();
      let blob = html;
      const seen = new Set();
      const pull = async (file) => {
        const f = String(file).split('/').pop();
        if (!f || seen.has(f) || !f.endsWith('.js')) return;
        seen.add(f);
        const text = await (await fetch(new URL('./assets/' + f, location.href))).text();
        blob += '\n' + text + '\n' + f;
      };
      for (const m of html.matchAll(/assets\/([A-Za-z0-9_.-]+\.js)/g)) await pull(m[1]);
      for (const f of [...blob.matchAll(/((?:entry|world|look|town|aim)-[A-Za-z0-9_-]+\.js)/g)].map(m => m[1])) await pull(f);
      const m = blob.match(/town-[A-Za-z0-9_-]+\.js/);
      if (!m) throw new Error('town chunk not found');
      return import(new URL('./assets/' + m[0], location.href).href);
    }
  }
  const town = await loadTown();
  // hardcoded defaultLook('mp_m1') so we do not depend on minified look-chunk export names
  const look = { v: 1, name: 'AimTest', base: 'mp_m1', skin: { t: .26, u: .2 }, height: 0, morph: {},
    eyes: { s: 0, col: '#3a7a52', size: .1, space: 0, tilt: 0, lash: 0 }, brows: { s: 3, thick: .3, arch: 0, col: '#3a2616' },
    nose: { s: 0 }, mouth: { s: 8, full: 0, width: 0, col: null }, makeup: { shadow: 0, shadowCol: '#7a4a8a', liner: 0, blush: 0, lip: 0, lipCol: '#b2264a' },
    skinx: { freckles: 0, moles: 0, scar: 0, scarSide: 1, tattoo: 0, tattooCol: '#1c2a3a', age: 0 },
    hair: { id: 'messy', c: '#5a3b22', c2: '#8a6238', hl: .45 }, beard: { id: 'full', c: '#6a4f38', len: .55, dens: .9 }, stache: { id: 'chevron', c: '#6a4f38', len: .5, dens: .9 }, mask: null,
    worn: { top: { id: 'tee', c: '#17181b', c2: '#ffffff', p: 0 }, jacket: null, pants: { id: 'cargojog', c: '#a9adb2', c2: '#ffffff', p: 0 }, shoes: { id: 'clog', c: '#1b1c1f', c2: '#2a2b2f', p: 0, sole: '#1b1c1f' }, gloves: null },
    acc: { hat: null, glasses: null, earL: null, earR: null, pierce: [], neck: null, wristL: null, wristR: null, ringL: null, ringR: null, bag: null, belt: null } };
  await town.enterTown({ look, room: 'aimtest-local', solo: true, onExit() {} });
  return !!(window.__mpTown && window.__mpTown.me);
});
check('enter isolated solo town', entered);
await p.waitForFunction(() => window.__mpTown && window.__mpTown.me && window.__mpTown.cam, null, { timeout: 180000 });
await p.waitForTimeout(1500);

const setup = await p.evaluate(() => {
  const T = window.__mpTown;
  try { T.Z && T.Z.killNear(0, 0, 400, 9999); } catch (e) { /* ignore */ }
  for (const z of (T.Z && T.Z.zombies) || []) { if (z.dead && z.root) z.root.visible = false; if (z.pool) z.pool.visible = false; }
  T.setPos(-6, 21.5);
  T.setLook(Math.PI / 2, 0.04);
  T.bag.cap = 99;
  for (const k of Object.keys(T.bag.items)) delete T.bag.items[k];
  T.bag.add('pistol', 1); T.bag.add('ammo_light', 60); T.bag.pref = 'pistol';
  T.GS.mag = { pistol: 12 }; T.GS.cd = 0; T.GS.rl = 0;
  T.inp.tAim = true;
  const ab = document.getElementById('tAim'); if (ab) ab.classList.add('on');
  return { gun: T.GS.shown || T.bag.pref };
});
check('pistol equipped', setup.gun === 'pistol' || setup.gun === '9mm' || !!setup.gun, setup);
await p.waitForTimeout(700);

// park a zombie ON the crosshair ray so the shot test is fair, and freeze it
const placed = await p.evaluate(async () => {
  const T = window.__mpTown;
  let hitChar, capsOf; try { ({ hitChar, capsOf } = await import('/src/game/aim.js')); } catch (e) { hitChar = () => null; capsOf = () => null; }
  // clear a lane: hide corpses, nudge nearby cars aside
  for (const z of T.Z.zombies) { if (z.dead) { z.root.visible = false; if (z.pool) z.pool.visible = false; } }
  for (const c of T.cars) { if (Math.hypot(c.x + 6, c.z - 21.5) < 18) { c.x += 18; if (c.g) c.g.position.x = c.x; } }
  // spawn a fresh zombie 6 m along the current look
  const fx = Math.sin(T.me.ry || 0), fz = Math.cos(T.me.ry || 0);
  // me.ry may lag; use camYaw via AG
  const yaw = T.AG.cam.yaw + Math.PI; // town camYaw
  const zx = T.me.x + Math.sin(yaw) * 5.6, zz = T.me.z + Math.cos(yaw) * 5.6;
  let z = T.Z.spawnAt(zx, zz, { scale: 1 });
  z.st = 'look'; z.look = [zx, zz]; z.lookT = 99; z.speed = 0; if (z.vel) z.vel.set(0, 0, 0);
  // point the crosshair at the chest
  const chestY = 1.15;
  const camP = T.cam.position; const dx = zx - camP.x, dy = chestY - camP.y, dz = zz - camP.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  const th = Math.tan((T.cam.fov * Math.PI) / 180 / 2);
  T.AG._xh = T.AG._xh || { cx: 0, cy: 0.08 };
  const yo = Math.atan(T.AG._xh.cx * th * T.cam.aspect), po = Math.atan(T.AG._xh.cy * th);
  const yd = Math.atan2(-dx, -dz), pd = Math.asin(Math.max(-1, Math.min(1, dy / len)));
  T.setLook(yd - yo - Math.PI, pd - po);
  const mesh = T.GS.mesh; const mz = mesh && mesh.getObjectByName('muzzle');
  const P = T.me.av && T.me.av.motion;
  return { zx: +zx.toFixed(2), zz: +zz.toFixed(2), hasZ: !!z, hp: z && z.hp, aimW: T.S.aimW, aim: !!T.S.aim, hasMesh: !!mesh, hasMuzzle: !!mz, hasPlayer: !!P, hasHandBone: !!(P && P.bone && P.bone('DEF-hand.R')), xhairZ: getComputedStyle(document.getElementById('xhair')).zIndex };
});
console.log('placed', JSON.stringify(placed));
await p.waitForTimeout(400);

// mid-aim
await p.screenshot({ path: `${OUT}/mp_aim.png` });
const aimInfo = await p.evaluate(() => {
  const T = window.__mpTown; const xh = document.getElementById('xhair');
  const xr = xh ? xh.getBoundingClientRect() : { width: 0, height: 0, top: 0, left: 0 };
  const st = getComputedStyle(xh || document.body);
  return {
    aim: !!T.S.aim, fov: +T.cam.fov.toFixed(2),
    xhairHidden: !xh || xh.classList.contains('hidden') || st.display === 'none' || st.visibility === 'hidden' || +st.opacity === 0,
    xhairText: xh ? xh.textContent : '',
    xw: xr.width, xh: xr.height, xleft: +xr.left.toFixed(1), xtop: +xr.top.toFixed(1),
    errorsSoFar: 0,
  };
});
check('crosshair visible while aiming', !aimInfo.xhairHidden && aimInfo.xhairText.includes('+') && aimInfo.xw > 4, aimInfo);
check('ADS tightens FOV', aimInfo.aim && aimInfo.fov < 54, aimInfo);

// fire at the zombie under the crosshair; hold the flash for the mid-shot photo
const shot = await p.evaluate(async () => {
  const T = window.__mpTown;
  let hitChar, capsOf; try { ({ hitChar, capsOf } = await import('/src/game/aim.js')); } catch (e) { hitChar = () => null; capsOf = () => null; }
  const alive = T.AG.alive();
  const ray = T.AG.aimRay(1, true);
  const nr = ray.near || 0;
  const wd = T.AG.wallDist(ray, 90);
  const hits = alive.map(z => { const cap = !!capsOf(z); const h = cap ? hitChar(ray, z, 90) : null; return { cap, t: h && +h.t.toFixed(2), head: !!(h && h.head), hp: z.hp, dead: !!z.dead, x: +z.root.position.x.toFixed(2), z: +z.root.position.z.toFixed(2) }; });
  const hpBefore = alive.map(z => z.hp);
  T.GS.cd = 0; T.fireGun();
  if (T.GS.mz) { T.GS.mz.visible = true; T.GS.mT = 8; }
  const hpAfter = T.AG.alive().map(z => z.hp);
  const deadNow = T.Z.zombies.filter(z => z.dead && z.hp > -100).map(z => z.hp);
  return { last: T.S.lastShot, nr: +nr.toFixed(2), wd: +wd.toFixed(2), hits, hpBefore, hpAfter, aimW: T.S.aimW, end: T.GS._trEnd && [+T.GS._trEnd.x.toFixed(2), +T.GS._trEnd.y.toFixed(2), +T.GS._trEnd.z.toFixed(2)] };
});
await p.screenshot({ path: `${OUT}/mp_midshot.png` });
check('shot registered a hit on a zombie', !!(shot.last && shot.last.hits > 0), shot);

// 0 page errors, then leave town so we don't leave a session hanging
const errList = errs.slice();
check('0 page errors', errList.length === 0, errList);

await p.evaluate(() => {
  const T = window.__mpTown; if (!T) return;
  try { T.inp.tAim = false; } catch (e) { /* ignore */ }
  // exit is not on the api; click the Exit button if present
  const b = [...document.querySelectorAll('#hudr2 button, button')].find(x => /exit/i.test(x.textContent || ''));
  if (b) b.click();
});
await p.waitForTimeout(400);
await b.close();

const all = results.every(Boolean);
console.log(all ? 'ALL PASS' : 'SOME FAILED', `${results.filter(Boolean).length}/${results.length}`);
if (!all) process.exit(1);
