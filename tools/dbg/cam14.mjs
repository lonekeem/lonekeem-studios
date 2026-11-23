import { chromium } from 'playwright';
const STEP = process.env.STEP || 'c14_arrive', OUT = process.env.OUT || '/workspace/atq-sweep-proof/dbg';
import fs from 'fs'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => { localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low' })); localStorage.setItem('atq_prologue_seen', '1'); localStorage.setItem('atq.gate', JSON.stringify({ birthYear: 1990, agreedVersion: 1 })); });
const p = await ctx.newPage(); p.on('pageerror', e => console.log('PE', e.message));
await p.goto('http://127.0.0.1:5495/?step=0&god'); await p.waitForFunction(() => window.__atq?.game?.running, null, { timeout: 180000 });
const idx = await p.evaluate(id => window.__atq.story.findIndex(s => s.id === id), STEP);
await p.goto('http://127.0.0.1:5495/?step=' + idx + '&god'); await p.waitForFunction(() => window.__atq?.game?.running && document.getElementById('loading').classList.contains('hidden'), null, { timeout: 180000 });
for (let k = 0; k < 1; k++) { await p.waitForTimeout(900);
  const r = await p.evaluate(async () => { if (!window.__T3) window.__T3 = await import('/node_modules/three/build/three.module.js'); const g = window.__atq.game, c = g.camera, T = c.position.constructor; const ray = new (g.__RC || (g.__RC = null, Object)); 
    const P = c.position; const dir = new T(); c.getWorldDirection(dir);
    // find nearest mesh hit using three Raycaster from the scene's constructor family
    let hit = null; try { const RC = window.__T3.Raycaster; if (RC) { const rc = new RC(P.clone(), dir, 0, 50); rc.camera = c; const h = rc.intersectObjects(g.scene.children, true).filter(h => h.object.type !== 'Sprite').filter(h => h.object.visible); hit = h.slice(0, 3).map(x => [x.object.name || x.object.type, x.object.geometry && JSON.stringify(x.object.geometry.parameters), x.object.material && x.object.material.color && x.object.material.color.getHexString(), x.object.rotation.y.toFixed(2), x.object.position.toArray().map(v => +v.toFixed(1)), +x.distance.toFixed(2), x.object.parent && x.object.parent.name]); } } catch (e) { hit = e.message; }
    return { cut: !!g.cut, cam: [P.x, P.y, P.z].map(v => +v.toFixed(2)), dir: [dir.x, dir.y, dir.z].map(v => +v.toFixed(2)), inCol: g.inCol(P.x, P.z, 0), fog: g.scene.fog && [g.scene.fog.near, g.scene.fog.far, g.scene.fog.density], hit, dlg: g.dlgCur && g.dlgCur.text }; });
  console.log(JSON.stringify(r)); await p.screenshot({ path: `${OUT}/${STEP}-${k}.png` }); }
await b.close();
