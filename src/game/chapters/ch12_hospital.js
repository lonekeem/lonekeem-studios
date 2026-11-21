// v1.9.17 Chapters 12-13: Mass General sub-basement (Sublevel B) and the upper floors (gift shop, children's ward, cafeteria).
// Original procedural kit (smooth cartoon look, no brand logos). Everything is built into a hidden zone Group by world.js; colliders are global.
import * as THREE from 'three';
import { canvasTex, signTex } from '../util.js';
import { Decor } from '../interiors.js';
const PI = Math.PI, WH = 3.6;
const rnd = (a, b) => a + Math.random() * (b - a);

function kit(H) {
  const { scene, colliders, lights, updaters, Q } = H;
  const col = (x0, x1, z0, z1) => { const c = { x0, x1, z0, z1 }; colliders.push(c); return c; };
  const T = {}; const RW = (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  T.tile = (a, b, g2 = '#6a726f') => RW(canvasTex(128, 128, (g, w, h) => { g.fillStyle = a; g.fillRect(0, 0, w, h); g.fillStyle = b; g.fillRect(0, 0, w / 2, h / 2); g.fillRect(w / 2, h / 2, w / 2, h / 2); g.strokeStyle = g2; g.lineWidth = 2; g.strokeRect(0, 0, w, h); g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(30,30,24,${Math.random() * .1})`; g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 9, 2 + Math.random() * 9); } }));
  T.wall = (low, high, stripe) => RW(canvasTex(128, 128, (g, w, h) => { g.fillStyle = high; g.fillRect(0, 0, w, h); g.fillStyle = low; g.fillRect(0, h * .62, w, h * .38); g.fillStyle = stripe; g.fillRect(0, h * .6, w, h * .03);
    for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(20,24,20,${Math.random() * .12})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 4 + Math.random() * 22); } }));
  // acoustic ceiling tile: 2x2 grid of tiles per texture repeat (one repeat = 1.2 m), speckled, with dark joints, so it reads as a ceiling and not as fog
  T.ceil = (base, joint) => RW(canvasTex(128, 128, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < 320; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * .16})`; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }
    g.fillStyle = joint; g.fillRect(0, 0, w, 4); g.fillRect(0, h / 2 - 2, w, 4); g.fillRect(0, 0, 4, h); g.fillRect(w / 2 - 2, 0, 4, h); }));
  const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: .85 }, o));
  const rep = (t, x, y) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(x, y); return t; };
  const M = {
    ceil: std({ color: '#3c4244', emissive: '#323a3c', roughness: 1 }), steel: std({ color: '#9aa2a6', metalness: .5, roughness: .45 }), dark: std({ color: '#1c2022' }),
    glass: new THREE.MeshStandardMaterial({ color: '#a8d8e0', transparent: true, opacity: .22, roughness: .05, metalness: .2, side: THREE.DoubleSide, depthWrite: false }),
    frame: std({ color: '#5a6064', metalness: .4, roughness: .5 }), red: std({ color: '#8a1a14' }),
  };
  const TRIM = std({ color: '#50564f', roughness: .9 });
  const ceilMat = (w, d) => { const t = T.ceil('#8d9189', '#5e635c'); t.repeat.set(w / 1.2, d / 1.2); return std({ map: t, color: '#ffffff', emissive: '#4a4d47', emissiveMap: t, roughness: 1 }); };
  // box with wall-style UVs: u follows the long side, v is exactly one texture per WH of height
  const wallGeo = (w, h, d) => { const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv; for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i, u = uv.getX(k), v = uv.getY(k); if (f < 2) uv.setXY(k, u * d / 4, v * h / WH); else if (f < 4) uv.setXY(k, u * w / 4, v * d / WH); else uv.setXY(k, u * w / 4, v * h / WH); } return g; };
  const K = {
    col, M, T, std, rep,
    floor(x0, x1, z0, z1, mat) { const m = new THREE.Mesh(new THREE.PlaneGeometry(Math.abs(x1 - x0), Math.abs(z1 - z0)), mat); m.rotation.x = -PI / 2; m.position.set((x0 + x1) / 2, .05, (z0 + z1) / 2); Object.assign(mat, { polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -8 }); m.receiveShadow = true; scene.add(m); return m; },
    // ceilings are single-sided (they face DOWN): visible from inside the room, invisible from above, so a high camera never gets blocked by them
    ceil(x0, x1, z0, z1, h = WH, mat) { const w = Math.abs(x1 - x0), d = Math.abs(z1 - z0); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat || ceilMat(w, d)); m.rotation.x = PI / 2; m.position.set((x0 + x1) / 2, h, (z0 + z1) / 2); scene.add(m);
      // dark crown trim around the edge so the ceiling line reads clearly against the walls
      const tm = TRIM; [[(x0 + x1) / 2, z0, w, .0], [(x0 + x1) / 2, z1, w, .0], [x0, (z0 + z1) / 2, 0, d], [x1, (z0 + z1) / 2, 0, d]].forEach(([cx, cz, lw, ld]) => { const t = new THREE.Mesh(new THREE.BoxGeometry(lw || .16, .22, ld || .16), tm); t.position.set(cx, h - .11, cz); scene.add(t); }); return m; },
    // straight wall from (ax,az) to (bx,bz) (axis aligned) with door gaps [[centre, width], ...]; gaps get a lintel. returns meshes
    wall(ax, az, bx, bz, gaps = [], o = {}) { const h = o.h || WH, th = o.th || .4, mat = o.mat, along = Math.abs(bx - ax) > Math.abs(bz - az) ? 'x' : 'z'; const a = along === 'x' ? Math.min(ax, bx) : Math.min(az, bz), b = along === 'x' ? Math.max(ax, bx) : Math.max(az, bz), c0 = along === 'x' ? az : ax;
      const gs = gaps.slice().sort((p, q) => p[0] - q[0]); const segs = []; let cur = a; gs.forEach(([c, w]) => { segs.push([cur, c - w / 2]); cur = c + w / 2; }); segs.push([cur, b]); const out = [];
      const put = (s0, s1, y0, y1, solid) => { const len = s1 - s0; if (len < .05) return; const hh = y1 - y0; const g = wallGeo(along === 'x' ? len : th, hh, along === 'x' ? th : len); const m = new THREE.Mesh(g, mat || M.wall); m.position.set(along === 'x' ? (s0 + s1) / 2 : c0, (y0 + y1) / 2, along === 'x' ? c0 : (s0 + s1) / 2); m.receiveShadow = true; scene.add(m); out.push(m);
        if (solid) { if (along === 'x') col(s0, s1, c0 - th / 2, c0 + th / 2); else col(c0 - th / 2, c0 + th / 2, s0, s1); } };
      segs.forEach(([s0, s1]) => put(s0, s1, 0, h, true)); gs.forEach(([c, w]) => put(c - w / 2, c + w / 2, 2.55, h, false)); return out; },
    // sliding door: a slab + collider, open(true) slides it away
    door(cx, cz, w, along = 'x', mat = M.steel, h = 2.6) { const g = new THREE.Mesh(new THREE.BoxGeometry(along === 'x' ? w : .18, h, along === 'x' ? .18 : w), mat); g.position.set(cx, h / 2, cz); g.castShadow = true; scene.add(g);
      const c = col(along === 'x' ? cx - w / 2 : cx - .1, along === 'x' ? cx + w / 2 : cx + .1, along === 'x' ? cz - .1 : cz - w / 2, along === 'x' ? cz + .1 : cz + w / 2); const x0 = { ...c }; const d = { mesh: g, col: c, open: false, t: 0, along, w };
      d.set = (open) => { d.open = open; if (open) { c.x0 = c.x1 = c.z0 = c.z1 = 9999; } else Object.assign(c, x0); }; updaters.push((dt) => { const tt = d.open ? 1 : 0; d.t += (tt - d.t) * Math.min(1, dt * 5); if (along === 'x') g.position.x = cx + d.t * (w - .15); else g.position.z = cz + d.t * (w - .15); g.visible = d.t < .98; }); return d; },
    lamp(x, z, o = {}) { const y = o.y || WH - .07, em = std({ color: '#aeb4b4', emissive: o.color || '#e8f4ff', emissiveIntensity: 0 }); const m = new THREE.Mesh(new THREE.BoxGeometry(o.w || 1.5, .06, o.d || .38), em); m.position.set(x, y, z); scene.add(m);
      const L = { m: em, light: null, on: 1.6, color: o.color || '#e8f4ff' }; if (o.light !== false && H.lampBudget() > 0) { const pl = new THREE.PointLight(o.color || '#e8f4ff', 0, o.r || 15, 1.7); pl.position.set(x, y - .6, z); scene.add(pl); L.light = pl; L.I = o.I || 14; H.lampBudget(-1); }
      H.lamps.push(L); if (o.flicker) updaters.push((dt, t) => { if (!H.on) return; const f = Math.sin(t * 31 + x) * Math.sin(t * 7.3 + z) > .82 ? .15 : 1; em.emissiveIntensity = L.on * f * H.level; if (L.light) L.light.intensity = L.I * f * H.level; }); return L; },
    emergency(x, z, y = 3.2) { const em = std({ color: '#300', emissive: '#ff2a1a', emissiveIntensity: 2.4 }); const m = new THREE.Mesh(new THREE.BoxGeometry(.26, .12, .14), em); m.position.set(x, y, z); scene.add(m); H.emerg.push(m); return m; },
    box(cx, cy, cz, w, h, d, mat, solid = true) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(cx, cy, cz); m.castShadow = true; m.receiveShadow = true; scene.add(m); if (solid) col(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2); return m; },
  };
  return K;
}

