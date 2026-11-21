// Realistic aim probe: a live (chasing, attacking) zombie walks up to Keem while the camera keeps the crosshair dead-centre on the
// zombie's VISIBLE chest (avatar Spine bone when it has a skin). Holds fire; counts hit markers per shot, split by range.
// usage: node tools/aimfix/probe2.mjs <port> <gun> [rig] [w h] [aim 0/1] [startDist] [frames] [shot.png]
import { chromium } from 'playwright';
const [,, port = '5291', gun = 'rifle', rig = 'zombie_big', w = '844', h = '390', aim = '0', start = '7', frames = '360', shot = ''] = process.argv;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const mobile = +w < 1000; const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, hasTouch: mobile, isMobile: mobile });
await ctx.addInitScript(() => localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true })));
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${port}/?step=3&god${process.env.Q || ''}`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 120000 }); await p.waitForTimeout(2000);
const r = await p.evaluate(async ([gun, rig, aim, start, frames]) => { const THREE = await import('/node_modules/.vite/deps/three.js'); const g = window.__atq.game, dt = 1 / 60, I = g.input; g.paused = true; g.god = true;
  for (let i = 0; i < 80; i++) g.skipLine && g.skipLine();
  const S = g.save; if (!S.owned.includes(gun)) S.owned.push(gun); g.equip(gun, true);
  const step = (n) => { for (let i = 0; i < n; i++) { I.poll(dt); g.update(dt, dt); g.render(dt); } };
  g.zombies.forEach(z => { z.dead = true; z.root.visible = false; }); g.zombies.length = 0;
  g.player.root.position.set(0, 0, -20); g.cam.yaw = 0; g.cam.pitch = -0.1; g.player.root.rotation.y = Math.PI; step(20);
  I.tAim = aim; step(10);
  const T = g.player.root.position; const z = g.spawnZ(T.x + .6, T.z - start, rig ? { rig, runner: false } : { runner: false }); z.hp = z.maxHp = 1e9; z.st = 'chase'; z.aggro = 99; z.speed = 1.3;
  const chest = (o) => { const pr = z._pairs && z._pairs.find(q => q.tn === 'Spine'); if (pr) return pr.tb.getWorldPosition(o); return z.worldOf('DEF-spine.003', o); };
  const aimAt = () => { const tgt = chest(new THREE.Vector3()); for (let it = 0; it < 3; it++) { const sa = g.state.aim; g.state.aim = true; const ray = g.aimRay(1); g.state.aim = sa; const want = tgt.clone().sub(ray.origin).normalize(); const d = ray.direction;
      const ey = Math.atan2(want.x, want.z) - Math.atan2(d.x, d.z), ep = Math.asin(want.y) - Math.asin(d.y); g.cam.yaw += ((ey + Math.PI * 3) % (Math.PI * 2) - Math.PI); g.cam.pitch += ep; g.render(0); } return tgt; };
  let hits = 0, lastHit = false; const hm = g.hitMark.bind(g); g.hitMark = (hd) => { hits++; lastHit = true; hm(hd); };
  const rows = []; const bins = { close: [0, 0], mid: [0, 0], far: [0, 0] };
  const dir = new THREE.Vector3(z.root.position.x - T.x, 0, z.root.position.z - T.z).normalize(); const pin = (k) => { const d = Math.max(1.0, start - (start - 1) * k / (frames * .6)); z.root.position.set(T.x + dir.x * d, 0, T.z + dir.z * d); z.root.rotation.y = Math.atan2(-dir.x, -dir.z); };
  for (let k = 0; k < frames; k++) { pin(k); aimAt(); S.mags[gun] = 99; g.state.reload = 0; I.btn.atk = true; const m0 = S.mags[gun]; lastHit = false; I.poll(dt); g.update(dt, dt); pin(k); g.render(dt);
    if (S.mags[gun] < m0) { const d = Math.hypot(z.root.position.x - T.x, z.root.position.z - T.z); const bn = d < 1.6 ? 'close' : d < 4 ? 'mid' : 'far'; bins[bn][0]++; if (lastHit) bins[bn][1]++; rows.push([+d.toFixed(2), lastHit ? 1 : 0, z.curName]); } }
  I.btn.atk = false; window.__z = z;
  return { gun, rig: z.look && z.look.rig, shots: rows.length, hits, bins, sample: rows.filter((_, i) => i % 6 === 0).slice(0, 14), zEnd: z.curName };
}, [gun, rig, aim === '1', +start, +frames]);
console.log(JSON.stringify(r));
if (shot) { await p.evaluate(() => { const g = window.__atq.game; g.muzzle.visible = true; g.tracer.visible = true; g.render(0); }); await p.screenshot({ path: shot, timeout: 120000 }); }
console.log('errs', errs.slice(0, 3)); await b.close();
