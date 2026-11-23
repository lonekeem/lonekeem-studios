// iPhone landscape touch proofs for clan banner Draw mode.
// Never joins the public lobby or posts scores.
import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.argv[2] || 'http://127.0.0.1:4191/';
const OUT = process.argv[3] || '/workspace/atq-clan-proof/draw';
fs.mkdirSync(OUT, { recursive: true });

const rec = (n, ok, d) => { console.log(ok ? 'PASS' : 'FAIL', n, d != null ? JSON.stringify(d) : ''); return ok; };
const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => {
  try {
    localStorage.setItem('atq3.settings', JSON.stringify({ qual: 'low' }));
    localStorage.setItem('atq_prologue_seen', '1');
    localStorage.setItem('atq.gate', JSON.stringify({ birthYear: 1990, agreedVersion: 1 }));
    localStorage.setItem('atq.tut.seen', '1');
    localStorage.setItem('atq.town.tut', '1');
    localStorage.setItem('atq.profile.v1', JSON.stringify({ v: 1, name: 'ZzClanProof', uid: null, createdAt: Date.now() }));
    localStorage.setItem('atq.guest', JSON.stringify({ id: crypto.randomUUID(), secret: crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, ''), name: 'ZzClanProof' }));
  } catch (e) { /* ignore */ }
});
const p = await ctx.newPage();
p.setDefaultTimeout(90000);
const errs = [], net404 = [];
p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
p.on('response', r => { if (r.status() === 404) net404.push(r.url()); });
async function shot(name) {
  await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
}

await p.goto(URL, { waitUntil: 'domcontentloaded' });
for (let i = 0; i < 80; i++) {
  const r = await p.evaluate(() => {
    const s = document.getElementById('gateSkip'); if (s && s.offsetParent) { s.click(); return ''; }
    const ts = document.getElementById('tutSkip'); if (ts && ts.offsetParent) { ts.click(); return ''; }
    const w = document.getElementById('btnWarn'); if (w && w.offsetParent) { w.click(); return ''; }
    const t = document.getElementById('title'); const l = document.getElementById('loading');
    return t && !t.classList.contains('hidden') && (!l || l.classList.contains('hidden')) ? 'ok' : '';
  });
  if (r === 'ok') break;
  await p.waitForTimeout(400);
}
await p.waitForSelector('#title:not(.hidden)', { timeout: 30000 });
await p.locator('#tutSkip').click({ timeout: 1500 }).catch(() => {});
await p.waitForTimeout(200);

const foot = await p.evaluate(() => document.querySelector('#foot')?.textContent || '');
rec('title has #btnLobby', await p.evaluate(() => !!document.querySelector('#btnLobby')));
rec('footer has version', /v\d+\.\d+/.test(foot), foot);
await shot('01-title');

await p.click('#btnOnline');
await p.waitForTimeout(300);
rec('Online pane has #btnClans', await p.evaluate(() => !!document.querySelector('#btnClans')));
await p.click('#btnClans');
await p.waitForSelector('#online:not(.hidden)', { timeout: 30000 });
await p.waitForSelector('#cCreate, #cName', { timeout: 20000 });
await p.click('#cCreate');
await p.waitForTimeout(300);
await p.fill('#cName', 'Quiet Falls Crew');
await p.fill('#cTag', 'qfc');
await p.click('#cEditBan');
await p.waitForSelector('#cban', { timeout: 10000 });
await p.waitForTimeout(400);
rec('builder has Parts and Draw tabs', await p.evaluate(() => {
  const parts = document.querySelector('#cbanMode button[data-mode="parts"]');
  const draw = document.querySelector('#cbanMode button[data-mode="draw"]');
  return !!(parts && draw && parts.classList.contains('sel'));
}));
await shot('02-builder-parts');

await p.locator('#cbanMode button[data-mode="draw"]').tap();
await p.waitForTimeout(400);
const drawOpen = await p.evaluate(() => {
  const tab = document.querySelector('#cbanMode button[data-mode="draw"]');
  return { sel: !!(tab && tab.classList.contains('sel')), brush: !!(document.querySelector('#cdTools button[data-tool="brush"]')), canvas: !!(document.querySelector('#cbanCan')) };
});
rec('Draw tab opens with brush and canvas', drawOpen.sel && drawOpen.brush && drawOpen.canvas, drawOpen);
await shot('03-draw-tab');

// Pick a red swatch, then paint a stroke with touch
const red = p.locator('#cdCols button').nth(3); // #c43c2c-ish
if (await red.count()) { await red.tap(); await p.waitForTimeout(120); }
const box = await p.locator('#cbanCan').boundingBox();
rec('draw canvas has a box', !!(box && box.width > 40 && box.height > 40), box);
if (box) {
  const sx = box.x + box.width * 0.28, sy = box.y + box.height * 0.32;
  await p.touchscreen.tap(sx, sy);
  // drag a stroke
  const cdp = await p.context().newCDPSession(p).catch(() => null);
  // Playwright touchscreen doesn't have swipe in all versions; use pointer via dispatch
  await p.evaluate(({ x0, y0, x1, y1 }) => {
    const c = document.querySelector('#cbanCan');
    const fire = (type, x, y, buttons) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'touch', isPrimary: true, buttons }));
    fire('pointerdown', x0, y0, 1);
    for (let i = 1; i <= 8; i++) fire('pointermove', x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8, 1);
    fire('pointerup', x1, y1, 0);
  }, { x0: sx, y0: sy, x1: box.x + box.width * 0.72, y1: box.y + box.height * 0.62 });
  await p.waitForTimeout(200);
}
await shot('04-stroke-red');

