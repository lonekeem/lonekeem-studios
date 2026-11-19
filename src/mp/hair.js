// Shell materials on the head triangles: scalp hair (cuts, fades, curls, cornrows), facial hair (beards / mustaches) and face covers (masks, balaclava).
import * as THREE from 'three';
import { hookVertex, GLSL_COMMON } from './shaders.js';

const HEAD = /* glsl */`
uniform vec4 uLm, uHc, uMo, uH1, uH2, uH3; uniform vec3 uC1, uC2; uniform float uKind;
// kind 0 hair / 1 beard / 2 mustache / 3 cover
float bmask(vec2 fc, float id, float mouthY, float mw){
  float ax = abs(fc.x); float jaw = 0.55 + 0.95 * smoothstep(0.15, 1.05, ax); float cheekTop = 1.6 - 0.3 * smoothstep(0.4, 1.0, ax);
  float lip = step(abs(fc.y - mouthY), 0.11) * step(ax, mw + 0.05);
  float stache = step(mouthY + 0.1, fc.y) * step(fc.y, mouthY + 0.42) * step(ax, 0.6);
  float m = 0.0;
  if (id < 1.5) m = step(jaw - 0.35, fc.y) * step(fc.y, cheekTop) * step(ax, 1.08) + stache;                                  // full
  else if (id < 2.5) m = step(jaw - 0.3, fc.y) * step(fc.y, 1.25 + 0.0 * ax) * step(ax, 1.05) + stache * 0.9;             // short boxed
  else if (id < 3.5) { m = step(length(vec2(fc.x * 1.3, fc.y - 0.72)), 0.4) + stache * 0.9; }                               // goatee
  else if (id < 4.5) { m = step(length(vec2(fc.x * 2.6, fc.y - (mouthY - 0.2))), 0.3); }                                   // soul patch
  else if (id < 5.5) { m = step(jaw - 0.3, fc.y) * step(fc.y, jaw + 0.08) * step(ax, 1.1) + step(1.1, fc.y) * step(fc.y, cheekTop - 0.1) * step(0.95, ax) * 0.0; } // chin strap
  else if (id < 6.5) { m = step(jaw - 0.32, fc.y) * step(fc.y, jaw + 0.18) * step(ax, 0.95) * step(0.15, ax) * 0.0 + step(jaw - 0.32, fc.y) * step(fc.y, 0.95 + 0.0 * ax) * step(ax, 0.9); } // chin curtain
  else if (id < 7.5) { m = step(0.75, ax) * step(ax, 1.08) * step(jaw - 0.2, fc.y) * step(fc.y, 1.7); }                  // mutton chops
  else if (id < 8.5) { float r = length(vec2(fc.x * 1.1, fc.y - 0.75)); m = step(r, 0.5) * step(0.26, r + (1.0 - step(fc.y, mouthY - 0.12)) * 1.0) + stache * 0.9; } // circle beard
  else if (id < 9.5) { m = step(length(vec2(fc.x * 1.2, fc.y - 0.72)), 0.38) + step(jaw - 0.3, fc.y) * step(fc.y, jaw + 0.07) * step(ax, 1.05) + stache * 0.8; } // anchor
  else if (id < 10.5) { float tip = step(abs(fc.x), 0.34 * (fc.y - 0.38) / 0.4 + 0.08) * step(0.38, fc.y) * step(fc.y, 0.95); m = tip + stache * 0.8; } // van dyke
  else if (id < 11.5) { m = step(jaw - 0.3, fc.y) * step(fc.y, cheekTop + 0.2) * step(ax, 1.1) + stache; }                // lumberjack (big full)
  else { m = step(jaw - 0.3, fc.y) * step(fc.y, jaw + 0.35) * step(ax, 1.05) * 1.0 + step(1.05, fc.y + 0.0) * 0.0; }       // jaw shadow beard
  return clamp(m, 0.0, 1.0) * (1.0 - lip);
}
float smask(vec2 fc, float id, float mouthY){
  float ax = abs(fc.x); float y0 = mouthY + 0.12; float m = 0.0;
  if (id < 1.5) m = step(length(vec2(fc.x * 1.0, (fc.y - (mouthY + 0.22)) * 2.2)), 0.5) * step(y0, fc.y);                                       // chevron
  else if (id < 2.5) m = step(abs(fc.y - (mouthY + 0.2)), 0.045) * step(ax, 0.45);                                                              // pencil
  else if (id < 3.5) { float curl = smoothstep(0.4, 0.8, ax) * 0.25; m = step(abs(fc.y - (mouthY + 0.2 + curl)), 0.085) * step(ax, 0.85) * step(y0 - 0.05, fc.y); } // handlebar
  else if (id < 4.5) m = step(length(vec2(fc.x * 0.85, (fc.y - (mouthY + 0.14)) * 1.7)), 0.62) * step(mouthY - 0.12, fc.y);                     // walrus
  else if (id < 5.5) { m = step(length(vec2(fc.x, (fc.y - (mouthY + 0.22)) * 2.2)), 0.5) * step(y0, fc.y) + step(0.38, ax) * step(ax, 0.52) * step(0.4, fc.y) * step(fc.y, mouthY + 0.2); } // horseshoe
  else if (id < 6.5) m = step(ax, 0.17) * step(abs(fc.y - (mouthY + 0.2)), 0.09);                                                               // toothbrush
  else if (id < 7.5) { m = step(abs(fc.y - (mouthY + 0.2)), 0.04) * step(ax, 0.5) + step(0.34, ax) * step(ax, 0.46) * step(0.2, fc.y) * step(fc.y, mouthY + 0.2); } // fu manchu
  else if (id < 8.5) { float up = smoothstep(0.35, 0.75, ax) * 0.3; m = step(abs(fc.y - (mouthY + 0.2 + up)), 0.05) * step(ax, 0.8); }          // imperial
  else m = step(abs(fc.y - (mouthY + 0.2)), 0.07) * step(ax, 0.7);                                                                               // painter
  return m;
}
float hairMask(vec3 p, vec2 fc){
  float az = atan(p.x, p.z - uHc.x); float aa = abs(az);
  float hl = mix(uH1.x, mix(uH1.y, uH1.z, smoothstep(1.3, 2.4, aa)), smoothstep(0.55, 1.4, aa));
  float side = step(0.8, abs(fc.x)) * step(fc.y, uH2.w + 0.2) ; // sideburn skip handled by hl
  float v = step(hl, fc.y);
  v *= 1.0 - uH3.w * smoothstep(0.75, 1.0, abs(fc.x)) * smoothstep(uH2.w, uH2.w - 0.5, fc.y) * 0.0;
  return v;
}`;
export function shellMaterial(kind) {
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: kind === 3 ? .9 : .55, metalness: 0 });
  const U = m.userData.U = { uKind: { value: kind }, uLm: { value: new THREE.Vector4() }, uHc: { value: new THREE.Vector4() }, uMo: { value: new THREE.Vector4(.815, .28, 1.83, 1.07) },
    uH1: { value: new THREE.Vector4(2.7, 2.2, 1.6, .0) }, // hairline fy: front, temple/side, back, (unused)
    uH2: { value: new THREE.Vector4(.012, .02, 0, 2.3) }, // thickness base, top volume, radial volume, fade line
    uH3: { value: new THREE.Vector4(0, 0, 0, 0) }, // x style id, y strand scale, z density, w fade
    uC1: { value: new THREE.Color('#1a110b') }, uC2: { value: new THREE.Color('#3d2a1a') } };
  const off = m.userData.off = { value: 0 };
  m.onBeforeCompile = sh => { Object.assign(sh.uniforms, U); sh.uniforms.uOff = off;
    hookVertex(sh, `
      { vec2 fcv = vec2((vRest.x - uLm.x) / uLm.z, (vRest.y - uLm.y) / uLm.z); float d = uH2.x;
        if (uKind < 0.5) { d += uH2.y * smoothstep(1.9, 3.1, fcv.y); vec3 hc = vec3(uLm.x, uLm.y + 2.1 * uLm.z, uHc.x); vec3 rad = normalize(vRest - hc); transformed += rad * uH2.z * smoothstep(1.5, 2.8, fcv.y) * uLm.z; }
        else if (uKind < 2.5) { d += uH2.y; transformed.y -= uH2.z * smoothstep(1.0, 0.5, fcv.y) * uLm.z; }
        transformed += normalize(normal) * d; }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + GLSL_COMMON + HEAD).replace('#include <color_fragment>', `#include <color_fragment>
      vec2 fcf = vec2((vRest.x - uLm.x) / uLm.z, (vRest.y - uLm.y) / uLm.z); float vis = 0.0; vec3 col = uC1;
      if (uKind < 0.5) { vis = hairMask(vRest, fcf); float id = uH3.x; float st = uH3.y;
        float strand = vn(vec3(vRest.x * 90.0 * st, vRest.y * 14.0, vRest.z * 90.0 * st)); float curl = vn(vRest * 160.0 * st);
        if (id > 0.5 && id < 1.5) { float c = vn(vRest * 220.0); col *= 0.6 + 0.8 * c; vis *= step(0.2 - uH3.z * 0.2, c + 0.2); }                       // coily / curls
        else if (id > 1.5 && id < 2.5) { float g = abs(fract(vRest.x / uLm.z * 7.0) - 0.5); col *= 0.62 + 0.55 * smoothstep(0.0, 0.3, g); }               // cornrows
        else if (id > 2.5 && id < 3.5) { float w = sin(vRest.y * 260.0 + sin(vRest.x * 120.0) * 2.0); col *= 0.75 + 0.3 * w; }                          // waves
        else if (id > 3.5 && id < 4.5) { float w = abs(fract(vRest.y * 60.0 + abs(fract(vRest.x * 60.0) - 0.5) * 1.5) - 0.5); col *= 0.6 + 0.8 * smoothstep(0.0, 0.3, w); } // braid weave
        else { col *= 0.75 + 0.5 * strand; }
        float om = smoothstep(2.0, 3.2, fcf.y); col = mix(uC2, col, mix(1.0, om, uH3.z * 0.0 + 0.0)); col = mix(col, uC2, smoothstep(0.4, 1.0, strand) * 0.35 * om);
        // temple fade: sides and back thin out into skin
        float fadeLine = uH2.w; float fadeAmt = uH3.w; if (fadeAmt > 0.0) { float az = abs(atan(vRest.x, vRest.z - uHc.x)); float fadeMask = smoothstep(0.7, 1.3, az); float h = h31(floor(vRest * 700.0)); float lim = fadeLine + 0.5 - fadeMask * 0.0; float k = smoothstep(lim - fadeAmt, lim, fcf.y); vis *= step(h, mix(0.15, 1.0, k)) * 1.0 + (1.0 - fadeMask) * (1.0 - step(h, 0.0)) * 0.0; vis = mix(vis, vis * step(h, mix(0.05, 1.0, k)), fadeMask); }
      } else if (kind3(uKind) < 1.5) { float id = uH3.x; float m = bmask(fcf, id, uMo.x, uMo.y); float ht = h31(floor(vRest * 600.0)); vis = step(1.0 - uH3.z, ht * 0.8 + 0.2 * vn(vRest * 300.0)) * m; col *= 0.7 + 0.5 * vn(vec3(vRest.x * 200.0, vRest.y * 25.0, vRest.z * 200.0)); }
      else if (kind3(uKind) < 2.5) { float m = smask(fcf, uH3.x, uMo.x); float ht = h31(floor(vRest * 600.0)); vis = step(1.0 - uH3.z, ht * 0.8 + 0.2 * vn(vRest * 300.0)) * m; col *= 0.7 + 0.5 * vn(vec3(vRest.x * 200.0, vRest.y * 25.0, vRest.z * 200.0)); }
      else { float id = uH3.x; float ax = abs(fcf.x); float m = 0.0;
        if (id < 0.5) m = step(0.5, fcf.y) * step(fcf.y, uMo.w + 0.28 + 0.0) * step(ax, 1.05) * step(0.0, vRest.z - uHc.x * 0.0 + 0.0);       // surgical / dust mask
        else if (id < 1.5) m = step(0.5, fcf.y) * step(fcf.y, uMo.w + 0.5) * step(ax, 1.08);                                                  // bandana mask
        else if (id < 2.5) m = 1.0 - step(abs(fcf.y - uMo.z), 0.36) * step(ax, 0.8);                                                           // balaclava (eyes open)
        else if (id < 3.5) m = step(0.2, fcf.y) * step(fcf.y, uMo.w + 0.55) * step(ax, 1.15);                                                   // neck gaiter up
        else m = (1.0 - step(abs(fcf.y - uMo.z), 0.3) * step(ax, 0.72)) * step(uMo.z - 0.7, fcf.y);                                              // ski mask short
        vis = m * step(0.0, 1.0); float f = vn(vRest * 500.0); col = mix(col, uC2, step(0.5, fract(fcf.y * 9.0)) * 0.12 * step(uH3.x, 0.5)); col *= 0.92 + 0.15 * f; }
      if (vis < 0.5) discard; diffuseColor.rgb = col;`);
    sh.fragmentShader = sh.fragmentShader.replace('uniform vec4 uLm,', 'float kind3(float k){ return k; }\nuniform vec4 uLm,'); };
  m.customProgramCacheKey = () => 'mpshell';
  return m;
}
