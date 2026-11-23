// Faces, hair, outfits and accessories for every character (v1.4.0).
// Everything is built procedurally from primitives (original, © Lone Keem Studios) in the CC0 Quaternius
// mannequin's bind-pose space, merged per bone into ONE vertex-coloured mesh (cheap: ~1 draw call per bone).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { stylizeFrag } from './chars.js';

export const SKINS = ['#f3d2bd', '#e6b89a', '#d9a98c', '#c68e6a', '#ad7652', '#8d5a3b', '#73482e', '#5b3a26', '#4a2c1c', '#3b2417', '#2d1b11'];
export const HAIR_COLORS = ['#0b0806', '#1d130c', '#3a2414', '#5a3a22', '#7a5a3a', '#a07a4a', '#c9a86a', '#8a3a1e', '#aaa69e', '#e8e4dc', '#6a2a6a', '#1e3a7a'];
export const HAIRS = { crop: 'Cropped', hightop: 'High-top fade', afro: 'Afro', curls: 'Short curls', puffs: 'Puffs', braids: 'Box braids', cornrows: 'Cornrows', locs: 'Locs', waves: 'Waves', buzz: 'Buzz cut',
  short: 'Short', slick: 'Slicked back', long: 'Long', bun: 'Bun', ponytail: 'Ponytail', mohawk: 'Mohawk', balding: 'Balding', bald: 'Bald' };
export const BEARDS = { none: 'None', stubble: 'Stubble', mustache: 'Mustache', goatee: 'Goatee', full: 'Full beard' };
export const EYES = ['#2a1608', '#3a2210', '#4a3018', '#3a4a2a', '#3a5a7a', '#5a6a72'];
export const FACES = {  // jaw width, jaw depth, nose width, lip size, brow tilt, eye size
  keem: { name: 'Keem', jaw: 1, chin: 1, nose: 1.1, lips: 1.1, brow: 0.06, eye: 1 }, soft: { name: 'Soft', jaw: .92, chin: .95, nose: 1, lips: 1.05, brow: 0.05, eye: 1.08 },
  strong: { name: 'Strong jaw', jaw: 1.14, chin: 1.08, nose: 1.1, lips: 1, brow: -0.12, eye: .95 }, narrow: { name: 'Narrow', jaw: .88, chin: 1.05, nose: .85, lips: .9, brow: 0, eye: 1 },
  round: { name: 'Round', jaw: 1.1, chin: .9, nose: 1.05, lips: 1.1, brow: 0.08, eye: 1.05 }, sharp: { name: 'Sharp', jaw: .96, chin: 1.12, nose: .95, lips: .95, brow: -0.18, eye: .92 },
  elder: { name: 'Weathered', jaw: 1.02, chin: .98, nose: 1.12, lips: .9, brow: -0.04, eye: .9 } };
