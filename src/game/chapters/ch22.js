// Chapter 22 · Last Train to Portland — the Riverside & Casco freight yard at night. Danny's helicopter is dry and the
// coast road is blocked, so the family wakes Old Number Nine: a battery from the signal tower, a coupling pin from a boxcar,
// diesel from a tanker, two track switches. The Yardmaster blows the yard horn. Then the train pulls out for Portland.
// World band z -7100..-7400.
import * as THREE from 'three';
import { PI, V, dist2, goto, afterBoss, clearThen, pg, rnd, $q } from './helpers.js';
import { walk, tickMv, cam, snap, script, cast, followAll, place, face, act, allyTick, holdTick, keepUp, ring, tickRings, squad } from './ch15_kit.js';
import { mats, floor, prop, lamp, wallX, wallZ, crate } from './kit/common.js';
import { tree, streetLamp } from './kit/town.js';
import { hammerTick } from './kit/finale.js';
import { giveHammer } from '../hands.js';
import { grayify, spawnGray, grayHorde, vest, lantern, lane } from './ch21_kit.js';

export const meta = { n: 22, title: 'Last Train to Portland', endQuote: '“Portland, next stop!”' };
export const speakers = { hale: 'Commodore Hale', yard: 'The Yardmaster' };
export const Z0 = -7112;
const TR = [-12, -4, 4, 12]; // track centre lines (x)
let A = null;

function boxcar(ctx, x, z, col, { open = false, len = 12 } = {}) { const T = ctx.THREE, K = mats(ctx), body = new T.MeshStandardMaterial({ color: col, roughness: .85, metalness: .15 }), dk = new T.MeshStandardMaterial({ color: '#1e1e1e', roughness: .7, metalness: .5 });
  if (!open) ctx.wallBox(3, 3.2, len, body, x, 2.5, z); else { // open side door facing -x: three solid walls + roof, a gap in the -x wall
    ctx.wallBox(3, .2, len, body, x, 1, z, false); ctx.box(x - .6, x + 1.5, z - len / 2, z + len / 2); ctx.wallBox(.15, 3.2, len, body, x + 1.42, 2.5, z); ctx.wallBox(3, 3.2, .15, body, x, 2.5, z + len / 2 - .08); ctx.wallBox(3, 3.2, .15, body, x, 2.5, z - len / 2 + .08);
    ctx.wallBox(.15, 3.2, len / 2 - 1.5, body, x - 1.42, 2.5, z + len / 4 + .75); ctx.wallBox(.15, 3.2, len / 2 - 1.5, body, x - 1.42, 2.5, z - len / 4 - .75); prop(ctx, 3.1, .12, len, body, x, 4.15, z);
    prop(ctx, .1, 3, 3.2, body, x - 1.6, 2.5, z - 3.2); }
  for (let i = -1; i <= 1; i += 2) prop(ctx, 3.04, .1, .1, dk, x, 3.2, z + i * (len / 2 - 1.5)); // rib detail
  [-1, 1].forEach(e => [-1, 1].forEach(s => { const w = new T.Mesh(new T.CylinderGeometry(.42, .42, .25, 12), dk); w.rotation.z = PI / 2; w.position.set(x + s * .72, .42, z + e * (len / 2 - 1.8)); ctx.scene.add(w); const w2 = w.clone(); w2.position.z += e * -1.1; ctx.scene.add(w2); }));
  prop(ctx, 2.6, .5, len - .4, dk, x, .75, z); }
function tanker(ctx, x, z, len = 13) { const T = ctx.THREE, m = new T.MeshStandardMaterial({ color: '#2a2c2e', roughness: .5, metalness: .4 }), dk = new T.MeshStandardMaterial({ color: '#1a1a1a', metalness: .5, roughness: .6 });
  const c = new T.Mesh(new T.CylinderGeometry(1.4, 1.4, len - 1, 18), m); c.rotation.x = PI / 2; c.position.set(x, 2.3, z); ctx.scene.add(c); ctx.box(x - 1.45, x + 1.45, z - len / 2, z + len / 2);
  [-1, 1].forEach(e => { const cap = new T.Mesh(new T.SphereGeometry(1.4, 16, 10, 0, PI * 2, 0, PI / 2), m); cap.rotation.x = e * PI / 2; cap.position.set(x, 2.3, z + e * (len / 2 - .5)); ctx.scene.add(cap); });
  prop(ctx, 2.6, .5, len - .4, dk, x, .75, z); const dome = new T.Mesh(new T.CylinderGeometry(.5, .5, .4, 12), m); dome.position.set(x, 3.8, z); ctx.scene.add(dome);
  ctx.sign(['DIESEL', 'NO SMOKING'], x - 1.42, 2.4, z, -PI / 2, 2, .7, '#a8261c');
  const pump = new T.MeshStandardMaterial({ color: '#d0a020', roughness: .5 }); prop(ctx, .7, 1.2, .5, pump, x - 2.2, .6, z + 2, true); prop(ctx, .1, .1, 1.4, dk, x - 1.8, 1.1, z + 1.4); }
