// Chapter 14 · Every Bite — the family reaches Vance's research floor after the cafeteria alarm.
// Blood work, a result nobody is ready for, a lab breach, and the Warden. World band z -3700..-4000.
import * as THREE from 'three';
import { PI, V, dist2, follow, goto, afterBoss, clearThen, fam, dadGun, dadTick, boss, raiders, pg, rnd, $q } from './helpers.js';
import { act } from './ch12_acting.js';
import { spawnBiscuit, hopTo, tickBiscuit } from './ch13_rabbit.js';
import { buildCh14Lab } from './kit/ch14_lab.js';

export const meta = { n: 14, title: 'Every Bite', endQuote: '“Every single bite.”' };
export const speakers = { warden: 'The Warden' };
export const Z0 = -3700;
let API = null;
export function buildZone(ctx) { API = buildCh14Lab(ctx, { x: 0, z: Z0 - 4 }); }

const BITES = [
  ['Riverside', 'The yard. The first ones over the fence.'],
  ['Haverford', 'The gate. Hands on your jacket.'],
  ['The mall', 'Black Friday. Too close in the aisles.'],
  ['Peaks Island', 'The Captain\'s men. Teeth on the sleeve.'],
  ['The tunnel', 'Boston under the river. You kept moving.'],
  ['Sublevel B', 'The research hall. You did not turn.'],
];

// ---------- small helpers ----------
function walk(D, c, x, z, o = {}) { (D.mv = D.mv || []).push({ c, x, z, sp: o.sp || 1.5, anim: o.anim || 'Walk_Loop', end: o.end || 'Idle_Loop', face: o.face, cb: o.cb }); }
function tickMv(g, D, dt) { if (!D.mv) return; D.mv = D.mv.filter(m => { const p = m.c.root.position, dx = m.x - p.x, dz = m.z - p.z, d = Math.hypot(dx, dz);
  if (d < .06) { m.c.play(m.end); if (m.face != null) m.c.root.rotation.y = m.face; if (m.c === g.player && g.cut) { g.cut.anim = m.end; g.cut.animSpeed = 1; } m.cb && m.cb(g); return false; }
  const s = Math.min(d, m.sp * dt); p.x += dx / d * s; p.z += dz / d * s; m.c.root.rotation.y = Math.atan2(dx, dz); const ns = m.c.natSpeed ? m.c.natSpeed(m.anim) : 0, rate = ns ? Math.max(.5, Math.min(2.2, m.sp / ns)) : 1;
  m.c.play(m.anim, { speed: rate }); if (m.c === g.player && g.cut) { g.cut.anim = m.anim; g.cut.animSpeed = rate; } return true; }); }
const cam = (g, c, l) => { g.cut = Object.assign(g.cut || {}, { cam: c, look: l }); };
const cbq = (g, f) => g.dlgQ.push({ cb: f });
const snap = (g) => { g.camera.position.copy(g.cut.cam); g._lk = null; };
function script(g, items) { items.forEach(it => typeof it === 'function' ? (g.dlgCur || g.dlgQ.length ? cbq(g, it) : it(g)) : g.say([it])); }

