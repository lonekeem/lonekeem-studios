// v1.9.51 day/night cycle for Survival, the online town and co-op. Story chapters keep their authored time of day.
// One full day = CYCLE seconds. Online uses wall-clock time (UTC ms, the same on every player's device), so everyone
// in the same town sees the same sun without extra network traffic. Solo Survival starts each run in the late afternoon.
import * as THREE from 'three';
export const CYCLE = 12 * 60;
export const dnClockPhase = (ms = Date.now()) => ((ms / 1000) % CYCLE) / CYCLE; // shared by all online players
const C = (h) => new THREE.Color(h);
const K = { // [night, dusk, day]
  zen: [C('#070d16'), C('#33406e'), C('#4a83c6')], hor: [C('#18242b'), C('#e89a68'), C('#b8cad6')], fog: [C('#10181b'), C('#9c7462'), C('#aab5b8')],
  sun: [C('#8fa6c8'), C('#ffae6a'), C('#fff0d6')], hs: [C('#33465c'), C('#d9a487'), C('#dfe8f0')], hg: [C('#12160f'), C('#4a3c30'), C('#59614a')],
};
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix3 = (arr, nightK, duskK, out) => out.copy(arr[2]).lerp(arr[0], nightK).lerp(arr[1], duskK);
/** p: 0 = midnight, .25 = sunrise, .5 = noon, .75 = sunset */
export function dnState(p, S = {}) {
  const a = (p - .25) * Math.PI * 2, e = Math.sin(a); // sun elevation -1..1
  const dayK = sm(-.1, .22, e), nightK = 1 - dayK, duskK = Math.exp(-(((e - .02) / .16) ** 2)) * .85;
  S.p = p; S.e = e; S.dayK = dayK; S.nightK = nightK; S.duskK = duskK;
  S.sunDir = (S.sunDir || new THREE.Vector3()).set(Math.cos(a) * .8, Math.max(.08, Math.abs(e)), .45).normalize(); // sun by day, moon by night (always above)
  S.isMoon = e < -.02;
  for (const k in K) S[k] = mix3(K[k], nightK, duskK, S[k] || new THREE.Color());
  S.sunI = S.isMoon ? .55 : .25 + 2.0 * sm(0, .35, e); S.hemiI = .5 + .8 * dayK; S.fogMul = 1 + .9 * nightK; S.exp = 1.0 + .12 * nightK;
  S.starK = sm(.45, .9, nightK); S.lampK = sm(.35, .7, nightK); S.flashK = sm(.5, .85, nightK);
  S.label = e > .25 ? 'Day' : e > -.1 ? (p < .5 ? 'Sunrise' : 'Sunset') : 'Night';
  return S;
}
// sky dome shared by the town (story Survival reuses env.js's dome uniforms)
export function makeSkyDome(radius = 300) {
  const U = { uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uMoon: { value: 0 }, uStar: { value: 0 }, uDusk: { value: 0 } };
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: U,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w * .9999; }',
    fragmentShader: `uniform vec3 uZen, uHor, uSun; uniform float uMoon, uStar, uDusk; varying vec3 vD;
float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
void main(){ vec3 d = normalize(vD); float y = max(d.y, 0.0); vec3 c = mix(uHor, uZen, pow(y, .5));
  float s = max(dot(d, uSun), 0.0);
  if (uMoon > .5) c += vec3(.75,.82,.95) * (pow(s, 1400.0) * 2.2 + pow(s, 60.0) * .08);
  else c += vec3(1.0,.86,.62) * (pow(s, 900.0) * 3.0 + pow(s, 18.0) * (.25 + .5 * uDusk));
  vec2 g = floor(d.xz / (d.y + .25) * 110.0); float st = step(.9958, h21(g)) * smoothstep(.08, .4, d.y) * (.55 + .45 * sin(h21(g + 3.1) * 40.0)); c += vec3(st * uStar);
  c = mix(c, uHor, smoothstep(.05, -.02, d.y));
  gl_FragColor = vec4(c, 1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}` }));
  m.frustumCulled = false; m.renderOrder = -10; m.userData.U = U; return m;
}
export function applySky(U, S) { U.uZen.value.copy(S.zen); U.uHor.value.copy(S.hor); U.uSun.value.copy(S.sunDir); U.uMoon.value = S.isMoon ? 1 : 0; U.uStar.value = S.starK; U.uDusk.value = S.duskK; }
/** night banner + warning (once per dusk). el = toast fn */
export function dnWatcher(toast) { let was = null; return (S) => { const night = S.nightK > .6; if (was === null) { was = night; return; } if (night && !was) toast('Night is falling. They are hungrier in the dark. Stay together.'); else if (!night && was) toast('Sunrise. The dead slow down.'); was = night; }; }

