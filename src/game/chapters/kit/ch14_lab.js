// Chapter 14 lab set — owned by ch14. Clean-room research floor: antechamber, analyzer lab,
// sealed glass bay, cover-filled breach hall, and a south arena with an elevator.
// {x,z} = north wall centre of the antechamber; the set runs toward -z in the ch14 band (-3700..-4000).
import { mats, floor, wallX, wallZ, room, lamp, slabDoor, prop, table, shelfUnit, bloodPool, crate } from './common.js';

export function buildCh14Lab(ctx, { x = 0, z = -3704 } = {}) {
  const K = mats(ctx), T = ctx.THREE, H = 4.1, A = { benches: [], lamps: [], cover: [], alarms: [] };
  const M = (c, o = {}) => new T.MeshStandardMaterial({ color: c, roughness: .85, ...o });
  const tile = M('#cfd6d8', { roughness: .42, metalness: .08, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -8 });
  const tile2 = M('#b7c0c4', { roughness: .5, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -8 });
  const wallW = M('#e8ecee', { roughness: .7 });
  const glowBlue = new T.MeshStandardMaterial({ color: '#9fd4ff', emissive: '#3aa7ff', emissiveIntensity: 1.4, roughness: .25, metalness: .2 });
  const glowRed = new T.MeshStandardMaterial({ color: '#ff6a4a', emissive: '#ff2810', emissiveIntensity: 1.8, roughness: .3 });
  const glowGreen = new T.MeshStandardMaterial({ color: '#8affb0', emissive: '#1ad86a', emissiveIntensity: 1.3, roughness: .3 });
  const glass = K.glass;

  // bands (from the north wall at z)
  const N = z;                 // -3704
  const ANT_S = N - 18;        // -3722
  const LAB_S = ANT_S - 68;    // -3790
  const HALL_S = LAB_S - 60;   // -3850
  const ARENA_S = HALL_S - 54; // -3904
  const antC = N - 9, labC = ANT_S - 34, hallC = LAB_S - 30, arC = HALL_S - 27;

  floor(ctx, x, antC, 18, 18, tile, .08);
  floor(ctx, x, labC, 42, 68, tile, .08);
  floor(ctx, x, hallC, 22, 60, tile2, .08);
  floor(ctx, x, arC, 36, 54, tile, .08);
  prop(ctx, .18, .02, 64, glowBlue, x, .05, labC, false);

  // ---------- antechamber ----------
  room(ctx, { x, z: antC, w: 18, d: 18, h: H, mat: wallW, doors: { n: [x], s: [x] }, doorW: 3.2 });
  ctx.sign(['RESEARCH · LEVEL 9', 'AUTHORISED STAFF ONLY'], x, 3.15, N - .4, Math.PI, 6.2, 1, '#1a3a5a');
  ctx.sign(['BIOHAZARD', 'SAMPLE INTAKE'], x - 6.2, 2.2, antC, Math.PI / 2, 2.4, .7, '#5a1010');
  table(ctx, x + 5.4, antC, { w: 3.2, d: 1.2, h: .9, mat: K.steel });
  prop(ctx, .5, .35, .4, K.black, x + 4.6, 1.1, antC);
  prop(ctx, .28, .4, .28, glowGreen, x + 6.1, 1.15, antC);
  A.desk = [x + 5.4, antC];
  A.doorN = slabDoor(ctx, { x, z: N - .15, w: 3.2, along: 'x', mat: K.steel, open: true });
  A.doorLab = slabDoor(ctx, { x, z: ANT_S, w: 3.2, along: 'x', mat: K.steel, open: true });
  lamp(ctx, x, antC, { y: H - .08, real: true, mat: K.lampCold, color: '#d8ecff', intensity: 7, range: 16, size: [2.4, .08, .8] });

  // ---------- main lab ----------
  room(ctx, { x, z: labC, w: 42, d: 68, h: H, mat: wallW, doors: { n: [x], s: [x] }, doorW: 3.4 });
  ctx.sign(['HEMATOLOGY · ANALYZER BAY'], x, 3.3, ANT_S - .35, Math.PI, 6.4, .8, '#1a3a5a');
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
    const bx = x - 10 + c * 20, bz = ANT_S - 10 - r * 12;
    table(ctx, bx, bz, { w: 6.4, d: 1.7, h: 1, mat: K.steel });
    A.benches.push([bx, bz]);
    prop(ctx, .55, .32, .42, K.black, bx - 1.8, 1.22, bz);
    prop(ctx, .28, .55, .28, c ? K.red : glowBlue, bx + 1.4, 1.35, bz);
    prop(ctx, .18, .35, .18, glowGreen, bx + 2.1, 1.25, bz);
  }
  const ax = x - 11, az = ANT_S - 48;
  prop(ctx, 3.2, 1.55, 1.8, K.white, ax, .8, az, true);
  prop(ctx, 2.4, .12, .08, K.black, ax, 1.7, az + .86);
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256;
  const g2 = cv.getContext('2d');
  const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace;
  const drawScreen = (title, sub, tint = '#7fe0ff') => {
    g2.fillStyle = '#071018'; g2.fillRect(0, 0, 512, 256);
    g2.fillStyle = '#103040'; g2.fillRect(0, 0, 512, 28);
    g2.fillStyle = tint; g2.font = 'bold 26px sans-serif'; g2.fillText('VANCE LAB  ·  ANALYZER', 16, 22);
    g2.fillStyle = tint; g2.font = 'bold 40px sans-serif'; g2.fillText(title, 20, 108);
    g2.fillStyle = '#c8e8ff'; g2.font = '26px sans-serif';
    String(sub || '').split('\n').forEach((ln, i) => g2.fillText(ln, 20, 156 + i * 34));
    tex.needsUpdate = true;
  };
  const scr = new T.Mesh(new T.PlaneGeometry(2.2, 1.1), new T.MeshBasicMaterial({ map: tex }));
  scr.position.set(ax, 2.15, az + .95); ctx.scene.add(scr);
  drawScreen('STANDBY', 'Awaiting samples.');
  A.analyzer = { pos: [ax, az], screen: scr, draw: drawScreen };
  A.vials = [
    { id: 'keem', x: ax - 6.5, z: az + 8, label: "Give Keem's sample" },
    { id: 'dana', x: ax + 7.5, z: az + 8, label: "Give Mom's sample" },
    { id: 'biscuit', x: ax, z: az - 6, label: "Give Biscuit's sample" },
  ];
  A.vials.forEach(v => {
    prop(ctx, .7, 1.05, .7, K.steel, v.x, .55, v.z, true);
    const tube = new T.Mesh(new T.CylinderGeometry(.07, .07, .42, 8), glowBlue);
    tube.position.set(v.x, 1.28, v.z); ctx.scene.add(tube); v.tube = tube;
  });
  const fx = x + 15, fz = ANT_S - 48;
  prop(ctx, 2.2, 2.5, 1.4, K.steel, fx, 1.25, fz, true);
  prop(ctx, 1.8, 2.0, .06, glass, fx, 1.25, fz + .72);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++)
    prop(ctx, .16, .32, .16, glowRed, fx - .5 + j * .7, .7 + i * .55, fz + .55);
  A.fridge = [fx, fz];
  shelfUnit(ctx, x + 16, ANT_S - 18, { w: 4, d: .55, h: 2.4, rows: 4, goods: ['#d8f0ff', '#f0d0d0', '#c0e0c8', '#e8e0a0'], along: 'x' });
  table(ctx, x - 15, ANT_S - 18, { w: 2.4, d: 1.1, h: .9, mat: K.woodDark });
  const folder = prop(ctx, .45, .08, .32, M('#c9a04a'), x - 15, .98, ANT_S - 17.6);
  A.records = { pos: [x - 15, ANT_S - 18], folder };
  ctx.sign(['ANIMAL TRIALS', 'YEAR ONE  ·  RESTRICTED'], x - 15, 2.5, ANT_S - 16, Math.PI, 3.2, .55, '#3a2a10');

  { const cx0 = x - 16, cz = LAB_S + 12;
    wallX(ctx, cx0 - 6.5, cx0 + 6.5, cz + 8, H, glass, [{ c: cx0, w: 2.6 }]);
    wallX(ctx, cx0 - 6.5, cx0 + 6.5, cz - 8, H, glass);
    wallZ(ctx, cz + 8, cz - 8, cx0 + 6.5, H, glass);
    wallZ(ctx, cz + 8, cz - 8, cx0 - 6.5, H, glass);
    const door = slabDoor(ctx, { x: cx0, z: cz + 8, w: 2.6, along: 'x', mat: glass, glass: true, open: false });
    A.sealedLab = { door, center: [cx0, cz] };
    table(ctx, cx0, cz, { w: 3.6, d: 1.3, h: 1, mat: K.steel });
    prop(ctx, 1.1, 1.5, .9, K.white, cx0 - 3.4, .75, cz - 4, true);
    ctx.sign(['SEALED  ·  NEGATIVE PRESSURE'], cx0, 3.2, cz + 8.3, Math.PI, 4.2, .5, '#1a3a5a'); }

  A.doorHall = slabDoor(ctx, { x, z: LAB_S, w: 3.4, along: 'x', mat: K.steel, open: true });
  lamp(ctx, x - 8, ANT_S - 16, { y: H - .08, real: true, mat: K.lampCold, color: '#d8ecff', intensity: 8, range: 20, size: [2.6, .08, .8] });
  lamp(ctx, x + 8, ANT_S - 40, { y: H - .08, real: false, mat: K.lampCold, size: [2.6, .08, .8] });
  lamp(ctx, x, ANT_S - 58, { y: H - .08, real: true, mat: K.lampCold, color: '#d8ecff', intensity: 6, range: 16, size: [2.6, .08, .8] });

  const ix = x + 14, iz = LAB_S + 6;
  prop(ctx, 2.2, 2.1, 1.6, K.steelDark, ix, 1.05, iz, true);
  prop(ctx, 1.4, .15, .15, glowRed, ix, 1.7, iz + .85);
  ctx.sign(['INCINERATOR'], ix, 2.5, iz + 1, Math.PI, 2.2, .4, '#4a1010');
  A.incinerator = [ix, iz];

  // ---------- breach hall ----------
  room(ctx, { x, z: hallC, w: 22, d: 60, h: H, mat: K.wallDark, doors: { n: [x], s: [x] }, doorW: 3.4 });
  ctx.sign(['SERVICE CORRIDOR', 'ROOF  ·  PARKING'], x, 3.1, LAB_S - .35, Math.PI, 4.6, .7, '#1a2a3a');
  [[-6, 18], [6, 8], [-5.5, -2], [6.2, -14], [-6, -22], [5, 2]].forEach(([dx, ddz]) => {
    crate(ctx, x + dx, hallC + ddz, 1.15 + (Math.abs(dx) % .4), K.steelDark, dx * .08);
    A.cover.push([x + dx, hallC + ddz]);
  });
  lamp(ctx, x, hallC + 12, { y: H - .08, real: true, mat: K.lampCold, color: '#d8ecff', intensity: 6, range: 16, flicker: .2, size: [2.2, .08, .7] });
  lamp(ctx, x, hallC - 14, { y: H - .08, real: false, mat: K.lamp, flicker: .35, size: [2.2, .08, .7] });
  bloodPool(ctx, x + 3, hallC - 6, 1.0);
  A.doorArena = slabDoor(ctx, { x, z: HALL_S, w: 3.4, along: 'x', mat: K.steel, open: true });

  // ---------- arena + elevator ----------
  room(ctx, { x, z: arC, w: 36, d: 54, h: H, mat: wallW, doors: { n: [x], s: [x] }, doorW: 3.2 });
  ctx.sign(['EVACUATION LIFT'], x, 3.25, HALL_S - .35, Math.PI, 4.4, .7, '#1a3a5a');
  [[-10, 16], [10, 6], [-8, -6], [9, -14]].forEach(([dx, ddz]) => {
    prop(ctx, 2.2, .85, 1.1, K.steelDark, x + dx, .42, arC + ddz, true);
    A.cover.push([x + dx, arC + ddz]);
  });
  lamp(ctx, x, arC + 10, { y: H - .08, real: true, mat: K.lampCold, color: '#d8ecff', intensity: 7, range: 18, size: [2.8, .08, .8] });
  lamp(ctx, x, arC - 12, { y: H - .08, real: false, mat: K.lampCold, size: [2.8, .08, .8] });

  const ex = x, ez = ARENA_S + .3;
  prop(ctx, 6.2, 3.6, .35, K.steelDark, ex, 1.8, ez, true);
  wallZ(ctx, ez + .2, ez - 3.4, ex - 3.1, H, K.steelDark);
  wallZ(ctx, ez + .2, ez - 3.4, ex + 3.1, H, K.steelDark);
  wallX(ctx, ex - 3.1, ex + 3.1, ez - 3.4, H, K.steelDark);
  floor(ctx, ex, ez - 1.6, 6, 3.4, K.steel);
  const door = slabDoor(ctx, { x: ex, z: ez + .35, w: 3.1, along: 'x', mat: K.steel, open: false });
  prop(ctx, .35, .7, .1, glowGreen, ex + 2.15, 1.45, ez + .55);
  ctx.sign(['ELEVATOR', 'PARKING  ·  WATERFRONT'], ex, 3.35, ez + .6, 0, 3.4, .65, '#1a2a4a');
  A.elevator = { door, pos: [ex, ez + 3.2], inside: [ex, ez - 1.4] };
  A.bossSpot = [x, arC];
  A.door = { n: [x, N] };
  A.ANT_S = ANT_S; A.LAB_S = LAB_S; A.HALL_S = HALL_S; A.ARENA_S = ARENA_S;
  A.antC = antC; A.labC = labC; A.hallC = hallC; A.arC = arC;

  const strobes = [];
  [antC, labC, hallC, arC].forEach(zz => {
    const s = lamp(ctx, x, zz, { mat: K.lampRed, size: [.4, .18, .4], y: H - .2, real: false });
    strobes.push(s); A.alarms.push(s);
  });
  A.alarmOn = false;
  A.setAlarm = (on) => { A.alarmOn = !!on; };
  ctx.updaters.push((dt, t) => {
    const k = A.alarmOn ? (Math.sin(t * 10) > 0 ? 2.8 : .15) : 0;
    strobes.forEach(s => { if (s.mesh && s.mesh.material) s.mesh.material.emissiveIntensity = k; });
  });
  addCeil(ctx, x, antC, 18, 18, H);
  addCeil(ctx, x, labC, 42, 68, H);
  addCeil(ctx, x, hallC, 22, 60, H);
  addCeil(ctx, x, arC, 36, 54, H);
  dressLab(ctx, A, { x, H, ANT_S, LAB_S, HALL_S, ARENA_S, antC, labC, hallC, arC });

  A.setScreen = drawScreen;
  return A;
}

