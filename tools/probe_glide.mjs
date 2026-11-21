// probe: chapter-1 start, push stick down-right, log locomotion state per frame. usage: node tools/probe_glide.mjs <port> [mx] [my] [frames] [weapon]
import { chromium } from 'playwright';
const [,, port = '5191', mx = '0.7', my = '0.7', frames = '45', weapon = 'axe', smooth = '0', fdt = '30'] = process.argv;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', gore: true })));
if (smooth === '1') await ctx.addInitScript(() => { const o = JSON.parse(localStorage.getItem('atq3.settings')); o.smoothMove = true; o.ctlRev = 2; localStorage.setItem('atq3.settings', JSON.stringify(o)); });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${port}/?step=0`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 120000 }); await p.waitForTimeout(2500);
const out = await p.evaluate(([mx, my, frames, weapon, fdt]) => { const g = window.__atq.game; g.paused = true; const dt = 1 / fdt;
  if (weapon && weapon !== 'none') { const W = g.save; if (!W.owned.includes(weapon)) W.owned.push(weapon); W.cur = weapon; }
  for (let i = 0; i < 60; i++) g.skipLine && g.skipLine(); for (let i = 0; i < 30; i++) g.update(dt, dt);
  const P = g.player, s = g.state; const rows = []; const V = P.root.position.constructor; const fl = new V(), fr = new V(); let prevF = null, slideSum = 0, slideN = 0, sepMin = 9, sepMax = 0;
  const w = () => Object.entries(P.actions).filter(([k, a]) => a.isScheduled() && a.getEffectiveWeight() > .01).map(([k, a]) => `${k}:${a.getEffectiveWeight().toFixed(2)}@${a.timeScale.toFixed(2)}`).join(' ');
  rows.push(`pre cut=${!!g.cut} dlg=${!!g.dlgCur} cur=${P.curName} one=${!!P.oneShot} | ${w()}`);
  g.input.stick.set(mx, my);
  for (let i = 0; i < frames; i++) { const x0 = P.root.position.x, z0 = P.root.position.z; g.input.poll(dt); g.update(dt, dt); P.root.updateMatrixWorld(true); P.skin && P.syncSkin && P.syncSkin(); P.bone('DEF-foot.L').getWorldPosition(fl); P.bone('DEF-foot.R').getWorldPosition(fr); let slide = 0; if (prevF) { slide = Math.min(Math.hypot(fl.x - prevF.l.x, fl.z - prevF.l.z), Math.hypot(fr.x - prevF.r.x, fr.z - prevF.r.z)) / dt; if (i > 8) { slideSum += slide; slideN++; } } prevF = { l: fl.clone(), r: fr.clone() }; const sep = Math.hypot(fl.x - fr.x, fl.z - fr.z); if (i > 8) { sepMin = Math.min(sepMin, sep); sepMax = Math.max(sepMax, sep); }
    rows.push(`${i} slide=${slide.toFixed(2)} sep=${sep.toFixed(2)} cut=${!!g.cut} cur=${P.curName} one=${!!P.oneShot} mag=${g.input.move.length().toFixed(2)} mv=${(Math.hypot(P.root.position.x - x0, P.root.position.z - z0) / dt).toFixed(2)} spd=${(s.spd||0).toFixed(2)} rot=${P.root.rotation.y.toFixed(2)} yaw=${g.cam.yaw.toFixed(2)} | ${w()}`); }
  rows.push(`SUMMARY plantedFootSlide(avg m/s, frames>8)=${(slideSum / Math.max(1, slideN)).toFixed(2)} footSeparation range=${sepMin.toFixed(2)}..${sepMax.toFixed(2)}`); return rows; }, [+mx, +my, +frames, weapon, +fdt]);
console.log(out.join('\n')); console.log('errs', errs.slice(0, 3)); await b.close();