const H = { x: 0, y: 1.588, z: -0.022, rx: .078, ry: .096, rz: .088 }; // head ellipsoid in bind space
// ---------- outfits (shader colours + accessory meshes) ----------
// jk: 0 none, 1 open jacket, 2 closed jacket/hoodie, 3 one-piece suit  · long: coat length 0..1 · camo 0/1 · boots 0/1
export const OUTFITS = [
  { id: 'varsityB', name: 'Varsity "B"', shirt: '#f4f3ee', pants: '#a2a6ac', shoes: '#17171a', sole: 1, baggy: .6, cargo: 1, rib: 1, jk: 1, jacket: '#16161a', jsleeve: '#efe6cf', decal: [0.075, 1.31, 0.085], decalTex: 'B', acc: ['cap_back'] },
  { id: 'purplehood', name: 'Purple Hoodie', shirt: '#7b4fb0', pants: '#35557f', shoes: '#7e5cb4', sole: 1, jk: 2, jacket: '#7b4fb0', decal: [0, 1.22, 0.15], decalTex: 'rabbit', acc: ['hoodDown'] },
  { id: 'flannelR', name: 'Red Flannel', shirt: '#cdb99b', pants: '#2f4a78', shoes: '#6a4426', boots: 1, jk: 1, jacket: '#a01e22', plaid: 2, jsl: .47, acc: ['bandage'] },
  { id: 'raider1', name: 'Raider (mask)', shirt: '#2a2a2e', pants: '#2e2e32', shoes: '#1e1a16', boots: 1, jk: 2, jacket: '#34343a', gloss: 1, acc: ['rmask', 'hood', 'gloves', 'belt'] },
  { id: 'raider2', name: 'Raider (goggles)', shirt: '#3a302c', pants: '#34322c', shoes: '#1e1a16', boots: 1, jk: 2, jacket: '#2c2628', gloss: 1, acc: ['goggles', 'bandana', 'gloves', 'belt'] },
  { id: 'classic', name: 'Classic Tee', shirt: '#ecebe6', pants: '#3a4a6a', shoes: '#efefe8', sleeve: .34 },
  { id: 'boss', name: 'The Boss', shirt: '#3a3a3c', pants: '#1c2230', shoes: '#18120e', boots: 1, jk: 1, jacket: '#141214', gloss: 1, acc: ['scarf_red'], price: 1500, lvl: 4 },
  { id: 'tactical', name: 'Tactical Gear', shirt: '#4a5040', pants: '#3e4436', shoes: '#2a2620', boots: 1, jk: 2, jacket: '#4a5040', acc: ['vest', 'kneepads', 'gloves', 'cap_tac'], price: 1200, lvl: 3 },
  { id: 'hoodmask', name: 'Hoodie & Mask', shirt: '#1a1a1c', pants: '#202024', shoes: '#111', jk: 2, jacket: '#1a1a1c', acc: ['hood', 'mask'], price: 400 },
  { id: 'biker', name: 'Biker Jacket', shirt: '#2a2a2a', pants: '#2a3040', shoes: '#151210', boots: 1, jk: 2, jacket: '#121012', gloss: 1, acc: ['gloves'], price: 700, lvl: 2 },
  { id: 'camo', name: 'Camo Fatigues', shirt: '#5a5e44', pants: '#5a5e44', shoes: '#2a2218', boots: 1, jk: 2, jacket: '#5a5e44', camo: 1, acc: ['dogtags'], price: 600 },
  { id: 'trench', name: 'Trench Coat', shirt: '#2a2a2a', pants: '#2a2a2e', shoes: '#1a1410', boots: 1, jk: 1, jacket: '#7a6446', long: 1, acc: ['trench'], price: 900, lvl: 2 },
  { id: 'scav', name: 'Armored Scavenger', shirt: '#4a3e30', pants: '#3a3428', shoes: '#2a2018', boots: 1, jk: 2, jacket: '#5a4a38', acc: ['vest', 'pads', 'kneepads', 'gloves', 'goggles', 'pack'], price: 2000, lvl: 5 },
  { id: 'hazmat', name: 'Hazmat Suit', shirt: '#d8b828', pants: '#d8b828', shoes: '#1a1a1a', boots: 1, jk: 3, jacket: '#d8b828', acc: ['gasmask', 'gloves'], price: 1800, lvl: 6 },
  { id: 'varsity', name: 'Varsity Jacket', shirt: '#ecebe6', pants: '#2a3a5a', shoes: '#efefe8', jk: 1, jacket: '#8a1a22', jsleeve: '#e8e0cc', price: 500 },
  { id: 'street', name: 'Streetwear', shirt: '#e0782a', pants: '#3a3a30', shoes: '#efefe8', sleeve: .4, acc: ['cap_back', 'chain'], price: 450 },
  { id: 'hoodie', name: 'Grey Hoodie', shirt: '#7a7a7e', pants: '#2a2a30', shoes: '#efefe8', jk: 2, jacket: '#7a7a7e', acc: ['hood'], price: 150 },
  { id: 'flannel', name: 'Flannel', shirt: '#ecebe6', pants: '#3a4a6a', shoes: '#5a3a22', boots: 1, jk: 1, jacket: '#8a2222', plaid: 1, price: 250 },
  { id: 'denim', name: 'Denim Jacket', shirt: '#2a2a2c', pants: '#2a2a30', shoes: '#efefe8', jk: 1, jacket: '#4a6a90', price: 300 },
  { id: 'track', name: 'Track Suit', shirt: '#1e2a5a', pants: '#1e2a5a', shoes: '#efefe8', jk: 2, jacket: '#1e2a5a', stripe: 1, price: 350 },
  { id: 'puffer', name: 'Puffer Jacket', shirt: '#222', pants: '#2a2a30', shoes: '#efefe8', jk: 2, jacket: '#1a1a1e', puff: 1, price: 650, lvl: 2 },
  { id: 'poncho', name: 'Rain Poncho', shirt: '#d8c02a', pants: '#2a3040', shoes: '#2a2a2a', boots: 1, jk: 2, jacket: '#d8c02a', long: .7, acc: ['hood', 'trench'], price: 300 },
  { id: 'overalls', name: 'Mechanic Overalls', shirt: '#2a4a7a', pants: '#2a4a7a', shoes: '#2a2018', boots: 1, jk: 3, jacket: '#2a4a7a', grimeK: .4, acc: ['gloves'], price: 400 },
  { id: 'hunter', name: 'Hunter', shirt: '#5a5e44', pants: '#5a5e44', shoes: '#3a2a1a', boots: 1, camo: 1, jk: 1, jacket: '#e0601a', acc: ['cap_orange'], price: 550 },
  { id: 'fire', name: 'Firefighter', shirt: '#2a2a26', pants: '#8a7a50', shoes: '#151515', boots: 1, jk: 2, jacket: '#8a7a50', long: .5, reflect: 1, acc: ['helmet_fire', 'trench'], price: 1600, lvl: 5 },
  { id: 'scrubs', name: 'Scrubs', shirt: '#2a8a8a', pants: '#2a8a8a', shoes: '#efefe8', sleeve: .36, price: 200 },
  { id: 'night', name: 'Night Runner', shirt: '#111114', pants: '#111114', shoes: '#111', jk: 2, jacket: '#111114', acc: ['bandana', 'gloves'], price: 800, lvl: 3 },
  { id: 'survivor', name: 'Survivor', shirt: '#6a6a5a', pants: '#3a3a30', shoes: '#3a2a1a', boots: 1, jk: 1, jacket: '#3a4a32', grimeK: .35, acc: ['pack', 'bandage'], price: 350 },
  { id: 'bomber', name: 'Bomber', shirt: '#ecebe6', pants: '#202024', shoes: '#18120e', boots: 1, jk: 2, jacket: '#44502e', acc: [], price: 450 },
  { id: 'parka', name: 'Winter Parka', shirt: '#333', pants: '#2a2a30', shoes: '#3a2a1a', boots: 1, jk: 2, jacket: '#2a3a52', puff: 1, long: .35, acc: ['beanie'], price: 700 },
  { id: 'sheriff', name: 'Deputy', shirt: '#b09a6a', pants: '#3a3a2e', shoes: '#151210', boots: 1, sleeve: .45, acc: ['badge', 'cap_tac'], price: 1000, lvl: 4 },
  { id: 'chef', name: 'Diner Cook', shirt: '#efefe8', pants: '#2a2a2a', shoes: '#151515', sleeve: .4, acc: ['apron'], price: 200 },
  { id: 'work', name: 'Work Jacket', shirt: '#6a6a6e', pants: '#2e3440', shoes: '#4a3018', boots: 1, jk: 1, jacket: '#7a5a34', price: 300 },
  { id: 'cardigan', name: 'Cardigan', shirt: '#ddd8c8', pants: '#4a4234', shoes: '#3a2a1a', jk: 1, jacket: '#5a6048', price: 150 },
  { id: 'pinkhood', name: 'Pink Hoodie', shirt: '#d87a9a', pants: '#8a7aa8', shoes: '#efefe8', jk: 2, jacket: '#d87a9a', price: 150 },
  { id: 'blouse', name: 'Blouse', shirt: '#7a2e3a', pants: '#2a2a2a', shoes: '#2a1a14', sleeve: .5, price: 150 },
  { id: 'button', name: 'Button-up', shirt: '#2a4a6a', pants: '#3a3a3a', shoes: '#2a1a14', sleeve: .58, price: 150 },
  { id: 'smock', name: 'Barber Smock', shirt: '#e8e2d2', pants: '#2a2a2a', shoes: '#151515', sleeve: .45 },
];
export const OUTFIT = Object.fromEntries(OUTFITS.map(o => [o.id, o]));
export const DEFAULT_LOOK = { rig: 'keem', outfit: 'varsityB', hair: 'crop', hairColor: '#0b0806', skin: '#6a4430', face: 'keem', eyes: '#2a1608', beard: 'jaw', pack: false, glasses: true, build: 1, seed: 7 };
// Story cast: each one distinct (hair, face, skin, build, clothes)
export const CAST = {
  keem: DEFAULT_LOOK,
  marcus: { rig: 'dad', outfit: 'flannelR', hair: 'crop', hairColor: '#120c08', skin: '#6a4430', face: 'strong', eyes: '#2a1608', beard: 'jaw', build: 1.12, seed: 3, grey: .18 },
  nia: { rig: 'nia', outfit: 'purplehood', hair: 'puffs', hairColor: '#160d07', skin: '#7a4f36', face: 'soft', eyes: '#3a2210', beard: 'none', build: .95, seed: 11, headK: 1.42, eyeK: 1.12 },
  walt: { rig: 'walt', outfit: 'cardigan', hair: 'balding', hairColor: '#b8b4ac', skin: '#d9a98c', face: 'elder', eyes: '#3a5a7a', beard: 'mustache', glasses: true, build: 1.08, seed: 5 },
  ruth: { rig: 'ruth', outfit: 'blouse', hair: 'bun', hairColor: '#7a4a2a', skin: '#e6b89a', face: 'narrow', eyes: '#3a4a2a', beard: 'none', build: .96, seed: 8 },
  dube: { rig: 'dube', outfit: 'button', hair: 'buzz', hairColor: '#8a8680', skin: '#3b2417', face: 'round', eyes: '#2a1608', beard: 'goatee', glasses: true, build: 1.16, seed: 9 },
  gus: { rig: 'gus', outfit: 'smock', hair: 'bald', hairColor: '#2a2018', skin: '#c68e6a', face: 'strong', eyes: '#3a2210', beard: 'full', build: 1.25, seed: 4 },
  reyes: { rig: 'reyes', outfit: 'scrubs', hair: 'curls', hairColor: '#120b08', skin: '#6a4430', face: 'soft', eyes: '#2a1608', beard: 'none', build: .97, seed: 21 },
  tuck: { rig: 'tuck', outfit: 'hoodie', hair: 'short', hairColor: '#b08a4a', skin: '#d9a98c', face: 'round', eyes: '#5a4a2a', beard: 'none', build: .9, seed: 22 },
  dana: { rig: 'genf', outfit: 'scrubs', hair: 'long', hairColor: '#1a0f0a', skin: '#7a4f36', face: 'soft', eyes: '#3a2210', beard: 'none', build: .98, seed: 31 },
  vance: { rig: 'vance', outfit: 'scrubs', hair: 'ponytail', hairColor: '#b8b09a', skin: '#e6c4ac', face: 'narrow', eyes: '#5a6a8a', beard: 'none', build: 1, seed: 23 },
};
const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];
export function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// a random but natural-looking townsperson (victims, zombies)
// v2.1 zombie variety: ~28% original v1.9.7 procedural bodies (null = procedural; also the automatic fallback if a model fails to load) + the cartoon zombie set
export const ZED_RIGS = ['zombie2', 'zombie_male', 'zombie_office', 'zombie_elder', 'zombie_big', 'zombie_cop', 'zombie_worker'];
function zedRig(seed) { const r = mulberry(seed * 31 + 3); const a = r(); if (a < .28) return null; return ZED_RIGS[Math.floor(r() * ZED_RIGS.length) % ZED_RIGS.length]; }
export function randomLook(seed, zed) { const r = mulberry(seed * 9973 + 1); const fem = r() < .5;
  const hairs = fem ? ['long', 'bun', 'ponytail', 'curls', 'braids', 'afro', 'locs', 'puffs', 'short', 'mohawk'] : ['short', 'buzz', 'waves', 'curls', 'balding', 'bald', 'slick', 'locs', 'cornrows', 'afro', 'hightop', 'mohawk'];
  const casual = zed
    ? ['classic', 'hoodie', 'flannel', 'denim', 'track', 'scrubs', 'work', 'cardigan', 'blouse', 'button', 'chef', 'street', 'bomber', 'parka', 'overalls', 'pinkhood', 'survivor', 'smock', 'camo', 'trench', 'hazmat', 'hunter', 'poncho', 'puffer', 'night', 'sheriff', 'fire']
    : ['classic', 'hoodie', 'flannel', 'denim', 'track', 'scrubs', 'work', 'cardigan', 'blouse', 'button', 'chef', 'street', 'bomber', 'parka', 'overalls', 'pinkhood', 'survivor', 'denim'];
  const hc = r() < .18 ? '#aaa69e' : r() < .08 ? '#c9a86a' : pick(r, HAIR_COLORS.slice(0, 8));
  const builds = zed ? [{ build: .76, height: 1.05 }, { build: 1, height: 1 }, { build: 1.32, height: .97 }, { build: .88, height: 1.16 }, { build: 1.12, height: .86 }] : null;
  const bd = builds ? pick(r, builds) : { build: .9 + r() * .3, height: .93 + r() * .12 };
  return { outfit: pick(r, casual), hair: pick(r, hairs), hairColor: hc, skin: pick(r, SKINS), face: pick(r, Object.keys(FACES)), eyes: pick(r, EYES), beard: fem ? 'none' : pick(r, ['none', 'none', 'stubble', 'mustache', 'goatee', 'full']),
    glasses: r() < .15, build: bd.build, height: bd.height, seed: seed | 0, tint: [r(), r(), r()], fem, zed, rig: zed ? zedRig(seed) : (mulberry(seed * 17 + 5)() < .35 ? null : (fem ? 'genf' : 'genm')) }; // v1.9.12: zombies mix old procedural look + original + 6 new rigs; ~35% of townspeople/victims keep the original procedural look
}
// Voice profile for a zombie: matches the visible body (named rig, then gender/size).
//   male / female / teen_m / teen_f / elder / brute / gurgler / boss_m / boss_f
// Named male rigs always stay male even if randomLook rolled fem (the mesh is a man).
// zombie_office is the Lunch Lady body and also generic office undead — use fem when set.
// Procedural (rig null) and zombie2 use the stored fem flag + build/height.
const FEM_HAIR = new Set(['long', 'bun', 'ponytail', 'braids', 'puffs']);
export function lookIsFem(look) {
  if (!look) return false;
  if (look.fem === true) return true;
  if (look.fem === false) return false;
  if (look.rig === 'genf') return true;
  if (look.rig === 'genm') return false;
  if (look.beard && look.beard !== 'none') return false;
  return FEM_HAIR.has(look.hair);
}
export function zVoiceProfile(look, o = {}) {
  const fem = o.fem != null ? !!o.fem : lookIsFem(look);
  const rig = (look && look.rig) || null;
  const boss = !!(o.boss || (look && look.boss));
  const kind = o.kind || (look && look.kind) || '';
  if (!boss && kind === 'runner') return 'runner';
  if (!boss && kind === 'tank') return 'tank';
  if (!boss && kind === 'spitter') return 'spitter';
  if (boss) return (fem || rig === 'zombie_office') ? 'boss_f' : 'boss_m';
  if (rig === 'zombie_big') return 'brute';
  if (rig === 'zombie_elder') return 'elder';
  if (rig === 'zombie_male' || rig === 'zombie_cop' || rig === 'zombie_worker') return 'male';
  if (rig === 'zombie_office') return fem ? 'female' : 'gurgler';
  const build = (look && look.build) || 1, height = (look && look.height) || 1, seed = (look && look.seed) || 0;
  if (fem) return (build < .96 || height < .96) ? 'teen_f' : 'female';
  if (build > 1.15) return 'brute';
  if (build < .95 || height < .96) return 'teen_m';
  if (seed % 5 === 0) return 'gurgler';
  return 'male';
}
export function zVoiceAssign(look, o = {}) {
  const profile = zVoiceProfile(look, o);
  const r = mulberry(((look && look.seed) || 1) * 9137 + 17 + (profile.length * 13));
  let lo = .92, hi = 1.08;
  if (profile === 'runner') { lo = 1.06; hi = 1.18; }
  else if (profile === 'tank') { lo = .78; hi = .90; }
  else if (profile === 'spitter') { lo = .88; hi = 1.04; }
  else if (profile === 'brute' || profile === 'boss_m') { lo = .86; hi = .98; }
  else if (profile === 'elder') { lo = .88; hi = 1.02; }
  else if (profile === 'teen_f') { lo = 1.02; hi = 1.14; }
  else if (profile === 'teen_m') { lo = .98; hi = 1.10; }
  else if (profile === 'female' || profile === 'boss_f') { lo = .96; hi = 1.10; }
  else if (profile === 'gurgler') { lo = .90; hi = 1.06; }
  if (look && look.rig === 'zombie_cop') { lo = .97; hi = 1.07; }
  if (look && look.rig === 'zombie_worker') { lo = .88; hi = 1.00; }
  const pitch = lo + r() * (hi - lo);
  return { profile, pitch, fem: !!(o.fem != null ? o.fem : lookIsFem(look)) };
}
// raiders: masked, leather-jacketed scavengers (same avatar style as everyone else)
export function raiderLook(seed) { const r = mulberry(seed * 7331 + 5); const L = randomLook(seed, false); L.rig = 'raider'; L.outfit = r() < .6 ? 'raider1' : 'raider2'; L.tint = [r(), r(), r()]; L.hair = 'short'; L.hairColor = '#150f0a'; L.beard = 'none'; L.glasses = false; return L; }
// recolour outfit pieces per person so neighbours never match
function tintC(hex, t, amt) { const c = new THREE.Color(hex); const hsl = {}; c.getHSL(hsl); c.setHSL((hsl.h + (t[0] - .5) * amt) % 1, Math.min(1, hsl.s * (.7 + t[1] * .6)), Math.min(.92, hsl.l * (.75 + t[2] * .5))); return '#' + c.getHexString(); }
// shader look for bodyMat()
export function bodyLook(L) { const o = OUTFIT[L.outfit] || OUTFITS[0]; const t = L.tint, k = t ? .25 : 0; const tc = (h) => (t ? tintC(h, t, k) : h);
  const skin = L.zed ? zSkin(L.skin, L) : L.skin;
  return { skin, shirt: tc(o.shirt), pants: tc(o.pants), shoes: o.shoes, hair: L.hairColor, sleeve: o.jk ? (o.jsl ?? .62) : (o.sleeve ?? .4), jk: o.jk || 0, jacket: tc(o.jacket || o.shirt), jsleeve: o.jsleeve ? tc(o.jsleeve) : null,
    long: o.long || 0, camo: o.camo || 0, boots: o.boots || 0, gloves: (o.acc || []).includes('gloves') ? 1 : 0, plaid: o.plaid || 0, stripe: o.stripe || o.reflect || 0, gloss: o.gloss || 0, grime: o.grimeK || 0, puff: o.puff || 0,
    baggy: o.baggy || 0, cargo: o.cargo || 0, sole: o.sole || 0, rib: o.rib || 0, decal: o.decal || null, decalTex: o.decalTex || null }; }
