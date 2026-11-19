// v2 head rig: swaps the generated head of the base body for the analytic Bitmoji-style head, painted face, ears, hair and facial hair.
// Everything is skinned to the base body's own skeleton (Head / neck bones), so the story animation retarget drives it unchanged.
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { headParams, makeSDF, landmarks, buildHeadGeometry, buildEarGeometry, sdfNormal, rayR } from './head.js';
import { paintFace } from './facepaint.js';

export const HEAD_BIG = { m: 1.2, f: 1.18 };
const HEAD_OFF = { m: [0, .112, .03], f: [0, .108, .028] };
export function headFrame(av, g) { // head centre (bind space) + scale
  // HEAD_BIG: Bitmoji proportions (bigger head on the same neck / shoulders). The head grows about its jaw line, so the chin stays
  // just above the neck instead of sinking into the chest; the neck tube keeps the base (s0) radius.
  const P = av.tpl.P, o = HEAD_OFF[g]; const s0 = (g === 'f' ? 1.07 : 1.1) * (av.hs || 1); const s = s0 * HEAD_BIG[g];
  return { C: new THREE.Vector3(P.Head.x * 0 + o[0], P.Head.y + o[1] * s0 + .128 * (s - s0), P.Head.z + o[2] * s0 + .012 * (s - s0)), s, s0 };
}
// cut the generated head out of the body mesh (the neck stays and tucks into the new head)
export const neckCut = T => T.P.neck.y - .012;
export function neckProfile(av) { // body neck cross-section (ellipse) per height, measured from the rest mesh before stripping
  const T = av.tpl; if (T._nprof) return T._nprof; const p = T.geo.attributes.position, n = p.count, B = new Map();
  for (let i = 0; i < n; i++) { if (T.aW[i * 8 + 4] > .5 || T.headW[i] > .4) continue; const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (Math.abs(x) > .09) continue; const k = Math.round(y / .005); let b = B.get(k); if (!b) B.set(k, b = { x: 0, zf: -9, zb: 9 }); b.x = Math.max(b.x, Math.abs(x)); b.zf = Math.max(b.zf, z); b.zb = Math.min(b.zb, z); }
  return T._nprof = y => { const k0 = Math.round(y / .005); const r = { x: 0, zf: -9, zb: 9 }; let ok = false; for (let d = -3; d <= 3; d++) { const b = B.get(k0 + d); if (!b) continue; ok = true; r.x = Math.max(r.x, b.x); r.zf = Math.max(r.zf, b.zf); r.zb = Math.min(r.zb, b.zb); } if (typeof window !== 'undefined') (window.nprof = window.nprof || []).push([y, ok, r.x, r.zf, r.zb]); return ok ? r : null; }; }
export function stripHead(av) {
  if (av._stripped) return; const T = av.tpl, g = av.skin.geometry, ix = g.index, hw = T.headW, pos = g.attributes.position; const keep = [];
  const cutY = T.P.Head.y - .005;
  for (let i = 0; i < ix.count; i += 3) { const a = ix.getX(i), b = ix.getX(i + 1), c = ix.getX(i + 2); const head = hw[a] > .4 && hw[b] > .4 && hw[c] > .4; const nk = j => pos.getY(j) > neckCut(T) && (T.aW[j * 8] + T.aW[j * 8 + 1]) > .5; if (!head && !(nk(a) && nk(b) && nk(c))) keep.push(a, b, c); }
  g.setIndex(keep); av._stripped = true;
}
export function skinTo(av, geo, weights) { // weights(i, x, y, z) -> [[boneName, w], ...]
  const n = geo.attributes.position.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), p = geo.attributes.position;
  for (let i = 0; i < n; i++) { const ws = weights(i, p.getX(i), p.getY(i), p.getZ(i)); ws.forEach(([b, w], k) => { si[i * 4 + k] = av.boneIdx[b]; sw[i * 4 + k] = w; }); }
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
}
export function bindMesh(av, mesh, order = 0) { const s = av.skin; mesh.position.copy(s.position); mesh.quaternion.copy(s.quaternion); mesh.scale.copy(s.scale); s.parent.add(mesh); mesh.bind(s.skeleton, s.bindMatrix); mesh.frustumCulled = false; mesh.renderOrder = order; mesh.castShadow = true; mesh.receiveShadow = true; return mesh; }
const headWeights = (av, Cy, s) => (i, x, y) => { const k = Math.min(1, Math.max(0, ((Cy - .13 * s) - y) / (.05 * s))); return k > 0 ? [['Head', 1 - k], ['neck', k]] : [['Head', 1]]; };

