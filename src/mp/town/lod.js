// Zombie / corpse level of detail: swaps each skinned mesh (and the big merged hair mesh) for a decimated copy by distance.
// Decimation = three's SimplifyModifier (meshoptimizer), keeps skinIndex/skinWeight so the same skeleton still animates it.
// level 0 = original body + mid hair (< ~7 m, nearest 2 only), 1 = mid (< ~16 m), 2 = low (further). Small accessory meshes are hidden at level 2.
import { SimplifyModifier } from 'three/addons/modifiers/SimplifyModifier.js';
const mod = new SimplifyModifier(); const cache = new WeakMap(); const BIG = 700;
const trisOf = g => (g.index ? g.index.count : g.attributes.position.count) / 3;
const RATIO = { 1: .42, 2: .1 }; // fraction of vertices kept
function request(g, lvl) { let e = cache.get(g); if (!e) cache.set(g, e = { pend: {} }); if (e[lvl] || e.pend[lvl]) return e[lvl] || null; e.pend[lvl] = true;
  const vc = g.index ? g.attributes.position.count : g.attributes.position.count; mod.modify(g, Math.floor(vc * (1 - RATIO[lvl]))).then(s => { s.computeBoundingSphere(); s.boundingSphere.radius *= 1.6; e[lvl] = s; }).catch(() => { e[lvl] = g; }); return null; }
/** Precompute for a zombie root so the first swap does not wait (async, cheap). */
export function prime(root) { root.traverse(o => { if (o.isMesh && trisOf(o.geometry) > BIG) { if (!o.userData.g0) o.userData.g0 = o.geometry; request(o.userData.g0, 1); request(o.userData.g0, 2); } }); }
/** Apply a level to a zombie root (cheap when unchanged). Returns the applied level. */
export function setLevel(z, lvl) { if (z._lv === lvl) return lvl; z._lv = lvl; const casts = lvl === 0;
  z.root.traverse(o => { if (!o.isMesh) return; const g0 = o.userData.g0 || (o.userData.g0 = o.geometry); const big = trisOf(g0) > BIG;
    if (big) { const hair = !o.isSkinnedMesh; const want = lvl === 0 ? (hair ? 1 : 0) : lvl; const gg = want === 0 ? g0 : request(g0, want); if (gg) { if (o.geometry !== gg) o.geometry = gg; } else if (o.geometry === g0 && want > 0) z._lv = -1 /* retry next frame when ready */; }
    else if (o.userData.vis !== undefined || lvl === 2) { if (lvl === 2) { if (o.userData.vis === undefined) o.userData.vis = o.visible; o.visible = false; } else if (o.userData.vis !== undefined) { o.visible = o.userData.vis; o.userData.vis = undefined; } }
    o.castShadow = casts && (o.isSkinnedMesh || big === false && false); });
  return lvl; }
