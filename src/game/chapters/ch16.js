// Chapter 16 · Last Light Out — the Harborside Market roof. Danny spins up the helicopter, Reyes arrives with the last
// sample, the Harbor Authority comes up the only stairwell, Commander Harlow, take-off under fire, and a voice from home.
// World band z -4500..-4800.
import * as THREE from 'three';
import { PI, V, dist2, goto, afterBoss, clearThen, dadGun, dadTick, pg, rnd, $q } from './helpers.js';
import { walk, tickMv, cam, snap, script, cast, followAll, freeze, place, face, act, allyTick, holdTick, keepUp, ring, tickRings, squad, spawnAuth, paintAuth, shieldOn, helmOn, heli, rotorBlur, tracerLine, LOOK } from './ch15_kit.js';
import { buildRoofHelipad } from './kit/roof.js';
import { mats, prop, lamp } from './kit/common.js';

export const meta = { n: 16, title: 'Last Light Out', endQuote: '“It\'s still quiet here.”' };
export const speakers = { harlow: 'Commander Harlow' };
export const Z0 = -4500;
let R = null;

export function buildZone(ctx) {
  const K = mats(ctx), T = ctx.THREE;
  R = buildRoofHelipad(ctx, { x: 0, z: -4520, w: 60, d: 70 });
  // Boston skyline around the roof (lit windows, no names), harbor water to the east
  const winTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#10161c'; x.fillRect(0, 0, 64, 128); for (let i = 0; i < 8; i++) for (let j = 0; j < 16; j++) { const on = ((i * 7 + j * 13) % 5) === 0; x.fillStyle = on ? '#ffd890' : '#1c2630'; x.fillRect(i * 8 + 2, j * 8 + 2, 4, 5); } const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; return t; })();
  const B = (x, z, w, h, d) => { const t = winTex.clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, Math.round(Math.max(w, d) / 8)), Math.max(1, Math.round(h / 8))); const bM = new T.MeshStandardMaterial({ color: '#8a96a4', map: t, roughness: .8, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: .9 }); const m = new T.Mesh(new T.BoxGeometry(w, h, d), bM); m.position.set(x, h / 2 - 12, z); ctx.scene.add(m); };
  [[-70, -4500, 24, 60, 24], [-64, -4560, 18, 90, 20], [-72, -4620, 26, 46, 26], [-60, -4680, 20, 120, 18], [-58, -4740, 30, 70, 24], [70, -4470, 20, 50, 20], [0, -4660, 30, 80, 20], [-30, -4690, 22, 64, 22], [30, -4700, 20, 100, 20], [0, -4440, 40, 30, 20]].forEach(a => B(...a));
  const water = new T.Mesh(new T.PlaneGeometry(200, 500), new T.MeshStandardMaterial({ color: '#0e2430', roughness: .12, metalness: .5 })); water.rotation.x = -PI / 2; water.position.set(130, -12, -4600); ctx.scene.add(water);
  // roof below-edge: the street is far below, so a dark drop plane outside the parapet
  const drop = new T.Mesh(new T.PlaneGeometry(260, 420), new T.MeshStandardMaterial({ color: '#0a0d10', roughness: 1 })); drop.rotation.x = -PI / 2; drop.position.set(0, -12, -4600); ctx.scene.add(drop);
  // warm work lights on the helipad so the cutscenes read
  lamp(ctx, -8, R.pad[1] + 9, { y: 4, real: true, color: '#ffe0b0', intensity: 10, range: 26, size: [.5, .3, .5] });
  lamp(ctx, 8, R.pad[1] - 9, { y: 4, real: true, color: '#ffe0b0', intensity: 8, range: 22, size: [.5, .3, .5] });
  [[-8, R.pad[1] + 9], [8, R.pad[1] - 9]].forEach(([x, z]) => prop(ctx, .14, 4, .14, K.steelDark, x, 2, z));
  // fuel drums + tool cart next to the pad
  for (let i = 0; i < 4; i++) { const d = new T.Mesh(new T.CylinderGeometry(.42, .42, 1.1, 14), i % 2 ? K.blue : K.red); d.position.set(-14 + (i % 2) * .9, .55, R.pad[1] + 4 + (i >> 1) * .9); ctx.scene.add(d); }
  prop(ctx, 1.4, .9, .8, K.steelDark, 13, .45, R.pad[1] + 6, true);
}

