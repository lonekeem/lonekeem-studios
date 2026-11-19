// Items, weighted loot tables and the player's bag (weight limited). Original item names only.
export const ITEMS = {
  wood: { n: 'Wood planks', w: 1.2, ic: '🪵', cat: 'material' }, gascan: { n: 'Gas can (5 L)', w: 3.5, ic: '⛽', cat: 'fuel' }, emptycan: { n: 'Empty gas can', w: .8, ic: '🛢️', cat: 'fuel' },
  food: { n: 'Canned food', w: .45, ic: '🥫', cat: 'supply' }, water: { n: 'Water bottle', w: .5, ic: '💧', cat: 'supply' }, bandage: { n: 'Bandage', w: .1, ic: '🩹', cat: 'med', heal: 18 }, medkit: { n: 'First-aid kit', w: .8, ic: '🧰', cat: 'med', heal: 55 },
  scrap: { n: 'Scrap metal', w: 1, ic: '🔩', cat: 'material' }, tools: { n: 'Tool kit', w: 2, ic: '🔧', cat: 'tool' }, nails: { n: 'Box of nails', w: .3, ic: '📌', cat: 'material' }, rags: { n: 'Rags', w: .2, ic: '🧵', cat: 'material' },
  cash: { n: 'Cash', w: 0, ic: '💵', cat: 'money' },
  bat: { n: 'Baseball bat', w: 1.4, ic: '🏏', cat: 'weapon', melee: { dmg: 2.2, reach: 1.7, name: 'bat' } }, crowbar: { n: 'Crowbar', w: 1.6, ic: '🪝', cat: 'weapon', melee: { dmg: 2.6, reach: 1.6, name: 'crowbar' }, pry: true },
  pan: { n: 'Frying pan', w: 1.1, ic: '🍳', cat: 'weapon', melee: { dmg: 1.7, reach: 1.4, name: 'pan' } }, keys: { n: 'Car keys', w: .1, ic: '🔑', cat: 'tool' }, battery: { n: 'Car battery', w: 6, ic: '🔋', cat: 'material' },
};
// [item, weight, min, max]
export const TABLES = {
  kitchen: [['cash', 2, 5, 15], ['food', 6, 1, 3], ['water', 5, 1, 2], ['pan', 1, 1, 1], ['rags', 2, 1, 2], ['bandage', 1, 1, 1], ['emptycan', 0.3, 1, 1]],
  bedroom: [['cash', 3, 10, 25], ['rags', 4, 1, 3], ['bandage', 3, 1, 2], ['medkit', 1, 1, 1], ['keys', 1.5, 1, 1], ['food', 2, 1, 1], ['bat', .6, 1, 1]],
  living: [['cash', 3, 5, 20], ['rags', 3, 1, 2], ['food', 3, 1, 2], ['water', 2, 1, 1], ['keys', 1, 1, 1], ['wood', 2, 1, 2], ['bat', .8, 1, 1]],
  garage: [['wood', 6, 2, 5], ['scrap', 4, 1, 3], ['nails', 3, 1, 2], ['gascan', 3, 1, 1], ['emptycan', 2, 1, 1], ['tools', 2, 1, 1], ['crowbar', 1.2, 1, 1], ['battery', .6, 1, 1]],
  shed: [['wood', 6, 3, 6], ['nails', 3, 1, 2], ['scrap', 3, 1, 2], ['gascan', 2.5, 1, 1], ['emptycan', 2, 1, 1], ['crowbar', 1, 1, 1], ['tools', 1.5, 1, 1]],
  store: [['cash', 3, 10, 30], ['food', 8, 2, 5], ['water', 7, 2, 4], ['bandage', 3, 1, 3], ['medkit', 1.5, 1, 1], ['rags', 1.5, 1, 2], ['emptycan', 1, 1, 1], ['bat', .5, 1, 1]],
  stockroom: [['food', 7, 3, 6], ['water', 6, 3, 5], ['tools', 2, 1, 1], ['gascan', 2, 1, 1], ['wood', 3, 2, 4], ['scrap', 2, 1, 2], ['medkit', 1.5, 1, 1]],
  station: [['cash', 3, 10, 30], ['gascan', 5, 1, 2], ['emptycan', 4, 1, 1], ['tools', 2.5, 1, 1], ['scrap', 2, 1, 2], ['water', 3, 1, 3], ['food', 3, 1, 3], ['rags', 2, 1, 2], ['crowbar', 1.2, 1, 1], ['battery', 1, 1, 1]],
  car: [['keys', 1.2, 1, 1], ['rags', 3, 1, 2], ['water', 3, 1, 1], ['food', 2, 1, 2], ['emptycan', 1.5, 1, 1], ['gascan', 1.2, 1, 1], ['tools', 1.4, 1, 1], ['bandage', 1.5, 1, 1], ['scrap', 1, 1, 1]],
  trunk: [['gascan', 3, 1, 1], ['wood', 2, 1, 3], ['tools', 2, 1, 1], ['scrap', 2, 1, 2], ['food', 2, 1, 3], ['medkit', 1, 1, 1], ['crowbar', 1, 1, 1], ['emptycan', 1.5, 1, 1]],
};
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
  best() { let b = { name: 'fists', dmg: 1, reach: 1.2 }; for (const k in this.items) { const m = ITEMS[k].melee; if (m && m.dmg > b.dmg) b = m; } return b; }
  hasPry() { return this.count('crowbar') > 0; }
}
