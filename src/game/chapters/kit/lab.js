// KIT · research lab (clean-room white): lab benches, blood analyzer, blood fridge, a glass-walled sealed lab, and an elevator at the south end.
// buildLab(ctx, { x, z }) -> anchors. {x,z} = north-centre; runs toward -z, 40 wide x 80 long.
import { mats, floor, wallX, wallZ, room, lamp, slabDoor, prop, table, shelfUnit, bloodPool } from './common.js';

export function buildLab(ctx, { x = 0, z = -3760, w = 40, d = 80 } = {}) { const K = mats(ctx), T = ctx.THREE, H = 3.8, A = { rect: [x, z - d / 2, w, d], benches: [] };
  floor(ctx, x, z - d / 2, w, d, K.floorWhite); room(ctx, { x, z: z - d / 2, w, d, h: H, mat: K.wall, doors: { n: [x] }, doorW: 3.4 });
  ctx.sign(['RESEARCH · LEVEL 9', 'AUTHORISED STAFF ONLY'], x, 3.2, z - .3, Math.PI, 6, 1, '#1a3a5a');
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) { const bx = x - 11 + c * 22 * .5 + (c ? 4 : 0), bz = z - 12 - r * 10; table(ctx, bx, bz, { w: 6, d: 1.6, h: 1, mat: K.steel }); A.benches.push([bx, bz]);
    prop(ctx, .5, .3, .4, K.black, bx - 1.5, 1.2, bz); prop(ctx, .3, .5, .3, K.red, bx + 1, 1.3, bz); }
  // blood analyzer (the machine that runs the result in Ch 14) + blood fridge
  prop(ctx, 2.2, 1.4, 1.2, K.white, x - 12, .7, z - 46, true); prop(ctx, 1.8, .5, .08, K.blue, x - 12, 1.5, z - 45.4); A.analyzer = [x - 12, z - 46];
  prop(ctx, 1.6, 2.2, 1.2, K.steel, x + 14, 1.1, z - 46, true); prop(ctx, 1.2, 1.6, .06, K.glass, x + 14, 1.1, z - 45.4); A.fridge = [x + 14, z - 46];
  // sealed glass lab (west wall alcove) with a lockable glass door
  { const cx = x - 14, cz = z - 62; wallX(ctx, cx - 6, cx + 6, cz + 8, H, K.glass, [{ c: cx, w: 2.6 }]); wallX(ctx, cx - 6, cx + 6, cz - 8, H, K.glass); wallZ(ctx, cz + 8, cz - 8, cx + 6, H, K.glass); const door = slabDoor(ctx, { x: cx, z: cz + 8, w: 2.6, along: 'x', mat: K.glass, glass: true }); A.sealedLab = { door, center: [cx, cz] };
    table(ctx, cx, cz, { w: 4, d: 1.4, h: 1, mat: K.steel }); prop(ctx, 1, 1.4, .8, K.white, cx - 4, .7, cz - 5, true); }
  // elevator at the south end
  { const ex = x, ez = z - d + .6; prop(ctx, 5.6, 3.2, .3, K.steelDark, ex, 1.6, ez, true); const door = slabDoor(ctx, { x: ex, z: ez + .3, w: 3, along: 'x', mat: K.steel }); A.elevator = { door, pos: [ex, ez + 3] }; prop(ctx, .4, .8, .1, K.green, ex + 2, 1.5, ez + .4); ctx.sign(['ELEVATOR', 'ROOF · PARKING'], ex, 3.4, ez + .5, 0, 3, .6, '#1a2a4a'); }
  for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) lamp(ctx, x - 8 + j * 16, z - 10 - i * 16, { real: (i + j) % 2 === 0 && i < 4, mat: K.lampCold, color: '#d8ecff', intensity: 8, range: 18, flicker: i === 3 ? .4 : 0, size: [2, .1, .6] });
  bloodPool(ctx, x + 4, z - 30, 1.1); A.door = { n: [x, z] }; A.alarmLamp = lamp(ctx, x, z - 70, { mat: K.lampRed, size: [.4, .4, .4], y: 3.4 }); return A; }
