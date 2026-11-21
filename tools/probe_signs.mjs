import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 640, height: 360 } })).newPage(); p.on('pageerror', e => console.log('ERR', e.message));
await p.addInitScript(() => { localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low' })); localStorage.setItem('atq_prologue_seen', '1'); });
await p.goto(`http://127.0.0.1:5292/?step=0&god`); await p.waitForFunction(() => window.__atq?.game?.running, null, { timeout: 90000 });
const r = await p.evaluate(() => { const out = []; window.__atq.game.scene.traverse(o => { if (o.userData && o.userData.posted) { const v = o.getWorldPosition(o.position.clone()); out.push(v.toArray().map(x => +x.toFixed(1))); } }); return out; });
console.log(r.length, JSON.stringify(r)); await b.close();
