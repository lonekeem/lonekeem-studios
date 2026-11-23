// The saved look (versioned JSON, ids are stable strings so old saves survive catalog growth). Pure data helpers, no three.js.
import * as C from './catalog.js';
export const LOOK_VERSION = 1;
const pick = (a, r) => a[Math.floor(r() * a.length)];
const rnd = (r, lo = -1, hi = 1) => lo + (hi - lo) * r();
const piece = (id, c, p = 0, c2 = '#ffffff', extra = {}) => ({ id, c, c2, p, ...extra });
export function defaultLook(base = 'mp_m1') { // v2 defaults = the two reference characters (original designs, no logos)
  const f = base.startsWith('mp_f');
  if (f) return { v: LOOK_VERSION, name: 'Survivor', base, skin: { t: .3, u: .3 }, height: 0, morph: {},
    eyes: { s: 7, col: '#5a3418', size: .2, space: 0, tilt: .2, lash: .8 }, brows: { s: 2, thick: .1, arch: .2, col: '#1a110b' },
    nose: { s: 1 }, mouth: { s: 3, full: .2, width: .1, col: null }, makeup: { shadow: 0, shadowCol: '#7a4a8a', liner: 2, blush: 1, lip: 1, lipCol: '#c0707a' },
    skinx: { freckles: 2, moles: 0, scar: 0, scarSide: 1, tattoo: 0, tattooCol: '#1c2a3a', age: 0 },
    hair: { id: 'braids2', c: '#15100c', c2: '#3d2a1a', hl: .3 }, beard: { id: 'none', c: null, len: .35, dens: .8 }, stache: { id: 'none', c: null, len: .3, dens: .8 }, mask: null,
    worn: { top: piece('croptank', '#f4f4f2'), jacket: piece('cropzip', '#f4f4f2', 0, '#e6e6e4'), pants: piece('leggings', '#141416'), shoes: piece('sneaker', '#18181b', 0, '#2a2a2e', { sole: '#2a2a2e' }), gloves: null },
    acc: { hat: null, glasses: null, earL: { id: 'hoopMedium', m: 0, g: 0, c: '#d9b44a', c2: '#fff', p: 0 }, earR: { id: 'hoopMedium', m: 0, g: 0, c: '#d9b44a', c2: '#fff', p: 0 }, pierce: ['nose'], neck: null, wristL: null, wristR: null, ringL: null, ringR: null, bag: null, belt: null, chair: null }, pm: 0 };
  return { v: LOOK_VERSION, name: 'Survivor', base, skin: { t: .26, u: .2 }, height: 0, morph: {},
    eyes: { s: 0, col: '#3a7a52', size: .1, space: 0, tilt: 0, lash: 0 }, brows: { s: 3, thick: .3, arch: 0, col: '#3a2616' },
    nose: { s: 0 }, mouth: { s: 8, full: 0, width: 0, col: null }, makeup: { shadow: 0, shadowCol: '#7a4a8a', liner: 0, blush: 0, lip: 0, lipCol: '#b2264a' },
    skinx: { freckles: 0, moles: 0, scar: 0, scarSide: 1, tattoo: 0, tattooCol: '#1c2a3a', age: 0 },
    hair: { id: 'messy', c: '#5a3b22', c2: '#8a6238', hl: .45 }, beard: { id: 'full', c: '#6a4f38', len: .55, dens: .9 }, stache: { id: 'chevron', c: '#6a4f38', len: .5, dens: .9 }, mask: null,
    worn: { top: piece('tee', '#17181b'), jacket: null, pants: piece('cargojog', '#a9adb2'), shoes: piece('clog', '#1b1c1f', 0, '#2a2b2f', { sole: '#1b1c1f' }), gloves: null },
    acc: { hat: null, glasses: null, earL: null, earR: null, pierce: [], neck: null, wristL: null, wristR: null, ringL: null, ringR: null, bag: null, belt: null, chair: null } };
}
export function randomLook(base, seed = Date.now()) {
  let s = seed >>> 0; const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const b = base || pick(C.BASES, r).id; const f = b.startsWith('mp_f'); const L = defaultLook(b);
  L.skin = { t: r(), u: rnd(r) }; L.height = rnd(r) * .8; for (const g of Object.values(MORPH_KEYS)) for (const k of g) L.morph[k] = rnd(r) * .55;
  L.eyes = { s: Math.floor(r() * C.EYES.length), col: pick(C.SWATCH.eye, r), size: rnd(r) * .5, space: rnd(r) * .5, tilt: rnd(r) * .4, lash: f ? r() : r() * .2 };
  L.brows = { s: Math.floor(r() * C.BROWS.length), thick: rnd(r) * .5, arch: rnd(r) * .5, col: null }; L.nose = { s: Math.floor(r() * C.NOSES.length) }; L.mouth = { s: Math.floor(r() * C.MOUTHS.length), full: rnd(r) * .5, width: rnd(r) * .4, col: null };
  L.makeup = { shadow: f ? Math.floor(r() * 4) : 0, shadowCol: pick(C.SWATCH.shadow, r), liner: f ? Math.floor(r() * 4) : 0, blush: Math.floor(r() * 3), lip: f ? Math.floor(r() * 4) : 0, lipCol: pick(C.SWATCH.lip, r) };
  L.skinx = { freckles: r() < .3 ? Math.ceil(r() * 3) : 0, moles: r() < .3 ? Math.ceil(r() * 3) : 0, scar: r() < .15 ? Math.ceil(r() * 5) : 0, scarSide: r() < .5 ? 1 : -1, tattoo: r() < .15 ? Math.ceil(r() * 4) : 0, tattooCol: pick(C.SWATCH.tattoo, r), age: r() < .25 ? r() : 0 };
  const hs = C.HAIR.filter(h => h[2] === 'u' || h[2] === (f ? 'f' : 'm')); const hc = pick(C.SWATCH.hair.slice(0, 13), r); L.hair = { id: pick(hs, r)[0], c: r() < .1 ? pick(C.SWATCH.hair, r) : hc, c2: pick(C.SWATCH.hair.slice(0, 13), r), hl: r() };
  L.beard = { id: !f && r() < .4 ? pick(C.BEARDS, r)[0] : 'none', c: null, len: r(), dens: .5 + r() * .5 }; L.stache = { id: !f && r() < .2 ? pick(C.STACHES, r)[0] : 'none', c: null, len: r(), dens: .6 + r() * .4 };
  const cc = () => pick(C.SWATCH.cloth, r), P = () => Math.floor(r() * (r() < .6 ? 1 : C.PATTERNS.length)); const gi = (list) => { const o = list.filter(t => t[2] === 'u' || t[2] === (f ? 'f' : 'm')); return pick(o, r)[0]; };
  L.worn = { top: piece(gi(C.TOPS), cc(), P(), cc()), jacket: r() < .35 ? piece(gi(C.JACKETS), cc(), P(), cc()) : null, pants: piece(gi(C.PANTS), cc(), P(), cc()), shoes: piece(gi(C.SHOES), cc(), P(), cc(), { sole: pick(['#f2f2f0', '#17181b', '#c8a27a'], r) }), gloves: r() < .12 ? piece(pick(C.GLOVES, r)[0], cc(), 0) : null };
  const metal = () => Math.floor(r() * C.SWATCH.metal.length), gem = () => Math.floor(r() * C.SWATCH.gem.length); const it = (list, p) => r() < p ? { id: pick(list, r)[0], m: metal(), g: gem(), c: cc(), c2: cc(), p: 0 } : null;
  const ear = it(C.EARRINGS, f ? .75 : .2); L.acc = { hat: it(C.HATS, .25), glasses: it(C.GLASSES_LIST, .25), earL: ear, earR: ear && r() < .8 ? { ...ear } : null, pierce: r() < .15 ? [pick(C.PIERCINGS, r)[0]] : [], neck: it(C.NECKLACES, f ? .5 : .25), wristL: it(C.WRISTS, .3), wristR: null, ringL: it(C.RINGS, .25), ringR: null, bag: it(C.BAGS, .2), belt: it(C.BELTS, .2) };
  if (L.acc.hat && /hood|helmet|beanie/.test(L.acc.hat.id)) L.hair.id = L.hair.id; L.name = 'Random ' + (seed % 1000); return L;
}
export const MORPH_KEYS = { head: ['headSize', 'faceW', 'faceLen', 'forehead', 'cheekbone', 'cheekFull', 'jaw', 'chin', 'chinW'], eyes: [], nose: ['noseW', 'noseLen', 'noseBridge', 'noseTip'], mouth: ['lipFull'], ears: ['earSize', 'earOut'], body: ['muscle', 'weight', 'chest', 'shoulders', 'hips', 'legs', 'neck'] };
const HAIR_ALIAS = { dreadsshort: 'twists', afrotaper: 'afromini', wavefade: 'waves', hitop: 'curlfade', fauxhawk: 'mohawk', mullet: 'shoulder', shag: 'lob', balding: 'receding', topknot: 'manbun', bantu: 'spacebuns', curlybob: 'bob', sidebang: 'curtain', halfup: 'longstr', boxbraids: 'braids2', bobbraids: 'braids2', fringe: 'bowl' };
export function normalize(look) { // fill missing fields from the defaults (forward compatible)
  const mg = (a, b) => { if (b === undefined) return a; if (b === null) return null; if (typeof a !== 'object' || a === null || Array.isArray(a)) return b; const o = { ...a }; for (const k in b) o[k] = (k in a && typeof a[k] === 'object' && a[k] !== null && !Array.isArray(a[k])) ? mg(a[k], b[k]) : b[k]; return o; };
  const src = look ? JSON.parse(JSON.stringify(look)) : {}; // v2: two base bodies; old ids map onto the kept styles
  if (src.base === 'mp_m2') { src.base = 'mp_m1'; src.morph = Object.assign({ muscle: .6, shoulders: .4 }, src.morph || {}); }
  if (src.base === 'mp_f2') { src.base = 'mp_f1'; src.morph = Object.assign({ hips: .5, chest: .4, weight: .2 }, src.morph || {}); }
  const o = mg(defaultLook(src.base || 'mp_m1'), src); o.v = LOOK_VERSION;
  if (o.hair && !C.HAIR.some(h => h[0] === o.hair.id)) o.hair.id = HAIR_ALIAS[o.hair.id] || 'crew';
  if (o.beard && !C.BEARDS.some(h => h[0] === o.beard.id)) o.beard.id = ({ anchor: 'goatee', vandyke: 'circle', jawline: 'strap' })[o.beard.id] || 'none';
  if (o.stache && !C.STACHES.some(h => h[0] === o.stache.id)) o.stache.id = ({ toothbrush: 'pencil', fumanchu: 'horseshoe', imperial: 'handlebar', painter: 'chevron' })[o.stache.id] || 'none';
  if (o.mask && !C.MASKS.some(m => m[0] === o.mask.id)) o.mask = null;
  return o;
}
const KEY = 'atq.mp.look.v1', FAV = 'atq.mp.fav.v1', SLOTS = 'atq.mp.slots.v1';
const ls = { get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } } };
export const saveLook = l => ls.set(KEY, l);
export const loadLook = () => { const l = ls.get(KEY); return l ? normalize(l) : null; };
export const loadFavs = () => new Set(ls.get(FAV) || []); export const saveFavs = s => ls.set(FAV, [...s]);
export const loadSlots = () => ls.get(SLOTS) || []; export const saveSlots = a => ls.set(SLOTS, a);
export const exportCode = l => btoa(unescape(encodeURIComponent(JSON.stringify(l)))); export const importCode = s => { try { return normalize(JSON.parse(decodeURIComponent(escape(atob(s.trim()))))); } catch { return null; } };
