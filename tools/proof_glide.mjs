// v1.9.26 glide proof: chapter-1 start (house), stick pushed down/right (toward the camera / sideways), real HUD, frame sequence + sheet.
// usage: node tools/proof_glide.mjs <port> <outdir> <w> <h> <mx> <my> [every] [count] [weapon] [smooth]
import { chromium } from 'playwright';
import { sheet } from './proof_lib.mjs';
import fs from 'fs';
const [,, port = '5191', out = '/workspace/atq-glide-proof/after', w = '844', h = '390', mx = '0.45', my = '0.8', every = '5', count = '12', weapon = 'axe', smooth = '0', px = '', pz = '', yaw = ''] = process.argv; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
await ctx.addInitScript((sm) => localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true, ...(sm ? { smoothMove: true, ctlRev: 2 } : {}) })), smooth === '1');
if (process.env.HIDE_BLOOD) await ctx.addInitScript(() => { window.__hideBlood = true; });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${port}/?step=0`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 120000 }); await p.waitForTimeout(2500);
await p.evaluate(([weapon, px, pz, yaw]) => { const g = window.__atq.game; g.paused = true; const dt = 1 / 60; if (weapon !== 'none') { const S = g.save; if (!S.owned.includes(weapon)) S.owned.push(weapon); S.cur = weapon; g.equip && g.equip(weapon); }
  for (let i = 0; i < 60; i++) g.skipLine && g.skipLine(); if (px !== '') { g.player.root.position.set(+px, 0, +pz); } if (yaw !== '') { g.cam.yaw = +yaw; g.player.root.rotation.y = +yaw; } if (window.__hideBlood) g.scene.traverse(o => { if (o.isMesh && o.renderOrder === 2 && o.material && o.material.map && o.material.depthWrite === false) o.visible = false; }); for (let i = 0; i < 40; i++) { g.input.poll(dt); g.update(dt, dt); } }, [weapon, px, pz, yaw]);
const files = []; const log = [];
for (let i = 0; i < +count; i++) {
  const info = await p.evaluate(([mx, my, n]) => { const g = window.__atq.game, dt = 1 / 60, P = g.player; g.input.stick.set(mx, my); document.querySelector('#stickKnob').style.transform = `translate(${mx * 55}px,${my * 55}px)`;
    for (let k = 0; k < n; k++) { g.input.poll(dt); g.update(dt, dt); } const W = Object.entries(P.actions).filter(([, a]) => a.isScheduled() && a.getEffectiveWeight() > .05).map(([k, a]) => k + ':' + a.getEffectiveWeight().toFixed(2)).join(' ');
    return `t=${(g.__pt = (g.__pt || 0) + n * dt).toFixed(2)}s speed=${(g.state.spd || 0).toFixed(2)}m/s rot=${P.root.rotation.y.toFixed(2)} anim=${P.curName} ${W}`; }, [+mx, +my, i === 0 ? 1 : +every]);
  await p.waitForTimeout(350); const f = `${out}/f${String(i).padStart(2, '0')}.png`; await p.screenshot({ path: f }); files.push(f); log.push(`${f.split('/').pop()} ${info}`); }
sheet(files, `${out}/sheet.png`, 4, .5); fs.writeFileSync(`${out}/log.txt`, log.join('\n') + '\n'); console.log(log.join('\n')); console.log('errs', errs.slice(0, 3)); await b.close();
