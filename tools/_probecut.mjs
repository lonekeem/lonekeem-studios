// real-game cutscene framing probe: lets the camera settle on its own each line, logs cut cam vs camera, screenshots
import { chromium } from 'playwright';
const [step, out] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
p.on('pageerror', e => console.log('PERR', e.message));
await p.addInitScript(() => { localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', voices: false })); localStorage.setItem('atq_prologue_seen', '1'); localStorage.setItem('atq_age_ok', '1'); });
await p.goto('http://127.0.0.1:4471/?step=0&god'); await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 180000 });
const idx = await p.evaluate((id) => window.__atq.story.findIndex(s => s.id === id), step);
await p.goto('http://127.0.0.1:4471/?step=' + idx + '&god'); await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 180000 });
let n = 0, last = '';
for (let i = 0; i < 120 && n < 30; i++) {
  await p.waitForTimeout(300);
  const st = await p.evaluate(() => { const g = window.__atq.game; const c = g.camera.position, k = g.cut && g.cut.cam; return { txt: g.dlgCur && g.dlgCur.text ? g.dlgCur.who + ': ' + g.dlgCur.text : '', cut: k ? [k.x, k.y, k.z].map(v => +v.toFixed(2)) : null, cam: [c.x, c.y, c.z].map(v => +v.toFixed(2)), step: window.__atq.story[g.step].id }; });
  if (st.step !== step) break;
  if (st.txt && st.txt !== last) { last = st.txt; await p.waitForTimeout(1200); await p.evaluate(() => { const g = window.__atq.game; if (g.cut && g.cut.cam) { g.camera.position.copy(g.cut.cam); g._lk = g.cut.look.clone(); if (g.cut.fov) { g.camera.fov = g.cut.fov; g.camera.updateProjectionMatrix(); } g.camera.lookAt(g._lk); } }); await p.waitForTimeout(400); const s2 = await p.evaluate(() => { const c = window.__atq.game.camera.position; return [c.x, c.y, c.z].map(v => +v.toFixed(2)); });
    console.log(String(n).padStart(2, '0'), await p.evaluate(() => window.__atq.game.camera.fov.toFixed(0)), JSON.stringify(st.cut), JSON.stringify(s2), st.txt.slice(0, 60)); await p.screenshot({ path: `${out}/R${String(n++).padStart(2, '0')}.png` });
    await p.evaluate(() => window.__atq.game.skipLine && window.__atq.game.skipLine()); }
}
await b.close();
