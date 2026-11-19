// Control checklist part 2: touch buttons, interact (door/loot), car (enter/drive/reverse/steer/exit), pause/bag/shop, gun close-up
import { boot, freecam } from '../mpfix/lib.mjs'; import fs from 'fs';
const OUT = '/workspace/atq1919/docs/mp-fix2/ctl'; fs.mkdirSync(OUT, { recursive: true });
const { b, p } = await boot(); const R = [];
const fr = n => p.evaluate(n => new Promise(r => { let k = 0; const f = () => { if (++k >= n) r(); else requestAnimationFrame(f); }; requestAnimationFrame(f); }), n);
const T = f => p.evaluate(f);
const shot = n => p.screenshot({ path: `${OUT}/${n}.png` });
const rec = async (name, pass, info, sn) => { R.push({ name, pass: !!pass, info }); console.log(pass ? 'PASS' : 'FAIL', name, JSON.stringify(info)); if (sn) await shot(sn); };
const st = () => T(() => { const t = window.__mpTown; return { x: +t.me.x.toFixed(2), z: +t.me.z.toFixed(2), y: +t.S.y.toFixed(2), crouch: t.S.crouch, aim: t.S.aim, roll: +t.S.roll.toFixed(2), atk: +t.S.atk.toFixed(2), anim: t.me.av.motion && (t.me.av.motion.locoOn ? 'LOCO' : t.me.av.motion.curName), hp: t.me.hp, pref: t.bag.pref, drv: !!t.me.drv, mag: t.S.lastShot && t.S.lastShot.mag, cdist: +Math.hypot(t.cam.position.x - t.me.x, t.cam.position.z - t.me.z).toFixed(2) }; });
const tap = async id => { const r = await T(`(()=>{const e=document.querySelector('${id}');const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()`); await p.touchscreen.tap(r[0], r[1]); await fr(3); };
const hold = async (id, n) => { const r = await T(`(()=>{const e=document.querySelector('${id}');const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()`); const cdp = await p.context().newCDPSession(p); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r[0], y: r[1], id: 3 }] }); await fr(n); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await fr(2); };
const tp = (x, z, ry) => T(`(()=>{const t=window.__mpTown;t.setPos(${x},${z});${ry != null ? `t.me.ry=${ry};` : ''}t.camYaw(${ry != null ? ry + Math.PI : 0})})()`);
const clear = () => T(() => { window.__mpTown.Z.killNear(window.__mpTown.me.x, window.__mpTown.me.z, 400, 9999); });
const toastTxt = () => T(() => (document.querySelector('#toast') || {}).textContent);
const s0 = await st();
// ---- touch buttons ----
await tap('#tJump'); let a = await st(); await rec('JUMP button (touch)', a.y > .05 || /Jump/.test(a.anim || ''), { y: a.y, anim: a.anim }, 'btn_jump'); await fr(8);
await tap('#tRoll'); a = await st(); await rec('ROLL button (touch)', a.roll > 0 || /Roll/.test(a.anim || ''), { roll: a.roll, anim: a.anim }, 'btn_roll'); await fr(8);
await tap('#tCrouch'); a = await st(); await rec('CRCH button (touch)', a.crouch, { crouch: a.crouch, anim: a.anim }, 'btn_crouch'); await tap('#tCrouch'); a = await st(); await rec('CRCH button toggles back', !a.crouch, { crouch: a.crouch });
await T(() => { window.__mpTown.bag.pref = 'fists'; }); await tap('#tAtk'); a = await st(); await rec('HIT button (touch, fists)', a.atk > 0 || /Punch/.test(a.anim || ''), { atk: a.atk, anim: a.anim }, 'btn_hit'); await fr(8);
await T(() => { window.__mpTown.bag.add('bat', 1); }); await tap('#btnSwap'); a = await st(); const p1 = a.pref; await tap('#btnSwap'); a = await st(); await rec('SWAP button (⇄) cycles fists → weapons in the bag', p1 !== 'fists' && a.pref !== p1, { afterFirst: p1, afterSecond: a.pref });
await T(() => { const t = window.__mpTown; t.bag.pref = 'pistol'; }); await fr(3);
const m0 = await T(() => ({ mag: window.__mpTown.S.lastShot ? window.__mpTown.S.lastShot.mag : 12, bagA: window.__mpTown.bag.count('ammo_light') }));
await tap('#tAtk'); await fr(3); a = await st(); await rec('FIRE button (touch, pistol): fires', a.mag != null && a.mag < 12, { mag: a.mag }, 'btn_fire');
await tap('#tReload'); await fr(16); const m1 = await T(() => window.__mpTown.bag.count('ammo_light')); await rec('Reload button ⟳ (touch)', m1 < m0.bagA, { spareBefore: m0.bagA, after: m1 }, null);
await tap('#tAim'); a = await st(); await rec('AIM button toggles aim on', a.aim, { aim: a.aim }, 'btn_aim'); await tap('#tAim');
await tap('#btnView'); await fr(4); a = await st(); await rec('👁 view button: first person', a.cdist < .5, { camDist: a.cdist }, 'btn_view'); await tap('#btnView'); await fr(4);
const gn0 = await T(() => { const t = window.__mpTown; t.bag.add('grenade', 1); return t.bag.count('grenade'); }); await tap('#btnGren'); const gn1 = await T(() => ({ n: window.__mpTown.bag.count('grenade'), label: document.querySelector('#grenN').textContent })); await rec('💣 grenade button throws one', gn1.n === gn0 - 1, { before: gn0, after: gn1 }, 'btn_gren');
await tap('#tRun'); a = await T(() => document.querySelector('#tRun').classList.contains('on')); await rec('RUN button (touch toggles run)', a, { on: a }); await tap('#tRun');
// ---- interact: door ----
await clear(); await tp(-3, -3.6, Math.PI); await fr(4);
const acts = await T(() => window.__mpTown.acts()); const d0 = await T(() => window.__mpTown.W.doors.find(d => d.id === 'store:front').state);
await tap('#tUse'); await fr(10); const d1 = await T(() => window.__mpTown.W.doors.find(d => d.id === 'store:front').state); const a1 = await T(() => window.__mpTown.acts());
await rec('USE button at a door (✋)', d0 !== d1 || a1.join() !== acts.join(), { actsBefore: acts, doorBefore: d0, doorAfter: d1, actsAfter: a1 }, 'use_door');
// USE via keyboard E on a loot container
const c0 = await T(() => { const t = window.__mpTown; const c = t.W.containers.find(c => !c.looted && Math.abs(c.x) < 70); return { id: c.id, x: c.x, z: c.z }; });
await tp(c0.x + .8, c0.z + .8, 0); await fr(4); const acts2 = await T(() => window.__mpTown.acts()); await p.keyboard.down('KeyE'); await fr(14); await p.keyboard.up('KeyE'); await fr(4);
const panel = await T(() => !!(document.querySelector('#mpt .panel') && document.querySelector('#mpt .panel').offsetHeight > 0 && document.querySelector('#mpt .panel').textContent.length > 5));
await rec('USE (E) on a container opens the loot panel', panel, { container: c0.id, acts: acts2 }, 'use_loot'); await T(() => window.__mpTown.closePanel());
// ---- pause / bag / shop ----
await tap('#btnPause'); await fr(3); const ps = await T(() => ({ paused: window.__mpTown.shim.paused, panel: document.querySelector('#mpt .pausep') && document.querySelector('#mpt .pausep').offsetHeight > 0 })); await rec('Pause (II) button', ps.paused || ps.panel, ps, 'btn_pause');
await T(() => { const e = [...document.querySelectorAll('#mpt .pausep button')].find(b => /resume|continue/i.test(b.textContent)); e && e.click(); window.__mpTown.shim.paused = false; });
const xb = async name => { await T(`[...document.querySelectorAll('#hudr2 button')].find(b=>b.textContent==='${name}').click()`); await fr(3); return T(() => { const p = document.querySelector('#mpt .panel'); return !!p && p.offsetHeight > 0; }); };
let o = await xb('Bag'); await rec('Bag button opens bag', o, { open: o }, 'btn_bag'); await T(() => window.__mpTown.closePanel());
o = await xb('Shop'); await rec('Shop button opens shop', o, { open: o }, 'btn_shop'); await T(() => window.__mpTown.closePanel());
// ---- car ----
await clear(); const car = await T(() => { const c = window.__mpTown.cars.find(c => !c.broken && Math.abs(c.x) < 40 && Math.abs(c.z) < 30); return { id: c.id, x: c.x, z: c.z, ry: c.ry }; });
await tp(car.x + 2.2, car.z, -Math.PI / 2); await fr(4); const ca = await T(() => window.__mpTown.acts());
for (let i = 0; i < 4; i++) { const ac = await T(() => window.__mpTown.acts()); if (ac[0] && /Smash|Pry/.test(ac[0])) { await p.keyboard.down('KeyE'); await fr(18); await p.keyboard.up('KeyE'); await fr(3); } else break; }
const ca2 = await T(() => window.__mpTown.acts()); await p.keyboard.press('KeyE'); await fr(6); a = await st();
await rec('Enter car (E)', a.drv, { car: car.id, actsBefore: ca, actsAfterSmash: ca2 }, 'car_enter');
const cs = () => T(() => { const c = window.__mpTown.me.drv; return c ? { v: +c.v.toFixed(2), ry: +c.ry.toFixed(2), x: +c.x.toFixed(1), z: +c.z.toFixed(1), steer: +(c.steer || 0).toFixed(2) } : null; });
const c0 = await cs(); await p.keyboard.down('KeyS'); await fr(8); const c0b = await cs(); await p.keyboard.up('KeyS'); await rec('REV: hold BRAKE (S) from a stop reverses', c0.v === 0 && c0b.v < -.5, { vStart: c0.v, vAfter: c0b.v, x0: c0.x, x1: c0b.x }, 'car_reverse'); await fr(14);
const c1 = await cs(); await p.keyboard.down('KeyW'); await fr(10); const c2 = await cs(); await rec('Drive: GAS (W) accelerates forward', c2.v > 1, { before: c1, after: c2 }, 'car_drive');
await p.keyboard.down('KeyD'); await fr(8); const c3 = await cs(); await p.keyboard.up('KeyD'); const cdiff = (c3.ry - c2.ry);
await rec('Steer RIGHT (D) while driving forward turns right (heading decreases)', cdiff < -.02, { ryBefore: c2.ry, ryAfter: c3.ry }, 'car_right');
await p.keyboard.down('KeyA'); await fr(10); const c4 = await cs(); await p.keyboard.up('KeyA'); await rec('Steer LEFT (A) turns left (heading increases)', c4.ry - c3.ry > .02, { ryBefore: c3.ry, ryAfter: c4.ry }, 'car_left');
await p.keyboard.up('KeyW'); await p.keyboard.down('KeyS'); await fr(14); await p.keyboard.up('KeyS'); const c5 = await cs(); await rec('BRAKE (S) slows', c5.v < c4.v, { before: c4.v, after: c5.v });
await tap('#dBrake'); await fr(1);
await p.keyboard.press('KeyE'); await fr(6); a = await st(); await rec('Exit car (E)', !a.drv, { drv: a.drv }, 'car_exit');
// ---- gun close-up ----
await T(() => { window.__mpTown.bag.pref = 'pistol'; }); await clear(); await tp(s0.x, s0.z, 0); await fr(6);
await freecam(p, [s0.x + .9, 1.5, s0.z + 1.3], [s0.x, 1.1, s0.z]); await fr(3); await shot('gun_closeup');
await b.close(); fs.writeFileSync(`${OUT}/controls_part2.json`, JSON.stringify(R, null, 1));
