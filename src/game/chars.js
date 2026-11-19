import * as THREE from 'three';
import { bodyLook, dressChar } from './looks.js';
import { canvasTex } from './util.js';
import { buildWeapon } from './gear.js';
import { attachRig, EXTRA } from './avatar.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

// Body material: one CC0 Quaternius mannequin, "dressed" in the shader by bind-pose regions
// (skin / shirt / sleeves / pants / shoes / hair), with procedural grime and blood.

// v2.0 stylized-avatar helpers -------------------------------------------------
const _decals = {};
export function decalTex(kind) { // printed patches: collegiate "B" (varsity jacket) and Nia's hoodie bunny
  if (_decals[kind]) return _decals[kind];
  return _decals[kind] = canvasTex(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h);
    if (kind === 'rabbit') { const ell = (x, y, rx, ry, c, rot = 0) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 7); g.fill(); };
      ell(48, 34, 10, 30, '#f4f1f0', -.12); ell(80, 34, 10, 30, '#f4f1f0', .12); ell(48, 36, 4.5, 22, '#f2a7b6', -.12); ell(80, 36, 4.5, 22, '#f2a7b6', .12);
      ell(64, 82, 34, 28, '#f7f4f2'); ell(53, 78, 4, 5.5, '#2a1a20'); ell(75, 78, 4, 5.5, '#2a1a20'); ell(64, 90, 5, 3.5, '#f2a7b6'); g.strokeStyle = '#d9a0aa'; g.lineWidth = 2; g.beginPath(); g.moveTo(64, 93); g.quadraticCurveTo(58, 100, 52, 96); g.moveTo(64, 93); g.quadraticCurveTo(70, 100, 76, 96); g.stroke(); }
    else { g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 118px Georgia, serif'; g.lineJoin = 'round'; g.lineWidth = 12; g.strokeStyle = '#7c7a74'; g.strokeText('B', w / 2, h / 2 + 6); g.fillStyle = '#ffffff'; g.fillText('B', w / 2, h / 2 + 6); } });
}
// gentle cartoon lighting: warm rim light + a touch of saturation so characters read as polished 3D avatars
export function stylizeFrag(sh, sat = 1.1, rim = 0.16) {
  sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
    { float stRim = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0), 2.6);
      float stL = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)); diffuseColor.rgb = mix(vec3(stL), diffuseColor.rgb, ${sat.toFixed(2)});
      totalEmissiveRadiance += diffuseColor.rgb * stRim * ${rim.toFixed(2)} + vec3(0.02, 0.018, 0.016) * stRim; }`);
}
export function bodyMat(o) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.78, metalness: 0 });
  const U = m.userData.u = {
    uSkin: { value: new THREE.Color(o.skin) }, uShirt: { value: new THREE.Color(o.shirt) }, uPants: { value: new THREE.Color(o.pants) },
    uShoes: { value: new THREE.Color(o.shoes || '#1b1b1b') }, uHair: { value: new THREE.Color(o.hair || '#0d0a08') },
    uSleeve: { value: o.sleeve ?? 0.62 }, uJk: { value: o.jk || 0 }, uJacket: { value: new THREE.Color(o.jacket || o.shirt) }, uJSleeve: { value: new THREE.Color(o.jsleeve || o.jacket || o.shirt) }, uLong: { value: o.long || 0 }, uCamo: { value: o.camo || 0 }, uBoots: { value: o.boots || 0 }, uGlove: { value: o.gloves || 0 }, uPlaid: { value: o.plaid || 0 }, uStripe: { value: o.stripe || 0 }, uGloss: { value: o.gloss || 0 }, uPuff: { value: o.puff || 0 }, uNoHead: { value: o.nohead ? 1 : 0 }, uGrime: { value: o.grime || 0 }, uBlood: { value: o.blood || 0 }, uZed: { value: o.zed ? 1 : 0 }, uSeed: { value: Math.random() * 10 },
    uBaggy: { value: o.baggy || 0 }, uCargo: { value: o.cargo || 0 }, uSole: { value: o.sole || 0 }, uRib: { value: o.rib || 0 }, uDecal: { value: new THREE.Vector3(...(o.decal || [0, 0, 0])) }, uBadge: { value: decalTex(o.decalTex || 'B') },
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec3 vBP;\nuniform float uBaggy;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvBP = position; { float sy = smoothstep(1.22,1.36,position.y)*(1.0-smoothstep(1.47,1.53,position.y)); float sx = 1.0-smoothstep(0.30,0.40,abs(position.x)); float k = sy*sx*0.45; transformed.z = mix(transformed.z, -0.015, k*0.6); transformed.x *= 1.0 - k*0.16*smoothstep(0.1,0.22,abs(position.x)); float t = smoothstep(1.0,1.2,position.y)*(1.0-smoothstep(1.45,1.5,position.y))*(1.0-smoothstep(0.2,0.3,abs(position.x))); transformed.z = mix(transformed.z, -0.015, t*0.12); } if (uBaggy > 0.0 && abs(position.x) < 0.3 && position.y < 1.05) { float lk = smoothstep(0.05,0.32,position.y)*(1.0-smoothstep(0.8,1.02,position.y)); float cx = sign(position.x)*0.09; transformed.x = cx + (transformed.x-cx)*(1.0+0.55*uBaggy*lk); transformed.z *= 1.0+0.5*uBaggy*lk; }');
    sh.fragmentShader = 'varying vec3 vBP;\nuniform vec3 uSkin,uShirt,uPants,uShoes,uHair;uniform vec3 uJacket,uJSleeve;uniform float uNoHead,uJk,uLong,uCamo,uBoots,uGlove,uPlaid,uStripe,uGloss,uPuff;uniform float uSleeve,uGrime,uBlood,uZed,uSeed,uCargo,uSole,uRib;uniform vec3 uDecal;uniform sampler2D uBadge;\n' +
      sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float h = vBP.y / 1.83; float ax = abs(vBP.x); if (uNoHead > 0.5 && ((vBP.y > 1.47 && ax < 0.13) || (vBP.y > 1.49 && ax < 0.22))) discard;
      vec3 c = uPants; float jk = 0.0; float cl = 1.0;
      if (h > 0.575) c = uShirt;
      if (uJk > 0.5 && h > 0.575) { bool open = uJk < 1.5 && ax < 0.05 && vBP.z > 0.0 && h < 0.8; if (!open) { c = (ax > 0.17) ? uJSleeve : uJacket; jk = 1.0; } }
      if (uJk > 2.5) { c = uJacket; jk = 1.0; }
      if (uLong > 0.0 && h <= 0.575 && h > 0.575 - uLong * 0.28 && !(uJk < 1.5 && vBP.z > 0.03 && ax < 0.06)) { c = uJacket; jk = 1.0; }
      if (ax > uSleeve) { c = uSkin; cl = 0.0; jk = 0.0; }
      if (uGlove > 0.5 && ax > 0.62) { c = vec3(0.06); cl = 0.0; }
      if ((h > 0.82 && ax < 0.085) || (h > 0.86 && ax < 0.16)) { c = uSkin; cl = 0.0; jk = 0.0; }
      if (h < 0.055 + uBoots * 0.07) { c = uShoes; cl = 0.0; }
      if (uSole > 0.5 && h < 0.055) { if (vBP.y < 0.024) c = vec3(0.93,0.93,0.9); else if (vBP.z > 0.15 && vBP.y < 0.06) c = vec3(0.9,0.9,0.88); else if (vBP.y < 0.034) c = vec3(0.8); }
      if (uCargo > 0.5 && h < 0.56 && h > 0.2 && cl > 0.5) { float pk = step(0.115, ax) * step(ax, 0.2) * step(0.33, h) * step(h, 0.45); float fl = step(0.43, h) * step(h, 0.45) * step(0.115, ax) * step(ax, 0.2); c *= 1.0 - 0.14 * pk - 0.1 * fl; float edge = step(0.115, ax) * step(ax, 0.123) * step(0.33, h) * step(h, 0.45); c *= 1.0 - 0.16 * edge; }
      if (uRib > 0.5 && uJk > 0.5 && jk > 0.5 && h > 0.575 && h < 0.605) { c = uJSleeve * (0.9 + 0.1 * step(0.5, fract(vBP.x * 60.0))); }
      if (uDecal.z > 0.0 && cl > 0.5 && jk > 0.5 && vBP.z > 0.03) { vec2 bu = vec2((vBP.x - uDecal.x) / uDecal.z + 0.5, (vBP.y - uDecal.y) / uDecal.z + 0.5); if (bu.x > 0.0 && bu.x < 1.0 && bu.y > 0.0 && bu.y < 1.0) { vec4 bt = texture2D(uBadge, bu); c = mix(c, bt.rgb, bt.a); } }
      if (uJk < 2.5 && h > 0.548 && h < 0.578 && ax < 0.2 && jk < 0.5) c = uShoes * 1.4 + 0.02; // belt
      if (uCamo > 0.5 && cl > 0.5 && jk < 0.5 || (uCamo > 0.5 && uJk > 1.5 && jk > 0.5)) { float q = sin(vBP.x*17.+sin(vBP.y*13.)*2.)+sin(vBP.y*19.+vBP.z*15.)+sin(vBP.z*21.+vBP.x*9.);
        c = q > 1.0 ? c*0.45 : q > 0.1 ? c*vec3(0.85,0.75,0.55) : q < -1.2 ? c*vec3(1.25,1.2,0.95) : c; }
      if (uPlaid > 1.5 && jk > 0.5) { vec2 pq = vec2(vBP.x * 20.0, vBP.y * 20.0); float m = step(0.5, fract(pq.x)) + step(0.5, fract(pq.y)); c = m > 1.5 ? c * 0.16 : m > 0.5 ? c * 0.62 : c * 1.12; }
      else if (uPlaid > 0.5 && jk > 0.5) { float a = step(0.7, fract(vBP.y*22.)) + step(0.7, fract((vBP.x+vBP.z)*22.)); c *= 1.0 - 0.35*min(a,1.0) - 0.25*step(1.5,a); }
      if (uStripe > 0.5 && cl > 0.5 && ((h < 0.575 && h > 0.06 && ax > 0.12) || (fract(h*6.0) < 0.06 && uJk > 0.5 && jk > 0.5 && h < 0.7))) c = vec3(0.85,0.85,0.7);
      if (uPuff > 0.5 && jk > 0.5) c *= 0.85 + 0.15*step(0.5, fract(vBP.y*14.));
      if (uZed > 0.5 && cl > 0.5) { float tr = sin(vBP.x*13.+vBP.y*9.+uSeed)*sin(vBP.y*17.+vBP.z*11.+uSeed*2.); float te = smoothstep(0.7, 0.74, tr); c = mix(c, uSkin * 0.75, te); c = mix(c, vec3(0.2,0.01,0.01), smoothstep(0.62,0.7,tr) * (1.0-te) * 0.8); }
      float n1 = sin(vBP.x*31.+uSeed)*sin(vBP.y*23.+uSeed*2.)*sin(vBP.z*37.+1.3);
      float n2 = sin(vBP.x*9.+uSeed*3.)*sin(vBP.y*7.)*sin(vBP.z*11.+uSeed);
      c *= mix(1.0, 0.55 + 0.6*(0.5+0.5*n1), uGrime);
      c = mix(c, c * vec3(0.55,0.62,0.45), uGrime * smoothstep(0.0,0.6,n2) * 0.8);
      float bl = smoothstep(0.25, 0.55, n2 + n1*0.3) * uBlood;
      float mouth = uZed * smoothstep(0.86,0.9,h) * step(h,0.93) * step(0.02, vBP.z) * step(ax,0.12);
      bl = max(bl, mouth); bl = max(bl, uZed * step(0.62, h) * step(h, 0.8) * step(0.03, vBP.z) * smoothstep(0.3,0.7,n1) * 0.9);
      c = mix(c, vec3(0.22,0.0,0.0), clamp(bl,0.,1.));
      diffuseColor.rgb = c;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.32, uGloss * step(0.52, vBP.y/1.83) * step(0.0, uJk - 0.5));\nroughnessFactor = mix(roughnessFactor, 0.25, step(0.5, diffuseColor.r - diffuseColor.g) * uBlood);');
  };
  const _obc = m.onBeforeCompile; m.onBeforeCompile = (sh) => { _obc(sh); stylizeFrag(sh, o.zed ? 0.95 : 1.12, o.zed ? 0.1 : 0.16); };
  m.customProgramCacheKey = () => 'body';
  return m;
}

export class CharLib {
  constructor(gltf) { this.gltf = gltf; this.clips = {}; gltf.animations.forEach(a => { this.clips[a.name] = a; });
    // strip root translation from in-place clips (keep feet planted), skip _RM
    for (const k in this.clips) { const c = this.clips[k]; c.tracks = c.tracks.filter(t => !(t.name.startsWith('root.') && t.name.endsWith('.position')) && !(t.name.endsWith('.scale') && /^DEF-(head|foot|toe)/.test(t.name))); }
  }
  make(look) { const obj = SkeletonUtils.clone(this.gltf.scene); const mat = bodyMat(look.hair ? Object.assign(bodyLook(look), { grime: Math.max(look.grime || 0, bodyLook(look).grime), blood: look.blood, zed: look.zed, nohead: 1 }) : look); const bones = {};
    obj.traverse(o => { if (o.isSkinnedMesh) { o.material = mat; o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false; } if (o.isBone) { bones[o.name] = o; bones[o.name.replace(/[.]/g, '')] = o; } });
    return { obj, mat, bones };
  }
}

export class Char {
  static frame = 0;
  // natural ground speed (m/s), stride length (m per full cycle) and left-foot phase offset of each locomotion clip (measured from the CC0 clips)
  static LOCO = [{ name: 'Walk_Loop', v: 1.0, stride: 1.333, off: 0 }, { name: 'Jog_Fwd_Loop', v: 4.6, stride: 4.2, off: -0.024 }, { name: 'Sprint_Loop', v: 6.2, stride: 4.13, off: -0.138 }];
  constructor(lib, look, scale = 1) {
    const { obj, mat, bones } = lib.make(look); this.lib = lib; this.mat = mat; this.bones = bones; this.look = look;
    this.root = new THREE.Group(); this.root.add(obj); obj.scale.setScalar(scale); this.scale = scale; this.model = obj;
    if (look.hair) dressChar(this, look);
    { // stylized avatar proportions: big head, chunky sneakers/boots (scale tracks for these bones are stripped from the clips)
      const hd = this.bone('DEF-head'); if (hd) hd.scale.setScalar(look.headK || 1.32);
      ['DEF-foot.L', 'DEF-foot.R', 'DEF-toe.L', 'DEF-toe.R'].forEach(n => { const b = this.bone(n); if (b) b.scale.set(1.14, 1.14, 1.2); }); }
    if (look.rig && lib.rigs && lib.rigs[look.rig] && !/[?&]rig=0/.test(location.search)) { try { attachRig(this, lib.rigs[look.rig], { tint: /zombie|raider|gen[mf]/.test(look.rig) ? look.tint : null, tintK: /gen[mf]/.test(look.rig) ? .22 : /zombie_/.test(look.rig) ? .3 : undefined, tintMul: look.rig === 'zombie_elder' ? .42 : look.rig === 'zombie_big' ? .86 : look.rig === 'zombie_male' ? .95 : undefined, rough: /zombie_/.test(look.rig) ? .88 : undefined, handColor: look.rig === 'raider' ? '#1c1c1f' : /zombie/.test(look.rig) ? '#8e9677' : null }); } catch (e) { console.warn('rig', e); } }
    this.mixer = new THREE.AnimationMixer(obj); this.actions = {}; this.cur = null; this.curName = ''; this.oneShot = null;
    this.mixer.addEventListener('finished', (e) => { if (this.oneShot && e.action === this.oneShot.a) { const cb = this.oneShot.cb; this.oneShot = null; cb && cb(); } });
  }
  act(name) { let a = this.actions[name]; if (!a) { const c = this.lib.clips[name]; if (!c) return null; a = this.actions[name] = this.mixer.clipAction(c); } return a; }
  play(name, { fade = 0.18, speed = 1, once = false, cb, force = false } = {}) {
    if (!force && this.curName === name && !once) { if (this.cur) this.cur.timeScale = speed; return; }
    const a = this.act(name); if (!a) return; const wasLoco = this.locoOn; if (wasLoco) this.endLoco(fade); a.reset(); a.timeScale = speed; a.enabled = true;
    if (once) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; this.oneShot = { a, cb }; } else a.setLoop(THREE.LoopRepeat);
    if (wasLoco) a.fadeIn(fade); else if (this.cur && this.cur !== a) a.crossFadeFrom(this.cur, fade, false); a.play(); this.cur = a; this.curName = name;
  }
  // v2.0 locomotion blend tree: Walk <-> Jog <-> Sprint blended by real ground speed, phase-matched, with the cycle advanced by
  // distance travelled (so feet stay planted: no sliding / moonwalking). dir < 0 plays the cycle backwards (backpedalling).
  locomote(speed, dir = 1, dt = 0.016, max = 6.4) {
    const N = Char.LOCO; const acts = N.map(n => this.act(n.name)); if (acts.some(a => !a)) return false;
    if (!this.locoOn) { this.locoOn = true; this.locoW = 0; this.locoPh = this.locoPh || 0; if (this.cur) { this.cur.fadeOut(0.2); this.cur = null; } this.curName = '__loco';
      acts.forEach(a => { a.enabled = true; a.stopFading(); a.setLoop(THREE.LoopRepeat); a.timeScale = 0; a.paused = false; a.play(); a.setEffectiveWeight(0); }); }
    const sm = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
    const v = Math.min(speed, max), tj = sm(N[0].v, N[1].v, v), ts = sm(N[1].v, N[2].v, v);
    const w = [1 - tj, tj * (1 - ts), tj * ts]; const stride = w[0] * N[0].stride + w[1] * N[1].stride + w[2] * N[2].stride;
    this.locoPh = (this.locoPh + (dir < 0 ? -1 : 1) * (speed / stride) * dt + 1000) % 1; this.locoW = Math.min(1, this.locoW + dt / 0.2);
    acts.forEach((a, i) => { a.time = (((this.locoPh + N[i].off) % 1 + 1) % 1) * a.getClip().duration; a.setEffectiveWeight(w[i] * this.locoW); });
    return true;
  }
  // v2.1 measured-speed locomotion: animation follows the ground speed the character ACTUALLY covered last frame (so collisions, pushes and
  // acceleration never leave the feet sliding), blended Walk<->Jog<->Sprint. Call once per frame, after the character was moved.
  autoLoco(dt, idle = 'Idle_Loop', max = 6.4) {
    const p = this.root.position, lp = this._lp || (this._lp = { x: p.x, z: p.z, f: Char.frame - 1 }); let sp = this._as || 0;
    if (dt > 0 && lp.f === Char.frame - 1) { const inst = Math.hypot(p.x - lp.x, p.z - lp.z) / dt; if (inst < 14) sp += (inst - sp) * Math.min(1, dt * (inst > sp ? 9 : 6)); } else if (lp.f < Char.frame - 1) sp = 0;
    lp.x = p.x; lp.z = p.z; lp.f = Char.frame; this._as = sp; this.locoSp = sp;
    const on = this.locoOn ? sp > 0.12 : sp > 0.22;
    if (on) { if (!this.locomote(sp, 1, dt, max)) this.play(sp > 2.5 ? 'Jog_Fwd_Loop' : 'Walk_Loop'); return true; }
    this.play(idle); return false; }
  endLoco(fade = 0.18) { if (!this.locoOn) return; this.locoOn = false; Char.LOCO.forEach(n => { const a = this.actions[n.name]; if (a) a.fadeOut(fade); }); this.cur = null; this.curName = ''; }
  bone(n) { return this.bones[n] || this.bones[n.replace(/[.]/g, '')]; }
  attach(boneName, mesh) { if (this.attachSkin && this.attachSkin(boneName, mesh)) return mesh; const b = this.bone(boneName); if (b) b.add(mesh); return mesh; }
  worldOf(boneName, out) { const b = this.bone(boneName); return b ? b.getWorldPosition(out) : this.root.getWorldPosition(out); }
}

// Simple props built from primitives
export function backpack() { const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: '#2e3a2a', roughness: .9 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.18), m); g.add(b); const p = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.08), new THREE.MeshStandardMaterial({ color: '#3a4632', roughness: .9 })); p.position.set(0, -0.08, -0.12); g.add(p);
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.36, 10), new THREE.MeshStandardMaterial({ color: '#2b4a7a', roughness: .8 })); roll.rotation.z = Math.PI / 2; roll.position.set(0, -0.26, 0); g.add(roll);
  const rope = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 6, 14), new THREE.MeshStandardMaterial({ color: '#b89a3a', roughness: .9 })); rope.position.set(0.17, 0, -0.02); rope.rotation.y = Math.PI / 2; g.add(rope);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g; }

export function weaponMesh(id) {
  { const r = buildWeapon(id); if (r) return r; }
  const g = new THREE.Group(); const dark = new THREE.MeshStandardMaterial({ color: '#1c1c1e', metalness: .7, roughness: .4 });
  const wood = new THREE.MeshStandardMaterial({ color: '#6b4a2b', roughness: .7 }); const steel = new THREE.MeshStandardMaterial({ color: '#9aa0a6', metalness: .9, roughness: .3 });
  const add = (geo, mat, x, y, z, rx = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.x = rx; m.castShadow = true; g.add(m); return m; };
  // local frame: grip at origin, barrel/blade along +Z
  if (id === 'bat') { add(new THREE.CylinderGeometry(0.03, 0.055, 0.85, 10), wood, 0, 0, 0.38, Math.PI / 2); }
  else if (id === 'pan') { add(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 8), dark, 0, 0, 0.12, Math.PI / 2); const p = add(new THREE.CylinderGeometry(0.15, 0.12, 0.05, 18), dark, 0, 0, 0.4); }
  else if (id === 'machete') { add(new THREE.BoxGeometry(0.035, 0.03, 0.14), dark, 0, 0, 0.02); add(new THREE.BoxGeometry(0.06, 0.006, 0.5), steel, 0, 0, 0.33); }
  else if (id === 'axe') { add(new THREE.CylinderGeometry(0.022, 0.022, 0.8, 8), wood, 0, 0, 0.33, Math.PI / 2); add(new THREE.BoxGeometry(0.2, 0.02, 0.14), new THREE.MeshStandardMaterial({ color: '#8a1414', metalness: .5, roughness: .5 }), 0.08, 0, 0.66); }
  else if (id === 'chainsaw') { add(new THREE.BoxGeometry(0.12, 0.16, 0.3), new THREE.MeshStandardMaterial({ color: '#d86a10', roughness: .6 }), 0, 0, 0.1); add(new THREE.BoxGeometry(0.03, 0.08, 0.55), steel, 0, 0, 0.5); }
  else if (id === 'katana') { add(new THREE.BoxGeometry(0.04, 0.04, 0.22), dark, 0, 0, 0.06); add(new THREE.BoxGeometry(0.02, 0.006, 0.75), steel, 0, 0, 0.55); }
  else if (id === 'tomahawk') { add(new THREE.CylinderGeometry(0.018, 0.02, 0.45, 6), dark, 0, 0, 0.2, Math.PI / 2); add(new THREE.BoxGeometry(0.13, 0.012, 0.09), steel, 0.06, 0, 0.4); }
  else if (id === 'longsword') { add(new THREE.CylinderGeometry(0.02, 0.02, 0.26, 6), wood, 0, 0, 0.06, Math.PI / 2); add(new THREE.BoxGeometry(0.22, 0.03, 0.03), steel, 0, 0, 0.2); add(new THREE.BoxGeometry(0.05, 0.008, 1.05), steel, 0, 0, 0.74); }
  else if (id === 'fists') { }
  else { const L = { pistol: .2, revolver: .26, smg: .36, shotgun: .75, rifle: .7, sniper: .95, saw: .85, lever: .8, auto12: .6, handcannon: .3, harpoon: .9, minigun: .8, crossbow: .6, flamer: .75, launcher: .55 }[id] || .3;
    add(new THREE.BoxGeometry(0.035, 0.11, 0.05), dark, 0, -0.05, 0); add(new THREE.BoxGeometry(0.045, 0.05, L), id === 'shotgun' ? wood : dark, 0, 0.02, L / 2 - 0.05);
    if (L > 0.3) { add(new THREE.BoxGeometry(0.04, 0.06, 0.22), id === 'sniper' || id === 'shotgun' ? wood : dark, 0, 0.0, -0.15); add(new THREE.BoxGeometry(0.03, 0.1, 0.04), dark, 0, -0.06, L * 0.4); }
    if (id === 'sniper' || id === 'rifle' || id === 'saw') add(new THREE.CylinderGeometry(0.022, 0.022, 0.18, 10), dark, 0, 0.075, L * 0.3, Math.PI / 2);
    if (id === 'saw') { add(new THREE.BoxGeometry(0.09, 0.09, 0.12), new THREE.MeshStandardMaterial({ color: '#3d4630', roughness: .8 }), 0.05, -0.05, 0.12); add(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), dark, 0.03, -0.12, L * 0.8); add(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), dark, -0.03, -0.12, L * 0.8); }
    if (id === 'crossbow') add(new THREE.BoxGeometry(0.6, 0.02, 0.03), wood, 0, 0.03, L - 0.08);
    if (id === 'flamer') { add(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8), new THREE.MeshStandardMaterial({ color: '#a01a10', roughness: .5 }), 0, -0.08, 0.15, Math.PI / 2); }
    if (id === 'launcher') add(new THREE.CylinderGeometry(0.08, 0.08, 0.14, 8), dark, 0, -0.02, 0.15, Math.PI / 2);
    const mz = new THREE.Object3D(); mz.position.set(0, 0.02, L - 0.03); mz.name = 'muzzle'; g.add(mz); }
  return g;
}

// Procedural dog (Pickles) — legs animate in code
export function makeDog() { const g = new THREE.Group(); const fur = new THREE.MeshStandardMaterial({ color: '#8a6a44', roughness: 1 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.36, 4, 10), fur); body.rotation.x = Math.PI / 2; body.position.y = 0.35; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), fur); head.position.set(0, 0.5, 0.3); g.add(head);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.12), fur); snout.position.set(0, 0.47, 0.42); g.add(snout);
  [-1, 1].forEach(s => { const e = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 6), fur); e.position.set(s * 0.07, 0.62, 0.28); g.add(e); });
  g.legs = []; [[-.08, .2], [.08, .2], [-.08, -.18], [.08, -.18]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.26, 6), fur); l.geometry.translate(0, -0.13, 0); l.position.set(x, 0.3, z); g.add(l); g.legs.push(l); });
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.2, 6), fur); t.position.set(0, 0.45, -0.3); t.rotation.x = -0.8; g.add(t); g.tail = t;
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g; }
// Biscuit: Nia's rabbit, peeking from her hoodie pocket (~7 meshes, shared mats)
export function makeRabbit() { if (EXTRA.biscuit) { const g = new THREE.Group(), m = EXTRA.biscuit.clone(true), bx = new THREE.Box3().setFromObject(m), s = 0.22 / Math.max(1e-3, bx.max.y - bx.min.y); m.scale.setScalar(s); m.position.set(0, -0.085 - bx.min.y * s + 0.0, 0); m.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true; } }); const pv = new THREE.Group(); pv.add(m); g.add(pv); g.head = pv; g.ears = []; return g; } const g = new THREE.Group(); const fur = new THREE.MeshStandardMaterial({ color: '#c8a27a', roughness: 1 }), pink = new THREE.MeshStandardMaterial({ color: '#e7a0a8', roughness: 1 }), eye = new THREE.MeshBasicMaterial({ color: '#0a0604' });
  const head = new THREE.Group(); g.add(head); const h = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), fur); h.scale.set(1, .9, 1.1); head.add(h);
  const sn = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), pink); sn.position.set(0, -0.005, 0.06); head.add(sn);
  [-1, 1].forEach(s => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 5), eye); e.position.set(s * 0.028, 0.014, 0.045); head.add(e);
    const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.06, 3, 6), fur); ear.geometry.translate(0, 0.045, 0); ear.position.set(s * 0.022, 0.04, -0.01); ear.rotation.z = -s * .25; head.add(ear); (g.ears = g.ears || []).push(ear); });
  const paws = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.02, 0.03), fur); paws.position.set(0, -0.05, 0.04); g.add(paws);
  g.head = head; g.traverse(o => { if (o.isMesh) o.frustumCulled = false; }); return g; }
