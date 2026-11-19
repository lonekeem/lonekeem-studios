// Gore + wounds (M-rated look, characters stay smooth cartoon): lasting wound marks and blood on the avatar skin (shader, follows the animation),
// persistent mouth / face / hand blood on zombies, and spreading blood pools.
import * as THREE from 'three';
import { canvasTex } from './util.js';
const N = 10; // wound slots per character
const KIND = { bite: 0, bullet: 1, claw: 2, smear: 3, torn: 4 };
const FRAG_DECL = `varying vec3 vWP; varying vec3 vWN; uniform vec4 uWA[${N}]; uniform vec4 uWB[${N}]; uniform vec4 uWC[${N}]; uniform float uWN;
float wH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float wNz(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(wH(i), wH(i+vec2(1,0)), f.x), mix(wH(i+vec2(0,1)), wH(i+vec2(1,1)), f.x), f.y); }\n`;
const FRAG_BODY = `
float wM = 0.0, wFresh = 0.0; vec3 wCol = vec3(0.0);
{ vec3 wnrm = normalize(vWN);
  for (int i = 0; i < ${N}; i++) { if (float(i) >= uWN) break;
    vec3 c0 = uWA[i].xyz; float R = uWA[i].w; vec3 n = uWB[i].xyz; float kind = floor(uWB[i].w); float sd = fract(uWB[i].w) * 10.0; float fr = uWC[i].x, run = uWC[i].y;
    vec3 d = vWP - c0; float dn = dot(d, n); vec3 lat = d - n * dn;
    if (abs(dn) < 0.2 && dot(wnrm, n) > 0.15) {
      vec3 tU = normalize(cross(n, vec3(0.0, 1.0, 0.0)) + vec3(0.0001, 0.0, 0.0)); vec3 tV = cross(n, tU);
      vec2 q = vec2(dot(lat, tU), dot(lat, tV)) / R; float r = length(q); float nz = wNz(q * 4.0 + sd) * 0.5 + wNz(q * 9.0 + sd * 3.0) * 0.25;
      float m = 0.0; vec3 col = mix(vec3(0.20, 0.0, 0.0), vec3(0.42, 0.015, 0.015), fr);
      if (kind < 0.5) { // bite: bruise halo, torn flesh, tooth punctures
        float bru = 1.0 - smoothstep(0.9, 1.6, r + nz * 0.4); wCol = mix(wCol, vec3(0.35, 0.12, 0.2), bru * 0.5); wM = max(wM, bru * 0.45);
        float fl = 1.0 - smoothstep(0.38, 0.62, r + (nz - 0.4) * 0.5); float ang = atan(q.y, q.x); float tooth = step(0.62, fract(ang * 1.6 + sd)) * smoothstep(0.1, 0.0, abs(r - 0.78 - nz * 0.1)) ;
        m = max(fl, tooth * 0.95); col = mix(col, vec3(0.1, 0.0, 0.0), fl * 0.6); }
      else if (kind < 1.5) { float hole = 1.0 - smoothstep(0.14, 0.24, r); float sp = (1.0 - smoothstep(0.35, 0.9, r + nz * 0.5)) * 0.9; m = max(sp, hole); col = mix(col, vec3(0.05, 0.0, 0.0), hole); }
      else if (kind < 2.5) { float ca = 0.0; for (int k = -1; k <= 1; k++) { vec2 e = vec2(q.x * cos(sd) - q.y * sin(sd), q.x * sin(sd) + q.y * cos(sd)); ca = max(ca, (1.0 - smoothstep(0.05, 0.1, abs(e.y - float(k) * 0.4 + nz * 0.1))) * (1.0 - smoothstep(0.7, 1.0, abs(e.x)))); } m = ca; col = mix(col, vec3(0.12, 0.0, 0.0), 0.4); }
      else if (kind < 3.5) { m = 1.0 - smoothstep(0.5, 1.0, r + (nz - 0.4) * 0.9); }
      else { float ed = r + (nz - 0.4) * 0.7; m = 1.0 - smoothstep(0.82, 1.0, ed); float core = 1.0 - smoothstep(0.35, 0.7, ed); col = mix(col, vec3(0.62, 0.12, 0.12), core * 0.55); col = mix(col, vec3(0.08, 0.0, 0.0), (1.0 - smoothstep(0.0, 0.3, ed)) * 0.8); }
      // blood running down from the wound (bind-space down)
      float down = -d.y; float u = dot(lat, tU) / R; float rn = (kind < 3.5 && kind > 2.5) ? 0.0 : run; float rr = step(0.0, down) * (1.0 - smoothstep(rn * 0.6, rn, down)) * (1.0 - smoothstep(0.1, 0.17, abs(u + (nz - 0.4) * 0.3)));
      m = max(m, rr * 0.9 * step(0.001, rn));
      if (m > wM) { wM = m; wCol = col; } wFresh = max(wFresh, m * fr); } } }
`;
export function initWounds(ch) {
  const sk = ch.skin; if (!sk || ch._wounds) return; const old = sk.material; const mat = old.clone(); const prev = old.onBeforeCompile; const key = old.customProgramCacheKey ? old.customProgramCacheKey() : '';
  const U = { uWA: { value: Array.from({ length: N }, () => new THREE.Vector4()) }, uWB: { value: Array.from({ length: N }, () => new THREE.Vector4()) }, uWC: { value: Array.from({ length: N }, () => new THREE.Vector4()) }, uWN: { value: 0 } };
  mat.onBeforeCompile = (sh) => { prev && prev(sh); Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec3 vWP; varying vec3 vWN;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = position; vWN = objectNormal;');
    sh.fragmentShader = FRAG_DECL + sh.fragmentShader.replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\n' + FRAG_BODY + 'diffuseColor.rgb = mix(diffuseColor.rgb, wCol, clamp(wM, 0.0, 1.0));')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.18, clamp(wFresh * 1.2, 0.0, 1.0));'); };
  mat.customProgramCacheKey = () => key + 'wnd'; mat.needsUpdate = true; sk.material = mat;
  ch._wounds = { list: [], U, mat };
  // mitten hands: blood amount on the hand material (local noise, heavier toward the fingertips)
  if (ch.handMats) for (const s of ['Left', 'Right']) { const hm = ch.handMats[s]; if (!hm) continue; const hu = { uHB: { value: 0 } }; (ch._hb = ch._hb || []).push(hu);
    hm.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, hu); sh.vertexShader = 'varying vec3 vLP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvLP = position;');
      sh.fragmentShader = 'varying vec3 vLP; uniform float uHB;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n { float hn = vLP.y*0.5+0.5 + (sin(vLP.x*5.0+1.3)*sin(vLP.z*4.0+2.1))*0.18; float hb = smoothstep(1.0-uHB*1.25, 1.0-uHB*1.25+0.22, hn) * step(0.001, uHB); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.17,0.0,0.0), clamp(hb,0.0,1.0)*0.9); }'); };
    hm.customProgramCacheKey = () => 'mittenblood'; hm.needsUpdate = true; }
}
// bind-space regions (m): [from bone, to bone] -> point along the limb
const REG = { head: ['Head', 'head_end', .35], neck: ['neck', 'Head', .4], chest: ['Spine', 'neck', .5], belly: ['Hips', 'Spine', .55], uarmL: ['LeftArm', 'LeftForeArm', .5], uarmR: ['RightArm', 'RightForeArm', .5], farmL: ['LeftForeArm', 'LeftHand', .5], farmR: ['RightForeArm', 'RightHand', .5], thighL: ['LeftUpLeg', 'LeftLeg', .5], thighR: ['RightUpLeg', 'RightLeg', .5], shinL: ['LeftLeg', 'LeftFoot', .5], shinR: ['RightLeg', 'RightFoot', .5] };
const _m = new THREE.Matrix4();
function bonePos(ch, name) { const sk = ch.skin, i = sk.skeleton.bones.findIndex(b => b.name === name); if (i < 0) return null; _m.copy(sk.skeleton.boneInverses[i]).invert(); return new THREE.Vector3().setFromMatrixPosition(_m); }
function regionPoint(ch, reg, t) { const R = REG[reg]; if (!R) return null; const a = bonePos(ch, R[0]), b = bonePos(ch, R[1]); if (!a || !b) return null; return a.lerp(b, t ?? R[2]); }
export const PARTS = Object.keys(REG);
// add a lasting mark. o: { kind, part, nx (-1 left .. 1 right facing), nz (front +1 / back -1), size (m), run, fresh, t }
export function addWound(ch, o = {}) {
  if (!ch.skin) return null; initWounds(ch); const W = ch._wounds, part = o.part || 'chest'; const p = regionPoint(ch, part, o.t); if (!p) return null;
  const nrm = new THREE.Vector3(o.nx || 0, o.ny || 0, o.nz ?? 1); if (nrm.lengthSq() < 1e-3) nrm.set(0, 0, 1); nrm.normalize();
  const w = { kind: o.kind || 'bite', part, p, n: nrm, R: o.size || .07, run: o.run ?? .18, fresh: o.fresh ?? 1, seed: Math.random() * .99, grow: 0 };
  if (W.list.length >= N) { let k = 0; for (let i = 1; i < W.list.length; i++) if (W.list[i].kind === 'smear' || W.list[i].R < W.list[k].R) k = i; W.list.splice(k, 1); }
  W.list.push(w); syncWounds(ch); return w; }
