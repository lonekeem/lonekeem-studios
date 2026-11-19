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
  uStub: { value: new THREE.Vector4(0, 0, 0, 0) }, uTex: { value: null }, uTexB: { value: new THREE.Color('#c0805c') }, uHairCol: { value: new THREE.Color('#150d08') }, uBody: { value: new THREE.Vector4(0, 0, 0, 0) }, uUnder: { value: 0 }, uV1: { value: new THREE.Vector4(.6, 0, 2, 0) },
});
export const FACE_FRAG_DECL = /* glsl */`
uniform vec3 uSkin, uLip, uEyeCol, uBrowCol, uShadowCol, uBlushCol, uLipstick, uHairCol, uTatCol;
uniform vec4 uV1; uniform vec4 uLm, uE1, uE2, uB1, uB2, uM1, uNose, uMk1, uMk2, uScar, uTat, uStub, uBody; uniform float uUnder; uniform sampler2D uTex; uniform vec3 uTexB; varying vec2 vUvT;
float skinAt(vec2 uv){ vec3 t = texture2D(uTex, uv).rgb; float L = dot(t, vec3(0.2126, 0.7152, 0.0722)); float mx = max(t.r, max(t.g, t.b)), mn = min(t.r, min(t.g, t.b)); return smoothstep(0.12, 0.2, L) * smoothstep(0.2, 0.32, (mx - mn) / max(mx, 1e-3)); }
float lumW(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 paintSkin(vec3 p, vec3 n, vec4 R){
  vec3 c = uSkin; float reg = R.x; float skinM = 1.0, lipM = 0.0, texL = 0.05, texK = 1.0; vec3 skinChroma = vec3(1.0); float skinDark = 0.0;
  if (reg < 0.5) {
    vec3 t = texture2D(uTex, vUvT).rgb; float L = lumW(t); float mx = max(t.r, max(t.g, t.b)), mn = min(t.r, min(t.g, t.b)); float S = (mx - mn) / max(mx, 1e-3);
    skinM = smoothstep(0.12, 0.2, L) * smoothstep(0.2, 0.32, S); texL = L;
    float LB = lumW(uTexB); vec3 tn = t / max(L, 1e-3); vec3 Bn = uTexB / LB; float dark = 1.0 - smoothstep(0.03, 0.3, lumW(uSkin));
    float k = L / LB; k = 1.0 + (k - 1.0) * mix(0.9, 1.8, dark); k = mix(k, pow(max(k, 0.01), 0.8), dark); texK = clamp(k, 0.2, 1.5);
    vec3 chroma = mix(vec3(1.0), tn / Bn, 0.45); skinChroma = vec3(1.0); skinDark = dark;
    vec3 sk = uSkin * texK * chroma; sk = mix(sk, sk * vec3(1.22, 1.0, 0.86), dark * 0.7); sk += vec3(0.02, 0.008, 0.003) * dark;
    float cd = length(tn - Bn); vec2 fq = vec2((vRest.x - uLm.x) / uLm.z, (vRest.y - uLm.y) / uLm.z); float mz = smoothstep(0.5, 0.4, abs(fq.x)) * smoothstep(0.17, 0.1, abs(fq.y - uM1.x)) * step(0.0, vRest.z); lipM = skinM * smoothstep(0.12, 0.2, cd) * mz;
    c = mix(t, sk, skinM);
    // iris colour
    vec2 px = vec2(6.0 / 2048.0, 0.0); float edgeM = max(max(skinAt(vUvT + px.xy), skinAt(vUvT - px.xy)), max(skinAt(vUvT + px.yx), skinAt(vUvT - px.yx))); vec2 fb0 = vec2((vRest.x - uLm.x) / uLm.z, (vRest.y - uLm.y) / uLm.z); float irisM = (1.0 - edgeM) * step(fb0.y, uE1.y + 0.16) * (1.0 - skinM) * smoothstep(0.4, 0.55, S) * smoothstep(0.014, 0.022, L) * smoothstep(0.08, 0.05, L);
    c = mix(c, uEyeCol * clamp(L / 0.03, 0.6, 1.8), irisM * 0.95);
    { vec2 fb = vec2((vRest.x - uLm.x) / uLm.z, (vRest.y - uLm.y) / uLm.z); float browM = (1.0 - skinM) * smoothstep(0.06, 0.025, L) * smoothstep(uE1.y + 0.2, uE1.y + 0.33, fb.y) * smoothstep(2.6, 2.3, fb.y) * step(0.0, vRest.z); c = mix(c, uBrowCol * clamp(L / 0.03, 0.5, 1.6), browM * 0.95); }
  }
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
    // ---- face v3: the baked eyes / brows / lips are erased to plain skin and repainted analytically (clean almond eyes, lashes, liner, shaped brows, smile with teeth)
    vec3 skE = uSkin * mix(vec3(1.0), skinChroma, 0.6) * 0.99; skE = mix(skE, skE * vec3(1.18, 1.0, 0.86), skinDark * 0.7) + vec3(0.02, 0.008, 0.003) * skinDark;
    { float eE = smoothstep(1.0, 0.8, length(vec2((ax - uE1.x) / (uE1.z * 1.9), (fc.y - ey - 0.02) / (uE1.w * 3.0 + 0.14))));
      float bE = smoothstep(1.0, 0.85, length(vec2((ax - (uB1.x + uB1.z * 0.5)) / (uB1.z * 0.62 + 0.3), (fc.y - ey - uB1.y - 0.1) / (uB1.w * 2.0 + 0.3)))) * step(0.04, ax);
      float mE = smoothstep(1.0, 0.8, length(vec2(fc.x / (uM1.y * 1.55 + 0.1), (fc.y - uM1.x) / 0.26)));
      c = mix(c, skE, max(eE, max(bE, mE))); }
    if (uMk2.z > 0.01) { float fl = abs(fract((fc.y - ey - 0.8) * 3.2) - 0.5); c *= 1.0 - uMk2.z * 0.28 * smoothstep(0.1, 0.03, fl) * step(ey + 0.7, fc.y) * step(ax, 0.9) * step(0.5, vn(vec3(fc.x * 3.0, fc.y * 3.0, 1.0)));
      float nl = sdSeg(vec2(ax, fc.y), vec2(0.35, uNose.x - 0.05), vec2(0.7, uM1.x + 0.1)); c *= 1.0 - uMk2.z * 0.3 * smoothstep(0.04, 0.01, nl); }
    if (uMk1.z > 0.0) c = mix(c, uBlushCol, uMk1.z * 0.55 * smoothstep(0.38, 0.05, length(vec2(ax - 0.6, fc.y - ey + 0.5))));
    // smile mouth: lips + (optional) open smile with teeth, dimples at the corners
    { float sm = uV1.z; float lx = ax / (uM1.y * (1.0 + 0.1 * sm)); if (lx < 1.25) { float lc2 = lx * lx; float sp = pow(max(1.0 - lc2, 0.0), 0.65);
      float kurve = uM1.w * 0.1 + 0.03 * clamp(sm, 0.0, 1.0) + 0.035 * clamp(sm - 1.0, 0.0, 2.0); float yb = uM1.x + kurve * lc2 * 1.0; float ly = fc.y - yb;
      float open = (sm > 1.5 ? 0.05 + 0.04 * (sm - 1.5) : 0.0) * (0.65 + 0.35 * uM1.z); float ft = 0.034 + 0.05 * uM1.z; float lt = ft * 1.25;
      float cup = 1.0 - 0.28 * exp(-pow(lx / 0.14, 2.0)); float topE = ft * sp * cup; float botE = -(open * sp + lt * sp);
      float inMouth = smoothstep(0.004, -0.004, ly) * smoothstep(-open * sp - 0.004, -open * sp + 0.004, ly) * step(0.0001, open) * step(lx, 1.0);
      float upl = smoothstep(-0.004, 0.004, ly) * smoothstep(topE + 0.004, topE - 0.004, ly) * step(lx, 1.0);
      float lol = smoothstep(0.004, -0.004, ly + open * sp) * smoothstep(botE - 0.004, botE + 0.004, ly) * step(lx, 1.0);
      vec3 lipc = mix(uLip, uLipstick, clamp(uMk1.w, 0.0, 1.0)); float lipSh = 1.0 + 0.18 * smoothstep(0.02, 0.0, abs(ly + open * sp + lt * sp * 0.5)) * lol - 0.12 * smoothstep(topE * 0.4, topE, ly) * upl;
      c = mix(c, lipc * lipSh, max(upl, lol) * 0.97);
      if (inMouth > 0.0) { vec3 mc = vec3(0.16, 0.03, 0.04); float oy = -ly / max(open * sp, 1e-3); float toothTop = smoothstep(0.0, 0.05, oy) ; float toothEnd = 0.68;
        float teeth = smoothstep(toothEnd + 0.04, toothEnd - 0.04, oy) * step(lx, 0.88) * toothTop; vec3 tc = vec3(0.96, 0.95, 0.92) * (1.0 - 0.14 * smoothstep(0.35, toothEnd, oy)) * (1.0 - 0.18 * smoothstep(0.6, 1.0, lx));
        tc *= 1.0 - 0.45 * smoothstep(0.014, 0.0, abs(fract(fc.x / 0.052 + 0.5) - 0.5) * 0.052) * step(lx, 0.8);
        vec3 tg = vec3(0.78, 0.24, 0.28) * (0.8 + 0.3 * smoothstep(0.4, 1.0, oy)); mc = mix(mc, tg, smoothstep(0.62, 0.9, oy) * 0.8 * step(lx, 0.7)); mc = mix(mc, tc, teeth); c = mix(c, mc, inMouth); }
      float corner = smoothstep(0.06, 0.0, length(vec2(ax - uM1.y * 1.1, fc.y - yb - 0.012))) * clamp(sm, 0.0, 1.5); c *= 1.0 - 0.22 * corner;
      float dimp = smoothstep(0.012, 0.0, abs(length(vec2(ax - uM1.y * 1.08 - 0.02, fc.y - yb - 0.03)) - 0.07)) * step(ax, uM1.y * 1.08 + 0.02) * step(yb, fc.y + 0.1) * clamp(sm, 0.0, 1.0); c *= 1.0 - 0.16 * dimp;
      c = mix(c, c * 0.5, smoothstep(0.008, 0.0, abs(ly)) * (1.0 - step(0.0001, open)) * smoothstep(1.02, 0.85, lx)); } }
    // eye shadow only (the eyes, brows and lips come from the baked texture)
    { vec2 q = vec2(ax - uE1.x, fc.y - ey); if (uMk1.x > 0.0) { float band = smoothstep(0.34, 0.08, length(vec2(q.x * 0.8, (q.y - 0.1) * 1.6))); c = mix(c, uShadowCol * texK, uMk1.x * 0.6 * band * skinM); } }
    // ---- eyes (almond, big and expressive: liner with a wing, lashes, crease, iris with limbal ring and two highlights)
    { vec2 q = vec2(ax - uE1.x, fc.y - ey); float tilt = uE2.x; q.y -= tilt * q.x * 0.55; float w = uE1.z, h = uE1.w; float tt = q.x / w; float sh = max(1.0 - tt * tt, 0.0);
      float rnd = mix(0.8, 0.5, clamp(uE2.w * 0.7, 0.0, 1.0)); float drp = clamp(uE2.z, 0.0, 1.0); float smq = clamp(uV1.z, 0.0, 3.0);
      float up = h * pow(sh, rnd) * (1.0 - 0.16 * tt) * (1.0 - 0.28 * drp * smoothstep(-0.3, 1.0, tt)); float lo = h * (0.66 - 0.07 * smq) * pow(sh, 0.8) * (1.0 + 0.12 * tt); float aa = 0.007;
      c *= 1.0 - 0.10 * smoothstep(0.42, 0.0, length(vec2(q.x * 0.7, (q.y - 0.06) * 1.0)));
      float crease = smoothstep(0.011, 0.0, abs(q.y - up - h * (0.5 + 0.2 * drp)) - 0.003) * step(abs(tt + 0.1), 0.85) * smoothstep(-0.7, -0.2, tt); c = mix(c, c * vec3(0.68, 0.52, 0.5), crease * 0.65);
      float inEye = smoothstep(aa, -aa, q.y - up) * smoothstep(-aa, aa, q.y + lo) * step(abs(tt), 1.0);
      if (inEye > 0.0) { vec3 ec = vec3(0.97, 0.96, 0.95); ec = mix(ec, vec3(0.9, 0.62, 0.62), smoothstep(0.78, 1.0, -tt) * 0.7); ec = mix(ec, ec * vec3(0.88, 0.8, 0.8), smoothstep(0.6, 1.0, tt) * 0.5);
        float ir = min(h * 0.97, w * 0.62) * (0.88 + 0.2 * uE2.y); vec2 qi = vec2(q.x - w * (0.0 - 0.0), q.y - h * 0.02); float r = length(qi) / ir; float ang = atan(qi.y, qi.x);
        float iris = smoothstep(1.0, 0.94, r); vec3 ic = uEyeCol * mix(1.55, 0.8, smoothstep(0.15, 0.95, r)); ic *= 0.88 + 0.28 * vn(vec3(ang * 4.0, r * 5.0, 2.0)); ic *= 1.0 - 0.45 * smoothstep(0.1, 0.9, qi.y / ir * 0.8 + 0.4) * 0.6; ic = mix(ic, uEyeCol * 0.28, smoothstep(0.8, 1.0, r)); ic = mix(ic, ic * 1.5 + 0.06, smoothstep(0.3, 0.0, length(qi / ir - vec2(0.0, -0.55))) * 0.3);
        ec = mix(ec, ic, iris); ec = mix(ec, vec3(0.012), smoothstep(0.43, 0.38, r) * iris);
        ec = mix(ec, vec3(1.0), smoothstep(0.17, 0.12, length((qi - vec2(ir * 0.30, ir * 0.38)) / ir * vec2(1.0, 1.1)))); ec = mix(ec, vec3(1.0), 0.8 * smoothstep(0.09, 0.05, length((qi - vec2(-ir * 0.34, -ir * 0.42)) / ir)));
        ec *= mix(1.0, 0.55, smoothstep(0.3 * up, up, q.y) * 0.9); c = mix(c, ec, inEye); }
      float lw = (0.016 + 0.022 * uMk1.y) * (0.55 + 0.45 * smoothstep(-1.0, -0.2, tt)) * (1.0 + 0.5 * smoothstep(0.2, 1.0, tt)); float lidd = q.y - up - lw * 0.3; float lid = smoothstep(lw, lw * 0.3, abs(lidd)) * step(abs(tt - 0.02), 1.0 + 0.03);
      float wingL = 0.0; { float wl = (0.1 + 0.34 * uMk1.y) * w * 2.0 * step(0.001, uMk1.y + 0.02) ; vec2 oc = vec2(w * 1.0, tilt * 0.0 + h * pow(max(1.0 - 1.0, 0.0), rnd) + lw * 0.3); vec2 tip = oc + vec2(wl * 0.8, wl * (0.45 + 0.4 * max(tilt, 0.0) + 0.2)); float dw = sdSeg(vec2(q.x, q.y), oc, tip); float wt = lw * (1.0 - 0.0) * (1.0 - clamp(length(vec2(q.x, q.y) - oc) / max(wl, 1e-3), 0.0, 1.0) * 0.85); wingL = smoothstep(wt, wt * 0.3, dw) * step(0.0, q.x - w * 0.9); }
      c = mix(c, vec3(0.045, 0.028, 0.03), max(lid, wingL) * 0.97);
      float lowl = smoothstep(0.009, 0.0, abs(q.y + lo) - 0.002) * step(abs(tt), 0.95); c = mix(c, c * vec3(0.55, 0.42, 0.42), lowl * (0.35 + 0.45 * uMk1.y) * (0.5 + 0.5 * smoothstep(-0.3, 0.9, tt)));
      { float L = uV1.x * (0.055 + 0.05 * uMk1.y) + 0.0; float nL = 11.0; float u = (tt + 0.45) / 1.55 * nL; float id = floor(u); float f = fract(u) - 0.5; float vv = q.y - up; float lenL = L * (0.45 + 0.75 * smoothstep(-0.2, 1.0, (id / nL) * 1.55 - 0.45)) ; float xs = f - vv / max(L, 1e-3) * (0.55 + 0.35 * smoothstep(0.0, 1.0, tt)) * 0.7;
        float lash = smoothstep(0.2 * (1.0 - vv / max(lenL, 1e-3)) + 0.05, 0.04, abs(xs)) * step(0.0, vv + 0.004) * step(vv, lenL) * step(-0.45, tt) * step(tt, 1.1) * step(0.01, uV1.x); c = mix(c, vec3(0.04, 0.025, 0.027), lash * 0.95); }
    }
    // ---- brows (tapered, arched, with hair strokes)
    { float bt = (ax - uB1.x) / uB1.z; if (bt > -0.02 && bt < 1.02) { float btc = clamp(bt, 0.0, 1.0); float cyy = ey + uB1.y + uB2.x * 0.16 * sin(btc * 3.14159) * (1.0 - 0.25 * btc) + uB2.y * 0.3 * btc - 0.05 * btc * btc + 0.012;
      float th = uB1.w * 0.62 * (1.0 - uB2.z * 0.7 * btc * btc) * (0.78 + 0.22 * sin(min(btc * 3.0 + 0.5, 3.14159))) * (smoothstep(-0.02, 0.1, bt)); float d = fc.y - cyy; float ad = abs(d + th * 0.1);
      float st = 0.78 + 0.22 * vn(vec3(fc.x * 90.0 + fc.y * 40.0, fc.y * 18.0, 3.0)); float ba = smoothstep(th, th * 0.35, ad) * st * (1.0 - smoothstep(0.88, 1.02, bt)) * uB2.w;
      c = mix(c, uBrowCol * (0.8 + 0.4 * st), clamp(ba, 0.0, 1.0)); } }
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
