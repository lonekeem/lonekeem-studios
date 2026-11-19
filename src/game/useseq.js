// v2.1 exact-object interaction: pressing the hand button no longer fires the action from wherever you stand.
// The player visibly walks to the object's own spot, turns to face it, reaches out (Interact anim), and only then the action fires.
import { walkTo, turnTo } from './motion.js';
const STAND = 0.72, REACH_T = 0.5;
export function startUse(g, o) { // o: { x, z, fn, label }
  if (g.useSeq || g.carSeq) return; const P = g.player.root.position, dx = P.x - o.x, dz = P.z - o.z, d = Math.hypot(dx, dz) || 1;
  const sx = o.x + dx / d * Math.min(STAND, d), sz = o.z + dz / d * Math.min(STAND, d); // stop just short of the object, on the side we approached from
  g.useSeq = { o, sx, sz, ph: 0, t: 0, fired: false, yaw: Math.atan2(o.x - sx, o.z - sz) };
}
export function updateUse(g, dt) {
  const S = g.useSeq; if (!S) return false; const P = g.player, root = P.root; S.t += dt; g.grace = Math.max(g.grace || 0, 0.5);
  if (g.cut || g.dlgCur && g.cut) { g.useSeq = null; return false; }
  if (S.ph === 0) { const near = Math.hypot(S.sx - root.position.x, S.sz - root.position.z) < 0.06; if (!near && S.t < 4) walkTo(P, S.sx, S.sz, dt, { speed: 2.6, arrive: 0.05 }); else { S.ph = 1; S.t = 0; P.autoLoco(dt, 'Idle_Loop'); } }
  else if (S.ph === 1) { const e = turnTo(root, S.yaw, dt, 12); P.autoLoco(dt, 'Idle_Loop'); if (e < 0.1 || S.t > 0.7) { S.ph = 2; S.t = 0; P.play('Interact', { once: true, force: true, speed: 1.5 }); } }
  else { turnTo(root, S.yaw, dt, 12); if (S.t > REACH_T && !S.fired) { S.fired = true; const f = S.o.fn; f && f(g); } if (S.t > REACH_T + 0.45) { P.curName = ''; g.useSeq = null; } }
  return true;
}
