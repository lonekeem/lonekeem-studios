// Chapter 17 · Homecoming — Danny's helicopter sets down in the Riverside Market lot. Elm Street, Mr. Walt, Mr. Dube's
// cellar, the Quiet Protocol, Harbor Authority scouts, and the road to the animal clinic. World band z -4900..-5300.
import * as THREE from 'three';
import { PI, V, dist2, goto, afterBoss, clearThen, dadGun, dadTick, boss, pg, rnd, $q } from './helpers.js';
import { walk, tickMv, cam, snap, script, cast, followAll, place, face, act, allyTick, holdTick, keepUp, ring, tickRings, squad, heli, rotorBlur } from './ch15_kit.js';
import { mats, floor, prop, lamp, wallX } from './kit/common.js';
import { house, picket, tree, street, streetLamp, radioTower, pickup } from './kit/town.js';
import { giveHammer } from '../hands.js';

export const meta = { n: 17, title: 'Homecoming', endQuote: '“Cure first. Then the radio.”' };
export const speakers = { director: 'The Director' };
export const Z0 = -4920;
const DUBE = [-18, -5035];

export function buildZone(ctx) {
  const K = mats(ctx), T = ctx.THREE;
  // Riverside Market lot (where the helicopter lands) + the store front behind it
  floor(ctx, 0, -4932, 76, 58, new T.MeshStandardMaterial({ color: '#4a4a48', roughness: .95 }), .02);
  for (let x = -26; x <= 26; x += 4.4) floor(ctx, x, -4945, .14, 5, new T.MeshStandardMaterial({ color: '#d8d4c8', emissive: '#d8d4c8', emissiveIntensity: .15 }), .03);
  ctx.wallBox(56, 6.4, 1, K.brick, 0, 3.2, -4902, true);
  const glow = new T.MeshStandardMaterial({ color: '#2a2418', emissive: '#ffd8a0', emissiveIntensity: .7 });
  [-18, -9, 9, 18].forEach(x => { const w = new T.Mesh(new T.PlaneGeometry(6, 2.6), glow); w.position.set(x, 1.8, -4901.45); ctx.scene.add(w); });
  ctx.wallBox(4, 2.8, .2, K.black, 0, 1.4, -4901.4, false);
  ctx.sign(['RIVERSIDE MARKET', 'GROCERIES · BAIT · COFFEE'], 0, 4.8, -4901.4, 0, 9, 1.4, '#2a4a3a');
  ctx.wallBox(1, 3, 40, K.brick, -28.5, 1.5, -4922, true); ctx.wallBox(1, 3, 40, K.brick, 28.5, 1.5, -4922, true);
  [-10, 10].forEach(x => { lamp(ctx, x, -4936, { y: 5.4, real: true, color: '#ffd9a8', intensity: 9, range: 22, size: [.6, .14, .4] }); prop(ctx, .14, 5.4, .14, K.steelDark, x, 2.7, -4936, true); });
  ctx.car(-18, -4925, PI / 2, '#5a6a7a'); ctx.car(20, -4950, -PI / 2, '#8a3a2a');
  // Elm Street
  street(ctx, 0, -4960, -5240, 10);
  const H = [[-4985, '#c9c1ad', '#4a3a32'], [-5010, '#a9b8c4', '#3a3a42'], [-5035, '#d8cfa0', '#5a3a2a'], [-5060, '#b8a8b8', '#3a3036'], [-5085, '#c4cfb4', '#3a4234'], [-5110, '#e0d4c0', '#4a3a32'], [-5135, '#a4b4a4', '#2e3a36'], [-5160, '#d4b8a4', '#4a3a32']];
  H.forEach(([z, col, roof], i) => { [-1, 1].forEach(s => { const x = s * 18; const dube = s < 0 && z === DUBE[1]; house(ctx, x, z, { col: dube ? '#cfc6a2' : (s > 0 ? H[(i + 3) % H.length][1] : col), roof, facing: s < 0 ? 'e' : 'w', seed: i * 2 + (s > 0 ? 1 : 0), lit: dube ? 1 : .35, light: dube });
    picket(ctx, s * 9.4, z + 11, z - 11, z); if (i % 2 === 0) tree(ctx, s * 12.4, z + 12.5, 1 + (i % 3) * .12); }); });
  // Mr. Dube's cellar bulkhead (slanted doors beside the porch) + his old pickup + mailbox
  { const bx = -12.4, bz = DUBE[1] - 4.2; const bM = new T.MeshStandardMaterial({ color: '#3a5a3a', roughness: .7, metalness: .3 }); prop(ctx, 1.8, .7, 2.2, K.concrete, bx, .35, bz, true);
    const dl = new T.Mesh(new T.BoxGeometry(.9, .08, 2.1), bM); dl.position.set(bx - .45, .78, bz); dl.rotation.z = .3; ctx.scene.add(dl); const dr = new T.Mesh(new T.BoxGeometry(.9, .08, 2.1), bM); dr.position.set(bx + .45, .78, bz); dr.rotation.z = -.3; ctx.scene.add(dr); ctx.__bulk = { dl, dr }; }
  pickup(ctx, -4.2, -5052, 0, '#7a3a22'); prop(ctx, .12, 1.1, .12, K.woodDark, -8.2, .55, DUBE[1] + 2.4); prop(ctx, .5, .36, .7, K.blue, -8.2, 1.2, DUBE[1] + 2.4);
  ctx.sign(['DUBE'], -8.2, 1.62, DUBE[1] + 2.75, 0, .9, .26, '#2a3a5a');
  // parked cars on the curb, a few street lamps (few real lights for phones)
  [[4.2, -4998, PI, '#3a4a5a'], [-4.2, -5022, 0, '#6a6a5a'], [4.2, -5074, PI, '#7a7a80'], [-4.2, -5122, 0, '#4a3a5a'], [4.2, -5150, PI, '#2a4a3a']].forEach(a => ctx.car(...a));
  [[6.6, -4980, true], [-6.6, -5030, true], [6.6, -5080, true], [-6.6, -5130, false], [6.6, -5180, true]].forEach(([x, z, r]) => streetLamp(ctx, x, z, r));
  // south end: road barricade, a sign to Mill Road and the clinic, Signal Hill's tower on the ridge
  for (let x = -6; x <= 6; x += 3) { prop(ctx, 2.4, .2, .2, K.yellow, x, 1, -5205); prop(ctx, .12, 1, .9, K.woodDark, x - 1, .5, -5205); prop(ctx, .12, 1, .9, K.woodDark, x + 1, .5, -5205); }
  ctx.sign(['MILL ROAD', 'ANIMAL CLINIC  1 MI'], 9.5, 2.2, -5200, 0, 3.4, 1.1, '#2a5a3a'); prop(ctx, .12, 2.2, .12, K.steelDark, 9.5, 1.1, -5200.2);
  radioTower(ctx, 72, -5330, 56, 10); const hill = new T.Mesh(new T.SphereGeometry(40, 20, 12, 0, PI * 2, 0, PI / 2), new T.MeshStandardMaterial({ color: '#1e2a22', roughness: 1 })); hill.scale.y = .3; hill.position.set(78, -2, -5330); ctx.scene.add(hill);
  for (let i = 0; i < 14; i++) tree(ctx, (i % 2 ? 1 : -1) * (28 + (i * 7) % 14), -4975 - i * 17, 1.3, '#26402a');
}

