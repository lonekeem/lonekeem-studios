// Chapter 15 · PFC Danny Is So Sorry — the Harborside Market on the Boston waterfront. Tuck is back, the evac pilot from
// Haverford is hiding in the freezer in a lobster suit, the market is booby-trapped, and Larry the Lobster wants his suit back.
// World band z -4100..-4400.
import * as THREE from 'three';
import { PI, V, dist2, goto, afterBoss, clearThen, dadGun, dadTick, pg, rnd, $q } from './helpers.js';
import { walk, tickMv, cam, snap, script, cast, followAll, freeze, place, face, act, allyTick, holdTick, keepUp, lobsterSuit, LOOK } from './ch15_kit.js';
import { buildMarket } from './kit/market.js';
import { room, slabDoor, wallX } from './kit/common.js';
import { mats, floor, prop, lamp, crate, bloodPool } from './kit/common.js';

export const meta = { n: 15, title: 'PFC Danny Is So Sorry', endQuote: '“Dear Haverford, I\'m so sorry.”' };
export const speakers = { danny: 'PFC Danny' };
export const Z0 = -4100;
let A = null;

// ---------- the set ----------
export function buildZone(ctx) {
  const K = mats(ctx), T = ctx.THREE;
  // waterfront street: service door from the hospital tunnel, harbor water to the east, lamps and wrecks
  floor(ctx, 0, -4116, 96, 34, K.concrete, .02);
  if (ctx.road) try { ctx.road(0, -4116, 96, 10, 0); } catch (e) { /* optional */ }
  const water = new T.Mesh(new T.PlaneGeometry(60, 400), new T.MeshStandardMaterial({ color: '#16303c', roughness: .15, metalness: .4 })); water.rotation.x = -PI / 2; water.position.set(64, -.25, -4250); ctx.scene.add(water);
  ctx.box(34, 48, -4400, -4100);
  for (let z = -4104; z > -4400; z -= 6) prop(ctx, .3, 1.1, .3, K.steelDark, 33.6, .55, z, false); // bollards along the pier edge
  prop(ctx, 14, 5, 1.2, K.brick, -6, 2.5, -4099.6, true); prop(ctx, 14.4, .4, 1.6, K.concrete, -6, 5.1, -4099.6); prop(ctx, 2, 2.6, .12, K.steel, -6, 1.3, -4098.95); prop(ctx, 2.4, .2, .3, K.steelDark, -6, 2.7, -4098.9);
  lamp(ctx, -6, -4099.3, { y: 3.2, real: true, color: '#ffd8a0', intensity: 7, range: 14, size: [.6, .15, .3] }); [-11, -1].forEach(x => prop(ctx, 1.4, 1, .06, K.glass, x, 2.6, -4098.95));
  ctx.sign(['MASS GENERAL', 'SERVICE TUNNEL'], -6, 3.4, -4100.25, 0, 3.4, .8, '#0a2a5a');
  [[-24, -4106], [24, -4108], [-26, -4124]].forEach(([x, z], i) => { if (ctx.car) try { ctx.car(x, z, i * 1.3 + .4, ['#5a6a7a', '#7a2a2a', '#c8c4b8'][i]); } catch (e) { /* optional */ } });
  [-18, 0, 18].forEach(x => ctx.Z_lamp && ctx.Z_lamp(x, -4104, '#ffc98a', x === 18));
  bloodPool(ctx, 6, -4114, 1.2); bloodPool(ctx, -12, -4120, .9);
  ctx.fire && ctx.fire(28, 0, -4126, .6);
  const M = buildMarket(ctx, { x: 0, z: -4130, w: 48, d: 90 });
  const F = freezer(ctx, 14, -4228);
  // path between the market's back door and the freezer + the roof stair tower
  floor(ctx, 7, -4224, 34, 9, K.concrete, .025);
  lamp(ctx, 4, -4224, { y: 3.6, real: true, intensity: 9, range: 18 }); lamp(ctx, 18, -4224, { y: 3.6, real: false });
  // Danny's traps: hanging fish crates over red-and-white plates, rubber-chicken alarms on posts, trap levers on the walls
  const plateTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = (i + j) % 2 ? '#e8e4dc' : '#c8281c'; x.fillRect(i * 8, j * 8, 8, 8); } const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; })();
  const plateM = new T.MeshStandardMaterial({ map: plateTex, roughness: .6 });
  const traps = [];
  const slots = M.trapSlots.filter((s, i) => i % 2 === 0); // 6 plates
  slots.forEach((s, i) => { const px = s.x + (i % 2 ? 1.5 : -1.5), pz = s.z - .5; const pl = new T.Mesh(new T.PlaneGeometry(2.2, 2.2), plateM); pl.rotation.x = -PI / 2; pl.position.set(px, .05, pz); ctx.scene.add(pl);
    const cr = new T.Group(); const box = new T.Mesh(new T.BoxGeometry(1.5, 1.1, 1.5), K.woodDark); cr.add(box); for (let k = 0; k < 3; k++) { const f = new T.Mesh(new T.CylinderGeometry(.09, .14, .7, 6), new T.MeshStandardMaterial({ color: '#8aa0b0', metalness: .4, roughness: .4 })); f.rotation.z = PI / 2; f.position.set(-.3 + k * .3, .62, 0); cr.add(f); }
    const rope = new T.Mesh(new T.CylinderGeometry(.025, .025, 1.6, 5), new T.MeshStandardMaterial({ color: '#c8b48a' })); rope.position.y = 1.35; cr.add(rope); cr.position.set(px, 4.4, pz); ctx.scene.add(cr);
    traps.push({ x: px, z: pz, crate: cr, plate: pl, rope, st: 'armed', t: 0 }); });
  const chickM = new T.MeshStandardMaterial({ color: '#f0c020', roughness: .5 }), beakM = new T.MeshStandardMaterial({ color: '#e07020' });
  const chickens = [[-20, -4150], [20, -4172], [-20, -4194]].map(([x, z]) => { prop(ctx, .12, 1.3, .12, K.steelDark, x, .65, z); const c = new T.Group(); const b = new T.Mesh(new T.SphereGeometry(.22, 10, 8), chickM); b.scale.set(.7, 1, .7); c.add(b); const h = new T.Mesh(new T.SphereGeometry(.12, 8, 6), chickM); h.position.y = .26; c.add(h); const bk = new T.Mesh(new T.ConeGeometry(.04, .12, 6), beakM); bk.rotation.x = PI / 2; bk.position.set(0, .26, .14); c.add(bk); c.position.set(x, 1.5, z); ctx.scene.add(c); return { x, z, m: c }; });
  const levers = [[-23, -4160], [23, -4184], [-23, -4204]].map(([x, z]) => { prop(ctx, .5, .8, .2, K.red, x, 1.2, z); const h = prop(ctx, .08, .6, .08, K.steel, x, 1.6, z + .1); return { x: x + (x < 0 ? 1 : -1), z, h }; });
  // the cheese cave + bakery oven + fish counter where the helicopter parts are hidden
  const parts = { key: [M.stalls[0].x, M.stalls[0].z + 1.8], battery: [M.stalls[5].x, M.stalls[5].z + 1.8], fuse: [M.stalls[10].x, M.stalls[10].z + 1.8] };
  prop(ctx, 1.6, 1.2, 1.2, K.steelDark, parts.fuse[0], .6, parts.fuse[1] - 1.4, true); prop(ctx, 1.2, .5, .1, new T.MeshStandardMaterial({ color: '#331', emissive: '#ff6a20', emissiveIntensity: 1.4 }), parts.fuse[0], .7, parts.fuse[1] - .75);
  for (let i = 0; i < 5; i++) prop(ctx, .7, .45, .7, new T.MeshStandardMaterial({ color: '#e8c050', roughness: .7 }), parts.battery[0] - 1.6 + i * .8, 1.35, parts.battery[1] - 1.8);
  // Danny's letters on the freezer floor + sleeping bag; stair tower to the roof
  for (let i = 0; i < 14; i++) { const p = prop(ctx, .3, .01, .22, K.white, F.hideout[0] - 1.6 + (i % 5) * .5, .06, F.hideout[1] + 1.2 + (i / 5 | 0) * .4); p.rotation.y = (i * 1.7) % 1; }
  prop(ctx, 5, 6, 5, K.brick, M.rooftopStairs[0] + 3, 3, M.rooftopStairs[1] - 6, true); ctx.sign(['ROOF'], M.rooftopStairs[0] + 3, 3, M.rooftopStairs[1] - 3.4, 0, 1.6, .5, '#a01010');
  // extra fill so the hall is never pitch black on phones (emissive strips, no new real lights)
  for (let i = 0; i < 4; i++) lamp(ctx, -22.5, -4140 - i * 22, { y: 2.8, real: false, size: [.12, .1, 3] }), lamp(ctx, 22.5, -4140 - i * 22, { y: 2.8, real: false, size: [.12, .1, 3] });
  A = { M, F, traps, chickens, levers, parts };
}

