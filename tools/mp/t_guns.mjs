// Story guns as MP loot: per gun -> equip, fire/reload/ammo accounting, damage vs a zombie, auto-fire, close-up of the model in hand.
import { boot, freecam } from '../mpfix/lib.mjs'; import fs from 'fs';
const OUT = '/workspace/atq1919/docs/mp-fix3/guns'; fs.mkdirSync(OUT, { recursive: true });
const GUNS = (process.env.GUNS || 'pistol,revolver,smg,shotgun,rifle,saw,lever,auto12,handcannon,harpoon,minigun,crossbow,flamer,launcher,sniper').split(',');
const { b, p } = await boot(); const fr = n => p.evaluate(n => new Promise(r => { let k = 0; const f = () => { if (++k >= n) r(); else requestAnimationFrame(f); }; requestAnimationFrame(f); }), n);
const res = {};
for (const g of GUNS) {
  await p.evaluate(g => { const t = window.__mpTown; t.Z.killNear(0, 0, 400, 9999); t.setPos(-6, 21.5); t.me.ry = Math.PI / 2; t.camYaw(Math.PI / 2); t.bag.cap = 999; for (const k of Object.keys(t.bag.items)) delete t.bag.items[k]; t.bag.add(g, 1); const am = window.__IT[g].ammo; t.bag.add(am, 300); t.bag.pref = g; t.GS.mag = {}; t.GS.cd = 0; t.GS.rl = 0; window.__MP_DTCAP = .05; }, g).catch(async () => { });
  await p.evaluate(async g => { if (!window.__IT) { window.__IT = (await import('/src/mp/town/loot.js')).ITEMS; } }, g);
  await p.evaluate(g => { const t = window.__mpTown; for (const k of Object.keys(t.bag.items)) delete t.bag.items[k]; t.bag.add(g, 1); t.bag.add(window.__IT[g].ammo, 300); t.bag.pref = g; t.GS.mag = {}; t.GS.cd = 0; t.GS.rl = 0; }, g);
  await fr(6);
  // close-up of the gun in hand (side + front)
  const pos = await p.evaluate(() => [window.__mpTown.me.x, window.__mpTown.me.z]);
  await freecam(p, [pos[0] + 0.5, 1.4, pos[1] + 1.7], [pos[0] + 0.5, 1.25, pos[1]]); await fr(2); await p.screenshot({ path: `${OUT}/${g}_hand.png`, clip: { x: 222, y: 40, width: 400, height: 300 } });
  // target zombie at 6 m ahead (hp padded so we can read the damage of ONE shot)
  const info = await p.evaluate(async g => { const t = window.__mpTown; const { WEAPONS } = await import('/src/game/data.js'); window.__W = WEAPONS; const w = WEAPONS[g];
    t.Z.killNear(0, 0, 600, 1e9); const z = t.Z.spawnAt(t.me.x + 6, t.me.z); z.hp = 1e6; z.speed = 0; const hp0 = z.hp; t.GS.cd = 0;
    t.fireGun(); const empty = { mag: t.GS.mag[g] || 0, rl: t.GS.rl }; // first trigger on an empty mag -> click + auto reload
    return { w: { dmg: w.dmg, pellets: w.pellets || 1, rate: w.rate, mag: w.mag, reload: w.reload, auto: !!w.auto, range: w.range }, empty, hp0 }; }, g);
  await fr(Math.ceil(((info.w.reload || 1) + .3) / .05) + 2);
  const after = await p.evaluate(g => { const t = window.__mpTown; return { mag: t.GS.mag[g] || 0, ammo: t.bag.count(window.__IT[g].ammo), rl: t.GS.rl }; }, g);
  const shot = await p.evaluate(async g => { const t = window.__mpTown; t.Z.killNear(t.me.x + 40, t.me.z, 25, 1e9); const z = t.Z.zombies.find(q => !q.dead && q.hp > 1e5); z.root.position.set(t.me.x + 6, 0, t.me.z); z.vel.set(0, 0, 0); t.me.hp = 100; const hp0 = z.hp, m0 = t.GS.mag[g]; t.GS.cd = 0; t.me.ry = Math.PI / 2; t.fireGun(); window.__MP_DTCAP = .001; return { dhp: hp0 - z.hp, dmag: m0 - t.GS.mag[g], dead: z.dead }; }, g);
  await freecam(p, [pos[0] + 1.2, 1.45, pos[1] + 2.4], [pos[0] + 2.6, 1.25, pos[1]]); await fr(2); await p.screenshot({ path: `${OUT}/${g}_fire.png`, clip: { x: 122, y: 40, width: 600, height: 310 } });
  await p.evaluate(() => { window.__MP_DTCAP = .05; });
  // auto-fire: hold the fire input for ~1 s of sim time, count rounds
  let auto = null; if (info.w.auto) { await p.evaluate(g => { const t = window.__mpTown; t.GS.mag[g] = t.GS.mag[g] || 1; t.GS.mag[g] = Math.min(t.GS.mag[g] + 60, 999); t.GS.cd = 0; window.__a0 = t.GS.mag[g]; window.__MP_DTCAP = .02; }, g); const bb = await p.evaluate(() => { const r = document.querySelector('#tAtk').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }); await p.mouse.move(bb[0], bb[1]); await p.mouse.down(); await fr(50); await p.mouse.up(); await fr(2);
    auto = await p.evaluate(g => ({ fired: window.__a0 - window.__mpTown.GS.mag[g], expect_per_s: +(1 / window.__W[g].rate).toFixed(1) }), g); await p.evaluate(() => { window.__MP_DTCAP = .05; }); }
  res[g] = { ...info, after, shot, auto }; console.log(g, JSON.stringify(res[g]));
}
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(res, null, 1)); await b.close();