// ---- furniture (merged vertex-colour meshes) ----
function gurney(D, x, z, ry, o = {}) { D.push(x, 0, z, ry);
  D.box(0, .86, 0, .78, .06, 2.0, '#aeb4b8'); D.box(0, .5, 0, .62, .04, 1.8, '#7d8488'); [[-.3, -.85], [.3, -.85], [-.3, .85], [.3, .85]].forEach(([a, b]) => { D.cyl(a, .42, b, .025, .84, '#7d8488'); D.cyl(a, .06, b, .06, .06, '#222', 0, 0, PI / 2, .06, 10); });
  if (o.body) { const sh = o.sheet || '#e6e3da'; D.box(0, .97, .05, .6, .14, 1.62, sh); D.sph(0, 1.0, .74, .17, .12, .2, sh); D.sph(-.16, 1.08, -.55, .09, .1, .2, sh); D.sph(.16, 1.08, -.55, .09, .1, .2, sh);
    if (o.blood) { D.box(.12, 1.045, .2, .3, .012, .5, '#7a1010'); D.box(-.1, 1.045, -.3, .2, .012, .3, '#8a1414'); } if (o.arm) D.cyl(.42, .72, .1, .04, .55, '#c4a58a', 0, 0, .35); }
  else if (o.flat) D.box(0, .92, 0, .62, .04, 1.9, '#d8dcd8'); D.pop(); }
