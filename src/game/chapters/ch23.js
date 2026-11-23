// Chapter 23 · The Sentinel — Portland's old freight pier at night, and the Harbor Authority's last ship. Sneak past the
// searchlights, take the deck, find Vance in the hold among Hale's strain tanks, put down the Bosun, then hold the ship's lab
// while Vance and Dr. Reyes make the Biscuit dose. Hale slips away to Portland Head Light with the tanks. World band z -7500..-7800.
import * as THREE from 'three';
import { PI, V, dist2, goto, afterBoss, clearThen, pg, rnd, $q } from './helpers.js';
import { walk, tickMv, cam, snap, script, cast, followAll, place, face, act, allyTick, holdTick, keepUp, ring, tickRings, squad, spawnAuth, paintAuth, LOOK } from './ch15_kit.js';
import { mats, floor, prop, lamp, wallX, wallZ, table, crate, shelfUnit } from './kit/common.js';
import { hammerTick } from './kit/finale.js';
import { giveHammer } from '../hands.js';
import { spawnBiscuit } from './ch13_rabbit.js';
import { grayify, spawnGray, grayHorde, strainTank, lane, dartTick, vest } from './ch21_kit.js';

export const meta = { n: 23, title: 'The Sentinel', endQuote: '“This time, nobody runs.”' };
export const speakers = { hale: 'Commodore Hale' };
export const Z0 = -7512;
const SHIP = { x0: -13, x1: 13, z0: -7608, z1: -7760 }, HOLD = { x0: -10, x1: 10, z0: -7640, z1: -7700 }, LAB = { x0: -8, x1: 8, z0: -7734, z1: -7752 };
let A = null;
const VLOOK = 'vance';

function cage(ctx, x, z, w = 3, d = 3) { const T = ctx.THREE, bar = new T.MeshStandardMaterial({ color: '#5a6064', metalness: .7, roughness: .4 }); const G = new T.Group();
  for (let i = 0; i <= 6; i++) { const t = i / 6; [[x - w / 2 + w * t, z + d / 2], [x - w / 2 + w * t, z - d / 2]].forEach(([bx, bz]) => { const b = new T.Mesh(new T.CylinderGeometry(.03, .03, 2.6, 5), bar); b.position.set(bx, 1.3, bz); G.add(b); });
    [[x - w / 2, z - d / 2 + d * t], [x + w / 2, z - d / 2 + d * t]].forEach(([bx, bz]) => { const b = new T.Mesh(new T.CylinderGeometry(.03, .03, 2.6, 5), bar); b.position.set(bx, 1.3, bz); G.add(b); }); }
  const top = new T.Mesh(new T.BoxGeometry(w, .08, d), bar); top.position.set(x, 2.6, z); G.add(top); ctx.scene.add(G); return G; }

