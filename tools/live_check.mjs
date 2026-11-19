// Live check: story start (first-person head hidden) + MP via real UI clicks, two guest sessions. usage: node tools/live_check.mjs <url> <outdir>
import { chromium } from 'playwright'; import fs from 'fs';
const URL = process.argv[2] || 'https://lonekeem.github.io/lonekeem-studios/', OUT = process.argv[3] || '/workspace/live1918'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const opts = { viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true };
const log = (...a) => console.log(...a);
async function page(ctx, n) { const p = await ctx.newPage(); p.on('pageerror', e => log(n, 'PAGEERR', e.message.slice(0, 200))); p.on('console', m => { if (m.type() === 'error') log(n, 'CONSOLE-ERR', m.text().slice(0, 200)); }); p.on('dialog', d => d.accept()); return p; }

const MODE = process.env.MODE || 'all';
if (MODE !== 'mp') { // ---- story: real UI New Game, skip the intro lines, first person ----
  const ctx = await b.newContext(opts); const p = await page(ctx, 'story'); await p.goto(URL); await p.waitForSelector('#btnWarn'); await p.click('#btnWarn'); await p.waitForTimeout(800); await p.screenshot({ path: OUT + '/1_title.png' });
  await p.click('#btnNew'); await p.waitForFunction(() => window.__atq && window.__atq.game && window.__atq.game.running, null, { timeout: 60000 }); await p.waitForTimeout(4000);
  await p.evaluate(() => { const g = window.__atq.game; for (let i = 0; i < 60; i++) g.skipLine && g.skipLine(); }); await p.waitForTimeout(3500);
  await p.screenshot({ path: OUT + '/2_story_third.png' });
  await p.evaluate(() => { const g = window.__atq.game; g.cam.fp = true; g.settings.fp = true; }); await p.waitForTimeout(2500);
  await p.keyboard.down('KeyW'); await p.waitForTimeout(1500); await p.keyboard.up('KeyW'); await p.waitForTimeout(800);
  const vis = await p.evaluate(() => { const g = window.__atq.game, L = []; g.player.root.traverse(o => { if ((o.isMesh || o.isSkinnedMesh) && o.visible) { let v = true, a = o; while (a) { if (!a.visible) v = false; a = a.parent; } if (v) L.push((o.name || o.type) + '<' + (o.parent && o.parent.name)); } }); return { visibleMeshes: L, near: g.camera.near, fp: g.cam.fp, version: document.querySelector('.foot')?.textContent }; });
  log('story fp:', JSON.stringify(vis)); await p.screenshot({ path: OUT + '/3_story_first_person.png' });
  await p.evaluate(() => { const g = window.__atq.game; g.cam.fp = false; g.settings.fp = false; }); await p.waitForTimeout(1500); await p.screenshot({ path: OUT + '/3b_story_back_to_third.png' }); await ctx.close(); }
if (MODE !== 'story') { // ---- multiplayer, two guests (names GuestA / GuestB so strays in the shared room are not confused with them) ----
async function toTown(ctx, n) {
  const p = await page(ctx, n); await p.goto(URL); await p.waitForSelector('#btnWarn'); await p.click('#btnWarn'); await p.waitForSelector('#btnMP'); await p.click('#btnMP');
  await p.waitForFunction(() => window.__mpCreator && window.__mpCreator.av(), null, { timeout: 120000 }); await p.waitForTimeout(1500);
  await p.locator('input[type=text], input:not([type])').locator('visible=true').first().fill('Guest' + n); await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/4_creator_${n}.png` });
  const keemOpt = await p.evaluate(() => [...document.querySelectorAll('button,option,label,select')].map(e => e.textContent.trim()).filter(t => /keem/i.test(t))); log(n, 'creator mentions of Keem:', JSON.stringify(keemOpt));
  await p.getByText('Save & enter').click(); await p.waitForFunction(() => window.__mpTown, null, { timeout: 120000 }); await p.waitForTimeout(2500); return p; }
const c1 = await b.newContext(opts), c2 = await b.newContext(opts);
const A = await toTown(c1, 'A'); await A.screenshot({ path: OUT + '/5_town_A_alone.png' }); const B = await toTown(c2, 'B');
const pos = p => p.evaluate(() => ({ x: window.__mpTown.me.x, z: window.__mpTown.me.z, ry: window.__mpTown.me.ry }));
const pa = await pos(A); await B.evaluate(([x, z]) => window.__mpTown.setPos(x, z), [pa.x + Math.sin(pa.ry) * 4, pa.z + Math.cos(pa.ry) * 4]);
const names = p => p.evaluate(() => [...window.__mpTown.net.peers.values()].map(x => x.name));
let okA = false, okB = false; for (let i = 0; i < 40 && !(okA && okB); i++) { await A.waitForTimeout(1000); okA = (await names(A)).includes('GuestB'); okB = (await names(B)).includes('GuestA'); }
log('A sees', JSON.stringify(await names(A)), 'B sees', JSON.stringify(await names(B)), '=> A sees GuestB:', okA, ' B sees GuestA:', okB);
log('A hud', await A.evaluate(() => document.querySelector('#obj').innerText.replace(/\n/g, ' ')), '| B hud', await B.evaluate(() => document.querySelector('#obj').innerText.replace(/\n/g, ' ')));
await A.waitForTimeout(2500); await A.screenshot({ path: OUT + '/6_town_A_sees_B.png' }); await B.screenshot({ path: OUT + '/7_town_B_own_view.png' });
// B walks ahead and A confirms its position update
await B.evaluate(([x, z]) => window.__mpTown.setPos(x, z), [pa.x - Math.sin(pa.ry) * 5 + Math.cos(pa.ry) * 3, pa.z - Math.cos(pa.ry) * 5 - Math.sin(pa.ry) * 3]); await A.waitForTimeout(4000);
log('A sees B at', await A.evaluate(() => [...window.__mpTown.net.peers.values()].filter(x => x.name === 'GuestB').map(x => x.s && [x.s.x.toFixed(1), x.s.z.toFixed(1)])), 'B actually at', JSON.stringify(await pos(B)));
await A.screenshot({ path: OUT + '/6b_town_A_B_moved.png' });
await A.click('#btnPause').catch(() => {}); await A.waitForTimeout(2500); await A.screenshot({ path: OUT + '/8_pause_guest.png' });
}
await b.close();
