// Chapter 20 · After the Quiet — the Riverside bridge at dawn. The family crosses together, the Director's last stand and
// Subject Zero, Dad and the hammer, the jets stand down, and a morning on Mr. Dube's porch. World band z -6200..-6600
// (the epilogue goes back to Elm Street, Chapter 17's set).
import * as THREE from 'three';
import { PI, V, dist2, goto, afterBoss, clearThen, boss, pg, rnd, $q } from './helpers.js';
import { walk, tickMv, cam, snap, script, cast, followAll, place, face, act, allyTick, holdTick, keepUp, ring, tickRings, squad, heli, rotorBlur, dawn, card, hideCard, paintAuth, shieldOn, helmOn } from './ch15_kit.js';
import { mats, floor, prop, lamp, wallX, crate } from './kit/common.js';
import { tree, street, streetLamp, pickup } from './kit/town.js';
import { hammerTick, jet, fly } from './kit/finale.js';
import { giveHammer } from '../hands.js';

export const meta = { n: 20, title: 'After the Quiet', endQuote: '“Right behind you, son.”' };
export const speakers = { director: 'The Director', pilot: 'Flight Lead' };
export const Z0 = -6210;
const BR = { z0: -6250, z1: -6440, w: 8 };

export function buildZone(ctx) {
  const K = mats(ctx), T = ctx.THREE;
  // river road down to the bridge
  street(ctx, 0, -6196, -6252, 10); for (let i = 0; i < 8; i++) tree(ctx, (i % 2 ? 1 : -1) * (11 + (i * 3) % 7), -6200 - i * 6, 1.3, '#2a4430');
  streetLamp(ctx, 6.6, -6230, true); streetLamp(ctx, -6.6, -6244, false);
  ctx.sign(['RIVERSIDE BRIDGE', 'EST. 1931'], -9.5, 2.3, -6248, 0, 3.2, 1, '#2a3a4a'); prop(ctx, .12, 2.3, .12, K.steelDark, -9.5, 1.15, -6248.2);
  // the river: dark water both sides of the deck, banks at each end
  const water = new T.MeshStandardMaterial({ color: '#2a4656', roughness: .15, metalness: .35, emissive: '#0a1a24' });
  [-1, 1].forEach(s => { const w = new T.Mesh(new T.PlaneGeometry(40, BR.z0 - BR.z1), water); w.rotation.x = -PI / 2; w.position.set(s * 28.6, .035, (BR.z0 + BR.z1) / 2); ctx.scene.add(w); });
  ctx.updaters.push((dt, t) => { water.emissiveIntensity = .8 + Math.sin(t * .8) * .2; });
  // deck, curbs, rails (solid so nobody walks into the river), steel arches
  floor(ctx, 0, (BR.z0 + BR.z1) / 2, BR.w * 2 + 1.4, BR.z0 - BR.z1, new T.MeshStandardMaterial({ color: '#5c5c5a', roughness: .9 }), .04);
  for (let z = BR.z0 - 4; z > BR.z1; z -= 8) floor(ctx, 0, z, .18, 3.4, new T.MeshStandardMaterial({ color: '#d8c860', emissive: '#d8c860', emissiveIntensity: .1 }), .05);
  [-1, 1].forEach(s => { ctx.wallBox(.4, 1.1, BR.z0 - BR.z1, K.concrete, s * (BR.w + .5), .55, (BR.z0 + BR.z1) / 2, true);
    const st = new T.MeshStandardMaterial({ color: '#4a6a7a', roughness: .5, metalness: .5 });
    for (let k = 0; k < 2; k++) { const span = (BR.z0 - BR.z1) / 2, cz = BR.z0 - span * (k + .5); for (let i = 0; i <= 12; i++) { const a = i / 12, y = Math.sin(a * PI) * 8 + 1.1, z = cz + span * (a - .5); const post = new T.Mesh(new T.BoxGeometry(.3, y, .3), st); post.position.set(s * (BR.w + .5), y / 2, z); ctx.scene.add(post); }
      const arc = new T.Mesh(new T.TorusGeometry(span / 2, .35, 6, 28, PI), st); arc.position.set(s * (BR.w + .5), 1.1, cz); arc.rotation.y = PI / 2; arc.scale.y = 8 / (span / 2); ctx.scene.add(arc); } });
  // far bank: the Harbor Authority checkpoint — barriers, white trucks, floodlights, the Director's helicopter pad
  floor(ctx, 0, -6500, 96, 120, new T.MeshStandardMaterial({ color: '#4a4a46', roughness: .95 }), .02);
  for (let x = -9; x <= 9; x += 3) prop(ctx, 2.6, 1, .7, K.concrete, x, .5, -6448, true);
  [[-16, -6460, PI / 2], [16, -6466, -PI / 2], [-14, -6488, PI * .6], [18, -6492, -PI * .3]].forEach(([x, z, r]) => ctx.car(x, z, r, '#e8e8ea'));
  [[-12, -6452], [12, -6452]].forEach(([x, z]) => { prop(ctx, .2, 5.6, .2, K.steelDark, x, 2.8, z, true); lamp(ctx, x, z + .4, { y: 5.6, real: x > 0, color: '#f0f4ff', intensity: 10, range: 26, size: [1, .3, .5] }); });
  for (let i = 0; i < 6; i++) crate(ctx, -20 + i * 7.6, -6512 - (i % 2) * 4, 1.3, null, i * .3);
  { const pad = new T.Mesh(new T.CircleGeometry(7, 32), new T.MeshStandardMaterial({ color: '#3a3a3a', roughness: .9 })); pad.rotation.x = -PI / 2; pad.position.set(0, .04, -6530); ctx.scene.add(pad);
    const hm = new T.Mesh(new T.RingGeometry(4.6, 5.2, 32), new T.MeshStandardMaterial({ color: '#e8e8e0', emissive: '#e8e8e0', emissiveIntensity: .2 })); hm.rotation.x = -PI / 2; hm.position.set(0, .05, -6530); ctx.scene.add(hm); }
  for (let i = 0; i < 10; i++) tree(ctx, (i % 2 ? 1 : -1) * (28 + (i * 5) % 12), -6470 - i * 12, 1.4, '#284230');
}

