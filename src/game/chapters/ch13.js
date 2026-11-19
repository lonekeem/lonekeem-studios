// Chapter 13 · Biscuit Goes Rogue — Biscuit slips out of Nia's hoodie and heads for the cafeteria (the word "soup" was said out loud).
// Chase him through the gift shop, the children's ward and the cafeteria while Nia talks you through it on the radio. Boss: Lunch Lady Doreen.
// World band z -3300..-3600 (built in world coordinates; the kit lives in ch12_hospital.js).
import * as THREE from 'three';
import { PI, V, dist2, goto, afterBoss, dadGun, dadTick, pg, rnd, $q, follow } from './helpers.js';
import { buildUpper } from './ch12_hospital.js';
import { act } from './ch12_acting.js';
import { spawnBiscuit, tickBiscuit, hopTo } from './ch13_rabbit.js';

export const meta = { n: 13, title: 'Biscuit Goes Rogue', endQuote: '“He\'s sitting on the soup.”', nextTeaser: 'To be continued — Chapter 14 coming soon.' };
export const speakers = { doreen: 'Lunch Lady Doreen' };
export const Z0 = -3300;
let API = null, DOORS = null;
export function buildZone(ctx) { API = buildUpper(ctx); const K = API.K; DOORS = { A: K.door(-8.2, -3390, 3, 'z', K.M.steel, 2.6), B: K.door(8.2, -3426, 3, 'z', K.M.steel, 2.6) }; DOORS.A.set(true); DOORS.B.set(true); }

// ---------- helpers ----------
const sleepers = (g, pts) => pts.map(p => { const z = g.spawnZ(p[0], p[1], { idle: true, still: true, det: 7, hear: true, aggro: 14, runner: false, hp: 70 }); z.root.rotation.y = rnd(0, 6.2); return z; });
function walk(D, c, x, z, o = {}) { (D.mv = D.mv || []).push({ c, x, z, sp: o.sp || 1.5, anim: o.anim || 'Walk_Loop', end: o.end || 'Idle_Loop', face: o.face, cb: o.cb }); }
function tickMv(g, D, dt) { if (!D.mv) return; D.mv = D.mv.filter(m => { const p = m.c.root.position, dx = m.x - p.x, dz = m.z - p.z, d = Math.hypot(dx, dz);
  if (d < .06) { m.c.play(m.end); if (m.face != null) m.c.root.rotation.y = m.face; if (m.c === g.player && g.cut) g.cut.anim = m.end; m.cb && m.cb(g); return false; }
  const s = Math.min(d, m.sp * dt); p.x += dx / d * s; p.z += dz / d * s; m.c.root.rotation.y = Math.atan2(dx, dz); m.c.play(m.anim); if (m.c === g.player && g.cut) g.cut.anim = m.anim; return true; }); }
const cam = (g, c, l) => { g.cut = Object.assign(g.cut || {}, { cam: c, look: l }); };
const cbq = (g, f) => g.dlgQ.push({ cb: f });
function script(g, items) { items.forEach(it => typeof it === 'function' ? (g.dlgCur || g.dlgQ.length ? cbq(g, it) : it(g)) : g.say([it])); }
// Nia's radio: a 3-second cut-in of Nia at the security desk in the pack room, pointing where Biscuit went
const DESK = [-11, -3312];
function radio(g, D, lines, o = {}) { const nia = D.deskNia || (D.deskNia = g.npc('nia', 'nia', DESK[0], DESK[1], PI / 2 + .4, 'Idle_Talking_Loop', .62)); nia.update = null;
  const items = [(g) => { g.cut = { anim: 'Idle_Loop', cam: V(DESK[0] + 3.4, 1.55, DESK[1] + 2.2), look: V(DESK[0], 1.0, DESK[1] - .2), flash: false }; nia.play('Idle_Talking_Loop'); act(nia, 'point', { sides: 'R', k: 1, head: [0, .15, 0] }); }, ...lines, (g) => { act(nia, null); g.cut = null; o.then && o.then(g); }]; script(g, items); }
