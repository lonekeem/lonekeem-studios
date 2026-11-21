// v2.1 environment visuals (visual-only): grass/weed/fern field, textured trees + bushes, ground splat, road decals,
// house grime/windows, trash + debris, weathered cars, sky dome. No colliders or gameplay logic here.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as TX from './envtex.js';

const V3 = THREE.Vector3;
const X0 = -110, XW = 220, Z0 = -2760, ZH = 2890; // vegetation mask extent (1 texel = 1 m)

export function makeEnv(scene, Q, T, pbr) {
  const R = TX.prng(20260);
  const rr = (a, b) => a + R() * (b - a);
  const low = Q.name === 'low', high = Q.name === 'high';
  const updaters = [];
  const roads = [], cuts = [], batch = new Map();

  // ---------- batching helper for small static details (windows frames, grime planes ...)
  const addBatched = (mat, geo, m4) => { geo = geo.clone(); geo.applyMatrix4(m4); if (!batch.has(mat)) batch.set(mat, []); batch.get(mat).push(geo); };
  const M4 = new THREE.Matrix4(), QQ = new THREE.Quaternion(), EU = new THREE.Euler(), S1 = new THREE.Vector3(1, 1, 1);
  const place = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => M4.compose(new V3(x, y, z), QQ.setFromEuler(EU.set(rx, ry, rz)), new V3(sx, sy, sz)).clone();

  // ---------- window panes / frames
  const paneMats = [0, 1, 2].map(k => new THREE.MeshStandardMaterial({ map: TX.toTex(TX.windowPane(k)), alphaTest: k === 2 ? .5 : 0, roughness: .18, metalness: .35, envMapIntensity: 1.3, side: THREE.DoubleSide }));
  const frameMat = new THREE.MeshStandardMaterial({ color: '#7d7868', roughness: .95 });
  const blackMat = new THREE.MeshBasicMaterial({ color: '#050606' });
  const grimeMats = [TX.grimeDecal(7), TX.grimeDecal(17), TX.grimeDecal(27)].map(t => new THREE.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  const unitBox = new THREE.BoxGeometry(1, 1, 1), unitPlane = new THREE.PlaneGeometry(1, 1);
  const api = {};
  // pane material for a house window (kind weighted: mostly broken)
  api.paneMat = () => { const r = R(); return paneMats[r < .3 ? 0 : r < .65 ? 1 : 2]; };
  api.paneIsHoley = (m) => m === paneMats[2];
  // frame + dark interior behind a window at wall x (fx), centre (y, wz); face = +1/-1 along x
  api.windowDetail = (fx, y, wz, face, holey, w = 1.3, h = 1.1) => {
    const t = .1;
    [[0, h / 2 + t / 2, w + t * 2, t], [0, -h / 2 - t / 2, w + t * 2, t], [-w / 2 - t / 2, 0, t, h], [w / 2 + t / 2, 0, t, h]].forEach(([dz, dy, ww, hh]) => addBatched(frameMat, unitBox, place(fx + face * .03, y + dy, wz + dz, 0, 0, 0, .1, hh, ww)));
    addBatched(frameMat, unitBox, place(fx + face * .1, y - h / 2 - .14, wz, 0, 0, 0, .22, .06, w + .3)); // sill
    if (holey) addBatched(blackMat, unitBox, place(fx - face * .015, y, wz, 0, 0, 0, .04, h, w));
  };
  // grime decal on a wall: (cx,cz) wall centre, axis 'x' = wall normal along x, w wide, h tall
  api.grime = (cx, cz, normalAxis, sign, w, h, y0 = 0, grimy = 1) => {
    const mat = grimeMats[(R() * 3) | 0]; const g = unitPlane;
    if (normalAxis === 'x') addBatched(mat, g, place(cx + sign * .04, y0 + h / 2, cz, 0, sign > 0 ? Math.PI / 2 : -Math.PI / 2, 0, w, h, 1));
    else addBatched(mat, g, place(cx, y0 + h / 2, cz + sign * .04, 0, sign > 0 ? 0 : Math.PI, 0, w, h, 1));
  };

  // ---------- roads: crack/patch overlay + dirty shoulders
  const decals = [TX.roadDecal(6), TX.roadDecal(16)];
  const edgeA = TX.edgeAlpha();
  const shoulderTex = T('brown_mud_leaves_01_diff', 1);
  api.road = (cx, cz, w, d) => {
    roads.push([cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2]);
    const dm = new THREE.MeshStandardMaterial({ map: decals[roads.length & 1], transparent: true, depthWrite: false, roughness: .75, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    dm.map = dm.map.clone(); dm.map.needsUpdate = true; dm.map.repeat.set(w / 9, d / 9); dm.map.offset.set(R(), R());
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), dm); m.rotation.x = -Math.PI / 2; m.position.set(cx, .029, cz); scene.add(m);
    // shoulders: dirt / leaf litter fading out
    if (w < 40) [-1, 1].forEach(sd => { const sm = new THREE.MeshStandardMaterial({ map: shoulderTex.clone(), alphaMap: edgeA.clone(), transparent: true, depthWrite: false, roughness: 1, color: '#9a927e', polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
      sm.map.needsUpdate = true; sm.map.repeat.set(d / 5, 1); sm.alphaMap.repeat.set(1, 1); sm.alphaMap.needsUpdate = true;
      const s = new THREE.Mesh(new THREE.PlaneGeometry(d, 2.8), sm); s.rotation.set(-Math.PI / 2, 0, Math.PI / 2); s.position.set(cx + sd * (w / 2 + .5), .028, cz); scene.add(s); });
  };
  api.cut = (x0, x1, z0, z1, m = 0) => cuts.push([x0 - m, x1 + m, z0 - m, z1 + m]);

  // ---------- ground splat material (grass / mud / leaf litter blended by world-space noise, no visible tiling)
  const gT = (n, rep) => { const t = T(n, 1); return t; };
  const gU = { uGrass: { value: T('sparse_grass_diff', 1) }, uMud: { value: T('mud_forest_diff', 1) }, uLeaf: { value: T('leaves_forest_ground_diff', 1) }, uDry: { value: T('dry_decay_leaves_diff', 1) } };
  Object.values(gU).forEach(u => { u.value.repeat.set(1, 1); });
  api.groundMat = () => { const m = new THREE.MeshStandardMaterial({ color: '#b3b8a6', roughness: 1, metalness: 0 });
    m.onBeforeCompile = (s) => { Object.assign(s.uniforms, gU); s.uniforms.uLow = { value: low ? 1 : 0 };
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix * vec4(position, 1.0)).xyz;');
      s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vWP; uniform sampler2D uGrass, uMud, uLeaf, uDry; uniform float uLow;
float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }`)
      .replace('#include <map_fragment>', `vec2 gp = vWP.xz;
vec3 cG = mix(texture2D(uGrass, gp*.21).rgb, texture2D(uGrass, gp*.057 + vec2(.37,.11)).rgb, .5);
float nA = vn(gp*.035), nB = vn(gp*.11 + 9.), nC = vn(gp*.9);
float mudW = smoothstep(.56,.72,nA);
float leafW = smoothstep(.5,.7,nB) * (1.-mudW);
vec3 cM = texture2D(uMud, gp*.19).rgb;
vec3 cL = mix(texture2D(uLeaf, gp*.23).rgb, texture2D(uDry, gp*.17+.3).rgb, step(.5, nA));
vec3 col = mix(cG, cL*vec3(.8,.72,.6), leafW * (1.-uLow*.2));
col = mix(col, cM, mudW);
col *= .78 + .38*nC; col *= mix(.82, 1.12, vn(gp*.013));
diffuseColor.rgb *= col;`); };
    return m; };

  // ---------- sky dome + nicer fog colours
  const SKY_H = new THREE.Color('#34454c'), SKY_Z = new THREE.Color('#0a121c');
  const skyU = { uTime: { value: 0 }, uHor: { value: SKY_H }, uZen: { value: SKY_Z }, uMoon: { value: new V3(-30, 50, 20).normalize() }, uClouds: { value: low ? 0 : 1 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(200, 24, 12), new THREE.ShaderMaterial({ uniforms: skyU, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `varying vec3 vD; uniform float uTime, uClouds; uniform vec3 uHor, uZen, uMoon;
float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.03+7.1; a*=.5; } return s; }
void main(){ vec3 d = normalize(vD); float y = max(d.y, 0.);
 vec3 c = mix(uHor, uZen, pow(y, .55));
 c += uHor * .35 * exp(-y*9.);                 // haze band on the horizon
 float md = max(dot(d, uMoon), 0.); c += vec3(.55,.62,.75) * (pow(md, 900.) * 1.6 + pow(md, 40.) * .16 + pow(md, 6.) * .05);
 if (uClouds > .5 && d.y > -.02) { vec2 cp = d.xz / (d.y + .22) * 1.1 + vec2(uTime*.006, uTime*.0025); float n = fbm(cp); float cl = smoothstep(.42, .78, n) * smoothstep(-.02,.18,d.y);
   vec3 cc = mix(vec3(.05,.07,.09), vec3(.22,.27,.33), pow(md,2.)*.9 + .25*n); c = mix(c, cc, cl*.8); }
 else { float st = step(.9965, h21(floor(d.xz/(d.y+.3)*90.))) * smoothstep(.15,.5,d.y) * .5; c += vec3(st); }
 gl_FragColor = vec4(c, 1.); 
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}` }));
  sky.frustumCulled = false; sky.renderOrder = -100; scene.add(sky);
  api.sky = sky; api.fogColor = new THREE.Color('#1d2a2e');

  // ---------- weathering for cars (dirt at the bottom, rust patches) – injected into the Kenney colormap material
  api.weather = (mm, rust = 0, burnt = 0) => { mm.userData.rustK = rust; mm.userData.burnK = burnt;
    mm.onBeforeCompile = (s) => { s.uniforms.uRust = { value: mm.userData.rustK }; s.uniforms.uBurn = { value: mm.userData.burnK };
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP2;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP2 = (modelMatrix * vec4(position, 1.0)).xyz;');
      s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vWP2; uniform float uRust, uBurn;
float h31(vec3 p){ p = fract(p*vec3(.1031,.1030,.0973)); p += dot(p, p.yxz+33.33); return fract((p.x+p.y)*p.z); }
float vn3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z); }`)
        .replace('#include <map_fragment>', `#include <map_fragment>
float lum = dot(diffuseColor.rgb, vec3(.3,.55,.15)); float paint = smoothstep(.07,.22,lum) * (1. - smoothstep(.7,.95,lum)*0.);
float nn = vn3(vWP2*vec3(3.1,3.6,3.1)) * .6 + vn3(vWP2*9.) * .4;
float rustA = paint * uRust * smoothstep(.46, .66, nn + (1.-clamp(vWP2.y/1.5,0.,1.))*.28);
vec3 rustC = mix(vec3(.30,.12,.05), vec3(.46,.24,.09), vn3(vWP2*17.));
diffuseColor.rgb = mix(diffuseColor.rgb, rustC, rustA);
float dirtA = (1. - smoothstep(.0, .75, vWP2.y)) * (.35 + .5*nn);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.10,.085,.065), clamp(dirtA*.75, 0., .8));
diffuseColor.rgb *= 1. - .25*smoothstep(.55,.8,vn3(vWP2*5.3)) * paint;`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 1., clamp(rustA*1.2 + dirtA*.4, 0., 1.));')
        .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor *= 1. - clamp(rustA + dirtA*.5, 0., 1.);'); };
    mm.customProgramCacheKey = () => 'wcar'; };

  // =====================================================================================================
  // finish(): called once at the end of buildWorld, with the final colliders / bark material / extra tree spots
  api.finish = ({ colliders, bark, extraTrees = [], KH, regions, footprints = [], clears = [], treeOk: treeOkExt }) => {
    // ---- merge batched house details
    batch.forEach((geos, mat) => { const g = mergeGeometries(geos, false); if (!g) return; const m = new THREE.Mesh(g, mat); m.receiveShadow = false; scene.add(m); });

    // ---- vegetation mask (white = vegetation allowed)
    const MW = XW, MH = ZH, mask = new Uint8Array(MW * MH).fill(255);
    const cutRect = (x0, x1, z0, z1) => { const i0 = Math.max(0, Math.floor(x0 - X0)), i1 = Math.min(MW - 1, Math.ceil(x1 - X0)), j0 = Math.max(0, Math.floor(z0 - Z0)), j1 = Math.min(MH - 1, Math.ceil(z1 - Z0)); for (let j = j0; j <= j1; j++) mask.fill(0, j * MW + i0, j * MW + i1 + 1); };
    roads.forEach(([a, b, c, d]) => cutRect(a - .1, b + .1, c, d));
    colliders.forEach(c => { if (c.car) return; if (c.x1 - c.x0 > 150 || c.z1 - c.z0 > 400) return; cutRect(c.x0 - .7, c.x1 + .7, c.z0 - .7, c.z1 + .7); });
    cuts.forEach(([a, b, c, d]) => cutRect(a, b, c, d));
    // Keem's house is wall-collider only (the interior is hollow); cut the full footprint so grass/bushes stay outside
    cutRect(KH.x0 - 2, KH.x1 + 2, KH.z0 - 2, KH.z1 + 2); cutRect(-9, -4.3, -142, 58); cutRect(4.3, 9, -142, 58);
    footprints.forEach(f => cutRect(f.x0 - 1.5, f.x1 + 1.5, f.z0 - 1.5, f.z1 + 1.5));
    const maskOK = (x, z, m = 0) => { const i = Math.floor(x - X0), j = Math.floor(z - Z0); if (i < 0 || j < 0 || i >= MW || j >= MH) return true; if (!mask[j * MW + i]) return false; if (m) { for (const [dx, dz] of [[m, 0], [-m, 0], [0, m], [0, -m]]) { const ii = Math.floor(x + dx - X0), jj = Math.floor(z + dz - Z0); if (ii >= 0 && jj >= 0 && ii < MW && jj < MH && !mask[jj * MW + ii]) return false; } } return true; };
    const hitsFoot = (x, z, pad) => footprints.some(f => x > f.x0 - pad && x < f.x1 + pad && z > f.z0 - pad && z < f.z1 + pad);
    const hitsClear = (x, z, extra = 0) => clears.some(([cx, cz, r]) => (x - cx) ** 2 + (z - cz) ** 2 < (r + extra) ** 2);
    const treeOk = (x, z, h) => { if (treeOkExt && !treeOkExt(x, z, h)) return false; if (!treeOkExt) { const pad = (h || 12) * .5 + 2; if (hitsFoot(x, z, pad) || hitsClear(x, z, pad * .25)) return false; } return maskOK(x, z, 2); };
    const maskTex = new THREE.DataTexture(mask, MW, MH, THREE.RedFormat); maskTex.minFilter = maskTex.magFilter = THREE.NearestFilter; maskTex.needsUpdate = true;
    api.maskOK = maskOK;

    // ---- grass / weed / fern field (GPU-wrapped around the camera: no CPU work per frame, no black silhouettes)
    { const atlas = new Uint8Array(512 * 512 * 4); const tiles = [TX.grassClump(1), TX.grassClump(11), TX.weedPlant(2), TX.fernPlant(3)];
      tiles.forEach((t, k) => { const ox = (k % 2) * 256, oy = (k >> 1) * 256; for (let y = 0; y < 256; y++) atlas.set(t.data.subarray(y * 256 * 4, (y + 1) * 256 * 4), ((oy + y) * 512 + ox) * 4); });
      const at = TX.toTex({ w: 512, h: 512, data: atlas });
      const quad = (a) => { const g = new THREE.PlaneGeometry(1, 1, 1, 2); g.translate(0, .5, 0); g.rotateY(a); return g; };
      let base = mergeGeometries([quad(0), quad(Math.PI / 3), quad(2 * Math.PI / 3)].map(g => g.toNonIndexed()));
      const pos = base.attributes.position; const nrm = base.attributes.normal; for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0);
      const N = Q.grass, Rr = low ? 17 : high ? 30 : 24;
      const ig = new THREE.InstancedBufferGeometry(); ig.index = null; ['position', 'normal', 'uv'].forEach(k => ig.setAttribute(k, base.attributes[k])); ig.instanceCount = N;
      const rnd = new Float32Array(N * 4); for (let i = 0; i < N * 4; i++) rnd[i] = R(); ig.setAttribute('aRnd', new THREE.InstancedBufferAttribute(rnd, 4));
      const U = { uPl: { value: new THREE.Vector2(0, 1e5) }, uCam: { value: new V3() }, uR: { value: Rr }, uT: { value: 0 }, uMask: { value: maskTex }, uRect: { value: new THREE.Vector4(X0, Z0, XW, ZH) } };
      const gm = new THREE.MeshStandardMaterial({ map: at, alphaTest: .5, side: THREE.DoubleSide, roughness: 1, metalness: 0 });
      gm.onBeforeCompile = (s) => { Object.assign(s.uniforms, U);
        s.vertexShader = s.vertexShader.replace('#include <common>', `#include <common>
attribute vec4 aRnd; uniform vec2 uPl; uniform vec3 uCam; uniform float uR, uT; uniform sampler2D uMask; uniform vec4 uRect; varying vec3 vTint; varying vec2 vAU;`)
          .replace('#include <begin_vertex>', `
vec2 tile = vec2(2.*uR); vec2 org = uCam.xz - uR;
vec2 wp = org + mod(aRnd.xy*tile*7.31 - org, tile);
float dist = length(wp - uCam.xz);
float fade = 1. - smoothstep(uR*.55, uR*.94, dist);
vec2 mu = (wp - uRect.xy) / uRect.zw;
float ok = (mu.y < 0.) ? 0. : ((mu.x < 0. || mu.x > 1. || mu.y > 1.) ? 1. : step(.5, texture2D(uMask, mu).r)); // z < mask start (v2.0 chapters 12+, indoor/new sets) = no grass
float kind = floor(fract(aRnd.w*13.7)*100.);   // 0..99
float tp = kind < 42. ? 0. : kind < 68. ? 1. : kind < 84. ? 2. : 3.;
float hs = (tp < 1.5 ? mix(.28, .6, aRnd.z) : tp < 2.5 ? mix(.25, .43, aRnd.z) : mix(.28, .48, aRnd.z)); // v1.9.13: ~half height so Keem's legs stay visible
float nearK = smoothstep(2., 7.5, dist);
float keep = step(fract(aRnd.x*91.7), mix(.22, 1., nearK));                 // thin out blades close to the camera
vec2 cp = uPl - uCam.xz; float tt = clamp(dot(wp - uCam.xz, cp) / max(dot(cp, cp), .01), 0., 1.);
float dSeg = length(wp - (uCam.xz + tt * cp));                              // keep the line of sight camera -> player clear
float dPl = length(wp - uPl);
float clear = smoothstep(.9, 2.3, dSeg) * smoothstep(1.3, 3.4, dPl);        // and a bare patch around the player's feet
float sc = hs * fade * ok * keep * clear * mix(.55, 1., nearK);
float ang = aRnd.w * 6.2831 * 9.;
mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
vec3 transformed = vec3(position.x * sc * 1.15, position.y * sc, position.z * sc * 1.15);
float sway = sin(uT*1.5 + wp.x*.45 + wp.y*.33) * .14 + sin(uT*3.1 + wp.x*1.7) * .035;
transformed.x += sway * position.y * position.y * sc * (tp < 1.5 ? 1. : .4); transformed.z += sway * .6 * position.y * position.y * sc;
transformed.xz = rot * transformed.xz; transformed.xz += wp;
vAU = vec2((mod(tp,2.) + (uv.x*.96+.02)) * .5, (floor(tp*.5) + (uv.y*.96+.02)) * .5);
float v = fract(aRnd.z*7.77);
vec3 gc = mix(vec3(.62,.78,.42), vec3(1.1,1.0,.62), smoothstep(.55,1.,v));
gc = mix(gc, vec3(.86,.78,.52), step(.9, fract(aRnd.w*31.1)) );
vTint = gc * mix(.55, 1.15, uv.y) * mix(.8, 1.1, fract(aRnd.x*37.));`)
          .replace('#include <uv_vertex>', '#include <uv_vertex>');
        s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint; varying vec2 vAU;')
          .replace('#include <map_fragment>', 'vec4 sdc = texture2D(map, vAU); diffuseColor *= vec4(sdc.rgb * vTint, sdc.a);'); };
      const gmesh = new THREE.Mesh(ig, gm); gmesh.frustumCulled = false; gmesh.renderOrder = 1; scene.add(gmesh);
      let vt = 0; const vegNear = (x, z) => { let n = 0; for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) { const i = Math.floor(x + a * 6 - X0), j = Math.floor(z + b * 6 - Z0); n += (j < 0) ? 0 : (i < 0 || i >= MW || j >= MH) ? 1 : (mask[j * MW + i] ? 1 : 0); } return n / 49; };
      updaters.push((dt, t, cam) => { U.uCam.value.copy(cam); U.uT.value = t; if (api.pl) U.uPl.value.set(api.pl.x, api.pl.z); vt -= dt; if (vt <= 0) { vt = .35; gmesh.visible = vegNear(cam.x, cam.z) > .04; } }); // no grass pass inside tunnels / on bare ground (perf)
      api.grassMesh = gmesh; }

    // ---- geometry factories for trees / bushes
    const leafMap = TX.toTex(TX.leafCluster(5)), boughMap = TX.toTex(TX.pineBough(4));
    const cardGeo = (len, wid, droop, segs, yaw, x0, y0, z0, pitch = 0, upN = .85) => { const pos = [], uv = [], nor = [], idx = []; const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      for (let i = 0; i <= segs; i++) { const s = i / segs; for (const v of [-.5, .5]) { let lx = s * len, ly = -droop * s * s * len, lz = v * wid * (1 - .25 * s * s);
        const px = lx * cp - ly * sp, py = lx * sp + ly * cp; const X = px * cy + lz * sy, Z = -px * sy + lz * cy; pos.push(x0 + X, y0 + py, z0 + Z); uv.push(s, v + .5);
        const ox = X, oz = Z, ol = Math.hypot(ox, oz) || 1; const nx = ox / ol * (1 - upN), nz = oz / ol * (1 - upN), ny = upN; const nl = Math.hypot(nx, ny, nz); nor.push(nx / nl, ny / nl, nz / nl); } }
      for (let i = 0; i < segs; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx); return g; };
    // leaf cluster billboard pair (for deciduous / bush): two crossed quads
    const clusterGeo = (cx, cy, cz, size, yaw, tilt = 0) => { const parts = []; for (let k = 0; k < 2; k++) { const g = new THREE.PlaneGeometry(size, size); g.rotateX(-Math.PI / 2 * .0 + tilt); g.rotateY(yaw + k * Math.PI / 2 + (k ? .3 : 0)); g.translate(cx, cy, cz);
      const n = g.attributes.normal; for (let i = 0; i < n.count; i++) { const p = g.attributes.position; const ox = p.getX(i) - cx, oy = p.getY(i) - cy, oz = p.getZ(i) - cz; const l = Math.hypot(ox, oy, oz) || 1; const nx = ox / l * .5, ny = oy / l * .5 + .75, nz = oz / l * .5; const nl = Math.hypot(nx, ny, nz); n.setXYZ(i, nx / nl, ny / nl, nz / nl); } parts.push(g.toNonIndexed()); } return mergeGeometries(parts); };
    const tmpC = new THREE.Color();

    // pine crown (unit tree height 1, half-width ~.3)
    const pineCrown = (() => { const W = low ? 5 : 7, C = low ? 4 : 5, parts = []; for (let k = 0; k < W; k++) { const t = k / (W - 1), y = .16 + t * .74, len = (1 - t * .86) * .34 + .1; for (let c = 0; c < C; c++) { const yaw = c / C * Math.PI * 2 + k * 1.1 + rr(-.2, .2); parts.push(cardGeo(len, len * .95, .35, 2, yaw, 0, y, 0, rr(-.1, .12), .8).toNonIndexed()); } }
      for (let c = 0; c < 3; c++) parts.push(cardGeo(.16, .1, 0, 1, c * 2.1, 0, .88, 0, 1.2, .9).toNonIndexed()); return mergeGeometries(parts); })();
    // deciduous trunk with limbs + crown clusters
    const decWood = (() => { const parts = []; const cyl = (r0, r1, len, ax, ay, az, bx, by, bz) => { const g = new THREE.CylinderGeometry(r1, r0, len, low ? 5 : 6, 1, true); g.translate(0, len / 2, 0); const dir = new V3(bx - ax, by - ay, bz - az).normalize(); const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), dir); g.applyQuaternion(q); g.translate(ax, ay, az); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * len * 1.5); return g; };
      parts.push(cyl(.034, .018, .5, 0, 0, 0, 0, 1, 0)); const tips = []; const L = 5;
      for (let i = 0; i < L; i++) { const az = i / L * 6.28 + rr(-.3, .3), el = rr(.5, .95), y0 = rr(.34, .5), len = rr(.26, .38); const dx = Math.sin(el) * Math.cos(az), dy = Math.cos(el), dz = Math.sin(el) * Math.sin(az); parts.push(cyl(.016, .006, len, 0, y0, 0, dx, dy, dz)); const tx = dx * len, ty = y0 + dy * len, tz = dz * len; tips.push([tx, ty, tz, dx, dy, dz]);
        const el2 = el + rr(.2, .6), az2 = az + rr(-.8, .8), len2 = len * .55, dx2 = Math.sin(el2) * Math.cos(az2), dy2 = Math.cos(el2), dz2 = Math.sin(el2) * Math.sin(az2); parts.push(cyl(.006, .003, len2, tx, ty, tz, dx2, dy2, dz2)); tips.push([tx + dx2 * len2, ty + dy2 * len2, tz + dz2 * len2, dx2, dy2, dz2]); }
      return { wood: mergeGeometries(parts.map(p => p.index ? p.toNonIndexed() : p)), tips }; })();
    const decCrown = (() => { const parts = [], n = low ? 2 : 3; decWood.tips.forEach(([x, y, z], i) => { for (let k = 0; k < n; k++) parts.push(clusterGeo(x + rr(-.08, .08), y + rr(-.02, .1), z + rr(-.08, .08), rr(.17, .26), rr(0, 3), 0)); });
      for (let k = 0; k < (low ? 5 : 9); k++) parts.push(clusterGeo(rr(-.2, .2), rr(.6, .9), rr(-.2, .2), rr(.2, .3), rr(0, 3), 0)); return mergeGeometries(parts); })();
    const bushGeo = (() => { const parts = [], n = low ? 6 : 10; for (let k = 0; k < n; k++) { const a = rr(0, 6.28), e = rr(.1, 1.2), r = .42 * Math.sin(e + .3); parts.push(clusterGeo(Math.cos(a) * r, .16 + .5 * Math.cos(e) * .8, Math.sin(a) * r, rr(.7, 1.0), rr(0, 3))); } return mergeGeometries(parts); })();
    const deadBush = (() => { const parts = []; for (let k = 0; k < 7; k++) { const g = new THREE.CylinderGeometry(.006, .02, .9, 4, 1, true); g.translate(0, .45, 0); g.rotateZ(rr(-.7, .7)); g.rotateY(rr(0, 6)); parts.push(g.toNonIndexed()); } return mergeGeometries(parts); })();

    const leafMat = (hex) => new THREE.MeshStandardMaterial({ map: leafMap, alphaTest: .5, side: THREE.DoubleSide, roughness: 1, color: hex || '#ffffff' });
    const boughMat = new THREE.MeshStandardMaterial({ map: boughMap, alphaTest: .5, side: THREE.DoubleSide, roughness: 1 });
    const barkDark = bark.clone(); barkDark.color = new THREE.Color('#7a6e62');
    // fade / punch a hole in foliage that sits on the camera → player line so trees never block the view
    const occU = { uCam: { value: new V3() }, uPl3: { value: new V3() } };
    const occInject = (mat) => { if (!mat || mat.userData._occ) return mat; mat.userData._occ = 1; const prev = mat.onBeforeCompile; const prevKey = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : () => '';
      mat.onBeforeCompile = (s) => { if (prev) prev(s); Object.assign(s.uniforms, occU);
        s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nuniform vec3 uCam, uPl3; varying float vOcc;')
          .replace('#include <project_vertex>', `vec4 _occP = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
_occP = instanceMatrix * _occP;
#endif
_occP = modelMatrix * _occP;
vec3 _occA = uCam, _occB = uPl3, _occAB = _occB - _occA;
float _occT = clamp(dot(_occP.xyz - _occA, _occAB) / max(dot(_occAB, _occAB), 0.01), 0., 1.);
vOcc = smoothstep(1.15, 2.65, length(_occP.xyz - (_occA + _occT * _occAB)));
#include <project_vertex>`);
        s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vOcc;')
          .replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\ndiffuseColor.a *= vOcc;\nif (vOcc < 0.08) discard;'); };
      mat.customProgramCacheKey = () => prevKey() + '|foc'; return mat; };
    occInject(boughMat); occInject(bark); occInject(barkDark);
    const leafMatOcc = (hex) => occInject(leafMat(hex));

    // ---- tree spots (visual only; no colliders are added here)
    const spots = []; // {x,z,h,kind}
    const kinds = () => { const r = R(); return r < .56 ? 'pine' : r < .88 ? 'dec' : 'dead'; };
    extraTrees.forEach(([x, z, h]) => { const H = h || rr(8, 12); if (!treeOk(x, z, H)) return; spots.push({ x, z, h: H, kind: R() < .6 ? 'pine' : 'dec' }); });
    regions.forEach(({ x0, x1, z0, z1, n, inner = 0 }) => { let c = 0, tries = 0; while (c < n && tries++ < n * 40) { const x = rr(x0, x1), z = rr(z0, z1), H = rr(9, 17); if (Math.abs(x) < inner) continue; if (!treeOk(x, z, H)) continue; spots.push({ x, z, h: H, kind: kinds() }); c++; } });
    const by = (k) => spots.filter(s => s.kind === k);
    // v2.1: instances are split into 80 m chunks along z so frustum culling drops everything behind / far away (big saving for phones)
    const BIN = low ? 260 : 100; // low: fewer, larger chunks = fewer draw calls
    const mk = (geo, mat, list, f, shadow) => { if (!list.length) return null; const bins = new Map(); list.forEach(s => { const k = Math.floor(s.z / BIN); (bins.get(k) || bins.set(k, []).get(k)).push(s); }); let last = null; bins.forEach(l => { last = mk1(geo, mat, l, f, shadow); }); return last; };
    const mk1 = (geo, mat, list, f, shadow) => { if (!list.length) return null; const im = new THREE.InstancedMesh(geo, mat, list.length), M = new THREE.Matrix4(), p = new V3(), q = new THREE.Quaternion(), sc = new V3(), col = new THREE.Color();
      list.forEach((s, i) => { const o = f(s); M.compose(p.set(s.x, o.y || 0, s.z), q.setFromAxisAngle(new V3(0, 1, 0), o.rot || 0), sc.set(o.sx, o.sy, o.sz)); im.setMatrixAt(i, M); im.setColorAt(i, o.col); });
      im.castShadow = !!shadow; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.frustumCulled = true; im.computeBoundingSphere(); scene.add(im); return im; };
    const trunkG = new THREE.CylinderGeometry(.16, .3, 1, 7, 1, true); trunkG.translate(0, .5, 0);
    const pines = by('pine'), decs = by('dec'), deads = by('dead');
    mk(trunkG, bark, pines, s => ({ rot: rr(0, 6), sx: 1 + s.h / 22, sy: s.h * .72, sz: 1 + s.h / 22, col: tmpC.setRGB(.7, .66, .62).clone() }), Q.shadows);
    mk(pineCrown, boughMat, pines, s => ({ rot: rr(0, 6), sx: s.h * 1.0, sy: s.h, sz: s.h * 1.0, col: tmpC.setHSL(.33 + rr(-.02, .03), .35 + rr(0, .15), .26 + rr(0, .1)).clone() }), false); // crowns don't cast shadows (perf)
    mk(decWood.wood, bark, decs, s => ({ rot: rr(0, 6), sx: s.h * (.9 + R() * .3), sy: s.h, sz: s.h * (.9 + R() * .3), col: tmpC.setRGB(.72, .66, .6).clone() }), false);
    const decCols = ['#5d7a34', '#6b8a3a', '#7d8a34', '#9a8a30', '#a8742c', '#8a5a2a', '#55702f'];
    mk(decCrown, leafMatOcc(), decs, s => ({ rot: rr(0, 6), sx: s.h * .95, sy: s.h, sz: s.h * .95, col: tmpC.set(decCols[(R() * decCols.length) | 0]).clone() }), false);
    mk(decWood.wood, barkDark, deads, s => ({ rot: rr(0, 6), sx: s.h * .8, sy: s.h * .85, sz: s.h * .8, col: tmpC.setRGB(.55, .52, .5).clone() }), false);

    // ---- bushes, dead scrub: along roads, around houses and in the verges (instanced, density by preset)
    const bushes = []; const nB = low ? 420 : high ? 1500 : 900;
    const bz = (zr, n, xr) => { let c = 0, t = 0; while (c < n && t++ < n * 30) { const side = R() < .5 ? -1 : 1, x = side * rr(xr[0], xr[1]), z = rr(zr[0], zr[1]); if (!maskOK(x, z, 1.6)) continue; bushes.push({ x, z, sx: rr(.7, 1.7) }); c++; } };
    const segs = [[80, -140, 1], [-140, -330, .8], [-330, -760, 1], [-1000, -1700, 1.1], [-1990, -2690, 1.1]]; const totalLen = segs.reduce((a, s) => a + Math.abs(s[1] - s[0]) * s[2], 0);
    segs.forEach(([a, b, w]) => bz([Math.min(a, b), Math.max(a, b)], Math.round(nB * Math.abs(b - a) * w / totalLen), [8.6, 40]));
    const bushCols = ['#4f6a2e', '#5b7a34', '#6b8036', '#7b6a30', '#4a5e2a', '#6a5a2c'];
    mk(bushGeo, leafMatOcc(), bushes, s => ({ rot: rr(0, 6), sx: s.sx, sy: s.sx * rr(.7, 1.1), sz: s.sx, col: tmpC.set(bushCols[(R() * bushCols.length) | 0]).clone() }), false);
    const scrub = bushes.filter(() => R() < .35).map(s => ({ x: s.x + rr(-2, 2), z: s.z + rr(-2, 2) })).filter(s => maskOK(s.x, s.z, .5));
    mk(deadBush, occInject(new THREE.MeshStandardMaterial({ color: '#5a4a38', roughness: 1, side: THREE.DoubleSide })), scrub, s => ({ rot: rr(0, 6), sx: rr(.7, 1.4), sy: rr(.7, 1.3), sz: rr(.7, 1.4), col: tmpC.setRGB(1, 1, 1).clone() }), false);

    // ---- trash / debris
    const props = []; const prop = (geo, mat, n, lo, hi, opts = {}) => { const list = []; let c = 0, t = 0; while (c < n && t++ < n * 40) { const seg = segs[(R() * segs.length) | 0]; const z = rr(Math.min(seg[0], seg[1]), Math.max(seg[0], seg[1])); const side = R() < .5 ? -1 : 1, x = side * rr(lo, hi); if (!maskOK(x, z, .3) && !opts.onRoad) continue; list.push({ x, z }); c++; }
      return mk(geo, mat, list, s => { const sc = rr(opts.s0 || .8, opts.s1 || 1.3); return { y: opts.y || 0, rot: rr(0, 6.28), sx: sc, sy: sc * (opts.flat ? 1 : rr(.85, 1.15)), sz: sc, col: tmpC.set(opts.cols ? opts.cols[(R() * opts.cols.length) | 0] : '#fff').clone() }; }, false); };
    const bagG = (() => { const g = new THREE.IcosahedronGeometry(.32, 1); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + .22 * Math.sin(p.getX(i) * 17 + p.getZ(i) * 9); p.setXYZ(i, p.getX(i) * k * 1.05, Math.max(p.getY(i), -.12) * .72 * k + .1, p.getZ(i) * k); } g.computeVertexNormals(); return g; })();
    const bagM = new THREE.MeshStandardMaterial({ roughness: .32, metalness: .05 });
    const boxM = new THREE.MeshStandardMaterial({ color: '#9a7d58', roughness: 1 });
    const boxG = new THREE.BoxGeometry(.55, .38, .42); boxG.translate(0, .19, 0);
    const barrelG = new THREE.CylinderGeometry(.29, .29, .88, 10); barrelG.translate(0, .44, 0);
    const barrelM = pbr('rust_coarse_01', 1, { roughness: .75, metalness: .55 });
    const tireG = new THREE.TorusGeometry(.3, .12, 6, 12); tireG.rotateX(Math.PI / 2); tireG.translate(0, .12, 0);
    const tireM = new THREE.MeshStandardMaterial({ color: '#1b1b1b', roughness: .95 });
    const rubG = new THREE.DodecahedronGeometry(.22, 0);
    const rubM = new THREE.MeshStandardMaterial({ color: '#77746c', roughness: 1, flatShading: true });
    const paperG = new THREE.PlaneGeometry(.3, .38); paperG.rotateX(-Math.PI / 2);
    const paperM = new THREE.MeshStandardMaterial({ map: TX.paperTex(), roughness: 1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const f = low ? .55 : 1;
    prop(bagG, bagM, Math.round(150 * f), 6, 30, { cols: ['#1b1d1c', '#222a24', '#2b2b30', '#5a5a50', '#14201a'], s0: .8, s1: 1.4 });
    prop(boxG, boxM, Math.round(70 * f), 7, 32, { cols: ['#ffffff', '#cfc0a0', '#b8a888'], s0: .8, s1: 1.3 });
    prop(barrelG, barrelM, Math.round(40 * f), 8, 34, { cols: ['#c8c0b0', '#9a5a3a', '#4a6a8a', '#7a8a6a', '#8a3a2a'], s0: .9, s1: 1.1 });
    prop(tireG, tireM, Math.round(36 * f), 5, 30, { s0: .9, s1: 1.2 });
    prop(rubG, rubM, Math.round(160 * f), 5.5, 28, { s0: .6, s1: 1.8 });
    prop(paperG, paperM, Math.round(360 * f), 3, 12, { y: .04, flat: 1, onRoad: 1, s0: .8, s1: 1.4 });
    // v2.1 more prop variety (all instanced, tinted / scaled / rotated per piece)
    const coneG = new THREE.ConeGeometry(.15, .52, 8); coneG.translate(0, .26, 0); const coneM = new THREE.MeshStandardMaterial({ color: '#ff6a1a', roughness: .8 });
    const crateG = new THREE.BoxGeometry(.7, .5, .7); crateG.translate(0, .25, 0); const crateM = new THREE.MeshStandardMaterial({ color: '#8a6a44', roughness: 1 });
    const bucketG = new THREE.CylinderGeometry(.17, .13, .3, 10); bucketG.translate(0, .15, 0); const bucketM = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .55 });
    const caseG = new THREE.BoxGeometry(.58, .4, .22); caseG.translate(0, .2, 0); caseG.rotateY(0); const caseM = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .6 });
    const plankG = new THREE.BoxGeometry(1.4, .05, .16); plankG.translate(0, .03, 0); const plankM = new THREE.MeshStandardMaterial({ color: '#7a6244', roughness: 1 });
    if (!low) prop(coneG, coneM, Math.round(26 * f), 6, 26, { cols: ['#ffffff', '#f0d0b0', '#c8a888'], s0: .9, s1: 1.1 });
    prop(crateG, crateM, Math.round(34 * f), 7, 30, { cols: ['#ffffff', '#d8c0a0', '#a89070', '#c0a080'], s0: .7, s1: 1.3 });
    if (!low) prop(bucketG, bucketM, Math.round(30 * f), 6, 28, { cols: ['#c04a2a', '#3a6a9a', '#c8c070', '#707070', '#2a7a4a'], s0: .8, s1: 1.2 });
    if (!low) prop(caseG, caseM, Math.round(24 * f), 6, 26, { cols: ['#3a2a28', '#2a3a5a', '#7a2a2a', '#4a4a4a', '#6a5a2a'], s0: .8, s1: 1.2 });
    if (!low) prop(plankG, plankM, Math.round(40 * f), 6, 28, { cols: ['#ffffff', '#d8c8a8', '#b09870'], s0: .8, s1: 1.5, flat: 1 });

    // ---- ferns/leaf litter scatter handled by ground shader; add wind updater for sky time + foliage occlusion
    updaters.push((dt, t, cam) => { skyU.uTime.value = t; sky.position.copy(cam);
      occU.uCam.value.copy(cam); if (api.pl) occU.uPl3.value.set(api.pl.x, (api.pl.y || 0) + 1.45, api.pl.z); else occU.uPl3.value.copy(cam); });
    api.stats = { trees: spots.length, bushes: bushes.length, mask: [MW, MH] };
    api.treeSpots = spots;
  };
  api.pl = null;
  api.update = (dt, t, cam) => updaters.forEach(u => u(dt, t, cam));
  return api;
}