function placeFam(g, D, x, z) {
  const dad = g.npc('marcus', 'marcus', x + 1.6, z + 1.4, PI, 'Idle_Loop'); D.dad = dad;
  const nia = g.npc('nia', 'nia', x - 1.4, z + 1.3, PI, 'Idle_Loop', .62); D.nia = nia;
  const mom = g.npc('dana', 'dana', x - 1.8, z + 2.2, PI, 'Idle_Loop'); D.mom = mom;
  return { dad, nia, mom };
}
function followFam(g, D) {
  if (D.dad) follow(g, D.dad, [1.6, 1.2]);
  if (D.nia) follow(g, D.nia, [-1.2, .9]);
  if (D.mom) follow(g, D.mom, [-1.8, 1.6]);
}
function paintAuth(z, shirt = '#c5ccd4') {
  const u = z.mat && z.mat.userData && z.mat.userData.u; if (!u) return;
  if (u.uShirt) u.uShirt.value.set(shirt);
  if (u.uJacket) u.uJacket.value.set(shirt);
  if (u.uPants) u.uPants.value.set('#2a3038');
  if (u.uBlood) u.uBlood.value = .08;
  if (u.uGrime) u.uGrime.value = .15;
}
function shield(z, big = false) {
  const T = THREE, g = new T.Group();
  const m = new T.MeshStandardMaterial({ color: '#c8ced6', metalness: .55, roughness: .35 });
  const plate = new T.Mesh(new T.BoxGeometry(big ? .55 : .42, big ? .9 : .75, .05), m); plate.position.set(0, 0, 0); g.add(plate);
  const rim = new T.Mesh(new T.BoxGeometry(big ? .6 : .46, big ? .96 : .8, .02), new T.MeshStandardMaterial({ color: '#3a4048', metalness: .6, roughness: .4 })); rim.position.z = -.02; g.add(rim);
  g.rotation.set(0, -.15, .15); g.position.set(.02, .05, .12);
  z.attach && z.attach('DEF-hand.L', g); z.shield = g;
}
function spawnAuth(g, x, z, o = {}) {
  const r = g.spawnZ(x, z, { raider: true, gun: o.gun || 'rifle', shirt: '#c5ccd4', hp: o.hp || 110 });
  paintAuth(r, '#c5ccd4'); shield(r, !!o.big); r.aggro = 40; return r;
}
function vanceTick(g, D, dt) {
  if (!D.vance || !D.vanceGun || (D.vcd = (D.vcd || 0) - dt) > 0) return;
  D.vcd = 1.05;
  const vp = D.vance.root.position; let best = null, bd = 22;
  g.alive().forEach(z => { if (z === D.vance) return; const d = z.root.position.distanceTo(vp); if (d < bd) { bd = d; best = z; } });
  if (!best) return;
  const dir = best.root.position.clone().sub(vp).normalize();
  D.vance.root.rotation.y = Math.atan2(dir.x, dir.z);
  D.vance.play('Pistol_Aim_Neutral');
  if (!best.boss) { g.damageZ(best, 22, dir, { ai: true }); best.stun = Math.max(best.stun || 0, 2.4); }
  else g.damageZ(best, 14, dir, { ai: true });
  g.audio.click && g.audio.click();
}
function ringAt(g, D, x, z, r = 2.1, color = '#ff3a28') {
  const m = new THREE.Mesh(new THREE.RingGeometry(r * .72, r, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .8, side: THREE.DoubleSide, depthWrite: false }));
  m.rotation.x = -PI / 2; m.position.set(x, .16, z); g.scene.add(m);
  D.snare = { m, x, z, r, t: 0, life: 1.35 }; return m;
}

// montage overlay — cards only, no twist text
function ensureMont() {
  let el = document.getElementById('atqMont'); if (el) return el;
  el = document.createElement('div'); el.id = 'atqMont';
  el.innerHTML = `<style>
    #atqMont{position:fixed;inset:0;z-index:40;display:none;align-items:center;justify-content:center;background:rgba(4,8,12,.72);font-family:sans-serif;color:#e8f4ff;pointer-events:none}
    #atqMont.on{display:flex}
    #atqMont .card{width:min(520px,86vw);background:linear-gradient(180deg,#0d1a24,#071018);border:1px solid #3a6a88;padding:28px 30px 24px;box-shadow:0 12px 40px #000a}
    #atqMont .kicker{letter-spacing:.18em;font-size:11px;color:#7fb7d8;margin-bottom:8px}
    #atqMont h3{margin:0 0 8px;font-size:28px;font-weight:700}
    #atqMont p{margin:0;color:#c5d8e6;font-size:16px;line-height:1.45}
    #atqMont .count{margin-top:18px;font-size:20px;color:#9ef0c0;letter-spacing:.06em}
  </style><div class="card"><div class="kicker"></div><h3></h3><p></p><div class="count"></div></div>`;
  document.body.appendChild(el); return el;
}
function showMont(i, n) {
  const el = ensureMont(); el.classList.add('on');
  const card = BITES[i] || BITES[0];
  el.querySelector('.kicker').textContent = 'SAMPLE ' + (i + 1) + ' / ' + BITES.length;
  el.querySelector('h3').textContent = card[0];
  el.querySelector('p').textContent = card[1];
  el.querySelector('.count').textContent = i === BITES.length - 1 ? ('BITTEN: ' + n + '    TURNED: 0') : '';
}
function hideMont() { const el = document.getElementById('atqMont'); if (el) el.classList.remove('on'); }

function helm(b) {
  // Head-bone local units (same scale as the ch13 hairnet): a unit sphere scaled to ~0.1
  // fits the skull. World-meter boxes parented to DEF-head read as giant floating slabs.
  const T = THREE, h = new T.Group();
  const shell = new T.MeshStandardMaterial({ color: '#2a3138', metalness: .72, roughness: .3 });
  const rimM = new T.MeshStandardMaterial({ color: '#1a1e22', metalness: .65, roughness: .4 });
  const visM = new T.MeshStandardMaterial({ color: '#081018', metalness: .25, roughness: .12, transparent: true, opacity: .78, emissive: '#153040', emissiveIntensity: .45 });
  const cap = new T.Mesh(new T.SphereGeometry(1, 20, 14, 0, Math.PI * 2, 0, Math.PI * .64), shell);
  cap.scale.set(.118, .092, .112); cap.position.set(0, -.012, .006); cap.rotation.x = -.32; h.add(cap);
  const brow = new T.Mesh(new T.TorusGeometry(1, .07, 6, 22, Math.PI * 1.15), rimM);
  brow.scale.set(.1, .055, .055); brow.rotation.set(1.2, 0, 0); brow.position.set(0, -.028, .055); h.add(brow);
  const vis = new T.Mesh(new T.SphereGeometry(1, 18, 10, -0.9, 1.8, 0.52, 0.58), visM);
  vis.scale.set(.112, .082, .108); vis.position.set(0, -.02, .018); vis.rotation.x = -.22; h.add(vis);
  const hb = b.bone && b.bone('DEF-head');
  if (hb) hb.add(h);
  else if (b.attach) b.attach('DEF-head', h);
  b.helm = h;
}

