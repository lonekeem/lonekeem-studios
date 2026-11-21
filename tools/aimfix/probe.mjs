// Aim probe: story step 3 (garage), equip a gun, stand Keem, put a frozen zombie under the crosshair at D metres, hold fire, count hits.
// usage: node tools/aimfix/probe.mjs <port> <gun> <dist> [w h] [aim 0/1] [move: none|fwd|strafe] [shots] [shotPath]
import { chromium } from 'playwright';
const [,, port = '5291', gun = 'rifle', dist = '3', w = '844', h = '390', aim = '0', move = 'none', shots = '30', shot = ''] = process.argv;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const mobile = +w < 1000; const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, hasTouch: mobile, isMobile: mobile });
await ctx.addInitScript((r) => { if (r) window.__rig = r; }, process.env.RIG || '');
await ctx.addInitScript(() => localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true })));
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${port}/?step=3&god${process.env.Q || ""}`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 120000 }); await p.waitForTimeout(2000);
const runOne = (gun, dist, aim, move, shots) => p.evaluate(async ([gun, dist, aim, move, shots]) => { const g = window.__atq.game, dt = 1 / 60, I = g.input; g.paused = true; g.god = true;
  for (let i = 0; i < 80; i++) g.skipLine && g.skipLine(); g.dlgCur = null; g.cut = null;
  const S = g.save; if (!S.owned.includes(gun)) S.owned.push(gun); g.equip(gun, true);
  const step = (n) => { for (let i = 0; i < n; i++) { I.poll(dt); g.update(dt, dt); g.render(dt); } };
  // clear the street and put Keem in the open road facing north-ish
  g.zombies.forEach(z => { z.hp = 0; z.dead = true; z.root.visible = false; }); g.zombies.length = 0;
  g.player.root.position.set(0, 0, -20); g.cam.yaw = 0; g.cam.pitch = -0.08; g.player.root.rotation.y = Math.PI; step(30);
  I.tAim = aim; step(20);
  const T = g.player.root.position; const fwd = { x: -Math.sin(g.cam.yaw), z: -Math.cos(g.cam.yaw) };
  // put the zombie where the dead-centre crosshair ray (no spread) crosses the ground circle of radius dist around Keem
  { const sa = g.state.aim; g.state.aim = true; const ray = g.aimRay(1); g.state.aim = sa; let tt = 0; for (; tt < 80; tt += .02) { const q = ray.at(tt, T.clone()); if (Math.hypot(q.x - T.x, q.z - T.z) >= dist && (q.x - T.x) * fwd.x + (q.z - T.z) * fwd.z > 0) break; } const q = ray.at(tt, T.clone()); fwd.x = (q.x - T.x) / dist; fwd.z = (q.z - T.z) / dist; }
  const z = g.spawnZ(T.x + fwd.x * dist, T.z + fwd.z * dist, window.__rig ? { rig: window.__rig } : {}); z.hp = z.maxHp = 1e9; z.speed = 0; z.frozen = true; const ss = z; ss.root.rotation.y = Math.atan2(-fwd.x, -fwd.z);
  const zu = g.updateZ.bind(g); g.updateZ = (dt) => { ss.root.position.set(T.x + fwd.x * dist, 0, T.z + fwd.z * dist); ss.hp = 1e9; zu(dt); ss.root.position.set(T.x + fwd.x * dist, 0, T.z + fwd.z * dist); };
  let hits = 0, heads = 0; const hm = g.hitMark.bind(g); g.hitMark = (hd) => { hits++; if (hd) heads++; hm(hd); };
  S.mags[gun] = 999; S.ammo[g.ws && WEAPONS_AMMO(gun)] = 999;
  function WEAPONS_AMMO() { return 'x'; }
  // aim the camera so the crosshair is on the zombie chest: sweep pitch to find the ray through the torso centre
  step(10);
  // sweep camera pitch until the dead-centre crosshair ray passes through the zombie's chest (1.15 m * scale)
  { let best = 9, bp = g.cam.pitch; for (let pt = -0.5; pt <= 0.3; pt += 0.01) { g.cam.pitch = pt; step(1); const sa = g.state.aim; g.state.aim = true; const ray = g.aimRay(1); g.state.aim = sa; const c = ss.root.position.clone(); c.y = 1.15 * (ss.scale || 1); const e = ray.distanceSqToPoint(c); if (e < best) { best = e; bp = pt; } } g.cam.pitch = bp; window.__pitch = bp; window.__yaw = g.cam.yaw; step(4); }
  if (move === 'fwd') I.stick.set(0, -0.6); else if (move === 'strafe') I.stick.set(0.8, 0); else if (move === 'back') I.stick.set(0, 0.6);
  let fired = 0, mz0 = S.mags[gun], log = [];
  const ang = []; const W = new g.camera.position.constructor();
  let shotHits = 0; for (let k = 0; k < 2000 && fired < shots; k++) { const hb = hits; S.mags[gun] = 999; g.cam.pitch = window.__pitch; g.cam.yaw = window.__yaw; /* the player keeps the crosshair centred on the chest (recoil re-centred every frame) */  g.state.reload = 0; I.btn.atk = true; if (g.state.fireCd <= 0) I.edge.atk = true; /* semi-auto guns: a fresh trigger pull whenever the gun is ready */ I.poll(dt); g.update(dt, dt); g.render(dt);
    if (g.save.mags[gun] < 999) { fired++; if (hits > hb) shotHits++;
      // gun barrel direction vs camera forward (yaw diff, degrees)
      const m = g.weaponMeshes[gun]; const mzO = m.getObjectByName('muzzle'); const a = new g.camera.position.constructor(), bb = a.clone(); m.localToWorld(a.set(0, .02, 0)); mzO.getWorldPosition(bb); const d = bb.clone().sub(a).normalize();
      const cf = new g.camera.position.constructor(); g.camera.getWorldDirection(cf); const yd = (Math.atan2(d.x, d.z) - Math.atan2(cf.x, cf.z)) * 57.3; ang.push(((yd + 540) % 360) - 180);
      const tp = g.tracer.geometry.attributes.position; log.push({ mz: [bb.x, bb.y, bb.z].map(v => +v.toFixed(2)), fl: [g.muzzle.position.x, g.muzzle.position.y, g.muzzle.position.z].map(v => +v.toFixed(2)), tr0: [tp.getX(0), tp.getY(0), tp.getZ(0)].map(v => +v.toFixed(2)) }); }
    if (fired >= 1 && fired === 1 && !window.__snap) { window.__snap = 1; } }
  I.btn.atk = false; I.stick.set(0, 0);
  const rld = document.querySelector('#rld'); const at = document.querySelector('#ammoTxt').textContent;
  return { fired, hits, heads, rate: +(shotHits / Math.max(1, fired) * 100).toFixed(1), pelletHits: hits, rig: ss.look && ss.look.rig, zscale: +(ss.scale||1).toFixed(2), zanim: ss.curName, zd: +Math.hypot(ss.root.position.x - T.x, ss.root.position.z - T.z).toFixed(2), gunYawVsCam: ang.slice(0, 5).map(v => +v.toFixed(1)), rootRot: +g.player.root.rotation.y.toFixed(2), camYaw: +g.cam.yaw.toFixed(2), anim: g.player.curName, pitch: +window.__pitch.toFixed(2), locoOn: g.player.locoOn, rldOn: rld && rld.classList.contains('on'), ammoTxt: at, first: log[0], spd: +(g.state.spd || 0).toFixed(2) };
}, [gun, +dist, aim, move, +shots]);
const out = [];
for (const G of gun.split(',')) for (const A of aim.split(',')) for (const M of move.split(',')) for (const D of dist.split(',')) { const r = await runOne(G, +D, A === '1', M, +shots); const row = { gun: G, dist: +D, ads: A === '1', move: M, fired: r.fired, hits: r.hits, rate: r.rate, rig: r.rig, gunYawVsCam: r.gunYawVsCam[0], spd: r.spd, rldOn: r.rldOn }; out.push(row); console.log(JSON.stringify(row)); }
const r = out[out.length - 1] || {};
if (shot) { await p.evaluate(() => { const g = window.__atq.game; g.input.btn.atk = true; for (let i = 0; i < 3; i++) { g.input.poll(1 / 60); g.update(1 / 60, 1 / 60); } g.mT = 1; g.trT = 1; g.input.btn.atk = false; }); await p.waitForTimeout(400); await p.screenshot({ path: shot, timeout: 120000 }); }
console.log('errs', errs.slice(0, 3)); await b.close();
