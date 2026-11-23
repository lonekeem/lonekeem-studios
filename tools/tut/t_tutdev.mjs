// Device-aware tutorial test. MODE=touch (iPhone landscape, touch) | pad (iPhone landscape + emulated Xbox pad) | kbd (desktop keyboard+mouse) | se (iPhone SE 667x375 touch, layout only)
// Local only: no lobby, no backend.
import { launch, context, page } from '../coop/lib.mjs'; import { PAD_INIT, padOf } from '../pad/lib.mjs'; import fs from 'fs';
const MODE = process.env.MODE || 'touch'; const OUT = (process.env.OUT || '/workspace/atq-tutdev-proof') + '/' + MODE; fs.mkdirSync(OUT, { recursive: true });
const IPH = { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };
const OPTS = { touch: IPH, pad: IPH, se: { ...IPH, viewport: { width: 667, height: 375 } }, kbd: { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 } }[MODE];
const b = await launch(); const ctx = await context(b, OPTS); await ctx.addInitScript(PAD_INIT);
await ctx.addInitScript(() => { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', 1); localStorage.removeItem('atq.tut.seen'); localStorage.removeItem('atq.tut.step'); } });
const R = []; const log = (k, v) => { R.push([k, v]); console.log(k, JSON.stringify(v)); };
const p = await page(ctx, MODE); const P = padOf(p); const q = (fn, a) => p.evaluate(fn, a); const shot = n => p.screenshot({ path: `${OUT}/${n}.png` });
const cdp = await ctx.newCDPSession(p);
await p.waitForFunction(() => document.getElementById('loading').classList.contains('hidden'), null, { timeout: 300000 });
const T = () => q(() => window.__atqTut.step());
const card = () => q(() => { const h = document.getElementById('tutHud'); const r = document.getElementById('tutRing'); return { step: window.__atqTut.step(), dev: h.dataset.dev, title: h.querySelector('h3').innerText.replace(/\s+/g, ' '), how: h.querySelector('.th').innerText, ring: r && !r.classList.contains('hidden') ? r.querySelector('b').textContent : null, prog: h.querySelector('.tprog').textContent }; });
async function start() { await q(() => { window.__atqTut.reset(); window.__atqTut.start(); });
  await p.waitForFunction(() => window.__atq.state === 'play' && window.__atq.game && window.__atq.game.running, null, { timeout: 300000 }); await p.waitForTimeout(2000);
  await q(() => { const g = window.__atq.game; setInterval(() => { g.hp = g.maxHp; (g.zombies || []).forEach(z => { if (Math.hypot(z.root ? z.root.position.x - g.player.root.position.x : 99, z.root ? z.root.position.z - g.player.root.position.z : 99) < 25) z.hp = 0; }); }, 400); }); }
const center = sel => q(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; }, sel);
const touch = async (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
async function tapAt(x, y) { await touch('touchStart', [{ x, y, id: 1 }]); await p.waitForTimeout(90); await touch('touchEnd', []); await p.waitForTimeout(200); }
const ringTap = async () => { const c = await center('#tutRing'); if (!c) return false; await tapAt(c.x, c.y); return true; };
async function tapSel(sel) { await q(s => { const e = document.querySelector(s); e && e.scrollIntoView({ block: 'nearest' }); }, sel); const c = await center(sel); if (!c) return false; await tapAt(c.x, c.y); return true; }
async function drag(x0, y0, dx, dy, ms = 900, extra) { await touch('touchStart', [{ x: x0, y: y0, id: 1 }]); const n = 12; for (let i = 1; i <= n; i++) { await touch('touchMove', [{ x: x0 + dx * i / n, y: y0 + dy * i / n, id: 1 }]); await p.waitForTimeout(ms / n); if (extra && i === 4) await extra(); } await p.waitForTimeout(300); await touch('touchEnd', []); }
const W = OPTS.viewport.width, H = OPTS.viewport.height;
async function doTouch(id) { switch (id) {
  case 'move': { const c = await center('#stickBase'); return drag(c.x, c.y, 0, -50, 1400); }
  case 'look': return drag(W * .62, H * .45, 160, 0, 900);
  case 'aim': case 'fire': case 'jump': case 'roll': case 'crouch': case 'reload': case 'gren': case 'use': case 'heal': return ringTap();
  case 'run': { const c = await center('#stickBase'), r = await center('#tRun'); await touch('touchStart', [{ x: c.x, y: c.y, id: 1 }]); for (let i = 1; i <= 6; i++) { await touch('touchMove', [{ x: c.x, y: c.y - 9 * i, id: 1 }]); await p.waitForTimeout(80); }
    await touch('touchStart', [{ x: c.x, y: c.y - 54, id: 1 }, { x: r.x, y: r.y, id: 2 }]); await p.waitForTimeout(90); await touch('touchEnd', [{ x: c.x, y: c.y - 54, id: 1 }]); await p.waitForTimeout(900); await touch('touchEnd', []); await tapSel('#tRun'); return; }
  case 'swap': { const has = await q(() => { const e = [...document.querySelectorAll('#wbar .wslot:not(.eq)')].find(x => x.getBoundingClientRect().width > 4 && x.dataset.id !== 'fists'); if (!e) return false; e.setAttribute('data-t', 1); return true; }); return has ? tapSel('#wbar [data-t]') : ringTap(); }
  case 'camera': await ringTap(); await p.waitForTimeout(400); return tapSel('#btnView');
  case 'pause': await tapSel('#btnPause'); await p.waitForTimeout(700); await shot('pause-menu'); return tapSel('#btnResume'); } }
async function doPad(id) { const PR = k => P.press(k); switch (id) {
  case 'move': await P.axis(1, -1); await p.waitForTimeout(1300); return P.axis(1, 0);
  case 'look': await P.axis(2, 1); await p.waitForTimeout(1200); return P.axis(2, 0);
  case 'aim': await P.hold('LT', 1); await p.waitForTimeout(700); return P.hold('LT', 0); case 'fire': return PR('RT'); case 'jump': return PR('A'); case 'roll': return PR('B');
  case 'crouch': return PR('R3'); case 'run': await P.axis(1, -1); await p.waitForTimeout(300); await PR('L3'); await p.waitForTimeout(800); return P.axis(1, 0);
  case 'reload': return PR('Y'); case 'swap': return PR('RB'); case 'gren': return PR('LB'); case 'use': return PR('X'); case 'heal': return PR('DOWN'); case 'camera': await PR('VIEW'); await p.waitForTimeout(300); return PR('VIEW');
  case 'pause': await PR('START'); await p.waitForTimeout(700); await shot('pause-menu'); return PR('B'); } }
const key = async (k, ms = 120) => { await p.keyboard.down(k); await p.waitForTimeout(ms); await p.keyboard.up(k); await p.waitForTimeout(150); };
async function doKbd(id) { switch (id) {
  case 'move': return key('KeyW', 1300);
  case 'look': { await p.mouse.move(640, 360); await p.mouse.down({ button: 'middle' }); for (let i = 1; i <= 10; i++) { await p.mouse.move(640 + 30 * i, 360); await p.waitForTimeout(60); } return p.mouse.up({ button: 'middle' }); }
  case 'aim': await p.mouse.move(640, 360); await p.mouse.down({ button: 'right' }); await p.waitForTimeout(700); return p.mouse.up({ button: 'right' });
  case 'fire': await p.mouse.down(); await p.waitForTimeout(120); return p.mouse.up();
  case 'jump': return key('Space'); case 'roll': return key('ControlLeft'); case 'crouch': return key('KeyC');
  case 'run': await p.keyboard.down('KeyW'); await p.keyboard.down('ShiftLeft'); await p.waitForTimeout(900); await p.keyboard.up('ShiftLeft'); return p.keyboard.up('KeyW');
  case 'reload': return key('KeyR'); case 'swap': return key('KeyQ'); case 'gren': return key('KeyG'); case 'use': return key('KeyE'); case 'heal': return key('KeyH'); case 'camera': await key('KeyV'); return key('KeyV');
  case 'pause': await key('Escape'); await p.waitForTimeout(700); await shot('pause-menu'); return key('Escape'); } }
const doIt = { touch: doTouch, se: doTouch, pad: doPad, kbd: doKbd }[MODE];

// layout: tutorial card must not cover any on-screen control
const overlaps = () => q(() => { const box = document.querySelector('#tutHud .tbox').getBoundingClientRect(); const hit = [];
  document.querySelectorAll('#touch button, #touch .rb, #hudr button, #pfp, #mini, #stickBase, #wbar, #btnPause').forEach(e => { const r = e.getBoundingClientRect(); if (r.width < 2 || getComputedStyle(e).visibility === 'hidden' || +getComputedStyle(e).opacity === 0) return; if (r.left < box.right && r.right > box.left && r.top < box.bottom && r.bottom > box.top) hit.push(e.id || e.className); });
  return { card: [Math.round(box.left), Math.round(box.top), Math.round(box.width), Math.round(box.height)], hit }; });

await start(); if (MODE === 'pad') { await q(() => window.__padConnect()); await P.press('LEFT'); }
log('0 card', await card()); log('0 layout', await overlaps()); await shot('00-start');
const ids = await q(() => window.__atqTut.steps); const res = {};
for (const id of ids) {
  if ((await T()) !== id) { log('skip-mismatch', { want: id, at: await T() }); }
  const c0 = await card(); await shot(`s-${String(ids.indexOf(id) + 1).padStart(2, '0')}-${id}`);
  if (MODE === 'se') { res[id] = { card: c0, layout: await overlaps() }; await q(() => document.querySelector('#tutHud .tnext').click()); await p.waitForTimeout(250); continue; }
  await doIt(id); await p.waitForTimeout(1300);
  const after = await T(); const ok = after !== id; res[id] = { by: ok ? 'action' : 'NOT', card: c0 };
  if (!ok) { await q(() => document.querySelector('#tutHud .tnext').click()); await p.waitForTimeout(300); }
  if (id === 'roll' && MODE === 'touch') { // live switch: pad press repaints with glyphs, touch brings the ring back
    await q(() => window.__padConnect()); const st = await T(); await P.press('UP'); const pc = await card(); await shot('switch-to-pad'); await tapAt(W * .5, H * .55); await p.waitForTimeout(300); const tc = await card(); await shot('switch-back-touch'); log('live switch', { step: st, pad: pc, touch: tc }); }
  if (id === 'roll' && MODE === 'pad') { await tapAt(W * .5, H * .55); await p.waitForTimeout(300); const tc = await card(); await shot('switch-to-touch'); await P.press('UP'); const pc = await card(); log('live switch', { touch: tc, pad: pc }); }
  if (id === 'roll' && MODE === 'kbd') { await q(() => window.__padConnect()); await P.press('UP'); const pc = await card(); await shot('switch-to-pad'); await key('KeyK'); const kc = await card(); log('live switch', { pad: pc, kbd: kc }); }
}
log('steps', Object.fromEntries(Object.entries(res).map(([k, v]) => [k, v.by || v.layout])));
fs.writeFileSync(`${OUT}/cards.json`, JSON.stringify(res, null, 1));
await p.waitForTimeout(800); log('done card', await q(() => { const o = document.getElementById('tutOffer'); return o && !o.classList.contains('hidden') ? o.innerText.slice(0, 160) : null; })); await shot('99-done');
log('seen after finish', await q(() => localStorage.getItem('atq.tut.seen')));
// saved progress + Next / ✕ : restart, Next twice, reload -> offer resumes at step 3, ✕ closes and marks seen
await q(() => { const o = document.getElementById('tutOffer'); o && o.classList.add('hidden'); });
if (MODE !== 'se') {
  await q(() => { window.__atqTut.reset(); window.__atqTut.start(); }); await p.waitForTimeout(1500);
  if (MODE === 'kbd') { await p.click('#tutHud .tnext'); await p.click('#tutHud .tnext'); } else { await tapSel('#tutHud .tnext'); await tapSel('#tutHud .tnext'); }
  log('next x2', { step: await T(), saved: await q(() => localStorage.getItem('atq.tut.step')) });
  await q(() => localStorage.removeItem('atq.tut.seen'));
  await p.reload(); await p.waitForFunction(() => window.__atqTut, null, { timeout: 300000 }); await p.waitForTimeout(1500);
  await p.waitForFunction(() => document.getElementById('loading').classList.contains('hidden'), null, { timeout: 300000 });
  await q(() => { localStorage.removeItem('atq.tut.seen'); window.__atqTut.offer(); }); await p.waitForTimeout(400); log('offer after reload', await q(() => document.getElementById('tutOffer').innerText.replace(/\s+/g, ' ').slice(0, 140))); await shot('offer-resume');
  await q(() => document.getElementById('tutStart').click()); await p.waitForFunction(() => window.__atq.state === 'play', null, { timeout: 300000 }); await p.waitForTimeout(1500);
  log('resumed at', await T());
  if (MODE === 'kbd') await p.click('#tutHud .tx'); else await tapSel('#tutHud .tx');
  await p.waitForTimeout(400); log('✕ closes', { active: await q(() => window.__atqTut.active()), seen: await q(() => localStorage.getItem('atq.tut.seen')), hud: await q(() => document.getElementById('tutHud').classList.contains('hidden')) });
  // Controls reference from Pause for the current device, Back returns to Pause
  await q(() => window.__atq.game.onPause()); await p.waitForTimeout(600);
  if (MODE === 'pad') { await q(() => window.__padConnect()); for (let i = 0; i < 8 && (await P.focus()) !== '#btnPControls'; i++) await P.press('DOWN'); await P.press('A'); }
  else if (MODE === 'kbd') await p.click('#btnPControls'); else await tapSel('#btnPControls');
  await p.waitForTimeout(600); log('controls ref', await q(() => ({ open: !document.getElementById('controls').classList.contains('hidden'), now: document.querySelector('#ctlRef .cnow').innerText, tab: document.querySelector('#ctlRef .ctabs .on').innerText, fire: [...document.querySelectorAll('#ctlRef tr')].find(r => /Fire/.test(r.innerText)).innerText.replace(/\s+/g, ' ') })));
  await shot('controls-ref');
  if (MODE === 'pad') await P.press('B'); else if (MODE === 'kbd') await p.click('#controls .back'); else await tapSel('#controls .back');
  await p.waitForTimeout(500); log('back to pause', await q(() => !document.getElementById('pause').classList.contains('hidden')));
}
fs.writeFileSync(`${OUT}/t_tutdev.json`, JSON.stringify({ R, errs: p.errs, nf: p.nf }, null, 1)); console.log('errs', p.errs, 'nf', p.nf.length);
await b.close();