function bed(D, x, z, ry, tone = '#9fc0d0') { D.push(x, 0, z, ry); D.box(0, .5, 0, .9, .1, 2.0, '#7d8488'); D.box(0, .62, .1, .86, .16, 1.7, '#e8e6de'); D.box(0, .76, -.6, .84, .04, .9, tone); D.box(0, .72, .78, .5, .12, .3, '#f2f0e8'); D.box(0, .85, -.95, .9, .5, .05, '#8a9094'); D.box(0, .85, .98, .9, .4, .05, '#8a9094'); D.pop(); }
function cot(D, x, z, ry) { D.push(x, 0, z, ry); D.box(0, .32, 0, .8, .06, 1.9, '#5a6064'); D.box(0, .4, 0, .74, .1, 1.8, '#9a9488'); D.box(0, .46, .7, .5, .08, .3, '#bdb8a8'); D.pop(); }
function toilet(D, x, z, ry) { D.push(x, 0, z, ry); D.box(0, .22, 0, .38, .44, .5, '#d8d8d2'); D.box(0, .6, -.25, .4, .5, .16, '#d8d8d2'); D.pop(); }
function vending(D, x, z, ry, col = '#2a5aa0') { D.push(x, 0, z, ry); D.box(0, .95, 0, 1.0, 1.9, .8, col); D.box(-.1, 1.15, .41, .7, 1.1, .02, '#d8f0ff'); D.box(.38, 1.0, .41, .2, .7, .02, '#222'); D.box(0, .22, .41, .8, .3, .02, '#111');
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) D.box(-.35 + j * .19, 1.55 - i * .26, .4, .12, .14, .03, ['#e84a3a', '#f0c030', '#40b060', '#e870b0'][(i + j) % 4]); D.pop(); }
function table(D, x, z, w = 1.6, d = .9, top = '#c9b48a') { D.box(x, .74, z, w, .06, d, top); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => D.box(x + a * (w / 2 - .08), .36, z + b * (d / 2 - .08), .06, .72, .06, '#5a4a38')); }
function chair(D, x, z, ry = 0, c = '#d8734a') { D.push(x, 0, z, ry); D.box(0, .45, 0, .44, .05, .44, c); D.box(0, .75, -.2, .44, .5, .05, c); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => D.box(a * .18, .22, b * .18, .04, .44, .04, '#444')); D.pop(); }
function teddy(D, x, y, z, ry, c = '#b8844a', s = 1) { D.push(x, y, z, ry); D.sph(0, .12 * s, 0, .1 * s, .11 * s, .09 * s, c); D.sph(0, .27 * s, 0, .075 * s, .07 * s, .07 * s, c); D.sph(-.055 * s, .33 * s, 0, .03 * s, .03 * s, .02 * s, c); D.sph(.055 * s, .33 * s, 0, .03 * s, .03 * s, .02 * s, c); D.sph(0, .26 * s, .06 * s, .03 * s, .02 * s, .02 * s, '#e8d0b0'); D.pop(); }
function shelf(D, x, z, ry, w = 2.4, rows = 4, seed = 1) { D.push(x, 0, z, ry); D.box(0, 1.0, 0, w, 2.0, .4, '#7a5a3a'); for (let i = 0; i < rows; i++) { const y = .35 + i * .45; D.box(0, y, .06, w - .1, .04, .36, '#a07a50');
    for (let j = 0; j < Math.floor(w / .3); j++) { const px = -w / 2 + .25 + j * .3, k = (i * 7 + j * 3 + seed) % 5; if (k === 0) teddy(D, px, y + .02, .08, 0, ['#b8844a', '#e8a0b8', '#a0c0e8', '#e8d070'][(i + j) % 4], .8); else D.box(px, y + .12, .08, .2, .22 + (k % 3) * .06, .16, ['#e84a3a', '#f0c030', '#40b060', '#e870b0', '#4a90e0'][(i + j * 2 + seed) % 5]); } } D.pop(); }

