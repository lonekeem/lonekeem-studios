// KIT · hospital sub-basement: a long service corridor with a morgue (west), boiler room (east), storage (west) and a cell block at the far end.
// buildBasement(ctx, { x, z, length = 260 }) -> anchors. Start at z (north end), runs toward -z. Corridor is 8 wide (x-4..x+4). No ceiling (camera-friendly).
import { mats, floor, wallX, wallZ, room, lamp, slabDoor, prop, table, crate, shelfUnit, bloodPool } from './common.js';

export function buildBasement(ctx, { x = 0, z = -2900, length = 260 } = {}) {
  const K = mats(ctx), T = ctx.THREE, H = 3.6, end = z - length; const A = { start: [x, z - 6], end: [x, end + 10], fuses: [], cells: [], lights: [] };
  floor(ctx, x, z - length / 2, 8, length, K.tileDark); // corridor
  // corridor walls with door gaps to the rooms
  const gapsW = [{ c: z - 55, w: 3 }, { c: z - 115, w: 3 }], gapsE = [{ c: z - 55, w: 3 }, { c: z - 115, w: 3 }];
  wallZ(ctx, z, z - 160, x - 4, H, K.wallGreen, gapsW); wallZ(ctx, z, z - 160, x + 4, H, K.wallGreen, gapsE);
  wallX(ctx, x - 4, x + 4, z, H, K.wallDark); // closed north end
  // corridor lamps (every 12 m; a few real lights, some flicker)
  for (let i = 0, zz = z - 8; zz > z - 150; zz -= 12, i++) A.lights.push(lamp(ctx, x, zz, { real: i % 3 === 0, intensity: 7, range: 14, flicker: i % 2 ? .5 : .15, mat: i % 4 === 1 ? K.lampCold : K.lamp }));
  // MORGUE (west of corridor, z-55): steel tables, wall drawers, drains
  { const cx = x - 12, cz = z - 55; floor(ctx, cx, cz, 16, 20, K.tile); room(ctx, { x: cx, z: cz, w: 16, d: 20, mat: K.wallBlue, doors: { e: [cz] } });
    [[-3, -4], [3, -4], [-3, 3], [3, 3]].forEach(([a, b]) => { table(ctx, cx + a, cz + b, { w: 2.2, d: .9, h: .9, mat: K.steel, legMat: K.steelDark }); });
    for (let i = 0; i < 6; i++) prop(ctx, .6, 1.1, .12, K.steel, cx - 7.8 + (i % 3) * .0, .8 + Math.floor(i / 3) * 1.2, cz - 6 + (i % 3) * 3.6, false).rotation.y = Math.PI / 2;
    bloodPool(ctx, cx + 1, cz + 1, 1.3); lamp(ctx, cx, cz, { real: true, mat: K.lampCold, intensity: 6, range: 12, flicker: .6 }); A.morgue = [cx, cz]; }
  // BOILER ROOM (east, z-55): tanks, pipes, fuse boxes on the wall (A.fuses = pick-up spots for a "restore power" objective)
  { const cx = x + 12, cz = z - 55; floor(ctx, cx, cz, 16, 20, K.concrete); room(ctx, { x: cx, z: cz, w: 16, d: 20, mat: K.wallDark, doors: { w: [cz] } });
    [[-3, -3], [3, -3], [0, 4]].forEach(([a, b]) => { const t = new T.Mesh(new T.CylinderGeometry(1.4, 1.4, 3, 16), K.steel); t.position.set(cx + a * 1.4, 1.5, cz + b * 1.6); t.castShadow = true; ctx.scene.add(t); ctx.box(cx + a * 1.4 - 1.4, cx + a * 1.4 + 1.4, cz + b * 1.6 - 1.4, cz + b * 1.6 + 1.4); });
    for (let i = 0; i < 4; i++) prop(ctx, .25, .25, 18, K.rust, cx - 7 + i * 4.5, 3, cz); // overhead pipes
    A.fuses.push([cx + 6.6, cz - 8], [cx - 6.6, cz + 8], [cx + 6.6, cz + 8]); A.fuses.forEach(([fx, fz]) => prop(ctx, .3, .9, .6, K.red, fx, 1.3, fz)); lamp(ctx, cx, cz, { real: true, mat: K.lampRed, color: '#ff5030', intensity: 6, range: 12, flicker: .3 }); A.boiler = [cx, cz]; A.generator = [cx, cz - 7]; prop(ctx, 3, 1.6, 1.8, K.yellow, cx, .8, cz - 7, true); }
  // STORAGE (west, z-115): shelves of medical boxes
  { const cx = x - 12, cz = z - 115; floor(ctx, cx, cz, 16, 20, K.lino); room(ctx, { x: cx, z: cz, w: 16, d: 20, mat: K.wall, doors: { e: [cz] } });
    for (let i = 0; i < 4; i++) shelfUnit(ctx, cx - 3 + (i % 2) * 6, cz - 6 + Math.floor(i / 2) * 7, { w: 4, rows: 3 }); crate(ctx, cx + 5, cz + 7, 1.2); A.storage = [cx, cz]; }
  // CELL BLOCK (far end): a hall with 3 cells on its west side, each behind a lockable glass-hatch door (A.cells[i].door.setOpen(true) frees the cell)
  { const cx = x, cz = z - 200, w = 26, d = 80; floor(ctx, cx, cz, w, d, K.floorWhite); room(ctx, { x: cx, z: cz, w, d, mat: K.wall, doors: { n: [cx] } });
    wallZ(ctx, cz + 18, cz - 18, x - 4, H, K.wallBlue, [-12, 0, 12].map(o => ({ c: cz + o, w: 2.4 }))); // divider between hall (east) and cells (west)
    [-18, -6, 6, 18].forEach(o => wallX(ctx, x - 13, x - 4, cz + o, H, K.wallBlue)); // walls between cells
    [-12, 0, 12].forEach(o => { const door = slabDoor(ctx, { x: x - 4, z: cz + o, w: 2.4, along: 'z', mat: K.glass, glass: true }); const cell = { door, center: [x - 9, cz + o], doorPos: [x - 4, cz + o] };
      prop(ctx, 2.8, .5, 1.6, K.fabric, x - 11, .3, cz + o - 2.2); prop(ctx, .1, 1, 1.2, K.steel, x - 4.3, 1.5, cz + o + 1.8); A.cells.push(cell); });
    A.momCell = A.cells[1]; A.cellHall = [cx, cz]; for (let zz = cz + 30; zz > cz - 34; zz -= 14) lamp(ctx, cx + 4, zz, { real: Math.round(zz) % 28 === 0, mat: K.lampCold, intensity: 6, range: 14, flicker: .2 }); bloodPool(ctx, cx + 5, cz + 4, 1.6); }
  // far-end exit stairs landing (a door the builder can lock/unlock)
  A.exit = [x, end + 4]; wallX(ctx, x - 4, x + 4, end, H, K.wallDark); prop(ctx, 3, 3, .3, K.steelDark, x, 1.5, end + .3); ctx.sign(['STAIRS · LEVEL 1'], x, 3.1, end + .5, 0, 3, .6, '#1a3a5a');
  return A;
}
