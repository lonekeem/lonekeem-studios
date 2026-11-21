// Frustum-culling pop probe: orbit the camera 360° around the player and list meshes that three.js culls (bounding sphere
// outside the view) although their real, precise bounds (skinning / instances included) are inside it.
// node tools/probe_cull.mjs <port> <step> <out.json>
import { chromium } from 'playwright';
import fs from 'fs';
const [port, step = 'survival', OUT = '/tmp/cull.json'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => { localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'medium', gore: true, hints: false })); localStorage.setItem('atq_prologue_seen', '1'); });
const p = await ctx.newPage(); p.on('pageerror', e => console.log('ERR', e.message.slice(0, 200)));
await p.goto(`http://127.0.0.1:${port}/?step=${step}&god`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 180000 }); await p.waitForTimeout(2500);
const out = await p.evaluate(async () => { const T = await import('/node_modules/three/build/three.module.js'); const g = window.__atq.game, S = g.scene, cam = g.camera; g.god = true;
  for (let i = 0; i < 80; i++) g.skipLine && g.skipLine();
  for (let i = 0; i < 450; i++) g.update(1 / 30, 1 / 30);
  const al = g.alive(); al.slice(0, Math.ceil(al.length / 2)).forEach(z => { z.hp = 1; try { g.dmgZ ? g.dmgZ(z, 999) : g.hitZ(z, 999); } catch (e) { } });
  for (let i = 0; i < 90; i++) g.update(1 / 30, 1 / 30); g.paused = true;
  const P = g.player.root.position.clone(); const fr = new T.Frustum(), m = new T.Matrix4(), bx = new T.Box3(), sph = new T.Sphere(); const found = new Map(); let checked = 0;
  const name = (o) => { const parts = []; for (let q = o; q && q !== S; q = q.parent) parts.push(q.name || q.type); let tag = ''; for (let q = o; q; q = q.parent) { if (q.userData && q.userData.tag) tag = q.userData.tag; }
    const isZ = g.zombies.some(z => { let r = false; z.root.traverse(c => { if (c === o) r = true; }); return r; }); const isN = Object.values(g.npcs || {}).some(n => { let r = false; n.root.traverse(c => { if (c === o) r = true; }); return r; });
    return (isZ ? 'ZOMBIE:' : isN ? 'NPC:' : '') + parts.reverse().join('/') + ' ' + (o.geometry ? o.geometry.type + ':' + (o.geometry.attributes.position ? o.geometry.attributes.position.count : 0) : '') + (o.isInstancedMesh ? ' inst' + o.count : '') + (o.isSkinnedMesh ? ' skinned' : ''); };
  for (let a = 0; a < 360; a += 5) { const r = a * Math.PI / 180; cam.position.set(P.x + Math.sin(r) * 4.2, 2.4, P.z + Math.cos(r) * 4.2); cam.lookAt(P.x - Math.sin(r) * 6, 1.3, P.z - Math.cos(r) * 6); cam.updateMatrixWorld();
    m.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); fr.setFromProjectionMatrix(m);
    S.updateMatrixWorld(true);
    S.traverseVisible(o => { if (!(o.isMesh || o.isPoints || o.isLine || o.isSprite) || !o.frustumCulled || o.isSprite) return; checked++;
      if (fr.intersectsObject(o)) return; // three would draw it
      bx.makeEmpty(); try { bx.expandByObject(o, true); } catch (e) { return; } if (bx.isEmpty()) return;
      if (bx.min.distanceTo(bx.max) > 400) { /* huge */ }
      if (fr.intersectsBox(bx)) { const k = o.uuid; const e = found.get(k) || { name: name(o), angles: [], bs: o.geometry && o.geometry.boundingSphere ? [o.geometry.boundingSphere.center.toArray().map(v => +v.toFixed(2)), +o.geometry.boundingSphere.radius.toFixed(2)] : null, box: [bx.min.toArray().map(v => +v.toFixed(1)), bx.max.toArray().map(v => +v.toFixed(1))] }; e.angles.push(a); found.set(k, e); } }); }
  return { P: [P.x, P.z], zombies: g.zombies.length, dead: g.zombies.filter(z => z.dead).length, checked, pops: [...found.values()] }; });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log('zombies', out.zombies, 'dead', out.dead, 'pops', out.pops.length);
out.pops.slice(0, 60).forEach(e => console.log(e.angles.length, e.name, JSON.stringify(e.bs), JSON.stringify(e.box)));
await b.close();
