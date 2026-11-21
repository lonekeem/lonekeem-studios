import * as THREE from 'three';
import { signTex, grassBladeTex, rnd, canvasTex } from './util.js';
import { ZONE_BUILDERS } from './chapters/index.js';
import { furnishKeemHouse } from './interiors.js';
import { makeEnv } from './env.js';

// Riverside, Maine — procedural night town built from CC0 Poly Haven PBR textures.
export function buildWorld(scene, Q, texLoader, base, CM = {}) {
  const colliders = [], walls = [], updaters = [], lights = [], signList = []; const flags = { indoor: false }; // indoor (hospital chapters 12-13): no rain, no sky — set by game.setLight()
  const T = (n, rep = 1, srgb = true) => { const t = texLoader.load(base + 'tex/' + n + '.jpg'); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Q.aniso; return t; };
  const pbr = (n, rep, o = {}) => { const m = new THREE.MeshStandardMaterial(Object.assign({ map: T(n + '_diff', rep), roughness: 1 }, o));
    if (Q.normals) { m.normalMap = T(n + '_nor_gl', rep, false); m.normalScale = new THREE.Vector2(o.ns || 1, o.ns || 1); }
    if (o.rough) m.roughnessMap = T(n + '_rough', rep, false); return m; };
  const box = (x0, x1, z0, z1) => colliders.push({ x0, x1, z0, z1 });
  const env = makeEnv(scene, Q, T, pbr); const extraTrees2 = []; // v2.1 environment visuals

  // ground
  const groundMat = env.groundMat();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), groundMat); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const mudMat = new THREE.MeshStandardMaterial({ map: T('mud_forest_diff', 3), color: '#a89a88', transparent: true, alphaMap: canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 10, 64, 64, 64); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, false), depthWrite: false, roughness: .55 });
  const mud = []; for (let i = 0; i < 26; i++) { const s = rnd(5, 14); const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), mudMat); m.rotation.x = -Math.PI / 2; m.rotation.z = rnd(0, 6); m.position.set(rnd(-8, 8) + (Math.random() < .5 ? -12 : 12), 0.012, rnd(-140, 60)); m.receiveShadow = true; scene.add(m); mud.push([m.position.x, m.position.z, (s * .4) ** 2]); }

  // roads (wet asphalt)
  const roadMat = (rx, rz) => { const m = pbr('asphalt_02', 1, { rough: true, color: '#6c6f6c', roughness: 0.55, envMapIntensity: 1.4 }); m.map.repeat.set(rx, rz); if (m.normalMap) m.normalMap.repeat.set(rx, rz); m.roughnessMap.repeat.set(rx, rz); return m; };
  const road = (cx, cz, w, d) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat(w / 6, d / 6)); m.rotation.x = -Math.PI / 2; m.position.set(cx, 0.02, cz); m.receiveShadow = true; scene.add(m); env.road(cx, cz, w, d); };
  road(0, -45, 11, 220); road(0, 4, 90, 9);
  const lineMat = new THREE.MeshBasicMaterial({ color: '#a89a52', transparent: true, opacity: .55 });
  for (let z = 60; z > -150; z -= 6) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 2.6), lineMat); l.rotation.x = -Math.PI / 2; l.position.set(0, 0.025, z); scene.add(l); }
  // sidewalks
  const swMat = new THREE.MeshStandardMaterial({ color: '#4d4f4b', roughness: .8 });
  const swConc = new THREE.MeshStandardMaterial({ map: T('cracked_concrete_diff', 1), color: '#8f918a', roughness: .92 }); swConc.map.repeat.set(1, 90);
  [-6.6, 6.6].forEach(x => { const s = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 200), swConc); s.position.set(x, 0.06, -42); s.receiveShadow = true; scene.add(s); });
  // puddles
  const pudMat = new THREE.MeshStandardMaterial({ color: '#0b0d0c', roughness: 0.04, metalness: 0.2, envMapIntensity: 2.2 });
  for (let i = 0; i < 30; i++) { const p = new THREE.Mesh(new THREE.CircleGeometry(rnd(0.6, 2.2), 20), pudMat); p.scale.y = rnd(0.5, 1); p.rotation.x = -Math.PI / 2; p.position.set(rnd(-5, 5), 0.03, rnd(-140, 55)); scene.add(p); }

  // houses
  const sidingCols = ['#b8b5a8', '#8c9aa0', '#9b8a76', '#7d8a77', '#a49c8e', '#6e6a68'];
  const plankMat = (c) => pbr('weathered_planks', 1, { color: c, roughness: .9 });
  const roofMat = pbr('asphalt_02', 3, { color: '#3a3532', roughness: .9 });
  const boardMat = pbr('weathered_planks', 1, { color: '#7a6248' });
  const winDark = new THREE.MeshStandardMaterial({ color: '#0a0c0c', roughness: .1, metalness: .4, envMapIntensity: 1.2 });
  const winLit = new THREE.MeshStandardMaterial({ color: '#221a10', emissive: '#ff9a40', emissiveIntensity: .7 });
  const houseList = [], carList = []; // town life: registries read by townlife.js (hinged doors, parked cars)
  const wallBox = (w, h, d, mat, x, y, z, solid = true) => { const geo = new THREE.BoxGeometry(w, h, d); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(w, d) / 2.5, uv.getY(i) * h / 2.5);
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; scene.add(m); if (solid) { box(x - w / 2, x + w / 2, z - d / 2, z + d / 2); walls.push(m); } return m; };
  const gable = (cx, cz, w, d, y, alongZ, mat) => { const s = new THREE.Shape(); const span = alongZ ? w : d; s.moveTo(-span / 2 - .4, 0); s.lineTo(span / 2 + .4, 0); s.lineTo(0, span * .42); s.lineTo(-span / 2 - .4, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: (alongZ ? d : w) + .6, bevelEnabled: false }); g.translate(0, 0, -((alongZ ? d : w) + .6) / 2); const m = new THREE.Mesh(g, mat); m.position.set(cx, y, cz); if (!alongZ) m.rotation.y = Math.PI / 2; m.castShadow = true; m.receiveShadow = true; scene.add(m); return m; };
  const boards = (x, y, z, along, n = 4, wid = 1.6) => { for (let i = 0; i < n; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(along === 'z' ? 0.06 : wid, 0.16, along === 'z' ? wid : 0.06), boardMat); b.position.set(x, y - 0.45 + i * 0.3, z); b.rotation[along === 'z' ? 'x' : 'z'] = rnd(-.15, .15); b.castShadow = true; scene.add(b); } };
  // generic house: face = direction of front door (+1 = facing +x, -1 = facing -x)
  function house(cx, cz, w, d, face, col, lit = false, board = true) {
    const h = 3.0, mat = plankMat(col); wallBox(w, h, d, mat, cx, h / 2, cz); gable(cx, cz, w, d, h, false, roofMat);
    const fx = cx + face * (w / 2 + 0.03);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.1, 1.1), new THREE.MeshStandardMaterial({ color: '#3a2c22', roughness: .8 })); door.position.set(fx, 1.05, cz); scene.add(door); houseList.push({ cx, cz, w, d, face, fx, door, lit });
    [-1, 1].forEach(s => { const wz = cz + s * d * 0.3; const pm = lit && s > 0 ? null : env.paneMat(); const wm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 1.3), pm || winLit); wm.position.set(fx, 1.6, wz); scene.add(wm); env.windowDetail(fx, 1.6, wz, face, !!pm && env.paneIsHoley(pm)); if (board && Math.random() < .7) boards(fx + face * 0.05, 1.6, wz, 'z', 3, 1.5); });
    // porch
    const porch = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.25, d * 0.7), plankMat('#5c5048')); porch.position.set(fx + face * 0.9, 0.12, cz); porch.receiveShadow = true; scene.add(porch);
    env.grime(cx + face * (w / 2), cz, 'x', face, d, h); env.grime(cx, cz + d / 2, 'z', 1, w, h); env.grime(cx, cz - d / 2, 'z', -1, w, h);
  }
  // --- Keem's house (enterable): center 16,40 · w 8 (x 12..20) · d 10 (z 35..45), front wall faces -x
  const KH = { x0: 12, x1: 20, z0: 35, z1: 45 }, kmat = plankMat('#9aa49c'), imat = plankMat('#b9ab92'), H = 2.9;
  wallBox(8, H, 0.2, kmat, 16, H / 2, 35); wallBox(8, H, 0.2, kmat, 16, H / 2, 45); wallBox(0.2, H, 10, kmat, 20, H / 2, 40);
  // west front wall with door gap z 36.2..37.4 and window gap z 41.8..43.2 (y .9..2)
  wallBox(0.2, H, 1.2, kmat, 12, H / 2, 35.6); wallBox(0.2, H, 4.4, kmat, 12, H / 2, 39.6); wallBox(0.2, H, 1.8, kmat, 12, H / 2, 44.1);
  wallBox(0.2, 0.8, 1.4, kmat, 12, 0.4, 42.5); wallBox(0.2, 0.9, 1.4, kmat, 12, 2.45, 42.5, false); wallBox(0.2, 0.8, 1.2, kmat, 12, 2.5, 36.8, false);
  env.grime(20.1, 40, 'x', 1, 10, H); env.grime(16, 34.9, 'z', -1, 8, H); env.grime(16, 45.1, 'z', 1, 8, H);
  boards(11.86, 1.45, 42.5, 'z', 4, 1.7); // boarded bedroom window (gaps to peek through)
  // interior partition z=39 with doorway x 15.6..16.6
  wallBox(3.6, H, 0.15, imat, 13.8, H / 2, 39); wallBox(3.4, H, 0.15, imat, 18.3, H / 2, 39);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(8, 10), new THREE.MeshStandardMaterial({ color: '#2a2622', side: THREE.DoubleSide })); ceil.rotation.x = Math.PI / 2; ceil.position.set(16, H, 40); scene.add(ceil);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 10), pbr('weathered_planks', 3, { color: '#6a5442' })); floor.rotation.x = -Math.PI / 2; floor.position.set(16, 0.03, 40); floor.receiveShadow = true; scene.add(floor);
  gable(16, 40, 8, 10, H, false, roofMat).position.y = H + 0.01;
  const frontDoor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.1, 1.2), new THREE.MeshStandardMaterial({ color: '#3a2c22', roughness: .8 })); frontDoor.geometry.translate(0, 0, 0.6); frontDoor.position.set(12, 1.05, 36.2); scene.add(frontDoor);
  const doorCol = { x0: 11.9, x1: 12.1, z0: 36.2, z1: 37.4 }; colliders.push(doorCol); walls.push(frontDoor);
  boards(11.8, 1.3, 36.8, 'z', 2, 1.4); // plank across door (removed when opened)
  const doorBoards = scene.children.slice(-2);
  // furniture
  const bed = new THREE.Group(); const fr = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 2.1), new THREE.MeshStandardMaterial({ color: '#4a3526' })); fr.position.y = 0.22; bed.add(fr);
  const mat2 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.18, 2.0), new THREE.MeshStandardMaterial({ color: '#2d3d55', roughness: 1 })); mat2.position.y = 0.52; bed.add(mat2);
  const pil = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.35), new THREE.MeshStandardMaterial({ color: '#c8c2b5' })); pil.position.set(0, 0.66, 0.78); bed.add(pil);
  bed.position.set(18.9, 0, 42.6); bed.traverse(o => { o.castShadow = o.receiveShadow = !!o.isMesh; }); scene.add(bed); box(18.3, 19.5, 41.55, 43.65);
  const desk = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.75, 1.2), new THREE.MeshStandardMaterial({ color: '#5a4030' })); desk.position.set(19.6, 0.37, 40); desk.castShadow = true; scene.add(desk); box(19.3, 19.9, 39.4, 40.6);
  const lamp = new THREE.PointLight('#ffb070', 1.4, 7, 2); lamp.position.set(19.5, 1.2, 40.2); scene.add(lamp); lights.push(lamp);
  const lampM = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffc080' })); lampM.position.copy(lamp.position); scene.add(lampM);
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.1), new THREE.MeshStandardMaterial({ map: signTex(['ZOMBIE', 'KING III', 'in theaters'], '#2a0a0a', '#e44', 256, 352) })); poster.position.set(19.88, 1.6, 43.5); poster.rotation.y = -Math.PI / 2; scene.add(poster);
  updaters.push((dt, t) => { lamp.intensity = 1.2 + Math.sin(t * 13) * 0.05 + (Math.random() < .02 ? -0.8 : 0); });
  furnishKeemHouse(scene, updaters); // v2.0 decor-only furnishing (no colliders)

  // neighborhood houses
  const hs = [[16, 20], [16, 0 + 12], [16, -12], [16, 56], [-16, 40], [-16, 20], [-16, -12], [-16, 56], [-30, 40], [30, 26], [30, -14], [-30, -14], [-30, 20]];
  hs.forEach(([x, z], i) => house(x, z, 8, 9, x > 0 ? -1 : 1, sidingCols[i % sidingCols.length], i % 4 === 1, i % 3 !== 0));
  // Pell house is (-16,20) facing +x
  // market
  const mk = { x: -19, z: -32 }; wallBox(12, 4, 14, plankMat('#8a7f70'), mk.x, 2, mk.z); const mroof = new THREE.Mesh(new THREE.BoxGeometry(12.6, .3, 14.6), roofMat); mroof.position.set(mk.x, 4.1, mk.z); scene.add(mroof);
  const shop = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.2, 8), winLit.clone()); shop.material.emissiveIntensity = .25; shop.position.set(mk.x + 6.04, 1.4, mk.z); scene.add(shop);
  sign(['RIVERSIDE MARKET', 'Groceries · Bait · Coffee'], mk.x + 6.1, 3.3, mk.z, Math.PI / 2, 5, 1.2);
  // police station
  wallBox(10, 3.6, 10, plankMat('#6b7078'), -19, 1.8, -54); sign(['RIVERSIDE PD'], -13.9, 3, -54, Math.PI / 2, 4, 0.9, '#13233a');
  // gas station (Hank's)
  const gs = { x: 17, z: -52 }; wallBox(9, 3.4, 8, plankMat('#a39a86'), gs.x + 5, 1.7, gs.z - 6); sign(['HANK\'S GAS & GARAGE'], gs.x + 0.4, 3, gs.z - 6, -Math.PI / 2, 5, 0.9, '#5a1a12');
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(8, 0.4, 10), new THREE.MeshStandardMaterial({ color: '#c9c2b0', roughness: .7 })); canopy.position.set(gs.x - 2, 4.4, gs.z + 4); canopy.castShadow = true; scene.add(canopy);
  [[-5.5, 0], [1.5, 0], [-5.5, 8], [1.5, 8]].forEach(([dx, dz]) => { const p = new THREE.Mesh(new THREE.BoxGeometry(.3, 4.4, .3), swMat); p.position.set(gs.x + dx + 0.5, 2.2, gs.z + dz); scene.add(p); box(gs.x + dx + .35, gs.x + dx + .65, gs.z + dz - .15, gs.z + dz + .15); });
  [0, 4].forEach(dz => { const pm = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.5, 0.9), new THREE.MeshStandardMaterial({ color: '#8a2a20' })); pm.position.set(gs.x - 2, 0.75, gs.z + 2 + dz); pm.castShadow = true; scene.add(pm); box(gs.x - 2.3, gs.x - 1.7, gs.z + 1.55 + dz, gs.z + 2.45 + dz); });
  const canLight = new THREE.PointLight('#e8f0ff', 6, 18, 2); canLight.position.set(gs.x - 2, 4, gs.z + 4); scene.add(canLight); lights.push(canLight);
  updaters.push((dt, t) => { canLight.intensity = Math.random() < 0.04 ? 0.5 : 6; });
  // fuel tanker
  const tanker = new THREE.Group(); const tk = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 7, 18), pbr('rust_coarse_01', 2, { color: '#d8d0c4', metalness: .6, roughness: .5 })); tk.rotation.x = Math.PI / 2; tk.position.y = 1.9; tanker.add(tk);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.2), new THREE.MeshStandardMaterial({ color: '#7a1d16', metalness: .4, roughness: .5 })); cab.position.set(0, 1.5, 4.7); tanker.add(cab);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1), new THREE.MeshStandardMaterial({ map: signTex(['FLAMMABLE', '1203'], '#b01810', '#fff', 256, 96), emissiveMap: null })); fl.position.set(1.22, 1.9, 0); fl.rotation.y = Math.PI / 2; tanker.add(fl);
  tanker.position.set(gs.x - 9, 0, gs.z + 1); tanker.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(tanker); const tankCol = { x0: gs.x - 10.2, x1: gs.x - 7.8, z0: gs.z - 2.5, z1: gs.z + 7 }; colliders.push(tankCol);

  // cars
  const rust = pbr('rust_coarse_01', 1, { roughness: .8, metalness: .5 });
  // v1.4: real CC0 Kenney Car Kit models (tinted, rusted, burnt or wrecked variants); boxes only as a fallback
  const KINDS = ['sedan', 'suv', 'truck', 'police', 'van', 'taxi', 'hatchback-sports', 'suv-luxury', 'ambulance']; let kn = 0; const mcache = {};
  const lenOf = {}; const tmpB = new THREE.Box3();
  function carMat(src, key, f) { const k = src.uuid + key; if (!mcache[k]) { const m = src.clone(); f(m); mcache[k] = m; } return mcache[k]; }
  function car(x, z, rot, col, opt = {}) { const kind = opt.kind || (opt.truck ? 'truck' : KINDS[kn++ % KINDS.length]); const src = CM[kind]; if (!src) return boxCar(x, z, rot, col, opt);
    const g = new THREE.Group(); const m = src.clone(true); if (!lenOf[kind]) { tmpB.setFromObject(src); lenOf[kind] = tmpB.max.z - tmpB.min.z; }
    const L = opt.truck ? 5.2 : kind === 'van' || kind === 'ambulance' ? 5 : kind === 'hatchback-sports' ? 4 : 4.5; m.scale.set(1.27, 1.27, L / lenOf[kind]); g.add(m);
    const v = opt.burnt ? 'burnt' : opt.rust ? 'rust' : 'ok'; const hj = (a) => { const t = Math.sin(x * 12.9898 + z * 78.233 + a * 37.7) * 43758.5453; return t - Math.floor(t); }; const jq = Math.floor(hj(1) * 4); const tint = new THREE.Color(col).lerp(new THREE.Color('#ffffff'), .35); if (!opt.noVar) { tint.offsetHSL((jq - 1.5) * .018, (hj(2) - .5) * .12, (hj(3) - .5) * .1); const sj = .96 + hj(4) * .08; m.scale.multiplyScalar(sj); m.scale.y *= .98 + hj(5) * .06; } /* v2.1: no two cars look identical (tint/scale/yaw jitter) */
    m.traverse(o => { if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true;
      o.material = carMat(o.material, v + (kind === 'police' || kind === 'taxi' || kind === 'ambulance' ? '' : col + jq + Math.round(hj(2) * 3) + Math.round(hj(3) * 3)), mm => { mm.roughness = .5; mm.metalness = .25;
        if (kind !== 'police' && kind !== 'taxi' && kind !== 'ambulance') mm.color.copy(tint); if (v === 'burnt') { mm.color.set('#2c2824'); mm.roughness = 1; mm.metalness = 0; }
        if (v === 'rust') { mm.color.lerp(new THREE.Color('#7a4a2a'), .45); mm.roughness = .9; } if (opt.dirt) mm.color.multiplyScalar(.75); env.weather(mm, v === 'rust' ? 1 : v === 'burnt' ? 0 : .38, v === 'burnt' ? 1 : 0); }); });
    if (opt.wreck || opt.burnt) { const wn = ['wheel-front-left', 'wheel-back-right'][(x * 7 + z) & 1]; const w = m.getObjectByName(wn); if (w) w.visible = false; g.rotation.z = (wn.includes('left') ? 1 : -1) * .07; g.rotation.x = .03;
      if (CM['debris-tire']) { const t = CM['debris-tire'].clone(true); t.scale.setScalar(1.27); t.position.set(1.6, .2, (z % 2) - .5); t.rotation.set(0, .8, 1.4); g.add(t); }
      if (opt.wreck && CM['debris-door']) { const d = CM['debris-door'].clone(true); d.scale.setScalar(1.27); d.position.set(-1.5, 0, .4); d.rotation.set(0, .4, -1.45); g.add(d); }
      if (opt.wreck && CM['debris-bumper']) { const d = CM['debris-bumper'].clone(true); d.scale.setScalar(1.27); d.position.set(.2, 0, L / 2 + .7); d.rotation.y = .5; g.add(d); } }
    // head + tail lights (lit only on the truck / a running car)
    const hl = new THREE.MeshStandardMaterial({ color: '#555', emissive: opt.lights ? '#fff3d0' : '#000', emissiveIntensity: 2.2 }), tl = new THREE.MeshStandardMaterial({ color: '#3a0808', emissive: opt.lights ? '#ff2010' : '#200000', emissiveIntensity: 1.2 });
    [-.6, .6].forEach(hx => { const h = new THREE.Mesh(new THREE.BoxGeometry(.3, .13, .04), hl); h.position.set(hx, .78, L / 2 + .02); g.add(h); const t = new THREE.Mesh(new THREE.BoxGeometry(.28, .1, .04), tl); t.position.set(hx, .85, -L / 2 - .02); g.add(t); });
    g.position.set(x, 0, z); g.rotation.y = rot + (opt.noVar ? 0 : (hj(6) - .5) * .06); scene.add(g);
    if (!opt.nocol) { const along = Math.abs(Math.sin(rot)) > .7; const hw = along ? L / 2 : 1, hd = along ? 1 : L / 2; const cc = { x0: x - hw, x1: x + hw, z0: z - hd, z1: z + hd, car: g }; colliders.push(cc); g.userData.col = cc; }
    if (opt.burnt) fire(x, 1.3, z, 0.8);
    carList.push({ g, x, z, rot, kind, L, opt }); return g; }
  function boxCar(x, z, rot, col, opt = {}) { const g = new THREE.Group(); const paint = new THREE.MeshStandardMaterial({ color: col, metalness: .5, roughness: opt.burnt ? 1 : .45, map: rust.map, normalMap: rust.normalMap });
    if (opt.burnt) paint.color.set('#2a2622');
    const L = opt.truck ? 5.4 : 4.4; const b = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.75, L), paint); b.position.y = 0.75; g.add(b);
    const c = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.65, opt.truck ? 1.9 : 2.2), new THREE.MeshStandardMaterial({ color: opt.burnt ? '#151312' : '#0e1214', metalness: .6, roughness: .15, envMapIntensity: 1.5 })); c.position.set(0, 1.45, opt.truck ? 0.9 : -0.1); g.add(c);
    if (opt.truck) { const bed = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.5, 2.4), paint); bed.position.set(0, 1.35, -1.4); g.add(bed); }
    const wm = new THREE.MeshStandardMaterial({ color: '#111', roughness: .9 }); [[-.95, 1.4], [.95, 1.4], [-.95, -1.4], [.95, -1.4]].forEach(([wx, wz]) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(.38, .38, .3, 14), wm); w.rotation.z = Math.PI / 2; w.position.set(wx, .38, wz * L / 4.4); g.add(w); });
    const hl = new THREE.MeshStandardMaterial({ color: '#333', emissive: opt.lights ? '#fff3d0' : '#000', emissiveIntensity: 2 }); [-.6, .6].forEach(hx => { const h = new THREE.Mesh(new THREE.BoxGeometry(.3, .15, .05), hl); h.position.set(hx, .85, L / 2 + .01); g.add(h); });
    g.position.set(x, 0, z); g.rotation.y = rot; g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); scene.add(g);
    if (!opt.nocol) { const along = Math.abs(Math.sin(rot)) > .7; const hw = along ? L / 2 : 1, hd = along ? 1 : L / 2; const cc = { x0: x - hw, x1: x + hw, z0: z - hd, z1: z + hd, car: g }; colliders.push(cc); g.userData.col = cc; }
    if (opt.burnt) fire(x, 1.3, z, 0.8);
    return g; }
  const cars = [[-4.2, 28, .1, '#5a6a72'], [4.4, 12, 3.1, '#7a6a4a'], [-3, -8, 1.4, '#3d4a3a', { burnt: 1 }], [4, -22, 3.3, '#6a2a22'], [-4.5, -44, .05, '#8a8a82', { wreck: 1, kind: 'police' }], [2, -72, 2.2, '#445566', { burnt: 1 }], [-3.5, -84, .4, '#5a5048', { rust: 1, wreck: 1 }], [24, 50, 0, '#384a3a', { rust: 1 }], [-24, 30, 1.57, '#6a6458', { dirt: 1 }], [9, 33, 1.57, '#2c3a4a'], [-9, -30, 0, '#d8d8d0', { lights: 1, kind: 'sedan' }],
    [5, 52, 2.9, '#c8c0a8', { kind: 'van', dirt: 1 }], [-4.6, 60, .2, '#2a4a8a', { kind: 'hatchback-sports', wreck: 1 }], [4.6, -56, 3.0, '#e8e8e0', { kind: 'ambulance', wreck: 1 }], [-5, -64, -.3, '#3a3a3a', { kind: 'suv-luxury', rust: 1 }]];
  cars.forEach(c => car(c[0], c[1], c[2], c[3], c[4] || {}));
  // barricade before the bridge
  const jb = new THREE.MeshStandardMaterial({ color: '#8c8a82', roughness: .9 });
  for (let x = -9; x <= 9; x += 2.2) { if (Math.abs(x) < 1.5) continue; const j = new THREE.Mesh(new THREE.BoxGeometry(2, 1, .6), jb); j.position.set(x, .5, -100); j.castShadow = true; scene.add(j); box(x - 1, x + 1, -100.3, -99.7); }
  car(-7, -97, 1.3, '#25303a', { nocol: 0 }); car(8, -96, 1.9, '#6a5a3a', { burnt: 1 });
  sign(['RIVERSIDE BRIDGE', 'Kennebec Crossing'], 7.5, 2.4, -105, 0, 3.6, 1);

  // river + bridge
  const water = new THREE.Mesh(new THREE.PlaneGeometry(420, 22), new THREE.MeshStandardMaterial({ color: '#10181a', roughness: .06, metalness: .3, envMapIntensity: 2 })); water.rotation.x = -Math.PI / 2; water.position.set(0, -0.6, -120); scene.add(water);
  const bank = new THREE.Mesh(new THREE.PlaneGeometry(420, 26), new THREE.MeshStandardMaterial({ color: '#000' })); bank.rotation.x = -Math.PI / 2; bank.position.set(0, -1.6, -120); scene.add(bank);
  ground.geometry.dispose(); ground.geometry = new THREE.PlaneGeometry(420, 420); // ground is hidden under the river by the water plane being lit; mask with river cut
  const cut = new THREE.Mesh(new THREE.BoxGeometry(420, 1.2, 21.5), new THREE.MeshStandardMaterial({ color: '#0c1210' })); cut.position.set(0, -0.62, -120); scene.add(cut); water.position.y = 0.02; cut.visible = false;
  box(-300, -4.82, -131, -109); box(4.82, 300, -131, -109); // v1.9.1 flush with the rail posts (no clipping into the bridge fence)
  const deck = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 26), pbr('asphalt_02', 3, { color: '#555', roughness: .6 })); deck.position.set(0, 0.0, -120); deck.receiveShadow = true; deck.castShadow = true; scene.add(deck);
  for (let z = -132; z <= -108; z += 2) [-5, 5].forEach(x => { const p = new THREE.Mesh(new THREE.BoxGeometry(.15, 1.1, .15), rust); p.position.set(x, .8, z); scene.add(p); });
  [-5, 5].forEach(x => { const r = new THREE.Mesh(new THREE.BoxGeometry(.12, .12, 26), rust); r.position.set(x, 1.35, -120); scene.add(r); });
  road(0, -150, 11, 40);

  // signs
  // v1.9.28: the canvas matches the board's shape (text is no longer squashed / stretched), and every sign is registered so the
  // post-pass at the end of buildWorld can give free-standing boards posts and a plain back (no more boards hanging in mid-air)
  function sign(lines, x, y, z, rot, w = 3, h = 1, bg) { const cw = 512, ch = Math.max(96, Math.min(1024, Math.round(cw * h / w)));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: signTex(lines, bg, undefined, cw, ch), roughness: .8 })); m.position.set(x, y, z); m.rotation.y = rot; scene.add(m); signList.push({ m, w, h, bg }); return m; }
  const welcome = sign(['WELCOME TO RIVERSIDE', 'MAINE · Est. 1871', 'Pop. 4,012'], -8.5, 2.2, 58, Math.PI * 0.85, 3.6, 1.6);
  [[-8.6, 57.6], [-7.4, 58.2]].forEach(([x, z]) => { const p = new THREE.Mesh(new THREE.BoxGeometry(.12, 2.2, .12), new THREE.MeshStandardMaterial({ color: '#3a2a1a' })); p.position.set(x, 1.1, z); scene.add(p); });
  sign(['MAIN ST'], 7.34, 2.8, 8.4, -Math.PI / 2, 1.6, .4, '#1d4a2a'); sign(['BIRCH ST'], 7.4, 2.4, 8.46, 0, 1.6, .4, '#1d4a2a'); // v1.9.28: blades sit on the pole's face (the pole cut through the middle: "MAI ST")
  const pp = new THREE.Mesh(new THREE.BoxGeometry(.1, 3, .1), swMat); pp.position.set(7.4, 1.5, 8.4); scene.add(pp);
  sign(['STAY INSIDE', 'BY ORDER OF RIVERSIDE PD'], -6.4, 1.3, 14, Math.PI / 2, 2.4, 1, '#3a1010');

  // street lamps
  const lampHead = new THREE.MeshStandardMaterial({ color: '#222', emissive: '#ffd59a', emissiveIntensity: 3 });
  const lampPos = [[-7.5, 46], [7.5, 26], [-7.5, 2], [7.5, -26], [-7.5, -48], [7.5, -76], [-7.5, -94]];
  lampPos.forEach(([x, z], i) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(.07, .1, 5.5, 8), swMat); p.position.set(x, 2.75, z); p.castShadow = true; scene.add(p);
    const h = new THREE.Mesh(new THREE.BoxGeometry(.5, .15, .3), lampHead); h.position.set(x + (x < 0 ? .4 : -.4), 5.5, z); scene.add(h);
    if (i < Q.lamps) { const L = new THREE.PointLight('#ffc98a', 9, 20, 2); L.position.set(h.position.x, 5.2, z); scene.add(L); lights.push(L); if (i === 3) updaters.push(() => { L.intensity = Math.random() < .08 ? 0 : 9; }); } });

  // fires
  function fire(x, y, z, s = 1) { const L = new THREE.PointLight('#ff7a2a', 7 * s, 14, 2); L.position.set(x, y + .8, z); scene.add(L); lights.push(L);
    const fm = new THREE.MeshBasicMaterial({ color: '#ff8a30', transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false });
    const fl = []; for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(.35 * s, 1.4 * s, 7), fm); c.position.set(x + rnd(-.6, .6) * s, y + .5, z + rnd(-.9, .9) * s); scene.add(c); fl.push(c); }
    updaters.push((dt, t) => { L.intensity = (6 + Math.sin(t * 17) * 1.5 + Math.random() * 2) * s; fl.forEach((c, i) => { c.scale.y = 0.7 + 0.4 * Math.abs(Math.sin(t * 6 + i)); c.scale.x = c.scale.z = 0.8 + 0.3 * Math.sin(t * 9 + i * 2); }); });
    return L; }

  // pines (instanced)
  const bark = pbr('bark_brown_02', 1, { color: '#8a7a6a' }); bark.map.repeat.set(1, 4);
  const trunkG = new THREE.CylinderGeometry(0.12, 0.28, 1, 7); trunkG.translate(0, 0.5, 0);
  const coneG = new THREE.ConeGeometry(1, 1, 9, 3, true); coneG.translate(0, 0.5, 0); { const p = coneG.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < 0.9) { p.setX(i, p.getX(i) * rnd(.8, 1.15)); p.setZ(i, p.getZ(i) * rnd(.8, 1.15)); p.setY(i, y + rnd(-.08, .08)); } } coneG.computeVertexNormals(); }
  const needle = new THREE.MeshStandardMaterial({ color: '#1f2e22', roughness: 1, side: THREE.DoubleSide });
  // ===== CHAPTER 2 · HAVERFORD (south bank) =====
  const gS = new THREE.Mesh(new THREE.PlaneGeometry(420, 130), groundMat); gS.rotation.x = -Math.PI / 2; gS.position.set(0, -0.005, -270); gS.receiveShadow = true; scene.add(gS);
  road(0, -228, 11, 100); road(0, -200, 96, 9);
  // National Guard checkpoint
  const sand = new THREE.MeshStandardMaterial({ color: '#6e6450', roughness: 1 }), olive = new THREE.MeshStandardMaterial({ color: '#4a5236', roughness: .9 });
  [[-11, -3.2], [3.2, 11]].forEach(([a, b]) => wallBox(b - a, 1.1, 1, sand, (a + b) / 2, .55, -158));
  [[-15, -152, 6, 5], [15, -154, 6, 6]].forEach(([x, z, w, d]) => { wallBox(w, 2.2, d, olive, x, 1.1, z); gable(x, z, w, d, 2.2, false, olive); });
  car(-9, -164, 1.6, '#4a5a3a', { truck: 1, rust: 1 }); car(9, -166, -1.2, '#4a5a3a', { kind: 'suv', wreck: 1 });
  sign(['NATIONAL GUARD CHECKPOINT', 'HAVERFORD · CIVILIANS STOP HERE'], 6, 2.2, -157.4, 0, 3.6, 1, '#2a3a1a');
  sign(['WELCOME TO HAVERFORD', '"The Friendliest Little Town on the Kennebec"'], -8.5, 2.2, -140, 0, 3.8, 1.3);
  const flood = new THREE.PointLight('#e8f0ff', 14, 30, 2); flood.position.set(-12, 5, -160); if (Q.lamps > 3) { scene.add(flood); lights.push(flood); }
  fire(13, 0, -163, .8);
  // town
  const town = [[-14, -176, 7, 8, 1, '#7a6a5a'], [14, -178, 7, 9, -1, '#5a6a7a'], [-14, -188, 8, 8, 1, '#8a4a3a'], [14, -214, 8, 9, -1, '#c8a060'], [-14, -216, 7, 8, 1, '#6a7a5a'], [14, -230, 7, 8, -1, '#7a5a6a'], [-14, -232, 7, 9, 1, '#5a5a5a'], [-30, -190, 8, 8, 1, '#4a5a6a'], [30, -192, 8, 8, -1, '#7a7060'], [-30, -210, 8, 7, 1, '#6a5040'], [30, -210, 8, 8, -1, '#8a8a7a']];
  town.forEach(t => house(t[0], t[1], t[2], t[3], t[4], t[5], Math.random() < .3));
  sign(['HAVERFORD HARDWARE'], -9.95, 2.6, -188, /* v1.9.28: was 0.3 m inside the shop wall (invisible) */ Math.PI / 2, 3.2, .6, '#6a1a10');
  sign(['DOUGHNUT DEPOT', 'open 24/7 (lol)'], 9.9, 2.6, -214, -Math.PI / 2, 3.2, .8, '#c84a8a');
  sign(['SUDS-N-DUDS LAUNDROMAT'], -25.9, 2.6, -190, Math.PI / 2, 3.2, .6, '#1a4a6a');
  sign(['WATER ST'], 6, 2.6, -195.4, 0, 1.6, .4, '#1d4a2a');
  // high water: flooded cross street
  const fw = new THREE.MeshStandardMaterial({ color: '#16211f', roughness: .05, metalness: .4, transparent: true, opacity: .85 });
  [[-34, -200, 22, 10], [34, -201, 20, 10], [-8, -244, 10, 7]].forEach(([x, z, w, d]) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), fw); p.rotation.x = -Math.PI / 2; p.position.set(x, .06, z); scene.add(p); });
  [[-6, -186, .4, '#7a2a2a', { wreck: 1 }], [5, -205, 2.8, '#2a2a2a', { kind: 'police', wreck: 1 }], [-4.5, -222, -.2, '#d8d0c0', { kind: 'van', dirt: 1 }], [24, -200, 1.4, '#3a5a8a', { burnt: 1 }]].forEach(c => car(...c));
  fire(-24, 0, -203, .9);
  // Haverford High: fence + gate + stadium
  const fenceM = new THREE.MeshStandardMaterial({ color: '#7a7f84', metalness: .6, roughness: .5, transparent: true, opacity: .55 });
  wallBox(36, 2.6, .12, fenceM, -21, 1.3, -256); wallBox(36, 2.6, .12, fenceM, 21, 1.3, -256);
  wallBox(.12, 2.6, 44, fenceM, -39, 1.3, -278); wallBox(.12, 2.6, 44, fenceM, 39, 1.3, -278); wallBox(78, 2.6, .12, fenceM, 0, 1.3, -298);
  const gateMesh = new THREE.Mesh(new THREE.BoxGeometry(6, 2.8, .2), new THREE.MeshStandardMaterial({ color: '#3a4048', metalness: .7, roughness: .4 })); gateMesh.position.set(0, 1.4, -256); scene.add(gateMesh);
  const gateCol = { x0: -3, x1: 3, z0: -256.3, z1: -255.7 }; colliders.push(gateCol);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(.6, .8, .2), new THREE.MeshStandardMaterial({ color: '#888', emissive: '#f22', emissiveIntensity: .6 })); panel.position.set(4, 1.2, -255.7); scene.add(panel);
  sign(['HAVERFORD HIGH', 'HOME OF THE FIGHTING BEAVERS'], -7, 3.1, -255.8, 0, 4, 1.1, '#5a1a1a');
  const turf = new THREE.Mesh(new THREE.PlaneGeometry(50, 30), new THREE.MeshStandardMaterial({ color: '#3a5a2a', roughness: 1 })); turf.rotation.x = -Math.PI / 2; turf.position.set(0, .04, -278); turf.receiveShadow = true; scene.add(turf);
  const lineM = new THREE.MeshBasicMaterial({ color: '#c8c8b8' }); for (let x = -20; x <= 20; x += 5) { const l = new THREE.Mesh(new THREE.PlaneGeometry(.15, 28), lineM); l.rotation.x = -Math.PI / 2; l.position.set(x, .05, -278); scene.add(l); }
  const blM = new THREE.MeshStandardMaterial({ color: '#8a8d90', metalness: .5, roughness: .5 });
  for (let i = 0; i < 4; i++) { wallBox(26, .5, 1.2, blM, -2, .3 + i * .6, -294 + i * 1.2, i === 0); }
  wallBox(8, 3, .4, new THREE.MeshStandardMaterial({ color: '#111' }), 0, 5, -297, false);
  const board = sign(['HOME 0 · GUESTS 66', 'EVAC 0600 →'], 0, 5, -296.7, 0, 7.6, 2.6, '#101010');
  wallBox(30, 6, 10, plankMat('#8a5a4a'), -24, 3, -268);
  [[-26, -264], [26, -292]].forEach(([x, z]) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(.15, .2, 12, 8), swMat); p.position.set(x, 6, z); scene.add(p); const h = new THREE.Mesh(new THREE.BoxGeometry(2, 1, .3), new THREE.MeshStandardMaterial({ color: '#222', emissive: '#fff', emissiveIntensity: 2 })); h.position.set(x, 12, z); scene.add(h); });
  const sl = new THREE.PointLight('#dfe8ff', 20, 50, 1.6); sl.position.set(0, 11, -278); if (Q.lamps > 3) { scene.add(sl); lights.push(sl); }
  const ch2 = { gateMesh, gateCol, panel, board };
  // ===== CHAPTERS 3–6 · zones south of Haverford (each zone is a Group shown only during its chapter) =====
  const zones = {}; const _add = scene.add.bind(scene);
  const zone = (ch, fn) => { const zg = new THREE.Group(); scene.add = (...o) => { zg.add(...o); return scene; }; try { fn(); } finally { scene.add = _add; } zg.visible = false; _add(zg); zones[ch] = zg; };
  const gL = new THREE.Mesh(new THREE.PlaneGeometry(420, 480), groundMat); gL.rotation.x = -Math.PI / 2; gL.position.set(0, -0.006, -540); gL.receiveShadow = true; scene.add(gL);
  box(-300, -48, -900, -299); box(48, 300, -900, -299); box(-300, 300, -1000, -770);
  const Z_jer = new THREE.MeshStandardMaterial({ color: '#8c8a82', roughness: .9 });
  const Z_barrier = (z) => { box(-300, 300, z - .4, z + .4); const m = new THREE.Mesh(new THREE.BoxGeometry(96, 1.1, .7), Z_jer); m.position.set(0, .55, z); scene.add(m); };
  [-416, -526, -636].forEach(Z_barrier);
  const Z_rustM = new THREE.MeshStandardMaterial({ color: '#6a4a3a', roughness: .9, metalness: .3 }), Z_white = new THREE.MeshStandardMaterial({ color: '#d8d4c8', roughness: .7 }), Z_red = new THREE.MeshStandardMaterial({ color: '#8a1a14', roughness: .7 });
  const Z_lamp = (x, z, c = '#ffc98a', on = true) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, 6, 6), swMat); p.position.set(x, 3, z); scene.add(p); const h = new THREE.Mesh(new THREE.BoxGeometry(.6, .15, .3), new THREE.MeshStandardMaterial({ color: '#222', emissive: c, emissiveIntensity: on ? 3 : 0 })); h.position.set(x, 6, z); scene.add(h); };
  const Z_pl = (x, y, z, c, i, r) => { if (Q.lamps <= 3 && i < 12) return; const L = new THREE.PointLight(c, i, r, 2); L.position.set(x, y, z); scene.add(L); lights.push(L); return L; };
  { const pm = new THREE.MeshStandardMaterial({ color: '#333', roughness: .7 }); wallBox(.15, 2.4, .15, pm, -9.5, 1.2, -97); sign(["GUS'S BARBERSHOP", 'FADES · LINEUPS · NO REFUNDS'], -9.5, 2.9, -96.9, 0, 3, .8, '#7a1a1a'); } // the barbershop Keem names
  // CH3 — Route 1, Big Moose Truck Stop + Pine Tree Motel (z -305..-415)
  zone(3, () => {
    road(0, -360, 12, 110); road(-22, -350, 30, 26);
    sign(['ROUTE 1 SOUTH', 'PORTLAND 58'], 7.5, 2.6, -312, 0, 3, 1, '#1d4a2a');
    wallBox(16, 4, 10, plankMat('#b8a070'), -26, 2, -334); sign(['BIG MOOSE TRUCK STOP', 'DIESEL · DINER · JERKY'], -26, 4.8, -328.9, 0, 6, 1.6, '#6a2a10');
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(18, .5, 9), Z_white); canopy.position.set(-22, 4.6, -350); scene.add(canopy);
    [-28, -22, -16].forEach(x => { wallBox(.5, 4.4, .5, Z_red, x, 2.2, -350); wallBox(.8, 1.4, .6, Z_white, x, .7, -347); });
    Z_pl(-22, 4, -350, '#e8f0ff', 14, 26);
    [[-34, -362, .1], [-12, -366, -.2], [16, -340, 1.5], [18, -380, 1.6]].forEach(([x, z, r]) => car(x, z, r, '#7a2a1a', { truck: 1, rust: 1 }));
    [[-5, -330, .3], [5, -348, 2.6], [-4.5, -372, .1], [4.8, -392, 3.1]].forEach(([x, z, r], i) => car(x, z, r, ['#2a3a5a', '#5a5a5a', '#7a6a3a', '#3a3a3a'][i], { wreck: i % 2 }));
    for (let i = 0; i < 5; i++) wallBox(5.6, 3, 7, plankMat(i % 2 ? '#a07060' : '#8a6050'), 30, 1.5, -398 + i * 6);
    sign(['PINE TREE MOTEL', 'VACANCY · CABLE TV'], 26.8, 3.4, -386, -Math.PI / 2, 4, 1.2, '#1a3a5a');
    fire(-10, 0, -356, 1); fire(12, 0, -402, .8);
    [-7, 7].forEach(x => [-320, -350, -380, -405].forEach(z => Z_lamp(x, z)));
  });
  // CH4 — Maine Turnpike toll plaza, Tollmen raider camp (z -420..-525)
  zone(4, () => {
    road(0, -470, 40, 100);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(44, .6, 8), new THREE.MeshStandardMaterial({ color: '#2a4a6a', roughness: .6 })); roof.position.set(0, 5.4, -470); scene.add(roof);
    sign(['MAINE TURNPIKE · TOLL', 'NOW UNDER NEW MANAGEMENT · PAY OR DIE'], 0, 4.4, -465.9, 0, 9, 1.4, '#3a1010');
    for (let x = -18; x <= 18; x += 6) { wallBox(2, 2.6, 3.2, Z_white, x, 1.3, -470); const g = new THREE.Mesh(new THREE.BoxGeometry(3.6, .12, .12), Z_red); g.position.set(x + 2.8, 1.1, -468); scene.add(g); }
    for (let i = 0; i < 8; i++) car(-34 + (i % 2) * 2, -432 - i * 11, i * .7, '#4a3a2a', { burnt: i % 2, rust: 1 });
    for (let i = 0; i < 6; i++) car(34 - (i % 2) * 2, -440 - i * 12, -i * .6, '#3a3a3a', { wreck: 1 });
    [[-22, -495], [-8, -502], [8, -500], [22, -494]].forEach(([x, z]) => { wallBox(5, 2.4, 5, new THREE.MeshStandardMaterial({ color: '#5a5040' }), x, 1.2, z); gable(x, z, 5, 5, 2.4, false, Z_rustM); });
    const cage = new THREE.MeshStandardMaterial({ color: '#555', metalness: .7, roughness: .5, transparent: true, opacity: .6 });
    wallBox(6, 2.6, .1, cage, 0, 1.3, -515); wallBox(.1, 2.6, 4, cage, -3, 1.3, -513); wallBox(.1, 2.6, 4, cage, 3, 1.3, -513);
    sign(['TOLLMEN', 'EVERYBODY PAYS'], 0, 3, -519.5, 0, 4, 1, '#101010');
    fire(-14, 0, -484, 1.1); fire(14, 0, -486, 1.1); fire(0, 0, -508, .9); Z_pl(0, 5, -470, '#ffe0b0', 12, 30);
  });
  // CH5 — Maine Mall, South Portland (z -530..-635)
  zone(5, () => {
    road(0, -575, 70, 70);
    wallBox(70, 9, 18, new THREE.MeshStandardMaterial({ color: '#b8b0a0', roughness: .8 }), 0, 4.5, -622);
    sign(['THE MAINE MALL'], 0, 7.4, -612.9, 0, 12, 2, '#1a2a4a');
    // v1.7.1 visible-dialogue props: Tuck's phone-case kiosk, the van + ambulance Reyes names, Nia's Cinnabon
    wallBox(2.4, 1.1, 1.2, new THREE.MeshStandardMaterial({ color: '#d8d0c8', roughness: .6 }), -25.6, .55, -600); sign(['CASE CRAZE', 'PHONE CASES · 2 FOR $20'], -25.6, 1.9, -599.3, 0, 2.4, .6, '#6a1a7a');
    car(23.8, -566, Math.PI / 2, '#d8d8d0', { kind: 'van', dirt: 1 }); car(-28, -552, Math.PI / 2, '#ffffff', { kind: 'ambulance', dirt: 1 });
    sign(['CINNABON'], -12, 3, -612.9, 0, 3.2, .8, '#1a3a8a');
    sign(['FOOD COURT ↓', 'SANTA IS HERE! (DO NOT APPROACH SANTA)'], 12, 3, -612.9, 0, 5, 1.4, '#8a1010');
    const door = new THREE.Mesh(new THREE.BoxGeometry(8, 3.4, .2), new THREE.MeshStandardMaterial({ color: '#203040', metalness: .6, roughness: .2, emissive: '#102030' })); door.position.set(0, 1.7, -612.8); scene.add(door);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) if ((r + c) % 3) car(-28 + c * 11, -548 - r * 14, (r % 2) * Math.PI + .1, ['#4a5a7a', '#7a2a2a', '#d8d8d0', '#2a2a2a', '#5a6a3a'][(r * 6 + c) % 5], { wreck: (r + c) % 4 === 0, dirt: 1 });
    [-24, 0, 24].forEach(x => [-555, -590].forEach(z => Z_lamp(x, z, '#e8f0ff', (x + z) % 2 === 0)));
    extraTrees2.push([-12, -607, 9]);
    fire(-20, 0, -570, 1); fire(18, 0, -600, .9); Z_pl(0, 6, -595, '#ffd0a0', 12, 34);
  });
  // CH6 — Fort Williams Park + Portland Head Light, Cape Elizabeth (z -640..-770)
  zone(6, () => {
    road(0, -680, 10, 70); road(0, -720, 60, 20);
    const Z_sea = new THREE.Mesh(new THREE.PlaneGeometry(420, 140), new THREE.MeshStandardMaterial({ color: '#0e1a22', roughness: .05, metalness: .4 })); Z_sea.rotation.x = -Math.PI / 2; Z_sea.position.set(0, -.4, -820); scene.add(Z_sea);
    const Z_rock = new THREE.MeshStandardMaterial({ color: '#4a4844', roughness: 1 });
    for (let i = 0; i < 14; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(rnd(1.5, 3.5)), Z_rock); r.position.set(-45 + i * 7, .2, -752 + rnd(-3, 3)); scene.add(r); }
    const Z_stone = new THREE.MeshStandardMaterial({ color: '#7a7060', roughness: 1 });
    [[-26, -672, 14, 1.2], [-26, -684, 14, 1.2], [-33, -678, 1.2, 12], [26, -690, 12, 1.2], [32, -696, 1.2, 12]].forEach(([x, z, w, d]) => wallBox(w, 3.2, d, Z_stone, x, 1.6, z));
    sign(['FORT WILLIAMS PARK', 'PORTLAND HEAD LIGHT · EST. 1791'], 7, 2.2, -648, 0, 4, 1.2, '#1d3a2a');
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.4, 18, 14), Z_white); tw.position.set(12, 9, -738); scene.add(tw); box(10, 14, -740, -736);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 2, 12), new THREE.MeshStandardMaterial({ color: '#202020', emissive: '#ffe8a0', emissiveIntensity: 2 })); top.position.set(12, 19, -738); scene.add(top);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.6, 12), Z_red); cap.position.set(12, 20.8, -738); scene.add(cap);
    wallBox(8, 3.4, 6, Z_white, 4, 1.7, -735); gable(4, -735, 8, 6, 3.4, false, Z_red);
    const beam = new THREE.SpotLight('#fff2c0', 40, 120, .12, .4, 1); beam.position.set(12, 19, -738); scene.add(beam, beam.target); updaters.push((dt, t) => { beam.target.position.set(12 + Math.sin(t * .6) * 60, 0, -738 + Math.cos(t * .6) * 60); });
    zones._ship = new THREE.PointLight('#ff4040', 0, 80, 1); zones._ship.position.set(-30, 3, -840); scene.add(zones._ship);
    fire(-24, 0, -690, 1); fire(20, 0, -712, .9);
    { const rb = new THREE.Group(), rh = new THREE.Mesh(new THREE.BoxGeometry(3, 1.4, 8), Z_red); rh.position.y = .5; const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 2.4), Z_white); cab.position.set(0, 1.9, -1); rb.add(rh, cab); rb.position.set(-30, 0, -838); rb.rotation.y = .4; scene.add(rb); updaters.push((dt, t) => { rb.position.y = Math.sin(t * .8) * .15; }); } // the Captain's red boat
  });
  // ===== v1.7 CHAPTERS 7–9 · far south strip (x -48..48, z -1000..-1700), reached by checkpoint =====
  box(-300, -48, -1800, -1000); box(48, 300, -1800, -1000); box(-300, 300, -1900, -1700); [-1256, -1456].forEach(Z_barrier);
  const gS7 = new THREE.Mesh(new THREE.PlaneGeometry(300, 720), groundMat); gS7.rotation.x = -Math.PI / 2; gS7.position.set(0, -0.006, -1350); gS7.receiveShadow = true; scene.add(gS7);
  const Z_wood = plankMat('#6a5238'), Z_sea2 = new THREE.MeshStandardMaterial({ color: '#0e1a22', roughness: .05, metalness: .4 });
  // CH7 — Route 77 coastal drive to Cape Marina (z -1005..-1255)
  zone(7, () => {
    road(0, -1130, 16, 250); box(-48, -20, -1240, -1005); box(20, 48, -1240, -1005);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(28, 240), Z_sea2); sea.rotation.x = -Math.PI / 2; sea.position.set(-34, -.3, -1125); scene.add(sea);
    [[-6, -1060, .4], [7, -1090, 2.5], [-8, -1130, 1.2], [6, -1170, .2], [-5, -1200, 2.8]].forEach(([x, z, r], i) => car(x, z, r, ['#4a4a4a', '#6a2a1a', '#2a3a5a', '#5a5a3a', '#3a3a3a'][i], { burnt: i % 2 }));
    for (let z = -1020; z > -1240; z -= 24) { Z_lamp(-9, z, '#ffc98a', z % 48 === 0); }
    sign(['ROUTE 77', 'CAPE MARINA 3 MI'], 9.5, 2.4, -1030, Math.PI, 3.4, 1, '#1d4a2a');
    wallBox(18, 3.2, 8, Z_wood, -10, 1.6, -1246); sign(['CAPE MARINA', 'BAIT · ICE · BEER'], -10, 3.6, -1241.9, Math.PI, 4, 1, '#1a3a5a');
    fire(8, 0, -1150, .9); fire(-4, 0, -1225, .8); Z_pl(0, 5, -1235, '#ffb070', 8, 30);
  });
  // CH8 — Casco Bay ferry terminal + car deck (z -1260..-1455)
  zone(8, () => {
    road(0, -1300, 30, 80); const deck = new THREE.Mesh(new THREE.PlaneGeometry(26, 110), Z_wood); deck.rotation.x = -Math.PI / 2; deck.position.set(0, .03, -1395); scene.add(deck);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), Z_sea2); sea.rotation.x = -Math.PI / 2; sea.position.set(0, -.35, -1395); scene.add(sea);
    box(-48, -13, -1452, -1340); box(13, 48, -1452, -1340); wallBox(.2, 1.2, 110, Z_white, -13, .6, -1395, false); wallBox(.2, 1.2, 110, Z_white, 13, .6, -1395, false);
    wallBox(10, 6, 8, Z_white, 0, 3, -1440); gable(0, -1440, 10, 8, 6, false, Z_red);
    sign(['CASCO BAY LINES', 'PEAKS ISLAND FERRY'], 0, 3.4, -1336, Math.PI, 4, 1, '#1a3a5a');
    [[-6, -1300, 1.6], [7, -1312, .3], [-5, -1380, 0], [5, -1400, 0], [-5, -1420, 0]].forEach(([x, z, r], i) => car(x, z, r, ['#4a4a4a', '#6a2a1a', '#2a3a5a', '#5a5a3a', '#3a3a3a'][i]));
    fire(-9, 0, -1290, .9); Z_pl(0, 5, -1400, '#a0c0ff', 7, 30); Z_lamp(-12, -1350); Z_lamp(12, -1350);
  });
  // CH9 — Peaks Island: the Captain's compound (z -1460..-1700)
  zone(9, () => {
    road(0, -1580, 12, 220); const fenceM = new THREE.MeshStandardMaterial({ color: '#555b60', metalness: .6, roughness: .5, transparent: true, opacity: .7 });
    wallBox(30, 3, .15, fenceM, -21, 1.5, -1540); wallBox(30, 3, .15, fenceM, 21, 1.5, -1540);
    wallBox(12, 4, 10, Z_white, -22, 2, -1580); wallBox(12, 4, 10, Z_white, 22, 2, -1600); sign(['NAVAL RESERVE · AUTHORIZED ONLY'], 0, 3, -1538, Math.PI, 4, .7, '#3a1010');
    wallBox(24, 5, .4, Z_rustM, -14, 2.5, -1660); wallBox(24, 5, .4, Z_rustM, 14, 2.5, -1660); wallBox(4, 5, .4, Z_rustM, 0, 4.4, -1660, false);
    wallBox(.4, 5, 30, Z_rustM, -26, 2.5, -1675); wallBox(.4, 5, 30, Z_rustM, 26, 2.5, -1675);
    sign(['BATTERY STEELE', 'SPECIMEN STORAGE'], 0, 3.4, -1659.6, Math.PI, 4, .9, '#2a2a2a');
    for (let i = 0; i < 6; i++) { wallBox(3, 2.6, .1, fenceM, -15 + i * 6, 1.3, -1684, false); }
    fire(-8, 0, -1500, 1); fire(10, 0, -1620, .9); Z_pl(0, 4, -1675, '#80ff90', 8, 26); Z_lamp(-7, -1560, '#ff4040'); Z_lamp(7, -1620, '#ff4040');
  });
  // building footprints (solid floorplans, not just thin wall colliders) so canopies cannot poke into interiors
  const footprints = [{ x0: KH.x0, x1: KH.x1, z0: KH.z0, z1: KH.z1 }, ...houseList.map(h => ({ x0: h.cx - h.w / 2, x1: h.cx + h.w / 2, z0: h.cz - h.d / 2, z1: h.cz + h.d / 2 }))];
  colliders.forEach(c => { if (c.car) return; const wx = c.x1 - c.x0, wz = c.z1 - c.z0; if (wx > 3 && wz > 3 && wx < 80 && wz < 80) footprints.push({ x0: c.x0, x1: c.x1, z0: c.z0, z1: c.z1 }); });
  // spawn, boarded-window peek, front door / street start, Pell-house approach
  const clears = [[18.1, 42.6, 6], [12.6, 42.5, 5], [10.6, 36.8, 4], [-11, 20, 4]];
  const hitsFoot = (x, z, pad) => footprints.some(f => x > f.x0 - pad && x < f.x1 + pad && z > f.z0 - pad && z < f.z1 + pad);
  const hitsClear = (x, z, extra = 0) => clears.some(([cx, cz, r]) => (x - cx) ** 2 + (z - cz) ** 2 < (r + extra) ** 2);
  const treeOk = (x, z, h) => { const pad = (h || 12) * .5 + 2; if (hitsFoot(x, z, pad) || hitsClear(x, z, pad * .25)) return false;
    if (Math.abs(x) < 10 && z > -150) return false; if (z < -134 && Math.abs(x) < 44) return false; if (z < -106 && z > -134) return false;
    if (Math.abs(z - 4) < 7 && Math.abs(x) < 46) return false; if (x > 4 && x < 34 && z > -66 && z < -36) return false;
    if (colliders.some(c => !c.car && x > c.x0 - 2 && x < c.x1 + 2 && z > c.z0 - 2 && z < c.z1 + 2)) return false; return true; };
  const treeSpots = []; let tries = 0;
  while (treeSpots.length < Q.trees * 2 && tries++ < 20000) { const x = rnd(-90, 90), z = rnd(-760, 90), h = rnd(9, 18); if (!treeOk(x, z, h)) continue; treeSpots.push([x, z, h]); }
  const colTrees = treeSpots.length; treeSpots.forEach(([x, z, h]) => { if (Math.abs(x) < 50 && z > -150) box(x - .3, x + .3, z - .3, z + .3); }); // same collision footprint as before
  [[-210, 210, -132, -108], [-19, 19, -2253, -2211], [-8, 8, -2450, -2328]].forEach(([a, b, c, d]) => env.cut(a, b, c, d)); // water, pond and the harbor tunnel: no vegetation
  { const K = Q.trees / 300; const n = (k) => Math.round(k * K);
    env.finish({ colliders, bark, KH, footprints, clears, treeOk, extraTrees: treeSpots.map(t => [t[0], t[1], t[2]]).concat(extraTrees2), regions: [
      { x0: -46, x1: 46, z0: 56, z1: -140, n: n(70), inner: 24 }, { x0: -46, x1: 46, z0: -150, z1: -760, n: n(190), inner: 26 },
      { x0: -46, x1: 46, z0: -1000, z1: -1700, n: n(80), inner: 24 }, { x0: -46, x1: 46, z0: -1990, z1: -2690, n: n(80), inner: 24 },
      { x0: -100, x1: 100, z0: -1000, z1: -1700, n: n(60), inner: 50 }, { x0: -100, x1: 100, z0: -1990, z1: -2700, n: n(60), inner: 50 }] }); }
  updaters.push((dt, t, cam) => env.update(dt, t, cam));

  // rain
  let rain = null; if (Q.rain) { const N = Q.rain, pos = new Float32Array(N * 6); for (let i = 0; i < N; i++) { const x = rnd(-25, 25), y = rnd(0, 20), z = rnd(-25, 25); pos.set([x, y, z, x + .03, y - .5, z], i * 6); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); rain = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#9fb0b0', transparent: true, opacity: .32 })); rain.frustumCulled = false; scene.add(rain);
    updaters.push((dt, t, cam) => { rain.visible = !flags.indoor && !(cam.x > KH.x0 && cam.x < KH.x1 && cam.z > KH.z0 && cam.z < KH.z1); const p = g.attributes.position.array; for (let i = 0; i < N; i++) { const k = i * 6; let y = p[k + 1] - dt * 22; if (y < 0) { y = 20; p[k] = cam.x + rnd(-25, 25); p[k + 2] = cam.z + rnd(-25, 25); }
      p[k + 1] = y; p[k + 3] = p[k] + .03; p[k + 4] = y - .5; p[k + 5] = p[k + 2]; } g.attributes.position.needsUpdate = true; }); }

  // bounds
  box(-300, -48, -300, 300); box(48, 300, -300, 300); box(-300, 300, 66, 300); // v1.6.3: old south bound (-400..-299) removed — it walled off Chapter 3+

  let _spots10 = [];
  // ===== v1.8 CHAPTERS 10–11 · Boston strip (x -48..48, z -1990..-2700), reached by checkpoint =====
  box(-300, -48, -2720, -1990); box(48, 300, -2720, -1990); box(-300, 300, -2800, -2700); box(-300, 300, -1990, -1960); Z_barrier(-2320);
  const gS10 = new THREE.Mesh(new THREE.PlaneGeometry(300, 740), groundMat); gS10.rotation.x = -Math.PI / 2; gS10.position.set(0, -0.006, -2345); gS10.receiveShadow = true; scene.add(gS10);
  const Z_conc = new THREE.MeshStandardMaterial({ color: '#7d7b76', roughness: .95 }), Z_swan = new THREE.MeshStandardMaterial({ color: '#f2efe6', roughness: .6 }), Z_beak = new THREE.MeshStandardMaterial({ color: '#e08a20', roughness: .6 });
  // CH10 — Long Wharf, Quarantine Row searchlights, Public Garden swan boats
  zone(10, () => {
    road(0, -2150, 14, 300); const wharf = new THREE.Mesh(new THREE.PlaneGeometry(30, 22), Z_wood); wharf.rotation.x = -Math.PI / 2; wharf.position.set(0, .03, -2002); scene.add(wharf);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(60, 320), Z_sea2); sea.rotation.x = -Math.PI / 2; sea.position.set(-40, -.3, -2150); scene.add(sea); box(-48, -26, -2320, -1990);
    sign(['LONG WHARF', 'BOSTON HARBOR'], 6, 2.6, -2016, Math.PI, 3.4, .9, '#1a2a4a'); sign(['BOSTON QUARANTINE ZONE', 'CHECKPOINT 3 · INFECTED WILL BE FIRED UPON'], 0, 3.2, -2030, Math.PI, 5, 1, '#5a1010');
    const fenceM = new THREE.MeshStandardMaterial({ color: '#555b60', metalness: .6, roughness: .5, transparent: true, opacity: .6 }); wallBox(.15, 3, 100, fenceM, -22, 1.5, -2075); wallBox(.15, 3, 100, fenceM, 22, 1.5, -2075);
    [[-18, -2090], [17, -2060]].forEach(([x, z]) => { wallBox(4, 2.2, 5, new THREE.MeshStandardMaterial({ color: '#4a5a3a', roughness: 1 }), x, 1.1, z); }); sign(['FUEL · DO NOT SMOKE'], -18, 2.6, -2087.4, Math.PI, 2, .5, '#6a3a10');
    const discM = () => new THREE.MeshBasicMaterial({ color: '#fff6c0', transparent: true, opacity: .32, depthWrite: false }); const spots = [];
    [[-20, -2045], [20, -2075], [-20, -2105]].forEach(([x, z]) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(.15, .2, 8, 6), swMat); p.position.set(x, 4, z); scene.add(p);
      const head = new THREE.Group(); head.position.set(x, 8, z); const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.35, .5, .8, 10), new THREE.MeshStandardMaterial({ color: '#222', emissive: '#fff4c8', emissiveIntensity: 3 })); lamp.rotation.x = Math.PI / 2; head.add(lamp); scene.add(head);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(3.6, 24), discM()); disc.rotation.x = -Math.PI / 2; disc.position.set(0, .05, z); scene.add(disc); spots.push({ head, disc }); });
    // Public Garden: pond, swan boats, the ducklings statue
    const pond = new THREE.Mesh(new THREE.PlaneGeometry(36, 40), Z_sea2); pond.rotation.x = -Math.PI / 2; pond.position.set(0, .04, -2232); scene.add(pond);
    const dock = new THREE.Mesh(new THREE.BoxGeometry(10, .3, 6), Z_wood); dock.position.set(0, .15, -2206); scene.add(dock); box(-18, -3, -2252, -2212); box(3, 18, -2252, -2212);
    const swan = (x, z, ry) => { const g = new THREE.Group(); const hull = new THREE.Mesh(new THREE.BoxGeometry(2.2, .6, 4), Z_swan); hull.position.y = .3; g.add(hull);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(.18, .3, 2, 8), Z_swan); neck.position.set(0, 1.4, -1.6); neck.rotation.x = -.35; g.add(neck); const hd = new THREE.Mesh(new THREE.SphereGeometry(.32, 10, 8), Z_swan); hd.position.set(0, 2.4, -1.95); g.add(hd);
      const bk = new THREE.Mesh(new THREE.ConeGeometry(.1, .4, 6), Z_beak); bk.rotation.x = -Math.PI / 2; bk.position.set(0, 2.38, -2.3); g.add(bk); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g); };
    swan(-5, -2212, 0); const br = new THREE.Mesh(new THREE.BoxGeometry(6, .3, 40), Z_wood); br.position.set(0, .12, -2232); scene.add(br); swan(-8, -2226, .6); swan(9, -2240, -.4); sign(['SWAN BOATS', 'SINCE 1877'], -6, 2.2, -2204, Math.PI, 2.6, .8, '#1a4a2a');
    const duckM = new THREE.MeshStandardMaterial({ color: '#7a5a2a', metalness: .7, roughness: .4 }); for (let i = 0; i < 6; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(.28 - i * .02, 8, 6), duckM); d.position.set(12 + i * .7, .25, -2195 - i * .4); d.scale.set(1, .8, 1.4); scene.add(d); }
    sign(['MAKE WAY FOR DUCKLINGS'], 13.5, 1, -2192, Math.PI, 2.4, .5, '#3a2a1a'); [[-14, -2180], [16, -2264], [-15, -2275], [14, -2170]].forEach(([x, z]) => extraTrees2.push([x, z, 9]));
    // Faire tent where the knight came from
    const tent = new THREE.Mesh(new THREE.ConeGeometry(4, 4, 8), new THREE.MeshStandardMaterial({ color: '#7a1a2a', roughness: .9 })); tent.position.set(-12, 2, -2296); scene.add(tent); sign(['RENAISSANCE FAIRE', 'HUZZAH'], -12, 1.2, -2291.6, Math.PI, 2.4, .7, '#4a3a10');
    fire(10, 0, -2120, .9); Z_pl(0, 5, -2200, '#9fb8ff', 12, 40); for (let z = -2140; z > -2310; z -= 34) Z_lamp(-7, z, '#ffd9a0');
    _spots10 = spots; });
  zones[10].userData.spots = _spots10;
  // CH11 — harbor tunnel, Cambridge St, Mass General helipad
  zone(11, () => {
    road(0, -2500, 12, 340); const tw = new THREE.MeshStandardMaterial({ color: '#b8b2a0', roughness: .8 }); wallBox(.6, 6, 110, tw, -7, 3, -2390); wallBox(.6, 6, 110, tw, 7, 3, -2390);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(14.4, .5, 110), Z_conc); roof.position.set(0, 6.2, -2390); scene.add(roof); sign(['TED WILLIAMS TUNNEL', 'LOGAN · I-90'], 0, 5.2, -2336, Math.PI, 4, .8, '#1a4a2a');
    for (let z = -2345; z > -2440; z -= 12) { const l = new THREE.Mesh(new THREE.BoxGeometry(.6, .12, .3), new THREE.MeshStandardMaterial({ color: '#222', emissive: '#ffa040', emissiveIntensity: z % 24 ? 3 : .2 })); l.position.set(0, 5.9, z); scene.add(l); }
    Z_pl(0, 5, -2360, '#ffa040', 12, 24); Z_pl(0, 5, -2420, '#ffa040', 12, 24); car(3.5, -2386, Math.PI * .1, '#8a8a80', { burnt: true }); car(-3.4, -2368, .2, '#3a3a5a'); car(2.8, -2412, -.2, '#5a2a1a', { burnt: true });
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 6, 12), new THREE.MeshStandardMaterial({ color: '#c8c8c0', metalness: .6, roughness: .4 })); tank.rotation.x = Math.PI / 2; tank.position.set(-3.2, 1.6, -2392); scene.add(tank); sign(['FLAMMABLE', '1203'], -1.9, 1.6, -2392, Math.PI / 2, 1.2, .6, '#a01010');
    [[-6, -2480, .5], [6, -2510, 2.6], [-5, -2545, 1.2], [5, -2570, .1]].forEach(([x, z, r], i) => car(x, z, r, ['#4a4a4a', '#2a3a5a', '#5a5a3a', '#6a2a1a'][i], { burnt: i % 2 }));
    sign(['CAMBRIDGE ST'], 7.5, 3, -2470, -Math.PI / 2, 2.4, .5, '#1a4a2a'); for (let z = -2460; z > -2590; z -= 30) Z_lamp(8, z, '#ffc98a', z % 60 !== 0);
    // Mass General: facade, ER doors, rooftop helipad (the boss arena is the "roof" plaza behind the ER)
    wallBox(30, 14, 2, Z_white, -21, 7, -2690); wallBox(30, 14, 2, Z_white, 21, 7, -2690); wallBox(.6, 4, 40, Z_white, -26, 2, -2620); wallBox(.6, 4, 40, Z_white, 26, 2, -2620);
    sign(['MASS GENERAL HOSPITAL'], 0, 9, -2688.9, Math.PI, 8, 1.2, '#0a2a5a'); sign(['EMERGENCY'], -14, 4.5, -2604, Math.PI, 3, .7, '#a01010'); wallBox(10, 3.4, 4, Z_white, -14, 1.7, -2610);
    const pad = new THREE.Mesh(new THREE.CircleGeometry(9, 32), new THREE.MeshStandardMaterial({ color: '#3a3a3a', roughness: .8 })); pad.rotation.x = -Math.PI / 2; pad.position.set(0, .04, -2666); scene.add(pad);
    const hM = new THREE.MeshStandardMaterial({ color: '#e8e4d8', emissive: '#e8e4d8', emissiveIntensity: .3 }); [[-1.6, 0], [1.6, 0]].forEach(([x]) => { const b = new THREE.Mesh(new THREE.PlaneGeometry(.6, 5), hM); b.rotation.x = -Math.PI / 2; b.position.set(x, .05, -2666); scene.add(b); });
    const hb = new THREE.Mesh(new THREE.PlaneGeometry(3.2, .6), hM); hb.rotation.x = -Math.PI / 2; hb.position.set(0, .05, -2666); scene.add(hb);
    wallBox(6, 1, 3, new THREE.MeshStandardMaterial({ color: '#c8c8c0' }), 12, .5, -2600); sign(['AMBULANCE ONLY'], 12, 1.4, -2598.4, Math.PI, 2, .4, '#a01010');
    Z_pl(0, 8, -2664, '#ff4040', 14, 30); fire(-8, 0, -2560, .8); });
  // ===== v2.0 CHAPTERS 12+ · registered from src/game/chapters/chNN.js (each owns a 300 m band; zones show only during their chapter) =====
  // bands: ch12 z -2900..-3200 · ch13 -3300..-3600 · ch14 -3700..-4000 · ch15 -4100..-4400 · ch16 -4500..-4800
  box(-300, -48, -4900, -2790); box(48, 300, -4900, -2790); box(-300, 300, -4960, -4900);
  { const gN = new THREE.Mesh(new THREE.PlaneGeometry(300, 2120), groundMat); gN.rotation.x = -Math.PI / 2; gN.position.set(0, -0.006, -3850); gN.receiveShadow = true; scene.add(gN);
    const kitCtx = { THREE, scene, Q, box, wallBox, sign, road, Z_pl, Z_lamp, fire, car, plankMat, swMat, groundMat, signTex, lights, walls, updaters, colliders };
    Object.keys(ZONE_BUILDERS).forEach(n => zone(+n, () => ZONE_BUILDERS[n](kitCtx))); }
  mountSigns(signList, scene);
  return { env, ch2, zones, flags, houses: houseList, cars: carList, signTex, colliders, walls, updaters, lights, fire, car, sign, frontDoor, doorCol, doorBoards, tanker, tankCol, KH, mud, update(dt, t, cam) { updaters.forEach(u => u(dt, t, cam)); } };
}
// v1.9.28: a sign that is not on a wall and has nothing under it (a barrier, a post, a counter) gets two posts down to the
// ground and a back face that carries the same lettering (like a real two-sided road sign), so it no longer floats and does not
// vanish when seen from behind (planes are one-sided; several chapter signs face away from the way you walk in).
function mountSigns(list, scene) {
  const rc = new THREE.Raycaster(), cands = []; const bb = new THREE.Box3(), sz = new THREE.Vector3();
  scene.updateMatrixWorld(true);
  scene.traverse(o => { if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || list.some(s => s.m === o)) return; if (!o.geometry) return; if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    bb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); bb.getSize(sz); if (sz.x > 400 || sz.z > 400) return; cands.push(o); });
  const sb = new THREE.Box3(); const small = cands.filter(o => { o.wb = new THREE.Box3().setFromObject(o); const v = o.wb.getSize(new THREE.Vector3()); return Math.max(v.x, v.z) < 80 && v.y > .3; });
  const postM = new THREE.MeshStandardMaterial({ color: '#3a342c', roughness: .9, metalness: .2 }); const nrm = new THREE.Vector3(), o3 = new THREE.Vector3(), dn = new THREE.Vector3(0, -1, 0), q = new THREE.Quaternion();
  let posts = 0;
  for (const s of list) { const m = s.m; m.updateMatrixWorld(true); const wp = m.getWorldPosition(new THREE.Vector3()); m.getWorldQuaternion(q); nrm.set(0, 0, 1).applyQuaternion(q);
    if (Math.abs(nrm.y) > .5) continue; // flat / ceiling boards
    sb.setFromObject(m).expandByScalar(.2); if (small.some(o => sb.intersectsBox(o.wb))) continue; // already on posts / a frame / a barrier
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q); let mounted = false;
    // 1) wall behind it?
    for (const k of [-.35, 0, .35]) { o3.copy(wp).addScaledVector(right, k * s.w).addScaledVector(nrm, .4); rc.set(o3, nrm.clone().negate()); rc.far = 1.0; const h = rc.intersectObjects(cands, false)[0]; if (h) { mounted = true; break; } }
    // 2) something holding it from below (barrier, post, roof)?
    if (!mounted) for (const k of [-.42, 0, .42]) { o3.copy(wp).addScaledVector(right, k * s.w); o3.y = wp.y - s.h / 2 + .02; rc.set(o3, dn); rc.far = o3.y; const h = rc.intersectObjects(cands, false).find(h => h.point.y > .12); if (h && wp.y - s.h / 2 - h.point.y < .45) { mounted = true; break; } }
    if (mounted) continue;
    const bottom = wp.y - s.h / 2; if (bottom < .05) continue;
    const L = wp.y + s.h / 2 - .05; const geo = new THREE.BoxGeometry(.09, L, .09);
    for (const sx of [-1, 1]) { const pm = new THREE.Mesh(geo, postM); pm.position.set(sx * (s.w / 2 - Math.min(.25, s.w * .12)), (s.h / 2 - .05) - L / 2, -.06); pm.castShadow = true; m.add(pm); }
    const back = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), new THREE.MeshStandardMaterial({ map: m.material.map, color: '#c8c8c8', roughness: .85 })); back.rotation.y = Math.PI; back.position.z = -.012; m.add(back);
    posts++; m.userData.posted = true; }
  return posts;
}
function mergeTwo(a, b) { const g = new THREE.BufferGeometry(); ['position', 'normal', 'uv'].forEach(k => { const A = a.attributes[k].array, B = b.attributes[k].array, o = new Float32Array(A.length + B.length); o.set(A); o.set(B, A.length); g.setAttribute(k, new THREE.BufferAttribute(o, a.attributes[k].itemSize)); });
  const ia = a.index.array, ib = b.index.array, n = a.attributes.position.count, idx = new Uint16Array(ia.length + ib.length); idx.set(ia); for (let i = 0; i < ib.length; i++) idx[ia.length + i] = ib[i] + n; g.setIndex(new THREE.BufferAttribute(idx, 1)); return g; }