// ---------- Survival (story engine): runs start in the late afternoon and roll through sunset into night ----------
export function survivalDN(g, dt) {
  const on = !!g.survival && !(g.world && g.world.flags && g.world.flags.indoor);
  let D = g._dn;
  if (!on) { if (D) { dnRestore(g, D); g._dn = null; g.dnNight = false; } return; }
  if (!D) D = g._dn = dnCapture(g);
  D.t += dt; const p = typeof window !== 'undefined' && window.__dnP != null ? window.__dnP : (D.p0 + D.t / CYCLE) % 1; const S = dnState(p, D.S);
  const sky = g.world.env && g.world.env.sky, U = sky && sky.material.uniforms;
  if (U) { U.uHor.value.copy(S.hor); U.uZen.value.copy(S.zen); U.uMoon.value.copy(S.sunDir); if (U.uDay) U.uDay.value = S.dayK; }
  g.moon.color.copy(S.sun); g.moon.intensity = S.isMoon ? D.moon * .8 : .3 + 1.9 * Math.min(1, Math.max(0, S.e / .35));
  const mp = g.player.root.position; g.moon.position.set(mp.x + S.sunDir.x * 50, S.sunDir.y * 50, mp.z + S.sunDir.z * 50); g.moon.target.position.copy(mp);
  g.hemi.color.copy(S.hs); g.hemi.groundColor.copy(S.hg); g.hemi.intensity = D.hemi * .8 + 1.0 * S.dayK;
  const sc = g.scene; sc.environmentIntensity = D.env * (1 + 1.6 * S.dayK); sc.fog.color.copy(S.fog); sc.fog.density = D.fog * (.5 + .55 * S.nightK);
  g.renderer.toneMappingExposure = D.exp * (1 - .1 * S.dayK);
  if (g._grade) g._grade.uniforms.uSat.value = D.sat + .1 * S.dayK;
  const lk = .15 + .85 * S.lampK; for (const [L, i0] of D.lights) L.intensity = i0 * lk; for (const [m, e0] of D.heads) m.emissiveIntensity = e0 * (.1 + .9 * S.lampK);
  if (g.flash) g.flash.intensity *= .12 + .88 * S.flashK; // game.js sets the torch every frame just before this
  g.dnNight = S.nightK > .6; g.dnState = S; D.warn(S);
}
function dnCapture(g) {
  const sc = g.scene, sky = g.world.env && g.world.env.sky, U = sky && sky.material.uniforms;
  const heads = []; sc.traverse(o => { const m = o.material; if (m && !Array.isArray(m) && m.emissive && m.emissiveIntensity >= 2 && m.emissive.getHexString() === 'ffd59a' && !heads.some(h => h[0] === m)) heads.push([m, m.emissiveIntensity]); });
  return { t: 0, p0: .62, S: {}, moon: g.moon.intensity, mc: g.moon.color.clone(), hemi: g.hemi.intensity, hc: g.hemi.color.clone(), hg: g.hemi.groundColor.clone(), env: sc.environmentIntensity, fog: sc.fog.density, fc: sc.fog.color.clone(),
    exp: g.renderer.toneMappingExposure, sat: g._grade ? g._grade.uniforms.uSat.value : 1, flash: g.flash ? g.flash.intensity : 0,
    sky: U ? { h: U.uHor.value.clone(), z: U.uZen.value.clone(), m: U.uMoon.value.clone() } : null,
    lights: ((g.world && g.world.lights) || []).filter(l => l.isPointLight).map(l => [l, l.intensity]), heads, warn: dnWatcher(m => g.toast && g.toast(m, 3.2)) };
}
function dnRestore(g, D) {
  const sc = g.scene; g.moon.intensity = D.moon; g.moon.color.copy(D.mc); g.hemi.intensity = D.hemi; g.hemi.color.copy(D.hc); g.hemi.groundColor.copy(D.hg); sc.environmentIntensity = D.env; sc.fog.density = D.fog; sc.fog.color.copy(D.fc);
  g.renderer.toneMappingExposure = D.exp; if (g._grade) g._grade.uniforms.uSat.value = D.sat;
  const sky = g.world.env && g.world.env.sky, U = sky && sky.material.uniforms; if (U && D.sky) { U.uHor.value.copy(D.sky.h); U.uZen.value.copy(D.sky.z); U.uMoon.value.copy(D.sky.m); if (U.uDay) U.uDay.value = 0; }
  for (const [L, i0] of D.lights) L.intensity = i0; for (const [m, e0] of D.heads) m.emissiveIntensity = e0;
}
