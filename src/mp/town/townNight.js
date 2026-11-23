// v1.9.52 Quiet Falls day/night: sky dome, sun/moon, hemi + fog by time of day, streetlights and house windows that
// switch on at dusk, a flashlight at night, tougher / more zombies at night with a warning. Wall-clock phase = synced online.
// Phone budget: 2 real point lights (nearest streetlights) + 1 flashlight, all created up front; everything else is emissive.
import * as THREE from 'three';
import { dnState, dnClockPhase, makeSkyDome, applySky, dnWatcher, CYCLE } from '../../game/daynight.js';

export function townDayNight({ scene, renderer, sun, hemi, cam, W, Z, toast, fogFar = 105, getMe }) {
  const S = {}; const sky = makeSkyDome(300); scene.add(sky); sky.onBeforeRender = () => sky.position.copy(cam.position);
  const exp0 = renderer.toneMappingExposure || 1.05;
  // streetlight heads + soft ground pools (emissive / additive, no lights)
  const lamps = (W && W.lampPos) || [];
  const headM = new THREE.MeshStandardMaterial({ color: '#2a2a2a', emissive: '#ffd59a', emissiveIntensity: 0 });
  const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(.9, .2, .42), headM, Math.max(1, lamps.length));
  const pc = document.createElement('canvas'); pc.width = pc.height = 64; const g = pc.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,205,140,.62)'); gr.addColorStop(.55, 'rgba(255,175,95,.22)'); gr.addColorStop(1, 'rgba(255,160,80,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const poolM = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(pc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, polygonOffset: true, polygonOffsetFactor: -4 });
  const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(11, 11).rotateX(-Math.PI / 2), poolM, Math.max(1, lamps.length));
  // v1.9.62 soft light cone under each head (additive, open cone, fades to nothing at the ground) — reads as a real street lamp at night
  const coneG = new THREE.CylinderGeometry(.35, 3.2, 5.9, 14, 1, true); coneG.translate(0, -2.95, 0);
  { const pos = coneG.attributes.position, n = pos.count, a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = Math.pow(Math.max(0, 1 + pos.getY(i) / 5.9), 1.6); coneG.setAttribute('fade', new THREE.BufferAttribute(a, 1)); }
  const coneU = { uK: { value: 0 } };
  const coneM = new THREE.ShaderMaterial({ uniforms: coneU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: 'attribute float fade; varying float vF; varying vec3 vN; varying vec3 vV; void main(){ vF = fade; vec4 mv = modelViewMatrix * instanceMatrix * vec4(position,1.); vN = normalize(normalMatrix * mat3(instanceMatrix) * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float uK; varying float vF; varying vec3 vN; varying vec3 vV; void main(){ float rim = pow(abs(dot(normalize(vN), normalize(vV))), 1.4); gl_FragColor = vec4(vec3(1.,.78,.5) * vF * rim * .085 * uK, 1.); }' });
  const cones = new THREE.InstancedMesh(coneG, coneM, Math.max(1, lamps.length));
  { const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    lamps.forEach(([x, z, side, ax], i) => { q.setFromAxisAngle(up, ax === 'x' ? Math.PI / 2 : 0); p.set(x, 6.1, z); m.compose(p, q, s); heads.setMatrixAt(i, m); p.set(x, 6.0, z); m.compose(p, q, s); cones.setMatrixAt(i, m); q.identity(); p.set(x, .04, z); m.compose(p, q, s); pools.setMatrixAt(i, m); });
    heads.count = pools.count = cones.count = lamps.length; }
  cones.frustumCulled = false; cones.renderOrder = 3; if (lamps.length) scene.add(cones);
  heads.frustumCulled = pools.frustumCulled = false; if (lamps.length) scene.add(heads, pools);
  let low = false; try { const qs = JSON.parse(localStorage.getItem('atq3.settings') || '{}').qual; low = qs === 'low' || ((!qs || qs === 'auto') && matchMedia('(pointer:coarse)').matches); } catch (e) { /* default */ }
  const pl = (low ? [] : [0, 1]).map(() => { const L = new THREE.PointLight('#ffc78a', 0, 16, 1.8); L.castShadow = false; scene.add(L); return L; });
  // flashlight (camera-mounted, no shadow)
  const fl = new THREE.SpotLight('#fff2dc', 0, 24, .42, .55, 1.4); fl.castShadow = false; scene.add(fl, fl.target);
  // house windows glow: patch the shared siding material (window panes are the darkest blue-grey vertex colour)
  const winU = { value: 0 };
  const sid = W && W.M && W.M.siding; if (sid) { const prev = sid.onBeforeCompile; sid.onBeforeCompile = (sh, r) => { if (prev) prev(sh, r); sh.uniforms.uWin = winU;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWinP;').replace('#include <project_vertex>', '#include <project_vertex>\n{ vec4 wp = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\n wp = instanceMatrix * wp;\n#endif\n vWinP = (modelMatrix * wp).xyz; }');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uWin; varying vec3 vWinP;').replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
{ vec3 vc = vColor.rgb; float isWin = step(max(max(vc.r, vc.g), vc.b), .05) * step(vc.r * 1.35, vc.b); vec3 cell = floor(vWinP * vec3(.7, .5, .7)); float on = step(.42, fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))) * 43758.5453));
  totalEmissiveRadiance += isWin * on * uWin * vec3(.95, .42, .1) * (.28 + .16 * fract(cell.x * 7.13 + cell.z * 3.7)); } // warm, dim lamp-lit glass (not a white sheet)
