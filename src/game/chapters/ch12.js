// Chapter 12 · Sublevel B — Keem, Dad and Nia go down under Mass General: sneak the morgue, restart the power, hold the research hall
// while Mom's cell cycles open, beat the Night Orderly, and finally reach Mom.  (Dana Pell = Mom.)
// World band z -2900..-3200 (the set is built in design coordinates z -2830..-3014 and shifted by OZ).
import * as THREE from 'three';
import { PI, V, dist2, goto, afterBoss, fam, dadGun, dadTick, pg, rnd, $q } from './helpers.js';
import { buildSubB } from './ch12_hospital.js';
import { act } from './ch12_acting.js';

export const meta = { n: 12, title: 'Sublevel B', endQuote: '“Hi, baby.”' };
export const speakers = { dana: 'Mom', orderly: 'The Night Orderly' };
export const Z0 = -2900;
const OZ = -70, Z = (z) => z + OZ;           // design z -> world z
let API = null;                                 // the built hospital kit (doors, cells, power) — set by buildZone
// the reunion hug: Mom drops onto one knee, both arms round Nia's back; Nia steps in on Mom's right side with both arms round her neck, cheeks together
function embrace(D, mom, nia) { const M = mom.root.position, N = nia.root.position; const r = Math.atan2(N.x - M.x, N.z - M.z); mom.root.rotation.y = r; const f = [Math.sin(r), Math.cos(r)], l = [Math.cos(r), -Math.sin(r)];
  N.x = M.x + f[0] * .26 - l[0] * .04; N.z = M.z + f[1] * .26 - l[1] * .04; nia.root.rotation.y = r + PI; mom.play('Idle_Loop'); nia.play('Idle_Loop');
  act(mom, 'embrace', { k: 1, kneel: 'R', lean: .38, head: [.1, -.5, .25] }); act(nia, 'neckhug', { k: 1, lean: -.05, head: [-.1, .4, -.1] }); }
export function buildZone(ctx) { API = buildSubB(ctx); }

// ---------- small helpers ----------
const sleepers = (g, pts) => pts.map(p => { const z = g.spawnZ(p[0], Z(p[1]), { idle: true, still: true, det: 8, hear: true, aggro: 14, runner: false, hp: 70 }); z.root.rotation.y = p[2] ?? rnd(0, 6.2); return z; });
const intercom = (g) => { g.audio.click && g.audio.click(); };
// scripted movement: D.mv entries are advanced in the step's update (works for NPCs and for the player during a cutscene)
function walk(D, c, x, z, o = {}) { (D.mv = D.mv || []).push({ c, x, z, sp: o.sp || 1.5, anim: o.anim || 'Walk_Loop', end: o.end || 'Idle_Loop', face: o.face, cb: o.cb }); }
function tickMv(g, D, dt) { if (!D.mv) return; D.mv = D.mv.filter(m => { const p = m.c.root.position, dx = m.x - p.x, dz = m.z - p.z, d = Math.hypot(dx, dz);
  if (d < .06) { m.c.play(m.end); if (m.face != null) m.c.root.rotation.y = m.face; if (m.c === g.player && g.cut) g.cut.anim = m.end; m.cb && m.cb(g); return false; }
  const s = Math.min(d, m.sp * dt); p.x += dx / d * s; p.z += dz / d * s; m.c.root.rotation.y = Math.atan2(dx, dz); m.c.play(m.anim); if (m.c === g.player && g.cut) g.cut.anim = m.anim; return true; }); }
const cam = (g, c, l) => { g.cut = Object.assign(g.cut || {}, { cam: c, look: l }); };
const cb = (g, f) => g.dlgQ.push({ cb: f });
const snap = (g) => { g.camera.position.copy(g.cut.cam); g._lk = null; };
const sayThen = (g, lines, f) => g.say(lines, f);
function fuseMesh() { const m = new THREE.Group(); const glass = new THREE.MeshStandardMaterial({ color: '#ffd24a', emissive: '#ff9a10', emissiveIntensity: 1.6 }), cap = new THREE.MeshStandardMaterial({ color: '#b8bec2', metalness: .7, roughness: .3 });
  const t = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .26, 12), glass); t.rotation.z = PI / 2; m.add(t); [-1, 1].forEach(s => { const c = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .07, 12), cap); c.rotation.z = PI / 2; c.position.x = s * .15; m.add(c); });
  m.scale.setScalar(2.6); m.userData.spin = true; return m; }