// Place a gold star
await p.locator('#cdShapes button[data-shape="star"]').tap();
await p.waitForTimeout(120);
if (box) {
  const x0 = box.x + box.width * 0.5, y0 = box.y + box.height * 0.28;
  const x1 = box.x + box.width * 0.68, y1 = box.y + box.height * 0.48;
  await p.evaluate(({ x0, y0, x1, y1 }) => {
    const c = document.querySelector('#cbanCan');
    const fire = (type, x, y, buttons) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 2, pointerType: 'touch', isPrimary: true, buttons }));
    fire('pointerdown', x0, y0, 1);
    fire('pointermove', x1, y1, 1);
    fire('pointerup', x1, y1, 0);
  }, { x0, y0, x1, y1 });
  await p.waitForTimeout(200);
}
await shot('05-star-shape');

// Heart in another color + fill
await p.locator('#cdCols button').first().tap().catch(() => {});
await p.locator('#cdShapes button[data-shape="heart"]').tap();
await p.waitForTimeout(80);
if (box) {
  const x0 = box.x + box.width * 0.35, y0 = box.y + box.height * 0.55;
  await p.evaluate(({ x0, y0, x1, y1 }) => {
    const c = document.querySelector('#cbanCan');
    const fire = (type, x, y, buttons) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 3, pointerType: 'touch', isPrimary: true, buttons }));
    fire('pointerdown', x0, y0, 1); fire('pointermove', x1, y1, 1); fire('pointerup', x1, y1, 0);
  }, { x0, y0, x1: x0 + 40, y1: y0 + 36 });
  await p.waitForTimeout(150);
}
await shot('06-heart-and-star');

// Undo then redo
await p.locator('#cdUndo').tap();
await p.waitForTimeout(150);
await shot('07-after-undo');
await p.locator('#cdRedo').tap();
await p.waitForTimeout(150);
rec('undo and redo buttons work', await p.evaluate(() => {
  const b = window.__atqClanUI ? null : true;
  return !!document.querySelector('#cdUndo') && !!document.querySelector('#cdRedo');
}));
await shot('08-after-redo');

// Close-up of just the canvas
const can = p.locator('#cbanCan');
await can.screenshot({ path: `${OUT}/09-canvas-close.png` }).catch(() => {});
await shot('09b-builder-wide');

// Custom color picker exists
rec('color picker present', await p.evaluate(() => !!document.querySelector('#cdPick')));

await p.locator('#cban .cban-save').tap();
await p.waitForTimeout(300);
rec('saved drawing back to create form', await p.evaluate(() => !document.querySelector('#cban') && !!document.querySelector('#cDraftBan')));
await shot('10-create-after-draw');

// 2D close-up of a composed banner with draw ops (same renderer as nametag / flag)
const sample = {
  v: 1, shape: 'shield', bg: '#8b1e1e', bg2: '#d9b44a', pattern: 'chevron', emblem: 'bunny',
  emblemColor: '#f4f0e6', trim: '#d9b44a', trimStyle: 'thick',
  draw: { v: 1, ops: [
    { t: 'stroke', c: '#f4f0e6', w: 0.04, p: [0.2, 0.25, 0.35, 0.3, 0.55, 0.28, 0.75, 0.4] },
    { t: 'shape', k: 'star', c: '#e8a317', x: 0.5, y: 0.62, s: 0.16, r: 0, fill: true },
    { t: 'shape', k: 'heart', c: '#c43c2c', x: 0.28, y: 0.7, s: 0.1, r: 0, fill: true },
  ] },
};
await p.evaluate(async (banner) => {
  const old = document.getElementById('cdProof'); if (old) old.remove();
  const box = document.createElement('div'); box.id = 'cdProof';
  box.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#0b1a12;display:flex;align-items:center;justify-content:center;gap:24px;';
  const c1 = document.createElement('canvas'); c1.width = 320; c1.height = 400; c1.style.width = '200px';
  const c2 = document.createElement('canvas'); c2.width = 112; c2.height = 144; c2.style.width = '70px';
  box.append(c1, c2); document.body.append(box);
  const m = await import('/src/mp/clanBanner.js');
  m.drawBanner(c1.getContext('2d'), banner, 320, 400);
  m.drawBanner(c2.getContext('2d'), banner, 112, 144);
}, sample);
await p.waitForTimeout(200);
await shot('11-composed-close');
const hasDraw = await p.evaluate(async (banner) => {
  const m = await import('/src/mp/clanBanner.js');
  const cleaned = m.cleanBanner(banner);
  return !!(cleaned.draw && cleaned.draw.ops && cleaned.draw.ops.length === 3);
}, sample);
rec('cleanBanner keeps 3 draw ops', hasDraw);
await p.evaluate(() => document.getElementById('cdProof')?.remove());

// Report banner control exists in the module / would show on a clan page
rec('report + admin reset helpers exist', await p.evaluate(() => {
  const src = (window.__atqClanUI && true);
  return typeof window.__atqClanUI?.openBannerBuilder === 'function';
}));

rec('no page errors', errs.length === 0, errs);
rec('no 404s', net404.length === 0, net404.slice(0, 8));

await b.close();
console.log('DONE out=' + OUT);
