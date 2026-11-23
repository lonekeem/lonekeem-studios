// Controller test: emulated Xbox pad in an iPhone-landscape mobile context (844x390, touch, isMobile). Local only: no lobby, no backend.
import { launch, context, page, frames } from '../coop/lib.mjs'; import { PAD_INIT, padOf } from './lib.mjs'; import fs from 'fs';
const OUT = process.env.OUT || '/workspace/atq-pad-proof'; fs.mkdirSync(OUT, { recursive: true });
const b = await launch(); const ctx = await context(b, { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
await ctx.addInitScript(PAD_INIT);
await ctx.addInitScript(() => { localStorage.setItem('atq3_save', JSON.stringify({ v: 3, maxCh: 24, done: true, done2: true, step: 0, cash: 100, played: true, owned: ['fists', 'pistol', 'rifle'], cur: 'pistol' })); });
const R = []; const log = (k, v) => { R.push([k, v]); console.log(k, JSON.stringify(v)); };
const p = await page(ctx, 'A'); const P = padOf(p); const shot = n => p.screenshot({ path: `${OUT}/${n}.png` });
const q = (fn, a) => p.evaluate(fn, a);
await p.waitForFunction(() => { const l = document.getElementById('loading'); return !l || l.classList.contains('hidden') || getComputedStyle(l).display === 'none'; }, null, { timeout: 300000 }); await p.waitForTimeout(800);
await p.evaluate(() => window.__padConnect()); await p.waitForTimeout(400);
await P.press('DOWN'); log('1 title focus after first press', { focus: await P.focus(), bodyPad: await q(() => document.body.classList.contains('pad')), menu: await q(() => window.__padNav.menu) });
await shot('01-title-focus');
const seen = []; for (let i = 0; i < 4; i++) { await P.press('DOWN'); seen.push(await P.focus()); } log('1b title d-pad down', seen); await shot('02-title-moved');
// go to Settings with the pad only
let f; for (let i = 0; i < 14 && (f = await P.focus()) !== '#btnSettings'; i++) await P.press('DOWN');
if (f !== '#btnSettings') for (let i = 0; i < 14 && (f = await P.focus()) !== '#btnSettings'; i++) await P.press('UP');
log('2 reached settings btn', f); await P.press('A'); await p.waitForTimeout(500);
log('2b settings open', { open: await q(() => !document.getElementById('settings').classList.contains('hidden')), focus: await P.focus() });
for (const d of ['DOWN', 'LEFT', 'UP']) for (let i = 0; i < 10 && (f = await P.focus()) !== '#sVol'; i++) await P.press(d);
const v0 = await q(() => document.getElementById('sVol').value); await P.press('LEFT'); await P.press('LEFT'); const v1 = await q(() => document.getElementById('sVol').value);
log('2c slider by d-pad', { focus: f, before: v0, after: v1 }); await shot('03-settings-slider');
await P.press('RIGHT'); await P.press('RIGHT');
await P.press('B'); await p.waitForTimeout(400); log('2d B closes settings', { settingsHidden: await q(() => document.getElementById('settings').classList.contains('hidden')), titleShown: await q(() => !document.getElementById('title').classList.contains('hidden')) });
// character creator (opened directly; no lobby)
await q(async () => { const m = await import('/src/mp/creator.js'); window.__crClosed = 0; m.openCreator({ onClose() { window.__crClosed++; } }); });
await p.waitForFunction(() => document.querySelector('#mpc .tabs button'), null, { timeout: 120000 }); await p.waitForTimeout(2500);
const tab = () => q(() => { const t = document.querySelector('#mpc .tabs button.on, #mpc .tabs button.sel, #mpc .tabs button.active'); return t ? t.textContent.trim() : null; });
const t0 = await tab(); await P.press('RB'); await p.waitForTimeout(300); const t1 = await tab(); await P.press('RB'); await p.waitForTimeout(300); const t2 = await tab(); await P.press('LB'); await p.waitForTimeout(300); const t3 = await tab();
log('3 creator tabs RB,RB,LB', [t0, t1, t2, t3]);
const fs0 = []; await P.press('DOWN'); fs0.push(await P.focus()); await P.press('DOWN'); fs0.push(await P.focus()); await P.press('RIGHT'); fs0.push(await P.focus()); log('3b creator focus moves', fs0); await shot('04-creator-focus');
const look0 = await q(() => JSON.stringify(JSON.parse(localStorage.getItem('atq.look.v1') || localStorage.getItem('atq.mp.look') || '{}')).length);
const ft = await P.focus(); await P.press('A'); await p.waitForTimeout(500);
log('3c A on focused creator item', { item: ft, focusedHasOn: await q(() => { const f = window.__padNav.focus; return f ? f.className : null; }) }); await shot('05-creator-pressed');
for (let i = 0; i < 3; i++) await P.axis(2, .9), await p.waitForTimeout(120); await P.axis(2, 0);
let bTries = 0; for (; bTries < 3; bTries++) { await P.press('B'); await p.waitForTimeout(900); if (await q(() => window.__crClosed)) break; } log('3d B leaves creator', { bTries: bTries + 1 }); log('3d2', { closed: await q(() => window.__crClosed), mpcGone: await q(() => !document.getElementById('mpc') || getComputedStyle(document.getElementById('mpc')).display === 'none') });
await shot('06-after-creator');

// ---- gameplay: reach Survival with the pad only, then drive the game with it
const goto = async (id, max = 16) => { let f; for (const d of ['DOWN', 'UP', 'RIGHT', 'LEFT']) for (let i = 0; i < max && (f = await P.focus()) !== id; i++) await P.press(d); return f; };
let fo = await goto('#btnSurvival'); log('4 focus survival', fo); await shot('07-title-survival');
await P.press('A'); await p.waitForTimeout(800);
// some builds open a confirm / pane first: press A on whatever is focused until play starts
for (let i = 0; i < 6; i++) { const st = await q(() => window.__atq.state); if (st === 'play' || st === 'loading') break; const fid = await P.focus(); console.log('pre-play focus', fid, st); if (!fid) break; await P.press('A'); await p.waitForTimeout(900); }
await p.waitForFunction(() => window.__atq.state === 'play' && window.__atq.game && window.__atq.game.running, null, { timeout: 300000 }); await p.waitForTimeout(2500);
await q(() => { const g = window.__atq.game; window.__edges = []; const ip = g.input.pressed.bind(g.input); g.input.pressed = k => { const v = ip(k); if (v) window.__edges.push(k); return v; }; g.zombies && g.zombies.forEach(z => { z.hp = 0; }); g.godMode = true; window.__fires = 0; const f = g.fire.bind(g); g.fire = (...a) => { window.__fires++; return f(...a); }; });
log('5 in play', { state: await q(() => window.__atq.state), padMenu: await q(() => window.__padMenu), bodyPad: await q(() => document.body.classList.contains('pad')), touchOpacity: await q(() => getComputedStyle(document.getElementById('touch')).opacity), prompt: await q(() => document.getElementById('prompt').textContent), objh: await q(() => (document.getElementById('objh') || {}).textContent) });
const prom = () => q(() => ({ objh: document.getElementById('objh').textContent, prompt: document.getElementById('prompt').textContent }));
await q(() => { const g = window.__atq.game; g.objective('Pad prompt check', 'Walk to the door (WASD / left stick). Press E / ✋ to open it.'); g.nearUse = () => ({ label: 'Open door', fn() { }, run() { } }); }); await p.waitForTimeout(700);
log('5b prompts in pad mode', await prom()); await shot('07b-pad-prompts');
const pos = () => q(() => { const r = window.__atq.game.player.root.position; return [+r.x.toFixed(2), +r.z.toFixed(2)]; });
const p0 = await pos(); await P.axis(1, -1); await p.waitForTimeout(1500); await P.axis(1, 0); await p.waitForTimeout(300); const p1 = await pos(); log('6 left stick moves player', { p0, p1, moved: Math.hypot(p1[0] - p0[0], p1[1] - p0[1]).toFixed(2) });
const yaw0 = await q(() => +window.__atq.game.cam.yaw.toFixed(3)); await P.axis(2, 1); await p.waitForTimeout(700); await P.axis(2, 0); const yaw1 = await q(() => +window.__atq.game.cam.yaw.toFixed(3));
const lookAcc = await q(() => [window.__atq.game.input.look.x, window.__atq.game.input.look.y]); log('7 right stick look', { yaw0, yaw1, lookAcc });
await P.hold('LT', 1); await p.waitForTimeout(600); const aim = await q(() => window.__atq.game.state.aim); await shot('08-aim'); await P.hold('RT', 1); await p.waitForTimeout(900); await P.hold('RT', 0); await P.hold('LT', 0); await p.waitForTimeout(300);
log('8 LT aim + RT fire', { aim, fires: await q(() => window.__fires) });
const cur0 = await q(() => window.__atq.game.save.cur); await P.press('RB'); await p.waitForTimeout(400); const cur1 = await q(() => window.__atq.game.save.cur); await P.press('RIGHT'); await p.waitForTimeout(400); const cur2 = await q(() => window.__atq.game.save.cur);
log('9 weapon switch RB, d-pad right', [cur0, cur1, cur2]);
for (const k of ['A', 'Y', 'B', 'LB', 'R3', 'X', 'DOWN', 'VIEW']) { await P.press(k); await p.waitForTimeout(500); }
await P.press('R3'); await P.press('VIEW');
log('10 edges seen (Y reload, A jump, B roll, LB grenade, R3 crouch, X use, Dn heal, View cam)', await q(() => window.__edges.reduce((o, k) => (o[k] = (o[k] || 0) + 1, o), {})));
await P.axis(1, -1); await P.press('L3'); await p.waitForTimeout(500); const run = await q(() => window.__atq.game.input.run); await P.axis(1, 0); await p.waitForTimeout(300); const run2 = await q(() => window.__atq.game.input.run); log('11 L3 sprint latch', { whileMoving: run, afterStickReleased: run2 });
await P.press('START'); await p.waitForTimeout(700); log('12 Start pauses', { state: await q(() => window.__atq.state), padMenu: await q(() => window.__padMenu), focus: await P.focus() }); await shot('09-pause-focus');
await P.press('DOWN'); log('12b pause d-pad', await P.focus()); await P.press('UP');
await P.press('B'); await p.waitForTimeout(700); log('12c B resumes', { state: await q(() => window.__atq.state), padMenu: await q(() => window.__padMenu) });
const eJ = await q(() => window.__edges.filter(e => e === 'jump').length); await p.waitForTimeout(300);
// touch still works and switches prompts back
const tb = await q(() => { const r = document.getElementById('tJump').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
await p.touchscreen.tap(tb.x, tb.y); await p.waitForTimeout(600);
log('13 touch after pad', { bodyPad: await q(() => document.body.classList.contains('pad')), touchOpacity: await q(() => getComputedStyle(document.getElementById('touch')).opacity), jumpEdgesBefore: eJ, jumpEdgesAfterTouch: await q(() => window.__edges.filter(e => e === 'jump').length) });
log('13b prompts after touch', await prom()); await shot('10-touch-again'); await P.press('A'); await p.waitForTimeout(400); log('14 pad again', { bodyPad: await q(() => document.body.classList.contains('pad')) }); await shot('11-pad-again');
fs.writeFileSync(`${OUT}/t_pad.json`, JSON.stringify({ R, errs: p.errs }, null, 1)); console.log('errs', p.errs);
await b.close();