#endif`); }; sid.customProgramCacheKey = () => 'atqWin2'; sid.needsUpdate = true; }
  const warn = dnWatcher((m) => toast && toast(m, 3.2));
  const fwd = new THREE.Vector3(); let acc = 1;
  // v1.9.72: every visit starts in the morning (just after sunrise), then the normal 12-minute day/night runs on from there.
  // Each player keeps their own clock (jobs, horde nights and the boss are per player too), so the sky is no longer wall-clock synced between players.
  const START_P = .3, t0 = Date.now(); const phase = () => (START_P + (Date.now() - t0) / 1000 / CYCLE) % 1;
  const moon = new THREE.Color('#9fb4d6'), moonG = new THREE.Color('#3a4636'), nFog = new THREE.Color('#34465a'), nHor = new THREE.Color('#3c5068'), nZen = new THREE.Color('#1a2840');
  const update = (dt) => {
    const p = typeof window !== 'undefined' && window.__dnP != null ? window.__dnP : phase(); dnState(p, S); if (S.nightK > 0) { const k = S.nightK; S.fog.lerp(nFog, .55 * k); S.hor.lerp(nHor, .5 * k); S.zen.lerp(nZen, .35 * k); } /* v1.9.72: moonlit blue night instead of near-black */
    applySky(sky.userData.U, S);
    sun.color.copy(S.sun); sun.intensity = S.sunI + .9 * S.nightK; sun.position.copy(sun.target.position).addScaledVector(S.sunDir, 80);
    if (hemi) { hemi.color.copy(S.hs).lerp(moon, .45 * S.nightK); hemi.groundColor.copy(S.hg).lerp(moonG, .5 * S.nightK); hemi.intensity = 1.25 * S.hemiI / 1.3 + 1.45 * S.nightK; /* v1.9.72: brighter blue moonlight so roads, houses and zombies read on a phone */ /* v1.9.66: a touch more moonlight so streets and storefronts read at night */ }
    if (scene.fog) { scene.fog.color.copy(S.fog); scene.fog.far = fogFar * (1 - .1 * S.nightK); scene.fog.near = 28 * (1 - .3 * S.nightK); }
    if (scene.background && scene.background.isColor) scene.background.copy(S.fog);
    renderer.toneMappingExposure = exp0 * S.exp * (1 + .55 * S.nightK); /* v1.9.66 slightly brighter nights */
    headM.emissiveIntensity = 3.2 * S.lampK; poolM.opacity = S.lampK; coneU.uK.value = S.lampK; cones.visible = S.lampK > .01; winU.value = S.lampK; if (W && W.nightSigns) for (const m of W.nightSigns) m.emissiveIntensity = .75 * S.lampK;
    fl.intensity = 9 * S.flashK; cam.getWorldDirection(fwd); fwd.y = Math.max(-.35, Math.min(.2, fwd.y)); fwd.normalize();
    { const me = getMe && getMe(); // torch rides at the player's chest, just in front of them, so the beam lights the street and never the player's own back
      if (me && !me.drv) { fl.position.set(me.x, 1.35 + (me.y || 0), me.z).addScaledVector(fwd, .55); } else fl.position.copy(cam.position).addScaledVector(fwd, 2.5);
      fl.target.position.copy(fl.position).addScaledVector(fwd, 10); }
    if ((acc += dt) > .5) { acc = 0; const me = getMe && getMe(); if (me && lamps.length && S.lampK > .01) { const near = lamps.map(l => [l, (l[0] - me.x) ** 2 + (l[1] - me.z) ** 2]).sort((a, b) => a[1] - b[1]); pl.forEach((L, i) => { const l = near[i] && near[i][0]; if (l) L.position.set(l[0], 5.6, l[1] - (l[2] || 0) * 1.2); }); } }
    pl.forEach(L => { L.intensity = 12 * S.lampK; /* v1.9.66 brighter lamp pools */ });
    if (Z && Z.setNight) Z.setNight(1 + .35 * S.nightK); warn(S);
  };
  update(0); return { update, state: S, sky };
}
