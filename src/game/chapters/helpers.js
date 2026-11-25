// Shared story helpers (moved out of story.js so chapter files can import them without a circular import).
// story.js calls bindStory(STORY) once the full step list is built. Anywhere a step index is expected you can also pass a step id string.
import * as THREE from 'three';
import { weaponMesh } from '../chars.js';
import { mountHeld } from '../hands.js';

const _mz = new THREE.Vector3();
export function gunIdFor(sound, fallback = 'pistol') {
  if (sound === 'shotgun' || sound === 'rifle' || sound === 'smg') return sound;
  return fallback;
}
// Attach an original procedural gun to an ally's right hand (same mount as raiders / the player).
// Skips if Dad is swinging the hammer so the two holds never overlap.
export function ensureAllyGun(ch, id = 'pistol') {
  if (!ch || !ch.root) return null;
  if (ch._hammer && ch._hammer.visible) { if (ch.gunM) ch.gunM.visible = false; return null; }
  if (ch.gunM && ch.gunId === id && ch.gunM.parent) { ch.gunM.visible = true; return ch.gunM; }
  if (ch.gunM && ch.gunM.parent) ch.gunM.parent.remove(ch.gunM);
  const h = new THREE.Group(); const mesh = weaponMesh(id); if (mesh) h.add(mesh);
  mountHeld(ch, h, id); ch.gunM = h; ch.gunId = id; return h;
}
export function allyShotFx(g, ch, to) {
  if (!g || !ch) return;
  const mm = ch.gunM && ch.gunM.getObjectByName && ch.gunM.getObjectByName('muzzle');
  if (mm) { mm.updateWorldMatrix(true, false); mm.getWorldPosition(_mz); }
  else if (ch.worldOf) ch.worldOf('DEF-hand.R', _mz);
  else { const p = ch.root.position; _mz.set(p.x, (p.y || 0) + 1.2, p.z); }
  if (typeof g.rShotFx === 'function') g.rShotFx(_mz.clone(), to && to.clone ? to.clone() : to);
}

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const PI = Math.PI;
export const rnd = (a, b) => a + Math.random() * (b - a);
export const dist2 = (g, x, z) => Math.hypot(g.player.root.position.x - x, g.player.root.position.z - z);
let STORY = [];
export function bindStory(s) { STORY = s; }
export const stepIndex = (id) => STORY.findIndex(s => s.id === id);
const _ix = (i) => (typeof i === 'string' ? stepIndex(i) : i);
export const $q = (s) => document.querySelector(s);
// v1.9.27: Dad / Nia ease their speed and their legs follow the distance they actually cover (Walk<->Jog blend at
// their own size), instead of a 1 m/s walk clip on a 2.8 m/s glide. They still freeze in a talking idle while dialogue facing holds them.
export function follow(g, n, off) { n.update = (dt) => { if (g.dlgFace && g.dlgFace.hold && g.dlgFace.hold.has(n)) { if (n.locoOn) n.endLoco(); n.play(g.dlgFace.speaker === n && n.lib && n.lib.clips && n.lib.clips.Idle_Talking_Loop ? 'Idle_Talking_Loop' : 'Idle_Loop'); return; }
  const P = g.player.root.position, p = n.root.position; const tx = P.x + off[0], tz = P.z + off[1]; const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
  const want = d > 1.2 ? (d > 4 ? 5 : 2.8) : d > .9 && (n._fsp || 0) > .2 ? 1.2 : 0; n._fsp = (n._fsp || 0) + (want - (n._fsp || 0)) * Math.min(1, dt * (want > (n._fsp || 0) ? 5 : 8));
  const sp = Math.min(n._fsp, d / Math.max(dt, 1e-3)); if (sp > .05 && d > 1e-3) { p.x += dx / d * sp * dt; p.z += dz / d * sp * dt; n.root.rotation.y = angTo(n.root.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 10)); }
  if (n.moveAnim) n.moveAnim(sp > .05 ? sp : 0, dt); else if (sp > .05) n.play(sp > 3.5 ? 'Jog_Fwd_Loop' : 'Walk_Loop'); else n.play('Idle_Loop'); }; }
const angTo = (a, b, t) => { let d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return a + d * t; };
// v1.9.4: never snap the player to a far checkpoint mid-play — fade to black with the next objective instead
export function goto(g, i, xp = 100) { i = _ix(i); const tok = g.stepTok; g.addXP(xp); g.audio.pickup(); setTimeout(() => { if (g.stepTok !== tok) return; const cp = STORY[i] && STORY[i].cp, P = g.player.root.position; if (cp && Math.hypot(cp[0] - P.x, cp[1] - P.z) > 4 && g.fadeStep) g.fadeStep(i); else g.loadStep(i); }, 50); }
// v1.9.7: after a boss (or a big fight) ends, let the death play out (slow-mo + collapse), then give Keem a few seconds of free control
// ("BOSS DOWN"), and only then run dialogue / fades / step changes. Real-time, skips paused time, cancelled if the step changes.
export function afterBoss(g, fn, secs = 4.5, label = true) { const tok = g.stepTok; let t = 0, shown = false; const iv = setInterval(() => { if (g.stepTok !== tok) { clearInterval(iv); return; } if (g.paused || g.dead || g.dying) return; t += .1;
  if (label && !shown && t >= 1.4) { shown = true; g.toast('BOSS DOWN', 2.5); g.objective('Boss down', 'Take a breath.'); } if (t >= secs + (g.boss && g.boss.dead && g.boss.deadT < 2.5 ? 99 : 0) - (t > 12 ? 99 : 0)) { clearInterval(iv); fn(); } }, 100); }
