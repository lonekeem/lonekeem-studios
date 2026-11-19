// Respawn proof: die (forced damage) -> death screen + countdown -> respawn with protection (blink, <=2 s) -> wait 3 s -> zombie hit lowers hp, FIRE uses ammo + damages a zombie. Solo + 2 players, 3 cycles each, plus edge cases.
// usage: TOWN_URL=http://127.0.0.1:5391/ node tools/mp/t_respawn.mjs <solo|two|edge>
import { launch, client, ctxOpts } from '../mpfix/lib.mjs'; import fs from 'fs';
const MODE = process.argv[2] || 'solo', OUT = process.env.OUT || '/workspace/atqresp/docs/mp-respawn'; fs.mkdirSync(OUT, { recursive: true });
const b = await launch(); const res = []; const rec = (n, ok, d) => { res.push({ n, ok, d }); console.log(ok ? 'PASS' : 'FAIL', n, JSON.stringify(d)); };
const mk = async name => { const ctx = await b.newContext(ctxOpts); const p = await client(ctx, name); p.name = name; p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); await p.evaluate(() => { window.__MP_DTCAP = .2; window.__mpTown.Z.killNear(0, 0, 400, 9999); }); return p; };
const until = async (p, fn, arg, ms = 60000) => { try { await p.waitForFunction(fn, arg, { timeout: ms, polling: 100 }); return true; } catch (e) { return false; } };
const st = p => p.evaluate(() => { const t = window.__mpTown, P = t.me.av.motion; return { hp: t.me.hp, dead: +t.me.dead.toFixed(2), prot: +t.me.prot.toFixed(2), x: +t.me.x.toFixed(1), z: +t.me.z.toFixed(1), vis: t.me.av.root.visible, attached: !!t.me.av.root.parent, cur: P && P.curName, overlay: document.querySelector('#mpt .dead').style.display, cnt: document.querySelector('#mpt .dead .cnt').textContent, hud: document.querySelector('#hpTxt').textContent.slice(0, 18), ammoTxt: document.querySelector('#ammoTxt').textContent.slice(0, 32), btn: document.querySelector('#tAtk').textContent, mag: t.GS.mag.pistol, bagAmmo: t.bag.count('ammo_light') }; });
const clear = p => p.evaluate(() => window.__mpTown.Z.killNear(0, 0, 600, 1e9));
async function cycle(p, i, tag) {
  const L = `${tag}${p.name}c${i}`; await clear(p);
  await p.evaluate(() => { const t = window.__mpTown; t.bag.cap = 999; t.bag.pref = 'pistol'; t.GS.mag.pistol = 12; if (t.bag.count('ammo_light') < 30) t.bag.add('ammo_light', 60); });
  await p.evaluate(() => window.__mpTown.hurt(100)); const d0 = await st(p);
  rec(`${L} dies: dead>0, overlay + countdown`, d0.dead > 0 && d0.hp === 0 && d0.overlay === 'flex' && /^[1-4]$/.test(d0.cnt), d0); if (i === 1) await p.screenshot({ path: `${OUT}/${tag}${p.name}_1_death_screen.png` });
  await p.evaluate(() => { window.__mpTown.hurt(50); window.__mpTown.fireGun(); }); const dm = await st(p); rec(`${L} cannot be hurt/fire while dead`, dm.hp === 0 && dm.mag === d0.mag, { hp: dm.hp, mag: dm.mag });
  const ok = await until(p, () => window.__mpTown.me.dead === 0 && window.__mpTown.me.hp === 100, null, 90000); const r0 = await st(p);
  rec(`${L} respawned: hp 100, dead exactly 0, avatar attached, prot<=2, overlay hidden`, ok && r0.dead === 0 && r0.attached && r0.prot > 0 && r0.prot <= 2 && r0.overlay === 'none' && r0.cur !== 'Death01', r0);
  // zombie adjacent + attacking right at respawn: protection must absorb it; sample avatar visibility (blink) meanwhile
  await clear(p); const prot = await p.evaluate(() => { const t = window.__mpTown; const z = t.Z.spawnAt(t.me.x + .8, t.me.z); z.st = 'chase'; z.cd = 0; z.hp = 1e6; window.__minHp = 100; return t.me.prot; });
  const seen = await p.evaluate(() => new Promise(r => { const s = new Set(); const t0 = performance.now(); const f = () => { const T = window.__mpTown; s.add(T.me.av.root.visible); window.__minHp = Math.min(window.__minHp, T.me.hp); if (performance.now() - t0 > 40000 || T.me.prot <= 0) r([...s]); else requestAnimationFrame(f); }; f(); }));
  rec(`${L} spawn protection blinks`, seen.length === 2, seen); if (i === 1) { await p.screenshot({ path: `${OUT}/${tag}${p.name}_2_respawned.png` }); }
  const ended = await until(p, () => window.__mpTown.me.prot === 0, null, 60000); const hpProt = await p.evaluate(() => Math.min(window.__minHp, window.__mpTown.me.hp)); rec(`${L} protection ends; zombie hits during it did no damage`, ended && prot > 0 && prot <= 2 && hpProt === 100, { startProt: prot, minHpDuringProt: hpProt });
  await p.evaluate(() => { window.__sim3 = 0; const f = () => { window.__sim3 += Math.min(window.__MP_DTCAP, .1); requestAnimationFrame(f); }; f(); }); await until(p, () => window.__sim3 >= 3, null, 60000);
  // zombie hit: one adjacent chasing zombie must lower hp
  await clear(p); await p.evaluate(() => { const t = window.__mpTown; t.me.hp = 100; const z = t.Z.spawnAt(t.me.x + .8, t.me.z); z.st = 'chase'; z.cd = 0; z.hp = 1e6; window.__zhit = z; });
  const hit = await until(p, () => window.__mpTown.me.hp < 100, null, 60000); const h1 = await st(p); rec(`${L} zombie hit reduces health after protection`, hit, { hp: h1.hp, hud: h1.hud }); if (i === 1) await p.screenshot({ path: `${OUT}/${tag}${p.name}_3_zombie_hit.png` });
  // FIRE: ammo drops, zombie takes damage
  await clear(p); const f = await p.evaluate(() => { const t = window.__mpTown; t.me.hp = 100; t.GS.cd = 0; t.GS.rl = 0; t.me.ry = Math.PI / 2; t.camYaw(Math.PI / 2); t.me.x = -6; t.me.z = 21.5; const z = t.Z.spawnAt(t.me.x + 6, t.me.z); z.hp = 1e6; z.speed = 0; z.st = 'wander'; z.vel.set(0, 0, 0); const m0 = t.GS.mag.pistol, hp0 = z.hp; t.fireGun(); return { dm: m0 - t.GS.mag.pistol, dz: hp0 - z.hp, btn: document.querySelector('#tAtk').textContent }; });
  rec(`${L} FIRE uses ammo and damages a zombie`, f.dm === 1 && f.dz > 0, f); if (i === 1) { await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/${tag}${p.name}_4_fire.png` }); }
  // real FIRE button press (touch/mouse) also shoots
  await p.evaluate(() => { const t = window.__mpTown; t.GS.cd = 0; window.__m0 = t.GS.mag.pistol; }); const bb = await p.evaluate(() => { const r = document.querySelector('#tAtk').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  await p.mouse.move(bb[0], bb[1]); await p.mouse.down(); await p.waitForTimeout(250); await p.mouse.up(); const okb = await until(p, () => window.__mpTown.GS.mag.pistol < window.__m0, null, 20000); rec(`${L} FIRE button press shoots`, okb, { m0: await p.evaluate(() => window.__m0), mag: (await st(p)).mag });
  // reload works
  const rl = await p.evaluate(() => { const t = window.__mpTown; t.GS.cd = 0; t.GS.mag.pistol = 3; t.startReload(); return t.GS.rl > 0; }); const rlok = await until(p, () => window.__mpTown.GS.rl <= 0 && window.__mpTown.GS.mag.pistol === 12, null, 30000); rec(`${L} reload works`, rl && rlok, { rl, mag: (await st(p)).mag });
  // controls: movement works (set a virtual key)
  const mv = await p.evaluate(async () => { const t = window.__mpTown; const x0 = t.me.x, z0 = t.me.z; t.key('KeyW', true); await new Promise(r => setTimeout(r, 1200)); t.key('KeyW', false); return Math.hypot(t.me.x - x0, t.me.z - z0); }); rec(`${L} player can move`, mv > .3, { moved: +mv.toFixed(2) });
  const pose = await p.evaluate(async () => { const t = window.__mpTown, P = t.me.av.motion; t.key('KeyW', true); await new Promise(r => setTimeout(r, 1500)); const D = P.actions.Death01, run = !!D && D.isScheduled(), w = run ? D.getEffectiveWeight() : 0; const cur = P.locoOn ? 'LOCO' : P.curName; t.key('KeyW', false); return { deathWeight: +w.toFixed(3), deathRunning: run, cur, isKeem: !!P.isKeem, rootY: +t.me.av.root.position.y.toFixed(2), rotX: +t.me.av.root.rotation.x.toFixed(2), rotZ: +t.me.av.root.rotation.z.toFixed(2) }; });
  rec(`${L} pose reset: Death01 no longer active, standing, locomotion plays`, pose.deathWeight < .02 && !pose.deathRunning && pose.rootY < .2 && Math.abs(pose.rotX) < .1 && Math.abs(pose.rotZ) < .1 && /LOCO|Jog|Idle|Walk|Pistol/.test(pose.cur), pose); if (i === 1) await p.screenshot({ path: `${OUT}/${tag}${p.name}_5_moving_after_respawn.png` });
  await clear(p);
}
if (MODE === 'solo') { const A = await mk('A'); for (let i = 1; i <= 3; i++) await cycle(A, i, 'solo_'); rec('no page errors', !A.errs.length, A.errs); }
if (MODE === 'two') {
  const A = await mk('A'), B = await mk('B');
  await B.evaluate(() => window.__mpTown.setPos(-6, 8));
  for (let i = 0; i < 90; i++) { const ok = await A.evaluate(() => [...window.__mpTown.remotes.values()].some(r => r.av)) && await B.evaluate(() => [...window.__mpTown.remotes.values()].some(r => r.av)); if (ok) break; await A.waitForTimeout(1000); }
  rec('two players see each other', await A.evaluate(() => window.__mpTown.peers()) === 1 && await B.evaluate(() => window.__mpTown.peers()) === 1, {});
  // a zombie attacking B's ghost inside A's sim must NOT hurt A
  await clear(A); const hpA = await A.evaluate(async () => { const t = window.__mpTown; const r = [...t.remotes.values()][0]; const z = t.Z.spawnAt(r.x + .8, r.z); z.st = 'chase'; z.cd = 0; z.hp = 1e6; await new Promise(r => setTimeout(r, 6000)); return t.me.hp; }); rec('zombie hitting the remote ghost does not hurt me', hpA === 100, { hpA }); await clear(A);
  for (let i = 1; i <= 3; i++) { await cycle(A, i, 'two_'); await cycle(B, i, 'two_'); }
  // after both cycles, each still sees the other
  rec('still see each other after deaths', await A.evaluate(() => window.__mpTown.peers()) === 1 && await B.evaluate(() => window.__mpTown.peers()) === 1, {}); await A.screenshot({ path: `${OUT}/two_A_final.png` }); await B.screenshot({ path: `${OUT}/two_B_final.png` });
  rec('no page errors', !A.errs.length && !B.errs.length, [A.errs, B.errs]);
}
if (MODE === 'keem') { // admin 'Play as Keem' avatar (story Char, not the morph Avatar)
  const ctx = await b.newContext(ctxOpts); const p = await ctx.newPage(); p.name = 'K'; p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); await p.addInitScript(() => { window.__MP_FORCE_ADMIN = 1; });
  await p.goto(process.env.TOWN_URL); await p.waitForSelector('#btnWarn'); await p.click('#btnWarn'); await p.waitForSelector('#btnMP'); await p.click('#btnMP'); await p.waitForFunction(() => window.__mpCreator && window.__mpCreator.av(), null, { timeout: 120000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => window.__mpKeemBtn.click()); await p.waitForFunction(() => window.__mpTown, null, { timeout: 120000 }); await p.waitForTimeout(2500); await p.evaluate(() => { window.__MP_DTCAP = .2; window.__mpTown.Z.killNear(0, 0, 400, 9999); });
  rec('keem avatar active', await p.evaluate(() => !!window.__mpTown.me.av.motion.isKeem), {});
  for (let i = 1; i <= 3; i++) await cycle(p, i, 'keem_'); rec('no page errors', !p.errs.length, p.errs);
}
if (MODE === 'edge') {
  const A = await mk('A');
  const after = async (n, pre) => { await clear(A); await A.evaluate(pre); await A.evaluate(() => window.__mpTown.hurt(100)); const ok = await until(A, () => window.__mpTown.me.dead === 0 && window.__mpTown.me.hp === 100, null, 90000); const s = await st(A); await until(A, () => window.__mpTown.me.prot === 0, null, 30000);
    const r = await A.evaluate(() => { const t = window.__mpTown; t.GS.cd = 0; t.GS.rl = 0; t.bag.pref = 'pistol'; t.GS.mag.pistol = 12; const m0 = t.GS.mag.pistol; t.fireGun(); const hp0 = t.me.hp; t.hurt(20); return { fired: m0 - t.GS.mag.pistol, hurt: hp0 - t.me.hp, drv: !!t.me.drv, panel: document.querySelector('#mpt .panel').style.display, avAttached: !!t.me.av.root.parent }; });
    rec(`edge ${n}`, ok && s.attached && r.fired === 1 && r.hurt === 20 && !r.drv && r.panel !== 'flex', { s, r }); await A.screenshot({ path: `${OUT}/edge_${n}.png` }); };
  await after('die_in_car', () => { const t = window.__mpTown; const c = t.cars[0]; t.setPos(c.x + 3, c.z); t.enter(c); });
  await after('die_with_loot_panel_open', () => { const t = window.__mpTown; t.togglePanel('bag'); });
  await after('die_reloading', () => { const t = window.__mpTown; t.GS.cd = 0; t.GS.mag.pistol = 2; t.bag.pref = 'pistol'; t.startReload(); });
  await after('die_with_fists_equipped', () => { const t = window.__mpTown; t.bag.pref = 'fists'; });
  await after('die_first_person_view', () => { const t = window.__mpTown; t.bag.pref = 'pistol'; document.querySelector('#tView') && document.querySelector('#tView').click(); });
  await after('die_aiming_rolling', () => { const t = window.__mpTown; t.S.aim = true; t.S.roll = .0; });
  rec('no page errors', !A.errs.length, A.errs);
}
fs.writeFileSync(`${OUT}/results_${MODE}.json`, JSON.stringify(res, null, 1)); const bad = res.filter(r => !r.ok); console.log(MODE, 'DONE', res.length - bad.length, 'pass', bad.length, 'fail'); await b.close(); process.exit(bad.length ? 1 : 0);
