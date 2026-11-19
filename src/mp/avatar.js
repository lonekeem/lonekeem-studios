// Multiplayer avatar: a rigged, smooth cartoon base body (Fal/Meshy generated, original) re-dressed entirely in code:
// analytic skin + face painting, morphable head/body, shader-cut garment shells, shell hair/beards and rigid accessories.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { hookVertex, skinTone } from './shaders.js';
import { FACE_UNIFORMS, FACE_FRAG_DECL } from './face.js';
import { weldNormals } from './morph.js';

const REG = { Head: 0, neck: 1, Spine: 2, Spine01: 2, Spine02: 2, Hips: 2, LeftShoulder: 3, LeftArm: 3, LeftForeArm: 3, RightShoulder: 3, RightArm: 3, RightForeArm: 3, LeftHand: 4, RightHand: 4,
  LeftUpLeg: 5, LeftLeg: 5, RightUpLeg: 5, RightLeg: 5, LeftFoot: 6, LeftToeBase: 6, RightFoot: 6, RightToeBase: 6 };
const _loader = new GLTFLoader(); const _tpl = {};
export const BASE_URL = (typeof window !== 'undefined' && window.__MP_BASE) || './';

// ---------- template (per base model, computed once) ----------
export function loadBase(key) {
  if (_tpl[key]) return _tpl[key];
  return _tpl[key] = _loader.loadAsync(BASE_URL + 'models/chars/' + key + '.glb').then(g => analyse(key, g.scene));
}
function analyse(key, scene) {
  scene.updateMatrixWorld(true); let skin = null; scene.traverse(o => { if (o.isSkinnedMesh && !skin) skin = o; });
  const sk = skin.skeleton, names = sk.bones.map(b => b.name), P = {}; const v = new THREE.Vector3();
  sk.bones.forEach(b => { b.getWorldPosition(v); P[b.name] = v.clone(); });
  const geo = skin.geometry; normalizeLegs(geo, names, P); smoothMesh(geo, names, sk);
  const pos = geo.attributes.position, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, ix = geo.index, n = pos.count;
  const used = new Uint8Array(n); for (let i = 0; i < ix.count; i++) used[ix.getX(i)] = 1;
  const dom = new Int16Array(n), reg = new Float32Array(n), headW = new Float32Array(n);
  const headIdx = names.indexOf('Head');
  for (let i = 0; i < n; i++) { let bi = 0, bw = -1; for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); const b = si.getComponent(i, k); if (b === headIdx) headW[i] += w; if (w > bw) { bw = w; bi = b; } } dom[i] = bi; reg[i] = REG[names[bi]] ?? 2; }
  cleanRegions(geo, reg, 5);
  const aW = new Float32Array(n * 8); for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > 0) aW[i * 8 + (REG[names[si.getComponent(i, k)]] ?? 2)] += w; }
  // normalised limb / torso coordinates (attribute aR = region, along-limb s, torso height t, side)
  const aR = new Float32Array(n * 4); const hipsY = P.Hips.y, neckY = P.neck.y;
  const armDir = {}, legTop = {}; ['Left', 'Right'].forEach(sd => { const a = P[sd + 'Arm'], h = P[sd + 'Hand']; const d = h.clone().sub(a); armDir[sd] = { o: a, d: d.clone().normalize(), L: d.length() }; legTop[sd] = P[sd + 'UpLeg']; });
  const ankleY = (P.LeftFoot.y + P.RightFoot.y) / 2, hipJ = P.LeftUpLeg.y;
  for (let i = 0; i < n; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); const sd = x >= 0 ? 'Left' : 'Right'; let s = 0; const r = reg[i];
    if (r === 3 || r === 4) { const A = armDir[sd]; s = (v.set(x, y, z).sub(A.o).dot(A.d)) / A.L; } else if (r === 5 || r === 6) s = (hipJ - y) / (hipJ - ankleY);
    aR[i * 4] = r; aR[i * 4 + 1] = s; aR[i * 4 + 2] = (y - hipsY) / (neckY - hipsY); aR[i * 4 + 3] = x >= 0 ? 1 : -1; }
  // head landmarks
  let minY = 9, maxY = -9, front = -9, back = 9, tipY = 0, ax = [], earL = null; const earC = [new THREE.Vector3(), new THREE.Vector3()], earN = [0, 0], earLow = [null, null]; for (let i = 0; i < n; i++) if (used[i] && headW[i] > .5 && pos.getY(i) > P.neck.y + .03) { const y = pos.getY(i), z = pos.getZ(i); maxY = Math.max(maxY, y); back = Math.min(back, z); if (z > P.Head.z + .02) minY = Math.min(minY, y); if (z > front) { front = z; tipY = y; } ax.push(Math.abs(pos.getX(i))); }
  ax.sort((a, b) => a - b); const hw = ax[Math.floor(ax.length * .86)];
  for (let i = 0; i < n; i++) if (used[i] && headW[i] > .5) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), fy = (y - minY) / hw; if (Math.abs(x) > hw * .98 && fy > 1.0 && fy < 2.6) { const k = x > 0 ? 0 : 1; earC[k].add(new THREE.Vector3(x, y, z)); earN[k]++; if (!earLow[k] || y < earLow[k].y) earLow[k] = new THREE.Vector3(x, y, z); } }
  const ears = earC.map((c, k) => earN[k] ? c.divideScalar(earN[k]) : new THREE.Vector3((k ? -1 : 1) * hw * 1.05, minY + hw * 1.7, P.Head.z));
  const lm = { cx: 0, chinY: minY, hh: maxY - minY, hw, front, back, zc: (front + back) / 2, top: maxY, noseTipY: tipY, headBone: P.Head.clone(), ears, lobes: earLow.map((l, k) => l || ears[k]) };
  flattenFace(geo, headW, lm);
  const zoneW = new Float32Array(n); { const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }; for (let i = 0; i < n; i++) { if (headW[i] < .5) continue; const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); const ax = Math.abs(x) / lm.hw, fy = (y - lm.chinY) / lm.hw; zoneW[i] = .9 * ss(lm.zc, lm.zc + .04, z) * ss(.16, .34, ax) * ss(1.05, .85, ax) * ss(.9, 1.25, fy) * ss(3.0, 2.6, fy); const cw = (1 - ss(.1, .3, ax)) * ss(lm.zc, lm.zc + .04, z) * ss(tipY - .024, tipY + .0, y) * ss(lm.chinY + (maxY - minY) * .62, lm.chinY + (maxY - minY) * .5, y); zoneW[i] = Math.max(zoneW[i], .8 * cw); } }
  return { zoneW, key, scene, skin, geo, names, P, aR, aW, reg, headW, dom, used, lm, ankleY, hipsY, neckY };
}

