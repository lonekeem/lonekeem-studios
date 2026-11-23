// v1.9.66 Quiet Falls free-roam activities: daily challenges that pay cash, town jobs all over the map (clear-outs, deliveries,
// drives, scavenges, a hold-out), a claimable safe house with doorway barricades + traps, a horde night that ends with a boss,
// and a first-visit tutorial. Local to each player (no lobby traffic). Cash goes into the shared wallet (bag 'cash' -> save).
import * as THREE from 'three';
import { el } from './ui.js';

const DAY = () => new Date().toISOString().slice(0, 10); // UTC date: everyone gets the same three challenges
const hsh = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const LS = { get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } } };
const mmss = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

// ---------- places ----------
const P = { field: [-136, -104, 'Falls Field'], yard: [136, -100, 'the Freight Yard'], hosp: [-136, -30, 'Quiet Falls General'], farm: [186, 26, 'Hollis Farm'], main: [-60, 142, 'Main Street'],
  mainE: [44, 142, 'Fix-It Hardware'], hall: [0, 142, 'Town Hall'], fire: [110.5, 56, 'Fire Station 1'], police: [110.5, 40, 'the Police Station'], tower: [17.6, 104, 'the Water Tower'],
  gas: [46, -10, 'the gas station'], school: [0, -64, 'Quiet Falls School'], park: [0, 66, 'Willow Park'], store: [-6, 28, 'the corner store'] };
// ---------- daily challenge pool ----------
const DAILY = [
  { k: 'kill', n: [18, 30], pay: [160, 260], t: n => `Put down ${n} zombies` },
  { k: 'nightKill', n: [8, 14], pay: [200, 300], t: n => `Kill ${n} zombies at night` },
  { k: 'drive', n: [1500, 3000], pay: [140, 240], t: n => `Drive ${(n / 1000).toFixed(1)} km` },
  { k: 'loot', n: [6, 10], pay: [120, 200], t: n => `Search ${n} cars, crates or cabinets` },
  { k: 'jobs', n: [2, 3], pay: [220, 320], t: n => `Finish ${n} town jobs` },
  { k: 'visit', n: [3, 4], pay: [120, 180], t: n => `Visit ${n} landmarks` },
  { k: 'barricade', n: [2, 3], pay: [120, 180], t: n => `Build ${n} barricades` },
  { k: 'trapKill', n: [3, 5], pay: [150, 220], t: n => `Kill ${n} zombies with traps` },
];
const LANDMARKS = ['main', 'hosp', 'yard', 'field', 'farm', 'civic', 'tower'];
// ---------- town jobs ----------
const JOBS = [
  { id: 'clr-field', type: 'clear', at: 'field', n: 8, pay: 220, name: 'Falls Field cleanup', desc: 'Clear the dead off the football field.' },
  { id: 'clr-yard', type: 'clear', at: 'yard', n: 10, pay: 260, name: 'Freight Yard sweep', desc: 'Something is moving between the containers.' },
  { id: 'clr-hosp', type: 'clear', at: 'hosp', n: 8, pay: 240, name: 'Hospital parking lot', desc: 'Make the ER bay safe for the ambulances.' },
  { id: 'clr-farm', type: 'clear', at: 'farm', n: 7, pay: 200, name: 'Trouble at Hollis Farm', desc: 'The barn is surrounded.' },
  { id: 'clr-main', type: 'clear', at: 'main', n: 9, pay: 230, name: 'Main Street patrol', desc: 'Clear the shops before the survivors come out.' },
  { id: 'clr-school', type: 'clear', at: 'school', n: 8, pay: 220, name: 'School yard', desc: 'The school bus is blocked in.' },
  { id: 'dlv-meds', type: 'deliver', at: 'hosp', to: 'fire', time: 150, pay: 180, name: 'Meds run', desc: 'Take a med kit from the hospital to the fire station.' },
  { id: 'dlv-parts', type: 'deliver', at: 'yard', to: 'mainE', time: 190, pay: 200, name: 'Spare parts', desc: 'Bring engine parts to Fix-It Hardware.' },
  { id: 'dlv-food', type: 'deliver', at: 'main', to: 'hall', time: 100, pay: 150, name: 'Groceries', desc: 'Carry food to the shelter in the Town Hall.' },
  { id: 'dlv-fuel', type: 'deliver', at: 'gas', to: 'farm', time: 180, pay: 220, name: 'Fuel for the farm', desc: 'Hollis Farm needs gas for the generator.' },
  { id: 'dlv-radio', type: 'deliver', at: 'police', to: 'tower', time: 150, pay: 170, name: 'Radio batteries', desc: 'The relay on the water tower is dying.' },
  { id: 'drv-amb', type: 'drive', at: 'hosp', need: 'ambulance', route: ['fire', 'hall', 'hosp'], time: 170, pay: 280, name: 'Ambulance run', desc: 'Take an ambulance to the fire station and the Town Hall, then back.' },
  { id: 'drv-loop', type: 'drive', at: 'gas', route: [[168, 136], [168, -136], [-168, -136], [-168, 136], [24, 136]], time: 160, pay: 260, name: 'Outer road patrol', desc: 'Drive the whole outer road. Any car works.' },
  { id: 'drv-main', type: 'drive', at: 'main', route: [[98, 136], [-98, 136]], time: 55, pay: 150, name: 'Main Street sprint', desc: 'End to end and back, fast.' },
  { id: 'col-radio', type: 'collect', at: 'yard', n: 5, r: 22, time: 150, pay: 200, name: 'Radio parts', desc: 'Find 5 radio parts around the Freight Yard.' },
  { id: 'col-sup', type: 'collect', at: 'park', n: 5, r: 18, time: 140, pay: 180, name: 'Lost supplies', desc: 'A supply drop scattered over Willow Park.' },
  { id: 'hold-tower', type: 'hold', at: 'tower', time: 70, pay: 280, name: 'Hold the water tower', desc: 'Stay near the tower while the radio calls for help.' },
];
const REPEAT_S = 600; // a finished job comes back after 10 minutes