export function syncWounds(ch) { const W = ch._wounds; if (!W) return; W.list.forEach((w, i) => { W.U.uWA.value[i].set(w.p.x, w.p.y, w.p.z, w.R); W.U.uWB.value[i].set(w.n.x, w.n.y, w.n.z, KIND[w.kind] + w.seed * .1); W.U.uWC.value[i].set(w.fresh, w.run, 0, 0); }); W.U.uWN.value = W.list.length; }
// zombie mouth / chin / chest / hands: grows with every bite and stays
export function bloodyMouth(ch, amt = .25) {
  if (!ch.skin) return; initWounds(ch); const W = ch._wounds; let m = W.mouth, c = W.chin;
  const hp = bonePos(ch, 'Head'), he = bonePos(ch, 'head_end'), hf = bonePos(ch, 'headfront'); if (!hp || !he || !hf) return; const hl = he.y - hp.y;
  if (!m) { const pt = new THREE.Vector3(hp.x, hp.y + hl * .22, hf.z * .5 + hp.z * .5); m = W.mouth = { kind: 'smear', part: 'head', p: pt.clone().setZ(Math.max(hf.z, hp.z + .1) - .02), n: new THREE.Vector3(0, -.15, 1).normalize(), R: .03, run: .12, fresh: 1, seed: Math.random() * .99 }; W.list.push(m);
    c = W.chin = { kind: 'smear', part: 'head', p: m.p.clone().add(new THREE.Vector3(0, -hl * .13, -.01)), n: new THREE.Vector3(0, -.3, 1).normalize(), R: .025, run: hl * .6, fresh: 1, seed: Math.random() * .99 }; W.list.push(c);
    const ch2 = W.chest = { kind: 'smear', part: 'chest', p: regionPoint(ch, 'chest', .55), n: new THREE.Vector3(0, 0, 1), R: .02, run: .22, fresh: 1, seed: Math.random() * .99 }; W.list.push(ch2); }
  m.R = Math.min(.1, m.R + amt * .03); c.R = Math.min(.08, c.R + amt * .025); W.chest.R = Math.min(.11, W.chest.R + amt * .02); syncWounds(ch);
  (ch._hb || []).forEach(h => { h.uHB.value = Math.min(1, h.uHB.value + amt * .18); }); }
