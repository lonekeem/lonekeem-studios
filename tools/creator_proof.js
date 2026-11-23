// Offline harness for the online character creator: apply/save/reload tests, random dress cycles, grid + close-ups.
import * as THREE from 'three';
import { loadBase, Avatar } from '../src/mp/avatar.js';
import { dress } from '../src/mp/dress.js';
import { animate } from '../src/mp/anim.js';
import { poseChair } from '../src/mp/chair.js';
import * as K from '../src/mp/look.js';
import * as C from '../src/mp/catalog.js';
import * as SL from '../src/mp/storeLook.js';
import * as COS from '../src/mp/cosmetics.js';
import { keemLook } from '../src/mp/chars.js';

const status = document.getElementById('status');
const view = document.getElementById('view');
const grid = document.getElementById('grid');
const shot = document.getElementById('shot');

const renderer = new THREE.WebGLRenderer({ canvas: view, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.setPixelRatio(1);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#2a3038');
scene.add(new THREE.HemisphereLight('#e8f0ff', '#4a5248', 1.05));
const key = new THREE.DirectionalLight('#fff4e6', 2.05); key.position.set(1.4, 2.5, 3); scene.add(key);
const fill = new THREE.DirectionalLight('#c9e4ff', .7); fill.position.set(-2.2, 1.8, 1.6); scene.add(fill);
const rim = new THREE.DirectionalLight('#ffe6d2', 1.35); rim.position.set(-1.2, 2.2, -3.2); scene.add(rim);
const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 40), new THREE.MeshStandardMaterial({ color: '#3a424c', roughness: 1, metalness: 0 }));
floor.rotation.x = -Math.PI / 2; scene.add(floor);

const cam = new THREE.PerspectiveCamera(28, 1, .05, 40);
const avatars = {};
let current = null;

