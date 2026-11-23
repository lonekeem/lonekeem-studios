// Items, weighted loot tables and the player's bag (weight limited). Original item names only.
import { CFG } from './map.js';
import * as THREE from 'three';
import { boxGeo } from './kit.js';
import { plain } from './building.js';
import { WEAPONS } from '../../game/data.js';
const MELEE_IC = { bat: '🏏', crowbar: '🪝', pan: '🍳', machete: '🔪', axe: '🪓', chainsaw: '⛓️', katana: '⚔️', tomahawk: '🪓', longsword: '🗡️' };
const MELEE_W = { bat: 1.4, crowbar: 1.6, pan: 1.1, machete: 1.2, axe: 2.4, chainsaw: 5.5, katana: 1.3, tomahawk: 1.1, longsword: 2.8 };
function meleeItem(id) { const w = WEAPONS[id]; return { n: w.name, w: MELEE_W[id] || 1.5, ic: MELEE_IC[id] || '🗡️', cat: 'weapon', melee: { dmg: w.dmg / 22, reach: w.range * 0.8, name: id, rate: w.rate } }; }
export const ITEMS = {
  wood: { n: 'Wood planks', w: 1.2, ic: '🪵', cat: 'material' }, gascan: { n: 'Gas can (5 L)', w: 3.5, ic: '⛽', cat: 'fuel' }, emptycan: { n: 'Empty gas can', w: .8, ic: '🛢️', cat: 'fuel' },
  food: { n: 'Canned food', w: .45, ic: '🥫', cat: 'supply' }, water: { n: 'Water bottle', w: .5, ic: '💧', cat: 'supply' }, bandage: { n: 'Bandage', w: .1, ic: '🩹', cat: 'med', heal: 18 }, medkit: { n: 'First-aid kit', w: .8, ic: '🧰', cat: 'med', heal: 55 },
  scrap: { n: 'Scrap metal', w: 1, ic: '🔩', cat: 'material' }, tools: { n: 'Tool kit', w: 2, ic: '🔧', cat: 'tool' }, nails: { n: 'Box of nails', w: .3, ic: '📌', cat: 'material' }, rags: { n: 'Rags', w: .2, ic: '🧵', cat: 'material' },
  cash: { n: 'Cash', w: 0, ic: '💵', cat: 'money' },
  // story-mode guns (stats from src/game/data.js WEAPONS) + their ammo, one round per bag unit
  pistol: { n: '9mm Pistol', w: 1, ic: '🔫', cat: 'weapon', gun: 'pistol', ammo: 'ammo_light' }, shotgun: { n: 'Pump Shotgun', w: 3.2, ic: '🔫', cat: 'weapon', gun: 'shotgun', ammo: 'ammo_shell' },
  // the rest of the story guns (same ids, stats from WEAPONS in src/game/data.js), found as loot
  revolver: { n: '.44 Revolver', w: 1.4, ic: '🔫', cat: 'weapon', gun: 'revolver', ammo: 'ammo_light' }, smg: { n: 'SMG', w: 2.4, ic: '🔫', cat: 'weapon', gun: 'smg', ammo: 'ammo_light' },
  rifle: { n: 'Patrol Rifle', w: 3.6, ic: '🔫', cat: 'weapon', gun: 'rifle', ammo: 'ammo_rifle' }, saw: { n: 'Guard SAW', w: 5.5, ic: '🔫', cat: 'weapon', gun: 'saw', ammo: 'ammo_rifle' },
  lever: { n: 'Lever-Action .30-30', w: 3.2, ic: '🔫', cat: 'weapon', gun: 'lever', ammo: 'ammo_rifle' }, auto12: { n: 'Auto-12 Shotgun', w: 4, ic: '🔫', cat: 'weapon', gun: 'auto12', ammo: 'ammo_shell' },
  handcannon: { n: '.50 Hand Cannon', w: 1.8, ic: '🔫', cat: 'weapon', gun: 'handcannon', ammo: 'ammo_light' }, harpoon: { n: 'Harpoon Gun', w: 4, ic: '🔫', cat: 'weapon', gun: 'harpoon', ammo: 'ammo_rifle' },
  minigun: { n: 'Deck Minigun', w: 9, ic: '🔫', cat: 'weapon', gun: 'minigun', ammo: 'ammo_rifle' }, crossbow: { n: 'Hunting Crossbow', w: 2.6, ic: '🏹', cat: 'weapon', gun: 'crossbow', ammo: 'ammo_bolt' },
  flamer: { n: 'Flamethrower', w: 6, ic: '🔥', cat: 'weapon', gun: 'flamer', ammo: 'ammo_fuel' }, launcher: { n: 'M32 Grenade Launcher', w: 5.5, ic: '💥', cat: 'weapon', gun: 'launcher', ammo: 'ammo_gl' },
  sniper: { n: 'Hunting Sniper', w: 4.2, ic: '🔫', cat: 'weapon', gun: 'sniper', ammo: 'ammo_rifle' },
  ammo_rifle: { n: 'Rifle round', w: .05, ic: '🔹', cat: 'ammo' }, ammo_bolt: { n: 'Crossbow bolt', w: .08, ic: '➴', cat: 'ammo' }, ammo_fuel: { n: 'Fuel (1 unit)', w: .03, ic: '🟧', cat: 'ammo' }, ammo_gl: { n: '40mm grenade', w: .35, ic: '🟢', cat: 'ammo' },
  grenade: { n: 'Frag grenade', w: .5, ic: '💣', cat: 'weapon' },
  ammo_light: { n: '9mm round', w: .03, ic: '🔸', cat: 'ammo' }, ammo_shell: { n: 'Shotgun shell', w: .06, ic: '🟥', cat: 'ammo' },
  bat: meleeItem('bat'), crowbar: Object.assign(meleeItem('crowbar'), { pry: true }), pan: meleeItem('pan'),
  machete: meleeItem('machete'), axe: meleeItem('axe'), chainsaw: meleeItem('chainsaw'), katana: meleeItem('katana'), tomahawk: meleeItem('tomahawk'), longsword: meleeItem('longsword'),
  keys: { n: 'Car keys', w: .1, ic: '🔑', cat: 'tool' }, battery: { n: 'Car battery', w: 6, ic: '🔋', cat: 'material' },
};
// [item, weight, min, max]
export const TABLES = {
  kitchen: [['cash', 2, 5, 15], ['food', 6, 1, 3], ['water', 5, 1, 2], ['pan', 1, 1, 1], ['rags', 2, 1, 2], ['bandage', 1, 1, 1], ['emptycan', 0.3, 1, 1]],
  bedroom: [['cash', 3, 10, 25], ['rags', 4, 1, 3], ['bandage', 3, 1, 2], ['medkit', 1, 1, 1], ['keys', 1.5, 1, 1], ['food', 2, 1, 1], ['bat', .6, 1, 1], ['pistol', .5, 1, 1], ['revolver', .12, 1, 1], ['ammo_light', 1.2, 6, 14]],
  living: [['cash', 3, 5, 20], ['rags', 3, 1, 2], ['food', 3, 1, 2], ['water', 2, 1, 1], ['keys', 1, 1, 1], ['wood', 2, 1, 2], ['bat', .8, 1, 1]],
  garage: [['wood', 6, 2, 5], ['scrap', 4, 1, 3], ['nails', 3, 1, 2], ['gascan', 3, 1, 1], ['emptycan', 2, 1, 1], ['tools', 2, 1, 1], ['crowbar', 1.2, 1, 1], ['battery', .6, 1, 1], ['grenade', .3, 1, 1]],
  shed: [['wood', 6, 3, 6], ['nails', 3, 1, 2], ['scrap', 3, 1, 2], ['gascan', 2.5, 1, 1], ['emptycan', 2, 1, 1], ['crowbar', 1, 1, 1], ['tools', 1.5, 1, 1], ['ammo_shell', .7, 2, 5]],
  store: [['cash', 3, 10, 30], ['food', 8, 2, 5], ['water', 7, 2, 4], ['bandage', 3, 1, 3], ['medkit', 1.5, 1, 1], ['rags', 1.5, 1, 2], ['emptycan', 1, 1, 1], ['bat', .5, 1, 1], ['ammo_light', .8, 6, 12], ['ammo_shell', .4, 3, 6], ['revolver', .15, 1, 1], ['smg', .08, 1, 1]],
  stockroom: [['food', 7, 3, 6], ['water', 6, 3, 5], ['tools', 2, 1, 1], ['gascan', 2, 1, 1], ['wood', 3, 2, 4], ['scrap', 2, 1, 2], ['medkit', 1.5, 1, 1]],
  station: [['cash', 3, 10, 30], ['gascan', 5, 1, 2], ['emptycan', 4, 1, 1], ['tools', 2.5, 1, 1], ['scrap', 2, 1, 2], ['water', 3, 1, 3], ['food', 3, 1, 3], ['rags', 2, 1, 2], ['crowbar', 1.2, 1, 1], ['battery', 1, 1, 1]],
  car: [['keys', 1.2, 1, 1], ['rags', 3, 1, 2], ['water', 3, 1, 1], ['food', 2, 1, 2], ['emptycan', 1.5, 1, 1], ['gascan', 1.2, 1, 1], ['tools', 1.4, 1, 1], ['bandage', 1.5, 1, 1], ['scrap', 1, 1, 1], ['ammo_light', .8, 4, 10]],
  trunk: [['gascan', 3, 1, 1], ['wood', 2, 1, 3], ['tools', 2, 1, 1], ['scrap', 2, 1, 2], ['food', 2, 1, 3], ['medkit', 1, 1, 1], ['crowbar', 1, 1, 1], ['emptycan', 1.5, 1, 1]],
};
// outdoor spots (loot.js addLoot): extra tables
Object.assign(TABLES, {
  gascache: [['gascan', 7, 1, 3], ['emptycan', 3, 1, 1], ['rags', 2, 1, 1], ['tools', 1, 1, 1]],
  supply: [['food', 7, 2, 4], ['water', 6, 2, 3], ['bandage', 3, 1, 2], ['medkit', 1.5, 1, 1], ['emptycan', 1, 1, 1]],
  dumpster: [['scrap', 4, 1, 2], ['rags', 3, 1, 2], ['food', 2, 1, 1], ['wood', 2, 1, 2], ['cash', 1.5, 3, 12], ['bandage', 1, 1, 1]],
  // gun case: the story guns, common ones likely, the chapter-8+ toys rare
  arms: [['revolver', 3, 1, 1], ['smg', 3, 1, 1], ['rifle', 2.5, 1, 1], ['shotgun', 2.5, 1, 1], ['lever', 1.5, 1, 1], ['crossbow', 1.5, 1, 1], ['sniper', 1.2, 1, 1], ['saw', 1, 1, 1], ['auto12', 1, 1, 1], ['handcannon', 1, 1, 1], ['harpoon', .6, 1, 1], ['flamer', .6, 1, 1], ['launcher', .5, 1, 1], ['minigun', .4, 1, 1],
    ['ammo_light', 4, 12, 30], ['ammo_shell', 3, 6, 12], ['ammo_rifle', 4, 20, 50], ['ammo_bolt', 1.5, 5, 10], ['ammo_fuel', 1, 40, 100], ['ammo_gl', .8, 3, 6], ['grenade', 1.5, 1, 2]],
  duffel: [['cash', 3, 15, 40], ['revolver', .5, 1, 1], ['smg', .35, 1, 1], ['rifle', .25, 1, 1], ['ammo_rifle', 1, 10, 24], ['crossbow', .15, 1, 1], ['ammo_bolt', .3, 3, 6], ['medkit', 2, 1, 1], ['bandage', 3, 1, 3], ['bat', 1, 1, 1], ['crowbar', 1, 1, 1], ['gascan', 1.5, 1, 1], ['keys', 1, 1, 1], ['pistol', 1.2, 1, 1], ['ammo_light', 2, 8, 18], ['shotgun', .6, 1, 1], ['ammo_shell', 1.4, 3, 8], ['grenade', 1.2, 1, 2]],
  clear: [['cash', 3, 8, 20], ['ammo_light', 4, 6, 14], ['bandage', 2, 1, 2], ['food', 2, 1, 2], ['ammo_shell', 2, 2, 6], ['water', 1, 1, 1], ['rags', 1, 1, 2]],
});
export function rollTable(name, rnd) { const T = TABLES[name] || TABLES.living; const out = []; const n = 1 + Math.floor(rnd() * 3); const tot = T.reduce((s, r) => s + r[1], 0);
  for (let i = 0; i < n; i++) { let x = rnd() * tot; for (const r of T) { x -= r[1]; if (x <= 0) { const q = r[2] + Math.floor(rnd() * (r[3] - r[2] + 1)); const e = out.find(o => o.id === r[0]); if (e) e.n += q; else out.push({ id: r[0], n: q }); break; } } } return out; }