export function buildZone(ctx) {
  const K = mats(ctx), T = ctx.THREE; A = { spots: [] };
  const water = new T.MeshStandardMaterial({ color: '#1e3442', roughness: .12, metalness: .4, emissive: '#06121a' });
  { const w = new T.Mesh(new T.PlaneGeometry(260, 320), water); w.rotation.x = -PI / 2; w.position.set(0, .03, -7650); ctx.scene.add(w); ctx.updaters.push((dt, t) => { water.emissiveIntensity = .8 + Math.sin(t * .7) * .2; }); }
  // the pier: planks, bollards, containers for cover, low rails so nobody walks into the harbor
  const plank = new T.MeshStandardMaterial({ color: '#5a4a3a', roughness: .95 }); floor(ctx, 0, -7553, 22, 100, plank, .05);
  for (let z = -7506; z > -7602; z -= 2.2) floor(ctx, 0, z, 22, .06, new T.MeshStandardMaterial({ color: '#3a3026', roughness: 1 }), .055);
  [-1, 1].forEach(s => { ctx.wallBox(.3, .9, 98, K.woodDark, s * 11.2, .45, -7553); for (let z = -7508; z > -7600; z -= 10) prop(ctx, .5, .7, .5, K.steelDark, s * 10.4, .35, z, true); });
  const ctr = [['#7a2a22', -6, -7532, 0], ['#2a4a6a', 6.2, -7546, 0], ['#3a5a3a', -5.6, -7562, 0], ['#8a6a2a', 5.8, -7580, 0], ['#5a3a5a', -6.4, -7590, 0]];
  ctr.forEach(([c, x, z]) => { const m = new T.MeshStandardMaterial({ color: c, roughness: .7, metalness: .3 }); ctx.wallBox(2.6, 2.7, 6.2, m, x, 1.35, z); for (let i = -2; i <= 2; i++) prop(ctx, 2.64, 2.5, .08, m, x, 1.35, z + i * 1.3); });
  [[2, -7524], [-1.4, -7552], [1.6, -7572]].forEach(([x, z], i) => crate(ctx, x, z, 1.1 + (i % 2) * .2, null, i * .7));
  // searchlight towers on the pier sides (the moving spots are created per step)
  [[-10, -7530], [10, -7552], [-10, -7574]].forEach(([x, z]) => { prop(ctx, .3, 6, .3, K.steelDark, x, 3, z, true); const h = new T.Mesh(new T.CylinderGeometry(.35, .5, .7, 12), K.steelDark); h.position.set(x, 6.2, z); h.rotation.z = (x < 0 ? -1 : 1) * .9; ctx.scene.add(h); const f = new T.Mesh(new T.CircleGeometry(.34, 12), new T.MeshBasicMaterial({ color: '#fff8d8' })); f.position.set(x + (x < 0 ? .45 : -.45), 6.0, z); f.rotation.y = x < 0 ? PI / 2 : -PI / 2; ctx.scene.add(f); A.spots.push([x, z]); });
  // gangway up to the deck
  floor(ctx, 0, -7604, 3, 9, K.steel, .07); [-1, 1].forEach(s => prop(ctx, .06, 1, 9, K.steel, s * 1.5, .6, -7604));
  // THE SENTINEL: hull walls rise above the deck, white stripe, name, bow wedge, superstructure at the stern
  const hull = new T.MeshStandardMaterial({ color: '#3a4048', roughness: .6, metalness: .3 }), deck = new T.MeshStandardMaterial({ color: '#6a6e68', roughness: .9 }), white = new T.MeshStandardMaterial({ color: '#e8e8e2', roughness: .6 });
  const { x0, x1, z0, z1 } = SHIP; floor(ctx, 0, (z0 + z1) / 2, x1 - x0, z0 - z1, deck, .06);
  wallZ(ctx, z0, z1, x0, 2.2, hull); wallZ(ctx, z0, z1, x1, 2.2, hull); wallX(ctx, x0, x1, z0, 2.2, hull, [{ c: 0, w: 3.2 }]);
  [-1, 1].forEach(s => { prop(ctx, .44, .2, z0 - z1, white, s * (x1 + .02), 1.6, (z0 + z1) / 2); });
  { const bowL = 16; for (let i = 0; i < 8; i++) { const t = i / 8, w = (x1 - x0) * (1 - t); ctx.wallBox(.4, 2.2, bowL / 8, hull, -w / 2, 1.1, z1 - bowL / 16 - t * bowL); ctx.wallBox(.4, 2.2, bowL / 8, hull, w / 2, 1.1, z1 - bowL / 16 - t * bowL); floor(ctx, 0, z1 - bowL / 16 - t * bowL, Math.max(.5, w), bowL / 8, deck, .06); } }
  ctx.sign(['SENTINEL', 'HARBOR AUTHORITY'], x1 + .25, 1.1, -7640, PI / 2, 6, 1, '#3a4048'); ctx.sign(['SENTINEL'], x0 - .25, 1.1, -7700, -PI / 2, 5, .9, '#3a4048');
  // deck: cranes, containers, lifeboats on davits, deck lamps
  [[9, -7622], [-9, -7716]].forEach(([x, z]) => { prop(ctx, .8, 7, .8, K.yellow, x, 3.5, z, true); const jib = new T.Mesh(new T.BoxGeometry(.4, .4, 10), K.yellow); jib.position.set(x, 7, z - 4); jib.rotation.x = -.25; ctx.scene.add(jib); prop(ctx, .05, 4, .05, K.black, x, 4.5, z - 8.4); });
  [['#2a4a6a', -8, -7620], ['#7a2a22', 8, -7714], ['#3a5a3a', -8, -7722]].forEach(([c, x, z]) => ctx.wallBox(2.6, 2.7, 6, new T.MeshStandardMaterial({ color: c, roughness: .7, metalness: .3 }), x, 1.35, z));
  [-1, 1].forEach(s => { const lb = new T.Mesh(new T.CapsuleGeometry(1, 4, 4, 10), new T.MeshStandardMaterial({ color: '#e8641a', roughness: .6 })); lb.rotation.x = PI / 2; lb.position.set(s * 14.6, 3, -7660); ctx.scene.add(lb); [-2, 2].forEach(dz => prop(ctx, .2, 4, .2, white, s * 13.4, 2.6, -7660 + dz)); });
  [[-11, -7630], [11, -7660], [-11, -7700], [11, -7726]].forEach(([x, z], i) => { prop(ctx, .14, 3.4, .14, K.steelDark, x, 1.7, z, true); lamp(ctx, x + (x < 0 ? .5 : -.5), z, { y: 3.4, real: i % 2 === 0, color: '#e8f0ff', intensity: 10, range: 22, size: [.5, .14, .3] }); });
  // the cargo hold: coaming walls with a hatch door, strain tanks in rows, cages
  { const coam = new T.MeshStandardMaterial({ color: '#4a5058', roughness: .6, metalness: .4 }); const h = HOLD;
    wallX(ctx, h.x0, h.x1, h.z0, 3.2, coam, [{ c: 0, w: 3 }]); wallX(ctx, h.x0, h.x1, h.z1, 3.2, coam, [{ c: 0, w: 3 }]); wallZ(ctx, h.z0, h.z1, h.x0, 3.2, coam); wallZ(ctx, h.z0, h.z1, h.x1, 3.2, coam);
    ctx.sign(['CARGO HOLD 2', 'AUTHORIZED ONLY'], 0, 3.6, h.z0 + .25, 0, 3.4, .8, '#5a1a1a'); floor(ctx, 0, (h.z0 + h.z1) / 2, h.x1 - h.x0, h.z0 - h.z1, new T.MeshStandardMaterial({ color: '#4a4e4a', roughness: .8 }), .065);
    A.tanks = []; [[-7, -7650], [-7, -7660], [-7, -7670], [7, -7650], [7, -7660], [7, -7670]].forEach(([x, z]) => A.tanks.push(strainTank(ctx, x, z, { h: 2.6, r: .85 })));
    A.cages = [cage(ctx, -6.6, -7690), cage(ctx, 6.6, -7690), cage(ctx, 0, -7694, 3, 2.6)];
    [[-4, -7646], [4, -7682]].forEach(([x, z], i) => lamp(ctx, x, z, { y: 3.3, real: true, color: '#c8e8d8', intensity: 9, range: 18, flicker: i ? .2 : 0, size: [1.4, .1, .4] })); }
  // superstructure: three decks of white steel, lit windows, the bridge on top; the lab is the ground floor (door on the front)
  { const L = LAB; wallX(ctx, L.x0, L.x1, L.z0, 9.6, white, [{ c: 0, w: 2.6 }]); wallX(ctx, L.x0, L.x1, L.z1, 9.6, white); wallZ(ctx, L.z0, L.z1, L.x0, 9.6, white); wallZ(ctx, L.z0, L.z1, L.x1, 9.6, white);
    for (let f = 0; f < 3; f++) for (let i = -3; i <= 3; i++) { if (f === 0 && Math.abs(i) < 1) continue; const w = new T.Mesh(new T.PlaneGeometry(1.4, 1), new T.MeshStandardMaterial({ color: '#2a3438', emissive: '#ffe8c0', emissiveIntensity: f === 2 ? 1.2 : .6 })); w.position.set(i * 2.1, 2.2 + f * 3, L.z0 + .22); ctx.scene.add(w); }
    prop(ctx, 18, .3, 20, white, 0, 9.75, (L.z0 + L.z1) / 2); const mast = new T.Mesh(new T.CylinderGeometry(.14, .2, 6, 8), K.steelDark); mast.position.set(0, 12.8, -7744); ctx.scene.add(mast);
    floor(ctx, 0, (L.z0 + L.z1) / 2, L.x1 - L.x0, L.z0 - L.z1, new T.MeshStandardMaterial({ color: '#c8ccc8', roughness: .5 }), .066);
    table(ctx, -3, -7744, { w: 3.6, d: 1.1, mat: K.white, legMat: K.steel }); table(ctx, 3.6, -7744, { w: 3, d: 1.1, mat: K.white, legMat: K.steel });
    { const cen = new T.Mesh(new T.CylinderGeometry(.35, .4, .4, 14), K.steel); cen.position.set(3.2, 1.08, -7744); ctx.scene.add(cen); A.cen = cen; ctx.updaters.push((dt) => { if (A.spin) cen.rotation.y += dt * 18; }); }
    shelfUnit(ctx, -7.4, -7744, { w: 3, d: .5, along: 'z', goods: ['#e8e8e8', '#9fd0e0', '#c8e0a0'] }); prop(ctx, 1.2, 1.9, .8, K.white, 6.6, .95, -7750.6, true);
    for (let i = 0; i < 5; i++) { const v = new T.Mesh(new T.CylinderGeometry(.03, .03, .12, 6), new T.MeshStandardMaterial({ color: '#a8e0ff', emissive: '#4ab0e0', emissiveIntensity: .8 })); v.position.set(-4 + i * .35, .94, -7744.2); ctx.scene.add(v); }
    [[-4, -7740], [4, -7748]].forEach(([x, z], i) => lamp(ctx, x, z, { y: 3.4, real: i === 0, color: '#eef4ff', intensity: 10, range: 18, size: [1.6, .1, .5] })); }
  // far off: Portland Head Light, beam turning (the next chapter)
  { const lh = new T.MeshStandardMaterial({ color: '#f0ece0', roughness: .6 }); const tw = new T.Mesh(new T.CylinderGeometry(1.4, 2, 16, 14), lh); tw.position.set(70, 8, -7860); ctx.scene.add(tw);
    const lamp2 = new T.Mesh(new T.SphereGeometry(1.1, 12, 10), new T.MeshBasicMaterial({ color: '#fff4c8' })); lamp2.position.set(70, 16.8, -7860); ctx.scene.add(lamp2);
    const beam = new T.Mesh(new T.ConeGeometry(4, 60, 16, 1, true), new T.MeshBasicMaterial({ color: '#fff4c8', transparent: true, opacity: .08, depthWrite: false, side: T.DoubleSide })); beam.geometry.translate(0, -30, 0); beam.rotation.z = PI / 2; const piv = new T.Group(); piv.position.set(70, 16.8, -7860); piv.add(beam); ctx.scene.add(piv);
    ctx.updaters.push((dt) => { piv.rotation.y += dt * .5; }); }
}

