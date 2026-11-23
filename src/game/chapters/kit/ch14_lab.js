// Chapter 14 lab set — owned by ch14. Clean-room research floor: antechamber, analyzer lab,
// sealed glass bay, cover-filled breach hall, and a south arena with an elevator.
// {x,z} = north wall centre of the antechamber; the set runs toward -z in the ch14 band (-3700..-4000).
import { mats, floor, wallX, wallZ, room, lamp, slabDoor, prop, table, shelfUnit, bloodPool, crate } from './common.js';

export function buildCh14Lab(ctx, { x = 0, z = -3704 } = {}) {
  const K = mats(ctx), T = ctx.THREE, H = 4.1, A = { benches: [], lamps: [], cover: [], alarms: [] };
  const M = (c, o = {}) => new T.MeshStandardMaterial({ color: c, roughness: .85, ...o });
  const tile = M('#cfd6d8', { roughness: .42, metalness: .08 });
  const tile2 = M('#b7c0c4', { roughness: .5 });
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

  floor(ctx, x, antC, 18, 18, tile);
  floor(ctx, x, labC, 42, 68, tile);
  floor(ctx, x, hallC, 22, 60, tile2);
  floor(ctx, x, arC, 36, 54, tile);
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
  lamp(ctx, x, antC, { real: true, mat: K.lampCold, color: '#d8ecff', intensity: 7, range: 16, size: [2.2, .1, .7] });

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
  lamp(ctx, x - 8, ANT_S - 16, { real: true, mat: K.lampCold, color: '#d8ecff', intensity: 8, range: 20, size: [2.4, .1, .7] });
  lamp(ctx, x + 8, ANT_S - 40, { real: false, mat: K.lampCold, size: [2.4, .1, .7] });
  lamp(ctx, x, ANT_S - 58, { real: true, mat: K.lampCold, color: '#d8ecff', intensity: 6, range: 16, size: [2.4, .1, .7] });

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
  lamp(ctx, x, hallC + 12, { real: true, mat: K.lampCold, color: '#d8ecff', intensity: 6, range: 16, flicker: .2, size: [1.8, .1, .5] });
  lamp(ctx, x, hallC - 14, { real: false, mat: K.lamp, flicker: .35, size: [1.8, .1, .5] });
  bloodPool(ctx, x + 3, hallC - 6, 1.0);
  A.doorArena = slabDoor(ctx, { x, z: HALL_S, w: 3.4, along: 'x', mat: K.steel, open: true });

  // ---------- arena + elevator ----------
  room(ctx, { x, z: arC, w: 36, d: 54, h: H, mat: wallW, doors: { n: [x], s: [x] }, doorW: 3.2 });
  ctx.sign(['EVACUATION LIFT'], x, 3.25, HALL_S - .35, Math.PI, 4.4, .7, '#1a3a5a');
  [[-10, 16], [10, 6], [-8, -6], [9, -14]].forEach(([dx, ddz]) => {
    prop(ctx, 2.2, .85, 1.1, K.steelDark, x + dx, .42, arC + ddz, true);
    A.cover.push([x + dx, arC + ddz]);
  });
  lamp(ctx, x, arC + 10, { real: true, mat: K.lampCold, color: '#d8ecff', intensity: 7, range: 18, size: [2.6, .1, .7] });
  lamp(ctx, x, arC - 12, { real: false, mat: K.lampCold, size: [2.6, .1, .7] });

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
    const s = lamp(ctx, x, zz, { mat: K.lampRed, size: [.45, .45, .45], y: 3.55, real: false });
    strobes.push(s); A.alarms.push(s);
  });
  A.alarmOn = false;
  A.setAlarm = (on) => { A.alarmOn = !!on; };
  ctx.updaters.push((dt, t) => {
    const k = A.alarmOn ? (Math.sin(t * 10) > 0 ? 2.8 : .15) : 0;
    strobes.forEach(s => { if (s.mesh && s.mesh.material) s.mesh.material.emissiveIntensity = k; });
  });
  A.setScreen = drawScreen;
  return A;
}
