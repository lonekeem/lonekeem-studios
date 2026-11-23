// Co-op missions inside the online town (src/mp/town/town.js). Loaded only when a game is created with a mission.
// Host-authoritative: the player with the lowest net id runs the mission (timer, stages, survivor, waves) and broadcasts
// the state 4x a second ('coS'). Everyone sends a small status heartbeat ('coP': downed, kills, crates, finished actions),
// so lost packets never lose progress. If the host leaves, the next lowest id carries on from the last state it got.
// Zombies are simulated per client (as in free roam); a wave is a 'coW' event that every client spawns at the same spot.
import * as THREE from 'three';
import { missionById, NO_DOWN_BONUS, FAIL_PAY } from './missions.js';
import { loadZombieModels } from '../town/zombies.js';
import { Char } from '../../game/chars.js';
import { randomLook } from '../../game/looks.js';
import { SPAWN } from '../town/map.js';

const CSS = `#coopUI{position:absolute;inset:0;pointer-events:none;z-index:7;font-family:system-ui,sans-serif;color:#fff}
#coopUI .cpin{position:absolute;left:0;top:0;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:2px;font:600 12px system-ui;text-shadow:0 1px 3px #000;transition:opacity .2s}
#coopUI .cpin i{width:0;height:0;border-left:9px solid transparent;border-right:9px solid transparent;border-bottom:16px solid #ffd34a;filter:drop-shadow(0 1px 2px #000a)}
#coopUI .cpin span{background:#000a;border-radius:8px;padding:1px 7px}
body.coopcard #wbar,body.coopcard #mpt .chatui,body.coopcard #xhair,body.coopcard #touch{visibility:hidden!important;pointer-events:none!important}
#coopUI .chold{position:absolute;left:50%;bottom:calc(96px + env(safe-area-inset-bottom));transform:translateX(-50%);pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none;min-width:190px;height:54px;border-radius:27px;border:2px solid #ffd34a;background:#1b2a1fdd;color:#fff;font:700 15px system-ui;display:none;align-items:center;justify-content:center;gap:10px;overflow:hidden;box-shadow:0 3px 12px #0008}
#coopUI .chold.on{display:flex}#coopUI .chold b{position:absolute;left:0;top:0;bottom:0;width:0;background:#ffd34a55}#coopUI .chold span{position:relative}#coopUI .chold kbd{position:relative;font:600 10px system-ui;opacity:.7;border:1px solid #fff6;border-radius:4px;padding:0 4px}
#coopUI .ccard{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:auto;width:min(440px,86vw);max-height:calc(100% - 24px);overflow:auto;background:linear-gradient(#1d2b22f2,#121a15f2);border:1px solid #ffd34a88;border-radius:18px;padding:14px 18px;box-shadow:0 8px 30px #000a;text-align:center;box-sizing:border-box}
#coopUI .ccard h3{margin:2px 0 2px;font:800 20px system-ui;letter-spacing:.04em}#coopUI .ccard .ck{font:700 11px system-ui;letter-spacing:.22em;color:#ffd34a}
#coopUI .ccard p{margin:6px 0;font-size:13px;line-height:1.35;opacity:.92}#coopUI .ccard ol{text-align:left;margin:6px auto;padding-left:22px;font-size:12.5px;max-width:330px;opacity:.9}
#coopUI .ccard .cbtns{display:flex;gap:10px;justify-content:center;margin-top:10px;flex-wrap:wrap}
#coopUI .ccard button{font:700 14px system-ui;color:#fff;background:#2b3a30;border:1px solid #ffffff44;border-radius:12px;min-height:44px;padding:8px 18px}#coopUI .ccard button.pri{background:#d9a72c;border-color:#ffd34a;color:#1a1405}
#coopUI .ccard .cst{display:flex;gap:8px;justify-content:center;margin:8px 0}#coopUI .ccard .cst div{background:#0005;border-radius:10px;padding:6px 10px;min-width:62px}#coopUI .ccard .cst b{display:block;font-size:17px}#coopUI .ccard .cst span{font-size:10.5px;opacity:.75}
#coopUI .ccard .crew{font:800 22px system-ui;color:#ffd34a;margin:4px 0}#coopUI .ccard.lost .ck{color:#ff8a7a}#coopUI .ccard.lost{border-color:#ff8a7a88}
#coopUI .ccard .cpl{font-size:12px;opacity:.8}@media (max-height:420px){#coopUI .ccard{padding:10px 14px}#coopUI .ccard p{margin:4px 0;font-size:12.5px}#coopUI .ccard ol{margin:4px auto}}`;
const fmt = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rid = () => Math.random().toString(36).slice(2, 8);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function badgeTex(color = '#ffd34a', kind = 'pin') { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#0009'; g.beginPath(); g.arc(64, 64, 52, 0, 7); g.fill(); g.fillStyle = color; g.beginPath(); g.arc(64, 64, 44, 0, 7); g.fill(); g.fillStyle = '#1b1405';
  if (kind === 'cross') { g.fillStyle = '#fff'; g.fillRect(54, 30, 20, 68); g.fillRect(30, 54, 68, 20); }
  else if (kind === 'crate') { g.fillRect(36, 40, 56, 48); g.fillStyle = color; g.fillRect(42, 46, 44, 36); g.fillStyle = '#1b1405'; g.fillRect(60, 46, 8, 36); }
  else { g.beginPath(); g.moveTo(40, 46); g.lineTo(88, 46); g.lineTo(64, 90); g.closePath(); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function tagSprite(text, bg = '#000a') { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d'); g.fillStyle = bg; g.roundRect ? g.roundRect(8, 10, 240, 44, 14) : g.rect(8, 10, 240, 44); g.fill(); g.fillStyle = '#fff'; g.font = '700 28px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text.slice(0, 18), 128, 33); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(.62, .155, 1); s.renderOrder = 21; return s; }

export async function startCoop(T, missionId) {
  const M = missionById(missionId); if (!M) throw new Error('Unknown mission ' + missionId);
  const { H, me, net, scene, W, cam } = T; const Z = T.Z; const col = W.col;
  if (!document.getElementById('coop-css')) document.head.append(Object.assign(document.createElement('style'), { id: 'coop-css', textContent: CSS }));
  const host$ = document.getElementById('mpt') || document.body; const ui = document.createElement('div'); ui.id = 'coopUI'; host$.append(ui);
  const pin = document.createElement('div'); pin.className = 'cpin'; pin.innerHTML = '<i></i><span></span>'; ui.append(pin);
  const holdB = document.createElement('div'); holdB.className = 'chold'; holdB.innerHTML = '<b></b><span></span><kbd>hold X</kbd>'; ui.append(holdB);
  let card = null; const showCard = (cls, html) => { if (!card) { card = document.createElement('div'); ui.append(card); } card.className = 'ccard ' + cls; card.innerHTML = html; document.body.classList.add('coopcard'); return card; };
  const hideCard = () => { document.body.classList.remove('coopcard'); if (card) { card.remove(); card = null; } };
  const myName = () => net.me.name || 'Survivor';
  if (Z && Z.setTarget) Z.setTarget(10); // a few roamers; the mission brings its own waves
  H.noCashLoss = true;

  // ---------- 3D markers ----------
  const grp = new THREE.Group(); grp.name = 'coop'; scene.add(grp);
  const beamMat = new THREE.MeshBasicMaterial({ color: '#ffd34a', transparent: true, opacity: .28, depthWrite: false, fog: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const beamGeo = new THREE.CylinderGeometry(.32, .32, 34, 16, 1, true).translate(0, 17, 0);
  const pinMat = new THREE.SpriteMaterial({ map: badgeTex(), depthTest: false, transparent: true, fog: false });
  const mkBeam = (color) => { const g = new THREE.Group(); const m = new THREE.Mesh(beamGeo, color ? beamMat.clone() : beamMat); if (color) m.material.color.set(color); const s = new THREE.Sprite(pinMat); s.scale.set(.9, .9, 1); s.position.y = 3.2; s.renderOrder = 22; g.add(m, s); g.userData.s = s; grp.add(g); return g; };
  const ringMat = new THREE.MeshBasicMaterial({ color: '#ffd34a', transparent: true, opacity: .55, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(.94, 1, 72).rotateX(-Math.PI / 2), ringMat); ring.position.y = .07; ring.visible = false; ring.renderOrder = 3; grp.add(ring);
  const fillMat = new THREE.MeshBasicMaterial({ color: '#ffd34a', transparent: true, opacity: .1, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3 });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 72).rotateX(-Math.PI / 2), fillMat); disc.position.y = .06; disc.visible = false; grp.add(disc);
  const beam = mkBeam(); beam.visible = false;
  // supply crates: smooth cartoon wooden crates with a green cross badge (no logos)
  const crates = []; const crateStage = M.stages.find(s => s.kind === 'collect');
  if (crateStage) { const wood = new THREE.MeshStandardMaterial({ color: '#b07a40', roughness: .7 }), dark = new THREE.MeshStandardMaterial({ color: '#6e4622', roughness: .8 }), crossM = new THREE.MeshStandardMaterial({ color: '#3fbf6a', roughness: .5, emissive: '#1c5a30', emissiveIntensity: .6 });
    crateStage.items.forEach(([x0, z0], i) => { let [x, z] = [x0, z0]; for (let k = 0; k < 24 && col.hit(x, z, .6); k++) { const a = k * 1.1, d = .8 + k * .25; x = x0 + Math.cos(a) * d; z = z0 + Math.sin(a) * d; }
      const g = new THREE.Group(); const box = new THREE.Mesh(new THREE.BoxGeometry(.7, .55, .55), wood); box.position.y = .3; box.castShadow = true; g.add(box);
      for (const sx of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(.08, .57, .57), dark); b.position.set(sx * .3, .3, 0); g.add(b); }
      for (const sz of [-1, 1]) { const c1 = new THREE.Mesh(new THREE.BoxGeometry(.24, .07, .02), crossM), c2 = new THREE.Mesh(new THREE.BoxGeometry(.07, .24, .02), crossM); c1.position.set(0, .3, sz * .285); c2.position.copy(c1.position); g.add(c1, c2); }
      g.position.set(x, 0, z); g.rotation.y = i * 1.3; const bm = mkBeam('#7cf29a'); bm.position.set(x, 0, z); bm.userData.s.material = new THREE.SpriteMaterial({ map: badgeTex('#7cf29a', 'crate'), depthTest: false, transparent: true, fog: false }); bm.userData.s.scale.set(.7, .7, 1); bm.userData.s.position.y = 1.6; grp.add(g); crates.push({ i, x, z, g, bm }); }); }
  // radio tower: a simple cartoon lattice mast with a blinking light (radio mission only)
  let towerLight = null; if (M.id === 'radio') { const st = M.stages[0]; const g = new THREE.Group(); const red = new THREE.MeshStandardMaterial({ color: '#d4553f', roughness: .6 }), wht = new THREE.MeshStandardMaterial({ color: '#eee8dc', roughness: .6 });
    const H2 = 14; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; const b0 = new THREE.Vector3(Math.cos(a) * 1.1, 0, Math.sin(a) * 1.1), b1 = new THREE.Vector3(Math.cos(a) * .3, H2, Math.sin(a) * .3); const len = b0.distanceTo(b1); const leg = new THREE.Mesh(new THREE.CylinderGeometry(.06, .09, len, 8), red); leg.position.copy(b0).add(b1).multiplyScalar(.5); leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b1.clone().sub(b0).normalize()); leg.castShadow = true; g.add(leg); }
    for (let y = 1; y < H2; y += 1.6) { const r = new THREE.Mesh(new THREE.TorusGeometry(1.1 - y / H2 * .8, .05, 6, 4), (y / 1.6 | 0) % 2 ? red : wht); r.rotation.x = Math.PI / 2; r.rotation.z = Math.PI / 4; r.position.y = y; g.add(r); }
    const dish = new THREE.Mesh(new THREE.SphereGeometry(.55, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2.4), wht); dish.rotation.x = Math.PI / 2; dish.position.set(0, H2 - 3, .45); g.add(dish);
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.2, .7), new THREE.MeshStandardMaterial({ color: '#5d6b74', roughness: .5 })); box.position.set(1.4, .6, 0); box.castShadow = true; g.add(box);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(.6, .32), new THREE.MeshBasicMaterial({ color: '#2a3a2f' })); scr.position.set(1.4, .85, .36); g.add(scr); box.userData.scr = scr;
    towerLight = new THREE.Mesh(new THREE.SphereGeometry(.18, 12, 8), new THREE.MeshBasicMaterial({ color: '#ff4030', fog: false })); towerLight.position.y = H2 + .2; g.add(towerLight); towerLight.userData.scr = scr;
    g.position.set(st.p[0], 0, st.p[1]); grp.add(g); }

  // ---------- survivor (rescue mission) ----------
  let sv = null; if (M.stages.some(s => s.kind === 'escort')) { try { const { lib } = await loadZombieModels(); let seed = 41; while (randomLook(seed, false).fem) seed++; const look = Object.assign(randomLook(seed, false), { rig: 'genm', fem: false, outfit: 'flannel' });
    const c = new Char(lib, look, 1); c.root.position.set(...[M.stages[0].p[0], 0, M.stages[0].p[1]]); c.root.rotation.y = -Math.PI / 2; scene.add(c.root); c.play('Crouch_Idle_Loop', { fade: 0 }); sv = { c, x: c.root.position.x, z: c.root.position.z, ry: -Math.PI / 2, anim: '', tag: tagSprite('Marcus', '#1d6b3acc') }; scene.add(sv.tag); } catch (e) { console.warn('[coop] survivor', e); } }

  // ---------- state ----------
  let S = null, sFrom = null, sAt = 0; const P = new Map(); // P: latest coP of every other player
  const L = { run: null, go: null, paid: null, down: false, bleed: 0, sw: 1, swT: 0, kills: 0, zk: {}, pk: [], used: {}, hold: 0, holdKey: '', joined: performance.now(), sendT: 0, pT: 0, dirty: true, revT: 0 };
  const isHost = () => { let m = net.id; for (const id of net.peers.keys()) if (id < m) m = id; return m === net.id; };
  const stage = () => (S && S.ph === 'go') ? M.stages[S.st] : null;
  const players = () => { const out = [{ id: net.id, name: myName(), x: me.x, z: me.z, down: L.down || me.dead > 0, sw: L.swT > 0, me: true }];
    for (const [id, p] of net.peers) { if (!p.s) continue; const q = P.get(id) || {}; out.push({ id, name: p.name || 'Survivor', x: p.s.x, z: p.s.z, down: !!(q.down || ((p.s.f | 0) & 64)), sw: !!q.sw, me: false }); } return out; };
  const myStatus = () => ({ t: 'coP', run: L.run, down: L.down, sw: L.swT > 0, k: L.kills, zk: L.zk, pk: L.pk, u: L.used, nm: myName() });
  const sendP = () => { net.evt(myStatus()); L.pT = 0; };
  const sendS = () => { if (S) net.evt({ t: 'coS', s: S }); L.sendT = 0; };
  const newRun = () => ({ m: M.id, run: rid(), ph: 'brief', bt: 12, el: 0, st: 0, prog: 0, hold: 0, wt: 0, taken: crates.map(() => 0), sv: sv ? { x: M.stages[0].p[0], z: M.stages[0].p[1], ry: -Math.PI / 2, hp: 100, st: 'wait' } : null, kills: 0, downs: 0, why: '', host: myName(), seen: {} });

  // ---------- net ----------
  const prevEvt = net.onEvt; net.onEvt = (e, id) => { if (!e || typeof e.t !== 'string' || e.t.slice(0, 2) !== 'co') return prevEvt && prevEvt(e, id);
    if (e.t === 'coS') { const s = e.s; if (!s || s.m !== M.id) return; if (isHost() && S && net.id < id) return; /* a stale/second host: the lowest id wins */ if (sFrom && sFrom !== id && sFrom < id && performance.now() - sAt < 3000) return; sFrom = id; sAt = performance.now(); S = s; }
    else if (e.t === 'coP') P.set(id, Object.assign({ at: performance.now() }, e));
    else if (e.t === 'coW') { if (S && e.run === S.run) spawnLocal(e.x, e.z, e.n, e.inside); }
    else if (e.t === 'coE') { if (e.a === 'rev' && e.to === net.id && L.down) standUp('Revived by ' + (e.by || 'a teammate')); if (e.a === 'again' && isHost()) restart(); } };

  // ---------- waves ----------
  const fr = new THREE.Frustum(), pm = new THREE.Matrix4(), tv = new THREE.Vector3();
  const inView = (x, z) => { cam.updateMatrixWorld(); pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); fr.setFromProjectionMatrix(pm); return fr.containsPoint(tv.set(x, 1, z)); };
  function spawnLocal(x, z, n, inside) { if (!Z || !Z.spawnAt) return 0; const alive = Z.stats ? Z.stats().alive : 0; n = Math.min(n, Math.max(0, 30 - alive)); let made = 0;
    for (let k = 0; k < n * 12 && made < n; k++) { const a = Math.random() * Math.PI * 2, d = inside ? 2 + Math.random() * 9 : 30 + Math.random() * 12; const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      if (Math.abs(px) > 112 || Math.abs(pz) > 82 || col.hit(px, pz, .5)) continue; const dm = Math.hypot(px - me.x, pz - me.z); if (dm < 9) continue; if (k < n * 8 && dm < 46 && inView(px, pz)) continue; // never pop in on screen when we can avoid it
      if (Z.spawnAt(px, pz, { mission: true, runner: Math.random() < .3 })) made++; } return made; }
  const wave = (x, z, n, inside = false) => { if (!S) return; net.evt({ t: 'coW', run: S.run, x, z, n, inside }); spawnLocal(x, z, n, inside); };

  // ---------- downed / revive ----------
  const deadKids = [...T.deadEl.children].map(c => c.textContent);
  const setDownUI = () => { const k = T.deadEl.children; if (!k[2]) return; k[0].textContent = "You're down!"; k[1].textContent = String(Math.ceil(L.swT > 0 ? L.swT : L.bleed)); k[2].textContent = L.swT > 0 ? 'Second wind — getting back up…' : (players().length > 1 ? 'Hang on! A teammate can revive you' : 'Bleeding out…'); };
  const restoreDeadUI = () => { const k = T.deadEl.children; deadKids.forEach((t, i) => { if (k[i]) k[i].textContent = t; }); };
  H.onDie = () => { if (!S || S.ph !== 'go') return; L.down = true; L.bleed = 45; L.swT = (players().length === 1 && L.sw > 0) ? 4 : 0; setDownUI(); sendP(); };
  H.holdDead = dt => { if (!L.down) return false; if (S && S.ph !== 'go') { standUp(''); return true; }
    if (L.swT > 0) { L.swT -= dt; if (L.swT <= 0) { L.sw--; standUp('Second wind!'); return true; } } else if (players().length === 1 && L.sw > 0) L.swT = 4;
    L.bleed -= dt; if (L.bleed <= 0) { L.down = false; restoreDeadUI(); me.dead = .01; sendP(); return false; /* town respawns at the street */ }
    setDownUI(); return true; };
  function standUp(msg) { const x = me.x, z = me.z; L.down = false; L.swT = 0; restoreDeadUI(); T.respawn(); T.setPos(x, z); me.hp = msg ? 50 : 100; if (msg) T.toast(msg, 1.8); sendP(); }

  // ---------- host logic ----------
  function restart() { S = newRun(); sFrom = net.id; sendS(); }
  function lose(why) { S.ph = 'lost'; S.why = why; sendS(); }
  function hostTick(dt) {
    const ps = players(); const others = [...P.entries()].filter(([id]) => net.peers.has(id)).map(([, q]) => q).filter(q => q.run === S.run);
    for (const p of ps) { const k = p.id; if (p.down && !S.seen[k]) S.downs++; S.seen[k] = p.down ? 1 : 0; }
    S.kills = L.kills + others.reduce((a, q) => a + (q.k | 0), 0);
    if (S.ph === 'brief') { S.bt -= dt; if (S.bt <= 0) { S.ph = 'go'; S.el = 0; enter(0); } return; }
    if (S.ph !== 'go') return;
    S.el += dt; if (S.el >= M.limit) return lose('time');
    const up = ps.filter(p => !p.down); if (!up.length && !ps.some(p => p.sw) && ps.length) { S.wipeT = (S.wipeT || 0) + dt; if (S.wipeT > 1.2) return lose('wipe'); } else S.wipeT = 0;
    const st = M.stages[S.st]; let done = false; const key = S.run + ':' + S.st;
    if (st.kind === 'collect') { const all = new Set(L.pk); for (const q of others) (q.pk || []).forEach(i => all.add(i)); S.taken = crates.map((c, i) => all.has(i) ? 1 : 0); S.prog = S.taken.reduce((a, b) => a + b, 0); done = S.prog >= crates.length; }
    else if (st.kind === 'goto') { const inn = up.filter(p => dist([p.x, p.z], st.p) < st.r).length; S.prog = inn; S.need = up.length; done = st.all ? (up.length > 0 && inn >= up.length) : inn > 0; }
    else if (st.kind === 'use') { done = L.used[key] || others.some(q => q.u && q.u[key]); }
    else if (st.kind === 'hold') { const inn = up.some(p => dist([p.x, p.z], st.p) < st.r); if (inn) S.hold += dt; S.prog = S.hold; done = S.hold >= st.dur; }
    else if (st.kind === 'kills') { S.prog = (L.zk[key] | 0) + others.reduce((a, q) => a + ((q.zk && q.zk[key]) | 0), 0); done = S.prog >= st.need; }
    else if (st.kind === 'escort' && S.sv) { done = dist([S.sv.x, S.sv.z], st.to) < st.r; }
    if (st.waves) { S.wt -= dt; if (S.wt <= 0) { S.wt = st.waves.every; const c = st.kind === 'escort' ? [S.sv.x, S.sv.z] : (st.p || [me.x, me.z]); wave(c[0], c[1], st.waves.n + Math.max(0, ps.length - 1), false); } }
    if (S.sv) tickSurvivor(dt, up.length ? up : ps);
    if (S.ph !== 'go') return;
    if (done) { if (st.survivor === 'free' && S.sv) S.sv.st = 'follow'; if (st.kind === 'escort' && S.sv) S.sv.st = 'safe'; if (S.st + 1 >= M.stages.length) { S.ph = 'won'; sendS(); } else enter(S.st + 1); }
  }
  function enter(i) { S.st = i; S.prog = 0; S.hold = 0; const st = M.stages[i]; S.wt = st.waves ? Math.min(6, st.waves.every * .5) : 0;
    const nx = M.stages[i + 1]; if (st.kind === 'goto' && nx && nx.kind === 'kills' && nx.start) wave(nx.p[0], nx.p[1], nx.start, true); // fill the store while the team is on the way
    sendS(); }
  function tickSurvivor(dt, ps) { const s = S.sv; if (s.st !== 'follow') return; let tg = null, td = 1e9; for (const p of ps) { const d = Math.hypot(p.x - s.x, p.z - s.z); if (d < td) { td = d; tg = p; } } if (!tg) return;
    if (td > 2.3) { const sp = td > 7 ? 4.4 : td > 4 ? 3.2 : 1.8, dx = (tg.x - s.x) / td, dz = (tg.z - s.z) / td; const r = col.push(s.x + dx * sp * dt, s.z + dz * sp * dt, .32); if (Math.hypot(r[0] - s.x, r[1] - s.z) < sp * dt * .25) s.stuck = (s.stuck || 0) + dt; else s.stuck = 0; s.x = r[0]; s.z = r[1]; s.ry = Math.atan2(dx, dz); }
    if (td > 22 || (s.stuck || 0) > 2.5) { for (let k = 0; k < 8; k++) { const a = k * .8, x = tg.x + Math.cos(a) * 2, z = tg.z + Math.sin(a) * 2; if (!col.hit(x, z, .4)) { s.x = x; s.z = z; s.stuck = 0; break; } } }
    if (Z) { let n = 0; for (const q of Z.zombies) { if (q.dead) continue; const p = q.root.position; if (Math.hypot(p.x - s.x, p.z - s.z) < 1.25) n++; } if (n) { s.hp = Math.max(0, s.hp - n * 3.5 * dt); if (s.hp <= 0) lose('survivor'); } } }

  // ---------- local per-frame ----------
  const holdState = { on: false }; let keyX = false;
  const onKey = e => { if (e.code === 'KeyX' && !(e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) keyX = e.type === 'keydown'; }; addEventListener('keydown', onKey); addEventListener('keyup', onKey);
  const hdown = e => { e.preventDefault(); e.stopPropagation(); holdState.on = true; }, hup = e => { e.stopPropagation(); holdState.on = false; };
  holdB.addEventListener('pointerdown', hdown); for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) holdB.addEventListener(ev, hup); holdB.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
  H.zev = (ev, z) => { if (ev !== 'kill') return; L.kills++; const st = stage(); if (st && st.kind === 'kills') { const p = z.root.position; if (Math.hypot(p.x - st.p[0], p.z - st.p[1]) < st.r) { const k = S.run + ':' + S.st; L.zk[k] = (L.zk[k] | 0) + 1; } } L.dirty = true; };
  const downTags = new Map();
  function onRun() { // a new run (first state, or Play again)
    L.run = S.run; L.go = null; L.kills = 0; L.zk = {}; L.pk = []; L.used = {}; L.sw = 1; L.hold = 0; if (L.down) standUp(''); hideCard(); sendP(); }
  function onGo() { L.go = S.run; const ids = players().map(p => p.id).sort(); const i = Math.max(0, ids.indexOf(net.id)); const x = SPAWN.x + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 1.6, z = SPAWN.z; T.setPos(col.hit(x, z, .4) ? SPAWN.x : x, z); me.hp = 100; T.toast(M.icon + ' ' + M.name + ' — go!', 1.8); hideCard(); }
  function holdAction() { // what the hold button does right now (revive beats everything)
    if (L.down || me.dead > 0 || !S || S.ph !== 'go') return null;
    for (const p of players()) if (!p.me && p.down && Math.hypot(p.x - me.x, p.z - me.z) < 2.4) return { key: 'rev:' + p.id, label: 'Revive ' + p.name, dur: 3, done: () => { for (let k = 0; k < 3; k++) setTimeout(() => net.evt({ t: 'coE', a: 'rev', to: p.id, by: myName() }), k * 250); T.toast('You revived ' + p.name, 1.6); } };
    const st = stage(); const key = S.run + ':' + S.st;
    if (st && st.kind === 'use' && !L.used[key] && dist([me.x, me.z], st.p) < st.r) return { key: 'use:' + key, label: st.label, dur: st.dur, done: () => { L.used[key] = 1; sendP(); } };
    return null; }
  function targets() { // where the HUD pin / beam points: [x, z, label]
    const st = stage(); if (!st) return null;
    if (st.kind === 'collect') { let best = null, bd = 1e9; for (const c of crates) { if (S.taken[c.i] || L.pk.includes(c.i)) continue; const d = Math.hypot(c.x - me.x, c.z - me.z); if (d < bd) { bd = d; best = c; } } return best ? [best.x, best.z, 'Crate', false] : null; }
    if (st.kind === 'escort') return [st.to[0], st.to[1], 'Evac', true];
    return [st.p[0], st.p[1], st.pin || (st.kind === 'hold' ? 'Hold' : st.kind === 'kills' ? 'Clear' : st.kind === 'use' ? st.label : (st.evac ? 'Evac' : 'Go')), true]; }

  H.frame = (dt, t) => {
    // become host when nobody else is running this mission (after a short wait so a joiner adopts the running game first)
    if (isHost()) { if (!S && performance.now() - L.joined > 2500) restart(); if (S) { if (sFrom !== net.id && performance.now() - sAt > 1500) sFrom = net.id; if (sFrom === net.id) { hostTick(dt); L.sendT += dt; if (L.sendT > .25) sendS(); } } }
    if (!S) { H.objHtml = `<b>CO-OP · ${esc(M.name.toUpperCase())}</b><span>Connecting to your team…</span>`; return; }
    if (S.run !== L.run) onRun(); if (S.ph === 'go' && L.go !== S.run) onGo();
    L.pT += dt; if (L.pT > .5 || L.dirty) { L.dirty = false; sendP(); }
    const st = stage(), key = S.run + ':' + S.st;
    // crates: pick up by walking over them
    for (const c of crates) { const gone = !!S.taken[c.i] || L.pk.includes(c.i); c.g.visible = !gone; c.bm.visible = !gone && !!st && st.kind === 'collect'; if (!gone) { c.g.position.y = .04 + Math.sin(t * 3 + c.i) * .04; c.g.rotation.y += dt * .6; }
      if (!gone && st && st.kind === 'collect' && !L.down && me.dead <= 0 && Math.hypot(c.x - me.x, c.z - me.z) < 1.7) { L.pk.push(c.i); L.dirty = true; T.toast('📦 Supplies ' + (S.taken.reduce((a, b) => a + b, 0) + 1) + '/' + crates.length, 1.2); try { T.aud.pickup(); } catch (e) { /* ignore */ } } }
    // zone ring + beam
    const tg = targets(); const zone = st && (st.kind === 'hold' || st.kind === 'kills' || st.kind === 'goto') ? st : null;
    ring.visible = disc.visible = !!zone; if (zone) { ring.position.set(zone.p[0], .07, zone.p[1]); ring.scale.setScalar(zone.r); disc.position.set(zone.p[0], .06, zone.p[1]); disc.scale.setScalar(zone.r); const inn = dist([me.x, me.z], zone.p) < zone.r; ringMat.opacity = .45 + Math.sin(t * 4) * .15; ringMat.color.set(zone.kind === 'kills' ? '#ff7a5a' : inn ? '#7cf29a' : '#ffd34a'); fillMat.color.copy(ringMat.color); }
    const bd = tg ? Math.hypot(tg[0] - me.x, tg[1] - me.z) : 0; beam.visible = !!(tg && tg[3]) && bd > 5; if (beam.visible) { beam.children[0].material.opacity = Math.min(.28, (bd - 5) * .04); beam.position.set(tg[0], 0, tg[1]); beam.userData.s.position.y = 3.2 + Math.sin(t * 2.5) * .15; }
    if (towerLight) { towerLight.visible = (t * 2 | 0) % 2 === 0; const on = S.ph === 'won' || (st && st.kind === 'hold') || (S.ph === 'go' && S.st > 1); towerLight.userData.scr.material.color.set(on ? '#4cff7a' : '#2a3a2f'); }
    // survivor
    if (sv && S.sv) { const s = S.sv, c = sv.c; const ox = sv.x, oz = sv.z; sv.x += (s.x - sv.x) * Math.min(1, dt * 8); sv.z += (s.z - sv.z) * Math.min(1, dt * 8); if (Math.hypot(s.x - sv.x, s.z - sv.z) > 6) { sv.x = s.x; sv.z = s.z; }
      const spd = Math.hypot(sv.x - ox, sv.z - oz) / Math.max(dt, 1e-3); c.root.position.set(sv.x, 0, sv.z); sv.ry += Math.atan2(Math.sin(s.ry - sv.ry), Math.cos(s.ry - sv.ry)) * Math.min(1, dt * 8); c.root.rotation.y = sv.ry;
      const want = s.st === 'wait' ? 'Crouch_Idle_Loop' : spd > 3.4 ? 'Jog_Fwd_Loop' : spd > .5 ? 'Walk_Loop' : 'Idle_Loop'; if (sv.anim !== want) { sv.anim = want; c.play(want, { speed: want === 'Walk_Loop' ? .9 : 1 }); } c.mixer.update(dt); sv.tag.position.set(sv.x, 2.05, sv.z); }
    // downed teammates: red cross badge over them
    const ps = players(); for (const p of ps) { if (p.me) continue; let s = downTags.get(p.id); if (p.down && !s) { s = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex('#e0443a', 'cross'), depthTest: false, transparent: true, fog: false })); s.scale.set(.55, .55, 1); s.renderOrder = 23; grp.add(s); downTags.set(p.id, s); } if (s) { s.visible = p.down; s.position.set(p.x, 1.2 + Math.sin(t * 4) * .08, p.z); } }
    for (const [id, s] of downTags) if (!net.peers.has(id)) { grp.remove(s); downTags.delete(id); }
    // hold button
    const ha = holdAction(); holdB.classList.toggle('on', !!ha);
    if (ha) { if (L.holdKey !== ha.key) { L.holdKey = ha.key; L.hold = 0; } holdB.querySelector('span').textContent = ha.label; const held = holdState.on || keyX; L.hold = held ? L.hold + dt : Math.max(0, L.hold - dt * 2); holdB.querySelector('b').style.width = Math.min(100, L.hold / ha.dur * 100) + '%'; if (L.hold >= ha.dur) { L.hold = 0; holdState.on = false; ha.done(); } } else { L.hold = 0; L.holdKey = ''; }
    // screen pin (distance + edge arrow)
    if (tg) { const v = tv.set(tg[0], 1.6, tg[1]).project(cam); const d = Math.hypot(tg[0] - me.x, tg[1] - me.z); const R = ui.getBoundingClientRect(); let x = (v.x * .5 + .5) * R.width, y = (-v.y * .5 + .5) * R.height; const behind = v.z > 1; const off = behind || x < 30 || x > R.width - 30 || y < 60 || y > R.height - 30;
      let ang = 0; if (off) { let dx = v.x, dy = -v.y; if (behind) { dx = -dx; dy = -dy; } const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; const ex = R.width / 2 - 46, ey = R.height / 2 - 56; const k = Math.min(ex / Math.max(1e-3, Math.abs(dx)), ey / Math.max(1e-3, Math.abs(dy))); x = R.width / 2 + dx * k; y = R.height / 2 + dy * k + 10; ang = Math.atan2(dy, dx) * 180 / Math.PI + 90; } else y -= 18;
      pin.style.display = d < 2.5 ? 'none' : 'flex'; pin.style.left = x + 'px'; pin.style.top = y + 'px'; pin.querySelector('i').style.transform = off ? `rotate(${ang}deg)` : 'rotate(180deg)'; pin.querySelector('span').textContent = `${tg[2]} · ${Math.round(d)} m`; } else pin.style.display = 'none';
    // brief / results cards
    if (S.ph === 'brief') { const n = ps.length; const html = `<div class="ck">CO-OP MISSION · ${n} PLAYER${n > 1 ? 'S' : ''}</div><h3>${M.icon} ${esc(M.name)}</h3><p>${esc(M.brief)}</p><ol>${M.stages.map(s => `<li>${esc(s.text)}</li>`).join('')}</ol><div class="cpl">Reward $${M.reward} each · +$${NO_DOWN_BONUS} if nobody goes down · Starting in ${Math.max(1, Math.ceil(S.bt))}…</div><div class="cbtns">${isHost() ? '<button class="pri" data-a="start">Start now</button>' : ''}<button data-a="leave">Leave</button></div>`;
      if (!card || card.dataset.h !== html) { const c = showCard('brief', html); c.dataset.h = html; } }
    else if (S.ph === 'won' || S.ph === 'lost') { const won = S.ph === 'won'; if (L.paid !== S.run) { L.paid = S.run; const pay = won ? M.reward + (S.downs ? 0 : NO_DOWN_BONUS) : FAIL_PAY; T.bag.add('cash', pay); L.pay = pay; try { won ? T.aud.pickup() : T.aud.hurt(); } catch (e) { /* ignore */ } }
      const why = { time: 'Time ran out.', wipe: 'The whole team went down.', survivor: 'Marcus didn\'t make it.' }[S.why] || '';
      const html = `<div class="ck">${won ? 'MISSION COMPLETE' : 'MISSION FAILED'}</div><h3>${M.icon} ${esc(M.name)}</h3>${why ? `<p>${why}</p>` : ''}<div class="cst"><div><b>${fmt(S.el)}</b><span>Time</span></div><div><b>${S.kills | 0}</b><span>Team kills</span></div><div><b>${S.downs | 0}</b><span>Downs</span></div><div><b>${ps.length}</b><span>Players</span></div></div><div class="crew">+$${L.pay} cash</div><div class="cpl">${won && !S.downs ? `Includes the $${NO_DOWN_BONUS} no-down bonus · ` : ''}Added to your wallet (shared with Story and Survival)</div><div class="cbtns">${isHost() ? '<button class="pri" data-a="again">Play again</button>' : '<button class="pri" data-a="again">Ask host to replay</button>'}<button data-a="leave">Back to lobby</button></div>`;
      if (!card || card.dataset.h !== html) { const c = showCard(won ? 'won' : 'lost', html); c.dataset.h = html; } }
    else if (card) hideCard();
    // HUD objective line (top centre card, same style as the story objective)
    let line = ''; if (S.ph === 'brief') line = 'Mission briefing'; else if (S.ph === 'won') line = 'Mission complete!'; else if (S.ph === 'lost') line = 'Mission failed'; else if (st) {
      line = st.text; if (st.kind === 'collect') line += ` <b class="cv">${S.prog}/${crates.length}</b>`; else if (st.kind === 'hold') line += ` <b class="cv">${fmt(st.dur - S.hold)}</b>`; else if (st.kind === 'kills') line += ` <b class="cv">${Math.min(S.prog, st.need)}/${st.need}</b>`; else if (st.kind === 'goto' && st.all) line += ` <b class="cv">${S.prog}/${S.need || 1}</b>`;
      if (S.sv && S.sv.st !== 'wait') line += ` · Marcus ❤ ${Math.ceil(S.sv.hp)}`; }
    H.objHtml = `<b>CO-OP · ${esc(M.name.toUpperCase())}</b><span>${line}</span>${S.ph === 'go' ? `<small>⏱ ${fmt(M.limit - S.el)} · Team ${ps.length}${ps.some(p => p.down) ? ` · ${ps.filter(p => p.down).length} down` : ''}</small>` : ''}`;
  };
  H.obj = () => H.objHtml || '';
  ui.addEventListener('click', e => { const a = e.target && e.target.dataset && e.target.dataset.a; if (!a) return; e.stopPropagation();
    if (a === 'start' && isHost() && S && S.ph === 'brief') { S.bt = 0; }
    else if (a === 'again') { if (isHost()) restart(); else { net.evt({ t: 'coE', a: 'again' }); T.toast('Asked the host for a replay', 1.4); } }
    else if (a === 'leave') T.exit(); });
  ui.addEventListener('touchstart', e => { if (e.target.closest('.ccard')) e.stopPropagation(); }, { passive: true });
  // minimap: objective (clamped to the rim), crates, Marcus, downed teammates
  H.mini = (g, X, Zm) => { if (!S) return; const st = stage(); const C = g.canvas.width / 2, R = C - 7; const clampPt = (x, y) => { const dx = x - C, dy = y - C, l = Math.hypot(dx, dy); return l > R ? [C + dx / l * R, C + dy / l * R] : [x, y]; };
    if (st && st.kind === 'collect') { g.fillStyle = '#7cf29a'; for (const c of crates) if (!S.taken[c.i] && !L.pk.includes(c.i)) { const [x, y] = clampPt(X(c.x), Zm(c.z)); g.fillRect(x - 3, y - 3, 6, 6); } }
    const tg = targets(); if (tg && tg[3]) { const [x, y] = clampPt(X(tg[0]), Zm(tg[1])); g.fillStyle = '#ffd34a'; g.strokeStyle = '#000'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 5, y); g.lineTo(x, y + 6); g.lineTo(x - 5, y); g.closePath(); g.fill(); g.stroke(); }
    if (S.sv) { const [x, y] = clampPt(X(S.sv.x), Zm(S.sv.z)); g.fillStyle = '#3fbf6a'; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }
    g.fillStyle = '#ff5a4a'; for (const p of players()) if (!p.me && p.down) { const [x, y] = clampPt(X(p.x), Zm(p.z)); g.fillRect(x - 1.5, y - 5, 3, 10); g.fillRect(x - 5, y - 1.5, 10, 3); } };
  H.exit = () => { document.body.classList.remove('coopcard'); removeEventListener('keydown', onKey); removeEventListener('keyup', onKey); net.onEvt = prevEvt; try { scene.remove(grp); if (sv) { scene.remove(sv.c.root, sv.tag); } } catch (e) { /* ignore */ } delete window.__coop; };
  // test hook (localhost only)
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__coop = { get S() { return S; }, L, M, isHost, players, crates, get sv() { return sv; }, restart, standUp, spawnLocal, wave };
  return { M };
}