function puddle(g, D, x, z, r = 1.7) { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24), new THREE.MeshStandardMaterial({ color: '#d68a2e', roughness: .15, metalness: .1, transparent: true, opacity: .9, polygonOffset: true, polygonOffsetFactor: -2 })); m.rotation.x = -PI / 2; m.position.set(x, .06, z); g.scene.add(m); (D.pud = D.pud || []).push({ m, x, z, r }); return m; }
function puddleTick(g, D) { let s = 1; (D.pud || []).forEach(p => { if (Math.hypot(g.player.root.position.x - p.x, g.player.root.position.z - p.z) < p.r) s = .5; }); g.slowMul = s; }
function gurney() { const gr = new THREE.Group(), st = new THREE.MeshStandardMaterial({ color: '#b8c0c4', metalness: .6, roughness: .35 });
  const bed = new THREE.Mesh(new THREE.BoxGeometry(.9, .14, 2.1), new THREE.MeshStandardMaterial({ color: '#f2f2ee' })); bed.position.y = .95; gr.add(bed); const fr = new THREE.Mesh(new THREE.BoxGeometry(.8, .08, 2.0), st); fr.position.y = .8; gr.add(fr);
  [-1, 1].forEach(a => [-1, 1].forEach(b => { const l = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .7, 6), st); l.position.set(a * .36, .42, b * .85); gr.add(l); const w = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .05, 10), new THREE.MeshStandardMaterial({ color: '#222' })); w.rotation.z = PI / 2; w.position.set(a * .36, .07, b * .85); gr.add(w); }));
  const pil = new THREE.Mesh(new THREE.BoxGeometry(.6, .1, .4), new THREE.MeshStandardMaterial({ color: '#d8e8f0' })); pil.position.set(0, 1.07, -.75); gr.add(pil); const sh = new THREE.Mesh(new THREE.BoxGeometry(.86, .06, 1.2), new THREE.MeshStandardMaterial({ color: '#4aa0c8' })); sh.position.set(0, 1.04, .3); gr.add(sh); return gr; }
function ladle(b) { const m = new THREE.Group(), steel = new THREE.MeshStandardMaterial({ color: '#c8ccd0', metalness: .7, roughness: .3 }); const pole = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.5, 8), steel); pole.position.y = .4; m.add(pole);
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(.22, 14, 10, 0, PI * 2, 0, PI / 2), steel); bowl.rotation.x = PI; bowl.position.y = 1.18; m.add(bowl); const soup = new THREE.Mesh(new THREE.CircleGeometry(.2, 14), new THREE.MeshStandardMaterial({ color: '#d68a2e', emissive: '#7a3a08' })); soup.rotation.x = PI / 2; soup.position.y = 1.17; m.add(soup);
  m.rotation.set(PI / 2, 0, 0); m.position.set(0, .08, .02); b.attach('DEF-hand.R', m); }
function hairnet(b) { const n = new THREE.Mesh(new THREE.SphereGeometry(.125, 12, 8, 0, PI * 2, 0, PI / 2), new THREE.MeshStandardMaterial({ color: '#f4f4ee', roughness: 1 })); n.position.set(0, .1, -.01); n.scale.set(1, .85, 1.05); b.attach('DEF-head', n); const ap = new THREE.Mesh(new THREE.BoxGeometry(.4, .55, .05), new THREE.MeshStandardMaterial({ color: '#f4f4ee', roughness: 1 })); ap.position.set(0, .0, .14); b.attach('DEF-spine.002', ap); }

