// KIT · hospital roof with helipad: concrete deck, low parapet (open stretches as "edges" the builder can fence), a painted H pad, vent units, a stair-house door, flood lights, antenna.
// buildRoofHelipad(ctx, { x, z }) -> anchors. {x,z} = north-centre; 60 wide x 70 long. Stair-house at the north end, pad at the south end.
import { mats, floor, wallX, wallZ, room, lamp, slabDoor, prop, crate, bloodPool } from './common.js';

export function buildRoofHelipad(ctx, { x = 0, z = -4580, w = 60, d = 70 } = {}) { const K = mats(ctx), T = ctx.THREE, A = { rect: [x, z - d / 2, w, d], vents: [], floods: [] };
  floor(ctx, x, z - d / 2, w, d, K.concrete); [-1, 1].forEach(s => wallZ(ctx, z, z - d, x + s * w / 2, 1.3, K.concrete, [], .6)); wallX(ctx, x - w / 2, x + w / 2, z - d, 1.3, K.concrete, [], .6); wallX(ctx, x - w / 2, x + w / 2, z, 1.3, K.concrete, [{ c: x, w: 6, lintel: false }], .6);
  // stair-house (where the family arrives / the enemies pour from)
  { const sx = x, sz = z - 8; room(ctx, { x: sx, z: sz, w: 12, d: 8, h: 3.4, mat: K.wall, doors: { n: [sx] }, doorW: 3 }); A.stairDoor = slabDoor(ctx, { x: sx, z: sz + 4, w: 3, along: 'x', mat: K.steel, open: true }); A.stairs = [sx, sz + 2]; ctx.sign(['ROOF ACCESS'], sx, 3.2, sz + 4.3, 0, 3, .5, '#a01010'); }
  // helipad: dark circle + white ring + H
  { const cx = x, cz = z - 52; const pad = new T.Mesh(new T.CircleGeometry(12, 40), new T.MeshStandardMaterial({ color: '#2f3335', roughness: .8 })); pad.rotation.x = -Math.PI / 2; pad.position.set(cx, .05, cz); ctx.scene.add(pad);
    const ring = new T.Mesh(new T.RingGeometry(10.4, 11, 40), K.white); ring.rotation.x = -Math.PI / 2; ring.position.set(cx, .06, cz); ctx.scene.add(ring);
    [[-2.2, 0, .8, 7], [2.2, 0, .8, 7], [0, 0, 4.4, .8]].forEach(([a, b, ww, hh]) => { const m = new T.Mesh(new T.PlaneGeometry(ww, hh), K.yellow); m.rotation.x = -Math.PI / 2; m.position.set(cx + a, .07, cz + b); ctx.scene.add(m); }); A.pad = [cx, cz]; A.helicopterSpot = [cx, cz]; }
  // vents / AC units (cover) and flood lights
  [[-18, -22], [18, -26], [-20, -38], [20, -40], [-8, -30], [10, -18]].forEach(([a, b]) => { prop(ctx, 4, 2, 3, K.steel, x + a, 1, z + b, true); A.vents.push([x + a, z + b]); prop(ctx, 1.4, .3, 1.4, K.steelDark, x + a, 2.1, z + b); });
  [[-26, -12], [26, -12], [-26, -64], [26, -64]].forEach(([a, b], i) => { prop(ctx, .2, 6, .2, K.steelDark, x + a, 3, z + b); lamp(ctx, x + a, z + b, { y: 6, real: true, mat: K.lampCold, color: '#e8f4ff', intensity: 12, range: 30, flicker: i === 2 ? .4 : 0, size: [1.2, .4, .6] }); A.floods.push([x + a, z + b]); });
  prop(ctx, .25, 14, .25, K.steelDark, x + 22, 7, z - 6); for (let i = 0; i < 3; i++) prop(ctx, 3 - i, .08, .08, K.steel, x + 22, 6 + i * 3, z - 6); // antenna mast
  for (let i = 0; i < 6; i++) crate(ctx, x - 10 + i * 4, z - 62 - (i % 2) * 2, 1, K.rust, i); bloodPool(ctx, x + 3, z - 34, 1.5); bloodPool(ctx, x - 6, z - 48, 1.1); A.edge = { south: z - d, east: x + w / 2, west: x - w / 2 }; return A; }