// Meshy meshes carry noisy folds that the baked texture used to hide; weld seams, Taubin-smooth (volume preserving) and rebuild welded normals
function smoothMesh(geo, names, sk) {
  const pos = geo.attributes.position, n = pos.count, ix = geo.index, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight; const key = new Map(), grp = new Int32Array(n); let ng = 0;
  for (let i = 0; i < n; i++) { const k = Math.round(pos.getX(i) * 4e4) + ',' + Math.round(pos.getY(i) * 4e4) + ',' + Math.round(pos.getZ(i) * 4e4); let g = key.get(k); if (g === undefined) { g = ng++; key.set(k, g); } grp[i] = g; }
  const nb = Array.from({ length: ng }, () => new Set()); for (let t = 0; t < ix.count; t += 3) { const a = grp[ix.getX(t)], b = grp[ix.getX(t + 1)], c = grp[ix.getX(t + 2)]; nb[a].add(b); nb[a].add(c); nb[b].add(a); nb[b].add(c); nb[c].add(a); nb[c].add(b); }
  const gp = new Float32Array(ng * 3), wt = new Float32Array(ng); const headIdx = names.indexOf('Head'), neckIdx = names.indexOf('neck'); const hand = new Set([names.indexOf('LeftHand'), names.indexOf('RightHand')]);
  for (let i = 0; i < n; i++) { const g = grp[i]; gp[g * 3] = pos.getX(i); gp[g * 3 + 1] = pos.getY(i); gp[g * 3 + 2] = pos.getZ(i); let hw = 0, handw = 0; for (let k = 0; k < 4; k++) { const b = si.getComponent(i, k), w = sw.getComponent(i, k); if (b === headIdx || b === neckIdx) hw += w; if (hand.has(b)) handw += w; } wt[g] = Math.max(wt[g], hw > .3 ? 1 : handw > .3 ? 0 : .35); }
  const tmp = new Float32Array(ng * 3); const pass = (lam) => { for (let g = 0; g < ng; g++) { const L = nb[g]; if (!L.size || !wt[g]) { tmp[g * 3] = gp[g * 3]; tmp[g * 3 + 1] = gp[g * 3 + 1]; tmp[g * 3 + 2] = gp[g * 3 + 2]; continue; } let x = 0, y = 0, z = 0; for (const o of L) { x += gp[o * 3]; y += gp[o * 3 + 1]; z += gp[o * 3 + 2]; } const k = 1 / L.size, l = lam * wt[g]; tmp[g * 3] = gp[g * 3] + l * (x * k - gp[g * 3]); tmp[g * 3 + 1] = gp[g * 3 + 1] + l * (y * k - gp[g * 3 + 1]); tmp[g * 3 + 2] = gp[g * 3 + 2] + l * (z * k - gp[g * 3 + 2]); } gp.set(tmp); };
  for (let it = 0; it < 12; it++) { pass(.5); pass(-.53); }
  { const keep = wt.slice(); const legs = new Set(['LeftUpLeg', 'LeftLeg', 'RightUpLeg', 'RightLeg'].map(k => names.indexOf(k))); const lw = new Float32Array(ng);
    for (let i = 0; i < n; i++) { let l = 0; for (let k = 0; k < 4; k++) if (legs.has(si.getComponent(i, k))) l += sw.getComponent(i, k); if (l > .5) lw[grp[i]] = 1; }
    for (let g = 0; g < ng; g++) wt[g] = (keep[g] === 1 || lw[g]) ? 1 : 0; for (let it = 0; it < 22; it++) { pass(.5); pass(-.53); } }
  for (let i = 0; i < n; i++) pos.setXYZ(i, gp[grp[i] * 3], gp[grp[i] * 3 + 1], gp[grp[i] * 3 + 2]);
  geo.computeVertexNormals(); const nr = geo.attributes.normal, acc = new Float32Array(ng * 3); for (let i = 0; i < n; i++) { const g = grp[i]; acc[g * 3] += nr.getX(i); acc[g * 3 + 1] += nr.getY(i); acc[g * 3 + 2] += nr.getZ(i); }
  for (let i = 0; i < n; i++) { const g = grp[i]; const x = acc[g * 3], y = acc[g * 3 + 1], z = acc[g * 3 + 2], l = Math.hypot(x, y, z) || 1; nr.setXYZ(i, x / l, y / l, z / l); }
  geo.userData.group = grp; geo.userData.ng = ng;
}

