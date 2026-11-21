// Camera-distance probe for fix/cam-drift.
// Usage: node tools/probe_cam_drift.mjs <port> <outdir> [tag]
import { openGame, stepShot } from './proof_lib.mjs';
import fs from 'fs';

const port = process.argv[2] || '4195';
const out = process.argv[3] || '/workspace/atq-cam-proof';
const tag = process.argv[4] || 'before';
fs.mkdirSync(out, { recursive: true });

const log = [];
const rec = (k, v) => { log.push({ k, v }); console.log(k, typeof v === 'object' ? JSON.stringify(v) : v); return v; };

const sample = () => p.evaluate(() => {
  const g = window.__atq.game; g.render(1 / 30);
  const P = g.player.root.position, C = g.camera;
  const tgtY = (g.state && g.state.crouch ? 1.05 : 1.5) + P.y;
  const dx = C.position.x - P.x, dy = C.position.y - tgtY, dz = C.position.z - P.z;
  const dist = Math.hypot(dx, dy, dz), xz = Math.hypot(dx, dz);
  if (!g._camBox) { try { g.pushCamOutOfChars(); } catch (e) {} }
  let boxInfo = null;
  if (g.boss && g.boss.root && g._camBox) {
    const Box3 = g._camBox.constructor;
    const b = new Box3().setFromObject(g.boss.root);
    const mid = { x: (b.min.x + b.max.x) / 2, y: (b.min.y + b.max.y) / 2, z: (b.min.z + b.max.z) / 2 };
    const rad = Math.max(b.max.x - mid.x, b.max.z - mid.z, .4) + .32;
    const inside = b.containsPoint(C.position) || b.distanceToPoint(C.position) <= .22;
    boxInfo = {
      min: [+b.min.x.toFixed(2), +b.min.y.toFixed(2), +b.min.z.toFixed(2)],
      max: [+b.max.x.toFixed(2), +b.max.y.toFixed(2), +b.max.z.toFixed(2)],
      size: [+(b.max.x - b.min.x).toFixed(2), +(b.max.y - b.min.y).toFixed(2), +(b.max.z - b.min.z).toFixed(2)],
      rad: +rad.toFixed(2), inside, scale: g.boss.scale || 1
    };
  }
  let npcs = [];
  if (g._camBox) {
    const Box3 = g._camBox.constructor;
    const list = [];
    if (g.npcs) for (const k in g.npcs) list.push([k, g.npcs[k]]);
    for (const [k, c] of list) {
      if (!c || !c.root) continue;
      const b = new Box3().setFromObject(c.root);
      const mid = { x: (b.min.x + b.max.x) / 2, z: (b.min.z + b.max.z) / 2 };
      const rad = Math.max(b.max.x - mid.x, b.max.z - mid.z, .4) + .32;
      const size = [+(b.max.x - b.min.x).toFixed(2), +(b.max.y - b.min.y).toFixed(2), +(b.max.z - b.min.z).toFixed(2)];
      npcs.push({ k, size, rad: +rad.toFixed(2), inside: b.containsPoint(C.position) || b.distanceToPoint(C.position) <= .22 });
    }
  }
  return {
    dist: +dist.toFixed(3), xz: +xz.toFixed(3), fov: +C.fov.toFixed(2),
    aim: !!(g.state && g.state.aim), roll: +((g.state && g.state.roll) || 0).toFixed(2),
    pitch: +g.cam.pitch.toFixed(3), yaw: +g.cam.yaw.toFixed(3),
    p: [+P.x.toFixed(2), +P.y.toFixed(2), +P.z.toFixed(2)],
    c: [+C.position.x.toFixed(2), +C.position.y.toFixed(2), +C.position.z.toFixed(2)],
    cut: !!g.cut, fp: !!g.cam.fp, boss: boxInfo, npcs
  };
});

const go = (n, dt = 1 / 30) => p.evaluate(([n, dt]) => {
  const g = window.__atq.game; g.paused = true; g.god = true;
  for (let i = 0; i < n; i++) { g.input.poll(dt); g.update(dt, dt); g.render(dt); }
}, [n, dt]);