export function townActivities({ scene, W, Z, me, cars, bag, toast, aud, dn, col, root, save, insideB, solo, cam }) {
  const freeSpot = (x, z, r = .7) => { if (!col.hit(x, z, r)) return [x, z]; for (let k = 1; k < 30; k++) { const a = k * 2.4, d = .8 * k; const nx = x + Math.cos(a) * d, nz = z + Math.sin(a) * d; if (!col.hit(nx, nz, r)) return [nx, nz]; } return [x, z]; };
  const place = (key) => { const p = Array.isArray(key) ? key : P[key]; const f = freeSpot(p[0], p[1]); return { x: f[0], z: f[1], name: Array.isArray(key) ? 'the checkpoint' : P[key][2] }; };
  const pay = (n, why) => { n = Math.round(n); bag.add('cash', n); try { save(); } catch (e) { /* wallet */ } toast(`+$${n} · ${why}`, 2.6); try { aud.play && aud.play('coins', { vol: .6, flat: true }); } catch (e) { /* sfx */ } };
  // ---------- beacons (one instanced draw for every job start, one mesh for the active target) ----------
  const beamG = new THREE.CylinderGeometry(.55, .9, 60, 12, 1, true); beamG.translate(0, 30, 0); { const p = beamG.attributes.position, a = new Float32Array(p.count); for (let i = 0; i < p.count; i++) a[i] = 1 - p.getY(i) / 60; beamG.setAttribute('fade', new THREE.BufferAttribute(a, 1)); }
  const beamM = (c) => new THREE.ShaderMaterial({ uniforms: { uC: { value: new THREE.Color(c) }, uT: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: 'attribute float fade; varying float vF; varying vec3 vN; varying vec3 vV; void main(){ vF = fade; vec4 mv = modelViewMatrix * vec4(position,1.);\n#ifdef USE_INSTANCING\n mv = modelViewMatrix * instanceMatrix * vec4(position,1.);\n#endif\n vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uC; uniform float uT; varying float vF; varying vec3 vN; varying vec3 vV; void main(){ float rim = pow(abs(dot(normalize(vN), normalize(vV))), 1.2); gl_FragColor = vec4(uC * pow(vF, 2.2) * rim * (.5 + .12 * sin(uT * 3.)), 1.); }' });
  const startM = beamM('#ffb43a'), tgtM = beamM('#5cff8a');
  const starts = new THREE.InstancedMesh(beamG, startM, JOBS.length); starts.frustumCulled = false; starts.renderOrder = 4; scene.add(starts);
  const tgt = new THREE.Mesh(beamG, tgtM); tgt.frustumCulled = false; tgt.visible = false; tgt.renderOrder = 4; scene.add(tgt);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.1, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: .7, depthWrite: false, fog: false })); ring.position.y = .07; ring.visible = false; scene.add(ring);
  const jobPos = {}; for (const j of JOBS) jobPos[j.id] = place(j.at);
  // v1.9.72 job guide arrow (like Kemy's): a glowing chevron floating above you (on foot or in a car) that turns toward the job target, + distance
  const arrowG = (() => { const s = new THREE.Shape(); s.moveTo(0, .95); s.lineTo(.62, .05); s.lineTo(.24, .18); s.lineTo(.24, -.7); s.lineTo(-.24, -.7); s.lineTo(-.24, .18); s.lineTo(-.62, .05); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: .14, bevelEnabled: false }); g.translate(0, 0, -.07); g.rotateX(-Math.PI / 2); return g; })(); // points +Z after the rotation? (+Y shape -> -Z); flipped below
  const arrow = new THREE.Mesh(arrowG, new THREE.MeshBasicMaterial({ color: '#5cff8a', transparent: true, opacity: .92, depthTest: false, depthWrite: false, fog: false })); arrow.renderOrder = 30; arrow.frustumCulled = false; arrow.visible = false; scene.add(arrow);
  const arrowTxt = el('div', {}); arrowTxt.style.cssText = 'position:absolute;left:0;top:0;transform:translate(-50%,-100%);z-index:7;pointer-events:none;color:#c9ffd8;font:800 12px system-ui,sans-serif;text-shadow:0 1px 3px #000,0 0 6px #000;white-space:nowrap;display:none'; root.append(arrowTxt);
  const _av = new THREE.Vector3();
  function arrowUpdate() { let t = st.job && st.job.target; if (!t && !st.job && st.track && jobPos[st.track]) t = jobPos[st.track]; const d = t ? Math.hypot(t.x - me.x, t.z - me.z) : 0;
    if (!t || d < 5 || me.dead > 0) { arrow.visible = false; arrowTxt.style.display = 'none'; return; }
    const y = me.drv ? 2.5 : .5, bob = Math.sin(performance.now() / 260) * .06, ux = (t.x - me.x) / d, uz = (t.z - me.z) / d, lead = me.drv ? 0 : 1.7; /* on foot: a chevron on the ground just ahead of you (the close camera hides anything above your head) */ arrow.visible = true; arrow.position.set(me.x + ux * lead, y + bob, me.z + uz * lead); arrow.rotation.set(0, Math.atan2(t.x - me.x, t.z - me.z) + Math.PI, 0); arrow.scale.setScalar(me.drv ? .75 : .45);
    if (cam) { _av.set(arrow.position.x, y + .45, arrow.position.z).project(cam); if (_av.z < 1) { arrowTxt.style.display = ''; arrowTxt.style.left = ((_av.x + 1) / 2 * innerWidth).toFixed(0) + 'px'; arrowTxt.style.top = ((1 - _av.y) / 2 * innerHeight).toFixed(0) + 'px'; arrowTxt.textContent = (d >= 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m'); } else arrowTxt.style.display = 'none'; } }
  // ---------- state ----------
  const st = { job: null, track: null, done: LS.get('atq.town.jobs', {}), daily: null, safe: LS.get('atq.town.safe', null), traps: LS.get('atq.town.traps', { spike: 1, snare: 1 }), visited: {}, horde: { night: false, boss: null, bossDone: false, waveT: 0, lastP: null } };
  const loadDaily = () => { const d = LS.get('atq.town.daily', null); const day = DAY(); if (d && d.day === day) return d; const r = (() => { let s = hsh(day); return () => { s = Math.imul(s ^ (s >>> 15), 2246822507) >>> 0; s ^= s >>> 13; return (s >>> 0) / 4294967296; }; })();
    const pool = DAILY.slice(); const list = []; while (list.length < 3) { const t = pool.splice(Math.floor(r() * pool.length), 1)[0]; const n = Math.round(t.n[0] + r() * (t.n[1] - t.n[0])); const pc = Math.round((t.pay[0] + r() * (t.pay[1] - t.pay[0])) / 10) * 10; list.push({ k: t.k, n: t.k === 'drive' ? Math.round(n / 100) * 100 : n, pay: pc, got: 0, paid: false }); }
    return { day, list, bonus: false }; };
  st.daily = loadDaily(); const saveDaily = () => LS.set('atq.town.daily', st.daily);
  const bump = (k, v = 1) => { if (st.daily.day !== DAY()) st.daily = loadDaily(); let ch = false; for (const c of st.daily.list) { if (c.k !== k || c.paid) continue; c.got = Math.min(c.n, c.got + v); ch = true; if (c.got >= c.n) { c.paid = true; pay(c.pay, 'Daily: ' + dailyText(c)); } } if (ch) { if (!st.daily.bonus && st.daily.list.every(c => c.paid)) { st.daily.bonus = true; pay(250, 'All 3 dailies done'); } saveDaily(); refreshPanel(); } };
  const dailyText = c => DAILY.find(t => t.k === c.k).t(c.n);
  // ---------- HUD: objective line + Jobs panel ----------
  const obj = el('div', { cls: 'actObj' }); obj.style.cssText = 'position:absolute;top:136px;right:12px;max-width:min(34vw,300px);text-align:right;padding:4px 10px;border-radius:10px;background:#0d1418cc;border:1px solid #f0b44a88;color:#f5ecd8;font:600 12px/1.3 system-ui,sans-serif;text-align:center;z-index:7;pointer-events:none;display:none'; root.append(obj);
  const panel = el('div', { cls: 'actPanel' }); panel.style.cssText = 'position:fixed;inset:6vh 8vw;background:#10181ded;border:1px solid #f0b44a66;border-radius:14px;color:#efe7d6;font:13px/1.35 system-ui,sans-serif;z-index:75;display:none;flex-direction:column;overflow:hidden'; document.body.append(panel); /* above the touch HUD */
  const css = el('style', {}, `.actPanel h4{margin:10px 0 4px;color:#f0b44a;font-size:13px;letter-spacing:.5px}.actPanel .aprow{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;background:#ffffff0d;margin:4px 0}.actPanel .aprow .apg{flex:1}.actPanel .apbar{height:5px;border-radius:3px;background:#ffffff22;margin-top:3px;overflow:hidden}.actPanel .apbar i{display:block;height:100%;background:#5cd47a}.actPanel button{background:#f0b44a;color:#1b1206;border:0;border-radius:8px;padding:6px 10px;font-weight:700;font-size:12px}.actPanel button.apghost{background:#ffffff1a;color:#efe7d6}.actPanel .apsub{opacity:.72;font-size:11.5px}.actPanel .appay{color:#9be37a;font-weight:700;white-space:nowrap}`); root.append(css);
  let panelOn = false; const body = el('div', {}); body.style.cssText = 'overflow:auto;padding:4px 14px 14px;flex:1';
  const head = el('div', {}); head.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #ffffff1a';
  const closeB = el('button', { on: { click: () => openPanel(false) } }, 'Close'); head.append(el('b', {}, 'Jobs & challenges'), el('span', { cls: 'apsub' }, 'Cash goes to your wallet'), el('span', {}), closeB); head.children[2].style.flex = '1'; panel.append(head, body);
  ['touchstart', 'pointerdown', 'mousedown'].forEach(t => panel.addEventListener(t, e => e.stopPropagation(), { passive: true }));
  function refreshPanel() { if (!panelOn) return; body.innerHTML = ''; const now = Date.now() / 1000;
    body.append(el('h4', {}, 'DAILY CHALLENGES · new ones every day'));
    for (const c of st.daily.list) { const r = el('div', { cls: 'aprow' }); const g = el('div', { cls: 'apg' }, el('div', {}, (c.paid ? '✅ ' : '') + dailyText(c)), el('div', { cls: 'apsub' }, c.k === 'drive' ? `${(c.got / 1000).toFixed(2)} / ${(c.n / 1000).toFixed(1)} km` : `${c.got} / ${c.n}`)); const bar = el('div', { cls: 'apbar' }, el('i', {})); bar.firstChild.style.width = Math.round(100 * c.got / c.n) + '%'; g.append(bar); r.append(g, el('span', { cls: 'appay' }, '$' + c.pay)); body.append(r); }
    body.append(el('div', { cls: 'apsub' }, st.daily.bonus ? 'Bonus $250 collected for finishing all three.' : 'Finish all three for a $250 bonus.'));
    body.append(el('h4', {}, 'TOWN JOBS · follow the orange beams'));
    if (st.job) { const j = st.job.def; const r = el('div', { cls: 'aprow' }, el('div', { cls: 'apg' }, el('div', {}, '▶ ' + j.name), el('div', { cls: 'apsub' }, st.job.status || j.desc)), el('button', { cls: 'apghost', on: { click: () => { endJob(false, 'Job dropped'); refreshPanel(); } } }, 'Drop')); body.append(r); }
    const list = JOBS.map(j => ({ j, d: Math.hypot(jobPos[j.id].x - me.x, jobPos[j.id].z - me.z), wait: Math.max(0, (st.done[j.id] || 0) + REPEAT_S - now) })).sort((a, b) => a.d - b.d);
    for (const { j, d, wait } of list) { if (st.job && st.job.def === j) continue; const r = el('div', { cls: 'aprow' }); r.append(el('div', { cls: 'apg' }, el('div', {}, j.name + (wait ? ' · back in ' + mmss(wait) : '')), el('div', { cls: 'apsub' }, `${j.desc} · ${Math.round(d)} m · at ${jobPos[j.id].name}`)), el('span', { cls: 'appay' }, '$' + j.pay));
      const tb = el('button', { cls: st.track === j.id ? '' : 'apghost', on: { click: () => { st.track = st.track === j.id ? null : j.id; refreshPanel(); } } }, st.track === j.id ? 'Tracking' : 'Track'); r.append(tb); body.append(r); }
    body.append(el('h4', {}, 'SAFE HOUSE & TRAPS'));
    const sb = st.safe && W.buildings.find(b => (b.cfg && b.cfg.id) === st.safe);
    body.append(el('div', { cls: 'aprow' }, el('div', { cls: 'apg' }, el('div', {}, sb ? 'Your safe house is marked with a green house on the map. You respawn there.' : 'No safe house yet. Go inside any house and choose “Make this my safe house”.'), el('div', { cls: 'apsub' }, 'Barricade doorways ($30) at any building. Zombies have to smash through them. Traps hurt anything that walks over them.'))));
    const buyRow = (k, name, price, txt) => body.append(el('div', { cls: 'aprow' }, el('div', { cls: 'apg' }, el('div', {}, `${name} · you have ${st.traps[k] | 0}`), el('div', { cls: 'apsub' }, txt)), el('button', { on: { click: () => { if (bag.count('cash') < price) { toast('Not enough cash'); return; } bag.remove('cash', price); save(); st.traps[k] = (st.traps[k] | 0) + 1; LS.set('atq.town.traps', st.traps); refreshPanel(); } } }, `Buy $${price}`)));
    buyRow('spike', 'Spike trap', 40, 'Planks full of nails. Hurts every zombie that walks over it (12 hits).'); buyRow('snare', 'Snare trap', 60, 'Grabs one zombie, holds it for 4 seconds and hurts it badly. Re-arms itself 3 times.');
    body.append(el('div', { cls: 'apsub' }, 'Traps go down from the hand button near your safe house or a barricade.'));
    body.append(el('h4', {}, 'HORDE NIGHT'), el('div', { cls: 'apsub' }, 'Every night the dead come in waves. Just before sunrise a huge boss zombie shows up. Bring it down for $500.'));
    const tb = el('button', { cls: 'apghost', on: { click: () => { openPanel(false); TUT.start(true); } } }, 'Replay the tutorial'); tb.style.marginTop = '10px'; body.append(tb); }
  function openPanel(on = !panelOn) { panelOn = on; panel.style.display = on ? 'flex' : 'none'; if (on) { refreshPanel(); TUT.ev('panel'); } }
  // ---------- jobs ----------
  const pickups = []; const pkM = new THREE.MeshStandardMaterial({ color: '#ffd166', emissive: '#ffb43a', emissiveIntensity: 1.2, roughness: .5 }); const pkG = new THREE.BoxGeometry(.5, .35, .5);
  function startJob(j) { if (st.job) return; const s = { def: j, t: 0, left: j.time || 0, spawned: [], step: 0, got: 0, status: '' }; st.job = s; st.track = null; const p = jobPos[j.id];
    if (j.type === 'clear') { for (let i = 0; i < j.n; i++) { const a = i / j.n * 6.283 + Math.random(), d = 10 + Math.random() * 12; const f = freeSpot(p.x + Math.cos(a) * d, p.z + Math.sin(a) * d, .5); const c = Z && Z.spawnAt(f[0], f[1], {}); if (c) { c.mission = true; s.spawned.push(c); } } s.status = `Kill the ${s.spawned.length} zombies around ${p.name}`; }
    if (j.type === 'deliver') { s.dest = place(j.to); s.status = `Get to ${s.dest.name}`; }
    if (j.type === 'drive') { s.route = j.route.map(k => place(k)); s.status = j.need ? `Get in an ambulance (the hospital has two)` : 'Get in a car and drive through the green beams'; }
    if (j.type === 'collect') { for (let i = 0; i < j.n; i++) { const a = Math.random() * 6.283, d = 4 + Math.random() * j.r; const f = freeSpot(p.x + Math.cos(a) * d, p.z + Math.sin(a) * d, .5); const m = new THREE.Mesh(pkG, pkM); m.position.set(f[0], .4, f[1]); scene.add(m); pickups.push(m); } s.status = `Find the ${j.n} glowing boxes`; }
    if (j.type === 'hold') { s.status = 'Stay near the tower'; s.waveT = 2; }
    toast('Job started: ' + j.name, 2.4); try { aud.play && aud.play('coins', { vol: .25, flat: true }); } catch (e) { /* sfx */ } refreshPanel(); }
  function endJob(ok, msg) { const s = st.job; if (!s) return; st.job = null; for (const m of pickups.splice(0)) scene.remove(m); tgt.visible = false; ring.visible = false;
    if (ok) { st.done[s.def.id] = Date.now() / 1000; LS.set('atq.town.jobs', st.done); pay(s.def.pay, 'Job done: ' + s.def.name); bump('jobs'); } else if (msg) toast(msg, 2.4); refreshPanel(); }
  function jobUpdate(dt) { const s = st.job; if (!s) return; const j = s.def; s.t += dt; if (j.time) { s.left -= dt; if (s.left <= 0) { endJob(false, 'Out of time: ' + j.name); return; } }
    let target = null;
    if (j.type === 'clear') { const left = s.spawned.filter(c => !c.dead).length; s.status = left ? `Kill the zombies at ${jobPos[j.id].name}: ${left} left` : ''; if (!left) { endJob(true); return; } let best = null, bd = 1e9; for (const c of s.spawned) { if (c.dead) continue; const q = c.root.position, d = Math.hypot(q.x - me.x, q.z - me.z); if (d < bd) { bd = d; best = { x: q.x, z: q.z }; } } if (bd > 25) target = best; }
    if (j.type === 'deliver') { target = s.dest; s.status = `Deliver to ${s.dest.name}`; if (Math.hypot(s.dest.x - me.x, s.dest.z - me.z) < 4.5) { endJob(true); return; } }
    if (j.type === 'drive') { const c = me.drv; if (!c || (j.need && c.kind !== j.need)) { s.status = j.need ? 'Get in an ambulance' : 'Get in a car'; target = j.need && !c ? (cars.filter(k => k.kind === j.need).sort((a, b) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(b.x - me.x, b.z - me.z))[0] || null) : null; }
      else { const cp = s.route[s.step]; target = cp; s.status = `Checkpoint ${s.step + 1} of ${s.route.length}: ${cp.name}`; if (Math.hypot(cp.x - me.x, cp.z - me.z) < 8) { s.step++; try { aud.play && aud.play('coins', { vol: .3, flat: true }); } catch (e) { /* sfx */ } if (s.step >= s.route.length) { endJob(true); return; } } } }
    if (j.type === 'collect') { for (let i = pickups.length - 1; i >= 0; i--) { const m = pickups[i]; m.rotation.y += dt * 1.5; m.position.y = .45 + Math.sin(s.t * 3 + i) * .1; if (Math.hypot(m.position.x - me.x, m.position.z - me.z) < 1.6 && !me.drv) { scene.remove(m); pickups.splice(i, 1); s.got++; toast(`Found ${s.got} of ${j.n}`, 1.2); } }
      if (!pickups.length) { endJob(true); return; } s.status = `Find the glowing boxes: ${j.n - s.got} left`; let bd = 1e9; for (const m of pickups) { const d = Math.hypot(m.position.x - me.x, m.position.z - me.z); if (d < bd) { bd = d; target = { x: m.position.x, z: m.position.z }; } } if (bd < 20) target = null; }
    if (j.type === 'hold') { const p = jobPos[j.id], d = Math.hypot(p.x - me.x, p.z - me.z); if (d > 16) { target = p; s.status = 'Get back to the water tower!'; s.left += dt * .5; } else { s.status = 'Hold the tower'; s.waveT -= dt; if (s.waveT <= 0) { s.waveT = 11; for (let i = 0; i < 3; i++) { const a = Math.random() * 6.283; const f = freeSpot(p.x + Math.cos(a) * 26, p.z + Math.sin(a) * 26, .5); const c = Z && Z.spawnAt(f[0], f[1], {}); if (c) { c.mission = true; c.st = 'chase'; } } } }
      if (s.left <= .05) { endJob(true); return; } }
    if (target) { tgt.visible = true; tgt.position.set(target.x, 0, target.z); ring.visible = true; ring.position.set(target.x, .07, target.z); } else { tgt.visible = false; ring.visible = false; }
    s.target = target; }
  // ---------- safe house, barricades, traps ----------
  const bars = []; const plankM = W.M && W.M.plank || new THREE.MeshStandardMaterial({ color: '#8a6a48' });
  function buildBar(D) { if (bars.some(b => b.D === D)) return; const g = new THREE.Group(); g.position.set(D.x, 0, D.z); g.rotation.y = D.ang || 0; const w = (D.ww || 1.2) + .3;
    for (const [y, r] of [[.45, .12], [1.05, -.1], [1.65, .08]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(w, .22, .07), plankM); p.position.set(0, y, .16); p.rotation.z = r; p.castShadow = true; g.add(p); const q = p.clone(); q.position.z = -.16; g.add(q); }
    scene.add(g); const ax = Math.abs(Math.cos(D.ang || 0)) > .5; const hw = w / 2; const r = ax ? [D.x - hw, D.x + hw, D.z - .25, D.z + .25] : [D.x - .25, D.x + .25, D.z - hw, D.z + hw];
    const c = col.add(r[0], r[1], r[2], r[3], 'barricade', false); c.active = true; /* not in the nav grid: the dead walk up to it and smash it */ bars.push({ D, g, c, hp: 100, x: D.x, z: D.z }); bump('barricade'); TUT.ev('barricade'); }
  function dropBar(b, broke) { scene.remove(b.g); b.c.active = false; bars.splice(bars.indexOf(b), 1); if (broke) { toast('A barricade broke!', 2); try { aud.play && aud.play('chop', { vol: .8, pos: { x: b.x, y: 1, z: b.z } }); } catch (e) { /* sfx */ } } }
  const traps = []; const spikeG = (() => { const gs = []; const base = new THREE.BoxGeometry(1.4, .06, 1.4); base.translate(0, .03, 0); gs.push(base); return base; })();
  const trapM = { spike: new THREE.MeshStandardMaterial({ color: '#6e5a40', roughness: .9 }), nail: new THREE.MeshStandardMaterial({ color: '#b9bec2', metalness: .7, roughness: .35 }), snare: new THREE.MeshStandardMaterial({ color: '#5b6066', metalness: .6, roughness: .4 }) };
  function placeTrap(k) { if ((st.traps[k] | 0) < 1) return; st.traps[k]--; LS.set('atq.town.traps', st.traps); const fx = Math.sin(me.ry), fz = Math.cos(me.ry); const x = me.x + fx * 1.4, z = me.z + fz * 1.4; const g = new THREE.Group(); g.position.set(x, 0, z);
    if (k === 'spike') { g.add(new THREE.Mesh(spikeG, trapM.spike)); const ng = new THREE.ConeGeometry(.035, .22, 4); for (let i = 0; i < 16; i++) { const n = new THREE.Mesh(ng, trapM.nail); n.position.set(-.55 + (i % 4) * .37, .14, -.55 + Math.floor(i / 4) * .37); g.add(n); } }
    else { const t = new THREE.Mesh(new THREE.TorusGeometry(.42, .05, 6, 18).rotateX(Math.PI / 2), trapM.snare); t.position.y = .06; g.add(t); for (let i = 0; i < 10; i++) { const n = new THREE.Mesh(new THREE.ConeGeometry(.03, .14, 4), trapM.nail); const a = i / 10 * 6.283; n.position.set(Math.cos(a) * .42, .13, Math.sin(a) * .42); g.add(n); } }
    scene.add(g); traps.push({ k, g, x, z, uses: k === 'spike' ? 12 : 3, hold: null, holdT: 0, cd: 0 }); toast(k === 'spike' ? 'Spike trap placed' : 'Snare trap placed', 1.4); refreshPanel(); }
  function trapUpdate(dt) { if (!Z) return; for (let i = traps.length - 1; i >= 0; i--) { const t = traps[i]; t.cd -= dt;
      if (t.hold) { const q = t.hold; t.holdT -= dt; if (q.dead || t.holdT <= 0) { t.hold = null; } else { q.root.position.x += (t.x - q.root.position.x) * .5; q.root.position.z += (t.z - q.root.position.z) * .5; } continue; }
      for (const q of Z.zombies) { if (q.dead || q.boss && t.k === 'snare') continue; const p = q.root.position; if (Math.hypot(p.x - t.x, p.z - t.z) > (t.k === 'spike' ? .95 : .6)) continue;
        if (t.k === 'spike') { if ((q._spk || 0) > performance.now()) continue; q._spk = performance.now() + 700; const k = Z.hurt(q, 34, { x: 0, z: 0 }, {}); t.uses--; if (k) bump('trapKill'); }
        else if (t.cd <= 0) { t.hold = q; t.holdT = 4; t.cd = 6; t.uses--; const k = Z.hurt(q, 70, { x: 0, z: 0 }, {}); if (k) bump('trapKill'); try { aud.play && aud.play('chop', { vol: .7, pos: { x: t.x, y: .5, z: t.z } }); } catch (e) { /* sfx */ } }
        if (t.uses <= 0) break; }
      if (t.uses <= 0 && !t.hold) { scene.remove(t.g); traps.splice(i, 1); } } }
  function barUpdate(dt) { if (!Z) return; for (const b of bars.slice()) { let n = 0; for (const q of Z.zombies) { if (q.dead) continue; const p = q.root.position; if (Math.hypot(p.x - b.x, p.z - b.z) < 1.5) n += q.tank ? 3 : 1; } if (n) { b.hp -= n * 1.6 * Math.min(dt, .1); b.g.position.y = Math.sin(performance.now() / 40) * .01 * Math.min(3, n); if (b.hp <= 0) dropBar(b, true); } } }
  // ---------- horde night + boss ----------
  const bossBar = el('div', {}); bossBar.style.cssText = 'position:absolute;top:47px;left:50%;transform:translateX(-50%);width:min(34vw,320px);z-index:7;display:none;pointer-events:none;color:#ffd9c9;font:700 11px system-ui,sans-serif;text-align:center;text-shadow:0 1px 2px #000';
  const bossFill = el('i', {}); bossFill.style.cssText = 'display:block;height:100%;width:100%;background:linear-gradient(90deg,#b3261e,#ff6a3d);border-radius:4px'; const bossTrack = el('div', {}, bossFill); bossTrack.style.cssText = 'height:8px;background:#0008;border:1px solid #ff6a3d88;border-radius:5px;margin-top:3px'; bossBar.append(el('div', {}, 'THE BUTCHER · horde boss'), bossTrack); root.append(bossBar);
  let baseTarget = Z && Z.target || 12;
  function hordeUpdate(dt) { if (!Z || solo === 'mission') return; const S = dn && dn.state || {}; const p = S.p ?? .5; const night = (S.nightK || 0) > .6; const H = st.horde;
    if (night && !H.night) { H.night = true; H.bossDone = false; H.waveT = 20; H.nightT = 0; baseTarget = Z.target || baseTarget; Z.setTarget && Z.setTarget(Math.round(baseTarget * 1.6)); toast('HORDE NIGHT · they come in waves. Stay near your safe house.', 3.6); }
    if (!night && H.night) { H.night = false; Z.setTarget && Z.setTarget(baseTarget); if (H.boss && !H.boss.dead) { toast('The boss slinks away at sunrise.', 2.6); } H.boss = null; bossBar.style.display = 'none'; }
    if (H.night) { H.nightT = (H.nightT || 0) + dt; H.waveT -= dt; if (H.waveT <= 0) { H.waveT = 32; let n = 0; if (Z.zombies.filter(q => q.mission && !q.dead).length > 16) n = 99; /* cap the extra dead on phones */ for (let i = 0; i < 5 && n < 99; i++) { const a = Math.random() * 6.283, d = 40 + Math.random() * 14; const f = freeSpot(me.x + Math.cos(a) * d, me.z + Math.sin(a) * d, .5); const c = Z.spawnAt(f[0], f[1], {}); if (c) { c.st = 'chase'; c.mission = true; n++; } } }
      const preDawn = p > .17 && p < .25; if (preDawn && !H.boss && !H.bossDone && H.nightT > 90) { /* only after you've lived through some of the night: no boss in your face when joining at 5 am */ const a = Math.random() * 6.283; const f = freeSpot(me.x + Math.cos(a) * 34, me.z + Math.sin(a) * 34, .9); const c = Z.spawnAt(f[0], f[1], { kind: 'tank', hp: 1600, scale: 2.05, speed: 1.55 }); if (c) { c.boss = true; c.mission = true; c.st = 'chase'; H.boss = c; bossBar.style.display = ''; toast('THE BUTCHER is coming. Bring it down before sunrise!', 3.6); try { aud.play && aud.play('boss_roar', { vol: 1, pos: { x: f[0], y: 2, z: f[1] } }); } catch (e) { /* sfx */ } } }
      if (H.boss) { bossFill.style.width = Math.max(0, 100 * H.boss.hp / H.boss.maxHp) + '%'; if (H.boss.dead) { H.bossDone = true; H.boss = null; bossBar.style.display = 'none'; pay(500, 'Horde boss down'); bump('kill', 0); } } } }
  // ---------- tutorial ----------
  const TUT = (() => { const STEPS = [
      { t: 'Welcome to Quiet Falls! Move with the left stick (WASD on a keyboard).', ev: 'move' },
      { t: 'Search things for supplies. Walk up to a car or crate and tap the ✋ hand button (E).', ev: 'loot' },
      { t: 'Fight back with HIT (left click). Zombies show as red dots on the map.', ev: 'kill' },
      { t: 'Tap “Jobs” at the top right. Daily challenges and town jobs pay cash.', ev: 'panel' },
      { t: 'Orange light beams mark jobs. Walk into one and tap ✋ to start it.', ev: 'job' },
      { t: 'Get in a car: walk up to it and tap ✋. Some are locked, so find an unlocked one.', ev: 'drive' },
      { t: 'Before night, make a house your safe house, barricade its doors and set traps. Each night ends with a boss. Good luck!', ev: 'end' }];
    // v1.9.72: the box lives on <body> above the touch HUD (it used to sit inside #mpt under #stickZone, which ate every tap on Next/Skip),
    // top-centre between the left and right button columns. Taps are handled on touchend (iOS), clicks for mouse. Progress + skip are saved,
    // and a step whose action doesn't happen (e.g. a full bag can't loot) moves on by itself after a while.
    const box = el('div', { cls: 'actTut' }); box.style.cssText = 'position:fixed;left:50%;top:calc(max(6px, env(safe-area-inset-top)) + 106px);transform:translateX(-50%);width:min(52vw,420px);box-sizing:border-box;background:#0f171bf0;border:1px solid #f0b44a99;border-radius:12px;padding:8px 34px 8px 12px;color:#f5ecd8;font:600 12.5px/1.3 system-ui,sans-serif;z-index:74;display:none;gap:8px;align-items:center;pointer-events:auto;touch-action:manipulation;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent';
    const txt = el('div', {}); txt.style.flex = '1'; const step = el('div', {}); step.style.cssText = 'font-size:10.5px;color:#f0b44a;margin-bottom:2px';
    const next = el('button', {}, 'Next'), skip = el('button', {}, 'Skip'), xb = el('button', { 'aria-label': 'Close tutorial' }, '✕'); for (const q of [next, skip]) q.style.cssText = 'background:#f0b44a;color:#1b1206;border:0;border-radius:8px;padding:9px 12px;min-height:38px;font-weight:800;font-size:12.5px;pointer-events:auto;touch-action:manipulation'; skip.style.background = '#ffffff22'; skip.style.color = '#f5ecd8';
    xb.style.cssText = 'position:absolute;top:0;right:0;width:32px;height:32px;background:none;border:0;color:#f5ecd8;font:700 15px system-ui,sans-serif;pointer-events:auto;touch-action:manipulation;opacity:.85';
    const col2 = el('div', {}, step, txt); col2.style.flex = '1'; box.append(col2, next, skip, xb); document.body.append(box); ['touchstart', 'touchmove', 'pointerdown', 'mousedown'].forEach(t => box.addEventListener(t, e => e.stopPropagation(), { passive: true }));
    const tapped = (q, fn) => { let tt = 0; q.addEventListener('touchend', e => { e.preventDefault(); e.stopPropagation(); tt = performance.now(); fn(); }, { passive: false }); q.addEventListener('click', e => { e.stopPropagation(); if (performance.now() - tt < 700) return; fn(); }); };
    let i = -1, on = false, t0 = 0, mv = 0, last = null; const AUTO = 40; const show = () => { const s = STEPS[i]; step.textContent = `TUTORIAL · ${i + 1} / ${STEPS.length}`; txt.textContent = s.t; next.textContent = i === STEPS.length - 1 ? 'Done' : 'Next'; };
    const go = (k) => { i = k; t0 = 0; mv = 0; last = null; if (i >= STEPS.length) { stop(); return; } LS.set('atq.town.tutStep', i); show(); };
    const stop = () => { on = false; box.style.display = 'none'; LS.set('atq.town.tut', 1); };
    tapped(next, () => { if (on) go(i + 1); }); const close = () => { if (!on) return; stop(); toast('Tutorial closed. Replay it from Jobs.', 2); }; tapped(skip, close); tapped(xb, close);
    return { box, start(force) { if (!force && LS.get('atq.town.tut', 0)) return; on = true; box.style.display = 'flex'; const k = force ? 0 : Math.max(0, Math.min(STEPS.length - 1, LS.get('atq.town.tutStep', 0) | 0)); go(k); },
      ev(k) { if (!on) return; if (STEPS[i] && STEPS[i].ev === k) setTimeout(() => { if (on && STEPS[i] && STEPS[i].ev === k) go(i + 1); }, 900); },
      update(dt) { if (!on || !STEPS[i]) return; t0 += dt; if (STEPS[i].ev === 'move') { if (last) mv += Math.hypot(me.x - last[0], me.z - last[1]); last = [me.x, me.z]; if (mv > 6) { mv = -1e9; this.ev('move'); } } if (STEPS[i].ev === 'drive' && me.drv) this.ev('drive');
        if (t0 > AUTO) go(i + 1); /* never park on one step forever (the last card closes itself) */ },
      hide(v) { if (on) box.style.display = v ? 'none' : 'flex'; },
      skip() { stop(); }, dispose() { box.remove(); }, get on() { return on; } }; })();
  // ---------- polling trackers (kills / loot / driving / landmarks) ----------
  let lastKilled = Z && Z.stats ? Z.stats().killed : 0, lastLooted = -1, drvLast = null, drvAcc = 0, pollT = 0;
  const lootedCount = () => (W.containers || []).reduce((n, c) => n + (c.looted ? 1 : 0), 0);
  function poll(dt) { if ((pollT += dt) < .4) return; pollT = 0; const S = dn && dn.state || {};
    if (Z && Z.stats) { const k = Z.stats().killed; const d = k - lastKilled; if (d > 0) { bump('kill', d); if ((S.nightK || 0) > .6) bump('nightKill', d); TUT.ev('kill'); } lastKilled = k; }
    const lc = lootedCount(); if (lastLooted >= 0 && lc > lastLooted) { bump('loot', lc - lastLooted); TUT.ev('loot'); } lastLooted = lc;
    if (me.drv) { if (drvLast) { const d = Math.hypot(me.x - drvLast[0], me.z - drvLast[1]); if (d < 30) drvAcc += d; } drvLast = [me.x, me.z]; if (drvAcc >= 50) { bump('drive', Math.floor(drvAcc)); drvAcc -= Math.floor(drvAcc); } } else drvLast = null;
    for (const zn of W.zones || []) { if (!LANDMARKS.includes(zn.id) || st.visited[zn.id]) continue; if (me.x > zn.x0 - 4 && me.x < zn.x1 + 4 && me.z > zn.z0 - 4 && me.z < zn.z1 + 4) { st.visited[zn.id] = 1; const v = LS.get('atq.town.visited', {}); const day = DAY(); if (v.day !== day) { v.day = day; v.ids = {}; } if (!v.ids[zn.id]) { v.ids[zn.id] = 1; LS.set('atq.town.visited', v); bump('visit'); toast('Found: ' + zn.name, 1.8); } } } }
  // ---------- public ----------
  const tmpM = new THREE.Matrix4();
  function update(dt) { const t = performance.now() / 1000; startM.uniforms.uT.value = tgtM.uniforms.uT.value = t;
    const now = Date.now() / 1000; let n = 0; for (const j of JOBS) { if (st.job || (st.done[j.id] || 0) + REPEAT_S > now) continue; const p = jobPos[j.id]; tmpM.makeTranslation(p.x, 0, p.z); starts.setMatrixAt(n++, tmpM); } starts.count = n; starts.instanceMatrix.needsUpdate = true;
    if (!st.job && st.track) { const p = jobPos[st.track]; tgt.visible = false; } jobUpdate(dt); trapUpdate(dt); barUpdate(dt); hordeUpdate(dt); poll(dt); TUT.update(dt); arrowUpdate();
    const s = st.job; if (s) { obj.style.display = ''; obj.textContent = `JOB · ${s.def.name} — ${s.status}${s.def.time ? ' · ' + mmss(s.left) : ''}`; } else obj.style.display = 'none';
    if (panelOn && (t * 2 | 0) !== (update._t | 0)) { update._t = t * 2 | 0; } }
  function acts(px, pz) { const L = []; if (me.drv) return L; const now = Date.now() / 1000;
    if (!st.job) for (const j of JOBS) { const p = jobPos[j.id]; const d = Math.hypot(p.x - px, p.z - pz); if (d > 3.2) continue; if ((st.done[j.id] || 0) + REPEAT_S > now) continue; L.push({ label: `Start job: ${j.name} ($${j.pay})`, d: d - 1, run: () => { startJob(j); TUT.ev('job'); } }); }
    if (st.job && st.job.def.type === 'deliver' && !st.job.picked) { /* picked up at start */ }
    const b = insideB(px, pz); if (b && b.kind === 'house' && (b.cfg && b.cfg.id) !== st.safe) L.push({ label: 'Make this my safe house', d: 2.5, alt: 1, run: () => { st.safe = b.cfg.id; LS.set('atq.town.safe', st.safe); toast('Safe house claimed. You respawn here now.', 2.4); refreshPanel(); } });
    for (const D of W.doors || []) { const d = Math.hypot(D.x - px, D.z - pz); if (d > 2.2) continue; const have = bars.find(x => x.D === D);
      if (!have) L.push({ label: 'Barricade doorway ($30)', d: d + .3, alt: 1, dur: 1.6, run: () => { if (D.state === 'open' || D.state === 'none' || D.state === 'broken' || !D.installed) { /* doorway is open: fine */ } if (bag.count('cash') < 30) { toast('Not enough cash'); return; } if (Math.hypot(D.x - me.x, D.z - me.z) < .45) { toast('Step out of the doorway first'); return; } bag.remove('cash', 30); save(); buildBar(D); toast('Doorway barricaded', 1.4); } });
      else L.push({ label: have.hp < 100 ? `Repair barricade (${Math.round(have.hp)}%)` : 'Take barricade down', d: d + .3, alt: 1, dur: have.hp < 100 ? 1.2 : .8, run: () => { if (have.hp < 100) have.hp = 100; else dropBar(have, false); } }); }
    const ss = safeSpawn(); const nearHome = (ss && Math.hypot(ss.x - px, ss.z - pz) < 18) || bars.some(q => Math.hypot(q.x - px, q.z - pz) < 6); /* traps go down around your safe house / barricades, so the hand button is not hijacked everywhere */
    for (const k of ['spike', 'snare']) if ((st.traps[k] | 0) > 0 && nearHome) L.push({ label: `Place ${k} trap (${st.traps[k]} left)`, d: 6 + (k === 'snare' ? .1 : 0), alt: 1, run: () => placeTrap(k) });
    return L; }
  function mini(g, X, Z2, MS2) { const now = Date.now() / 1000; const R = g.canvas.width / 2 - 8, cx = g.canvas.width / 2;
    const dot = (x, z, c, s = 4, edge = false) => { let px = X(x), pz = Z2(z); const dx = px - cx, dz = pz - cx, d = Math.hypot(dx, dz); if (d > R) { if (!edge) return; px = cx + dx / d * R; pz = cx + dz / d * R; } g.fillStyle = c; g.strokeStyle = '#000'; g.lineWidth = 1; g.beginPath(); g.moveTo(px, pz - s); g.lineTo(px + s, pz); g.lineTo(px, pz + s); g.lineTo(px - s, pz); g.closePath(); g.fill(); g.stroke(); };
    if (!st.job) for (const j of JOBS) { if ((st.done[j.id] || 0) + REPEAT_S > now) continue; const p = jobPos[j.id]; dot(p.x, p.z, st.track === j.id ? '#ffffff' : '#ffb43a', st.track === j.id ? 5 : 3.5, st.track === j.id); }
    if (st.job && st.job.target) dot(st.job.target.x, st.job.target.z, '#5cff8a', 5, true);
    const sb = st.safe && W.buildings.find(b => (b.cfg && b.cfg.id) === st.safe); if (sb) { const x = (sb.rect.x0 + sb.rect.x1) / 2, z = (sb.rect.z0 + sb.rect.z1) / 2; dot(x, z, '#59e07a', 5, true); }
    if (st.horde.boss) { const q = st.horde.boss.root.position; dot(q.x, q.z, '#ff3b2f', 6, true); }
    for (const b of bars) { g.fillStyle = '#c89a5a'; g.fillRect(X(b.x) - 2, Z2(b.z) - 2, 4, 4); } }
  function safeSpawn() { const sb = st.safe && W.buildings.find(b => (b.cfg && b.cfg.id) === st.safe); if (!sb) return null; const x = (sb.rect.x0 + sb.rect.x1) / 2, z = (sb.rect.z0 + sb.rect.z1) / 2; const f = freeSpot(x, z, .5); return { x: f[0], z: f[1] }; }
  function dispose() { for (const o of [starts, tgt, ring, arrow]) scene.remove(o); try { arrowTxt.remove(); } catch (e) { /* arrow */ } for (const m of pickups) scene.remove(m); for (const b of bars) scene.remove(b.g); for (const t of traps) scene.remove(t.g); for (const e of [obj, panel, css, bossBar]) e.remove(); try { TUT.dispose(); } catch (e) { /* tutorial */ } }
  setTimeout(() => TUT.start(false), 2500);
  return { update, acts, mini, openPanel, safeSpawn, dispose, state: st, TUT, startJob: id => { const j = JOBS.find(q => q.id === id); if (j) startJob(j); }, jobs: JOBS, jobPos, placeTrap, buildBar, bars, traps };
}
