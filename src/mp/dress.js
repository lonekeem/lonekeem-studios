// Applies a look to an Avatar: morphs, skin/face uniforms, garment shells, hair/beard shells and rigid accessories.
import { detailFor } from './detail.js';
import { SPEC as SHOE_SPEC, buildShoe } from './shoes.js';
import * as THREE from 'three';
import { skinTone } from './shaders.js';
import { applyMorph } from './morph.js';
import { garmentMaterial } from './garments.js';
import { shellMaterial } from './hair.js';
import { Builder, rigid } from './build.js';
import { makeCtx, HAT, GLASSES, EAR, PIERCE, NECK, WRIST, RING, BAG, BELT } from './acc.js';
import { buildHair } from './hairx.js';
import * as C from './catalog.js';
import { MORPH_KEYS } from './look.js';

const col = h => new THREE.Color(h);
const byId = (list, id, k = 0) => list.find(t => t[k] === id);
const FAM = { cap: HAT.cap };

function headGeometry(av) { // sub-mesh of the head triangles sharing the avatar's attributes
  if (av._headGeo) return av._headGeo; const T = av.tpl, g = av.skin.geometry, ix = g.index, hw = T.headW, out = [];
  for (let i = 0; i < ix.count; i += 3) { const a = ix.getX(i), b = ix.getX(i + 1), c = ix.getX(i + 2); if (hw[a] > .5 && hw[b] > .5 && hw[c] > .5) out.push(a, b, c); }
  const h = new THREE.BufferGeometry(); for (const k in g.attributes) h.setAttribute(k, g.attributes[k]); h.setIndex(out); h.boundingSphere = g.boundingSphere || new THREE.Sphere(new THREE.Vector3(0, 1, 0), 3); h.userData = g.userData; return av._headGeo = h;
}
function shell(av, key, kind, geo) {
  const L = av.layers; if (L[key]) return L[key]; const mat = kind < 3 && kind !== undefined && geo === 'body' ? garmentMaterial(kind.k) : null;
  return null;
}
function addSkinned(av, mesh, order) { const s = av.skin; mesh.position.copy(s.position); mesh.quaternion.copy(s.quaternion); mesh.scale.copy(s.scale); s.parent.add(mesh); mesh.bind(s.skeleton, s.bindMatrix); mesh.frustumCulled = false; mesh.renderOrder = order || 0; mesh.castShadow = false; return mesh; }
function bodyLayer(av, name, kind) { const L = av.layers; if (!L[name]) { const mat = garmentMaterial(kind); const m = new THREE.SkinnedMesh(av.skin.geometry, mat); addSkinned(av, m, 1); L[name] = m; } return L[name]; }
function headLayer(av, name, kind) { const L = av.layers; if (!L[name]) { const mat = shellMaterial(kind); const m = new THREE.SkinnedMesh(headGeometry(av), mat); addSkinned(av, m, 2); L[name] = m; } return L[name]; }

