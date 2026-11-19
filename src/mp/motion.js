// Multiplayer motion: drives an Avatar with the SAME animation clips and the SAME retarget as the story characters (Quaternius clips on the
// hidden mannequin -> attachRig onto the avatar's own bones). So walk / jog / sprint blend, roll, jump, punch, crouch... look exactly like story Keem.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Char, CharLib } from '../game/chars.js';
import { attachRig } from '../game/avatar.js';
import { BASE_URL } from './avatar.js';

let _lib = null;
export function getLib() {
  const G = typeof window !== 'undefined' && window.__atq && window.__atq.game; if (G && G.lib) return Promise.resolve(G.lib);
  return _lib || (_lib = new GLTFLoader().loadAsync(BASE_URL + 'models/AnimationLibrary_Godot_Standard.gltf').then(g => new CharLib(g)));
}
const MANN = { skin: '#c9a38a', shirt: '#445', pants: '#334', shoes: '#222' };
export const STORY_SCALE = 0.9;
export async function makeMotion(av) {
  const lib = await getLib(); const P = new Char(lib, MANN, STORY_SCALE);
  av.root.add(P.model); P.root = av.root; // the avatar's root IS the character root (position / yaw), the mannequin rides along hidden
  P.avatar = av; attachRig(P, null, { target: { obj: av.obj, skin: av.skin } });
  P.root.updateMatrixWorld(true); return P;
}
// story-style remote animation from a few synced numbers: spd (m/s on the ground), flags
export function driveRemote(P, dt, s) {
  if (!P) return; const f = s.f | 0; // bit0 crouch, bit1 rolling, bit2 airborne, bit3 attacking
  if (!P.oneShot) { if (f & 4) P.play('Jump_Loop'); else if (f & 2) P.play('Roll', { once: true, force: true, speed: 1.35, cb: () => { P.curName = ''; } });
    else if (f & 8) P.play('Punch_Jab', { once: true, force: true, speed: 1.1, cb: () => { P.curName = ''; } });
    else if (f & 1) { if ((s.spd || 0) > .3) P.play('Crouch_Fwd_Loop', { speed: Math.max(.4, Math.min(2.2, s.spd / .64)) }); else P.play('Crouch_Idle_Loop'); }
    else if ((s.spd || 0) > .35) { if (!P.locomote(s.spd, 1, dt)) P.play('Jog_Fwd_Loop'); } else P.play('Idle_Loop'); }
  P.mixer.update(dt);
}
