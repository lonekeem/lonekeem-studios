// Chapter 24 · The Good Kind — Portland Head Light, before sunrise. Danny beaches the lifeboat below Fort Williams. Fight up
// the cliff path, break Hale's three strain tanks on the fog mast, beat Commodore Hale — who opens the last cage — and put down
// the Gray, the first carrier, with Vance's Biscuit-dose darts and Dad's hammer. Sunrise at the lighthouse. THE END.
// World band z -7900..-8200.
import * as THREE from 'three';
import { PI, V, dist2, goto, afterBoss, clearThen, boss, pg, rnd, $q } from './helpers.js';
import { walk, tickMv, cam, snap, script, cast, followAll, place, face, act, allyTick, holdTick, keepUp, ring, tickRings, squad, spawnAuth, paintAuth, shieldOn, helmOn, dawn, card, hideCard } from './ch15_kit.js';
import { mats, floor, prop, lamp, wallX, wallZ, crate } from './kit/common.js';
import { tree, house } from './kit/town.js';
import { hammerTick } from './kit/finale.js';
import { giveHammer } from '../hands.js';
import { spawnBiscuit, hopTo } from './ch13_rabbit.js';
import { grayify, spawnGray, grayHorde, strainTank, dartTick, dry } from './ch21_kit.js';

export const meta = { n: 24, title: 'The Good Kind', endQuote: '“He\'s a very good bunny.”', nextTeaser: 'The End — thank you for playing. A Lone Keem Studios game.' };
export const speakers = { hale: 'Commodore Hale' };
export const Z0 = -7912;
const LH = [0, -8138];
let A = null;