function setGarment(av, name, kind, piece, tbl, g) {
  const m = bodyLayer(av, name, kind); m.visible = !!piece; if (!piece) return; const s = tbl.find(t => t[0] === piece.id); if (!s) { m.visible = false; return; }
  const U = m.material.userData.U, off = m.material.userData.off; U.uC1.value.set(piece.c); U.uC2.value.set(piece.c2 || '#ffffff'); U.uPat.value.set(piece.p || 0, 11 + (piece.ps || 0) * 8, 1, 0); U.uSole.value.set(.02, 0, 0, 0);
  U.uShape.value.set(0, 0, 0, 0); if (kind === 0 || kind === 1 || kind === 3) setDetail(av, kind, piece.id, U); if (kind === 2 && SHOE_SPEC[piece.id]) m.visible = false;
  if (kind === 0 || kind === 3) { const [id, nm, gd, sl, hem, nT, nD, nW, dl, tu, loose, flare, con] = s; if (kind === 3) { const [id2, n2, g2, sl2, hem2, nt2, oh, ot, dl2, tu2, lo2, fl2] = s; U.uG1.value.set(sl2, hem2, 0, 9); U.uG2.value.set(dl2, oh, ot, tu2); U.uN.value.set(nt2, .06, .13, -.03); U.uShape.value.set(0, lo2 * 2, 0, fl2); off.value = .0145 + lo2; U.uSole.value.set(.02, 0, 1, detailFor(3, piece.id)[6] ? 1 : 0); }
    else { U.uG1.value.set(sl, hem, 0, 9); U.uG2.value.set(dl, .05, .5, tu); U.uN.value.set(nT, nD, nW, -.03); U.uShape.value.set(0, loose * 2, 0, flare); off.value = .0095 + loose; U.uSole.value.set(.02, 0, 0, con); } }
  else if (kind === 1) { const [id, nm, gd, le, wa, loose, fl, kb] = s; U.uG1.value.set(le, wa, 0, 9); U.uShape.value.set(kb, fl, 0, 0); off.value = .0062 + loose; }
  else if (kind === 2) { const [id, nm, gd, sh, soleY, offs, cap] = s; U.uG1.value.set(sh, 0, 0, 9); U.uSole.value.set(soleY, cap, 0, 0); off.value = offs; U.uC3.value.set(piece.sole || '#f2f2f0'); U.uPat.value.z = (piece.p || 0) ? 1 : 0; }
  else if (kind === 4) { const [id, nm, sh, offs] = s; U.uG1.value.set(sh, 0, 0, 9); off.value = offs; }
}
function setDetail(av, kind, id, U) { const D = av.tpl.dim; if (!D) return; U.uB1.value.set(Math.max(D.chestW, D.waistW), D.zc, D.neckY - D.hipsY, D.hipsY); U.uB2.value.set(D.armL, D.hipJ - D.ankleY, D.legX, D.legZ); U.uB3.value.set(D.kneeX, D.kneeZ, D.ankX, D.ankZ); U.uLedge.value.set(D.ledge.y, D.ledge.d, .09, 0);
  const d = detailFor(kind, id); U.uD1.value.set(d[0], d[1], d[2], d[3]); U.uD2.value.set(d[4], d[5], d[6], d[7]); }
function mountShoe(av, piece) { av._shoeTop = -1; for (const [nm, sd, bone] of [['shoeL', 1, 'LeftFoot'], ['shoeR', -1, 'RightFoot']]) { const sp = piece && SHOE_SPEC[piece.id]; if (!sp || !av.tpl.dim.foot) { clearAcc(av, nm); continue; }
  const B = buildShoe(av.tpl.dim, piece.id, sd); av._shoeTop = B.topY; mount(av, nm, B, { a: { c: piece.c, r: sp.gloss ? .28 : .72 }, b: { c: piece.c2 || '#f2f2f0', r: .7 }, k: { c: piece.sole || '#f2f2f0', r: .85 } }, bone); for (const m of av.acc[nm] || []) { m.material = m.material.clone(); m.material.side = THREE.DoubleSide; m.castShadow = false; } } }
function setUnder(av, f, skinCol, hide) { const m = bodyLayer(av, 'under', 5); const U = m.material.userData.U; m.material.userData.off.value = .0035; U.uC1.value.set(f ? '#2a2a30' : '#26272c'); U.uG1.value.set(0, hide ? 1 : 0, f ? 1 : 0, 9); m.visible = true; }

