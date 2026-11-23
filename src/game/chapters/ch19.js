// Chapter 19 · Dead Air — Signal Hill. Dube drives the family up the ridge to the old radio station. Three Authority jammers,
// Nia reads the cure recipe on the air, the Director names the bridge at dawn, and Subject Hush. World band z -5800..-6100.
import * as THREE from 'three';
import { PI, V, dist2, goto, afterBoss, clearThen, dadGun, dadTick, boss, pg, rnd, $q } from './helpers.js';
import { walk, tickMv, cam, snap, script, cast, followAll, place, face, act, allyTick, holdTick, keepUp, ring, tickRings, squad, dawn } from './ch15_kit.js';
import { mats, floor, prop, lamp, wallX, wallZ, table, crate } from './kit/common.js';
import { tree, street, streetLamp, radioTower, pickup } from './kit/town.js';
import { hammerTick, jammer } from './kit/finale.js';
import { giveHammer } from '../hands.js';

export const meta = { n: 19, title: 'Dead Air', endQuote: '“Biscuit too.”' };
export const speakers = { director: 'The Director' };
export const Z0 = -5810;
const S = { x0: -12, x1: 12, zf: -5992, zb: -6030, H: 4 };
let A = null;

export function buildZone(ctx) {
  const K = mats(ctx), T = ctx.THREE; A = { jam: [] };
  // ridge road up from Mill Road, Dube's pickup parked where the asphalt ends
  street(ctx, 0, -5790, -5884, 10); pickup(ctx, -3.6, -5812, .08, '#7a3a22');
  for (let i = 0; i < 12; i++) tree(ctx, (i % 2 ? 1 : -1) * (10 + (i * 5) % 11), -5796 - i * 7, 1.25, i % 3 ? '#24402a' : '#2e4a30');
  [[-9, -5830, 1.6], [10, -5846, 1.2], [-11, -5862, 1.1]].forEach(([x, z, s]) => { const r = new T.Mesh(new T.DodecahedronGeometry(s, 0), new T.MeshStandardMaterial({ color: '#6a6a64', roughness: 1 })); r.position.set(x, s * .5, z); ctx.scene.add(r); });
  streetLamp(ctx, 6.6, -5850, true);
  // the compound: gravel yard, chain-link fence with a gate
  floor(ctx, 0, -5972, 60, 176, new T.MeshStandardMaterial({ color: '#5a5650', roughness: 1 }), .02);
  const fence = new T.MeshStandardMaterial({ color: '#9aa0a4', metalness: .5, roughness: .5, wireframe: true });
  wallX(ctx, -30, 30, -5884, 2.6, fence, [{ c: 0, w: 6 }], .2); wallZ(ctx, -5884, -6060, -30, 2.6, fence, [], .2); wallZ(ctx, -5884, -6060, 30, 2.6, fence, [], .2); wallX(ctx, -30, 30, -6060, 2.6, fence, [], .2);
  [-3.2, 3.2].forEach(x => prop(ctx, .3, 3, .3, K.steelDark, x, 1.5, -5884, true));
  ctx.sign(['SIGNAL HILL', 'RIVERSIDE COMMUNITY RADIO · 1040 AM'], 0, 3.6, -5883.6, 0, 6, 1.2, '#3a2a2a');
  // three Authority jammers in the yard
  [[-20, -5912], [21, -5936], [-19, -5968]].forEach(([x, z]) => A.jam.push(jammer(ctx, x, z)));
  [[-6, -5905], [8, -5920], [-10, -5950], [12, -5960], [4, -5976]].forEach(([x, z], i) => crate(ctx, x, z, 1.1 + (i % 2) * .3, null, i * .4));
  ctx.car(16, -5900, PI * .55, '#e8e8ea'); ctx.car(-14, -5940, -PI * .4, '#e8e8ea');
  // the station: one long room — lobby, the booth with the mic desk, transmitter racks
  const wallM = new T.MeshStandardMaterial({ color: '#c8b8a0', roughness: .85 }), inM = new T.MeshStandardMaterial({ color: '#e0d8c8', roughness: .8 }), acou = new T.MeshStandardMaterial({ color: '#4a4a58', roughness: 1 });
  const { x0, x1, zf, zb, H } = S;
  { const fl = floor(ctx, 0, (zf + zb) / 2, x1 - x0, zf - zb, new T.MeshStandardMaterial({ color: '#8a7a6a', roughness: .8, emissive: '#1a1410' }), .03); fl.receiveShadow = false; }
  wallX(ctx, x0, x1, zf, H, wallM, [{ c: 0, w: 3 }]); wallX(ctx, x0, x1, zb, H, wallM); wallZ(ctx, zf, zb, x0, H, wallM); wallZ(ctx, zf, zb, x1, H, wallM);
  ctx.wallBox(x1 - x0 + .6, .3, zf - zb + .6, new T.MeshStandardMaterial({ color: '#bfb6a8', roughness: .9 }), 0, H + .15, (zf + zb) / 2, false);
  ctx.sign(['ON AIR'], 0, H + .6, zf + .25, 0, 2.4, .7, '#6a1a1a');
  wallX(ctx, x0, x1, -6012, H, inM, [{ c: -6, w: 2.4 }]); // booth wall with a door; big window over the desk
  { const gl = new T.Mesh(new T.PlaneGeometry(6, 1.4), new T.MeshStandardMaterial({ color: '#203038', transparent: true, opacity: .35, roughness: .1 })); gl.position.set(3, 1.9, -6011.7); ctx.scene.add(gl); }
  for (let i = 0; i < 5; i++) prop(ctx, .05, 2.4, 1.6, acou, x1 - .25, 1.8, -6015 - i * 3); // foam panels
  table(ctx, 0, -6022, { w: 3.6, d: 1.1, h: .82, mat: K.woodDark }); prop(ctx, 3, .14, .7, K.black, 0, .96, -6022.1); // mixing board
  { const red = new T.MeshStandardMaterial({ color: '#300', emissive: '#ff2020', emissiveIntensity: 0 }); A.onAir = red; prop(ctx, .6, .25, .1, red, 0, 2.6, -6029.7); }
  { const mic = new T.Mesh(new T.CylinderGeometry(.05, .07, .22, 10), K.black); mic.position.set(0, 1.3, -6021.6); mic.rotation.x = -.5; ctx.scene.add(mic); prop(ctx, .04, .45, .04, K.steelDark, 0, 1.1, -6021.8); }
  for (let i = 0; i < 4; i++) { prop(ctx, 1.1, 2.4, .8, K.steelDark, -10.5, 1.2, -5996 - i * 1.4, true); prop(ctx, .9, .1, .05, new T.MeshStandardMaterial({ color: '#030', emissive: '#40ff60', emissiveIntensity: 1.6 }), -10.08, 1.6 + (i % 2) * .4, -5996 - i * 1.4); }
  prop(ctx, 3, .9, 1, K.wood, 6, .45, -5998, true); for (let i = 0; i < 3; i++) prop(ctx, .8, .5, .8, K.fabric, -2 + i * 1.6, .25, -5996, true);
  A.lampMat = new T.MeshStandardMaterial({ color: '#222', emissive: '#fff0d8', emissiveIntensity: 2 });
  [[-6, -5998], [6, -5998], [0, -6006], [0, -6020], [-7, -6024]].forEach(([x, z], i) => lamp(ctx, x, z, { y: H - .05, mat: A.lampMat, real: i === 1 || i === 3, color: '#fff0d8', intensity: 8, range: 16, size: [1.4, .08, .5] }));
  radioTower(ctx, 20, -6046, 50, 0); prop(ctx, 4, 2.4, 3, K.concrete, 20, 1.2, -6046, true);
  // the view south: the ridge drops away toward the river and the bridge (Chapter 20)
  for (let i = 0; i < 6; i++) tree(ctx, -26 + i * 10, -6070 - (i % 2) * 6, 1.4, '#22382a');
}
function onAir(on) { if (A && A.onAir) A.onAir.emissiveIntensity = on ? 3 : 0; }

