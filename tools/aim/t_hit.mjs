// solo: aim + shoot a zombie with pistol / rifle / shotgun, headshot, melee. Uses real tap on #tAim (touch) and real taps on FIRE/HIT.
import { launch, ctxOpts, client, fr, OUT } from './lib.mjs'; import fs from 'fs';
const KEEM = process.env.KEEM === '1'; const tag = KEEM ? 'keem_' : '';
const D = OUT + '/solo'; fs.mkdirSync(D, { recursive: true });
const b = await launch(); const ctx = await b.newContext(ctxOpts); const p = await client(ctx, { keem: KEEM });
await p.evaluate(() => { window.__MP_DTCAP = .05; });
const res = {};
const setup = (g) => p.evaluate(async g => { const T = window.__mpTown; if (!window.__IT) window.__IT = (await import('/src/mp/town/loot.js')).ITEMS; T.Z.damage && 0; for (const z of T.Z.zombies) if (!z.dead && z.z) z.hp = 0.001 && (z.hp = 1e9, z.speed = 0, z.root.position.set(900, 0, 900)); T.setPos(-6, 21.5); T.me.ry = Math.PI / 2; T.camYaw(Math.PI / 2); T.setAimPitch(-.12); T.bag.cap = 999; for (const k of Object.keys(T.bag.items)) delete T.bag.items[k]; T.bag.add(g, 1); T.bag.add(window.__IT[g].ammo, 300); T.bag.pref = g; T.GS.mag = {}; T.GS.mag[g] = 12; T.GS.cd = 0; T.GS.rl = 0; return true; }, g);
const spawn = (dist, hp = 70) => p.evaluate(([dist, hp]) => { const T = window.__mpTown; const z = T.Z.spawnAt(T.me.x + dist, T.me.z); z.hp = hp; z.maxHp = hp; z.speed = 0; z.st = 'idle'; window.__zt = z; z.hurtT = 0; return T.Z.indexOf(z); }, [dist, hp]);
const zs = () => p.evaluate(() => { const z = window.__zt; return { hp: +z.hp.toFixed(1), dead: z.dead, anim: z.curName, vel: +z.vel.length().toFixed(2), stun: +z.hurtT.toFixed(2) }; });
const tap = async sel => { const r = await p.evaluate(sel => { const e = document.querySelector(sel).getBoundingClientRect(); return [e.x + e.width / 2, e.y + e.height / 2]; }, sel); await p.touchscreen.tap(r[0], r[1]); };
for (const g of ['pistol', 'rifle', 'shotgun']) {
  await setup(g); await spawn(g === 'shotgun' ? 5 : 8); await p.evaluate(() => { window.__mpTown.inp.tAim = true; }); await fr(p, 40);
  const info = await p.evaluate(() => { const T = window.__mpTown; return { fov: +T.cam.fov.toFixed(1), aim: T.S.aim, xh: !document.getElementById('xhair').classList.contains('hidden'), ry: +T.me.ry.toFixed(2) }; });
  await p.screenshot({ path: `${D}/${tag}${g}_aim.png` });
  const hp0 = (await zs()).hp; await p.evaluate(() => { window.__mpTown.GS.cd = 0; }); await tap('#tAtk'); await fr(p, 3);
  const a = await zs(); const last = await p.evaluate(() => window.__mpTown.S.lastShot);
  await p.screenshot({ path: `${D}/${tag}${g}_hit.png` }); await fr(p, 12);
  const a2 = await zs(); res[g] = { info, hp0, after: a, afterLater: a2, last };
  // kill with repeated shots
  let n = 1; for (; n < 12; n++) { const z = await zs(); if (z.dead) break; await p.evaluate(() => { window.__mpTown.GS.cd = 0; const T = window.__mpTown; if (!T.GS.mag[T.bag.pref]) T.GS.mag[T.bag.pref] = 12; }); await tap('#tAtk'); await fr(p, 3); }
  res[g].kill = { shots: n, ...(await zs()) }; await p.screenshot({ path: `${D}/${tag}${g}_dead.png` }); console.log(g, JSON.stringify(res[g]));
  await p.evaluate(() => { window.__mpTown.inp.tAim = false; }); await fr(p, 8);
}
// headshot: sweep aim pitch until the ray passes through the head sphere
await setup('pistol'); await spawn(8, 70); await p.evaluate(() => { window.__mpTown.inp.tAim = true; }); await fr(p, 30);
let head = null; for (let pit = -.25; pit <= .1; pit += .01) { const r = await p.evaluate(async pit => { const T = window.__mpTown; T.setAimPitch(pit); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); const A = await import('/src/mp/town/aim.js'); const ndc = A.crosshairNDC(document.querySelector('#mpt canvas')); const ray = A.aimRay(T.cam, ndc, new T.cam.position.constructor(T.me.x, 1.4, T.me.z), 0); const h = A.pickZombie(T.Z.zombies, ray, 100); return h && h.z === window.__zt ? { head: h.head, t: h.t } : null; }, pit); if (r && r.head) { head = { pit: +pit.toFixed(2), ...r }; break; } }
if (head) { await p.evaluate(() => { window.__mpTown.GS.cd = 0; }); const hp0 = (await zs()).hp; await tap('#tAtk'); await fr(p, 3); const a = await zs(); await p.screenshot({ path: `${D}/${tag}headshot.png` }); res.headshot = { head, hp0, after: a, last: await p.evaluate(() => window.__mpTown.S.lastShot) }; } else res.headshot = 'no head hit found'; console.log('headshot', JSON.stringify(res.headshot));
await p.evaluate(() => { window.__mpTown.inp.tAim = false; });
// melee: fists + bat, zombie slightly to the side (lock-on), real HIT button taps
for (const m of ['fists', 'bat']) { await p.evaluate(async m => { const T = window.__mpTown; for (const z of T.Z.zombies) if (!z.dead && z.z && z !== window.__zt) z.root.position.set(900, 0, 900); T.setPos(-6, 21.5); T.me.ry = 0; T.camYaw(Math.PI / 2); for (const k of Object.keys(T.bag.items)) delete T.bag.items[k]; if (m !== 'fists') T.bag.add(m, 1); T.bag.pref = m === 'fists' ? 'fists' : m; T.me.hitCd = 0; T.S.atk = 0; T.S.combo = 0; const z = T.Z.spawnAt(T.me.x + 1.0, T.me.z + 0.9); z.hp = 70; z.speed = 0; z.st = 'idle'; z.hurtT = 0; window.__zt = z; }, m); await fr(p, 6);
  const hp0 = (await zs()).hp; const ry0 = await p.evaluate(() => window.__mpTown.me.ry); await tap('#tAtk'); await fr(p, 3); await p.screenshot({ path: `${D}/${tag}melee_${m}_swing.png` }); await fr(p, 25); const a = await zs(); const ry1 = await p.evaluate(() => window.__mpTown.me.ry); res['melee_' + m] = { hp0, after: a, ry0: +ry0.toFixed(2), ry1: +ry1.toFixed(2), last: await p.evaluate(() => window.__mpTown.S.lastMelee) }; await p.screenshot({ path: `${D}/${tag}melee_${m}_hit.png` }); console.log('melee', m, JSON.stringify(res['melee_' + m])); }
fs.writeFileSync(`${D}/${tag}results.json`, JSON.stringify(res, null, 1)); await b.close();