// ---------- the avatar ----------
export class Avatar {
  constructor(tpl) {
    this.tpl = tpl; this.root = new THREE.Group(); this.obj = SkeletonUtils.clone(tpl.scene); this.root.add(this.obj);
    let skin = null; this.bones = {}; this.obj.traverse(o => { if (o.isSkinnedMesh && !skin) skin = o; if (o.isBone) this.bones[o.name] = o; });
    this.skin = skin; const g = skin.geometry = tpl.geo.clone(); g.userData = { group: tpl.geo.userData.group, ng: tpl.geo.userData.ng }; g.setAttribute('aR', new THREE.BufferAttribute(tpl.aR, 4)); { const w1 = new Float32Array(tpl.aR.length), w2 = new Float32Array(tpl.aR.length), W = tpl.aW; for (let i = 0; i < tpl.aR.length / 4; i++) { for (let k = 0; k < 4; k++) { w1[i * 4 + k] = W[i * 8 + k]; w2[i * 4 + k] = W[i * 8 + 4 + k]; } } g.setAttribute('aW1', new THREE.BufferAttribute(w1, 4)); g.setAttribute('aW2', new THREE.BufferAttribute(w2, 4)); }
    this.rest = new Float32Array(g.attributes.position.array); g.setAttribute('aP0', new THREE.BufferAttribute(new Float32Array(this.rest), 3)); this.pos = g.attributes.position; this.nrm = g.attributes.normal;
    this.U = Object.assign(FACE_UNIFORMS(), {});
    this.skin.material = this._skinMat(); skin.frustumCulled = false; skin.castShadow = true; skin.receiveShadow = true;
    this.layers = {}; this.acc = {}; this.look = null;
    this.boneIdx = {}; skin.skeleton.bones.forEach((b, i) => { this.boneIdx[b.name] = i; });
    this.restQ = {}; this.parentWQ = {}; this.obj.updateMatrixWorld(true); const q = new THREE.Quaternion();
    skin.skeleton.bones.forEach(b => { this.restQ[b.name] = b.quaternion.clone(); b.parent.getWorldQuaternion(q); this.parentWQ[b.name] = q.clone(); });
    this.hipsRest = this.bones.Hips.position.clone(); this.t = 0; this.phase = 0;
    this.headFrame = tpl.lm; this.root.userData.avatar = this;
  }
  _skinMat() {
    const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .62, metalness: 0 }); const U = this.U;
    m.onBeforeCompile = sh => { Object.assign(sh.uniforms, U); hookVertex(sh);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + 'varying vec3 vRest; varying vec3 vRestN; varying vec4 vR;\nfloat h11(float n){ return fract(sin(n*127.1)*43758.5453); }\nfloat h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }\nfloat h31(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }\nfloat vn(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y), mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z); }\nfloat sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0); return length(pa-ba*h); }\n' + FACE_FRAG_DECL)
        .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = paintSkin(vRest, normalize(vRestN), vR);'); };
    m.customProgramCacheKey = () => 'mpskin'; return m;
  }
  // morph the head / body from the rest copy
  applyMorph(M, L) { /* implemented in morph.js, injected */ }
  dispose() { this.obj.traverse(o => { if (o.isMesh) { o.geometry && o.geometry.dispose(); } }); }
}