function freezer(ctx, x, z, w = 14, d = 16) { const K = mats(ctx), T = ctx.THREE, A = { rect: [x, z - d / 2, w, d] };
  const frost = new T.MeshStandardMaterial({ color: '#cfe6f2', roughness: .6 }), meat = new T.MeshStandardMaterial({ color: '#d09a8a', roughness: .8 });
  floor(ctx, x, z - d / 2, w, d, frost); room(ctx, { x, z: z - d / 2, w, d, h: 3.6, mat: frost, doors: { n: [x] }, doorW: 2.4 });
  A.door = slabDoor(ctx, { x, z, w: 2.4, along: 'x', mat: K.steel });
  [-1, 1].forEach(s => { prop(ctx, .5, 3, d - 4, K.steelDark, x + s * (w / 2 - .8), 1.5, z - d / 2, true); for (let j = 0; j < 4; j++) prop(ctx, .6, .5, .5, meat, x + s * (w / 2 - 1.4), 1 + (j % 2), z - 4 - j * 3); });
  for (let i = 0; i < 6; i++) crate(ctx, x - 3 + (i % 3) * 1.2, z - d + 1.2 + (i / 3 | 0) * .1, .9, K.wood, i * .3);
  A.hideout = [x + 3.5, z - d + 3]; prop(ctx, 2.6, .25, 1.8, K.fabric, x + 3.5, .15, z - d + 2.4);
  lamp(ctx, x, z - d / 2 + 2, { real: true, mat: K.lampCold, color: '#d8ecff', intensity: 9, range: 16 }); lamp(ctx, x, z - d + 3, { real: false, mat: K.lampCold });
  return A; }

