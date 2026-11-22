// Shared head / neck look-at for story, town NPCs, zombies and multiplayer motion.
// Procedural look is applied ON TOP of the clip pose, never added to last frame's look:
//   1) mixer.update first restores every bone to its bind pose, then writes the clip
//      (so a faded-out or missing track cannot leave leftover rotation that accumulates)
//   2) applyHeadLook() then adds a clamped, shortest-path-smoothed yaw / pitch
import * as THREE from 'three';

export const YAW_LIM = 70 * Math.PI / 180;   // ~±70°
export const PITCH_LIM = 35 * Math.PI / 180; // ~±35°

export const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const angLerp = (a, b, t) => a + wrapA(b - a) * t;

const LOOK_BONE = /(^|[-._])(head|neck)$/i;

function isCorpse(ch) {
  return !!(ch && (ch._deadHeld || ch._deadPose || ch._seatLock || (ch.dead && ch.st === 'dead')));
}

// Snapshot the look bones' bind pose and wrap mixer.update so look starts from it.
// Only head / neck are reset: v1.9.34 reset every bone, which snapped corpses back to the standing bind pose
// whenever Death01 left a bone untracked or the clip had finished.
export function bindHeadLook(ch) {
  if (!ch || !ch.mixer || ch._headLook) return ch;
  const bones = {};
  const seen = new Set();
  const src = ch.bones || {};
  for (const k of Object.keys(src)) {
    const b = src[k];
    const name = (b && b.name) || k;
    if (!b || !b.quaternion || seen.has(b) || !LOOK_BONE.test(name)) continue;
    seen.add(b);
    bones[name] = { b, q: b.quaternion.clone(), p: b.position.clone() };
  }
  ch._headLook = { bones, yaw: 0, pitch: 0 };
  const orig = ch.mixer.update.bind(ch.mixer);
  ch.mixer.update = function (dt) {
    if (ch._deadHeld || ch._deadPose) {
      if (ch.restoreDeadPose) ch.restoreDeadPose();
      return this;
    }
    for (const k in bones) {
      const s = bones[k];
      s.b.quaternion.copy(s.q);
      s.b.position.copy(s.p);
    }
    return orig(dt);
  };
  return ch;
}

// After mixer.update: turn the head / neck toward yaw / pitch (character-forward frame, radians).
export function applyHeadLook(ch, yaw, pitch, dt = 0.016, { yawLim = YAW_LIM, pitchLim = PITCH_LIM, rate = 10 } = {}) {
  if (!ch || isCorpse(ch) || ch.isVictim) return;
  if (!ch._headLook) bindHeadLook(ch);
  const S = ch._headLook;
  yaw = clamp(wrapA(yaw), -yawLim, yawLim);
  pitch = clamp(wrapA(pitch), -pitchLim, pitchLim);
  const k = 1 - Math.exp(-(Math.max(0, dt) || 0) * rate);
  S.yaw = angLerp(S.yaw || 0, yaw, k);
  S.pitch = angLerp(S.pitch || 0, pitch, k);
  const neck = ch.bone && ch.bone('DEF-neck');
  const head = ch.bone && ch.bone('DEF-head');
  if (neck) { neck.rotateY(S.yaw * 0.35); neck.rotateX(S.pitch * 0.25); }
  if (head) { head.rotateY(S.yaw * 0.5); head.rotateX(S.pitch * 0.45); }
}

export function resetHeadLook(ch) {
  if (ch && ch._headLook) { ch._headLook.yaw = 0; ch._headLook.pitch = 0; }
}