// Meshy bakes loose shorts (flared cuff at the knee) into the base mesh: re-profile the thighs into a clean taper so any trousers fit.
function normalizeLegs(geo, names, P) {
  const pos = geo.attributes.position, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, n = pos.count; const idx = new Set(['LeftUpLeg', 'LeftLeg', 'RightUpLeg', 'RightLeg'].map(k => names.indexOf(k)));
  for (const sd of ['Left', 'Right']) {
    const a = P[sd + 'UpLeg'], b = P[sd + 'Foot']; const d = b.clone().sub(a), L = d.length(); d.divideScalar(L); const mine = new Set([names.indexOf(sd + 'UpLeg'), names.indexOf(sd + 'Leg')]);
    const NB = 48, sum = new Float32Array(NB), cnt = new Float32Array(NB), v = new THREE.Vector3(), pr = new THREE.Vector3(); const S = new Float32Array(n), R = new Float32Array(n), use = new Uint8Array(n);
    for (let i = 0; i < n; i++) { let w = 0; for (let k = 0; k < 4; k++) if (mine.has(si.getComponent(i, k))) w += sw.getComponent(i, k); if (w < .6) continue; v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).sub(a); const t = v.dot(d); pr.copy(v).addScaledVector(d, -t); const s = t / L; if (s < 0 || s > .95) continue; use[i] = 1; S[i] = s; R[i] = pr.length(); const k = Math.min(NB - 1, Math.floor(s * NB)); sum[k] += R[i]; cnt[k]++; }
    const ring = new Float32Array(NB); for (let k = 0; k < NB; k++) ring[k] = cnt[k] ? sum[k] / cnt[k] : 0;
    const at = u => { const x = Math.min(NB - 1.001, Math.max(0, u * NB - .5)), i = Math.floor(x), f = x - i; return ring[i] * (1 - f) + ring[i + 1] * f; };
    const s0 = .16, s1 = .52; const r0 = at(s0), r1 = at(s1);
    for (let i = 0; i < n; i++) { if (!use[i]) continue; const s = S[i]; if (s < s0 - .06 || s > s1 + .08) continue; const sm = Math.min(1, Math.max(0, (s - s0) / (s1 - s0))); const tgt = (r0 + (r1 - r0) * (sm * sm * (3 - 2 * sm))) * (1 + .06 * Math.sin(Math.PI * sm)); const act = at(s) || 1; const dev = R[i] / act; let k = tgt * (1 + .25 * (dev - 1)) / R[i]; const blend = Math.min(1, Math.min((s - (s0 - .06)) / .06, ((s1 + .08) - s) / .08)); k = 1 + (k - 1) * Math.max(0, blend);
      v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).sub(a); const t = v.dot(d); pr.copy(v).addScaledVector(d, -t); pr.multiplyScalar(k); pos.setXYZ(i, a.x + d.x * t + pr.x, a.y + d.y * t + pr.y, a.z + d.z * t + pr.z); }
  }
}
// majority-vote the dominant-bone region labels so seams (hips / shoulders / neck) are clean lines instead of speckle
function cleanRegions(geo, reg, passes) {
  const ix = geo.index, n = reg.length, grp = geo.userData.group, ng = geo.userData.ng; const nb = Array.from({ length: ng }, () => new Set());
  for (let t = 0; t < ix.count; t += 3) { const a = grp[ix.getX(t)], b = grp[ix.getX(t + 1)], c = grp[ix.getX(t + 2)]; nb[a].add(b); nb[a].add(c); nb[b].add(a); nb[b].add(c); nb[c].add(a); nb[c].add(b); }
  const gl = new Float32Array(ng); for (let i = 0; i < n; i++) gl[grp[i]] = reg[i];
  for (let p = 0; p < passes; p++) { const nx = gl.slice(); for (let g = 0; g < ng; g++) { const cnt = {}; let best = gl[g], bc = 0; cnt[gl[g]] = 1.5; for (const o of nb[g]) cnt[gl[o]] = (cnt[gl[o]] || 0) + 1; for (const k in cnt) if (cnt[k] > bc) { bc = cnt[k]; best = +k; } nx[g] = best; } gl.set(nx); }
  for (let i = 0; i < n; i++) reg[i] = gl[grp[i]];
}