// the gray-eyed look: two flat gray discs just in front of the eyes (attached to the head bone), faded in and out
function grayEyes(c, on) { if (!c.gEyes) { c.gEyes = new THREE.Group(); const mt = new THREE.MeshBasicMaterial({ color: '#b9c4c6', transparent: true, opacity: 0, depthTest: false }); [-1, 1].forEach(s => { const d = new THREE.Mesh(new THREE.CircleGeometry(.019, 14), mt); d.position.set(s * .033, -.085, .1); d.renderOrder = 9; c.gEyes.add(d); }); c.gEyes.userData.m = mt; c.attach('DEF-head', c.gEyes); if (!c.gEyes.parent) c.root.add(c.gEyes); }
  c.gEyes.userData.m.opacity = on ? .95 : 0; }

// ================= steps =================
export const steps = [
  { id: 'c12_stairs', ch: 12, cp: [0, Z(-2834), PI], obj: 'Find Mom: cross the morgue', hint: 'The volunteers sleep standing up. Crouch (C) and move slowly past. Loud noise wakes them.', mood: 'tense', beat: 1, light: 'dark', rain: false,
    enter(g) { const D = g.stepData; g.hand.visible = true; API.setPower(false); fam(g, D, Z(-2834)); g.wpTarget = [10, 1.2, Z(-2892)];
      sleepers(g, [[-7, -2863], [6, -2850], [1, -2873], [-9, -2887], [8, -2879], [13, -2890], [-2, -2884], [-4, -2858]]); g.victim(-10, Z(-2893), null, 2);
      g.say([['vance', "Sublevel B. The power is failing down there, so mind the lights."], ['keem', "Where is she?"], ['vance', "End of the research wing, past the morgue and the boiler room. My volunteers are loose. They react to light and noise."],
        ['marcus', "Volunteers. That's what he calls them."], ['nia', "Biscuit says shh. He is very good at shh."], ['keem', "Crouch, stay quiet, stay together. Let's go get Mom."]]); },
    update(g) { const D = g.stepData; if (!D.go && g.player.root.position.z < Z(-2892) && g.player.root.position.x > 5) { D.go = true; goto(g, 'c12_boiler', 150); } } },

  { id: 'c12_boiler', ch: 12, cp: [10, Z(-2899), PI], obj: 'Find 3 fuses (0/3)', hint: 'Walk over the glowing fuses. Each one rattles the room, so expect company.', mood: 'tense', beat: 2, light: 'dark', rain: false,
    enter(g) { const D = g.stepData; g.hand.visible = true; API.setPower(false); API.doorBoiler.set(true); API.doorHall.set(false); fam(g, D, Z(-2899), 10); D.fuses = 0; g.wpTarget = null; const FZ = [[-8, -2918], [13, -2922], [-12, -2940]];
      sleepers(g, [[-6, -2904], [4, -2915], [-13, -2925], [2, -2931], [10, -2934], [-4, -2938]]);
      FZ.forEach(([x, z], i) => g.addPickup({ kind: 'fuse', story: true, label: 'Fuse', pos: [x, .9, Z(z)], mk: fuseMesh, onTake(g) { const D = g.stepData; D.fuses++; g.objective(D.fuses < 3 ? 'Find 3 fuses (' + D.fuses + '/3)' : 'Throw the breakers', D.fuses < 3 ? 'Walk over the glowing fuses.' : 'The panel is by the sound-lock door. Press E.');
          g.audio.thud(); g.shake(.3); const side = x < 0 ? 12 : -12; g.horde(3 + D.fuses, [[Math.max(-13, Math.min(13, x + side * .3)), Z(z + 6)]], { aggro: 99, runner: D.fuses > 1 });
          if (D.fuses === 1) g.say([['nia', "That was loud."], ['keem', "That was a fuse."], ['nia', "It was a LOUD fuse."]]);
          if (D.fuses === 3) { g.wpTarget = [API.panelPos[0], 1.2, API.panelPos[1] + 1.3]; D.uses = [{ x: API.panelPos[0], z: API.panelPos[1] + 1.2, r: 2.2, label: 'Install fuses · throw the breakers', fn: (g) => throwBreakers(g) }]; g.say([['marcus', "That's all three. Panel's by the big door."]]); } } }));
      g.say([['vance', "The research wing is on its own breaker. Three fuses were pulled from the boiler room. I would love to say I don't know why."], ['marcus', "Because you wanted nobody walking in on you."], ['vance', "Because I wanted nobody walking out."]]); },
    update(g, dt) { const D = g.stepData; dadTick(g, D, dt); g.pickups.forEach(p => { if (p.m && p.m.userData.spin) { p.m.rotation.y += dt * 2; p.m.position.y = Math.sin(g.t * 2.4) * .06; } }); } },

  { id: 'c12_hold', ch: 12, cp: [0, Z(-2952), PI], obj: 'Hold the hall: cell door opens in 45s', hint: 'Stay close to Dad. Cell glass is cracking: shoot them as they come out.', mood: 'tense', beat: 3, light: 'dark', rain: false,
    enter(g) { const D = g.stepData; g.hand.visible = true; API.setPower(true); API.doorHall.set(true); API.doorBoiler.set(true); API.doorCell.set(false); fam(g, D, Z(-2950)); dadGun(g, D); D.k0 = g.save.kills; D.t = 0; D.go = false; D.hordeAll = true;
      // volunteers pressing on the glass in 8 of the 14 cells
      D.cells = [0, 2, 3, 5, 7, 9, 10, 12].map(i => { const c = API.cells[i]; g.spawnZ(c.x, c.z, { aggro: 99, runner: false, hp: 80 }); return c; }); D.brk = [0, 1, 1, 2, 3];
      const mom = g.npc('dana', 'dana', .1, Z(-3000.8), 0, 'Idle_Talking_Loop'); D.mom = mom; const nia = D.nia; D.nia.update = null; D.nia.root.position.set(1.2, 0, Z(-2955)); act(mom, 'reach', { sides: 'R', k: 1, snap: true });
      g.cut = { anim: 'Idle_Loop', cam: V(-2.8, 2.6, Z(-2949.2)), look: V(0, 1.6, Z(-2990)) }; snap(g);
      g.say([['vance', "Power's back. Every cell in the research wing just woke up. I want you to see them. I think you've earned that."], ['keem', "Is that… all of them?"], ['vance', "The cell door of your mother's room cycles open in forty-five seconds. Hold the hall until then."],
        ['marcus', "Forty-five seconds. Easy. I've waited twenty years for forty-five seconds."], ['nia', "I'll go sit with Mom! She can hear me!"], ['keem', "Nia, go. Stay low. We've got the hall."]], () => { g.cut = null; D.on = true; g.audio.setMood('tense'); walk(D, nia, .62, Z(-2999.4), { sp: 3.4, anim: 'Jog_Fwd_Loop', face: PI, cb: () => act(nia, 'reach', { sides: 'R', k: 1 }) }); }); },
    update(g, dt) { const D = g.stepData; tickMv(g, D, dt); if (!D.on) return; dadTick(g, D, dt); if (D.dad) { const d = D.dad.root.position; d.x += (2.5 - d.x) * dt * .8; d.z += (Z(-2985) - d.z) * dt * .5; }
      D.t += dt; const left = Math.max(0, 45 - D.t); const ls = Math.ceil(left); if (ls !== D.ls) { D.ls = ls; g.objective('Hold the hall: cell door opens in ' + ls + 's', 'Stay close to Dad.'); }
      D.sp = (D.sp || 0) - dt; if (D.sp <= 0 && g.alive().length < 14 && left > 3) { D.sp = 5.5; g.horde(3, [[-4, Z(-2954)], [4, Z(-2954)]], { aggro: 99, runner: D.t > 25 }); }
      [9, 18, 27, 36].forEach((tt, i) => { if (D.t > tt && !D['b' + i]) { D['b' + i] = true; const c = D.cells[(i * 2 + 1) % D.cells.length]; API.breakCell(c); g.audio.glass(); g.shake(.4); g.spawnZ(c.x, c.z, { aggro: 99, runner: i > 1, hp: 90 }); g.spawnZ(c.x, c.z + 1.4, { aggro: 99, runner: i > 1 }); if (i === 1) g.say([['marcus', "Cell four is open!"], ['keem', "Then close it again with that big gun of yours, Dad."]]); } });
      if (left <= 0 && !D.go) { D.go = true; g.audio.thud(); g.say([['nia', "Mom says the latch just clicked. Keem, there's something coming up the hall!"]], () => goto(g, 'c12_boss', 200)); } } },

  { id: 'c12_boss', ch: 12, cp: [0, Z(-2972), PI], obj: 'Beat the Night Orderly', hint: 'The Orderly charges and swings the mop. Roll out of the way, shoot when it stops.', mood: 'tense', beat: 3, light: 'dark', rain: false,
    enter(g) { const D = g.stepData; g.hand.visible = true; API.setPower(true); API.doorHall.set(true); API.doorCell.set(false); fam(g, D, Z(-2972), 0, false); dadGun(g, D); D.hordeAll = true; D.go = false;
      const mom = g.npc('dana', 'dana', .1, Z(-3000.8), 0, 'Idle_Talking_Loop'); act(mom, 'reach', { sides: 'R', k: 1, snap: true }); const nia = g.npc('nia', 'nia', .62, Z(-2999.4), PI, 'Idle_Loop', .62); act(nia, 'reach', { sides: 'R', k: 1, snap: true }); D.nia = nia; if (D.dad) { D.dad.update = null; D.dad.root.position.set(2.8, 0, Z(-2988)); }
      const b = g.spawnZ(0, Z(-2950), { boss: true, hp: 3600, scale: 2.05, runner: false, rig: 'zombie_worker' }); b.cd = 2; b.aggro = 99; b.speed = 1.9; b.mat.userData.u.uShirt.value.set('#4a7a8a'); b.mat.userData.u.uBlood.value = g.settings.gore ? 1.5 : .2; g.boss = b; $q('#bossn').textContent = 'THE NIGHT ORDERLY'; g.audio.roar && setTimeout(() => g.audio.roar(b), 700); D.b = b; mop(b);
      g.say([['orderly', "Visiting hours are over."], ['keem', "We're not visiting. We're collecting."], ['orderly', "Mop. Floor. Mop."], ['nia', "That orderly is carrying a mop like a sword."], ['marcus', "It IS a sword now, Nia. Everything is a sword when you've got nothing left."]]); },
    update(g, dt) { const D = g.stepData, b = g.boss; tickMv(g, D, dt); dadTick(g, D, dt); if (D.nia && D.nia.root.position.z > Z(-2990)) { /* Nia holds still at the hatch */ }
      if (b && !b.dead) { if (!D.p2 && b.hp < 1800) { D.p2 = true; g.shake(1); g.audio.roar && g.audio.roar(b); b.speed = 3; API.cells.filter(c => !c.broken).slice(0, 3).forEach(c => { API.breakCell(c); g.audio.glass(); g.spawnZ(c.x, c.z, { aggro: 99, runner: true }); g.spawnZ(c.x, c.z + 1.5, { aggro: 99 }); }); g.say([['nia', "Now it's really mad!"], ['orderly', "Wet floor. WET. FLOOR."], ['keem', "Wet floor? You're the wet floor."]]); } }
      if (b && b.dead && !D.won) { D.won = true; afterBoss(g, () => goto(g, 'c12_mom', 500)); } } },

  { id: 'c12_mom', ch: 12, cp: [0, Z(-2996), PI], obj: '', hint: '', mood: 'sad', beat: 0, light: 'dark', rain: false,
    enter(g) { const D = g.stepData; g.hand.visible = false; API.setPower(true); API.doorHall.set(true); API.doorCell.set(true); g.audio.setMood('sad');
      const mom = D.mom = g.npc('dana', 'dana', 0, Z(-3008.5), PI, 'Idle_Loop'); const dad = D.dad = g.npc('marcus', 'marcus', -1.7, Z(-3000.8), PI, 'Idle_Loop'); const nia = D.nia = g.npc('nia', 'nia', 1.3, Z(-3001.2), PI, 'Idle_Loop', .62); const P = g.player.root.position; P.set(0, 0, Z(-3001.6)); g.player.root.rotation.y = PI;
      act(mom, 'clutch', { k: 1, snap: true, head: [.5, 0, 0] }); g.cut = { anim: 'Idle_Loop', cam: V(1.9, 1.6, Z(-3002.2)), look: V(0, 1.3, Z(-3008.4)) }; snap(g);
      const L = (arr) => arr.forEach(it => typeof it === 'function' ? cb(g, it) : g.say([it]));
      g.say([['dana', "Don't come in. Please. I can't tell what I'll do."]]); 
      L([['keem', "Mom. It's me. It's Keem."], (g) => { mom.root.rotation.y = 0; act(mom, 'reach', { sides: 'L', k: 1 }); cam(g, V(1.4, 1.6, Z(-3003.4)), V(0, 1.5, Z(-3008.5))); },
        ['dana', "Keem? You got so tall."], (g) => { walk(D, nia, 0, Z(-3007.68), { sp: 3.2, anim: 'Jog_Fwd_Loop', face: PI, cb: () => { embrace(D, mom, nia); } }); walk(D, mom, 0, Z(-3008.1), { sp: .8 }); walk(D, g.player, .5, Z(-3005.7), { sp: 1.5 }); },
        ['nia', "Mommy!"], (g) => cam(g, V(3.7, 1.4, Z(-3006.2)), V(.2, 1.3, Z(-3007.4))), ['dana', "Hi, baby. Hi. Look at the two of you."],
        (g) => { walk(D, dad, 5.3, Z(-3003.4), { sp: 1.2, face: -PI / 2, cb: () => { dad.play('Sitting_Idle_Loop'); act(dad, null); dad.root.position.y = 0; } }); },
        ['marcus', "Dana. You're really here. I'm… I'm just going to sit down for a second."], (g) => { cam(g, V(3.8, 1.2, Z(-3001.2)), V(5, .6, Z(-3003.4))); },
        ['marcus', "My legs have decided this for me."],
        (g) => { cam(g, V(3.4, 1.5, Z(-3005.6)), V(.2, 1.5, Z(-3007.6))); grayEyes(mom, true); mom.play('Idle_Loop'); act(mom, 'clutch', { k: 1, head: [-.12, 0, 0] }); act(nia, null); walk(D, nia, 1.5, Z(-3006.6), { sp: 2 }); g.audio.heartbeat && g.audio.heartbeat(); g.shake(.2); },
        ['dana', "Oh. It's the hum again."], ['dana', "It says my name. Somebody hold my hands. Please."],
        (g) => { act(mom, 'hold', { k: 1 }); act(g.player, 'hold', { k: 1 }); walk(D, g.player, 0, Z(-3007.3), { sp: 1.2 }); },
        ['keem', "I've got you, Mom. Look at me. Breathe with me."], ['dana', "…Okay. Okay. In. And out."],
        (g) => { grayEyes(mom, false); act(mom, 'hold', { k: 1 }); }, ['dana', "There you are."], ['keem', "Here I am."],
        (g) => { cam(g, V(3.2, 1.4, Z(-3006)), V(.2, 1.3, Z(-3007.1))); const b = D.nia.biscuit; if (b) { b.scale.setScalar(1.55); b.position.y += .1; D.bis = b; } },
        ['nia', "Biscuit wants a turn."], ['dana', "Is that Biscuit? He's even floppier than I remember."], ['nia', "He's gotten bigger. He eats like Dad."], ['marcus', "I heard that."],
        (g) => { if (D.bis) { D.bis.scale.setScalar(1); D.bis.position.y -= .1; } g.audio.siren && g.audio.siren(.05, 5); g.audio.staticBurst(1); g.shake(.6); API.setPower(false); cam(g, V(2.8, 2.2, Z(-3003)), V(0, 1.7, Z(-3000))); },
        ['radio', "Dr. Vance, they're here—"]]);
      cb(g, (g) => { g.audio.staticBurst(2); });
      L([['keem', "Who's here?"], ['dana', "The ones who said they'd come for me. I hoped they were only a story."]]);
      cb(g, (g) => { setTimeout(() => g.onComplete && g.onComplete(12), 900); }); },
    update(g, dt) { tickMv(g, g.stepData, dt); } },
];

