// Weapons, upgrades, perks and save data. All currency is in-game only (no real money, no IAP).
export const WEAPONS = {
  fists:   { name: 'Fists', type: 'melee', dmg: 18, rate: 0.42, range: 1.6, price: 0, desc: 'Jab, cross. Better than nothing.' },
  pan:     { name: 'Frying Pan', type: 'melee', dmg: 34, rate: 0.6, range: 1.9, price: 0, bonk: true, desc: 'Mom\'s cast iron. BONK.' },
  bat:     { name: 'Baseball Bat', type: 'melee', dmg: 48, rate: 0.7, range: 2.1, price: 150, desc: 'Dad\'s old Louisville. Heavy swing.' },
  machete: { name: 'Machete', type: 'melee', dmg: 62, rate: 0.6, range: 2.0, price: 450, sever: true, desc: 'Cuts limbs clean off.' },
  axe:     { name: 'Fire Axe', type: 'melee', dmg: 90, rate: 0.95, range: 2.2, price: 900, sever: true, desc: 'Slow. Brutal. Finisher machine.' },
  chainsaw:{ name: 'Chainsaw', type: 'melee', dmg: 140, rate: 0.5, range: 2.3, price: 1400, sever: true, ch: 3, desc: 'Big Moose Truck Stop special. Loud. Messy. Perfect.' },
  pistol:  { name: '9mm Pistol', type: 'gun', ammo: 'light', dmg: 34, rate: 0.22, mag: 12, reload: 1.3, spread: 0.012, range: 60, price: 0, desc: 'Dad\'s lockbox pistol.' },
  revolver:{ name: '.44 Revolver', type: 'gun', ammo: 'light', dmg: 80, rate: 0.55, mag: 6, reload: 2.0, spread: 0.008, range: 70, price: 700, desc: 'Six shots. Big holes.' },
  smg:     { name: 'SMG', type: 'gun', ammo: 'light', dmg: 20, rate: 0.075, mag: 30, reload: 1.6, spread: 0.035, range: 45, auto: true, price: 1100, desc: 'Sprays the horde.' },
  shotgun: { name: 'Pump Shotgun', type: 'gun', ammo: 'shell', dmg: 22, pellets: 8, rate: 0.85, mag: 6, reload: 2.4, spread: 0.075, range: 22, price: 1300, desc: 'Close range shredder. Pops limbs.' },
  rifle:   { name: 'Patrol Rifle', type: 'gun', ammo: 'rifle', dmg: 38, rate: 0.11, mag: 30, reload: 2.0, spread: 0.016, range: 90, auto: true, price: 1800, desc: 'Sheriff\'s AR. Full auto.' },
  saw:     { name: 'Guard SAW', type: 'gun', ammo: 'rifle', dmg: 30, rate: 0.085, mag: 75, reload: 3.4, spread: 0.03, range: 85, auto: true, price: 3200, ch: 2, desc: 'Belt-fed National Guard machine gun. Unlocks in Chapter 2.' },
  lever:   { name: 'Lever-Action .30-30', type: 'gun', ammo: 'rifle', dmg: 120, rate: 0.6, mag: 8, reload: 2.4, spread: 0.006, range: 110, price: 1800, ch: 4, desc: 'Taken off a Tollman. Hits like a mule.' },
  auto12:  { name: 'Auto-12 Shotgun', type: 'gun', ammo: 'shell', dmg: 20, pellets: 8, rate: 0.24, mag: 12, reload: 2.8, spread: 0.07, range: 22, auto: true, price: 2600, ch: 5, desc: 'Mall security\'s worst idea. Fully automatic.' },
  handcannon:{ name: '.50 Hand Cannon', type: 'gun', ammo: 'light', dmg: 150, rate: 0.7, mag: 7, reload: 2.0, spread: 0.01, range: 70, price: 3000, ch: 6, desc: 'The Toll King\'s sidearm. Pays every toll.' },
  harpoon: { name: 'Harpoon Gun', type: 'gun', ammo: 'rifle', dmg: 260, rate: 1.1, mag: 1, reload: 1.6, spread: 0.002, range: 80, price: 3400, ch: 7, desc: 'Cape Marina bait-shop special. Pins them to the wall.' },
  minigun: { name: 'Deck Minigun', type: 'gun', ammo: 'rifle', dmg: 26, rate: 0.045, mag: 150, reload: 4.2, spread: 0.04, range: 80, auto: true, price: 4200, ch: 8, desc: 'Ripped off the Casco Bay ferry. Brrrrt.' },
  katana:  { name: 'Captain\'s Katana', type: 'melee', dmg: 170, rate: 0.42, range: 2.3, price: 3800, sever: true, blade: true, ch: 9, desc: 'He bought it at the mall. Still sharp enough to take heads clean off.' },
  tomahawk:{ name: 'Combat Tomahawk', type: 'melee', dmg: 105, rate: 0.5, range: 2.0, price: 1600, sever: true, ch: 3, desc: 'Fast, forged steel. Hooks limbs off.' },
  longsword:{ name: 'Swan Boat Longsword', type: 'melee', dmg: 230, rate: 0.72, range: 2.7, price: 5200, sever: true, blade: true, ch: 10, desc: 'Two-handed museum steel from the Boston armory. Cuts them in half.' },
  crossbow:{ name: 'Hunting Crossbow', type: 'gun', ammo: 'bolt', dmg: 210, rate: 0.9, mag: 1, reload: 1.4, spread: 0.002, range: 90, price: 2200, ch: 4, quiet: true, desc: 'Silent. One bolt, one head.' },
  flamer:  { name: 'Flamethrower', type: 'gun', ammo: 'fuel', dmg: 8, pellets: 4, rate: 0.07, mag: 100, reload: 3.0, spread: 0.09, range: 9, auto: true, flame: true, price: 4800, ch: 10, desc: 'Scrounged from the Boston fire depot. They burn and they keep burning.' },
  launcher:{ name: 'M32 Grenade Launcher', type: 'gun', ammo: 'gl', dmg: 40, rate: 0.6, mag: 6, reload: 3.4, spread: 0.004, range: 60, gl: true, price: 6000, ch: 11, desc: 'Six-round drum. Pulled off the Harbor Gate turret. Boom.' },
  sniper:  { name: 'Hunting Sniper', type: 'gun', ammo: 'rifle', dmg: 160, rate: 1.2, mag: 5, reload: 2.6, spread: 0.001, range: 160, zoom: 3, price: 2600, desc: 'One shot, one head.' },
};
export const WEAPON_ORDER = ['fists', 'pan', 'bat', 'machete', 'axe', 'chainsaw', 'pistol', 'revolver', 'smg', 'shotgun', 'rifle', 'saw', 'lever', 'auto12', 'handcannon', 'harpoon', 'minigun', 'katana', 'tomahawk', 'longsword', 'crossbow', 'flamer', 'launcher', 'sniper'];
export const UPGRADES = {
  dmg: { name: 'Damage', per: 0.15, max: 4 },
  mag: { name: 'Magazine', per: 0.25, max: 3, gun: true },
  rel: { name: 'Reload speed', per: 0.15, max: 3, gun: true },
  acc: { name: 'Scope / accuracy', per: 0.22, max: 3, gun: true },
};
export const upCost = (w, k, lvl) => Math.round((80 + (WEAPONS[w].price || 200) * 0.35) * (lvl + 1) * (k === 'dmg' ? 1.2 : 1));
export const AMMO_SHOP = { bolt: { name: 'Crossbow bolts ×10', n: 10, price: 90 }, fuel: { name: 'Fuel canister ×100', n: 100, price: 140 }, gl: { name: '40mm grenades ×6', n: 6, price: 260 }, light: { name: '9mm/.44 ammo ×36', n: 36, price: 60 }, shell: { name: 'Shells ×12', n: 12, price: 80 }, rifle: { name: 'Rifle rounds ×40', n: 40, price: 110 }, grenade: { name: 'Pipe grenade', n: 1, price: 150 }, med: { name: 'Med kit', n: 1, price: 120 } };
export const PERKS = [null, null,
  { name: 'Tough Kid', desc: '+20 max health' }, { name: 'Steady Hands', desc: '+15% accuracy' }, { name: 'Scavenger', desc: '+30% cash from loot' },
  { name: 'Brawler', desc: '+25% melee damage' }, { name: 'Quick Hands', desc: '20% faster reloads' }, { name: 'Marathon', desc: '+15% sprint speed' },
  { name: 'Deadeye', desc: '+50% headshot damage' }, { name: 'Iron Skin', desc: '+20 max health' }, { name: 'Butcher', desc: 'Finishers heal 10 HP' }];
