import { chromium } from 'playwright';
export const URL = process.env.TOWN_URL || 'http://127.0.0.1:5230/';
export const OUT = '/workspace/atqtown3/docs/mp-fix-proof';
export async function launch() { return chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); }
export async function client(ctx, name = 'A') {
  const p = await ctx.newPage(); p.on('pageerror', e => console.log(name, 'ERR', e.message)); p.on('console', m => { if (m.type() === 'error') console.log(name, 'CE', m.text().slice(0, 240)); });
  await p.goto(URL); await p.waitForSelector('#btnWarn'); await p.click('#btnWarn'); await p.waitForSelector('#btnMP'); await p.click('#btnMP');
  await p.waitForFunction(() => window.__mpCreator && window.__mpCreator.av(), null, { timeout: 120000 });
  await p.evaluate(() => window.__mpCreator.close(true)); await p.waitForFunction(() => window.__mpTown, null, { timeout: 120000 }); await p.waitForTimeout(1500); return p;
}
export const ctxOpts = { viewport: { width: 844, height: 390 }, deviceScaleFactor: 1.5, hasTouch: true, isMobile: true };
export async function boot() { const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await client(ctx); await p.evaluate(() => { window.__MP_DTCAP = .15; window.__mpTown.Z.killNear(0, 0, 400, 9999); }); return { b, p }; }
