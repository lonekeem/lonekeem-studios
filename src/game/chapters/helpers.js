// Shared story helpers (moved out of story.js so chapter files can import them without a circular import).
// story.js calls bindStory(STORY) once the full step list is built. Anywhere a step index is expected you can also pass a step id string.
import * as THREE from 'three';
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const PI = Math.PI;
export const rnd = (a, b) => a + Math.random() * (b - a);
export const dist2 = (g, x, z) => Math.hypot(g.player.root.position.x - x, g.player.root.position.z - z);
let STORY = [];
export function bindStory(s) { STORY = s; }
export const stepIndex = (id) => STORY.findIndex(s => s.id === id);
const _ix = (i) => (typeof i === 'string' ? stepIndex(i) : i);
export const $q = (s) => document.querySelector(s);
export function follow(g, n, off) { n.update = (dt) => { if (g.dlgFace && g.dlgFace.hold && g.dlgFace.hold.has(n)) { if (n.locoOn) n.endLoco(); n.play(g.dlgFace.speaker === n && n.lib && n.lib.clips && n.lib.clips.Idle_Talking_Loop ? 'Idle_Talking_Loop' : 'Idle_Loop'); return; }
  const P = g.player.root.position, p = n.root.position; const tx = P.x + off[0], tz = P.z + off[1]; const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
  if (d > 1.2) { const sp = Math.min(d, 1) * (d > 4 ? 5 : 2.8); p.x += dx / d * sp * dt; p.z += dz / d * sp * dt; n.root.rotation.y = Math.atan2(dx, dz); n.play(d > 4 ? 'Jog_Fwd_Loop' : 'Walk_Loop'); } else n.play('Idle_Loop'); }; }
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
export function dadGun(g, D) { D.dadGun = true; }
export function dadTick(g, D, dt) { if (!D.dad || !D.dadGun || (D.dcd = (D.dcd || 0) - dt) > 0) return; D.dcd = .9; const dp = D.dad.root.position; let best = null, bd = 18; g.alive().forEach(z => { if (z.boss) return; const d = z.root.position.distanceTo(dp); if (d < bd) { bd = d; best = z; } }); if (best) { const dir = best.root.position.clone().sub(dp).normalize(); g.damageZ(best, 60, dir, { head: Math.random() < .35 }); g.audio.shot('shotgun'); } }
export function boss(g, x, z, hp, shirt, name) { const b = g.spawnZ(x, z, { boss: true, hp, scale: 1.75, runner: false }); b.cd = 2; b.aggro = 99; b.mat.userData.u.uShirt.value.set(shirt); b.mat.userData.u.uBlood.value = g.settings.gore ? 1.4 : .2; g.boss = b; $q('#bossn').textContent = name; g.audio.roar && setTimeout(() => g.audio.roar(b), 900); return b; }
export function raiders(g, n, pts) { for (let i = 0; i < n; i++) { const p = pts[i % pts.length]; const r = g.spawnZ(p[0] + rnd2(), p[1] + rnd2(), { raider: true, gun: ['rifle', 'pistol', 'shotgun', 'smg'][i % 4] }); r.aggro = 40; } }
export const rnd2 = () => (Math.random() - .5) * 5;
// comic-page pickup for chapter loot: pg(x, z, text, 'step_id') — 'at' is the id of the first step where it appears
export const pg = (x, z, text, at) => ({ id: 'pg_' + x + '_' + z, kind: 'page', manual: false, text, pos: [x, 0.9, z], at });
