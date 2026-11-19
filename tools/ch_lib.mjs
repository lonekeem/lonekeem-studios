// proof helpers for chapters 12-13: open a step, run the sim, close-up cameras. node tools/<script>.mjs <port> <outdir>
import { chromium } from 'playwright';
import fs from 'fs';
export { sheet } from './proof_lib.mjs';
export async function open(port, step, { w = 960, h = 540, qual = 'med', god = true, extra = '' } = {}) {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  await ctx.addInitScript((q) => localStorage.setItem('atq3.settings', JSON.stringify({ qual: q, gore: true, voices: false })), qual);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(`http://localhost:${port}/?step=${step}${god ? '&god' : ''}${extra}`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 180000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => { const g = window.__atq.game; g.god = true; g.paused = true; });
  return { b, p, errs };
}
export const hideUI = (p) => p.addStyleTag({ content: '#hud,#touch,#xhair,#vignette,#lowhp,#prompt,#wp,#mini,#obj,#drive{display:none!important}' });
// advance n sim steps (dt=1/30)
export const run = (p, n = 30, skipLines = false) => p.evaluate(([n, sk]) => { const g = window.__atq.game; g.paused = true; for (let i = 0; i < n; i++) { if (sk && g.dlgCur && i % 3 === 0) g.skipLine(); g.update(1 / 30, 1 / 30); } }, [n, skipLines]);
// camera shot: cam/look arrays; keeps the story cutscene camera override; fill light optional
export async function shot(p, path, { cam, look, n = 3, fill = 0, fov = 0, wait = 350, anim = 'Idle_Loop', keepCut = false, hidePlayer = false } = {}) {
  await p.evaluate(([cam, look, n, fill, fov, anim, keepCut, hidePlayer]) => { const g = window.__atq.game; g.paused = true; const V = g.camera.position.constructor;
    if (cam) { g.cut = { anim, cam: new V(...cam), look: new V(...look), flash: false }; g.camera.position.copy(g.cut.cam); g._lk = null; } else if (!keepCut) g.cut = null;
    if (hidePlayer) g.player.root.visible = false; else if (hidePlayer === false && g.player.root.visible === false && !g.__hid) g.player.root.visible = true;
    if (fov) { g.camera.fov = fov; g.camera.updateProjectionMatrix(); }
    if (fill && cam) { if (!g.__pl) { g.__pl = new g.faceL.constructor('#fff0dc', fill, 14, 1.4); g.scene.add(g.__pl); } g.__pl.intensity = fill; g.__pl.position.set(cam[0], cam[1] + .5, cam[2]); g.__pl.visible = true; } else if (g.__pl) g.__pl.visible = false;
    for (let i = 0; i < n; i++) g.update(1 / 30, 1 / 30); }, [cam || null, look || null, n, fill, fov, anim, keepCut, hidePlayer]);
  await p.waitForTimeout(wait); await p.screenshot({ path, timeout: 120000 }); }
export const out = (d) => { fs.mkdirSync(d, { recursive: true }); return d; };
