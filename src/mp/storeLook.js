// v1.9.28 "My Character": the old story "Customize Keem" screen (outfits / hair / face / skin & eyes / extras, bought with the shared cash)
// now dresses the player's own MULTIPLAYER avatar. Story Keem always keeps his canon look. Pure data: story selection -> mp look patch.
import { skinTone } from './shaders.js';
import * as C from './catalog.js';
import * as K from './look.js';
import { PRESETS, patIndex } from './cosmetics.js';

export const SEL_KEY = 'atq3.look'; // story-format selections (kept from the old screen, so earlier choices + owned outfits carry over)
const pat = (n) => Math.max(0, C.PATTERNS.indexOf(n));
const pc = (id, c, p = 0, c2 = '#ffffff', extra = {}) => ({ id, c, c2, p, ...extra });
const lum = (h) => { const n = parseInt(h.slice(1), 16); return ((n >> 16) * .3 + ((n >> 8) & 255) * .59 + (n & 255) * .11) / 255; };
const hex = (h) => (h && h.length === 4 ? '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3] : h);
const shade = (h, k) => { const n = parseInt(hex(h).slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, '0'); return '#' + f(n >> 16) + f((n >> 8) & 255) + f(n & 255); };

const HAIR = { crop: 'crew', hightop: 'curlfade', afro: 'afro', curls: 'curlcrop', puffs: 'afropuffs', braids: 'braids2', cornrows: 'cornrows', locs: 'dreads', waves: 'waves', buzz: 'buzz',
  pixie: 'pixie', wavy: 'longwave', curly: 'longcurl', short: 'messy', slick: 'slickback', long: 'longstr', bun: 'manbun', ponytail: 'ponylow', mohawk: 'mohawk', balding: 'receding', bald: 'bald' };
// face presets: [morph overrides, eye preset, brow preset, nose preset, mouth preset, age]
const FACE = { // v1.9.28: gentle morphs (strong values made tall egg-shaped heads); the eye / brow / nose / mouth presets carry the difference
  keem: [{ jaw: .1, faceW: .05 }, 0, 3, 2, 1, 0], soft: [{ jaw: -.2, cheekFull: .3 }, 1, 0, 1, 3, 0],
  strong: [{ jaw: .35, chinW: .25, cheekbone: .2 }, 11, 8, 4, 0, 0], narrow: [{ jaw: -.25, faceW: -.3, chinW: -.2 }, 3, 1, 7, 2, 0],
  round: [{ faceW: .3, cheekFull: .4, faceLen: -.25, chin: -.2 }, 7, 0, 1, 8, 0], sharp: [{ jaw: -.1, cheekbone: .35, chin: .15, faceW: -.1 }, 9, 6, 7, 7, 0],
  elder: [{ cheekFull: -.2, noseLen: .2 }, 6, 5, 3, 2, .6] };
const BEARD = { none: ['none', 'none'], stubble: ['stubble', 'none'], mustache: ['none', 'chevron'], goatee: ['goatee', 'chevron'], full: ['full', 'chevron'], jaw: ['strap', 'none'], boxed: ['boxed', 'none'], lumber: ['lumber', 'chevron'], circle: ['circle', 'chevron'], soul: ['soul', 'none'], strap: ['strap', 'none'], curtain: ['curtain', 'none'] };

export function skinToT(h) { // closest point on the mp skin ramp
  let best = 0, bd = 9; const c = hex(h); const n = parseInt(c.slice(1), 16); const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  for (let i = 0; i <= 100; i++) { const s = skinTone(i / 100, 0).clone().convertLinearToSRGB(); const d = (s.r - r) ** 2 + (s.g - g) ** 2 + (s.b - b) ** 2; if (d < bd) { bd = d; best = i / 100; } }
  return best;
}

export function outfitWorn(o) { // one story outfit -> mp garments + outfit accessories
  const id = o.id, acc = o.acc || [], P = o.camo ? pat('Camo') : o.plaid ? pat('Plaid') : o.stripe ? pat('Stripes') : 0;
  const sleeve = o.sleeve ?? .62; let top = sleeve <= .4 ? 'tee' : sleeve < .6 ? 'longtee' : 'tee';
  if (/^(chef|button|blouse|sheriff)$/.test(id)) top = sleeve < .5 ? 'tee' : 'henley'; if (o.jk === 3) top = 'sweat'; if (id === 'scrubs') top = 'vneck'; if (id === 'street') top = 'oversize';
  let jacket = null;
  if (o.jk === 1) { const j = /varsity/.test(id) ? 'varsity' : id === 'denim' ? 'denim' : /flannel|work|survivor/.test(id) ? 'shacket' : id === 'cardigan' ? 'cardigan' : id === 'boss' ? 'blazer' : id === 'trench' ? 'trench' : id === 'hunter' ? 'vest' : 'bomber';
    jacket = pc(j, o.jacket, P, P ? shade(o.jacket, .5) : (o.jsleeve || o.jacket)); }
  if (o.jk === 2) { const j = o.puff ? (o.long ? 'parka' : 'puffer') : id === 'biker' ? 'biker' : id === 'bomber' ? 'bomber' : id === 'track' ? 'windbreaker' : /tactical|scav/.test(id) ? 'vest' : id === 'poncho' ? 'poncho' : id === 'fire' ? 'longcoat' : 'zip';
    jacket = pc(j, o.jacket, P, o.jsleeve || shade(o.jacket, .8)); if (j === 'vest') top = 'longtee'; }
  if (o.jk === 3) jacket = null;
  const cam2 = shade(o.pants, .55); // camo / plaid second colour: a darker tone of the same cloth (white blotches looked wrong)
  const pants = pc(o.cargo || o.baggy ? 'cargojog' : /tactical|camo|scav|hunter|night/.test(id) ? 'cargo' : id === 'track' ? 'trackpants' : id === 'scrubs' ? 'joggers' : id === 'boss' ? 'dresspants' : 'jeans', o.pants, o.camo ? pat('Camo') : 0, cam2);
  const shoes = o.boots ? pc(/tactical|camo|scav|raider|night/.test(id) ? 'combat' : 'work', o.shoes, 0, shade(o.shoes, .8), { sole: '#1b1c1f' })
    : pc(o.sole ? 'chunky' : 'sneaker', o.shoes, 0, lum(o.shoes) > .6 ? '#d8d8d4' : shade(o.shoes, 1.3), { sole: lum(o.shoes) > .4 ? '#f2f2f0' : '#1b1c1f' });
  const worn = { top: pc(top, o.shirt, o.camo && !jacket ? pat('Camo') : (o.plaid && !jacket) ? pat('Plaid') : 0, shade(o.shirt, .55)), jacket, pants, shoes, gloves: acc.includes('gloves') ? pc('short', '#1c1c1f') : null };
  const it = (iid, c = '#2b2b30', c2 = '#f2f2f0', m = 3) => ({ id: iid, m, g: 0, c, c2, p: 0 });
  const hat = acc.includes('cap_back') ? it('capflat', '#17181b', '#f2f2f0') : acc.includes('cap_tac') ? it('capshort', '#3a4032') : acc.includes('cap_orange') ? it('capflat', '#e0601a') : acc.includes('beanie') ? it('beanie', '#3a3a40')
    : acc.includes('helmet_fire') ? it('hardhat', '#d8a020') : acc.includes('hood') ? it('hood', o.jacket || '#2a2a2e', shade(o.jacket || '#2a2a2e', .7)) : null;
  const mask = acc.includes('mask') /* v1.9.28: raider face masks (rmask/gasmask/bandana) dropped by default - they hid the whole face; the bandana is worn round the neck instead */ ? { id: 'surgical', c: '#2a2a2e', p: 0 } : null;
  const neck = acc.includes('bandana') ? it('scarf', '#7a1f1f') : acc.includes('scarf_red') ? it('scarf', '#b8282c') : acc.includes('chain') ? it('chainMid', '#d9b44a', '#fff', 0) : acc.includes('dogtags') ? it('chainMidtag', '#cfd3d8', '#fff', 1) : acc.includes('badge') ? it('lanyard', '#2a2a2e') : null;
  const goggles = acc.includes('goggles') ? Object.assign(it('goggles', '#2a2a2e', '#fff', 3), { g: 5 }) : null; // amber lenses, black strap
  return { worn, hat, mask, neck, goggles, bag: acc.includes('pack') ? it('packbig', '#3a4632') : null, belt: acc.includes('belt') || acc.includes('vest') ? it('beltwide', '#2a2018') : null };
}

// apply the story-format selection L onto mp look M, only for the given parts ('outfit','hair','face','skin','extra')
export function applySel(M, L, parts, OUTFIT) {
  M = K.normalize(JSON.parse(JSON.stringify(M || K.defaultLook('mp_m1')))); const has = (p) => parts.includes(p);
  M.morph = M.morph || {}; M.acc = M.acc || {};
  if (has('outfit') && OUTFIT[L.outfit]) { const w = outfitWorn(OUTFIT[L.outfit]); M.worn = w.worn; M.acc.hat = w.hat; M.mask = w.mask; M.acc.neck = w.neck; M.acc.belt = w.belt; M._og = w.goggles; M._obag = w.bag;
    if (w.goggles) M.acc.glasses = w.goggles; else if (!L.glasses) M.acc.glasses = null; if (w.bag) M.acc.bag = w.bag; else if (!L.pack) M.acc.bag = null; }
  if (has('hair')) { const hc = L.hairColor || '#0b0807'; M.hair = { id: HAIR[L.hair] || 'crew', c: hc, c2: shade(hc, 1.35), hl: .25 }; if (M.beard) M.beard.c = null; if (M.stache) M.stache.c = null; M.brows.col = null; }
  if (has('face')) { const f = FACE[L.face] || FACE.keem; for (const g of Object.values(K.MORPH_KEYS)) for (const k of g) if (!/muscle|weight|chest|shoulders|hips|legs|neck/.test(k)) delete M.morph[k]; Object.assign(M.morph, f[0]);
    M.eyes = { ...M.eyes, s: L.eyeShape != null ? L.eyeShape : f[1] }; M.brows = { ...M.brows, s: L.browStyle != null ? L.browStyle : f[2] }; M.nose = { s: L.noseStyle != null ? L.noseStyle : f[3] }; M.mouth = { ...M.mouth, s: L.mouthStyle != null ? L.mouthStyle : f[4] }; M.skinx = { ...M.skinx, age: f[5] };
    if (L.eyeSize != null) M.eyes.size = L.eyeSize;
    if (L.makeup) M.makeup = { ...M.makeup, shadow: L.makeup.shadow ?? M.makeup.shadow, liner: L.makeup.liner ?? M.makeup.liner, blush: L.makeup.blush ?? M.makeup.blush, lip: L.makeup.lip ?? M.makeup.lip, lipCol: L.makeup.lipCol || M.makeup.lipCol, shadowCol: L.makeup.shadowCol || M.makeup.shadowCol };
    const b = BEARD[L.beard] || BEARD.none; M.beard = { ...(M.beard || {}), id: b[0], c: null, len: .5, dens: .9 }; M.stache = { ...(M.stache || {}), id: L.stache || b[1], c: null, len: .45, dens: .9 }; }
  if (has('skin')) { M.skin = { t: skinToT(L.skin || '#6a4430'), u: .15 }; if (L.eyes) M.eyes = { ...M.eyes, col: L.eyes }; }
  if (has('extra')) { const g = M._og; M.acc.glasses = L.glasses ? (g || { id: 'squareclear', m: 3, g: 0, c: '#1b1b1d', c2: '#fff', p: 0 }) : (g || null);
    M.acc.bag = L.pack ? (M._obag || { id: 'pack', m: 0, g: 0, c: '#2e3a2a', c2: '#3a4632', p: 0 }) : (M._obag || null);
    const bd = L.build || 1; M.morph.weight = bd < .97 ? -.6 : bd > 1.05 ? .55 : 0; M.morph.muscle = bd > 1.05 ? .5 : bd < .97 ? -.2 : 0; M.morph.shoulders = bd > 1.05 ? .4 : bd < .97 ? -.3 : 0; }
  if (L.base && (L.base === 'mp_m1' || L.base === 'mp_f1')) M.base = L.base;
  if (L.parts) applyParts(M, L.parts);
  return M;
}
function pieceWorn(id, extra = {}) {
  const pr = PRESETS[id];
  if (pr) return { id: pr.id, c: extra.c || pr.c || '#888888', c2: extra.c2 || pr.c2 || '#ffffff', p: pr.p ? patIndex(pr.p) : (extra.p || 0) };
  return { id, c: extra.c || '#888888', c2: extra.c2 || '#ffffff', p: extra.p || 0, sole: extra.sole, lace: extra.lace, sp: extra.sp };
}
function pieceAcc(id, extra = {}) {
  return { id, m: extra.m ?? 1, g: extra.g ?? 0, c: extra.c || '#2b2b30', c2: extra.c2 || '#f2f2f0', p: extra.p || 0 };
}
export function applyParts(M, parts) {
  if (!parts) return M;
  M.worn = M.worn || {}; M.acc = M.acc || {};
  const val = v => (typeof v === 'string' ? { id: v } : v);
  for (const slot of ['top', 'jacket', 'pants', 'shoes', 'gloves']) {
    if (!(slot in parts)) continue;
    const v = parts[slot];
    if (v == null || v === 'none') { if (slot === 'jacket' || slot === 'gloves') M.worn[slot] = null; continue; }
    M.worn[slot] = pieceWorn(val(v).id, val(v));
  }
  for (const slot of ['hat', 'glasses', 'earL', 'earR', 'neck', 'bag', 'belt']) {
    if (!(slot in parts)) continue;
    const v = parts[slot];
    if (v == null || v === 'none') { M.acc[slot] = null; continue; }
    M.acc[slot] = pieceAcc(val(v).id, val(v));
  }
  if ('pierce' in parts) { const v = parts.pierce; M.acc.pierce = Array.isArray(v) ? v.filter(x => x && x !== 'none') : (v && v !== 'none' ? [typeof v === 'string' ? v : v.id] : []); }
  if ('chair' in parts) M.acc.chair = (parts.chair && parts.chair !== 'none') ? { id: 'chair' } : null;
  if (parts.earL && !('earR' in parts) && parts.earL !== 'none') M.acc.earR = M.acc.earL ? Object.assign({}, M.acc.earL) : null;
  return M;
}
export const ALL_PARTS = ['outfit', 'hair', 'face', 'skin', 'extra', 'clothes'];
// one-time migration: someone who customized on the old screen (atq3.look) but never opened multiplayer gets that look on their mp avatar
export function migrateOnce(OUTFIT) {
  try { if (localStorage.getItem('atq.mp.look.v1') || localStorage.getItem('atq.mp.migrated')) return; const raw = localStorage.getItem(SEL_KEY); localStorage.setItem('atq.mp.migrated', '1'); if (!raw) return;
    const L = JSON.parse(raw); if (!L || !L.outfit) return; K.saveLook(applySel(null, L, ALL_PARTS, OUTFIT)); } catch (e) { /* ignore */ }
}