function ceilTex(ctx, w, d) {
  if (!ctx._ch14Ceil) {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128;
    const g = cv.getContext('2d');
    g.fillStyle = '#9aa4aa'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#5e686e'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(128, 0); g.moveTo(0, 0); g.lineTo(0, 128); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.18)';
    for (let i = 0; i < 90; i++) g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
    const tex = new ctx.THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = ctx.THREE.RepeatWrapping; tex.colorSpace = ctx.THREE.SRGBColorSpace; tex.anisotropy = 4;
    ctx._ch14Ceil = tex;
  }
  const tex = ctx._ch14Ceil.clone(); tex.repeat.set(Math.max(.5, w / 1.2), Math.max(.5, d / 1.2));
  return new ctx.THREE.MeshStandardMaterial({ map: tex, color: '#e4e8ea', roughness: .92, metalness: 0, emissive: '#2c3338', emissiveMap: tex, emissiveIntensity: .4, side: ctx.THREE.FrontSide });
}
function addCeil(ctx, x, z, w, d, h) {
  const T = ctx.THREE, m = new T.Mesh(new T.PlaneGeometry(w, d), ceilTex(ctx, w, d));
  m.rotation.x = Math.PI / 2; m.position.set(x, h, z); ctx.scene.add(m);
  const trim = new T.MeshStandardMaterial({ color: '#3a4348', roughness: .85 });
  const put = (cx, cz, lw, ld) => { const t = new T.Mesh(new T.BoxGeometry(lw, .18, ld), trim); t.position.set(cx, h - .09, cz); ctx.scene.add(t); };
  put(x, z + d / 2, w, .14); put(x, z - d / 2, w, .14); put(x - w / 2, z, .14, d); put(x + w / 2, z, .14, d);
}
function stripeTex(ctx) {
  if (ctx._ch14Stripe) return ctx._ch14Stripe;
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
  const g = cv.getContext('2d');
  g.fillStyle = '#e0b020'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#1a1a1a';
  for (let i = -64; i < 128; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 16, 0); g.lineTo(i + 48, 64); g.lineTo(i + 32, 64); g.closePath(); g.fill(); }
  const tex = new ctx.THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = ctx.THREE.RepeatWrapping; tex.colorSpace = ctx.THREE.SRGBColorSpace;
  ctx._ch14Stripe = tex; return tex;
}
function stripe(ctx, x, z, w, d, rot = 0) {
  const T = ctx.THREE, tex = stripeTex(ctx).clone(); tex.repeat.set(w / .4, d / .4);
  const m = new T.Mesh(new T.PlaneGeometry(w, d), new T.MeshStandardMaterial({ map: tex, roughness: .7, metalness: .05 }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = rot; m.position.set(x, .055, z); ctx.scene.add(m); return m;
}
function mesh(ctx, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new ctx.THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); ctx.scene.add(m); return m;
}
function dressLab(ctx, A, B) {
  const T = ctx.THREE, K = mats(ctx), { x, H, ANT_S, LAB_S, HALL_S, ARENA_S, antC, labC, hallC, arC } = B;
  const waist = new T.MeshStandardMaterial({ color: '#c5ced3', roughness: .75 });
  const base = new T.MeshStandardMaterial({ color: '#8a949a', roughness: .7 });
  const pipeM = new T.MeshStandardMaterial({ color: '#7a848c', metalness: .7, roughness: .35 });
  const pipeB = new T.MeshStandardMaterial({ color: '#3a7a9a', metalness: .55, roughness: .4 });
  const cab = new T.MeshStandardMaterial({ color: '#d5dce0', roughness: .55, metalness: .15 });
  const screenM = new T.MeshStandardMaterial({ color: '#07141c', emissive: '#1a6a9a', emissiveIntensity: .9, roughness: .25 });
  const vialGlass = new T.MeshStandardMaterial({ color: '#7fe0ff', emissive: '#1aa8d8', emissiveIntensity: 1.1, roughness: .2, transparent: true, opacity: .85 });
  const sconceM = new T.MeshStandardMaterial({ color: '#d8ecff', emissive: '#b8dcff', emissiveIntensity: 2.2, roughness: .3 });

  const band = (ax, az, along, len) => {
    if (along === 'x') {
      mesh(ctx, new T.BoxGeometry(len, 1.05, .06), waist, ax, .52, az);
      mesh(ctx, new T.BoxGeometry(len, .1, .08), base, ax, .05, az);
    } else {
      mesh(ctx, new T.BoxGeometry(.06, 1.05, len), waist, ax, .52, az);
      mesh(ctx, new T.BoxGeometry(.08, .1, len), base, ax, .05, az);
    }
  };
  band(x, antC + 9 - .22, 'x', 18);
  band(x, antC - 9 + .22, 'x', 18);
  band(x - 9 + .22, antC, 'z', 18);
  band(x + 9 - .22, antC, 'z', 18);
  band(x, labC + 34 - .22, 'x', 42);
  band(x, labC - 34 + .22, 'x', 42);
  band(x - 21 + .22, labC, 'z', 68);
  band(x + 21 - .22, labC, 'z', 68);
  band(x, hallC + 30 - .22, 'x', 22);
  band(x, hallC - 30 + .22, 'x', 22);
  band(x - 11 + .22, hallC, 'z', 60);
  band(x + 11 - .22, hallC, 'z', 60);
  band(x, arC + 27 - .22, 'x', 36);
  band(x, arC - 27 + .22, 'x', 36);
  band(x - 18 + .22, arC, 'z', 54);
  band(x + 18 - .22, arC, 'z', 54);

  stripe(ctx, x, ANT_S, 3.6, .7);
  stripe(ctx, x, LAB_S, 3.8, .7);
  stripe(ctx, x, HALL_S, 3.8, .7);
  stripe(ctx, x + 14, LAB_S + 7.2, 2.8, .55);
  stripe(ctx, x, ARENA_S + .6, 4.2, .7);

  const cyl = (r, l) => new T.CylinderGeometry(r, r, l, 8);
  mesh(ctx, cyl(.07, 60), pipeM, x - 7, H - .35, labC, Math.PI / 2, 0, 0);
  mesh(ctx, cyl(.07, 60), pipeM, x + 7, H - .35, labC, Math.PI / 2, 0, 0);
  mesh(ctx, cyl(.08, 50), pipeB, x - 9.2, H - .55, hallC, Math.PI / 2, 0, 0);
  mesh(ctx, cyl(.06, 44), pipeM, x + 10.4, 2.85, hallC, Math.PI / 2, 0, 0);
  mesh(ctx, cyl(.07, 46), pipeM, x - 15.5, H - .4, arC, Math.PI / 2, 0, 0);
  mesh(ctx, cyl(.07, 46), pipeB, x + 15.5, H - .4, arC, Math.PI / 2, 0, 0);
  for (const [px, pz] of [[-7, labC + 20], [-7, labC - 20], [7, labC + 10], [7, labC - 24], [-15.5, arC + 10], [15.5, arC - 8]]) {
    mesh(ctx, new T.BoxGeometry(.04, .3, .04), pipeM, x + px, H - .22, pz);
  }

  const sconce = (sx, sz, ry) => {
    mesh(ctx, new T.BoxGeometry(.28, .12, .16), K.steelDark, sx, 2.35, sz, 0, ry, 0);
    mesh(ctx, new T.BoxGeometry(.22, .08, .1), sconceM, sx, 2.35, sz, 0, ry, 0);
  };
  sconce(x - 20.6, labC + 16, Math.PI / 2);
  sconce(x - 20.6, labC - 16, Math.PI / 2);
  sconce(x + 20.6, labC + 8, -Math.PI / 2);
  sconce(x + 20.6, labC - 20, -Math.PI / 2);
  sconce(x - 10.6, hallC + 8, Math.PI / 2);
  sconce(x + 10.6, hallC - 8, -Math.PI / 2);
  sconce(x - 17.6, arC + 4, Math.PI / 2);
  sconce(x + 17.6, arC - 8, -Math.PI / 2);

  const monitor = (mx, mz, ry) => {
    mesh(ctx, new T.BoxGeometry(1.3, .85, .08), K.steelDark, mx, 1.85, mz, 0, ry, 0);
    mesh(ctx, new T.BoxGeometry(1.15, .7, .03), screenM, mx, 1.85, mz, 0, ry, 0);
  };
  monitor(x + 20.7, ANT_S - 28, -Math.PI / 2);
  monitor(x + 20.7, ANT_S - 30, -Math.PI / 2);
  monitor(x - 20.7, ANT_S - 32, Math.PI / 2);
  monitor(x - 17.6, arC + 18, Math.PI / 2);

  const rack = (rx, rz) => {
    mesh(ctx, new T.BoxGeometry(1.6, 1.5, .4), K.steel, rx, .75, rz);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
      mesh(ctx, new T.CylinderGeometry(.04, .04, .28, 6), vialGlass, rx - .6 + c * .3, .35 + r * .42, rz + .12);
    }
  };
  rack(x - 19.4, ANT_S - 28);
  rack(x - 19.4, ANT_S - 36);

  [[x + 19.8, ANT_S - 12, true], [x + 19.8, ANT_S - 22, true], [x + 16.5, arC + 20, false], [x - 16.5, arC + 20, false]].forEach(([cx, cz, alongZ]) => {
    mesh(ctx, new T.BoxGeometry(alongZ ? .45 : 2.2, 1.8, alongZ ? 2.2 : .45), cab, cx, .9, cz);
    mesh(ctx, new T.BoxGeometry(alongZ ? .06 : 2.0, .04, alongZ ? 2.0 : .06), K.steelDark, cx, 1.4, cz);
  });

  table(ctx, x - 14, arC + 18, { w: 3.2, d: 1.0, h: .85, mat: K.steel });
  table(ctx, x + 14, arC + 18, { w: 3.2, d: 1.0, h: .85, mat: K.steel });
  table(ctx, x - 14, arC - 18, { w: 3.2, d: 1.0, h: .85, mat: K.steel });
  table(ctx, x + 14, arC - 18, { w: 3.2, d: 1.0, h: .85, mat: K.steel });
  mesh(ctx, new T.BoxGeometry(.45, 1.8, 2.2), cab, x - 17.5, .9, arC - 10);
  mesh(ctx, new T.BoxGeometry(.45, 1.8, 2.2), cab, x + 17.5, .9, arC - 10);
  stripe(ctx, x - 8, arC, 2.4, .5);
  stripe(ctx, x + 8, arC, 2.4, .5);

  prop(ctx, .5, .32, .4, K.black, x - 14.6, 1.1, arC + 18);
  prop(ctx, .28, .4, .28, K.lampCold, x - 13.2, 1.2, arC + 18);
  prop(ctx, .5, .32, .4, K.black, x + 13.4, 1.1, arC + 18);

  const panel = (px, pz, w = 2.2, d = .7) => { mesh(ctx, new T.BoxGeometry(w, .05, d), K.lampCold, px, H - .06, pz); };
  panel(x, antC + 4); panel(x, antC - 4);
  panel(x - 10, ANT_S - 22); panel(x + 10, ANT_S - 34); panel(x - 10, ANT_S - 52); panel(x + 4, ANT_S - 62);
  panel(x, hallC + 22, 1.8, .55); panel(x, hallC - 4, 1.8, .55); panel(x, hallC - 24, 1.8, .55);
  panel(x - 8, arC + 16); panel(x + 8, arC + 2); panel(x - 6, arC - 16); panel(x + 6, arC - 22);

  mesh(ctx, new T.BoxGeometry(1.2, .08, 50), K.steelDark, x, H - .7, labC);
  mesh(ctx, new T.BoxGeometry(1.05, .04, 50), pipeM, x, H - .64, labC);
}
