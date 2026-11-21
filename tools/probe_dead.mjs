// Kill survival zombies with different hit types and frame each body close-up; report precise lowest/highest point.
// node tools/probe_dead.mjs <port> <outdir>
import { chromium } from 'playwright';
import fs from 'fs';
const [port, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 800, height: 450 } })).newPage(); p.on('pageerror', e => console.log('ERR', e.message.slice(0, 200)));
await p.addInitScript(() => { localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true, hints: false })); localStorage.setItem('atq_prologue_seen', '1'); let s = 99; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; });
await p.goto(`http://127.0.0.1:${port}/?step=0&god`); await p.waitForFunction(() => window.__atq?.game?.running, null, { timeout: 180000 }); await p.waitForTimeout(1500);
await p.evaluate(async () => { const S = await import('/src/game/story.js'); const g = window.__atq.game; g.loadStep(S.STORY.findIndex(s => s.id === 'survival')); });
await p.waitForTimeout(2000);
const res = await p.evaluate(async () => { const T = await import('/node_modules/three/build/three.module.js'); const g = window.__atq.game; g.god = true; document.querySelectorAll('#hud,#touch,.hud,#joy,#btns,#mm,#obj,#toast').forEach(e => e.style.visibility = 'hidden');
  for (let i = 0; i < 80; i++) g.skipLine && g.skipLine(); for (let i = 0; i < 300; i++) g.update(1 / 30, 1 / 30);
  const P = g.player.root.position; const kinds = [{}, { head: true }, { finisher: true }, { boom: true }, { pellets: true }, { blade: true }];
  const al = g.alive().slice(0, 6); al.forEach((z, i) => { z.root.position.set(P.x - 4 + i * 1.8, 0, P.z - 5 - (i % 2) * 1.5); g.killZ(z, new T.Vector3(0, 0, -1), kinds[i]); z.__kind = JSON.stringify(kinds[i]); });
  const out = []; for (let i = 0; i < 150; i++) g.update(1 / 30, 1 / 30); g.paused = true;
  const bx = new T.Box3(); for (const z of al) { z.root.updateMatrixWorld(true); bx.makeEmpty(); z.root.traverse(o => { if (o.isMesh && o.visible) bx.expandByObject(o, true); }); out.push({ kind: z.__kind, p: z.root.position.toArray().map(v => +v.toFixed(2)), ry: z.root.position.y, minY: +bx.min.y.toFixed(3), maxY: +bx.max.y.toFixed(3), vis: z.root.visible }); }
  window.__dead = al; return out; });
console.log(JSON.stringify(res, null, 0));
for (let i = 0; i < res.length; i++) { const url = await p.evaluate((i) => { const g = window.__atq.game, z = window.__dead[i], q = z.root.position; g.camera.position.set(q.x + 2.2, 0.9, q.z + 2.2); g.camera.lookAt(q.x, 0.2, q.z); g.camera.updateMatrixWorld(); g.renderer.render(g.scene, g.camera); return g.renderer.domElement.toDataURL('image/png'); }, i);
  fs.writeFileSync(`${OUT}/dead${i}.png`, Buffer.from(url.split(',')[1], 'base64')); }
await b.close();