// ---------- steps ----------
export const steps = [
  { id: 'c14_arrive', ch: 14, cp: [0, -3708, PI], obj: '', hint: '', mood: 'night', beat: 0, rain: false, light: 'lab',
    enter(g) {
      const D = g.stepData, A = API; g.openGate(true); A.setAlarm(true); A.setScreen('STANDBY', 'Awaiting samples.');
      const { dad, nia, mom } = placeFam(g, D, 0, -3708);
      const vance = g.npc('vance', 'vance', 1.2, -3730, 0, 'Idle_Loop'); D.vance = vance;
      const reyes = g.npc('reyes', 'reyes', A.analyzer.pos[0] + 2.2, A.analyzer.pos[1] + 1.2, PI, 'Idle_Loop'); D.reyes = reyes;
      g.player.root.position.set(0, 0, -3708); g.player.root.rotation.y = PI;
      g.cut = { anim: 'Idle_Loop', cam: V(3.4, 1.8, -3705.4), look: V(0, 1.25, -3710), flash: false }; snap(g);
      script(g, [
        (g) => { g.audio.thud && g.audio.thud(); act(vance, 'point', { sides: 'R', k: 1 }); walk(D, vance, 0.4, -3720, { sp: 1.7, end: 'Idle_Talking_Loop' }); },
        ['vance', 'Inside. Now. The rabbit first, then sleeves up.'],
        ['keem', 'Hi to you too.'],
        ['reyes', "She's been waiting. We have maybe minutes."],
        ['marcus', 'Minutes until what?'],
        ['vance', "Until I know what I'm looking at. Or until they come through that door. Work first."],
        (g) => {
          act(vance, null);
          g.cut.anim = 'Walk_Loop';
          walk(D, g.player, -11, A.analyzer.pos[1] + 4, { sp: 2.1, end: 'Idle_Loop' });
          walk(D, dad, -9, A.analyzer.pos[1] + 5.2, { sp: 2, end: 'Idle_Loop' });
          walk(D, nia, -12.4, A.analyzer.pos[1] + 5.4, { sp: 1.9, end: 'Idle_Loop' });
          walk(D, mom, -13, A.analyzer.pos[1] + 4.4, { sp: 1.9, end: 'Idle_Loop' });
          walk(D, vance, A.analyzer.pos[0] + .2, A.analyzer.pos[1] + 2.2, { sp: 2, end: 'Idle_Loop', face: 0 });
          cam(g, V(-6.5, 2.1, A.analyzer.pos[1] + 10), V(-11, 1.3, A.analyzer.pos[1]));
        },
        ['nia', "Biscuit, you have to be brave. It's just a little poke."],
        ['dana', "I've got you, baby. Both of you."],
        ['vance', 'Three samples. The machine does the rest. Do not wander.'],
        (g) => { g.cut = null; followFam(g, D); goto(g, 'c14_draw', 80); },
      ]);
    },
    update(g, dt) { tickMv(g, g.stepData, dt); } },

  { id: 'c14_draw', ch: 14, cp: [-11, -3764, PI], obj: 'Give 3 samples (0/3)', hint: 'Walk to a glowing vial stand and press USE.', mood: 'night', beat: 1, rain: false, light: 'lab',
    enter(g) {
      const D = g.stepData, A = API; g.openGate(true);
      if (!D.dad) placeFam(g, D, -11, -3762);
      if (!D.vance) D.vance = g.npc('vance', 'vance', A.analyzer.pos[0] + .2, A.analyzer.pos[1] + 2.2, 0, 'Idle_Loop');
      if (!D.reyes) D.reyes = g.npc('reyes', 'reyes', A.analyzer.pos[0] + 2.2, A.analyzer.pos[1] + 1.2, PI, 'Idle_Loop');
      followFam(g, D);
      D.got = D.got || {};
      const glow = { keem: '#7fe0ff', dana: '#f0b0d0', biscuit: '#9ef0c0' };
      D.uses = A.vials.filter(v => !D.got[v.id]).map(v => ({ x: v.x, z: v.z, label: v.label, fn: (g) => takeSample(g, D, v) }));
      const left = A.vials.filter(v => !D.got[v.id]);
      if (left[0]) g.wpTarget = [left[0].x, 1.2, left[0].z];
      A.setScreen('READY', 'Load three samples.');
      function takeSample(g, D, v) {
        if (D.got[v.id]) return;
        D.got[v.id] = true;
        if (v.tube && v.tube.material) v.tube.material.emissiveIntensity = 2.4;
        g.player.play('Interact', { once: true, force: true });
        const lines = {
          keem: [['keem', 'There. Happy?'], ['vance', 'Happier than I was five minutes ago.']],
          dana: [['dana', "You already have enough of me on file."], ['vance', 'I have what failed. I want what is still working.']],
          biscuit: [['nia', 'Be still, Biscuit. Good boy.'], ['reyes', "He's calmer than half my patients ever were."]],
        };
        const n = Object.keys(D.got).length;
        g.objective('Give 3 samples (' + n + '/3)', n < 3 ? 'Two more. Follow the marker.' : 'All three are in.');
        g.toast((v.id === 'biscuit' ? 'Biscuit' : v.id === 'dana' ? 'Mom' : 'Keem') + "'s sample loaded", 1.6);
        A.setScreen('LOADED  ' + n + ' / 3', 'Sample ' + v.id.toUpperCase() + ' accepted.', glow[v.id]);
        D.uses = A.vials.filter(u => !D.got[u.id]).map(u => ({ x: u.x, z: u.z, label: u.label, fn: (gg) => takeSample(gg, D, u) }));
        const nxt = A.vials.find(u => !D.got[u.id]); g.wpTarget = nxt ? [nxt.x, 1.2, nxt.z] : null;
        g.say(lines[v.id], () => { if (n >= 3 && !D.run) { D.run = true; g.wpTarget = null; goto(g, 'c14_result', 120); } });
      }
    },
    update(g, dt) { dadTick(g, g.stepData, dt); } },

  { id: 'c14_result', ch: 14, cp: [-11, -3768, PI], obj: '', hint: '', mood: 'night', beat: 0, rain: false, light: 'lab',
    enter(g) {
      const D = g.stepData, A = API; g.openGate(true);
      if (!D.dad) placeFam(g, D, -11, -3764);
      if (!D.vance) D.vance = g.npc('vance', 'vance', A.analyzer.pos[0] + .4, A.analyzer.pos[1] + 2.0, PI, 'Idle_Loop');
      if (!D.reyes) D.reyes = g.npc('reyes', 'reyes', A.analyzer.pos[0] + 2.4, A.analyzer.pos[1] + 1.4, PI, 'Idle_Loop');
      const { dad, nia, mom, vance, reyes } = D;
      [dad, nia, mom].forEach(c => { if (c) c.update = null; });
      dad.root.position.set(-9.2, 0, A.analyzer.pos[1] + 4.6); dad.root.rotation.y = PI;
      nia.root.position.set(-12.5, 0, A.analyzer.pos[1] + 4.8); nia.root.rotation.y = PI;
      mom.root.position.set(-13.2, 0, A.analyzer.pos[1] + 3.6); mom.root.rotation.y = 1.2;
      g.player.root.position.set(-11, 0, A.analyzer.pos[1] + 3.8); g.player.root.rotation.y = PI;
      vance.root.position.set(A.analyzer.pos[0] + .2, 0, A.analyzer.pos[1] + 2.1); vance.root.rotation.y = 0;
      A.setScreen('RUNNING…', 'Comparing markers.');
      const sl0 = g.skipLine.bind(g);
      g.skipLine = function () { if (D.mont && D.mont.phase === 'cards') { D.mont.skip = true; return; } sl0(); };
      const bites = Math.max(BITES.length, (g.save && (g.save.bites | 0)) || 0);
      g.cut = { anim: 'Idle_Loop', cam: V(-7.2, 1.75, A.analyzer.pos[1] + 7.2), look: V(A.analyzer.pos[0], 1.5, A.analyzer.pos[1]), flash: false }; snap(g);
      act(vance, 'reach', { sides: 'R', k: 1, lean: .12 });
      script(g, [
        ['vance', 'It is running. Do not talk to it. Do not touch it.'],
        ['nia', 'Can I talk to Biscuit?'],
        ['marcus', 'Let the woman work, baby.'],
        (g) => { act(vance, null); D.mont = { i: 0, t: 0, n: bites, phase: 'cards' }; showMont(0, bites); cam(g, V(-9.5, 1.55, A.analyzer.pos[1] + 1.2), V(-11, 1.2, A.analyzer.pos[1] + 3.6)); },
      ]);
    },
    update(g, dt) {
      const D = g.stepData, A = API;
      tickMv(g, D, dt);
      if (!D.mont || D.mont.phase !== 'cards') return;
      D.mont.t += dt;
      const sl = D.mont.skip || D.mont.t > 2.15;
      if (sl) { D.mont.t = 0; D.mont.i++; D.mont.skip = false;
        if (D.mont.i < BITES.length) showMont(D.mont.i, D.mont.n);
        else { hideMont(); D.mont.phase = 'talk'; afterMontage(g, D, A); } }
    } },

  { id: 'c14_breach', ch: 14, cp: [-4, -3778, PI], obj: 'Hold the lab', hint: 'Authority troopers want you alive. Use cover. Dad and Vance have your back.', mood: 'tense', beat: 3, rain: false, light: 'lab',
    enter(g) {
      const D = g.stepData, A = API; g.openGate(true); A.setAlarm(true);
      if (!D.dad) placeFam(g, D, -4, -3776);
      if (!D.vance) D.vance = g.npc('vance', 'vance', -1, -3784, PI, 'Idle_Loop');
      if (!D.reyes) D.reyes = g.npc('reyes', 'reyes', A.analyzer.pos[0] + 2, A.analyzer.pos[1] + 1, 0, 'Idle_Loop');
      followFam(g, D); dadGun(g, D); D.vanceGun = true;
      follow(g, D.vance, [2.2, 1.0]);
      A.setScreen('LOCKDOWN', 'Unauthorized entry.', '#ff6a4a');
      D.wave = 0; D.spawned = false;
      // first wave in the lab
      [[8, -3750], [-8, -3748], [10, -3768], [-12, -3772], [6, -3786]].forEach(([x, z], i) => spawnAuth(g, x, z, { gun: ['rifle', 'smg', 'shotgun', 'rifle', 'smg'][i] }));
      g.say([['warden', 'Harbor Authority. Surrender the specimens. The boy and the animal. Alive.'], ['vance', 'Find cover. I will drop the first ones.'], ['marcus', "You heard her. We don't hand anybody over."]]);
      g.wpTarget = [0, 1.2, A.HALL_S + 8];
    },
    update(g, dt) {
      const D = g.stepData, A = API; dadTick(g, D, dt); vanceTick(g, D, dt);
      const left = g.alive().filter(z => !z.boss).length;
      if (D.wave === 0 && left <= 1 && !D.w2) {
        D.w2 = true; D.wave = 1;
        g.toast('More in the corridor!', 2);
        g.objective('Clear the corridor', 'Push south. They will try to box you in.');
        [[-5, A.hallC + 16], [5, A.hallC + 12], [0, A.hallC], [-6, A.hallC - 10], [6, A.hallC - 16], [0, A.hallC - 22]].forEach(([x, z], i) => spawnAuth(g, x, z, { gun: ['rifle', 'shotgun', 'smg', 'rifle', 'smg', 'rifle'][i] }));
        g.wpTarget = [0, 1.2, A.HALL_S + 4];
      }
      if (D.wave >= 1 && left === 0) clearThen(g, D, 'c14_warden', 220, 'Get to the evacuation lift');
    } },

  { id: 'c14_warden', ch: 14, cp: [0, -3856, PI], obj: 'Stop the Warden', hint: 'Visor shots only. Break snares. Protect Biscuit.', mood: 'tense', beat: 3, rain: false, light: 'lab',
    enter(g) {
      const D = g.stepData, A = API; g.openGate(true); A.setAlarm(true);
      if (!D.dad) placeFam(g, D, 0, -3856);
      if (!D.vance) D.vance = g.npc('vance', 'vance', 2.2, -3858, PI, 'Idle_Loop');
      follow(g, D.dad, [1.6, 1.2]); follow(g, D.vance, [2.4, 1.1]);
      if (D.mom) follow(g, D.mom, [-1.8, 1.6]);
      // park Nia + Biscuit at the west cover so the grab has a place to go
      if (D.nia) { D.nia.update = null; D.nia.root.position.set(-10.5, 0, A.arC + 8); D.nia.root.rotation.y = 1.2; D.nia.play('Idle_Loop'); }
      else D.nia = g.npc('nia', 'nia', -10.5, A.arC + 8, 1.2, 'Idle_Loop', .62);
      dadGun(g, D); D.vanceGun = true;
      const b = g.spawnZ(A.bossSpot[0] + 2, A.bossSpot[1] - 4, { boss: true, raider: true, hp: 3600, scale: 1.7, gun: 'rifle', shirt: '#3a444c', runner: false });
      b.cd = 2; b.aggro = 99; b.speed = 1.55; g.boss = b; $q('#bossn').textContent = 'THE WARDEN — Harbor Authority';
      g.audio.roar && setTimeout(() => g.audio.roar(b), 800);
      paintAuth(b, '#3a444c'); if (b.mat.userData.u.uJacket) b.mat.userData.u.uJacket.value.set('#2a3038');
      b.armor = (o) => (o.head || o.blade || o.boom || o.flame || o.sever) ? 1 : .32;
      helm(b); D.b = b; D.cd = 3.2; D.mode = 'fight'; D.hurt0 = b.hp;
      g.say([['warden', 'The boy and the rabbit. Both specimens. Alive.'], ['keem', "You're not taking either of them."], ['warden', 'Do not damage the specimens. I will not ask again.'], ['vance', 'Aim for the visor. The rest is a wall.']]);
    },
    update(g, dt) {
      const D = g.stepData, b = D.b, A = API; dadTick(g, D, dt); vanceTick(g, D, dt);
      if (!b || b.dead) { if (b && b.dead && !D.won) { D.won = true; hideCrate(g, D); afterBoss(g, () => goto(g, 'c14_end', 300)); } return; }
      // snare ring
      if (D.snare) {
        D.snare.t += dt; D.snare.m.material.opacity = .85 - D.snare.t * .3; D.snare.m.scale.setScalar(1 + D.snare.t * .08);
        if (D.snare.t >= D.snare.life) {
          const hit = dist2(g, D.snare.x, D.snare.z) < D.snare.r && g.state.roll <= 0;
          g.scene.remove(D.snare.m); D.snare = null;
          if (hit) { g.slowMul = .14; D.rootT = 2.3; g.toast('SNARE — roll out!', 2); g.shake(.4); g.audio.thud && g.audio.thud(); }
        }
      }
      if (D.rootT > 0) { D.rootT -= dt; if (D.rootT <= 0 || (g.state.roll > 0)) { D.rootT = 0; g.slowMul = 1; } }
      // biscuit crate
      if (D.crate) {
        D.crate.m.rotation.y += dt * .4;
        if ((g.state.shotT > 0 || g.input && g.input.atk) && dist2(g, D.crate.x, D.crate.z) < 3.2) { D.crate.hp -= dt * 3; }
        if (D.crate.hp <= 0) { g.toast('Biscuit is free', 1.6); hideCrate(g, D); g.audio.thud && g.audio.thud(); }
      }
      D.cd = (D.cd || 0) - dt;
      if (D.mode === 'fight' && D.cd <= 0 && !D.snare) {
        const P = g.player.root.position;
        if (!D.crate && b.hp < b.maxHp * .7 && Math.random() < .45) startGrab(g, D, b);
        else { ringAt(g, D, P.x, P.z, 2.2); g.toast('Containment incoming!', 1.4); D.cd = 6.5; }
      }
      if (D.mode === 'grab') {
        D.gt += dt;
        const np = D.nia.root.position, p = b.root.position;
        const dx = np.x - p.x, dz = np.z - p.z, d = Math.hypot(dx, dz);
        if (d > .8) { const s = Math.min(d, 3.4 * dt); p.x += dx / d * s; p.z += dz / d * s; b.root.rotation.y = Math.atan2(dx, dz); b.play('Jog_Fwd_Loop'); }
        const dmg = (D.hurt0 || b.hp) - b.hp; // damage taken during the grab
        if (dmg > 280) { D.mode = 'fight'; D.cd = 5; g.toast('You broke her grab', 1.6); D.hurt0 = b.hp; }
        else if (d < 1.6 && D.gt > .6) { boxBiscuit(g, D); D.mode = 'fight'; D.cd = 8; D.hurt0 = b.hp; }
      }
    } },

  { id: 'c14_end', ch: 14, cp: [0, -3894, PI], obj: '', hint: '', mood: 'sad', beat: 0, rain: false, light: 'lab',
    enter(g) {
      const D = g.stepData, A = API; g.openGate(true); A.setAlarm(true); hideMont();
      if (!D.dad) placeFam(g, D, 0, -3890);
      if (!D.vance) D.vance = g.npc('vance', 'vance', A.incinerator[0] - 1.6, A.incinerator[1] + .4, 1.2, 'Idle_Loop');
      [D.dad, D.nia, D.mom].forEach(c => { if (c) c.update = null; });
      D.dad.root.position.set(1.5, 0, A.elevator.pos[1] + 2.2); D.dad.root.rotation.y = PI;
      D.nia.root.position.set(-1.4, 0, A.elevator.pos[1] + 2.4); D.nia.root.rotation.y = PI;
      if (D.mom) { D.mom.root.position.set(-2.2, 0, A.elevator.pos[1] + 3.1); D.mom.root.rotation.y = PI; }
      g.player.root.position.set(0, 0, A.elevator.pos[1] + 3.6); g.player.root.rotation.y = PI;
      D.vance.root.position.set(A.incinerator[0] - 1.6, 0, A.incinerator[1] + .6); D.vance.root.rotation.y = Math.atan2(A.incinerator[0] - D.vance.root.position.x, A.incinerator[1] - D.vance.root.position.z);
      A.elevator.door.setOpen(true);
      g.cut = { anim: 'Idle_Loop', cam: V(4.6, 1.8, A.elevator.pos[1] + 7.5), look: V(0, 1.3, A.elevator.pos[1] + 1), flash: false }; snap(g);
      script(g, [
        (g) => { act(D.vance, 'reach', { sides: 'R', k: 1 }); cam(g, V(A.incinerator[0] - 4.2, 1.7, A.incinerator[1] + 3.2), V(A.incinerator[0], 1.3, A.incinerator[1])); },
        ['vance', 'Get in the lift. I have to burn every sample in this room.'],
        ['keem', 'Come with us.'],
        ['vance', 'If I do, they get a copy. Go.'],
        ['dana', 'Ada—'],
        ['vance', 'I said I could come down and help. I did. Now go.'],
        (g) => { act(D.vance, null); cam(g, V(3.8, 1.65, A.elevator.pos[1] + 6.4), V(0, 1.25, A.elevator.inside[1])); walk(D, g.player, A.elevator.inside[0], A.elevator.inside[1], { sp: 1.6, end: 'Idle_Loop', face: 0 }); walk(D, D.dad, A.elevator.inside[0] + 1.1, A.elevator.inside[1] + .3, { sp: 1.5 }); walk(D, D.nia, A.elevator.inside[0] - 1.0, A.elevator.inside[1] + .2, { sp: 1.5 }); if (D.mom) walk(D, D.mom, A.elevator.inside[0] - 1.5, A.elevator.inside[1] + .6, { sp: 1.5 }); },
        ['nia', "Biscuit, we're okay. We're okay."],
        ['vance', 'Every single bite, Keem. Do not waste them.'],
        (g) => { A.elevator.door.setOpen(false); g.audio.thud && g.audio.thud(); g.shake(.3); setTimeout(() => g.onComplete && g.onComplete(14), 1100); },
      ]);
    },
    update(g, dt) { tickMv(g, g.stepData, dt); } },
];