// ---------- the Director ----------
function directorBoss(g, D) {
  const b = g.spawnZ(0, -6462, { boss: true, raider: true, hp: 3600, scale: 1.55, gun: 'rifle', shirt: '#e8e8ec', runner: false });
  b.cd = 2; b.aggro = 99; b.speed = 1.4; g.boss = b; D.b = b; $q('#bossn').textContent = 'THE DIRECTOR — Harbor Authority';
  paintAuth(b, '#e8e8ec', '#2a2e36'); shieldOn(b, true, '#d8dce2'); helmOn(b, '#e8e8ec');
  b.armor = (o) => { if (o.head || o.blade || o.boom || o.flame || o.sever) return 1; const P = g.player.root.position, p = b.root.position; const fx = Math.sin(b.root.rotation.y), fz = Math.cos(b.root.rotation.y); const dx = P.x - p.x, dz = P.z - p.z, d = Math.hypot(dx, dz) || 1; return (fx * dx + fz * dz) / d > .35 ? .3 : 1; };
  return b;
}
function zeroBoss(g, D, x, z) { const b = boss(g, x, z, 5200, '#e8e8ec', 'THE DIRECTOR — Subject Zero'); b.scale = 1.95; b.speed = 1.6; D.b = b; const u = b.mat && b.mat.userData && b.mat.userData.u; if (u && u.uPants) u.uPants.value.set('#2a2e36'); return b; }