const setKeys = (o) => p.evaluate((o) => {
  const I = window.__atq.game.input, K = I.keys;
  for (const k of ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ShiftLeft']) K[k] = false;
  if ((o.y || 0) > .2) K.KeyS = true;
  if ((o.y || 0) < -.2) K.KeyW = true;
  if ((o.x || 0) > .2) K.KeyD = true;
  if ((o.x || 0) < -.2) K.KeyA = true;
  I.mAim = I.tAim = !!o.aim; I.mAtk = !!o.atk; I.touchRun = !!o.run; if (o.run) K.ShiftLeft = true;
}, o);

let { b, p, errs } = await openGame(port, 5, { skip: true, w: 844, h: 390 });

// Skip leftover dialogue, kill cuts, place player in the open lot near Gus
await p.evaluate(() => {
  const g = window.__atq.game; g.god = true; g.cut = null;
  for (let i = 0; i < 80; i++) g.skipLine && g.skipLine();
  g.cut = null; g.dlgCur = null; g.dlgQ = [];
  // open pavement near ROSEWOOD BRIDGE / Gus (spawn is ~1, -93.5; Gus at -0.2, -103.5)
  const P = g.player.root.position;
  P.set(0.4, 0, -100.2);
  g.cam.yaw = 0; // look toward -Z (toward Gus)
  g.cam.pitch = -0.12;
  g.cam.fp = false;
  if (g.save) g.save.cur = 'rifle';
  g.equip && g.equip('rifle', true);
  g.paused = true;
});
await go(8);
const t0 = rec('boss_start', await sample());
await stepShot(p, `${out}/${tag}_boss_start.png`, 2);

// 20+ seconds of aim + fire + backpedal + periodic rolls
const series = [];
for (let s = 0; s < 24; s++) {
  const phase = s % 8;
  if (phase === 5) {
    await setKeys({ x: 0, y: 0.9, aim: true, atk: true }); // backpedal while aiming/firing
    await go(8);
    await p.evaluate(() => window.__atq.game.roll && window.__atq.game.roll());
    await go(22);
  } else if (phase < 4) {
    await setKeys({ x: 0, y: 0.85, aim: true, atk: true }); // backpedal ADS fire
    await go(30);
  } else {
    await setKeys({ x: (phase === 4 ? 0.4 : -0.4), y: 0.5, aim: true, atk: true });
    await go(30);
  }
  const sm = await sample();
  series.push({ t: +(s * 1).toFixed(1), ...sm });
  if (s === 8) await stepShot(p, `${out}/${tag}_boss_aim.png`, 2);
  if (s === 16) await stepShot(p, `${out}/${tag}_boss_after_roll.png`, 2);
}
await setKeys({ x: 0, y: 0, aim: false, atk: false });
await go(45); // recover, no aim
const tEnd = rec('boss_after_recover', await sample());
await stepShot(p, `${out}/${tag}_boss_recover.png`, 2);

const dists = series.map(x => x.dist), fovs = series.map(x => x.fov);
const sum = a => a.reduce((x, y) => x + y, 0);
const stats = (a) => ({ min: +Math.min(...a).toFixed(3), max: +Math.max(...a).toFixed(3), mean: +(sum(a) / a.length).toFixed(3), end: +a[a.length - 1].toFixed(3) });
rec('boss_series_n', series.length);
rec('boss_dist', stats(dists));
rec('boss_fov', stats(fovs));
rec('boss_start_dist_fov', { dist: t0.dist, fov: t0.fov, box: t0.boss });
rec('boss_boxes', series.map(x => x.boss).filter(Boolean).slice(0, 3).concat(series.map(x => x.boss).filter(Boolean).slice(-1)));
fs.writeFileSync(`${out}/${tag}_boss_series.json`, JSON.stringify({ start: t0, end: tEnd, series, errs }, null, 2));

await b.close();

// -------- Survival (step 55) + normal running --------
({ b, p, errs } = await openGame(port, 55, { skip: true, w: 844, h: 390 }));
await p.evaluate(() => {
  const g = window.__atq.game; g.god = true; g.cut = null;
  for (let i = 0; i < 80; i++) g.skipLine && g.skipLine();
  g.cut = null; g.cam.fp = false; g.cam.pitch = -0.12;
  if (g.save) g.save.cur = 'rifle';
  g.equip && g.equip('rifle', true);
  g.paused = true;
});
await go(8);
const s0 = rec('surv_start', await sample());
await stepShot(p, `${out}/${tag}_surv_start.png`, 2);

const sSeries = [];
for (let s = 0; s < 22; s++) {
  const phase = s % 8;
  if (phase === 5) {
    await setKeys({ x: 0, y: 0.9, aim: true, atk: true });
    await go(8);
    await p.evaluate(() => window.__atq.game.roll && window.__atq.game.roll());
    await go(22);
  } else if (phase < 5) {
    await setKeys({ x: 0, y: 0.85, aim: true, atk: true });
    await go(30);
  } else {
    await setKeys({ x: 0, y: -1, aim: false, atk: false, run: true }); // sprint forward
    await go(30);
  }
  sSeries.push({ t: s, ...(await sample()) });
  if (s === 7) await stepShot(p, `${out}/${tag}_surv_aim.png`, 2);
  if (s === 16) await stepShot(p, `${out}/${tag}_surv_after_roll.png`, 2);
}
await setKeys({ x: 0, y: 0, aim: false, atk: false, run: false });
await go(45);
rec('surv_after_recover', await sample());
const sd = sSeries.map(x => x.dist), sf = sSeries.map(x => x.fov);
rec('surv_dist', stats(sd));
rec('surv_fov', stats(sf));

// normal running (no aim) for ~4s, screenshot
await setKeys({ x: 0, y: -1, aim: false, atk: false, run: true });
const runSeries = [];
for (let s = 0; s < 8; s++) { await go(15); runSeries.push(await sample()); }
await stepShot(p, `${out}/${tag}_normal_run.png`, 2);
rec('normal_run_dist', stats(runSeries.map(x => x.dist)));
rec('normal_run_fov', stats(runSeries.map(x => x.fov)));
await setKeys({ x: 0, y: 0, run: false });
await go(20);
rec('normal_idle_after_run', await sample());
await stepShot(p, `${out}/${tag}_normal_idle.png`, 2);

rec('page_errors', errs);
fs.writeFileSync(`${out}/${tag}_surv_series.json`, JSON.stringify({ start: s0, series: sSeries, run: runSeries, errs }, null, 2));
await b.close();
console.log(tag.toUpperCase(), 'DONE', 'errors', errs.length, errs.slice(0, 4));
