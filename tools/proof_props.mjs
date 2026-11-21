// Before/after prop screenshots: node tools/proof_props.mjs <port> <outdir> [qual]
// Fixed cameras (g.cut) at signs/props in every chapter area; Math.random seeded so random clutter is comparable.
import { chromium } from 'playwright';
import fs from 'fs';
const [port, OUT, qual = 'medium'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
// [name, step, cam, look]
const SH = [
  ['01_main_road_north', 'street', [0, 6, 64], [0, 1.2, 20]],
  ['02_town_sign', 'street', [-4.6, 2.0, 51.5], [-8.5, 2.0, 58]],
  ['03_stay_inside', 'street', [-1.2, 1.7, 15.5], [-6.4, 1.3, 14]],
  ['04_main_birch', 'street', [2.2, 2.2, 3.6], [7.4, 2.5, 8.4]],
  ['05_keem_house', 'street', [5, 3, 34], [16, 1.6, 41]],
  ['06_pell_house', 'street', [-1.5, 2.6, 25], [-12, 1.6, 20]],
  ['07_main_road_mid', 'street', [0, 5, 4], [0, 1, -40]],
  ['08_market', 'garage', [-3, 3, -26], [-12.9, 2.8, -32]],
  ['09_police', 'garage', [-4, 3, -49], [-13.9, 2.6, -54]],
  ['10_garage', 'garage', [8, 3, -52], [17.4, 2.6, -58]],
  ['11_barber_bridge', 'truck', [0, 3, -86], [0, 2, -104]],
  ['12_ch2_checkpoint', 'c2_shore', [2, 3, -145], [4, 2, -158]],
  ['13_ch2_mainst', 'c2_town', [0, 3.5, -175], [0, 2, -205]],
  ['14_ch2_hardware', 'c2_town', [-2, 2.8, -184], [-10.3, 2.4, -188]],
  ['15_ch2_doughnut', 'c2_town', [2, 2.8, -210], [9.9, 2.4, -214]],
  ['16_ch2_school', 'c2_gate', [0, 3, -240], [-4, 2.5, -256]],
  ['17_ch3_road', 'c3_road', [3, 3, -300], [3, 2, -330]],
  ['18_ch3_truckstop', 'c3_stop', [-18, 4, -318], [-26, 3.5, -329]],
  ['19_ch3_motel', 'c3_motel', [16, 3, -380], [26.8, 3, -386]],
  ['20_ch4_toll', 'c4_plaza', [0, 4, -440], [0, 3.5, -466]],
  ['21_ch4_camp', 'c4_cage', [0, 3, -505], [0, 2.5, -520]],
  ['22_ch5_mall', 'c5_lot', [0, 5, -580], [0, 4, -613]],
  ['23_ch6_fort', 'c6_park', [4, 3, -636], [7, 2, -648]],
  ['24_ch7_route77', 'c7_drive', [6, 3, -1020], [9.5, 2.4, -1030]],
  ['25_ch7_marina', 'c7_end', [-4, 4, -1230], [-10, 3.4, -1242]],
  ['26_ch8_ferry', 'c8_term', [0, 4, -1320], [0, 3, -1336]],
  ['27_ch9_gate', 'c9_cards', [0, 4, -1525], [0, 3, -1538]],
  ['28_ch10_wharf', 'c10_wharf', [2, 3.5, -2004], [3, 2.8, -2025]],
  ['29_ch10_swan', 'c10_swan', [0, 3, -2185], [-4, 2, -2204]],
  ['30_ch11_tunnel', 'c11_tunnel', [0, 4, -2326], [0, 4, -2336]],
  ['31_ch11_hospital', 'c11_er', [0, 4, -2585], [0, 4, -2605]],
  ['32_ch12', 'c12_boss', [0, 3, -2930], [0, 2.5, -2960]],
];

// sign close-ups: [name, step, x, y, z, rotY, dist] -> camera in front of the board (and one from behind for chapter signs)
const SG = [
  ['s01_stay_inside', 'street', -6.4, 1.3, 14, Math.PI / 2, 5], ['s02_town_sign', 'street', -8.5, 2.2, 58, Math.PI * .85, 6], ['s03_main_birch', 'street', 7.4, 2.6, 8.4, -Math.PI / 4, 4],
  ['s04_market', 'garage', -12.9, 3.3, -32, Math.PI / 2, 8], ['s05_police', 'garage', -13.9, 3, -54, Math.PI / 2, 8], ['s06_hanks', 'garage', 17.4, 3, -58, -Math.PI / 2, 8],
  ['s07_bridge', 'truck', 7.5, 2.4, -105, 0, 6], ['s08_barber', 'truck', -9.5, 2.9, -96.9, 0, 6], ['s09_checkpoint', 'c2_shore', 6, 2.2, -157.4, 0, 6], ['s10_haverford', 'c2_shore', -8.5, 2.2, -140, 0, 6],
  ['s11_hardware', 'c2_town', -9.95, 2.6, -188, Math.PI / 2, 6], ['s12_water_st', 'c2_town', 6, 2.6, -195.4, 0, 4], ['s13_school', 'c2_gate', -7, 3.1, -255.8, 0, 7],
  ['s14_route1', 'c3_road', 7.5, 2.6, -312, 0, 6], ['s15_truckstop', 'c3_stop', -26, 4.8, -328.9, 0, 9], ['s16_motel', 'c3_motel', 26.8, 3.4, -386, -Math.PI / 2, 7], ['s17_toll', 'c4_plaza', 0, 4.4, -465.9, 0, 10],
  ['s18_tollmen', 'c4_cage', 0, 3, -519.5, 0, 6], ['s19_mall', 'c5_lot', 0, 7.4, -612.9, 0, 14], ['s20_fort', 'c6_park', 7, 2.2, -648, 0, 6],
  ['s21_route77_front', 'c7_drive', 9.5, 2.4, -1030, Math.PI, 6], ['s22_route77_back', 'c7_drive', 9.5, 2.4, -1030, 0, 6], ['s23_marina_back', 'c7_end', -10, 3.6, -1241.9, 0, 7],
  ['s24_ferry_back', 'c8_term', 0, 3.4, -1336, 0, 7], ['s25_naval_back', 'c9_cards', 0, 3, -1538, 0, 7], ['s26_wharf_back', 'c10_wharf', 6, 2.6, -2016, 0, 6], ['s27_quarantine_back', 'c10_wharf', 0, 3.2, -2030, 0, 7],
  ['s28_tunnel_back', 'c11_tunnel', 0, 5.2, -2336, 0, 8], ['s29_hospital_back', 'c11_er', 0, 9, -2688.9, 0, 14], ['s30_emergency_back', 'c11_er', -14, 4.5, -2604, 0, 8],
  ['s31_boiler', 'c12_boss', -3, 2.6, -2965.74, 0, 5],
];
SG.forEach(([n, st, x, y, z, r, d]) => SH.push([n, st, [x + Math.sin(r) * d, y + .2, z + Math.cos(r) * d], [x, y, z]]));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const byStep = {}; SH.forEach(s => { if (!only || only.some(o => s[0].startsWith(o))) (byStep[s[1]] = byStep[s[1]] || []).push(s); });
for (const step of Object.keys(byStep)) {
  const ctx = await b.newContext({ viewport: { width: 960, height: 540 }, hasTouch: true });
  await ctx.addInitScript((q) => { localStorage.setItem('atq3.settings', JSON.stringify({ qual: q, gore: true, hints: false })); localStorage.setItem('atq_prologue_seen', '1');
    let s = 12345; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }, qual);
  const p = await ctx.newPage(); p.on('pageerror', e => console.log('ERR', step, e.message.slice(0, 160)));
  await p.goto(`http://127.0.0.1:${port}/?step=0&god`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 180000 }); await p.waitForTimeout(1500);
  const sidx = await p.evaluate(async (id) => { const S = await import('/src/game/story.js'); const i = S.STORY.findIndex(s => s.id === id); const g = window.__atq.game; g.loadStep(i); return i; }, step); console.log('step', step, sidx); await p.waitForTimeout(2500);
  await p.evaluate(() => { const g = window.__atq.game; g.god = true; for (let i = 0; i < 80; i++) g.skipLine && g.skipLine(); document.querySelectorAll('#hud,#touch,.hud,#joy,#btns,#mm,#obj').forEach(e => e.style.visibility = 'hidden'); });
  for (const [name, , cam, look] of byStep[step]) {
    const url = await p.evaluate(([cam, look]) => { const g = window.__atq.game; const V = g.camera.position.constructor; g.paused = true; g.alive && g.alive().forEach(z => { z.root.visible = false; });
      g.cut = { cam: new V(...cam), look: new V(...look), snap: true, fov: 60, noFace: true, anim: 'Idle_Loop' }; g.player.root.visible = false;
      for (let i = 0; i < 8; i++) g.update(1 / 30, 1 / 30); g.camera.position.set(...cam); g.camera.lookAt(new V(...look)); g.camera.fov = 60; g.camera.updateProjectionMatrix(); g.__pl && (g.__pl.visible = false); g.renderer.render(g.scene, g.camera); return g.renderer.domElement.toDataURL('image/png'); }, [cam, look]);
    fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(url.split(',')[1], 'base64')); console.log('shot', name);
  }
  await ctx.close();
}
await b.close();
