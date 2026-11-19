// Multiplayer avatar: a rigged, smooth cartoon base body (Fal/Meshy generated, original) re-dressed entirely in code:
// analytic skin + face painting, morphable head/body, shader-cut garment shells, shell hair/beards and rigid accessories.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { hookVertex, skinTone } from './shaders.js';
import { FACE_UNIFORMS, FACE_FRAG_DECL } from './face.js';

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
  const geo = skin.geometry; smoothMesh(geo, names, sk);
  const pos = geo.attributes.position, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, ix = geo.index, n = pos.count;
  const used = new Uint8Array(n); for (let i = 0; i < ix.count; i++) used[ix.getX(i)] = 1;
  const dom = new Int16Array(n), reg = new Float32Array(n), headW = new Float32Array(n);
  const headIdx = names.indexOf('Head');
  for (let i = 0; i < n; i++) { let bi = 0, bw = -1; for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); const b = si.getComponent(i, k); if (b === headIdx) headW[i] += w; if (w > bw) { bw = w; bi = b; } } dom[i] = bi; reg[i] = REG[names[bi]] ?? 2; }
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
  return { key, scene, skin, geo, names, P, aR, reg, headW, dom, used, lm, ankleY, hipsY, neckY };
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
    this.skin = skin; const g = skin.geometry = tpl.geo.clone(); g.userData = { group: tpl.geo.userData.group, ng: tpl.geo.userData.ng }; g.setAttribute('aR', new THREE.BufferAttribute(tpl.aR, 4));
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
