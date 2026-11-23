// v1.9.62 Quiet Falls weather: clear / rain / fog / thunderstorm / snow, rotating on the wall clock (4-minute slots, hashed) so every
// player online sees the same sky with zero network traffic. Runs ON TOP of the day/night cycle (never changes its length).
// Phone budget: rain = one LineSegments draw, snow = one Points draw, both animated fully in the vertex shader (no per-frame CPU
// buffer writes); lightning = a light/sky flash; fog = scene fog distance. Sounds: ElevenLabs-generated loops + thunder (public/sfx/wx_*).
import * as THREE from 'three';

export const WX_SLOT = 240; // seconds per weather slot
export const WX_KINDS = ['clear', 'rain', 'fog', 'storm', 'snow'];
const LABEL = { clear: 'Clear skies', rain: 'Rain', fog: 'Fog', storm: 'Thunderstorm', snow: 'Snow' };
const MSG = { rain: 'Rain rolling in. Footsteps are harder to hear.', fog: 'Fog is settling over Quiet Falls. Watch the shapes.', storm: 'Thunderstorm. Stay off the open roads.', snow: 'Snow is falling on Quiet Falls.', clear: 'The weather is clearing up.' };
const hash = (n) => { n = (n ^ 61) ^ (n >>> 16); n = Math.imul(n, 9); n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return (n >>> 0) / 4294967296; };
/** weather kind for a wall-clock slot (same on every device). Never the same bad weather twice in a row; clear is the most common. */
export function wxKindAt(slot) { const r = hash(slot * 7919 + 13); const k = r < .34 ? 'clear' : r < .55 ? 'rain' : r < .70 ? 'fog' : r < .85 ? 'storm' : 'snow';
  if (k !== 'clear') { const pr = hash((slot - 1) * 7919 + 13); const pk = pr < .34 ? 'clear' : pr < .55 ? 'rain' : pr < .70 ? 'fog' : pr < .85 ? 'storm' : 'snow'; if (pk === k) return 'clear'; } return k; }