export function buildZone(ctx) {
  const K = mats(ctx), T = ctx.THREE; A = { tanks: [] };
  const water = new T.MeshStandardMaterial({ color: '#2a4a5a', roughness: .14, metalness: .4, emissive: '#081820' }), sand = new T.MeshStandardMaterial({ color: '#b8a888', roughness: 1 }), grass = new T.MeshStandardMaterial({ color: '#4a6a3e', roughness: 1 });
  const rockM = new T.MeshStandardMaterial({ color: '#6a6660', roughness: 1 }), rockD = new T.MeshStandardMaterial({ color: '#4e4a46', roughness: 1 });
  // the sea: north of the beach and both sides of the headland
  [[0, -7884, 140, 40], [-62, -8050, 60, 320], [62, -8050, 60, 320]].forEach(([x, z, w, d]) => { const m = new T.Mesh(new T.PlaneGeometry(w, d), water); m.rotation.x = -PI / 2; m.position.set(x, .032, z); ctx.scene.add(m); });
  ctx.updaters.push((dt, t) => { water.emissiveIntensity = .8 + Math.sin(t * .6) * .2; });
  // beach + the beached lifeboat
  floor(ctx, 0, -7922, 64, 36, sand, .021); { const lb = new T.Mesh(new T.CapsuleGeometry(1, 4, 4, 10), new T.MeshStandardMaterial({ color: '#e8641a', roughness: .6 })); lb.rotation.set(PI / 2, 0, .3); lb.position.set(6, .6, -7910); ctx.scene.add(lb); ctx.box(4.4, 7.6, -7913, -7907); }
  // the cliff path: rock walls both sides, climbing toward the fort
  floor(ctx, 0, -7972, 12, 64, new T.MeshStandardMaterial({ color: '#7a6e5a', roughness: 1 }), .022);
  const rock = (x, z, s, m = rockM) => { const r = new T.Mesh(new T.DodecahedronGeometry(s, 0), m); r.position.set(x, s * .45, z); r.rotation.set(x, z, 0); r.castShadow = true; ctx.scene.add(r); ctx.box(x - s * .8, x + s * .8, z - s * .8, z + s * .8); };
  for (let i = 0; i < 14; i++) { const z = -7942 - i * 4.4; rock(-9 - (i % 3), z, 2.6 + (i % 2), i % 2 ? rockM : rockD); rock(9 + (i % 2) * 1.5, z - 2, 2.4 + (i % 3) * .5, i % 2 ? rockD : rockM); }
  for (let i = 0; i < 8; i++) { rock(-30 + i * 2, -7940 - (i % 3), 3 + (i % 2)); rock(30 - i * 2, -7942 - (i % 2), 3 + (i % 3) * .4); }
  // the headland: grass, a stone wall at the cliff edges, the old fort battery ruins
  floor(ctx, 0, -8075, 66, 150, grass, .02);
  [-1, 1].forEach(s => { for (let z = -8004; z > -8150; z -= 3) prop(ctx, .9, .8, 3, rockD, s * 32, .4, z, true); for (let i = 0; i < 10; i++) rock(s * (36 + (i % 3)), -8010 - i * 14, 2.4 + (i % 2)); });
  wallX(ctx, -33, 33, -8152, .9, rockD); for (let i = 0; i < 12; i++) rock(-30 + i * 5.4, -8158, 2.2 + (i % 3) * .4);
  { const con = new T.MeshStandardMaterial({ color: '#8a8478', roughness: .95 }); prop(ctx, 12, 3, 5, con, -20, 1.5, -8040, true); prop(ctx, 2.6, 2, .3, new T.MeshStandardMaterial({ color: '#1a1a1a' }), -20, 1, -8037.4); prop(ctx, 14, .4, 6, con, -20, 3.2, -8040); ctx.sign(['BATTERY BLAIR · 1903'], -20, 2.4, -8037.3, 0, 3.2, .5, '#5a5448'); }
  // keeper's house (white, red roof) + the lighthouse tower with a turning beam
  house(ctx, -14, -8126, { facing: 'e', col: '#eeeae0', roof: '#a8261c', trim: '#ffffff', seed: 71, lit: .5, porch: false, w: 8, d: 10 });
  { const [x, z] = LH, wM = new T.MeshStandardMaterial({ color: '#f2eee4', roughness: .6 }), dk = new T.MeshStandardMaterial({ color: '#2a2a2a', metalness: .5, roughness: .5 });
    const tw = new T.Mesh(new T.CylinderGeometry(1.9, 2.8, 20, 18), wM); tw.position.set(x, 10, z); tw.castShadow = true; ctx.scene.add(tw); ctx.box(x - 2.6, x + 2.6, z - 2.6, z + 2.6);
    const gal = new T.Mesh(new T.CylinderGeometry(2.6, 2.6, .25, 18), dk); gal.position.set(x, 20.1, z); ctx.scene.add(gal);
    const lr = new T.Mesh(new T.CylinderGeometry(1.5, 1.5, 2.2, 14), new T.MeshStandardMaterial({ color: '#203038', emissive: '#fff0c0', emissiveIntensity: 1.4, transparent: true, opacity: .8 })); lr.position.set(x, 21.4, z); ctx.scene.add(lr);
    const cap = new T.Mesh(new T.ConeGeometry(1.8, 1.6, 14), dk); cap.position.set(x, 23.3, z); ctx.scene.add(cap); prop(ctx, 1.2, 2.2, .1, new T.MeshStandardMaterial({ color: '#1a2a3a' }), x, 1.1, z + 2.7);
    const beam = new T.Mesh(new T.ConeGeometry(5, 70, 16, 1, true), new T.MeshBasicMaterial({ color: '#fff4c8', transparent: true, opacity: .07, depthWrite: false, side: T.DoubleSide })); beam.geometry.translate(0, -35, 0); beam.rotation.z = PI / 2; const piv = new T.Group(); piv.position.set(x, 21.4, z); piv.add(beam); ctx.scene.add(piv); A.beam = beam;
    ctx.updaters.push((dt) => { piv.rotation.y += dt * .45; }); }
  // Hale's fog mast: lattice mast + horn, hoses to three strain tanks; white Authority trucks, floodlights
  { const mx = 12, mz = -8098; for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4; const l = new T.Mesh(new T.CylinderGeometry(.08, .14, 12, 6), K.steel); l.position.set(mx + Math.cos(a) * .9, 6, mz + Math.sin(a) * .9); ctx.scene.add(l); } ctx.box(mx - 1, mx + 1, mz - 1, mz + 1);
    for (let y = 1.5; y < 12; y += 2) { const r = new T.Mesh(new T.TorusGeometry(1.25, .05, 4, 4), K.steel); r.rotation.x = PI / 2; r.rotation.z = PI / 4; r.position.set(mx, y, mz); ctx.scene.add(r); }
    const horn = new T.Mesh(new T.ConeGeometry(.8, 2, 14, 1, true), new T.MeshStandardMaterial({ color: '#c8c8c0', metalness: .6, roughness: .4, side: T.DoubleSide })); horn.rotation.z = PI / 2; horn.position.set(mx - 1, 12, mz); ctx.scene.add(horn);
    A.mastLamp = new T.MeshStandardMaterial({ color: '#300', emissive: '#ff3a20', emissiveIntensity: 2.5 }); const ml = new T.Mesh(new T.SphereGeometry(.25, 10, 8), A.mastLamp); ml.position.set(mx, 12.8, mz); ctx.scene.add(ml);
    [[4, -8090], [20, -8092], [12, -8112]].forEach(([x, z]) => { A.tanks.push(strainTank(ctx, x, z, { h: 2.6, r: .9 })); const dx = mx - x, dz = mz - z, d = Math.hypot(dx, dz); const hose = new T.Mesh(new T.CylinderGeometry(.08, .08, d, 6), K.black); hose.position.set((x + mx) / 2, .15, (z + mz) / 2); hose.rotation.set(PI / 2, 0, -Math.atan2(dx, dz)); hose.rotation.order = 'YXZ'; hose.rotation.y = Math.atan2(dx, dz); hose.rotation.x = PI / 2; hose.rotation.z = 0; ctx.scene.add(hose); }); }
  [[-22, -8070, PI / 2], [22, -8060, -PI / 2], [-6, -8090, PI * .1]].forEach(([x, z, r]) => ctx.car(x, z, r, '#e8e8ea'));
  [[-14, -8084], [24, -8110]].forEach(([x, z], i) => { prop(ctx, .2, 5, .2, K.steelDark, x, 2.5, z, true); lamp(ctx, x, z + .4, { y: 5, real: i === 0, color: '#f0f4ff', intensity: 10, range: 24, size: [1, .3, .5] }); });
  // the last cage (the Gray)
  { const bar = new T.MeshStandardMaterial({ color: '#5a6064', metalness: .7, roughness: .4 }); const cx = -6, cz = -8114, w = 4.4; for (let i = 0; i <= 8; i++) { const t = i / 8; [[cx - w / 2 + w * t, cz + w / 2], [cx - w / 2 + w * t, cz - w / 2], [cx - w / 2, cz - w / 2 + w * t], [cx + w / 2, cz - w / 2 + w * t]].forEach(([bx, bz]) => { const b = new T.Mesh(new T.CylinderGeometry(.04, .04, 3.4, 5), bar); b.position.set(bx, 1.7, bz); ctx.scene.add(b); }); }
    const top = new T.Mesh(new T.BoxGeometry(w, .1, w), bar); top.position.set(cx, 3.4, cz); ctx.scene.add(top); A.cageDoor = new T.Mesh(new T.BoxGeometry(w * .6, 3.2, .06), new T.MeshStandardMaterial({ color: '#5a6064', metalness: .7, roughness: .4, wireframe: true })); A.cageDoor.position.set(cx, 1.6, cz + w / 2 + .02); ctx.scene.add(A.cageDoor);
    prop(ctx, .3, 1.2, .3, K.steelDark, cx + 3, .6, cz + 2.6); prop(ctx, .3, .3, .1, K.red, cx + 3, 1.1, cz + 2.78); }
  for (let i = 0; i < 6; i++) tree(ctx, -28 + (i % 2) * 4, -8020 - i * 18, 1.3, '#2e4a30');
}

