import { chromium } from 'playwright';
const [,, url, out, w='900', h='600'] = process.argv;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } }); p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => { if (m.type() === 'error' || m.text().startsWith('LOG')) console.log('CE', m.text().slice(0, 400)); });
await p.goto(url); await p.waitForFunction(() => document.title === 'done' || document.title.startsWith('fail'), null, { timeout: 300000 });
const info = await p.evaluate(() => window.info || (window.hoodInfo && { hood: window.hoodInfo, nk: window.nk })); if (info) { const s = JSON.stringify(info); if (process.env.INFO_OUT) (await import("fs")).writeFileSync(process.env.INFO_OUT, s); console.log(s.slice(0, 3000)); };
await p.screenshot({ path: out }); await b.close();
