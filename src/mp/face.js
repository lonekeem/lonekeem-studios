// Analytic face painting for the creator (eyes, brows, lips, makeup, freckles, scars, moles, age lines, stubble).
// All coordinates are head-normalised: fx = -1..1 across the face, fy = 0 (chin) .. 1 (top of skull).
import * as THREE from 'three';
export const FACE_UNIFORMS = () => ({
  uSkin: { value: new THREE.Color('#c98d63') }, uLm: { value: new THREE.Vector4(0, 1.5, .1, .1) }, uLip: { value: new THREE.Color('#a85a4a') },
  uE1: { value: new THREE.Vector4(.41, 1.83, .19, .16) }, uE2: { value: new THREE.Vector4(0, .78, .3, 1) }, uEyeCol: { value: new THREE.Color('#4a2c17') },
  uB1: { value: new THREE.Vector4(.14, .36, .62, .075) }, uB2: { value: new THREE.Vector4(.5, .15, .5, 1) }, uBrowCol: { value: new THREE.Color('#1a120c') },
  uM1: { value: new THREE.Vector4(.815, .28, .5, 0) }, uNose: { value: new THREE.Vector4(1.07, .11, 1, 0) },
  uMk1: { value: new THREE.Vector4(0, 0, 0, 0) }, uShadowCol: { value: new THREE.Color('#7a4a8a') }, uBlushCol: { value: new THREE.Color('#d9707a') }, uLipstick: { value: new THREE.Color('#b2264a') },
  uMk2: { value: new THREE.Vector4(0, 0, 0, 0) }, uScar: { value: new THREE.Vector4(0, 0, 0, 0) }, uTat: { value: new THREE.Vector4(0, 0, 0, 0) }, uTatCol: { value: new THREE.Color('#1c2a3a') },
  uStub: { value: new THREE.Vector4(0, 0, 0, 0) }, uHairCol: { value: new THREE.Color('#150d08') }, uBody: { value: new THREE.Vector4(0, 0, 0, 0) }, uUnder: { value: 0 },
});
export const FACE_FRAG_DECL = /* glsl */`
uniform vec3 uSkin, uLip, uEyeCol, uBrowCol, uShadowCol, uBlushCol, uLipstick, uHairCol, uTatCol;
uniform vec4 uLm, uE1, uE2, uB1, uB2, uM1, uNose, uMk1, uMk2, uScar, uTat, uStub, uBody; uniform float uUnder;
vec3 paintSkin(vec3 p, vec3 n, vec4 R){
  vec3 c = uSkin; float reg = R.x;
  // soft anatomy tint: knuckles / elbows / knees / ears slightly warmer (cartoon subsurface look, no glow)
  float warm = 0.0;
  if (reg > 3.5 && reg < 4.5) warm += 0.35;
  warm += 0.25 * smoothstep(0.88, 1.0, R.y) * step(2.5, reg) * step(reg, 3.5);
  c = mix(c, c * vec3(1.06, 0.9, 0.86), warm);
  if (reg > 0.5 && reg < 1.5) c *= 0.97;
  if (reg > 5.5) c = mix(c, c * vec3(1.03, 0.93, 0.9), 0.4);
  // body markings (tattoos on arms) -- region + side + along-limb coordinate
  if (uTat.x > 0.5 && reg > 2.5 && reg < 3.5) {
    float s = R.y, side = R.w; float m = 0.0; float id = uTat.x;
    if (id < 1.5) { m = step(0.2, s) * step(s, 0.95) * smoothstep(0.35, 0.65, vn(p * 90.0) + 0.15 * sin(p.y * 60.0)); }                          // sleeve of ink
    else if (id < 2.5) { float b = abs(fract(s * 9.0) - 0.5); m = step(0.3, s) * step(s, 0.9) * smoothstep(0.1, 0.07, b) * step(0.4, s - floor(s * 9.0) * 0.0 + 0.1); } // bands
    else if (id < 3.5) { vec2 g = vec2(s * 14.0, atan(p.z + 0.004, p.y + 0.002) * 3.0); vec2 f = fract(g) - 0.5; m = step(0.25, s) * step(s, 0.9) * smoothstep(0.22, 0.18, length(f)) * step(0.5, h21(floor(g))); } // dots
    else { float z = abs(fract((s * 6.0) + sin(p.z * 70.0) * 0.12) - 0.5); m = step(0.25, s) * step(s, 0.9) * smoothstep(0.09, 0.06, z); } // zig bands
    c = mix(c, uTatCol, m * 0.88 * step(0.0, side * uTat.y + 0.5)); }
  // ---- face (coordinates are in head-half-width units, origin at the chin line / face centre)
  vec2 fc = vec2((p.x - uLm.x) / uLm.z, (p.y - uLm.y) / uLm.z);
  float face = step(reg, 0.5) * smoothstep(-0.15, 0.3, n.z) * step(0.4, fc.y) * step(fc.y, 3.4) * step(0.0, p.z + 0.02);
  if (face > 0.0) {
    float ax = abs(fc.x), sx = sign(fc.x); float ey = uE1.y;
    // cheeks + nose + brow warmth (cartoon subsurface, no glow)
    c = mix(c, c * vec3(1.06, 0.9, 0.88), 0.45 * smoothstep(0.5, 0.0, length(vec2(ax - 0.55, fc.y - ey + 0.55))));
    c = mix(c, c * vec3(1.07, 0.88, 0.86), 0.45 * smoothstep(0.16, 0.0, length(vec2(fc.x, fc.y - uNose.x - 0.04))));
    // nose side shading + highlight so a flat paint reads as a nose
    { float nside = smoothstep(0.1, 0.0, abs(ax - (uNose.y + 0.07)) - 0.03) * smoothstep(uNose.x - 0.05, uNose.x + 0.1, fc.y) * smoothstep(uNose.x + 0.55, uNose.x + 0.25, fc.y); c *= 1.0 - 0.1 * nside; }
    if (uMk2.z > 0.01) { float fl = abs(fract((fc.y - ey - 0.8) * 3.2) - 0.5); c *= 1.0 - uMk2.z * 0.28 * smoothstep(0.1, 0.03, fl) * step(ey + 0.7, fc.y) * step(ax, 0.9) * step(0.5, vn(vec3(fc.x * 3.0, fc.y * 3.0, 1.0)));
      float nl = sdSeg(vec2(ax, fc.y), vec2(0.35, uNose.x - 0.05), vec2(0.7, uM1.x + 0.1)); c *= 1.0 - uMk2.z * 0.3 * smoothstep(0.04, 0.01, nl); }
    if (uMk1.z > 0.0) c = mix(c, uBlushCol, uMk1.z * 0.55 * smoothstep(0.38, 0.05, length(vec2(ax - 0.6, fc.y - ey + 0.5))));
    // ---- eyes
    vec2 q = vec2(ax - uE1.x, fc.y - ey); float tilt = uE2.x; q.y -= tilt * q.x * 0.5;
    float w = uE1.z, h = uE1.w; float t = q.x / w; float sh = max(1.0 - t * t, 0.0);
    float rnd = mix(0.85, 0.45, clamp(uE2.w * 0.5, 0.0, 1.0));
    float droop = clamp(uE2.z, 0.0, 1.0);
    float up = h * pow(sh, rnd) * (1.0 - 0.4 * droop * smoothstep(-1.0, 1.0, t)); float lo = h * 0.72 * pow(sh, 0.85); float aa = 0.012;
    if (uMk1.x > 0.0) { float band = smoothstep(up + h * 1.3, up, q.y) * smoothstep(-0.01, 0.02, q.y); c = mix(c, uShadowCol, uMk1.x * 0.7 * band * step(abs(t), 1.2)); }
    // socket shading + double-lid crease
    c *= 1.0 - 0.1 * smoothstep(0.35, 0.0, length(vec2(q.x * 0.8, (q.y - 0.05) * 1.2))) ;
    c = mix(c, c * 0.84, smoothstep(0.02, 0.0, abs(q.y - up - h * 0.55) - 0.004) * step(abs(t), 0.95) * 0.7);
    float inEye = smoothstep(aa, -aa, q.y - up) * smoothstep(-aa, aa, q.y + lo) * step(abs(t), 1.0);
    if (inEye > 0.0) {
      vec3 ec = vec3(0.93, 0.92, 0.9); ec = mix(ec, ec * vec3(0.9, 0.8, 0.8), smoothstep(0.7, 1.0, abs(t)) * 0.5);
      float ir = uE2.y * w; vec2 qi = vec2(q.x - sx * 0.0, q.y - h * 0.05); float r = length(qi) / ir;
      float iris = smoothstep(1.0, 0.94, r); vec3 ic = uEyeCol; ic *= mix(1.5, 0.7, smoothstep(0.1, 0.9, r)) * (0.85 + 0.3 * vn(vec3(atan(qi.y, qi.x) * 5.0, r * 6.0, 2.0)));
      ic = mix(ic, uEyeCol * 0.4, smoothstep(0.82, 1.0, r)); ec = mix(ec, ic, iris); ec = mix(ec, vec3(0.015), smoothstep(0.42, 0.37, r) * iris);
      ec = mix(ec, vec3(1.0), smoothstep(0.2, 0.14, length((qi - vec2(ir * 0.32, ir * 0.38)) / ir)));
      ec = mix(ec, vec3(1.0), 0.6 * smoothstep(0.1, 0.06, length((qi - vec2(-ir * 0.3, -ir * 0.4)) / ir)) );
      ec *= mix(1.0, 0.6, smoothstep(up * 0.2, up, q.y)); c = mix(c, ec, inEye);
    }
    float lidw = 0.03 + 0.03 * uE2.z + uMk1.y * 0.03; float lid = smoothstep(lidw, 0.0, abs(q.y - up - lidw * 0.4)) * step(abs(t), 1.04 + 0.35 * uE2.z * step(0.0, t));
    c = mix(c, vec3(0.05, 0.03, 0.03), lid * 0.95);
    if (uE2.z > 0.3) { float fl = smoothstep(0.022, 0.0, abs(q.y - up - (t - 0.95) * 0.35 * h * 2.0) - 0.004) * step(0.85, t) * step(t, 1.55); c = mix(c, vec3(0.04), fl * 0.9); }
    float lw = smoothstep(0.02, 0.0, abs(q.y + lo * 1.0) - 0.002) * step(abs(t), 0.92); c = mix(c, c * 0.6, lw * (0.3 + uMk1.y * 0.6));
    // ---- brows
    float bt = (ax - uB1.x) / uB1.z; if (bt > 0.0 && bt < 1.0) { float cy = ey + uB1.y + uB2.x * 0.14 * sin(bt * 3.14159) * (1.0 - 0.3 * bt) + uB2.y * 0.3 * bt - 0.05 * bt * bt;
      float th = uB1.w * (1.0 - uB2.z * 0.65 * bt * bt) * (0.7 + 0.3 * sin(min(bt * 3.0 + 0.4, 3.14159))) * smoothstep(0.0, 0.08, bt) ;
      float d = abs(fc.y - cy); float ba = smoothstep(th, th * 0.4, d) * (0.8 + 0.2 * vn(vec3(fc.x * 40.0, fc.y * 12.0, 3.0))); c = mix(c, uBrowCol, ba * uB2.w * smoothstep(1.0, 0.85, bt)); }
    // ---- lips + mouth
    float lx = ax / uM1.y; if (lx < 1.0) { float sp = pow(max(1.0 - lx * lx, 0.0), 0.7); float ly = fc.y - (uM1.x + uM1.w * 0.1 * lx * lx);
      float ft = 0.035 + 0.1 * uM1.z; float upl = smoothstep(-0.005, 0.005, ly) * smoothstep(ft * 0.7 * sp, ft * 0.62 * sp, ly);
      float lol = smoothstep(0.005, -0.005, ly) * smoothstep(-ft * 1.1 * sp, -ft * 0.98 * sp, ly);
      vec3 lc = mix(uLip, uLipstick, clamp(uMk1.w, 0.0, 1.0)); lc = mix(c, lc, 0.9); c = mix(c, lc, max(upl, lol)); c = mix(c, vec3(1.0), 0.0);
      c = mix(c, c * 0.35, smoothstep(0.012, 0.0, abs(ly)) * smoothstep(1.0, 0.8, lx)); c = mix(c, c * 1.12, smoothstep(0.03, 0.0, abs(ly + ft * 0.55 * sp)) * lol * 0.5); }
    { vec2 nn = vec2(ax - uNose.y, fc.y - (uNose.x - 0.02)); c = mix(c, c * 0.4, smoothstep(0.05, 0.022, length(nn * vec2(1.0, 1.8))) * 0.6); }
    // freckles + moles
    if (uMk2.x > 0.0) { vec2 g = fc * 22.0; vec2 id = floor(g); vec2 f = fract(g) - 0.5; float on = step(h21(id), uMk2.x * 0.25) * smoothstep(0.32, 0.12, length(f + (vec2(h21(id + 3.0), h21(id + 7.0)) - 0.5) * 0.4));
      float zone = smoothstep(0.95, 0.5, ax) * step(uM1.x + 0.4, fc.y) * smoothstep(ey + 0.1, ey - 0.4, fc.y); c = mix(c, c * vec3(0.62, 0.45, 0.38), on * zone * 0.85); }
    if (uMk2.y > 0.5) { float m1 = smoothstep(0.05, 0.03, length(vec2(fc.x - 0.9, fc.y - (uM1.x + 0.4)))); float m2 = smoothstep(0.04, 0.02, length(vec2(fc.x + 0.35, fc.y - uNose.x - 0.3))); float m3 = step(1.5, uMk2.y) * smoothstep(0.04, 0.02, length(vec2(fc.x - 0.2, fc.y - uM1.x + 0.25))); c = mix(c, vec3(0.1, 0.05, 0.03), max(m1, max(m2, m3)) * 0.9); }
    if (uScar.x > 0.5) { float id = uScar.x; vec2 a, b; if (id < 1.5) { a = vec2(0.5, ey + 0.55); b = vec2(0.9, ey - 0.75); } else if (id < 2.5) { a = vec2(0.8, uM1.x + 0.5); b = vec2(1.0, uM1.x - 0.4); } else if (id < 3.5) { a = vec2(0.3, uM1.x + 0.1); b = vec2(0.3, uM1.x - 0.3); } else { a = vec2(0.1, ey + 0.4); b = vec2(0.8, ey + 0.5); }
      vec2 pf = vec2(fc.x * sign(uScar.y + 0.001), fc.y); float d = sdSeg(pf, a, b); float s = smoothstep(0.03, 0.008, d); float cr = smoothstep(0.018, 0.0, abs(fract(dot(pf - a, normalize(b - a)) * 11.0) - 0.5) - 0.12) * smoothstep(0.1, 0.03, d);
      c = mix(c, mix(c * vec3(1.18, 0.82, 0.8), vec3(0.95, 0.75, 0.72) * 0.9, 0.35), max(s, cr * 0.8) * 0.9); }
    if (uTat.z > 0.5) { float id = uTat.z; float m = 0.0; if (id < 1.5) { m = smoothstep(0.05, 0.03, length(vec2(fc.x - 0.9, fc.y - ey + 0.55))) + smoothstep(0.04, 0.02, sdSeg(fc, vec2(0.9, ey - 0.4), vec2(0.9, ey - 0.8))); }
      else if (id < 2.5) { m = smoothstep(0.04, 0.015, sdSeg(vec2(ax, fc.y), vec2(0.5, ey - 0.45), vec2(1.1, ey - 0.45))); m = max(m, smoothstep(0.04, 0.015, sdSeg(vec2(ax, fc.y), vec2(0.5, ey - 0.75), vec2(1.1, ey - 0.75)))); }
      else { m = smoothstep(0.08, 0.04, abs(fc.y - (ey - 0.1))) * step(0.5, ax) * step(ax, 1.05) * step(0.0, fc.x * uTat.w + 0.5); }
      c = mix(c, uTatCol, clamp(m, 0.0, 1.0) * 0.85); }
    if (uStub.x > 0.0) { float jaw = smoothstep(uM1.x + 0.7, uM1.x - 0.1, fc.y) * smoothstep(0.5, 0.7, fc.y) * (1.0 - smoothstep(0.7, 1.05, ax * (1.0 + (fc.y - 0.6) * 0.15)));
      float must = smoothstep(uM1.x + 0.55, uM1.x + 0.3, fc.y) * step(uM1.x + 0.12, fc.y) * smoothstep(0.7, 0.4, ax);
      float zone = max(jaw, must * uStub.y); float dots = step(1.0 - uStub.x, vn(p * 700.0) * 0.7 + 0.3 * vn(p * 300.0)); c = mix(c, mix(c, uHairCol, 0.9), zone * (0.35 + 0.5 * dots) * uStub.x); }
  }
  return c;
}`;
