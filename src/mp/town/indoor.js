// Indoor look for enterable buildings: ceiling-aware camera, wall-occlusion cutaway (dither fade, no extra draw calls),
// and warm room lights that stay readable at night. Phone budget: 2 point lights + 1 ambient, only while you are inside.
import * as THREE from 'three';

const U = {
  uCutOn: { value: 0 },
  uCutA0: { value: new THREE.Vector3(0, -20, 0) },
  uCutA1: { value: new THREE.Vector3(0, -20, 0) },
  uCutB0: { value: new THREE.Vector3(0, -20, 0) },
  uCutB1: { value: new THREE.Vector3(0, -20, 0) },
};

function injectCut(sh) {
  if (sh.vertexShader.includes('vCutW')) return;
  if (sh.vertexShader.includes('vWinP')) {
    sh.vertexShader = sh.vertexShader.replace('varying vec3 vWinP;', 'varying vec3 vWinP; varying vec3 vCutW;')
      .replace('vWinP = (modelMatrix * wp).xyz;', 'vWinP = (modelMatrix * wp).xyz; vCutW = vWinP;');
  } else {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCutW;')
      .replace('#include <project_vertex>', `#include <project_vertex>
{ vec4 wp = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  wp = instanceMatrix * wp;
#endif
  vCutW = (modelMatrix * wp).xyz; }`);
  }
  Object.assign(sh.uniforms, U);
  const fragHook = `#include <clipping_planes_fragment>
if (uCutOn > 0.0) {
  vec3 p = vCutW;
  float inA = step(uCutA0.x, p.x) * step(p.x, uCutA1.x) * step(uCutA0.y, p.y) * step(p.y, uCutA1.y) * step(uCutA0.z, p.z) * step(p.z, uCutA1.z);
  float inB = step(uCutB0.x, p.x) * step(p.x, uCutB1.x) * step(uCutB0.y, p.y) * step(p.y, uCutB1.y) * step(uCutB0.z, p.z) * step(p.z, uCutB1.z);
  float fade = max(inA, inB) * uCutOn;
  if (fade > 0.01) {
    float dith = fract(sin(dot(gl_FragCoord.xy + p.xz * 11.0, vec2(12.9898, 78.233))) * 43758.5453);
    if (dith < fade) discard;
  }
}
`;
  if (sh.fragmentShader.includes('#include <clipping_planes_fragment>')) {
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uCutOn; uniform vec3 uCutA0, uCutA1, uCutB0, uCutB1; varying vec3 vCutW;')
      .replace('#include <clipping_planes_fragment>', fragHook);
  }
}

export function patchCutaway(M) {
  if (!M) return;
  for (const k of ['siding', 'plaster', 'trim', 'brick', 'glass', 'roofmat', 'concrete']) {
    const mat = M[k]; if (!mat) continue;
    const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = (sh, r) => { if (prev) prev(sh, r); injectCut(sh); };
    const prevKey = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : null;
    mat.customProgramCacheKey = () => ((prevKey && prevKey()) || '') + 'atqCut1';
    mat.needsUpdate = true;
  }
}

function setBox(u0, u1, b) {
  if (b) { u0.value.set(b.x0, b.y0, b.z0); u1.value.set(b.x1, b.y1, b.z1); }
  else { u0.value.set(0, -20, 0); u1.value.set(0, -20, 0); }
}

export function setCutaway(boxes, amount = 0.92) {
  const list = (boxes || []).filter(Boolean).slice(0, 2);
  U.uCutOn.value = list.length ? amount : 0;
  setBox(U.uCutA0, U.uCutA1, list[0]);
  setBox(U.uCutB0, U.uCutB1, list[1]);
}

/** Walls of `bd` that sit on the camera side of the player (the ones that would occlude a third-person arm). Ceiling stays solid. */
export function occludingWalls(bd, cam, px, pz) {
  if (!bd || !bd.rect) return [];
  const r = bd.rect, T = .42, y0 = .02, y1 = (bd.Hh || 2.8) - .16; // leave the ceiling uncut
  const walls = [
    { x0: r.x0 - T, x1: r.x0 + T, z0: r.z0 - T, z1: r.z1 + T, y0, y1 },
    { x0: r.x1 - T, x1: r.x1 + T, z0: r.z0 - T, z1: r.z1 + T, y0, y1 },
    { x0: r.x0 - T, x1: r.x1 + T, z0: r.z0 - T, z1: r.z0 + T, y0, y1 },
    { x0: r.x0 - T, x1: r.x1 + T, z0: r.z1 - T, z1: r.z1 + T, y0, y1 },
  ];
  const cx = cam.x - px, cz = cam.z - pz;
  return walls.filter(w => {
    const mx = (w.x0 + w.x1) * .5, mz = (w.z0 + w.z1) * .5;
    return (mx - px) * cx + (mz - pz) * cz > 0;
  });
}

export function makeRoomLights(scene) {
  const pts = [0, 1].map(() => { const L = new THREE.PointLight('#ffd4a8', 0, 10, 1.1); L.castShadow = false; scene.add(L); return L; });
  const amb = new THREE.AmbientLight('#ffdfc4', 0); scene.add(amb);
  return { pts, amb };
}

export function updateRoomLights(L, inb, nightK = 0) {
  if (!L) return;
  if (!inb) { L.pts.forEach(p => { p.intensity = 0; }); L.amb.intensity = 0; return; }
  const pos = (inb.lampPos && inb.lampPos.length) ? inb.lampPos : [[(inb.rect.x0 + inb.rect.x1) / 2, Math.min(2.35, (inb.Hh || 2.8) - .4), (inb.rect.z0 + inb.rect.z1) / 2]];
  const span = Math.hypot(inb.rect.x1 - inb.rect.x0, inb.rect.z1 - inb.rect.z0);
  const night = Math.max(0, Math.min(1, nightK));
  L.pts.forEach((p, i) => {
    const s = pos[i] || pos[0];
    p.position.set(s[0], s[1], s[2]);
    p.distance = Math.max(8, span * .7);
    p.intensity = (i < pos.length ? 1 : 0) * (9 + 10 * night);
  });
  L.amb.intensity = 0.48 + 0.32 * night; // lamps carry the room at night so windows still read as dark
}

export const INDOOR_CAM = { minDist: 1.55, height: 1.78, dist: 2.2 };