// ================== Chapter 12 · Sublevel B ==================
// z runs south (more negative). Landing -2900..-2846 · morgue -2916..-2896 · boiler room -2966..-2946 · research hall -3016..-3000 · Mom's cell -3070..-3012
export const B12 = { x0: -16, x1: 16, zL: -2900, zM: -2916, zB: -2966, zH: -3016, zC: -3070, zE: -3084 };
export function buildSubB(H0) {
  const H = Object.assign({ on: false, level: 0, lamps: [], emerg: [], budget: 99 }, H0); H.budget = Math.min(H0.Q.lamps + 1, 5); H.lampBudget = (d = 0) => (H.budget += d);
  const K = kit(H), { M, T } = K, scene = H0.scene; const R = { cells: [], vents: {} };
  const floorM = K.std({ map: K.rep(T.tile('#8f9a96', '#8b9692', '#7a8581'), 8, 8), roughness: .5, metalness: .05 }); floorM.map.repeat.set(1, 1);
  const wallM = K.std({ map: T.wall('#4f6b68', '#aebfb8', '#2a3a38') }), wallB = K.std({ map: T.wall('#4a4a46', '#8a8a82', '#222') });
  const floor = (x0, x1, z0, z1) => { const m = K.floor(x0, x1, z0, z1, floorM.clone()); m.material.map = floorM.map.clone(); m.material.map.needsUpdate = true; m.material.map.repeat.set(Math.abs(x1 - x0) / 2.4, Math.abs(z1 - z0) / 2.4); return m; };
  const W = (a, b, c, d, gaps, o = {}) => K.wall(a, b, c, d, gaps, Object.assign({ mat: wallM }, o));
  // ---- floors + ceilings
  [[-5, 5, -2900, -2916], [-16, 16, -2916, -2966], [-16, 16, -2966, -3016], [-12, 12, -3016, -3070], [-16.8, -12, -3016, -3070], [12, 16.8, -3016, -3070], [-6, 6, -3070, -3084]].forEach(([a, b, c, d]) => { floor(a, b, c, d); K.ceil(a, b, c, d); });
  // ---- walls
  W(-5.2, -2900, 5.2, -2900, []); W(-5.2, -2900, -5.2, -2916, []); W(5.2, -2900, 5.2, -2916, []); W(-16.2, -2916, -5.2, -2916, []); W(5.2, -2916, 16.2, -2916, []); // landing + morgue north
  const doorMorgue = [[0, 3.2]]; W(-5.2, -2916, 5.2, -2916, doorMorgue);
  W(-16.2, -2916, -16.2, -3016, [], { mat: wallB }); W(16.2, -2916, 16.2, -3016, [], { mat: wallB });
  W(-16.2, -2966, 16.2, -2966, [[10, 3.2]], { mat: wallB }); // morgue -> boiler (door x=10)
  W(-16.2, -3016, 16.2, -3016, [[0, 3.6]], { mat: wallB }); // boiler -> hall (door x=0, sound-lock)
  W(-16.8, -3016, -16.8, -3070, [], { mat: wallB }); W(16.8, -3016, 16.8, -3070, [], { mat: wallB }); // outer walls of the two cell wings
  W(-16.8, -3070, -6.2, -3070, [], { mat: wallM }); W(6.2, -3070, 16.8, -3070, [], { mat: wallM }); // hall south wall (Mom's cell front is glass between)
  W(-6.2, -3070, -6.2, -3084, []); W(6.2, -3070, 6.2, -3084, []); W(-6.2, -3084, 6.2, -3084, []);
  // ---- lights: dark + red emergency until the breakers are thrown
  H.lamps.length = 0; [[0, -2908], [0, -2928], [-9, -2948], [9, -2936], [0, -2976], [-10, -2996], [10, -3006], [0, -3032], [0, -3052], [0, -3076]].forEach(([x, z], i) => K.lamp(x, z, { flicker: i % 3 === 0, light: [7, 1, 4, 9, 2].slice(0, H.budget).includes(i) }));
  [[-4, -2902], [4, -2914], [-15, -2918], [15, -2964], [-15, -2968], [15, -3014], [-11, -3018], [11, -3068], [-5, -3082]].forEach(([x, z]) => K.emergency(x, z));
  const ePl = [[0, -2940], [0, -3035]].map(([x, z]) => { const l = new THREE.PointLight('#ff2a18', 0, 16, 1.8); l.position.set(x, 3, z); scene.add(l); return l; });
  H.setPower = (on) => { H.on = on; H.level = on ? 1 : 0; H.lamps.forEach(L => { L.m.emissiveIntensity = on ? L.on : 0; if (L.light) L.light.intensity = on ? L.I : 0; }); H.emerg.forEach(m => m.material.emissiveIntensity = on ? .5 : 2.4); ePl.forEach((l, i) => l.intensity = on ? 0 : (3.2)); };
  // ---- landing: stair rail + door + sign
  { const D = new Decor(7); D.box(-4.5, .5, -2903.5, .1, 1.0, 5, '#6a6e70'); D.box(-3, .08, -2902, 4, .16, .6, '#555'); D.box(-3, .24, -2902.3, 4, .16, .6, '#5a5a5a'); D.box(-3, .4, -2902.6, 4, .16, .6, '#606060'); scene.add(D.build()); }
  H.sign(['SUBLEVEL B', 'AUTHORIZED PERSONNEL'], 0, 2.9, -2915.7, 0, 4.8, .9, '#12302e'); H.sign(['MORGUE'], -3.2, 2.3, -2916.3, PI, 1.6, .4, '#222a2a');
  // ---- morgue
  { const D = new Decor(21); const G = [[-10, -2928, 0, 1], [3, -2926, .1, 1], [-4, -2938, PI / 2, 1], [9, -2938, -.2, 0], [-12.5, -2946, .15, 1], [-6, -2952, PI, 1], [4, -2948, .1, 0], [11, -2954, 0, 1], [-1, -2959, PI / 2, 1]];
    G.forEach(([x, z, ry, body], i) => { gurney(D, x, z, ry, { body, blood: i % 2 === 0, arm: i === 3 || i === 6, flat: !body }); const c = Math.abs(Math.cos(ry)) > .7; K.col(x - (c ? .45 : 1.1), x + (c ? .45 : 1.1), z - (c ? 1.1 : .45), z + (c ? 1.1 : .45)); });
    // cold-drawer wall (west) with a few pulled out
    for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) { const z = -2919.4 - c * 1.2 - 0, y = .48 + r * .62, out = (r === 1 && c === 2) || (r === 0 && c === 6) || (r === 2 && c === 4); D.box(-15.6, y, z - .05, .12, .54, 1.04, '#aab0b4'); D.box(-15.52, y, z - .05, .03, .06, .26, '#40464a'); D.box(-15.62, y + .22, z - .05, .02, .08, .5, '#fff'); if (out) { D.box(-14.9, y, z - .05, 1.3, .06, .8, '#aab0b4'); D.box(-14.9, y + .12, z - .05, 1.2, .14, .6, '#e6e3da'); D.sph(-14.4, y + .15, z - .05, .17, .11, .17, '#e6e3da'); } }
    K.col(-16.2, -14.2, -2969, -2919);
    // central block of lab tables + autopsy light rigs, bins
    [[2.5, 8.5], [-8.5, 2.2]].forEach(() => { }); D.box(-14.5, .5, -2963, .9, 1.0, 1.3, '#7a8084'); D.box(14.8, .5, -2963.5, 1.0, 1.0, 1.2, '#7a8084'); K.col(-15, -14, -2963.7, -2962.3); K.col(14.3, 15.3, -2964.1, -2962.9);
    [[13.6, -2920.5], [14.6, -2926]].forEach(([x, z]) => { D.cyl(x, .35, z, .3, .7, '#3a4448', 0, 0, 0, .27, 12); D.cyl(x, .72, z, .31, .05, '#8a9094', 0, 0, 0, .31, 12); });
    D.box(14.4, .05, -2922.8, 1.4, .01, 1.2, '#3a0808'); // dried puddle
    // barrels of "specimen jars" + wall clock
    const clock = new THREE.Mesh(new THREE.CircleGeometry(.4, 20), K.std({ color: '#d8d8c8' })); clock.position.set(15.9, 2.6, -2940); clock.rotation.y = -PI / 2; scene.add(clock);
    scene.add(D.build()); }
  // blood smears at the morgue door
  { const bl = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.2), new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (g, w, h) => { for (let i = 0; i < 18; i++) { const r = 6 + Math.random() * 18; g.fillStyle = `rgba(${90 + Math.random() * 30},6,6,${.25 + Math.random() * .5})`; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, r, r * .6, Math.random() * 3, 0, 7); g.fill(); } }), transparent: true, depthWrite: false })); bl.rotation.x = -PI / 2; bl.position.set(0, .05, -2918); scene.add(bl); }
  // ---- boiler room
  { const D = new Decor(33); const tankM = K.std({ color: '#7a5a46', metalness: .5, roughness: .55 }), steelM = K.std({ color: '#6c7478', metalness: .6, roughness: .45 });
    [[-11, -2978], [-3, -2982], [-12, -3000], [11.5, -2980], [7, -2998]].forEach(([x, z], i) => { const r = i === 3 ? 2 : 1.5, h = 2.9; const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), i % 2 ? tankM : steelM); t.position.set(x, h / 2, z); t.castShadow = true; scene.add(t); const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 8, 0, PI * 2, 0, PI / 2), t.material); cap.position.set(x, h, z); scene.add(cap);
      K.col(x - r, x + r, z - r, z + r); for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(r + .04, r + .04, .1, 20), K.M.dark); b.position.set(x, .5 + k * .9, z); scene.add(b); }
      const door = new THREE.Mesh(new THREE.BoxGeometry(.7, .6, .1), K.std({ color: '#2a1a10', emissive: '#ff6a18', emissiveIntensity: i === 0 || i === 3 ? 1.6 : .15 })); door.position.set(x, .6, z + (i % 2 ? r : -r)); scene.add(door); });
    // overhead pipes + valves
    [[-2972, '#8a5a3a'], [-2990, '#6a7a80'], [-3008, '#8a5a3a']].forEach(([z, c]) => { D.cyl(0, 3.05, z, .14, 31, c, 0, 0, PI / 2, .14, 10); [-12, -4, 6, 12].forEach((x, k) => { D.cyl(x, 2.7, z, .1, .7, c); D.cyl(x, 2.25, z, .26, .06, '#a01810', PI / 2, 0, 0, .26, 10); }); });
    D.cyl(15.5, 1.6, -2985, .18, 3.2, '#6a7a80'); D.cyl(-15.5, 1.6, -3005, .18, 3.2, '#8a5a3a');
    // crates, jerry cans, a toppled gurney barricade, lockers
    [[-14, -2970], [14.5, -2970], [14.6, -3008], [-14.6, -3013]].forEach(([x, z], i) => { D.box(x, .45, z, 1.2, .9, 1.2, '#6a5030'); D.box(x, 1.1, z + (i % 2 ? .1 : -.1), .8, .5, .8, '#7a5a38'); K.col(x - .6, x + .6, z - .6, z + .6); });
    gurney(D, 5, -2973, 2.4, { body: 0, flat: 1 }); K.col(3.8, 6.2, -2974.4, -2971.6);
    // breaker panel on the wall by the sound-lock door
    D.box(6.5, 1.5, -3014.9, 1.3, 1.5, .18, '#5a6064'); D.box(6.5, 1.5, -3014.78, 1.1, 1.3, .04, '#2a2e30'); for (let i = 0; i < 6; i++) D.box(6.1 + i * .16, 1.55, -3014.74, .08, .36, .04, i % 2 ? '#d8c030' : '#9a3a2a'); D.box(6.5, 2.05, -3014.74, .8, .16, .04, '#d8c030');
    R.panelPos = [6.5, -3013.6]; scene.add(D.build()); }
  [[-11, -2978, 1.6], [11.5, -2980, 1.6]].forEach(([x, z]) => { const L = new THREE.PointLight('#ff7a30', 5, 14, 1.8); L.position.set(x, 1.1, z + (x < 0 ? -1.9 : 2.4)); L.userData.fire = true; scene.add(L); H.lamps.push({ m: { emissiveIntensity: 0 }, light: L, I: 5, on: 0, fire: true }); });
  H.sign(['BOILER ROOM', 'BREAKERS ->'], -3, 2.6, -2965.74, 0, /* v1.9.28: was behind the wall face */ 3, .8, '#4a2a10'); H.sign(['RESEARCH WING', 'SOUND-LOCK'], 0, 2.9, -3016.3, PI, 3.2, .8, '#10304a');
  R.doorBoiler = K.door(10, -2966, 3.2, 'x', K.M.steel); R.doorBoiler.set(true); // morgue->boiler stays open
  R.doorHall = K.door(0, -3016, 3.6, 'x', K.M.steel); // sound-lock, opens when power comes back
  // ---- research hall: glass cells both sides + Mom's cell
  { const D = new Decor(51); const P7 = 54 / 7, zs = []; for (let i = 0; i < 7; i++) zs.push(-3016 - P7 / 2 - i * P7);
    zs.forEach((zc, i) => { [-1, 1].forEach(sd => { const xf = sd * 12.0, xb = sd * 16.8; K.wall(xf, zc - P7 / 2, xb, zc - P7 / 2, [], { mat: wallB, th: .3 }); const x0 = sd * 12.0;
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(P7 - .3, 2.7), M.glass); glass.rotation.y = PI / 2; glass.position.set(x0, 1.5, zc); scene.add(glass);
        const fr = (y, hh) => { const f = new THREE.Mesh(new THREE.BoxGeometry(.12, hh, P7 - .2), M.frame); f.position.set(x0, y, zc); scene.add(f); }; fr(.1, .2); fr(2.9, .3); for (let b = -3; b <= 3; b += 1.2) { const bar = new THREE.Mesh(new THREE.BoxGeometry(.1, 2.9, .08), M.frame); bar.position.set(x0, 1.5, zc + b); scene.add(bar); }
        const c = K.col(x0 - .1, x0 + .1, zc - P7 / 2 + .1, zc + P7 / 2 - .1); R.cells.push({ glass, col: c, x: sd * 14.4, z: zc, sd, broken: false }); cot(D, sd * 15.6, zc + 1.4, PI / 2 * sd); toilet(D, sd * 16.3, zc - 2.5, -PI / 2 * sd); D.box(sd * 16.6, 1.2, zc - .5, .04, .5, 2, '#5a1010'); }); });
    H.sign(['CELL BLOCK 3'], -11.9, 2.9, -3042, PI / 2, 2, .5, '#222'); scene.add(D.build()); }
  R.breakCell = (c) => { if (c.broken) return; c.broken = true; c.glass.visible = false; Object.assign(c.col, { x0: 9999, x1: 9999, z0: 9999, z1: 9999 }); };
  { const D = new Decor(62); chair(D, 5.35, -3073.4, -PI / 2, '#6a7c8a'); scene.add(D.build()); K.col(5.1, 5.6, -3073.7, -3073.1); } // the chair Dad drops into in the reunion
  { // Mom's cell: glass front with door + hatch
    const front = new THREE.Group(); for (const sx of [-1, 1]) { const pn = new THREE.Mesh(new THREE.PlaneGeometry(4.9, 2.8), M.glass); pn.position.set(sx * 3.55, 1.5, -3070.05); front.add(pn); } scene.add(front);
    const D = new Decor(61); D.box(0, 3.0, -3070.0, 12.2, .4, .3, '#4a5054'); D.box(-5.9, 1.5, -3070.0, .3, 3, .3, '#4a5054'); D.box(5.9, 1.5, -3070.0, .3, 3, .3, '#4a5054'); D.box(-1.1, 1.5, -3070.05, .12, 3, .3, '#4a5054'); D.box(1.1, 1.5, -3070.05, .12, 3, .3, '#4a5054');
    bed(D, -3.6, -3079, PI / 2, '#c0a8c0'); D.box(3.8, .5, -3081.4, 2, 1.0, .8, '#7a8084'); D.box(3.8, 1.05, -3081.4, 1.7, .1, .6, '#e8e2d2'); D.box(5.7, 1.0, -3076, .1, .8, .6, '#d8d4c0'); // a counter with a blanket, a window-less light box
    D.cyl(-4.9, 1.2, -3082.5, .05, 2, '#222'); // IV pole
    // a wall of children's drawings (Keem's mom has been waiting a long time): crayon family, sun, rabbit
    { const t = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#efe6cf'; g.fillRect(0, 0, w, h); g.strokeStyle = '#555'; g.lineWidth = 2; g.strokeRect(2, 2, w - 4, h - 4);
        g.fillStyle = '#ffd23a'; g.beginPath(); g.arc(440, 50, 28, 0, 7); g.fill(); g.fillStyle = '#7ac860'; g.fillRect(0, 200, w, 56);
        const fig = (x, y, s, c) => { g.strokeStyle = c; g.fillStyle = c; g.lineWidth = 5; g.beginPath(); g.arc(x, y - 52 * s, 13 * s, 0, 7); g.stroke(); g.beginPath(); g.moveTo(x, y - 38 * s); g.lineTo(x, y); g.moveTo(x - 20 * s, y - 24 * s); g.lineTo(x + 20 * s, y - 24 * s); g.moveTo(x, y); g.lineTo(x - 14 * s, y + 30 * s); g.moveTo(x, y); g.lineTo(x + 14 * s, y + 30 * s); g.stroke(); };
        fig(110, 150, 1.3, '#d03a2a'); fig(190, 160, 1.1, '#3a6ad0'); fig(262, 190, .8, '#a03ad0'); fig(330, 165, 1.2, '#2a9a3a'); g.fillStyle = '#c8a27a'; g.beginPath(); g.ellipse(390, 215, 16, 11, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(380, 196, 4, 14, -.2, 0, 7); g.ellipse(392, 196, 4, 14, .2, 0, 7); g.fill();
        g.fillStyle = '#333'; g.font = 'bold 26px sans-serif'; g.fillText('MY FAMILY', 150, 36); });
      const dm = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.7), new THREE.MeshStandardMaterial({ map: t, roughness: 1 })); dm.rotation.y = PI / 2; dm.position.set(-5.88, 1.7, -3077); scene.add(dm); }
    scene.add(D.build()); R.cellFront = front;
    K.col(-6, -1.1, -3070.15, -3069.95); K.col(1.1, 6, -3070.15, -3069.95); R.doorCell = K.door(0, -3070.05, 2.1, 'x', K.M.glass, 2.7);
    // hatch (a slot cut into the door) drawn as a dark rectangle + a flap
    const slot = new THREE.Mesh(new THREE.BoxGeometry(.5, .28, .08), K.std({ color: '#050808' })); slot.position.set(0, 1.35, -3069.93); scene.add(slot); R.hatch = slot;
    H.sign(['SUBJECT 02', 'DANA PELL'], 0, 2.5, -3069.8, PI, 2.2, .7, '#3a1a1a');
    const L = new THREE.PointLight('#d8e8ff', 0, 12, 1.7); L.position.set(0, 3, -3077); scene.add(L); H.lamps.push({ m: { emissiveIntensity: 0 }, light: L, I: 8, on: 0 });
    // a vent grille for Nia (hall west wall near the door) and its exit inside the cell block
    const vent = (x, z, ry) => { const g = new THREE.Mesh(new THREE.BoxGeometry(.8, .6, .08), K.std({ color: '#555b60', metalness: .6, roughness: .5 })); g.position.set(x, .45, z); g.rotation.y = ry; scene.add(g); for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(.7, .04, .1), K.M.dark); s.position.set(x, .25 + i * .1, z); s.rotation.y = ry; scene.add(s); } return g; };
    R.vents.a = vent(-11.95, -3021, PI / 2); R.vents.b = vent(5.9, -3073.2, -PI / 2);
  }
  R.hallLit = H;
  R.setPower = H.setPower; H.setPower(false);
  R.power = H;
  return R;
}

