// Chapter 21 · Porch Light — that same evening. Riverside town square: Dr. Reyes runs a cure clinic out of the elementary
// school gym, Dube grills, people walk in from three counties. Then the power dies and the Gray come out of the dark: the
// Director's unfinished strain, carried by whatever she let out of the bridge cages. The cure doesn't touch them.
// Restart the floodlights, hold the gym, put down Miss Gladys the crossing guard, and Vance comes on the radio. World band z -6700..-7000.
import * as THREE from 'three';
import { PI, V, dist2, goto, afterBoss, clearThen, pg, rnd, $q } from './helpers.js';
import { walk, tickMv, cam, snap, script, cast, followAll, place, face, act, allyTick, holdTick, keepUp, ring, tickRings, dawn } from './ch15_kit.js';
import { mats, floor, prop, lamp, wallX, wallZ, table, crate } from './kit/common.js';
import { house, tree, street, streetLamp, pickup } from './kit/town.js';
import { hammerTick } from './kit/finale.js';
import { giveHammer } from '../hands.js';
import { grayify, spawnGray, grayHorde, floodGen, stopSign, vest, dry } from './ch21_kit.js';

export const meta = { n: 21, title: 'Porch Light', endQuote: '“Bring the rabbit.”' };
export const speakers = { gladys: 'Miss Gladys' };
export const Z0 = -6712;
const SCH = { x0: -24, x1: 24, zf: -6862, zb: -6904, H: 5 };
let A = null;