export const DOOR_PRICE = 40; // shop / house-upgrade list: 'Door'
export class Bag {
  constructor(cap = 24) { this.cap = cap; this.items = {}; this.onChange = null; }
  get weight() { let w = 0; for (const k in this.items) w += ITEMS[k].w * this.items[k]; return w; }
  count(id) { return this.items[id] || 0; }
  can(id, n = 1) { return this.weight + ITEMS[id].w * n <= this.cap + 1e-6; }
  add(id, n = 1) { let got = 0; for (let i = 0; i < n; i++) { if (!this.can(id)) break; this.items[id] = (this.items[id] || 0) + 1; got++; } if (got) this.onChange && this.onChange(); return got; }
  remove(id, n = 1) { if (this.count(id) < n) return false; this.items[id] -= n; if (!this.items[id]) delete this.items[id]; this.onChange && this.onChange(); return true; }
  best() { const fists = { name: 'fists', dmg: 1, reach: 1.2 }; if (this.pref === 'fists') return fists; if (this.pref && this.items[this.pref] && ITEMS[this.pref] && ITEMS[this.pref].melee) return ITEMS[this.pref].melee; let b = fists; for (const k in this.items) { const m = ITEMS[k] && ITEMS[k].melee; if (m && m.dmg > b.dmg) b = m; } return b; }
  hasPry() { return this.count('crowbar') > 0; }
}

