// Garment shells: every garment is the body mesh re-drawn a few millimetres out, cut with analytic rules (sleeve / hem / neckline / waist / boot-top)
// and coloured with procedural fabric patterns. Garment *shape* variety = cut parameters x fit x pattern x colour, so one shader serves hundreds of items.
import * as THREE from 'three';
import { hookVertex, GLSL_COMMON } from './shaders.js';

export const PATTERNS = ['Solid', 'Stripes', 'Pinstripe', 'Vertical stripes', 'Plaid', 'Camo', 'Polka dots', 'Checker', 'Gradient', 'Chevron', 'Tie-dye', 'Houndstooth', 'Argyle', 'Hex mesh', 'Speckle', 'Waves', 'Floral', 'Zebra'];
const FRAG = /* glsl */`
uniform float uKind; uniform vec4 uG1, uG2, uN, uPat; uniform vec3 uC1, uC2, uC3; uniform vec4 uSole;
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
  else if (id < 15.5) { v = smoothstep(0.35, 0.65, 0.5 + 0.5 * sin(q.x * 3.0 + sin(q.y * 4.0) * 1.5)); }
  else if (id < 16.5) { vec2 f = fract(q * 0.65) - 0.5; float petals = 0.2 + 0.05 * sin(atan(f.y, f.x) * 5.0); v = step(length(f), petals); vec2 f2 = fract(q * 0.65 + vec2(0.5, 0.38)) - 0.5; v = max(v, step(length(f2), 0.15 + 0.04 * sin(atan(f2.y, f2.x) * 6.0))); v = max(v, step(length(f), 0.07) * 0.5); }
  else { float n = q.y * 1.35 + sin(q.x * 2.4) * 0.5 + vn(vec3(q * 0.5, 2.0)) * 0.28; v = step(0.48, fract(n)); }
  return v;
}
uniform vec4 uLm; uniform vec4 uNk; uniform vec4 uArmO; uniform vec4 uArmD; uniform vec4 uDet;
float gH = 0.0; float gA = 1.0;
float band(float x, float c, float w){ return 1.0 - smoothstep(0.0, w, abs(x - c)); }
vec3 garment(vec3 p, vec3 n, vec4 R){
  float kind = uKind; float ax = abs(p.x); float side = p.x >= 0.0 ? 1.0 : -1.0;
  float H = uLm.y - uLm.x; float t = (p.y - uLm.x) / H; float LL = uLm.z - uLm.w; float ls = (uLm.z - p.y) / LL;
  vec3 pa = vec3(ax, p.y, p.z) - uArmO.xyz; float as = dot(pa, uArmD.xyz) / uArmD.w; float armR = length(pa - uArmD.xyz * dot(pa, uArmD.xyz));
  float armW = vW1.w + vW2.x, handW = vW2.x, legW = vW2.y + vW2.z, footW = vW2.z, neckW = vW1.y + vW1.x;
  bool isArm = armW > 0.5 && as > 0.0; bool vis = false; float edge = 1.0; // edge = signed distance to the cut in metres (positive inside)
  float front = smoothstep(-0.03, 0.05, p.z - uN.w); float ang = atan(n.z, n.x * side); // 0 = outer side, pi/2 = front
  float h = 0.0; float rib = 0.0; float seam = 0.0;
  if (kind < 0.5 || (kind > 2.5 && kind < 3.5)) { // top / jacket
    if (isArm) { edge = (uG1.x - as) * uArmD.w; vis = edge > 0.0 && handW < 0.5;
      h += 0.0013 * sin(as * 70.0 + 2.5 * sin(ang * 2.0 + as * 8.0)) * (0.4 + 0.6 * sin(ang * 2.0 + 0.5)) * band(as, 0.5, 0.1) * step(0.55, uG1.x); // elbow folds
      h += 0.0008 * sin(as * 130.0 + ang * 2.0 + sin(ang * 3.0) * 1.5) * smoothstep(uG1.x - 0.16, uG1.x - 0.05, as) * step(0.8, uG1.x); // cuff stacking
      seam = max(seam, band(as * uArmD.w, 0.035, 0.0018) * step(0.1, uG1.x)); // shoulder seam
      if (uG1.x > 0.8 || kind > 2.5) rib = smoothstep(0.035, 0.0, edge); }
    else { float e1 = (t - uG1.y) * H; edge = uG2.x > 0.0 ? 1.0 : e1; vis = e1 > 0.0;
      if (uG1.x < 0.05) { float eh = (uArmO.x - 0.04 - ax) + max(0.0, (uArmO.y - 0.09) - p.y) * 1.2; edge = min(edge, eh); vis = vis && eh > 0.0; } // sleeveless: round armhole
      if (uG2.x > 0.0 && (legW > 0.5 || e1 < 0.0)) { vis = ls < uG2.x; edge = (uG2.x - ls) * LL; }
      { float dep = uN.y * H * 0.7 * smoothstep(0.0, 0.1, uN.z); vec2 q = vec2(p.x / uNk.z, (p.z - uNk.y) / (p.z > uNk.y ? uNk.w + dep : uNk.w * 0.9)); float dn = length(q);
        float en = (dn - 1.0) * uNk.z; float scoop = uNk.x > 0.001 ? uNk.x : 0.11; if (p.y < uLm.y - scoop - dep * 0.6) en = 1.0; if (uG2.w > 0.5) en = (uLm.y - 0.012 - p.y);
        edge = min(edge, en); rib = max(rib, smoothstep(0.014, 0.0, en) * 0.8); h += 0.0012 * smoothstep(0.012, 0.004, en) * smoothstep(0.0, 0.003, en); }
      if (kind > 2.5) { float eo = ax - uG2.y; if (front > 0.5) edge = min(edge, max(eo, (uG2.z - t) * H)); }
      if (kind > 2.5 && uDet.x > 0.5 && front > 0.5) { seam = max(seam, band(ax, 0.0, 0.004)); h += 0.0008 * band(ax, 0.0, 0.006); } // zipper
      seam = max(seam, band(ang, 0.0, 0.05) * step(0.0, -p.z + 0.02) * 0.0); seam = max(seam, band(abs(ang), 0.0, 0.035));
      h += 0.0009 * sin(p.y * 95.0 + ax * 60.0) * smoothstep(0.06, 0.13, ax) * band(t, 0.55, 0.3); // side drape
      h += 0.0007 * sin(p.y * 210.0 + sin(ax * 40.0) * 2.0) * smoothstep(0.12, 0.0, e1) * step(uG2.x, 0.0); // hem gather (not on dresses: no hem there)
      if (kind > 2.5 || uDet.y > 0.5) rib = max(rib, smoothstep(0.03, 0.0, e1)); if (legW > 0.5) { h *= 0.2; rib = 0.0; } }
  } else if (kind < 1.5) { // pants
    if (!isArm) { float ew = (uG1.y - t) * H, el = (uG1.x - ls) * LL; edge = min(ew, legW > 0.3 ? el : 1.0); vis = edge > 0.0 && footW < 0.5;
      h += 0.0012 * sin(ls * 80.0 + 2.5 * sin(ang * 2.0 + ls * 9.0)) * (0.4 + 0.6 * sin(ang * 2.0 + 1.0)) * band(ls, 0.5, 0.09); // knee folds
      h += 0.0008 * sin(p.y * 160.0 + ax * 50.0) * band(ls, 0.02, 0.08) * front; // lap creases
      if (uDet.z > 0.5) { h += 0.0009 * sin(ls * 150.0 + 3.0 * sin(ang * 2.0 + ls * 20.0)) * (0.5 + 0.5 * sin(ang * 3.0 + ls * 40.0)) * smoothstep(uG1.x - 0.12, uG1.x - 0.05, ls); rib = smoothstep(0.035, 0.0, el); }
      seam = max(seam, band(ang, 0.0, 0.03) * step(0.05, ls)); // outseam
      seam = max(seam, band(abs(ang), 3.14159, 0.05) * step(0.12, ls));
      rib = max(rib, smoothstep(0.03, 0.0, ew) * step(0.5, uDet.w));
      if (uDet.y > 0.5) { // cargo pocket on the outer thigh
        float u = ang, v = ls; float pk = smoothstep(0.62, 0.55, abs(u - 0.15)) * smoothstep(0.08, 0.06, abs(v - 0.38));
        float fl = smoothstep(0.62, 0.55, abs(u - 0.15)) * band(v, 0.315, 0.012); h += 0.0022 * pk + 0.001 * fl; seam = max(seam, (1.0 - smoothstep(0.0, 0.03, abs(abs(u - 0.15) - 0.58))) * step(abs(v - 0.38), 0.08)); seam = max(seam, band(v, 0.3, 0.0025) * step(abs(u - 0.15), 0.6) * 0.8); seam = max(seam, band(v, 0.46, 0.003) * step(abs(u - 0.15), 0.6)); } } }
  else if (kind < 2.5) { if (footW < 0.5 && legW > 0.3 && uG1.x < 0.95) { edge = (ls - uG1.x) * LL; vis = edge > 0.0; } else if (uG1.z > 0.5) { vis = legW > 0.3 && (footW > 0.5 || ls > uG1.x); edge = 0.5; } }
  else if (kind < 4.5) { if (handW > 0.5) { vis = true; edge = 0.5; } else if (isArm) { edge = (as - uG1.x) * uArmD.w; vis = edge > 0.0; } }
  else { if (!isArm) { float eb = min((0.06 - t) * H, (0.1 - ls) * LL); vis = eb > 0.0 && t > -0.3 && footW < 0.5; edge = eb; if (uG1.z > 0.5 && t > 0.6 && t < 0.78 && ax < 0.25) { vis = true; edge = 0.5; } } }
  if (!gl_FrontFacing && !isArm && p.y > uLm.y - 0.035 && ax < 0.17) edge = min(edge, -0.002);
  if (!vis) discard;
  if (edge < -0.003) discard;
  float fw = clamp(fwidth(edge), 1e-5, 0.005); gA = smoothstep(0.0, fw * 2.2, max(edge, 0.0));
  vec3 c = uC1; if (uSole.w > 0.5 && isArm) c = uC2; float pv = pat(p, uPat.x, uPat.y); if (uSole.w < 0.5) c = mix(c, uC2, pv * uPat.z); else if (!isArm) c = mix(c, uC2, pv * uPat.z);
  // Subtle yarn grain only — no large sine-band folds (those read as black blotches across solid clothes).
  float fib = vn(p * 140.0) * 0.5 + vn(vec3(p.x * 80.0, p.y * 220.0, p.z * 80.0)) * 0.5; c *= 0.985 + 0.03 * fib;
  if (kind > 1.5 && kind < 2.5) { float sole = step(p.y, uSole.x); c = mix(c, uC3, sole); }
  if (rib > 0.0) { float r = 0.5 + 0.5 * sin((isArm ? ang * 30.0 : (p.x * 380.0 + p.z * 200.0))); h += 0.0005 * r * rib; c *= 1.0 - 0.04 * rib * (1.0 - r); }
  float lum = dot(c, vec3(0.3, 0.59, 0.11)); vec3 sc = lum > 0.35 ? c * 0.88 : c + vec3(0.04); c = mix(c, sc, seam * 0.7);
  if (kind != 2.0 && kind != 4.0) c *= mix(0.92, 1.0, smoothstep(0.0, 0.01, edge));
  if (uSole.z > 0.5 && !isArm) { float rb = step(0.5, fract(p.y * 60.0)); c *= 0.98 + 0.03 * rb; }
  gH = h; return c;
}
vec3 bumpN(vec3 surf, vec3 nrm, float hgt, float k){ vec3 dx = dFdx(surf), dy = dFdy(surf); float hx = dFdx(hgt), hy = dFdy(hgt); vec3 r1 = cross(dy, nrm), r2 = cross(nrm, dx); float det = dot(dx, r1); vec3 g = sign(det) * (hx * r1 + hy * r2); return normalize(abs(det) * nrm - g * k); }
`;
export function garmentMaterial(kind) {
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: kind === 2 ? .55 : .86, metalness: 0, side: THREE.DoubleSide }); m.alphaToCoverage = true;
  const U = m.userData.U = { uKind: { value: kind }, uG1: { value: new THREE.Vector4(1, 0, 0, 9) }, uG2: { value: new THREE.Vector4(0, .05, .5, 0) }, uN: { value: new THREE.Vector4(.98, .08, .12, -.03) }, uPat: { value: new THREE.Vector4(0, 8, 1, 0) },
    uC1: { value: new THREE.Color('#888') }, uC2: { value: new THREE.Color('#fff') }, uC3: { value: new THREE.Color('#eee') }, uSole: { value: new THREE.Vector4(.02, 0, 0, 0) }, uShape: { value: new THREE.Vector4(0, 0, 0, 0) }, uLm: { value: new THREE.Vector4(1, 1.4, .9, .1) }, uArmO: { value: new THREE.Vector4() }, uArmD: { value: new THREE.Vector4(1, 0, 0, .5) }, uDet: { value: new THREE.Vector4() }, uNk: { value: new THREE.Vector4(0, 0, .06, .06) }, uOver: { value: new THREE.Vector4() } };
  const off = m.userData.off = { value: .006 };
  m.onBeforeCompile = sh => { Object.assign(sh.uniforms, U); sh.uniforms.uOff = off;
    hookVertex(sh, `
      { float rs = vR.y; float gr = vR.x; float k = 0.0;
        vec3 nn = normalize(normal); float sdx = position.x >= 0.0 ? 1.0 : -1.0;
        if (uKind > 0.5 && uKind < 1.5 && gr > 4.5 && gr < 5.5) {
          if (uG2.w > 0.5) { // A-line skirt: fitted at the hips, flare toward the hem, closed between the legs
            float le = max(uG1.x, 0.12); float along = clamp(rs / le, 0.0, 1.0);
            k = uShape.x + uShape.y * along * along;
            float inner = smoothstep(0.18, -0.4, nn.x * sdx) * (1.0 - smoothstep(le * 0.9, le * 1.06, rs));
            transformed.x = mix(transformed.x, sdx * 0.002, inner * 0.96);
          } else {
            k = uShape.x + uShape.y * rs;
            if (uDet.z > 0.5) { k += 0.006 * smoothstep(0.35, 0.7, rs) * (1.0 - smoothstep(uG1.x - 0.12, uG1.x - 0.06, rs)); k -= (uOff - 0.004) * smoothstep(uG1.x - 0.12, uG1.x - 0.035, rs); }
            if (uDet.y > 0.5) { float ang = atan(nn.z, nn.x * sdx); float pu = smoothstep(0.66, 0.5, abs(ang - 0.15)); float pk = pu * smoothstep(0.09, 0.065, abs(rs - 0.4)); k += 0.0075 * pk + 0.003 * pu * smoothstep(0.02, 0.008, abs(rs - 0.318)); }
          }
        }
        if ((uKind < 0.5 || (uKind > 2.5 && uKind < 3.5)) && gr > 4.5 && gr < 5.5) { k += uShape.w * smoothstep(0.0, 0.55, rs);
          if (uG2.x > 0.0) { float inner = smoothstep(0.1, -0.5, nn.x * sdx) * (1.0 - smoothstep(uG2.x * 0.9, uG2.x * 1.05, rs)); transformed.x = mix(transformed.x, sdx * 0.003, inner * 0.9); } }
        if (uKind > 2.5 && uKind < 3.5 && uDet.w > 0.5 && gr > 1.5 && gr < 2.5) { float waist = exp(-pow((vR.z - 0.16) / 0.11, 2.0)); k -= 0.007 * waist; } // belted robe: gentle cinch, belt mesh covers the waist
        if ((uKind < 0.5 || (uKind > 2.5 && uKind < 3.5)) && ((gr > 1.5 && gr < 2.5) || (gr > 4.5 && gr < 5.5))) k += uOver.x * (gr > 4.5 ? 1.0 : smoothstep(uOver.y + 0.16, uOver.y + 0.03, vR.z));
        if ((uKind < 0.5 || (uKind > 2.5 && uKind < 3.5)) && gr > 2.5 && gr < 3.5) { k += uShape.x + uShape.y * min(rs, 0.6) * 1.2; if (uDet.y > 0.5 || uKind > 2.5) k *= 1.0 - 0.85 * smoothstep(uG1.x - 0.14, uG1.x - 0.02, rs); }
        if (uKind > 1.5 && uKind < 2.5 && gr > 5.5) k = uShape.x + (position.y < 0.05 ? uShape.z : 0.0);
        transformed.xz += normalize(normal.xz + vec2(1e-5)) * k; }`, 'uniform float uKind; uniform vec4 uShape; uniform vec4 uG1; uniform vec4 uG2; uniform vec4 uDet; uniform vec4 uOver;\n');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + GLSL_COMMON + FRAG).replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = garment(vRest, normalize(vRestN), vR); diffuseColor.a = gA; if (gA < 0.02) discard;').replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n normal = bumpN(-vViewPosition, normal, gH, 1.0);'); };
  m.customProgramCacheKey = () => 'mpgarm8';
  return m;
}
