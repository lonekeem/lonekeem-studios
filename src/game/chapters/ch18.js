// Chapter 18 · Right Behind You — Riverside Animal Clinic on Mill Road. Power, Keem's blood, Dad turning on the table,
// a long minute, Deputy Ruth, and the first cure. World band z -5400..-5700.
import * as THREE from 'three';
import { PI, V, dist2, goto, afterBoss, clearThen, dadGun, dadTick, boss, pg, rnd, $q } from './helpers.js';
import { walk, tickMv, cam, snap, script, cast, followAll, place, face, act, allyTick, holdTick, keepUp, ring, tickRings } from './ch15_kit.js';
import { mats, floor, prop, lamp, wallX, wallZ, table, shelfUnit, bloodPool, crate } from './kit/common.js';
import { tree, street, streetLamp, pickup } from './kit/town.js';
import { giveHammer } from '../hands.js';

export const meta = { n: 18, title: 'Right Behind You', endQuote: '“I can feel my hand.”' };
export const speakers = {};
export const Z0 = -5410;
const C = { x0: -16, x1: 16, zf: -5474, zb: -5524, H: 3.8 };
let A = null;

export function buildZone(ctx) {
  const K = mats(ctx), T = ctx.THREE; A = { lamps: [] };
  street(ctx, 0, -5395, -5440, 10); pickup(ctx, -3.4, -5428, .1, '#7a3a22');
  for (let i = 0; i < 8; i++) tree(ctx, (i % 2 ? 1 : -1) * (12 + (i * 5) % 9), -5398 - i * 6, 1.2, '#26402a');
  streetLamp(ctx, 6.6, -5420, true);
  // parking lot
  floor(ctx, 0, -5457, 52, 34, new T.MeshStandardMaterial({ color: '#4a4a48', roughness: .95 }), .02);
  for (let x = -20; x <= 20; x += 4) if (Math.abs(x) > 3) floor(ctx, x, -5464, .14, 5, new T.MeshStandardMaterial({ color: '#d8d4c8', emissive: '#d8d4c8', emissiveIntensity: .15 }), .03);
  ctx.car(-14, -5452, PI / 2, '#6a5a4a'); ctx.car(16, -5462, -PI / 2, '#3a4a6a');
  // Deputy Ruth's cruiser, light bar still going
  ctx.car(9, -5450, PI * .3, '#f0f0ec', { kind: 'police' });
  { const red = new T.MeshStandardMaterial({ color: '#300', emissive: '#ff2020', emissiveIntensity: 3 }), blue = new T.MeshStandardMaterial({ color: '#003', emissive: '#2050ff', emissiveIntensity: 3 });
    const r = new T.Mesh(new T.BoxGeometry(.5, .14, .2), red), b = new T.Mesh(new T.BoxGeometry(.5, .14, .2), blue); r.position.set(8.7, 1.72, -5450.2); b.position.set(9.3, 1.72, -5449.8); ctx.scene.add(r, b);
    const L = ctx.Z_pl ? ctx.Z_pl(9, 2.4, -5450, '#ff3030', 7, 14) : null; ctx.updaters.push((dt, t) => { const on = (t * 3 | 0) % 2 === 0; r.visible = on; b.visible = !on; if (L) L.color.set(on ? '#ff3030' : '#3050ff'); }); }
  // ---- the clinic ----
  const wallM = new T.MeshStandardMaterial({ color: '#d8d0bc', roughness: .85 }), trimM = new T.MeshStandardMaterial({ color: '#3a6a5a', roughness: .7 }), inM = new T.MeshStandardMaterial({ color: '#e4e8e0', roughness: .8 });
  const { x0, x1, zf, zb, H } = C;
  { const fl = floor(ctx, 0, (zf + zb) / 2, x1 - x0, zf - zb, new T.MeshStandardMaterial({ color: '#b8c4bc', roughness: .7, emissive: '#2a302c' }), .03); fl.receiveShadow = false; } // clean tile floor (no shadow blotches)
  wallX(ctx, x0, x1, zf, H, wallM, [{ c: 0, w: 3 }]); wallX(ctx, x0, x1, zb, H, wallM, [{ c: -10, w: 2.4 }, { c: 10, w: 2.4 }]);
  wallZ(ctx, zf, zb, x0, H, wallM); wallZ(ctx, zf, zb, x1, H, wallM);
  ctx.wallBox(x1 - x0 + .6, .3, zf - zb + .6, new T.MeshStandardMaterial({ color: '#cfd2cc', roughness: .9 }), 0, H + .15, (zf + zb) / 2, false);
  ctx.wallBox(x1 - x0 + 1.6, .5, 1.4, trimM, 0, H - .25, zf + .7, false); // awning
  ctx.sign(['RIVERSIDE ANIMAL CLINIC', 'DOGS · CATS · RABBITS · EVERYBODY'], 0, H + .9, zf + .25, 0, 9, 1.3, '#2a5a4a');
  const glow = new T.MeshStandardMaterial({ color: '#1a2228', roughness: .2, metalness: .3 }); [-9, -4.5, 4.5, 9].forEach(x => { const w = new T.Mesh(new T.PlaneGeometry(3, 1.6), glow); w.position.set(x, 1.7, zf + .22); ctx.scene.add(w); });
  // interior walls: lobby / kennels (west) / surgery (east) / generator room (south-east)
  wallX(ctx, x0, x1, -5488, H, inM, [{ c: -10, w: 2.4 }, { c: 0, w: 3 }, { c: 10, w: 2.4 }]);
  wallZ(ctx, -5488, zb, -4, H, inM, [{ c: -5506, w: 2.4 }]);
  wallZ(ctx, -5488, -5508, 4, H, inM, [{ c: -5498, w: 2.4 }]); wallX(ctx, 4, x1, -5508, H, inM, [{ c: 10, w: 2.4 }]); wallZ(ctx, -5508, zb, 4, H, inM, [{ c: -5516, w: 2.2 }]);
  // lobby: counter, chairs, a fish tank, posters
  prop(ctx, 6, 1.1, 1, K.wood, 6, .55, -5482, true); prop(ctx, 6.2, .08, 1.2, trimM, 6, 1.12, -5482);
  for (let i = 0; i < 4; i++) prop(ctx, .8, .5, .8, K.fabric, -12 + i * 1.6, .25, -5477, true);
  prop(ctx, 1.6, .8, .6, new T.MeshStandardMaterial({ color: '#4a8ac0', transparent: true, opacity: .55, emissive: '#2a6aa0', emissiveIntensity: .5 }), -13, 1.3, -5486.4); prop(ctx, 1.7, .9, .7, K.woodDark, -13, .45, -5486.4, true);
  ctx.sign(['WASH YOUR HANDS', 'EVERY PATIENT · EVERY TIME'], 12, 2.2, -5487.7, 0, 2.8, .9, '#3a6a5a');
  // kennels: cage rows down the west wall + a back row
  const cage = new T.MeshStandardMaterial({ color: '#8a9298', metalness: .6, roughness: .4, wireframe: true });
  for (let i = 0; i < 7; i++) { prop(ctx, 2.2, 1.2, 1.6, K.steelDark, -14.8, .6, -5491 - i * 4.6, true); const c = new T.Mesh(new T.BoxGeometry(2.2, 1.2, 1.6, 4, 3, 2), cage); c.position.set(-14.8, 1.85, -5491 - i * 4.6); ctx.scene.add(c); }
  for (let i = 0; i < 3; i++) prop(ctx, 1.4, 1, 1.2, K.steelDark, -9 + i * 2, .5, -5522.6, true);
  bloodPool(ctx, -9, -5500, 1); bloodPool(ctx, -11, -5514, .7); A.fuel = [-12.6, -5518];
  prop(ctx, .5, .7, .35, K.red, -12.6, .35, -5518); // the fuel can
  // surgery: steel table (Dad), centrifuge, blood fridge, instrument cart, a big lamp
  table(ctx, 10, -5503, { w: 2.4, d: 1, h: .95, mat: K.steel }); prop(ctx, 1.8, .44, .7, new T.MeshStandardMaterial({ color: '#3a6a5a', roughness: .7 }), 10, .22, -5498.5, true); A.table = [10, -5498.2];
  prop(ctx, .9, .7, .7, K.white, 14.6, 1.25, -5492, false); table(ctx, 14.6, -5492, { w: 1.4, d: .9, h: .9, mat: K.steel }); A.centrifuge = [14.6, -5492];
  prop(ctx, 1.4, 2.1, .9, K.steel, 14.8, 1.05, -5502.6, true); prop(ctx, 1, 1.5, .05, K.glass, 14.8, 1.15, -5502.1);
  prop(ctx, 1, .9, .5, K.steelDark, 6.2, .45, -5492, true);
  // generator room
  prop(ctx, 2.6, 1.5, 1.4, new T.MeshStandardMaterial({ color: '#c8a020', roughness: .6, metalness: .3 }), 12, .75, -5520, true); prop(ctx, .3, .3, 1.8, K.black, 12, 1.65, -5520); A.gen = [12, -5520];
  for (let i = 0; i < 3; i++) crate(ctx, 6 + i * 1.3, -5522.3, 1);
  // ceiling lights (own material so they can be dark until the generator runs)
  A.lampMat = new T.MeshStandardMaterial({ color: '#222', emissive: '#e8f4ff', emissiveIntensity: 2.2 });
  [[-10, -5480], [6, -5480], [-10, -5498], [-10, -5514], [0, -5500], [10, -5494], [10, -5502], [10, -5516]].forEach(([x, z], i) => A.lamps.push(lamp(ctx, x, z, { y: H - .05, mat: A.lampMat, real: i % 2 === 1 || i === 5, color: '#e8f2ff', intensity: 9, range: 16, size: [1.6, .08, .5] })));
  A.red = lamp(ctx, 0, -5520, { y: 3.4, mat: new T.MeshStandardMaterial({ color: '#300', emissive: '#ff3020', emissiveIntensity: 2.6 }), real: true, color: '#ff4030', intensity: 5, range: 14, size: [.35, .35, .35] });
}
function seat(c) { if (!c) return; c.update = null; c.root.position.set(10, 0, -5498.1); c.root.rotation.y = 0; c.play('Sitting_Idle_Loop'); }
function power(on) { if (!A) return; A.lampMat.emissiveIntensity = on ? 2.2 : 0; A.lamps.forEach(l => { if (l.light) l.light.intensity = on ? 9 : 0; }); if (A.red.light) A.red.light.intensity = on ? 0 : 5; A.red.mesh.visible = !on; }

