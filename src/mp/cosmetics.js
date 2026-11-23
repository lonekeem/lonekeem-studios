// Online creator / store cosmetics. IDs match catalog.js (and a few named presets).
// Free items are always available in the creator. Paid ones are bought with shared in-game cash
// and saved on the story wallet (save.cosmetics). Story Keem is never dressed from this list.
import * as C from './catalog.js';

export const FREE = new Set([
  'tee', 'longtee', 'tank', 'vneck', 'oversize', 'buttonup', 'henleyss', 'camp',
  'vest', 'cardigan', 'zip', 'overshirt',
  'jeans', 'joggers', 'shorts', 'leggings', 'midiskirt', 'sweatpants',
  'sneaker', 'lowtop', 'loafer', 'ankleboot', 'flat', 'socks', 'kneesock', 'slides', 'midtop',
  'capflat', 'beanie', 'bandana', 'headband', 'wrap',
  'squareclear', 'roundclear', 'thinclear',
  'studTiny', 'studSmall', 'hoopTiny', 'hoopSmall', 'hoopMedium',
  'nose', 'noseR',
  'chainShort', 'choker', 'beads',
  'chair', // accessibility: always free
  'none',
]);

export const PRICE = {
  hoodie: 150, plaidshirt: 200, kurta: 180, polo: 120, turtle: 150, henley: 120, sweat: 140,
  jersey: 180, flowy: 180, croptee: 120, croptank: 100, scoop: 100, muscle: 100, raglan: 140,
  tunic: 160, bodysuit: 160, sundress: 200, minidress: 200, maxidress: 240, sleevedress: 220,
  denim: 300, bomber: 250, puffer: 400, biker: 450, varsity: 350, parka: 400, trench: 450,
  robe: 350, windbreaker: 250, longcoat: 400, blazer: 320, shacket: 220, poncho: 200,
  cropjacket: 220, cropzip: 200,
  skinny: 120, cargo: 180, wide: 150, miniskirt: 120, longskirt: 180, trackpants: 150,
  floralshorts: 150, zebraskirt: 200, chino: 140, bootcut: 140, dresspants: 180, highjeans: 140,
  hightop: 150, runner: 180, combat: 250, chunky: 200, dress: 200, boot: 180, work: 200, rain: 160,
  kneeboot: 220, thighboot: 260,
  peplum: 160, wraptop: 180, thermal: 140, mockneck: 150, cowl: 180, jumper: 160, sweaterdress: 240,
  wrapdress: 220, peasant: 180, ruffle: 170, dolman: 160, shirtdress: 220, polol: 140, kimonotop: 180,
  fleece: 220, peacoat: 360, raincoat: 300, puffervest: 280, moto: 260, kimono: 240, duster: 380,
  palazzo: 180, flarejeans: 160, wrapskirt: 170, culottes: 160, cargoshorts: 150,
  pleatedskirt: 170, highwide: 180, skaterskirt: 140,
  platform: 200, chelsea: 200, hiking: 220, mule: 160, desert: 180, maryjane: 150,
  fedora: 200, bucket: 150, cowboy: 200, visor: 80, beaniepom: 100, beanietall: 80, hood: 120,
  sun: 160, beret: 120, catears: 150, helmet: 200, caplong: 80, capshort: 60, hardhat: 100,
  avidark: 180, aviclear: 160, catclear: 150, catdark: 160, goggles: 200, bigclear: 160, bigdark: 170,
  rounddark: 140, squaredark: 140, hexclear: 140, hexdark: 150, ovalclear: 140, ovaldark: 150, thindark: 140,
  hoopLarge: 80, hoopHuge: 90, hoopthick: 90, drops: 120, dropl: 140, cuff: 100, cross: 110, chain: 120,
  gstudTiny: 70, gstudSmall: 80, gstudBig: 90, studBig: 60,
  nosering: 60, septum: 80, nosegem: 70, nosegemR: 70, brow: 60, browR: 60, lip: 60, lipR: 60, tragus: 60, tragusR: 60,
  chainMid: 120, chainLong: 150, pearls: 200, pearlsl: 220, scarf: 100, lanyard: 80,
  chainShortthick: 90, chainMidthick: 140, chainLongthick: 160,
  chainMidorb: 150, chainMidcross: 150, chainMidtag: 150, chainMidring: 150, chainMidheart: 180,
  chainLongorb: 180, chainLongcross: 180, chainLongtag: 180, chainLongring: 180, chainLongheart: 200,
  chainShortorb: 110, chainShortcross: 110, chainShorttag: 110, chainShortring: 110, chainShortheart: 140,
  chokerg: 140, beads: 0,
};

