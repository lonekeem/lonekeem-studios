import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage(); const errs = [], nf = [], js = [];
p.on('pageerror', e => errs.push(e.message)); p.on('response', async r => { if (r.status() === 404) nf.push(r.url()); if (/\.js(\?|$)/.test(r.url())) { try { const t = await r.text(); if (t.includes('Play as Keem')) js.push(r.url().split('/').pop()); } catch (e) {} } });
await p.goto('https://lonekeem.github.io/lonekeem-studios/?v=' + Date.now(), { waitUntil: 'load' }); await p.waitForTimeout(9000);
const r = await p.evaluate(() => ({ foot: document.querySelector('#foot')?.textContent, lobby: !!document.querySelector('#btnLobby'), aim: document.querySelector('#controls')?.textContent.includes('◎') }));
await p.screenshot({ path: '/workspace/atq-sweep-proof/rel/live-title.png' });
console.log(JSON.stringify({ ...r, playAsKeemIn: js, errs, nf })); await b.close();