function idOf(piece) { return piece && piece !== 'none' ? (typeof piece === 'string' ? piece : piece.id) : null; }
function snapshot(look) {
  const w = look.worn || {}, a = look.acc || {};
  return {
    base: look.base, exclusive: look.exclusive || null,
    hair: look.hair && look.hair.id, hairC: look.hair && look.hair.c,
    top: idOf(w.top), jacket: idOf(w.jacket), pants: idOf(w.pants), shoes: idOf(w.shoes),
    hat: idOf(a.hat), glasses: idOf(a.glasses), earL: idOf(a.earL), earR: idOf(a.earR),
    pierce: Array.isArray(a.pierce) ? a.pierce.slice() : [],
    neck: idOf(a.neck), chair: idOf(a.chair),
  };
}
function sameSnap(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

function makeLook({ name, base = 'mp_m1', hair, hairC, skinT, morph, eyes, parts, beard }) {
  const M = K.defaultLook(base);
  if (hair) M.hair = Object.assign({}, M.hair, { id: hair, c: hairC || M.hair.c, c2: hairC || M.hair.c2, hl: .4 });
  else if (hairC) M.hair = Object.assign({}, M.hair, { c: hairC, c2: hairC, hl: .4 });
  if (skinT != null) M.skin = Object.assign({}, M.skin, { t: skinT });
  if (morph) M.morph = Object.assign({}, M.morph, morph);
  if (eyes) M.eyes = Object.assign({}, M.eyes, { col: eyes });
  if (beard != null) M.beard = Object.assign({}, M.beard || {}, { id: beard });
  if (base.startsWith('mp_f')) { M.beard = Object.assign({}, M.beard || {}, { id: 'none' }); M.stache = Object.assign({}, M.stache || {}, { id: 'none' }); }
  if (parts) SL.applyParts(M, Object.assign({ pierce: [], earL: 'none', earR: 'none', jacket: 'none' }, parts));
  M.name = name || 'Survivor';
  return K.normalize(M);
}

const FEATURED = [
  makeLook({ name: 'Jacket + hoodie', base: 'mp_m1', hair: 'messy', hairC: '#3a2616', parts: { top: { id: 'hoodie', c: '#1f3a28' }, jacket: { id: 'denim', c: '#3a5a8a' }, pants: { id: 'jeans', c: '#2a3a55' }, shoes: { id: 'sneaker', c: '#f2f2f0', sole: '#1b1c1f' } } }),
  makeLook({ name: 'Cardigan + skirt', base: 'mp_f1', hair: 'longwave', hairC: '#2a1608', parts: { top: { id: 'tee', c: '#f4f0ea' }, jacket: { id: 'cardigan', c: '#7a4a3a' }, pants: { id: 'midiskirt', c: '#2a2a30' }, shoes: { id: 'ankleboot', c: '#3a2418' }, earL: 'hoopMedium' } }),
  makeLook({ name: 'Hijab + kurta', base: 'mp_f1', hair: 'longstr', hairC: '#15100c', skinT: .55, parts: { top: { id: 'kurta', c: '#2f5d3a' }, jacket: 'none', pants: { id: 'wide', c: '#1a3a24' }, shoes: { id: 'loafer', c: '#2a2018' }, hat: { id: 'hijab', c: '#2f5d3a' }, glasses: { id: 'roundclear' }, earL: 'none' } }),
  makeLook({ name: 'Wrap + robe', base: 'mp_m1', hair: 'buzz', hairC: '#1a110b', skinT: .7, beard: 'none', parts: { top: { id: 'tee', c: '#e8e0d4' }, jacket: { id: 'robe', c: '#6a3a2a' }, pants: { id: 'joggers', c: '#2a2a2e' }, shoes: { id: 'loafer', c: '#1b1c1f' }, hat: { id: 'wrap', c: '#c0392b' } } }),
  makeLook({ name: 'Pink curls + floral', base: 'mp_f1', hair: 'longcurl', hairC: '#f4c2d4', eyes: '#4a2a3a', parts: { top: 'tiedyeshirt', pants: 'floralshorts', shoes: { id: 'kneesock', c: '#f2f2f0' }, earL: 'hoopLarge' } }),
  makeLook({ name: 'Platinum pixie + zebra', base: 'mp_f1', hair: 'pixie', hairC: '#f3f1ea', skinT: .2, parts: { top: { id: 'croptank', c: '#17181b' }, pants: 'zebraskirt', shoes: { id: 'loafer', c: '#f2f2f0' }, earL: 'studTiny', glasses: { id: 'catclear' } } }),
  makeLook({ name: 'Buzz + nose ring', base: 'mp_m1', hair: 'buzz', hairC: '#2a2018', beard: 'none', parts: { top: { id: 'tee', c: '#2a2a30' }, pants: { id: 'jeans', c: '#242830' }, shoes: { id: 'hightop', c: '#1b1c1f' }, glasses: { id: 'squaredark' }, pierce: ['nosering'], earL: 'hoopSmall' } }),
  makeLook({ name: 'Wheelchair guy', base: 'mp_m1', hair: 'slickback', hairC: '#1a110b', morph: { weight: .2, muscle: .3 }, parts: { top: { id: 'polo', c: '#2b4a7a' }, jacket: 'none', pants: { id: 'chino', c: '#c8b78a' }, shoes: { id: 'sneaker', c: '#f2f2f0' }, chair: 'chair', earL: 'none' } }),
  makeLook({ name: 'Wheelchair + hijab', base: 'mp_f1', hair: 'bob', hairC: '#15100c', skinT: .62, parts: { top: { id: 'kurta', c: '#4a2a6a' }, pants: { id: 'wide', c: '#2a1a3a' }, shoes: { id: 'flat', c: '#1b1c1f' }, hat: { id: 'hijab', c: '#3a1a4a' }, chair: 'chair', earL: 'none' } }),
  makeLook({ name: 'Stocky jacket fit', base: 'mp_m1', hair: 'crew', hairC: '#3a2616', morph: { weight: .55, muscle: .5, shoulders: .45 }, parts: { top: 'plaidshirt', jacket: { id: 'bomber', c: '#1b1c1f' }, pants: { id: 'cargojog', c: '#3a4632' }, shoes: { id: 'boot', c: '#2a2018' } } }),
  makeLook({ name: 'Hat over long hair', base: 'mp_f1', hair: 'longstr', hairC: '#5a3b22', morph: { weight: -.5, hips: .2 }, parts: { top: { id: 'hoodie', c: '#566a8a' }, pants: { id: 'highjeans', c: '#2a3a55' }, shoes: { id: 'sneaker', c: '#e24b78' }, hat: { id: 'beanie', c: '#9a4a34' }, earL: 'drops' } }),
  makeLook({ name: 'Tie-dye + shorts', base: 'mp_m1', hair: 'curlfade', hairC: '#1a110b', skinT: .45, beard: 'none', parts: { top: 'tiedyeshirt', pants: { id: 'shorts', c: '#2a2a30' }, shoes: { id: 'runner', c: '#f2f2f0' } } }),
  makeLook({ name: 'Boots over jeans', base: 'mp_m1', hair: 'dreads', hairC: '#15100c', parts: { top: 'plaidshirt', jacket: 'none', pants: { id: 'jeans', c: '#1c2230' }, shoes: { id: 'combat', c: '#1b1c1f' }, neck: { id: 'chainMid', c: '#d9b44a' }, earL: 'hoopMedium' } }),
  makeLook({ name: 'Locs + hoops', base: 'mp_f1', hair: 'dreads', hairC: '#1a110b', skinT: .8, parts: { top: { id: 'tank', c: '#f2f2f0' }, jacket: { id: 'denim', c: '#3a5a8a' }, pants: { id: 'skinny', c: '#17181b' }, shoes: { id: 'ankleboot', c: '#1b1c1f' }, earL: 'hoopHuge', neck: { id: 'chainShortheart', c: '#d9b44a' } } }),
  makeLook({ name: 'Waves + shades', base: 'mp_m1', hair: 'longwave', hairC: '#3a2616', parts: { top: { id: 'henley', c: '#4b4038' }, jacket: { id: 'denim', c: '#2a3a55' }, pants: { id: 'chino', c: '#8a6238' }, shoes: { id: 'loafer', c: '#2a2018' }, glasses: { id: 'avidark' } } }),
  makeLook({ name: 'Cornrows + cap', base: 'mp_m1', hair: 'cornrows', hairC: '#15100c', skinT: .75, beard: 'goatee', parts: { top: { id: 'tee', c: '#c23b3b' }, pants: { id: 'joggers', c: '#17181b' }, shoes: { id: 'hightop', c: '#1b1c1f' }, hat: { id: 'capflat', c: '#2b4a7a' } } }),
];

const CLOSEUPS = [
  { file: 'earrings', title: 'Hoop earrings', look: FEATURED[13], cam: 'face', yaw: .35 },
  { file: 'nosering', title: 'Nose ring', look: FEATURED[6], cam: 'face', yaw: .2 },
  { file: 'hijab', title: 'Hijab', look: FEATURED[2], cam: 'head', yaw: .18 },
  { file: 'glasses', title: 'Glasses', look: FEATURED[6], cam: 'face', yaw: .1 },
  { file: 'hat-hair', title: 'Hair under beanie', look: FEATURED[10], cam: 'head', yaw: .22 },
  { file: 'shoes-pants', title: 'Boots over jeans', look: FEATURED[12], cam: 'shoes', yaw: .7 },
  { file: 'jacket-shirt', title: 'Jacket over shirt', look: FEATURED[0], cam: 'torso', yaw: .3 },
  { file: 'wheelchair', title: 'Wheelchair', look: FEATURED[7], cam: 'full', yaw: .55 },
  { file: 'wheelchair-hijab', title: 'Wheelchair + hijab', look: FEATURED[8], cam: 'full', yaw: .5 },
  { file: 'pink-hair', title: 'Pink long curls', look: FEATURED[4], cam: 'face', yaw: .2 },
  { file: 'platinum-pixie', title: 'Platinum pixie', look: FEATURED[5], cam: 'face', yaw: .2 },
  { file: 'kurta', title: 'Kurta', look: FEATURED[2], cam: 'torso', yaw: .25 },
  { file: 'robe', title: 'Belted robe', look: FEATURED[3], cam: 'torso', yaw: .35 },
  { file: 'floral-shorts', title: 'Floral shorts', look: FEATURED[4], cam: 'legs', yaw: .3 },
  { file: 'zebra-skirt', title: 'Zebra skirt', look: FEATURED[5], cam: 'legs', yaw: .3 },
  { file: 'kneesocks', title: 'Knee socks', look: FEATURED[4], cam: 'shoes', yaw: .25 },
  { file: 'stocky-fit', title: 'Stocky jacket fit', look: FEATURED[9], cam: 'torso', yaw: .3 },
  { file: 'face-quality', title: 'Face shading', look: FEATURED[1], cam: 'face', yaw: .12 },
];

function headY(av) {
  try { const b = av.bones.Head; const v = new THREE.Vector3(); b.getWorldPosition(v); return v; } catch (e) { return new THREE.Vector3(0, 1.55, 0); }
}

function frameCam(mode, yaw = 0) {
  const lookAt = new THREE.Vector3(0, .95, 0);
  let dist = 3.35, y = 1.12, fov = 28;
  if (mode === 'face' || mode === 'head') { const h = current ? headY(current) : new THREE.Vector3(0, 1.55, 0);
    if (mode === 'head') { lookAt.set(0, h.y - .12, 0); dist = 1.35; y = h.y + .02; fov = 28; }
    else { lookAt.set(0, h.y - .02, 0); dist = 1.05; y = h.y + .05; fov = 28; } }
  else if (mode === 'torso') { lookAt.set(0, 1.12, 0); dist = 1.7; y = 1.2; fov = 28; }
  else if (mode === 'legs') { lookAt.set(0, .52, 0); dist = 1.65; y = .58; fov = 30; }
  else if (mode === 'shoes') { lookAt.set(0, .28, 0); dist = 1.45; y = .48; fov = 32; }
  else { lookAt.set(0, .9, 0); dist = 3.7; y = 1.22; fov = 28; }
  cam.fov = fov; cam.near = .05; cam.far = 40;
  cam.position.set(Math.sin(yaw) * dist, y, Math.cos(yaw) * dist);
  cam.lookAt(lookAt);
  cam.updateProjectionMatrix();
}

async function getAvatar(base) {
  if (avatars[base]) return avatars[base];
  const tpl = await loadBase(base);
  const av = new Avatar(tpl);
  scene.add(av.root);
  av.root.visible = false;
  avatars[base] = av;
  return av;
}

async function wear(look) {
  const L = K.normalize(look);
  if (current) current.root.visible = false;
  const av = await getAvatar(L.base || 'mp_m1');
  dress(av, L);
  av.root.visible = true;
  av.root.rotation.y = 0;
  animate(av, .85, 0);
  if (L.acc && L.acc.chair) poseChair(av, .85);
  av.root.updateMatrixWorld(true);
  current = av;
  return av;
}

function resize(w, h) {
  renderer.setSize(w, h, false);
  cam.aspect = w / h;
  cam.updateProjectionMatrix();
}

function renderOnce() {
  if (current) {
    animate(current, .85, 0);
    if (current.look && current.look.acc && current.look.acc.chair) poseChair(current, .85);
    current.root.updateMatrixWorld(true);
  }
  renderer.render(scene, cam);
}

function blitTo(target, x, y, tw, th) {
  const ctx = target.getContext('2d');
  ctx.drawImage(renderer.domElement, x, y, tw, th);
}

function catalogIds(list) { return list.map(r => r[0]); }

function randomLookFromCatalog(seed, i) {
  const r = (() => { let s = (seed + i * 9973) >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
  const pick = arr => arr[Math.floor(r() * arr.length)];
  const base = r() < .5 ? 'mp_m1' : 'mp_f1';
  const hair = pick(C.HAIR)[0];
  const dyes = ['#15100c', '#3a2616', '#5a3b22', '#8a6238', '#f3f1ea', '#f4c2d4', '#d8d4cc', '#c9b8ff', '#e24b78', '#2a2a2e'];
  const morph = r() < .33 ? { weight: -.55, hips: base.startsWith('mp_f') ? .3 : 0 } : r() < .5 ? { weight: .5, muscle: .4, shoulders: .35 } : {};
  const jacket = r() < .55 ? pick(C.JACKETS)[0] : 'none';
  const hat = r() < .45 ? pick(C.HATS)[0] : 'none';
  const glasses = r() < .35 ? pick(C.GLASSES_LIST)[0] : 'none';
  const ear = r() < .5 ? pick(C.EARRINGS)[0] : 'none';
  const pierce = r() < .35 ? [pick(C.PIERCINGS)[0]] : [];
  const neck = r() < .35 ? pick(C.NECKLACES)[0] : 'none';
  const chair = r() < .12 ? 'chair' : 'none';
  const shoes = pick(C.SHOES)[0];
  return makeLook({
    name: 'rand-' + i, base, hair, hairC: pick(dyes), skinT: r(), morph, beard: base.startsWith('mp_f') ? 'none' : (r() < .5 ? 'none' : pick(C.BEARDS)[0]),
    parts: { top: pick(C.TOPS)[0], jacket, pants: pick(C.PANTS)[0], shoes, hat, glasses, earL: ear, pierce, neck, chair },
  });
}

function runLogicTests() {
  const tests = [];
  const push = (name, pass, detail) => tests.push({ name, pass: !!pass, detail: detail || '' });

  const orig = JSON.stringify(keemLook());
  const custom = SL.applySel(K.defaultLook('mp_m1'), { parts: { hat: 'hijab', top: 'hoodie', chair: 'chair' } }, SL.ALL_PARTS, {});
  push('keem-exclusive-stable', JSON.stringify(keemLook()) === orig && keemLook().exclusive === 'skin.keem_story' && !custom.exclusive, 'Story Keem flag stays, custom looks stay non-exclusive');

  const scripted = [
    { base: 'mp_f1', parts: { top: 'kurta', jacket: 'robe', pants: 'zebraskirt', shoes: 'kneesock', hat: 'hijab', glasses: 'roundclear', earL: 'hoopMedium', pierce: ['nosering'], neck: 'chainMid', chair: 'chair' } },
    { base: 'mp_m1', parts: { top: 'plaidshirt', jacket: 'denim', pants: 'floralshorts', shoes: 'combat', hat: 'wrap', earL: 'studSmall', pierce: ['septum'] } },
    { base: 'mp_f1', parts: { top: 'tiedyeshirt', jacket: 'none', pants: 'midiskirt', shoes: 'ankleboot', hat: 'beanie', glasses: 'none', earL: 'none', pierce: [], chair: 'none' } },
    ...FEATURED.map(L => ({ fromLook: L })),
  ];
  let reloadOk = 0, reloadFail = [];
  const checkReload = (label, look) => {
    const a = snapshot(look);
    const raw = JSON.stringify(look);
    const b = snapshot(K.normalize(JSON.parse(raw)));
    // simulate localStorage round-trip used by the game
    try { localStorage.setItem('atq.mp.look.v1', raw); } catch (e) {}
    const c = snapshot(K.loadLook());
    if (sameSnap(a, b) && sameSnap(a, c)) reloadOk++;
    else reloadFail.push({ label, a, b, c });
  };
  for (const s of scripted) {
    const look = s.fromLook ? s.fromLook : SL.applySel(K.defaultLook(s.base), { base: s.base, parts: s.parts }, SL.ALL_PARTS, {});
    checkReload(s.fromLook ? s.fromLook.name : JSON.stringify(s.parts), look);
  }
  // many random applyParts + normalize/reload (no GPU)
  for (let i = 0; i < 80; i++) checkReload('rand-logic-' + i, randomLookFromCatalog(20261123, i));
  push('save-reload-ids', reloadFail.length === 0, reloadFail.length ? JSON.stringify(reloadFail.slice(0, 5)) : reloadOk + ' looks kept worn/acc ids');

  // every catalog style is addressable through applyParts
  const missing = [];
  const slots = [
    ['top', C.TOPS], ['jacket', C.JACKETS], ['pants', C.PANTS], ['shoes', C.SHOES],
    ['hat', C.HATS], ['glasses', C.GLASSES_LIST], ['earL', C.EARRINGS], ['neck', C.NECKLACES],
  ];
  for (const [slot, list] of slots) {
    for (const row of list) {
      const L = SL.applyParts(K.defaultLook('mp_m1'), { [slot]: row[0] });
      const got = slot === 'top' || slot === 'jacket' || slot === 'pants' || slot === 'shoes' ? idOf(L.worn[slot]) : idOf(L.acc[slot]);
      if (got !== row[0]) missing.push(slot + ':' + row[0] + '->' + got);
    }
  }
  for (const row of C.PIERCINGS) {
    const L = SL.applyParts(K.defaultLook('mp_m1'), { pierce: [row[0]] });
    if (!(L.acc.pierce || []).includes(row[0])) missing.push('pierce:' + row[0]);
  }
  {
    const L = SL.applyParts(K.defaultLook('mp_m1'), { chair: 'chair' });
    if (idOf(L.acc.chair) !== 'chair') missing.push('chair');
  }
  for (const [id, pr] of Object.entries(COS.PRESETS)) {
    const L = SL.applyParts(K.defaultLook('mp_m1'), { [pr.slot]: id });
    if (idOf(L.worn[pr.slot]) !== pr.id) missing.push('preset:' + id);
  }
  push('all-catalog-ids-apply', missing.length === 0, missing.length ? missing.slice(0, 12).join(', ') : 'all styles apply');

  const counts = C.COUNTS();
  return { tests, counts, reloadOk, reloadFail: reloadFail.length, missing: missing.length };
}

async function cycleRandom(n = 80, seed = 20261123) {
  const errors = [];
  for (let i = 0; i < n; i++) {
    const look = randomLookFromCatalog(seed, i);
    try {
      await wear(look);
      resize(320, 400);
      frameCam(look.acc && look.acc.chair ? 'full' : (i % 5 === 0 ? 'face' : 'full'), .2);
      renderOnce();
    } catch (e) {
      errors.push({ i, name: look.name, message: (e && e.message) || String(e), snap: snapshot(look) });
    }
  }
  return { n, errors };
}

async function renderGrid() {
  const COLS = 4, ROWS = 4, CW = 400, CH = 520, LABEL = 28;
  grid.width = COLS * CW; grid.height = ROWS * CH;
  const ctx = grid.getContext('2d');
  ctx.fillStyle = '#1c2228'; ctx.fillRect(0, 0, grid.width, grid.height);
  ctx.font = '600 16px system-ui,sans-serif';
  for (let i = 0; i < FEATURED.length; i++) {
    const look = FEATURED[i];
    const x = (i % COLS) * CW, y = Math.floor(i / COLS) * CH;
    await wear(look);
    resize(CW, CH - LABEL);
    frameCam('full', look.acc && look.acc.chair ? .45 : .22);
    renderOnce();
    ctx.drawImage(view, x, y, CW, CH - LABEL);
    ctx.fillStyle = '#14181c'; ctx.fillRect(x, y + CH - LABEL, CW, LABEL);
    ctx.fillStyle = '#e8eee8'; ctx.fillText(look.name, x + 10, y + CH - 9);
  }
  return grid.toDataURL('image/png');
}

async function renderCloseup(spec, w = 720, h = 900) {
  shot.width = w; shot.height = h;
  const ctx = shot.getContext('2d');
  await wear(spec.look);
  resize(w, h - 36);
  frameCam(spec.cam, spec.yaw || 0);
  renderOnce();
  ctx.fillStyle = '#1c2228'; ctx.fillRect(0, 0, w, h);
  ctx.drawImage(view, 0, 0, w, h - 36);
  ctx.fillStyle = '#14181c'; ctx.fillRect(0, h - 36, w, 36);
  ctx.font = '600 18px system-ui,sans-serif';
  ctx.fillStyle = '#e8eee8';
  ctx.fillText(spec.title, 14, h - 12);
  return shot.toDataURL('image/png');
}

async function start() {
  status.textContent = 'Loading bases…';
  await getAvatar('mp_m1');
  await getAvatar('mp_f1');
  window.__PROOF = {
    ready: true,
    FEATURED,
    CLOSEUPS,
    snapshot,
    runLogicTests,
    cycleRandom,
    renderGrid,
    renderCloseup,
    canvas: { view, grid, shot },
  };
  status.textContent = 'Ready';
}

start().catch(e => { status.textContent = 'Error: ' + (e && e.message || e); console.error(e); window.__PROOF = { ready: false, error: String(e && e.stack || e) }; });
