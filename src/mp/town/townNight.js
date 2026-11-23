// v1.9.51 Quiet Falls day/night: sky dome, sun/moon, hemi + fog by time of day, streetlights and house windows that
// switch on at dusk, a flashlight at night, tougher / more zombies at night with a warning. Wall-clock phase = synced online.
// Phone budget: 2 real point lights (nearest streetlights) + 1 flashlight, all created up front; everything else is emissive.
import * as THREE from 'three';
import { dnState, dnClockPhase, makeSkyDome, applySky, dnWatcher } from '../../game/daynight.js';

export function townDayNight({ scene, renderer, sun, hemi, cam, W, Z, toast, fogFar = 105, getMe }) {
  const S = {}; const sky = makeSkyDome(300); scene.add(sky); sky.onBeforeRender = () => sky.position.copy(cam.position);
  const exp0 = renderer.toneMappingExposure || 1.05;
  // streetlight heads + soft ground pools (emissive / additive, no lights)
  const lamps = (W && W.lampPos) || [];
  const headM = new THREE.MeshStandardMaterial({ color: '#2a2a2a', emissive: '#ffcf8a', emissiveIntensity: 0 });
  const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(.9, .16, .36), headM, Math.max(1, lamps.length));
  const pc = document.createElement('canvas'); pc.width = pc.height = 64; const g = pc.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,200,130,.55)'); gr.addColorStop(.6, 'rgba(255,170,90,.18)'); gr.addColorStop(1, 'rgba(255,160,80,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const poolM = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(pc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, polygonOffset: true, polygonOffsetFactor: -4 });
  const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(9, 9).rotateX(-Math.PI / 2), poolM, Math.max(1, lamps.length));
  { const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    lamps.forEach(([x, z, side], i) => { const hx = x, hz = z - (side || 0) * .45; p.set(hx, 6.05, hz); m.compose(p, q, s); heads.setMatrixAt(i, m); p.set(hx, .04, z - (side || 0) * 1.6); m.compose(p, q, s); pools.setMatrixAt(i, m); });
    heads.count = pools.count = lamps.length; }
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
  totalEmissiveRadiance += isWin * on * uWin * vec3(1.0, .52, .2) * (.55 + .25 * fract(cell.x * 7.13 + cell.z * 3.7)); }
#endif`); }; sid.customProgramCacheKey = () => 'atqWin1'; sid.needsUpdate = true; }
  const warn = dnWatcher((m) => toast && toast(m, 3.2));
  const fwd = new THREE.Vector3(); let acc = 1;
  const update = (dt) => {
    const p = typeof window !== 'undefined' && window.__dnP != null ? window.__dnP : dnClockPhase(); dnState(p, S);
    applySky(sky.userData.U, S);
    sun.color.copy(S.sun); sun.intensity = S.sunI; sun.position.copy(sun.target.position).addScaledVector(S.sunDir, 80);
    if (hemi) { hemi.color.copy(S.hs); hemi.groundColor.copy(S.hg); hemi.intensity = 1.25 * S.hemiI / 1.3 + .22 * S.nightK; }
    if (scene.fog) { scene.fog.color.copy(S.fog); scene.fog.far = fogFar * (1 - .32 * S.nightK); scene.fog.near = 28 * (1 - .5 * S.nightK); }
    if (scene.background && scene.background.isColor) scene.background.copy(S.fog);
    renderer.toneMappingExposure = exp0 * S.exp;
    headM.emissiveIntensity = 3.2 * S.lampK; poolM.opacity = S.lampK; winU.value = S.lampK;
    fl.intensity = 10 * S.flashK; cam.getWorldDirection(fwd); fl.position.copy(cam.position).addScaledVector(fwd, .3); fl.position.y -= .15; fl.target.position.copy(cam.position).addScaledVector(fwd, 10);
    if ((acc += dt) > .5) { acc = 0; const me = getMe && getMe(); if (me && lamps.length && S.lampK > .01) { const near = lamps.map(l => [l, (l[0] - me.x) ** 2 + (l[1] - me.z) ** 2]).sort((a, b) => a[1] - b[1]); pl.forEach((L, i) => { const l = near[i] && near[i][0]; if (l) L.position.set(l[0], 5.6, l[1] - (l[2] || 0) * 1.2); }); } }
    pl.forEach(L => { L.intensity = 9 * S.lampK; });
    if (Z && Z.setNight) Z.setNight(1 + .35 * S.nightK); warn(S);
  };
  update(0); return { update, state: S, sky };
}
