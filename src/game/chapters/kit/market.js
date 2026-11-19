// KIT · waterfront market food hall (fish / cheese / produce stalls under awnings, a giant fibreglass lobster out front) + a walk-in freezer.
// buildMarket(ctx, { x, z }) -> anchors incl. trapSlots (positions for the booby-trap builder). buildFreezer(ctx, { x, z }) -> its own room, door on the north wall.
import { mats, floor, wallX, wallZ, room, lamp, slabDoor, prop, table, crate, bloodPool } from './common.js';

export function buildMarket(ctx, { x = 0, z = -4160, w = 48, d = 90 } = {}) { const K = mats(ctx), T = ctx.THREE, A = { rect: [x, z - d / 2, w, d], stalls: [], trapSlots: [] };
  floor(ctx, x, z - d / 2, w, d, K.concrete); room(ctx, { x, z: z - d / 2, w, d, h: 6, mat: K.brick, doors: { n: [x], s: [x] }, doorW: 6 });
  ctx.sign(['HARBORSIDE MARKET', 'FISH · CHEESE · BREAD · EST. 1826'], x, 5.2, z - .4, Math.PI, 12, 1.8, '#2a4a3a');
  // giant fibreglass lobster mascot outside the north door (decor)
  { const L = new T.Group(), red = new T.MeshStandardMaterial({ color: '#c8281c', roughness: .45 }); const body = new T.Mesh(new T.SphereGeometry(1.4, 16, 12), red); body.scale.set(.8, .7, 1.8); body.position.y = 1.6; L.add(body);
    [-1, 1].forEach(s => { const arm = new T.Mesh(new T.CylinderGeometry(.2, .3, 2.2, 8), red); arm.rotation.x = Math.PI / 2.4; arm.position.set(s * 1.1, 1.8, 2.2); L.add(arm); const claw = new T.Mesh(new T.SphereGeometry(.7, 12, 8), red); claw.scale.set(.8, .5, 1.2); claw.position.set(s * 1.3, 2.1, 3.4); L.add(claw);
      const eye = new T.Mesh(new T.SphereGeometry(.14, 8, 8), K.black); eye.position.set(s * .4, 2.2, -2.2); L.add(eye); }); const tail = new T.Mesh(new T.ConeGeometry(.9, 2.4, 8), red); tail.rotation.x = -Math.PI / 2; tail.position.set(0, 1.5, 3.1); L.add(tail); L.position.set(x + 14, 0, z + 6); L.rotation.y = Math.PI; ctx.scene.add(L); ctx.box(x + 12, x + 16, z + 2, z + 10); A.lobster = [x + 14, z + 6]; }
  // stall rows with awnings: 3 rows x 4 stalls
  const awn = [K.red, K.blue, K.green, K.yellow];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const sx = x - 17 + c * 11.5, sz = z - 14 - r * 20; const st = { x: sx, z: sz, kind: ['fish', 'cheese', 'bread', 'produce'][(r + c) % 4] }; A.stalls.push(st);
    prop(ctx, 5, 1, 2, K.wood, sx, .5, sz, true); const a = prop(ctx, 5.6, .12, 3, awn[(r + c) % 4], sx, 3, sz + .4); a.rotation.x = .15; [-2.6, 2.6].forEach(o => prop(ctx, .12, 3, .12, K.steelDark, sx + o, 1.5, sz + 1.6));
    prop(ctx, 4.6, .12, 1.6, K.white, sx, 1.08, sz + (c % 2 ? .1 : -.1)); if (st.kind === 'fish') { for (let i = 0; i < 4; i++) prop(ctx, .8, .12, .3, new T.MeshStandardMaterial({ color: '#8aa0b0', metalness: .4, roughness: .4 }), sx - 1.5 + i, 1.2, sz); }
    A.trapSlots.push({ x: sx, z: sz + 4, kind: ['crate_swing', 'tripwire', 'plate', 'chicken'][(r * 4 + c) % 4] }); }
  for (let i = 0; i < 8; i++) crate(ctx, x + (i % 2 ? 20 : -20), z - 8 - i * 9, 1.1 + (i % 3) * .2, K.woodDark, i);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) lamp(ctx, x - 14 + i * 5.6, z - 20 - j * 36, { y: 5.4, real: (i + j) % 3 === 0, intensity: 10, range: 22, flicker: i === 4 ? .5 : 0 });
  bloodPool(ctx, x - 6, z - 40, 1.4); A.door = { n: [x, z], s: [x, z - d] }; A.rooftopStairs = [x + 20, z - d + 4]; return A; }

export function buildFreezer(ctx, { x = 30, z = -4260, w = 14, d = 16 } = {}) { const K = mats(ctx), T = ctx.THREE, A = { rect: [x, z - d / 2, w, d] };
  const frost = new T.MeshStandardMaterial({ color: '#cfe6f2', roughness: .6 }); floor(ctx, x, z - d / 2, w, d, frost); room(ctx, { x, z: z - d / 2, w, d, h: 3.6, mat: frost, doors: { n: [x] }, doorW: 2.4 });
  A.door = slabDoor(ctx, { x, z, w: 2.4, along: 'x', mat: K.steel }); // the thick freezer door: A.door.setOpen(true)
  for (let i = 0; i < 3; i++) { prop(ctx, .5, 3, d - 4, K.steelDark, x - 4 + i * 4, 1.5, z - d / 2, true); for (let j = 0; j < 4; j++) prop(ctx, .8, .5, .5, new T.MeshStandardMaterial({ color: '#d09a8a', roughness: .8 }), x - 4 + i * 4 + .6, 1 + (j % 2) * 1, z - 4 - j * 3); }
  A.hideout = [x + 5, z - d + 3]; prop(ctx, 3, .3, 2, K.fabric, x + 5, .2, z - d + 2); lamp(ctx, x, z - d / 2, { real: true, mat: K.lampCold, color: '#bfe0ff', intensity: 7, range: 14, flicker: .25 }); return A; }