function afterMontage(g, D, A) {
  const { dad, nia, mom, vance, reyes } = D;
  A.setScreen('RESULT', 'Subject: KEEM\nMarker: STABLE', '#9ef0c0');
  cam(g, V(-7.2, 1.75, A.analyzer.pos[1] + 7.2), V(A.analyzer.pos[0], 1.5, A.analyzer.pos[1]));
  script(g, [
    (g) => { act(vance, 'clutch', { k: 1, head: [0, 0, -.1] }); vance.play('Idle_Talking_Loop'); },
    ['vance', 'That is not possible.'],
    ['reyes', 'Say it out loud, Ada.'],
    ['vance', 'He is immune. Every bite, every scratch. He should have turned. He did not.'],
    (g) => { act(vance, null); act(dad, 'fistUp', { sides: 'R', k: 1 }); dad.play('Idle_Talking_Loop'); dad.root.rotation.y = -0.4; },
    ['marcus', "You're telling me my boy has been walking around like that all night?"],
    ['nia', "So you're basically a cheat code?"],
    ['keem', 'I thought I was just lucky.'],
    (g) => { act(dad, null); act(mom, 'reach', { sides: 'R', k: 1, lean: .16 }); cam(g, V(-11.6, 1.5, A.analyzer.pos[1] + 6.1), V(-13, 1.2, A.analyzer.pos[1] + 3.6)); },
    ['dana', "It isn't luck, baby. It's me."],
    ['dana', 'I carried it first. I never turned. It passed to you.'],
    (g) => { act(mom, 'hold', { k: 1, lean: .1 }); },
    ['vance', 'That is why Subject One failed. We copied her blood. We did not have this.'],
    ['keem', "You knew? The whole time?"],
    ['dana', 'I went to work so I could fix it and come home. I never meant to stay.'],
    // second result — the unexpected turn
    (g) => { act(mom, null); A.setScreen('RESULT  2', 'Subject: R-07\nMarker: STABLE', '#ffe08a'); g.audio.click && g.audio.click(); cam(g, V(-7.0, 1.8, A.analyzer.pos[1] + 6.6), V(A.analyzer.pos[0], 1.55, A.analyzer.pos[1])); },
    ['vance', 'There is a second result.'],
    ['nia', "That's Biscuit's. Why does it look like Keem's?"],
    ['vance', 'Because it is the same marker. The rabbit did not turn either.'],
    ['marcus', "He's been in that hoodie through all of it. He should be…"],
    (g) => { walk(D, vance, A.records.pos[0] + 1.2, A.records.pos[1] + .8, { sp: 1.8, end: 'Idle_Loop' }); cam(g, V(A.records.pos[0] + 4.2, 1.7, A.records.pos[1] + 3.4), V(A.records.pos[0], 1.2, A.records.pos[1])); },
    (g) => { act(vance, 'scoop', { sides: 'R', k: 1, lean: .2 }); if (A.records.folder) A.records.folder.visible = false; },
    ['vance', 'Animal trial, year one. Subject R-07. Failed to turn. Signed out of this building by D. Pell.'],
    (g) => { act(vance, null); walk(D, vance, A.analyzer.pos[0] + .4, A.analyzer.pos[1] + 2.2, { sp: 1.7, end: 'Idle_Talking_Loop', face: 0 }); cam(g, V(-9.4, 1.6, A.analyzer.pos[1] + 6.4), V(-12.4, 1.15, A.analyzer.pos[1] + 4.2)); },
    ['dana', 'I brought him home. Nia was four. I told you he was from the shop on Elm.'],
    ['nia', 'Mom?'],
    ['dana', "I couldn't leave him there. He was the only one that stayed himself."],
    ['keem', 'So when he ran through this hospital…'],
    ['vance', 'He ran because someone said soup. But yes. He knew the halls.'],
    ['vance', 'I asked for the rabbit because he is the first proof the immunity can live in something that is not a Pell.'],
    // breach
    (g) => { A.setAlarm(true); g.audio.thud && g.audio.thud(); g.shake(.5); A.setScreen('BREACH', 'Harbor Authority inbound.', '#ff6a4a'); cam(g, V(-6.5, 1.9, A.analyzer.pos[1] + 8), V(0, 1.4, A.LAB_S + 4)); },
    ['warden', 'Harbor Authority. We are on your floor. Surrender the specimens.'],
    ['keem', 'They want Biscuit too.'],
    (g) => { const tbl = A.benches[0]; walk(D, vance, (tbl ? tbl[0] : -8) + 1, (tbl ? tbl[1] : -3740), { sp: 2.2, end: 'Idle_Loop' }); act(vance, 'reach', { sides: 'R', k: 1 }); },
    ['vance', 'I said I could come down and help. I could hand you over. I will not.'],
    (g) => { act(vance, null); followFam(g, D); g.cut = null; goto(g, 'c14_breach', 80); },
  ]);
}