// The generated faces carry sculpted eyelids / sockets that fight the painted eyes: blend the eye + brow zones toward a heavily low-passed copy of the head.
function flattenFace(geo, headW, lm) {
  const pos = geo.attributes.position, n = pos.count, hw = lm.hw, cs = .004; const x0 = -hw * 1.3, y0 = lm.chinY - .01, W = Math.ceil(hw * 2.6 / cs) + 1, H = Math.ceil((lm.top - lm.chinY + .02) / cs) + 1;
  const Z = new Float32Array(W * H).fill(-9), cnt = new Float32Array(W * H);
  const cell = (x, y) => [Math.round((x - x0) / cs), Math.round((y - y0) / cs)];
  for (let i = 0; i < n; i++) { if (headW[i] < .5) continue; const z = pos.getZ(i); if (z < lm.zc) continue; const [cx, cy] = cell(pos.getX(i), pos.getY(i)); if (cx < 0 || cy < 0 || cx >= W || cy >= H) continue; const k = cy * W + cx; if (z > Z[k]) Z[k] = z; }
  let G = Z; const has = Z.map(v => v > -8 ? 1 : 0);
  for (let pass = 0; pass < 4; pass++) { const out = new Float32Array(W * H).fill(-9), R = 3; // fill holes, then box blur (masked)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let sum = 0, c = 0; for (let dy = -R; dy <= R; dy++) { const yy = y + dy; if (yy < 0 || yy >= H) continue; for (let dx = -R; dx <= R; dx++) { const xx = x + dx; if (xx < 0 || xx >= W) continue; const v = G[yy * W + xx]; if (v > -8) { sum += v; c++; } } } if (c) out[y * W + x] = sum / c; }
    G = out; }
  const sq = v => v * v; const grp = geo.userData.group; const wg = new Float32Array(geo.userData.ng);
  for (let i = 0; i < n; i++) { if (headW[i] < .5) continue; const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); if (z < lm.zc + .01) continue; const ax = Math.abs(x) / hw, fy = (y - lm.chinY) / hw;
    const we = Math.min(1, 1.5 * Math.exp(-(sq((ax - .45) / .6) + sq((fy - 1.68) / .7)))), wb = .8 * Math.exp(-(sq((ax - .4) / .85) + sq((fy - 2.22) / .3))); const nose = Math.min(1, Math.max(0, (ax - .13) / .22)); const w = Math.max(we * nose, wb) * Math.min(1, (z - lm.zc) / .03); if (w < .01) continue;
    const [cx, cy] = cell(x, y); if (cx < 0 || cy < 0 || cx >= W || cy >= H) continue; const t = G[cy * W + cx]; if (t < -8) continue; pos.setZ(i, z + (t - z) * w); wg[grp[i]] = Math.max(wg[grp[i]], w); }
  { const ng = geo.userData.ng, grp = geo.userData.group, ix = geo.index; const nb = Array.from({ length: ng }, () => new Set()); for (let t = 0; t < ix.count; t += 3) { const a = grp[ix.getX(t)], b = grp[ix.getX(t + 1)], c = grp[ix.getX(t + 2)]; nb[a].add(b); nb[a].add(c); nb[b].add(a); nb[b].add(c); nb[c].add(a); nb[c].add(b); }
    const gp = new Float32Array(ng * 3); for (let i = 0; i < n; i++) { const g = grp[i]; gp[g * 3] = pos.getX(i); gp[g * 3 + 1] = pos.getY(i); gp[g * 3 + 2] = pos.getZ(i); }
    for (let it = 0; it < 4; it++) { const nw = wg.slice(); for (let g = 0; g < ng; g++) if (wg[g] > 0) for (const o of nb[g]) nw[o] = Math.max(nw[o], wg[g] * .8); wg.set(nw); }
    const tmp = gp.slice(); const pass = lam => { for (let g = 0; g < ng; g++) { const L = nb[g]; if (!wg[g] || !L.size) { tmp[g * 3] = gp[g * 3]; tmp[g * 3 + 1] = gp[g * 3 + 1]; tmp[g * 3 + 2] = gp[g * 3 + 2]; continue; } let x = 0, y = 0, z = 0; for (const o of L) { x += gp[o * 3]; y += gp[o * 3 + 1]; z += gp[o * 3 + 2]; } const k = 1 / L.size, l = lam * Math.min(1, wg[g] * 1.6); tmp[g * 3] = gp[g * 3] + l * (x * k - gp[g * 3]); tmp[g * 3 + 1] = gp[g * 3 + 1] + l * (y * k - gp[g * 3 + 1]); tmp[g * 3 + 2] = gp[g * 3 + 2] + l * (z * k - gp[g * 3 + 2]); } gp.set(tmp); };
    for (let it = 0; it < 18; it++) { pass(.5); pass(-.53); }
    for (let i = 0; i < n; i++) { const g = grp[i]; if (wg[g] > 0) pos.setXYZ(i, gp[g * 3], gp[g * 3 + 1], gp[g * 3 + 2]); } }
  weldNormals(geo);
}
