import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage(); p.on('pageerror', e => console.log('PAGEERR', String(e.message||e), (e.stack||'').slice(0,600))); p.on('console', m => console.log('C', m.type(), m.text().slice(0,200)));
p.on('requestfailed', r => console.log('RF', r.url()));
await p.goto('http://localhost:4420/?step=55&god', { waitUntil: 'load', timeout: 60000 }); await p.waitForTimeout(15000);
console.log(await p.evaluate(() => JSON.stringify({ a: !!window.__atq, r: window.__atq && window.__atq.game && window.__atq.game.running })));
await b.close();
