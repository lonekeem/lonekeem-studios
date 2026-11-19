import * as THREE from 'three';
import { partnerEnter, partnerUpdate, ventUse } from './partner.js';
import { prepCarDoors, setDoor, boardTruck, leaveTruck, updateCarSeq, outPoint } from './carseq.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { buildWorld } from './world.js';
import { CAST, randomLook, raiderLook, DEFAULT_LOOK } from './looks.js';
import { bossProp, wrap, walkie } from './props.js';
import { CharLib, Char, backpack, weaponMesh, makeDog, makeRabbit } from './chars.js';
import { buildPickup } from './gear.js';
import { loadRigs } from './avatar.js';
import { WEAPONS, WEAPON_ORDER, stat, perk, xpFor, PERKS, writeSave } from './data.js';
import { V3, clamp, lerp, rnd, angLerp, bloodTex } from './util.js';
import { Input } from './input.js';
import { STORY, LOOT, chOf } from './story.js';

const $ = (s) => document.querySelector(s);
export const PRESETS = {
  low: { name: 'low', pr: 0.75, shadows: false, shadowMap: 512, trees: 160, grass: 1800, rain: 900, lamps: 3, maxZ: 9, post: false, normals: false, aniso: 1, fog: 0.042 },
  med: { name: 'med', pr: 1.0, shadows: true, shadowMap: 1024, trees: 300, grass: 6000, rain: 2200, lamps: 5, maxZ: 14, post: false, normals: true, aniso: 4, fog: 0.036 },
  high: { name: 'high', pr: 1.5, shadows: true, shadowMap: 2048, trees: 520, grass: 16000, rain: 4000, lamps: 7, maxZ: 22, post: true, normals: true, aniso: 8, fog: 0.032 },
};
export function autoQuality() {
  const coarse = matchMedia && matchMedia('(pointer:coarse)').matches; const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
  if (!coarse) return cores >= 6 ? 'high' : 'med'; return mem >= 6 && cores >= 8 ? 'med' : 'low';
}
export const LOOKS = CAST; let ZSEED = 1;
// Strong language: lines carry {explicit|clean} pairs. on = uncensored, bleep = voiced explicit with a bleep + masked subtitle, clean = alternate words.
export function langLine(raw, mode) { const re = /\{([^|}]*)\|([^}]*)\}/g; const voice = raw.replace(re, mode === 'clean' ? '$2' : '$1');
  const sub = mode === 'bleep' ? raw.replace(re, (m, a) => a.replace(/[A-Za-z]/g, (ch, i) => (i === 0 || !/[A-Za-z]/.test(a[i - 1] || '') ? ch : '*'))) : voice;
  const bleeps = []; if (mode === 'bleep') { let pos = 0, out = 0; raw.replace(re, (m, a, b, off) => { const st = off - pos + out; bleeps.push([st, st + a.trimEnd().length]); out = st + a.length; pos = off + m.length; return m; });
    const len = voice.length || 1; bleeps.forEach(b => { b[0] /= len; b[1] /= len; }); } return { sub, voice, bleeps }; }
export function playerLook() { try { const l = JSON.parse(localStorage.getItem('atq3.look') || 'null'); if (l && l.hair) return Object.assign({}, DEFAULT_LOOK, l, { rig: 'keem' }); } catch (e) { } return DEFAULT_LOOK; }