export function zSkin(hex, look) { const c = new THREE.Color(hex); const tint = (look && look.decayTint) || '#7f9f70'; const mix = look && look.decayMix != null ? look.decayMix : .78; return '#' + c.lerp(new THREE.Color(tint), mix).multiplyScalar(.88).getHexString(); }
// ---------- geometry helpers ----------
const M4 = THREE.Matrix4, V = THREE.Vector3, Q = THREE.Quaternion, E = THREE.Euler;
const mat = (x, y, z, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) => new M4().compose(new V(x, y, z), new Q().setFromEuler(new E(rx, ry, rz)), new V(sx, sy, sz));
class Parts { constructor() { this.by = {}; }
  add(bone, geo, color, m) { let g = geo.index ? geo.toNonIndexed() : geo.clone(); if (m) g.applyMatrix4(m); g.deleteAttribute('uv'); const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); (this.by[bone] = this.by[bone] || []).push(g); } }
const SPH = new THREE.SphereGeometry(1, 20, 14), SPHL = new THREE.SphereGeometry(1, 12, 8), ICO = new THREE.IcosahedronGeometry(1, 1), BOX = new THREE.BoxGeometry(1, 1, 1), CYL = new THREE.CylinderGeometry(1, 1, 1, 10), TOR = new THREE.TorusGeometry(1, .3, 8, 20);
const cap = (theta) => new THREE.SphereGeometry(1, 22, 12, 0, Math.PI * 2, 0, theta);
const ring = (t0, t1) => new THREE.SphereGeometry(1, 22, 10, 0, Math.PI * 2, t0, t1 - t0);
export const MAT = { std: null, gloss: null };
function partsMat(gloss) { const k = gloss ? 'gloss' : 'std'; if (MAT[k]) return MAT[k]; const m = MAT[k] = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: gloss ? .35 : .62, metalness: 0 }); m.onBeforeCompile = (sh) => stylizeFrag(sh, 1.1, .16); m.customProgramCacheKey = () => 'parts' + k; return m; }
const dark = (hex, k) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();
const mix = (a, b, k) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString();
// curls: many small icospheres scattered over a region of the head ellipsoid
function curls(P, r, col, n, f) { for (let i = 0; i < n; i++) { const p = f(r); if (!p) continue; const s = p[3] || (.016 + r() * .012); const c2 = r() < .3 ? dark(col, 1.35) : r() < .5 ? dark(col, .8) : col;
  P.add('DEF-head', ICO, c2, mat(p[0], p[1], p[2], s, s * (.85 + r() * .3), s, r() * 3, r() * 3, 0)); } }
