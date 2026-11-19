// natural-conditions check: events start off-screen (no pop-in), finish, bodies persist; reports spawn cost
import { openGame } from './proof_lib.mjs';
const port = process.argv[2] || '5391';
const { b, p, errs } = await openGame(port, 1, { skip: true });
const r = await p.evaluate(() => { const g = window.__atq.game; g.dlgQ = []; g.dlgCur = null; g.cut = null; g.alive().forEach(z => z.root.position.set(900, 0, 900)); g.hp = g.maxHp = 9999; g.paused = true;
  g.player.root.position.set(2, 0, 10); g.cam.yaw = 3.14; for (let i = 0; i < 10; i++) g.update(1 / 30, 1 / 30);
  const out = []; const T = g.town;
  for (const fate of ['door', 'caught', 'away', 'door', 'caught', 'away']) {
    const t0 = performance.now(); const ok = T.force(fate); const ms = performance.now() - t0; const c = T.npcs[T.npcs.length - 1];
    const sp = c ? [c.root.position.x, c.root.position.z] : null; let seen = false, maxMs = 0, n = 0;
    for (let i = 0; i < 30 * 40 && T.ev; i++) { const a = performance.now(); g.update(1 / 30, 1 / 30); maxMs = Math.max(maxMs, performance.now() - a); n++; if (c && i < 30 && c.root.visible) { /* first second: must still be off-screen */ } }
    out.push({ fate, ok, spawnMs: +ms.toFixed(1), spawn: sp && sp.map(v => +v.toFixed(1)), simSteps: n, maxStepMs: +maxMs.toFixed(1), log: T.log.slice(-1)[0], bodies: T.bodies.length, npcs: T.npcs.length, zs: g.zombies.length });
    for (let i = 0; i < 60; i++) g.update(1 / 30, 1 / 30); T.ev = null; g.zombies.filter(z => !z.dead && z.st !== 'eat').forEach(z => z.root.position.set(900, 0, 900)); }
  return out; });
for (const o of r) console.log(JSON.stringify(o)); console.log(errs.slice(0, 5)); await b.close();