// ---------- bosses ----------
function haleBoss(g, D) { const b = g.spawnZ(12, -8082, { boss: true, raider: true, hp: 3000, scale: 1.45, gun: 'rifle', shirt: '#1e2a44', runner: false }); b.cd = 2; b.aggro = 99; b.speed = 1.6; g.boss = b; D.b = b;
  $q('#bossn').textContent = 'COMMODORE HALE — Harbor Authority'; paintAuth(b, '#1e2a44', '#1a1e28'); helmOn(b, '#e8e8e2'); return b; }
function grayBoss(g, D, x, z) { const b = g.spawnZ(x, z, { boss: true, fem: true, hp: 6400, scale: 2.15, runner: false }); b.cd = 2; b.aggro = 99; b.speed = 1.6; g.boss = b; D.b = b; $q('#bossn').textContent = 'THE GRAY — the first carrier';
  const u = b.mat && b.mat.userData && b.mat.userData.u; if (u) { if (u.uShirt) u.uShirt.value.set('#c8ccd0'); if (u.uPants) u.uPants.value.set('#a8acb0'); } grayify(b); if (u && u.uBlood) u.uBlood.value = .35; const hm = []; b.root.traverse(o => { if (o.material && !Array.isArray(o.material) && (o.material.name === 'Material_0' || o.material.vertexColors)) { o.material = o.material.clone(); hm.push(o.material); } });
  D.tint = (weak) => { if (u && u.uSkin) u.uSkin.value.set(weak ? '#5a8ac8' : '#8e989e'); hm.forEach(m => m.color.set(weak ? '#7aa0e0' : '#a4acb2')); }; D.tint(false); b.armor = (o) => (!D.on ? 0 : D.weak > 0 ? 1.6 : (o.boom ? .5 : .25)); g.audio.roar && setTimeout(() => g.audio.roar(b), 600); return b; }