export function setHandBlood(ch, v) { (ch._hb || []).forEach(h => { h.uHB.value = Math.max(h.uHB.value, v); }); }

// ---------- blood pools ----------
let _poolTex = null;
function poolTex() { if (_poolTex) return _poolTex; _poolTex = [0, 1, 2].map(k => canvasTex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); const cx = w / 2, cy = h / 2; let s = 7 + k * 13; const rn = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const blob = (x, y, r, a) => { const gr = g.createRadialGradient(x, y, r * .2, x, y, r); gr.addColorStop(0, `rgba(58,0,2,${a})`); gr.addColorStop(.8, `rgba(78,2,4,${a * .96})`); gr.addColorStop(1, 'rgba(78,2,4,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
    blob(cx, cy, 70, 1); for (let i = 0; i < 16; i++) { const a = rn() * 6.28, d = 20 + rn() * 55; blob(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 18 + rn() * 28, .97); }
    for (let i = 0; i < 5; i++) { const a = rn() * 6.28; for (let j = 0; j < 6; j++) { const d = 70 + j * 9; blob(cx + Math.cos(a + j * .04) * d, cy + Math.sin(a + j * .04) * d, 8 - j * .9, .95); } }
    for (let i = 0; i < 24; i++) { const a = rn() * 6.28, d = 95 + rn() * 28; g.fillStyle = 'rgba(70,0,2,.9)'; g.beginPath(); g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1 + rn() * 3.5, 0, 7); g.fill(); } })); return _poolTex; }
export function makePool(g, x, z, size = .5, target = 2.2) { const T = poolTex(); const mat = new THREE.MeshStandardMaterial({ map: T[(Math.random() * 3) | 0], transparent: true, depthWrite: false, roughness: .08, metalness: .1, color: '#c8c8c8', polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const m = new THREE.Mesh(g._poolGeo || (g._poolGeo = new THREE.PlaneGeometry(1, 1)), mat); m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * 6.28; m.position.set(x, .045 + (g.pools.length % 9) * .0012, z); m.scale.setScalar(size); m.renderOrder = 2; m.userData.target = target; m.userData.grow = .35;
  g.scene.add(m); g.pools.push(m); while (g.pools.length > 40) { const o = g.pools.shift(); g.scene.remove(o); o.material.dispose(); } return m; }
export function tickPools(g, dt) { for (const p of g.pools) { const s = p.scale.x, t = p.userData.target; if (s < t) p.scale.setScalar(Math.min(t, s + (t - s) * Math.min(1, dt * p.userData.grow) + dt * .004)); } }