// deputy's campaign hat on the boss's head
function deputyHat(b) { const T = THREE, h = new T.Group(), m = new T.MeshStandardMaterial({ color: '#8a6a3a', roughness: .8 }); const brim = new T.Mesh(new T.CylinderGeometry(.2, .2, .012, 20), m); h.add(brim); const crown = new T.Mesh(new T.ConeGeometry(.11, .13, 4), m); crown.position.y = .07; crown.rotation.y = PI / 4; h.add(crown); const band = new T.Mesh(new T.CylinderGeometry(.1, .1, .025, 16), new T.MeshStandardMaterial({ color: '#3a2a1a' })); band.position.y = .02; h.add(band); h.position.set(0, .13, 0); const hb = b.bone && b.bone('DEF-head'); if (hb) hb.add(h); else if (b.attach) b.attach('DEF-head', h); return h; }
function ruthBoss(g, D) { const b = boss(g, 9, -5446, 3200, '#b8996a', 'DEPUTY RUTH — Riverside Sheriff'); b.scale = 1.55; b.speed = 1.6; D.b = b; const u = b.mat && b.mat.userData && b.mat.userData.u; if (u && u.uPants) u.uPants.value.set('#3a4a3a'); deputyHat(b); return b; }

export const steps = [
  { id: 'c18_road', ch: 18, cp: [0, -5412, PI], obj: '', hint: '', mood: 'sad', beat: 0, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); power(false);
      cast(g, D, 0, -5412, ['dad', 'nia', 'mom', 'reyes', 'dube']);
      place(g.player, -.4, -5434, PI); place(D.dad, 1.4, -5433, PI); place(D.nia, -2, -5433.6, PI); place(D.mom, -3, -5432.4, PI); place(D.reyes, 2.6, -5435, PI); place(D.dube, -4.6, -5430.6, PI * .9);
      g.cut = { anim: 'Idle_Loop', cam: V(2.4, 1.7, -5439.8), look: V(0, 1.45, -5433.6), flash: false }; snap(g);
      script(g, [
        ['reyes', "Riverside Animal Clinic. I did my first year out of school here, under Doc Ames."],
        ['keem', "Hold up. You're a vet. You're making the cure at a vet."],
        ['reyes', "Biscuit is the reason we know it can work. Seems fair."],
        ['nia', "Biscuit says you're welcome."],
        (g) => { cam(g, V(-1.6, 1.8, -5440), V(8, 1.4, -5450)); },
        ['dube', "That's Ruth's cruiser. Lights still going."],
        ['marcus', "Then Ruth's close. Stay sharp."],
        (g) => { g.cut = null; followAll(g, D, ['dad', 'nia', 'mom', 'reyes', 'dube']); dadGun(g, D); g.objective('Clear the clinic lot', 'The lights pulled a crowd.');
          g.horde(10, [[-12, -5448], [12, -5446], [-6, -5456], [6, -5458], [0, -5466], [-16, -5464], [16, -5468]]); D.on = true; },
      ]);
    },
    update(g, dt) { const D = g.stepData; tickMv(g, D, dt); if (!D.on) return; dadTick(g, D, dt); allyTick(g, D, 'reyes', dt, { dmg: 30, cd: 1.4 }); allyTick(g, D, 'dube', dt, { dmg: 46, cd: 1.7, sound: 'shotgun' });
      D.t = (D.t || 0) + dt; if (D.t > 4 && g.alive().length === 0) clearThen(g, D, 'c18_power', 220, 'Get inside the clinic'); } },

  { id: 'c18_power', ch: 18, cp: [0, -5477, PI], obj: 'Get the generator running', hint: 'Find a fuel can in the kennels, then fill the generator in the back room.', mood: 'tense', beat: 1, light: 'dark', rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); power(false); cast(g, D, 0, -5477, ['dad', 'nia', 'mom', 'reyes', 'dube']); followAll(g, D, ['dad', 'reyes']);
      place(D.nia, -6, -5478, PI); place(D.mom, -7, -5479.4, PI * .8); place(D.dube, 4, -5478, PI);
      g.horde(4, [[-10, -5496], [-12, -5506], [-8, -5514], [-11, -5520]], { idle: true }); D.got = false;
      const take = () => { D.got = true; g.audio.pickup && g.audio.pickup(); g.toast('Fuel can', 1.4); g.wpTarget = [A.gen[0], 1.2, A.gen[1] + 1.6]; g.objective('Get the generator running', 'Fill the generator in the back room.'); g.horde(3, [[8, -5512], [14, -5514], [10, -5530]], { runner: true }); g.say([['keem', "Fuel can. Half full. Gotta be enough."]]); refresh(); };
      const fill = () => { if (D.done) return; D.done = true; g.audio.engine && g.audio.engine(true, .4); g.shake(.3); g.audio.click && g.audio.click(); power(true); g.toast('Power on', 1.6); g.say([['reyes', "That's my girl. Everybody to surgery."]], () => goto(g, 'c18_lab', 260)); };
      const refresh = () => { D.uses = D.got ? [{ x: A.gen[0], z: A.gen[1] + 1.6, r: 2.2, label: 'Fill the generator', fn: fill }] : [{ x: A.fuel[0] + 1, z: A.fuel[1], r: 2.2, label: 'Take the fuel can', fn: take }]; };
      refresh(); g.wpTarget = [A.fuel[0] + 1, 1.2, A.fuel[1]];
      g.say([['dana', "Something's in the kennels. More than one."], ['marcus', "Flashlight on, Keem."]]);
    },
    update(g, dt) { const D = g.stepData; dadTick(g, D, dt); allyTick(g, D, 'reyes', dt, { dmg: 28, cd: 1.5 });
      // sleepers wake when Keem gets close or makes noise
      g.alive().forEach(z => { if (z.st === 'idle' && z.root.position.distanceTo(g.player.root.position) < 6) z.st = 'chase'; }); } },

  { id: 'c18_lab', ch: 18, cp: [7.4, -5494.6, PI / 2], obj: '', hint: '', mood: 'sad', beat: 1, light: 'ward', rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); power(true); cast(g, D, 8, -5494, ['dad', 'nia', 'mom', 'reyes', 'dube']);
      seat(D.dad); place(g.player, 11.1, -5496.6, -PI * .8); place(D.reyes, 12.2, -5497.8, -PI / 2); place(D.mom, 8.8, -5497, PI * .7); place(D.nia, 8.6, -5495.6, PI * .8); place(D.dube, 6.4, -5492.4, PI * .75);
      g.cut = { anim: 'Idle_Loop', cam: V(10.2, 1.55, -5493.6), look: V(10.2, 1.05, -5497.6), flash: false }; snap(g);
      script(g, [
        (g) => { act(D.reyes, 'reach', { sides: 'R', k: .8 }); act(g.player, 'reach', { sides: 'R', k: .6 }); },
        ['reyes', "Arm out, Keem. Little pinch. Every single bite, remember?"],
        ['keem', "I remember. Take what you need."],
        (g) => { act(D.reyes, null); act(g.player, null); act(D.reyes, 'hold', { k: .7 }); cam(g, V(9.2, 1.7, -5494.4), V(12, 1.3, -5497.6)); },
        ['reyes', "His blood, Vance's notes, and Doc Ames' centrifuge. Ninety seconds to spin it down."],
        (g) => { act(D.reyes, null); act(D.dad, 'clutch', { sides: 'L', k: 1 }); g.shake(.2); cam(g, V(10.05, 1.2, -5495.8), V(10, 1.05, -5498)); },
        ['marcus', "Dana… it's getting gray. The edges."],
        (g) => { act(D.mom, 'hold', { k: 1 }); },
        ['dana', "Marcus, look at me. Look at me. Stay right here."],
        ['marcus', "Keem. If I go…"],
        ['keem', "You're not going anywhere. You said right behind us. So stay right behind us."],
        (g) => { act(D.mom, null); act(D.dad, null); g.audio.roar && g.audio.roar(); g.shake(.35); cam(g, V(2, 2.2, -5486), V(0, 1.4, -5476)); },
        ['dube', "Generator's loud. They heard it all the way to the river."],
        (g) => { g.cut = null; goto(g, 'c18_hold', 140); },
      ]);
    },
    update(g, dt) { tickMv(g, g.stepData, dt); } },

  { id: 'c18_hold', ch: 18, cp: [0, -5492, PI], obj: 'Hold the clinic', hint: 'Front door and the two back doors. Keep them out of surgery.', mood: 'tense', beat: 3, light: 'ward', rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); power(true); cast(g, D, 0, -5492, ['dad', 'nia', 'mom', 'reyes', 'dube']);
      seat(D.dad); place(D.reyes, 14, -5493, PI / 2); place(D.mom, 8.8, -5497, PI * .7); place(D.nia, 8.6, -5495.6, PI * .8); place(D.dube, 2, -5486, PI);
      D.holdHint = 'Ninety seconds on the centrifuge. Keep them out of surgery. Mr. Dube has the front.';
      g.horde(6, [[0, -5462], [-6, -5460], [6, -5464]]); D.ping = 8; D.wave = 0;
    },
    update(g, dt) { const D = g.stepData; allyTick(g, D, 'dube', dt, { dmg: 46, cd: 1.6, sound: 'shotgun' });
      D.ping -= dt; if (!D.held && D.ping <= 0) { D.ping = 10; const k = D.wave % 3; const pts = k === 0 ? [[0, -5462], [-6, -5460], [6, -5464]] : k === 1 ? [[-10, -5530], [-12, -5534]] : [[10, -5530], [12, -5534]];
        g.toast(['Front door!', 'Kennel back door!', 'Generator room door!'][k], 1.8); g.horde(k === 0 ? 6 : 4, pts, { runner: D.wave > 1 }); D.wave++;
        if (D.wave === 2) g.say([['reyes', "Halfway. Don't let them near the cart."]]); if (D.wave === 4) g.say([['nia', "Dad's hand is moving. Is that good?"], ['dana', "Hold it, baby. Just hold it."]]); }
      holdTick(g, D, dt, 60, 'Hold the clinic', () => { D.clear = true; });
      if (D.clear && g.alive().length === 0) { if (!D.go) { D.go = true; g.audio.siren && g.audio.siren(.05, 3); g.say([['dube', "That siren. That's Ruth's car."], ['keem', "I got her. Finish it, Doc."]], () => goto(g, 'c18_ruth', 300)); } } else if (D.clear && !D.mop) { D.mop = true; g.objective('Clear the clinic', 'Finish the ones inside.'); } } },

  { id: 'c18_ruth', ch: 18, cp: [0, -5468, PI], obj: 'Stop Deputy Ruth', hint: 'Roll out of the yellow taser rings. When her siren blares, more come. Aim for her head.', mood: 'tense', beat: 3, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); cast(g, D, 0, -5470, ['dube']); place(D.dube, -2, -5472, PI);
      const b = ruthBoss(g, D); b.st = 'script'; b.root.rotation.y = 0;
      g.cut = { anim: 'Idle_Loop', cam: V(-2.6, 1.8, -5462), look: V(9, 2, -5447), flash: false }; snap(g);
      script(g, [
        ['keem', "Deputy Ruth. You were looking for me at the market that first night."],
        ['keem', "Sorry I'm late."],
        (g) => { g.cut = null; b.st = 'chase'; D.cd = 3; D.sir = 12; },
      ]);
    },
    update(g, dt) { const D = g.stepData, b = D.b; allyTick(g, D, 'dube', dt, { dmg: 40, cd: 1.8, sound: 'shotgun' }); tickRings(g, D, dt);
      if (!b || b.dead) { if (b && b.dead && !D.won) { D.won = true; D.rings && D.rings.forEach(r => g.scene.remove(r.m)); D.rings = []; g.say([['dube', "Rest now, Ruth. You did your shift."]]); afterBoss(g, () => goto(g, 'c18_cure', 320)); } return; }
      if (g.cut || D.cd == null) return;
      D.cd -= dt; if (D.cd <= 0) { D.cd = b.hp < b.maxHp * .5 ? 3 : 4.2; const P = g.player.root.position; ring(g, D, P.x, P.z, { r: 2.1, life: 1.1, color: '#ffe040', dmg: 16 }); if (b.hp < b.maxHp * .5) ring(g, D, P.x + rnd(-3, 3), P.z + rnd(-3, 3), { r: 2, life: 1.4, color: '#ffe040', dmg: 14 }); }
      D.sir -= dt; if (D.sir <= 0) { D.sir = 14; g.audio.siren && g.audio.siren(.05, 2); g.toast('Her siren — more coming', 1.8); g.horde(4, [[-16, -5446], [16, -5448], [0, -5440]], { runner: true }); }
      if (!D.half && b.hp < b.maxHp * .5) { D.half = true; g.say([['dube', "Her badge is still pinned on straight. That's Ruth."]]); } } },

  { id: 'c18_cure', ch: 18, cp: [7.4, -5494.6, PI / 2], obj: '', hint: '', mood: 'sad', beat: 0, light: 'ward', rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); power(true); cast(g, D, 8, -5494, ['dad', 'nia', 'mom', 'reyes', 'dube']);
      seat(D.dad); place(g.player, 11.1, -5496.6, -PI * .8); place(D.reyes, 12.2, -5497.8, -PI / 2); place(D.mom, 8.8, -5497, PI * .7); place(D.nia, 8.6, -5495.6, PI * .8); place(D.dube, 6.4, -5492.4, PI * .75);
      g.cut = { anim: 'Idle_Loop', cam: V(10.2, 1.55, -5493.6), look: V(10.2, 1.05, -5497.6), flash: false }; snap(g);
      script(g, [
        (g) => { act(D.reyes, 'reach', { sides: 'R', k: 1 }); },
        ['reyes', "This is it. One dose. If it's wrong, I don't get a second try."],
        ['dana', "Do it."],
        (g) => { act(D.reyes, null); g.shake(.5); g.audio.thud && g.audio.thud(); act(D.dad, 'clutch', { sides: 'LR', k: 1 }); cam(g, V(10.05, 1.2, -5495.8), V(10, 1.05, -5498)); },
        ['keem', "Dad? Dad."],
        (g) => { act(D.dad, null); },
        ['nia', "Daddy?"],
        (g) => { act(D.dad, 'reach', { sides: 'L', k: .7 }); },
        ['marcus', "…Keem?"],
        ['marcus', "I can feel my hand."],
        (g) => { act(D.dad, null); act(D.nia, 'hug', { k: 1 }); act(D.mom, 'hold', { k: .8 }); cam(g, V(10.2, 1.55, -5493.6), V(10, 1.05, -5497.4)); },
        ['dana', "Oh, Marcus."],
        ['reyes', "It works. It actually works."],
        ['keem', "Told you. Right behind us."],
        (g) => { act(D.nia, null); act(D.mom, null); g.audio.staticBurst && g.audio.staticBurst(1.2); cam(g, V(7.6, 1.8, -5492.6), V(10, 1.2, -5497.4)); },
        ['director', "Impressive, Doctor Reyes. Truly. Now you have something I want. The Quiet Protocol still begins at dawn."],
        ['dube', "Signal Hill. The old station up the ridge. Put that recipe on the air and every town up the coast hears it."],
        ['reyes', "Then nobody needs the Authority to decide who gets saved."],
        (g) => { giveHammer(D.dad, false); act(D.dad, 'hold', { sides: 'R', k: .7 }); },
        ['marcus', "Then let's go fix some steps."],
        ['keem', "Everybody gets a cure. Not just us."],
        (g) => { setTimeout(() => g.onComplete && g.onComplete(18), 900); },
      ]);
    },
    update(g, dt) { tickMv(g, g.stepData, dt); } },
];

export const loot = [
  { id: 'c18a', kind: 'ammo', item: 'rifle', n: 60, pos: [-18, .25, -5450], at: 'c18_road' },
  { id: 'c18b', kind: 'med', pos: [6, .25, -5480], at: 'c18_power' },
  { id: 'c18c', kind: 'ammo', item: 'shell', n: 18, pos: [-6, .25, -5520], at: 'c18_power' },
  { id: 'c18d', kind: 'grenade', n: 3, pos: [-2, .25, -5486], at: 'c18_hold' },
  { id: 'c18e', kind: 'med', pos: [-14, .25, -5470], at: 'c18_ruth' },
  pg(-13, -5509, 'Captain Riverside #27: "The Vet Will See You Now"', 'c18_power'),
];
