// Multiplayer motion: drives an Avatar with the SAME animation clips and the SAME retarget as the story characters (Quaternius clips on the
// hidden mannequin -> attachRig onto the avatar's own bones). So walk / jog / sprint blend, roll, jump, punch, crouch... look exactly like story Keem.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Char, CharLib } from '../game/chars.js';
import { attachRig, loadRigs } from '../game/avatar.js';
import { BASE_URL } from './avatar.js';
import { applyStoryTints } from './keemStory.js';

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
  if (!P) return; const f = s.f | 0; // bit0 crouch, bit1 rolling, bit2 airborne, bit3 attacking, bit6 down (dead / downed in a co-op mission)
  if (f & 64) { if (!P._down) { P._down = 1; P.play('Death01', { once: true, force: true, speed: 1.1, cb: () => { /* stay down */ } }); } P.mixer.update(dt); return; }
  if (P._down) { P._down = 0; P._deadHeld = false; P._deadPose = null; P.dead = false; P._seated = false; P.oneShot = null; P.curName = ''; try { P.mixer.stopAllAction(); } catch (e) { /* ignore */ } P.locoOn = false; P.locoW = 0; P.cur = null; P.play('Idle_Loop', { force: true, fade: 0 }); }
  if (!P.oneShot) { if (f & 32 && !(f & 6)) P.play('Hit_Chest', { once: true, force: true, speed: 1.6, cb: () => { P.curName = ''; } }); else if (f & 4) P.play('Jump_Loop'); else if (f & 2) P.play('Roll', { once: true, force: true, speed: 1.35, cb: () => { P.curName = ''; } });
    else if (f & 8) P.play(f & 16 ? 'Sword_Attack' : 'Punch_Jab', { once: true, force: true, speed: f & 16 ? .9 : 1.1, cb: () => { P.curName = ''; } });
    else if (f & 1) { if ((s.spd || 0) > .3) P.play('Crouch_Fwd_Loop', { speed: Math.max(.4, Math.min(2.2, s.spd / .64)) }); else P.play('Crouch_Idle_Loop'); }
    else if ((s.spd || 0) > .35) { if (!P.locomote(s.spd, 1, dt)) P.play('Jog_Fwd_Loop'); } else P.play(s.g && s.g !== 'bat' && s.g !== 'pan' ? 'Pistol_Idle_Loop' : 'Idle_Loop'); }
  P.mixer.update(dt);
}

// Original Keem (admin account only): the real story character - same model, look and animations as story mode (no Avatar morph body).
// v1.9.103: an optional look applies the admin's colour edits (jacket / sleeves / pants / shoes / cap) on a private copy of the material.
export async function makeKeemChar(look) {
  const lib = await getLib(); if (!lib.rigs || !lib.rigs.keem) lib.rigs = Object.assign(lib.rigs || {}, await loadRigs(BASE_URL, ['keem']));
  const { DEFAULT_LOOK } = await import('../game/looks.js'); const P = new Char(lib, Object.assign({}, DEFAULT_LOOK, { rig: 'keem' }), STORY_SCALE);
  P.motion = P; P.isKeem = true; P.dispose = () => { try { if (P._lkOrigMat && P.skin && P.skin.material !== P._lkOrigMat) P.skin.material.dispose(); } catch (e) { /* ignore */ } };
  if (look) { try { applyStoryTints(P, look); } catch (e) { console.warn('story tints', e); } } return P; // a Char already has root / bones / play / locomote / mixer; `.motion` points at itself so the town drives it like an avatar
}
