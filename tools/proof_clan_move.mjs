// iPhone landscape touch proofs for banner Select/Move (drag, resize, stretch, rotate, thickness).
// Never joins the public lobby or posts scores.
import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.argv[2] || 'http://127.0.0.1:4192/';
const OUT = process.argv[3] || '/workspace/atq-clan-proof/move';
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
p.on('pageerror', e => errs.push(String(e).slice(0, 240)));
p.on('response', r => { if (r.status() === 404) net404.push(r.url()); });
async function shot(name) { await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: false }); }
async function canShot(name) { await p.locator('#cbanCan').screenshot({ path: `${OUT}/${name}.png` }).catch(() => {}); }

function fireDrag(page, x0, y0, x1, y1, id = 11) {
  return page.evaluate(({ x0, y0, x1, y1, id }) => {
    const c = document.querySelector('#cbanCan');
    const fire = (type, x, y, buttons) => c.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: id, pointerType: 'touch', isPrimary: true, buttons,
    }));
    fire('pointerdown', x0, y0, 1);
    const n = 10;
    for (let i = 1; i <= n; i++) fire('pointermove', x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, 1);
    fire('pointerup', x1, y1, 0);
  }, { x0, y0, x1, y1, id });
}
async function boxOf() { return p.locator('#cbanCan').boundingBox(); }
const at = (box, nx, ny) => ({ x: box.x + box.width * nx, y: box.y + box.height * ny });

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
await p.waitForTimeout(250);
await p.fill('#cName', 'Quiet Falls Crew');
await p.fill('#cTag', 'qfc');
await p.click('#cEditBan');
await p.waitForSelector('#cban', { timeout: 10000 });
await p.waitForTimeout(400);
rec('builder has Parts and Draw', await p.evaluate(() => !!(document.querySelector('#cbanMode button[data-mode="draw"]'))));
await shot('02-builder-parts');

await p.locator('#cbanMode button[data-mode="draw"]').tap();
await p.waitForTimeout(400);
const drawOpen = await p.evaluate(() => ({
  sel: !!document.querySelector('#cbanMode button[data-mode="draw"].sel'),
  move: !!document.querySelector('#cdTools button[data-tool="move"]'),
  canvas: !!document.querySelector('#cbanCan'),
}));
rec('Draw tab has a Move tool', drawOpen.sel && drawOpen.move && drawOpen.canvas, drawOpen);
await shot('03-draw-tab');

const red = p.locator('#cdCols button').nth(3);
if (await red.count()) { await red.tap(); await p.waitForTimeout(80); }

let box = await boxOf();
rec('draw canvas has a box', !!(box && box.width > 40 && box.height > 40), box);

// Red stroke across the lower third
if (box) {
  const a = at(box, 0.18, 0.72), b2 = at(box, 0.84, 0.78);
  await fireDrag(p, a.x, a.y, b2.x, b2.y, 21);
  await p.waitForTimeout(150);
}
await shot('04-stroke');
await canShot('04b-stroke-close');

// Gold star on the upper left, small enough to leave the emblem free
await p.locator('#cdShapes button[data-shape="star"]').tap();
await p.waitForTimeout(80);
const gold = p.locator('#cdCols button').nth(4);
if (await gold.count()) { await gold.tap(); await p.waitForTimeout(60); }
box = await boxOf();
if (box) {
  const a = at(box, 0.30, 0.28), b2 = at(box, 0.44, 0.40);
  await fireDrag(p, a.x, a.y, b2.x, b2.y, 22);
  await p.waitForTimeout(150);
}
await shot('05-star-placed');
await canShot('05b-star-close');

// Move: select the star
await p.locator('#cdTools button[data-tool="move"]').tap();
await p.waitForTimeout(120);
box = await boxOf();
if (box) {
  const c = at(box, 0.30, 0.28);
  await p.evaluate(({ x, y }) => {
    const el = document.querySelector('#cbanCan');
    const fire = (type, buttons) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 30, pointerType: 'touch', isPrimary: true, buttons }));
    fire('pointerdown', 1); fire('pointerup', 0);
  }, c);
  await p.waitForTimeout(180);
}
const selUi = await p.evaluate(() => ({
  move: !!document.querySelector('#cdTools button[data-tool="move"].sel'),
  acts: document.querySelector('#cdSelActs')?.classList.contains('show'),
  frontOn: document.querySelector('#cdFront') && !document.querySelector('#cdFront').disabled,
}));
rec('Move tool selects an item and shows actions', selUi.move && selUi.acts, selUi);
await shot('06-selected-handles');
await canShot('06b-handles-close');

// Drag the star to the right
box = await boxOf();
if (box) {
  const a = at(box, 0.30, 0.28), b2 = at(box, 0.62, 0.36);
  await fireDrag(p, a.x, a.y, b2.x, b2.y, 31);
  await p.waitForTimeout(180);
}
await shot('07-moved');
await canShot('07b-moved-close');

// Uniform resize: NE corner outward (star ~ 0.62, 0.36, s ~ 0.16)
box = await boxOf();
if (box) {
  const hx = 0.16 * Math.min(box.width, box.height) / box.width * 1.08;
  const hy = 0.16 * Math.min(box.width, box.height) / box.height * 1.08;
  const a = at(box, 0.62 + hx, 0.36 - hy);
  const b2 = at(box, 0.62 + hx + 0.10, 0.36 - hy - 0.10);
  await fireDrag(p, a.x, a.y, b2.x, b2.y, 32);
  await p.waitForTimeout(180);
}
await shot('08-resized');
await canShot('08b-resized-close');