// ================= steps (world coordinates) =================
export const steps = [
  { id: 'c13_pack', ch: 13, cp: [0, -3304, PI], obj: '', hint: '', mood: 'night', beat: 0, light: 'ward', rain: false,
    enter(g) { const D = g.stepData; const dad = D.dad = g.npc('marcus', 'marcus', 2.3, -3318.2, -PI / 2, 'Idle_Loop'), mom = D.mom = g.npc('dana', 'dana', -2.3, -3318.2, PI / 2, 'Idle_Loop'), nia = D.nia = g.npc('nia', 'nia', -4.2, -3312.6, PI / 2 + .6, 'Idle_Loop', .62);
      const rey = D.rey = g.npc('reyes', 'reyes', 0, -3332, 0, 'Walk_Loop'); const P = g.player.root.position; P.set(.4, 0, -3312.4); g.player.root.rotation.y = PI;
      g.cut = { anim: 'Idle_Loop', cam: V(6.2, 2.1, -3311.2), look: V(0, 1.25, -3318), flash: false }; g.audio.setMood('night');
      script(g, [['vance', "Perimeter alarm. A sensor chewed through, I'm told. I need ten minutes to arrange your transport. Pack what Dana needs."],
        (g) => { act(dad, 'point', { sides: 'R', k: 1 }); dad.play('Idle_Talking_Loop'); }, ['marcus', "Easy. I'll carry the cooler."],
        (g) => { act(dad, null); act(mom, 'shrug', { k: 1 }); mom.play('Idle_Talking_Loop'); cam(g, V(-5.8, 2.0, -3312), V(.2, 1.25, -3318.2)); }, ['dana', "Marcus. You threw your back out opening a jar last spring."],
        ['marcus', "That jar was cursed."], (g) => { act(mom, 'point', { sides: 'L', k: 1 }); }, ['dana', "Keem carries the cooler."],
        (g) => { act(mom, null); g.cut.anim = 'Idle_Talking_Loop'; cam(g, V(5.4, 1.8, -3314.4), V(0, 1.5, -3318.4)); walk(D, rey, 3.4, -3321.4, { sp: 2.1 }); }, ['keem', "Why me?"], ['dana', "Because you've never thrown your back out on a jar."],
        ['reyes', "Good news. I found snacks. Bad news: the vending machine fought back."], (g) => { act(rey, 'shrug', { k: 1 }); cam(g, V(7.2, 1.8, -3324), V(3.4, 1.4, -3321.4)); }, ['reyes', "Anyway. I have a bruise shaped like a candy bar."],
        (g) => { act(rey, null); cam(g, V(-1.8, 1.5, -3310.2), V(-4.2, 1.1, -3312.6)); act(nia, 'cradle', { k: 1 }); }, ['nia', "Mom, look! Biscuit learned a trick!"], ['dana', "Does he roll over?"], ['nia', "He rolls OUT."],
        (g) => { act(nia, null); const bis = nia.biscuit; if (bis) bis.visible = false; const B = D.B = spawnBiscuit(g, -4.1, -3312.4, {}); B.grp.position.y = 1.0; D.runB = 1; hopTo(B, 0, -3322, 0); B.go([[0, -3326], [0, -3331]]); cam(g, V(4.5, 1.9, -3314), V(-1, 1.0, -3318)); },
        ['nia', "Biscuit! No! He heard the word soup!"], ['dana', "Nobody said soup."], ['nia', "Dad whispered it in the stairwell."], ['marcus', "I whispered it quietly!"],
        (g) => { hopTo(D.B, 0, -3331, 0); cam(g, V(3.8, 1.8, -3326), V(0, .8, -3332)); }, ['keem', "Nia. Radio. Tell me where he goes."], ['nia', "Take this. I'll watch him from the security desk. Don't scare him. He scares easy."],
        ['keem', "Scare the rabbit. Got it. Don't scare the rabbit."]]);
      script(g, [(g) => { g.cut = null; D.go = true; g.wpTarget = null; }]); },
    update(g, dt) { const D = g.stepData; tickMv(g, D, dt); if (D.B && D.B.active) { if (D.B.st === 'hop') tickBiscuit(g, D.B, dt, { marker: false }); }
      if (D.go && !D.out) { D.out = true; D.B && D.B.remove(); goto(g, 'c13_gift', 100); } } },

  { id: 'c13_gift', ch: 13, cp: [0, -3336, PI], obj: 'Catch Biscuit (gift shop)', hint: 'Walk up slowly. He bolts when you get close. Crouch (C) to sneak up on him.', mood: 'night', beat: 1, light: 'ward', rain: false,
    enter(g) { const D = g.stepData; D.hordeAll = true; D.miss = 0; D.dad = null; const B = D.B = spawnBiscuit(g, -3, -3337, { y: 1.2 }); B.go([[-3, -3337, 1.2], [6, -3343], [-6, -3347], [5, -3357], [-7, -3364], [0, -3371]]);
      sleepers(g, [[-6, -3341], [8, -3346], [-7, -3354], [6, -3361], [-4, -3367], [10, -3369], [-11, -3363]]); g.horde(2, [[0, -3335]], { aggro: 40 });
      const gu = D.gur = gurney(); gu.position.set(0, 0, -3341); gu.rotation.y = 0; g.scene.add(gu); D.gz = -3341; D.gv = 0;
      D.uses = [{ x: 2.4, z: -3340.2, r: 2, label: 'Send the gurney down the aisle', fn: (g) => { D.gv = 11; g.audio.thud(); g.say([['keem', "Express delivery. No tip needed."], ['nia', "Keem, that was a medical device."], ['keem', "It's a delivery device now."]]); } }];
      g.wpTarget = [B.grp.position.x, 1.9, B.grp.position.z]; radio(g, D, [['nia', "He's in the gift shop! Behind the teddy bears!"], ['keem', "They are ALL teddy bears."], ['nia', "The brown one!"], ['keem', "They are all brown!"]]); },
    update(g, dt) { const D = g.stepData; tickMv(g, D, dt); if (D.gur) { if (D.gv > 0) { D.gz -= D.gv * dt; D.gur.position.z = D.gz; g.alive().forEach(z => { const q = z.root.position; if (Math.hypot(q.x, q.z - D.gz) < 1.5) { g.damageZ(z, 220, V(0, .2, -1), {}); if (Math.random() < .3) g.shake(.3); } }); if (D.gz < -3369) { D.gv = 0; g.audio.crash(); g.shake(.6); } } }
      tickBiscuit(g, D.B, dt, { onMiss: () => { D.miss++; if (D.miss === 1) radio(g, D, [['nia', "Don't chase him! He thinks chasing is a game."], ['keem', "It IS a game. I'm losing."]]); }, onHop: (B, i) => { if (i === 2) g.horde(3, [[-12, -3335], [12, -3335]], { aggro: 99, runner: true }); if (i === 4) g.horde(3, [[0, -3335]], { aggro: 99, runner: true }); },
        onReach: (B) => { D.reached = true; } });
      if (D.reached && !D.out) { D.out = true; g.say([['nia', "He's going for the door! Don't let him leave the shop!"]], () => { hopTo(D.B, 0, -3380, 0); setTimeout(() => goto(g, 'c13_ward', 150), 700); }); } } },

  { id: 'c13_ward', ch: 13, cp: [0, -3378, PI], obj: "Catch Biscuit (children's ward)", hint: 'Rooms lock when you step inside. Clear the room to open the door.', mood: 'tense', beat: 2, light: 'ward', rain: false,
    enter(g) { const D = g.stepData; D.hordeAll = true; D.ph = 0; DOORS.A.set(true); DOORS.B.set(true); const B = D.B = spawnBiscuit(g, 0, -3380, {}); B.go([[0, -3384], [-5, -3390], [-12, -3391]]);
      sleepers(g, [[3, -3400], [-3, -3414], [2, -3434], [-3, -3396]]); g.wpTarget = [B.grp.position.x, .9, B.grp.position.z];
      radio(g, D, [['nia', "He ran into the children's ward. Be gentle, he hates loud noises."], ['keem', "That makes two of us."]]); },
    update(g, dt) { const D = g.stepData, P = g.player.root.position; tickMv(g, D, dt); const ev = { reach: 3.2, onHop: () => { }, onReach: () => { D.reached = true; } };
      if (D.ph === 0 || D.ph === 2 || D.ph === 4) tickBiscuit(g, D.B, dt, ev); else if (D.B.st === 'hop') tickBiscuit(g, D.B, dt, { marker: false });
      if (D.ph === 0 && D.B.i >= 2 && P.x < -9.2 && Math.abs(P.z + 3391) < 7) { D.ph = 1; DOORS.A.set(false); g.audio.thud(); g.shake(.5); g.wpTarget = null; g.objective('Clear the room (' + 7 + ')', 'The door is locked until they are down.'); g.horde(4, [[-13, -3386]], { aggro: 99 }); g.horde(3, [[-13, -3396]], { aggro: 99, runner: true }); g.toast('LOCKED IN', 1.4);
        g.say([['keem', "That is a LOT of tiny beds."], ['nia', "Keem. Don't shoot the rabbit."], ['keem', "I'm shooting the zombies, Nia. Not the rabbit."]]); D.left = 7; D.k0 = g.save.kills; }
      if (D.ph === 1) { const k = g.save.kills - D.k0, left = Math.max(0, 7 - k); if (left !== D.left) { D.left = left; g.objective('Clear the room (' + left + ')', 'The door is locked until they are down.'); }
        if (g.alive().filter(z => z.root.position.x < -9).length === 0 && g.t - (D.t1 || (D.t1 = g.t)) > 3) { D.ph = 2; DOORS.A.set(true); g.audio.thud(); const B = D.B; B.go([[-12, -3391], [-3, -3402], [0, -3410], [6, -3420], [12, -3426]]); B.i = 0; B.held = false; hopTo(B, -3, -3402); B.i = 1; g.objective("Catch Biscuit (children's ward)", 'He is on the move.'); g.say([['nia', "Door's open! He's hopping toward the other side!"]]); } }
      if (D.ph === 2 && D.B.i >= 4 && P.x > 9.2 && Math.abs(P.z + 3426) < 7) { D.ph = 3; DOORS.B.set(false); g.audio.thud(); g.shake(.5); g.wpTarget = null; g.horde(5, [[13, -3421]], { aggro: 99 }); g.horde(4, [[13, -3431]], { aggro: 99, runner: true }); g.toast('LOCKED IN', 1.4); D.k1 = g.save.kills; D.t3 = g.t; g.say([['keem', "Okay. Murals. Beds. Zombies. Standard ward."]]); }
      if (D.ph === 3) { const k = g.save.kills - D.k1, left = Math.max(0, 9 - k); g.objective('Clear the room (' + left + ')', 'The door is locked until they are down.'); if (g.alive().filter(z => z.root.position.x > 9).length === 0 && g.t - D.t3 > 3) { D.ph = 4; DOORS.B.set(true); g.audio.thud(); const B = D.B; B.go([[12, -3426], [0, -3434], [0, -3442]]); hopTo(B, 0, -3434); B.i = 1; g.say([['nia', "Almost there. I can smell the soup from here."], ['keem', "You can't smell through a radio."], ['nia', "I can. It's strong."]]); } }
      if (D.ph === 4 && D.reached && !D.out) { D.out = true; hopTo(D.B, 0, -3452); setTimeout(() => goto(g, 'c13_cafe', 200), 600); } } },

  { id: 'c13_cafe', ch: 13, cp: [0, -3450, PI], obj: 'Beat Lunch Lady Doreen', hint: 'Soup puddles slow you down. Dodge the ladle: it comes down in a ring.', mood: 'tense', beat: 3, light: 'ward', rain: false,
    enter(g) { const D = g.stepData; D.hordeAll = true; D.go = false; [[-8, -3470], [7, -3478], [0, -3488], [-12, -3484], [12, -3462]].forEach(([x, z]) => puddle(g, D, x, z, 1.5 + Math.random() * .5));
      const B = D.B = spawnBiscuit(g, 3, -3498, { y: 2.12, scale: 1.5 }); D.B.st = 'sit'; B.wps = [[3, -3498]]; B.held = true; g.wpTarget = null;
      const b = D.b = g.spawnZ(0, -3492, { hp: 3200, scale: 1.95, runner: false, rig: 'zombie_office', aggro: 99 }); b.boss = true; b.cd = 2; b.speed = 1.8; g.boss = b; if (b.mat && b.mat.userData.u) { b.mat.userData.u.uBlood.value = g.settings.gore ? 1.2 : .2; } $q('#bossn').textContent = 'LUNCH LADY DOREEN'; ladle(b); hairnet(b); g.audio.roar && setTimeout(() => g.audio.roar(), 900); b.st = 'chase';
      g.cut = { anim: 'Idle_Loop', cam: V(-5, 1.9, -3466), look: V(0, 1.6, -3492), flash: false };
      script(g, [['doreen', "Lunch is served."], (g) => cam(g, V(2.5, 3.2, -3486), V(3, 2.1, -3498)), ['nia', "Keem. Is that Biscuit? On the soup kettle?"], ['keem', "He's sitting on top of the soup."], ['nia', "Is he eating it?"], ['keem', "He is… supervising it."],
        (g) => cam(g, V(-4, 1.9, -3478), V(0, 1.6, -3492)), ['doreen', "No running in the cafeteria."], ['keem', "She's holding a ladle like a sword."], ['nia', "Everyone in this hospital holds things like swords."], (g) => { g.cut = null; }]); },
    update(g, dt) { const D = g.stepData, b = D.b; puddleTick(g, D); tickBiscuit(g, D.B, dt, { marker: false }); const nm = g.alive().filter(z => !z.boss).length;
      if (b && !b.dead) { D.pt = (D.pt || 0) - dt; if (D.pt <= 0 && !g.cut) { D.pt = 7; const P = g.player.root.position; const x = Math.max(-14, Math.min(14, P.x + rnd(-3, 3))), z = Math.max(-3504, Math.min(-3450, P.z + rnd(-3, 3))); puddle(g, D, x, z, 1.5); if (D.pud.length > 12) { const o = D.pud.shift(); g.scene.remove(o.m); } if (!D.said) { D.said = 1; g.toast('SOUP SPLASH — it slows you down', 2); } }
        if (!D.p2 && b.hp < 1600) { D.p2 = true; g.shake(1); g.audio.roar && g.audio.roar(); b.speed = 2.8; g.horde(4, [[-12, -3460], [12, -3460]], { aggro: 99 }); g.horde(3, [[0, -3462]], { aggro: 99, runner: true }); g.say([['doreen', "Seconds?"], ['keem', "No, thank you! I'm full!"], ['nia', "She said seconds! That's how you know she's mad!"]]); } }
      if (b && b.dead && !D.won) { D.won = true; D.pud.forEach(p => g.scene.remove(p.m)); D.pud = []; g.slowMul = 1; afterBoss(g, () => goto(g, 'c13_end', 600)); } } },

  { id: 'c13_end', ch: 13, cp: [0, -3492, PI], obj: 'Pick up Biscuit', hint: 'He is on the soup. Walk up to him; he is too full to run.', mood: 'night', beat: 1, light: 'ward', rain: false,
    enter(g) { const D = g.stepData; g.slowMul = 1; D.B = spawnBiscuit(g, 3, -3498, { y: 2.12, scale: 1.5 }); D.B.held = true; D.B.st = 'sit'; g.wpTarget = [3, 2.2, -3498]; D.uses = [{ x: 3, z: -3496.4, r: 2.2, label: 'Pick up Biscuit', fn: (g) => finale(g, D) }]; },
    update(g, dt) { const D = g.stepData; tickMv(g, D, dt); tickBiscuit(g, D.B, dt, { marker: false }); } },
];

