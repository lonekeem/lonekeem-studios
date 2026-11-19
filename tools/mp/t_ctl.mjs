// Control checklist: every story button/key against the multiplayer town. Prints PASS/FAIL, writes docs/mp-fix2/ctl/*.png + controls.json
import { boot } from '../mpfix/lib.mjs'; import fs from 'fs';
const OUT = '/workspace/atq1919/docs/mp-fix2/ctl'; fs.mkdirSync(OUT, { recursive: true });
const { b, p } = await boot(); const R = [];
const fr = n => p.evaluate(n => new Promise(r => { let k = 0; const f = () => { if (++k >= n) r(); else requestAnimationFrame(f); }; requestAnimationFrame(f); }), n);
const T = f => p.evaluate(f);
const shot = async n => { await p.screenshot({ path: `${OUT}/${n}.png` }); };
const rec = async (name, pass, info, shotName) => { R.push({ name, pass: !!pass, info }); console.log(pass ? 'PASS' : 'FAIL', name, JSON.stringify(info)); if (shotName) await shot(shotName); };
const st = () => T(() => { const t = window.__mpTown; return { x: +t.me.x.toFixed(2), z: +t.me.z.toFixed(2), y: +t.S.y.toFixed(2), ry: +t.me.ry.toFixed(2), spd: +(t.S.spd || 0).toFixed(2), crouch: t.S.crouch, aim: t.S.aim, roll: +t.S.roll.toFixed(2), atk: +t.S.atk.toFixed(2), anim: t.me.av.motion && (t.me.av.motion.locoOn ? 'LOCO' : t.me.av.motion.curName), hp: t.me.hp, pref: t.bag.pref, drv: !!t.me.drv, vis: t.me.av.root.visible, cdist: +Math.hypot(t.cam.position.x - t.me.x, t.cam.position.z - t.me.z).toFixed(2) }; });
const key = async (k, ms = 0) => { await p.keyboard.down(k); await fr(ms ? ms : 2); await p.keyboard.up(k); };
const tp = (x, z, ry) => T(`(()=>{const t=window.__mpTown;t.setPos(${x},${z});${ry != null ? `t.me.ry=${ry};` : ''}t.camYaw(${ry != null ? ry + Math.PI : 0})})()`);
const open = '#aab5b8';
// quiet open spot: sidewalk-free grass near spawn; kill nearby zombies repeatedly
const clear = () => T(() => { window.__mpTown.Z.killNear(window.__mpTown.me.x, window.__mpTown.me.z, 400, 9999); });
await clear();
const s0 = await st(); await tp(s0.x, s0.z, s0.ry); await fr(3); const ONLY = process.env.ONLY_GREN;
// ---- move / sprint / look / view ----
let a = await st(); await p.keyboard.down('KeyW'); await fr(6); let b1 = await st();
await rec('Move (W)', Math.hypot(b1.x - a.x, b1.z - a.z) > 1.2 && /Jog|Walk|LOCO/.test(b1.anim || ''), { from: [a.x, a.z], to: [b1.x, b1.z], anim: b1.anim, spd: b1.spd }, 'move');
await p.keyboard.down('ShiftLeft'); await fr(6); b1 = await st(); await rec('Sprint (Shift)', b1.spd > 5, { spd: b1.spd, anim: b1.anim }, 'sprint');
await p.keyboard.up('ShiftLeft'); await p.keyboard.up('KeyW'); await fr(3);
// look: camera heading change from a touch swipe on the right half via CDP
const heading = () => T(() => { const t = window.__mpTown; return Math.atan2(t.me.x - t.cam.position.x, t.me.z - t.cam.position.z); });
const cdp = await p.context().newCDPSession(p); const h0 = await heading();
const sw = async (x0, y0, x1, y1) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0, id: 7 }] }); for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * i / 6, y: y0 + (y1 - y0) * i / 6, id: 7 }] }); await p.waitForTimeout(40); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await fr(3); };
await sw(600, 200, 760, 200); const h1 = await heading(); await rec('Look (swipe right half)', Math.abs(h1 - h0) > .1, { before: +h0.toFixed(2), after: +h1.toFixed(2) }, 'look');
// view toggle (V)
a = await st(); await key('KeyV', 3); await fr(4); b1 = await st(); await shot('view_fp'); await rec('First person (V)', b1.cdist < .5 && !b1.vis, { camDist: b1.cdist, avatarVisible: b1.vis }, 'view_fp');
await key('KeyV', 3); await fr(4); b1 = await st(); await rec('Third person (V again)', b1.cdist > 2 && b1.vis, { camDist: b1.cdist }, 'view_tp');
// ---- crouch / roll / jump ----
await key('KeyC', 3); await fr(4); b1 = await st(); await rec('Crouch (C)', b1.crouch && /Crouch/.test(b1.anim || ''), { crouch: b1.crouch, anim: b1.anim }, 'crouch');
await key('KeyC', 3); await fr(3);
await p.keyboard.down('KeyW'); await fr(3); await key('ControlLeft', 1); await fr(1); b1 = await st(); await rec('Roll (Ctrl)', b1.roll > 0 && /Roll/.test(b1.anim || ''), { roll: b1.roll, anim: b1.anim }, 'roll'); await fr(8); await p.keyboard.up('KeyW');
await key('Space', 1); await fr(1); b1 = await st(); await rec('Jump (Space)', b1.y > .05, { y: b1.y, anim: b1.anim }, 'jump'); await fr(8);
// ---- melee (fists / bat) ----
await T(() => { const t = window.__mpTown; t.bag.add('bat', 1); t.bag.pref = 'fists'; });
const spawnZ = async (d = 1.4) => T(`(()=>{const t=window.__mpTown;const q=t.Z.spawnAt(t.me.x+Math.sin(t.me.ry)*${d},t.me.z+Math.cos(t.me.ry)*${d},{});q.st='idle';return {hp:q.hp}})()`);
await clear(); await tp(s0.x, s0.z, s0.ry); await fr(3); let z0 = await T(() => { const t = window.__mpTown; const q = t.Z.spawnAt(t.me.x + Math.sin(t.me.ry) * 1.2, t.me.z + Math.cos(t.me.ry) * 1.2, {}); q.st = 'idle'; window.__zq = q; return q.hp; }); await fr(1);
await T(() => window.__mpTown.hit()); await fr(2); b1 = await st(); await rec('Attack / HIT with fists (J / wantHit)', b1.atk > 0 && /Punch/.test(b1.anim || ''), { atk: b1.atk, anim: b1.anim }, 'hit_fists'); await fr(8);
// zombie damage
const zinfo = await T(() => ({ hp: window.__zq.hp, dead: window.__zq.dead }));
await rec('Fists damage a zombie', zinfo.dead || zinfo.hp < z0, { hpBefore: z0, after: zinfo });
await T(() => { window.__mpTown.bag.pref = 'bat'; }); await clear(); await T(() => { const t = window.__mpTown; const q = t.Z.spawnAt(t.me.x + Math.sin(t.me.ry) * 1.4, t.me.z + Math.cos(t.me.ry) * 1.4, {}); q.st = 'idle'; window.__zq = q; }); await fr(1); await T(() => window.__mpTown.hit()); await fr(2); b1 = await st(); await shot('hit_bat'); await fr(6);
const z2 = await T(() => ({ hp: window.__zq.hp, dead: window.__zq.dead })); await rec('Attack with bat (Sword anim + zombie dies in 1-2 hits)', /Sword/.test(b1.anim || '') && (z2.dead || z2.hp < 50), { anim: b1.anim, zombie: z2 }, null);
await fr(8);
// ---- weapon swap (Q), guns, aim, reload ----
await T(() => { window.__mpTown.bag.pref = 'fists'; }); await key('KeyQ', 2); await fr(2); b1 = await st(); await rec('Swap weapon (Q)', b1.pref !== 'fists', { pref: b1.pref }, null);
await T(() => { window.__mpTown.bag.pref = 'pistol'; }); await fr(3); b1 = await st(); await rec('Pistol equipped: gun idle pose', /Pistol_Idle/.test(b1.anim || ''), { anim: b1.anim }, 'pistol_idle');
await T(() => { window.__mpTown.Z.killNear(0, 0, 400, 9999); }); const zh = await T(() => { const t = window.__mpTown; const q = t.Z.spawnAt(t.me.x + Math.sin(t.me.ry) * 7, t.me.z + Math.cos(t.me.ry) * 7, {}); q.st = 'idle'; window.__zq = q; return q.hp; });
await T(() => { window.__mpTown.hit(); }); await fr(1); await T(() => { window.__mpTown.hit(); }); await fr(3);
const g1 = await T(() => { const t = window.__mpTown; return { last: t.S.lastShot, hp: window.__zq.hp, dead: window.__zq.dead, ammoBag: t.bag.count('ammo_light') }; });
await rec('FIRE pistol: mag drops, shot hits zombie', g1.last && g1.last.mag < 12 && (g1.dead || g1.hp < zh), { zombieHpBefore: zh, after: g1 }, 'pistol_fire');
await key('KeyR', 2); await fr(2); const rl = await T(() => ({ rl: window.__mpTown.S.lastShot })); await fr(14); const rl2 = await T(() => { const t = window.__mpTown; return { ammoBag: t.bag.count('ammo_light') }; });
await rec('Reload (R): spare ammo moves into the magazine', rl2.ammoBag < g1.ammoBag, { before: g1.ammoBag, after: rl2.ammoBag }, 'reload');
const tap = async id => { const r = await T(`(()=>{const r=document.querySelector('${id}').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()`); await p.touchscreen.tap(r[0], r[1]); await fr(2); };
await tap('#tAim'); await p.keyboard.down('KeyW'); await fr(4); b1 = await st();
await rec('AIM (button): aim state, slower, gun-aim pose', b1.aim || /Aim/.test(b1.anim || ''), { aim: b1.aim, spd: b1.spd, anim: b1.anim }, 'aim'); await p.keyboard.up('KeyW');
await tap('#tAim');
await T(() => { const t = window.__mpTown; t.bag.pref = 'fists'; });
// ---- heal (H) ----
await T(() => { const t = window.__mpTown; t.me.hp = 50; t.bag.add('bandage', 1); }); await key('KeyH', 2); await fr(2); b1 = await st(); await rec('Heal (H) with bandage', b1.hp > 50, { hp: b1.hp }, null);
// ---- grenade (G) ----
await clear(); await tp(s0.x, s0.z, s0.ry); await fr(3);
await T(() => { const t = window.__mpTown; const q = t.Z.spawnAt(t.me.x + Math.sin(t.me.ry) * 10.5, t.me.z + Math.cos(t.me.ry) * 10.5, {}); q.st = 'idle'; window.__zq = q; window.__g0 = t.bag.count('grenade'); });
await key('KeyG', 2); await fr(1); const gb = await T(() => ({ left: window.__mpTown.bag.count('grenade'), before: window.__g0 }));
let boomed = false; for (let i = 0; i < 40 && !boomed; i++) { await fr(1); boomed = await T(() => !!window.__mpTown.S.lastBoom); } await shot('grenade_boom'); await fr(10);
const gz = await T(() => ({ dead: window.__zq.dead, hp: window.__zq.hp, hpMe: window.__mpTown.me.hp }));
await rec('Grenade (G): thrown, explodes after fuse, kills zombie', gb.left === gb.before - 1 && boomed && gz.dead, { grenades: gb, boomed, zombie: gz }, null);
await b.close(); fs.writeFileSync(`${OUT}/controls_part1.json`, JSON.stringify(R, null, 1));