// ---------- searchlights (per step) ----------
function spots(g, D) { D.sp = A.spots.map(([x, z], i) => { const m = new THREE.Mesh(new THREE.CircleGeometry(3, 28), new THREE.MeshBasicMaterial({ color: '#fff4c0', transparent: true, opacity: .32, depthWrite: false }));
  m.rotation.x = -PI / 2; m.position.set(0, .09, z); g.scene.add(m); g.props.push(m); return { m, z, ph: i * 2.1, amp: 7.5, sp: .55 + i * .12, r: 3 }; }); }
function spotsTick(g, D, dt) { if (!D.sp) return; const P = g.player.root.position; D.seenCd = Math.max(0, (D.seenCd || 0) - dt);
  D.sp.forEach(S => { S.ph += dt * S.sp; const x = Math.sin(S.ph) * S.amp, z = S.z + Math.sin(S.ph * .7) * 4; S.m.position.set(x, .09, z); S.m.material.color.set(D.seenCd > 0 ? '#ff5040' : '#fff4c0');
    if (!g.cut && D.seenCd <= 0 && Math.hypot(P.x - x, P.z - z) < S.r * (g.state.crouch ? .8 : 1)) { D.seenCd = 7; D.seen = (D.seen || 0) + 1; g.toast('SPOTTED! Hale\'s men are coming', 2); g.audio.siren && g.audio.siren(.04, 4);
      squad(g, [[-3, -7598], [3, -7598]], { hp: 90 }); if (D.seen === 1) g.say([['hale', "Movement on the pier. Light them up."]]); } }); }

