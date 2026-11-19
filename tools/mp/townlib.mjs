import { chromium } from 'playwright';
export const URL = process.env.TOWN_URL || 'http://127.0.0.1:5210/';
export async function launch() { return chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); }
export async function client(ctx, name = 'A', look) {
  const p = await ctx.newPage(); p.on('pageerror', e => console.log(name, 'ERR', e.stack.split('\n').slice(0,4).join(' | '))); p.on('console', m => { if (m.type() === 'error') console.log(name, 'CE', m.text().slice(0, 240)); });
  await p.goto(URL); await p.waitForSelector('#btnWarn'); await p.click('#btnWarn'); await p.waitForSelector('#btnMP'); await p.click('#btnMP');
  await p.waitForFunction(() => window.__mpCreator && window.__mpCreator.av(), null, { timeout: 120000 }); if (look) { await p.evaluate(l => window.__mpCreator.setLook(l), look); await p.waitForTimeout(600); }
  await p.evaluate(() => window.__mpCreator.close(true)); await p.waitForFunction(() => window.__mpTown, null, { timeout: 120000 }); await p.waitForTimeout(1500); return p;
}
export const ctxOpts = { viewport: { width: 844, height: 390 }, deviceScaleFactor: 1.5, hasTouch: true, isMobile: true };
