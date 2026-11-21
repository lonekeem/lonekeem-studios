// Shared player / vehicle / camera controller. Story mode (game.js) and multiplayer (src/mp/town) both call exactly these functions,
// so walking, sprinting, crouching, jumping, rolling, melee wind-up, driving and the camera behave identically in both.
import * as THREE from 'three';
import { clamp, lerp, rnd, angLerp, V3 } from './util.js';

// ---- on-foot movement + locomotion animation (extracted verbatim from Game.updatePlayer, v2.x) ----
// C: { P: Char, s: state, I: Input, set: settings, yaw: camera yaw, fp: first person, gun: holding a gun, runMul, audio, onMeleeHit(), collide(p, dx, dz, r) }
export function stepMove(C, dt) {
  const { P, s, I, set, gun } = C;
    const mv = I.move; const mag = Math.min(1, mv.length()); const run = (I.run || mag > .95 && I.touchRun) && !s.crouch && !s.aim;
    let spd = s.crouch ? 1.6 : run ? 6.2 * C.runMul : 3.1; if (s.aim) spd = 2.2; if (C.slow) spd *= C.slow; if (s.atk > 0) spd *= .3; if (s.stun > 0) { spd = 0; s.stun -= dt; }
    const yaw = C.yaw; let dx = 0, dz = 0; if (s.shotT > 0) s.shotT -= dt; const faceAim = (gun && (s.aim || s.shotT > 0)) || C.fp; // v1.9.2: face the crosshair only while aiming/firing (or first-person); otherwise turn toward travel
    if (mag > .08) { const a = Math.atan2(mv.x, mv.y) + yaw; dx = Math.sin(a) * spd * mag; dz = Math.cos(a) * spd * mag;
      s.faceTo = a; }
    // v1.9.28 (story, C.aimTwist): while aiming/firing the LEGS face the way he walks (up to 80 deg off the aim; backpedal when moving away
    // from it) and the upper body twists onto the crosshair (game.js updateAimPose), instead of the whole body facing the camera and
    // the legs walking forward while he slides sideways
    if (faceAim) { let fy = yaw + Math.PI; if (C.aimTwist && !C.fp && mag > .08 && s.faceTo != null) { const df = (a, b) => ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; let d = df(fy, s.faceTo); if (Math.abs(d) > 1.75) d = df(fy, s.faceTo + Math.PI); fy += clamp(d, -1.4, 1.4); }
      P.root.rotation.y = angLerp(P.root.rotation.y, fy, Math.min(1, dt * (C.aimTwist ? 12 : 18))); }
    if (run && mag > .5 && !s.crouch) { s.brT = (s.brT || 0) - dt; s.runT = (s.runT || 0) + dt; if (s.brT <= 0 && s.runT > 2.5) { s.brT = rnd(1.1, 1.5); C.audio.breathe && C.audio.breathe(Math.min(.35, .1 + s.runT * .02)); } } else s.runT = Math.max(0, (s.runT || 0) - dt * 2);
    if (s.roll > 0) { s.roll -= dt; const f = 6.5; dx = Math.sin(P.root.rotation.y) * f; dz = Math.cos(P.root.rotation.y) * f; }
    if (s.atk > 0) { s.atk -= dt; if (s.atkHit > 0) { s.atkHit -= dt; if (s.atkHit <= 0) C.onMeleeHit(); } }
    // v2.0 smooth movement: ease toward the target velocity (same top speeds), roll/stun stay instant; animation speed follows real ground speed
    const MV = s.mv || (s.mv = { x: 0, z: 0 }); if (!set.smoothMove || s.roll > 0 || s.stun > 0 || dt <= 0) { MV.x = dx; MV.z = dz; } else { const ex = dx - MV.x, ez = dz - MV.z, el = Math.hypot(ex, ez), acc = ((dx * dx + dz * dz) > (MV.x * MV.x + MV.z * MV.z) ? 34 : 46) * dt; if (el <= acc) { MV.x = dx; MV.z = dz; } else { MV.x += ex / el * acc; MV.z += ez / el * acc; } }
    const p = P.root.position; const px0 = p.x, pz0 = p.z; C.collide(p, MV.x * dt, MV.z * dt, 0.35); if (dt > 0) s.spd = lerp(s.spd || 0, Math.hypot(p.x - px0, p.z - pz0) / dt, Math.min(1, dt * 14));
    // turn toward travel. v1.9.26: when a wall deflects the move (sliding along it), face the way he actually goes so the walk cycle matches
    // the motion instead of stepping into the wall while gliding sideways
    if (mag > .08 && !faceAim && s.atk <= 0 && s.roll <= 0) { let tgt = s.faceTo; const mx = p.x - px0, mz = p.z - pz0, ml = Math.hypot(mx, mz), want = Math.hypot(MV.x, MV.z) * dt;
      if (ml > want * .25 && ml < want * .97) { const am = Math.atan2(mx, mz); let df = ((am - tgt + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; if (Math.abs(df) > .3) tgt = am; }
      P.root.rotation.y = angLerp(P.root.rotation.y, tgt, Math.min(1, dt * (set.smoothMove ? 16 : 12))); }
    // vertical
    if (s.y > 0 || s.vy > 0) { s.vy -= 14 * dt; s.y = Math.max(0, s.y + s.vy * dt); if (s.y === 0) { s.vy = 0; C.audio.land && C.audio.land(); P.play('Jump_Land', { once: true, force: true, speed: 1.6, cb: () => P.curName = '' }); } } p.y = s.y;
    // locomotion anims — v1.9.26: the legs are driven by the ground speed actually covered this frame (after collisions), in any direction, for
    // the classic and the smooth control schemes alike. The old classic path picked Walk/Jog from stick size at a fixed rate, so a half-pushed
    // stick (up to 2.6 m/s on a 1.1 m/s walk clip) or wall-sliding made Keem glide with barely-moving legs, and short pushes could stay in Idle.
    const inst = dt > 0 ? Math.hypot(p.x - px0, p.z - pz0) / dt : 0; s.aspd = lerp(s.aspd || 0, inst < 14 ? inst : 0, Math.min(1, dt * 18));
    const moving = (mag > .08 && !(s.stun > 0)) || inst > .15 || (P.locoOn && s.aspd > .2);
    if (!P.oneShot) { if (s.y > 0) P.play('Jump_Loop');
      else if (moving) { const asp = Math.max(inst, mag > .08 ? .3 : 0); // pushing into a wall still steps (slowly) instead of freezing mid-stride
        if (s.crouch) P.play('Crouch_Fwd_Loop', { speed: clamp(asp / (P.natSpeed ? P.natSpeed('Crouch_Fwd_Loop') : .7), .4, 2.4) });
        else { const fy = P.root.rotation.y, bk = faceAim && inst > .3 && (Math.sin(fy) * MV.x + Math.cos(fy) * MV.z) < -.5 * Math.hypot(MV.x, MV.z); if (!P.locomote(asp, bk ? -1 : 1, dt, 6.4, Math.max(s.aspd, asp * .5))) P.play(run ? 'Sprint_Loop' : 'Jog_Fwd_Loop'); } }
      else if (s.crouch) P.play('Crouch_Idle_Loop'); else if (gun) P.play(s.aim ? 'Pistol_Aim_Neutral' : 'Pistol_Idle_Loop'); else P.play('Idle_Loop'); }
  return { mag, run, spd, faceAim };
}
export function startRoll(C) { const { P, s, I } = C; s.roll = 0.62; C.audio && C.audio.rollS && C.audio.rollS(); P.play('Roll', { once: true, force: true, speed: 1.35, cb: () => { P.curName = ''; } });
  const mv = I.move; if (mv.lengthSq() > .04) P.root.rotation.y = Math.atan2(mv.x, mv.y) + C.yaw; }
export function startJump(C) { const { P, s } = C; s.vy = 4.8; C.audio && C.audio.jumpS && C.audio.jumpS(); P.play('Jump_Start', { once: true, force: true, speed: 1.5, cb: () => P.play('Jump_Loop') }); }

// ---- arcade vehicle (extracted verbatim from Game.updateTruck): smoothed speed-sensitive steering, grip, bumps.
// T: { v, head, st }  (head = heading, steering right turns the vehicle to the player's right)  D: on-screen drive buttons {gas,brake,l,r}
// hooks.move(dx, dz) moves the vehicle with collision and returns true when it hit something
export function stepVehicle(T, I, D, dt, hooks) {
  let gas = D.gas ? 1 : 0, brk = D.brake ? 1 : 0, st = (D.r ? 1 : 0) - (D.l ? 1 : 0);
  if (!D.gas && !D.brake) { gas = Math.max(0, -I.move.y) + (I.atk ? 1 : 0); brk = Math.max(0, I.move.y); } if (!st) st = clamp(I.move.x, -1, 1);
  const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(x => x) : null; if (gp) { const rt = gp.buttons[7]?.value || 0, lt = gp.buttons[6]?.value || 0; if (rt > .05) gas = rt; if (lt > .05) brk = lt; if (Math.abs(gp.axes[0]) > .15) st = gp.axes[0]; }
  gas = clamp(gas, 0, 1); brk = clamp(brk, 0, 1); T.st = T.st || 0; T.st += (st - T.st) * Math.min(1, dt * (st ? 5 : 8));
  if (hooks.noGas) gas = 0;
  if (gas) T.v += gas * 9 * dt * (T.v < 0 ? 2 : 1); if (brk) T.v -= brk * (T.v > 0.2 ? 18 : 6) * dt; if (!gas && !brk) T.v *= (1 - dt * .7); if (Math.abs(T.v) < .05 && !gas && !brk) T.v = 0;
  T.v = clamp(T.v, -6, 17); const sp = Math.abs(T.v); T.head -= T.st * dt * 1.9 * Math.min(1, sp / 3) / (1 + sp / 12) * Math.sign(T.v || 1);
  const fx = Math.sin(T.head) * T.v * dt, fz = Math.cos(T.head) * T.v * dt;
  const hit = hooks.move(fx, fz); if (hit) { if (hooks.onHit) hooks.onHit(sp); T.v *= -0.15; }
  T.spin = (T.spin || 0) + T.v * dt / .38;
  return { gas, brk, sp, hit };
}