// Old Number Nine: a small diesel switcher, original shape (no railroad marks) + one open gondola behind it. Built as a group so it can roll.
function train(ctx, x, z) { const T = ctx.THREE, G = new T.Group(); const body = new T.MeshStandardMaterial({ color: '#7a2a1e', roughness: .6, metalness: .2 }), dk = new T.MeshStandardMaterial({ color: '#1e2022', roughness: .6, metalness: .5 }),
    stripe = new T.MeshStandardMaterial({ color: '#e0b020', roughness: .5 }), glass = new T.MeshStandardMaterial({ color: '#2a3a44', roughness: .1, metalness: .3, emissive: '#ffcf8a', emissiveIntensity: .25 });
  const add = (geo, m, px, py, pz) => { const mm = new T.Mesh(geo, m); mm.position.set(px, py, pz); mm.castShadow = true; G.add(mm); return mm; };
  // locomotive (nose toward -z), centred on z=0 of the group, 14 m long
  add(new T.BoxGeometry(2.8, .5, 14), dk, 0, .95, 0); add(new T.BoxGeometry(2.2, 2.2, 9), body, 0, 2.3, -2.2); add(new T.BoxGeometry(3, 3, 3.4), body, 0, 2.7, 4.6);
  add(new T.BoxGeometry(3.04, .24, 14), stripe, 0, 1.3, 0); add(new T.BoxGeometry(3.1, .2, 3.6), dk, 0, 4.3, 4.6);
  [-1, 1].forEach(s => { add(new T.BoxGeometry(.05, .9, 1.2), glass, s * 1.52, 3.3, 4.6); }); add(new T.BoxGeometry(2.4, .9, .05), glass, 0, 3.3, 2.88);
  add(new T.CylinderGeometry(.18, .22, .9, 10), dk, 0, 3.8, -4.4); const hl = add(new T.CircleGeometry(.28, 14), new T.MeshStandardMaterial({ color: '#fff', emissive: '#fff4d0', emissiveIntensity: 0 }), 0, 3.0, -6.72); hl.rotation.y = PI;
  for (let i = 0; i < 4; i++) add(new T.BoxGeometry(2.26, .06, .5), dk, 0, 3.42, -5.6 + i * 2.2); // roof grilles
  [-5, -3.2, 3.2, 5].forEach(zz => [-1, 1].forEach(s => { const w = add(new T.CylinderGeometry(.5, .5, .25, 14), dk, s * .74, .5, zz); w.rotation.z = PI / 2; }));
  // the gondola: open-top car right behind the cab, deck at y 1.2, walls to 2.3
  const gz = 11.4, gm = new T.MeshStandardMaterial({ color: '#4a4e3a', roughness: .85, metalness: .2 });
  add(new T.BoxGeometry(2.9, .25, 8), gm, 0, 1.15, gz); add(new T.BoxGeometry(.12, 1.1, 8), gm, -1.44, 1.8, gz); add(new T.BoxGeometry(.12, 1.1, 8), gm, 1.44, 1.8, gz); add(new T.BoxGeometry(2.9, 1.1, .12), gm, 0, 1.8, gz + 3.95); add(new T.BoxGeometry(2.9, 1.1, .12), gm, 0, 1.8, gz - 3.95);
  add(new T.BoxGeometry(2.6, .5, 7.6), dk, 0, .75, gz); [-2.6, 2.6].forEach(zz => [-1, 1].forEach(s => { const w = add(new T.CylinderGeometry(.42, .42, .25, 12), dk, s * .72, .42, gz + zz); w.rotation.z = PI / 2; }));
  G.position.set(x, 0, z); ctx.scene.add(G);
  // static colliders where it sits (the train only rolls in the last cutscene)
  ctx.box(x - 1.5, x + 1.5, z - 7, z + 7); ctx.box(x - 1.5, x + 1.5, z + gz - 4, z + gz + 4);
  return { g: G, hl, x, z, gz }; }
