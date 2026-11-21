// Evaluated in the page (tools/aimfix/dbg.mjs): puts a zombie (window.__rigq, default zombie_big) at window.__dist m in front of Keem in its
// attack pose, samples points on the camera-facing half of its VISIBLE upper body, and fires the game's real fire() through each point
// (aimRay patched to pass through it). Returns how many of those on-body shots register a hit.
(async () => { const THREE = await import('/node_modules/.vite/deps/three.js'); const g = window.__atq.game, dt = 1 / 60, I = g.input; g.paused = true; g.god = true; for (let i = 0; i < 80; i++) g.skipLine && g.skipLine();
  const step = n => { for (let i = 0; i < n; i++) { I.poll(dt); g.update(dt, dt); g.render(dt); } };
  const S = g.save; if (!S.owned.includes('rifle')) S.owned.push('rifle'); g.equip('rifle', true); g.zombies.forEach(z => { z.dead = true; z.root.visible = false; }); g.zombies.length = 0;
  g.player.root.position.set(0, 0, -20); g.cam.yaw = 0; g.cam.pitch = -0.12; step(20);
  const D = window.__dist || 1.1; const z = g.spawnZ(0.35, -20 - D, { rig: window.__rigq || 'zombie_big', runner: false }); z.hp = z.maxHp = 1e9; z.speed = 0; z.st = 'chase'; z.aggro = 99;
  const pin = () => { z.root.position.set(0.35, 0, -20 - D); z.root.rotation.y = 0; z.hp = 1e9; }; const zu = g.updateZ.bind(g); g.updateZ = (d) => { pin(); zu(d); pin(); };
  z.play('Punch_Jab'); step(12); pin(); g.render(0);
  // sample camera-facing upper-body vertices of the visible mesh
  let skin = z.skin; if (!skin) z.model.traverse(o => { if (!skin && o.isSkinnedMesh) skin = o; }); skin.skeleton.update(); const pos = skin.geometry.attributes.position; const cam = g.camera.position.clone(); const ctr = z.root.position.clone(); ctr.y = 1.1;
  const pts = []; const v = new THREE.Vector3(); const stepV = Math.max(1, Math.floor(pos.count / 1500));
  for (let i = 0; i < pos.count; i += stepV) { skin.getVertexPosition(i, v); v.applyMatrix4(skin.matrixWorld); if (v.y < .85) continue; if (v.distanceTo(cam) > ctr.distanceTo(cam)) continue; pts.push(v.clone()); }
  // keep 60 spread-out points
  const pick = []; for (let i = 0; i < pts.length && pick.length < 60; i += Math.max(1, Math.floor(pts.length / 60))) pick.push(pts[i]);
  let hits = 0, heads = 0; const hm = g.hitMark.bind(g); let got = false; g.hitMark = (h) => { got = true; if (h) heads++; hm(h); };
  const orig = g.aimRay.bind(g); let tgt = null; g.aimRay = function (p, e) { const r = orig(p, true); if (tgt) { r.direction.copy(tgt).sub(r.origin).normalize(); } return r; };
  // pull each point ~2 cm into the body so a point exactly on the skin surface counts as "on the body"
  for (const p of pick) { tgt = p.clone().lerp(ctr, .03); got = false; S.mags.rifle = 30; g.state.reload = 0; g.state.fireCd = 0; g.fire(); if (got) hits++; }
  g.aimRay = orig; const box = new THREE.Box3().setFromObject(skin, true);
  return { rig: z.look.rig, dist: D, anim: z.curName, samples: pick.length, hits, heads, rate: +(hits / Math.max(1, pick.length) * 100).toFixed(1), bodyBox: [box.min.toArray().map(x => +x.toFixed(2)), box.max.toArray().map(x => +x.toFixed(2))] }; })()