const onHead = (u, v, k) => [H.x + Math.sin(v) * Math.cos(u) * H.rx * k, H.y + Math.cos(v) * H.ry * k, H.z + Math.sin(v) * Math.sin(u) * H.rz * k];
// ---------- head, face, hair ----------
export function buildHead(P, L) { const r = mulberry((L.seed || 1) * 131 + 7); const F = FACES[L.face] || FACES.keem; const skin = L.zed ? zSkin(L.skin, L) : L.skin;
  const hc = L.grey ? mix(L.hairColor, '#9a968e', L.grey) : L.hairColor, hd = dark(hc, .8), B = 'DEF-head';
  P.add(B, SPH, skin, mat(H.x, H.y, H.z, H.rx, H.ry, H.rz)); // cranium
  P.add(B, SPH, skin, mat(0, 1.537, -0.004, .061 * F.jaw, .052 * F.chin, .07)); // jaw/cheeks
  P.add(B, SPH, skin, mat(0, 1.512, .028, .03 * F.jaw, .022, .034)); // chin
  P.add('DEF-neck', CYL, skin, mat(0, 1.49, -.03, .042, .1, .042));
  [-1, 1].forEach(s => { P.add(B, SPH, dark(skin, .93), mat(s * .078, 1.588, -.03, .012, .024, .016)); // ears
    P.add(B, SPH, skin, mat(s * .046, 1.572, .036, .022, .016, .02)); // cheekbones
    // big, glossy cartoon eyes (v2.0 stylized avatar look)
    const ex = s * .034, ey = 1.603, es = .0168 * F.eye * (L.eyeK || 1), lidc = L.zed ? '#2a2a22' : dark(skin, .42);
    P.add(B, SPH, L.zed ? '#e4e6c4' : '#fbf8f2', mat(ex, ey, .0505, es, es * 1.04, es * .62));
    if (!L.zed) { P.add(B, SPHL, L.eyes || '#2a1608', mat(ex, ey - .0008, .0585, es * .74, es * .78, es * .24)); P.add(B, SPHL, '#060403', mat(ex, ey - .0008, .0615, es * .4, es * .42, es * .12)); P.add(B, SPHL, '#ffffff', mat(ex + s * .0042, ey + .0058, .0632, .0027)); P.add(B, SPHL, '#ffffff', mat(ex - s * .0035, ey - .004, .0632, .0012)); }
    else { P.add(B, SPHL, '#c9d2a0', mat(ex, ey, .0585, es * .6, es * .62, es * .22)); P.add(B, SPHL, '#0a0806', mat(ex, ey, .0615, es * .16, es * .17, es * .1)); P.add(B, SPH, '#3a2a36', mat(ex, ey - es * 1.18, .047, es * 1.2, es * .38, es * .5)); P.add(B, SPH, '#8a1010', mat(ex + s * es * .75, ey + es * .15, .0525, es * .06, es * .5, es * .3)); }
    P.add(B, SPH, lidc, mat(ex, ey + es * .86, .0535, es * 1.12, es * .22, es * .62, -.06 * s)); // upper lash line
    P.add(B, SPH, dark(skin, .9), mat(ex, ey + es * 1.02, .0505, es * 1.15, es * .42, es * .68)); // lid
    const bt = L.zed ? '#2a2620' : dark(hd, .62), tilt = L.zed ? -s * .35 : s * F.brow * 1.4;
    P.add(B, BOX, bt, mat(ex + s * .002, 1.6385, .0562, .034, .0078, .009, 0, 0, tilt)); P.add(B, BOX, bt, mat(ex - s * .012, 1.6355 - s * 0 + tilt * -.0, .0565, .012, .0075, .009, 0, 0, tilt * .5)); // brow
    P.add(B, SPH, dark(skin, .82), mat(s * .0085, 1.575, .0745, .0085 * F.nose, .0065, .007)); }); // nostril wings
  P.add(B, SPH, skin, mat(0, 1.587, .066, .0085 * F.nose, .02, .013)); P.add(B, SPH, skin, mat(0, 1.5775, .0745, .0105 * F.nose, .0088, .0095)); // nose bridge + tip
  const lip = L.zed ? '#3a1a1a' : mix(dark(skin, .78), '#8a3a3a', .25);
  if (!L.zed) { P.add(B, SPH, lip, mat(0, 1.5485, .0615, .02 * F.lips, .0058 * F.lips, .009)); P.add(B, SPH, dark(lip, 1.06), mat(0, 1.5405, .0595, .0185 * F.lips, .0068 * F.lips, .009));
    P.add(B, new THREE.TorusGeometry(1, .09, 5, 14, Math.PI * .8), dark(lip, .5), mat(0, 1.5535, .0645, .0235, .0085, .004, 0, 0, Math.PI * 1.1)); // smile
    [-1, 1].forEach(s => P.add(B, SPH, dark(skin, .93), mat(s * .0245, 1.5535, .0585, .0036, .0036, .003))); } // dimples
  else { P.add(B, SPH, '#240606', mat(0, 1.5405, .0585, .026, .0155, .011)); for (let i = -2; i <= 2; i++) { P.add(B, BOX, '#d8d2b4', mat(i * .0095, 1.5525, .063, .0058, .0075, .003)); if (Math.abs(i) < 2) P.add(B, BOX, '#cfc9ad', mat(i * .0095, 1.5285, .06, .005, .006, .003)); } }
  // beard
  const bc = L.zed ? '#2a2620' : hc; const bd = L.beard || 'none';
  if (bd === 'stubble') P.add(B, new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 1.45, 1.4), mix(skin, bc, .4), mat(0, 1.545, -0.002, .0635 * F.jaw, .058 * F.chin, .073));
  if (bd === 'jaw') { P.add(B, new THREE.SphereGeometry(1, 22, 10, -.3, Math.PI + .6, 1.7, 1.0), bc, mat(0, 1.545, -.002, .0655 * F.jaw, .0605 * F.chin, .0755)); P.add(B, SPH, bc, mat(0, 1.5265, .052, .02, .012, .014)); P.add(B, SPH, bc, mat(0, 1.5605, .0655, .021, .0045, .009)); }
  if (bd === 'full') { P.add(B, new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 1.35, 1.6), bc, mat(0, 1.545, 0, .068 * F.jaw, .065 * F.chin, .078)); curls(P, r, bc, 40, (r) => { const u = r() * Math.PI * 2, v = 1.9 + r() * .9; const p = [Math.sin(v) * Math.cos(u) * .07, 1.545 + Math.cos(v) * .06, Math.sin(v) * Math.sin(u) * .078]; return p[2] > -.03 ? [p[0], p[1], p[2], .011] : null; }); }
  if (bd === 'full' || bd === 'mustache' || bd === 'goatee') P.add(B, SPH, bc, mat(0, 1.556, .066, .026, .0075, .011));
  if (bd === 'goatee') P.add(B, SPH, bc, mat(0, 1.515, .05, .022, .02, .016));
  // hair
  const st = L.hair || 'short'; const shell = (k, th, tilt, c = hc) => P.add(B, cap(th), c, mat(H.x, H.y + .004, H.z - .004, H.rx * k, H.ry * k, H.rz * k, tilt, 0, 0));
  const fade = () => { shell(1.025, 1.95, -.55, mix(skin, hc, .62)); shell(1.03, 1.45, -.5, mix(skin, hc, .85)); }; // faded sides, sharp lineup at the front
  if (st === 'hightop') { fade(); P.add(B, CYL, dark(hc, 1.1), mat(0, 1.662, -.022, .077, .058, .085)); P.add(B, SPH, dark(hc, 1.1), mat(0, 1.718, -.022, .077, .01, .085)); curls(P, r, hc, 300, (r) => { const u = r() * Math.PI * 2, v = Math.acos(1 - r() * .75); const p = onHead(u, v, 1.0); if (p[2] > .05 && p[1] < 1.655) return null; const lift = Math.max(0, p[1] - 1.61) * 1.2;
    return [p[0] * 1.0, Math.min(1.724, p[1] + lift + .003), p[2] * 1.0, .009 + r() * .006]; }); }
  if (st === 'curls') { shell(1.04, 1.75, -.4); curls(P, r, hc, 110, (r) => { const u = r() * Math.PI * 2, v = Math.acos(1 - r() * 1.1); const p = onHead(u, v, 1.06); return p[2] > .06 && p[1] < 1.65 ? null : p; }); }
  if (st === 'afro') { shell(1.05, 1.9, -.3); curls(P, r, hc, 240, (r) => { const u = r() * Math.PI * 2, v = Math.acos(1 - r() * 1.25); const k = 1.25 + r() * .2; const p = onHead(u, v, k); if (p[2] > .04 && p[1] < 1.64) return null; return [p[0], p[1] + .02, p[2] - .01, .024 + r() * .014]; }); }
  if (st === 'puffs') { shell(1.035, 1.9, -.35); [-1, 1].forEach(s => { const c = [s * .062, 1.678, -.035]; curls(P, r, hc, 70, (r) => { const u = r() * 6.28, v = Math.acos(2 * r() - 1), R = .05; return [c[0] + Math.sin(v) * Math.cos(u) * R, c[1] + Math.cos(v) * R, c[2] + Math.sin(v) * Math.sin(u) * R, .017 + r() * .01]; }); P.add(B, TOR, '#d85a8a', mat(s * .055, 1.648, -.03, .022, .022, .022, Math.PI / 2, 0, s * .5)); }); }
  if (st === 'braids' || st === 'cornrows') { shell(1.035, 1.85, -.35); for (let i = -4; i <= 4; i++) P.add(B, cap(1.8), dark(hc, 1.3), mat(H.x + i * .016, H.y + .006, H.z - .004, .008, H.ry * 1.045, H.rz * 1.045, -.35, 0, 0));
    if (st === 'braids') for (let i = 0; i < 12; i++) { const a = -2.2 + i / 11 * 4.4; const x = Math.sin(a) * .075, z = -.025 - Math.cos(a) * .075; P.add(B, CYL, i % 3 ? hc : dark(hc, 1.4), mat(x, 1.5, z, .007, .2, .007, .15 * Math.cos(a), 0, -.1 * Math.sin(a))); } }
  if (st === 'locs') { shell(1.04, 1.85, -.3); for (let i = 0; i < 16; i++) { const a = -2.4 + i / 15 * 4.8; const x = Math.sin(a) * .082, z = -.025 - Math.cos(a) * .08; P.add(B, CYL, i % 2 ? hc : dark(hc, 1.25), mat(x, 1.53, z, .01, .16, .01, .2 * Math.cos(a), 0, -.12 * Math.sin(a))); } }
  if (st === 'waves') { shell(1.02, 1.75, -.5); for (let i = 0; i < 5; i++) P.add(B, ring(.3 + i * .22, .36 + i * .22), dark(hc, 1.5), mat(H.x, H.y + .004, H.z - .004, H.rx * 1.026, H.ry * 1.026, H.rz * 1.026, -.5, 0, 0)); }
  if (st === 'buzz') shell(1.015, 1.75, -.5, mix(skin, hc, .8));
  if (st === 'crop') { shell(1.035, 1.42, -.62); P.add(B, SPH, hc, mat(0, 1.668, -.03, .07, .03, .078, -.15)); }
  if (st === 'short') { shell(1.04, 1.75, -.45); P.add(B, SPH, hc, mat(0, 1.65, -.02, .072, .04, .08)); }
  if (st === 'slick') { shell(1.05, 1.8, -.3); P.add(B, SPH, hc, mat(0, 1.655, -.035, .075, .04, .085, -.2)); }
  if (st === 'long' || st === 'ponytail' || st === 'bun') { shell(1.06, 1.75, -.25); }
  if (st === 'long') { P.add(B, SPH, hc, mat(0, 1.5, -.07, .085, .14, .045)); [-1, 1].forEach(s => P.add(B, SPH, hc, mat(s * .07, 1.53, -.02, .025, .09, .05))); }
  if (st === 'ponytail') { P.add(B, TOR, dark(hc, .7), mat(0, 1.62, -.11, .014, .014, .014)); P.add(B, SPH, hc, mat(0, 1.53, -.13, .026, .1, .026, .3)); }
  if (st === 'bun') P.add(B, SPH, hc, mat(0, 1.675, -.09, .042, .038, .04));
  if (st === 'mohawk') { shell(1.012, 1.7, -.5, mix(skin, hc, .45)); curls(P, r, hc, 60, (r) => { const v = -1.2 + r() * 2.7; return [(r() - .5) * .02, H.y + Math.cos(v) * .1 + .03, H.z + Math.sin(v) * .095, .018]; }); }
  if (st === 'balding') P.add(B, ring(1.0, 1.95), hc, mat(H.x, H.y + .004, H.z - .004, H.rx * 1.03, H.ry * 1.03, H.rz * 1.03, -.5, 0, 0));
  if (L.glasses) { const gc = L.gcol || '#8e9298'; [-1, 1].forEach(s => { const cx = s * .034, cy = 1.603, w = .0255, h = .0205, t = .0034, z = .0675;
      P.add(B, BOX, gc, mat(cx, cy + h, z, 2 * w + t, t, t)); P.add(B, BOX, gc, mat(cx, cy - h, z, 2 * w + t, t, t)); P.add(B, BOX, gc, mat(cx - w, cy, z, t, 2 * h + t, t)); P.add(B, BOX, gc, mat(cx + w, cy, z, t, 2 * h + t, t));
      P.add(B, BOX, gc, mat(s * .0625, 1.606, .024, .0028, .0028, .082)); }); // temples
    P.add(B, BOX, gc, mat(0, 1.612, .0675, .0095, .0034, .0034)); } // bridge
}
// ---------- accessories ----------
export function buildAcc(P, L, o) { const acc = (o.acc || []).slice(); if (L.pack && !acc.includes('pack')) acc.push('pack'); const J = o.jacket || o.shirt;
  const neckRing = (c, k = 1) => P.add('DEF-neck', TOR, c, mat(0, 1.465, -.025, .07 * k, .07 * k, .09 * k, Math.PI / 2));
  if (o.jk === 1) { neckRing(J, .95); [-1, 1].forEach(s => P.add('DEF-spine003', BOX, dark(J, .85), mat(s * .055, 1.36, .095, .04, .12, .012, 0, 0, s * .3))); } // lapels
  if (o.jk === 2) neckRing(J, .9);
  if (o.puff) [1.1, 1.2, 1.3].forEach(y => P.add('DEF-spine002', TOR, dark(J, 1.15), mat(0, y, -.01, .15, .13, .14, Math.PI / 2)));
  for (const a of acc) {
    if (a === 'scarf_red') { P.add('DEF-neck', TOR, '#a01418', mat(0, 1.47, -.02, .075, .075, .09, Math.PI / 2)); P.add('DEF-spine003', BOX, '#8a1014', mat(.035, 1.33, .1, .05, .2, .015, .05, 0, .08)); }
    if (a === 'vest') { P.add('DEF-spine002', BOX, '#3a3e30', mat(0, 1.2, .02, .28, .3, .22)); [-1, 0, 1].forEach(i => P.add('DEF-spine002', BOX, '#2e3226', mat(i * .07, 1.12, .13, .055, .07, .03))); }
    if (a === 'pads') [-1, 1].forEach(s => P.add('DEF-upper_arm.' + (s < 0 ? 'R' : 'L'), new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, 1.6), '#4a4a46', mat(s * -.21, 1.4, -.01, .07, .05, .08, 0, 0, s * -.4)));
    if (a === 'kneepads') [-1, 1].forEach(s => P.add('DEF-shin.' + (s < 0 ? 'R' : 'L'), BOX, '#1e1e1c', mat(s * -.09, .5, .055, .085, .09, .03)));
    if (a === 'gloves') { } // shader
    if (a === 'cap_tac' || a === 'cap_orange') { const c = a === 'cap_orange' ? '#e0601a' : '#2e3226';
      P.add('DEF-head', cap(1.35), c, mat(H.x, H.y + .012, H.z, H.rx * 1.1, H.ry * 1.06, H.rz * 1.1)); P.add('DEF-head', CYL, c, mat(0, 1.647, .085, .07, .005, .06)); }
    if (a === 'cap_back') { const c = '#26272b'; // backwards snapback: crown, seams, button, brim over the nape
      P.add('DEF-head', cap(1.22), c, mat(H.x, H.y + .02, H.z - .01, H.rx * 1.09, H.ry * 1.075, H.rz * 1.1, -.62, 0, 0));
      P.add('DEF-head', SPHL, '#2a2a2e', mat(0, H.y + .108, H.z - .012, .008, .005, .008));
      P.add('DEF-head', new THREE.CylinderGeometry(1, 1, 1, 18, 1, false, Math.PI / 2, Math.PI), c, mat(0, 1.612, -.092, .082, .0038, .112, -.12, 0, 0)); P.add('DEF-head', new THREE.CylinderGeometry(1, 1, 1, 18, 1, false, Math.PI / 2, Math.PI), '#26262a', mat(0, 1.6095, -.094, .075, .0016, .105, -.12, 0, 0)); }
    if (a === 'beanie') P.add('DEF-head', cap(1.5), '#7a2a2a', mat(H.x, H.y + .012, H.z, H.rx * 1.12, H.ry * 1.12, H.rz * 1.12, -.2));
    if (a === 'helmet_fire') { P.add('DEF-head', cap(1.4), '#c8a020', mat(H.x, H.y + .02, H.z, H.rx * 1.25, H.ry * 1.15, H.rz * 1.25)); P.add('DEF-head', CYL, '#c8a020', mat(0, 1.64, -.05, .12, .006, .14)); }
    if (a === 'hood') P.add('DEF-head', new THREE.SphereGeometry(1, 20, 12, Math.PI, Math.PI, 0, 2.2), J, mat(H.x, H.y + .005, H.z - .01, H.rx * 1.22, H.ry * 1.15, H.rz * 1.2, 0, Math.PI / 2 * 0, 0));
    if (a === 'mask') P.add('DEF-head', new THREE.SphereGeometry(1, 16, 8, -Math.PI * .1, -Math.PI * .8, 1.45, 1.1), '#101012', mat(0, 1.56, -.005, .085, .07, .085));
    if (a === 'bandana') P.add('DEF-head', new THREE.SphereGeometry(1, 16, 8, -Math.PI * .1, -Math.PI * .8, 1.45, 1.1), '#5a1418', mat(0, 1.56, -.005, .085, .07, .085));
    if (a === 'gasmask') { P.add('DEF-head', SPH, '#2a2a2a', mat(0, 1.56, .06, .055, .04, .03)); P.add('DEF-head', CYL, '#3a3a3a', mat(0, 1.545, .095, .022, .03, .022, Math.PI / 2)); P.add('DEF-head', SPH, '#8ab0b8', mat(0, 1.61, .06, .07, .03, .02)); P.add('DEF-head', cap(1.9), '#d8b828', mat(H.x, H.y, H.z - .01, H.rx * 1.25, H.ry * 1.2, H.rz * 1.2, -.9)); }
    if (a === 'hoodDown') { P.add('DEF-spine003', SPH, J, mat(0, 1.4, -.075, .105, .06, .06)); [-1, 1].forEach(s => P.add('DEF-spine003', CYL, '#d8d2c4', mat(s * .03, 1.3, .105, .004, .07, .004))); }
    if (a === 'belt') P.add('DEF-hips', BOX, '#2a2420', mat(0, 1.0, 0, .2, .028, .13));
    if (a === 'rmask') { const mk = '#25262a'; P.add('DEF-head', SPH, '#18181b', mat(H.x, H.y, H.z, H.rx * 1.08, H.ry * 1.07, H.rz * 1.08)); P.add('DEF-head', SPH, mk, mat(0, 1.585, .035, .066, .062, .056)); [-1, 1].forEach(s => { P.add('DEF-head', TOR, '#4a4c50', mat(s * .033, 1.608, .088, .022, .022, .012)); P.add('DEF-head', SPHL, '#9fb2b2', mat(s * .033, 1.608, .091, .019, .019, .006)); P.add('DEF-head', SPHL, '#ffffff', mat(s * .033 + .006, 1.616, .095, .004)); P.add('DEF-head', CYL, '#3a3a3e', mat(s * .062, 1.55, .075, .016, .02, .016, Math.PI / 2)); });
      P.add('DEF-head', CYL, '#3a3b3f', mat(0, 1.535, .098, .026, .02, .026, Math.PI / 2)); P.add('DEF-head', TOR, '#18181a', mat(0, 1.535, .1, .024, .024, .012)); for (let i = 0; i < 3; i++) P.add('DEF-head', BOX, '#18181a', mat(0, 1.528 + i * .008, .121, .018, .0022, .003)); }
    if (a === 'goggles') { [-1, 1].forEach(s => P.add('DEF-head', CYL, '#3a3a36', mat(s * .032, 1.62, .072, .019, .012, .019, Math.PI / 2))); P.add('DEF-head', TOR, '#2a2a26', mat(0, 1.62, -.02, .085, .02, .1, Math.PI / 2)); }
    if (a === 'dogtags' || a === 'chain') P.add('DEF-spine003', TOR, a === 'chain' ? '#d8b040' : '#9aa0a6', mat(0, 1.36, .08, .05, .08, .03, .4));
    if (a === 'badge') P.add('DEF-spine003', SPH, '#d8b040', mat(.07, 1.34, .1, .012, .012, .004));
    if (a === 'bandage') P.add('DEF-forearm.L', CYL, '#ddd6c8', mat(.5, 1.38, -.02, .04, .07, .04, 0, 0, Math.PI / 2));
    if (a === 'apron') P.add('DEF-hips', BOX, '#efefe8', mat(0, .82, .1, .26, .38, .01));
    if (a === 'trench') P.add('DEF-hips', new THREE.CylinderGeometry(.16, .25, 1, 14, 1, true), J, mat(0, .78 - (o.long || 1) * .1, -.01, 1, .32 + (o.long || 1) * .18, 1));
  }
}
// attach merged parts to bones of a Char (bind-space -> bone space)
export function dressChar(c, L) { const P = new Parts(); const o = OUTFIT[L.outfit] || OUTFITS[0]; buildHead(P, L); buildAcc(P, L, o);
  let sm; c.model.traverse(x => { if (x.isSkinnedMesh) sm = x; }); const sk = sm.skeleton; c.parts = [];
  for (const bn in P.by) { const nb = (n) => n.replace(/[.]/g, ''); const i = sk.bones.findIndex(b => nb(b.name) === nb(bn)); if (i < 0) continue; const geo = mergeGeometries(P.by[bn]); geo.applyMatrix4(new M4().multiplyMatrices(sk.boneInverses[i], sm.bindMatrix)); geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, partsMat(o.gloss && bn !== 'DEF-head')); m.castShadow = true; m.frustumCulled = false; sk.bones[i].add(m); c.parts.push(m); }
  if (o.acc && o.acc.includes('pack') || L.pack) c.wantsPack = true;
  const b = L.build || 1, hgt = L.height || 1; c.model.scale.set(c.scale * b, c.scale * hgt, c.scale * (1 + (b - 1) * .8));
}
