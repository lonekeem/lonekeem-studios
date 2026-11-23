// v1.9.50 graphics pass: post chain per quality, per-level look (exposure / fog / grade / particles),
// bullet impact sparks + dust puffs, ejected shell casings, ambient dust / ember motes.
// Everything here is pooled and created at load so nothing compiles a new shader mid-fight.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// final colour grade (runs after OutputPass, in display space): lift / gain tint, saturation, contrast, vignette
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uGain: { value: new THREE.Color(1, 1, 1) }, uLift: { value: new THREE.Color(0, 0, 0) }, uSat: { value: 1.08 }, uCon: { value: 1.06 }, uVig: { value: .32 }, uAsp: { value: 1.8 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec3 uGain; uniform vec3 uLift; uniform float uSat; uniform float uCon; uniform float uVig; uniform float uAsp; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec3 col = c.rgb * uGain + uLift * (1.0 - c.rgb);
      float l = dot(col, vec3(.2126, .7152, .0722)); col = mix(vec3(l), col, uSat); col = (col - .5) * uCon + .5;
      vec2 d = (vUv - .5) * vec2(uAsp, 1.0) * .62; float v = smoothstep(.95, .25, length(d)); col *= mix(1.0 - uVig, 1.0, v);
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), c.a); }`,
};

export function setupPost(g, Q) {
  const r = g.renderer, scene = g.scene, cam = g.camera; g.composer = null; g._grade = null; g._bloom = null;
  document.body.classList.toggle('gfx-vig', !Q.post && Q.name !== 'med');
  if (Q.name === 'low') return null;
  try {
    const w = innerWidth, h = innerHeight; const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: r.capabilities.isWebGL2 ? 4 : 0 });
    const c = new EffectComposer(r, rt); c.addPass(new RenderPass(scene, cam));
    if (Q.post) { const ao = new GTAOPass(scene, cam, w, h); ao.blendIntensity = .8; c.addPass(ao); }
    const bl = g._bloom = new UnrealBloomPass(new THREE.Vector2(w, h), Q.post ? .32 : .26, .35, .86); c.addPass(bl);
    c.addPass(new OutputPass());
    const gr = g._grade = new ShaderPass(GradeShader); c.addPass(gr);
    g.composer = c; return c;
  } catch (e) { g.composer = null; document.body.classList.add('gfx-vig'); return null; }
}

// ---------- per-level look ----------
// exposure, fog multiplier, grade (gain / lift / sat / contrast), bloom, motes kind
const LOOKS = {
  night: { exp: 1.12, fog: 1, gain: [.98, 1.0, 1.04], lift: [.012, .018, .03], sat: 1.06, con: 1.08, bloom: 1, motes: 'ember' },
  tense: { exp: 1.04, fog: 1.05, gain: [1.02, .98, .97], lift: [.02, .012, .012], sat: 1.04, con: 1.1, bloom: 1.1, motes: 'ember' },
  sad: { exp: 1.06, fog: 1, gain: [.98, 1, 1.03], lift: [.015, .02, .03], sat: .92, con: 1.04, bloom: .9, motes: 'dust' },
  day: { exp: 1.04, fog: 1, gain: [1.03, 1.01, .97], lift: [.01, .01, .01], sat: 1.1, con: 1.06, bloom: .7, motes: 'dust' },
  evening: { exp: 1.06, fog: 1, gain: [1.05, 1.0, .95], lift: [.02, .012, .01], sat: 1.1, con: 1.07, bloom: 1, motes: 'ember' },
  dark: { exp: 1.1, fog: 1, gain: [.96, 1.02, 1.0], lift: [.01, .02, .02], sat: .95, con: 1.1, bloom: 1.2, motes: 'dust' },
  ward: { exp: 1.0, fog: 1, gain: [1.0, 1.0, 1.0], lift: [.0, .01, .01], sat: 1.04, con: 1.1, bloom: 1, motes: 'dust' },
  lab: { exp: .98, fog: 1, gain: [.97, 1.0, 1.04], lift: [.0, .008, .016], sat: 1.06, con: 1.12, bloom: 1.15, motes: 'dust' },
};
export function levelLook(g, st) {
  if (!g || !st) return; const key = st.light === 'lab' ? 'lab' : st.light === 'dark' ? 'dark' : st.light === 'ward' ? 'ward' : (st.mood || 'night'); const L = LOOKS[key] || LOOKS.night; g._look = key;
  g.renderer.toneMappingExposure = L.exp * (g._expBase || 1.05) / 1.05;
  if (g._grade) { const u = g._grade.uniforms; u.uGain.value.setRGB(...L.gain); u.uLift.value.setRGB(...L.lift); u.uSat.value = L.sat; u.uCon.value = L.con; u.uVig.value = st.light ? .26 : .34; }
  if (g._bloom) g._bloom.strength = (g.Q.post ? .32 : .26) * L.bloom;
  setMotes(g, st.light ? 'dust' : (st.rain ? 'none' : L.motes));
}

// ---------- pooled FX ----------
const SPARK_N = 64, CAS_N = 24;
export function initGfxFx(g) {
  const s = g.scene;
  // sparks: tiny additive streaks (unlit)
  const sm = new THREE.MeshBasicMaterial({ color: '#ffd890', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const sp = g._sparks = new THREE.InstancedMesh(new THREE.BoxGeometry(.018, .018, .16), sm, SPARK_N); sp.instanceMatrix.setUsage(THREE.DynamicDrawUsage); sp.frustumCulled = false; sp.count = 0; s.add(sp);
  g._sd = []; for (let i = 0; i < SPARK_N; i++) g._sd.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0 }); g._sI = 0;
  // dust puffs at impact (soft sprites)
  const pc = document.createElement('canvas'); pc.width = pc.height = 64; const p2 = pc.getContext('2d'); const gr = p2.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.85)'); gr.addColorStop(.5, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); p2.fillStyle = gr; p2.fillRect(0, 0, 64, 64);
  const puffTex = new THREE.CanvasTexture(pc); g._puffs = [];
  for (let i = 0; i < 8; i++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: '#b8b2a6', transparent: true, depthWrite: false, opacity: 0 })); m.visible = false; s.add(m); g._puffs.push({ m, life: 0 }); } g._pI = 0;
  // shell casings: brass cylinders, simple gravity + one bounce
  const cm = new THREE.MeshStandardMaterial({ color: '#c8963a', metalness: .85, roughness: .32 });
  const cs = g._cas = new THREE.InstancedMesh(new THREE.CylinderGeometry(.012, .012, .05, 6), cm, CAS_N); cs.instanceMatrix.setUsage(THREE.DynamicDrawUsage); cs.frustumCulled = false; cs.count = 0; s.add(cs);
  g._cd = []; for (let i = 0; i < CAS_N; i++) g._cd.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), life: 0, b: 0 }); g._cI = 0;
  // ambient motes: one Points cloud that wraps around the camera
  const MN = g.Q.name === 'low' ? 70 : g.Q.name === 'med' ? 140 : 220; const pos = new Float32Array(MN * 3), seed = new Float32Array(MN);
  for (let i = 0; i < MN; i++) { pos[i * 3] = Math.random() * 24 - 12; pos[i * 3 + 1] = Math.random() * 6; pos[i * 3 + 2] = Math.random() * 24 - 12; seed[i] = Math.random(); }
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); mg.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const dc = document.createElement('canvas'); dc.width = dc.height = 32; const d2 = dc.getContext('2d'); const dg = d2.createRadialGradient(16, 16, 0, 16, 16, 16); dg.addColorStop(0, 'rgba(255,255,255,1)'); dg.addColorStop(.4, 'rgba(255,255,255,.5)'); dg.addColorStop(1, 'rgba(255,255,255,0)'); d2.fillStyle = dg; d2.fillRect(0, 0, 32, 32);
  const mm = new THREE.PointsMaterial({ map: new THREE.CanvasTexture(dc), size: .06, sizeAttenuation: true, color: '#ffb060', transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending, fog: true, toneMapped: false });
  const mo = g._motes = new THREE.Points(mg, mm); mo.frustumCulled = false; mo.visible = false; mo.userData.kind = 'none'; s.add(mo);
}
function setMotes(g, kind) {
  const mo = g._motes; if (!mo) return; mo.userData.kind = kind; mo.visible = kind !== 'none';
  if (kind === 'ember') { mo.material.color.set('#ff9a4a'); mo.material.size = .07; mo.material.opacity = .85; mo.material.blending = THREE.AdditiveBlending; }
  else if (kind === 'dust') { mo.material.color.set('#d8dccf'); mo.material.size = .035; mo.material.opacity = .45; mo.material.blending = THREE.NormalBlending; }
  mo.material.needsUpdate = true;
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _z = new THREE.Vector3(0, 0, 1), _d = new THREE.Vector3();
export function impactFx(g, pos, dir, metal = false) {
  if (!g._sparks) return; const n = metal ? 9 : 5;
  for (let i = 0; i < n; i++) { const d = g._sd[g._sI = (g._sI + 1) % SPARK_N]; d.p.copy(pos); d.v.set(-dir.x * 2 + (Math.random() - .5) * 5, Math.random() * 3.2 + .6, -dir.z * 2 + (Math.random() - .5) * 5); d.life = .18 + Math.random() * .22; }
  const P = g._puffs[g._pI = (g._pI + 1) % g._puffs.length]; P.m.position.copy(pos).addScaledVector(dir, -.08); P.life = .55; P.m.visible = true; P.m.scale.setScalar(.25);
}
export function ejectCasing(g, mz, id) {
  if (!g._cas || /bat|fists|knife|flamer|launcher|crossbow|harpoon|saw/.test(id || '')) return;
  const yaw = g.player ? g.player.root.rotation.y : 0, rx = -Math.cos(yaw), rz = Math.sin(yaw); // eject to the shooter's right
  const c = g._cd[g._cI = (g._cI + 1) % CAS_N]; c.p.copy(mz).addScaledVector(_d.set(Math.sin(yaw), 0, Math.cos(yaw)), -.22); c.v.set(rx * (1.6 + Math.random()), 1.8 + Math.random() * .8, rz * (1.6 + Math.random())); c.r.set(Math.random() * 6, Math.random() * 6, 0); c.w.set(14 + Math.random() * 10, 8, 0); c.life = 1.6; c.b = 0;
}
export function tickGfx(g, dt) {
  if (!g._sparks) return;
  // sparks
  let k = 0; const sp = g._sparks;
  for (const d of g._sd) { if (d.life <= 0) continue; d.life -= dt; d.v.y -= 9.8 * dt; d.p.addScaledVector(d.v, dt); if (d.life <= 0) continue;
    _q.setFromUnitVectors(_z, _d.copy(d.v).normalize()); _s.set(1, 1, Math.min(1.4, d.life * 6)); _m.compose(d.p, _q, _s); sp.setMatrixAt(k++, _m); }
  sp.count = k; if (k) sp.instanceMatrix.needsUpdate = true;
  for (const P of g._puffs) { if (P.life <= 0) continue; P.life -= dt; const t = 1 - P.life / .55; P.m.scale.setScalar(.25 + t * .7); P.m.material.opacity = .5 * (1 - t); P.m.position.y += dt * .3; if (P.life <= 0) P.m.visible = false; }
  // casings
  let n = 0; const cs = g._cas;
  for (const c of g._cd) { if (c.life <= 0) continue; c.life -= dt; c.v.y -= 9.8 * dt; c.p.addScaledVector(c.v, dt); c.r.x += c.w.x * dt; c.r.y += c.w.y * dt;
    if (c.p.y < .03) { c.p.y = .03; if (c.b < 2 && c.v.y < -.5) { c.v.y *= -.35; c.v.x *= .5; c.v.z *= .5; c.w.multiplyScalar(.4); c.b++; } else { c.v.set(0, 0, 0); c.w.set(0, 0, 0); c.r.x = Math.PI / 2; } }
    _q.setFromEuler(c.r); _s.set(1, 1, 1); _m.compose(c.p, _q, _s); cs.setMatrixAt(n++, _m); }
  cs.count = n; if (n) cs.instanceMatrix.needsUpdate = true;
  // motes
  const mo = g._motes; if (mo && mo.visible) { const cp = g.camera.position, a = mo.geometry.attributes.position, sd = mo.geometry.attributes.seed.array, arr = a.array, ember = mo.userData.kind === 'ember', t = g.t || 0;
    for (let i = 0; i < sd.length; i++) { const j = i * 3; const s = sd[i];
      if (ember) { arr[j + 1] += dt * (.35 + s * .5); arr[j] += Math.sin(t * .7 + s * 40) * dt * .25; } else { arr[j + 1] += Math.sin(t * .4 + s * 30) * dt * .05; arr[j] += Math.cos(t * .3 + s * 20) * dt * .08; }
      // wrap into a 24 x 6 x 24 box around the camera
      let x = arr[j] - cp.x, z = arr[j + 2] - cp.z; if (x > 12) arr[j] -= 24; else if (x < -12) arr[j] += 24; if (z > 12) arr[j + 2] -= 24; else if (z < -12) arr[j + 2] += 24;
      if (arr[j + 1] > 6) arr[j + 1] = 0; else if (arr[j + 1] < 0) arr[j + 1] = 6; }
    a.needsUpdate = true; }
}
// warm the FX shaders under the loading overlay (call before compile)
export function warmGfx(g, on) { if (!g._sparks) return; g._sparks.count = on ? 1 : 0; g._cas.count = on ? 1 : 0; g._puffs[0].m.visible = !!on; }