// v1.9.4: fight cleared → point at the next checkpoint and advance only when the player walks there (was: instant jump to the next area)
export function clearThen(g, D, i, xp, label) { i = _ix(i); if (D.clr0 == null) D.clr0 = g.t; if (!D.go && g.t - D.clr0 < 2) return; // v1.9.7: let the last death play out before 'Area clear'
  if (D.go === 'walk') { const cp = STORY[i].cp; if (dist2(g, cp[0], cp[1]) < 2.5 && !g.cut) { D.go = true; goto(g, i, xp); } return; }
  if (!D.go) { D.go = 'walk'; const cp = STORY[i].cp; g.wpTarget = [cp[0], 1.2, cp[1]]; g.objective(label, 'Area clear. Follow the marker.'); g.toast('Area clear', 1.6); } }
export function fam(g, D, z, x = 0, noDad) { g.openGate(true); if (!noDad) { const d = g.npc('marcus', 'marcus', x + 1.6, z + 1.5, PI, 'Walk_Loop'); follow(g, d, [1.6, 1.2]); D.dad = d; } const n = g.npc('nia', 'nia', x - 1.4, z + 1.5, PI, 'Walk_Loop', .62); follow(g, n, [-1.2, .9]); D.nia = n; }
export function dadGun(g, D) {
  D.dadGun = true;
  if (D.dad) ensureAllyGun(D.dad, 'shotgun');
  if (D.mom) ensureAllyGun(D.mom, 'pistol');
}
function allyShoot(g, ch, D, cdKey, dt, o) {
  if (!ch || !ch.root || g.cut) return;
  if ((D[cdKey] = (D[cdKey] || 0) - dt) > 0) return; D[cdKey] = o.cd;
  const cp = ch.root.position; let best = null, bd = o.range;
  g.alive().forEach(z => { if (z === ch || z.ally) return; if (o.skipBoss && z.boss) return; const d = z.root.position.distanceTo(cp); if (d < bd) { bd = d; best = z; } });
  if (!best) return;
  const dir = best.root.position.clone().sub(cp).normalize();
  ch.root.rotation.y = Math.atan2(dir.x, dir.z);
  const anim = o.anim || 'Pistol_Aim_Neutral';
  if (anim && ch.lib && ch.lib.clips && ch.lib.clips[anim]) ch.play(anim);
  ensureAllyGun(ch, o.gun || gunIdFor(o.sound));
  const dmg = (best.boss && o.bossScale != null) ? o.dmg * o.bossScale : o.dmg;
  g.damageZ(best, dmg, dir, o.hit || { ai: true, head: Math.random() < .25 });
  if (o.stun && !best.boss) best.stun = Math.max(best.stun || 0, o.stun);
  if (g.audio && g.audio.shot) g.audio.shot(o.sound);
  const aim = best.root.position.clone(); aim.y += 1.2 * (best.scale || 1);
  allyShotFx(g, ch, aim);
}
export function dadTick(g, D, dt) {
  if (!D.dadGun) return;
  // Dad kept his original skip-boss / 60 dmg / 0.9s shotgun cadence; he now faces the target, holds a shotgun, and flashes the muzzle.
  allyShoot(g, D.dad, D, 'dcd', dt, { dmg: 60, cd: .9, range: 18, sound: 'shotgun', gun: 'shotgun', skipBoss: true, hit: { head: Math.random() < .35 } });
  // Mom is in the later-chapter fights with the family but had no gun and no fire tick. Arm her when Dad is armed.
  if (D.mom) allyShoot(g, D.mom, D, 'mcd', dt, { dmg: 26, cd: 1.3, range: 16, sound: 'pistol', gun: 'pistol', skipBoss: true, hit: { ai: true, head: Math.random() < .25 } });
}
export function boss(g, x, z, hp, shirt, name) { const b = g.spawnZ(x, z, { boss: true, hp, scale: 1.75, runner: false }); b.cd = 2; b.aggro = 99; b.mat.userData.u.uShirt.value.set(shirt); b.mat.userData.u.uBlood.value = g.settings.gore ? 1.4 : .2; g.boss = b; $q('#bossn').textContent = name; g.audio.roar && setTimeout(() => g.audio.roar(b), 900); return b; }
export function raiders(g, n, pts) { for (let i = 0; i < n; i++) { const p = pts[i % pts.length]; const r = g.spawnZ(p[0] + rnd2(), p[1] + rnd2(), { raider: true, gun: ['rifle', 'pistol', 'shotgun', 'smg'][i % 4] }); r.aggro = 40; } }
export const rnd2 = () => (Math.random() - .5) * 5;
// comic-page pickup for chapter loot: pg(x, z, text, 'step_id') — 'at' is the id of the first step where it appears
export const pg = (x, z, text, at) => ({ id: 'pg_' + x + '_' + z, kind: 'page', manual: false, text, pos: [x, 0.9, z], at });

if (typeof window !== 'undefined') { window.__atqEnsureAllyGun = ensureAllyGun; window.__atqAllyShotFx = allyShotFx; }