// ---------- the Bosun ----------
function chainOn(c) { const T = THREE, G = new T.Group(), m = new T.MeshStandardMaterial({ color: '#5a5e62', metalness: .8, roughness: .35 }); for (let i = 0; i < 9; i++) { const l = new T.Mesh(new T.TorusGeometry(.045, .014, 5, 10), m); l.position.y = -i * .07; l.rotation.y = i % 2 ? PI / 2 : 0; G.add(l); }
  const hook = new T.Mesh(new T.TorusGeometry(.1, .025, 6, 12, PI * 1.3), m); hook.position.y = -.7; G.add(hook); c.attach && c.attach('DEF-hand.R', G); return G; }
function bosunBoss(g, D) { const b = g.spawnZ(0, -7684, { boss: true, hp: 4400, scale: 1.9, runner: false }); b.cd = 2; b.aggro = 99; b.speed = 1.45; g.boss = b; D.b = b;
  $q('#bossn').textContent = 'THE BOSUN — Sentinel deck crew'; vest(b, '#2a3450'); const u = b.mat && b.mat.userData && b.mat.userData.u; if (u && u.uPants) u.uPants.value.set('#3a3a3a'); grayify(b); chainOn(b); g.audio.roar && setTimeout(() => g.audio.roar(b), 700); return b; }