export function buildZone(ctx) {
  const K = mats(ctx), T = ctx.THREE; A = { gens: [], bulbs: null };
  const grass = new T.MeshStandardMaterial({ color: '#3d5a36', roughness: 1 });
  // Main Street in from the north, houses with their porch lights on
  street(ctx, 0, -6698, -6772, 10);
  house(ctx, -19, -6716, { facing: 'e', col: '#c9b9a0', seed: 41, lit: .8, light: true }); house(ctx, -19, -6740, { facing: 'e', col: '#9fb2b8', seed: 42, lit: .7 });
  house(ctx, 19, -6722, { facing: 'w', col: '#d8ccb0', seed: 43, lit: .8 }); house(ctx, 19, -6746, { facing: 'w', col: '#b89a8a', seed: 44, lit: .6, light: true });
  streetLamp(ctx, 6.6, -6730, true); streetLamp(ctx, -6.6, -6756, false);
  pickup(ctx, -3.6, -6726, .05, '#7a3a22'); ctx.car(3.8, -6748, PI + .04, '#5a6a72');
  // the square: grass, paths, the gazebo, the old war memorial
  floor(ctx, 0, -6810, 64, 70, grass, .02);
  floor(ctx, 0, -6810, 3, 70, new T.MeshStandardMaterial({ color: '#a8a090', roughness: .95 }), .03); floor(ctx, 0, -6806, 64, 3, new T.MeshStandardMaterial({ color: '#a8a090', roughness: .95 }), .031);
  { const gz = [-15, -6800]; const fl = new T.Mesh(new T.CylinderGeometry(3.6, 3.8, .35, 8), K.white); fl.position.set(gz[0], .17, gz[1]); ctx.scene.add(fl);
    for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2 + PI / 8; prop(ctx, .16, 2.9, .16, K.white, gz[0] + Math.cos(a) * 3.3, 1.6, gz[1] + Math.sin(a) * 3.3, true); }
    const rf = new T.Mesh(new T.ConeGeometry(4.3, 1.6, 8), new T.MeshStandardMaterial({ color: '#4a5a6a', roughness: .8 })); rf.position.set(gz[0], 3.85, gz[1]); rf.rotation.y = PI / 8; ctx.scene.add(rf); }
  { prop(ctx, 1.6, 1, 1.6, K.concrete, 15, .5, -6822, true); prop(ctx, .9, 2.6, .9, K.concrete, 15, 2.3, -6822, true); ctx.sign(['RIVERSIDE', 'REMEMBERS'], 15, 1.4, -6821.15, 0, 1.4, .5, '#3a3a36'); }
  // string lights around the square (one shared material, switched with the generators)
  A.bulbs = new T.MeshStandardMaterial({ color: '#332a1a', emissive: '#ffd890', emissiveIntensity: 2.2 }); const bg = new T.SphereGeometry(.08, 6, 5);
  const poles = [[-26, -6780], [26, -6780], [26, -6842], [-26, -6842]]; poles.forEach(([x, z]) => prop(ctx, .12, 4.4, .12, K.woodDark, x, 2.2, z, true));
  for (let k = 0; k < 4; k++) { const [ax, az] = poles[k], [bx, bz] = poles[(k + 1) % 4]; const L = Math.hypot(bx - ax, bz - az), n = Math.round(L / 1.6);
    for (let i = 1; i < n; i++) { const t = i / n, sag = Math.sin(t * PI) * .9; const b = new T.Mesh(bg, A.bulbs); b.position.set(ax + (bx - ax) * t, 4.2 - sag, az + (bz - az) * t); ctx.scene.add(b); } }
  // Dr. Reyes' clinic: two white canopies, folding tables, a cooler, the line
  const canvas = new T.MeshStandardMaterial({ color: '#f2f0ea', roughness: .9, side: T.DoubleSide });
  [[10, -6792], [17, -6792]].forEach(([x, z]) => { prop(ctx, 5.2, .08, 4, canvas, x, 2.6, z); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => prop(ctx, .08, 2.6, .08, K.steel, x + a * 2.5, 1.3, z + b * 1.9)); table(ctx, x, z - .6, { w: 3, d: .9, mat: K.white, legMat: K.steel }); });
  for (let i = 0; i < 6; i++) { const v = new T.Mesh(new T.CylinderGeometry(.03, .03, .12, 6), new T.MeshStandardMaterial({ color: '#a8e0ff', emissive: '#4ab0e0', emissiveIntensity: .6 })); v.position.set(9 + i * .3, .93, -6792.6); ctx.scene.add(v); }
  prop(ctx, .9, .55, .55, K.blue, 13.4, .28, -6790.6); ctx.sign(['CURE', 'THIS WAY →'], 6.5, 1.3, -6789.2, PI * .1, 1.6, .9, '#2a5a8a'); prop(ctx, .06, 1.2, .06, K.wood, 6.5, .6, -6789.25);
  // Dube's grill by the gazebo
  { prop(ctx, 1.2, .9, .7, K.black, -9.6, .45, -6796); const coal = new T.Mesh(new T.BoxGeometry(1, .05, .5), new T.MeshStandardMaterial({ color: '#300', emissive: '#ff5a1a', emissiveIntensity: 1.2 })); coal.position.set(-9.6, .92, -6796); ctx.scene.add(coal); table(ctx, -9.6, -6798.4, { w: 1.8, d: .8, mat: K.wood }); }
  // the three floodlight generators that die
  A.gens.push(floodGen(ctx, -24, -6790, PI / 2)); A.gens.push(floodGen(ctx, 24, -6818, -PI / 2)); A.gens.push(floodGen(ctx, -10, -6848, PI * .1));
  // the school road + crosswalk in front of Riverside Elementary
  floor(ctx, 0, -6853, 96, 8, new T.MeshStandardMaterial({ color: '#2c2e30', roughness: .95 }), .026);
  for (let i = -3; i <= 3; i++) floor(ctx, i * .9, -6853, .5, 6, new T.MeshStandardMaterial({ color: '#e8e4d8', emissive: '#e8e4d8', emissiveIntensity: .12 }), .04);
  ctx.sign(['SCHOOL', 'CROSSING'], -5, 2.2, -6857.6, 0, 1.4, .9, '#d0b020'); prop(ctx, .08, 2.2, .08, K.steelDark, -5, 1.1, -6857.7);
  // the school bell on its post (Miss Gladys rings it)
  { prop(ctx, .2, 3.4, .2, K.woodDark, 8, 1.7, -6858.4, true); prop(ctx, 1, .14, .14, K.woodDark, 8, 3.4, -6858.4); const bell = new T.Mesh(new T.CylinderGeometry(.18, .32, .42, 12, 1, true), new T.MeshStandardMaterial({ color: '#b08a3a', metalness: .7, roughness: .35, side: T.DoubleSide })); bell.position.set(8, 3.1, -6858.4); ctx.scene.add(bell); A.bell = bell; }
  // Riverside Elementary: brick, a wide front door, the gym inside (no ceiling — the camera needs the sky)
  const { x0, x1, zf, zb, H } = SCH; const brick = new T.MeshStandardMaterial({ color: '#8a4a3a', roughness: .9 }), trimW = new T.MeshStandardMaterial({ color: '#e8e2d4', roughness: .8 });
  floor(ctx, 0, (zf + zb) / 2, x1 - x0, zf - zb, new T.MeshStandardMaterial({ color: '#b08a5a', roughness: .55, emissive: '#1a1208' }), .035);
  wallX(ctx, x0, x1, zf, H, brick, [{ c: 0, w: 4.4 }]); wallX(ctx, x0, x1, zb, H, brick); wallZ(ctx, zf, zb, x0, H, brick); wallZ(ctx, zf, zb, x1, H, brick);
  prop(ctx, x1 - x0 + .6, .35, .6, trimW, 0, H + .17, zf); ctx.sign(['RIVERSIDE ELEMENTARY', 'HOME OF THE OTTERS'], 0, H - .9, zf + .25, 0, 7, 1.3, '#2a3a5a');
  [-14, -8, 8, 14].forEach(x => { const w = new T.Mesh(new T.PlaneGeometry(2.4, 1.5), new T.MeshStandardMaterial({ color: '#2a2418', emissive: '#ffcf8a', emissiveIntensity: .7 })); w.position.set(x, 2.6, zf + .22); ctx.scene.add(w); });
  // gym inside: court lines, hoops, bleachers, cots, the microscope table
  const line = new T.MeshStandardMaterial({ color: '#f0ece0', emissive: '#f0ece0', emissiveIntensity: .1 });
  floor(ctx, 0, -6883, 30, .12, line, .04); { const c = new T.Mesh(new T.RingGeometry(2.6, 2.75, 32), line); c.rotation.x = -PI / 2; c.position.set(0, .041, -6883); ctx.scene.add(c); }
  [-1, 1].forEach(s => { prop(ctx, .12, 3.2, .12, K.steelDark, s * 21.6, 1.6, -6883, true); prop(ctx, .1, 1.1, 1.8, K.white, s * 21.2, 3.3, -6883); const rim = new T.Mesh(new T.TorusGeometry(.24, .02, 6, 16), new T.MeshStandardMaterial({ color: '#e05a1a' })); rim.rotation.x = PI / 2; rim.position.set(s * 20.8, 3.0, -6883); ctx.scene.add(rim); });
  for (let r = 0; r < 3; r++) prop(ctx, 26, .45 * (3 - r), .9, K.wood, 0, .225 * (3 - r), -6903.3 + r * .9, true); // bleachers, stepping up to the back wall
  for (let i = 0; i < 6; i++) { prop(ctx, .9, .4, 2, new T.MeshStandardMaterial({ color: '#4a6a4a', roughness: .9 }), -18 + i * 3, .2, -6870, true); prop(ctx, .7, .12, .5, K.white, -18 + i * 3, .45, -6869.2); }
  table(ctx, 10, -6876, { w: 2.4, d: 1, mat: K.white, legMat: K.steel });
  { const G = new T.Group(), wM = new T.MeshStandardMaterial({ color: '#e8e8e4', roughness: .5 }), dM = new T.MeshStandardMaterial({ color: '#2a2e34', roughness: .4, metalness: .4 });
    const base = new T.Mesh(new T.BoxGeometry(.22, .04, .28), wM); base.position.y = .02; G.add(base); const arm = new T.Mesh(new T.BoxGeometry(.06, .3, .07), wM); arm.position.set(0, .17, -.1); arm.rotation.x = -.15; G.add(arm);
    const stage = new T.Mesh(new T.BoxGeometry(.16, .015, .14), dM); stage.position.set(0, .12, .02); G.add(stage); const tube = new T.Mesh(new T.CylinderGeometry(.025, .03, .2, 10), dM); tube.position.set(0, .3, -.02); tube.rotation.x = .5; G.add(tube);
    const eye = new T.Mesh(new T.CylinderGeometry(.018, .018, .08, 8), dM); eye.position.set(0, .4, -.08); eye.rotation.x = .5; G.add(eye); const obj = new T.Mesh(new T.CylinderGeometry(.012, .008, .05, 8), new T.MeshStandardMaterial({ color: '#c8c8c0', metalness: .7 })); obj.position.set(0, .18, .02); G.add(obj);
    G.position.set(10.4, .86, -6876.1); G.rotation.y = PI; ctx.scene.add(G);
    for (let i = 0; i < 4; i++) { const v = new T.Mesh(new T.CylinderGeometry(.02, .02, .1, 6), new T.MeshStandardMaterial({ color: '#9aa6a0', emissive: '#6a8a80', emissiveIntensity: .5 })); v.position.set(10.9 + i * .1, .91, -6875.8); ctx.scene.add(v); } }
  prop(ctx, .5, .35, .35, K.black, 9.2, .98, -6876); A.radioLamp = new T.MeshStandardMaterial({ color: '#300', emissive: '#ff3a20', emissiveIntensity: 0 }); prop(ctx, .06, .06, .02, A.radioLamp, 9.2, 1.1, -6875.8);
  [[-12, -6868], [12, -6868], [0, -6890]].forEach(([x, z], i) => lamp(ctx, x, z, { y: H - .1, real: i === 2, color: '#fff2dc', intensity: 9, range: 22, size: [1.6, .1, .5] }));
  // trees ring the square
  for (let i = 0; i < 10; i++) tree(ctx, (i % 2 ? 1 : -1) * (32 + (i * 3) % 8), -6772 - i * 7.5, 1.35, i % 3 ? '#2a4430' : '#33502f');
  for (let i = 0; i < 6; i++) tree(ctx, -40 + i * 16, -6912, 1.4, '#284230');
}
function bulbs(on) { if (A && A.bulbs) A.bulbs.emissiveIntensity = on ? 2.2 : 0; }
const bellRing = (g) => { const a = g.audio; if (!a.tone) return; for (let i = 0; i < 4; i++) setTimeout(() => { a.tone(880, 1.1, 'triangle', .1, undefined, .01); a.tone(1320, .7, 'sine', .04, undefined, .01); }, i * 260); };
function radio(on) { if (A && A.radioLamp) A.radioLamp.emissiveIntensity = on ? 3 : 0; }

