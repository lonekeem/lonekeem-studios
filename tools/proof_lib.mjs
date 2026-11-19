// Deterministic proof-frame helper: loads a build at phone size (low preset), steps the sim manually, screenshots, and builds contact sheets.
import { chromium } from 'playwright';
import { execFileSync } from 'child_process';
import fs from 'fs';
export async function openGame(port, step, { w = 844, h = 390, qual = 'low', query = '' } = {}) {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  await ctx.addInitScript((q) => localStorage.setItem('atq3.settings', JSON.stringify({ qual: q, gore: true })), qual);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(`http://localhost:${port}/?step=${step}&god${query}`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 120000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => { const g = window.__atq.game; g.god = true; for (let i = 0; i < 60; i++) g.skipLine && g.skipLine(); });
  return { b, ctx, p, errs };
}
// advance the simulation by n fixed steps then let the renderer present, then screenshot
export async function stepShot(p, path, n = 6, dt = 1 / 30, wait = 450) { await p.evaluate(([n, dt]) => { const g = window.__atq.game; g.paused = true; for (let i = 0; i < n; i++) g.update(dt, dt); }, [n, dt]); await p.waitForTimeout(wait); await p.screenshot({ path, timeout: 120000 }); }
export function sheet(files, out, cols = 4, scale = 0.62, label = true) {
  const py = `
import sys
from PIL import Image, ImageDraw
files=sys.argv[3:]; out=sys.argv[1]; cols=int(sys.argv[2]); sc=${scale}
ims=[Image.open(f).convert('RGB') for f in files]; w,h=ims[0].size; w2,h2=int(w*sc),int(h*sc)
rows=(len(ims)+cols-1)//cols; S=Image.new('RGB',(cols*w2,rows*h2),(0,0,0)); d=ImageDraw.Draw(S)
for i,im in enumerate(ims):
    S.paste(im.resize((w2,h2),Image.LANCZOS),((i%cols)*w2,(i//cols)*h2)); d.text(((i%cols)*w2+6,(i//cols)*h2+4),str(i+1),fill=(255,255,255))
S.save(out)`;
  fs.writeFileSync('/tmp/_sheet.py', py); execFileSync('python3', ['/tmp/_sheet.py', out, String(cols), ...files]);
}
