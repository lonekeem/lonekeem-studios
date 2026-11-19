// Garment detail layer: seams, topstitching, pockets, collars, cuffs, plackets, zips, fabric weave + bump. Pure analytic GLSL (original, tintable), driven
// by per-item specs (DET) and per-body measurements (uB1/uB2). Colour is modified in garment(); height goes into gH and is turned into a normal in bumpN().
// fabric: 0 jersey knit, 1 fleece, 2 denim, 3 twill, 4 woven, 5 leather, 6 quilted, 7 nylon, 8 wool/melton, 9 rib knit
// collar: 0 none, 1 crew rib, 2 v rib, 3 shirt collar/stand+placket, 4 hood rim, 5 stand collar, 6 turtle, 7 lapel, 8 rib collar w/ stripes
// cuff: 0 hemmed, 1 rib, 2 button cuff        pocket: tops 1 chest, 2 kangaroo, 3 side welts, 4 jean 5-pocket, 5 cargo, 6 slant+elastic, 7 chino
// zip: 0 none, 1 zipper, 2 short placket (henley), 3 button front, 4 snap front        thread: 0 tone, 1 gold, 2 white, 3 dark
export const DET = {
  top: { _: [0, 1, 0, 0, 0, 0, 0, 1], vneck: [0, 2, 0, 0, 0, 0, 0, 1], turtle: [9, 6, 1, 0, 0, 0, 0, 1], henley: [0, 1, 0, 0, 2, 0, 0, 1], sweat: [1, 1, 1, 2, 0, 0, 0, 1], oversize: [0, 1, 0, 1, 0, 0, 0, 1], jersey: [7, 2, 0, 0, 0, 2, 0, 1],
    tunic: [4, 3, 2, 0, 2, 0, 0, 1], flowy: [4, 3, 2, 0, 2, 0, 0, 1], raglan: [0, 1, 0, 0, 0, 2, 0, 1], longtee: [0, 1, 1, 0, 0, 0, 0, 1], tank: [0, 1, 0, 0, 0, 0, 0, 1], scoop: [0, 1, 0, 0, 0, 0, 0, 1], sleevedress: [4, 1, 2, 0, 0, 0, 0, 1], tube: [0, 0, 0, 0, 0, 0, 0, 1] },
  jacket: { _: [3, 5, 0, 3, 1, 0, 0, 1], bomber: [7, 8, 1, 3, 1, 0, 0, 1], denim: [2, 3, 2, 1, 3, 1, 0, 1], biker: [5, 5, 0, 3, 1, 3, 0, 1], blazer: [4, 7, 2, 3, 3, 0, 0, 1], puffer: [6, 5, 1, 3, 1, 0, 0, 1], trench: [3, 7, 2, 3, 3, 0, 0, 1], cardigan: [8, 2, 1, 1, 3, 0, 0, 1], vest: [6, 5, 0, 3, 1, 0, 0, 1],
    parka: [7, 4, 1, 3, 1, 0, 0, 1], windbreaker: [7, 5, 1, 3, 1, 2, 0, 1], zip: [1, 4, 1, 3, 1, 0, 0, 1], varsity: [8, 8, 1, 3, 4, 2, 1, 1], cropjacket: [4, 5, 0, 3, 1, 0, 0, 1], longcoat: [4, 7, 2, 3, 3, 0, 0, 1], shacket: [4, 3, 2, 1, 3, 0, 0, 1], poncho: [8, 1, 0, 0, 0, 0, 0, 1] },
  pants: { _: [3, 0, 0, 7, 0, 0, 0, 1], jeans: [2, 0, 0, 4, 0, 1, 0, 1], skinny: [2, 0, 0, 4, 0, 1, 0, 1], highjeans: [2, 0, 0, 4, 0, 1, 0, 1], minishorts: [2, 0, 0, 4, 0, 1, 0, 1], bootcut: [2, 0, 0, 4, 0, 1, 0, 1], cargo: [3, 0, 0, 5, 0, 0, 0, 1], joggers: [1, 0, 1, 6, 0, 0, 0, 1], trackpants: [7, 0, 1, 6, 0, 2, 0, 1],
    leggings: [0, 0, 0, 0, 0, 0, 0, 1], kneeshorts: [0, 0, 0, 0, 0, 0, 0, 1], wide: [4, 0, 0, 7, 0, 0, 0, 1], dresspants: [4, 0, 0, 7, 0, 0, 0, 1], overalls: [2, 0, 0, 4, 0, 1, 0, 1], miniskirt: [4, 0, 0, 0, 0, 0, 0, 0], midiskirt: [4, 0, 0, 0, 0, 0, 0, 0], longskirt: [4, 0, 0, 0, 0, 0, 0, 0] },
};
export function detailFor(kind, id) { const t = kind === 0 ? DET.top : kind === 3 ? DET.jacket : DET.pants; return t[id] || t._; }

