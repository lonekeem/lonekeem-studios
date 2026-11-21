// Survival rifle-shot hitch + shader-count probe (stepped frame times + program count).
// usage: node tools/shot-perf/probe.mjs [port] [outPrefix]
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const port = process.argv[2] || '5328';
const prefix = process.argv[3] || '/workspace/atq-perf-proof/before';

const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
});
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'med', gore: true, hints: false, still: false })));
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push(String(e.message || e)));

await p.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load', timeout: 180000 });
const step = await p.evaluate(async () => (await import('/src/game/story.js')).SURVIVAL_STEP);
console.log('SURVIVAL_STEP', step);

await p.goto(`http://127.0.0.1:${port}/?step=${step}&god`, { waitUntil: 'load', timeout: 180000 });
await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 180000 });
await p.waitForTimeout(1500);

const out = await p.evaluate(() => {
  const g = window.__atq.game, I = g.input, dt = 1 / 60;
  g.paused = true; g.god = true; g.timeScale = 1; g.hitstop = 0; g.slowT = 0;
  for (let i = 0; i < 80; i++) g.skipLine && g.skipLine();
  g.dlgCur = null; g.cut = null;
  const S = g.save;
  if (!S.owned.includes('rifle')) S.owned.push('rifle');
  g.equip('rifle', true);
  S.mags.rifle = 999; S.ammo.rifle = 999;
  g.stepData = g.stepData || {};
  g.stepData.waveT = 1e9;
  g.zombies.forEach(z => { z.hp = 0; z.dead = true; z.root.visible = false; z.speed = 0; });
  const P = g.player.root.position;
  P.set(0, 0, -236);
  g.cam.yaw = 0; g.cam.pitch = -0.08;
  g.player.root.rotation.y = Math.PI;
  const stepN = (n) => { for (let i = 0; i < n; i++) { I.poll(dt); g.update(dt, dt); g.render(dt); } };
  stepN(15);
  const z1 = g.spawnZ(0, -244), z2 = g.spawnZ(1.2, -245);
  [z1, z2].forEach(z => { z.hp = z.maxHp = 1e9; z.speed = 0; z.frozen = true; z.st = 'idle'; });
  const zu = g.updateZ.bind(g);
  g.updateZ = (d) => { zu(d); [z1, z2].forEach(z => { z.hp = 1e9; z.dead = false; z.speed = 0; z.st = 'idle'; }); };
  stepN(20);

  const programs = () => (g.renderer.info.programs || []).length;
  const visible = (o) => { let x = o; while (x) { if (x.visible === false) return false; x = x.parent; } return true; };
  const walls = g.world.walls || [];
  const stats = (arr) => {
    if (!arr.length) return { n: 0, max: 0, p95: 0, med: 0, mean: 0 };
    const a = arr.slice().sort((x, y) => x - y);
    const pct = (p) => a[Math.min(a.length - 1, Math.floor(p / 100 * a.length))];
    const sum = a.reduce((s, v) => s + v, 0);
    return { n: a.length, max: +a[a.length - 1].toFixed(2), p95: +pct(95).toFixed(2), med: +pct(50).toFixed(2), mean: +(sum / a.length).toFixed(2) };
  };

  const idle = [];
  for (let i = 0; i < 40; i++) {
    const t0 = performance.now();
    I.poll(dt); g.update(dt, dt); g.render(dt);
    idle.push(performance.now() - t0);
  }
  const progBefore = programs();

  const shot = [], fireMs = [];
  const origFire = g.fire.bind(g);
  g.fire = function () { const t0 = performance.now(); const r = origFire(); fireMs.push(performance.now() - t0); return r; };
  const mag0 = g.save.mags.rifle;
  for (let i = 0; i < 30; i++) {
    g.state.fireCd = 0; g.state.reload = 0; g.save.mags.rifle = 999;
    I.btn.atk = true; I.atk = true; I.edge.atk = true;
    const t0 = performance.now();
    I.poll(dt); g.update(dt, dt); g.render(dt);
    shot.push(performance.now() - t0);
    I.btn.atk = false; I.atk = false; I.edge.atk = false;
    I.poll(dt); g.update(dt, dt); g.render(dt);
  }
  const fired = 30 - 0 + (mag0 >= 0 ? (999 - g.save.mags.rifle + (30 - 1)) : 0);
  // count via fireMs length (each successful fire hooks)
  const progAfter = programs();
  const progFirst = progBefore;

  return {
    setup: {
      step: g.step, survival: !!g.survival, obj: document.querySelector('#objt')?.textContent,
      qual: g.Q && g.Q.name, post: !!(g.Q && g.Q.post),
      walls: walls.length, wallsVis: walls.filter(visible).length,
      z: g.alive().length, cur: g.save.cur,
    },
    progBefore, progAfter, progDelta: progAfter - progBefore,
    firedCalls: fireMs.length,
    idle: stats(idle),
    shot: stats(shot),
    fire: stats(fireMs),
    idleAll: idle.map(v => +v.toFixed(2)),
    shotAll: shot.map(v => +v.toFixed(2)),
    fireAll: fireMs.map(v => +v.toFixed(2)),
  };
});

// mid-shot screenshot: flash on, one render
await p.evaluate(() => {
  const g = window.__atq.game, I = g.input, dt = 1 / 60;
  g.paused = true; g.state.fireCd = 0; g.state.reload = 0; g.save.mags.rifle = 999;
  I.btn.atk = true; I.atk = true; I.edge.atk = true;
  I.poll(dt); g.update(dt, dt);
  g.mT = 0.4; g.trT = 0.4;
  g.render(dt);
});
const shotPath = prefix + '-midshot.png';
await p.screenshot({ path: shotPath, timeout: 120000 });

const result = { ...out, errs: errs.slice(0, 8), shotPath };
writeFileSync(prefix + '.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
await b.close();
