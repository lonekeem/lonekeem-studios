// identify which scene objects sit under given screen points (the 'red blob' near ROLL/HIT at the chapter-1 start view)
import { chromium } from 'playwright';
const [,, port = '5191'] = process.argv;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true })));
const p = await ctx.newPage(); await p.goto(`http://localhost:${port}/?step=0`); await p.waitForFunction(() => window.__atq?.game?.running, null, { timeout: 120000 }); await p.waitForTimeout(2500);
const r = await p.evaluate(async () => { const g = window.__atq.game; g.paused = true; const dt = 1 / 60; for (let i = 0; i < 60; i++) g.skipLine(); g.player.root.position.set(17.2, 0, 42.6); g.cam.yaw = 1.57; g.player.root.rotation.y = 1.57;
  for (let i = 0; i < 40; i++) { g.input.poll(dt); g.update(dt, dt); } g.input.stick.set(0, .6); for (let i = 0; i < 31; i++) { g.input.poll(dt); g.update(dt, dt); } g.input.stick.set(0, 0);
  const THREE = await import('/node_modules/.vite/deps/three.js').catch(() => null); const RC = THREE ? new THREE.Raycaster() : null; if (!RC) return 'no three';
  const out = []; for (const [x, y] of [[708, 226], [700, 250], [690, 200], [617, 294], [560, 300], [760, 215], [800, 260]]) { RC.setFromCamera(new THREE.Vector2(x / 844 * 2 - 1, -(y / 390 * 2 - 1)), g.camera); const hits = RC.intersectObjects(g.scene.children, true).filter(h => h.object.visible && h.object.material).slice(0, 3);
    out.push(`(${x},${y}) ` + hits.map(h => { const m = h.object.material; const c = m.color ? '#' + m.color.getHexString() : '?'; return `${h.object.name || h.object.type}[${c}${m.map ? ' map' : ''}${m.transparent ? ' transp' : ''} ro=${h.object.renderOrder}] d=${h.distance.toFixed(2)} at ${h.point.x.toFixed(2)},${h.point.y.toFixed(2)},${h.point.z.toFixed(2)}`; }).join(' | ')); }
  out.push('cam ' + g.camera.position.toArray().map(v => v.toFixed(2)).join(',') + ' player ' + g.player.root.position.toArray().map(v => v.toFixed(2)).join(','));
  return out.join('\n'); }); console.log(r); await p.screenshot({ path: '/workspace/atq-glide-proof/pick.png' }); await b.close();