// a soft cabin glow + a key light so the helicopter reads against the night sky
function heliLight(g, H) { const L = new THREE.PointLight('#ffe2b8', 18, 26, 1.6); L.position.set(3, 4, 4); H.g.add(L); const c = new THREE.PointLight('#9fd8ff', 6, 6, 2); c.position.set(0, 1.9, .6); H.g.add(c); }
// ---------- Harlow ----------
function harlowBoss(g, D) {
  const b = g.spawnZ(0, R.stairs[1] - 4, { boss: true, raider: true, hp: 4200, scale: 1.7, gun: 'shotgun', shirt: '#2a323a', runner: false });
  b.cd = 2; b.aggro = 99; b.speed = 1.5; g.boss = b; D.b = b; $q('#bossn').textContent = 'COMMANDER HARLOW — Harbor Authority';
  paintAuth(b, '#2a323a', '#1e2228'); shieldOn(b, true, '#9aa2aa'); helmOn(b, '#3a4048');
  // front shield: shots from the front are mostly stopped; flanks, back, visor, blades and blasts get through
  b.armor = (o) => { if (o.head || o.blade || o.boom || o.flame || o.sever) return 1; const P = g.player.root.position, p = b.root.position; const fx = Math.sin(b.root.rotation.y), fz = Math.cos(b.root.rotation.y); const dx = P.x - p.x, dz = P.z - p.z, d = Math.hypot(dx, dz) || 1; return (fx * dx + fz * dz) / d > .35 ? .28 : 1; };
  g.audio.roar && setTimeout(() => g.audio.roar(b), 700);
  return b;
}