function mop(b) { const m = new THREE.Group(), pole = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 1.7, 8), new THREE.MeshStandardMaterial({ color: '#8a6a44' })); pole.position.y = .35; m.add(pole);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.16, 10, 8), new THREE.MeshStandardMaterial({ color: '#cfcab8', roughness: 1 })); head.scale.set(1, .7, 1); head.position.y = 1.22; m.add(head); const sm = new THREE.Mesh(new THREE.SphereGeometry(.17, 8, 6), new THREE.MeshStandardMaterial({ color: '#5a0a0a' })); sm.scale.set(.6, .35, .6); sm.position.set(0, 1.3, .05); m.add(sm);
  m.rotation.set(PI / 2, 0, 0); m.position.set(0, .08, .02); b.attach('DEF-hand.R', m); b.mop = m; }
function throwBreakers(g) { const D = g.stepData; if (D.pwr) return; D.pwr = true; D.uses = []; g.wpTarget = null; const pp = API.panelPos; g.cut = { anim: 'Interact', cam: V(pp[0] - 2.2, 1.8, pp[1] + 3), look: V(pp[0], 1.5, pp[1] - 1.2) }; g.objective('', '');
  g.say([['keem', "Fuse one. Fuse two. Fuse three."], ['nia', "Don't forget the big red lever. It always has a big red lever."]], () => {
    g.audio.thud(); g.shake(.5); API.setPower(true); [350, 700, 900, 1250].forEach((t, i) => setTimeout(() => { API.setPower(i % 2 === 1); if (i === 3) { API.setPower(true); } g.audio.click && g.audio.click(); }, t));
    setTimeout(() => { API.doorHall.set(true); g.audio.thud(); g.shake(.4); g.audio.sting && g.audio.sting(); }, 1500);
    setTimeout(() => g.say([['vance', "Power's back. The sound-lock is open. You've gone from lucky to suspicious."], ['marcus', "We're a family. We're always both."]], () => { g.cut = null; goto(g, 'c12_hold', 250); }), 2000); }); }

export const loot = [
  { id: 'c12a', kind: 'med', pos: [-9, .25, Z(-2926)], at: 'c12_boiler' }, { id: 'c12b', kind: 'ammo', item: 'shell', n: 14, pos: [11, .25, Z(-2902)], at: 'c12_boiler' }, { id: 'c12c', kind: 'ammo', item: 'light', n: 40, pos: [-13, .25, Z(-2851)], at: 'c12_stairs' },
  { id: 'c12d', kind: 'ammo', item: 'rifle', n: 30, pos: [-3, .25, Z(-2956)], at: 'c12_hold' }, { id: 'c12e', kind: 'med', pos: [8, .25, Z(-2960)], at: 'c12_hold' },
  pg(-9, Z(-2942), 'Captain Riverside #21: "Sublevel Zero"', 'c12_boiler'),
];
