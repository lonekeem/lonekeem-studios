// page eval (dbg.mjs): Keem + zombie on the crosshair at window.__dist, hip (or ADS when window.__ads), fires one real round and freezes
// that frame (flash/tracer kept visible, crosshair held in the hit-marker colour if the round hit) for a screenshot.
(async () => { const g = window.__atq.game, dt = 1 / 60, I = g.input; g.paused = true; g.god = true; for (let i = 0; i < 80; i++) g.skipLine && g.skipLine();
  const gun = window.__gun || 'rifle'; const S = g.save; if (!S.owned.includes(gun)) S.owned.push(gun); g.equip(gun, true);
  const step = n => { for (let i = 0; i < n; i++) { I.poll(dt); g.update(dt, dt); g.render(dt); } };
  g.zombies.forEach(z => { z.dead = true; z.root.visible = false; }); g.zombies.length = 0;
  g.player.root.position.set(0, 0, -20); g.cam.yaw = window.__yaw0 || 0.25; g.cam.pitch = -0.1; I.tAim = !!window.__ads; step(30);
  const sa = g.state.aim; g.state.aim = true; const ray = g.aimRay(1, true); g.state.aim = sa; const T = g.player.root.position; let t = 0; for (; t < 60; t += .05) { const q = ray.at(t, T.clone()); if (Math.hypot(q.x - T.x, q.z - T.z) >= (window.__dist || 5)) break; }
  const q = ray.at(t, T.clone()); const z = g.spawnZ(q.x, q.z, { rig: 'zombie_male' }); z.hp = 1e9; z.speed = 0; z.st = 'idle'; const pin = () => z.root.position.set(q.x, 0, q.z); const zu = g.updateZ.bind(g); g.updateZ = d => { pin(); zu(d); pin(); }; step(6);
  // centre the crosshair on the chest
  let best = 9, bp = g.cam.pitch; for (let pt = -0.45; pt <= 0.2; pt += 0.01) { g.cam.pitch = pt; g.render(0); const sa2 = g.state.aim; g.state.aim = true; const r = g.aimRay(1, true); g.state.aim = sa2; const c = z.root.position.clone(); c.y = 1.15; const e = r.distanceSqToPoint(c); if (e < best) { best = e; bp = pt; } } g.cam.pitch = bp; step(8);
  let hit = null; const hm = g.hitMark.bind(g); g.hitMark = h => { hit = h ? 'head' : 'body'; hm(h); };
  S.mags[gun] = 30; g.state.fireCd = 0; I.btn.atk = true; I.edge.atk = true; step(2); I.btn.atk = false; I.poll(dt); g.cam.pitch = bp; g.update(dt * .2, dt * .2); g.render(0);
  const x = document.querySelector('#xhair'); clearTimeout(g._hm); if (hit) x.style.color = hit === 'head' ? '#f44' : '#fc8';
  const mz = new g.camera.position.constructor(); g.weaponMeshes[gun].getObjectByName('muzzle').getWorldPosition(mz);
  const keep = g.render.bind(g); g.render = (d) => { g.muzzle.visible = true; g.tracer.visible = true; g.mLight.intensity = 30; keep(0); };
  return { gun, ads: !!window.__ads, hit, flash: g.muzzle.position.toArray().map(v => +v.toFixed(2)), muzzle: mz.toArray().map(v => +v.toFixed(2)), anim: g.player.curName }; })()