// ================== Chapter 13 · Biscuit Goes Rogue ==================
// pack room -3300..-3092 · gift shop -3332..-3134 · children's ward -3374..-3206 · cafeteria -3446..-3268
export const B13 = { zP: -3300, zG: -3332, zW: -3374, zC: -3446, zE: -3508 };
export function buildUpper(H0) {
  const H = Object.assign({ on: true, level: 1, lamps: [], emerg: [], budget: Math.min(H0.Q.lamps, 6) }, H0); H.lampBudget = (d = 0) => (H.budget += d);
  const K = kit(H), { M, T } = K, scene = H0.scene; const R = { cells: [] };
  const mk = (a, b, c) => K.std({ map: T.wall(a, b, c) });
  const wP = mk('#5a8a94', '#d4e2dc', '#e8d070'), wG = mk('#a05a7a', '#f0dcc8', '#40a0b0'), wW = mk('#e8b840', '#f6ecd0', '#e86a4a'), wC = mk('#7a9a6a', '#ece6d0', '#c04a3a');
  const flr = (mat, x0, x1, z0, z1) => { const m = K.floor(x0, x1, z0, z1, Object.assign(mat.clone(), {})); m.material.map = mat.map.clone(); m.material.map.needsUpdate = true; m.material.map.repeat.set(Math.abs(x1 - x0) / 2.4, Math.abs(z1 - z0) / 2.4); return m; };
  const fl1 = K.std({ map: T.tile('#c8c8bc', '#c3c3b7', '#acaca0'), roughness: .45 }), fl2 = K.std({ map: T.tile('#e8d8a8', '#e4d4a4', '#c8ba8c'), roughness: .5 }), fl3 = K.std({ map: T.tile('#c9cdc0', '#c5c9bc', '#b2b8a8'), roughness: .5 });
  const rooms = [[-14, 14, -3300, -3332, wP, fl1, 3.6], [-14, 14, -3332, -3374, wG, fl2, 3.6], [-8, 8, -3374, -3446, wW, fl2, 3.4], [-16, 16, -3446, -3508, wC, fl3, 4.2]];
  rooms.forEach(([a, b, c, d, w, f, h]) => { flr(f, a, b, c, d); K.ceil(a, b, c, d, h); });
  const W = (a, b, c, d, gaps, mat, h) => K.wall(a, b, c, d, gaps, { mat, h: h || WH });
  // pack room
  W(-14.2, -3300, 14.2, -3300, [], wP); W(-14.2, -3300, -14.2, -3332, [], wP); W(14.2, -3300, 14.2, -3332, [], wP); W(-14.2, -3332, 14.2, -3332, [[0, 4]], wP);
  // gift shop
  W(-14.2, -3332, -14.2, -3374, [], wG); W(14.2, -3332, 14.2, -3374, [], wG); W(-14.2, -3374, 14.2, -3374, [[0, 3.6]], wG);
  // children's ward corridor: side rooms
  W(-8.2, -3374, -8.2, -3446, [[-3390, 3], [-3408, 3], [-3426, 3]], wW, 3.4); W(8.2, -3374, 8.2, -3446, [[-3390, 3], [-3408, 3], [-3426, 3]], wW, 3.4);
  // side rooms (x beyond the corridor): 6 rooms 8 wide, 12 deep
  [[-1, -3390], [-1, -3408], [-1, -3426], [1, -3390], [1, -3408], [1, -3426]].forEach(([sd, zc]) => { const x0 = sd * 8.2, x1 = sd * 16.2; flr(fl2, Math.min(x0, x1), Math.max(x0, x1), zc - 9, zc + 9 > -3374 ? -3374 : zc + 9); });
  [-3381, -3399, -3417, -3435].forEach(z => { [-1, 1].forEach(sd => { W(sd * 8.2, z, sd * 16.2, z, [], wW, 3.4); }); }); [-1, 1].forEach(sd => W(sd * 16.2, -3372, sd * 16.2, -3437, [], wW, 3.4));
  [-1, 1].forEach(sd => K.ceil(Math.min(sd * 8.2, sd * 16.2), Math.max(sd * 8.2, sd * 16.2), -3374, -3437, 3.4));
  W(-8.2, -3446, 8.2, -3446, [[0, 4]], wW, 3.4); // ward -> cafeteria
  // cafeteria
  W(-16.2, -3446, -16.2, -3508, [], wC, 4.2); W(16.2, -3446, 16.2, -3508, [], wC, 4.2); W(-16.2, -3508, 16.2, -3508, [], wC, 4.2); W(-16.2, -3446, -8.2, -3446, [], wC, 4.2); W(8.2, -3446, 16.2, -3446, [], wC, 4.2);
  // lamps (hospital is lit up here)
  [[0, -3308], [-8, -3320], [8, -3320], [0, -3340], [-8, -3358], [8, -3358], [0, -3385], [0, -3405], [0, -3430], [-9, -3466], [9, -3466], [0, -3486], [-9, -3496], [9, -3496]].forEach(([x, z], i) => K.lamp(x, z, { color: i > 5 && i < 10 ? '#fff0d0' : '#f0f8ff', I: 11, flicker: i === 3 || i === 7, light: [0, 3, 6, 7, 10, 12].includes(i), r: 18, y: i > 9 ? 4.1 : i > 5 ? 3.3 : 3.5 }));
  H.setPower = () => { }; // always on
  // pack room decor: couches, cooler on a table, medical cart, window blinds
  { const D = new Decor(71); [[-9, -3306, PI], [9, -3306, PI]].forEach(([x, z, ry]) => { D.push(x, 0, z, ry); D.box(0, .22, 0, 2.6, .4, .95, '#4a6a8a'); D.box(0, .72, .4, 2.6, .6, .22, '#43607e'); D.box(-1.2, .52, 0, .2, .6, .95, '#4a6a8a'); D.box(1.2, .52, 0, .2, .6, .95, '#4a6a8a'); D.pop(); K.col(x - 1.4, x + 1.4, z - .5, z + .5); });
    table(D, 0, -3316, 3.2, 1.2, '#d8d0b8'); K.col(-1.6, 1.6, -3316.6, -3315.4); // cooler: white body with a red lid
    D.box(-.7, .98, -3316, .9, .42, .55, '#e8e8e4'); D.box(-.7, 1.22, -3316, .94, .08, .6, '#c0382a'); D.box(-.7, 1.05, -3315.7, .3, .08, .02, '#30a0d0');
    D.box(.8, .92, -3316.2, .5, .26, .4, '#c0a060'); D.box(1.1, .93, -3315.8, .3, .2, .3, '#e8d8a8'); // meds bag + supplies
    [-12, 12].forEach(x => { D.box(x, 1.6, -3300.1, 2, 1.6, .04, '#a8c4d0'); for (let i = 0; i < 9; i++) D.box(x, .95 + i * .14, -3300.14, 1.9, .012, .01, '#6a8a98'); }); // windows with blinds
    teddy(D, 10, .0, -3326, .5, '#e8a0b8', 2.2); vending(D, -13, -3326, PI / 2, '#3a7aa0'); K.col(-13.6, -12.4, -3326.5, -3325.5); scene.add(D.build()); }
  // gift shop: shelves, counter, balloons, a lane for the rolling gurney
  { const D = new Decor(81); [-10, 10].forEach(x => { [-3339, -3348].forEach((z, k) => { shelf(D, x, z, PI / 2 * (x < 0 ? 1 : -1), 4.4, 4, k + x); K.col(x - .3, x + .3, z - 2.2, z + 2.2); }); });
    shelf(D, 0, -3372.8, PI, 6, 4, 3); K.col(-3, 3, -3373, -3372.4); // back wall shelf (door gap stays at +-1.8)
    D.box(0, .55, -3337, 4.4, 1.1, .8, '#6a4a30'); D.box(0, 1.12, -3337, 4.6, .06, .9, '#d8d0b8'); K.col(-2.2, 2.2, -3337.5, -3336.5); D.box(-1.2, 1.3, -3337, .34, .3, .3, '#2a3a4a'); teddy(D, 1.2, 1.15, -3337, PI, '#b8844a', 1.6); // counter + till + big teddy
    [[-12, -3358], [12, -3358], [-12, -3368], [12, -3366]].forEach(([x, z], i) => { D.push(x, 0, z, 0); D.box(0, .6, 0, 1.6, 1.2, .6, '#b0805a'); for (let k = 0; k < 6; k++) teddy(D, -.65 + k * .26, 1.2, 0, 0, ['#e8a0b8', '#a0c0e8', '#e8d070', '#b8844a', '#c0e0a0', '#e0a070'][k], 1.1); D.pop(); K.col(x - .9, x + .9, z - .4, z + .4); });
    D.box(0, .01, -3352, 3, .01, 20, '#cfc7a8'); scene.add(D.build()); }
  // Biscuit-sized hiding spot sign + ward murals + beds
  { const D = new Decor(91); [[-12, -3390], [12, -3390], [-12, -3408], [12, -3408], [-12, -3426], [12, -3426]].forEach(([x, z], i) => { bed(D, x + (x < 0 ? 1 : -1) * 1.5, z + 2, PI / 2 * (x < 0 ? 1 : -1), ['#e8a0b8', '#a0c0e8', '#e8d070'][i % 3]); bed(D, x + (x < 0 ? 1 : -1) * 1.5, z - 2.4, PI / 2 * (x < 0 ? 1 : -1), ['#a0e0b0', '#e8a070', '#c0a0e8'][i % 3]); K.col(x - 1.1, x + 1.1, z + 1.6, z + 2.4); K.col(x - 1.1, x + 1.1, z - 2.8, z - 2.0); teddy(D, x, .0, z, i, ['#e8a0b8', '#a0c0e8'][i % 2], 1.8); });
    // a wheelchair + IV poles + toy blocks in the corridor
    [[-4, -3382], [3, -3416], [-5, -3439]].forEach(([x, z], i) => { D.cyl(x, 1.0, z, .03, 2, '#bbb'); D.cyl(x, .04, z, .3, .04, '#555', 0, 0, 0, .3, 10); D.box(x, 1.8, z, .3, .4, .06, '#d8f0ff'); });
    for (let i = 0; i < 14; i++) D.box(rnd(-3, 3), .07, -3375 - rnd(0, 66), .14, .14, .14, ['#e84a3a', '#f0c030', '#40b060', '#4a90e0'][i % 4], 0, rnd(0, 3), 0); scene.add(D.build()); }
  // murals (canvas)
  { const mural = (x, z, ry, w, kind) => { const t = canvasTex(256, 128, (g, W2, Hh) => { g.fillStyle = ['#bfe6f5', '#ffe9b0', '#d8f0c8'][kind % 3]; g.fillRect(0, 0, W2, Hh); g.fillStyle = '#7ac860'; g.beginPath(); g.ellipse(60, Hh, 120, 36, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(210, Hh, 110, 30, 0, 0, 7); g.fill();
      g.fillStyle = '#ffd23a'; g.beginPath(); g.arc(200, 34, 20, 0, 7); g.fill(); ['#e84a3a', '#f0a030', '#f0e040', '#40b060', '#4a90e0'].forEach((c, i) => { g.strokeStyle = c; g.lineWidth = 5; g.beginPath(); g.arc(90, 100, 56 - i * 6, Math.PI, 0); g.stroke(); });
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(180, 98, 18, 11, 0, 0, 7); g.arc(168, 92, 7, 0, 7); g.fill(); g.fillStyle = '#f0a0c0'; g.beginPath(); g.arc(150, 84, 6, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillRect(146, 60, 5, 22); g.fillRect(155, 60, 5, 22); }); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 2), new THREE.MeshStandardMaterial({ map: t, roughness: .9 })); m.position.set(x, 1.9, z); m.rotation.y = ry; scene.add(m); };
    [-3385, -3403, -3421, -3439].forEach((z, i) => { mural(-7.95, z, PI / 2, 4.8, i); mural(7.95, z - 2, -PI / 2, 4.8, i + 1); }); H.sign(["CHILDREN'S WARD", 'PLEASE USE YOUR INDOOR VOICE'], 0, 3.0, -3373.7, 0, 3.4, .9, '#1a5a8a'); H.sign(['GIFT SHOP', 'BALLOONS - TEDDIES - SOUP MUGS'], 0, 3.0, -3332.26, PI, /* v1.9.28: was facing into the door header */ 3.6, .9, '#8a2a5a'); H.sign(['CAFETERIA', 'TODAY: MEATLOAF'], 0, 3.2, -3445.7, 0, 3.4, .9, '#5a3a1a'); }
  // cafeteria: tables, serving line, soup kettles
  { const D = new Decor(101); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { const x = -10 + c * 10, z = -3460 - r * 10; if (r === 1 && c === 1) continue; table(D, x, z, 3, 1.1); K.col(x - 1.5, x + 1.5, z - .55, z + .55); [-1, 1].forEach(sd => { chair(D, x - 1, z + sd * .9, sd > 0 ? PI : 0, '#d8734a'); chair(D, x + 1, z + sd * .9, sd > 0 ? PI : 0, '#4a90c8'); }); D.cyl(x + .4, .8, z, .08, .12, '#cc3a2a'); D.cyl(x - .5, .8, z + .1, .07, .1, '#e8d070'); }
    // serving counter along the south wall with soup kettles
    D.box(0, .55, -3498, 24, 1.1, 1.6, '#8a8e90'); D.box(0, 1.12, -3498, 24.4, .08, 1.8, '#4a4e50'); K.col(-12.2, 12.2, -3498.9, -3497.1); D.box(0, 2.0, -3502, 24, 2.2, .6, '#6a7a6a'); // sneeze-guard shelf wall
    for (let i = 0; i < 4; i++) { const x = -9 + i * 6; D.cyl(x, 1.55, -3498, 1.0, .9, '#a8acae', 0, 0, 0, 1.0, 18); D.cyl(x, 2.05, -3498, 1.04, .08, '#8a8e90', 0, 0, 0, 1.04, 18); D.cyl(x, 2.14, -3498, .12, .1, '#222'); D.cyl(x, 1.75, -3498.7, .06, .3, '#555', PI / 2); }
    D.box(0, 2.9, -3506.5, 18, 1.1, .2, '#d8d0b0');  // menu board backing
    R.kettles = [-9, -3, 3, 9].map(x => [x, 2.2, -3498]);
    H.sign(['TODAY', 'MEATLOAF MONDAY', 'SOUP: ALWAYS'], 0, 3.1, -3506.35, 0, 8, 1.4, '#3a2a1a'); scene.add(D.build()); }
  K.col(-16.2, -14, -3490, -3446); // salad bar
  R.lamps = H.lamps; R.K = K; return R;
}
