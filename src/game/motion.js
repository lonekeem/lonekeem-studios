// v2.1 shared motion helpers: eased scripted walking (feet matched via Char.autoLoco), smooth turning, smoothstep.
export const TAU = Math.PI * 2;
export const angDiff = (a, b) => ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
export const sstep = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
export const turnTo = (root, yaw, dt, rate = 9) => { root.rotation.y += angDiff(root.rotation.y, yaw) * Math.min(1, dt * rate); return Math.abs(angDiff(root.rotation.y, yaw)); };
// Walk a character toward (tx,tz): eased acceleration, slows into the target, turns smoothly toward travel, walk/jog follows real speed. Returns true on arrival.
export function walkTo(c, tx, tz, dt, o = {}) {
  const p = c.root.position, dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz); const vmax = o.speed || 2.4; c._wv = c._wv || 0;
  if (d < (o.arrive || 0.05)) { c._wv = 0; c.autoLoco(dt, o.idle || 'Idle_Loop'); return true; }
  const want = Math.min(vmax, 0.35 + d * 2.6); c._wv += (want - c._wv) * Math.min(1, dt * (want > c._wv ? 6 : 10));
  const st = Math.min(d, Math.max(0.0001, c._wv * dt)); p.x += dx / d * st; p.z += dz / d * st; if (!o.keepYaw) turnTo(c.root, Math.atan2(dx, dz), dt, o.turn || 10);
  c.autoLoco(dt, o.idle || 'Idle_Loop'); return d - st < (o.arrive || 0.05);
}