// ---------- trap system ----------
function trapTick(g, D, dt) {
  if (!A) return; const P = g.player.root.position;
  A.traps.forEach(t => {
    if (t.st === 'armed') {
      let fire = false; g.alive().forEach(z => { if (z.boss) return; const q = z.root.position; if (Math.abs(q.x - t.x) < 1.3 && Math.abs(q.z - t.z) < 1.3) fire = true; });
      const me = Math.abs(P.x - t.x) < 1.1 && Math.abs(P.z - t.z) < 1.1 && !g.cut;
      if (fire || me) { t.st = 'drop'; t.t = 0; t.me = me; }
    } else if (t.st === 'drop') {
      t.t += dt; t.crate.position.y = Math.max(.55, 4.4 - t.t * t.t * 60);
      if (t.crate.position.y <= .55) { t.st = 'down'; t.t = 0; g.shake(.25); g.audio.crash ? g.audio.crash() : g.audio.thud && g.audio.thud();
        g.alive().forEach(z => { const q = z.root.position; if (Math.hypot(q.x - t.x, q.z - t.z) < 2.2) { const dir = q.clone().sub(new THREE.Vector3(t.x, 0, t.z)).setY(0).normalize(); g.damageZ(z, z.boss ? 260 : 999, dir, { ai: true, boom: true }); if (!z.boss) D.trapKills = (D.trapKills || 0) + 1; } });
        if (Math.hypot(P.x - t.x, P.z - t.z) < 1.6 && !(g.state.roll > 0)) { g.hurt(12, { x: t.x, z: t.z }); if (!D.ouch && D.dannyNear !== false) { D.ouch = true; g.say([['danny', "Sorry! Sorry! That one was for them!"]]); } }
      }
    } else if (t.st === 'down') { t.t += dt; if (t.t > 5) { t.st = 'up'; t.t = 0; } }
    else if (t.st === 'up') { t.crate.position.y = Math.min(4.4, t.crate.position.y + dt * 3); if (t.crate.position.y >= 4.4) t.st = 'armed'; }
  });
  // lured zombies walk to the nearest armed plate
  if (D.lure) { D.lure.t -= dt; g.alive().forEach(z => { if (z.boss || z.raider || !z._lure) return; const q = z.root.position, tp = z._lure; const dx = tp.x - q.x, dz = tp.z - q.z, d = Math.hypot(dx, dz);
      if (D.lure.t <= 0 || d < .3) { z._lure = null; z.st = 'chase'; return; } z.st = 'script'; const s = Math.min(d, 2.6 * dt); q.x += dx / d * s; q.z += dz / d * s; z.root.rotation.y = Math.atan2(dx, dz); z.play && z.play('Walk_Loop'); });
    if (D.lure.t <= 0) D.lure = null; }
}
function squeak(g, D, ch) {
  g.audio.tone && (g.audio.tone(1400, .12, 'square', .06), setTimeout(() => g.audio.tone(900, .18, 'square', .05), 130));
  g.toast('SQUEEEAK', 1.2); ch.m.rotation.z = .5; setTimeout(() => { ch.m.rotation.z = 0; }, 400);
  const armed = A.traps.filter(t => t.st === 'armed'); if (!armed.length) return;
  D.lure = { t: 7 }; g.alive().forEach(z => { if (z.boss || z.raider) return; const q = z.root.position; if (Math.hypot(q.x - ch.x, q.z - ch.z) > 34) return; let best = armed[0], bd = 1e9; armed.forEach(t => { const d = Math.hypot(t.x - q.x, t.z - q.z); if (d < bd) { bd = d; best = t; } }); z._lure = new THREE.Vector3(best.x, 0, best.z); });
}
function pullLever(g, D, lv) {
  lv.h.rotation.x = -.9; setTimeout(() => { lv.h.rotation.x = 0; }, 900); g.audio.click && g.audio.click();
  // drop the two plates nearest the lever, whatever is under them
  [...A.traps].sort((a, b) => Math.hypot(a.x - lv.x, a.z - lv.z) - Math.hypot(b.x - lv.x, b.z - lv.z)).slice(0, 2).forEach(t => { if (t.st === 'armed') { t.st = 'drop'; t.t = 0; } });
  // and a fish-crate swing down the aisle
  let n = 0; g.alive().forEach(z => { if (z.boss) return; const q = z.root.position; if (Math.abs(q.z - lv.z) < 3.2) { g.damageZ(z, 999, new THREE.Vector3(lv.x < 0 ? 1 : -1, 0, 0), { ai: true, boom: true }); n++; } });
  g.toast(n ? 'FISH CRATE! ×' + n : 'Lever pulled', 1.4);
}
function trapUses(g, D, withLevers) {
  const u = A.chickens.map(c => ({ x: c.x + (c.x < 0 ? 1.2 : -1.2), z: c.z, r: 2.2, label: 'Squeeze the rubber chicken', fn: (g) => squeak(g, D, c) }));
  if (withLevers) A.levers.forEach(l => u.push({ x: l.x, z: l.z, r: 2.2, label: 'Pull the trap lever', fn: (g) => pullLever(g, D, l) }));
  return u;
}
const hidePlateHint = () => {};

