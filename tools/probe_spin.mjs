// Spin the real game camera 360° (cam.yaw) in a step and capture frames; for each frame also render with frustum culling
// disabled everywhere and count differing pixels (=> objects culled while on screen).
// node tools/probe_spin.mjs <port> <step> <outdir> [stepDeg]
import { chromium } from 'playwright';
import fs from 'fs';
const [port, step = 'survival', OUT = '/tmp/spin', SD = '10'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: +(process.env.VW || 956), height: +(process.env.VH || 440) }, deviceScaleFactor: +(process.env.DPR || 1), hasTouch: true, isMobile: true });
await ctx.addInitScript((QL) => { localStorage.setItem('atq3.settings', JSON.stringify({ qual: QL, gore: true, hints: false })); localStorage.setItem('atq_prologue_seen', '1');
  let s = 777; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }, process.env.QUAL || 'low');
const p = await ctx.newPage(); p.on('pageerror', e => console.log('ERR', e.message.slice(0, 200)));
await p.goto(`http://127.0.0.1:${port}/?step=0&god`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 180000 }); await p.waitForTimeout(1500);
  const sidx = await p.evaluate(async (id) => { const S = await import('/src/game/story.js'); const i = S.STORY.findIndex(s => s.id === id); const g = window.__atq.game; g.loadStep(i); return i; }, step); console.log('step', step, sidx); await p.waitForTimeout(2500);
const info = await p.evaluate(() => { const g = window.__atq.game; g.god = true; for (let i = 0; i < 80; i++) g.skipLine && g.skipLine(); document.querySelectorAll('#hud,#touch,.hud,#joy,#btns,#mm,#obj,#toast').forEach(e => e.style.visibility = 'hidden');
  for (let i = 0; i < 400; i++) g.update(1 / 30, 1 / 30);
  // kill half of the zombies so we get bodies on the ground
  const al = g.alive(); al.slice(0, Math.ceil(al.length / 2)).forEach(z => { try { g.killZ ? g.killZ(z) : g.hitZ(z, 9999, z.root.position.clone(), false); } catch (e) { } });
  for (let i = 0; i < 60; i++) g.update(1 / 30, 1 / 30); g.paused = true; const P = g.player.root.position;
  return { P: [P.x, P.z], alive: g.alive().length, dead: g.zombies.filter(z => z.dead).length, yaw: g.cam.yaw, fns: Object.getOwnPropertyNames(Object.getPrototypeOf(g)).filter(n => /kill|hit|dmg|damage/i.test(n)) }; });
console.log(JSON.stringify(info));
const rows = [];
for (let a = 0; a < 360; a += +SD) {
  const r = await p.evaluate((a) => { const g = window.__atq.game; g.cam.yaw = a * Math.PI / 180; g.update(1 / 60, 1 / 60); g.update(1 / 60, 1 / 60);
    const R = g.renderer, C = R.domElement; const draw = () => { if (g.composer) g.composer.render(); else R.render(g.scene, g.camera); return C.toDataURL('image/png'); };
    const A = draw(); const flip = []; g.scene.traverse(o => { if (o.frustumCulled) { flip.push(o); o.frustumCulled = false; } }); const B = draw(); flip.forEach(o => o.frustumCulled = true);
    return { A, B, cam: g.camera.position.toArray().map(v => +v.toFixed(2)) }; }, a);
  const f = (s) => Buffer.from(s.split(',')[1], 'base64'); const n = String(a).padStart(3, '0');
  fs.writeFileSync(`${OUT}/a${n}.png`, f(r.A)); fs.writeFileSync(`${OUT}/b${n}.png`, f(r.B)); rows.push([a, r.cam]);
}
fs.writeFileSync(`${OUT}/cams.json`, JSON.stringify(rows));
await b.close();