// Non-uniform stretch: east handle outward
box = await boxOf();
if (box) {
  const hx = 0.22 * Math.min(box.width, box.height) / box.width * 1.08;
  const a = at(box, 0.62 + hx, 0.36);
  const b2 = at(box, 0.62 + hx + 0.16, 0.36);
  await fireDrag(p, a.x, a.y, b2.x, b2.y, 33);
  await p.waitForTimeout(180);
}
await shot('09-stretched');
await canShot('09b-stretched-close');

// Rotate via the top handle
box = await boxOf();
if (box) {
  const hy = 0.18 * Math.min(box.width, box.height) / box.height * 1.08;
  const a = at(box, 0.62, 0.36 - hy - (22 / Math.max(box.height, 1)));
  const b2 = at(box, 0.80, 0.36 - hy);
  await fireDrag(p, a.x, a.y, b2.x, b2.y, 34);
  await p.waitForTimeout(180);
}
await shot('10-rotated');
await canShot('10b-rotated-close');

// Recolor selected star
await p.locator('#cdCols button').nth(2).tap().catch(() => {});
await p.waitForTimeout(150);
await shot('11-recolor');
await canShot('11b-recolor-close');

// Select the lower stroke and thicken it
box = await boxOf();
if (box) {
  const c = at(box, 0.50, 0.75);
  await p.evaluate(({ x, y }) => {
    const el = document.querySelector('#cbanCan');
    const fire = (type, buttons) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 40, pointerType: 'touch', isPrimary: true, buttons }));
    fire('pointerdown', 1); fire('pointerup', 0);
  }, c);
  await p.waitForTimeout(150);
}
await p.locator('#cdSize button[data-sz="0.09"]').tap();
await p.waitForTimeout(150);
rec('Size buttons present for thickness', await p.evaluate(() => !!document.querySelector('#cdSize button[data-sz="0.09"]')));
await shot('12-thick-stroke');
await canShot('12b-thick-close');

// Duplicate the stroke
await p.locator('#cdDup').tap();
await p.waitForTimeout(150);
await shot('13-duplicated');

// Click empty-ish lower-left then the emblem center and nudge it up
box = await boxOf();
if (box) {
  const empty = at(box, 0.12, 0.55);
  await p.evaluate(({ x, y }) => {
    const el = document.querySelector('#cbanCan');
    const fire = (type, buttons) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 49, pointerType: 'touch', isPrimary: true, buttons }));
    fire('pointerdown', 1); fire('pointerup', 0);
  }, empty);
  await p.waitForTimeout(80);
  const c = at(box, 0.50, 0.50);
  await p.evaluate(({ x, y }) => {
    const el = document.querySelector('#cbanCan');
    const fire = (type, buttons) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 50, pointerType: 'touch', isPrimary: true, buttons }));
    fire('pointerdown', 1); fire('pointerup', 0);
  }, c);
  await p.waitForTimeout(150);
  const a = at(box, 0.50, 0.50), b2 = at(box, 0.50, 0.34);
  await fireDrag(p, a.x, a.y, b2.x, b2.y, 51);
  await p.waitForTimeout(180);
}
await shot('14-emblem-moved');
await canShot('14b-emblem-close');

// Undo the last transform
await p.locator('#cdUndo').tap();
await p.waitForTimeout(150);
await shot('15-after-undo');

await p.locator('#cban .cban-save').tap();
await p.waitForTimeout(300);
rec('saved banner back to create form', await p.evaluate(() => !document.querySelector('#cban') && !!document.querySelector('#cDraftBan')));
await shot('16-create-after-move');

// Programmatic composed close-ups: stretch, rotate, thickness, moved emblem
const sample = {
  v: 1, shape: 'shield', bg: '#8b1e1e', bg2: '#d9b44a', pattern: 'chevron', emblem: 'bunny',
  emblemColor: '#f4f0e6', trim: '#d9b44a', trimStyle: 'thick',
  ex: 0.50, ey: 0.32, er: -0.25, ew: 1.15, eh: 0.85,
  draw: { v: 1, ops: [
    { t: 'stroke', c: '#f4f0e6', w: 0.09, p: [0.16, 0.72, 0.40, 0.78, 0.70, 0.74, 0.86, 0.80] },
    { t: 'shape', k: 'star', c: '#c43c2c', x: 0.68, y: 0.52, s: 0.20, r: 0.45, fill: true, sx: 1.55, sy: 0.75, w: 0.025 },
    { t: 'shape', k: 'heart', c: '#1a1a1a', x: 0.28, y: 0.58, s: 0.12, r: -0.3, fill: true, w: 0.025 },
    { t: 'shape', k: 'line', c: '#e8a317', x: 0.5, y: 0.86, s: 0.28, r: 0.15, fill: false, w: 0.055 },
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
await shot('17-composed-close');
const cleaned = await p.evaluate(async (banner) => {
  const m = await import('/src/mp/clanBanner.js');
  const c = m.cleanBanner(banner);
  const star = c.draw && c.draw.ops && c.draw.ops.find(o => o.k === 'star');
  return {
    ops: c.draw && c.draw.ops && c.draw.ops.length,
    sx: star && star.sx, sy: star && star.sy, r: star && star.r,
    ex: c.ex, ey: c.ey, er: c.er, ew: c.ew, eh: c.eh,
    strokeW: c.draw && c.draw.ops && c.draw.ops[0] && c.draw.ops[0].w,
  };
}, sample);
rec('cleanBanner keeps stretch, pose, and thickness', !!(cleaned.ops === 4 && cleaned.sx === 1.55 && cleaned.sy === 0.75 && cleaned.ex === 0.5 && cleaned.strokeW === 0.09), cleaned);
await p.evaluate(() => document.getElementById('cdProof')?.remove());

rec('no page errors', errs.length === 0, errs);
rec('no 404s', net404.length === 0, net404.slice(0, 8));

await b.close();
console.log('DONE out=' + OUT);