const ALL = ['dad', 'nia', 'mom', 'reyes', 'dube'];
const morning = (g, D, dt, to = 1) => { D.dw = Math.min(to, (D.dw == null ? .55 : D.dw) + dt * .006); dawn(g, D.dw); };
export const steps = [
  { id: 'c20_bridge', ch: 20, cp: [0, -6214, PI], obj: '', hint: '', mood: 'sad', beat: 0, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); cast(g, D, 0, -6214, ALL); giveHammer(D.dad, false); D.dw = .55; dawn(g, .55);
      place(g.player, -.4, -6236, PI); place(D.dad, 1.4, -6235, PI); place(D.nia, -2, -6235.4, PI); place(D.mom, -3.2, -6234.4, PI); place(D.reyes, 2.8, -6233.6, PI); place(D.dube, 4.2, -6232.4, PI);
      g.cut = { anim: 'Idle_Loop', cam: V(1.6, 1.6, -6243), look: V(-.2, 1.45, -6235.6), flash: false }; snap(g);
      script(g, [
        (g) => { g.audio.staticBurst && g.audio.staticBurst(.9); },
        ['director', "Just the boy. Everyone else stays on that side."],
        ['keem', "Here's the thing about my family."],
        (g) => { act(D.dad, 'hold', { sides: 'R', k: .7 }); cam(g, V(3.6, 1.6, -6240), V(1.4, 1.5, -6235)); },
        ['marcus', "We don't do 'stays on that side.'"],
        (g) => { act(D.dad, null); cam(g, V(-1, 3.2, -6244), V(0, 1.4, -6330)); },
        ['director', "Then you've chosen. Open the cages."],
        (g) => { g.shake(.3); g.audio.roar && g.audio.roar(); },
        ['dube', "Here they come. All of them."],
        (g) => { g.cut = null; goto(g, 'c20_push', 120); },
      ]);
    },
    update(g, dt) { const D = g.stepData; tickMv(g, D, dt); morning(g, D, dt, .65); } },

  { id: 'c20_push', ch: 20, cp: [0, -6252, PI], obj: 'Cross the bridge', hint: 'Together. Push to the far bank — Dad has the hammer, Mr. Dube and Dr. Reyes cover you.', mood: 'tense', beat: 3, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); cast(g, D, 0, -6252, ALL); followAll(g, D, ALL); giveHammer(D.dad, false); D.dw = .6; dawn(g, .6);
      g.horde(10, [[-5, -6280], [5, -6286], [0, -6296], [-6, -6304], [6, -6310]]); D.next = -6300;
      g.wpTarget = [0, 1.2, -6430]; g.say([['dana', "Stay together. Nia, hold my hand."]]);
    },
    update(g, dt) { const D = g.stepData; morning(g, D, dt, .7); hammerTick(g, D, dt); allyTick(g, D, 'reyes', dt, { dmg: 30, cd: 1.4 }); allyTick(g, D, 'dube', dt, { dmg: 46, cd: 1.7, sound: 'shotgun' });
      const pz = g.player.root.position.z;
      if (D.next && pz < D.next + 30) { const z = D.next - 30; g.horde(8, [[-6, z], [6, z - 4], [0, z - 8], [-4, z - 12]], { runner: D.next < -6340 }); if (D.next === -6340) { squad(g, [[-4, -6400], [4, -6400], [0, -6406]], { hp: 100 }); g.say([['nia', "There's so many!"], ['marcus', "Then we keep walking."]]); }
        D.next = D.next > -6380 ? D.next - 40 : null; }
      if (!D.next && pz < -6400 && g.alive().length === 0) clearThen(g, D, 'c20_dir', 300, 'Face the Director'); } },

  { id: 'c20_dir', ch: 20, cp: [0, -6440, PI], obj: 'Stop the Director', hint: 'Her shield blocks shots from the front. Flank her, aim for the visor, or use grenades. Roll out of the orange rings.', mood: 'tense', beat: 3, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); cast(g, D, 0, -6438, ['dad', 'reyes', 'dube']); giveHammer(D.dad, false); D.dw = .7; dawn(g, .7);
      place(g.player, 0, -6442, PI); place(D.dad, 1.8, -6440.6, PI); place(D.reyes, -2.6, -6439.4, PI); place(D.dube, 3.4, -6439, PI);
      const b = directorBoss(g, D); b.st = 'script'; b.root.rotation.y = 0;
      g.cut = { anim: 'Idle_Loop', cam: V(2.4, 1.8, -6447.6), look: V(0, 2, -6462), flash: false }; snap(g);
      script(g, [
        ['director', "Do you know what a cure costs, Keem? Control. Whoever holds it decides."],
        (g) => { cam(g, V(-1.4, 1.65, -6452), V(0, 1.45, -6442)); },
        ['keem', "Nia gave it away last night. You're holding nothing."],
        (g) => { cam(g, V(2.4, 1.8, -6447.6), V(0, 2, -6462)); },
        ['director', "Then I'll take you instead."],
        (g) => { g.cut = null; b.st = 'chase'; D.cd = 3.5; D.sq = 12; D.on = true; followAll(g, D, ['dad', 'reyes', 'dube']); },
      ]);
    },
    update(g, dt) { const D = g.stepData, b = D.b; morning(g, D, dt, .8); tickRings(g, D, dt); if (!D.on) return; hammerTick(g, D, dt, { dmg: 60 }); allyTick(g, D, 'reyes', dt, { dmg: 24, cd: 1.6 }); allyTick(g, D, 'dube', dt, { dmg: 40, cd: 1.9, sound: 'shotgun' });
      if (!b || b.dead) { if (b && b.dead && !D.won) { D.won = true; D.rings && D.rings.forEach(r => g.scene.remove(r.m)); D.rings = []; afterBoss(g, () => goto(g, 'c20_zero', 400), 2.5); } return; }
      if (g.cut) return;
      D.cd -= dt; if (D.cd <= 0) { D.cd = b.hp < b.maxHp * .5 ? 3.4 : 4.6; const P = g.player.root.position; g.toast('Mortar — roll!', 1.1); ring(g, D, P.x, P.z, { r: 2.4, life: 1.3, color: '#ff8a20', dmg: 20 }); if (b.hp < b.maxHp * .5) ring(g, D, P.x + rnd(-4, 4), P.z + rnd(-4, 4), { r: 2.2, life: 1.6, color: '#ff8a20', dmg: 16 }); }
      D.sq -= dt; if (D.sq <= 0) { D.sq = 16; squad(g, [[-8, -6470], [8, -6470]], { hp: 100 }); }
      if (!D.half && b.hp < b.maxHp * .5) { D.half = true; g.say([['director', "Flight Lead, this is the Director. You are cleared on Riverside."], ['reyes', "She's calling the jets!"]]); } } },

  { id: 'c20_zero', ch: 20, cp: [0, -6446, PI], obj: 'Put the Director down', hint: 'She is one of them now. Roll out of the red rings — Dad will go for her legs.', mood: 'tense', beat: 3, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); cast(g, D, 0, -6444, ['dad', 'reyes', 'dube']); giveHammer(D.dad, false); D.dw = .8; dawn(g, .8);
      place(g.player, -.4, -6448, PI); place(D.dad, 1.6, -6446.6, PI); place(D.reyes, -2.6, -6445.6, PI); place(D.dube, 3.4, -6445, PI);
      const b = zeroBoss(g, D, 0, -6462); b.st = 'script'; b.root.rotation.y = 0; b.play && b.play('Idle_Loop');
      g.cut = { anim: 'Idle_Loop', cam: V(2.6, 1.7, -6453), look: V(0, 1.6, -6462), flash: false }; snap(g);
      script(g, [
        ['director', "If I can't decide who gets saved… then nobody does."],
        (g) => { g.shake(.5); g.audio.roar && g.audio.roar(b); cam(g, V(-1.8, 1.6, -6454), V(-2.4, 1.45, -6446)); },
        ['reyes', "That's the unfinished strain. She used it on herself. Keem, get back!"],
        (g) => { act(D.dad, 'hold', { sides: 'R', k: .8 }); cam(g, V(3.8, 1.5, -6451.8), V(1.6, 1.5, -6446.6)); },
        ['marcus', "Hey! Get away from my son."],
        (g) => { act(D.dad, null); g.cut = null; b.st = 'chase'; D.cd = 3; D.on = true; followAll(g, D, ['dad', 'reyes', 'dube']); },
      ]);
    },
    update(g, dt) { const D = g.stepData, b = D.b; morning(g, D, dt, .85); tickRings(g, D, dt); if (!D.on) return; hammerTick(g, D, dt, { dmg: 80, cd: 1 }); allyTick(g, D, 'reyes', dt, { dmg: 26, cd: 1.5 }); allyTick(g, D, 'dube', dt, { dmg: 42, cd: 1.8, sound: 'shotgun' });
      if (!b || b.dead) { if (b && b.dead && !D.won) { D.won = true; D.rings && D.rings.forEach(r => g.scene.remove(r.m)); D.rings = []; g.say([['marcus', "That's for my family."]]); afterBoss(g, () => goto(g, 'c20_jets', 500)); } return; }
      if (g.cut) return;
      D.cd -= dt; if (D.cd <= 0) { D.cd = b.hp < b.maxHp * .4 ? 2.8 : 3.8; const P = g.player.root.position; ring(g, D, P.x, P.z, { r: 2.5, life: 1.15, dmg: 24 }); b.speed = 4.6; setTimeout(() => { if (b && !b.dead) b.speed = 1.6; }, 1200); }
      if (!D.half && b.hp < b.maxHp * .55) { D.half = true; g.toast('She is calling them', 2); g.horde(8, [[-8, -6480], [8, -6484], [-14, -6470], [14, -6472], [0, -6496]], { runner: true }); g.say([['dube', "She's still giving orders. Even now."]]); }
      if (!D.low && b.hp < b.maxHp * .25) { D.low = true; g.say([['keem', "Dad, now! Together!"]]); } } },

  { id: 'c20_jets', ch: 20, cp: [0, -6446, PI], obj: '', hint: '', mood: 'day', beat: 0, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); cast(g, D, 0, -6444, ALL); giveHammer(D.dad, false); D.dw = .85; dawn(g, .85);
      place(g.player, -.4, -6448, PI); place(D.dad, 1.4, -6447.2, PI); place(D.nia, -2, -6446.6, PI); place(D.mom, -3.2, -6445.4, PI); place(D.reyes, 2.8, -6445.6, PI); place(D.dube, 4.2, -6444.4, PI);
      D.j = [jet(g), jet(g), jet(g)];
      g.cut = { anim: 'Idle_Loop', cam: V(.6, 1.5, -6455.6), look: V(-.4, 2.6, -6446), flash: false }; snap(g);
      script(g, [
        (g) => { g.audio.engine && g.audio.engine(true, .9); g.shake(.25); },
        ['nia', "What's that sound?"],
        (g) => { cam(g, V(0, 1.4, -6440), V(0, 11, -6478)); D.j.forEach((J, i) => fly(J, V(-12 + i * 10, 24 - i * 1.5, -6640), V(-12 + i * 10, 13, -6445), 5)); },
        ['pilot', "Harbor Authority, this is Flight Lead. We are over Riverside."],
        ['pilot', "We heard a little girl on the radio last night. My wife made her recipe in our kitchen."],
        (g) => { D.j.forEach((J, i) => fly(J, V(-12 + i * 10, 13, -6445), V(30 + i * 12, 30, -6230), 3.6)); g.shake(.6); cam(g, V(-1.8, 1.5, -6455.4), V(-.4, 1.6, -6447.6)); },
        ['pilot', "Riverside, Flight Lead. We're standing down. Going home."],
        (g) => { g.audio.engine && g.audio.engine(false); act(D.nia, 'hug', { k: 1 }); act(D.mom, 'hold', { k: .8 }); },
        ['keem', "It's over."],
        (g) => { act(D.dad, 'hold', { sides: 'R', k: .6 }); cam(g, V(3.2, 1.6, -6454.4), V(1, 1.5, -6447.4)); },
        ['marcus', "No. Now it starts."],
        (g) => { act(D.nia, null); act(D.mom, null); act(D.dad, null); g.cut = null; goto(g, 'c20_porch', 600); },
      ]);
    },
    update(g, dt) { const D = g.stepData; tickMv(g, D, dt); morning(g, D, dt, 1); } },

  { id: 'c20_porch', ch: 20, cp: [-8, -5038, -PI / 2], obj: '', hint: '', mood: 'day', beat: 0, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); try { const W = g.world; W.ensureZone && W.ensureZone(17); if (W.zones && W.zones[17]) W.zones[17].visible = true; } catch (e) { /* Elm Street set */ } D.lobster = false; cast(g, D, -8, -5038, ['dad', 'nia', 'mom', 'reyes', 'dube', 'tuck', 'danny']); giveHammer(D.dad, false); D.dw = 1; dawn(g, 1);
      D.h = heli(g, 3, -5068, PI * .2); rotorBlur(D.h); D.h.spin && D.h.spin(6); if (D.h.blur) D.h.blur.material.opacity = .12;
      // Dad on Mr. Dube's front steps with the hammer, everybody on the lawn
      place(D.dad, -12.8, -5035, PI / 2); place(D.dube, -13.8, -5032.8, PI * .6); place(g.player, -10.6, -5036.2, -PI / 2); place(D.nia, -10.4, -5037.8, -PI * .55); place(D.mom, -11.4, -5038.6, -PI * .4);
      place(D.reyes, -10.2, -5033.4, -PI * .6); place(D.danny, -7.6, -5036, -PI / 2); place(D.tuck, -7.2, -5034.4, -PI * .55);
      g.cut = { anim: 'Idle_Loop', cam: V(-7.6, 1.8, -5039.6), look: V(-12, 1.3, -5035), flash: false }; snap(g);
      script(g, [
        (g) => { act(D.dad, 'hold', { sides: 'R', k: .8 }); g.audio.thud && g.audio.thud(); },
        ['dube', "Morning, Marcus. Those steps aren't going to fix themselves."],
        ['marcus', "Told you I'd get to them."],
        (g) => { cam(g, V(-5.2, 1.6, -5038.6), V(-7.4, 1.4, -5035.2)); },
        ['danny', "I landed on a street! On purpose! Tuck, tell them it was on purpose."],
        ['tuck', "It was mostly on purpose."],
        (g) => { cam(g, V(-11.8, 1.6, -5030.6), V(-10.2, 1.45, -5033.4)); },
        ['reyes', "Forty-one towns have called in. They're making it. All of them."],
        (g) => { cam(g, V(-9, 1.05, -5039.8), V(-10.4, .95, -5037.8)); },
        ['nia', "Biscuit wants to know if it's quiet now."],
        ['dana', "It's quiet, baby. The good kind."],
        (g) => { act(D.dad, null); cam(g, V(-8.6, 1.6, -5037.4), V(-10.6, 1.5, -5036.2)); },
        ['keem', "After the quiet, we get to start over."],
        (g) => { walk(D, D.dad, -11.6, -5035.6, { sp: 1.1, face: PI / 2 }); cam(g, V(-9, 1.6, -5034), V(-11.2, 1.5, -5035.8)); },
        ['marcus', "Right behind you, son."],
        (g) => { cam(g, V(-2, 5, -5026), V(-11, 1.2, -5036)); card('END OF PART ONE', 5200, 'AFTER THE QUIET · A LONE KEEM STUDIOS GAME'); { const tok = g.stepTok; setTimeout(() => { hideCard(); if (g.stepTok === tok) g.onComplete && g.onComplete(20); }, 5600); } },
      ]);
    },
    update(g, dt) { const D = g.stepData; tickMv(g, D, dt); dawn(g, 1); if (D.h && D.h.tick) D.h.tick(dt); } },
];

export const loot = [
  { id: 'c20a', kind: 'ammo', item: 'rifle', n: 80, pos: [6, .25, -6300], at: 'c20_push' },
  { id: 'c20b', kind: 'med', pos: [-6, .25, -6340], at: 'c20_push' },
  { id: 'c20c', kind: 'grenade', n: 4, pos: [5, .25, -6390], at: 'c20_push' },
  { id: 'c20d', kind: 'ammo', item: 'shell', n: 20, pos: [-10, .25, -6458], at: 'c20_dir' },
  { id: 'c20e', kind: 'med', pos: [10, .25, -6470], at: 'c20_zero' },
  pg(-5, -6420, 'Captain Riverside #29: "Everybody Gets a Cure"', 'c20_push'),
];