// ---------- Subject Hush ----------
function hushBoss(g, D) { const b = boss(g, 0, -5938, 3400, '#d4d8dc', 'SUBJECT HUSH — Harbor Authority test subject'); b.scale = 1.65; b.speed = 1.7; D.b = b; const u = b.mat && b.mat.userData && b.mat.userData.u; if (u && u.uPants) u.uPants.value.set('#c8ccd0');
  b.armor = () => (D.hid ? 0 : 1); return b; }
function hushTick(g, D, dt) { const b = D.b; if (!b || b.dead || g.cut) return; D.qt -= dt;
  if (!D.hid && D.qt <= 0) { D.hid = true; D.qt = 2.1; b.root.visible = false; b.st = 'script'; g.toast('It went quiet. Watch the ground.', 1.6); const P = g.player.root.position; D.hx = P.x; D.hz = P.z; ring(g, D, P.x, P.z, { r: 2.4, life: 1.9, color: '#e8f0ff', dmg: 26 }); }
  else if (D.hid && D.qt <= 0) { D.hid = false; D.qt = b.hp < b.maxHp * .5 ? 5.2 : 7; b.root.position.set(D.hx + rnd(-1.2, 1.2), 0, D.hz + rnd(-1.2, 1.2)); b.root.visible = true; b.st = 'chase'; g.shake(.35); g.audio.roar && g.audio.roar(b); } }

