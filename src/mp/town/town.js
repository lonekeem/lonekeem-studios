// Town assembly: renderer, lighting, player, camera, input, interactions (doors, loot, cars, shop), HUD and net events.
// Houses/streets live in map.js + building.js; cars.js / loot.js / zombies.js / gas.js are the props modules.
import { armSolve } from './camcol.js';
import { goOnline, getUser, getRole, signInGoogle, signOut } from '../online.js';
import * as THREE from 'three';
import { loadBase, Avatar } from '../avatar.js';
import { dress } from '../dress.js';
import { animate } from '../anim.js';
import { Net } from '../net.js';
import { buildTown, BOUNDS, CAR_SPAWNS, BODIES, SPAWN, CFG, SPECIAL } from './map.js';
import { ITEMS, rollTable, Bag, DOOR_PRICE } from './loot.js';
import { Car, loadCarModels, createCars, CAP } from './cars.js';
import { addGas, pumpNear, fillCan, gasActions } from './gas.js';
import { addLoot, updateLoot } from './loot.js';
import { createZombies } from './zombies.js';
import { prime, setLevel } from './lod.js';
import { Input } from '../../game/input.js';
import { mulberry, angDiff, clamp } from './kit.js';
import { hash } from './building.js';
import { CSS, el, drawGauge } from './ui.js';
import { AudioSys } from '../../audio.js';