const ACCB = { // layer -> bone
  hat: 'Head', glasses: 'Head', earL: 'Head', earR: 'Head', pierce: 'Head', hairx: 'Head', neck: 'Spine02', wristL: 'LeftForeArm', wristR: 'RightForeArm', ringL: 'LeftHand', ringR: 'RightHand', bag: 'Spine02', belt: 'Hips',
};
function clearAcc(av, name) { const a = av.acc[name]; if (a) { for (const m of a) { m.parent && m.parent.remove(m); m.geometry.dispose(); } } av.acc[name] = null; }
const matCache = new Map();
function accMaterial(key, o) { const k = key + JSON.stringify(o); if (matCache.has(k)) return matCache.get(k);
  let m; if (key === 'lens') m = new THREE.MeshStandardMaterial({ color: o.c, roughness: .15, metalness: 0, transparent: true, opacity: o.op, depthWrite: false });
  else if (key === 'hair') { m = new THREE.MeshStandardMaterial({ color: o.c, roughness: .78, metalness: 0, vertexColors: true, side: THREE.DoubleSide }); }
  else m = new THREE.MeshStandardMaterial({ color: o.c, roughness: o.r ?? .55, metalness: o.mt ?? 0, side: o.side ? THREE.DoubleSide : THREE.FrontSide });
  matCache.set(k, m); return m; }
function stylize(geo, hair) { // per-vertex streak variation for hair, soft fabric shading elsewhere
  if (!hair) return geo; const p = geo.attributes.position, n = p.count, c = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const f = .86 + .2 * (.5 + .5 * Math.sin(x * 260 + z * 210 + Math.sin(y * 40) * 3)); c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = Math.min(1.1, f); } geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); return geo; }
function mount(av, name, B, mats, bone) {
  clearAcc(av, name); const out = []; for (const key of B.keys()) { const geo = B.geos(key); if (!geo) continue; const spec = mats[key] || mats.a; const isHair = spec.hair; stylize(geo, isHair); const mat = accMaterial(isHair ? 'hair' : key === 'lens' ? 'lens' : 'std', spec);
    const mesh = rigid(av, geo, bone, mat); addSkinned(av, mesh, 3); mesh.castShadow = false; out.push(mesh); } av.acc[name] = out; }
// geometry builders write into material keys a,b,m,g,k; map to colours
const metalOf = it => ({ c: C.SWATCH.metal[it.m ?? 0], mt: .35, r: .38 });
function jewel(av, ctx, name, fn, item, bone = 'Head', extra = {}) { if (!item) { clearAcc(av, name); return; } const B = new Builder(); fn(B, ctx, item);
  mount(av, name, B, { a: { c: item.c || '#888' }, b: { c: item.c2 || '#ccc' }, m: metalOf(item), g: { c: C.SWATCH.gem[item.g ?? 0], r: .25 }, k: { c: '#16171a' }, ...extra }, bone); }