// Named looks that apply a catalog style + a default fabric pattern (tie-dye, floral, zebra, plaid).
export const PRESETS = {
  plaidshirt: { slot: 'top', id: 'henley', p: 'Plaid', c: '#7a1f1f', c2: '#f2f2f0', name: 'Plaid shirt' },
  tiedyeshirt: { slot: 'top', id: 'tee', p: 'Tie-dye', c: '#4aa3c7', c2: '#e8743b', name: 'Tie-dye tee' },
  floralshorts: { slot: 'pants', id: 'shorts', p: 'Floral', c: '#2f5d3a', c2: '#e58fb0', name: 'Floral shorts' },
  zebraskirt: { slot: 'pants', id: 'midiskirt', p: 'Zebra', c: '#17181b', c2: '#f2f2f0', name: 'Zebra skirt' },
  patcoat: { slot: 'jacket', id: 'longcoat', p: 'Plaid', c: '#1c2e5c', c2: '#d8c68a', name: 'Patterned coat' },
};

export const SLOTS = [
  { key: 'top', label: 'Shirts', list: 'TOPS', none: false },
  { key: 'jacket', label: 'Jackets', list: 'JACKETS', none: true },
  { key: 'pants', label: 'Pants & skirts', list: 'PANTS', none: false },
  { key: 'shoes', label: 'Shoes', list: 'SHOES', none: false },
  { key: 'hat', label: 'Hats', list: 'HATS', none: true, acc: true },
  { key: 'glasses', label: 'Glasses', list: 'GLASSES_LIST', none: true, acc: true },
  { key: 'earL', label: 'Earrings', list: 'EARRINGS', none: true, acc: true, mirror: 'earR' },
  { key: 'pierce', label: 'Piercings', list: 'PIERCINGS', none: true, acc: true, multi: true },
  { key: 'neck', label: 'Chains & necklaces', list: 'NECKLACES', none: true, acc: true },
  { key: 'chair', label: 'Mobility', list: null, none: true, acc: true },
];

export function priceOf(id) {
  if (!id || id === 'none') return 0;
  if (FREE.has(id)) return 0;
  if (PRICE[id] != null) return PRICE[id];
  return 160;
}

export function ownedCosmetic(save, id) {
  if (!id || id === 'none' || priceOf(id) === 0) return true;
  const s = save || {};
  return (s.cosmetics || []).includes(id) || (s.outfits || []).includes(id);
}

export function buyCosmetic(save, id) {
  if (!save || !id || ownedCosmetic(save, id)) return true;
  const p = priceOf(id);
  if ((save.cash | 0) < p) return false;
  save.cash -= p;
  save.cosmetics = [...new Set([...(save.cosmetics || []), id])];
  return true;
}

export function itemName(id) {
  if (!id || id === 'none') return 'None';
  if (PRESETS[id]) return PRESETS[id].name;
  if (id === 'chair') return 'Wheelchair';
  for (const list of [C.TOPS, C.JACKETS, C.PANTS, C.SHOES, C.HATS, C.GLASSES_LIST, C.EARRINGS, C.PIERCINGS, C.NECKLACES, C.GLOVES]) {
    const h = list.find(x => x[0] === id); if (h) return h[1];
  }
  return id;
}

export function catalogEntries(listName) {
  if (listName === 'TOPS') return [...C.TOPS, ...Object.entries(PRESETS).filter(([, v]) => v.slot === 'top').map(([id, v]) => [id, v.name, 'u'])];
  if (listName === 'PANTS') return [...C.PANTS, ...Object.entries(PRESETS).filter(([, v]) => v.slot === 'pants').map(([id, v]) => [id, v.name, 'u'])];
  if (listName === 'JACKETS') return [...C.JACKETS, ...Object.entries(PRESETS).filter(([, v]) => v.slot === 'jacket').map(([id, v]) => [id, v.name, 'u'])];
  return C[listName] || [];
}

export function patIndex(name) { const i = C.PATTERNS.indexOf(name); return i < 0 ? 0 : i; }

export const STORE_SECTIONS = [
  { title: 'Shirts', list: 'TOPS', slot: 'top' },
  { title: 'Jackets', list: 'JACKETS', slot: 'jacket' },
  { title: 'Pants & skirts', list: 'PANTS', slot: 'pants' },
  { title: 'Shoes', list: 'SHOES', slot: 'shoes' },
  { title: 'Hats', list: 'HATS', slot: 'hat', acc: true },
  { title: 'Glasses', list: 'GLASSES_LIST', slot: 'glasses', acc: true },
  { title: 'Earrings', list: 'EARRINGS', slot: 'earL', acc: true, mirror: 'earR' },
  { title: 'Piercings', list: 'PIERCINGS', slot: 'pierce', acc: true, multi: true },
  { title: 'Chains & necklaces', list: 'NECKLACES', slot: 'neck', acc: true },
  { title: 'Mobility', items: [['chair', 'Wheelchair']], slot: 'chair', acc: true },
];