export function skinMaterial(U, faceTex) {
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .58, metalness: 0 });
  m.userData.face = { value: faceTex || null };
  m.onBeforeCompile = sh => {
    sh.uniforms.uSkin = U.uSkin; sh.uniforms.uFace = m.userData.face; sh.uniforms.uHasFace = { value: faceTex ? 1 : 0 };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aF; varying vec2 vUv2; varying float vF;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvUv2 = uv; vF = aF;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uSkin; uniform sampler2D uFace; uniform float uHasFace; varying vec2 vUv2; varying float vF;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 c = uSkin; if (uHasFace > .5 && vF > .001) { vec4 t = texture2D(uFace, vUv2); c = mix(c, t.rgb, t.a * vF); }
        diffuseColor.rgb = c;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { float rimF = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0), 2.4);
          totalEmissiveRadiance += diffuseColor.rgb * (0.06 + rimF * 0.16) + vec3(.03,.012,.01) * rimF; }`);
  };
  m.customProgramCacheKey = () => 'v2skin' + (faceTex ? 'f' : ''); return m;
}

export function buildHead(av, look) {
  const g = look.base.startsWith('mp_f') ? 'f' : 'm'; stripHead(av);
  const mo = { ...(look.morph || {}) }; const H = headParams(g, mo); const sdf = makeSDF(H); const L = landmarks(H, sdf);
  const { C, s, s0 } = headFrame(av, g); av.head2 = { H, sdf, L, C, s, s0, g };
  const key = JSON.stringify([g, mo, s]);
  if (!av._headMesh || av._headKey !== key) {
    const geo = buildHeadGeometry(H, sdf); const p = geo.attributes.position, nr = geo.attributes.normal, n = p.count; const aF = new Float32Array(n);
    for (let i = 0; i < n; i++) { const z = p.getZ(i), y = p.getY(i); aF[i] = Math.min(1, Math.max(0, (z - .02) / .04)) * Math.min(1, Math.max(0, (y + .17) / .03)); }
    geo.setAttribute('aF', new THREE.BufferAttribute(aF, 1)); geo.scale(s, s, s); geo.translate(C.x, C.y, C.z);
    skinTo(av, geo, headWeights(av, C.y, s));
    const ears = [1, -1].map(sd => { const e = buildEarGeometry(sd, L, H); e.scale(s, s, s); e.translate(C.x, C.y, C.z); e.setAttribute('aF', new THREE.BufferAttribute(new Float32Array(e.attributes.position.count), 1)); if (!e.attributes.uv) e.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(e.attributes.position.count * 2), 2)); skinTo(av, e, () => [['Head', 1]]); return e; });
    { // neck tube: from inside the head down into the chest (top -> Head, middle -> neck, bottom -> Spine)
      const P = av.tpl.P; const y0 = C.y - .06 * s, y1 = P.neck.y - .045, r0 = (g === 'f' ? .043 : .05) * s0, r1 = r0 * 1.12; let ng = new THREE.CylinderGeometry(1, 1, 1, 28, 10, true, Math.PI); const np = ng.attributes.position;
      const prof = neckProfile(av), cut = neckCut(av.tpl);
      for (let i = 0; i < np.count; i++) { const t = np.getY(i) + .5; const y = y1 + (y0 - y1) * t; const r = r1 + (r0 - r1) * t; const ux = np.getX(i), uz = np.getZ(i);
        let x = ux * r, z = C.z - .028 * s + uz * r * .92 + (1 - t) * .004; const b = prof(Math.min(y, cut + .004));
        if (b && b.x > .02) { const w = y < cut - .004 ? 1 : 1 - Math.min(1, (y - (cut - .004)) / .035); const cz = (b.zf + b.zb) / 2, rz = (uz > 0 ? b.zf - cz : cz - b.zb); const grow = y < cut - .006 ? -.004 : .003;
          const bx = ux * (b.x + grow), bz = cz + uz * (rz + grow); const ww = w * w * (3 - 2 * w); x = x + (bx - x) * ww; z = z + (bz - z) * ww; }
        np.setXYZ(i, x, y, z); }
      ng.deleteAttribute('uv'); ng.deleteAttribute('normal'); ng = mergeVertices(ng); ng.computeVertexNormals(); ng.setAttribute('aF', new THREE.BufferAttribute(new Float32Array(np.count), 1));
      skinTo(av, ng, (i, x, y) => { const t = (y - y1) / (y0 - y1); return t > .7 ? [['Head', Math.min(1, (t - .7) / .3)], ['neck', 1 - Math.min(1, (t - .7) / .3)]] : t > .25 ? [['neck', 1]] : [['neck', t / .25], ['Spine', 1 - t / .25]]; });
      ears.push(ng); }
    if (av._headMesh) { av._headMesh.geometry.dispose(); av._headMesh.geometry = geo; av._ears.forEach((m, k) => { m.geometry.dispose(); m.geometry = ears[k]; }); }
    else { av._faceTex = paintFace(faceOpts(look, g, L, H)); const mat = skinMaterial(av.U, av._faceTex); av._headMesh = bindMesh(av, new THREE.SkinnedMesh(geo, mat), 1); const em = skinMaterial(av.U, null); av._ears = ears.map(e => bindMesh(av, new THREE.SkinnedMesh(e, em), 1)); }
    av._headKey = key;
  }
  const fk = JSON.stringify([look.eyes, look.brows, look.mouth, look.makeup, look.skinx, look.beard && look.beard.id, look.beard && look.beard.c, look.hair && look.hair.c, look.skin, look.nose]);
  if (av._faceKey !== fk) { paintFace(faceOpts(look, g, L, H), av._faceTex); av._faceKey = fk; }
  return av.head2;
}

import * as C from '../catalog.js';
import { EYE_SHAPES, BROW_SHAPES, MOUTH_SHAPES } from './facepaint.js';
import { skinTone } from '../shaders.js';
export function faceOpts(look, g, L, H) {
  const f = g === 'f'; const sk = skinTone(look.skin.t, look.skin.u); const skinDark = '#' + sk.clone().multiplyScalar(.55).lerp(new THREE.Color('#3a1a12'), .35).getHexString();
  const en = (C.EYES[look.eyes.s] || C.EYES[0])[0]; const es = EYE_SHAPES[en] || EYE_SHAPES.Almond; const sz = 1 + .3 * (look.eyes.size || 0);
  const bn = (C.BROWS[look.brows.s] || C.BROWS[0])[0]; const bs = BROW_SHAPES[bn] || BROW_SHAPES.Soft;
  const mn = (C.MOUTHS[look.mouth.s] || C.MOUTHS[0])[0]; const ms = MOUTH_SHAPES[mn] || MOUTH_SHAPES.Neutral;
  const hairC = look.hair && look.hair.c || '#2b1a10'; const browCol = look.brows.col || ('#' + new THREE.Color(hairC).multiplyScalar(.9).getHexString());
  const lipBase = '#' + sk.clone().multiply(new THREE.Color('#e0a090')).lerp(new THREE.Color('#9a4a42'), .3).getHexString();
  const mk = look.makeup || {}; const lipCol = mk.lip ? ('#' + new THREE.Color(lipBase).lerp(new THREE.Color(mk.lipCol), [0, .45, .8, .95][mk.lip]).getHexString()) : (look.mouth.col || lipBase);
  return { eyeX: L.eyeX + (look.eyes.space || 0) * .004, eyeY: L.eyeY, browY: L.browY + (look.brows.y || 0) * .004, noseY: L.noseY, mouthY: L.mouthY, noseW: H.noseW,
    w: es[0] * sz, h: es[1] * sz, tilt: es[2] + (look.eyes.tilt || 0) * .15, arch: es[3], flat: es[4], irisK: .78, eyeCol: look.eyes.col || '#4a2c17', lash: Math.max(look.eyes.lash || 0, f ? .5 : 0), liner: mk.liner || 0, shadow: mk.shadow || 0, shadowCol: mk.shadowCol || '#7a4a8a', wing: false,
    bArch: bs[0] + (look.brows.arch || 0) * .4, bTilt: bs[1], bTaper: bs[2], bThick: bs[3] * (1 + .5 * (look.brows.thick || 0)), bLen: bs[4], bSparse: bn === 'Sparse', unibrow: bn === 'Unibrow', browCol,
    mW: ms[0] * (1 + .2 * (look.mouth.width || 0)), mFull: Math.min(1, ms[1] + .3 * (look.mouth.full || 0)), mSmile: ms[2], mOpen: !!ms[3], mSmirk: mn === 'Smirk', lipCol,
    freckles: look.skinx.freckles || 0, freckleCol: '#' + sk.clone().multiplyScalar(.6).lerp(new THREE.Color('#6a3a20'), .4).getHexString(), moles: look.skinx.moles || 0, blush: mk.blush || 0,
    stubble: look.beard && look.beard.id === 'stubble', stubbleCol: (look.beard && look.beard.c) || hairC, skinDark,
    beardShade: look.beard && ['full', 'boxed', 'lumber', 'strap', 'curtain', 'mutton', 'circle'].includes(look.beard.id) ? 1 : 0 };
}

// ---------- hair
import { styleOf, buildCap, buildExtras, hairMaterial } from './hair.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
export function buildHairMesh(av, look, opt = {}) {
  const h = av.head2; const id = look.hair && look.hair.id || 'bald'; const st0 = styleOf(id); const key = JSON.stringify([id, av._headKey, opt.hatCut || 0]);
  const ears = av._ears; if (ears) { const show = !st0 || st0.ears !== false; ears[0].visible = ears[1].visible = show; }
  if (av._hairKey === key) { if (av._hair) av._hair.material = hairMaterial(look.hair.c, look.hair.c2 || look.hair.c, look.hair.hl ?? .35, skinHex(av)); return av._hair; }
  if (av._hair) { av._hair.parent && av._hair.parent.remove(av._hair); av._hair.geometry.dispose(); av._hair = null; }
  av._hairKey = key; if (!st0) return null;
  let st = st0; if (opt.hatCut) st = Object.assign({}, st0, { top: Math.min(st0.top, .003), front: 0, spikes: 0, round: 0, locks: 0, lockAmp: 0, tips: 0, frontLift: 0, waves: 0, T: Math.min(st0.T, .008), curl: Math.min(st0.curl, .002), ex: (st0.ex || []).filter(e => e[0] === 'dutch' || (e[0] === 'locs' && e[1] > .1) || (e[0] === 'bun' && e[1] === 'low') || (e[0] === 'pony' && e[1] === 'low') || e[0] === 'braidpony' || e[0] === 'pigtails') });
  const parts = [...buildCap(h, st), ...buildExtras(h, st)];
  const geo = mergeGeometries(parts.map(g => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'aT', 'aH'].includes(k)) g.deleteAttribute(k); return g.index ? g : g; }), false);
  geo.scale(h.s, h.s, h.s); geo.translate(h.C.x, h.C.y, h.C.z);
  const C = h.C, s = h.s; const P = av.tpl.P;
  skinTo(av, geo, (i, x, y) => { const ly = (y - C.y) / s; if (ly > -.16) return [['Head', 1]]; const t = Math.min(1, (-.16 - ly) / .2); return t < .5 ? [['Head', 1 - t], ['neck', t]] : [['Head', 1 - t], ['neck', .5], ['Spine02', t - .5]]; });
  av._hair = bindMesh(av, new THREE.SkinnedMesh(geo, hairMaterial(look.hair.c, look.hair.c2 || look.hair.c, look.hair.hl ?? .35, skinHex(av))), 2);
  return av._hair;
}

// ---------- facial hair
const skinHex = av => '#' + av.U.uSkin.value.getHexString();
import { BEARD_STYLES, STACHE_STYLES, BEARD_ALIAS, STACHE_ALIAS, buildBand, LIP_CUT } from './hair.js';
export function buildFacialHair(av, look) {
  const h = av.head2; const bid = look.beard && look.beard.id || 'none', sid = look.stache && look.stache.id || 'none';
  const bs = BEARD_STYLES[bid] || BEARD_STYLES[BEARD_ALIAS[bid]], ss_ = STACHE_STYLES[sid] || STACHE_STYLES[STACHE_ALIAS[sid]];
  const len = look.beard && look.beard.len != null ? look.beard.len : .4; const key = JSON.stringify([bid, sid, len.toFixed(2), av._headKey]);
  const col = (look.beard && look.beard.c) || look.hair.c; const c2 = ('#' + new THREE.Color(col).multiplyScalar(1.25).getHexString());
  if (av._fhKey === key) { if (av._fh) av._fh.material = hairMaterial(col, c2, .4, skinHex(av)); return; }
  if (av._fh) { av._fh.parent && av._fh.parent.remove(av._fh); av._fh.geometry.dispose(); av._fh = null; } av._fhKey = key;
  const parts = []; const lipCut = !!(bs && ss_); // with a mustache, the beard leaves the upper lip so the mustache reads as its own shape
  if (bs) parts.push(buildBand(h, Object.assign({}, bs, { T: bs.T * (.5 + .9 * len) }, lipCut ? { mask: (p, a, L) => bs.mask(p, a, L) && !LIP_CUT(p, L) } : {}))); if (ss_) { const sg = buildBand(h, Object.assign({}, ss_, { T: ss_.T * (.7 + .6 * ((look.stache && look.stache.len) ?? .4)) * (bs ? 1.35 : 1) })); const a = sg.attributes.aH; for (let k = 0; k < a.count; k++) a.setW(k, 6); parts.push(sg); }
  if (!parts.length) return; const geo = parts.length > 1 ? mergeGeometries(parts, false) : parts[0]; geo.scale(h.s, h.s, h.s); geo.translate(h.C.x, h.C.y, h.C.z);
  skinTo(av, geo, () => [['Head', 1]]); av._fh = bindMesh(av, new THREE.SkinnedMesh(geo, hairMaterial(col, c2, .4, skinHex(av))), 2);
}
// accessory context (bind-space landmarks) from the analytic head, merged over the body context
export function headCtx(av, base) {
  const h = av.head2, L = h.L, C = h.C, s = h.s; const st = styleOf(av.look && av.look.hair ? av.look.hair.id : 'bald'); const hairT = st ? Math.min(.012, st.T + .003) : 0;
  const B = y => C.y + y * s; const hw = L.sideX * s;
  const ear = sd => new THREE.Vector3(sd * (L.sideX + .006) * s, B(L.earY), C.z + L.earZ * s); const lobe = sd => new THREE.Vector3(sd * (L.sideX + .004) * s, B(L.earY - .024), C.z + (L.earZ + .004) * s);
  const faceZ = (x, y) => C.z + s * L.surfZ(x / s, (y - C.y) / s);
  const crownY = B(.03); const top = B(L.top) + hairT * s;
  return Object.assign({}, base, { hw, hs: s, eyeY: B(L.eyeY), mouthY: B(L.mouthY), noseY: B(L.noseY), zc: C.z + .0 * s, top, chinY: B(L.chin), front: C.z + L.front * s, back: C.z + L.back * s - hairT,
    faceZ, ears: [ear(1), ear(-1)], lobes: [lobe(1), lobe(-1)], earY: B(L.earY), skY: B(L.eyeY), crownY, ry: (top - crownY) + .006, rx: hw * 1.02 + hairT + .006, rz: (h.H.D * s) + hairT + .008 });
}

// ---------- face masks (cloth bands on the same surface)
const MASKS2 = {
  surgical: { T: .006, mask: (p, a, L) => Math.abs(a) < 88 && p.y < L.noseY + .012 && p.y > -.16 + Math.abs(p.x) * .3 },
  bandanam: { T: .007, mask: (p, a, L) => Math.abs(a) < 100 && p.y < L.noseY + .01 },
  gaiter: { T: .008, mask: (p, a, L) => Math.abs(a) < 110 && p.y < L.noseY + .004 },
};
const _clothM = new Map();
export function buildMask(av, item) {
  const key = item ? JSON.stringify([item.id, av._headKey]) : 'none'; const st = item && MASKS2[item.id];
  if (av._maskKey !== key) { if (av._mask) { av._mask.parent && av._mask.parent.remove(av._mask); av._mask.geometry.dispose(); av._mask = null; } av._maskKey = key;
    if (st) { const h = av.head2; const geo = buildBand(h, st); geo.scale(h.s, h.s, h.s); geo.translate(h.C.x, h.C.y, h.C.z); skinTo(av, geo, () => [['Head', 1]]); av._mask = bindMesh(av, new THREE.SkinnedMesh(geo, new THREE.MeshStandardMaterial({ roughness: .9 })), 3); } }
  if (av._mask && item) av._mask.material.color.set(item.c || '#3a5a8a');
}
