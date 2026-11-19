import { chromium } from 'playwright';
const [,, k, m, out] = process.argv;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1320, height: 640 } }); p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('CE', m.text().slice(0, 300)); });
await p.goto(`http://127.0.0.1:5240/tools/chars2/anim.html?k=${k}&m=${m}`); await p.waitForFunction(() => document.title === 'done', null, { timeout: 600000 });
console.log(JSON.stringify(await p.evaluate(() => window.info))); await p.locator('canvas').screenshot({ path: out }); await b.close();