const ALL = ['dad', 'nia', 'mom', 'reyes', 'danny'];
const FIGHT = ['dad', 'reyes'];
const DECKPTS = [[-9, -7640], [9, -7646], [-9, -7706], [9, -7712]];
export const steps = [
  { id: 'c23_pier', ch: 23, cp: [0, -7510, PI], obj: '', hint: '', mood: 'tense', beat: 0,
    enter(g) {
      const D = g.stepData; g.openGate(true); D.lobster = false; cast(g, D, 0, -7508, ALL); giveHammer(D.dad, false);
      place(g.player, -.4, -7512, PI); place(D.dad, 1.5, -7511, PI); place(D.nia, -2, -7511.4, PI); place(D.mom, -3.2, -7510.4, PI); place(D.reyes, 2.8, -7509.8, PI); place(D.danny, 4.2, -7510.6, PI);
      g.cut = { anim: 'Idle_Loop', cam: V(-1.2, 2.2, -7505), look: V(0, 2.6, -7600), flash: false }; snap(g);
      script(g, [
        ['reyes', "There she is. The Sentinel."],
        (g) => { cam(g, V(5.1, 1.63, -7513.16), V(4.2, 1.5, -7510.6)); },
        ['danny', "That's a big boat. That's a very, very big boat."],
        (g) => { cam(g, V(-1.3, 1.63, -7514.3), V(-0.4, 1.5, -7512)); },
        ['keem', "Searchlights all down the pier. If they spot us, they lock the whole ship down."],
        (g) => { act(D.dad, 'hold', { sides: 'R', k: .6 }); cam(g, V(2.59, 1.67, -7513.82), V(1.5, 1.5, -7511)); },
        ['marcus', "So we stay out of the light."],
        (g) => { act(D.dad, null); cam(g, V(-2.73, 1.27, -7513.43), V(-2.6, 1.1, -7511)); face(D.mom, D.nia.root.position.x, D.nia.root.position.z); },
        ['dana', "Nia. Biscuit stays zipped in your hoodie. No matter what."],
        ['nia', "He knows. He's being very brave."],
        (g) => { g.cut = null; goto(g, 'c23_sneak', 120); },
      ]);
    },
    update(g, dt) { tickMv(g, g.stepData, dt); } },

  { id: 'c23_sneak', ch: 23, cp: [0, -7514, PI], obj: 'Reach the gangway unseen', hint: 'Stay out of the moving searchlights. Crouch to make yourself smaller, and use the containers.', mood: 'tense', beat: 1,
    enter(g) {
      const D = g.stepData; g.openGate(true); D.lobster = false; cast(g, D, 0, -7514, ALL); followAll(g, D, ALL); giveHammer(D.dad, false); spots(g, D); g.wpTarget = [0, 1.2, -7600];
      g.say([['marcus', "Low and slow, son. Wait for the light to pass."]]);
    },
    update(g, dt) { const D = g.stepData; spotsTick(g, D, dt); hammerTick(g, D, dt); allyTick(g, D, 'reyes', dt, { dmg: 28, cd: 1.5 });
      if (!D.go && dist2(g, 0, -7600) < 3 && g.alive().length === 0) { D.go = true; if (!D.seen) { g.toast('Not seen. Ghost.', 2); g.addXP(300); } goto(g, 'c23_deck', 200); }
      else if (!D.go && dist2(g, 0, -7600) < 3 && !D.wait) { D.wait = true; g.objective('Deal with them first', 'Clear the troopers, then go up the gangway.'); } } },

  { id: 'c23_deck', ch: 23, cp: [0, -7612, PI], obj: 'Take the deck', hint: 'Troopers and the gray. Find the hold keycard — the Quartermaster carries it.', mood: 'tense', beat: 3,
    enter(g) {
      const D = g.stepData; g.openGate(true); cast(g, D, 0, -7612, FIGHT); followAll(g, D, FIGHT); giveHammer(D.dad, false); D.ph = 0;
      squad(g, [[-6, -7628], [6, -7632], [0, -7636]], { hp: 100 }); g.audio.staticBurst && g.audio.staticBurst(1);
      g.say([['hale', "This is Commodore Hale. To the boy on my deck: the Director was a romantic. I am not."], ['keem', "Cool. I'm here for my doctor."]]);
    },
    update(g, dt) { const D = g.stepData; hammerTick(g, D, dt); allyTick(g, D, 'reyes', dt, { dmg: 28, cd: 1.5 }); const al = g.alive().length;
      if (D.ph === 0 && al === 0) { D.ph = 1; grayHorde(g, 7, DECKPTS, { runner: true }); g.toast('A container burst open', 1.6); g.say([['reyes', "They keep the gray on deck in boxes!"]]); }
      else if (D.ph === 1 && al === 0) { D.ph = 2; const q = spawnAuth(g, 0, -7712, { hp: 260, big: true, gun: 'shotgun' }); q.scale && (q.root.scale.setScalar(1.15)); D.q = q; squad(g, [[-6, -7706], [6, -7706]], { hp: 100 }); g.wpTarget = [0, 1.2, -7706]; g.toast('The Quartermaster', 1.6); g.objective('Take the keycard from the Quartermaster', 'Big shield, near the stern.'); }
      else if (D.ph === 2 && al === 0) { D.ph = 3; const P = D.q ? D.q.root.position : { x: 0, z: -7712 }; const kx = Math.max(-10, Math.min(10, P.x)), kz = Math.max(-7728, Math.min(-7702, P.z)); D.uses = [{ x: kx, z: kz, r: 2.4, label: 'Take the hold keycard', fn: () => { g.audio.click && g.audio.click(); g.toast('Hold keycard', 1.6); goto(g, 'c23_hold', 300); } }]; g.wpTarget = [kx, 1.2, kz]; g.objective('Take the hold keycard', 'He dropped it.'); } } },

  { id: 'c23_hold', ch: 23, cp: [0, -7686, PI], obj: '', hint: '', mood: 'sad', beat: 0,
    enter(g) {
      const D = g.stepData; g.openGate(true); D.lobster = false; cast(g, D, 0, -7684, ALL); giveHammer(D.dad, false); D.vance = g.npc('vance', VLOOK, 0, -7694.2, 0, 'Idle_Loop');
      place(g.player, -.4, -7690.4, PI); place(D.dad, 1.6, -7689.6, PI); place(D.nia, -1.6, -7689.2, PI); place(D.mom, -2.8, -7688.4, PI); place(D.reyes, 2.6, -7688.6, PI * .9); place(D.danny, 3.6, -7686.6, PI * .8);
      g.cut = { anim: 'Idle_Loop', cam: V(1.02, 1.65, -7691.9), look: V(0, 1.4, -7694.2), flash: false }; snap(g);
      script(g, [
        ['vance', "You brought the rabbit. Good. Hello again, R-07."],
        (g) => { cam(g, V(-1.2, 1.15, -7691.2), V(-1.6, .95, -7689.2)); face(D.nia, 0, -7694.2); },
        ['nia', "His name is Biscuit."],
        (g) => { cam(g, V(1.02, 1.65, -7691.9), V(0, 1.4, -7694.2)); },
        ['vance', "…Hello again, Biscuit."],
        (g) => { cam(g, V(-1.6, 1.65, -7692.4), V(-.4, 1.5, -7690.4)); },
        ['keem', "You look terrible."],
        (g) => { cam(g, V(1.02, 1.65, -7691.9), V(0, 1.4, -7694.2)); },
        ['vance', "I was set on fire and then arrested. I've had better weeks."],
        (g) => { cam(g, V(3.24, 1.63, -7690.52), V(2.6, 1.5, -7688.6)); },
        ['reyes', "Elliot. Tell me how."],
        (g) => { cam(g, V(1.02, 1.65, -7691.9), V(0, 1.4, -7694.2)); },
        ['vance', "The lab is up under the bridge. A few drops of his blood, twenty minutes, and a centrifuge. He won't feel a thing."],
        ['dana', "And then?"],
        ['vance', "Then we have something to fight her poison with."],
        (g) => { g.audio.staticBurst && g.audio.staticBurst(1); g.audio.siren && g.audio.siren(.05, 6); g.shake(.3); cam(g, V(0, 3, -7676), V(0, 1.4, -7690)); },
        ['hale', "Touching. Open the pens."],
        (g) => { g.audio.roar && g.audio.roar(); g.shake(.4); },
        ['marcus', "Keem, get the cage open. I'll hold them."],
        (g) => { g.cut = null; goto(g, 'c23_bosun', 160); },
      ]);
    },
    update(g, dt) { tickMv(g, g.stepData, dt); } },

  { id: 'c23_bosun', ch: 23, cp: [0, -7660, PI], obj: 'Stop the Bosun', hint: 'White ring = his chain swing. Get out of it. A blue lane means he is throwing the chain at you. Vance\'s darts slow the gray.', mood: 'tense', beat: 3,
    enter(g) {
      const D = g.stepData; g.openGate(true); cast(g, D, 0, -7660, FIGHT); giveHammer(D.dad, false); D.vance = g.npc('vance', VLOOK, -2.6, -7656, PI, 'Idle_Loop'); D.vance.root.rotation.y = PI;
      place(g.player, -.4, -7664, PI); place(D.dad, 1.6, -7663, PI); place(D.reyes, 2.8, -7657, PI);
      const b = bosunBoss(g, D); b.st = 'script'; b.root.position.set(0, 0, -7684); b.root.rotation.y = 0; D.cd = 4; D.th = 7;
      g.cut = { anim: 'Idle_Loop', cam: V(2.4, 1.6, -7666.6), look: V(0, 2.4, -7684), flash: false }; snap(g);
      script(g, [
        (g) => { g.shake(.3); },
        ['vance', "That's the Bosun. Hale's first gray volunteer. He volunteered for nothing."],
        (g) => { cam(g, V(-3.37, 1.63, -7658.3), V(-2.6, 1.5, -7656)); },
        ['vance', "I have darts. Not many. They slow the gray down. Point and I'll shoot."],
        (g) => { g.cut = null; b.st = 'chase'; D.on = true; followAll(g, D, FIGHT); },
      ]);
    },
    update(g, dt) { const D = g.stepData, b = D.b; tickRings(g, D, dt); if (!D.on) return; hammerTick(g, D, dt, { dmg: 60 }); allyTick(g, D, 'reyes', dt, { dmg: 24, cd: 1.6 }); dartTick(g, D, 'vance', dt, { cd: 2.4 });
      if (!b || b.dead || b.hp <= 0) { if (b && (b.dead || b.hp <= 0) && !D.won) { D.won = true; D.rings && D.rings.forEach(r => g.scene.remove(r.m)); D.rings = []; g.say([['vance', "He was a good sailor once. Lab. Now."]]); afterBoss(g, () => goto(g, 'c23_lab', 500)); } return; }
      if (g.cut) return;
      D.cd -= dt; if (D.cd <= 0) { D.cd = b.hp < b.maxHp * .5 ? 4 : 5.4; const p = b.root.position; g.toast('Chain swing — get clear!', 1.1); b.st = 'script'; b.play && b.play('Sword_Attack', { once: true }); ring(g, D, p.x, p.z, { r: 4.8, life: 1.3, color: '#e8f0ff', dmg: 28 }); setTimeout(() => { if (b && !b.dead) b.st = 'chase'; }, 1300); }
      D.th -= dt; if (D.th <= 0) { D.th = b.hp < b.maxHp * .5 ? 6.5 : 8.5; const p = b.root.position, P = g.player.root.position; lane(g, D, p.x, p.z, P.x, P.z, { n: 6, r: 1.3, life: 1.0, color: '#7ab8ff', dmg: 22 }); g.toast('Chain throw!', 1); }
      keepUp(g, D, dt, 3, () => grayHorde(g, 2, [[-6.6, -7690], [6.6, -7690]], { runner: true }), 4);
      if (!D.half && b.hp < b.maxHp * .5) { D.half = true; g.say([['reyes', "He's tiring. Keep moving and he'll keep missing!"]]); } } },

  { id: 'c23_lab', ch: 23, cp: [0, -7738, PI], obj: 'Protect the lab', hint: 'Vance and Dr. Reyes are making the Biscuit dose. Keep the gray out of the lab door for sixty seconds.', mood: 'tense', beat: 3, light: 'lab',
    enter(g) {
      const D = g.stepData; g.openGate(true); D.lobster = false; cast(g, D, 0, -7738, ['dad', 'reyes', 'nia', 'mom']); giveHammer(D.dad, false); D.vance = g.npc('vance', VLOOK, 3.2, -7742.8, PI, 'Idle_Loop'); A.spin = true;
      place(D.reyes, -3, -7742.8, PI); place(D.nia, -1.4, -7745.6, 0); place(D.mom, -2.4, -7746.2, PI * .2); place(D.dad, 0, -7731, PI); place(g.player, -.4, -7733, PI);
      if (D.nia.biscuit) D.nia.biscuit.visible = false; D.B = spawnBiscuit(g, -2.2, -7744, { y: .88, scale: 2.4 }); if (D.B.grp.children[1]) D.B.grp.children[1].visible = false; D.B.grp.rotation.y = PI; g.props.push(D.B.grp);
      D.ping = 3; D.wave = 0; D.holdHint = 'Vance and Dr. Reyes are making the Biscuit dose. Keep the gray out of the door.';
      g.say([['vance', "Two drops. He didn't even blink. Braver than most of my staff."], ['nia', "Told you. He's very brave."]]);
    },
    update(g, dt) { const D = g.stepData; hammerTick(g, D, dt, { home: [0, -7731] }); if (D.B && D.B.r && D.B.r.head) D.B.r.head.rotation.x = Math.max(0, Math.sin(g.t * 7)) * .3;
      D.ping -= dt; if (!D.held && D.ping <= 0) { D.ping = 8.5; const k = D.wave % 2; grayHorde(g, 5 + (D.wave > 2 ? 2 : 0), k ? [[-10, -7716], [-9, -7706]] : [[10, -7716], [9, -7706]], { runner: D.wave > 1 }); if (D.wave === 3) squad(g, [[-4, -7712], [4, -7712]], { hp: 100 }); g.toast(k ? 'Port side!' : 'Starboard!', 1.4); D.wave++;
        if (D.wave === 3) g.say([['reyes', "It's working. The gray cells are backing off. They're backing off!"]]);
        if (D.wave === 5) g.say([['vance', "Almost there. Keep that door shut, Pell."]]); }
      holdTick(g, D, dt, 60, 'Protect the lab', () => { D.clear = true; A.spin = false; });
      if (D.clear && g.alive().length === 0) { if (!D.go) { D.go = true; goto(g, 'c23_end', 400); } } else if (D.clear && !D.mop) { D.mop = true; g.objective('Clear the deck', 'Finish the last ones.'); } } },

  { id: 'c23_end', ch: 23, cp: [6, -7728, 0], obj: '', hint: '', mood: 'sad', beat: 0,
    enter(g) {
      const D = g.stepData; g.openGate(true); D.lobster = false; A.spin = false; cast(g, D, 4, -7726, ALL); giveHammer(D.dad, false); D.vance = g.npc('vance', VLOOK, 4.6, -7724.4, -PI / 2, 'Idle_Loop');
      place(g.player, 6.4, -7728, PI / 2); place(D.dad, 6.6, -7726, PI / 2); place(D.nia, 5.4, -7729.8, PI / 2); place(D.mom, 4.6, -7730.6, PI / 2); place(D.reyes, 4.2, -7722.6, PI * .6); place(D.danny, 2.4, -7724, PI * .5);
      // Hale's launch pulling away toward the lighthouse with the tanks
      const T = THREE, lb = new T.Group(); const hullM = new T.MeshStandardMaterial({ color: '#e8e8e2', roughness: .6 }); const h = new T.Mesh(new T.BoxGeometry(3, 1.2, 9), hullM); h.position.y = .5; lb.add(h); const cab = new T.Mesh(new T.BoxGeometry(2.4, 1.4, 3), new T.MeshStandardMaterial({ color: '#3a4048' })); cab.position.set(0, 1.7, 1); lb.add(cab);
      for (let i = 0; i < 3; i++) { const tk = new T.Mesh(new T.CylinderGeometry(.5, .5, 1.6, 12), new T.MeshStandardMaterial({ color: '#7a8288', emissive: '#4a6a60', emissiveIntensity: .6 })); tk.position.set(-.6 + i * .6, 1.6, -2.4); lb.add(tk); }
      const wl = new T.Mesh(new T.SphereGeometry(.15, 8, 6), new T.MeshBasicMaterial({ color: '#ff3a20' })); wl.position.set(0, 2.6, 1); lb.add(wl); lb.position.set(24, 0, -7728); lb.rotation.y = PI * .75; g.scene.add(lb); g.props.push(lb); D.lb = lb;
      g.cut = { anim: 'Idle_Loop', cam: V(10.4, 2.8, -7723), look: V(32, 1.5, -7740), flash: false }; snap(g);
      script(g, [
        (g) => { g.audio.engine && g.audio.engine(true, .6); g.audio.staticBurst && g.audio.staticBurst(1); D.go = true; },
        ['hale', "A cure in a rabbit. How quaint. Keep it. I'm taking the tanks to the lighthouse."],
        ['hale', "At sunrise, the foghorn sings. And the whole coast goes gray."],
        (g) => { cam(g, V(5.62, 1.63, -7722.74), V(4.6, 1.5, -7724.4)); },
        ['vance', "The fog mast at Portland Head. They rigged it to spray."],
        (g) => { cam(g, V(8.2, 1.7, -7724.4), V(6.6, 1.5, -7726)); },
        ['marcus', "Portland Head Light."],
        (g) => { cam(g, V(7.45, 1.68, -7725.5), V(6.4, 1.5, -7728)); face(g.player, 7.1, -7725.9); },
        ['keem', "Last time we were there, you told me to run."],
        (g) => { cam(g, V(8.2, 1.7, -7724.4), V(6.6, 1.5, -7726)); face(D.dad, 6.4, -7728); },
        ['marcus', "And this time?"],
        (g) => { cam(g, V(7.3, 1.62, -7725.75), V(6.4, 1.5, -7728)); face(g.player, 7.1, -7725.9); },
        ['keem', "This time, nobody runs."],
        (g) => { cam(g, V(0.99, 1.63, -7722.34), V(2.4, 1.5, -7724)); },
        ['danny', "There's a lifeboat on this side. I can drive a boat. I learned on… you know what, don't ask."],
        (g) => { cam(g, V(9.6, 4.6, -7728), V(60, 8, -7850)); const tok = g.stepTok; setTimeout(() => { g.audio.engine && g.audio.engine(false); if (g.stepTok === tok) g.onComplete && g.onComplete(23); }, 1800); },
      ]);
    },
    update(g, dt) { const D = g.stepData; tickMv(g, D, dt); if (D.go && D.lb) { D.lb.position.x += dt * 4.2; D.lb.position.z -= dt * 4.2; } } },
];

export const loot = [
  { id: 'c23a', kind: 'ammo', item: 'rifle', n: 70, pos: [8, .25, -7536], at: 'c23_sneak' },
  { id: 'c23b', kind: 'med', pos: [-8.6, .25, -7570], at: 'c23_sneak' },
  { id: 'c23c', kind: 'grenade', n: 3, pos: [10, .25, -7640], at: 'c23_deck' },
  { id: 'c23d', kind: 'ammo', item: 'shell', n: 22, pos: [-10, .25, -7690], at: 'c23_deck' },
  { id: 'c23e', kind: 'med', pos: [3, .25, -7676], at: 'c23_bosun' },
  { id: 'c23f', kind: 'cash', n: 800, pos: [-4.6, .25, -7598], at: 'c23_sneak' },
  pg(10.4, -7700, 'Captain Riverside #32: "Ship of Ghouls"', 'c23_deck'),
];
