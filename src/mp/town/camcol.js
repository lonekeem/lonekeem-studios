// Camera collision test for the multiplayer town (kept out of town.js): is a camera point inside a wall, tall prop, tree or car?
//   if (camBlocked(W, cars, me.drv, px, py, pz)) ...   // used by the spring-arm loop in town.js
// Cars are tested as real oriented boxes (the old two-circle test left a gap between the circles and the sides), props by height.
const CAR_HALF_W = 1.0, CAR_H = 1.85, M = .3; // car body is +-0.95 wide and up to 1.71 high (measured) + camera margin
const WALL_H = 3.2, POLE_H = 7.8, LOW_H = 2.2;
export function camBlocked(W, cars, ignore, x, y, z, opt) {
  if (y < .18) return true; // below the ground
  opt = opt || {}; const col = W.col, C = col.cell, r = .28, skip = opt.skipRect, skipFurn = !!opt.skipFurn;
  if (y < WALL_H + .5) { const i0 = Math.floor((x - r) / C), i1 = Math.floor((x + r) / C), j0 = Math.floor((z - r) / C), j1 = Math.floor((z + r) / C);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const L = col.g.get(col.key(i, j)); if (!L) continue;
      for (const c of L) { if (!c.active) continue; if (x < c.x0 - r || x > c.x1 + r || z < c.z0 - r || z > c.z1 + r) continue;
        const tag = c.tag || '';
        if (skip && (tag === 'wall' || tag.startsWith('door') || (skipFurn && tag === 'furn'))) { if (c.x0 > skip.x0 - .35 && c.x1 < skip.x1 + .35 && c.z0 > skip.z0 - .35 && c.z1 < skip.z1 + .35) continue; }
        const tall = (c.x1 - c.x0 < .75 && c.z1 - c.z0 < .75) ? POLE_H : tag === 'wall' ? WALL_H : tag.startsWith('door') ? 2.4 : LOW_H; // thin posts/pillars are tall, furniture and pumps are low
        if (y < tall + .2) return true; } } }
  else if (y < POLE_H) { const i = Math.floor(x / C), j = Math.floor(z / C); const L = col.g.get(col.key(i, j)); if (L) for (const c of L) if (c.active && c.x1 - c.x0 < .75 && c.z1 - c.z0 < .75 && x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) return true; }
  if (y < CAR_H + M && cars) for (const k of cars) { if (k === ignore || (k.g && !k.g.visible)) continue; const dx = x - k.x, dz = z - k.z; if (dx * dx + dz * dz > 20) continue; const s = Math.sin(k.ry), c = Math.cos(k.ry); const lz = dx * s + dz * c, lx = dx * c - dz * s; // local forward / side
    if (Math.abs(lz) < k.L / 2 + .1 + M && Math.abs(lx) < CAR_HALF_W + M) return true; }
  return false;
}

/** Spring arm: from `tgt` along the camera direction (yaw/pitch, length dd). If something blocks it, first tilt the arm UP (over cars and low walls),
 *  then shorten it. Returns { x, y, z (unit direction), dist, hit }. */
export function armSolve(W, cars, ignore, tgt, yaw, pitch, dd) {
  const dirOf = p => [-Math.sin(yaw) * Math.cos(p), Math.sin(p), -Math.cos(yaw) * Math.cos(p)];
  const freeOf = (dir) => { for (let d = .6; d <= dd + .01; d += .3) if (camBlocked(W, cars, ignore, tgt.x + dir[0] * d, tgt.y + dir[1] * d, tgt.z + dir[2] * d)) return Math.max(.7, d - .45); return dd; };
  let dir = dirOf(pitch), free = freeOf(dir), best = { dir, free, pitch };
  if (free < dd * .92) for (let p = pitch + .1; p <= 1.2; p += .1) { const dr = dirOf(p), f = freeOf(dr); if (f > best.free + .05) best = { dir: dr, free: f, pitch: p }; if (f >= dd * .92) break; }
  return { x: best.dir[0], y: best.dir[1], z: best.dir[2], dist: best.free, hit: best.free < dd - .01 };
}