function lever(ctx, x, z) { const T = ctx.THREE, K = mats(ctx); prop(ctx, .8, .3, .5, K.steelDark, x, .15, z, true); const arm = new T.Mesh(new T.BoxGeometry(.08, 1.1, .08), new T.MeshStandardMaterial({ color: '#c8201a', roughness: .5 })); arm.position.set(x, .7, z); arm.rotation.z = .5; ctx.scene.add(arm);
  prop(ctx, .1, 2.2, .1, K.steelDark, x + .8, 1.1, z); const lm = new T.MeshStandardMaterial({ color: '#300', emissive: '#ff2a1a', emissiveIntensity: 2 }); const lmp = new T.Mesh(new T.SphereGeometry(.14, 10, 8), lm); lmp.position.set(x + .8, 2.3, z); ctx.scene.add(lmp);
  const L = { x, z, on: false, set() { L.on = true; arm.rotation.z = -.5; lm.color.set('#030'); lm.emissive.set('#30ff60'); } }; return L; }

export function buildZone(ctx) {
  const K = mats(ctx), T = ctx.THREE; A = { levers: [] };
  floor(ctx, 0, -7258, 96, 290, new T.MeshStandardMaterial({ color: '#4e4a44', roughness: 1 }), .02);
  // the yard fence + gate + sign
  const fence = new T.MeshStandardMaterial({ color: '#9aa0a4', metalness: .5, roughness: .5, wireframe: true });
  wallX(ctx, -40, 40, -7118, 2.6, fence, [{ c: 0, w: 6 }], .2); wallZ(ctx, -7118, -7398, -40, 2.6, fence, [], .2); wallZ(ctx, -7118, -7398, 40, 2.6, fence, [], .2);
  [-3.2, 3.2].forEach(x => prop(ctx, .3, 3, .3, K.steelDark, x, 1.5, -7118, true)); ctx.sign(['RIVERSIDE & CASCO RAILWAY', 'FREIGHT YARD · EMPLOYEES ONLY'], 0, 3.6, -7117.6, 0, 6.4, 1.2, '#3a2a22');
  // tracks: steel rails + instanced ties
  const railM = new T.MeshStandardMaterial({ color: '#8a8e92', metalness: .7, roughness: .35 }), tieM = new T.MeshStandardMaterial({ color: '#3a2e24', roughness: 1 });
  const nT = 230, tieG = new T.BoxGeometry(2.4, .12, .26), ties = new T.InstancedMesh(tieG, tieM, nT * TR.length); const mtx = new T.Matrix4(); let k = 0;
  TR.forEach(x => { [-.72, .72].forEach(o => prop(ctx, .1, .14, 276, railM, x + o, .1, -7260)); for (let i = 0; i < nT; i++) { mtx.makeTranslation(x, .05, -7124 - i * 1.18); ties.setMatrixAt(k++, mtx); } }); ctx.scene.add(ties);
  // rolling stock
  boxcar(ctx, -12, -7152, '#6a3a2a'); boxcar(ctx, -12, -7168, '#3a4a5a'); boxcar(ctx, -12, -7206, '#5a5a3a'); boxcar(ctx, 12, -7146, '#3a4a5a'); boxcar(ctx, 12, -7162, '#7a4a2a'); boxcar(ctx, 12, -7208, '#4a3a3a');
  boxcar(ctx, 4, -7176, '#5a3a2a'); boxcar(ctx, 4, -7232, '#3a5a4a', { open: true }); boxcar(ctx, -12, -7250, '#6a5a3a'); boxcar(ctx, 4, -7348, '#5a4a3a'); boxcar(ctx, 12, -7352, '#3a3a4a');
  tanker(ctx, 12, -7268); A.train = train(ctx, -4, -7318);
  // signal tower: two storeys, door on the +x side, windows lit
  { const brick = new T.MeshStandardMaterial({ color: '#7a4a3a', roughness: .9 }); const x = -26, z = -7200; wallX(ctx, x - 3, x + 3, z + 3, 7, brick); wallX(ctx, x - 3, x + 3, z - 3, 7, brick); wallZ(ctx, z + 3, z - 3, x - 3, 7, brick); wallZ(ctx, z + 3, z - 3, x + 3, 7, brick, [{ c: z, w: 1.8 }]);
    prop(ctx, 6.8, .3, 6.8, K.woodDark, x, 7.15, z); floor(ctx, x, z, 6, 6, K.concrete, .03);
    [[-1.2, 4.6], [1.2, 4.6]].forEach(([dz, y]) => { const w = new T.Mesh(new T.PlaneGeometry(1.4, 1.2), new T.MeshStandardMaterial({ color: '#2a2418', emissive: '#ffcf8a', emissiveIntensity: .9 })); w.position.set(x + 3.22, y, z + dz); w.rotation.y = PI / 2; ctx.scene.add(w); });
    ctx.sign(['SIGNAL TOWER 2'], x + 3.25, 2.9, z, PI / 2, 2.4, .5, '#2a2a2a'); prop(ctx, 1.2, .9, .6, K.steel, x - 1.4, .45, z - 2); prop(ctx, .6, .4, .4, new T.MeshStandardMaterial({ color: '#2a5a2a', roughness: .5 }), x - 1.4, 1.1, z - 2); A.batt = [x + 4.4, z]; }
  // switch levers between the tracks
  A.levers.push(lever(ctx, 0, -7286)); A.levers.push(lever(ctx, 8, -7300));
  // water tower, yard lamps, crates, trees past the fence
  { const wt = new T.MeshStandardMaterial({ color: '#5a4a3a', roughness: .9 }); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => prop(ctx, .3, 9, .3, K.steelDark, 26 + a * 2.2, 4.5, -7330 + b * 2.2, true)); const tk = new T.Mesh(new T.CylinderGeometry(3.2, 3.2, 4, 16), wt); tk.position.set(26, 11, -7330); ctx.scene.add(tk); const rf = new T.Mesh(new T.ConeGeometry(3.5, 1.6, 16), wt); rf.position.set(26, 13.8, -7330); ctx.scene.add(rf); }
  [[-20, -7140], [20, -7190], [-20, -7240], [20, -7290], [-20, -7330]].forEach(([x, z], i) => { prop(ctx, .2, 7, .2, K.steelDark, x, 3.5, z, true); lamp(ctx, x + (x > 0 ? -.6 : .6), z, { y: 7, real: i % 2 === 0, color: '#ffd8a0', intensity: 12, range: 26, size: [.8, .2, .5] }); });
  [[-30, -7150], [-32, -7154], [28, -7230], [30, -7236], [-30, -7290], [24, -7380]].forEach(([x, z], i) => crate(ctx, x, z, 1.2 + (i % 2) * .3, null, i * .5));
  for (let i = 0; i < 12; i++) tree(ctx, (i % 2 ? 1 : -1) * (44 + (i * 3) % 6), -7130 - i * 22, 1.5, '#22382a');
}
function headlight(on) { if (A && A.train) A.train.hl.material.emissiveIntensity = on ? 3 : 0; }

