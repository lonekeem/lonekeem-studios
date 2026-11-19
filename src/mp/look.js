import * as THREE from 'three';
// The saved look (versioned JSON, ids are stable strings so old saves survive catalog growth). Pure data helpers, no three.js.
import * as C from './catalog.js';
export const LOOK_VERSION = 1;
const pick = (a, r) => a[Math.floor(r() * a.length)];
const rnd = (r, lo = -1, hi = 1) => lo + (hi - lo) * r();
const piece = (id, c, p = 0, c2 = '#ffffff', extra = {}) => ({ id, c, c2, p, ...extra });
export function defaultLook(base = 'mp_m1') {
  const f = base.startsWith('mp_f');
  return { v: LOOK_VERSION, name: 'Survivor', base, skin: { t: .38, u: 0 }, height: 0, morph: {}, 
    eyes: { s: 0, col: '#4a2c17', size: 0, space: 0, tilt: 0, lash: f ? .6 : 0 }, brows: { s: 0, thick: 0, arch: 0, col: null },
    nose: { s: 0 }, mouth: { s: 0, full: 0, width: 0, col: null }, makeup: { shadow: 0, shadowCol: '#7a4a8a', liner: 0, blush: 0, lip: 0, lipCol: '#b2264a' },
    skinx: { freckles: 0, moles: 0, scar: 0, scarSide: 1, tattoo: 0, tattooCol: '#1c2a3a', age: 0 },
    hair: { id: f ? 'longwave' : 'crew', c: '#2b1a10', c2: '#5a3b22', hl: .35 }, beard: { id: 'none', c: null, len: .35, dens: .8 }, stache: { id: 'none', c: null, len: .3, dens: .8 },
    mask: null,
    worn: { top: piece(f ? 'croptee' : 'tee', f ? '#e9dcc3' : '#2f5fa8'), jacket: null, pants: piece(f ? 'highjeans' : 'jeans', '#2f4a7a'), shoes: piece('sneaker', '#2b2d33', 0, '#4b4f57', { sole: '#f2f2f0' }), gloves: null },
    acc: { hat: null, glasses: null, earL: null, earR: null, pierce: [], neck: null, wristL: null, wristR: null, ringL: null, ringR: null, bag: null, belt: null } };
}
export function randomLook(base, seed = Date.now()) {
  let s = seed >>> 0; const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const b = base || pick(C.BASES, r).id; const f = b.startsWith('mp_f'); const L = defaultLook(b);
  L.skin = { t: r(), u: rnd(r) }; L.height = rnd(r) * .8; for (const g of Object.values(MORPH_KEYS)) for (const k of g) L.morph[k] = rnd(r) * .3;
  L.eyes = { s: Math.floor(r() * C.EYES.length), col: pick(C.SWATCH.eye.slice(0, 8), r), size: rnd(r) * .5, space: rnd(r) * .5, tilt: rnd(r) * .4, lash: f ? r() : r() * .2 };
  L.brows = { s: Math.floor(r() * C.BROWS.length), thick: rnd(r) * .5, arch: rnd(r) * .5, col: null }; L.nose = { s: Math.floor(r() * C.NOSES.length) }; L.mouth = { s: Math.floor(r() * C.MOUTHS.length), full: rnd(r) * .5, width: rnd(r) * .4, col: null };
  L.makeup = { shadow: f ? Math.floor(r() * 4) : 0, shadowCol: pick(C.SWATCH.shadow, r), liner: f ? Math.floor(r() * 4) : 0, blush: Math.floor(r() * 3), lip: f ? Math.floor(r() * 4) : 0, lipCol: pick(C.SWATCH.lip, r) };
  L.skinx = { freckles: r() < .3 ? Math.ceil(r() * 3) : 0, moles: r() < .3 ? Math.ceil(r() * 3) : 0, scar: r() < .15 ? Math.ceil(r() * 5) : 0, scarSide: r() < .5 ? 1 : -1, tattoo: r() < .15 ? Math.ceil(r() * 4) : 0, tattooCol: pick(C.SWATCH.tattoo, r), age: r() < .25 ? r() : 0 };
  const hs = C.HAIR.filter(h => h[2] === 'u' || h[2] === (f ? 'f' : 'm')); const hc = pick(C.SWATCH.hair.slice(0, 11), r); L.hair = { id: pick(hs, r)[0], c: r() < .06 ? pick(C.SWATCH.hair, r) : hc, c2: pick(C.SWATCH.hair.slice(0, 13), r), hl: r() };
  L.beard = { id: !f && r() < .4 ? pick(C.BEARDS, r)[0] : 'none', c: null, len: r(), dens: .5 + r() * .5 }; L.stache = { id: !f && r() < .2 ? pick(C.STACHES, r)[0] : 'none', c: null, len: r(), dens: .6 + r() * .4 };
  // tasteful outfits: coordinated palettes, mostly solid fabric, only quiet patterns (stripes, pinstripe, plaid, checker) in low-contrast tones
  const PAL = [['#f2f2f0', '#2f4a7a', '#8b5a3c', '#f2f2f0'], ['#1f6f78', '#3a3f4a', '#d8c68a', '#f2f2f0'], ['#8a8f98', '#17181b', '#4b4f57', '#17181b'], ['#e9dcc3', '#5b3a24', '#6b8e3d', '#c8a27a'], ['#2f5d3a', '#d8c68a', '#3a4a33', '#f2f2f0'], ['#7a1f1f', '#17181b', '#4b4f57', '#f2f2f0'],
    ['#4aa3c7', '#f2f2f0', '#2f4a7a', '#f2f2f0'], ['#e58fb0', '#4b4f57', '#c9ccd0', '#f2f2f0'], ['#17181b', '#2f4a7a', '#8a8f98', '#17181b'], ['#c8a27a', '#3a4a33', '#5b3a24', '#c8a27a'], ['#f2f2f0', '#17181b', '#c0392b', '#f2f2f0'], ['#6c4aa5', '#c9ccd0', '#17181b', '#f2f2f0']];
  const pal = pick(PAL, r); const QUIET = [0, 0, 0, 0, 0, 0, 1, 2]; const P = () => pick(QUIET, r); const tone = (c, k) => '#' + new THREE.Color(c).multiplyScalar(k).getHexString();
  const NOT = new Set(['wide', 'midiskirt', 'longskirt', 'miniskirt', 'overalls', 'kneeshorts', 'tube', 'tunic', 'sundress', 'sleevedress', 'minidress', 'maxidress', 'flowy', 'bodysuit', 'poncho', 'longcoat', 'parka', 'henley', 'oversize']); const gi = (list) => { const o = list.filter(t => (t[2] === 'u' || t[2] === (f ? 'f' : 'm')) && !NOT.has(t[0])); return pick(o, r)[0]; }; const cc = () => pick(C.SWATCH.cloth.slice(0, 18), r);
  L.worn = { top: piece(gi(C.TOPS), pal[0], P(), tone(pal[0], .7)), jacket: r() < .35 ? piece(gi(C.JACKETS), pal[2], 0, tone(pal[2], .7)) : null, pants: piece(gi(C.PANTS), pal[1], r() < .85 ? 0 : 1, tone(pal[1], .75)), shoes: (() => { const sc = pick(['#2b2d33', '#2b2d33', '#5b3a24', '#8a8f98', '#f2f2f0', '#2f4a7a'], r); return piece(gi(C.SHOES), sc, 0, tone(sc, .8), { sole: sc === '#f2f2f0' ? '#c9ccd0' : '#e8e6e0' }); })(), gloves: r() < .08 ? piece(pick(C.GLOVES, r)[0], '#17181b', 0) : null };
  const metal = () => Math.floor(r() * C.SWATCH.metal.length), gem = () => Math.floor(r() * C.SWATCH.gem.length); const it = (list, p) => r() < p ? { id: pick(list, r)[0], m: metal(), g: gem(), c: cc(), c2: cc(), p: 0 } : null;
  const ear = it(C.EARRINGS, f ? .75 : .2); L.acc = { hat: it(C.HATS.filter(h => !/beanie|hood|knit/i.test(h[0])), .15), glasses: it(C.GLASSES_LIST.filter(g => g[2] !== 'visor' && g[2] !== 'goggles'), .25), earL: ear, earR: ear && r() < .8 ? { ...ear } : null, pierce: r() < .15 ? [pick(C.PIERCINGS, r)[0]] : [], neck: it(C.NECKLACES, f ? .5 : .25), wristL: it(C.WRISTS, .3), wristR: null, ringL: it(C.RINGS, .25), ringR: null, bag: it(C.BAGS, .2), belt: it(C.BELTS, .2) };
  if (L.acc.hat && /hood|helmet|beanie/.test(L.acc.hat.id)) L.hair.id = L.hair.id; L.name = 'Random ' + (seed % 1000); return L;
}
export const MORPH_KEYS = { head: ['headSize', 'faceW', 'faceLen', 'forehead', 'browRidge', 'cheekbone', 'cheekFull', 'jaw', 'chin', 'chinW'], eyes: ['eyeDepth'], nose: ['noseW', 'noseLen', 'noseBridge', 'noseTip'], mouth: ['lipFull'], ears: ['earSize', 'earOut', 'earPoint'], body: ['muscle', 'weight', 'chest', 'shoulders', 'hips', 'legs', 'neck'] };
export function normalize(look) { // fill missing fields from the defaults (forward compatible)
  if (look && C.LEGACY_BASE[look.base]) look = { ...look, base: C.LEGACY_BASE[look.base] };
  const d = defaultLook(look?.base || 'mp_m1'); const mg = (a, b) => { if (b === undefined) return a; if (b === null) return null; if (typeof a !== 'object' || a === null || Array.isArray(a)) return b; const o = { ...a }; for (const k in b) o[k] = (k in a && typeof a[k] === 'object' && a[k] !== null && !Array.isArray(a[k])) ? mg(a[k], b[k]) : b[k]; return o; };
  const o = mg(d, look || {}); o.v = LOOK_VERSION; return o;
}
const KEY = 'atq.mp.look.v1', FAV = 'atq.mp.fav.v1', SLOTS = 'atq.mp.slots.v1';
const ls = { get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } } };
export const saveLook = l => ls.set(KEY, l);
export const loadLook = () => { const l = ls.get(KEY); return l ? normalize(l) : null; };
export const loadFavs = () => new Set(ls.get(FAV) || []); export const saveFavs = s => ls.set(FAV, [...s]);
export const loadSlots = () => ls.get(SLOTS) || []; export const saveSlots = a => ls.set(SLOTS, a);
export const exportCode = l => btoa(unescape(encodeURIComponent(JSON.stringify(l)))); export const importCode = s => { try { return normalize(JSON.parse(decodeURIComponent(escape(atob(s.trim()))))); } catch { return null; } };