// ---------- steps ----------
export const steps = [
  { id: 'c15_dock', ch: 15, cp: [-6, -4103, PI], obj: '', hint: '', mood: 'night', beat: 0, rain: false,
    enter(g) {
      const D = g.stepData; g.openGate(true); cast(g, D, -6, -4103, ['dad', 'nia', 'mom']);
      place(D.dad, -4.4, -4103.6, PI); place(D.nia, -7.6, -4103.4, PI); place(D.mom, -8.4, -4102.4, PI * .9);
      g.player.root.position.set(-6, 0, -4104.4); g.player.root.rotation.y = PI;
      g.cut = { anim: 'Idle_Loop', cam: V(-1.5, 1.8, -4110.5), look: V(-6, 1.3, -4103), flash: false }; snap(g);
      script(g, [
        ['nia', "Biscuit, we're outside. Smell that? That's the ocean."],
        ['marcus', "That's the ocean and about forty dead guys."],
        (g) => { g.audio.staticBurst && g.audio.staticBurst(.6); act(g.player, 'reach', { sides: 'R', k: .7 }); g.player.play('Idle_Talking_Loop'); cam(g, V(-4.2, 1.6, -4107.6), V(-6, 1.4, -4104.4)); },
        ['tuck', 'Keem? Keem, it\'s Tuck. Tell me you still have the walkie.'],
        ['keem', 'Tuck? Where have you been, man?'],
        ['tuck', 'The searchlights split us up at Quarantine Row. Long story. I\'m at the Harborside Market.'],
        ['tuck', 'I found a pilot. He\'s hiding in the freezer. He\'s wearing a lobster costume.'],
        ['dana', 'A pilot? Who is he?'],
        ['tuck', 'He says his name is Danny. He says to tell you he\'s really, really sorry.'],
        (g) => { act(g.player, null); face(D.nia, -6, -4104.4); D.nia.play('Idle_Talking_Loop'); cam(g, V(-9.8, 1.4, -4107.2), V(-7.4, 1.0, -4103.4)); },
        ['nia', 'PFC Danny? Scoreboard Danny? Danny is a big dummy.'],
        ['keem', 'A big dummy with a helicopter. Let\'s go.'],
        (g) => { g.cut = null; followAll(g, D); dadGun(g, D); g.wpTarget = [0, 1.2, -4128]; g.objective('Get to the Harborside Market', 'Follow the marker down the waterfront.');
          g.horde(7, [[10, -4112], [-14, -4116], [18, -4122], [-4, -4124], [6, -4126]]); D.go = 'walk'; },
      ]);
    },
    update(g, dt) { const D = g.stepData; tickMv(g, D, dt); dadTick(g, D, dt); if (D.go === 'walk' && dist2(g, 0, -4128) < 3.5) { D.go = true; goto(g, 'c15_traps', 120); } } },

  { id: 'c15_traps', ch: 15, cp: [0, -4132, PI], obj: 'Cross the market to the freezer', hint: 'Red-and-white squares are traps. Squeeze a rubber chicken to pull zombies onto them.', mood: 'tense', beat: 2, light: 'ward',
    enter(g) {
      const D = g.stepData; g.openGate(true); cast(g, D, 0, -4130, ['dad', 'nia', 'mom']); followAll(g, D); dadGun(g, D);
      g.horde(10, [[-10, -4150], [10, -4152], [-14, -4168], [6, -4174], [-6, -4190], [14, -4196], [0, -4206]], { still: false });
      D.uses = trapUses(g, D, false);
      g.wpTarget = [0, 1.2, -4214];
      g.say([['tuck', "Careful in there. He rigged the whole place. The red squares are traps."], ['danny', "Hi. Hello. Please don't step on the red squares. They're for them, not you. Sorry."], ['keem', "Who rigs a fish market?"], ['danny', "A very scared person! Squeeze a chicken if you want them to go where the crates are."]]);
    },
    update(g, dt) { const D = g.stepData; dadTick(g, D, dt); trapTick(g, D, dt);
      if (!D.tip && (D.trapKills || 0) >= 1) { D.tip = true; g.say([['marcus', "Huh. The crates work."], ['danny', "Thank you! Nobody ever says that!"]]); }
      if (!D.go && dist2(g, 0, -4214) < 3.5) { D.go = true; goto(g, 'c15_freezer', 150); } } },

  { id: 'c15_freezer', ch: 15, cp: [14, -4226, PI], obj: '', hint: '', mood: 'night', beat: 0, light: 'ward',
    enter(g) {
      const D = g.stepData, F = A.F; g.openGate(true); F.door.setOpen(true);
      cast(g, D, 14, -4226, ['dad', 'nia', 'mom', 'tuck', 'danny']);
      place(g.player, 14, -4232.2, PI); place(D.dad, 15.8, -4231.4, PI); place(D.nia, 12.2, -4231.6, PI); place(D.mom, 11.6, -4230.4, PI);
      place(D.tuck, 16.4, -4235.2, 0); place(D.danny, 14.6, -4238.6, 0);
      D.danny.play('Crouch_Idle_Loop'); act(D.danny, 'clutch', { k: 1 });
      g.cut = { anim: 'Idle_Loop', cam: V(10.6, 1.75, -4230.4), look: V(15, 1.1, -4237), flash: false }; snap(g);
      script(g, [
        (g) => { walk(D, D.tuck, 15.2, -4233.8, { sp: 2.2, end: 'Idle_Talking_Loop', face: PI }); },
        ['tuck', "Keem! Dr. Pell! Mr. Pell! Nia!"],
        ['nia', "Tuck! You're alive!"],
        ['tuck', "Mostly. I've been in a freezer with him for two days. I can't feel my face."],
        (g) => { act(D.danny, null); D.danny.play('Idle_Talking_Loop'); walk(D, D.danny, 14.2, -4236.2, { sp: 1.2, end: 'Idle_Talking_Loop', face: PI }); cam(g, V(12.2, 1.6, -4232.8), V(14.2, 1.45, -4236.4)); },
        ['danny', "Hi. Hello. Private First Class Danny. Haverford evac. I'm so sorry."],
        ['keem', "You left the stadium early. People were waiting for you."],
        (g) => { act(D.danny, 'shrug', { k: .9 }); },
        ['danny', "I know. I wrote it on the scoreboard. And on these. Forty letters. Dear Haverford, I'm so sorry."],
        (g) => { act(D.danny, null); D.dad.play('Idle_Talking_Loop'); },
        ['marcus', "Why are you dressed like a lobster, son?"],
        ['danny', "Zombies don't look twice at a lobster. Mostly. Except Larry."],
        ['dana', "Who is Larry?"],
        ['danny', "Larry was the mascot before me. He turned in the suit. He's still out there. He's big."],
        (g) => { cam(g, V(16.8, 1.7, -4231.6), V(14.4, 1.4, -4236)); act(g.player, 'point', { sides: 'R', k: .8 }); },
        ['keem', "Can you fly us out or not?"],
        (g) => { act(g.player, null); act(D.danny, 'point', { sides: 'R', k: 1 }); D.danny.root.rotation.y = PI * .75; },
        ['danny', "My bird is on the roof. But I hid three parts so nobody could steal it. The key, the battery, and the fuel pump fuse."],
        ['tuck', "He hid them in the market. With the zombies. Then he hid in here."],
        ['keem', "Cool. I'll do the dangerous part. Where?"],
        (g) => { act(D.danny, null); },
        ['danny', "Key's in the fish counter. Battery's in the cheese cave. Fuse is in the bakery oven."],
        ['nia', "Why?"],
        ['danny', "I panicked!"],
        (g) => { g.cut = null; goto(g, 'c15_parts', 100); },
      ]);
    },
    update(g, dt) { tickMv(g, g.stepData, dt); } },

  { id: 'c15_parts', ch: 15, cp: [0, -4214, 0], obj: 'Find the helicopter parts (0/3)', hint: 'Fish counter, cheese cave, bakery oven. Use the traps.', mood: 'tense', beat: 2, light: 'ward',
    enter(g) {
      const D = g.stepData; g.openGate(true); cast(g, D, 0, -4212, ['dad', 'nia', 'mom']); followAll(g, D); dadGun(g, D); D.got = {};
      const lines = {
        key: [['keem', "The key is inside a fish. Of course it's inside a fish."], ['danny', "No one steals a fish!"]],
        battery: [['tuck', "Why is the battery in the cheese?"], ['danny', "Cheese keeps it cool! Probably!"]],
        fuse: [['keem', "Got the fuse. It's warm."], ['danny', "Ovens are the safest place. Zombies can't work ovens."]],
      };
      const names = { key: 'Ignition key', battery: 'Battery', fuse: 'Fuel pump fuse' };
      const order = ['fuse', 'battery', 'key'];
      const refresh = () => { const left = order.filter(k => !D.got[k]); D.uses = left.map(k => ({ x: A.parts[k][0], z: A.parts[k][1], r: 2.2, label: 'Take the ' + names[k].toLowerCase(), fn: (g) => take(g, k) })).concat(trapUses(g, D, false)); const n = left[0]; g.wpTarget = n ? [A.parts[n][0], 1.2, A.parts[n][1]] : null; };
      const take = (g, k) => { if (D.got[k]) return; D.got[k] = true; g.player.play('PickUp_Table', { once: true, force: true }); g.audio.pickup(); const n = Object.keys(D.got).length;
        g.toast(names[k] + ' found', 1.6); g.objective('Find the helicopter parts (' + n + '/3)', n < 3 ? 'Follow the marker to the next one.' : 'That is all three.'); refresh();
        g.horde(n === 1 ? 5 : 7, [[-16, -4150], [16, -4158], [0, -4132], [-14, -4190], [14, -4200]], { runner: n >= 2 });
        g.say(lines[k], () => { if (n >= 3 && !D.done) { D.done = true; g.wpTarget = null; g.shake(.4); g.audio.roar && g.audio.roar(); g.say([['danny', "That noise. That's Larry. That's definitely Larry."], ['marcus', "Then we get these parts upstairs. Now."]], () => goto(g, 'c15_hold', 200)); } }); };
      refresh();
    },
    update(g, dt) { const D = g.stepData; dadTick(g, D, dt); trapTick(g, D, dt); } },

  { id: 'c15_hold', ch: 15, cp: [6, -4208, 0], obj: 'Hold the market', hint: 'Danny and Tuck are carrying the parts to the roof. Pull the trap levers.', mood: 'tense', beat: 3, light: 'ward',
    enter(g) {
      const D = g.stepData; g.openGate(true); cast(g, D, 6, -4206, ['dad', 'nia', 'mom', 'tuck', 'danny']); followAll(g, D, ['dad', 'nia', 'mom']); dadGun(g, D);
      const st = A.M.rooftopStairs; walk(D, D.danny, st[0], st[1], { sp: 1.6, anim: 'Walk_Loop', end: 'Idle_Loop' }); walk(D, D.tuck, st[0] + 1.2, st[1] + .4, { sp: 1.6, end: 'Idle_Loop' });
      D.uses = trapUses(g, D, true); D.holdHint = 'Pull the red trap levers when they bunch up in an aisle.';
      g.horde(8, [[0, -4134], [-12, -4138], [12, -4140], [0, -4150]], { runner: true });
      g.say([['danny', "We need forty-five seconds to carry this stuff up! Pull the levers!"], ['tuck', "Lever two is my favorite!"]]);
    },
    update(g, dt) { const D = g.stepData; tickMv(g, D, dt); dadTick(g, D, dt); trapTick(g, D, dt);
      keepUp(g, D, dt, 9, () => g.horde(4, [[0, -4134], [-14, -4136], [14, -4136]], { runner: Math.random() < .5 }), 2.4);
      if (!D.mid && D.ht > 22) { D.mid = true; g.say([['danny', "Halfway! The battery is heavy! Why did nobody tell me batteries are heavy?"]]); }
      holdTick(g, D, dt, 45, 'Hold the market', () => { g.alive().forEach(z => { z.st = 'chase'; }); g.toast('Parts are on the roof', 2); D.clear = true; });
      if (D.clear && g.alive().length === 0) clearThen(g, D, 'c15_larry', 220, 'Get to the roof stairs');
      else if (D.clear && !D.mop) { D.mop = true; g.objective('Finish them off', 'Clear the stragglers, then get to the roof stairs.'); } } },

  { id: 'c15_larry', ch: 15, cp: [6, -4206, 0], obj: 'Beat Larry the Lobster', hint: 'Dodge his charge. When he crashes into a stall he is stuck — hit him hard.', mood: 'tense', beat: 3, light: 'ward',
    enter(g) {
      const D = g.stepData; g.openGate(true); cast(g, D, 6, -4204, ['dad', 'nia', 'mom']); followAll(g, D); dadGun(g, D);
      const b = g.spawnZ(0, -4180, { boss: true, hp: 3400, scale: 2.0, runner: false, rig: 'zombie_big', shirt: '#c8281c' }); b.cd = 2; b.aggro = 99; g.boss = b; D.b = b; $q('#bossn').textContent = 'LARRY THE LOBSTER';
      const u = b.mat && b.mat.userData && b.mat.userData.u; if (u) { if (u.uShirt) u.uShirt.value.set('#c8281c'); if (u.uPants) u.uPants.value.set('#a82418'); if (u.uJacket) u.uJacket.value.set('#c8281c'); }
      lobsterSuit(b, 1.25); D.mode = 'walk'; D.cd = 4; b.armor = (o) => D.mode === 'stuck' ? 1.7 : (o.head || o.boom || o.flame) ? 1 : .5;
      g.audio.roar && setTimeout(() => g.audio.roar(b), 600);
      g.say([['danny', "Larry! Buddy! It's me, Danny! From the market!"], ['keem', "He's not your buddy anymore."], ['danny', "He was never really my buddy. He took my lunch."]]);
    },
    update(g, dt) { const D = g.stepData, b = D.b; dadTick(g, D, dt);
      if (!b || b.dead) { if (b && b.dead && !D.won) { D.won = true; afterBoss(g, () => goto(g, 'c15_end', 300)); } return; }
      D.cd -= dt; const P = g.player.root.position, p = b.root.position;
      if (D.mode === 'walk' && D.cd <= 0 && !g.cut && !g.dlgCur) { D.mode = 'aim'; D.at = 0; D.tx = P.x; D.tz = P.z; b.st = 'script'; b.play('Idle_Loop'); g.toast('Larry is winding up — get out of the way!', 1.4); }
      if (D.mode === 'aim') { D.at += dt; b.root.rotation.y = Math.atan2(D.tx - p.x, D.tz - p.z); if (D.at > 1.0) { D.mode = 'charge'; D.ct = 0; const dx = D.tx - p.x, dz = D.tz - p.z, d = Math.hypot(dx, dz) || 1; D.dir = [dx / d, dz / d]; } }
      if (D.mode === 'charge') { D.ct += dt; const s = 13 * dt; p.x += D.dir[0] * s; p.z += D.dir[1] * s; b.play('Sprint_Loop');
        if (Math.hypot(P.x - p.x, P.z - p.z) < 1.8 && !(g.state.roll > 0) && !D.hitMe) { D.hitMe = true; g.hurt(28, { x: p.x, z: p.z }); g.shake(.5); }
        const wall = g.inCol(p.x + D.dir[0] * 1.2, p.z + D.dir[1] * 1.2, .4) || D.ct > 1.6;
        if (wall) { D.mode = 'stuck'; D.st = 0; D.hitMe = false; g.shake(.6); g.audio.crash ? g.audio.crash() : g.audio.thud(); g.toast('Larry is STUCK — hit him now!', 2); b.play('Idle_Loop'); if (g.inCol(p.x, p.z, .2)) { const f = g.freeNear(p.x, p.z); p.x = f[0]; p.z = f[1]; } } }
      if (D.mode === 'stuck') { D.st += dt; b.root.rotation.z = Math.sin(D.st * 18) * .04; if (D.st > 3.2) { b.root.rotation.z = 0; D.mode = 'walk'; b.st = 'chase'; D.cd = 5 + Math.random() * 2; } }
      if (!D.half && b.hp < b.maxHp * .5) { D.half = true; g.say([['danny', "His weak spot is the tail! I think! I'm not a lobster doctor!"]]); g.horde(4, [[-10, -4150], [10, -4150]], { runner: true }); }
    } },

  { id: 'c15_end', ch: 15, cp: [20, -4214, 0], obj: '', hint: '', mood: 'sad', beat: 0, light: 'ward',
    enter(g) {
      const D = g.stepData; g.openGate(true); const st = A.M.rooftopStairs; cast(g, D, st[0], st[1], ['dad', 'nia', 'mom', 'tuck', 'danny']);
      place(g.player, st[0] - 1, st[1] + 3.2, 0); place(D.danny, st[0] + .2, st[1] + 6, PI); place(D.tuck, st[0] + 1.8, st[1] + 5.4, PI * .9);
      place(D.dad, st[0] + 1.2, st[1] + 2.4, -.4); place(D.nia, st[0] - 2.6, st[1] + 3.8, .6); place(D.mom, st[0] - 3.2, st[1] + 2.6, .5);
      g.cut = { anim: 'Idle_Loop', cam: V(st[0] - 5, 1.7, st[1] + 8.5), look: V(st[0], 1.3, st[1] + 4.5), flash: false }; snap(g);
      script(g, [
        (g) => { D.danny.play('Idle_Talking_Loop'); act(D.danny, 'wave', { sides: 'R', k: .8 }); },
        ['danny', "Bye, Larry. You were a good lobster."],
        (g) => { act(D.danny, null); },
        ['tuck', "He was a terrible lobster."],
        ['danny', "Everything is on the roof. She'll fly. If the Authority doesn't find us first."],
        (g) => { cam(g, V(st[0] + 2.6, 1.6, st[1] + 1.4), V(st[0], 1.45, st[1] + 5.4)); },
        ['keem', "Danny. You left Haverford. But you came back for this one. That counts."],
        (g) => { act(D.danny, 'clutch', { k: .6 }); },
        ['danny', "Dear Haverford, I'm so sorry. Dear Keem… thank you."],
        (g) => { act(D.danny, null); cam(g, V(st[0] - 4.6, 1.3, st[1] + 6.2), V(st[0] - 2.6, 1.0, st[1] + 4)); D.nia.play('Idle_Talking_Loop'); },
        ['nia', "You're still a big dummy."],
        ['danny', "Yeah. I know."],
        (g) => { setTimeout(() => g.onComplete && g.onComplete(15), 900); },
      ]);
    },
    update(g, dt) { tickMv(g, g.stepData, dt); } },
];

export const loot = [
  { id: 'c15a', kind: 'ammo', item: 'light', n: 36, pos: [-8, .25, -4110], at: 'c15_dock' },
  { id: 'c15b', kind: 'med', pos: [12, .25, -4118], at: 'c15_dock' },
  { id: 'c15c', kind: 'ammo', item: 'shell', n: 16, pos: [-21, .25, -4146], at: 'c15_traps' },
  { id: 'c15d', kind: 'cash', n: 220, pos: [21, .25, -4178], at: 'c15_traps' },
  { id: 'c15e', kind: 'grenade', n: 2, pos: [-21, .25, -4200], at: 'c15_parts' },
  { id: 'c15f', kind: 'med', pos: [8, .25, -4140], at: 'c15_hold' },
  { id: 'c15g', kind: 'ammo', item: 'rifle', n: 40, pos: [-6, .25, -4160], at: 'c15_hold' },
  pg(18, -4240, 'Captain Riverside #24: "Lobster Men Return"', 'c15_freezer'),
];
