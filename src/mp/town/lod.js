// Zombie / corpse level of detail: swaps the big SKINNED body mesh for a decimated copy by distance (three's SimplifyModifier, keeps skinIndex/skinWeight so the same skeleton still animates it).
// level 0 = original (< ~40 m), 1 = 60% of the vertices (< ~75 m), 2 = 35% (further, where a zombie is a few pixels tall).
// v1.9.21 fix (zombies had no heads): the head / hair / face parts of the procedural story zombies (dressChar) are NON-skinned meshes of ~1k triangles. The old LOD treated them as "big", decimated them to 42%
//   even at level 0 (SimplifyModifier turns a merged-sphere head into a flat slab: just floating eyes + hair above the neck) and hid them completely at level 2. They are now never touched or hidden.
import { SimplifyModifier } from 'three/addons/modifiers/SimplifyModifier.js';
const mod = new SimplifyModifier(); const cache = new WeakMap(); const BIG = 700;
const trisOf = g => (g.index ? g.index.count : g.attributes.position.count) / 3;
const RATIO = { 1: .6, 2: .35 }; // fraction of vertices kept
const lodable = o => o.isSkinnedMesh && trisOf(o.userData.g0 || o.geometry) > BIG; // body skins only (never head/hair/face/accessory parts)
function request(g, lvl) { let e = cache.get(g); if (!e) cache.set(g, e = { pend: {} }); if (e[lvl] || e.pend[lvl]) return e[lvl] || null; e.pend[lvl] = true;
  const vc = g.attributes.position.count; mod.modify(g, Math.floor(vc * (1 - RATIO[lvl]))).then(s => { s.computeBoundingSphere(); s.boundingSphere.radius *= 1.6; e[lvl] = s; }).catch(() => { e[lvl] = g; }); return null; }
/** Precompute for a zombie root so the first swap does not wait (async, cheap). */
export function prime(root) { root.traverse(o => { if (o.isMesh && lodable(o)) { if (!o.userData.g0) o.userData.g0 = o.geometry; request(o.userData.g0, 1); request(o.userData.g0, 2); } }); }
/** Apply a level to a zombie root (cheap when unchanged). Returns the applied level. */
export function setLevel(z, lvl) { if (typeof window !== 'undefined' && window.__MP_NOLOD) lvl = 0; if (z._lv === lvl) return lvl; z._lv = lvl; const casts = lvl === 0;
  z.root.traverse(o => { if (!o.isMesh) return; if (lodable(o)) { const g0 = o.userData.g0 || (o.userData.g0 = o.geometry); const gg = lvl === 0 ? g0 : request(g0, lvl); if (gg) { if (o.geometry !== gg) o.geometry = gg; } else if (o.geometry === g0 && lvl > 0) z._lv = -1; /* retry next frame when ready */ }
    o.castShadow = casts && o.isSkinnedMesh; });
  return lvl; }