const WRAP = 'vec3 wrapP(vec3 b, vec3 c, vec3 S){ return c + mod(b - c + S * .5, S) - S * .5; }';
function makeRain(n) {
  const S = new THREE.Vector3(44, 24, 44); const pos = new Float32Array(n * 6), tip = new Float32Array(n * 2), sd = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { const x = Math.random() * S.x, y = Math.random() * S.y, z = Math.random() * S.z, s = Math.random(); for (let j = 0; j < 2; j++) { pos.set([x, y, z], i * 6 + j * 3); tip[i * 2 + j] = j; sd[i * 2 + j] = s; } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('tip', new THREE.BufferAttribute(tip, 1)); g.setAttribute('sd', new THREE.BufferAttribute(sd, 1));
  const U = { uT: { value: 0 }, uC: { value: new THREE.Vector3() }, uS: { value: S }, uK: { value: 0 }, uWind: { value: new THREE.Vector2(1.2, .6) }, uLit: { value: 1 } };
  const m = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, fog: false,
    vertexShader: `uniform float uT, uK; uniform vec3 uC, uS; uniform vec2 uWind; attribute float tip, sd; varying float vA; ${WRAP}
void main(){ float sp = 15. + sd * 6.; vec3 b = position; b.y -= uT * sp; b.xz += uWind * uT * .9; vec3 p = wrapP(b, uC, uS);
  vec3 v = normalize(vec3(uWind.x * .9, -sp, uWind.y * .9)); p -= v * tip * (.9 + sd * .5);
  float d = length(p.xz - uC.xz); vA = (1. - tip * .8) * smoothstep(22., 8., d) * step(sd, uK) * smoothstep(-.2, 1.2, p.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.); }`,
    fragmentShader: 'uniform float uLit; varying float vA; void main(){ gl_FragColor = vec4(vec3(.74,.8,.86) * uLit, vA * .62); }' });
  const L = new THREE.LineSegments(g, m); L.frustumCulled = false; L.renderOrder = 6; L.visible = false; return { obj: L, U };
}
function makeSnow(n) {
  const S = new THREE.Vector3(48, 22, 48); const pos = new Float32Array(n * 3), sd = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos.set([Math.random() * S.x, Math.random() * S.y, Math.random() * S.z], i * 3); sd[i] = Math.random(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('sd', new THREE.BufferAttribute(sd, 1));
  const U = { uT: { value: 0 }, uC: { value: new THREE.Vector3() }, uS: { value: S }, uK: { value: 0 }, uPx: { value: 300 }, uLit: { value: 1 } };
  const m = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, fog: false,
    vertexShader: `uniform float uT, uK, uPx; uniform vec3 uC, uS; attribute float sd; varying float vA; ${WRAP}
void main(){ vec3 b = position; float t = uT; b.y -= t * (1.1 + sd * .7); b.x += sin(t * .7 + sd * 40.) * 1.2 + t * .35; b.z += cos(t * .55 + sd * 23.) * 1.0; vec3 p = wrapP(b, uC, uS);
  vec4 mv = viewMatrix * vec4(p, 1.); float d = length(p.xz - uC.xz); vA = smoothstep(24., 10., d) * step(sd, uK) * smoothstep(-.1, .8, p.y);
  gl_PointSize = max(1.5, uPx * (.1 + sd * .07) / -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: 'uniform float uLit; varying float vA; void main(){ vec2 c = gl_PointCoord - .5; float a = smoothstep(.5, .15, length(c)); gl_FragColor = vec4(vec3(.95,.97,1.) * uLit, a * vA * .9); }' });
  const P = new THREE.Points(g, m); P.frustumCulled = false; P.renderOrder = 6; P.visible = false; return { obj: P, U };
}

/** dn = townDayNight(); call update(dt) right AFTER dn.update(dt) (it layers over fog/sun/hemi). */
export function townWeather({ scene, renderer, cam, sun, hemi, W, aud, toast, dn, low = false }) {
  const rain = makeRain(low ? 900 : 1700), snow = makeSnow(low ? 900 : 1600); scene.add(rain.obj, snow.obj);
  const K = { rain: 0, fog: 0, storm: 0, snow: 0 }; const S = { kind: 'clear', label: LABEL.clear, K, flash: 0, slot: -1, wet: 0, snowCover: 0 };
  const M = W && W.M; const asph = M && M.asphalt; const asph0 = asph && { r: asph.roughness, c: asph.color.clone() }; const grd = W && W.ground && W.ground.material; const grd0 = grd && grd.color.clone(); const roof = M && M.roofmat; const roof0 = roof && roof.color.clone();
  const white = new THREE.Color('#e9eef2'), wetC = new THREE.Color('#7d8288'), grey = new THREE.Color('#7f8a90'), stormC = new THREE.Color('#3c464d'), fogC = new THREE.Color('#9aa4a8'), tmp = new THREE.Color();
  let t = 0, nextFlash = 6, flashT = 0, flashSeq = [], snd = { rain: null, storm: null, snow: null }, lastKind = null, sndAcc = 0;
  const loop = (key, file, vol) => { if (!aud || !aud.ctx) return; let s = snd[key]; if (!s && vol > .005) { s = aud.play(file, { loop: true, vol: 0, jit: 0, flat: true }); if (s && !s.dummy) snd[key] = s; else return; } if (s && s.g) s.g.gain.setTargetAtTime(vol, aud.ctx.currentTime, .8); };
  const thunder = (close) => { if (!aud || !aud.ctx) return; const ok = aud.play(close ? 'wx_thunder1' : 'wx_thunder2', { vol: close ? .85 : .6, flat: true, jit: .08, delay: close ? .25 + Math.random() * .5 : 1 + Math.random() * 2 }); if (!ok && aud.thunder) aud.thunder(close ? .8 : .5); };
  const update = (dt, indoor = false) => {
    t += dt; const now = Date.now() / 1000; const slot = Math.floor(now / WX_SLOT);
    const forced = typeof window !== 'undefined' && window.__wx; const kind = forced || wxKindAt(slot);
    if (kind !== S.kind) { S.kind = kind; S.label = LABEL[kind] || kind; if (lastKind !== null && toast) toast(MSG[kind] || S.label, 3.2); lastKind = kind; } if (lastKind === null) lastKind = kind;
    // smooth blend toward the target mix (≈ 20 s), instant when forced for tests
    const tgt = { rain: kind === 'rain' ? 1 : kind === 'storm' ? 1 : 0, fog: kind === 'fog' ? 1 : kind === 'storm' ? .35 : kind === 'snow' ? .3 : 0, storm: kind === 'storm' ? 1 : 0, snow: kind === 'snow' ? 1 : 0 };
    const a = forced && window.__wxSnap ? 1 : Math.min(1, dt / 8); for (const k in K) K[k] += (tgt[k] - K[k]) * a;
    S.wet += ((K.rain > .3 ? 1 : 0) - S.wet) * Math.min(1, dt / (K.rain > .3 ? 25 : 90)) * (forced && window.__wxSnap ? 99 : 1); S.wet = Math.min(1, Math.max(0, S.wet)); if (forced && window.__wxSnap) S.wet = K.rain > .3 ? 1 : 0;
    S.snowCover += ((K.snow > .3 ? 1 : 0) - S.snowCover) * Math.min(1, dt / (K.snow > .3 ? 40 : 60)) * (forced && window.__wxSnap ? 99 : 1); S.snowCover = Math.min(1, Math.max(0, S.snowCover)); if (forced && window.__wxSnap) S.snowCover = K.snow > .3 ? 1 : 0;
    const D = dn && dn.state || {}; const nightK = D.nightK || 0; const over = Math.max(K.rain * .75, K.storm, K.snow * .6, K.fog * .5);
    // sky / light: overcast dims the sun, greys the fog colour; fog + storms pull the fog wall in
    sun.intensity *= 1 - .72 * over; if (hemi) hemi.intensity *= 1 - .18 * over;
    if (scene.fog) { tmp.copy(K.storm > .3 ? stormC : K.fog > .5 ? fogC : grey); tmp.lerp(scene.fog.color, .35 + .5 * nightK); scene.fog.color.lerp(tmp, over * (1 - nightK * .6));
      const fogMul = 1 - .62 * K.fog - .25 * K.rain - .2 * K.storm - .3 * K.snow; scene.fog.far *= Math.max(.3, fogMul); scene.fog.near *= Math.max(.15, 1 - .8 * K.fog - .4 * K.storm - .4 * K.snow); }
    if (scene.background && scene.background.isColor && scene.fog) scene.background.copy(scene.fog.color);
    if (dn && dn.sky && dn.sky.userData.U) { const U = dn.sky.userData.U; U.uZen.value.lerp(scene.fog.color, over * .85); U.uHor.value.lerp(scene.fog.color, over * .9); U.uStar.value *= 1 - over; }
    // lightning: double/triple flickers, thunder follows
    if (K.storm > .6 && !indoor) { nextFlash -= dt; if (nextFlash <= 0) { nextFlash = 7 + Math.random() * 14; const n = 1 + (Math.random() * 3 | 0); flashSeq = []; let at = 0; for (let i = 0; i < n; i++) { flashSeq.push([at, .06 + Math.random() * .1, .6 + Math.random() * .4]); at += .1 + Math.random() * .18; } flashT = 0; thunder(Math.random() < .55); } }
    let fl = 0; if (flashSeq.length) { flashT += dt; for (const [s0, d, k] of flashSeq) if (flashT >= s0 && flashT < s0 + d) fl = Math.max(fl, k); if (flashT > 1.2) flashSeq = []; }
    S.flash = fl; if (fl > 0) { if (hemi) hemi.intensity += 2.4 * fl; sun.intensity += 1.2 * fl; if (scene.fog) { scene.fog.color.lerp(tmp.set('#c6d2e6'), .65 * fl); if (scene.background && scene.background.isColor) scene.background.copy(scene.fog.color); } if (dn && dn.sky) { const U = dn.sky.userData.U; U.uZen.value.lerp(tmp.set('#d6e0f2'), .7 * fl); U.uHor.value.lerp(tmp, .7 * fl); } }
    // precipitation follows the camera (shader-wrapped)
    const lit = .35 + .65 * (1 - nightK) + fl; rain.U.uT.value = t; snow.U.uT.value = t; rain.U.uC.value.copy(cam.position); snow.U.uC.value.copy(cam.position);
    rain.U.uK.value = K.rain * (.65 + .35 * K.storm); rain.U.uWind.value.set(1.2 + 4 * K.storm, .6 + 2 * K.storm); rain.U.uLit.value = lit; snow.U.uK.value = K.snow; snow.U.uLit.value = .45 + .55 * (1 - nightK) + fl;
    snow.U.uPx.value = renderer.domElement.height * .9; rain.obj.visible = K.rain > .02 && !indoor; snow.obj.visible = K.snow > .02 && !indoor;
    // ground: wet asphalt (darker, glossy), snow cover (whiter ground + roofs)
    if (asph) { asph.roughness = asph0.r - .55 * S.wet; asph.color.copy(asph0.c).lerp(wetC, .55 * S.wet).lerp(white, .45 * S.snowCover); }
    if (grd) grd.color.copy(grd0).lerp(white, .7 * S.snowCover); if (roof) roof.color.copy(roof0).lerp(white, .6 * S.snowCover);
    // sound (ElevenLabs loops), quieter indoors
    if ((sndAcc += dt) > .25) { sndAcc = 0; const iv = indoor ? .35 : 1; loop('rain', 'wx_rain_loop', K.rain * (1 - K.storm) * .32 * iv); loop('storm', 'wx_storm_loop', K.storm * .42 * iv); loop('snow', 'wx_snow_loop', (K.snow * .3 + K.fog * .12) * iv); }
  };
  const dispose = () => { for (const k in snd) { const s = snd[k]; if (s) { try { s.stop(); } catch (e) { /* gone */ } } snd[k] = null; } scene.remove(rain.obj, snow.obj); if (asph) { asph.roughness = asph0.r; asph.color.copy(asph0.c); } if (grd) grd.color.copy(grd0); if (roof) roof.color.copy(roof0); };
  return { update, state: S, dispose, slotEndsIn: () => WX_SLOT - (Date.now() / 1000) % WX_SLOT };
}
