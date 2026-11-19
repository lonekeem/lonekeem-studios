// KIT · hospital upper-floor rooms for the chase chapter: gift shop, kids' ward, cafeteria (with kitchen). Each is a self-contained room set; place them in a row along -z.
// buildGiftShop / buildKidsWard / buildCafeteria (ctx, { x, z }) -> anchors. {x,z} = centre-north of the piece; they extend toward -z. Doorways connect on the north/south walls (centre x).
import { mats, floor, wallX, wallZ, room, lamp, slabDoor, prop, table, crate, shelfUnit, bloodPool } from './common.js';

function balloons(ctx, x, z, n = 6, seed = 1) { const T = ctx.THREE, cols = ['#e04a4a', '#4a8ae0', '#e0c040', '#4ac070', '#c060d0'];
  for (let i = 0; i < n; i++) { const m = new T.Mesh(new T.SphereGeometry(.28, 10, 8), new T.MeshStandardMaterial({ color: cols[(i + seed) % cols.length], roughness: .35 })); const a = i * 2.4 + seed; m.position.set(x + Math.cos(a) * .5, 2.3 + (i % 3) * .35, z + Math.sin(a) * .5); m.scale.y = 1.2; ctx.scene.add(m); } prop(ctx, .04, 2, .04, mats(ctx).white, x, 1, z); }

export function buildGiftShop(ctx, { x = 0, z = -3320, w = 22, d = 26 } = {}) { const K = mats(ctx), A = { rect: [x, z - d / 2, w, d], rabbitSpots: [], size: [w, d] };
  floor(ctx, x, z - d / 2, w, d, K.lino); room(ctx, { x, z: z - d / 2, w, d, mat: K.wallYellow, doors: { n: [x], s: [x] }, doorW: 3 });
  ctx.sign(['GIFT SHOP', 'FLOWERS · CARDS · SNACKS'], x, 3.1, z - 0.3, Math.PI, 5, 1, '#7a3a60');
  for (let i = 0; i < 3; i++) shelfUnit(ctx, x - 6 + i * 6, z - 9, { w: 4, rows: 3 }); prop(ctx, 6, 1, 1.2, K.wood, x + 6, .5, z - 4, true); // counter
  for (let i = 0; i < 4; i++) { balloons(ctx, x - 8 + i * 5.2, z - 20, 6, i); } // balloon stands
  for (let i = 0; i < 3; i++) prop(ctx, .9, 1.6, .5, K.pink, x - 9 + i * 1.1, .8, z - 24, true); // plush display
  [[-7, -14], [7, -17]].forEach(([a, b]) => A.rabbitSpots.push([x + a, z + b])); lamp(ctx, x, z - d / 2, { real: true, intensity: 7, range: 18, flicker: .2 }); lamp(ctx, x - 6, z - 18, { mat: K.lamp }); bloodPool(ctx, x + 2, z - 12, 1.2); A.door = { n: [x, z], s: [x, z - d] }; return A; }

export function buildKidsWard(ctx, { x = 0, z = -3420, w = 30, d = 30 } = {}) { const K = mats(ctx), A = { rect: [x, z - d / 2, w, d], rabbitSpots: [], size: [w, d] };
  floor(ctx, x, z - d / 2, w, d, K.tileGreen); room(ctx, { x, z: z - d / 2, w, d, mat: K.wallBlue, doors: { n: [x], s: [x] }, doorW: 3 });
  ctx.sign(['CHILDREN\'S WARD', 'PLEASE USE THE HAND GEL'], x, 3.1, z - 0.3, Math.PI, 6, 1, '#2a6aa0');
  for (let i = 0; i < 3; i++) wallX(ctx, x - w / 2 + 1, x + w / 2 - 1, z - 10 - i * 6, 1.4, K.wallPink, [{ c: x, w: 6, lintel: false }, ...(i % 2 ? [{ c: x - 10, w: 3, lintel: false }] : [{ c: x + 10, w: 3, lintel: false }])], .2); // low painted partitions with gaps
  for (let i = 0; i < 6; i++) { const bx = x + (i % 2 ? 9 : -9) * (1 + (i > 3 ? .3 : 0)), bz = z - 7 - Math.floor(i / 2) * 7; prop(ctx, 1.1, .6, 2.2, K.white, bx, .45, bz, true); prop(ctx, 1, .12, 1.6, K.blue, bx, .85, bz + .2); }
  for (let i = 0; i < 6; i++) balloons(ctx, x - 12 + i * 4.8, z - 26, 5, i + 2);
  for (let i = 0; i < 4; i++) { const t = new ctx.THREE.Mesh(new ctx.THREE.SphereGeometry(.4, 8, 8), [K.pink, K.yellow, K.blue, K.green][i].clone()); t.position.set(x - 4 + i * 2.6, .4, z - 18 + (i % 2) * 2); ctx.scene.add(t); } // toy balls
  [[-10, -22], [11, -14], [0, -26]].forEach(([a, b]) => A.rabbitSpots.push([x + a, z + b])); lamp(ctx, x, z - 8, { real: true, intensity: 7, range: 18 }); lamp(ctx, x, z - 22, { real: true, intensity: 7, range: 18, flicker: .35 }); A.door = { n: [x, z], s: [x, z - d] }; return A; }