const MOUTH_Y = {}; const EYE_X = {}, EYE_DY = {};
export function dress(av, look) {
  const f = look.base.startsWith('mp_f'); const T = av.tpl, L = T.lm; av.look = look;
  // ---- body + head morphs
  const mo = { ...look.morph }; const ns = C.NOSES[look.nose.s] || C.NOSES[0]; mo.noseW = (mo.noseW || 0) + ns[1]; mo.noseLen = (mo.noseLen || 0) + ns[2]; mo.noseBridge = (mo.noseBridge || 0) + ns[3]; mo.noseTip = (mo.noseTip || 0) + ns[4]; mo.lipFull = (mo.lipFull || 0) + (look.mouth.full || 0) * .6;
  applyMorph(av, mo); av.hs = 1 + .14 * (mo.headSize || 0); av.root.scale.setScalar(1 + .06 * (look.height || 0));
  // ---- skin / face uniforms
  const U = av.U, sk = skinTone(look.skin.t, look.skin.u); U.uSkin.value.copy(sk); U.uUnder.value = look.skin.u; U.uLm.value.set(L.cx, L.chinY, L.hw, L.hw);
  const hc = col(look.hair.c); U.uHairCol.value.copy(hc);
  const es = C.EYES[look.eyes.s] || C.EYES[0]; const sz = 1 + .35 * look.eyes.size, sp = look.eyes.space * .06;
  U.uE1.value.set((EYE_X[look.base] ?? .5) + sp, (av.tpl.eyeFy || 1.83) + (EYE_DY[look.base] || 0), es[1] * 1.45 * sz, es[2] * 1.75 * sz); U.uE2.value.set(es[3] + look.eyes.tilt * .5, .78, es[4], es[5]); U.uV1.value.set(.35 + .65 * Math.min(1, Math.max(0, look.eyes.lash ?? .6)), 0, look.mouth.smile ?? 2, 0); U.uEyeCol.value.set(look.eyes.col);
  const br = C.BROWS[look.brows.s] || C.BROWS[0]; U.uB1.value.set(.14, .36, br[5], Math.max(.02, br[4] * (1 + .5 * look.brows.thick))); U.uB2.value.set(Math.max(0, br[1] + .4 * look.brows.arch), br[2], br[3], br[6]); U.uBrowCol.value.copy(look.brows.col ? col(look.brows.col) : hc.clone().multiplyScalar(.85));
  const mu = C.MOUTHS[look.mouth.s] || C.MOUTHS[0]; U.uM1.value.set(MOUTH_Y[look.base] ?? av.tpl.mouthY, mu[1] * 1.15 * (1 + .25 * look.mouth.width), Math.min(1, Math.max(0, mu[2] + .4 * look.mouth.full)), mu[3]);
  const lipBase = sk.clone().multiply(col('#d89080')).lerp(col('#7a3a30'), .25); U.uLip.value.copy(look.mouth.col ? col(look.mouth.col) : lipBase);
  const mk = look.makeup; U.uMk1.value.set(mk.shadow / 3, mk.liner / 3, mk.blush / 3, mk.lip / 3); U.uShadowCol.value.set(mk.shadowCol); U.uLipstick.value.set(mk.lipCol); U.uBlushCol.value.copy(col('#d9707a').lerp(sk, .25));
  const sx = look.skinx; U.uMk2.value.set(sx.freckles / 3, sx.moles, sx.age, 0); U.uScar.value.set(sx.scar, sx.scarSide, 0, 0); U.uTat.value.set(sx.tattoo, sx.scarSide, 0, 0); U.uTatCol.value.set(sx.tattooCol);
  const bd = look.beard; U.uStub.value.set(bd.id === 'stubble' ? .55 + .3 * bd.len : 0, 1, 0, 0);
  // ---- clothes
  const w = look.worn; setUnder(av, f, null, !!(w.pants && !/skirt/.test(w.pants.id))); setGarment(av, 'top', 0, w.top, C.TOPS); setGarment(av, 'jacket', 3, w.jacket, C.JACKETS); setGarment(av, 'pants', 1, w.pants, C.PANTS); setGarment(av, 'shoes', 2, w.shoes, C.SHOES); mountShoe(av, w.shoes); { const pm = av.layers.pants; if (pm && pm.visible) pm.material.userData.U.uShape.value.z = av._shoeTop > 0 ? av._shoeTop - .006 : -1; if (w.pants && pm && pm.visible) { const hems = [w.top && C.TOPS.find(t => t[0] === w.top.id), w.jacket && C.JACKETS.find(t => t[0] === w.jacket.id)].filter(Boolean).map(t => t[4]).filter(h => h < .25 && h > -.3); if (hems.length && !/skirt/.test(w.pants.id)) { const U = pm.material.userData.U; U.uG1.value.y = Math.max(U.uG1.value.y, Math.min(...hems) + .035); } } } setGarment(av, 'gloves', 4, w.gloves, C.GLOVES);
  const ctx = makeCtx(av); av._ctx = ctx; const A = look.acc;
  // ---- hair / beard / mustache / mask shells (+ volumetric extras)
  const hat = A.hat && C.HATS.find(h => h[0] === A.hat.id); const hatFam = hat ? hat[2] : null; const covers = hat && !['headband', 'visor', 'crown'].includes(hatFam);
  const hs = C.HAIR.find(h => h[0] === look.hair.id) || C.HAIR[0]; const hm = headLayer(av, 'hair', 0); hm.visible = hs[0] !== 'bald'; { const u = hm.material.userData.U, off = hm.material.userData.off; const bd2 = hs[6]; u.uLm.value.set(L.cx, L.chinY, L.hw, L.hw); u.uHc.value.set(L.zc, L.front, L.back, 0); u.uH1.value.set(hs[3], hs[4], hs[5], 0); u.uH2.value.set(hs[6], covers ? 0 : hs[7], covers ? 0 : hs[8], hs[11 - 0]); u.uH3.value.set(hs[9], 1, 1, hs[10]); off.value = 0; u.uC1.value.set(look.hair.c); u.uC2.value.set(look.hair.c2); }
  const hx = new Builder(); const ex = hs[12].filter(e => !(covers && ['afro', 'quiff', 'spikes', 'fin', 'block', 'fringe', 'bun', 'puffs', 'knots', 'curtain'].includes(e[0]) && !(e[0] === 'bun' && e[1] === 'low')));
  buildHair(hx, ctx, ex); if (hx.keys().length) mount(av, 'hairx', hx, { a: { c: look.hair.c, hair: true }, b: { c: look.hair.c2, hair: true } }, 'Head'); else clearAcc(av, 'hairx');
  const bm = headLayer(av, 'beard', 1), sm = headLayer(av, 'stache', 2); const bi = C.BEARDS.find(b => b[0] === bd.id), si = C.STACHES.find(b => b[0] === look.stache.id);
  const setFH = (m, it, o, id) => { m.visible = !!it && it[2] > 0; if (!m.visible) return; const u = m.material.userData.U; m.material.userData.off.value = 0; u.uLm.value.set(L.cx, L.chinY, L.hw, L.hw); u.uHc.value.set(L.zc, L.front, L.back, 0); u.uMo.value.set(.815, .28, 1.83, 1.07); u.uH2.value.set(.004 + .022 * o.len, .002, .0, 0); u.uH3.value.set(it[2], 1, .45 + .55 * o.dens, 0); u.uC1.value.copy(o.c ? col(o.c) : col(look.hair.c).multiplyScalar(.9)); };
  setFH(bm, bi, bd); setFH(sm, si, look.stache);
  const mkm = headLayer(av, 'mask', 3); const mi = look.mask && C.MASKS.find(x => x[0] === look.mask.id); mkm.visible = !!mi; if (mi) { const u = mkm.material.userData.U; mkm.material.userData.off.value = .006; u.uLm.value.set(L.cx, L.chinY, L.hw, L.hw); u.uMo.value.set(.815, .28, 1.83, 1.07); u.uHc.value.set(L.zc, L.front, L.back, 0); u.uH2.value.set(.006, 0, 0, 0); u.uH3.value.set(mi[2], 1, 1, 0); u.uC1.value.set(look.mask.c); u.uC2.value.set(look.mask.c2 || '#fff'); }
  // ---- rigid accessories
  if (hat) { const B = new Builder(); HAT[hat[2]](B, ctx, hat[3]); mount(av, 'hat', B, { a: { c: A.hat.c, r: .8, side: true }, b: { c: A.hat.c2 || '#222', r: .8, side: true }, m: metalOf(A.hat), g: { c: C.SWATCH.gem[A.hat.g ?? 0], r: .25 }, k: { c: '#16171a' } }, 'Head'); } else clearAcc(av, 'hat');
  const gl = A.glasses && C.GLASSES_LIST.find(h => h[0] === A.glasses.id); if (gl) { const B = new Builder(); const o = { ...gl[3] }; GLASSES[gl[2]](B, ctx, o); const dark = o.dark; mount(av, 'glasses', B, { a: { c: C.SWATCH.metal[A.glasses.m ?? 3], mt: .3, r: .4 }, g: dark ? { c: '#0c0d10', op: .9 } : { c: C.SWATCH.gem[A.glasses.g === undefined || A.glasses.g === 0 ? 6 : A.glasses.g], op: .22 }, k: { c: '#0c0d10', op: .9 } }, 'Head'); const mm = av.acc.glasses; mm.forEach(m => { if (m.material.transparent) m.renderOrder = 6; }); } else clearAcc(av, 'glasses');
  for (const [nm, s] of [['earL', 1], ['earR', -1]]) { const it = A[nm], d = it && C.EARRINGS.find(e => e[0] === it.id); if (d) { const B = new Builder(); EAR[d[2]](B, ctx, s, d[3]); mount(av, nm, B, { a: { c: '#888' }, m: metalOf(it), g: { c: C.SWATCH.gem[it.g ?? 0], r: .2 }, k: { c: '#16171a' } }, 'Head'); } else clearAcc(av, nm); }
  if (A.pierce.length) { const B = new Builder(); for (const id of A.pierce) { const d = C.PIERCINGS.find(e => e[0] === id); if (d) PIERCE[d[2]](B, ctx, d[3]); } mount(av, 'pierce', B, { a: { c: '#888' }, m: { c: C.SWATCH.metal[look.pm ?? 1], mt: .35, r: .38 }, g: { c: C.SWATCH.gem[0], r: .2 } }, 'Head'); } else clearAcc(av, 'pierce');
  const nk = A.neck && C.NECKLACES.find(e => e[0] === A.neck.id); if (nk) { const B = new Builder(); NECK[nk[2]](B, ctx, { ...nk[3] }); mount(av, 'neck', B, { a: { c: A.neck.c || '#c0392b', r: .85, side: true }, m: metalOf(A.neck), g: { c: C.SWATCH.gem[A.neck.g ?? 9], r: .25 }, k: { c: '#16171a' }, b: { c: A.neck.c2 || '#fff' } }, 'Spine02'); } else clearAcc(av, 'neck');
  for (const [nm, s] of [['wristL', 1], ['wristR', -1]]) { const it = A[nm], d = it && C.WRISTS.find(e => e[0] === it.id); if (d) { const B = new Builder(); WRIST[d[2]](B, ctx, { ...d[3], sides: [s] }); mount(av, nm, B, { a: { c: it.c || '#222', r: .8, side: true }, m: metalOf(it), g: { c: C.SWATCH.gem[it.g ?? 9], r: .2 }, k: { c: '#16171a' } }, s > 0 ? 'LeftForeArm' : 'RightForeArm'); } else clearAcc(av, nm); }
  for (const [nm, s] of [['ringL', 1], ['ringR', -1]]) { const it = A[nm], d = it && C.RINGS.find(e => e[0] === it.id); if (d) { const B = new Builder(); RING[d[2]](B, ctx, { ...d[3], sides: [s] }); mount(av, nm, B, { m: metalOf(it), g: { c: C.SWATCH.gem[it.g ?? 1], r: .2 }, a: { c: '#888' } }, s > 0 ? 'LeftHand' : 'RightHand'); } else clearAcc(av, nm); }
  const bg = A.bag && C.BAGS.find(e => e[0] === A.bag.id); if (bg) { const B = new Builder(); BAG[bg[2]](B, ctx, bg[3]); mount(av, 'bag', B, { a: { c: A.bag.c, r: .85 }, b: { c: A.bag.c2 || '#222', r: .85 }, m: metalOf(A.bag) }, 'Spine02'); } else clearAcc(av, 'bag');
  const bt = A.belt && C.BELTS.find(e => e[0] === A.belt.id); if (bt) { const B = new Builder(); BELT[bt[2]](B, ctx, bt[3]); mount(av, 'belt', B, { a: { c: A.belt.c, r: .8 }, m: metalOf(A.belt) }, 'Hips'); } else clearAcc(av, 'belt');
  return av;
}