// ---------- Mr. Walt ----------
function waltBoss(g, D, x, z) { const b = boss(g, x, z, 2600, '#7a6248', 'MR. WALT — the neighbor'); b.scale = 1.6; D.b = b; b.speed = 1.3; const u = b.mat && b.mat.userData && b.mat.userData.u; if (u && u.uPants) u.uPants.value.set('#4a4a52'); return b; }

export const steps = [
  { id: 'c17_land', ch: 17, cp: [4, -4934, PI], obj: '', hint: '', mood: 'sad', beat: 0, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true);
      D.h = heli(g, 12, -4928, -PI * .35); rotorBlur(D.h); D.h.spin(20); D.h.blur.material.opacity = .3; g.audio.engine && g.audio.engine(true, .6);
      cast(g, D, 4, -4934, ['dad', 'nia', 'mom', 'reyes', 'tuck', 'danny']);
      place(g.player, 4, -4940, PI); place(D.dad, 6, -4939, PI); place(D.nia, 2.2, -4939.6, PI); place(D.mom, 1, -4938.4, PI); place(D.reyes, 7.6, -4937.6, PI); place(D.tuck, 9.4, -4934, -PI * .7); place(D.danny, 10, -4931, -PI * .6);
      g.cut = { anim: 'Idle_Loop', cam: V(1.2, 1.9, -4946.4), look: V(6, 1.5, -4937.4), flash: false }; snap(g);
      script(g, [
        ['danny', "Riverside, Maine. Told you. Barely."],
        (g) => { D.spin = true; },
        ['keem', "It looks the same. It doesn't feel the same."],
        ['nia', "Biscuit knows where we are. His nose is going crazy."],
        (g) => { act(D.dad, 'clutch', { sides: 'L', k: .6 }); cam(g, V(7.8, 1.7, -4943.6), V(6, 1.45, -4939.2)); },
        ['marcus', "Mr. Dube's place is down Elm. Five houses."],
        ['dana', "Marcus, your hand is shaking."],
        ['marcus', "Then let's walk fast."],
        (g) => { act(D.dad, null); face(D.danny, 4, -4940); cam(g, V(13.6, 2, -4938), V(10, 1.5, -4931)); },
        ['danny', "I'll stay with the bird. If you need a ride, I'm the ride."],
        ['tuck', "I'll stay with Danny. Somebody has to stop him apologizing to the zombies."],
        (g) => { g.cut = null; followAll(g, D, ['dad', 'nia', 'mom', 'reyes']); dadGun(g, D); g.wpTarget = [0, 1.2, -4992]; g.objective('Get to Mr. Dube\'s house', 'Head down Elm Street.');
          g.horde(6, [[-3, -4972], [4, -4978], [-6, -4984], [2, -4990], [7, -4970]]); D.go = 'walk'; },
      ]);
    },
    update(g, dt) { const D = g.stepData; tickMv(g, D, dt); dadTick(g, D, dt); if (D.h) { D.h.tick(dt); if (D.spin) { D.h.v = Math.max(0, D.h.v - dt * 4); D.h.blur.material.opacity = Math.min(.3, D.h.v / 60); } }
      if (D.go === 'walk' && g.player.root.position.z < -4986 && !D.next) { D.next = true; goto(g, 'c17_street', 120); } } },

  { id: 'c17_street', ch: 17, cp: [0, -4990, PI], obj: 'Clear Elm Street', hint: 'They come out of the yards. Dad and Dr. Reyes have your back.', mood: 'tense', beat: 2, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); cast(g, D, 0, -4990, ['dad', 'nia', 'mom', 'reyes']); followAll(g, D, ['dad', 'nia', 'mom', 'reyes']); dadGun(g, D);
      g.horde(10, [[-8, -5004], [8, -5008], [-12, -5012], [12, -5016], [0, -5020], [-6, -5026], [6, -5028], [-10, -5000]]);
      setTimeout(() => { if (g.stepData === D) g.horde(5, [[-12, -4996], [12, -5000], [0, -5030]], { runner: true }); }, 7000);
      g.say([['nia', "That's Mrs. Ortiz's car. She never parks crooked."], ['keem', "Stay behind Dad, Nia."]]);
    },
    update(g, dt) { const D = g.stepData; dadTick(g, D, dt); allyTick(g, D, 'reyes', dt, { dmg: 30, cd: 1.4 });
      D.t = (D.t || 0) + dt; if (D.t > 9 && g.alive().length === 0) clearThen(g, D, 'c17_walt', 220, 'Keep going to Mr. Dube\'s'); } },

  { id: 'c17_walt', ch: 17, cp: [0, -5012, PI], obj: 'Put Mr. Walt to rest', hint: 'When the red ring shows under you, roll out. He lunges where you stand.', mood: 'tense', beat: 3, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); cast(g, D, 0, -5012, ['dad', 'nia', 'mom', 'reyes']);
      place(g.player, 0, -5014, PI); place(D.dad, 2, -5013, PI); place(D.nia, -1.6, -5012.6, PI); place(D.mom, -2.8, -5011.6, PI); place(D.reyes, 3.4, -5011.6, PI);
      const b = waltBoss(g, D, 0, -5030); b.st = 'script'; b.root.rotation.y = 0; b.play && b.play('Idle_Loop');
      g.cut = { anim: 'Idle_Loop', cam: V(3.2, 1.8, -5018.5), look: V(0, 1.7, -5029), flash: false }; snap(g);
      script(g, [
        ['keem', "Mr. Walt…"],
        ['nia', "He gave us candy every Halloween. The full-size kind."],
        (g) => { cam(g, V(5.6, 1.8, -5018.6), V(0, 1.4, -5021)); },
        ['keem', "I'm sorry, Mr. Walt. I'm gonna make this quick."],
        (g) => { g.cut = null; followAll(g, D, ['dad', 'nia', 'mom', 'reyes']); dadGun(g, D); b.st = 'chase'; D.cd = 3.5; },
      ]);
    },
    update(g, dt) { const D = g.stepData, b = D.b; tickMv(g, D, dt); dadTick(g, D, dt); allyTick(g, D, 'reyes', dt, { dmg: 24, cd: 1.6 }); tickRings(g, D, dt);
      if (!b || b.dead) { if (b && b.dead && !D.won) { D.won = true; D.rings && D.rings.forEach(r => g.scene.remove(r.m)); D.rings = []; g.say([['keem', "Rest easy, Mr. Walt."]]); afterBoss(g, () => goto(g, 'c17_dube', 300)); } return; }
      if (g.cut || D.cd == null) return;
      D.cd -= dt; if (D.cd <= 0) { D.cd = b.hp < b.maxHp * .5 ? 3.2 : 4.4; const P = g.player.root.position; ring(g, D, P.x, P.z, { r: 2.3, life: 1.2, dmg: 22 }); b.speed = 4.2; setTimeout(() => { if (b && !b.dead) b.speed = 1.3; }, 1300); }
      if (!D.half && b.hp < b.maxHp * .5) { D.half = true; g.toast('The whole block heard that', 2); g.horde(5, [[-12, -5040], [12, -5044], [0, -5050], [-10, -5020], [10, -5022]], { runner: true }); g.say([['dana', "Behind the fences! Keem, the yards!"]]); } } },

  { id: 'c17_dube', ch: 17, cp: [-7, -5036, -PI / 2], obj: '', hint: '', mood: 'sad', beat: 0, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); cast(g, D, -7, -5036, ['dad', 'nia', 'mom', 'reyes']); const bx = -12.4, bz = DUBE[1] - 4.2;
      place(g.player, -8.6, -5039.4, -PI / 2); place(D.dad, -7.6, -5037.4, -PI / 2); place(D.nia, -8.2, -5041.4, -PI / 2); place(D.mom, -6.8, -5041.8, -PI / 2); place(D.reyes, -6.4, -5038.8, -PI / 2);
      D.dube = g.npc('dube', 'dube', bx, bz, PI / 2, 'Idle_Loop');
      g.cut = { anim: 'Idle_Loop', cam: V(-5.2, 1.9, -5045.2), look: V(-10.6, 1.3, -5039.6), flash: false }; snap(g);
      const lan = new THREE.PointLight('#ffc070', 0, 7, 1.6); lan.position.set(bx, 1.4, bz); g.scene.add(lan); g.props.push(lan); D.lan = lan;
      script(g, [
        (g) => { g.audio.thud && g.audio.thud(); D.lan.intensity = 6; walk(D, D.dube, -10.2, -5039.4, { sp: 1.2, end: 'Idle_Talking_Loop', face: -PI / 2 + PI }); },
        ['dube', "Keem? Lord. Look at you. All of you."],
        ['keem', "Mr. Dube. I saw them take you down. That first night."],
        ['dube', "Walt pulled them off me. Walt took the bite meant for me. I've been in that cellar ever since, talking to a radio."],
        (g) => { act(D.dube, 'hold', { sides: 'R', k: .8 }); cam(g, V(-6, 1.7, -5043.4), V(-8.8, 1.3, -5038.2)); },
        ['dube', "Marcus. You left this on my porch in March. Figured you'd want it back."],
        (g) => { act(D.dube, null); giveHammer(D.dad, false); act(D.dad, 'hold', { sides: 'R', k: .7 }); g.audio.pickup && g.audio.pickup(); },
        ['marcus', "My hammer. I was gonna fix your steps."],
        ['dube', "You still can. Listen to me, all of you. Something came over the radio an hour ago."],
        (g) => { act(D.dad, null); g.audio.staticBurst && g.audio.staticBurst(1); cam(g, V(-6.6, 2.2, -5034), V(-9, 1.3, -5040)); },
        ['director', "This is the Director of the Harbor Authority. The Quiet Protocol begins at dawn. Every town north of the river that has not been cleared will be burned. Remain indoors."],
        ['dana', "They're going to burn Riverside."],
        ['dube', "Riverside and every town up the coast. Unless somebody gives them a reason not to."],
        ['reyes', "A cure is a reason. If I can make it tonight, they have nothing left to burn."],
        ['keem', "Where?"],
        ['reyes', "Somewhere with a centrifuge, a fridge and power."],
        ['dube', "The animal clinic on Mill Road. Doc Ames kept a generator. He kept everything."],
        (g) => { g.audio.engine && g.audio.engine(true, .5); g.shake(.2); cam(g, V(-3, 2.4, -5040), V(-2, 3, -5010)); },
        ['nia', "Do you hear that? That's not Danny."],
        ['dube', "That's them. Scouts. Get on the porch, son."],
        (g) => { g.cut = null; goto(g, 'c17_scouts', 200); },
      ]);
    },
    update(g, dt) { tickMv(g, g.stepData, dt); } },

  { id: 'c17_scouts', ch: 17, cp: [-8, -5038, 0], obj: 'Hold Mr. Dube\'s house', hint: 'Authority scouts from both ends of the street. Mr. Dube shoots too.', mood: 'tense', beat: 3, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); cast(g, D, -8, -5038, ['dad', 'nia', 'mom', 'reyes', 'dube']); followAll(g, D, ['dad']); dadGun(g, D);
      place(D.nia, -10.4, -5036.4, PI / 2); place(D.mom, -10.6, -5038, PI / 2); place(D.dube, -9.6, -5033.6, PI / 2); place(D.reyes, -9.4, -5041.6, PI / 2);
      D.holdHint = 'Keep them off the porch. Mr. Dube, Dad and Dr. Reyes are shooting too.';
      squad(g, [[-3, -5000], [3, -5002], [0, -4996]], { hp: 100 }); D.ping = 9; D.wave = 0;
      g.say([['dube', "I've got a shotgun and a bad back. Let's see which gives out first."]]);
    },
    update(g, dt) { const D = g.stepData; dadTick(g, D, dt); allyTick(g, D, 'reyes', dt, { dmg: 30, cd: 1.4 }); allyTick(g, D, 'dube', dt, { dmg: 46, cd: 1.6, sound: 'shotgun' });
      D.ping -= dt; if (!D.held && D.ping <= 0) { D.ping = 12; const north = D.wave % 2 === 0; const pts = north ? [[-3, -4998], [3, -5000], [0, -4994]] : [[-3, -5076], [3, -5078], [0, -5082]];
        g.toast(north ? 'Scouts from the market end!' : 'Scouts from the south end!', 2); squad(g, pts, { hp: 100 + D.wave * 10 }); g.horde(3, north ? [[-10, -5000], [10, -5004]] : [[-10, -5070], [10, -5074]], { runner: true }); D.wave++;
        if (D.wave === 2) g.say([['nia', "Mr. Dube, you're really good at this."], ['dube', "Thirty years of raccoons."]]); }
      holdTick(g, D, dt, 45, 'Hold Mr. Dube\'s house', () => { D.clear = true; });
      if (D.clear && g.alive().length === 0) { if (!D.go) { D.go = true; goto(g, 'c17_end', 300); } } else if (D.clear && !D.mop) { D.mop = true; g.objective('Clear the street', 'Finish the last scouts.'); } } },

  { id: 'c17_end', ch: 17, cp: [-2, -5046, PI], obj: '', hint: '', mood: 'sad', beat: 0, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); cast(g, D, -2, -5046, ['dad', 'nia', 'mom', 'reyes', 'dube']); giveHammer(D.dad, false);
      place(g.player, -1.2, -5048, PI * .9); place(D.dad, .6, -5047, PI); place(D.nia, -2.6, -5047.6, PI * .8); place(D.mom, -3.4, -5046.4, PI * .8); place(D.reyes, 1.6, -5049.6, -PI / 2); place(D.dube, -3.4, -5052.4, 0);
      g.cut = { anim: 'Idle_Loop', cam: V(2, 1.7, -5053.6), look: V(-1.6, 1.35, -5049.4), flash: false }; snap(g);
      script(g, [
        (g) => { act(D.dube, 'hold', { sides: 'R', k: .6 }); },
        ['dube', "Truck's got half a tank. Somebody has to drive, and none of you know Mill Road in the dark."],
        ['dana', "Thank you, Mr. Dube."],
        ['dube', "Thank Walt. I'm just paying it forward."],
        (g) => { act(D.dube, null); g.audio.staticBurst && g.audio.staticBurst(1.1); cam(g, V(-4.4, 1.7, -5044.2), V(-1.2, 1.45, -5048)); },
        ['director', "Keem. Welcome home. You took the long way, but we always knew where home was."],
        ['marcus', "She knows your name."],
        ['keem', "Then she knows I'm not scared of her."],
        ['reyes', "Clinic first. If I can make it work, we put it on the air."],
        ['keem', "Cure first. Then the radio."],
        (g) => { setTimeout(() => g.onComplete && g.onComplete(17), 900); },
      ]);
    },
    update(g, dt) { tickMv(g, g.stepData, dt); } },
];

export const loot = [
  { id: 'c17a', kind: 'ammo', item: 'rifle', n: 60, pos: [-11, .25, -4998], at: 'c17_street' },
  { id: 'c17b', kind: 'med', pos: [11, .25, -5010], at: 'c17_street' },
  { id: 'c17c', kind: 'grenade', n: 2, pos: [-11, .25, -5022], at: 'c17_walt' },
  { id: 'c17d', kind: 'ammo', item: 'shell', n: 18, pos: [-11, .25, -5046], at: 'c17_scouts' },
  { id: 'c17e', kind: 'med', pos: [-6, .25, -5030], at: 'c17_scouts' },
  pg(12, -5060, 'Captain Riverside #26: "There\'s No Place Like Home"', 'c17_street'),
];