function finale(g, D) { if (D.fin) return; D.fin = true; D.uses = []; g.wpTarget = null; const P = g.player.root.position, B = D.B; P.set(3, 0, -3496.6); g.player.root.rotation.y = PI;
  g.cut = { anim: 'Idle_Loop', cam: V(6.2, 1.5, -3493.6), look: V(3, 1.3, -3498), flash: false };
  script(g, [['keem', "Hey, buddy. It's me. Nobody's chasing you now."], (g) => { g.cut.anim = 'PickUp_Table'; cam(g, V(5.4, 1.2, -3495.4), V(3, 1.5, -3498)); g.player.play('PickUp_Table', { once: true, force: true }); },
    ['nia', "Is he okay?"], ['keem', "He's sitting in the soup."], ['nia', "Is it hot soup?"], ['keem', "It's been cold for months."], ['nia', "…Biscuit. Bad. Keem, bring him home."],
    (g) => { g.cut.anim = 'Idle_Loop'; cam(g, V(4.6, 2.2, -3491.6), V(3, 1.6, -3496.6)); B.grp.position.set(3, 1.72, -3496.7); B.grp.scale.setScalar(1.2); B.held = true; },
    ['keem', "Okay, bunny. Up you go. Ugh. You smell like meatloaf."], (g) => { act(g.player, 'cradle', { k: 1 }); },
    ['vance', "Your ten minutes are up. Bring the rabbit. Bring your family. Quickly."], ['keem', "Why quickly?"], ['vance', "Because the alarm was not false."],
    (g) => { act(g.player, null); setTimeout(() => g.onComplete && g.onComplete(13), 900); }]); }

export const loot = [
  { id: 'c13a', kind: 'ammo', item: 'light', n: 36, pos: [-12, .25, -3334], at: 'c13_gift' }, { id: 'c13b', kind: 'med', pos: [12.5, .25, -3340], at: 'c13_gift' }, { id: 'c13c', kind: 'ammo', item: 'shell', n: 12, pos: [6, .25, -3376], at: 'c13_ward' },
  { id: 'c13d', kind: 'med', pos: [-13, .25, -3408], at: 'c13_ward' }, { id: 'c13e', kind: 'ammo', item: 'rifle', n: 30, pos: [13, .25, -3408], at: 'c13_ward' }, { id: 'c13f', kind: 'grenade', n: 3, pos: [-14, .25, -3456], at: 'c13_cafe' },
  { id: 'c13g', kind: 'med', pos: [14, .25, -3452], at: 'c13_cafe' }, pg(-13, -3490, 'Captain Riverside #22: "Meatloaf Monday"', 'c13_cafe'),
];