// v1.9.2: touch wording for objective hints on phones
const touchHint = (h) => h.replace(/\(WASD \/ left stick\)/g, '(left stick)').replace(/\bE \/ ✋/g, '✋ hand button').replace(/\bPress E\b/g, 'Tap ✋').replace(/GAS\/BRAKE \+ ◀ ▶ \([^)]*\)/g, 'GAS/BRAKE + ◀ ▶').replace(/\bWASD\b/g, 'left stick');
export class Game {
  constructor(opts) { Object.assign(this, opts); this.t = 0; this.paused = true; this.running = false; this.timeScale = 1; this.hitstop = 0; this.trauma = 0; }
  async load(progress) {
    const S = this.settings; const qn = S.qual === 'auto' || !S.qual ? autoQuality() : S.qual; const Q = this.Q = PRESETS[qn] || PRESETS.med;
    const canvas = $('#gl'); const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: Q.name !== 'low', powerPreference: 'high-performance' });
    this.basePR = Math.min(window.devicePixelRatio || 1, Q.pr * (window.devicePixelRatio > 1 ? 1.34 : 1), 2); this.pr = this.basePR; r.setPixelRatio(this.pr);
    r.setSize(innerWidth, innerHeight, false); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05; r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = Q.shadows; r.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = this.scene = new THREE.Scene(); scene.fog = new THREE.FogExp2('#141c1a', Q.fog); scene.background = new THREE.Color('#0f1614');
    const cam = this.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.05, 260); scene.add(cam);
    const mgr = new THREE.LoadingManager(); mgr.onProgress = (u, a, b) => progress && progress(a / b);
    const base = './'; const tl = new THREE.TextureLoader(mgr);
    const [gltf, hdr] = await Promise.all([new GLTFLoader(mgr).loadAsync(base + 'models/AnimationLibrary_Godot_Standard.gltf'), new HDRLoader(mgr).loadAsync(base + 'tex/sky.hdr').catch(() => null)]);
    if (hdr) { const pm = new THREE.PMREMGenerator(r); const env = pm.fromEquirectangular(hdr).texture; scene.environment = env; scene.environmentIntensity = 0.32; scene.background = env; scene.backgroundIntensity = 0.06; scene.backgroundBlurriness = 0.35; hdr.dispose(); }
    // night lighting
    const GRADE = /[?&]grade=1/.test(location.search); // optional visual-only night grade (test shots): cooler moon, warmer fill, slightly lifted fog
    scene.add(GRADE ? new THREE.HemisphereLight('#4a5f78', '#2a2418', 0.85) : new THREE.HemisphereLight('#3a4a5a', '#151a12', 0.55));
    if (GRADE) { scene.fog.color.set('#1b2628'); scene.fog.density *= .8; scene.background = new THREE.Color('#16201f'); }
    const moon = this.moon = new THREE.DirectionalLight(GRADE ? '#a9c0e0' : '#9fb4d0', GRADE ? 1.25 : 0.9); moon.position.set(-30, 50, 20); moon.castShadow = Q.shadows; moon.shadow.mapSize.set(Q.shadowMap, Q.shadowMap);
    const sc = moon.shadow.camera; sc.left = sc.bottom = -26; sc.right = sc.top = 26; sc.near = 1; sc.far = 140; moon.shadow.bias = -0.0005; moon.shadow.normalBias = 0.03; scene.add(moon, moon.target);
    const CK = ['sedan', 'suv', 'truck', 'police', 'van', 'taxi', 'hatchback-sports', 'suv-luxury', 'ambulance', 'debris-tire', 'debris-door', 'debris-bumper']; const CM = {};
    await Promise.all(CK.map(k => new GLTFLoader().loadAsync(base + 'models/cars/' + k + '.glb').then(g => { CM[k] = g.scene; }).catch(() => { })));
    this.world = buildWorld(scene, Q, tl, base, CM);
    this.lib = new CharLib(gltf); this.lib.rigs = await loadRigs(base);
    await new Promise(res => { if (mgr.itemsLoaded >= mgr.itemsTotal) res(); else { mgr.onLoad = res; setTimeout(res, 15000); } });
    // drive buttons (touch / mouse)
    [['#dGas', 'gas'], ['#dBrake', 'brake'], ['#dL', 'l'], ['#dR', 'r']].forEach(([id, k]) => { const e = $(id); if (!e) return; const on = (v) => (ev) => { ev.preventDefault(); this.drv = this.drv || {}; this.drv[k] = v; e.classList.toggle('on', v); };
      e.addEventListener('pointerdown', on(true)); ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => e.addEventListener(t, on(false))); });
    // player
    this.pack = backpack(); this.hand = new THREE.Group(); this.makePlayer();
    // flashlight
    const fl = this.flash = new THREE.SpotLight('#fff4dc', 28, 26, 0.42, 0.5, 1.6); fl.castShadow = Q.shadows && Q.name === 'high'; fl.shadow.mapSize.set(512, 512); scene.add(fl, fl.target);
    // FP viewmodel
    this.vm = new THREE.Group(); cam.add(this.vm); this.vm.position.set(0.22, -0.2, -0.45);
    this.weaponMeshes = {}; WEAPON_ORDER.forEach(id => { const m = weaponMesh(id); this.weaponMeshes[id] = m; });
    // FX pools
    this.initFX(); this.input = new Input(this);
    this.zombies = []; this.npcs = {}; this.pickups = []; this.props = [];
    // post
    if (Q.post) { try { const c = this.composer = new EffectComposer(r); c.addPass(new RenderPass(scene, cam)); const ao = new GTAOPass(scene, cam, innerWidth, innerHeight); ao.blendIntensity = 0.8; c.addPass(ao);
      c.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.45, 0.5, 0.82)); c.addPass(new OutputPass()); } catch (e) { this.composer = null; } }
    addEventListener('resize', () => this.resize()); this.resize();
    this.cam = { yaw: Math.PI / 2, pitch: -0.12, dist: 2.9, fp: !!S.fp, shake: V3() };
    this.fpsAcc = 0; this.fpsN = 0; this.fpsT = 0;
    // warm up shaders
    r.compile(scene, cam);
  }
  resize() { const w = innerWidth, h = innerHeight; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); if (this.composer) this.composer.setSize(w, h); }

  // ---------- run state ----------
  makePlayer() { const L = playerLook(), old = this.player; this._lookKey = JSON.stringify(L);
    const P = this.player = new Char(this.lib, L, 0.9); this.scene.add(P.root);
    if (old) { P.root.position.copy(old.root.position); P.root.rotation.y = old.root.rotation.y; this.scene.remove(old.root); }
    P.attach('DEF-spine.003', this.pack); this.pack.position.set(0, 0.12, -0.2); this.pack.rotation.set(0.1, 0, 0); if (P.skin) { this.pack.scale.setScalar(.6); this.pack.position.set(0, -0.03, -0.05); } else this.pack.scale.setScalar(1);
    P.attach('DEF-hand.R', this.hand); this.hand.rotation.set(Math.PI / 2, 0, 0); this.hand.position.set(0, 0.08, 0.02);
    this.pack.visible = !!(P.wantsPack || (this.save && this.save.items.includes('backpack'))); return P; }
  start(step) { if (this._lookKey !== JSON.stringify(playerLook())) this.makePlayer(); step = step || 0; if (!(STORY[step] && STORY[step].survival)) this.save.step = step; this.loadStep(step); this.paused = false; if (!this.running) { this.running = true; this.last = performance.now(); requestAnimationFrame((t) => this.frame(t)); } }
  // v1.9.1 leak fix: actors removed on retry/step change free their GPU geometry/materials/textures (world + pooled fx are kept)
  keepSet() { const K = this._keep = new WeakSet(); const add = (m) => { if (!m) return; K.add(m); for (const k in m) { const v = m[k]; if (v && v.isTexture) K.add(v); } const u = m.userData && m.userData.u; if (u) for (const k in u) { const v = u[k] && u[k].value; if (v && v.isTexture) K.add(v); } };
    this.scene.traverse(o => { if (o.geometry) K.add(o.geometry); (Array.isArray(o.material) ? o.material : [o.material]).forEach(add); }); this.lib.gltf.scene.traverse(o => { if (o.geometry) K.add(o.geometry); }); }
  disposeTree(root) { if (!root || !this._keep) return; const K = this._keep; root.traverse(o => { if (o.geometry && !K.has(o.geometry)) o.geometry.dispose(); const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      ms.forEach(m => { if (K.has(m)) return; for (const k in m) { const v = m[k]; if (v && v.isTexture && !K.has(v)) v.dispose(); } const u = m.userData && m.userData.u; if (u) for (const k in u) { const v = u[k] && u[k].value; if (v && v.isTexture && !K.has(v)) v.dispose(); } m.dispose(); }); }); }
  prewarm() { // create every lazily-built fx up front: a light added mid-fight recompiles every shader (the 0.5–0.8 s grenade/first-shot freezes)
    if (!this._boomL) { this._boomL = new THREE.PointLight('#ff9040', 0, 60, 2); this.scene.add(this._boomL); this._ballGeo = new THREE.SphereGeometry(1, 12, 8); }
    while (this.booms.length < 4) { const b = { ball: new THREE.Mesh(this._ballGeo, new THREE.MeshBasicMaterial({ color: '#ffb050', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })) }; b.ball.visible = false; this.scene.add(b.ball); this.booms.push(b); }
    if (!this.flames) { this.flameAt(V3(0, -50, 0), 1); this.flames.forEach(f => { f.life = 0; f.s.visible = false; }); }
    if (!this._grenG) { this._grenG = new THREE.CylinderGeometry(.05, .05, .2, 8); this._grenM = new THREE.MeshStandardMaterial({ color: '#444' }); const gm = new THREE.Mesh(this._grenG, this._grenM); gm.visible = false; gm.name = 'grenWarm'; this.scene.add(gm); }
    { const gm = new THREE.Mesh(this._gibGeo || (this._gibGeo = new THREE.BoxGeometry(.09, .075, .09)), new THREE.MeshStandardMaterial({ color: '#5a1010', roughness: .4 })); gm.visible = false; this.scene.add(gm); }
    if (this.player && this.player.mat) { const LG = this._limbG || (this._limbG = [new THREE.CapsuleGeometry(.05, .35, 3, 6), new THREE.CapsuleGeometry(.07, .45, 3, 6)]); const lm = new THREE.Mesh(LG[0], this.player.mat); lm.visible = false; this.scene.add(lm); } // severed limbs = body shader without skinning
    const R = this.renderer, hid = []; this.scene.traverse(o => { if (!o.visible) { hid.push(o); o.visible = true; } }); const L = this.mLight, li = L ? L.intensity : 0;
    try { R.compile(this.scene, this.camera); R.render(this.scene, this.camera); } catch (e) { } hid.forEach(o => o.visible = false); if (L) L.intensity = li; }
  clearActors() { this.zombies.forEach(z => { this.scene.remove(z.root); z.mixer.stopAllAction(); z.mixer.uncacheRoot(z.model); this.disposeTree(z.root); }); this.zombies = []; for (const k in this.npcs) { const n = this.npcs[k]; this.scene.remove(n.root); n.mixer.stopAllAction(); n.mixer.uncacheRoot(n.model); this.disposeTree(n.root); } this.npcs = {};
    this.pickups.forEach(p => this.scene.remove(p.mesh)); this.pickups = []; this.props.forEach(p => { this.scene.remove(p); this.disposeTree(p); }); this.props = []; this.decalN = 0; this.decals.forEach(d => d.visible = false);
    if (this.truck) this.truck.driving = false; document.body.classList.remove('driving'); $('#drive')?.classList.add('hidden'); this.drv = {}; this.boss = null; $('#boss').classList.add('hidden'); this.dlgQ = []; this.dlgCur = null; $('#dlg').classList.remove('on'); }
  loadStep(i) {
    if (!this._keep) this.keepSet(); this.clearActors(); const st = STORY[i]; if (this.step !== i) this._bossRetry = false; this.step = i; this.stuckT = 0; this.stepTok = (this.stepTok || 0) + 1; this.stepData = {}; const P = this.player; this.dead = false; this.dying = null; this.cut = null;
    this.maxHp = 100 + (perk(this.save, 2) ? 20 : 0) + (perk(this.save, 9) ? 20 : 0) + (this.settings.qteEasy ? 50 : 0); this.hp = this.maxHp;
    this.state = { roll: 0, atk: 0, atkHit: 0, combo: 0, comboT: 0, vy: 0, y: 0, crouch: false, run: false, aim: false, reload: 0, fireCd: 0, stun: 0 };
    P.root.visible = true; P.model.visible = true; for (const k in P.bones) P.bones[k].scale.set(1, 1, 1);
    const cp = st.cp; P.root.position.set(cp[0], 0, cp[1]); P.root.rotation.y = cp[2] || 0; this.cam.yaw = (cp[2] || 0) + Math.PI; this.cam.pitch = -0.1;
    this.pack.visible = this.save.items.includes('backpack') || !!this.player.wantsPack; this.equip(this.save.cur || 'fists', true);
    this.survival = !!st.survival; const ch = chOf(i); const zs = this.world.zones || {}; for (const k in zs) if (zs[k] && zs[k].isObject3D) zs[k].visible = +k === ch; if (ch > (this.save.ch || 1) && !st.survival) this.save.ch = ch;
    if (!st.survival) LOOT.forEach(l => { const lc = chOf(l.minStep || 0); if (!this.save.loot.includes(l.id) && (l.minStep || 0) <= i + 1 && (lc === ch || (ch <= 2 && lc <= 2))) this.addPickup(l); });
    this.world.frontDoor.rotation.y = i >= 3 ? -1.6 : 0; this.setDoor(i >= 3);
    this.setTruck(i);
    st.enter(this); this.objective(st.obj, st.hint); this.audio.setMood(st.mood || 'night'); this.audio.rain && this.audio.rain(st.rain !== false && st.mood !== 'day'); this.audio.beat(st.beat || 0);
    partnerEnter(this); this.checkpoint(); this.grace = 1.5; if (!this._warm) { this._warm = 1; this.prewarm(); } else try { this.renderer.compile(this.scene, this.camera); } catch (e) { }
    this.last = performance.now(); }
  // v1.6.3 failsafes: unstick player/targets, respawn a missing boss, offer an objective skip after 3 min stuck
  inCol(x, z, r = .3) { return this.world.colliders.some(c => !c.skip && x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r); }
  freeNear(x, z) { if (!this.inCol(x, z)) return [x, z]; for (let d = 1; d < 30; d += 1) for (let a = 0; a < 16; a++) { const nx = x + Math.cos(a / 16 * 6.283) * d, nz = z + Math.sin(a / 16 * 6.283) * d; if (!this.inCol(nx, nz)) return [nx, nz]; } return [x, z]; }
  failsafe(dt) { if (this.cut || this.dlgCur) return; this.stuckT = (this.stuckT || 0) + dt; this.fsT = (this.fsT || 0) + dt; if (this.fsT < 2) return; this.fsT = 0; this.alive().forEach(z => { const q = z.root.position; if (this.inCol(q.x, q.z, 0)) { const f = this.freeNear(q.x, q.z); q.x = f[0]; q.z = f[1]; } });
    const P = this.player.root.position; if (!this.truck.driving && this.inCol(P.x, P.z, 0)) { const [x, z] = this.freeNear(P.x, P.z); P.x = x; P.z = z; }
    const w = this.wpTarget; if (w && this.inCol(w[0], w[2], 0)) { const [x, z] = this.freeNear(w[0], w[2]); this.wpTarget = [x, w[1], z]; }
    const st = STORY[this.step]; if (/^(Kill|Defeat)/.test(st.obj || '') && !this.boss && !this.stepData.won && this.stuckT > 6 && !this._bossRetry) { this._bossRetry = true; this.loadStep(this.step); return; }
    const sk = document.getElementById('skipObj'); if (sk) sk.classList.toggle('hidden', !(this.stuckT > 180)); }
  skipObjective() { const D = this.stepData, P = this.player.root.position; this.stuckT = 120; this.toast && this.toast('Objective skipped');
    const sp = this.pickups.find(p => p.l.story); if (sp) { P.x = sp.mesh.position.x; P.z = sp.mesh.position.z; this.takePickup(sp); return; }
    if (D.uses && D.uses.length) { const u = D.uses[0]; P.x = u.x; P.z = u.z + .5; u.fn(this); return; }
    if (D.trig && D.tankerHP > 0 && !D.tankerBoom) { D.tankerBoom = true; return; }
    const T = this.truck; if (D.canDrive && T && !T.driving && !D.drove) { D.drove = true; this.enterTruck(); return; }
    if (T && T.driving && this.wpTarget) { T.g.position.x = this.wpTarget[0]; T.g.position.z = this.wpTarget[2]; return; }
    if (this.boss && !this.boss.dead) { this.damageZ(this.boss, 1e7, P.clone().normalize(), {}); return; }
    const A = this.alive(); if (A.length) { A.forEach(z => this.damageZ(z, 1e7, z.root.position.clone().normalize(), {})); return; }
    if (this.wpTarget) { P.x = this.wpTarget[0]; P.z = this.wpTarget[2]; return; }
    if (this.step < STORY.length - 1 && !STORY[this.step].survival && !STORY[this.step + 1].survival) this.loadStep(this.step + 1); }
  restartCheckpoint() { this.stepTok = (this.stepTok || 0) + 1; this.paused = false; this.last = performance.now(); try { this.loadStep(this.step); } catch (e) { console.error(e); this.clearActors(); this.cut = null; this.dying = null; this.dead = false; const cp = STORY[this.step].cp; this.player.root.position.set(cp[0], 0, cp[1]); } }
  checkpoint() { if (!this.survival) { this.save.step = this.step; this.save.played = true; } writeSave(this.LS, this.save); }
  setDoor(open) { const w = this.world; w.doorCol.x0 = open ? 999 : 11.9; w.doorCol.x1 = open ? 999 : 12.1; w.doorBoards.forEach(b => b.visible = !open); w.frontDoor.rotation.y = open ? -1.6 : 0; }
  setTruck(i) { if (!this.truck) { const g = this.world.car(22, -64, 0, '#7a2218', { truck: true, lights: true }); this.truck = { g, v: 0, head: 0, driving: false }; this.truck.col = g.userData.col; prepCarDoors(g); }
    const T = this.truck; this.carSeq = null; { const D = T.g.userData.doors; if (D) for (const k in D) setDoor(D[k], 0); } T.g.position.set(22, 0, -64); T.head = 0; T.v = 0; T.g.rotation.y = 0; T.driving = false; this.updateTruckCol(); if (i >= 7) { T.g.position.set(1.5, 0, -95); T.g.rotation.y = 0.5; this.updateTruckCol(); } }
  updateTruckCol() { const T = this.truck, p = T.g.position, c = T.col; c.x0 = p.x - 1.4; c.x1 = p.x + 1.4; c.z0 = p.z - 1.6; c.z1 = p.z + 1.6; c.skip = T.driving; }

  // ---------- inventory / weapons ----------
  equip(id, silent) { if (!this.save.owned.includes(id)) id = 'fists'; this.save.cur = id; const w = WEAPONS[id];
    this.hand.clear(); const m = this.weaponMeshes[id]; this.hand.add(m); this.vm.clear(); const vmm = m.clone(); this.vm.add(vmm); this.vmMesh = vmm;
    if (w.type === 'gun' && this.save.mags[id] == null) this.save.mags[id] = stat(this.save, id).mag;
    this.ws = stat(this.save, id); if (!silent) { this.toast(w.name); this.audio.click(); } this.state && (this.state.reload = 0); }
  swap(dir = 1) { const o = WEAPON_ORDER.filter(k => this.save.owned.includes(k)); const i = o.indexOf(this.save.cur); this.equip(o[(i + dir + o.length) % o.length]); this.audio.play('cloth', { vol: .35, flat: true }); this.audio.play('reload_in', { vol: .4, delay: .18, rate: 1.2, flat: true }); }
  give(id) { if (!this.save.owned.includes(id)) this.save.owned.push(id); this.equip(id); }
  addXP(n, why) { const s = this.save; s.xp += n; let up = false; while (s.xp >= xpFor(s.level)) { s.xp -= xpFor(s.level); s.level++; up = true; }
    if (up) { const pk = PERKS[s.level]; this.toast(`LEVEL ${s.level}!` + (pk ? ` Perk: ${pk.name} — ${pk.desc}` : ''), 3); this.audio.pickup(); if (perk(s, 2) || perk(s, 9)) { this.maxHp = 100 + (perk(s, 2) ? 20 : 0) + (perk(s, 9) ? 20 : 0) + (this.settings.qteEasy ? 50 : 0); } this.hp = this.maxHp; } }
  addCash(n) { n = Math.round(n * (perk(this.save, 4) ? 1.3 : 1)); this.save.cash += n; this.floatText('+$' + n, '#9be37a'); }

  // ---------- pickups ----------
  addPickup(l) { const g = new THREE.Group(); let m;
    const glow = new THREE.MeshBasicMaterial({ color: l.kind === 'page' ? '#e8e0a0' : l.kind === 'hp' ? '#ff5050' : l.drop ? '#ffd040' : '#7fd49a', transparent: true, opacity: .35, depthWrite: false });
    if (['cash', 'ammo', 'hp', 'med', 'grenade'].includes(l.kind) && (m = buildPickup(l.kind, l.drop))) { /* v2.0 realistic pickup models */ }
    else if (l.kind === 'cash') m = new THREE.Mesh(new THREE.BoxGeometry(.25, .06, .14), new THREE.MeshStandardMaterial({ color: '#5a8a4a', emissive: '#203a10' }));
    else if (l.kind === 'ammo' && l.drop) m = (this._amM || (this._amM = new THREE.Mesh(new THREE.BoxGeometry(.3, .18, .2), new THREE.MeshStandardMaterial({ color: '#c9a227', emissive: '#3a2a00', metalness: .4 })))).clone();
    else if (l.kind === 'ammo') m = new THREE.Mesh(new THREE.BoxGeometry(.3, .18, .2), new THREE.MeshStandardMaterial({ color: '#4a5a2a', metalness: .4 }));
    else if (l.kind === 'hp') m = this._hpM || (this._hpM = new THREE.Mesh(new THREE.BoxGeometry(.28, .2, .2), new THREE.MeshStandardMaterial({ color: '#e33', emissive: '#600' }))), m = m.clone();
    else if (l.kind === 'med') m = new THREE.Mesh(new THREE.BoxGeometry(.3, .2, .2), new THREE.MeshStandardMaterial({ color: '#ddd', emissive: '#400' }));
    else if (l.kind === 'grenade') m = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .2, 8), new THREE.MeshStandardMaterial({ color: '#555', metalness: .6 }));
    else if (l.kind === 'page') m = new THREE.Mesh(new THREE.PlaneGeometry(.25, .33), new THREE.MeshStandardMaterial({ color: '#efe6c8', emissive: '#554a20', side: THREE.DoubleSide }));
    else if (l.kind === 'weapon') m = weaponMesh(l.item).clone();
    else if (l.kind === 'backpack') m = backpack();
    else m = new THREE.Mesh(new THREE.BoxGeometry(.3, .15, .25), new THREE.MeshStandardMaterial({ color: '#555' }));
    g.add(m); const ring = new THREE.Mesh(new THREE.RingGeometry(.25, .34, 24), glow); ring.rotation.x = -Math.PI / 2; ring.position.y = -l.pos[1] + 0.04; g.add(ring);
    g.position.set(l.pos[0], l.pos[1], l.pos[2]); this.scene.add(g); this.pickups.push({ l, mesh: g, m }); }
  // v1.9.6: kill drops — ~16% ammo for the equipped gun, ~10% health; walk over to collect, gone after 20s, max 8 on the ground
  dropLoot(z) { const r = Math.random(); if (r > .26) return; const n = this.pickups.filter(p => p.l.drop); if (n.length >= 8) this.killPickup(n[0]); const q = z.root.position; const pos = [q.x + rnd(-.4, .4), .3, q.z + rnd(-.4, .4)];
    if (r < .16) { const w = WEAPONS[this.save.cur]; const a = w.type === 'gun' && w.ammo ? w.ammo : 'light'; this.addPickup({ kind: 'ammo', item: a, n: a === 'shell' ? 6 : a === 'rifle' ? 20 : 12, pos, drop: 20 }); }
    else this.addPickup({ kind: 'hp', n: 25, pos, drop: 20 }); }
  killPickup(p) { this.scene.remove(p.mesh); const i = this.pickups.indexOf(p); if (i >= 0) this.pickups.splice(i, 1); }
  takePickup(p) { const l = p.l, s = this.save; this.scene.remove(p.mesh); this.pickups.splice(this.pickups.indexOf(p), 1); if (l.id && !l.story) s.loot.push(l.id); this.audio.pickup();
    if (l.kind === 'cash') this.addCash(l.n); else if (l.kind === 'ammo') { s.ammo[l.item] = (s.ammo[l.item] || 0) + l.n; this.floatText(`+${l.n} ${l.item} ammo`, '#d8e8a0'); if (l.drop) this.toast(`+${l.n} ${l.item} ammo`, 1); }
    else if (l.kind === 'hp') { this.hp = Math.min(this.maxHp, this.hp + l.n); this.toast(`+${l.n} health`, 1); } else if (l.kind === 'med') { s.meds++; this.floatText('+1 Med kit', '#fff'); } else if (l.kind === 'grenade') { s.grenades += l.n || 1; this.floatText('+Pipe grenade', '#fff'); }
    else if (l.kind === 'page') { s.pages.push(l.id); this.toast(`Comic page found (${s.pages.length}/20): "${l.text}"`, 3); this.addXP(25); }
    else if (l.kind === 'weapon') { this.give(l.item); if (l.ammo) s.ammo[WEAPONS[l.item].ammo] = (s.ammo[WEAPONS[l.item].ammo] || 0) + l.ammo; }
    else if (l.kind === 'backpack') { s.items.push('backpack'); this.pack.visible = true; this.toast('Backpack on. More room for loot.'); }
    else if (l.kind === 'item') { s.items.push(l.item); this.toast(l.label || l.item); }
    l.onTake && l.onTake(this); writeSave(this.LS, s); }

  // ---------- NPCs & zombies ----------
  npc(key, look, x, z, rot = 0, anim = 'Idle_Loop', scale = 0.98) { const c = new Char(this.lib, LOOKS[look] || (look && look.hair ? look : (LOOKS[key] || randomLook((Math.random() * 1e6) | 0))), scale); c.key = key; c.lookKey = typeof look === 'string' ? look : ''; c.root.position.set(x, 0, z); if (c.wantsPack) { const bp = backpack(); c.attach('DEF-spine.003', bp); bp.position.set(0, 0.12, -0.2); bp.rotation.x = .1; } if (look === 'marcus') { if (!c.skin) { c.attach('DEF-hand.R', wrap(false)).scale.setScalar(.9); if ((this.step | 0) >= 12) c.attach('DEF-forearm.L', wrap(true)); } /* avatar Dad already has the wrist bandage in his texture */ if ((this.step | 0) < 12) { const wk = c.attach('DEF-hips', walkie()); wk.position.set(.17, .02, .02); } }
    if (look === 'nia') { const rb = makeRabbit(); if (c.skin) { c.attach('DEF-spine.003', rb); rb.position.set(0.1, 0.1, -0.02); } else { c.attach('DEF-spine.001', rb); rb.position.set(0, 0.06, 0.15); } c.biscuit = rb; const u0 = c.update; c.update = (dt) => { u0 && u0.call(c, dt); const t = (c.bt = (c.bt || 0) + dt); rb.head.rotation.y = Math.sin(t * .7) * .5; rb.head.rotation.x = Math.sin(t * 1.3) * .12; rb.position.y = 0.06 + Math.max(0, Math.sin(t * .9)) * .015; rb.ears.forEach((e, i) => e.rotation.x = -.2 + Math.sin(t * 9 + i) * Math.max(0, Math.sin(t * .5)) * .2); }; } c.root.rotation.y = rot; c.play(anim); this.scene.add(c.root); this.npcs[key] = c; c.key = key; return c; }
  victim(x, z, look, eaters = 3) { const v = this.npc('v' + Math.random(), look, x, z, rnd(0, 6), 'Death01'); v.play('Death01', { once: true }); v.mixer.update(5); v.mat.userData.u.uBlood.value = this.settings.gore ? 1 : 0.2; v.bleed = true;
    v.pool = this.decal(x, z, 0.9); this.decal(x + .6, z - .4, 0.8); v.struggle = 1; v.jolt = 0; v.screamT = rnd(.5, 2); v.isVictim = true;
    for (let i = 0; i < eaters; i++) { const a = i / eaters * 6.28 + rnd(-.3, .3); const zz = this.spawnZ(x + Math.cos(a) * 0.95, z + Math.sin(a) * 0.95, { eat: v }); zz.eatOff = i; zz.root.rotation.y = Math.atan2(x - zz.root.position.x, z - zz.root.position.z); }
    return v; }
  spawnZ(x, z, o = {}) { const zl = Object.assign((o.raider ? raiderLook : randomLook)((ZSEED++ * 7919 + (Math.random() * 1e5 | 0)) | 0, !o.raider), o.raider ? { grime: .6, blood: .1 } : { grime: 1, blood: this.settings.gore ? rnd(.5, 1) : 0.15 }); if (Math.random() < .3) zl.hair = 'balding'; if (o.boss) { zl.hair = 'bald'; zl.beard = 'full'; zl.build = 1.3; }
    const sc = (o.scale || rnd(.9, 1.1)); const c = new Char(this.lib, zl, sc); c.id = Math.random() * 10; c.root.position.set(x, 0, z); c.root.rotation.y = rnd(0, 6); this.scene.add(c.root);
    const runner = o.runner ?? Math.random() < (this.stepData.runners || 0.15);
    Object.assign(c, { z: true, hp: o.hp || (runner ? 50 : 70), maxHp: o.hp || (runner ? 50 : 70), runner, speed: runner ? rnd(3.6, 4.4) : rnd(1.1, 1.6), st: o.eat ? 'eat' : (o.idle ? 'idle' : 'chase'), eat: o.eat, cd: rnd(0, 1), stun: 0, dead: false, boss: !!o.boss, aggro: o.aggro ?? 30, vel: V3() });
    if (o.eat) c.play('Fixing_Kneeling', { speed: 1.4 }); else c.play(runner ? 'Jog_Fwd_Loop' : 'Walk_Loop', { speed: runner ? 1.1 : 0.62 });
    if (c.act('Walk_Loop')) c.act('Walk_Loop').time = rnd(0, 1);
    if (o.raider) { c.raider = true; c.hp = c.maxHp = o.hp || 90; c.speed = 2.6; c.cd = rnd(1, 2.5); const h = new THREE.Group(); h.add(weaponMesh(o.gun || 'rifle')); h.rotation.set(Math.PI / 2, 0, 0); h.position.set(0, .08, .02); c.attach('DEF-hand.R', h); c.gunM = h; c.gunId = o.gun || 'rifle'; c.play('Pistol_Aim_Neutral'); if (c.mat && c.mat.userData.u && c.mat.userData.u.uShirt) if (o.shirt && c.mat.userData.u.uJacket) { c.mat.userData.u.uJacket.value.set(o.shirt); c.mat.userData.u.uShirt.value.set(o.shirt); } }
    this.zombies.push(c); return c; }
  horde(n, pts, o = {}) { for (let i = 0; i < n; i++) { const p = pts[i % pts.length]; this.spawnZ(p[0] + rnd(-3, 3), p[1] + rnd(-3, 3), o); } }
  alive() { return this.zombies.filter(z => !z.dead); }

  // ---------- UI helpers ----------
  objective(t, h) { if (h && (matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window)) h = touchHint(h); $('#objt').textContent = t || ''; $('#objh').textContent = this.settings.hints ? (h || '') : ''; $('#obj').style.display = t ? '' : 'none'; }
  // v1.9.4 raider AI: pick a firing spot (prefer cover), walk there (anim matches motion), then HOLD and shoot from the gun with flash + tracer
  rTarget(z, zp) { const pp = this.truck.driving ? this.truck.g.position : this.player.root.position; let t = null, td = Math.hypot(pp.x - zp.x, pp.z - zp.z);
    for (const o of this.zombies) { if (o.dead || o.raider || o === z || o.st === 'eat' || o.st === 'idle') continue; const d = Math.hypot(o.root.position.x - zp.x, o.root.position.z - zp.z); if (d < 12 && d < td * .8) { td = d; t = o; } }
    return { z: t, p: t ? t.root.position : pp, d: td }; }
  rSpot(z, zp, tp) { let best = null, bs = -1e9; for (let k = 0; k < 10; k++) { const a = Math.random() * 6.283, r = rnd(2, 7); const x = zp.x + Math.cos(a) * r, q = zp.z + Math.sin(a) * r; if (this.inCol(x, q, .45)) continue;
      const dd = Math.hypot(tp.x - x, tp.z - q); let sc = -Math.abs(dd - 10) - r * .2; if (this.inCol(x, q, 1.3)) sc += 3; if (dd < 5) sc -= 8; if (sc > bs) { bs = sc; best = [x, q]; } } return best || [zp.x, zp.z]; }
  rFx() { if (this._rfx) return this._rfx; const fl = new THREE.Mesh(new THREE.SphereGeometry(.12, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false }));
    const trs = []; for (let i = 0; i < 6; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(.035, .035, 1), new THREE.MeshBasicMaterial({ color: '#ffe0a0', transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false })); t.visible = false; this.scene.add(t); trs.push({ m: t, t: 0 }); }
    const fls = []; for (let i = 0; i < 6; i++) { const m = fl.clone(); m.visible = false; this.scene.add(m); fls.push({ m, t: 0 }); } return (this._rfx = { trs, fls, i: 0 }); }
  rShotFx(from, to) { const F = this.rFx(); if (!F.trs[0].m.parent) { this._rfx = null; return this.rShotFx(from, to); } const k = F.i = (F.i + 1) % 6; const tr = F.trs[k], fl = F.fls[k]; const L = from.distanceTo(to);
    tr.m.position.copy(from).lerp(to, .5); tr.m.scale.set(1, 1, Math.max(.1, L)); tr.m.lookAt(to); tr.m.visible = true; tr.t = .09; fl.m.position.copy(from); fl.m.scale.setScalar(rnd(.9, 1.5)); fl.m.visible = true; fl.t = .06; }
  rFxTick(dt) { const F = this._rfx; if (!F) return; for (const a of F.trs) if (a.t > 0 && (a.t -= dt) <= 0) a.m.visible = false; for (const a of F.fls) if (a.t > 0 && (a.t -= dt) <= 0) a.m.visible = false; }
  raiderAI(z, d, toP, dt, zp) { if (d > Math.max(z.aggro, 28) && !this.stepData.hordeAll) { z.play('Idle_Loop'); return; }
    const T = (z.tgT = (z.tgT || 0) - dt) <= 0 ? (z.tgT = .5, z.tg = this.rTarget(z, zp)) : (z.tg || (z.tg = this.rTarget(z, zp))); const tp = T.z && !T.z.dead ? T.z.root.position : (T.z ? (z.tgT = 0, this.player.root.position) : T.p); const dx = tp.x - zp.x, dz = tp.z - zp.z, td = Math.hypot(dx, dz) || .01;
    z.rs = z.rs || 'hold'; z.rt = (z.rt ?? rnd(.5, 1.5)) - dt;
    if (z.rs === 'move') { const ex = z.goal[0] - zp.x, ez = z.goal[1] - zp.z, ed = Math.hypot(ex, ez); const sp = z.speed * (td < 6 ? 1.15 : 1);
      if (ed < .35 || z.rt <= 0) { z.rs = 'hold'; z.rt = rnd(3, 6); z.aimT = rnd(.5, .8); }
      else { const st = Math.min(ed, sp * dt); const hw = this.moveCollide(zp, ex / ed * st, ez / ed * st, .3); if (hw) z.rt = Math.min(z.rt, .2); z.root.rotation.y = angLerp(z.root.rotation.y, Math.atan2(ex, ez), Math.min(1, dt * 8)); z.play('Jog_Fwd_Loop', { speed: sp / 3.4 }); } }
    if (z.rs === 'hold') { z.root.rotation.y = angLerp(z.root.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 6)); z.play('Pistol_Aim_Neutral');
      if (z.rt <= 0 || (td > 26 && !T.z) || (td < 4 && z.rt < 2)) { z.goal = this.rSpot(z, zp, tp); z.rs = 'move'; z.rt = 4; return; }
      z.aimT = (z.aimT ?? .7) - dt; z.cd -= dt; const face = Math.abs(Math.atan2(Math.sin(Math.atan2(dx, dz) - z.root.rotation.y), Math.cos(Math.atan2(dx, dz) - z.root.rotation.y))) < .35;
      if (z.aimT <= 0 && z.cd <= 0 && face && td < 30 && !this.cut && !this.dlgCur) { const burst = z.gunId === 'smg' ? 3 : 1; z.cd = (z.gunId === 'smg' ? .12 : z.gunId === 'shotgun' ? 1.5 : 1.0) * rnd(.9, 1.3); z.burst = ((z.burst || 0) + 1) % burst; if (z.burst === 0) z.cd += rnd(.8, 1.6);
        const mz = V3(); const mm = z.gunM && z.gunM.getObjectByName('muzzle'); if (mm) mm.getWorldPosition(mz); else { z.worldOf('DEF-hand.R', mz); }
        if (this.audio.at) this.audio.at(zp); this.audio.shot(z.gunId === 'pistol' ? 'pistol' : z.gunId === 'shotgun' ? 'shotgun' : 'rifle'); this.rShots = (this.rShots || 0) + 1;
        const aim = V3(tp.x, (T.z ? 1.2 : 1.25) * (T.z ? T.z.scale : 1), tp.z); let hit;
        if (T.z) { hit = Math.random() < (td < 8 ? .75 : .5); if (hit) this.damageZ(T.z, z.gunId === 'shotgun' ? 35 : 20, V3(dx / td, 0, dz / td), { ai: true }); }
        else { const P = this.player, mv = this.state.run ? .6 : 1; hit = !this.truck.driving && this.state.roll <= 0 && Math.random() < (td < 8 ? .42 : td < 16 ? .28 : .14) * mv * (this.state.crouch ? .55 : 1); if (hit) this.hurt(this.settings.qteEasy ? 4 : 7, zp); }
        if (!hit) aim.add(V3(rnd(-.9, .9), rnd(-.5, .6), rnd(-.9, .9))); this.rShotFx(mz, aim); } } }
  openGate(o) { const c = this.world.ch2; if (!c) return; c.gateCol.skip = o; c.gateMesh.position.x = o ? 5.8 : 0; }
  ch2Reset(g, i) { this.openGate(i >= 11); if ((this.save.ch || 1) < 2) this.save.ch = 2; }
  fadeStep(i) { const f = $('#fade'), st = STORY[i] || {}; let lab = document.getElementById('fadeT'); if (!lab) { lab = document.createElement('div'); lab.id = 'fadeT'; lab.style.cssText = 'position:fixed;left:0;right:0;top:44%;text-align:center;color:#fff;font:800 20px system-ui;letter-spacing:.5px;z-index:21;pointer-events:none;opacity:0;transition:opacity .4s;text-shadow:0 2px 4px #000;padding:0 20px'; document.body.appendChild(lab); }
    lab.textContent = st.obj || ''; f.style.transition = 'opacity .45s'; f.style.opacity = '1'; lab.style.opacity = st.obj ? '1' : '0'; this.fading = true; const tok = this.stepTok;
    setTimeout(() => { if (this.stepTok === tok) this.loadStep(i); setTimeout(() => { f.style.opacity = '0'; lab.style.opacity = '0'; this.fading = false; }, 900); }, 520); }
  toast(t, s = 1.8) { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(this._tt); this._tt = setTimeout(() => e.classList.remove('on'), s * 1000); }
  floatText(t, c = '#fff') { const e = document.createElement('div'); e.textContent = t; e.style.cssText = `position:absolute;left:50%;top:58%;transform:translateX(-50%);color:${c};font:800 15px system-ui;text-shadow:0 1px 3px #000;z-index:6;pointer-events:none;transition:all 1.2s ease-out`; $('#stage').appendChild(e); requestAnimationFrame(() => { e.style.top = '50%'; e.style.opacity = '0'; }); setTimeout(() => e.remove(), 1300); }
  say(lines, cb) { this.dlgQ = (this.dlgQ || []).concat(lines.map(l => ({ who: l[0], text: l[1] }))); if (cb) this.dlgQ.push({ cb }); if (!this.dlgCur) this.nextLine(); }
  nextLine() { const d = $('#dlg'); const it = this.dlgQ.shift(); if (!it) { this.dlgCur = null; this.grace = Math.max(this.grace || 0, 1.5); this.last = performance.now(); d.classList.remove('on'); this.audio.stopVoice && this.audio.stopVoice(); return; } if (it.cb) { it.cb(this); this.nextLine(); return; }
    if (it.raw == null) { it.raw = it.text; const L = langLine(it.raw, this.settings.lang || 'on'); it.text = L.sub; it.vtext = L.voice; it.bleeps = L.bleeps; }
    this.dlgCur = it; const names = { vance: 'Dr. Vance', keem: 'Keem', marcus: 'Dad', nia: 'Nia', walt: 'Mr. Walt', ruth: 'Ruth', dube: 'Mr. Dube', radio: 'Radio', note: 'Dad\'s note', gus: 'Big Gus', sgt: 'Sgt. Okafor (radio)', brick: 'Coach Brickman', ronnie: 'Big Rig Ronnie', deacon: 'Deacon', captain: 'The Captain (radio)', reyes: 'Dr. Reyes', tuck: 'Tuck', santa: 'Mall Santa', king: 'The Toll King' };
    $('#who').textContent = names[it.who] || it.who; const cur = it; const muteKeem = it.who === 'keem' && this.step === 0 && ['wake', 'walk', 'peek', undefined].includes(this.stepData && this.stepData.phase); !muteKeem && this.audio.voice && this.audio.voice(it.who, it.vtext, it.bleeps).then(dd => { if (dd && this.dlgCur === cur) cur.dur = Math.max(cur.dur || 0, dd + .5); });
    
    $('#line').textContent = it.text; d.classList.add('on'); it.t = 0; it.dur = (1.6 + it.text.length * 0.045) / (this.settings.text || 1); }
  skipLine() { if (this.dlgCur) this.nextLine(); }

  // ---------- FX ----------
  initFX() { const s = this.scene; const N = 900;
    this.pGeo = new THREE.SphereGeometry(1, 5, 4); this.pMat = new THREE.MeshStandardMaterial({ color: '#5a0505', roughness: .25, metalness: 0 });
    this.parts = new THREE.InstancedMesh(this.pGeo, this.pMat, N); this.parts.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.parts.frustumCulled = false; s.add(this.parts);
    this.pd = []; for (let i = 0; i < N; i++) this.pd.push({ p: V3(0, -99, 0), v: V3(), life: 0, s: 0 }); this.pI = 0;
    const bt = bloodTex(); this.decals = []; this.decalN = 0; const dm = new THREE.MeshStandardMaterial({ map: bt, transparent: true, depthWrite: false, roughness: .15, polygonOffset: true, polygonOffsetFactor: -2 });
    for (let i = 0; i < 70; i++) { const d = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), dm); d.rotation.x = -Math.PI / 2; d.visible = false; d.renderOrder = 1; s.add(d); this.decals.push(d); }
    const fm = new THREE.SpriteMaterial({ color: '#ffd27a', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, map: (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, '#fff'); gr.addColorStop(.3, 'rgba(255,200,90,.9)'); gr.addColorStop(1, 'rgba(255,120,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })() });
    this.muzzle = new THREE.Sprite(fm); this.muzzle.scale.setScalar(.5); this.muzzle.visible = false; s.add(this.muzzle); this.mLight = new THREE.PointLight('#ffc070', 0, 12, 2); s.add(this.mLight); this._boomL = new THREE.PointLight('#ff9040', 0, 60, 2); s.add(this._boomL); this._ballGeo = new THREE.SphereGeometry(1, 12, 8);
    this.tracer = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(), V3()]), new THREE.LineBasicMaterial({ color: '#ffe0a0', transparent: true, opacity: .8 })); this.tracer.frustumCulled = false; this.tracer.visible = false; s.add(this.tracer);
    this.booms = []; this.gibs = []; this.grenadesLive = [];
    this.fireSprite = fm; }
  blood(pos, dir, n = 14, speed = 3, size = 1) { const gore = this.settings.gore; if (!gore) n = Math.ceil(n / 3); else { n = Math.ceil(n * 1.6); speed *= 1.25; }
    for (let i = 0; i < n; i++) { const d = this.pd[this.pI = (this.pI + 1) % this.pd.length]; d.p.copy(pos); d.v.set(dir.x * speed + rnd(-1.5, 1.5), rnd(0.5, 3) + dir.y * speed, dir.z * speed + rnd(-1.5, 1.5)); d.life = rnd(.6, 1.4); d.s = rnd(.018, .05) * size * (gore ? 1 : .6); d.dec = gore && Math.random() < .12; }
    this._pAny = true; this.pMat.color.set(gore ? '#5a0505' : '#3a3a34'); }
  decal(x, z, s = 1) { if (!this.settings.gore) return; const d = this.decals[this.decalN++ % this.decals.length]; d.visible = true; d.position.set(x, 0.035 + (this.decalN % 10) * 0.0008, z); d.scale.setScalar(s * rnd(.8, 1.3)); d.rotation.z = rnd(0, 6); return d; }
  screenSplat() { if (!this.settings.gore) return; let e = $('#splat'); if (!e) { e = document.createElement('div'); e.id = 'splat'; e.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:3;transition:opacity 1.6s;opacity:0'; $('#stage').appendChild(e); }
    const b = []; for (let i = 0; i < 7; i++) { const x = rnd(0, 100), y = rnd(0, 100), r = rnd(4, 14); b.push(`radial-gradient(circle at ${x}% ${y}%, rgba(110,0,0,.85) 0, rgba(80,0,0,.7) ${r * .6}%, transparent ${r}%)`); }
    e.style.transition = 'none'; e.style.background = b.join(','); e.style.opacity = '1'; requestAnimationFrame(() => { e.style.transition = 'opacity 2.2s'; e.style.opacity = '0'; }); }
  gib(pos, n = 5, col = '#5a1010', limb, vel) { const G = this._gibG || (this._gibG = { geo: new THREE.BoxGeometry(.09, .075, .09), mats: {} }); const cap = this.Q && this.Q.shadows === false ? 28 : (this.settings.qual === 'low' ? 28 : 64);
    const mat = G.mats[col] || (G.mats[col] = new THREE.MeshStandardMaterial({ color: col, roughness: .4 }));
    for (let i = 0; i < n; i++) { let m; if (limb && i === 0) m = limb; else { m = new THREE.Mesh(G.geo, mat); m.scale.set(rnd(.55, 1.35), rnd(.6, 1.3), rnd(.55, 1.35)); m.pooled = 1; }
      while (this.gibs.length >= cap) { const o = this.gibs.shift(); this.scene.remove(o.m); }
      m.position.copy(pos); m.castShadow = false; this.scene.add(m); this.gibs.push({ m, v: vel && i === 0 ? vel.clone() : V3(rnd(-3, 3), rnd(2, 6), rnd(-3, 3)), r: V3(rnd(-9, 9), rnd(-9, 9), rnd(-9, 9)), life: limb && i === 0 ? 14 : 8, big: limb && i === 0 }); } }
  // realistic blade gore (katana / longsword): decapitation with a real flying head, or a waist cleave that drops the upper body
  bladeGore(z, dir, kind) { const gore = this.settings.gore; if (!gore) return; const ap = V3(); const s = z.scale || 1;
    if (kind === 'decap') { z.noHead = true; z.worldOf('DEF-head', ap); const head = new THREE.Mesh(this._headGeo || (this._headGeo = new THREE.SphereGeometry(.13, 10, 8)), z.mat); head.scale.set(s * .95, s * 1.1, s); this.gib(ap, 1, '#5a1010', head, V3(dir.x * 3 + rnd(-1, 1), rnd(4, 6), dir.z * 3 + rnd(-1, 1)));
      this.gib(ap, 5); this.spurt(z, 'DEF-neck', 1.6); this.blood(ap, V3(0, 1, 0), 60, 5.5, 1.4); }
    else { z.noLimbs = z.noLimbs || []; ['DEF-spine.002'].forEach(n => z.noLimbs.push(n)); z.noHead = true; z.worldOf('DEF-spine.002', ap); const torso = new THREE.Mesh(this._torsoGeo || (this._torsoGeo = new THREE.CapsuleGeometry(.17, .42, 3, 8)), z.mat); torso.scale.setScalar(s);
      this.gib(ap, 1, '#5a1010', torso, V3(dir.x * 2.5, rnd(2.5, 4), dir.z * 2.5)); const hp = ap.clone(); hp.y += .5 * s; const head = new THREE.Mesh(this._headGeo || (this._headGeo = new THREE.SphereGeometry(.13, 10, 8)), z.mat); head.scale.setScalar(s); this.gib(hp, 1, '#5a1010', head, V3(dir.x * 3.5, 5, dir.z * 3.5));
      this.gib(ap, 8); this.gib(ap, 3, '#a8506a'); this.spurt(z, 'DEF-spine.001', 1.2); this.blood(ap, dir.clone().setY(.5), 70, 5, 1.5); }
    this.decal(ap.x + dir.x, ap.z + dir.z, 2.6); this.decal(ap.x, ap.z, 1.8); this.audio.splat(); setTimeout(() => this.audio.splat(), 90); this.screenSplat(); }
  shake(a) { if (!this.settings.still) this.trauma = Math.min(1, this.trauma + a); else this.trauma = Math.min(.3, this.trauma + a * .3); }
  flashScreen(cls) { const f = $('#flash'); f.className = ''; void f.offsetWidth; f.className = cls; }
  slowmo(t = 0.7) { this.slowT = t; this.timeScale = 0.22; }
  explode(pos, R = 9, dmg = 400) { this.audio.explode(); this.shake(1); this.flashScreen('white');
    // v1.8 perf: pooled fireball meshes + one persistent boom light (adding lights at runtime forced a full shader recompile = 200ms+ hitch on phones)
    if (!this._boomL) { this._boomL = new THREE.PointLight('#ff9040', 0, 60, 2); this.scene.add(this._boomL); this._ballGeo = new THREE.SphereGeometry(1, 12, 8); }
    let b = this.booms.find(b => !b.on); if (!b) { if (this.booms.length >= 4) b = this.booms[0]; else { b = { ball: new THREE.Mesh(this._ballGeo, new THREE.MeshBasicMaterial({ color: '#ffb050', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })) }; this.scene.add(b.ball); this.booms.push(b); } }
    b.on = true; b.t = 0; b.R = R; b.ball.visible = true; b.ball.position.copy(pos); this._boomL.position.copy(pos).y += 2; this._boomL.intensity = 120; this._boomT = 1;
    this.flameAt(pos, 10);
    this.alive().forEach(z => { const d = z.root.position.distanceTo(pos); if (d < R) { const dir = z.root.position.clone().sub(pos).setY(0).normalize(); this.damageZ(z, dmg * (1 - d / R / 1.5), dir, { boom: true }); } });
    const pd = this.player.root.position.distanceTo(pos); if (pd < R * 0.6 && !this.truck.driving) this.hurt(40 * (1 - pd / R), pos); }

  // ---------- combat ----------
  hurt(n, from) { if (this.dying || this.state.roll > 0 || this.god || this.grace > 0 || this.dlgCur && this.cut) return; this.hp -= n; this.audio.hurt(); this.flashScreen('hit'); this.shake(0.35); this.lastHurt = this.t;
    if (this.settings.gore && Math.random() < .5) this.screenSplat(); const p = this.player.root.position.clone(); p.y = 1.2; this.blood(p, V3(0, .3, 0), 8, 2);
    if (this.hp <= 0) { this.hp = 0; this.die(from); } else if (n > 15) { this.player.play('Hit_Chest', { once: true, cb: () => { this.player.curName = ''; } }); this.state.stun = 0.35; } }
  die(from) { const P = this.player; this.dying = { t: 0, t0: performance.now() }; this.dlgQ = []; this.dlgCur = null; $('#dlg').classList.remove('on'); this.audio.beat(0); this.audio.scream(0.15); P.play('Death01', { once: true });
    let k = null, kd = 99; this.alive().forEach(z => { const d = z.root.position.distanceTo(P.root.position); if (d < kd) { kd = d; k = z; } }); this.dying.z = k;
    if (k && kd < 6) { const dir = P.root.position.clone().sub(k.root.position).normalize(); k.root.position.copy(P.root.position).addScaledVector(dir, -0.8); k.st = 'feast'; k.play('Fixing_Kneeling', { speed: 2 }); k.root.rotation.y = Math.atan2(dir.x, dir.z); }
    $('#lowhp').style.opacity = 1; }
  damageZ(z, dmg, dir, o = {}) { if (z.dead) return; if (z.armor) { const m = z.armor(o); if (m < 1 && Math.random() < .3) this.floatText && this.floatText('ARMOR', '#c8ccd8'); dmg *= m; } z.hp -= dmg; if (!o.ai) z.playerHit = true; z.st = 'chase'; z.aggro = 99; const hp = z.root.position.clone(); hp.y = o.head ? 1.6 * z.scale : 1.1 * z.scale;
    this.blood(hp, dir, o.head ? 18 : 10, o.boom ? 6 : 2.5); if (!o.boom && Math.random() < .4) this.decal(z.root.position.x + dir.x * .8, z.root.position.z + dir.z * .8, .7);
    z.mat.userData.u.uBlood.value = Math.min(1.3, z.mat.userData.u.uBlood.value + (this.settings.gore ? .15 : 0)); this.audio.at(hp).splat(); if (this.settings.gore && Math.random() < .5) this.audio.at(hp).squelch(.6);
    if (z.hp <= 0) { this.killZ(z, dir, o); return; }
    if (!z.boss || dmg > 60) { z.stun = z.boss ? 0.25 : 0.45; z.play(o.head ? 'Hit_Head' : 'Hit_Chest', { once: true, force: true, cb: () => { z.curName = ''; } }); z.vel.addScaledVector(dir, z.boss ? 1 : 3); } }
  // pooled additive flame sprites (flamethrower, burning zombies, launcher blasts): 24 sprites total, no allocations per frame
  flameAt(p, n = 1, v) { if (!this.flames) { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(255,240,180,1)'); gr.addColorStop(.4, 'rgba(255,140,30,.8)'); gr.addColorStop(1, 'rgba(120,20,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
      const m = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }); this.flames = []; this.flameI = 0; for (let i = 0; i < 24; i++) { const s = new THREE.Sprite(m); s.visible = false; this.scene.add(s); this.flames.push({ s, v: V3(), life: 0 }); } }
    for (let i = 0; i < n; i++) { const f = this.flames[this.flameI = (this.flameI + 1) % 24]; f.s.position.copy(p); f.s.visible = true; f.life = rnd(.25, .5); f.v.copy(v || V3()).add(V3(rnd(-.8, .8), rnd(.6, 1.8), rnd(-.8, .8))); f.s.scale.setScalar(rnd(.3, .6)); } }
  spurt(z, bone, dur) { (this.spurts = this.spurts || []).push({ z, bone, t: dur }); if (this.spurts.length > 4) this.spurts.shift(); }
  killZ(z, dir, o = {}) { if (!dir || !dir.clone) dir = V3(0, 0, 1); if (Math.random() < (z.boss ? 1 : .15)) this.audio.shout && this.audio.shout('keem_kill'); z.dead = true; z.deadT = 0; z.st = 'dead'; const mine = !o.ai || z.playerHit; if (mine) this.save.kills++; const gore = this.settings.gore;
    const xp = z.boss ? 400 : (o.head ? 18 : 12); if (mine) this.addXP(xp); if (z.boss) this.addCash(500);
    else if (mine && Math.random() < .35) this.addCash(rnd(5, 18)); if (mine && !z.boss) this.dropLoot(z);
    if (o.boom || z.boss) z.play('Death01', { once: true, force: true, speed: o.boom ? 1.6 : 1, fade: .12 }); else { z.play(o.head ? 'Hit_Head' : 'Hit_Chest', { once: true, force: true, speed: 1.7, fade: .08, cb: () => { if (z.dead) z.play('Death01', { once: true, force: true, speed: 1.05, fade: .28 }); } }); } z.vel.addScaledVector(dir, o.boom ? 9 : 2.5); if (o.boom) z.vel.y = 6;
    const pos = z.root.position.clone(); pos.y = 1.55 * z.scale; this.decal(z.root.position.x + dir.x, z.root.position.z + dir.z, 1.4);
    const fin = o.finisher || (this.state.combo >= 3 && Math.random() < .6) || z.boss;
    if (gore) { this.decal(z.root.position.x + dir.x * .5, z.root.position.z + dir.z * .5, 2.2); this.blood(pos.clone().setY(1.1 * z.scale), dir.clone().setY(.6), 22, 4.5, 1.2); }
    if (gore && o.blade && !z.boss) { this.bladeGore(z, dir, Math.random() < .5 ? 'decap' : 'cleave'); o = Object.assign({}, o, { head: false, sever: Math.random() < .4 }); fin && this.slowmo(.5); }
    else if (gore && (o.head || fin || (o.boom && Math.random() < .6) || (o.pellets && Math.random() < .5))) { z.noHead = true; this.blood(pos, V3(0, 1, 0), 70, 5, 1.5); this.blood(pos, dir.clone().setY(.4), 30, 6, 1.1); this.gib(pos, 12); this.gib(pos, 4, '#d8cfc0'); this.audio.splat(); setTimeout(() => this.audio.splat(), 120); }
    z.noLimbs = z.noLimbs || [];
    if (gore && (o.sever || o.boom || fin || (o.pellets && Math.random() < .5)) && Math.random() < .9) { const pool = ['DEF-forearm.L', 'DEF-forearm.R', 'DEF-upper_arm.L', 'DEF-upper_arm.R'];
      if (o.boom || fin) pool.push('DEF-shin.L', 'DEF-shin.R', 'DEF-thigh.L', 'DEF-thigh.R'); const nCut = o.boom ? 3 : fin ? 2 : 1 + (Math.random() < .35 ? 1 : 0);
      for (let c = 0; c < nCut && pool.length; c++) { const bn = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]; if (z.noLimbs.includes(bn)) continue; z.noLimbs.push(bn); const leg = bn.includes('thigh') || bn.includes('shin');
        const LG = this._limbG || (this._limbG = [new THREE.CapsuleGeometry(.05, .35, 3, 6), new THREE.CapsuleGeometry(.07, .45, 3, 6)]); const limb = new THREE.Mesh(LG[leg ? 1 : 0], z.mat); const ap = V3(); z.worldOf(bn, ap); this.gib(ap, 4, '#5a1010', limb); this.blood(ap, dir.clone().add(V3(rnd(-.5, .5), .5, rnd(-.5, .5))), 28, 4.5, 1.2); this.decal(ap.x, ap.z, 1); } }
    if (o.finisher || (this.state.combo >= 3 && Math.random() < .6) || z.boss || z === this.boss) { const bz = z.boss || z === this.boss; this.slowmo(bz ? 1.3 : 0.6); this.shake(.5); this.toast(bz ? ($('#bossn').textContent.split(' —')[0] + ' IS DOWN') : (o.head ? 'HEADSHOT' : 'FINISHER'), 1); if (perk(this.save, 10)) this.hp = Math.min(this.maxHp, this.hp + 10); }
    this.audio.at(pos).thud(); if (gore) this.audio.at(pos).squelch(.9); }
  // v1.9.11: melee reach = how far the weapon visibly gets from Keem's body (root-to-root), not the old generous `range` (1.6-2.7m). Measured: hand extends ~0.6m, weapon adds ~0.5m, zombie body radius ~0.3m.
  meleeReach(id) { const r = WEAPONS[id || this.save.cur].range; return Math.max(1.2, r * .74); }
  meleeHit() { const P = this.player, ws = this.ws, fwd = V3(Math.sin(P.root.rotation.y), 0, Math.cos(P.root.rotation.y)); let hit = 0; const reach = this.meleeReach();
    this.alive().forEach(z => { const d = z.root.position.clone().sub(P.root.position); const dy = Math.abs(d.y); d.y = 0; const dist = d.length(); if (dist > reach + (z.boss ? .5 : 0) + Math.max(0, (z.scale || 1) - 1) * .5 || dy > 1.3) return; if (dist > .01) d.normalize(); if (dist > .45 && d.dot(fwd) < .5) return;
      const heavy = WEAPONS[this.save.cur].type === 'melee' && this.save.cur !== 'fists'; const fin = this.state.combo >= 2 && heavy && z.hp <= ws.dmg * 1.6;
      this.damageZ(z, ws.dmg * (fin ? 1.6 : 1) * (1 + this.state.combo * .1), d, { sever: WEAPONS[this.save.cur].sever, blade: WEAPONS[this.save.cur].blade, finisher: fin, head: fin && WEAPONS[this.save.cur].sever }); hit++; });
    if (hit) { this.audio.hit(); if (Math.random() < .3) this.audio.shout('keem_melee'); if (WEAPONS[this.save.cur].bonk) { this.audio.bonk(); this.floatText('BONK!', '#ffd35a'); } this.hitstop = 0.07; this.shake(.18); this.state.combo++; this.state.comboT = 2; } else this.audio.swing();
    // tanker can be smashed too? no — only shot
  }
  // v1.9.3: camera ray through the crosshair. Spread is an angle (not NDC, which was stretched 2x sideways on landscape phones); single-bullet guns: dead-on when aiming, small cone hip-fire; pellets keep their cone
  aimRay(pellets = 1) { const r = new THREE.Raycaster(); const ws = this.ws; const sp = pellets > 1 ? (this.state.aim ? ws.spread * .45 : ws.spread * (this.cam.fp ? .8 : 1.4)) * 4 : (this.state.aim ? 0 : ws.spread * .35 * 4);
    const xr = $('#xhair').getBoundingClientRect(), cr = this.renderer.domElement.getBoundingClientRect(); const cy = (xr.width && cr.height) ? 1 - 2 * ((xr.top + xr.height / 2 - cr.top) / cr.height) : 0.08, cx = (xr.width && cr.width) ? 2 * ((xr.left + xr.width / 2 - cr.left) / cr.width) - 1 : 0;
    r.setFromCamera(new THREE.Vector2(cx, cy), this.camera); if (sp > 0) { const th = Math.random() * 6.283, m = Math.sqrt(Math.random()) * sp * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
      const up = V3(0, 1, 0).applyQuaternion(this.camera.quaternion), rt = V3(1, 0, 0).applyQuaternion(this.camera.quaternion); r.ray.direction.addScaledVector(rt, Math.cos(th) * m).addScaledVector(up, Math.sin(th) * m).normalize(); }
    // skip geometry between the camera and Keem (over-the-shoulder cam near walls)
    const near = Math.max(0, this.player.root.position.clone().setY(r.ray.origin.y).sub(r.ray.origin).dot(r.ray.direction) - .4); r.ray.near = near; return r.ray; }
  fire() { const s = this.state, id = this.save.cur, w = WEAPONS[id], ws = this.ws; if (s.reload > 0 || s.fireCd > 0) return;
    if ((this.save.mags[id] || 0) <= 0) { this.audio.click(); if ((this.save.ammo[w.ammo] || 0) <= 0) this.audio.shout && this.audio.shout('keem_empty'); s.fireCd = .25; if ((this.save.ammo[w.ammo] || 0) > 0) this.reload(); else this.toast('Out of ammo — loot or buy more'); return; }
    this.save.mags[id]--; s.fireCd = w.rate; this.audio.shot(id); this.shake(id === 'shotgun' || id === 'sniper' ? .28 : .1); this.cam.pitch += (id === 'sniper' ? .05 : .015) * (s.aim ? .5 : 1); this.cam.yaw += rnd(-.006, .006); s.shotT = .5;
    const mz = V3(); const muzzle = (this.cam.fp ? this.vmMesh : this.weaponMeshes[id]).getObjectByName('muzzle'); if (muzzle) muzzle.getWorldPosition(mz); else this.player.worldOf('DEF-hand.R', mz);
    this.muzzle.position.copy(mz); this.muzzle.visible = true; this.muzzle.material.rotation = rnd(0, 6); this.mLight.position.copy(mz); this.mLight.color.set('#ffc070'); this.mLight.intensity = 30; this.mT = 0.05;
    if (!this.cam.fp && this.player.curName.startsWith('Pistol') || this.player.curName === 'Idle_Loop') this.player.play('Pistol_Shoot', { once: true, force: true, speed: 2, cb: () => { this.player.curName = ''; } });
    if (w.gl) { const ray = this.aimRay(); const nr = ray.near || 0; const rc = new THREE.Raycaster(ray.at(nr, V3()), ray.direction, 0, ws.range); const wh = rc.intersectObjects(this.world.walls, false)[0]; let bd = (wh ? wh.distance : ws.range) + nr;
      this.alive().forEach(z => { const a = z.root.position.clone().setY(.2), b = z.root.position.clone().setY(1.8 * z.scale), pr = V3(); const d2 = ray.distanceSqToSegment(a, b, pr); const t = pr.sub(ray.origin).dot(ray.direction); const rr = .6 * z.scale; if (t > 0 && t < bd && d2 < rr * rr) bd = t; }); this.explode(ray.at(Math.max(nr + 1.5, bd), V3()), 5.5, 220 * (ws.dmg / w.dmg)); return; }
    if (w.flame) { const ray = this.aimRay(); for (let i = 0; i < 2; i++) this.flameAt(mz, 1, ray.direction.clone().multiplyScalar(rnd(9, 13))); this.mLight.color && this.mLight.color.set('#ff8030');
      const nr = ray.near || 0; this.alive().forEach(z => { const a = z.root.position.clone().setY(.2), b = z.root.position.clone().setY(1.8 * z.scale), pr = V3(); const d2 = ray.distanceSqToSegment(a, b, pr); const t = pr.clone().sub(ray.origin).dot(ray.direction) - nr; const rr = .4 + Math.max(0, t) * .12 + .25 * (z.scale - 1); if (t > -1.5 && t < ws.range && d2 < rr * rr) { z.burn = 3.5; this.damageZ(z, ws.dmg * 1.6, ray.direction.clone().setY(0).normalize(), { flame: true }); } }); return; }
    const pellets = w.pellets || 1; let end = null;
    for (let k = 0; k < pellets; k++) { const ray = this.aimRay(pellets); const nr = ray.near || 0; let best = null, bd = ws.range + nr;
      // world walls: cast from Keem's depth (ignore cam-side walls); zombies are tested from the camera so close/tall ones beside Keem still get hit (v1.9.4)
      const rc = new THREE.Raycaster(ray.at(nr, V3()), ray.direction, 0, ws.range); const wh = rc.intersectObjects(this.world.walls, false)[0]; if (wh) bd = wh.distance + nr;
      const hp = V3(), tmp = V3(); this.alive().forEach(z => { z.worldOf('DEF-head', hp); hp.y += .08 * z.scale; const hr = (z.boss ? Math.max(.28, .17 * z.scale * z.root.scale.x) : .17); // v1.9.6: boss head hitbox scales with the boss (Subject One's head was ~6.5m up with a 0.28m box)
        const t = tmp.copy(hp).sub(ray.origin).dot(ray.direction); if (t > 0 && t < bd) { const c = ray.at(t, V3()); if (c.distanceTo(hp) < hr && !z.noHead) { bd = t; best = { z, head: true }; return; } }
        const a = z.root.position.clone(); a.y = .15; const b = z.root.position.clone(); b.y = Math.max(1.35 * z.scale, hp.y - hr - .02); const pr = V3(), ps = V3(); const d2 = ray.distanceSqToSegment(a, b, pr, ps); const dd = pr.distanceTo(ray.origin);
        if (d2 < (z.boss ? .5 : .13 * z.scale * z.scale) && dd < bd) { bd = dd; best = { z, head: false }; } });
      // tanker
      if (this.stepData.tankerHP > 0) { const tp = this.world.tanker.position; const c = new THREE.Box3(V3(tp.x - 1.3, 0, tp.z - 3.6), V3(tp.x + 1.3, 3.2, tp.z + 5.8)); const ip = ray.intersectBox(c, V3()); if (ip && ip.distanceTo(ray.origin) < bd) { bd = ip.distanceTo(ray.origin); best = { tanker: true }; } }
      end = ray.at(bd, V3());
      if (best && best.z) { const dmg = ws.dmg * (best.head ? (2.5 * (perk(this.save, 8) ? 1.5 : 1)) * (best.z.boss ? .6 : 1) : 1); this.damageZ(best.z, dmg, ray.direction.clone().setY(0).normalize(), { head: best.head, pellets: pellets > 1 }); this.hitMark(best.head); }
      else if (best && best.tanker) { this.stepData.tankerHP -= ws.dmg * pellets / pellets; this.blood(end, V3(0, 1, 0), 3, 1); if (this.stepData.tankerHP <= 0) this.stepData.tankerBoom = true; }
      else if (end) { this.pMat.color.set('#3a3a34'); } }
    const tp = this.tracer.geometry.attributes.position; tp.setXYZ(0, mz.x, mz.y, mz.z); tp.setXYZ(1, end.x, end.y, end.z); tp.needsUpdate = true; this.tracer.visible = true; this.trT = 0.04; }
  hitMark(head) { const x = $('#xhair'); x.style.color = head ? '#f44' : '#fc8'; clearTimeout(this._hm); this._hm = setTimeout(() => x.style.color = '#fff', 120); }
  reload() { const id = this.save.cur, w = WEAPONS[id]; if (w.type !== 'gun' || this.state.reload > 0) return; const need = this.ws.mag - (this.save.mags[id] || 0); if (need <= 0 || !(this.save.ammo[w.ammo] > 0)) return;
    this.state.reload = this.ws.reload; this.audio.reload ? this.audio.reload() : this.audio.click(); if (!this.cam.fp) this.player.play('Pistol_Reload', { once: true, force: true, speed: 1.4 / this.ws.reload, cb: () => { this.player.curName = ''; } }); }
  finishReload() { const id = this.save.cur, w = WEAPONS[id]; const need = this.ws.mag - (this.save.mags[id] || 0); const n = Math.min(need, this.save.ammo[w.ammo] || 0); this.save.mags[id] += n; this.save.ammo[w.ammo] -= n; this.audio.click(); }
  attack() { const w = WEAPONS[this.save.cur]; if (this.truck.driving || this.cut || this.dying) return; if (w.type === 'gun') return this.fire(); const s = this.state; if (s.atk > 0 || s.roll > 0) return;
    const P = this.player; // soft lock
    let best = null, bd = this.meleeReach() + .9; this.alive().forEach(z => { const d = z.root.position.distanceTo(P.root.position); if (d < bd) { bd = d; best = z; } }); if (best) P.root.rotation.y = Math.atan2(best.root.position.x - P.root.position.x, best.root.position.z - P.root.position.z);
    const rate = this.ws.rate; s.atk = rate; const anim = this.save.cur === 'fists' ? (s.combo % 2 ? 'Punch_Cross' : 'Punch_Jab') : 'Sword_Attack';
    s.atkHit = rate * (this.save.cur === 'fists' ? .34 : .38); // v1.9.11: contact lands when the arm/weapon is at full extension (clip peaks ~30% in; was .45)
    P.play(anim, { once: true, force: true, speed: (this.lib.clips[anim].duration / rate) * .8, cb: () => { P.curName = ''; } }); this.audio.swing(); }
  roll() { const s = this.state; if (s.roll > 0 || this.truck.driving || this.cut) return; s.roll = 0.62; this.audio.rollS && this.audio.rollS(); this.player.play('Roll', { once: true, force: true, speed: 1.35, cb: () => { this.player.curName = ''; } });
    const mv = this.input.move; if (mv.lengthSq() > .04) this.player.root.rotation.y = Math.atan2(mv.x, mv.y) + this.cam.yaw; }
  jump() { const s = this.state; if (s.y > 0.01 || this.truck.driving || this.cut) return; s.vy = 4.8; this.audio.jumpS && this.audio.jumpS(); this.player.play('Jump_Start', { once: true, force: true, speed: 1.5, cb: () => this.player.play('Jump_Loop') }); }
  grenade() { if (this.save.grenades <= 0) { this.toast('No grenades'); return; } if (this.truck.driving || this.cut) return; this.save.grenades--; const P = this.player;
    const m = new THREE.Mesh(this._grenG || new THREE.CylinderGeometry(.05, .05, .2, 8), this._grenM || new THREE.MeshStandardMaterial({ color: '#444' })); const p = P.root.position.clone(); p.y = 1.6; m.position.copy(p); this.scene.add(m);
    const f = V3(); this.camera.getWorldDirection(f); this.grenadesLive.push({ m, v: f.multiplyScalar(13).add(V3(0, 4.5, 0)), t: 1.7 }); this.audio.swing(); }
  heal() { if (this.save.meds <= 0 || this.hp >= this.maxHp) return; this.save.meds--; this.hp = Math.min(this.maxHp, this.hp + 50); this.toast('+50 health'); this.audio.pickup(); }
  use() { if (this.carSeq) return; if (this.dlgCur && this.cut) { this.skipLine(); return; } const P = this.player.root.position;
    if (this.truck.driving) { return; }
    const near = this.nearUse(); if (near) { if (near.pickup) this.takePickup(near.pickup); else near.fn(this); return; }
    if (this.dlgCur) this.skipLine(); }
  nearUse() { const P = this.player.root.position; let best = null, bd = 1.7;
    this.pickups.forEach(p => { const d = Math.hypot(p.mesh.position.x - P.x, p.mesh.position.z - P.z); if (d < bd) { bd = d; best = { pickup: p, label: p.l.label || p.l.kind }; } });
    { const vu = ventUse(this, P); if (vu && !best) best = vu; }
    (this.stepData.uses || []).forEach(u => { if (u.done) return; const d = Math.hypot(u.x - P.x, u.z - P.z); if (d < (u.r || 1.7) && d < bd + .5) { bd = d; best = { fn: (g) => { if (!u.repeat) u.done = true; u.fn(g); }, label: u.label }; } });
    if (!this.truck.driving && !this.carSeq && this.stepData.canDrive) { const o = outPoint(this.truck.g, 1, this._op || (this._op = V3())); if (Math.hypot(o.x - P.x, o.z - P.z) < 2.3) best = { fn: (g) => g.board(), label: 'Open the truck door' }; }
    return best; }
  enterTruck() { this.truck.driving = true; this.truck.ch = null; document.body.classList.add('driving'); $('#drive')?.classList.remove('hidden'); this.player.root.visible = false; this.updateTruckCol(); this.audio.engine(true, 0); this.stepData.onDrive && this.stepData.onDrive(this); }
  board() { if (this.carSeq || this.truck.driving) return; this.stepData.boarding = true; boardTruck(this, () => { this.stepData.boarding = false; this.enterTruck(); }); }
  // visible exit: sits up, door opens, steps out, closes the door, (optionally walks to walkTo) and then runs cb. Story code uses this instead of teleporting the player.
  leave(cb, opts) { const T = this.truck; if (this.carSeq) return; T.driving = false; T.v = 0; document.body.classList.remove('driving'); $('#drive')?.classList.add('hidden'); this.drv = {}; this.audio.engine(false); this.audio.tires && this.audio.tires(false); leaveTruck(this, cb, opts); }
  exitTruck() { const T = this.truck; T.driving = false; document.body.classList.remove('driving'); $('#drive')?.classList.add('hidden'); this.drv = {}; this.audio.engine(false); this.audio.tires && this.audio.tires(false); const p = T.g.position; this.player.root.position.set(p.x + Math.cos(T.head) * 2, 0, p.z - Math.sin(T.head) * 2); this.player.root.visible = true; this.updateTruckCol(); }

  // ---------- frame ----------
  frame(now) { if (!this.running) return; requestAnimationFrame((t) => this.frame(t)); let rdt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    this.fpsAcc += rdt; this.fpsN++; if (this.fpsAcc > 3) { const fps = this.fpsN / this.fpsAcc; this.fps = fps; this.fpsAcc = 0; this.fpsN = 0;
      if (fps < 27 && this.pr > 0.55) { this.pr = Math.max(0.55, this.pr * 0.82); this.renderer.setPixelRatio(this.pr); this.resize(); } else if (fps > 55 && this.pr < this.basePR) { this.pr = Math.min(this.basePR, this.pr * 1.1); this.renderer.setPixelRatio(this.pr); this.resize(); } }
    this.input.poll(rdt);
    if (!this.paused) { if (this.hitstop > 0) { this.hitstop -= rdt; } else { if (this.slowT > 0) { this.slowT -= rdt; if (this.slowT <= 0) this.timeScale = 1; } this.update(rdt * this.timeScale, rdt); } }
    this.render(rdt); }
  update(dt, rdt) { Char.frame++; this.t += dt; if (this.grace > 0) this.grace -= rdt; const P = this.player, s = this.state, I = this.input, T = this.truck;
    // dialog
    if (this.dlgCur) { this.dlgCur.t += rdt; if (this.dlgCur.t > this.dlgCur.dur && (this.settings.auto !== false || !this.cut)) this.nextLine(); }
    if (this.dying) { this.updateDying(dt); if (this.boss && !this.boss.propped) { this.boss.propped = 1; bossProp(this, this.boss, document.querySelector('#bossn')?.textContent); }
    this.updateZ(dt); this.updateFX(dt); return; }
    // cutscene camera
    const st = STORY[this.step]; st.update && st.update(this, dt); partnerUpdate(this, dt); this.failsafe(dt);
    if (s.fireCd > 0) s.fireCd -= dt; if (s.reload > 0) { s.reload -= dt; if (s.reload <= 0) this.finishReload(); }
    if (s.comboT > 0) { s.comboT -= dt; if (s.comboT <= 0) s.combo = 0; }
    if (this.hp < this.maxHp && this.t - (this.lastHurt || 0) > 5) this.hp = Math.min(this.maxHp, this.hp + dt * 4);
    if (this.carSeq) updateCarSeq(this, dt); else if (T.driving) this.updateTruck(dt); else if (!this.cut) this.updatePlayer(dt);
    else { P.play(this.cut.anim || 'Idle_Loop'); }
    P.mixer.update(dt);
    if (!this.truck.driving) this.stepTrack(this.player, this.player.root.position, 'p'); this.chatter(dt);
    this.updateZ(dt); for (const k in this.npcs) { const n = this.npcs[k]; n.update && n.update(dt); n.mixer.update(dt); this.victimStruggle(n, dt); this.stepTrack(n, n.root.position, 'n'); if (n.bleed && Math.random() < dt * 3) { const p = n.root.position.clone(); p.y = .3; this.blood(p, V3(0, .6, 0), 3, 1.2); } }
    // pickups
    for (let i = this.pickups.length - 1; i >= 0; i--) { const p = this.pickups[i]; if (p.l.drop && (p.l.drop -= dt) <= 0) this.killPickup(p); }
    this.pickups.forEach(p => { p.m.rotation.y += dt * 1.6; p.m.position.y = Math.sin(this.t * 3) * .05; if (!p.l.story && !p.l.manual) { const d = Math.hypot(p.mesh.position.x - P.root.position.x, p.mesh.position.z - P.root.position.z); if (d < 1.0 && !T.driving) this.takePickup(p); } });
    this.updateFX(dt);
    if (this.stepData.tankerBoom && !this.stepData.tankerDone) { this.stepData.tankerDone = true; const tp = this.world.tanker.position.clone(); tp.y = 1.5; this.explode(tp, 12, 500); this.world.tanker.children.forEach(c => c.material && c.material.color && c.material.color.set('#151210')); this.world.tankCol.x0 = 999; this.world.tanker.rotation.z = 0.25; }
    this.world.update(dt, this.t, this.camera.position); }
  updatePlayer(dt) { const P = this.player, s = this.state, I = this.input, w = WEAPONS[this.save.cur], gun = w.type === 'gun';
    if (I.pressed('swap')) this.swap(1); if (I.pressed('reload')) this.reload(); if (I.pressed('gren')) this.grenade(); if (I.pressed('heal')) this.heal(); if (I.pressed('jump')) this.jump(); if (I.pressed('roll')) this.roll(); if (I.pressed('use')) this.use();
    if (I.pressed('crouch')) s.crouch = !s.crouch; if (I.pressed('view')) { this.cam.fp = !this.cam.fp; this.settings.fp = this.cam.fp; }
    s.aim = I.aim && gun; { const tap = I.pressed('atk'); if (tap || (I.atk && (!gun || w.auto)) || (gun && I.atk && tap)) this.attack(); }
    const mv = I.move; const mag = Math.min(1, mv.length()); const run = (I.run || mag > .95 && I.touchRun) && !s.crouch && !s.aim;
    let spd = s.crouch ? 1.6 : run ? 6.2 * (perk(this.save, 7) ? 1.15 : 1) : 3.1; if (s.aim) spd = 2.2; if (s.atk > 0) spd *= .3; if (s.stun > 0) { spd = 0; s.stun -= dt; }
    const yaw = this.cam.yaw; let dx = 0, dz = 0; if (s.shotT > 0) s.shotT -= dt; const faceAim = (gun && (s.aim || s.shotT > 0)) || this.cam.fp; // v1.9.2: face the crosshair only while aiming/firing (or first-person); otherwise turn toward travel
    if (mag > .08) { const a = Math.atan2(mv.x, mv.y) + yaw; dx = Math.sin(a) * spd * mag; dz = Math.cos(a) * spd * mag;
      if (!faceAim && s.atk <= 0 && s.roll <= 0) P.root.rotation.y = angLerp(P.root.rotation.y, a, Math.min(1, dt * (this.settings.smoothMove ? 16 : 12))); }
    if (faceAim) P.root.rotation.y = angLerp(P.root.rotation.y, yaw + Math.PI, Math.min(1, dt * 18));
    if (run && mag > .5 && !s.crouch) { s.brT = (s.brT || 0) - dt; s.runT = (s.runT || 0) + dt; if (s.brT <= 0 && s.runT > 2.5) { s.brT = rnd(1.1, 1.5); this.audio.breathe && this.audio.breathe(Math.min(.35, .1 + s.runT * .02)); } } else s.runT = Math.max(0, (s.runT || 0) - dt * 2);
    if (s.roll > 0) { s.roll -= dt; const f = 6.5; dx = Math.sin(P.root.rotation.y) * f; dz = Math.cos(P.root.rotation.y) * f; }
    if (s.atk > 0) { s.atk -= dt; if (s.atkHit > 0) { s.atkHit -= dt; if (s.atkHit <= 0) this.meleeHit(); } }
    // v2.0 smooth movement: ease toward the target velocity (same top speeds), roll/stun stay instant; animation speed follows real ground speed
    const MV = s.mv || (s.mv = { x: 0, z: 0 }); if (!this.settings.smoothMove || s.roll > 0 || s.stun > 0 || dt <= 0) { MV.x = dx; MV.z = dz; } else { const ex = dx - MV.x, ez = dz - MV.z, el = Math.hypot(ex, ez), acc = ((dx * dx + dz * dz) > (MV.x * MV.x + MV.z * MV.z) ? 34 : 46) * dt; if (el <= acc) { MV.x = dx; MV.z = dz; } else { MV.x += ex / el * acc; MV.z += ez / el * acc; } }
    const p = P.root.position; const px0 = p.x, pz0 = p.z; this.moveCollide(p, MV.x * dt, MV.z * dt, 0.35); if (dt > 0) s.spd = lerp(s.spd || 0, Math.hypot(p.x - px0, p.z - pz0) / dt, Math.min(1, dt * 14));
    // vertical
    if (s.y > 0 || s.vy > 0) { s.vy -= 14 * dt; s.y = Math.max(0, s.y + s.vy * dt); if (s.y === 0) { s.vy = 0; this.audio.land && this.audio.land(); P.play('Jump_Land', { once: true, force: true, speed: 1.6, cb: () => P.curName = '' }); } } p.y = s.y;
    // locomotion anims
    if (!P.oneShot) { if (s.y > 0) P.play('Jump_Loop'); else if ((s.spd || 0) > .2) { /* v2.1 measured-speed blend for BOTH control feels (movement itself is unchanged): feet match real ground speed, no popping between clips */ const sp = s.spd || 0; if (s.crouch) P.play('Crouch_Fwd_Loop', { speed: clamp(sp / .64, .4, 2.2) }); else { const fy = P.root.rotation.y, bk = faceAim && sp > .3 && (Math.sin(fy) * MV.x + Math.cos(fy) * MV.z) < -.5 * sp; if (!P.locomote(sp, bk ? -1 : 1, dt)) P.play(run ? 'Sprint_Loop' : sp > 2.6 ? 'Jog_Fwd_Loop' : 'Walk_Loop'); } }
      else if (s.crouch) P.play('Crouch_Idle_Loop'); else if (gun) P.play(s.aim ? 'Pistol_Aim_Neutral' : 'Pistol_Idle_Loop'); else P.play('Idle_Loop'); }
    P.model.visible = !this.cam.fp; }
  // v2.0 aim assist (opt-in: "Simple" control scheme or the Aim-assist slider; default off = unchanged gameplay).
  // Gently steers the camera toward the best target near the crosshair while firing/aiming; optional auto-fire when a visible enemy is under it.
  aimAssist(rdt) { const S = this.settings, I = this.input, s = this.state; const str = S.ctl === 'simple' ? Math.max(S.assist || 0, .8) : (S.assist || 0); this._tgt = null; I.autoAtk = false;
    if (!(str > 0) || this.paused || this.cut || this.dying || this.dlgCur || (this.truck && this.truck.driving)) return; const w = WEAPONS[this.save.cur]; if (!w || w.type !== 'gun') return;
    const C = this.cam, cp = this.camera.position, firing = I.atk || I.tapFire > 0 || s.aim; const auto = !!S.autoFire; if (!firing && !auto) return;
    // where the on-screen crosshair sits relative to the camera axis (the gun ray is cast through it), so the target lands exactly under it
    this._xhT = (this._xhT || 0) - rdt; if (this._xhT <= 0 || !this._xh) { this._xhT = .5; const xr = $('#xhair').getBoundingClientRect(), cr = this.renderer.domElement.getBoundingClientRect(); this._xh = { cy: (xr.width && cr.height) ? 1 - 2 * ((xr.top + xr.height / 2 - cr.top) / cr.height) : .08, cx: (xr.width && cr.width) ? 2 * ((xr.left + xr.width / 2 - cr.left) / cr.width) - 1 : 0 }; }
    const th = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2), yo = Math.atan(this._xh.cx * th * this.camera.aspect), po = Math.atan(this._xh.cy * th);
    const cone = (firing ? .22 : .12) + .4 * str, hp = V3(); let best = null, ba = cone;
    for (const z of this.alive()) { z.worldOf('DEF-head', hp); hp.y -= .2 * z.scale; const f = hp.clone().sub(cp), len = f.length(); if (len < 1.5 || len > Math.min(32, (this.ws && this.ws.range) || 30)) continue;
      const yd = Math.atan2(-f.x, -f.z) + yo, pd = Math.asin(f.y / len) - po; const ey = Math.abs(((yd - C.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI), ep = Math.abs(pd - C.pitch), a = Math.hypot(ey, ep * .8);
      if (a < ba) { ba = a; best = { z, yd, pd, a, len }; } }
    if (!best) return; this._tgt = best; const ul = Math.min(1, I.lastLook * 45);
    const rate = (firing ? 4 + 9 * str : 1.2 + 2 * str) * (1 - ul * .85); const dy = ((best.yd - C.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    C.yaw += dy * Math.min(1, rdt * rate); C.pitch = clamp(C.pitch + (best.pd - C.pitch) * Math.min(1, rdt * rate), -1.1, .9);
    if (auto && best.a < .075 + .02 * str) { // line-of-sight check ~8x/s, then hold the trigger
      this._losT = (this._losT || 0) - rdt; if (this._losT <= 0) { this._losT = .12; const o = cp.clone(), d = hp.clone().sub(o); const L = d.length(); const rc = new THREE.Raycaster(o, d.normalize(), 0, L); this._los = !rc.intersectObjects(this.world.walls, false)[0]; }
      if (this._los && this.state.reload <= 0 && (this.save.mags[this.save.cur] || 0) > 0) { I.autoAtk = true; I.edge.atk = true; } } }
  moveCollide(p, dx, dz, r) { const C = this.world.colliders; let nx = p.x + dx, nz = p.z + dz;
    const L = Math.hypot(dx, dz); if (L > r) { const n = Math.ceil(L / r); let hw = false; for (let k = 0; k < n; k++) hw = this.moveCollide(p, dx / n, dz / n, r) || hw; return hw; } // sub-step: no tunnelling through thin props
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < C.length; i++) { const c = C[i]; if (c.skip) continue; if (nx > c.x0 - r && nx < c.x1 + r && nz > c.z0 - r && nz < c.z1 + r) {
      const ox = Math.min(nx - (c.x0 - r), (c.x1 + r) - nx), oz = Math.min(nz - (c.z0 - r), (c.z1 + r) - nz);
      if (ox < oz) nx = nx - (c.x0 + c.x1) / 2 < 0 ? c.x0 - r : c.x1 + r; else nz = nz - (c.z0 + c.z1) / 2 < 0 ? c.z0 - r : c.z1 + r; } }
    const hitWall = Math.abs(nx - p.x - dx) + Math.abs(nz - p.z - dz) > 1e-4; p.x = nx; p.z = nz; return hitWall; }
  // v1.4 arcade handling: smoothed speed-sensitive steering, high grip, auto-straighten, gentle bumps
  updateTruck(dt) { const T = this.truck, I = this.input, D = this.drv || (this.drv = {}); let gas = D.gas ? 1 : 0, brk = D.brake ? 1 : 0, st = (D.r ? 1 : 0) - (D.l ? 1 : 0);
    if (!D.gas && !D.brake) { gas = Math.max(0, -I.move.y) + (I.atk ? 1 : 0); brk = Math.max(0, I.move.y); } if (!st) st = clamp(I.move.x, -1, 1);
    const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(x => x) : null; if (gp) { const rt = gp.buttons[7]?.value || 0, lt = gp.buttons[6]?.value || 0; if (rt > .05) gas = rt; if (lt > .05) brk = lt; if (Math.abs(gp.axes[0]) > .15) st = gp.axes[0]; }
    gas = clamp(gas, 0, 1); brk = clamp(brk, 0, 1); T.st = T.st || 0; T.st += (st - T.st) * Math.min(1, dt * (st ? 5 : 8));
    if (gas) T.v += gas * 9 * dt * (T.v < 0 ? 2 : 1); if (brk) T.v -= brk * (T.v > 0.2 ? 18 : 6) * dt; if (!gas && !brk) T.v *= (1 - dt * .7); if (Math.abs(T.v) < .05 && !gas && !brk) T.v = 0;
    T.v = clamp(T.v, -6, 17); const sp = Math.abs(T.v); T.head -= T.st * dt * 1.9 * Math.min(1, sp / 3) / (1 + sp / 12) * Math.sign(T.v || 1);
    T.g.rotation.y = T.head; const p = T.g.position; const fx = Math.sin(T.head) * T.v * dt, fz = Math.cos(T.head) * T.v * dt;
    if (this.moveCollide(p, fx, fz, 1.3)) { if (sp > 8) { this.shake(.2); this.audio.crash(); this.carAlarm(p); } T.v *= -0.15; }
    T.spin = (T.spin || 0) + T.v * dt / .38; ['wheel-front-left', 'wheel-front-right', 'wheel-back-left', 'wheel-back-right'].forEach(n => { const w = T.g.getObjectByName(n); if (w) { w.rotation.x = T.spin; if (n.includes('front')) w.rotation.y = -T.st * .45; } });
    this.audio.engine(true, sp / 17); this.audio.tires && this.audio.tires(true, Math.abs(T.st || 0) * sp / 30 + (brk && T.v > 3 ? sp / 30 : 0));
    this.alive().forEach(z => { const d = z.root.position.distanceTo(p); if (d < 2.1) { if (sp > 3.5) { const dir = z.root.position.clone().sub(p).setY(0).normalize(); this.damageZ(z, 200, dir, { boom: true }); this.shake(.2); this.hitstop = .03; this.audio.thud(); T.v *= .95; } else { z.st = 'chase'; } } });
    this.player.root.position.copy(p); this.updateTruckCol(); }
  updateZ(dt) { const P = this.player, pp = this.truck.driving ? this.truck.g.position : P.root.position; const Z = this.zombies;
    if (this.flames) for (const f of this.flames) if (f.life > 0) { f.life -= dt; f.s.position.addScaledVector(f.v, dt); f.s.scale.multiplyScalar(1 + dt * 2.5); if (f.life <= 0) f.s.visible = false; }
    for (const z of Z) if (z.burn > 0 && !z.dead) { z.burn -= dt; if (Math.random() < dt * 10) { const p = z.root.position.clone(); p.y = rnd(.4, 1.6) * z.scale; this.flameAt(p, 1); } if ((z.burnTick = (z.burnTick || 0) - dt) <= 0) { z.burnTick = .3; this.damageZ(z, z.boss ? 6 : 14, V3(0, 0, 1), { flame: true }); } if (z.mat.userData.u.uShirt && !z.boss) z.mat.userData.u.uShirt.value.lerp(new THREE.Color('#151010'), dt); }
    this.rFxTick(dt); for (let i = 0; i < Z.length; i++) { const z = Z[i]; const zp = z.root.position;
      if (z.dead) { z.deadT += dt; if (z.deadT < 2.5) { for (let j = 0; j < Z.length; j++) { const o = Z[j]; if (o === z || !o.dead) continue; const op = o.root.position, ex = zp.x - op.x, ez = zp.z - op.z, e2 = ex * ex + ez * ez; if (e2 < .64) { const e = Math.sqrt(e2) || .01, push = (.8 - e) * Math.min(1, dt * 4); this.moveCollide(zp, (e2 > 1e-4 ? ex / e : Math.cos(z.id)) * push, (e2 > 1e-4 ? ez / e : Math.sin(z.id)) * push, .3); } } }
        if (z.vel.lengthSq() > .01) { const y0 = zp.y; this.moveCollide(zp, z.vel.x * dt, z.vel.z * dt, .3); zp.y = y0 + z.vel.y * dt; z.vel.y -= 14 * dt; if (zp.y < 0) { zp.y = 0; z.vel.y = 0; } z.vel.x *= .9; z.vel.z *= .9; }
        z.mixer.update(dt); this.zBones(z); if (z.deadT > 25 && Z.length > 26) { this.scene.remove(z.root); Z.splice(i--, 1); } continue; }
      const toP = (z._tp || (z._tp = V3())).set(pp.x - zp.x, 0, pp.z - zp.z); let d = toP.length();
      if (z.st === 'feast') { z.mixer.update(dt); if (Math.random() < dt * 8 && this.settings.gore) { const b = P.root.position.clone(); b.y = .3; this.blood(b, V3(rnd(-1, 1), .5, rnd(-1, 1)), 4, 2); } continue; }
      if (z.st === 'eat') { const det = this.state.crouch ? 4 : 7.5; if ((d < det && !this.cut) || z.hp < z.maxHp) { z.st = 'chase'; z.lk = 0; this.audio.at(zp).groan(.14); if (Math.random() < .5) this.audio.zAttack && this.audio.zAttack(); }
        z.mixer.update(dt); this.feedPose(z, dt, d, toP); continue; }
      if (z.st === 'eat' || z.st === 'idle') { const det = this.state.crouch ? 4 : (z.st === 'eat' ? 7 : 12); if (d < det && !this.cut || z.hp < z.maxHp) { z.st = 'chase'; this.audio.at(zp).groan(.12); } z.mixer.update(dt); if (z.st === 'eat' && Math.random() < dt * .3) this.audio.at(zp).groan(.05); if (z.st === 'eat' && d < 16 && (z.eatT = (z.eatT ?? rnd(0, 2)) - dt) <= 0) { z.eatT = rnd(2.2, 3.4); this.audio.at(zp).eat(Math.max(.05, .55 * (1 - d / 16))); } continue; }
      if (z.raider && !z.boss) { this.raiderAI(z, d, toP, dt, zp); z.mixer.update(dt); this.zBones(z); continue; }
      if (z.boss) { this.updateBoss(z, d, toP, dt); z.mixer.update(dt); this.zBones(z); continue; }
      if (z.stun > 0) { z.stun -= dt; this.moveCollide(zp, z.vel.x * dt, z.vel.z * dt, .3); z.vel.multiplyScalar(.85); z.mixer.update(dt); this.zBones(z); continue; }
      // v1.9.4: zombies go for the nearest living human — Keem, raiders, or allies (allies are never killed)
      if ((z.tgT = (z.tgT || 0) - dt) <= 0) { z.tgT = rnd(.4, .7); z.tgt = null; if (!this.cut) { let bd = d * .95; for (const o of Z) { if (!o.raider || o.dead || o === z) continue; const q = o.root.position, e = Math.hypot(q.x - zp.x, q.z - zp.z); if (e < bd && e < 24) { bd = e; z.tgt = o; } }
          for (const k in this.npcs) { const n = this.npcs[k]; if (!n || n.isVictim || n.root.visible === false || !n.root.parent) continue; const q = n.root.position, e = Math.hypot(q.x - zp.x, q.z - zp.z); if (e < bd && e < 10) { bd = e; z.tgt = n; } } } }
      const tg = z.tgt && !z.tgt.dead && z.tgt.root.visible !== false ? z.tgt : null; if (tg) { toP.set(tg.root.position.x - zp.x, 0, tg.root.position.z - zp.z); d = toP.length(); }
      if (d > z.aggro && !this.stepData.hordeAll && !tg) { z.mixer.update(dt); this.zBones(z); continue; }
      if (z.cd > 0) z.cd -= dt;
      if (d < 1.05 && (tg || !this.truck.driving)) { if (z.cd <= 0) { z.cd = rnd(1.2, 1.8); z.play('Punch_Jab', { once: true, force: true, speed: .9, cb: () => { z.curName = ''; } }); z.hitAt = .35; } }
      else if (!z.oneShot) { toP.normalize(); let sx = toP.x * z.speed * dt, sz = toP.z * z.speed * dt;
        for (let j = 0; j < Z.length; j++) { if (j === i || Z[j].dead) continue; const o = Z[j].root.position; const ex = zp.x - o.x, ez = zp.z - o.z, e2 = ex * ex + ez * ez; if (e2 < .5 && e2 > 1e-4) { sx += ex / e2 * dt * .25; sz += ez / e2 * dt * .25; } }
        this.moveCollide(zp, sx, sz, .3); z.root.rotation.y = angLerp(z.root.rotation.y, Math.atan2(toP.x, toP.z), Math.min(1, dt * 6)); z.autoLoco(dt, 'Idle_Loop'); }
      if (z.hitAt > 0) { z.hitAt -= dt; if (z.hitAt <= 0 && d < 1.45) { if (tg && tg.raider) this.damageZ(tg, 14, toP.clone().normalize(), { ai: true }); else if (tg) { tg.root.position.addScaledVector(toP.clone().normalize(), .25); if (/nia/.test(tg.key || '') && Math.random() < .3 && this.audio.shout) this.audio.shout('nia_spot', false, tg.root.position); } else if (!this.truck.driving) this.hurt(this.settings.qteEasy ? 6 : 11, zp); } }
      if (Math.random() < dt * .08) this.audio.at(zp).groan(.06);
      z.mixer.update(dt); this.zBones(z); this.stepTrack(z, zp, 'z'); } }
  // v1.4 feeding: kneel (Fixing_Kneeling) + procedural head-dip / tear / shake, bite-synced spurts, growing pool, look-up toward Keem
  feedPose(z, dt, d, toP) { const v = z.eat, gore = this.settings.gore, B = (n) => z.bone(n); const near = !this.cut && d < 14;
    z.lk = lerp(z.lk || 0, near ? clamp(1.4 - d / 10, 0, 1) : 0, Math.min(1, dt * 3));
    z.bt = (z.bt ?? rnd(0, 1.6)) - dt; if (z.bt <= 0 && z.lk < .55) { z.bt = rnd(1.1, 2.2); z.bite = .95; z.bitten = false; }
    let dip = 0, shake = 0, pull = 0; if (z.bite > 0) { z.bite -= dt; const k = 1 - z.bite / .95; dip = k < .4 ? k / .4 : Math.max(0, 1 - (k - .4) / .6);
      if (k > .4 && k < .8) { shake = Math.sin(k * 55 + z.id) * .32 * (1 - (k - .4) / .4); pull = Math.sin((k - .4) / .4 * Math.PI) * .6; }
      if (k > .42 && !z.bitten) { z.bitten = true; const vol = Math.max(0, .55 * (1 - d / 22)); if (vol > .02) { this.audio.at(z.root.position); (Math.random() < .55 ? this.audio.tear : this.audio.chew).call(this.audio, .6); }
        if (v && v.root) { v.jolt = 1; const hp = V3(); z.worldOf('DEF-head', hp); const vp = v.root.position; const sp = V3((hp.x + vp.x) / 2, .35, (hp.z + vp.z) / 2);
          if (gore) { this.blood(sp, V3(rnd(-.4, .4), 1, rnd(-.4, .4)), 9, 2.4, 1.1); if (Math.random() < .35) this.gib(sp, 1, '#4a0808'); if (Math.random() < .4) this.decal(vp.x + rnd(-.9, .9), vp.z + rnd(-.9, .9), rnd(.3, .6)); }
          if (v.pool) { const s0 = v.pool.scale.x; v.pool.scale.setScalar(Math.min(3.6, s0 + .07)); } } } }
    else if (Math.random() < dt * .25) this.audio.at(z.root.position).chew(.35);
    const lk = z.lk; let rel = 0; if (lk > .01) { rel = Math.atan2(toP.x, toP.z) - z.root.rotation.y; rel = Math.atan2(Math.sin(rel), Math.cos(rel)); rel = clamp(rel, -1.3, 1.3); if (lk > .7) z.root.rotation.y = angLerp(z.root.rotation.y, z.root.rotation.y + rel, dt * .8); }
    const sp2 = B('DEF-spine.002'), sp3 = B('DEF-spine.003'), nk = B('DEF-neck'), hd = B('DEF-head');
    if (sp2) sp2.rotateX((.35 + dip * .35 - pull * .1) * (1 - lk * .7)); if (sp3) sp3.rotateX((.2 + dip * .25) * (1 - lk * .8));
    if (nk) { nk.rotateX((dip * .45 - pull * .25) * (1 - lk) - lk * .35); nk.rotateY(rel * .45 * lk); }
    if (hd) { hd.rotateX((dip * .3 - pull * .35) * (1 - lk) - lk * .25); hd.rotateY(rel * .45 * lk + shake); hd.rotateZ(shake * .5); }
    ['L', 'R'].forEach((s, i) => { const ua = B('DEF-upper_arm.' + s), fa = B('DEF-forearm.' + s); if (ua) ua.rotateX(-(.5 + dip * .35 + pull * .3) * (1 - lk * .5)); if (fa) fa.rotateX(-(.7 + pull * .4)); });
    if (z.noHead && hd) hd.scale.setScalar(.001); }
  victimStruggle(n, dt) { if (!n.isVictim) return; const eaters = this.zombies.filter(z => !z.dead && z.st === 'eat' && z.eat === n).length;
    n.struggle = Math.max(eaters ? .15 : 0, n.struggle - dt * .035); n.jolt = Math.max(0, (n.jolt || 0) - dt * 2.5); const s = n.struggle * (.55 + n.jolt * .8), t = this.t * 1 + (n.id || 0), B = (k) => n.bone(k); if (s < .01) return;
    ['L', 'R'].forEach((k, i) => { const sg = i ? 1 : -1; const ua = B('DEF-upper_arm.' + k), fa = B('DEF-forearm.' + k), th = B('DEF-thigh.' + k), sh = B('DEF-shin.' + k);
      if (ua) { ua.rotateX(-(.9 + .7 * Math.sin(t * 6.3 + i * 2)) * s); ua.rotateZ(sg * .4 * Math.sin(t * 4.1 + i) * s); } if (fa) fa.rotateX(-(.6 + .6 * Math.sin(t * 8 + i)) * s);
      if (th) th.rotateX(Math.sin(t * 9.5 + i * 3.1) * .55 * s); if (sh) sh.rotateX(Math.max(0, Math.sin(t * 9.5 + i * 3.1 + 1)) * .9 * s); });
    const hd = B('DEF-head'), sp = B('DEF-spine.003'); if (hd) hd.rotateY(Math.sin(t * 5.2) * .45 * s); if (sp) sp.rotateX(-Math.abs(Math.sin(t * 3)) * .3 * s);
    n.screamT -= dt; if (n.screamT <= 0 && n.struggle > .35) { n.screamT = rnd(1.8, 3.5); const dd = n.root.position.distanceTo(this.player.root.position); if (dd < 30) { this.audio.at(n.root.position); if (Math.random() < .5) this.audio.shout(Math.random() < .5 ? 'npcf_scream' : 'npcm_scream', true, n.root.position); else this.audio.scream(.15); } } }
  // animation-synced footsteps (two footfalls per walk/jog/sprint cycle), surface by location, positional
  surfaceAt(x, z) { const K = this.world && this.world.KH; if (K && x > K.x0 && x < K.x1 && z > K.z0 && z < K.z1) return 'wood'; if (this.stepData && this.stepData.surface === 'wood') return 'wood';
    if (Math.abs(x) < 7.8) return 'asphalt'; const M = this.world && this.world.mud; if (M) for (const m of M) { if ((x - m[0]) ** 2 + (z - m[1]) ** 2 < m[2]) return 'mud'; } return 'grass'; }
  stepTrack(c, pos, who) { let a = c.cur, ph; if (c.locoOn) { ph = c.locoPh; } else { if (!a || !/Walk|Jog|Sprint|Run|Crouch_Fwd|Shuffle/.test(c.curName)) { c._ph = -1; return; } ph = (a.time / a.getClip().duration) % 1; } const prev = c._ph ?? -1; c._ph = ph;
    if (prev < 0) return; const hit = (prev < .02 && ph >= .02) || (prev < .52 && ph >= .52) || (ph < prev && ph >= .02); if (!hit) return;
    if (who !== 'p' && this.audio.dist(pos) > 28) return; const surf = this.surfaceAt(pos.x, pos.z); const run = c.locoOn ? (c.locoSp || 0) > 3 : /Jog|Sprint|Run/.test(c.curName);
    this.audio.footstep(surf === 'wood' ? 'wood' : surf === 'grass' ? 'grass' : surf === 'mud' ? 'mud' : 'asphalt', pos, who === 'p' ? (this.state.crouch ? .14 : run ? .5 : .32) : who === 'z' ? .4 : .3, who); }
  carAlarm(p) { if (this.alarm || !this.audio.loopAt) return; const q = { x: p.x, y: 1, z: p.z }; const s = this.audio.loopAt('alarm_loop', q, .55, { ref: 4, maxD: 80 }); if (!s) return; this.alarm = s; setTimeout(() => { try { s.stop(); } catch {} this.alarm = null; }, 9000); }
  chatter(dt) { if (this.cut || this.dying || !this.audio.ctx) return; this.chatT = (this.chatT ?? 8) - dt; if (this.chatT > 0) return; this.chatT = rnd(9, 18);
    if (this.audio.ctx.currentTime < (this.audio.vEnd || 0)) return; const pp = this.player.root.position; const near = this.alive().filter(z => z.st === 'chase' && z.root.position.distanceTo(pp) < 12).length;
    const feeding = this.zombies.some(z => z.st === 'eat' && z.lk > .4); const N = Object.values(this.npcs).filter(n => !n.isVictim && n.root.visible !== false && n.root.position.distanceTo(pp) < 18);
    const pick = (k) => this.audio.shout(k, false);
    if (this.truck.driving) return pick('keem_drive'); if (feeding && !this._scared) { this._scared = 1; return pick('keem_scared'); } if (near >= 2) return pick(Math.random() < .7 ? 'keem_combat' : 'marcus_shout');
    if (N.length) { const n = N[Math.floor(Math.random() * N.length)]; const k = /nia/.test(n.key || n.lookKey || '') ? 'nia_chat' : /marcus|dad/.test(n.key || n.lookKey || '') ? 'marcus_chat' : Math.random() < .5 ? 'npc_chat' : 'npcf_chat'; return this.audio.shout(k, false, n.root.position); }
    if (Math.random() < .3) pick(Math.random() < .5 ? 'npc_chat' : 'npcf_chat'); }
  zBones(z) { const b = z.bones; if (!z.dead && !z.oneShot) { // zombie posture: arms reaching, head lolled
      ['DEF-upper_arm.L', 'DEF-upper_arm.R'].forEach((n, k) => { const bn = b[n]; if (bn) { bn.rotateX(z.runner ? -0.5 : -1.05); bn.rotateZ((k ? -1 : 1) * 0.12); } });
      if (b['DEF-head']) b['DEF-head'].rotateZ(Math.sin(this.t * 1.3 + z.id) * .25 + .2); if (b['DEF-spine.002']) b['DEF-spine.002'].rotateX(.18); }
    if (z.noHead && b['DEF-head']) b['DEF-head'].scale.setScalar(0.001); if (z.noArm && b[z.noArm]) b[z.noArm].scale.setScalar(0.001); if (z.noLimbs) for (const n of z.noLimbs) { const bn = z.bone(n); if (bn) bn.scale.setScalar(0.001); } }
  updateBoss(z, d, toP, dt) { const zp = z.root.position; z.t = (z.t || 0) + dt; $('#bossb i').style.width = Math.max(0, z.hp / z.maxHp * 100) + '%';
    if (z.stun > 0) { z.stun -= dt; return; }
    // v1.9.6: big bosses give the player aim windows: back off after a slam/charge or every ~12% HP lost, wind up before charging, and don't hug Keem
    if (z.lastHp == null) z.lastHp = z.hp; if (!z.mode && z.lastHp - z.hp > z.maxHp * .12) { z.lastHp = z.hp; z.mode = 'back'; z.mt = 1.6; }
    if (z.mode === 'back') { z.mt -= dt; const n = toP.clone().normalize(); z.root.rotation.y = angLerp(z.root.rotation.y, Math.atan2(n.x, n.z), dt * 6); if (d < 9) this.moveCollide(zp, -n.x * z.speed * .8 * dt, -n.z * z.speed * .8 * dt, .6); z.play('Walk_Loop', { speed: -.5 }); if (z.mt <= 0) { z.mode = 'pause'; z.mt = 1.1; } return; }
    if (z.mode === 'pause') { z.mt -= dt; const n = toP.clone().normalize(); z.root.rotation.y = angLerp(z.root.rotation.y, Math.atan2(n.x, n.z), dt * 4); z.play('Idle_Loop'); if (z.mt <= 0) { z.mode = null; z.cd = Math.max(z.cd, .8); } return; }
    if (z.mode === 'wind') { z.mt -= dt; const n = toP.clone().normalize(); z.root.rotation.y = angLerp(z.root.rotation.y, Math.atan2(n.x, n.z), dt * 6); z.play('Idle_Loop'); if (z.mt <= 0) { z.mode = 'charge'; z.mt = 1.3; z.hitP = false; z.play('Sprint_Loop', { force: true }); this.toast('CHARGE — ROLL!', 0.8); } return; }
    if (z.mode === 'slam') { z.mt -= dt; z.ring.scale.setScalar(1 + (0.9 - z.mt) * 3); if (z.mt <= 0) { z.mode = null; this.scene.remove(z.ring); this.shake(.7); this.audio.thud(); this.audio.boom(); if (d < 3.4) this.hurt(28, zp); z.cd = 2; z.mode = 'back'; z.mt = 1.4; } return; }
    if (z.mode === 'charge') { z.mt -= dt; const f = V3(Math.sin(z.root.rotation.y), 0, Math.cos(z.root.rotation.y)); if (this.moveCollide(zp, f.x * 9 * dt, f.z * 9 * dt, .6)) { z.mt = 0; z.stun = 1.2; this.shake(.5); this.audio.crash(); this.toast('He hit the wall — punish him!'); }
      if (d < 1.6 && !z.hitP) { z.hitP = true; this.hurt(25, zp); } if (z.mt <= 0) { z.mode = 'back'; z.mt = 1.2; z.cd = 1.5; } return; }
    toP.normalize(); z.root.rotation.y = angLerp(z.root.rotation.y, Math.atan2(toP.x, toP.z), dt * 4); z.cd -= dt;
    if (z.cd <= 0 && d < 3) { z.mode = 'slam'; z.mt = 0.9; z.play('Sword_Attack', { once: true, force: true, speed: .7, cb: () => z.curName = '' }); const ring = z.ring = new THREE.Mesh(new THREE.RingGeometry(.9, 1.1, 32), new THREE.MeshBasicMaterial({ color: '#f22', transparent: true, opacity: .6, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.copy(zp).y = .06; this.scene.add(ring); return; }
    if (z.cd <= 0 && d > 7) { z.mode = 'wind'; z.mt = .8; this.audio.groan(.3); this.audio.roar && this.audio.roar(); this.toast('He\'s winding up…', 0.7); return; }
    if (d > 2.4) { this.moveCollide(zp, toP.x * z.speed * dt, toP.z * z.speed * dt, .6); z.play('Walk_Loop', { speed: .55 }); } else z.play('Idle_Loop'); if (Math.random() < dt * .4) this.audio.groan(.2); }
  updateDying(dt) { const D = this.dying; D.t += dt; this.player.mixer.update(dt); if (D.z) { D.z.mixer.update(dt); }
    if (this.settings.gore && Math.random() < dt * 10) { const p = this.player.root.position.clone(); p.y = .4; this.blood(p, V3(rnd(-1, 1), 1, rnd(-1, 1)), 6, 3); if (Math.random() < .2) this.decal(p.x + rnd(-1, 1), p.z + rnd(-1, 1), 1); }
    if (D.t > .3 && !D.s1) { D.s1 = 1; this.screenSplat(); this.audio.splat(); } if (D.t > 1.2 && !D.s2) { D.s2 = 1; this.screenSplat(); this.audio.scream(.1); }
    if ((D.t > 2.6 || performance.now() - D.t0 > 4200) && !D.done) { D.done = 1; this.paused = true; this.onDeath && this.onDeath(); } }
  updateFX(dt) { const FX = this._fx || (this._fx = { M: new THREE.Matrix4(), q: new THREE.Quaternion(), s: V3() }), M = FX.M, q = FX.q, s = FX.s;
    if (this._pAny !== false) { let any = false; for (let i = 0; i < this.pd.length; i++) { const d = this.pd[i]; if (d.life > 0) { any = true; d.life -= dt; d.v.y -= 12 * dt; d.p.addScaledVector(d.v, dt); if (d.p.y < .03) { d.p.y = .03; d.v.set(0, 0, 0); if (d.dec) { d.dec = false; this.decal(d.p.x, d.p.z, .35); } } if (d.life <= 0) d.p.y = -99; }
      else if (d.p.y === -99 && d.s === 0) continue; M.compose(d.p, q, s.setScalar(d.life > 0 ? d.s : 0)); this.parts.setMatrixAt(i, M); if (d.life <= 0) d.s = 0; }
      this.parts.instanceMatrix.needsUpdate = true; if (!any) this._pAny = false; }
    if (this.spurts) for (let i = this.spurts.length - 1; i >= 0; i--) { const q = this.spurts[i]; q.t -= dt; if (q.t <= 0) { this.spurts.splice(i, 1); continue; } if (Math.random() < dt * 22) { const p = V3(); q.z.worldOf(q.bone, p); this.blood(p, V3(rnd(-.3, .3), 1.4, rnd(-.3, .3)), 3, 3 * q.t, 1); } }
    for (let i = this.gibs.length - 1; i >= 0; i--) { const g = this.gibs[i]; g.life -= dt; if (g.m.position.y > .04 || g.v.y > 0) { g.v.y -= 14 * dt; if (g.big && g.m.position.y + g.v.y * dt < .08 && g.v.y < -2) { g.v.y *= -.3; g.v.x *= .5; g.v.z *= .5; g.r.multiplyScalar(.4); if (this.settings.gore) this.decal(g.m.position.x, g.m.position.z, .7); } g.m.position.addScaledVector(g.v, dt); g.m.rotation.x += g.r.x * dt; g.m.rotation.y += g.r.y * dt; } else { g.m.position.y = .04; } if (g.life <= 0) { this.scene.remove(g.m); this.gibs.splice(i, 1); } }
    for (const b of this.booms) if (b.on) { b.t += dt; b.ball.scale.setScalar(1 + b.t * b.R * 1.6); b.ball.material.opacity = Math.max(0, 1 - b.t * 1.4); if (b.t > 1.2) { b.on = false; b.ball.visible = false; } }
    if (this._boomL && this._boomL.intensity > 0) this._boomL.intensity = Math.max(0, this._boomL.intensity - dt * 120);
    for (let i = this.grenadesLive.length - 1; i >= 0; i--) { const g = this.grenadesLive[i]; g.t -= dt; g.v.y -= 14 * dt; g.m.position.addScaledVector(g.v, dt); if (g.m.position.y < .06) { g.m.position.y = .06; g.v.multiplyScalar(.4); g.v.y = Math.abs(g.v.y) * .3; }
      if (g.t <= 0) { this.scene.remove(g.m); this.grenadesLive.splice(i, 1); this.explode(g.m.position.clone(), 6, 260); const tp = this.world.tanker.position; if (this.stepData.tankerHP > 0 && g.m.position.distanceTo(tp) < 8) this.stepData.tankerBoom = true; } }
    if (this.mT > 0) { this.mT -= dt; if (this.mT <= 0) { this.muzzle.visible = false; this.mLight.intensity = 0; } } if (this.trT > 0) { this.trT -= dt; if (this.trT <= 0) this.tracer.visible = false; } }
  render(rdt) { const cam = this.camera, P = this.player, C = this.cam, I = this.input, T = this.truck;
    // camera
    I.lastLook = Math.hypot(I.look.x, I.look.y); C.yaw -= I.look.x; C.pitch = clamp(C.pitch - I.look.y, -1.1, 0.9); I.look.set(0, 0); this.aimAssist(rdt);
    const aim = this.state && this.state.aim; const ws = this.ws || {};
    let target, desired; const fov = aim ? 62 / (ws.zoom || 1.35) : 62; cam.fov = lerp(cam.fov, fov, Math.min(1, rdt * 12)); cam.updateProjectionMatrix();
    if (this.cut && this.cut.cam) { cam.position.lerp(this.cut.cam, Math.min(1, rdt * 3)); const lk = this.cut.look; this._lk = this._lk ? this._lk.lerp(lk, Math.min(1, rdt * 3)) : lk.clone(); cam.lookAt(this._lk); }
    else if (this.dying) { const p = P.root.position; const want = V3(p.x + Math.sin(this.t * .3) * 2.4, 1.1, p.z + Math.cos(this.t * .3) * 2.4); cam.position.lerp(want, rdt * 2); cam.lookAt(p.x, .4, p.z); }
    else if (T && T.driving) { const p = T.g.position; T.ch = T.ch == null ? T.head : angLerp(T.ch, T.head, Math.min(1, rdt * 3)); const dd = 7.5 + Math.abs(T.v) * .12; desired = V3(p.x - Math.sin(T.ch) * dd, 3.3, p.z - Math.cos(T.ch) * dd); cam.position.lerp(desired, Math.min(1, rdt * 4)); cam.lookAt(p.x + Math.sin(T.ch) * 4, 1.2, p.z + Math.cos(T.ch) * 4); C.yaw = T.ch + Math.PI; }
    else if (C.fp) { const hp = V3(); P.worldOf('DEF-head', hp); hp.y += .05; cam.position.copy(P.root.position).setY(P.root.position.y + (this.state.crouch ? 1.0 : 1.48)); const f = V3(-Math.sin(C.yaw), 0, -Math.cos(C.yaw)); cam.position.addScaledVector(f, .12);
      cam.rotation.set(0, 0, 0, 'YXZ'); cam.rotation.order = 'YXZ'; cam.rotation.y = C.yaw; cam.rotation.x = C.pitch; }
    else { const SC = this._cs || (this._cs = { t: V3(), b: V3(), r: V3(), pv: V3(), rc: new THREE.Raycaster(), rc2: new THREE.Raycaster() }); target = SC.t.copy(P.root.position); target.y += this.state && this.state.crouch ? 1.05 : 1.5; const dist = aim ? 1.6 : 2.7, sh = aim ? .62 : .5;
      const cp = Math.cos(C.pitch), back = SC.b.set(Math.sin(C.yaw) * cp, -Math.sin(C.pitch), Math.cos(C.yaw) * cp); const right = SC.r.set(Math.cos(C.yaw), 0, -Math.sin(C.yaw));
      const pivot = SC.pv.copy(target).addScaledVector(right, sh); let dd = dist; SC.rc.set(pivot, back); SC.rc.near = 0; SC.rc.far = dist + .3; const h = SC.rc.intersectObjects(this.world.walls, false)[0]; if (h) dd = Math.max(.3, h.distance - .25);
      // side collision for shoulder
      SC.rc2.set(target, right); SC.rc2.near = 0; SC.rc2.far = sh + .2; const h2 = SC.rc2.intersectObjects(this.world.walls, false)[0]; if (h2) { pivot.copy(target).addScaledVector(right, Math.max(0, h2.distance - .25)); }
      cam.position.copy(pivot).addScaledVector(back, dd); cam.rotation.order = 'YXZ'; cam.rotation.set(C.pitch, C.yaw, 0); }
    // shake
    if (this.trauma > 0) { const k = this.trauma * this.trauma * .25; cam.position.x += rnd(-k, k); cam.position.y += rnd(-k, k); cam.rotation.z += rnd(-k, k) * .4; this.trauma = Math.max(0, this.trauma - rdt * 1.6); }
    // viewmodel
    this.vm.visible = !!(C.fp && !(T && T.driving) && !this.cut && !this.dying); if (this.vm.visible) { const s = this.state; const bob = Math.sin(this.t * 9) * .012 * Math.min(1, this.input.move.length()); this.vm.position.set(aim ? 0.0 : .22, (aim ? -.14 : -.2) + bob, -.45);
      const w = WEAPONS[this.save.cur]; this.vm.rotation.set(s.atk > 0 && w.type === 'melee' ? -1.2 + s.atk / this.ws.rate * 2.4 : (s.reload > 0 ? .6 : 0), w.type === 'melee' ? .3 : 0, 0); }
    $('#xhair').classList.toggle('hidden', !(WEAPONS[this.save?.cur]?.type === 'gun' || C.fp) || !!(T && T.driving) || !!this.cut || !!this.dying);
    // flashlight from chest
    const fl = this.flash; const FS = this._fs || (this._fs = { p: V3(), d: V3() }); const fpos = FS.p.copy(P.root.position); fpos.y += 1.3; const fdir = FS.d; cam.getWorldDirection(fdir); if (T && T.driving) { fpos.copy(T.g.position).y += 1; fdir.set(Math.sin(T.head), -.1, Math.cos(T.head)); }
    fl.position.copy(fpos).addScaledVector(fdir, .3); fl.target.position.copy(fpos).addScaledVector(fdir, 10); fl.visible = !this.cut || this.cut.flash;
    // moon shadow follows
    const mp = P.root.position; this.moon.position.set(mp.x - 20, 40, mp.z + 14); this.moon.target.position.copy(mp);
    if (this.player && this.scene) { if (!this.faceL) { this.faceL = new THREE.PointLight('#ffe6cc', 0.7, 4.5, 1.6); this.faceL.castShadow = false; this.scene.add(this.faceL); } this.faceL.visible = !!this.cut && !this.cut.seq; /* v1.9.10: face fill only in cutscenes (made the player glow white in play) */ const hp = this.cut && this.cut.look ? this.cut.look : this.player.root.position, hy = this.cut && this.cut.look ? hp.y + .25 : hp.y + 1.7, cp = cam.position; this.faceL.position.set(hp.x + (cp.x - hp.x) * .45, hy, hp.z + (cp.z - hp.z) * .45); }
    if (this.audio.listen) { const K = this.world && this.world.KH, c = cam.position; this.audio.listen(cam, !!(K && c.x > K.x0 && c.x < K.x1 && c.z > K.z0 && c.z < K.z1)); }
    if (this.composer) this.composer.render(); else this.renderer.render(this.scene, cam);
    if (this.running && !this.paused) this.hud(rdt); }
  // v2.1 perf: DOM nodes cached, text/style written only when the value changed, slow readouts at 10 Hz, minimap at ~12 Hz, no per-frame vector/closure garbage
  hud(rdt = .016) { const s = this.save, w = WEAPONS[s.cur]; const H = this._hd || (this._hd = { q: {}, v: V3(), p: V3() }); const q = (id) => H.q[id] || (H.q[id] = document.querySelector(id));
    const setT = (id, t) => { const e = q(id); if (e && H['t' + id] !== t) { H['t' + id] = t; e.textContent = t; } };
    H.acc = (H.acc || 0) + rdt; if (H.acc >= .1 || H.first == null) { H.acc = 0; H.first = 1;
      { const wd = (this.hp / this.maxHp * 100).toFixed(1) + '%', e = q('#hpb i'); if (e && H.hpw !== wd) { H.hpw = wd; e.style.width = wd; } }
      setT('#hpTxt', `Health : ${Math.ceil(this.hp)}  ·  Lv ${s.level}  ·  $${s.cash}  ·  Med ${s.meds}${s.pages.length ? `  ·  Pages ${s.pages.length}/20` : ''}`);
      { const st = this.state, rl = q('#rld'); if (rl) { const on = !!(st && st.reload > 0 && !this.dying); if (H.rld !== on) { H.rld = on; rl.classList.toggle('on', on); } if (on) rl.firstChild.style.width = Math.round((1 - st.reload / (this.ws.reload || 1)) * 100) + '%'; } }
      setT('#ammoTxt', w.type === 'gun' ? `${w.name}  ·  Ammo : ${s.mags[s.cur] || 0} / ${s.ammo[w.ammo] || 0}${this.state.reload > 0 ? '  (reloading)' : ''}` : w.name);
      setT('#grenN', String(s.grenades)); setT('#grenN2', String(s.grenades)); setT('#tAtk', w.type === 'gun' ? 'FIRE' : 'HIT'); setT('#pages', '');
      { const lo = this.dying ? 1 : clamp(1 - this.hp / this.maxHp * 2.2, 0, .9), e = q('#lowhp'), v = lo.toFixed(2); if (e && H.lo !== v) { H.lo = v; e.style.opacity = lo; } }
      { const cb = q('#combo'); if (this.state.combo >= 2) { setT('#combo', `x${this.state.combo} COMBO`); cb.classList.add('on'); } else cb.classList.remove('on'); }
      const n = this.nearUse(); setT('#prompt', n && !this.cut && !this.carSeq ? `✋ ${n.label}` : (this.truck.driving ? 'GAS / BRAKE + ◀ ▶ · W/S + A/D · RT/LT' : ''));
      if (this.boss) { q('#boss').classList.remove('hidden'); q('#bossb i').style.width = Math.max(0, this.boss.hp / (this.boss.maxHp || 1) * 100) + '%'; } }
    // waypoint (per frame: it tracks the camera)
    const wpE = q('#wp'); const tgt = this.wpTarget; if (tgt && !this.cut) { H.wpOff = 0; const v = H.v.set(tgt[0], tgt[1] || 1.2, tgt[2]); const dist = v.distanceTo(this.player.root.position); const p = H.p.copy(v).project(this.camera); let x = (p.x * .5 + .5) * innerWidth, y = (-p.y * .5 + .5) * innerHeight; const behind = p.z > 1;
      if (behind) { x = innerWidth - x; y = innerHeight - 40; } x = clamp(x, 40, innerWidth - 40); y = clamp(y, 60, innerHeight - 60); wpE.style.display = ''; wpE.style.left = x.toFixed(0) + 'px'; wpE.style.top = y.toFixed(0) + 'px';
      if (!H.wd) { H.wd = wpE.querySelector('.d'); H.wa = wpE.querySelector('.arr'); } const dt2 = Math.round(dist) + ' m', ar = behind ? '▼' : (dist < 3 ? '◆' : '▲'); if (H.wdt !== dt2) { H.wdt = dt2; H.wd.textContent = dt2; } if (H.war !== ar) { H.war = ar; H.wa.textContent = ar; } } else if (H.wpOff !== 1) { wpE.style.display = 'none'; H.wpOff = 1; }
    H.mm = (H.mm || 0) + rdt; if (H.mm >= .08) { H.mm = 0; this.mini(); } }
  mini() { const c = $('#mini'), g = c.getContext('2d'), W = c.width, S = 1.4; const P = this.player.root.position; g.clearRect(0, 0, W, W); g.save(); g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 1, 0, 7); g.clip(); g.fillStyle = 'rgba(10,20,14,.7)'; g.fillRect(0, 0, W, W);
    g.translate(W / 2, W / 2); g.rotate(this.cam.yaw); g.scale(1 / S, 1 / S); g.translate(-P.x, -P.z);
    g.fillStyle = '#3a4038'; g.fillRect(-5.5, -155, 11, 220); g.fillRect(-45, -0.5, 90, 9); g.fillStyle = '#1e3a4a'; g.fillRect(-200, -131, 400, 22); g.fillStyle = '#555'; g.fillRect(-5, -132, 10, 24);
    g.fillStyle = '#5a5248'; this.world.colliders.forEach(k => { if (k.x1 - k.x0 > 3 && k.x1 - k.x0 < 20 && k.z1 - k.z0 < 20) g.fillRect(k.x0, k.z0, k.x1 - k.x0, k.z1 - k.z0); });
    g.fillStyle = '#e33'; this.alive().forEach(z => { g.beginPath(); g.arc(z.root.position.x, z.root.position.z, 1.4, 0, 7); g.fill(); });
    if (this.wpTarget) { g.fillStyle = '#7fd49a'; g.beginPath(); g.arc(this.wpTarget[0], this.wpTarget[2], 3, 0, 7); g.fill(); }
    g.restore(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(W / 2, W / 2 - 6); g.lineTo(W / 2 - 4, W / 2 + 4); g.lineTo(W / 2 + 4, W / 2 + 4); g.fill(); }
}
