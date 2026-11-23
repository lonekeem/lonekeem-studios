// Photo mode probe: iPhone landscape touch. Pause -> Photo mode, touch orbit/pinch/pan, mouse drag/wheel, filters, save (share + download).
import { chromium } from 'playwright'; import fs from 'fs';
const [step = 'c2_town', out = '/workspace/atq-feat3-proof/photo'] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true }); await ctx.route(/supabase\.co/, r => r.abort());
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/supabase|Failed to load/i.test(m.text())) errs.push(m.text()); });
await p.addInitScript(() => { localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low', voices: false })); localStorage.setItem('atq_prologue_seen', '1'); localStorage.setItem('atq_age_ok', '1'); localStorage.setItem('atq3.budTip', '1'); });
await p.goto('http://127.0.0.1:4472/?step=0&god'); await p.waitForFunction(() => window.__atq?.game?.running, null, { timeout: 180000 });
const idx = await p.evaluate((id) => window.__atq.story.findIndex(s => s.id === id), step);
await p.goto('http://127.0.0.1:4472/?step=' + idx + '&god'); await p.waitForFunction(() => window.__atq?.game?.running, null, { timeout: 180000 });
const E = (f, a) => p.evaluate(f, a), W = (t) => p.waitForTimeout(t);
for (let i = 0; i < 60; i++) { const c = await E(() => { const g = window.__atq.game; if (g.dlgCur || (g.dlgQ && g.dlgQ.length)) { g.skipLine(); return 1; } return g.cut ? 2 : 0; }); if (!c) break; await W(300); }
await W(7000);
const cdp = await ctx.newCDPSession(p); const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
const camS = () => E(() => { const g = window.__atq.game, c = g.camera.position, S = g.photo; return { st: window.__atq.state ?? null, photo: !!S, cam: [c.x.toFixed(2), c.y.toFixed(2), c.z.toFixed(2)], dist: S && +S.dist.toFixed(2), yaw: S && +S.yaw.toFixed(2), pitch: S && +S.pitch.toFixed(2), filt: S && S.filter.id, glf: document.getElementById('gl').style.filter, hud: getComputedStyle(document.getElementById('hud')).display, touchUi: getComputedStyle(document.getElementById('touch')).display, paused: g.paused }; });
await p.tap('#btnPause'); await W(800); await p.screenshot({ path: out + '/00_pause.png' });
await p.tap('#btnPhoto'); await W(1500); console.log('open', JSON.stringify(await camS())); await p.screenshot({ path: out + '/01_open.png' });
// one-finger orbit drag
await touch('touchStart', [[420, 220]]); for (let i = 1; i <= 10; i++) { await touch('touchMove', [[420 - i * 22, 220 - i * 4]]); await W(60); } await touch('touchEnd', []); await W(1200);
console.log('orbit', JSON.stringify(await camS())); await p.screenshot({ path: out + '/02_orbit.png' });
// pinch in (zoom closer)
await touch('touchStart', [[300, 200], [540, 200]]); for (let i = 1; i <= 10; i++) { await touch('touchMove', [[300 - i * 10, 200], [540 + i * 10, 200]]); await W(60); } await touch('touchEnd', []); await W(1200);
console.log('pinch', JSON.stringify(await camS())); await p.screenshot({ path: out + '/03_pinch.png' });
// two-finger pan up
await touch('touchStart', [[350, 250], [490, 250]]); for (let i = 1; i <= 8; i++) { await touch('touchMove', [[350, 250 - i * 6], [490, 250 - i * 6]]); await W(60); } await touch('touchEnd', []); await W(1000); console.log('pan', JSON.stringify(await camS()));
// mouse drag + wheel
await p.mouse.move(400, 200); await p.mouse.down(); for (let i = 1; i <= 8; i++) { await p.mouse.move(400 + i * 15, 200 + i * 3); await W(40); } await p.mouse.up(); await p.mouse.wheel(0, 240); await W(1200); console.log('mouse', JSON.stringify(await camS())); await p.screenshot({ path: out + '/04_mouse.png' });
for (const f of ['noir', 'warm', 'cold', 'vivid', 'bw', 'sepia']) { await p.tap(`#photo .phChips button[data-f="${f}"]`); await W(900); await p.screenshot({ path: out + `/10_${f}.png` }); }
await p.tap('#photo .phChips button[data-f="warm"]'); await p.tap('#phVigB'); await W(800); console.log('filter', JSON.stringify(await camS())); await p.screenshot({ path: out + '/11_warm_vig_preview.png' });
// save via share sheet (stubbed: records the file)
await E(() => { window.__shared = null; navigator.canShare = (d) => !!(d && d.files && d.files.length); navigator.share = (d) => { window.__shared = { n: d.files.length, name: d.files[0].name, type: d.files[0].type, size: d.files[0].size }; return Promise.resolve(); }; });
await p.tap('#phShot'); await W(1500); console.log('share', JSON.stringify(await E(() => ({ shared: window.__shared, last: window.__atqLastPhoto && { name: window.__atqLastPhoto.name, w: window.__atqLastPhoto.w, h: window.__atqLastPhoto.h }, msg: document.getElementById('phMsg').textContent })))); await p.screenshot({ path: out + '/12_after_share.png' });
const url = await E(() => window.__atqLastPhoto.url); fs.writeFileSync(out + '/13_saved_warm_vig.jpg', Buffer.from(url.split(',')[1], 'base64'));
// download fallback (no share support)
await E(() => { window.__atqNoShare = true; }); await p.tap('#photo .phChips button[data-f="noir"]'); await p.tap('#phVigB'); await W(500);
const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }).catch(() => null), p.tap('#phShot')]);
if (dl) { await dl.saveAs(out + '/14_download_noir.jpg'); console.log('download', dl.suggestedFilename(), fs.statSync(out + '/14_download_noir.jpg').size); } else console.log('download NONE');
await W(800); await p.screenshot({ path: out + '/15_noir_preview.png' });
await p.tap('#phDone'); await W(1000); console.log('done', JSON.stringify(await camS())); await p.screenshot({ path: out + '/16_back_pause.png' });
await p.tap('#btnResume'); await W(1500); console.log('resume', JSON.stringify(await camS())); await p.screenshot({ path: out + '/17_resumed.png' });
console.log('ERRS', JSON.stringify(errs.slice(0, 8))); await b.close();