export const DETAIL_GLSL = /* glsl */`
uniform vec4 uB1, uB2, uB3, uD1, uD2;
float gH = 0.0, gAA = 0.01;
float ln(float d, float w){ float W = max(w, gAA * 0.7); return (1.0 - smoothstep(W * 0.45, W, abs(d))) * min(1.0, w / W + 0.15); }
float dsh(float a, float per){ float f = fract(a / per); return smoothstep(0.18, 0.3, f) * (1.0 - smoothstep(0.62, 0.74, f)); }
float sdB(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float sgm(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)); }
float fadeF(float freq){ return 1.0 - smoothstep(0.35, 0.8, gAA * freq); }
vec3 bumpN(vec3 N, vec3 pos, float h){
  vec3 sx = dFdx(pos), sy = dFdy(pos); vec3 R1 = cross(sy, N), R2 = cross(N, sx); float det = dot(sx, R1);
  vec3 grad = sign(det) * (dFdx(h) * R1 + dFdy(h) * R2); return normalize(abs(det) * N - grad * 1.0);
}
// fabric weave / knit: colour factor + height
vec3 fabricTex(vec3 c, vec3 p, float fab, float s){
  float h = 0.0;
  if (fab < 0.5) { float f = fadeF(1100.0); float k = sin(p.x * 2900.0 + sin(p.y * 1500.0) * 1.1) * 0.5 + 0.5; float r = sin(p.y * 1500.0) * 0.5 + 0.5; h = (k * 0.6 + r * 0.4) * 0.00032 * f; c *= 1.0 - 0.07 * f * (1.0 - k); }
  else if (fab < 1.5) { float f = fadeF(380.0); float v = vn(p * 420.0); h = v * 0.00055 * f; c *= 1.0 + 0.07 * f * v; }
  else if (fab < 2.5) { float f = fadeF(1300.0); float tw = sin((p.x + p.y * 0.8) * 3200.0) * 0.5 + 0.5; h = tw * 0.0004 * f; float weft = sin(p.y * 2400.0) * 0.5 + 0.5; c *= 1.0 - 0.1 * f * tw; c = mix(c, c * vec3(1.18, 1.14, 1.0) + 0.02, weft * 0.18 * f); float fl = vn(p * vec3(26.0, 14.0, 26.0)); c *= 0.94 + 0.12 * fl; }
  else if (fab < 3.5) { float f = fadeF(1500.0); float tw = sin((p.x + p.y) * 3600.0) * 0.5 + 0.5; h = tw * 0.00028 * f; c *= 1.0 - 0.06 * f * tw; }
  else if (fab < 4.5) { float f = fadeF(1300.0); float a = sin(p.x * 3000.0) * 0.5 + 0.5, b = sin(p.y * 3000.0) * 0.5 + 0.5; h = a * b * 0.00032 * f; c *= 1.0 - 0.06 * f * (1.0 - a * b); }
  else if (fab < 5.5) { float f = fadeF(260.0); float v = vn(p * 280.0); float w = abs(vn(p * 90.0)); h = (v * 0.00055 + w * 0.0004) * f; c *= 0.96 + 0.1 * v; c = mix(c, c * 1.35, smoothstep(0.55, 0.9, vn(p * 40.0)) * 0.35); }
  else if (fab < 6.5) { float ch = 0.075; float q = fract(p.y / ch); float pf = sin(q * 3.14159); h = pow(pf, 0.55) * 0.0042; c *= 0.8 + 0.28 * pow(pf, 0.6); float lat = vn(vec3(p.x * 90.0, p.y * 9.0, p.z * 90.0)); h += lat * 0.0004; }
  else if (fab < 7.5) { float f = fadeF(260.0); float g = 0.0; h = 0.0; float ripple = vn(p * vec3(30.0, 22.0, 30.0)); h += ripple * 0.0004; c *= 0.95 + 0.1 * ripple; }
  else if (fab < 8.5) { float f = fadeF(420.0); float v = vn(p * 480.0); float w = vn(p * vec3(1.0, 6.0, 1.0) * 140.0); h = (v * 0.5 + w * 0.5) * 0.0005 * f; c *= 0.9 + 0.16 * (v * 0.5 + 0.5) * f + 0.06 * (1.0 - f); }
  else { float f = fadeF(1000.0); float rb = sin(p.x * 1450.0) * 0.5 + 0.5; h = rb * 0.0006 * f; c *= 1.0 - 0.1 * f * (1.0 - rb); }
  gH += h; return c;
}
vec3 threadCol(vec3 c){ float m = uD2.y; if (m < 0.5) return c * 1.22 + 0.04; if (m < 1.5) return vec3(0.82, 0.6, 0.26); if (m < 2.5) return vec3(0.92, 0.92, 0.9); return c * 0.55; }
// add a sewn line: groove + two rows of dashed stitching along an iso-distance d
void sewLine(inout vec3 c, float d, float along, float off, float tw, vec3 th){ float l = ln(d - off, tw) * dsh(along, 0.0058); c = mix(c, th, l * 0.95); gH += l * 0.00022; }
void groove(inout vec3 c, float d, float w){ float g = ln(d, w); c *= 1.0 - 0.2 * g; gH -= g * 0.0005; }
void seamTop(inout vec3 c, float d, float along, vec3 th, bool two){ groove(c, d, 0.0014); sewLine(c, d, along, 0.0048, 0.0006, th); sewLine(c, d, along, -0.0048, 0.0006, th); }
void ribBand(inout vec3 c, float across, float arc, float w, float amt){ float band = 1.0 - smoothstep(w - 0.0016, w, across); float rb = sin(arc * 6.2832 / 0.0044) * 0.5 + 0.5; c *= mix(1.0, 0.8 + 0.28 * rb, band * amt); gH += band * (0.0007 + 0.0007 * rb); }
void button(inout vec3 c, vec2 q, float r, vec3 col, vec3 th){ float d = length(q); float disc = 1.0 - smoothstep(r - 0.0008, r, d); float ring = ln(d - r * 0.62, 0.0007); c = mix(c, col, disc); c *= 1.0 - 0.28 * ring * disc; float hole = step(abs(q.x), 0.0012) * 0.0 + (1.0 - smoothstep(0.0, 0.0012, length(q - vec2(0.0023, 0.0023)))) + (1.0 - smoothstep(0.0, 0.0012, length(q + vec2(0.0023, 0.0023)))) + (1.0 - smoothstep(0.0, 0.0012, length(q + vec2(-0.0023, 0.0023)))) + (1.0 - smoothstep(0.0, 0.0012, length(q + vec2(0.0023, -0.0023)))); c *= 1.0 - 0.5 * hole * disc; gH += disc * 0.0012 - ring * disc * 0.0005; }

vec3 detail(vec3 c, vec3 p, vec3 n, float reg, float s, float t, float edge, float ndistIn, float front, float nkRow){
  float ndist = ndistIn;
  gAA = length(fwidth(p)); gH = 0.0;
  float W = uB1.x, zc = uB1.y, TH = uB1.z, hy = uB1.w, AL = uB2.x, LL = uB2.y, lx0 = uB2.z, lz0 = uB2.w;
  float fab = uD1.x, col = uD1.y, cuf = uD1.z, pk = uD1.w, zip = uD2.x; float kind = uKind;
  vec3 th = threadCol(c); vec3 metal = vec3(0.62, 0.62, 0.6); vec3 btn = c * 0.55 + 0.05;
  c = fabricTex(c, p, fab, s);
  { float sl = min(fwidth(nkRow) / max(gAA, 1e-5) * TH, 8.0); ndist /= sqrt(1.0 + sl * sl); }
  float ey = edge * TH;                                    // metres above the hem (torso) / above the cuff end etc.
  bool torso = reg < 2.5, arm = reg > 2.5 && reg < 3.5, leg = reg > 4.5 && reg < 5.5;
  if (kind < 0.5 || (kind > 2.5 && kind < 3.5)) {
    bool jack = kind > 2.5;
    float a = atan(abs(p.x), p.z - zc);                     // 0 front, 1.57 side, 3.14 back
    if (torso) {
      float arc = a * W;
      // hem
      if (cuf > 0.5 && cuf < 1.5 && (jack || fab > 8.5 || fab > 0.5 && fab < 1.5)) { ribBand(c, ey, arc, jack ? 0.062 : 0.052, 1.0); groove(c, ey - (jack ? 0.062 : 0.052), 0.0012); if (uD2.z > 0.5) { float st1 = step(0.012, ey) * step(ey, 0.0165) + step(0.024, ey) * step(ey, 0.0285); c = mix(c, uC2, st1); } sewLine(c, ey - (jack ? 0.062 : 0.052), arc, 0.0046, 0.0006, th); }
      else { float fold = smoothstep(0.0, 0.003, ey) * (1.0 - smoothstep(0.024, 0.028, ey)); gH += fold * 0.0005; sewLine(c, ey, arc, 0.012, 0.0006, th); sewLine(c, ey, arc, 0.024, 0.0006, th); c *= 1.0 - 0.18 * ln(ey - 0.0018, 0.0014); }
      // side seams + centre back
      float sd = abs(a - 1.5708) * W; float lowT = 1.0 - smoothstep(0.78, 0.84, t); if (lowT > 0.0 && (ey > 0.06 || cuf < 0.5)) seamTop(c, sd, p.y, th, true);
      if (fab > 1.5 && fab < 8.5 && t < 0.8) { float cb = (3.14159 - a) * W; groove(c, cb, 0.0012); sewLine(c, cb, p.y, 0.0045, 0.0006, th); sewLine(c, cb, p.y, -0.0045, 0.0006, th); }
      // armhole seam (reg boundary)
      // pockets
      float yy = p.y - (hy + TH * 0.0);
      if (front > 0.5) {
        if (pk > 0.5 && pk < 1.5) { for (int i = 0; i < 2; i++) { float sg = i == 0 ? 1.0 : -1.0; if (jack && i == 1 && col < 2.5) continue; vec2 q = vec2(p.x - sg * W * 0.52, p.y - (hy + TH * (jack ? 0.64 : 0.7))); float d = sdB(q, vec2(0.031, 0.034)); float inside = 1.0 - smoothstep(-0.0005, 0.0005, d); c *= 1.0 - 0.08 * inside; groove(c, d - 0.0, 0.0011); sewLine(c, d, q.x + q.y, -0.0045, 0.0006, th); float fl = step(0.0, q.y - 0.016) * inside; c *= 1.0 - 0.06 * fl; gH += inside * 0.0004; if (jack) { button(c, vec2(q.x, q.y - 0.0255), 0.0038, btn, th); } } }
        if (pk > 1.5 && pk < 2.5) { vec2 q = vec2(p.x, p.y - (hy + TH * 0.27)); float taper = 1.0 - 0.0 * q.y; float d = sdB(q, vec2(W * 0.56 - q.y * 0.5, 0.062)); float inside = 1.0 - smoothstep(-0.0005, 0.0005, d); groove(c, d + 0.0, 0.0012); sewLine(c, d, q.x + q.y, -0.0055, 0.0006, th); c *= 1.0 - 0.05 * inside; gH += inside * 0.0003; float mid = ln(abs(q.x) - W * 0.5 + q.y * 0.5, 0.0011) * inside * step(0.0, 0.052 - abs(q.y)); c *= 1.0 - 0.3 * ln(abs(q.x) - W * 0.5 + q.y * 0.5, 0.0013) * inside * step(0.03, q.y + 0.05); }
        if (pk > 2.5 && pk < 3.5) { for (int i = 0; i < 2; i++) { float sg = i == 0 ? 1.0 : -1.0; vec2 q = vec2(p.x - sg * W * 0.50, p.y - (hy + TH * 0.2)); q = mat2(0.94, -0.34 * sg, 0.34 * sg, 0.94) * q; float d = sdB(q, vec2(0.003, 0.034)); float slot = 1.0 - smoothstep(0.0, 0.0012, d); c *= 1.0 - 0.55 * slot; gH -= slot * 0.0006; float o = sdB(q, vec2(0.008, 0.038)); sewLine(c, o, q.y, 0.0, 0.0006, th); } }
      }
      // centre front: placket / zip / buttons (front only; jackets are open so this runs on the opening edge)
      if (front > 0.5) {
        float cx = abs(p.x) - (jack ? uG2.y : 0.0);        // distance outward from the opening edge (jackets) / centre line (tops)
        float yTop = hy + TH * (1.0 - 0.0);
        if (jack) {
          if (t > uG2.z - 0.02) {
            float band = 1.0 - smoothstep(0.014, 0.016, cx);
            if (zip == 1.0) { float tape = 1.0 - smoothstep(0.0075, 0.0085, cx); c = mix(c, c * 0.55, tape * 0.85); float teeth = step(0.5, fract(p.y / 0.0046)) * (1.0 - smoothstep(0.0022, 0.0028, cx)); c = mix(c, metal * (0.85 + 0.25 * fract(p.y / 0.0046)), teeth * step(0.0, cx)); gH += tape * 0.0006 + teeth * 0.0004; sewLine(c, cx, p.y, 0.0105, 0.0006, th); }
            else { c *= 1.0 - 0.06 * band; gH += band * 0.0005; sewLine(c, cx, p.y, 0.014, 0.0006, th); sewLine(c, cx, p.y, 0.0215, 0.0006, th);
              float y0 = hy + TH * 0.07; float rng = step(y0, p.y) * step(p.y, hy + TH * 0.88); vec2 q = vec2(cx - 0.009, mod(p.y - y0, 0.072) - 0.036);
              if (p.x > 0.0) { if (zip == 4.0) { float d = 1.0 - smoothstep(0.0036, 0.0042, length(q)); c = mix(c, metal, d * rng); gH += d * rng * 0.0014; } else button(c, q * (rng > 0.5 ? 1.0 : 50.0), 0.0046, btn, th); }
              else { float hole = ln(q.y, 0.0014) * step(abs(q.x), 0.006) * rng; c *= 1.0 - 0.4 * hole; gH -= hole * 0.0005; } }
          }
        } else if (zip == 2.0 || zip == 3.0) {
          float w = 0.0185; float plk = 1.0 - smoothstep(w - 0.001, w, abs(p.x)); float lenOk = step(ndist, 0.13) * step(0.0, ndist) ; c *= 1.0 - 0.04 * plk * lenOk; gH += plk * lenOk * 0.0005; sewLine(c, abs(p.x) - w, p.y, 0.0, 0.0006, th);
          vec2 qb = vec2(p.x, mod(ndist - 0.03, 0.05) - 0.025); float on = step(0.0, ndist - 0.005) * step(ndist, 0.13); button(c, qb * (on > 0.5 ? 1.0 : 50.0), 0.0044, btn, th);
        }
      }
      if (col > 6.5 && col < 7.5 && jack && t > uG2.z - 0.04) { float dxx = abs(p.x) - uG2.y; float lap = 1.0 - smoothstep(0.044, 0.048, dxx); c *= 1.0 - 0.04 * lap; gH += lap * 0.0006; groove(c, dxx - 0.047, 0.0013); sewLine(c, dxx, p.y, 0.0075, 0.0006, th); }
    }
    if (reg < 4.5 && !(reg > 2.5 && t < 0.6)) {
      // collars / neckline band (ndist: metres inside the neckline edge)
      if (col > 0.5 && col < 2.5 && ndist < 0.052) { float arcN = p.x; float w = col > 1.5 ? 0.026 : 0.03; ribBand(c, ndist, arcN, w, 1.0); groove(c, ndist - w, 0.0011); sewLine(c, ndist - w, arcN, 0.0045, 0.0006, th); }
      if ((col > 2.5 && col < 3.5) || col > 4.5 && col < 5.5 || col > 3.5 && col < 4.5) { if (ndist < 0.05) { float w = 0.034; c *= 1.0 - 0.07 * (1.0 - smoothstep(w - 0.002, w, ndist)); gH += (1.0 - smoothstep(w - 0.002, w, ndist)) * 0.0007; groove(c, ndist - w, 0.0012); sewLine(c, ndist, p.x, 0.0055, 0.0006, th); sewLine(c, ndist - w, p.x, -0.0055, 0.0006, th); } }
      if (col > 7.5 && ndist < 0.07) { ribBand(c, ndist, p.x, 0.034, 1.0); c = mix(c, uC2, 0.0); float st1 = step(0.010, ndist) * step(ndist, 0.0145) + step(0.0215, ndist) * step(ndist, 0.026); if (uD2.z > 0.5) c = mix(c, uC2, st1 * (1.0 - smoothstep(0.037, 0.039, ndist))); groove(c, ndist - 0.034, 0.0011); }
    }
    if (arm) {
      float edA = (uG1.x - s) * AL; float cc = atan(n.z, n.y) * 0.045; float ribw = jack ? 0.058 : 0.05;
      if (cuf > 0.5 && cuf < 1.5 && (jack || fab > 8.5 || fab < 1.5 && fab > 0.5)) { if (uD2.z > 0.5) c = mix(c, uC1 * 0.95, 1.0 - smoothstep(ribw - 0.002, ribw, edA)); ribBand(c, edA, cc, ribw, 1.0); groove(c, edA - ribw, 0.0012); sewLine(c, edA - ribw, cc, 0.0046, 0.0006, th); if (uD2.z > 0.5) { float st1 = step(0.012, edA) * step(edA, 0.0165) + step(0.024, edA) * step(edA, 0.0285); c = mix(c, uC2, st1 * (1.0 - step(0.0, 0.0)) * 0.95); } }
      else { float fold = smoothstep(0.0, 0.003, edA) * (1.0 - smoothstep(0.022, 0.026, edA)); gH += fold * 0.0005; sewLine(c, edA, cc, 0.011, 0.0006, th); sewLine(c, edA, cc, 0.022, 0.0006, th); c *= 1.0 - 0.15 * ln(edA - 0.0018, 0.0014); if (cuf > 1.5) { float cd = sdB(vec2(cc + 0.0, edA - 0.04), vec2(0.05, 0.034)); sewLine(c, edA - 0.07, cc, 0.0, 0.0006, th); button(c, vec2(cc, edA - 0.045), 0.0036, btn, th); } }
      if (uG1.x > 0.1) { float cap = (s - 0.045) * AL; groove(c, cap, 0.0013); sewLine(c, cap, cc, 0.0048, 0.0006, th); sewLine(c, cap, cc, -0.0048, 0.0006, th); }
      float us = acos(clamp(-n.y, -1.0, 1.0)) * 0.04; if (edA > 0.05) seamTop(c, us, s * AL, th, true);
      float win = exp(-pow((s - 0.5) / 0.1, 2.0)); float cr = sin(s * AL * 260.0 + vn(p * 10.0) * 8.0 + p.z * 30.0); float brk = vn(p * vec3(6.0, 3.0, 6.0)) * 0.5 + 0.5; c *= 1.0 - win * brk * 0.04 * (cr * 0.5 + 0.5); gH += win * brk * cr * 0.00025;
    }
  } else if (kind < 1.5) {                                     // pants / skirts
    float wy = (uG1.y - t) * TH;                                // metres below the waist edge
    float a = atan(abs(p.x), p.z - zc);
    if (reg > 1.5 && reg < 2.5) {
      float arc = a * W; float isSkirt = 1.0 - uD2.w;
      // waistband + belt loops
      float wb = 0.034; float inb = 1.0 - smoothstep(wb - 0.0015, wb, wy); c *= 1.0 - 0.05 * inb; gH += inb * 0.0006; groove(c, wy - wb, 0.0012); sewLine(c, wy, arc, 0.0065, 0.0006, th); sewLine(c, wy - wb, arc, -0.0055, 0.0006, th);
      if (pk > 0.5 && pk < 6.5 && isSkirt < 0.5) {
        for (int i = 0; i < 3; i++) { float xl = i == 0 ? 0.0 : (i == 1 ? 0.4 : 0.86) * W; if (i == 0 && front > 0.5) continue; vec2 q = vec2(abs(p.x) - xl, wy - 0.022); float d = sdB(q, vec2(0.0045, 0.026)); float lp = 1.0 - smoothstep(0.0, 0.0012, d); c *= 1.0 - 0.1 * lp; gH += lp * 0.0007; sewLine(c, d, q.y + q.x, -0.0014, 0.0004, th); }
      }
      if (front > 0.5 && isSkirt < 0.5 && pk != 6.0 && pk > 0.5) {
        // fly + button
        float fx = abs(p.x - 0.0); float j = 1.0 - smoothstep(0.0, 0.0012, abs(fx - 0.011)) ; float fl = step(wb, wy) * step(wy, 0.105); sewLine(c, p.x - 0.011, wy, 0.0, 0.0006, th) ; c = mix(c, th, ln(p.x - 0.011, 0.0007) * dsh(wy, 0.0058) * fl * 0.9); c *= 1.0 - 0.2 * ln(p.x + 0.0, 0.0011) * fl; button(c, vec2(p.x, wy - 0.0165), 0.0066, pk == 4.0 ? metal : btn, th);
        // front pockets (curved opening from the waistband to the side seam)
        float sg = p.x >= 0.0 ? 1.0 : -1.0; vec2 q = vec2(abs(p.x), wy); vec2 A = vec2(W * 0.5, wb + 0.002), B = vec2(W * 0.93, 0.115); float dpk = sgm(q, A, B) ; groove(c, dpk, 0.0013); sewLine(c, dpk, wy + abs(p.x), 0.005, 0.0006, th); sewLine(c, dpk, wy + abs(p.x), -0.005, 0.0006, th);
      }
      if (front < 0.5 && isSkirt < 0.5 && pk > 0.5 && pk < 6.5 && wy > wb) {
        if (pk == 4.0) { vec2 q = vec2(abs(p.x) - W * 0.5, wy - 0.085); float d = sdB(q, vec2(0.034, 0.038)); float inside = 1.0 - smoothstep(-0.0005, 0.0005, d); c *= 1.0 - 0.06 * inside; groove(c, d, 0.0012); sewLine(c, d, q.x + q.y, -0.0045, 0.0006, th); gH += inside * 0.0004; float arcV = min(sgm(q, vec2(-0.034, 0.012), vec2(0.0, -0.016)), sgm(q, vec2(0.034, 0.012), vec2(0.0, -0.016))); c = mix(c, th, ln(arcV, 0.0007) * inside * 0.9); }
        else { vec2 q = vec2(abs(p.x) - W * 0.5, wy - 0.075); float slot = step(abs(q.x), 0.03) * (1.0 - smoothstep(0.0, 0.0013, abs(q.y))); c *= 1.0 - 0.5 * slot; gH -= slot * 0.0006; sewLine(c, sdB(q, vec2(0.033, 0.0045)), q.x, 0.0, 0.0006, th); button(c, vec2(q.x, q.y - 0.016), 0.0036, btn, th); }
      }
      float sdm = abs(a - 1.5708) * W; if (isSkirt < 0.5) { seamTop(c, sdm, p.y, th, true); } else groove(c, sdm, 0.0012);
      if (pk == 6.0) { float el = 1.0 - smoothstep(wb - 0.0015, wb, wy); float ribs = sin(arc * 6.2832 / 0.005) * 0.5 + 0.5; c *= 1.0 - 0.1 * el * ribs; gH += el * ribs * 0.0004; float dr = ln(abs(p.x) - 0.014, 0.0012) * front * step(0.01, wy) * step(wy, 0.075); c = mix(c, c * 0.5, dr * 0.0); }
    }
    if (leg && uD2.w > 0.5) {
      float sk = clamp(s, 0.0, 1.0); float cxL = sk < 0.5 ? mix(lx0, uB3.x, sk * 2.0) : mix(uB3.x, uB3.z, sk * 2.0 - 1.0); float czL = sk < 0.5 ? mix(lz0, uB3.y, sk * 2.0) : mix(uB3.y, uB3.w, sk * 2.0 - 1.0); float lx = abs(p.x) - cxL, lz = p.z - czL; float ang = atan(lx, lz); float rl = max(lx0 * (0.95 - 0.35 * s), 0.02) + 0.0; float arc = ang * rl; float edL = (uG1.x - s) * LL; float vv = s * LL;
      float out_ = abs(ang - 1.5708) * rl, inn = abs(ang + 1.5708) * rl;
      if (cuf > 0.5 && cuf < 1.5) { ribBand(c, edL, arc, 0.07, 1.0); groove(c, edL - 0.07, 0.0013); sewLine(c, edL - 0.07, arc, 0.0046, 0.0006, th); }
      else { float fold = smoothstep(0.0, 0.003, edL) * (1.0 - smoothstep(0.026, 0.03, edL)); gH += fold * 0.0005; sewLine(c, edL, arc, 0.013, 0.0006, th); if (fab > 1.5 && fab < 2.5) sewLine(c, edL, arc, 0.027, 0.0006, th); c *= 1.0 - 0.18 * ln(edL - 0.0018, 0.0014); }
      if (fab > 1.5 && fab < 2.5) { seamTop(c, out_, vv, th, true); seamTop(c, inn, vv, th, false); } else { groove(c, out_, 0.0012); sewLine(c, out_, vv, 0.0045, 0.0006, th); groove(c, inn, 0.0011); }
      if (pk == 5.0) { // cargo thigh pocket with flap + button
        float u = (ang - 1.5708) * rl; float v = vv - 0.205; vec2 q = vec2(u, v); float d = sdB(q, vec2(0.056, 0.098)); float inside = 1.0 - smoothstep(-0.0005, 0.0005, d); c *= 1.0 - 0.06 * inside; gH += inside * 0.00045; groove(c, d, 0.0013); sewLine(c, d, q.x + q.y, -0.0045, 0.0006, th);
        float pl = ln(abs(u) - 0.048, 0.0011) * inside * 0.6; c *= 1.0 - 0.25 * pl;
        float fy = v + 0.098 - 0.05; float flap = step(abs(u), 0.058) * step(0.0, 0.052 - (v + 0.098)) * inside; float edgeF = sdB(q - vec2(0.0, 0.098 - 0.026), vec2(0.058, 0.03)); c *= 1.0 - 0.1 * (1.0 - smoothstep(-0.0005, 0.0005, edgeF)); groove(c, edgeF, 0.0013); sewLine(c, edgeF, q.x, -0.0045, 0.0006, th); button(c, q - vec2(0.0, 0.098 - 0.052), 0.0048, btn, th);
        // second small front slash pocket line
      }
      if (fab > 1.5 && fab < 2.5) { float wh = smoothstep(0.55, 0.9, vn(vec3(p.x * 60.0, p.y * 18.0, p.z * 60.0))); float zone = smoothstep(0.25, 0.0, abs(s - 0.07)) + smoothstep(0.1, 0.0, abs(s - 0.5)); float fr = smoothstep(2.1, 0.5, abs(ang)); c = mix(c, c * 1.3 + 0.02, wh * zone * fr * 0.5); }
      float win = exp(-pow((s - 0.5) / 0.07, 2.0)) + 0.4 * exp(-pow((s - 0.07) / 0.04, 2.0)); float brk = vn(p * vec3(7.0, 3.0, 7.0)) * 0.5 + 0.5; float cr = sin(vv * 210.0 + vn(p * 9.0) * 9.0 + p.x * 40.0 * sign(lz)); float fo = win * brk; c *= 1.0 - fo * 0.045 * (cr * 0.5 + 0.5); gH += fo * cr * 0.00028;
    }
  }
  return c;
}
`;