function startGrab(g, D, b) {
  D.mode = 'grab'; D.gt = 0; D.hurt0 = b.hp; D.cd = 99;
  g.toast('She is going for Biscuit!', 2.2);
  g.objective('Stop the Warden', 'Hit her before she reaches Nia.');
  g.audio.roar && g.audio.roar(b);
}
function boxBiscuit(g, D) {
  if (D.crate) return;
  const np = D.nia.root.position, T = THREE;
  const m = new T.Mesh(new T.BoxGeometry(1.15, 1.05, 1.15), new T.MeshStandardMaterial({ color: '#8a9298', metalness: .55, roughness: .4, transparent: true, opacity: .85 }));
  m.position.set(np.x, .55, np.z); g.scene.add(m);
  D.crate = { m, x: np.x, z: np.z, hp: 3 };
  D.nia.play('Idle_Loop'); act(D.nia, 'clutch', { k: 1 });
  g.objective('Free Biscuit', 'Smash the crate — shoot it or get close and fire.');
  g.toast('She boxed Biscuit!', 2);
  D.uses = [{ x: np.x, z: np.z, r: 2.2, label: 'Smash the crate', fn: (g) => { if (D.crate) { D.crate.hp = 0; } } }];
}
function hideCrate(g, D) {
  if (D.crate) { g.scene.remove(D.crate.m); D.crate = null; }
  if (D.nia) act(D.nia, null);
  D.uses = [];
  if (!D.won) g.objective('Stop the Warden', 'Visor shots only. Break snares. Protect Biscuit.');
}

export const loot = [
  { id: 'c14a', kind: 'ammo', item: 'rifle', n: 40, pos: [-14, .25, -3740], at: 'c14_draw' },
  { id: 'c14b', kind: 'med', pos: [14, .25, -3744], at: 'c14_draw' },
  { id: 'c14c', kind: 'ammo', item: 'shell', n: 14, pos: [8, .25, -3782], at: 'c14_draw' },
  { id: 'c14d', kind: 'grenade', n: 3, pos: [-8, .25, -3824], at: 'c14_breach' },
  { id: 'c14e', kind: 'med', pos: [7, .25, -3836], at: 'c14_breach' },
  { id: 'c14f', kind: 'ammo', item: 'light', n: 36, pos: [-10, .25, -3870], at: 'c14_warden' },
  { id: 'c14g', kind: 'med', pos: [10, .25, -3884], at: 'c14_warden' },
  pg(11, -3896, 'Captain Riverside #23: "The Boy Who Wouldn\'t Turn"', 'c14_end'),
];