export const steps = [
  { id: 'c16_roof', ch: 16, cp: [0, -4528, PI], obj: '', hint: '', mood: 'night', beat: 0, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); const pz = R.pad[1];
      D.h = heli(g, 0, pz, PI * .5); rotorBlur(D.h); D.h.spin(0);
      cast(g, D, 0, -4528, ['dad', 'nia', 'mom', 'tuck', 'danny']);
      place(g.player, 0, -4540, PI); place(D.dad, 1.8, -4539, PI); place(D.nia, -1.6, -4539.4, PI); place(D.mom, -2.6, -4538.4, PI);
      place(D.danny, 2.8, pz + 2.2, -PI * .7); place(D.tuck, -3.4, pz + 3.4, PI * .8);
      g.cut = { anim: 'Idle_Loop', cam: V(6.8, 2.4, pz + 10), look: V(0, 1.6, pz), flash: false }; snap(g);
      script(g, [
        (g) => { D.danny.play('Interact'); act(D.danny, 'reach', { sides: 'R', k: 1 }); },
        ['danny', "Battery in. Key in. Fuse in. Okay. Okay. Pre-flight check."],
        (g) => { D.h.spin(.8); g.audio.click && g.audio.click(); },
        ['danny', "Fuel: some. Rotor: yes. Courage: working on it."],
        (g) => { act(D.danny, null); D.reyes = g.npc('reyes', 'reyes', 0, -4529, PI, 'Jog_Fwd_Loop'); walk(D, D.reyes, -.6, -4543.5, { sp: 3.4, anim: 'Jog_Fwd_Loop', end: 'Idle_Talking_Loop', face: 0 }); cam(g, V(3.4, 1.7, -4546.5), V(0, 1.3, -4538)); },
        ['reyes', "Keem! Wait! Wait for me!"],
        ['keem', "Dr. Reyes? How did you get out?"],
        (g) => { act(D.reyes, 'cradle', { k: 1 }); },
        ['reyes', "Ada sent me down the back stairs with this. The last cooler. Your blood, Keem. The only copy left."],
        ['dana', "She kept one."],
        ['reyes', "She said, every single bite. She said you'd know what that means."],
        ['marcus', "What do we do with it?"],
        ['reyes', "Give me a real lab and a few hours, and maybe I can make something that brings people back."],
        (g) => { act(D.reyes, null); act(D.dad, 'reach', { sides: 'L', k: .5 }); D.dad.play('Idle_Talking_Loop'); cam(g, V(4.6, 1.6, -4541.6), V(1.8, 1.45, -4539.2)); },
        ['marcus', "People like me."],
        ['reyes', "People like you, Marcus."],
        (g) => { act(D.dad, null); g.audio.siren && g.audio.siren(.03, 4); g.shake(.2); cam(g, V(-3, 2.2, -4544), V(0, 2.2, -4528)); },
        ['harlow', "This is Commander Harlow, Harbor Authority. You are on a roof with one stairwell. Think about that."],
        ['danny', "She needs about a minute to spin up. Can you give me a minute?"],
        ['keem', "We'll give you a minute. Just fly straight when it's time."],
        (g) => { g.cut = null; goto(g, 'c16_hold', 120); },
      ]);
    },
    update(g, dt) { const D = g.stepData; tickMv(g, D, dt); if (D.h) D.h.tick(dt); } },

  { id: 'c16_hold', ch: 16, cp: [0, -4544, PI], obj: 'Hold the roof', hint: 'They come up the stairwell and over the side ladders. Mom can smell them coming.', mood: 'tense', beat: 3, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); const pz = R.pad[1];
      D.h = heli(g, 0, pz, PI * .5); rotorBlur(D.h); D.h.spin(1.5);
      cast(g, D, 0, -4544, ['dad', 'nia', 'mom', 'reyes', 'tuck', 'danny']); followAll(g, D, ['dad', 'mom']); dadGun(g, D);
      place(D.danny, 1.6, pz + 1.6, -PI * .6); D.danny.play('Interact'); place(D.tuck, -2.6, pz - 2, PI); place(D.nia, -1.4, pz + 3.2, 0); place(D.reyes, -3, pz + 2.6, .4); act(D.reyes, 'cradle', { k: 1 });
      D.holdHint = 'Keep them off the helicopter. Dad and Reyes are shooting too.';
      squad(g, [[-4, -4530], [4, -4530], [0, -4534]]);
      D.wave = 0; D.ping = 6;
      g.say([['dana', "Three on the stairs. More behind them. I can smell them."], ['marcus', "Remind me never to ask how."]]);
    },
    update(g, dt) { const D = g.stepData, pz = R.pad[1]; dadTick(g, D, dt); allyTick(g, D, 'reyes', dt, { dmg: 30, cd: 1.3 }); tickRings(g, D, dt);
      if (D.h) { D.h.tick(dt); const k = Math.min(1, (D.ht || 0) / 60); D.h.spin(1.5 + k * 22); if (D.h.blur) D.h.blur.material.opacity = k * .35; g.audio.engine && g.audio.engine(true, .3 + k * .7); }
      D.ping -= dt; if (D.ping <= 0) { D.ping = 11; const side = ['west ladder', 'east ladder', 'stairs'][D.wave % 3]; const pts = side === 'stairs' ? [[-3, -4530], [3, -4530], [0, -4533]] : side === 'west ladder' ? [[-27, -4550], [-27, -4566], [-26, -4580]] : [[27, -4552], [27, -4568], [26, -4584]];
        g.toast('Mom: they\'re coming up the ' + side + '!', 2.2); g.floatText && g.floatText('!', '#ff80c0'); squad(g, pts, { hp: 100 + D.wave * 10 }); if (D.wave % 2) g.horde(3, pts, { runner: true }); D.wave++;
        if (D.wave === 3) g.say([['danny', "Rotor's at half! Keep going!"]]); if (D.wave === 5) g.say([['tuck', "I'm going to be sick. Not now. Later."]]); }
      holdTick(g, D, dt, 60, 'Hold the roof', () => { g.toast('Rotor at full power', 2); D.clear = true; });
      if (D.clear && g.alive().length === 0) { if (!D.go) { D.go = true; goto(g, 'c16_harlow', 260); } } else if (D.clear && !D.mop) { D.mop = true; g.objective('Clear the roof', 'Finish the last troopers.'); } } },

  { id: 'c16_harlow', ch: 16, cp: [0, -4548, PI], obj: 'Stop Commander Harlow', hint: 'His shield blocks shots from the front. Get around him, aim for the visor, or use grenades. Roll out of the yellow rings.', mood: 'tense', beat: 3, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); const pz = R.pad[1];
      D.h = heli(g, 0, pz, PI * .5); rotorBlur(D.h); D.h.spin(24); D.h.blur.material.opacity = .35;
      cast(g, D, 0, -4548, ['dad', 'nia', 'mom', 'reyes', 'danny', 'tuck']); followAll(g, D, ['dad']); dadGun(g, D);
      place(D.danny, 1.4, pz + 1.4, -PI * .6); D.danny.play('Interact'); place(D.tuck, -2.2, pz - 1.8, PI); place(D.nia, -1.2, pz + 2.8, 0); place(D.mom, -2.2, pz + 3.4, .2); place(D.reyes, -3.2, pz + 2.2, .4);
      const b = harlowBoss(g, D); D.cd = 4; D.sq = 14;
      g.say([['harlow', "Boy. Walk to me and nobody else gets hurt."], ['keem', "That's what the last guy said."], ['harlow', "Then we do this the long way."]]);
    },
    update(g, dt) { const D = g.stepData, b = D.b; dadTick(g, D, dt); allyTick(g, D, 'reyes', dt, { dmg: 26, cd: 1.5 }); tickRings(g, D, dt); if (D.h) D.h.tick(dt);
      if (!b || b.dead) { if (b && b.dead && !D.won) { D.won = true; D.rings && D.rings.forEach(r => g.scene.remove(r.m)); D.rings = []; afterBoss(g, () => goto(g, 'c16_takeoff', 400)); } return; }
      D.cd -= dt; if (D.cd <= 0 && !g.cut) { D.cd = b.hp < b.maxHp * .5 ? 3.6 : 5; const P = g.player.root.position; g.toast('Flashbang — roll!', 1.1); ring(g, D, P.x, P.z, { r: 2.4, life: 1.3, color: '#ffd040', dmg: 18 }); if (b.hp < b.maxHp * .5) ring(g, D, P.x + rnd(-4, 4), P.z + rnd(-4, 4), { r: 2.2, life: 1.6, color: '#ffd040', dmg: 14 }); }
      D.sq -= dt; if (D.sq <= 0) { D.sq = 18; squad(g, [[-3, -4530], [3, -4530]], { hp: 90 }); }
      // his own volunteer gets loose and goes for him once he's hurt
      if (!D.vol && b.hp < b.maxHp * .4) { D.vol = g.spawnZ(0, R.stairs[1] - 1, { runner: true, hp: 600 }); D.vol.ally = true; D.vol.st = 'script'; D.vol.play && D.vol.play('Sprint_Loop'); g.say([['harlow', "Who opened the cages? Get it off me!"], ['keem', "Guess they don't like you either."]]); }
      if (D.vol && !D.vol.dead) { const q = D.vol.root.position, p = b.root.position, dx = p.x - q.x, dz = p.z - q.z, d = Math.hypot(dx, dz); if (d > 1.2) { const s = Math.min(d, 6 * dt); q.x += dx / d * s; q.z += dz / d * s; D.vol.root.rotation.y = Math.atan2(dx, dz); D.vol.play('Sprint_Loop'); } else { D.vol.play('Punch_Cross'); D.vbt = (D.vbt || 0) - dt; if (D.vbt <= 0) { D.vbt = .8; g.damageZ(b, 60, new THREE.Vector3(dx, 0, dz).normalize(), { ai: true, blade: true }); } } }
    } },

  { id: 'c16_takeoff', ch: 16, cp: [0, -4556, PI], obj: '', hint: '', mood: 'tense', beat: 2, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); const pz = R.pad[1];
      D.h = heli(g, 0, pz, PI * .5); rotorBlur(D.h); D.h.spin(26); D.h.blur.material.opacity = .35; heliLight(g, D.h); g.audio.engine && g.audio.engine(true, 1);
      cast(g, D, 0, -4556, ['dad', 'nia', 'mom', 'reyes', 'tuck', 'danny']);
      place(g.player, -1.5, pz + 8, PI); place(D.dad, 1, pz + 8.6, PI); place(D.nia, -3, pz + 8.8, PI); place(D.mom, -3.8, pz + 9.6, PI); place(D.reyes, 2.4, pz + 9.4, PI); place(D.tuck, 3.6, pz + 7.6, PI); place(D.danny, 0, pz + 2.6, 0);
      g.cut = { anim: 'Idle_Loop', cam: V(9, 2.2, pz + 12), look: V(0, 1.6, pz + 2), flash: false }; snap(g);
      const board = () => { [g.player, D.dad, D.nia, D.mom, D.reyes, D.tuck, D.danny].forEach((c, i) => walk(D, c, -1.4 + (i % 3) * 1.4, pz + .6 - (i / 3 | 0) * 1.1, { sp: 3.4, anim: 'Jog_Fwd_Loop', end: 'Idle_Loop', cb: () => { c.root.visible = false; } })); };
      script(g, [
        (g) => { D.danny.play('Idle_Talking_Loop'); act(D.danny, 'wave', { sides: 'R', k: 1 }); },
        ['danny', "Everybody in! Seatbelts! The rabbit too!"],
        ['nia', "Biscuit doesn't have a seatbelt!"],
        ['danny', "Then hold him really, really tight!"],
        (g) => { act(D.danny, null); board(); cam(g, V(12, 3.4, pz + 14), V(0, 2, pz)); },
        (g) => { D.lift = 0.001; g.shake(.3); cam(g, V(18, 4, pz + 20), V(0, 4, pz)); },
        ['danny', "We're up! We're up! Okay, nobody look down. I'm looking down. Why did I look down?"],
        (g) => { D.tracers = true; },
        ['tuck', "Danny, they're shooting at us!"],
        ['danny', "I know! I'm flying very straight and very fast!"],
        (g) => { D.away = true; setTimeout(() => { if (g.stepData === D) goto(g, 'c16_end', 120); }, 2600); },
      ]);
    },
    update(g, dt) { const D = g.stepData; tickMv(g, D, dt); if (!D.h) return; D.h.tick(dt);
      if (D.lift) { D.lift += dt; const G = D.h.g; G.position.y = Math.min(16, D.lift * D.lift * 1.6); G.rotation.z = Math.sin(D.lift * 1.3) * .05; if (D.away) { G.position.x += dt * 14; G.position.z -= dt * 10; G.rotation.x = .18; } if (g.cut) g.cut.look = G.position.clone().add(V(0, 1.6, 0)); }
      if (D.tracers && Math.random() < dt * 6) { const p = D.h.g.position; g.audio.shot && g.audio.shot(Math.random() < .5 ? 'rifle' : 'smg'); tracerLine(g, V(rnd(-10, 10), 1.4, -4532), V(p.x + rnd(-3, 3), p.y + rnd(0, 3), p.z + rnd(-3, 3))); }
    } },

  { id: 'c16_end', ch: 16, cp: [0, -4600, PI], obj: '', hint: '', mood: 'sad', beat: 0, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true);
      // in flight over the harbor: the helicopter hangs high over the water with the city behind
      D.h = heli(g, 30, -4640, PI * .3); rotorBlur(D.h); D.h.spin(26); D.h.blur.material.opacity = .35; D.h.g.position.y = 18; heliLight(g, D.h);
      g.player.root.position.set(0, 0, -4600); g.player.model.visible = false;
      g.cut = { anim: 'Idle_Loop', cam: V(22.5, 20.2, -4632.5), look: V(30, 19.4, -4641), flash: false, noFace: true }; snap(g);
      g.audio.engine && g.audio.engine(true, .8);
      script(g, [
        ['danny', "Fuel's low. Wherever we're going, it has to be close."],
        ['dana', "Marcus. Your hand."],
        ['marcus', "It's fine. It's just cold up here. It's fine."],
        (g) => { g.audio.staticBurst && g.audio.staticBurst(1.2); cam(g, V(36.5, 19.6, -4635.5), V(30, 19.4, -4641.5)); },
        ['dube', "Anybody? This is Dube. Riverside, Maine. If anybody can hear me…"],
        ['keem', "That's Mr. Dube. That's our street."],
        ['dube', "Keem? Is that you, son? I'm in my basement. It's… it's still quiet here."],
        ['marcus', "Danny. Can this thing make it to Maine?"],
        ['danny', "Barely. Very barely. Yes."],
        ['keem', "Then take us home."],
        (g) => { D.away = true; setTimeout(() => { g.player.model.visible = true; g.onComplete && g.onComplete(16); }, 2200); },
      ]);
    },
    update(g, dt) { const D = g.stepData; if (!D.h) return; D.h.tick(dt); const G = D.h.g; G.position.y = 18 + Math.sin(g.t * 1.2) * .25; if (D.away) { G.position.x += dt * 8; G.position.z -= dt * 16; } } },
];

export const loot = [
  { id: 'c16a', kind: 'ammo', item: 'rifle', n: 60, pos: [-14, .25, -4548], at: 'c16_hold' },
  { id: 'c16b', kind: 'med', pos: [14, .25, -4552], at: 'c16_hold' },
  { id: 'c16c', kind: 'grenade', n: 3, pos: [-10, .25, -4566], at: 'c16_hold' },
  { id: 'c16d', kind: 'ammo', item: 'shell', n: 18, pos: [12, .25, -4580], at: 'c16_harlow' },
  { id: 'c16e', kind: 'med', pos: [-12, .25, -4584], at: 'c16_harlow' },
  pg(-22, -4584, 'Captain Riverside #25: "Last Chopper Out of Town"', 'c16_hold'),
];