export const xpFor = (lvl) => 120 * lvl + 40 * lvl * lvl; // xp needed to go from lvl to lvl+1
export function perk(save, i) { return save.level >= i; }

const KEY = 'atq3_save';
export function defaultSave() {
  return { v: 3, step: 0, cash: 0, xp: 0, level: 1, owned: ['fists'], up: {}, ammo: { light: 0, shell: 0, rifle: 0 }, mags: {}, grenades: 0, meds: 1,
    pages: [], items: [], loot: [], cur: 'fists', kills: 0, bites: 0, done: false, ch: 1, done2: false };
}
export function loadSave(LS) { for (const k of [KEY, KEY + '.bak']) { try { const s = JSON.parse(LS.getItem(k) || 'null'); if (s && (s.v | 0) >= 3) return Object.assign(defaultSave(), s, { v: 3 }); } catch (e) {} } return null; }
export function writeSave(LS, s) { try { const j = JSON.stringify(s); LS.setItem(KEY, j); LS.setItem(KEY + '.bak', j); } catch (e) {} }
export function clearSave(LS) { try { LS.removeItem(KEY); LS.removeItem(KEY + '.bak'); } catch (e) {} }
export function stat(save, w) {
  const b = WEAPONS[w], u = save.up[w] || {}, o = Object.assign({}, b);
  o.dmg = b.dmg * (1 + UPGRADES.dmg.per * (u.dmg || 0)) * (b.type === 'melee' && perk(save, 5) ? 1.25 : 1);
  if (b.type === 'gun') { o.mag = Math.round(b.mag * (1 + UPGRADES.mag.per * (u.mag || 0)));
    o.reload = b.reload * (1 - UPGRADES.rel.per * (u.rel || 0)) * (perk(save, 6) ? 0.8 : 1);
    o.spread = b.spread * (1 - UPGRADES.acc.per * (u.acc || 0)) * (perk(save, 3) ? 0.85 : 1); o.zoom = (b.zoom || 1.35) + (u.acc || 0) * 0.35; }
  return o;
}