export function buildCafeteria(ctx, { x = 0, z = -3520, w = 40, d = 40 } = {}) { const K = mats(ctx), A = { rect: [x, z - d / 2, w, d], rabbitSpots: [], size: [w, d], tables: [] };
  floor(ctx, x, z - d / 2, w, d, K.tile); room(ctx, { x, z: z - d / 2, w, d, mat: K.wall, doors: { n: [x], s: [x] }, doorW: 3.4 });
  ctx.sign(['CAFETERIA', 'HOT MEALS · SOUP OF THE DAY'], x, 3.1, z - .3, Math.PI, 6, 1, '#7a4a1a');
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const tx = x - 12 + c * 8, tz = z - 8 - r * 6.5; table(ctx, tx, tz, { w: 3.2, d: 1.2, mat: K.white }); prop(ctx, 3.2, .06, .4, K.steelDark, tx, .45, tz + 1.1); A.tables.push([tx, tz]); } // tables with benches
  // serving line + kitchen at the far (south) end, with a pass-through opening in the middle
  wallX(ctx, x - w / 2, x + w / 2, z - 29, 3.6, K.wallGreen, [{ c: x, w: 6, lintel: false }], .5); prop(ctx, 14, 1, 1.4, K.steel, x - 10, .5, z - 27, true); prop(ctx, 14, 1, 1.4, K.steel, x + 10, .5, z - 27, true); // counters
  const kc = [x, z - 36]; A.kitchen = kc; floor(ctx, x, z - 35, w - 1, 11, K.tileDark, .035);
  { const T = ctx.THREE, kettle = new T.Mesh(new T.CylinderGeometry(1.5, 1.5, 1.6, 20), K.steel); kettle.position.set(x, .8, z - 36); kettle.castShadow = true; ctx.scene.add(kettle); ctx.box(x - 1.5, x + 1.5, z - 37.5, z - 34.5); A.kettle = [x, z - 36]; A.kettleTopY = 1.7; // the big soup kettle (Biscuit's perch)
    const lid = new T.Mesh(new T.CylinderGeometry(1.55, 1.55, .12, 20), K.steelDark); lid.position.set(x, 1.66, z - 36); ctx.scene.add(lid); }
  for (let i = 0; i < 3; i++) prop(ctx, 4, 1, 1.4, K.steel, x - 12 + i * 12, .5, z - 33, true); shelfUnit(ctx, x + 14, z - 38, { w: 5, rows: 3 });
  bloodPool(ctx, x - 4, z - 20, 1.5); bloodPool(ctx, x + 8, z - 10, 1); // spilled soup-ish puddles are also blood-red on purpose
  [[-12, -14], [10, -20], [x, -33]].forEach(([a, b]) => A.rabbitSpots.push([x + (a === x ? 0 : a), z + b])); for (let i = 0; i < 4; i++) lamp(ctx, x - 12 + i * 8, z - 14, { real: i % 2 === 0, intensity: 7, range: 18, flicker: i === 3 ? .5 : 0 }); lamp(ctx, x, z - 36, { real: true, intensity: 8, range: 18 });
  A.door = { n: [x, z], s: [x, z - d] }; A.bossSpot = [x, z - 33]; return A; }