// ---------------- outdoor loot spots (gas cans, supply crates, dumpsters, duffel bags) ----------------
// town:  buildTown(scene,{hooks:[addGas, addLoot]})  and  each frame  updateLoot(W, dt)  (animates the little lids).
// Every spot is a normal W.containers entry ({id,table,label,x,z,reach,looted}) so the town's loot panel + evt sync work unchanged.
// [id, kind, x, z, rotY] — placeholders, easy to move. kinds: gascans | crate | dumpster | duffel
export const LOOT_SPOTS = [
  ['lg1', 'gascans', 33.6, -6.2, 0], ['lg2', 'gascans', 58.6, -9.4, 1.57], ['lc1', 'crate', 55.2, -3.4, .3], ['lc2', 'crate', 3.5, -27.1, .1], ['ld1', 'dumpster', -9.5, -28.5, 0], ['ld2', 'dumpster', 27.5, 28.4, 3.14],
  ['lc3', 'crate', -27.6, 16.5, 1.2], ['lc4', 'crate', 19, 27.9, 0], ['lf1', 'duffel', 21.2, -21.4, .5], ['lf2', 'duffel', -21.5, 22.2, 2], ['lg3', 'gascans', -44, 3.4, 3.14], ['ld3', 'dumpster', 12, 14.2, 0],
  // gun cases (table 'arms'): spread around town, one near spawn so they're easy to find
  ['la1', 'arms', 10, 8, .3], ['la2', 'arms', 44, 6.5, 1.2], ['la3', 'arms', -30, -6, 0], ['la4', 'arms', 8, -34, 2.2], ['la5', 'arms', 62, -14, .5], ['la6', 'arms', -22, 28, 3.14],
  // outer ring (park, school, Cedar Plaza, east/west houses) — do not move the spots above
  ['lf3', 'duffel', 12, 54, .4], ['lc5', 'crate', -14, 50, .2], ['ld4', 'dumpster', 24, 64, 0],
  ['lc6', 'crate', 12, -50, 0], ['la7', 'arms', -14, -52, 1.1], ['ld5', 'dumpster', 18, -64, 0],
  ['ld6', 'dumpster', -124, -12, 1.57], ['lc7', 'crate', -124, 8, .3], ['lg4', 'gascans', -108, 14, 0], ['lf4', 'duffel', -110, -14, 2],
  ['lc8', 'crate', 86, 18, .2], ['la8', 'arms', 86, 42, .8], ['ld7', 'dumpster', -92, 44, 0],
];
const SPEC = { gascans: { table: 'gascache', label: 'Gas cans', w: 1.0, d: .6, h: .5 }, crate: { table: 'supply', label: 'Supply crate', w: 1.0, d: .8, h: .75 }, dumpster: { table: 'dumpster', label: 'Dumpster', w: 1.8, d: 1.0, h: 1.2 }, arms: { table: 'arms', label: 'Gun case', w: .9, d: .45, h: .4 }, duffel: { table: 'duffel', label: 'Duffel bag', w: .9, d: .45, h: .4 } };
export function addLoot(W, spots = LOOT_SPOTS) {
  for (const [id, kind, x, z, ry] of spots) { const S = SPEC[kind]; let px = x, pz = z;
    { const RH = (CFG.ROAD_HALF || 5) + .9; for (const zr of CFG.ZR) if (Math.abs(pz - zr) < RH) pz = zr + Math.sign(pz - zr || 1) * (RH + .3); for (const xr of CFG.XR) if (Math.abs(px - xr) < RH && Math.abs(pz - (CFG.ZR.find(zr => Math.abs(pz - zr) < RH + 1) ?? 1e9)) > RH) px = xr + Math.sign(px - xr || 1) * (RH + .3); } // v1.9.64 wider roads: keep loot on the sidewalk
    if (W.col.hit(px, pz, .9)) { const alt = [[0, 2], [0, -2], [2, 0], [-2, 0], [2, 2], [-2, -2], [0, 4], [0, -4]].find(([dx, dz]) => !W.col.hit(x + dx, z + dz, .9)); if (!alt) continue; px = x + alt[0]; pz = z + alt[1]; }
    placeSpot(W, id, kind, px, pz, ry, S); }
}
function placeSpot(W, id, kind, x, z, ry, S) {
  const { B, col, root } = W; const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g); const mk = (key, color, w, h, d, px, py, pz) => { const m = new THREE.Mesh(boxGeo(w, h, d, 1.2), plain(W.M, key, color)); m.position.set(px, py, pz); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  let top = null;
  if (kind === 'gascans') { for (let i = 0; i < 4; i++) { const px = -.34 + (i % 2) * .5, pz = i < 2 ? -.12 : .16; mk('paint', i % 2 ? '#d8392f' : '#e5c130', .3, .42, .2, px, .21, pz); mk('dark', '#222', .1, .06, .06, px + .05, .45, pz); } mk('plank', '#a58a5b', 1.2, .08, .7, 0, .04, 0); top = mk('paint', '#d8392f', .3, .42, .2, .02, .65, 0); }
  else if (kind === 'crate') { mk('plank', '#b98e55', 1.0, .7, .8, 0, .35, 0); for (const sx of [-.45, .45]) mk('plank', '#7a5a35', .08, .74, .84, sx, .37, 0); top = new THREE.Group(); top.position.set(0, .72, -.4); const lm = new THREE.Mesh(boxGeo(1.04, .07, .84, 1.2), plain(W.M, 'plank', '#c9a064')); lm.position.set(0, 0, .42); lm.castShadow = true; top.add(lm); g.add(top); }
  else if (kind === 'dumpster') { mk('paint', '#2f7a4d', 1.8, 1.0, 1.0, 0, .55, 0); mk('dark', '#222', 1.84, .06, 1.04, 0, .13, 0); top = new THREE.Group(); top.position.set(0, 1.1, -.5); const lm = new THREE.Mesh(boxGeo(1.84, .08, 1.04, 1.2), plain(W.M, 'paint', '#27663f')); lm.position.set(0, 0, .52); lm.castShadow = true; top.add(lm); g.add(top); mk('paint', '#f2c230', .5, .12, .02, 0, .85, .52); }
  else { const arms = kind === 'arms'; const body = mk('fabric', arms ? '#3d4a35' : '#35507a', .9, .38, .42, 0, .22, 0); mk('dark', arms ? '#1d2418' : '#1b2a44', .92, .06, .44, 0, .4, 0); mk('paint', '#f2c230', .1, .3, .44, .15, .23, 0); mk('paint', '#f2c230', .1, .3, .44, -.15, .23, 0); top = new THREE.Group(); top.position.set(0, .43, 0); g.add(top); }
  const rr = Math.max(S.w, S.d) / 2 + .9; const Cn = { id, table: S.table, label: S.label, x, z, fx: Math.sin(ry), fz: Math.cos(ry), reach: rr + .5, looted: false, lid: new THREE.Group(), open: 0, bid: 'street', kind: 'prop-' + kind, top, topOpen: 0 };
  W.containers.push(Cn); (W.lootTops = W.lootTops || []).push(Cn); if (kind !== 'duffel' && kind !== 'arms') col.add(x - S.w / 2 * Math.abs(Math.cos(ry)) - S.d / 2 * Math.abs(Math.sin(ry)), x + S.w / 2 * Math.abs(Math.cos(ry)) + S.d / 2 * Math.abs(Math.sin(ry)), z - S.w / 2 * Math.abs(Math.sin(ry)) - S.d / 2 * Math.abs(Math.cos(ry)), z + S.w / 2 * Math.abs(Math.sin(ry)) + S.d / 2 * Math.abs(Math.cos(ry)), 'prop'); return Cn;
}
/** ease the little lids open once a spot has been searched (container.looted or container.open > 0) */
export function updateLoot(W, dt) { for (const c of W.lootTops || []) { if (!c.top) continue; const want = (c.looted || c.open > 0) ? 1 : 0; c.topOpen += (want - c.topOpen) * Math.min(1, dt * 8); if ((c.kind === 'prop-duffel' || c.kind === 'prop-arms')) c.top.rotation.x = -c.topOpen * .05; else if (c.top.isGroup && c.kind !== 'prop-gascans') c.top.rotation.x = -c.topOpen * 1.8; else if (c.kind === 'prop-gascans') { c.top.visible = !c.looted; } } }