// ---------- Miss Gladys ----------
function gladysBoss(g, D) { const b = g.spawnZ(4, -6830, { boss: true, fem: true, hp: 3200, scale: 1.7, runner: false }); b.cd = 2; b.aggro = 99; b.speed = 1.5; g.boss = b; D.b = b;
  $q('#bossn').textContent = 'MISS GLADYS — crossing guard, 31 years'; vest(b, '#f2d020'); const u = b.mat && b.mat.userData && b.mat.userData.u; if (u && u.uPants) u.uPants.value.set('#2a3450'); grayify(b); stopSign(b); g.audio.roar && setTimeout(() => g.audio.roar(b), 900); return b; }

const ALL = ['dad', 'nia', 'mom', 'reyes', 'dube', 'tuck', 'danny'];
const FIGHT = ['dad', 'reyes', 'dube'];
const W = { north: [[-4, -6760], [4, -6764], [0, -6770]], west: [[-44, -6800], [-44, -6820]], east: [[44, -6806], [44, -6826]] };
export const steps = [
  { id: 'c21_square', ch: 21, cp: [0, -6790, PI], obj: '', hint: '', mood: 'day', beat: 0, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); dry(g); D.lobster = false; cast(g, D, 0, -6790, ALL); giveHammer(D.dad, false); dry(g, .55); bulbs(true); radio(false); A.gens.forEach(G => G.set(false)); D.dw = .62; dawn(g, .62);
      // the line for the cure, Reyes at her table, Dube on the grill, Danny with his sign
      place(D.reyes, 10, -6793.6, 0); place(D.tuck, 17, -6793.4, 0); place(D.dube, -9.6, -6795.2, PI * .1); place(D.danny, 6, -6788.4, PI * .7);
      D.sv = []; for (let i = 0; i < 5; i++) { const s = g.npc('sv21_' + i, undefined, 10.4 + (i % 2) * .5, -6790.8 + i * 1.3, PI, 'Idle_Loop'); D.sv.push(s); }
      place(g.player, -1.6, -6800, PI * .7); place(D.dad, -.2, -6801.4, PI * .8); place(D.mom, -1, -6802.8, PI * .5); place(D.nia, -3, -6801.6, PI * .3);
      g.cut = { anim: 'Idle_Loop', cam: V(4.6, 1.9, -6786.6), look: V(10, 1.2, -6792.4), flash: false }; snap(g);
      script(g, [
        ['reyes', "Next. Sleeve up, little pinch. That's dose number forty-three today."],
        ['tuck', "The line goes all the way back to the hardware store. People walked here from Bar Harbor."],
        (g) => { cam(g, V(3.4, 1.6, -6786.2), V(6, 1.4, -6788.4)); },
        ['danny', "I made the sign! 'Cure, this way.' I spelled cure right on the third try."],
        (g) => { cam(g, V(-6.6, 1.7, -6792.6), V(-9.6, 1.3, -6796)); g.audio.splat && g.audio.splat(); },
        ['dube', "Burgers are up. First real grill in eight months."],
        (g) => { cam(g, V(-2.3, 1.12, -6799.7), V(-3, .9, -6801.6)); face(D.nia, -2.3, -6799.7); },
        ['nia', "Biscuit gets the lettuce. That's the rule."],
        (g) => { act(D.mom, 'hold', { k: .6 }); cam(g, V(.6, 1.65, -6797.6), V(-.6, 1.45, -6802)); },
        ['dana', "Look at this, Marcus. People standing in a line. Laughing."],
        ['marcus', "Feels like the Fourth of July."],
        (g) => { act(D.mom, null); cam(g, V(-3.6, 1.65, -6797.8), V(-1.6, 1.5, -6800)); },
        ['keem', "Feels like a trap. It's never this quiet for long."],
        ['marcus', "Let your old man have one nice night, son."],
        (g) => { bulbs(false); D.dark = true; g.shake(.15); g.audio.thud && g.audio.thud(); cam(g, V(0, 3, -6790), V(0, 2, -6830)); },
        ['tuck', "Uh… did somebody unplug the town?"],
        ['dube', "The generators. All three just quit at once."],
        (g) => { g.audio.roar && g.audio.roar(); g.shake(.2); cam(g, V(10.6, 1.65, -6796.6), V(10, 1.45, -6793.6)); },
        ['reyes', "That's not one of ours. Listen to it. It's wrong."],
        ['keem', "Everybody inside the school. Dad, with me."],
        (g) => { g.cut = null; goto(g, 'c21_lights', 120); },
      ]);
    },
    update(g, dt) { const D = g.stepData; tickMv(g, D, dt); D.dw = Math.max(D.dark ? .2 : .42, D.dw - dt * (D.dark ? .08 : .004)); dawn(g, D.dw); } },

  { id: 'c21_lights', ch: 21, cp: [-2, -6806, PI], obj: 'Restart the floodlights (0/3)', hint: 'Three yellow generators around the square. Get close and pull the cord.', mood: 'tense', beat: 2, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); dry(g); bulbs(false); radio(false); A.gens.forEach(G => G.set(false)); cast(g, D, -2, -6806, FIGHT); followAll(g, D, FIGHT); giveHammer(D.dad, false); D.n = 0;
      const refresh = () => { D.uses = A.gens.filter(G => !G.on).map(G => ({ x: G.x + (G.x < 0 ? 1.4 : G.x > 20 ? -1.4 : 0), z: G.z + 1.2, r: 2.4, label: 'Pull the cord', fn: () => start(G) })); const nx = A.gens.find(G => !G.on); g.wpTarget = nx ? [nx.x, 1.4, nx.z + 1.2] : null; };
      const start = (G) => { if (G.on) return; G.set(true); D.n++; g.audio.engine && g.audio.engine(true, .4); setTimeout(() => g.audio.engine && g.audio.engine(false), 900); g.shake(.15); g.toast('Floodlight on ' + D.n + '/3', 1.6);
        g.objective('Restart the floodlights (' + D.n + '/3)', D.n < 3 ? 'Next generator.' : 'The square is lit.'); refresh();
        if (D.n === 1) { grayHorde(g, 6, W.west, { runner: true }); g.say([['keem', "Their skin's gray. And they're fast."], ['reyes', "Those aren't the infected we know. Don't let them touch you."]]); }
        if (D.n === 2) { grayHorde(g, 7, W.east); g.say([['dube', "Here's more, coming over the memorial!"]]); }
        if (D.n === 3) { D.won = true; bulbs(true); g.say([['marcus', "Lights are on. Now they can't sneak up on us."], ['keem', "Now they can see us too. Back to the gym."]], () => { D.go2 = true; }); } };
      refresh(); grayHorde(g, 5, W.north); g.say([['marcus', "Stay close. I'll take the ones that get near you."]]);
    },
    update(g, dt) { const D = g.stepData; hammerTick(g, D, dt); allyTick(g, D, 'reyes', dt, { dmg: 28, cd: 1.5 }); allyTick(g, D, 'dube', dt, { dmg: 44, cd: 1.8, sound: 'shotgun' });
      if (!D.won) keepUp(g, D, dt, 3, () => grayHorde(g, 3, [W.north[0], W.west[0], W.east[1]]), 3.2);
      if (D.go2 && g.alive().length === 0) clearThen(g, D, 'c21_gym', 300, 'Get to the gym doors'); } },

  { id: 'c21_gym', ch: 21, cp: [0, -6856, PI], obj: 'Hold the gym doors', hint: 'Everyone is inside. Keep the Gray off the front door for fifty seconds.', mood: 'tense', beat: 3, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); dry(g); bulbs(true); A.gens.forEach(G => G.set(true)); cast(g, D, 0, -6852, FIGHT); giveHammer(D.dad, false);
      place(D.reyes, -3.4, -6857, 0); place(D.dube, 3.4, -6857, 0); place(D.dad, 0, -6850, 0); D.ping = 2; D.wave = 0;
      D.holdHint = 'Everyone is inside. Keep the Gray off the front door.';
      g.say([['dube', "Tuck's got the door bolted behind us. It's just us out here."], ['marcus', "Then nobody gets past us."]]);
    },
    update(g, dt) { const D = g.stepData; hammerTick(g, D, dt, { home: [0, -6850] }); allyTick(g, D, 'reyes', dt, { dmg: 28, cd: 1.5 }); allyTick(g, D, 'dube', dt, { dmg: 44, cd: 1.8, sound: 'shotgun' });
      D.ping -= dt; if (!D.held && D.ping <= 0) { D.ping = 9; const k = D.wave % 3; const pts = k === 0 ? W.north : k === 1 ? W.west : W.east;
        g.toast(['Main Street!', 'West side!', 'East side!'][k], 1.6); grayHorde(g, k === 0 ? 7 : 5, pts, { runner: D.wave > 1 }); D.wave++;
        if (D.wave === 2) g.say([['reyes', "I hit that one with a full dose. Nothing. The cure doesn't touch them."], ['marcus', "Then what are they?"]]);
        if (D.wave === 4) g.say([['danny', "I'm guarding the snacks! Nobody worry about the snacks!"]]); }
      holdTick(g, D, dt, 50, 'Hold the gym doors', () => { D.clear = true; });
      if (D.clear && g.alive().length === 0) { if (!D.go) { D.go = true; goto(g, 'c21_gladys', 300); } } else if (D.clear && !D.mop) { D.mop = true; g.objective('Clear the schoolyard', 'Finish the last ones.'); } } },

  { id: 'c21_gladys', ch: 21, cp: [0, -6850, PI], obj: 'Stop Miss Gladys', hint: 'When she raises the stop sign, get out of the yellow ring. She rings the school bell to call more — keep moving.', mood: 'tense', beat: 3, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); dry(g); bulbs(true); A.gens.forEach(G => G.set(true)); cast(g, D, 0, -6852, ['dad', 'reyes', 'dube', 'nia']); giveHammer(D.dad, false);
      place(g.player, -.4, -6848, 0); place(D.dad, 1.6, -6849, 0); place(D.reyes, -3, -6852, 0); place(D.dube, 3.2, -6852.4, 0); place(D.nia, -1, -6859.4, 0);
      const b = gladysBoss(g, D); b.st = 'script'; b.root.position.set(.2, 0, -6838); b.root.rotation.y = PI; D.cd = 4; D.bell = 11;
      g.cut = { anim: 'Idle_Loop', cam: V(2.2, 1.7, -6846), look: V(.2, 2, -6838), flash: false }; snap(g);
      script(g, [
        (g) => { A.bell && (A.bell.rotation.z = .4); bellRing(g); },
        ['gladys', "Stop. Look both ways."],
        (g) => { cam(g, V(-1.6, 1.25, -6855.2), V(-1, 1.0, -6859.2)); },
        ['nia', "That's Miss Gladys. She walked me across Elm Street every single morning."],
        (g) => { cam(g, V(3.4, 1.6, -6846.4), V(1.6, 1.5, -6849)); },
        ['marcus', "Oh, Gladys. Not you too."],
        ['keem', "Nia, get back inside. Now."],
        (g) => { place(D.nia, -1, -6870, PI); D.nia.root.visible = false; g.cut = null; b.st = 'chase'; D.on = true; followAll(g, D, FIGHT); },
      ]);
    },
    update(g, dt) { const D = g.stepData, b = D.b; tickRings(g, D, dt); if (A.bell) A.bell.rotation.z *= .94; if (!D.on) return; hammerTick(g, D, dt, { dmg: 60 }); allyTick(g, D, 'reyes', dt, { dmg: 24, cd: 1.6 }); allyTick(g, D, 'dube', dt, { dmg: 40, cd: 1.9, sound: 'shotgun' });
      if (!b || b.dead || b.hp <= 0) { if (b && (b.dead || b.hp <= 0) && !D.won) { D.won = true; D.rings && D.rings.forEach(r => g.scene.remove(r.m)); D.rings = []; afterBoss(g, () => goto(g, 'c21_end', 400)); } return; }
      if (g.cut) return;
      D.cd -= dt; if (D.cd <= 0) { D.cd = b.hp < b.maxHp * .5 ? 3.6 : 4.8; const p = b.root.position; g.toast('STOP! — get clear!', 1.1); b.st = 'script'; b.play && b.play('Idle_Loop'); ring(g, D, p.x, p.z, { r: 4.2, life: 1.15, color: '#f2d020', dmg: 26, boom: true }); setTimeout(() => { if (b && !b.dead) b.st = 'chase'; }, 1150); }
      D.bell -= dt; if (D.bell <= 0) { D.bell = 13; if (A.bell) A.bell.rotation.z = .5; bellRing(g); g.toast('The school bell — more coming', 1.8); grayHorde(g, b.hp < b.maxHp * .5 ? 6 : 4, [W.west[0], W.east[0], W.north[1]], { runner: true }); }
      if (!D.half && b.hp < b.maxHp * .5) { D.half = true; g.say([['gladys', "Single file, children. Single file."], ['dube', "She's still doing her job. Even now."]]); } } },

  { id: 'c21_end', ch: 21, cp: [8, -6874, PI], obj: '', hint: '', mood: 'sad', beat: 0, light: 'lab', rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); dry(g); bulbs(true); radio(false); D.lobster = false; cast(g, D, 8, -6872, ALL); giveHammer(D.dad, false);
      place(D.reyes, 10.4, -6877.2, 0); place(g.player, 8.2, -6874.4, PI * .75); place(D.dad, 6.8, -6873.4, PI * .7); place(D.mom, 12.6, -6874.8, -PI * .7); place(D.nia, 9.6, -6873, PI); place(D.dube, 5.4, -6875.8, PI * .55); place(D.tuck, 13.4, -6872.6, -PI * .8); place(D.danny, 4.4, -6872.4, PI * .6);
      D.sv = []; for (let i = 0; i < 4; i++) D.sv.push(g.npc('sv21b_' + i, undefined, -16 + i * 3, -6866.4, PI * .9, 'Idle_Loop'));
      g.cut = { anim: 'Idle_Loop', cam: V(9, 1.7, -6872.2), look: V(10.4, 1.15, -6876.4), flash: false }; snap(g);
      script(g, [
        ['reyes', "It's not our virus. It's hers. The unfinished strain the Director used on herself."],
        (g) => { cam(g, V(11.4, 1.6, -6872.2), V(12.6, 1.45, -6874.8)); },
        ['dana', "The cages on the bridge. She opened them. Whatever was inside was already carrying it."],
        (g) => { cam(g, V(7.8, 1.65, -6870.8), V(6.8, 1.5, -6873.4)); },
        ['marcus', "So the cure we gave forty-one towns…"],
        (g) => { cam(g, V(9, 1.7, -6872.2), V(10.4, 1.15, -6876.4)); },
        ['reyes', "Works on the old one. Not on this. Not on the gray."],
        (g) => { radio(true); g.audio.staticBurst && g.audio.staticBurst(1.1); cam(g, V(10.1, 1.3, -6874.5), V(9.2, 1.0, -6876)); },
        ['vance', "Riverside, if you can hear me. This is Vance. I'm alive. Mostly."],
        (g) => { cam(g, V(9.6, 1.6, -6877.4), V(8.2, 1.5, -6874.4)); face(g.player, 9.2, -6876); },
        ['keem', "Vance? We watched that lab burn."],
        (g) => { cam(g, V(10.1, 1.3, -6874.5), V(9.2, 1.0, -6876)); },
        ['vance', "The Authority pulled me off the roof. I'm on their last ship, the Sentinel, in Casco Bay. They have her strain in tanks. Hundreds of them."],
        ['vance', "Their new man, Commodore Hale, means to spray it along the coast. Every town that made the cure."],
        (g) => { cam(g, V(9, 1.7, -6872.2), V(10.4, 1.15, -6876.4)); },
        ['reyes', "Elliot, the cure doesn't work on the gray."],
        (g) => { cam(g, V(10.1, 1.3, -6874.5), V(9.2, 1.0, -6876)); g.audio.staticBurst && g.audio.staticBurst(.7); },
        ['vance', "I know. One thing does. Subject R-07 fought it off in a dish. Every gray cell."],
        (g) => { cam(g, V(9.2, 1.15, -6871.6), V(9.6, .95, -6873)); D.nia.root.rotation.y = PI; },
        ['nia', "…R-07? That's Biscuit."],
        (g) => { g.audio.staticBurst && g.audio.staticBurst(1); cam(g, V(10.1, 1.3, -6874.5), V(9.2, 1.0, -6876)); },
        ['vance', "Bring the rabbit."],
        (g) => { radio(false); setTimeout(() => g.onComplete && g.onComplete(21), 900); },
      ]);
    },
    update(g, dt) { tickMv(g, g.stepData, dt); } },
];

export const loot = [
  { id: 'c21a', kind: 'ammo', item: 'rifle', n: 60, pos: [-20, .25, -6800], at: 'c21_lights' },
  { id: 'c21b', kind: 'med', pos: [20, .25, -6806], at: 'c21_lights' },
  { id: 'c21c', kind: 'grenade', n: 3, pos: [-6, .25, -6842], at: 'c21_lights' },
  { id: 'c21d', kind: 'ammo', item: 'shell', n: 20, pos: [6, .25, -6846], at: 'c21_gym' },
  { id: 'c21e', kind: 'med', pos: [-8, .25, -6846], at: 'c21_gladys' },
  { id: 'c21f', kind: 'cash', n: 600, pos: [-15, .5, -6800], at: 'c21_lights' },
  pg(22, -6840, 'Captain Riverside #30: "Lights Out in Otter Town"', 'c21_lights'),
];
