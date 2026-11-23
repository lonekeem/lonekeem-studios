import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => { localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low' })); localStorage.setItem('atq_prologue_seen', '1'); localStorage.setItem('atq.gate', JSON.stringify({ birthYear: 1990, agreedVersion: 1 })); });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:5495/?step=10&god'); await p.waitForFunction(() => window.__atq?.game?.running, null, { timeout: 180000 }); await p.waitForFunction(() => document.getElementById('loading').classList.contains('hidden'), null, { timeout: 120000 }); await p.waitForTimeout(1500);
console.log(await p.evaluate(() => { const out = [...document.querySelectorAll('button')].filter(b => b.offsetParent && b.getBoundingClientRect().left > 700 && b.getBoundingClientRect().top > 280).map(b => [b.id, b.textContent.trim().slice(0, 12), [...b.textContent.trim()].map(c => c.codePointAt(0).toString(16)).slice(0, 4).join(' ')]); for (const [x, y] of [[804, 350], [804, 375], [810, 190], [790, 200]]) { const e = document.elementFromPoint(x, y); out.push([x, y, e && e.id, e && e.className, e && e.textContent.slice(0, 20), e && [...e.textContent].map(c => c.codePointAt(0).toString(16)).slice(0, 6).join(' ')]); } return JSON.stringify(out); }));
await b.close();