function nameTag(text) { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#000a'; g.roundRect ? g.roundRect(8, 10, 240, 44, 14) : g.rect(8, 10, 240, 44); g.fill(); g.fillStyle = '#fff'; g.font = '600 28px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text.slice(0, 16), 128, 33); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(.5, .125, 1); s.renderOrder = 20; return s; }

export async function enterTown({ look, onExit } = {}) {
  if (!document.getElementById('mpt-css')) document.head.append(el('style', { id: 'mpt-css' }, CSS));
  // ---- DOM: the town canvas + panels live in the story's #stage; controls and HUD are the story game's own (v1.9.7 layout) ----
  const $q = q => document.querySelector(q); const root = el('div', { id: 'mpt' }); const canvas = el('canvas', { cls: 'main' });
  const vig = el('div', { cls: 'vig' }); const gaugeC = el('canvas', { cls: 'gauge', width: 208, height: 140 });
  const dead = el('div', { cls: 'dead' }, el('div', {}, 'You were overrun'), el('div', { style: 'font-size:13px' }, 'Respawning at the street…'));
  const panel = el('div', { cls: 'panel' }); const pausePanel = el('div', { cls: 'pausep' });
  let wantUse = false, wantAlt = false, wantHit = false, hitHeld = false, chan = false, fp = false, fpPitch = 0, aimZoom = false; const drv = { gas: 0, brake: 0, l: 0, r: 0 };
  const SET = (() => { let q = {}; try { q = JSON.parse(localStorage.getItem('atq3.settings') || '{}') || {}; } catch (e) { /* ignore */ } return Object.assign({ ctl: 'twin', sens: 1, hand: 'right', stick: 'float', invertY: false, padSens: 1, padDead: .15, hudv2: false }, q); })();
  // reuse the story game's own Input when the story game is loaded (one set of listeners on the shared buttons); else a standalone Input on a tiny shim
  const G = window.__atq && window.__atq.game; const useG = !!(G && G.input);
  if (useG && !G.state) G.state = { crouch: false };
  const shim = useG ? G : (window.__mpShim || (window.__mpShim = { settings: SET, paused: false, state: { crouch: false }, skipLine() { /* no dialogue in MP */ }, onPause: null })); if (!useG) shim.settings = SET; const oldPause = shim.onPause;
  const stage = $q('#stage'), hudEl = $q('#hud'), touchEl = $q('#touch'), driveEl = $q('#drive'), glEl = $q('#gl'); const hideIds = ['#pages', '#combo', '#boss', '#wp', '#xhair', '#rld', '#skipObj']; const saved = [];
  for (const q of hideIds) { const e = $q(q); if (e) { saved.push([e, e.style.display]); e.style.display = 'none'; } } glEl && (glEl.style.display = 'none');
  stage.classList.remove('hidden'); hudEl.classList.remove('hidden'); touchEl.classList.toggle('hidden', !(matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window)); driveEl && driveEl.classList.add('hidden');
  const inp = useG ? G.input : (window.__mpInput || (window.__mpInput = new Input(shim)));
  // small extra buttons in the same round style: Bag, Shop, Exit (second row under the story's grenade / swap / view / pause buttons)
  const hudr2 = el('div', { id: 'hudr2' }); const xb = (t, fn) => { const b = el('button', { cls: 'rb' }, t); b.addEventListener('click', e => { e.stopPropagation(); fn(); }); b.addEventListener('touchstart', e => e.stopPropagation(), { passive: true }); hudr2.append(b); return b; };
  xb('Bag', () => togglePanel('bag')); xb('Shop', () => togglePanel('shop')); xb('Exit', () => exit()); hudEl.append(hudr2);
  root.append(canvas, vig, gaugeC, panel, pausePanel, dead); stage.append(root);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); const FOG_FAR = 105; scene.background = new THREE.Color('#aab5b8'); scene.fog = new THREE.Fog('#aab5b8', 28, FOG_FAR);
  scene.add(new THREE.HemisphereLight('#dfe8f0', '#59614a', 1.25)); const sun = new THREE.DirectionalLight('#ffeccc', 2.1); sun.position.set(36, 60, 28); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = sc.bottom = -34; sc.right = sc.top = 34; sc.near = 5; sc.far = 160; sun.shadow.bias = -.0006; sun.shadow.normalBias = .04; scene.add(sun, sun.target);
  const cam = new THREE.PerspectiveCamera(58, 1, .1, 320);
  // ---- world ----
  const W = buildTown(scene, { hooks: [addGas, addLoot] }); const col = W.col; const bag = new Bag(26); bag.add('cash', 60); bag.add('water', 1);
  // containers (fridges, cabinets, dumpsters): no shadow casting (4 shadow-pass draws each for nothing visible)
  for (const c of W.containers) if (c.lid && c.lid.parent) c.lid.parent.traverse(m => { if (m.isMesh) m.castShadow = false; });
  // distance gating of small static props (draw-call budget): leaf objects of the freshly built world, shown within PROP_R of the player
  const gateList = []; { const PROP_R = 36; const bb = new THREE.Box3(), v = new THREE.Vector3(); const add = o => { if (o.isLight || o.isSprite || (o.name && o.name.startsWith('static_'))) return; if (!o.isMesh && o.children.length > 20) { o.children.forEach(add); return; } try { bb.setFromObject(o); } catch (e) { return; } if (bb.isEmpty()) return; bb.getCenter(v); const r = bb.getSize(new THREE.Vector3()).length() / 2; if (r > 40) return; gateList.push({ o, x: v.x, z: v.z, r, hid: false }); }; scene.children.slice().forEach(add); gateList.R = PROP_R; for (const g of gateList) g.o.traverse(m => { if (m.isMesh && !m.isInstancedMesh && m.castShadow && g.r < 2.2) m.castShadow = false; }); }
  // online (Supabase Realtime) when reachable, otherwise solo (BroadcastChannel: other tabs of this browser only)
  const onl = await goOnline('town'); let online = !!onl; if (onl) onl.transport.onstatus = ok => { online = ok; };
  const net = new Net('town', onl ? onl.transport : undefined); net.me = { name: look.name || 'Survivor', look }; net.hello();
  const models = await loadCarModels(); const carMgr = createCars({ scene, W, models }); const cars = carMgr.cars; for (const c of cars) W.containers.push(c.cabin, c.trunk);
  // cars: no real shadow casting (10 meshes each in the shadow pass) -> one soft blob plane per car instead
  { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g2 = cv.getContext('2d'); const gr = g2.createRadialGradient(32, 32, 4, 32, 32, 31); gr.addColorStop(0, 'rgba(0,0,0,.62)'); gr.addColorStop(.6, 'rgba(0,0,0,.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, 64, 64); const bt = new THREE.CanvasTexture(cv); const bm = new THREE.MeshBasicMaterial({ map: bt, transparent: true, depthWrite: false, fog: false }); bm.polygonOffset = true; bm.polygonOffsetFactor = -2;
    for (const c of cars) { c.g.traverse(m => { if (m.isMesh) m.castShadow = false; }); const bl = new THREE.Mesh(new THREE.PlaneGeometry(c.L * .92 + .6, 2.5).rotateX(-Math.PI / 2).rotateY(Math.PI / 2), bm); bl.position.y = .07; bl.renderOrder = 1; bl.name = 'blob'; c.g.add(bl); } }
  const carBy = id => cars.find(c => c.id === id);
  const me = { av: null, y: 0, x: SPAWN.x, z: SPAWN.z, ry: SPAWN.ry, sp: 0, drv: null, hp: 100, swing: 0, dead: 0, hitCd: 0 }; const remotes = new Map();
  const mkAvatar = async lk => { const tpl = await loadBase(lk.base); const av = new Avatar(tpl); dress(av, lk); return av; };
  me.av = await mkAvatar(look); scene.add(me.av.root); const myTag = nameTag(net.me.name); scene.add(myTag);
  // ---- bodies (persistent corpses, drawn by the zombies module if present) ----
  // sounds: the story game's AudioSys (samples + synth fallback); fails silent if audio is blocked
  const aud = new AudioSys({ vol: .9, music: 0, sfxVol: 1, voiceVol: 1, voices: false }); try { aud.init(); } catch (e) { /* no audio */ }
  // ---- cheap draw-call LOD: container/furniture lids only near the player, cars hidden far away, no shadows from small bits ----
  let perfAcc = 0; for (const c of W.containers) if (c.lid && c.lid.parent) c.lid.parent.traverse(o => { if (o.isMesh) o.castShadow = false; }); for (const c of cars) c.g.traverse(o => { if (o.isMesh && /wheel/.test(o.name)) o.castShadow = false; });
  const perfLOD = dt => { perfAcc += dt; if (perfAcc < .25) return; perfAcc = 0; for (const c of W.containers) { if (!c.lid || !c.lid.parent) continue; c.lid.parent.visible = Math.hypot(c.x - me.x, c.z - me.z) < 22; } for (const g of gateList) { const far = Math.hypot(g.x - me.x, g.z - me.z) - g.r > (g.r < 2.5 ? 30 : gateList.R); if (far && !g.hid && g.o.visible) { g.o.visible = false; g.hid = true; } else if (!far && g.hid) { g.o.visible = true; g.hid = false; } } for (const c of cars) { const d = Math.hypot(c.x - me.x, c.z - me.z); c.g.visible = d < 62; if (!c.sm) { c.sm = c.g.children.filter(o => o !== c.m && o.name !== 'blob').concat(c.wheels || []); } const near = d < 30; if (c.near !== near) { c.near = near; for (const o of c.sm) o.visible = near; } } };
  // ---- zombie / corpse LOD (lod.js): decimated meshes by distance, only 2 full-detail zombies, corpses hidden far away ----
  const zOrder = []; const zombieLOD = () => { zOrder.length = 0; for (const z of Z.zombies) { const p = z.root.position; z._d = Math.hypot(p.x - me.x, p.z - me.z); if (!z._fc) { z._fc = 1; prime(z.root); z.root.traverse(o => { if (o.isSkinnedMesh) o.frustumCulled = true; }); } zOrder.push(z); }
    zOrder.sort((a, b) => a._d - b._d); let full = 0; for (const z of zOrder) { const d = z._d, prev = z._lv ?? 2; const lv = d < (prev === 0 ? 8.5 : 7) && full < 2 ? 0 : d < (prev <= 1 ? 17 : 15) ? 1 : 2; if (lv === 0) full++; if (z.dead) z.root.visible = d < 45; setLevel(z, lv); } };
  let lastGroan = 0; const zEvent = (ev, z) => { try { if (!aud.ctx) return; const p = z.root.position; if (ev === 'notice') { const n = performance.now(); if (n - lastGroan > 700) { lastGroan = n; aud.at(p).groan(.12); } } else if (ev === 'kill') aud.at(p).squelch(.5); } catch (e) { /* ignore */ } };
  const Z = await createZombies({ scene, W, camera: cam, bodies: BODIES, fogFar: 64, deadVisible: 48, target: 12, getPlayers: () => [{ x: me.x, z: me.z, ry: me.ry, drv: !!me.drv, id: 'me', crouch: false }, ...[...remotes.values()].filter(r => r.av).map(r => ({ x: r.x, z: r.z, id: r.id, drv: false }))], onHitPlayer: (dmg, from) => hurt(dmg, from), onEvent: (ev, z) => zEvent(ev, z) });
  // ---- toasts / hurt ----
  let toastTm = 0; const toast = (m, sec = 1.8) => { const e = $q('#toast'); if (!e) return; e.textContent = m; e.classList.add('on'); clearTimeout(toastTm); toastTm = setTimeout(() => e.classList.remove('on'), sec * 1000); };
  const hurt = (dmg) => { if (me.dead || roll > 0) return; me.hp = Math.max(0, me.hp - dmg); vig.style.opacity = 1; setTimeout(() => vig.style.opacity = 0, 180); if (me.hp <= 0) die(); };
  const die = () => { me.dead = 3.2; dead.style.display = 'flex'; if (me.drv) exitCar(true); const lost = Math.floor(bag.count('cash') / 2); bag.remove('cash', lost); };
  // ---- doors ----
  const doorBy = id => W.doors.find(d => d.id === id);
  const setDoor = (D, action, fromNet) => { if (!D) return; if (action !== 'install') { try { aud.at({ x: D.x, y: 1, z: D.z }).door(); } catch (e) { /* ignore */ } } if (action === 'install') { D.installed = true; D.pivot.visible = true; D.state = 'closed'; D.locked = false; col.set(D.col, true); D.target = 0; D.open = 0; }
    else if (action === 'open') { D.target = 1; D.state = 'open'; col.set(D.col, false); } else if (action === 'close') { D.target = 0; D.state = 'closing'; } else if (action === 'break') { D.target = 1; D.state = 'broken'; D.locked = false; col.set(D.col, false); D.pivot.rotation.z = D.swing * .22; }
    if (!fromNet) net.evt({ t: 'door', id: D.id, a: action }); };
  const occupiedAt = (x, z, r) => Math.hypot(me.x - x, me.z - z) < r || (Z && Z.near && Z.near(x, z, r)) || cars.some(c => c.circles().some(([cx, cz]) => Math.hypot(cx - x, cz - z) < r + .9));
  // ---- loot ----
  const lootOf = c => { if (!c.items) { const r = mulberry(hash(c.id)); c.items = rollTable(c.table, r); } return c.items; };
  const setLooted = (c, left, fromNet) => { if (left) c.items = left; c.looted = true; if (c.lid) c.opening = 1; if (!fromNet) net.evt({ t: 'loot', id: c.id, left: c.items }); };
  // ---- noise / alerting zombies ----
  const noise = (x, z, r) => { Z && Z.noise && Z.noise(x, z, r); }; // (zombies.js has no noise hook yet)
  // ---- cars ----
  const enterCar = car => { if (me.dead) return; car.driver = 'me'; me.drv = car; car.net = null; if (car.fuel > 0) { car.engine = true; car.stalled = false; toast('Engine started'); } else toast('Out of fuel!', 2.4); car.lastSend = 0; };
  const exitCar = (silent) => { const c = me.drv; if (!c) return; c.driver = null; c.engine = false; me.drv = null; const s = Math.sin(c.ry), cc = Math.cos(c.ry); const sides = [[cc, -s], [-cc, s]]; for (const [dx, dz] of sides) { const nx = c.x + dx * 2.3, nz = c.z + dz * 2.3; if (!col.hit(nx, nz, .4)) { me.x = nx; me.z = nz; break; } } net.car(Object.assign(c.netState(), { engine: 0, off: 1 })); };
  net.onCar = (c, pid) => { const car = carBy(c.id); if (!car || car.driver === 'me') return; if (c.off) { car.driver = null; car.net = null; car.engine = false; return; } car.net = c; car.driver = pid; car.netAt = performance.now(); car.broken = car.broken || !!c.broken; };
  net.onEvt = (e) => { if (e.t === 'door') setDoor(doorBy(e.id), e.a, true); else if (e.t === 'loot') { const c = W.containers.find(k => k.id === e.id); if (c) setLooted(c, e.left, true); } else if (e.t === 'smash') { const c = carBy(e.id); if (c) c.smash(); } };
  for (const c of cars) c.onCrash = sp => { if (c.driver === 'me') { hurt(Math.max(0, (sp - 6) * 1.6)); toast(sp > 9 ? 'Hard crash!' : 'Bump', .8); noise(c.x, c.z, 40); } };
  // ---- panels ----
  let panelKind = null, panelCtx = null; const closePanel = () => { if (panelKind === 'loot' && panelCtx) { setLooted(panelCtx, panelCtx.items); } panel.style.display = 'none'; panelKind = null; panelCtx = null; };
  const wtxt = () => `Bag ${bag.weight.toFixed(1)}/${bag.cap} kg`;
  function renderPanel() { if (!panelKind) return; panel.innerHTML = ''; const head = (t, extra) => panel.append(el('h3', {}, el('span', {}, t), extra || '', el('button', { on: { click: closePanel } }, '✕')));
    if (panelKind === 'loot') { const c = panelCtx; head(c.label + ' · ' + wtxt(), el('button', { on: { click: () => { for (const it of c.items.slice()) take(c, it); renderPanel(); } } }, 'Take all')); const rows = el('div', { cls: 'rows' }); if (!c.items.length) rows.append(el('div', { cls: 'row' }, 'Empty')); for (const it of c.items) rows.append(el('div', { cls: 'row' }, el('span', {}, `${ITEMS[it.id].ic} ${ITEMS[it.id].n} ×${it.n}`), el('button', { on: { click: () => { take(c, it); renderPanel(); } } }, 'Take'))); panel.append(rows); }
    else if (panelKind === 'bag') { head('Bag · ' + wtxt()); const rows = el('div', { cls: 'rows' }); const ids = Object.keys(bag.items); if (!ids.length) rows.append(el('div', { cls: 'row' }, 'Empty')); for (const id of ids) { const I = ITEMS[id]; const can = I.heal || id === 'food' || id === 'water'; rows.append(el('div', { cls: 'row' }, el('span', {}, `${I.ic} ${I.n} ×${bag.count(id)}`), can ? el('button', { on: { click: () => { useItem(id); renderPanel(); } } }, id === 'food' || id === 'water' ? 'Use' : 'Heal') : el('span', { style: 'opacity:.5;font-size:11px' }, I.melee ? 'equipped' : ''))); } panel.append(rows); }
    else if (panelKind === 'shop') { head(`Shop · house upgrades · $${bag.count('cash')}`); const rows = el('div', { cls: 'rows' }); const bd = nearHouse(); if (!bd) rows.append(el('div', { cls: 'row' }, 'Stand near one of your houses to add a door.')); else { rows.append(el('div', { cls: 'row', style: 'background:#2d7a4655' }, `Doorways of ${bd.id.toUpperCase()}`)); for (const D of bd.doors) rows.append(el('div', { cls: 'row' }, el('span', {}, `🚪 Door · ${D.name} doorway${D.installed ? ' (installed)' : ''}`), D.installed ? el('span', {}, '✓') : el('button', { on: { click: () => buyDoor(D) } }, `Buy $${DOOR_PRICE}`))); } panel.append(rows); } }
  const take = (c, it) => { const got = bag.add(it.id, it.n); if (!got) { toast('Too heavy'); return; } it.n -= got; if (it.n <= 0) c.items.splice(c.items.indexOf(it), 1); };
  const useItem = id => { const I = ITEMS[id]; if (!bag.count(id)) return; const heal = I.heal || (id === 'food' ? 8 : 4); if (me.hp >= 100 && id !== 'water') { toast('Health is full'); return; } bag.remove(id, 1); me.hp = Math.min(100, me.hp + heal); toast('+' + heal + ' health'); };
  const buyDoor = D => { if (D.installed) return; if (bag.count('cash') < DOOR_PRICE) { toast('Not enough cash'); return; } bag.remove('cash', DOOR_PRICE); setDoor(D, 'install'); toast('Door installed'); renderPanel(); };
  const nearHouse = () => { let best = null, bd = 1e9; for (const b of W.buildings) { if (b.kind !== 'house') continue; const cx = (b.rect.x0 + b.rect.x1) / 2, cz = (b.rect.z0 + b.rect.z1) / 2; const d = Math.hypot(me.x - cx, me.z - cz); if (d < 16 && d < bd) { bd = d; best = b; } } return best; };
  const togglePanel = k => { if (panelKind === k) { closePanel(); return; } if (panelKind) closePanel(); panelKind = k; panelCtx = null; panel.style.display = 'flex'; renderPanel(); };
  const openLoot = c => { panelKind = 'loot'; panelCtx = c; lootOf(c); panel.style.display = 'flex'; renderPanel(); c.opening = 1; };
  bag.onChange = () => { if (panelKind) renderPanel(); };
  // ---- interactions ----
  const hold = { act: null, t: 0 }; let payDebt = 0; const nearestCar = r => { let b = null, bd = r; for (const c of cars) { const d = Math.hypot(c.x - me.x, c.z - me.z); if (d < bd) { bd = d; b = c; } } return b; };
  function gather() { const L = []; const px = me.x, pz = me.z;
    if (me.drv) { L.push({ label: 'Exit car', pri: 0, d: 0, run: () => exitCar() }); L.push(...gasActions(W, { me, bag, cars, toast, cap: CAP })); return L; }
    for (const D of W.doors) { if (!D.installed) continue; const d = Math.hypot(D.x - px, D.z - pz); if (d > 1.9) continue; if (D.state === 'closed') L.push({ label: 'Open door', d, run: () => setDoor(D, 'open') }); else if (D.state === 'open') L.push({ label: 'Close door', d, run: () => { if (occupiedAt(D.x, D.z, .8)) toast('Something is in the way'); else setDoor(D, 'close'); } }); else if (D.state === 'locked') L.push({ label: bag.hasPry() ? 'Pry door open' : 'Kick door open', d, dur: bag.hasPry() ? 1.1 : 2.4, run: () => { setDoor(D, 'break'); noise(D.x, D.z, 30); toast('Door gives way'); } }); }
    for (const c of W.containers) { if (c.looted) continue; if (c.car) { const car = c.car; const dd = Math.hypot(c.x - px, c.z - pz); if (dd > c.reach) continue; if (car.driver) continue; if (!car.broken && !(c.need === 'trunk' && bag.hasPry())) continue; L.push({ label: 'Search ' + c.label.toLowerCase(), d: dd + (c.need === 'trunk' ? .3 : 0) + .4, dur: .9, run: () => openLoot(c) }); continue; }
      const d = Math.hypot(c.x - px, c.z - pz); if (d > c.reach) continue; L.push({ label: 'Search ' + c.label.toLowerCase(), d, dur: .8, run: () => openLoot(c) }); }
    for (const car of cars) { const cs = car.circles(); const d = Math.min(Math.hypot(cs[0][0] - px, cs[0][1] - pz), Math.hypot(cs[1][0] - px, cs[1][1] - pz), Math.hypot(car.x - px, car.z - pz)); if (d > 2.6) continue; if (car.driver && car.driver !== 'me') continue;
      if (!car.broken) L.push({ label: bag.hasPry() ? 'Pry open car' : 'Smash window', d: d - .8, dur: bag.hasPry() ? .9 : 1.7, run: () => { car.smash(); car.broken = true; net.evt({ t: 'smash', id: car.id }); noise(car.x, car.z, 38); toast('Window smashed (noisy)'); } });
      else L.push({ label: car.fuel > 0 ? 'Enter ' + car.kind + ' (KL)' : 'Enter car (no fuel)', d: d - .8, run: () => enterCar(car) });
      if (car.broken && bag.count('gascan') && car.fuel < CAP - 4.5) L.push({ label: 'Pour gas can in tank', d: d + .1, alt: 1, dur: 1.5, run: () => { bag.remove('gascan'); bag.add('emptycan'); car.fuel = Math.min(CAP, car.fuel + 5); toast('+5 L fuel'); } });
      if (bag.count('emptycan') && car.fuel >= 5) L.push({ label: 'Siphon gas (' + Math.floor(car.fuel) + ' L left)', d: d + .2, alt: 1, dur: 2, run: () => { bag.remove('emptycan'); bag.add('gascan'); car.fuel -= 5; toast('Siphoned 5 L'); } }); }
    L.push(...gasActions(W, { me, bag, cars, toast, cap: CAP }));
    { const pump = pumpNear(W, px, pz, 3.4); if (pump && bag.count('emptycan')) L.push({ label: 'Fill gas can (5 L)', d: 2.6, alt: 1, dur: 1.4, run: () => { toast(fillCan(pump, bag) ? 'Gas can filled' : 'Cannot fill'); } }); }
    L.sort((a, b) => (a.d ?? 9) - (b.d ?? 9)); return L; }
  let acts = [];
  // ---- combat ----
  const swingHit = () => { if (me.hitCd > 0 || me.drv || me.dead) return; const w = bag.best(); me.hitCd = .55 + (w.dmg > 2 ? .1 : 0); me.swing = 1; try { aud.swing(); } catch (e) { /* ignore */ } const fx = Math.sin(me.ry), fz = Math.cos(me.ry); setTimeout(() => { if (Z && Z.killNear) { const n = Z.killNear(me.x + fx * w.reach * .75, me.z + fz * w.reach * .75, w.reach * .7 + .2, 22 * w.dmg, { x: fx, z: fz }); if (n) noise(me.x, me.z, 12); } noise(me.x, me.z, 7); }, 160); };
  // ---- input ----
  // keyboard extras (story Input already maps E/F use, Space jump, Ctrl roll, C crouch, V view, Q swap, G grenade, R = alt action, J fire); B = bag
  const kd = e => { if (e.repeat) return; if (e.code === 'KeyB') togglePanel('bag'); if (e.code === 'KeyN') togglePanel('shop'); }; addEventListener('keydown', kd);
  let camYaw = SPAWN.ry, camPitch = .42, camDist = 4.8, drag = null; // desktop mouse drag-look (touch look comes from the story Input)
  canvas.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') drag = [e.clientX, e.clientY]; }); canvas.addEventListener('pointermove', e => { if (drag && e.pointerType === 'mouse') { camYaw -= (e.clientX - drag[0]) * .006; camPitch = clamp(camPitch + (e.clientY - drag[1]) * .003, .18, 1.0); drag = [e.clientX, e.clientY]; } }); canvas.addEventListener('pointerup', () => drag = null);
  // driving buttons (same four as the story's truck HUD)
  const drvBind = [['#dGas', 'gas'], ['#dBrake', 'brake'], ['#dL', 'l'], ['#dR', 'r']].map(([id, k]) => { const e = $q(id); if (!e) return null; const on = v => ev => { ev.preventDefault(); drv[k] = v ? 1 : 0; e.classList.toggle('on', v); }; const dn = on(true), up = on(false); e.addEventListener('pointerdown', dn); ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => e.addEventListener(t, up)); return [e, dn, up]; });
  // pause (story's II button / Esc): Resume, Change look, Exit
  const acct = el('div', { style: 'font-size:12px;text-align:center;opacity:.9;display:flex;flex-direction:column;gap:6px' }); const refreshAcct = async () => { acct.innerHTML = ''; acct.append(el('div', {}, online ? '● Online' : '○ Solo (offline)')); const u = await getUser(); if (u) { const r = await getRole(); acct.append(el('div', {}, (u.user_metadata && u.user_metadata.name || u.email || 'Signed in') + (r === 'admin' ? ' · admin' : '')), el('button', { on: { click: async () => { await signOut(); refreshAcct(); } } }, 'Sign out')); } else if (onl) acct.append(el('button', { on: { click: () => signInGoogle().catch(e => toast('Sign-in unavailable: ' + e.message)) } }, 'Sign in with Google')); };
  const togglePause = () => { const on = pausePanel.style.display !== 'flex'; pausePanel.style.display = on ? 'flex' : 'none'; if (on) { pausePanel.innerHTML = ''; pausePanel.append(el('h3', {}, 'Paused'), el('button', { on: { click: () => { pausePanel.style.display = 'none'; } } }, 'Resume'), el('button', { on: { click: () => { net.me.look.__edit = 1; exit(true); } } }, 'Change look'), el('button', { on: { click: () => exit() } }, 'Exit to menu'), acct); refreshAcct(); } };
  shim.onPause = togglePause; const pauseB = $q('#btnPause'); const pauseH = e => { e.preventDefault(); e.stopPropagation(); togglePause(); }; pauseB.addEventListener('touchstart', pauseH, { passive: false }); pauseB.addEventListener('click', pauseH);
  // swap weapon: cycle through melee items in the bag; grenade: none in the town yet
  const swapWeapon = () => { const list = ['fists', ...Object.keys(bag.items).filter(k => ITEMS[k] && ITEMS[k].melee)]; const i = (list.indexOf(bag.pref || 'fists') + 1) % list.length; bag.pref = list[i]; toast(bag.best().name); };
  let roll = 0, jumpVy = 0;
  // ---- main loop ----
  let running = true, last = performance.now(), t = 0, sendAcc = 0; const sp = { v: 0 }; let stAcc = 0, navAcc = 0, minAcc = 0, camIn = 0; const camPos = new THREE.Vector3(); let camInit = false;
  const miniEl = $q('#mini'); const MSZ = miniEl.width, mini = miniEl.getContext('2d'); const MS = MSZ / 150; // minimap (the story's #mini canvas): 150 m window around the player
  function drawMini() { const g = mini; g.clearRect(0, 0, MSZ, MSZ); g.save(); g.beginPath(); g.arc(MSZ / 2, MSZ / 2, MSZ / 2 - 2, 0, 7); g.clip(); g.fillStyle = '#2e3a2a'; g.fillRect(0, 0, MSZ, MSZ); const X = x => MSZ / 2 + (x - me.x) * MS, Z2 = z => MSZ / 2 + (z - me.z) * MS; g.fillStyle = '#4a4d52'; for (const z of [-24, 24]) g.fillRect(0, Z2(z) - 4 * MS, MSZ, 8 * MS); for (const x of [-24, 24]) g.fillRect(X(x) - 4 * MS, 0, 8 * MS, MSZ);
    g.fillStyle = '#b8b0a0'; for (const b of W.buildings) g.fillRect(X(b.rect.x0), Z2(b.rect.z0), (b.rect.x1 - b.rect.x0) * MS, (b.rect.z1 - b.rect.z0) * MS); g.fillStyle = '#7d7468'; for (const l of W.lots) if (!l.enterable) g.fillRect(X(l.cx) - 4 * MS, Z2(l.cz) - 4 * MS, 8 * MS, 8 * MS);
    g.fillStyle = '#e8c04a'; for (const c of cars) g.fillRect(X(c.x) - 2, Z2(c.z) - 2, 4, 4); if (Z) { g.fillStyle = '#e0443a'; for (const z of Z.zombies) { if (z.dead) continue; const p = z.root.position; g.fillRect(X(p.x) - 1.5, Z2(p.z) - 1.5, 3, 3); } } g.fillStyle = '#6ac7ff'; for (const r of remotes.values()) g.fillRect(X(r.x) - 2.5, Z2(r.z) - 2.5, 5, 5);
    g.restore(); g.fillStyle = '#fff'; g.save(); g.translate(MSZ / 2, MSZ / 2); g.rotate(-me.ry + Math.PI); g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 5); g.lineTo(-5, 5); g.fill(); g.restore(); g.strokeStyle = '#fff6'; g.lineWidth = 2; g.beginPath(); g.arc(MSZ / 2, MSZ / 2, MSZ / 2 - 2, 0, 7); g.stroke(); }
  const insideB = (x, z) => { for (const b of W.buildings) { const r = b.rect; if (x > r.x0 - .1 && x < r.x1 + .1 && z > r.z0 - .1 && z < r.z1 + .1) return b; } return null; };
  function frame(now) {
    if (!running) return; requestAnimationFrame(frame); const rawDt = (now - last) / 1000, dt = Math.min(window.__MP_DTCAP || .05, rawDt); last = now; t += dt; const w = innerWidth, h = innerHeight; if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) { renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    if (me.dead > 0) { me.dead -= dt; if (me.dead <= 0) { me.hp = 100; me.x = SPAWN.x; me.z = SPAWN.z; dead.style.display = 'none'; } }
    const busy = panelKind === 'loot' || pausePanel.style.display === 'flex'; inp.poll(dt); let ix = inp.move.x, iy = inp.move.y; { const il0 = Math.hypot(ix, iy); if (il0 > 1) { ix /= il0; iy /= il0; } } const il = Math.hypot(ix, iy); if (me.dead > 0) { ix = iy = 0; }
    // story controls -> town actions
    camYaw -= inp.look.x; if (fp) fpPitch = clamp(fpPitch - inp.look.y, -1.2, 1.1); else camPitch = clamp(camPitch + inp.look.y * .5, .12, 1.0); inp.look.set(0, 0);
    if (inp.pressed('use')) wantUse = true; if (inp.pressed('reload')) wantAlt = true; if (inp.pressed('swap')) swapWeapon(); if (inp.pressed('gren')) toast('No grenades'); if (inp.pressed('view')) { fp = !fp; toast(fp ? 'First person' : 'Third person'); }
    if (inp.pressed('crouch')) { shim.state.crouch = !shim.state.crouch; } { const cb = $q("#tCrouch"), rb = $q("#tRun"); cb && cb.classList.toggle("on", shim.state.crouch); rb && rb.classList.toggle("on", !!inp.touchRun); } if (inp.pressed('atk') || inp.atk) wantHit = true; if (inp.pressed('jump') && !me.drv && me.y <= 0 && me.dead <= 0) jumpVy = 5.4; if (inp.pressed('roll') && !me.drv && roll <= 0 && me.dead <= 0) { roll = .55; }
    aimZoom = inp.aim; hitHeld = !!(inp.atk || inp.btn.atk); // while driving the FIRE button is the handbrake
    if (me.drv) { const g = drv.gas - (drv.brake && me.drv.v < .5 ? 1 : 0); if (g) iy = -g; if (drv.l || drv.r) ix = drv.r - drv.l; if (drv.brake && me.drv.v >= .5) hitHeld = true; }
    // interactions
    acts = me.dead > 0 ? [] : gather(); const prim = acts.find(a => !a.alt), alt = acts.find(a => a.alt);
    if (hold.act) { const cur = acts.find(a => a.label === hold.act.label); if (!chan || !cur || il > .4) { hold.act = null; hold.t = 0; chan = false; } else hold.act = cur; }
    if (wantUse) { wantUse = false; if (prim && !busy) { if (prim.dur) { hold.act = prim; hold.t = 0; chan = true; } else prim.run(); } }
    if (wantAlt) { wantAlt = false; if (alt && !busy) { if (alt.dur) { hold.act = alt; hold.t = 0; chan = true; } else alt.run(); } }
    if (hold.act) { hold.t += Math.min(rawDt, .6); if (hold.t >= hold.act.dur) { const a = hold.act; hold.act = null; hold.t = 0; chan = false; a.run(); } }
    { const showA = hold.act || prim || alt; const pe = $q('#prompt'); if (showA && !busy && !me.dead) { const a = hold.act || prim; let txt = a ? '✋ ' + a.label + (hold.act ? ' · ' + Math.round(Math.min(100, hold.t / hold.act.dur * 100)) + '%' : a.dur ? ' (hold ' + a.dur.toFixed(1) + 's)' : '') : ''; if (alt && !hold.act) txt += (txt ? '   ·   ' : '') + '⟳ ' + alt.label; pe.textContent = txt; } else pe.textContent = ''; }
    if (wantHit) { wantHit = false; if (!me.drv && !busy) swingHit(); } me.hitCd = Math.max(0, me.hitCd - dt); me.swing = Math.max(0, me.swing - dt * 3);
    // movement
    const c = me.drv; if (c) { c.update(dt, { gas: me.dead > 0 ? 0 : -iy, steer: ix, brake: hitHeld }, col, cars); me.x = c.x; me.z = c.z; me.ry = c.ry; me.sp = Math.abs(c.v) / 6; if (Z && Z.runOver && Math.abs(c.v) > 3.5) { const n = Z.runOver(c); if (n) { toast('Splat', .6); c.v *= .93; } } sendAcc += dt; if (sendAcc > .09) { sendAcc = 0; net.car(c.netState()); }
      if (c.fuel <= 0 && c.engine === false && c.stalled) { c.stalled = false; toast('Out of fuel! Find gas.', 3); } }
    else if (!busy) { const crouch = shim.state.crouch, run = (inp.run || (il > .95 && inp.touchRun)) && !crouch; const spd = crouch ? 1.6 : run ? 6.2 : 3.1; /* story v1.9.7 speeds */
      if (roll > 0 && me.dead <= 0) { roll -= dt; me.x += Math.sin(me.ry) * 6.5 * dt; me.z += Math.cos(me.ry) * 6.5 * dt; } else if (il > .05 && me.dead <= 0) { const fx = Math.sin(camYaw), fz = Math.cos(camYaw); const vx = (-iy) * fx + ix * (-fz), vz = (-iy) * fz + ix * fx; const vl = Math.hypot(vx, vz) || 1; me.x += vx / vl * spd * il * dt; me.z += vz / vl * spd * il * dt; me.ry = Math.atan2(vx, vz); }
      if (fp && !(roll > 0)) me.ry = camYaw; if (jumpVy !== 0 || me.y > 0) { jumpVy -= 14 * dt; me.y += jumpVy * dt; if (me.y <= 0) { me.y = 0; jumpVy = 0; } }
      let [px, pz] = col.push(me.x, me.z, .34); for (const k of cars) for (const [cx, cz] of k.circles()) { const dx = px - cx, dz = pz - cz, d = Math.hypot(dx, dz); if (d < k.rad + .34 && d > 1e-4) { px = cx + dx / d * (k.rad + .34); pz = cz + dz / d * (k.rad + .34); } } me.x = clamp(px, -BOUNDS.x + 3, BOUNDS.x - 3); me.z = clamp(pz, -BOUNDS.z + 3, BOUNDS.z - 3); sp.v += (il * (run ? 2 : crouch ? .6 : 1) - sp.v) * Math.min(1, dt * 8); me.sp = sp.v; }
    else { me.sp = 0; roll = 0; jumpVy = 0; me.y = 0; }
    for (const k of cars) { if (k !== c) { if (k.net && performance.now() - (k.netAt || 0) > 1500) { k.net = null; k.driver = null; k.engine = false; } k.update(dt, null, col, cars); } }
    me.av.root.visible = !c && !fp; me.av.root.rotation.order = 'YXZ'; me.av.root.position.set(me.x, me.y + (roll > 0 ? .45 : 0), me.z); me.av.root.rotation.y = me.ry; me.av.root.scale.y = shim.state.crouch && !c ? .82 : 1; animate(me.av, t, me.sp);
    if (me.swing > 0 && me.av.bones.RightArm) { const s = Math.sin(me.swing * Math.PI); me.av.bones.RightArm.rotateX?.(0); const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -s * 1.9); me.av.bones.RightArm.quaternion.premultiply(q); me.av.bones.RightForeArm && me.av.bones.RightForeArm.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -s * .6)); }
    if (me.dead > 0) { me.av.root.rotation.x = -1.4; me.av.root.position.y = .15; } else me.av.root.rotation.x = roll > 0 ? (1 - roll / .55) * Math.PI * 2 : 0;
    myTag.position.set(me.x, 1.95 + me.y, me.z); myTag.visible = !c && !fp;
    // doors animate
    for (const D of W.doors) { if (!D.installed) continue; const tg = D.target; if (Math.abs(D.open - tg) > .001) { D.open += Math.sign(tg - D.open) * dt * 2.2; if ((tg > D.open) === (D.open < tg) && Math.abs(D.open - tg) < .03) D.open = tg; D.pivot.rotation.y = D.swing * D.open * (D.state === 'broken' ? 1.95 : 1.55); }
      if (D.state === 'closing' && D.open <= .02) { D.state = 'closed'; D.open = 0; D.pivot.rotation.y = 0; col.set(D.col, true); } }
    // containers lid anim
    for (const k of W.containers) if (k.lid && k.opening) { k.opening = Math.min(2, k.opening + dt * 2); k.lid.rotation.y = -Math.min(1.5, (k.opening - 1) * 3); if (k.opening >= 1.5) k.opening = 0, k.lid.rotation.y = -1.5; }
    // remote players
    for (const [id, p] of net.peers) { const r = remotes.get(id); if (!r || !r.av || !p.s) continue; const s = p.s; r.x += (s.x - r.x) * Math.min(1, dt * 10); r.z += (s.z - r.z) * Math.min(1, dt * 10); r.ry += angDiff(r.ry, s.ry) * Math.min(1, dt * 10); r.sp += ((s.sp || 0) - r.sp) * Math.min(1, dt * 8); r.av.root.visible = !s.drv; r.av.root.position.set(r.x, 0, r.z); r.av.root.rotation.y = r.ry; animate(r.av, t + id.length, r.sp); r.tag.position.set(r.x, 1.95, r.z); r.tag.visible = !s.drv; }
    stAcc += dt; if (stAcc > .08) { stAcc = 0; net.state({ x: me.x, z: me.z, ry: me.ry, sp: me.sp, drv: c ? 1 : 0 }); }
    // zombies / nav
    navAcc += dt; if (navAcc > .45) { navAcc = 0; W.nav.field(me.x, me.z); } try { if (aud.ctx && aud.listen) aud.listen(cam, false); } catch (e) { /* ignore */ } perfLOD(dt); if (Z) { Z.update(dt, t); zombieLOD(); } updateLoot(W, dt);
    // roofs + camera
    const inb = insideB(me.x, me.z); for (const b of W.buildings) if (b.roof) b.roof.visible = b !== inb; W.closed.update(me.x, me.z);
    { const wantNear = fp && !c ? .06 : .1; if (cam.near !== wantNear) { cam.near = wantNear; cam.updateProjectionMatrix(); } } // first person: tight near plane, own avatar (head/hair/hat/face) is hidden above
    if (fp && !c) { const eye = new THREE.Vector3(me.x + Math.sin(camYaw) * .12, me.y + (shim.state.crouch ? 1.28 : 1.58), me.z + Math.cos(camYaw) * .12); camPos.copy(eye); cam.position.copy(eye); cam.lookAt(eye.x + Math.sin(camYaw) * Math.cos(fpPitch), eye.y + Math.sin(fpPitch), eye.z + Math.cos(camYaw) * Math.cos(fpPitch)); }
    else { const tgt = new THREE.Vector3(me.x, (c ? 1.5 : 1.45) + me.y, me.z); const pitch = c ? .36 : inb ? Math.max(camPitch, .85) : camPitch; const dd = (c ? 8.6 : inb ? 5.2 : camDist) * (aimZoom && !c ? .72 : 1); const yawEff = c ? me.ry : camYaw; if (c) camYaw = me.ry;
      // camera collision (camcol.js): tilt the arm up over cars/low walls, then shorten it; never ends inside cars, trucks, walls or pillars
      const arm = armSolve(W, cars, me.drv, tgt, yawEff, pitch, dd), dir = arm, dist = arm.dist, hit = arm.hit;
      const want = new THREE.Vector3(tgt.x + dir.x * dist, tgt.y + dir.y * dist, tgt.z + dir.z * dist); if (!camInit) { camPos.copy(want); camInit = true; } if (hit) camPos.copy(want); else camPos.lerp(want, Math.min(1, dt * (c ? 5 : 9))); cam.position.copy(camPos); cam.lookAt(tgt); }
    sun.position.set(me.x + 36, 60, me.z + 28); sun.target.position.set(me.x, 0, me.z); sun.target.updateMatrixWorld();
    // HUD
    { const hb = $q('#hpb i'); if (hb) hb.style.width = me.hp + '%'; $q('#hpTxt').textContent = `Health : ${Math.ceil(me.hp)}  ·  $${bag.count('cash')}  ·  ${bag.weight.toFixed(0)}/${bag.cap}kg`; $q('#ammoTxt').textContent = c ? `${c.kind || 'Car'}  ·  ${Math.round(c.fuel)} L` : (n => n.charAt(0).toUpperCase() + n.slice(1))(bag.best().name); { const ta = $q('#tAtk'); if (ta) ta.textContent = 'HIT'; } const ob = $q('#obj'); ob.innerHTML = `<b>QUIET FALLS</b><span>${online ? 'Online' : 'Solo'} · Players ${net.peers.size + 1}${Z ? ` · Zombies ${Z.stats().alive}` : ''}</span>`;
      document.body.classList.toggle('driving', !!c); driveEl && driveEl.classList.toggle('hidden', !c); gaugeC.style.display = c ? 'block' : 'none'; if (c) drawGauge(gaugeC, c.fuelFrac, Math.abs(c.v) * 3.6, c.fuelFrac < .15, t); const tu = $q('#tUse'); if (tu && !SET.hudv2) tu.textContent = '✋'; }
    minAcc += dt; if (minAcc > .12) { minAcc = 0; drawMini(); }
    renderer.render(scene, cam);
  }
  net.onHello = async p => { let r = remotes.get(p.id); if (!r) { r = { id: p.id, x: 0, z: 0, ry: 0, sp: 0 }; remotes.set(p.id, r); } if (!p.look) return; const av = await mkAvatar(p.look); if (r.av) { scene.remove(r.av.root); r.av.dispose(); } r.av = av; scene.add(av.root); if (r.tag) scene.remove(r.tag); r.tag = nameTag(p.name || 'Player'); scene.add(r.tag); };
  net.onLeave = p => { const r = remotes.get(p.id); if (r) { r.av && (scene.remove(r.av.root), r.av.dispose()); r.tag && scene.remove(r.tag); remotes.delete(p.id); } };
  function exit(edit) { running = false; removeEventListener('keydown', kd); shim.onPause = oldPause; shim.state.crouch = false; for (const [e, , up] of drvBind.filter(Boolean)) e.classList.remove('on'); for (const [e, d] of saved) e.style.display = d; glEl && (glEl.style.display = ''); hudr2.remove(); document.body.classList.remove('driving'); driveEl && driveEl.classList.add('hidden'); hudEl.classList.add('hidden'); touchEl.classList.add('hidden'); stage.classList.add('hidden'); net.close(); renderer.dispose(); root.remove(); delete window.__mpTown; delete window.__mpLobby; if (edit === true) { import('../creator.js').then(m => m.openCreator({ onClose: onExit, onPlay: l => enterTown({ look: l, onExit }) })).then(c => { window.__mpCreator = c; }); } else onExit && onExit(); }
  W.closed.update(me.x, me.z); renderer.compile(scene, cam);
  const api = { W, me, net, cars, bag, gather, scene, cam, remotes, get Z() { return Z; }, inp, shim, acts: () => acts.map(a => a.label), toast, hurt,
    setPos: (x, z) => { me.x = x; me.z = z; camInit = false; }, key: (k, v) => { inp.keys[k] = v; }, camYaw: v => { camYaw = v; }, setCam: (yaw, pitch, dist) => { if (yaw != null) camYaw = yaw; if (pitch != null) camPitch = pitch; if (dist != null) camDist = dist; }, use: () => { wantUse = true; }, useHold: (v) => { if (v) wantUse = true; }, alt: () => { wantAlt = true; }, hit: () => { wantHit = true; }, enter: car => enterCar(car), exitCar, peers: () => net.peers.size, setDoor, openLoot, closePanel, togglePanel, take, lootOf, buyDoor, noise, brakes: v => { hitHeld = v; }, stats: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, closedShown: W.closed.shown, closedHi: W.closed.shownHi }), renderer };
  window.__mpTown = api; window.__mpLobby = api; requestAnimationFrame(frame); return api;
}