const ALL = ['dad', 'nia', 'mom', 'reyes', 'dube'];
export const steps = [
  { id: 'c19_ridge', ch: 19, cp: [0, -5814, PI], obj: '', hint: '', mood: 'tense', beat: 0, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); onAir(false); cast(g, D, 0, -5814, ALL); giveHammer(D.dad, false);
      place(g.player, -.6, -5818, PI); place(D.dad, 1.4, -5817, PI); place(D.nia, -2.2, -5817.4, PI); place(D.mom, -3.2, -5816.2, PI); place(D.reyes, 2.8, -5819.2, -PI * .6); place(D.dube, -4.8, -5814.6, PI * .9);
      g.cut = { anim: 'Idle_Loop', cam: V(1.8, 1.7, -5824.2), look: V(-.6, 1.4, -5817), flash: false }; snap(g);
      script(g, [
        ['dube', "End of the road. Station's up past the fence."],
        ['reyes', "I wrote it all down. Every step. Anyone with a fridge and a centrifuge can make it."],
        (g) => { cam(g, V(-3.6, 1.2, -5820.6), V(-2.2, 1.05, -5817.4)); face(D.nia, D.mom.root.position.x, D.mom.root.position.z); },
        ['nia', "Can I be the one who reads it? People listen to kids."],
        ['dana', "Baby…"],
        (g) => { act(D.dad, 'hold', { sides: 'R', k: .7 }); cam(g, V(3.6, 1.7, -5822), V(1.2, 1.45, -5817)); },
        ['marcus', "Let her. She's earned it."],
        ['keem', "Jammers first. Nobody hears anything while those are up."],
        ['dube', "Three of them. Red lights. The Authority put them up the week it started."],
        (g) => { act(D.dad, null); g.cut = null; followAll(g, D, ALL); g.wpTarget = [0, 1.2, -5880]; g.objective('Get to the station gate', 'Up the ridge road.');
          g.horde(8, [[-4, -5840], [5, -5846], [-7, -5856], [3, -5862], [8, -5870], [-2, -5872]]); squad(g, [[-3, -5878], [3, -5878]], { hp: 90 }); D.on = true; },
      ]);
    },
    update(g, dt) { const D = g.stepData; tickMv(g, D, dt); if (!D.on) return; hammerTick(g, D, dt); allyTick(g, D, 'reyes', dt, { dmg: 28, cd: 1.5 }); allyTick(g, D, 'dube', dt, { dmg: 44, cd: 1.8, sound: 'shotgun' });
      D.t = (D.t || 0) + dt; if (D.t > 4 && g.alive().length === 0) clearThen(g, D, 'c19_gate', 220, 'Go through the gate'); } },

  { id: 'c19_gate', ch: 19, cp: [0, -5880, PI], obj: 'Shut down the jammers (0/3)', hint: 'Red blinking masts in the yard. Get close and pull the plug.', mood: 'tense', beat: 2, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); cast(g, D, 0, -5880, ALL); followAll(g, D, ['dad', 'reyes', 'dube']); giveHammer(D.dad, false);
      place(D.nia, -1.2, -5878, PI); place(D.mom, -2.4, -5877, PI); D.n = 0;
      const refresh = () => { D.uses = A.jam.filter(j => j.alive).map(j => ({ x: j.x, z: j.z + 1.6, r: 2.3, label: 'Pull the plug', fn: () => cut(j) })); const nx = A.jam.find(j => j.alive); g.wpTarget = nx ? [nx.x, 1.4, nx.z + 1.6] : null; };
      const cut = (j) => { if (!j.alive) return; j.kill(); D.n++; g.audio.click && g.audio.click(); g.shake(.2); g.toast('Jammer down ' + D.n + '/3', 1.6); g.objective('Shut down the jammers (' + D.n + '/3)', D.n < 3 ? 'Next red mast.' : 'The air is clear.'); refresh();
        if (D.n === 1) { squad(g, [[-8, -5944], [8, -5948], [0, -5952]], { hp: 90 }); g.say([['dube', "Here they come. They know what that light means."]]); }
        if (D.n === 2) { g.horde(7, [[-26, -5890], [26, -5900], [-24, -5990], [24, -5980]], { runner: true }); g.say([['nia', "The radio's crackling. I can hear people!"]]); }
        if (D.n === 3) { D.won = true; g.say([['keem', "That's the last one. The air's clear."], ['reyes', "Booth. Now. Before they put another one up."]], () => { D.go2 = true; }); } };
      refresh(); g.horde(6, [[-12, -5900], [12, -5906], [-16, -5924], [16, -5930], [0, -5940]]);
      g.say([['marcus', "I've got the ones up close. You get those lights."]]);
    },
    update(g, dt) { const D = g.stepData; hammerTick(g, D, dt); allyTick(g, D, 'reyes', dt, { dmg: 28, cd: 1.5 }); allyTick(g, D, 'dube', dt, { dmg: 44, cd: 1.8, sound: 'shotgun' });
      if (!D.won) keepUp(g, D, dt, 3, () => g.horde(3, [[-26, -5896], [26, -5920], [0, -5958]]), 3);
      if (D.go2 && g.alive().length === 0) clearThen(g, D, 'c19_booth', 300, 'Get into the station'); } },

  { id: 'c19_booth', ch: 19, cp: [0, -6000, PI], obj: '', hint: '', mood: 'sad', beat: 0, light: 'ward', rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); cast(g, D, 0, -6014, ALL); giveHammer(D.dad, false); onAir(false);
      place(D.nia, 0, -6020.7, PI); place(D.reyes, 1.6, -6020.2, PI * .8); place(g.player, -1.8, -6018.6, PI * .85); place(D.dad, -3, -6017.6, PI * .8); place(D.mom, 2.8, -6018.4, -PI * .8); place(D.dube, 4, -6016.6, -PI * .75);
      g.cut = { anim: 'Idle_Loop', cam: V(.9, 1.35, -6024.4), look: V(0, 1.0, -6020.4), flash: false }; snap(g);
      script(g, [
        ['reyes', "Red light means you're on. Just read it like a story."],
        (g) => { onAir(true); g.audio.click && g.audio.click(); cam(g, V(.5, 1.05, -6023.6), V(0, .95, -6020.6)); },
        ['nia', "Hi. My name is Nia. I'm in Riverside, Maine. My brother Keem can't turn, and Dr. Reyes made a cure from his blood."],
        ['nia', "It works. It worked on my dad. So here's how you make it. Step one…"],
        (g) => { cam(g, V(-.4, 1.7, -6023.2), V(-2.4, 1.4, -6018)); },
        ['marcus', "Listen to her. Steady as a rock."],
        (g) => { g.audio.staticBurst && g.audio.staticBurst(1); },
        ['radio', "…this is Bar Harbor… we hear you, Riverside… say again step four…"],
        (g) => { cam(g, V(.5, 1.05, -6023.6), V(0, .95, -6020.6)); },
        ['nia', "Step four. Spin it for ninety seconds. Not eighty-nine."],
        (g) => { g.audio.staticBurst && g.audio.staticBurst(1.3); g.shake(.15); cam(g, V(3.4, 1.7, -6023.6), V(0, 1.2, -6019.4)); },
        ['director', "Very touching. Now listen to me, little girl. Put your brother on."],
        (g) => { walk(D, g.player, -.6, -6020.6, { sp: 1.2, face: PI }); cam(g, V(-.2, 1.5, -6024.4), V(-.6, 1.4, -6020.4)); },
        ['keem', "I'm here."],
        ['director', "The Riverside bridge. Dawn. You walk across alone, and the jets turn around. You don't, and they don't."],
        ['dana', "Keem, no."],
        ['keem', "She doesn't get to scare us anymore."],
        ['director', "Before you go. I left you something in the yard. We called it Subject Hush."],
        (g) => { g.shake(.4); cam(g, V(2, 2.2, -6004), V(0, 1.4, -5990)); },
        ['dube', "That's not a zombie noise. That's no noise at all."],
        (g) => { g.cut = null; goto(g, 'c19_hush', 160); },
      ]);
    },
    update(g, dt) { tickMv(g, g.stepData, dt); } },

  { id: 'c19_hush', ch: 19, cp: [0, -5968, PI], obj: 'Stop Subject Hush', hint: 'When it goes quiet it vanishes. A white ring shows where it will land — roll out of it, then hit it while it is out in the open.', mood: 'tense', beat: 3, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); cast(g, D, 0, -5980, ['dad', 'reyes', 'dube']); giveHammer(D.dad, false); onAir(true);
      place(D.reyes, -3, -5986, PI); place(D.dube, 3, -5986, PI); place(D.dad, 1.6, -5970, PI);
      const b = hushBoss(g, D); b.st = 'script'; b.root.rotation.y = 0; D.qt = 6;
      g.cut = { anim: 'Idle_Loop', cam: V(-2.4, 1.7, -5973.4), look: V(0, 1.9, -5940), flash: false }; snap(g);
      script(g, [
        ['marcus', "Stay off its line, Keem. I'll go low."],
        ['keem', "No sound. No warning. Great."],
        (g) => { g.cut = null; b.st = 'chase'; D.on = true; },
      ]);
    },
    update(g, dt) { const D = g.stepData, b = D.b; tickRings(g, D, dt); if (!D.on) return; hammerTick(g, D, dt, { dmg: 60 }); allyTick(g, D, 'reyes', dt, { dmg: 24, cd: 1.6 }); allyTick(g, D, 'dube', dt, { dmg: 40, cd: 1.9, sound: 'shotgun' });
      if (!b || b.dead) { if (b && b.dead && !D.won) { D.won = true; b.root.visible = true; D.rings && D.rings.forEach(r => g.scene.remove(r.m)); D.rings = []; g.say([['dube', "It never made a sound. Not even at the end."]]); afterBoss(g, () => goto(g, 'c19_hold', 320)); } return; }
      hushTick(g, D, dt);
      if (!D.half && b.hp < b.maxHp * .5) { D.half = true; g.toast('More coming over the fence', 2); g.horde(6, [[-28, -5900], [28, -5910], [0, -5888]], { runner: true }); g.say([['reyes', "It's faster now. Watch the ground!"]]); } } },

  { id: 'c19_hold', ch: 19, cp: [0, -5994, PI], obj: 'Keep the signal on the air', hint: 'Forty-five seconds while the recipe repeats. Keep them away from the station door.', mood: 'tense', beat: 3, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); cast(g, D, 0, -5990, ['dad', 'reyes', 'dube']); giveHammer(D.dad, false); onAir(true);
      place(D.reyes, -3, -5990, PI); place(D.dube, 3, -5990, PI); place(D.dad, 0, -5984, PI); D.ping = 2; D.wave = 0;
      D.holdHint = 'The recipe is on a loop. Every second it plays, another town writes it down.';
      g.say([['reyes', "It's on a loop now. Every second it plays, another town writes it down."], ['marcus', "Then we buy it some seconds."]]);
    },
    update(g, dt) { const D = g.stepData; hammerTick(g, D, dt); allyTick(g, D, 'reyes', dt, { dmg: 28, cd: 1.5 }); allyTick(g, D, 'dube', dt, { dmg: 44, cd: 1.8, sound: 'shotgun' });
      D.ping -= dt; if (!D.held && D.ping <= 0) { D.ping = 9; const k = D.wave % 3; const pts = k === 0 ? [[0, -5888], [-6, -5890], [6, -5890]] : k === 1 ? [[-28, -5940], [-28, -5960]] : [[28, -5950], [28, -5970]];
        g.toast(['The gate!', 'West fence!', 'East fence!'][k], 1.6); g.horde(k === 0 ? 7 : 5, pts, { runner: D.wave > 1 }); if (D.wave === 2) squad(g, [[-4, -5890], [4, -5890]], { hp: 90 }); D.wave++;
        if (D.wave === 2) { g.audio.staticBurst && g.audio.staticBurst(.8); g.say([['radio', "…Portland here. We've got power. We're making it now. Thank you, Nia…"]]); }
        if (D.wave === 4) g.say([['nia', "They're making it! Keem, they're making it!"]]); }
      holdTick(g, D, dt, 45, 'Keep the signal on the air', () => { D.clear = true; });
      if (D.clear && g.alive().length === 0) { if (!D.go) { D.go = true; goto(g, 'c19_end', 300); } } else if (D.clear && !D.mop) { D.mop = true; g.objective('Clear the yard', 'Finish the last ones.'); } } },

  { id: 'c19_end', ch: 19, cp: [0, -6050, PI], obj: '', hint: '', mood: 'sad', beat: 0, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); cast(g, D, 0, -6050, ALL); giveHammer(D.dad, false); dawn(g, .35); D.dw = .35;
      place(g.player, -.4, -6054, PI); place(D.dad, 1.4, -6053.4, PI); place(D.nia, -1.8, -6053.8, PI); place(D.mom, -3, -6053, PI); place(D.reyes, 2.8, -6052.4, PI); place(D.dube, 4.2, -6051, PI * .9);
      g.cut = { anim: 'Idle_Loop', cam: V(-1.4, 2.1, -6045.4), look: V(1, 1.2, -6080), flash: false }; snap(g);
      script(g, [
        ['dube', "There. The bridge. You can see the Authority trucks from here."],
        (g) => { cam(g, V(1.2, 1.6, -6059.4), V(-.2, 1.45, -6053.6)); face(g.player, 0, -6060); face(D.dad, -.4, -6054); },
        ['marcus', "You're not walking across that bridge alone."],
        ['keem', "I know. She said alone. She didn't say we had to play fair."],
        (g) => { cam(g, V(-2.6, 1.3, -6059), V(-2.2, 1.05, -6053.6)); },
        ['dana', "Then we all go. Together. Like always."],
        ['nia', "Biscuit too."],
        ['keem', "Biscuit too."],
        (g) => { setTimeout(() => g.onComplete && g.onComplete(19), 900); },
      ]);
    },
    update(g, dt) { const D = g.stepData; tickMv(g, D, dt); D.dw = Math.min(.6, (D.dw || .35) + dt * .01); dawn(g, D.dw); } },
];

export const loot = [
  { id: 'c19a', kind: 'ammo', item: 'rifle', n: 60, pos: [8, .25, -5830], at: 'c19_ridge' },
  { id: 'c19b', kind: 'med', pos: [-8, .25, -5870], at: 'c19_ridge' },
  { id: 'c19c', kind: 'grenade', n: 3, pos: [14, .25, -5912], at: 'c19_gate' },
  { id: 'c19d', kind: 'ammo', item: 'shell', n: 18, pos: [-14, .25, -5958], at: 'c19_hush' },
  { id: 'c19e', kind: 'med', pos: [10, .25, -5976], at: 'c19_hush' },
  pg(8, -5997, 'Captain Riverside #28: "You\'re Listening to Signal Hill"', 'c19_hold'),
];
