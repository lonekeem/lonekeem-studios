// Garment shells: every garment is the body mesh re-drawn a few millimetres out, cut with analytic rules (sleeve / hem / neckline / waist / boot-top)
// and coloured with procedural fabric patterns. Garment *shape* variety = cut parameters x fit x pattern x colour, so one shader serves hundreds of items.
import * as THREE from 'three';
import { hookVertex, GLSL_COMMON } from './shaders.js';
import { DETAIL_GLSL } from './detail.js';

export const PATTERNS = ['Solid', 'Stripes', 'Pinstripe', 'Vertical stripes', 'Plaid', 'Camo', 'Polka dots', 'Checker', 'Gradient', 'Chevron', 'Tie-dye', 'Houndstooth', 'Argyle', 'Hex mesh', 'Speckle', 'Waves'];
const FRAG = /* glsl */`
uniform float uKind; uniform vec4 uG1, uG2, uN, uPat; uniform vec3 uC1, uC2, uC3; uniform vec4 uSole, uShape;
${DETAIL_GLSL}
float pat(vec3 p, float id, float sc){
  vec2 q = vec2(p.x + p.z * 0.7, p.y) * sc; float v = 0.0;
  if (id < 0.5) return 0.0;
  if (id < 1.5) v = step(0.5, fract(q.y));
  else if (id < 2.5) v = step(0.9, fract(q.y * 2.0));
  else if (id < 3.5) v = step(0.5, fract(q.x));
  else if (id < 4.5) { float a = step(0.5, fract(q.x)), b = step(0.5, fract(q.y)); v = abs(a - b) * 0.8 + step(0.92, fract(q.x * 3.0)) * 0.4; }
  else if (id < 5.5) { float n = vn(vec3(q * 0.9, 1.0)) + 0.5 * vn(vec3(q * 2.3, 4.0)); v = n > 0.95 ? 1.0 : (n > 0.62 ? 0.5 : 0.0); }
  else if (id < 6.5) { vec2 f = fract(q * 1.2) - 0.5; v = step(length(f), 0.22); }
  else if (id < 7.5) { v = abs(step(0.5, fract(q.x * 0.8)) - step(0.5, fract(q.y * 0.8))); }
  else if (id < 8.5) { v = smoothstep(0.0, 1.0, p.y * 0.8 - 0.1 + sin(p.x * 3.0) * 0.1); }
  else if (id < 9.5) { v = step(0.5, fract(q.y * 0.9 + abs(fract(q.x * 0.9) - 0.5) * 1.6)); }
  else if (id < 10.5) { float n = vn(vec3(q * 0.5, 7.0)) * 3.0 + sin(q.x * 0.7) * 0.5; v = smoothstep(0.3, 0.7, fract(n)); }
  else if (id < 11.5) { vec2 f = fract(q * 0.8); v = step(0.5, abs(step(0.5, f.x) - step(0.5, f.y))) * step(0.25, abs(fract(q.x * 1.6) - fract(q.y * 1.6))); }
  else if (id < 12.5) { vec2 f = abs(fract(q * 0.6) - 0.5) * 2.0; v = step(f.x + f.y, 1.0) * 0.8; v = max(v, step(0.97, 1.0 - abs(f.x - f.y))); }
  else if (id < 13.5) { vec2 f = fract(q * vec2(1.0, 1.15)) - 0.5; v = step(abs(f.x) * 1.15 + abs(f.y) * 0.6, 0.45); }
  else if (id < 14.5) { v = step(0.78, vn(vec3(q * 6.0, 2.0))); }
  else { v = smoothstep(0.35, 0.65, 0.5 + 0.5 * sin(q.x * 3.0 + sin(q.y * 4.0) * 1.5)); }
  return v;
}
vec3 garment(vec3 p, vec3 n, vec4 R){
  float reg = softReg(), s = R.y, t = R.z, side = R.w; float ax = abs(p.x); float kind = uKind; bool vis = false; float edge = 9.0;
  float front = smoothstep(-0.03, 0.05, p.z - uN.w);
  float nkv = uN.x - uN.y * max(0.0, 1.0 - ax / uN.z) * front + 0.3 * smoothstep(uN.z * 0.55, uN.z * 1.3, ax);
  bool hip = reg > 1.5 && t < 0.45 && ax < uB1.x * 1.5;
  if (kind < 0.5 || (kind > 2.5 && kind < 3.5)) { // top / jacket
    float armCut = uG1.x < 0.1 ? uB1.x * 0.97 : 9.0;
    if (reg < 2.5) { vis = t > uG1.y && ax < uG1.w && (t < 0.5 || ax < armCut); edge = t - uG1.y;
      if (t > nkv) { vis = false; }
      if (kind > 2.5) { if (ax < uG2.y && front > 0.5 && t > uG2.z) vis = false; } }
    if (reg > 2.5 && reg < 4.5 && !hip) { vis = s < uG1.x && t < nkv; edge = min(edge, uG1.x - s); if (uG1.x < 0.1) { vis = t > 0.5 && t < nkv && ax < armCut && t > uG1.y; edge = t - uG1.y; } }
    if (reg > 0.5 && reg < 1.5 && uG2.w > 0.5) { vis = t < 1.02 + uG2.w * 0.12; edge = 0.5; }
    if (hip && reg > 2.5) { vis = t > uG1.y && (s < uG2.x || reg < 4.5); edge = t - uG1.y; if (kind > 2.5 && ax < uG2.y && front > 0.5 && t > uG2.z) vis = false; }
    else if (reg > 4.5) { vis = s < uG2.x && t > uG1.y; edge = min(uG2.x - s, t - uG1.y); }
  } else if (kind < 1.5) { // pants
    if (hip || reg > 4.5) { vis = t < uG1.y && s < uG1.x; edge = min(uG1.y - t, uG1.x - s); }
  } else if (kind < 2.5) { // shoes / boots
    if (reg > 5.5) { vis = true; edge = 0.5; } if (reg > 4.5 && reg < 5.5) { vis = s > uG1.x; edge = s - uG1.x; }
  } else if (kind < 4.5) { // gloves
    if (reg > 3.5 && reg < 4.5) { vis = true; edge = 0.5; } if (reg > 2.5 && reg < 3.5) { vis = s > uG1.x; edge = s - uG1.x; }
  } else { // base underlayer
    if (reg > 1.5 && reg < 2.5) { vis = (uG1.y < 0.5 && t < 0.06 && t > -0.3) || (uG1.z > 0.5 && t > 0.6 && t < 0.78 && ax < 0.25); edge = 0.5; } if (reg > 4.5 && reg < 5.5) { vis = s < 0.1 && uG1.y < 0.5 && t < 0.06; edge = 0.5; }
  }
  if (kind > 0.5 && kind < 1.5 && p.y < uShape.z) vis = false;
  if (!vis) discard;
  vec3 c = uC1; if (uSole.w > 0.5 && reg < 4.5 && (t > 0.3 || reg > 2.5) && ax > uB1.x * 1.04 && !hip) c = uC2; float pv = pat(p, uPat.x, uPat.y); if (uSole.w < 0.5) c = mix(c, uC2, pv * uPat.z); else if (reg < 2.5 || reg > 3.5) c = mix(c, uC2, pv * uPat.z);
  float fib = vn(p * 900.0) * 0.5 + vn(vec3(p.x * 200.0, p.y * 900.0, p.z * 200.0)) * 0.5; c *= 0.93 + 0.12 * fib;
  if (kind < 1.5 || (kind > 2.5 && kind < 3.5)) { c = detail(c, p, n, reg, s, t, edge, (nkv - t) * uB1.z, front, nkv); }
  if (kind > 1.5 && kind < 2.5) { float sole = step(p.y, uSole.x); c = mix(c, uC3, sole); float cap = step(p.y, 0.05) * step(0.045, p.y); c = mix(c, uC3, cap * 0.7 * step(0.5, uSole.y)); }
  if (edge < 0.03 && kind != 2.0 && kind != 4.0) c *= mix(0.86, 1.0, smoothstep(0.0, 0.03, edge));
  if (uSole.z > 0.5 && reg > 1.5 && reg < 3.5) { float rib = step(0.5, fract(p.y * 60.0)); c *= 0.95 + 0.07 * rib; }
  return c;
}`;
export function garmentMaterial(kind) {
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: kind === 2 ? .55 : .86, metalness: 0 });
  const U = m.userData.U = { uKind: { value: kind }, uG1: { value: new THREE.Vector4(1, 0, 0, 9) }, uG2: { value: new THREE.Vector4(0, .05, .5, 0) }, uN: { value: new THREE.Vector4(.98, .08, .12, -.03) }, uPat: { value: new THREE.Vector4(0, 8, 1, 0) },
    uC1: { value: new THREE.Color('#888') }, uC2: { value: new THREE.Color('#fff') }, uC3: { value: new THREE.Color('#eee') }, uSole: { value: new THREE.Vector4(.02, 0, 0, 0) }, uB1: { value: new THREE.Vector4(.13, 0, .4, .9) }, uB2: { value: new THREE.Vector4(.6, .75, .07, 0) }, uB3: { value: new THREE.Vector4(.07, 0, .07, 0) }, uLedge: { value: new THREE.Vector4(0, 0, .09, 0) }, uD1: { value: new THREE.Vector4(0, 1, 0, 0) }, uD2: { value: new THREE.Vector4(0, 0, 0, 1) }, uShape: { value: new THREE.Vector4(0, 0, 0, 0) } };
  const off = m.userData.off = { value: .006 };
  m.onBeforeCompile = sh => { Object.assign(sh.uniforms, U); sh.uniforms.uOff = off; sh.uniforms.uLedge = U.uLedge;
    hookVertex(sh, `
      { float rs = vR.y; float gr = vR.x; float k = 0.0;
        if (uKind > 0.5 && uKind < 1.5) k = ((uShape.x + uShape.y * rs) + uLedge.y * smoothstep(uLedge.x - uLedge.z, uLedge.x, aP0.y) * step(aP0.y, uLedge.x)) * (aW2.y + aW2.z);
        if (uKind < 0.5) k = uShape.w * smoothstep(0.0, 0.55, rs) * (aW2.y + aW2.z);
        if ((uKind < 0.5 || (uKind > 2.5 && uKind < 3.5))) k += (uShape.x + uShape.y * rs) * (aW1.w + aW2.x);
        if (uKind > 1.5 && uKind < 2.5 && gr > 5.5) k = uShape.x + (position.y < 0.05 ? uShape.z : 0.0);
        transformed.xz += normalize(normal.xz + vec2(1e-5)) * k; }`, 'uniform float uKind; uniform vec4 uShape, uLedge;\n');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + GLSL_COMMON + FRAG).replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = garment(vRest, normalize(vRestN), vR);').replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n normal = bumpN(normal, -vViewPosition, gH);'); };
  m.customProgramCacheKey = () => 'mpgarm';
  return m;
}