const ALL = ['dad', 'nia', 'mom', 'reyes', 'danny'];
const FIGHT = ['dad', 'reyes', 'mom'];
const sun = (g, D, dt, to) => { D.dw = Math.min(to, (D.dw == null ? .25 : D.dw) + dt * .005); dawn(g, D.dw); };
const vance = (g, D, x, z, r = PI) => { D.vance = g.npc('vance', 'vance', x, z, r, 'Idle_Loop'); return D.vance; };
export const steps = [
  { id: 'c24_beach', ch: 24, cp: [0, -7914, PI], obj: '', hint: '', mood: 'sad', beat: 0, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); dry(g); D.lobster = false; cast(g, D, 0, -7912, ALL); vance(g, D, 4.4, -7915); giveHammer(D.dad, false); D.dw = .25; dawn(g, .25);
      place(g.player, -.4, -7918, PI); place(D.dad, 1.5, -7917, PI); place(D.nia, -2, -7917.4, PI); place(D.mom, -3.2, -7916.4, PI); place(D.reyes, 2.8, -7915.8, PI); place(D.danny, 5.6, -7912.2, -PI * .7); place(D.vance, 4.2, -7916.8, PI * .9);
      g.cut = { anim: 'Idle_Loop', cam: V(3.4, 1.7, -7922.6), look: V(3.8, 1.45, -7916.6), flash: false }; snap(g);
      script(g, [
        ['vance', "Six darts. Biscuit dose. It won't cure them, but it slows the gray long enough to hurt."],
        (g) => { cam(g, V(3.2, 1.65, -7920.4), V(2.8, 1.5, -7915.8)); },
        ['reyes', "And the moment this is over, the recipe goes on the radio."],
        (g) => { act(D.dad, 'hold', { sides: 'R', k: .6 }); cam(g, V(.6, 1.7, -7921.8), V(1.5, 1.5, -7917)); face(D.dad, -.4, -7918); },
        ['marcus', "Last time I was on this beach, I told you to run, son."],
        (g) => { cam(g, V(1.2, 1.65, -7920.6), V(-.4, 1.5, -7918)); face(g.player, 1.5, -7917); },
        ['keem', "I remember."],
        (g) => { cam(g, V(.6, 1.7, -7921.8), V(1.5, 1.5, -7917)); },
        ['marcus', "Don't. Not today. Today you stay right next to me."],
        (g) => { act(D.dad, null); cam(g, V(-2, 1.65, -7921.4), V(-3.2, 1.5, -7916.4)); },
        ['dana', "We all do."],
        (g) => { cam(g, V(4.4, 1.6, -7908.8), V(5.6, 1.45, -7912.2)); },
        ['danny', "I'll guard the boat. Bravely. From inside the boat."],
        (g) => { cam(g, V(-1.2, 1.15, -7920.2), V(-2, .95, -7917.4)); face(D.nia, -.4, -7918); },
        ['nia', "Biscuit says be careful. And come back."],
        (g) => { cam(g, V(-2, 1.6, -7920.8), V(-.4, 1.5, -7918)); },
        ['keem', "Tell him we always come back."],
        (g) => { g.cut = null; goto(g, 'c24_climb', 120); },
      ]);
    },
    update(g, dt) { const D = g.stepData; tickMv(g, D, dt); sun(g, D, dt, .3); } },

  { id: 'c24_climb', ch: 24, cp: [0, -7930, PI], obj: 'Fight up to the lighthouse', hint: 'Up the cliff path. Dad has the hammer, Dr. Reyes covers you, and Vance\'s darts slow the gray.', mood: 'tense', beat: 3, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); dry(g); cast(g, D, 0, -7930, FIGHT); followAll(g, D, FIGHT); vance(g, D, 2, -7928); giveHammer(D.dad, false); D.dw = .3; dawn(g, .3);
      { const fv = D.vance; fv.update = null; D._vf = true; } grayHorde(g, 7, [[-4, -7956], [4, -7960], [0, -7966]]); D.next = -7966; g.wpTarget = [0, 1.2, -8012];
      g.say([['marcus', "Right next to me, Keem. Every step."]]);
    },
    update(g, dt) { const D = g.stepData; sun(g, D, dt, .4); hammerTick(g, D, dt); allyTick(g, D, 'reyes', dt, { dmg: 30, cd: 1.4 }); dartTick(g, D, 'vance', dt, { cd: 2.6 });
      if (D.vance) { const P = g.player.root.position, v = D.vance.root.position, dx = P.x + 2.4 - v.x, dz = P.z + 2.2 - v.z, d = Math.hypot(dx, dz); if (d > 1.4) { const s = Math.min(d, (d > 5 ? 5 : 2.8) * dt); v.x += dx / d * s; v.z += dz / d * s; D.vance.root.rotation.y = Math.atan2(dx, dz); D.vance.play(d > 4 ? 'Jog_Fwd_Loop' : 'Walk_Loop'); } else if (!g.cut) D.vance.play('Idle_Loop'); }
      const pz = g.player.root.position.z;
      if (D.next && pz < D.next + 26) { const z = D.next - 26; grayHorde(g, 7, [[-4, z], [4, z - 4], [0, z - 8]], { runner: D.next < -7990 }); if (D.next === -7992) { squad(g, [[-4, -8030], [4, -8030], [0, -8036]], { hp: 100 }); g.say([['dana', "Troopers up top! By the old fort!"]]); } D.next = D.next > -8000 ? D.next - 26 : null; }
      if (!D.next && pz < -8000 && g.alive().length === 0) clearThen(g, D, 'c24_tanks', 300, 'Get to the fog mast'); } },

  { id: 'c24_tanks', ch: 24, cp: [4, -8070, PI], obj: 'Break the strain tanks (0/3)', hint: 'Three tanks feed the fog mast. Get close and open each red valve.', mood: 'tense', beat: 3, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); dry(g); cast(g, D, 4, -8070, FIGHT); followAll(g, D, ['dad', 'reyes', 'mom']); vance(g, D, 6, -8068); giveHammer(D.dad, false); D.dw = .45; dawn(g, .45); D.n = 0; A.tanks.forEach(t => { if (!t.alive) { /* fresh set every load */ } });
      const refresh = () => { D.uses = A.tanks.filter(t => t.alive && !t.gone).map(t => ({ x: t.x, z: t.z + 1.6, r: 2.4, label: 'Open the valve', fn: () => brk(t) })); const nx = A.tanks.find(t => t.alive && !t.gone); g.wpTarget = nx ? [nx.x, 1.4, nx.z + 1.6] : null; };
      const brk = (t) => { if (t.gone) return; t.gone = true; t.kill(); D.n++; g.audio.staticBurst && g.audio.staticBurst(.6); g.shake(.2); g.toast('Tank ' + D.n + '/3 drained', 1.6); g.objective('Break the strain tanks (' + D.n + '/3)', D.n < 3 ? 'Next tank.' : 'The mast is dry.'); refresh();
        if (D.n === 1) { squad(g, [[-8, -8104], [8, -8120], [20, -8080]], { hp: 100 }); g.say([['hale', "Careful, boy. That's a year of work you're pouring on the grass."]]); }
        if (D.n === 2) { grayHorde(g, 8, [[-28, -8060], [28, -8070], [0, -8146]], { runner: true }); g.say([['vance', "Two down. The mast is losing pressure!"]]); }
        if (D.n === 3) { D.won = true; D.wonT = g.t; if (A.mastLamp) A.mastLamp.emissiveIntensity = 0; g.say([['reyes', "That's all three. It's dry. The foghorn's got nothing to spray."], ['hale', "Then I'll do this the old-fashioned way."]]); } };
      A.tanks.forEach(t => { t.gone = false; }); refresh(); squad(g, [[6, -8096], [16, -8100]], { hp: 100 }); grayHorde(g, 5, [[-10, -8090], [0, -8110]]);
      g.say([['vance', "Open the valves. Every drop on the ground is a drop not in the air."]]);
    },
    update(g, dt) { const D = g.stepData; sun(g, D, dt, .55); hammerTick(g, D, dt); allyTick(g, D, 'reyes', dt, { dmg: 28, cd: 1.5 }); dartTick(g, D, 'vance', dt, { cd: 2.6 });
      if (!D.won) keepUp(g, D, dt, 3, () => grayHorde(g, 3, [[-28, -8070], [28, -8080], [0, -8146]]), 3.4);
      if (D.won && g.t - D.wonT > 3 && g.alive().length === 0 && !D.go) { D.go = true; goto(g, 'c24_hale', 300); } } },

  { id: 'c24_hale', ch: 24, cp: [2, -8064, PI], obj: 'Stop Commodore Hale', hint: 'Orange rings are his flares — roll out. His guards carry shields; flank them or use grenades.', mood: 'tense', beat: 3, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); dry(g); cast(g, D, 2, -8064, ['dad', 'reyes']); vance(g, D, -1, -8063); giveHammer(D.dad, false); D.dw = .55; dawn(g, .55);
      place(g.player, 1.6, -8066, PI); place(D.dad, 3.4, -8065, PI); place(D.reyes, -.6, -8064, PI); place(D.vance, -2, -8062.6, PI);
      const b = haleBoss(g, D); b.st = 'script'; b.armor = () => (D.on ? 1 : 0); b.root.position.set(8, 0, -8086); b.root.rotation.y = -PI * .1; D.cd = 3.5; D.sq = 14;
      D.guards = squad(g, [[5, -8083], [11, -8083]], { hp: 140, big: true }); D.guards.forEach(r => { r.st = 'script'; });
      g.cut = { anim: 'Idle_Loop', cam: V(3.8, 1.7, -8070.6), look: V(8, 2, -8086), flash: false }; snap(g);
      script(g, [
        ['hale', "You've cost me a ship, a Bosun, and a perfectly good morning."],
        (g) => { cam(g, V(.4, 1.65, -8070.4), V(1.6, 1.5, -8066)); },
        ['keem', "You were going to gas the whole coast."],
        (g) => { cam(g, V(3.8, 1.7, -8070.6), V(8, 2, -8086)); },
        ['hale', "I was going to decide the coast. There's a difference."],
        (g) => { act(D.dad, 'hold', { sides: 'R', k: .7 }); cam(g, V(5.2, 1.65, -8068.6), V(3.4, 1.5, -8065)); },
        ['marcus', "Not to us there isn't."],
        (g) => { act(D.dad, null); g.cut = null; b.st = 'chase'; D.guards.forEach(r => { r.st = 'chase'; }); D.on = true; followAll(g, D, ['dad', 'reyes']); },
      ]);
    },
    update(g, dt) { const D = g.stepData, b = D.b; sun(g, D, dt, .65); tickRings(g, D, dt); if (!D.on) return; hammerTick(g, D, dt, { dmg: 60 }); allyTick(g, D, 'reyes', dt, { dmg: 24, cd: 1.6 }); dartTick(g, D, 'vance', dt, { cd: 2.8 });
      if (!b || b.dead || b.hp <= 0) { if (b && (b.dead || b.hp <= 0) && !D.won) { D.won = true; D.rings && D.rings.forEach(r => g.scene.remove(r.m)); D.rings = []; afterBoss(g, () => goto(g, 'c24_cage', 400), 3); } return; }
      if (g.cut) return;
      D.cd -= dt; if (D.cd <= 0) { D.cd = b.hp < b.maxHp * .5 ? 3.4 : 4.4; const P = g.player.root.position; g.toast('Flare — roll!', 1.1); ring(g, D, P.x, P.z, { r: 2.4, life: 1.3, color: '#ff8a20', dmg: 20, boom: true }); if (b.hp < b.maxHp * .5) ring(g, D, P.x + rnd(-4, 4), P.z + rnd(-4, 4), { r: 2.2, life: 1.6, color: '#ff8a20', dmg: 16 }); }
      D.sq -= dt; if (D.sq <= 0) { D.sq = 16; squad(g, [[-10, -8100], [24, -8096]], { hp: 100 }); g.say([['hale', "Guards! To me!"]]); }
      if (!D.half && b.hp < b.maxHp * .5) { D.half = true; g.say([['hale', "You think a rabbit makes you right?"], ['keem', "No. It makes you wrong."]]); } } },

  { id: 'c24_cage', ch: 24, cp: [0, -8104, PI], obj: '', hint: '', mood: 'tense', beat: 0, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); dry(g); cast(g, D, 0, -8100, ['dad', 'reyes', 'mom']); vance(g, D, 2.6, -8101); giveHammer(D.dad, false); D.dw = .66; dawn(g, .66);
      place(g.player, -.4, -8104, PI * .9); place(D.dad, 1.4, -8103.4, PI * .9); place(D.reyes, -2.4, -8102.6, PI); place(D.mom, -3.4, -8101.6, PI * .9); place(D.vance, 2.8, -8101.6, PI);
      const h = D.h = spawnAuth(g, -3, -8111, { hp: 9999, shield: false }); paintAuth(h, '#1e2a44', '#1a1e28'); helmOn(h, '#e8e8e2'); h.st = 'script'; h.root.scale.setScalar(1.05); h.root.rotation.y = PI * .7; h.play && h.play('Fixing_Kneeling');
      g.cut = { anim: 'Idle_Loop', cam: V(-.6, 1.4, -8107), look: V(-3, 1, -8111.4), flash: false }; snap(g);
      script(g, [
        ['hale', "If I can't decide the coast… then let her decide."],
        (g) => { if (A.cageDoor) A.cageDoor.position.y = 4.6; g.audio.thud && g.audio.thud(); g.shake(.4); g.audio.roar && g.audio.roar(); cam(g, V(1.2, 1.6, -8099.8), V(-.4, 1.5, -8104)); },
        ['vance', "That's the first carrier. The Director's own test subject. Everything gray started with her."],
        (g) => { h.root.visible = false; g.audio.scream && g.audio.scream(.5); g.shake(.6); cam(g, V(2.8, 1.65, -8099.4), V(1.4, 1.5, -8103.4)); },
        ['marcus', "Don't look, baby. Don't look."],
        (g) => { cam(g, V(-1.6, 1.65, -8101), V(-.4, 1.5, -8104)); },
        ['keem', "Vance. How many darts?"],
        ['vance', "Enough if you make them count."],
        (g) => { g.cut = null; goto(g, 'c24_gray', 200); },
      ]);
    },
    update(g, dt) { const D = g.stepData; tickMv(g, D, dt); sun(g, D, dt, .7); } },

  { id: 'c24_gray', ch: 24, cp: [0, -8100, PI], obj: 'Stop the Gray', hint: 'Bullets barely hurt it — until Vance lands a Biscuit-dose dart. When it glows blue, hit it with everything. Roll out of the red rings.', mood: 'tense', beat: 3, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); dry(g); cast(g, D, 0, -8098, ['dad', 'reyes']); vance(g, D, 2.8, -8096); giveHammer(D.dad, false); D.dw = .7; dawn(g, .7); D.weak = 0; D.dart = 5;
      place(g.player, -.4, -8100, PI); place(D.dad, 1.6, -8099, PI); place(D.reyes, -2.6, -8098, PI); place(D.vance, 2.8, -8096, PI);
      const b = grayBoss(g, D, -6, -8114); b.st = 'script'; b.root.rotation.y = PI * .15; D.cd = 3;
      g.cut = { anim: 'Idle_Loop', cam: V(1.8, 1.7, -8102.6), look: V(-6, 2.6, -8114), flash: false }; snap(g);
      script(g, [
        (g) => { g.audio.roar && g.audio.roar(b); g.shake(.5); },
        ['reyes', "Bullets won't do it alone. Wait for the dart!"],
        (g) => { act(D.dad, 'hold', { sides: 'R', k: .8 }); cam(g, V(3.6, 1.6, -8101.6), V(1.6, 1.5, -8099)); },
        ['marcus', "Hey! Over here! You don't get my son."],
        (g) => { act(D.dad, null); g.cut = null; b.st = 'chase'; D.on = true; followAll(g, D, ['dad', 'reyes']); },
      ]);
    },
    update(g, dt) { const D = g.stepData, b = D.b; sun(g, D, dt, .85); tickRings(g, D, dt); if (!D.on) return; hammerTick(g, D, dt, { dmg: D.low ? 90 : 70, cd: 1 }); allyTick(g, D, 'reyes', dt, { dmg: 26, cd: 1.5 });
      if (D.vance && !g.cut) { const v = D.vance.root.position, P = g.player.root.position, dx = P.x + 3 - v.x, dz = P.z + 3 - v.z, d = Math.hypot(dx, dz); if (d > 2) { const s = Math.min(d, 3.2 * dt); v.x += dx / d * s; v.z += dz / d * s; D.vance.play('Walk_Loop'); } }
      const u = b && b.mat && b.mat.userData && b.mat.userData.u;
      if (!b || b.dead || b.hp <= 0) { if (b && (b.dead || b.hp <= 0) && !D.won) { D.won = true; D.rings && D.rings.forEach(r => g.scene.remove(r.m)); D.rings = []; g.say([['marcus', "That's for my family. All of them."]]); afterBoss(g, () => goto(g, 'c24_dawn', 800), 5); } return; }
      if (g.cut) return;
      if (D.weak > 0) { D.weak -= dt; if (D.weak <= 0) { D.tint(false); b.speed = 1.6; g.toast('The dose wore off', 1); } }
      D.dart -= dt; if (D.dart <= 0 && D.weak <= 0) { D.dart = 7.5; const dir = b.root.position.clone().sub(D.vance.root.position).normalize(); D.vance.root.rotation.y = Math.atan2(dir.x, dir.z); D.vance.play && D.vance.play('Pistol_Aim_Neutral'); g.audio.shot && g.audio.shot('pistol');
        D.weak = 4.5; b.speed = 1.0; D.tint(true); g.toast('Biscuit dose! It\'s weak — hit it NOW!', 2); if (!D.said) { D.said = true; g.say([['vance', "Dart's in! Now, Keem, now!"]]); } }
      D.cd -= dt; if (D.cd <= 0) { D.cd = b.hp < b.maxHp * .4 ? 2.9 : 3.8; const P = g.player.root.position; ring(g, D, P.x, P.z, { r: 2.5, life: 1.15, dmg: 26 }); if (D.weak <= 0) { b.speed = 4.4; setTimeout(() => { if (b && !b.dead && !(D.weak > 0)) b.speed = 1.6; }, 1200); } }
      if (!D.half && b.hp < b.maxHp * .55) { D.half = true; g.toast('It is calling them', 2); grayHorde(g, 8, [[-28, -8080], [28, -8090], [-20, -8140], [20, -8140]], { runner: true }); g.say([['reyes', "It's calling the others. Keep it on the dart!"]]); }
      if (!D.low && b.hp < b.maxHp * .25) { D.low = true; g.say([['keem', "Dad! With me! Together!"], ['marcus', "Right next to you, son."]]); } } },

  { id: 'c24_dawn', ch: 24, cp: [22, -8124, PI / 2], obj: '', hint: '', mood: 'day', beat: 0, rain: false,
    enter(g) {
      const D = g.stepData; g.wpTarget = null; g.openGate(true); dry(g); D.lobster = false; cast(g, D, 0, -8120, ALL); vance(g, D, 3.2, -8121); giveHammer(D.dad, false); D.dw = .9; dawn(g, .9); if (A.mastLamp) A.mastLamp.emissiveIntensity = 0;
      // the family at the lighthouse wall looking east over the water, sunrise
      place(g.player, 22, -8124, PI / 2); place(D.dad, 22.6, -8122.2, PI / 2); place(D.nia, 21.2, -8125.8, PI / 2); place(D.mom, 20.4, -8126.6, PI / 2); place(D.reyes, 19.6, -8121.4, PI * .6); place(D.vance, 20.6, -8119.8, PI * .6); place(D.danny, 18.6, -8123.6, PI * .55);
      if (D.nia.biscuit) D.nia.biscuit.visible = false; D.B = spawnBiscuit(g, 21.8, -8126.8, { y: 0, scale: 2.6 }); if (D.B.grp.children[1]) D.B.grp.children[1].visible = false; D.B.grp.rotation.y = PI / 2; g.props.push(D.B.grp);
      g.cut = { anim: 'Idle_Loop', cam: V(18.2, 1.8, -8128.6), look: V(23, 1.4, -8123), flash: false }; snap(g);
      script(g, [
        ['vance', "It's over. Every tank. Every dart."],
        (g) => { cam(g, V(18.6, 1.65, -8119), V(19.6, 1.5, -8121.4)); },
        ['reyes', "The Biscuit dose goes on the air in ten minutes. Every town that made the first cure can make this one."],
        (g) => { cam(g, V(22.6, 1.15, -8128.4), V(21.2, .95, -8125.8)); face(D.nia, 20.4, -8126.6); },
        ['nia', "Can I read it again? On the radio?"],
        (g) => { cam(g, V(22.2, 1.6, -8129.2), V(20.4, 1.45, -8126.6)); face(D.mom, 21.2, -8125.8); },
        ['dana', "Who else, baby?"],
        (g) => { cam(g, V(17, 1.65, -8121.4), V(18.6, 1.5, -8123.6)); },
        ['danny', "For the record, I guarded that boat extremely well."],
        (g) => { face(D.nia, 30, -8124); face(D.mom, 30, -8124); act(D.dad, 'hold', { sides: 'R', k: .6 }); cam(g, V(18.4, 2.2, -8124), V(40, 4, -8120)); },
        ['marcus', "Keem. Look at that."],
        (g) => { act(D.dad, null); cam(g, V(24.6, 1.65, -8121.2), V(22.6, 1.5, -8122.2)); face(g.player, 22.6, -8122.2); face(D.dad, 22, -8124); },
        ['keem', "Last time we stood here, I thought I lost you."],
        (g) => { cam(g, V(24.4, 1.65, -8126.4), V(22, 1.5, -8124)); },
        ['marcus', "You didn't. You won't. I'm right here."],
        (g) => { cam(g, V(23.4, .7, -8129.4), V(21.8, .3, -8126.8)); hopTo(D.B, 22.6, -8125.6, 0); },
        ['nia', "Biscuit saved everybody. Again."],
        (g) => { cam(g, V(18.6, 1.65, -8117.6), V(20.6, 1.5, -8119.8)); },
        ['vance', "He was always my best subject. Don't tell him."],
        (g) => { cam(g, V(20.2, 1.7, -8130.4), V(22, 1.5, -8124)); face(g.player, 30, -8124); face(D.dad, 30, -8124); },
        ['keem', "After the quiet. The good kind."],
        (g) => { cam(g, V(24, .6, -8127.8), V(22.6, .35, -8125.6)); },
        ['nia', "He's a very good bunny."],
        (g) => { cam(g, V(10, 6, -8112), V(26, 2, -8126)); card('THE END', 5600, 'AFTER THE QUIET · A LONE KEEM STUDIOS GAME'); { const tok = g.stepTok; setTimeout(() => { hideCard(); if (g.stepTok === tok) g.onComplete && g.onComplete(24); }, 6000); } },
      ]);
    },
    update(g, dt) { const D = g.stepData; tickMv(g, D, dt); D.dw = Math.min(1, D.dw + dt * .01); dawn(g, D.dw); if (D.B) { const B = D.B; if (B.st === 'hop') { const p = B.grp.position; B.hop += dt * 4.6 / Math.max(.1, B.hd); const k = Math.min(1, B.hop); p.set(B.sx + (B.tx - B.sx) * k, Math.abs(Math.sin(k * B.hn * PI)) * .28, B.sz + (B.tz - B.sz) * k); if (k >= 1) { B.st = 'sit'; p.y = 0; } } else if (B.r && B.r.head) B.r.head.rotation.x = Math.max(0, Math.sin(g.t * 7)) * .3 - .05; } } },
];

export const loot = [
  { id: 'c24a', kind: 'ammo', item: 'rifle', n: 80, pos: [5, .25, -7950], at: 'c24_climb' },
  { id: 'c24b', kind: 'med', pos: [-5, .25, -7980], at: 'c24_climb' },
  { id: 'c24c', kind: 'grenade', n: 4, pos: [-16, .25, -8030], at: 'c24_climb' },
  { id: 'c24d', kind: 'ammo', item: 'shell', n: 24, pos: [0, .25, -8080], at: 'c24_tanks' },
  { id: 'c24e', kind: 'med', pos: [-12, .25, -8100], at: 'c24_hale' },
  { id: 'c24f', kind: 'grenade', n: 4, pos: [8, .25, -8070], at: 'c24_gray' },
  { id: 'c24g', kind: 'cash', n: 1000, pos: [-20, .25, -8034], at: 'c24_climb' },
  pg(-24, -8046, 'Captain Riverside #33: "The Keeper of the Light"', 'c24_climb'),
];