// ---------- the Yardmaster ----------
function yardBoss(g, D) { const b = g.spawnZ(0, -7262, { boss: true, hp: 4000, scale: 1.9, runner: false }); b.cd = 2; b.aggro = 99; b.speed = 1.5; g.boss = b; D.b = b;
  $q('#bossn').textContent = 'THE YARDMASTER — Riverside & Casco, 40 years'; vest(b, '#e8641a'); const u = b.mat && b.mat.userData && b.mat.userData.u; if (u && u.uPants) u.uPants.value.set('#2a3a5a'); grayify(b); lantern(b);
  b.armor = (o) => (D.winded > 0 ? 1.9 : 1); g.audio.roar && setTimeout(() => g.audio.roar(b), 700); return b; }
function horn(g) { const a = g.audio; if (!a.tone) return; a.tone(146, 2.2, 'sawtooth', .07, undefined, .05); a.tone(185, 2.2, 'sawtooth', .05, undefined, .05); a.tone(220, 2.2, 'square', .025, undefined, .05); }

const ALL = ['dad', 'nia', 'mom', 'reyes', 'danny'];
const FIGHT = ['dad', 'reyes'];
const BOX = [[-9.5, -7160], [9.5, -7154], [-9.5, -7206], [9.5, -7210], [1.5, -7176]];
export const steps = [
  { id: 'c22_gate', ch: 22, cp: [0, -7112, PI], obj: '', hint: '', mood: 'tense', beat: 0,
    enter(g) {
      const D = g.stepData; g.openGate(true); D.lobster = false; cast(g, D, 0, -7108, ALL); giveHammer(D.dad, false); headlight(false);
      place(g.player, -.4, -7112, PI); place(D.dad, 1.5, -7111, PI); place(D.nia, -2, -7111.4, PI); place(D.mom, -3.2, -7110.4, PI); place(D.reyes, 2.8, -7109.8, PI); place(D.danny, 4.2, -7110.6, -PI * .8);
      g.cut = { anim: 'Idle_Loop', cam: V(1.4, 1.65, -7116.2), look: V(-.2, 1.45, -7111.2), flash: false }; snap(g);
      script(g, [
        (g) => { g.audio.staticBurst && g.audio.staticBurst(.8); },
        ['dube', "Porch light's on, Riverside. Tuck and me have the gym. Go get your doctor."],
        (g) => { cam(g, V(3.2, 1.65, -7116), V(1.8, 1.5, -7111.2)); },
        ['reyes', "The helicopter's dry and the coast road is a parking lot. This line runs straight to the Portland docks."],
        (g) => { act(D.dad, 'hold', { sides: 'R', k: .6 }); cam(g, V(3.4, 1.7, -7117.4), V(1.5, 1.5, -7111)); },
        ['marcus', "Old Number Nine. I used to watch her go by with you on my shoulders, Keem."],
        (g) => { act(D.dad, null); cam(g, V(-1.8, 1.65, -7116.6), V(-.4, 1.5, -7112)); },
        ['keem', "Then let's see if she still runs."],
        (g) => { cam(g, V(5.6, 1.65, -7115.2), V(4.2, 1.5, -7110.6)); face(D.danny, -.4, -7112); },
        ['danny', "Good news, I can drive a train. Bad news, I learned on a video game."],
        ['dana', "Danny."],
        ['danny', "It was a very realistic video game!"],
        (g) => { cam(g, V(-1.4, 1.15, -7115.6), V(-2, .95, -7111.4)); },
        ['nia', "Biscuit's never been on a train. He's going to love it."],
        (g) => { g.cut = null; goto(g, 'c22_parts', 120); },
      ]);
    },
    update(g, dt) { tickMv(g, g.stepData, dt); } },

  { id: 'c22_parts', ch: 22, cp: [0, -7124, PI], obj: 'Get Old Number Nine running (0/3)', hint: 'A battery in the signal tower, a coupling pin in the open boxcar, and diesel from the tanker. Follow the marker.', mood: 'tense', beat: 2,
    enter(g) {
      const D = g.stepData; g.openGate(true); D.lobster = false; cast(g, D, 0, -7124, FIGHT); followAll(g, D, FIGHT); giveHammer(D.dad, false); headlight(false); D.n = 0;
      const PARTS = [
        { id: 'batt', x: A.batt[0], z: A.batt[1], label: 'Take the battery', toast: 'Battery', next: (g) => { grayHorde(g, 7, BOX, { runner: true }); g.say([['reyes', "The boxcars! They were sleeping in the boxcars!"], ['marcus', "Then wake-up call's over."]]); } },
        { id: 'pin', x: 1.6, z: -7232, label: 'Grab the coupling pin', toast: 'Coupling pin', next: (g) => { [[.4, -7228], [.2, -7236], [-1, -7240], [-2, -7224]].forEach(([x, z]) => spawnGray(g, x, z, { runner: false, aggro: 99 })); g.say([['keem', "It was dark in there. Something was breathing."]]); } },
        { id: 'fuel', x: 9.6, z: -7266, label: 'Pump the diesel', toast: 'Diesel', next: (g) => { squad(g, [[-6, -7300], [6, -7306], [0, -7312]], { hp: 100 }); g.audio.staticBurst && g.audio.staticBurst(1); g.say([['hale', "Riverside rail yard, this is the Sentinel. You have something of mine, boy. A rabbit."], ['keem', "He's not yours. He's never been yours."], ['hale', "Scouts. Bring me the animal."]]); } },
      ];
      const refresh = () => { D.uses = PARTS.filter(p => !p.done).map(p => ({ x: p.x, z: p.z, r: 2.4, label: p.label, fn: () => take(p) })); const nx = PARTS.find(p => !p.done); g.wpTarget = nx ? [nx.x, 1.4, nx.z] : null; };
      const take = (p) => { if (p.done) return; p.done = true; D.n++; g.audio.click && g.audio.click(); g.toast(p.toast + ' ' + D.n + '/3', 1.6); g.objective('Get Old Number Nine running (' + D.n + '/3)', D.n < 3 ? 'Next part — follow the marker.' : 'Get them to the engine.'); p.next(g); refresh();
        if (D.n === 3) { D.won = true; D.wonT = g.t; } };
      refresh(); grayHorde(g, 5, [[-6, -7150], [6, -7158], [0, -7166]]);
      g.say([['marcus', "I'll keep them off you. You find the parts."]]);
    },
    update(g, dt) { const D = g.stepData; hammerTick(g, D, dt); allyTick(g, D, 'reyes', dt, { dmg: 28, cd: 1.5 });
      if (!D.won) keepUp(g, D, dt, 3, () => grayHorde(g, 3, [BOX[(Math.random() * BOX.length) | 0], [0, -7130]]), 3.4);
      if (D.won && g.t - D.wonT > 3 && g.alive().length === 0) clearThen(g, D, 'c22_switch', 320, 'Take the parts to the engine'); } },

  { id: 'c22_switch', ch: 22, cp: [-1.6, -7298, PI], obj: 'Throw the track switches (0/2)', hint: 'Two red levers between the tracks. The main line has to be clear all the way to Portland.', mood: 'tense', beat: 3,
    enter(g) {
      const D = g.stepData; g.openGate(true); D.lobster = false; cast(g, D, -1.6, -7298, ['dad', 'reyes', 'danny']); followAll(g, D, FIGHT); giveHammer(D.dad, false); headlight(true); place(D.danny, -4, -7311, PI); D.danny.root.visible = false; D.n = 0;
      const refresh = () => { D.uses = A.levers.filter(L => !L.on).map(L => ({ x: L.x - .6, z: L.z + 1, r: 2.3, label: 'Throw the switch', fn: () => thr(L) })); const nx = A.levers.find(L => !L.on); g.wpTarget = nx ? [nx.x, 1.2, nx.z + 1] : null; };
      const thr = (L) => { if (L.on) return; L.set(); D.n++; g.audio.thud && g.audio.thud(); g.toast('Switch ' + D.n + '/2', 1.6); g.objective('Throw the track switches (' + D.n + '/2)', D.n < 2 ? 'One more lever.' : 'Main line is clear.'); refresh();
        if (D.n === 1) { grayHorde(g, 8, [[-30, -7280], [30, -7290], [0, -7340]], { runner: true }); g.say([['danny', "Engine's warm! Whatever you're doing out there, do it faster!"]]); }
        if (D.n === 2) { D.won = true; D.wonT = g.t; horn(g); g.shake(.3); g.say([['reyes', "Was that the train?"], ['danny', "That wasn't me! I didn't touch the horn!"]]); } };
      refresh(); g.say([['danny', "I'm in the cab! I found the throttle! I think! Throw those switches!"]]);
    },
    update(g, dt) { const D = g.stepData; hammerTick(g, D, dt); allyTick(g, D, 'reyes', dt, { dmg: 28, cd: 1.5 });
      if (!D.won) keepUp(g, D, dt, 4, () => grayHorde(g, 3, [[-30, -7270], [30, -7276], [0, -7360]]), 3);
      if (D.won && g.t - D.wonT > 3.5 && !D.go) { D.go = true; goto(g, 'c22_yard', 300); } } },

  { id: 'c22_yard', ch: 22, cp: [0, -7288, PI], obj: 'Stop the Yardmaster', hint: 'Orange lane = he is about to charge. Get out of it — if he slams into a boxcar he is winded, and takes double damage.', mood: 'tense', beat: 3,
    enter(g) {
      const D = g.stepData; g.openGate(true); cast(g, D, 0, -7288, FIGHT); giveHammer(D.dad, false); headlight(true);
      place(g.player, -.4, -7290, 0); place(D.dad, 1.6, -7291, 0); place(D.reyes, -2.8, -7292, 0);
      const b = yardBoss(g, D); b.st = 'script'; b.root.position.set(0, 0, -7262); b.root.rotation.y = PI; D.cd = 4.5; D.horn = 15; D.winded = 0;
      g.cut = { anim: 'Idle_Loop', cam: V(2.4, 1.6, -7293.6), look: V(0, 2.4, -7262), flash: false }; snap(g);
      script(g, [
        (g) => { horn(g); g.shake(.25); },
        ['yard', "All aboard."],
        (g) => { cam(g, V(-1.4, 1.6, -7287.2), V(-.4, 1.45, -7290)); },
        ['keem', "That's the guy who blew the horn."],
        (g) => { cam(g, V(3.6, 1.6, -7287.6), V(1.6, 1.5, -7291)); },
        ['marcus', "Mr. Pike. He ran this yard for forty years. Gave me a ride in the cab when I was ten."],
        ['marcus', "Sorry, Mr. Pike. We need your train."],
        (g) => { g.cut = null; b.st = 'chase'; D.on = true; followAll(g, D, FIGHT); },
      ]);
    },
    update(g, dt) { const D = g.stepData, b = D.b; tickRings(g, D, dt); if (!D.on) return; hammerTick(g, D, dt, { dmg: 60 }); allyTick(g, D, 'reyes', dt, { dmg: 24, cd: 1.6 });
      if (!b || b.dead) { if (b && b.dead && !D.won) { D.won = true; D.dash = null; D.rings && D.rings.forEach(r => g.scene.remove(r.m)); D.rings = []; g.say([['marcus', "End of the line, Mr. Pike. Rest easy."]]); afterBoss(g, () => goto(g, 'c22_depart', 500)); } return; }
      if (g.cut) return;
      if (D.winded > 0) { D.winded -= dt; if (D.winded <= 0) { b.st = 'chase'; b.speed = 1.5; } }
      if (D.dash) { const p = b.root.position, s = 11 * dt; const nx = p.x + D.dash.dx * s, nz = p.z + D.dash.dz * s; D.dash.t -= dt;
        if (g.inCol && g.inCol(nx, nz, .9)) { D.dash = null; D.winded = 3.4; b.stun = 3.4; g.shake(.5); g.audio.crash && g.audio.crash(); g.toast('He slammed into the boxcar — hit him now!', 2); b.play && b.play('Hit_Head', { once: true, force: true }); }
        else { p.x = nx; p.z = nz; b.root.rotation.y = Math.atan2(D.dash.dx, D.dash.dz); b.play && b.play('Sprint_Loop'); if (D.dash.t <= 0) { D.dash = null; D.winded = 1.6; b.stun = 1.2; g.toast('Winded — hit him!', 1.2); } } return; }
      if (D.winded > 0) return;
      D.cd -= dt; if (D.cd <= 0 && !D.tele) { D.cd = b.hp < b.maxHp * .5 ? 4.2 : 5.6; const p = b.root.position, P = g.player.root.position; const dx = P.x - p.x, dz = P.z - p.z, d = Math.hypot(dx, dz) || 1;
        D.tele = true; b.st = 'script'; b.play && b.play('Idle_Loop'); b.root.rotation.y = Math.atan2(dx, dz); g.toast('He is charging — get out of the lane!', 1.2); lane(g, D, p.x, p.z, P.x, P.z, { n: 6, r: 1.5, life: 1.1, color: '#ff8a20', dmg: 28 });
        setTimeout(() => { D.tele = false; if (b && !b.dead && D.on) D.dash = { dx: dx / d, dz: dz / d, t: Math.min(1.35, (d + 3) / 11) }; }, 1000); }
      D.horn -= dt; if (D.horn <= 0) { D.horn = 16; horn(g); g.toast('The yard horn — they are coming', 1.8); grayHorde(g, b.hp < b.maxHp * .5 ? 6 : 4, [[-30, -7270], [30, -7280], [0, -7240]], { runner: true }); }
      if (!D.half && b.hp < b.maxHp * .5) { D.half = true; g.say([['yard', "Tickets. Tickets, please."], ['reyes', "He's slowing down after every charge. Make him miss!"]]); } } },

  { id: 'c22_depart', ch: 22, cp: [-6.6, -7300, PI], obj: '', hint: '', mood: 'sad', beat: 0,
    enter(g) {
      const D = g.stepData; g.openGate(true); D.lobster = false; cast(g, D, -6.6, -7300, ALL); giveHammer(D.dad, false); headlight(true);
      // riders in the gondola (deck y 1.25). The player hides; a stand-in with the same look rides with the family.
      let look = null; try { look = JSON.parse(g._lookKey); } catch (e) { /* default */ } D.keem = g.npc('keem_ride22', look && look.hair ? look : 'keem', -4, -7300, PI, 'Idle_Loop', .9);
      g.player.root.visible = false; place(g.player, -7.5, -7290, PI);
      const T0 = A.train, gz = T0.z + T0.gz; D.riders = [[D.keem, -4.5, gz - 1.6, PI * .9], [D.dad, -3.4, gz - 2.4, PI], [D.nia, -4.7, gz - .2, PI * .6], [D.mom, -3.5, gz + .4, PI * .8], [D.reyes, -3.6, gz + 2.2, PI * 1.1], [D.danny, -4, T0.z + 4.2, PI]];
      D.riders.forEach(([c, x, z, r]) => { place(c, x, z, r); c.root.position.y = c === D.danny ? 1.25 : 1.32; });
      D.o = 0; D.v = 0; D.shot = 0;
      const SH = D.SH = [
        [[4.6, 3.2, gz + 6], [-4, 2.2, gz - 2]], [[-1.6, 2.9, gz - 3.4], [-4.5, 2.3, gz - 1.6]], [[-2.4, 2.7, gz + 1.8], [-4.6, 1.95, gz - .2]], [[-1.8, 2.9, gz + 3], [-3.5, 2.5, gz + .4]],
        [[-1.4, 2.9, gz - 3.6], [-4.4, 2.5, gz - 1.6]], [[-1.6, 2.9, gz + 4.4], [-3.6, 2.5, gz + 2.2]], [[-2, 2.6, gz + 1.2], [-4.6, 1.9, gz - .2]], [[-1.4, 2.9, gz - 4.2], [-3.4, 2.5, gz - 2.4]],
        [[-.6, 3.25, T0.z + 4.4], [-4, 2.95, T0.z + 4.2]], [[10, 6, gz + 22], [-4, 2, T0.z - 30]]];
      g.cut = { anim: 'Idle_Loop', cam: V(...SH[0][0]), look: V(...SH[0][1]), flash: false }; snap(g);
      const sh = (i) => (g) => { D.shot = i; };
      script(g, [
        (g) => { horn(g); g.audio.engine && g.audio.engine(true, .5); D.roll = true; },
        ['danny', "Throttle's this one. Probably. Everybody hold onto something!"],
        sh(1), ['keem', "We're moving. She actually runs."],
        sh(2), ['nia', "Biscuit, we're on a train! Look, look out the side!"],
        sh(3), ['dana', "When this is done, I want one boring week. Board games. Burnt pancakes. Nobody gets bitten."],
        sh(4), ['keem', "Deal. You're still the worst at Monopoly."],
        sh(5), ['reyes', "If Vance is right, the rabbit beat the gray in a dish. That makes Biscuit the cure for the cure."],
        sh(6), ['nia', "He's not a cure. He's my bunny."],
        sh(7), ['marcus', "He can be both, baby girl."],
        sh(8), ['danny', "Portland, next stop! I've always wanted to say that."],
        sh(9), (g) => { setTimeout(() => { g.audio.engine && g.audio.engine(false); g.player.root.visible = true; g.onComplete && g.onComplete(22); }, 2600); },
      ]);
    },
    update(g, dt) { const D = g.stepData; if (!D.SH) return; if (D.roll) { D.v = Math.min(D.shot >= 9 ? 9 : 3.2, D.v + dt * .6); D.o = Math.max(-74, D.o - D.v * dt); }
      const T0 = A.train; T0.g.position.z = T0.z + D.o; D.riders.forEach(([c, x, z]) => { c.root.position.z = z + D.o; c.root.position.x = x; c.root.position.y = c === D.danny ? 1.25 : 1.32 + Math.sin(g.t * 9 + x) * .008 * D.v; });
      const s = D.SH[Math.min(D.shot, D.SH.length - 1)]; if (g.cut) { g.cut.cam = V(s[0][0], s[0][1], s[0][2] + D.o); g.cut.look = V(s[1][0], s[1][1], s[1][2] + D.o); if (D.shot === 0 || D._ls !== D.shot) { D._ls = D.shot; g.camera.position.copy(g.cut.cam); } } } },
];

export const loot = [
  { id: 'c22a', kind: 'ammo', item: 'rifle', n: 70, pos: [-8, .25, -7140], at: 'c22_parts' },
  { id: 'c22b', kind: 'med', pos: [-22, .25, -7196], at: 'c22_parts' },
  { id: 'c22c', kind: 'grenade', n: 3, pos: [8, .25, -7240], at: 'c22_parts' },
  { id: 'c22d', kind: 'ammo', item: 'shell', n: 22, pos: [16.4, .25, -7258], at: 'c22_parts' },
  { id: 'c22e', kind: 'med', pos: [-8, .25, -7280], at: 'c22_yard' },
  { id: 'c22f', kind: 'cash', n: 700, pos: [-28.6, .25, -7196], at: 'c22_parts' },
  pg(-30, -7288, 'Captain Riverside #31: "The Midnight Freight"', 'c22_parts'),
];
