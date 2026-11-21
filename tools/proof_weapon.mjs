// close-up of Keem holding a weapon (front / side / back) in the house, idle and mid-walk. usage: node tools/proof_weapon.mjs <port> <outdir> <weapon> [anim]
import { chromium } from 'playwright';
import { sheet } from './proof_lib.mjs';
import fs from 'fs';
const [,, port = '5191', out = '/workspace/atq-glide-proof/weapon', weapon = 'axe', anim = 'Idle_Loop', ft = ''] = process.argv; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true })));
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${port}/?step=0`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 120000 }); await p.waitForTimeout(2500);
if (ft !== '') await p.evaluate((ft) => { window.__ft = ft; }, +ft);
await p.addStyleTag({ content: '#touch,#dlg,#prompt,#wp,#hud{display:none!important}' });
const files = [];
for (const [nm, ang] of [['front', 0], ['side', Math.PI / 2], ['back', Math.PI], ['3q', -Math.PI / 4]]) {
  await p.evaluate(([weapon, anim, ang]) => { const g = window.__atq.game; g.paused = true; const dt = 1 / 60; for (let i = 0; i < 60; i++) g.skipLine && g.skipLine(); const S = g.save; if (!S.owned.includes(weapon)) S.owned.push(weapon); g.equip(weapon, true);
    const P = g.player; P.root.position.set(16, 0, 42.6); P.root.rotation.y = 0; const V = P.root.position.constructor; const r = 2.0; g.cut = { anim, cam: new V(16 + Math.sin(ang) * r, 1.15, 42.6 + Math.cos(ang) * r), look: new V(16, 0.85, 42.6), flash: false };
    g.camera.position.copy(g.cut.cam); for (let i = 0; i < 50; i++) g.update(dt, dt); g.camera.position.copy(g.cut.cam); g.camera.lookAt(g.cut.look); if (window.__ft != null) { const a = P.actions[anim]; a.time = a.getClip().duration * window.__ft; P.mixer.update(0); } if (!g.__pl) { g.__pl = new g.faceL.constructor('#fff0dc', 3, 8, 1.2); g.scene.add(g.__pl); } g.__pl.position.copy(g.cut.cam).add({ x: 0, y: .5, z: 0 }); }, [weapon, anim, ang]);
  await p.waitForTimeout(400); const f = `${out}/${weapon}-${anim}-${nm}.png`; await p.screenshot({ path: f }); files.push(f); }
sheet(files, `${out}/${weapon}-${anim}-sheet.png`, 2, .5); console.log(files.join('\n'), errs.slice(0, 3)); await b.close();
