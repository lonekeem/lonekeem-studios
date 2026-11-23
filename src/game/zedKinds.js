// Special zombie kinds: Runner, Tank, Spitter.
// Smooth cartoon original looks (no brand logos). Shared materials + pooled FX for phones.
import * as THREE from 'three';
import { V3, rnd, angLerp, clamp, canvasTex } from './util.js';
import { mulberry } from './looks.js';

export const KIND = { walker: 'walker', runner: 'runner', tank: 'tank', spitter: 'spitter' };

const COL = {
  runner: { skin: '#8fa86a', shirt: '#8a241c', pants: '#241614', jacket: '#6a1c18', jsleeve: '#4a1410', shoes: '#1a0c0a', hair: '#1a100c' },
  tank: { skin: '#6a7a58', shirt: '#2a3036', pants: '#1a1c20', jacket: '#3a4048', jsleeve: '#2c3238', shoes: '#141210', hair: '#0c0a08' },
  spitter: { skin: '#c4b25a', shirt: '#4a6a28', pants: '#323e1c', jacket: '#5a7030', jsleeve: '#3e5220', shoes: '#2a2a16', hair: '#3a4a20' },
};

let _mats = null;
function mats() {
  if (_mats) return _mats;
  const armor = new THREE.MeshStandardMaterial({ color: '#9aa3ae', metalness: .88, roughness: .26, emissive: '#1c242c', emissiveIntensity: .18 });
  armor.customProgramCacheKey = () => 'zedArmor';
  const rust = new THREE.MeshStandardMaterial({ color: '#8a4a28', metalness: .55, roughness: .48, emissive: '#2a1208', emissiveIntensity: .1 });
  rust.customProgramCacheKey = () => 'zedRust';
  const belly = new THREE.MeshStandardMaterial({ color: '#6a6e48', emissive: '#1a2410', emissiveIntensity: .1, roughness: .96, metalness: 0 });
  belly.customProgramCacheKey = () => 'zedBelly';
  const glob = new THREE.MeshStandardMaterial({ color: '#8fe24a', emissive: '#5aa818', emissiveIntensity: 1.1, roughness: .35, metalness: 0, transparent: true, opacity: .92 });
  glob.customProgramCacheKey = () => 'zedGlob';
  const puddleTex = canvasTex(64, 64, (g, w, h) => {
    const gr = g.createRadialGradient(32, 32, 4, 32, 32, 30);
    gr.addColorStop(0, 'rgba(160, 230, 40, .85)');
    gr.addColorStop(.45, 'rgba(80, 160, 20, .55)');
    gr.addColorStop(1, 'rgba(40, 80, 8, 0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, true);
  const puddle = new THREE.MeshBasicMaterial({ map: puddleTex, transparent: true, depthWrite: false, opacity: .9 });
  puddle.customProgramCacheKey = () => 'zedPuddle';
  const ringTex = canvasTex(64, 64, (g, w) => {
    g.clearRect(0, 0, w, w);
    g.strokeStyle = '#fff'; g.lineWidth = 6; g.beginPath(); g.arc(32, 32, 24, 0, 7); g.stroke();
    g.lineWidth = 2; g.beginPath(); g.arc(32, 32, 16, 0, 7); g.stroke();
  }, false);
  const ring = new THREE.MeshBasicMaterial({ map: ringTex, color: '#ff6a20', transparent: true, depthWrite: false, opacity: .85, side: THREE.DoubleSide });
  ring.customProgramCacheKey = () => 'zedRing';
  const flareTex = canvasTex(32, 32, (g) => {
    const gr = g.createRadialGradient(16, 16, 1, 16, 16, 15);
    gr.addColorStop(0, 'rgba(210,255,80,1)'); gr.addColorStop(.4, 'rgba(120,200,30,.6)'); gr.addColorStop(1, 'rgba(40,80,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  }, false);
  const flare = new THREE.SpriteMaterial({ map: flareTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  flare.customProgramCacheKey = () => 'zedFlare';
  const plate = new THREE.BoxGeometry(.26, .18, .05);
  const pauldron = new THREE.SphereGeometry(.13, 8, 6, 0, Math.PI * 2, 0, Math.PI * .7);
  const bracer = new THREE.CylinderGeometry(.055, .06, .16, 8);
  const helm = new THREE.SphereGeometry(.12, 10, 8, 0, Math.PI * 2, 0, Math.PI * .55);
  const bellyGeo = new THREE.SphereGeometry(.155, 10, 8);
  const globGeo = new THREE.SphereGeometry(.09, 10, 8);
  const puddleGeo = new THREE.PlaneGeometry(1, 1);
  const ringGeo = new THREE.PlaneGeometry(1, 1);
  const cloth = new THREE.MeshStandardMaterial({ color: '#ddd6c8', roughness: .92, metalness: 0 });
  cloth.customProgramCacheKey = () => 'zedCloth';
  const clothDirty = new THREE.MeshStandardMaterial({ color: '#c4b090', roughness: .95, metalness: 0 });
  clothDirty.customProgramCacheKey = () => 'zedClothD';
  const rag = new THREE.MeshStandardMaterial({ color: '#5a3a2a', roughness: .96, metalness: 0 });
  rag.customProgramCacheKey = () => 'zedRag';
  const ragOlive = new THREE.MeshStandardMaterial({ color: '#4a5230', roughness: .96, metalness: 0 });
  ragOlive.customProgramCacheKey = () => 'zedRagO';
  const ragGray = new THREE.MeshStandardMaterial({ color: '#4a4a48', roughness: .96, metalness: 0 });
  ragGray.customProgramCacheKey = () => 'zedRagG';
  const bandage = new THREE.CylinderGeometry(.042, .045, .08, 8);
  const wrap = new THREE.CylinderGeometry(.09, .095, .04, 10);
  const flap = new THREE.BoxGeometry(.1, .14, .02);
  const patch = new THREE.BoxGeometry(.08, .06, .015);
  _mats = { armor, rust, belly, glob, puddle, ring, flare, plate, pauldron, bracer, helm, bellyGeo, globGeo, puddleGeo, ringGeo, cloth, clothDirty, rag, ragOlive, ragGray, bandage, wrap, flap, patch };
  return _mats;
}

export function resolveKind(o = {}, stepData = {}) {
  if (o.raider) return 'walker';
  if (o.kind) return o.kind;
  if (o.tank) return 'tank';
  if (o.spitter) return 'spitter';
  if (o.boss) return o.runner ? 'runner' : 'walker';
  if (o.runner === true) return 'runner';
  if (o.runner === false) return 'walker';
  if (Math.random() < (stepData.runners || 0.15)) return 'runner';
  return 'walker';
}

// Survival mix: runners scale with wave, spitters from wave 3, tanks from wave 6. Raiders stay a separate roll in the caller.
export function mixSurvivalKind(wave, r = Math.random()) {
  const tankP = wave < 6 ? 0 : Math.min(.15, .05 + (wave - 6) * .02);
  const spitP = wave < 3 ? 0 : Math.min(.18, .07 + (wave - 3) * .025);
  const runP = Math.min(.55, .10 + wave * .05);
  if (r < tankP) return 'tank';
  if (r < tankP + spitP) return 'spitter';
  if (r < tankP + spitP + runP) return 'runner';
  return 'walker';
}

export function mixTownKind(r = Math.random()) {
  if (r < .05) return 'tank';
  if (r < .13) return 'spitter';
  if (r < .28) return 'runner';
  return 'walker';
}

const BUILDS = {
  skinny: { build: .76, height: 1.05 },
  average: { build: 1.0, height: 1.0 },
  heavy: { build: 1.32, height: .97 },
  tall: { build: .88, height: 1.16 },
  short: { build: 1.12, height: .86 },
};
const KIND_BUILDS = {
  walker: ['skinny', 'average', 'heavy', 'tall', 'short'],
  runner: ['skinny', 'tall', 'average'],
  tank: ['heavy', 'tall', 'average'],
  spitter: ['heavy', 'short', 'average'],
};
const KIND_OUTFITS = {
  walker: ['classic', 'hoodie', 'flannel', 'denim', 'track', 'scrubs', 'work', 'cardigan', 'blouse', 'button', 'chef', 'street', 'bomber', 'parka', 'overalls', 'pinkhood', 'survivor', 'smock', 'camo', 'trench', 'hazmat', 'hunter', 'poncho', 'puffer', 'night', 'sheriff', 'fire'],
  runner: ['track', 'street', 'hoodie', 'classic', 'denim', 'bomber', 'night', 'survivor', 'flannel', 'varsity'],
  tank: ['work', 'overalls', 'camo', 'hunter', 'fire', 'hazmat', 'survivor', 'trench', 'tactical'],
  spitter: ['scrubs', 'smock', 'chef', 'hazmat', 'cardigan', 'blouse', 'button', 'overalls', 'classic'],
};
const DECAY = [
  ['#7f9f70', .72], ['#6a8a62', .64], ['#9aaa70', .7], ['#c4b25a', .52],
  ['#8a9a88', .8], ['#6a5a68', .48], ['#5a6a50', .76], ['#b8a878', .58],
  ['#4a5a48', .82], ['#8a7a58', .66], ['#7a8a9a', .55], ['#9a7a6a', .5],
];

export function applyKindLook(look, kind) {
  if (!look) return look;
  kind = kind || 'walker';
  look.kind = kind;
  const r = mulberry(((look.seed || 1) * 104729) + (kind.length * 97) + 19);
  const pick = (a) => a[Math.floor(r() * a.length) % a.length];
  const bd = BUILDS[pick(KIND_BUILDS[kind] || KIND_BUILDS.walker)];
  // jitter so two "heavy" tanks still differ
  look.build = bd.build * (0.94 + r() * .12);
  look.height = bd.height * (0.96 + r() * .08);
  look.outfit = pick(KIND_OUTFITS[kind] || KIND_OUTFITS.walker);
  const d = pick(DECAY);
  look.decayTint = d[0];
  look.decayMix = Math.max(.35, Math.min(.9, d[1] + (r() - .5) * .12));
  if (r() < .55) look.tint = [r(), r(), r()];
  look.grime = 0.65 + r() * 0.4;
  if (look.blood > .35) look.blood = .18 + r() * .2; // keep marks light / non-gory
  look.zedExtras = {
    bandageL: r() < .48, bandageR: r() < .32, headWrap: r() < .3,
    jawCloth: r() < .2, flap: r() < .42, ragArm: r() < .36, shin: r() < .28, knee: r() < .22,
  };
  // Procedural mannequin (no avatar skin) so rolled outfits, hair, skin and builds actually show.
  // Avatar skins hide dressChar parts, which made every rigged walker look the same and left extras floating.
  const HAT = { hunter:1, fire:1, street:1, parka:1, sheriff:1, tactical:1, hazmat:1, hoodie:1, pinkhood:1, night:1, poncho:1, varsity:1 };
  if (HAT[look.outfit] || kind === 'tank') look.zedExtras.headWrap = false;
  if (kind === 'runner') {
    look.headK = 1.16 + r() * .12;
    look.rig = null;
  } else if (kind === 'tank') {
    look.build = Math.max(look.build, 1.22);
    look.headK = 1.12 + r() * .1;
    look.rig = 'zombie_big';
    look.zedExtras.helm = r() < .7;
    look.zedExtras.pauldronL = r() < .85;
    look.zedExtras.pauldronR = r() < .85;
  } else if (kind === 'spitter') {
    look.headK = 1.22 + r() * .12;
    look.rig = null;
    look.bellyS = 0.95 + r() * .28;
  } else {
    look.headK = look.headK || (1.22 + r() * .16);
    look.rig = null;
  }
  return look;
}

export function kindStats(kind, o = {}, wave = 0, look = null) {
  const h = (look && look.height) || 1;
  if (kind === 'runner') {
    const hp = o.hp || (48 + wave * 5);
    return { kind, hp, maxHp: hp, speed: o.speed || rnd(4.2, 5.0), scale: o.scale || rnd(.94, 1.02) * h, runner: true, tank: false, spitter: false, armor: null };
  }
  if (kind === 'tank') {
    const hp = o.hp || (260 + wave * 18);
    return { kind, hp, maxHp: hp, speed: o.speed || rnd(.85, 1.15), scale: o.scale || rnd(1.42, 1.58) * (0.7 + h * .3), runner: false, tank: true, spitter: false,
      armor: (hit) => (hit && (hit.head || hit.flame || hit.boom)) ? 1 : .38 };
  }
  if (kind === 'spitter') {
    const hp = o.hp || (78 + wave * 7);
    return { kind, hp, maxHp: hp, speed: o.speed || rnd(1.05, 1.35), scale: o.scale || rnd(.98, 1.08) * h, runner: false, tank: false, spitter: true, armor: null };
  }
  const hp = o.hp || (70 + wave * 8);
  return { kind: 'walker', hp, maxHp: hp, speed: o.speed || rnd(1.1, 1.6), scale: o.scale || rnd(.9, 1.1) * h, runner: false, tank: false, spitter: false, armor: null };
}

function paint(z, kind, look) {
  const u = z.mat && z.mat.userData && z.mat.userData.u; if (!u) return;
  if (u.uGrime && look && look.grime != null) u.uGrime.value = look.grime;
  const c = COL[kind]; if (!c) return; // walkers keep their rolled outfit / decay skin
  const k = kind === 'runner' ? .26 : kind === 'tank' ? .3 : .28;
  const mix = (uni, hex) => { if (uni && uni.value && uni.value.lerp) uni.value.lerp(new THREE.Color(hex), k); };
  mix(u.uShirt, c.shirt); mix(u.uPants, c.pants); mix(u.uJacket, c.jacket); mix(u.uJSleeve, c.jsleeve);
}

// Parent a part to the visible body. Avatar skins retarget onto a different skeleton, so
// mannequin-parented meshes float; when _pairs exist, wrap into the matching skin bone.
function attachPart(z, bone, mesh) {
  const pairs = z._pairs;
  if (pairs && z.skin) {
    const key = String(bone).replace(/[.]/g, '');
    const P = pairs.find(p => p.sb && String(p.sb.name).replace(/[.]/g, '') === key);
    if (P && P.tb) {
      const wrap = new THREE.Group();
      wrap.quaternion.copy(P.tRest).invert().multiply(P.sInv.clone().invert());
      const ms = (z.model && z.model.scale.x) || 1;
      const sks = (z.skinRoot && z.skinRoot.scale.x) || 1;
      wrap.scale.setScalar(ms / Math.max(1e-6, sks * 0.01));
      wrap.add(mesh);
      P.tb.add(wrap);
      return mesh;
    }
  }
  z.attach(bone, mesh);
  return mesh;
}

function addPlate(z, bone, geo, mat, pos, rot, scl) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = false; m.receiveShadow = false;
  if (pos) m.position.set(pos[0], pos[1], pos[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  if (scl) m.scale.set(scl[0], scl[1], scl[2]);
  attachPart(z, bone, m); (z._kindMesh = z._kindMesh || []).push(m); return m;
}

function dressVariety(z, look) {
  const x = (look && look.zedExtras) || {}; const M = mats();
  const rag = x.flap && (look.seed || 0) % 3 === 0 ? M.ragOlive : (look.seed || 0) % 3 === 1 ? M.ragGray : M.rag;
  const cloth = (look.seed || 0) % 2 ? M.clothDirty : M.cloth;
  if (x.bandageL) addPlate(z, 'DEF-forearm.L', M.bandage, cloth, [0, .04, 0], [0, 0, 0], [1, 1, 1]);
  if (x.bandageR) addPlate(z, 'DEF-forearm.R', M.bandage, cloth, [0, .04, 0], [0, 0, 0], [1, 1, 1]);
  if (x.headWrap) addPlate(z, 'DEF-head', M.wrap, cloth, [0, .03, .01], [0.15, 0, 0], [1.08, 1, 1.08]);
  if (x.jawCloth) addPlate(z, 'DEF-head', M.patch, cloth, [0, -.02, .1], [0.6, 0, 0], [1.2, .7, 1]);
  if (x.flap) addPlate(z, 'DEF-spine003', M.flap, rag, [0.06, -.04, .1], [0.3, 0.2, 0.15], [1, 1, 1]);
  if (x.ragArm) addPlate(z, 'DEF-upper_arm.L', M.flap, rag, [0, .05, .04], [0.4, 0, 0.3], [.9, 1.1, 1]);
  if (x.shin) addPlate(z, 'DEF-shin.L', M.bandage, cloth, [0, .04, 0], [0, 0, 0], [1.15, 1, 1.15]);
  if (x.knee) addPlate(z, 'DEF-thigh.R', M.patch, rag, [0, .02, .06], [0.2, 0, 0], [1.1, 1, 1]);
}

export function dressKind(z, kind) {
  z.kind = kind;
  z.runner = kind === 'runner'; z.tank = kind === 'tank'; z.spitter = kind === 'spitter';
  const look = z.look || {};
  paint(z, kind, look);
  const M = mats();
  const x = look.zedExtras || {};
  if (kind === 'tank') {
    addPlate(z, 'DEF-spine003', M.plate, M.armor, [0, .04, .2], [0.2, 0, 0], [1.7, 1.85, 1.55]);
    addPlate(z, 'DEF-spine002', M.plate, x.helm === false ? M.rust : M.armor, [0, .02, .18], [0.08, 0, 0], [1.45, 1.2, 1.4]);
    if (x.pauldronL !== false) addPlate(z, 'DEF-upper_arm.L', M.pauldron, M.armor, [0.02, .12, .04], [0, 0, .5], [1.55, 1.45, 1.5]);
    if (x.pauldronR !== false) addPlate(z, 'DEF-upper_arm.R', M.pauldron, M.armor, [-0.02, .12, .04], [0, 0, -.5], [1.55, 1.45, 1.5]);
    addPlate(z, 'DEF-forearm.L', M.bracer, M.rust, [0, .05, 0], [0, 0, 0], [1.35, 1.15, 1.35]);
    addPlate(z, 'DEF-forearm.R', M.bracer, M.rust, [0, .05, 0], [0, 0, 0], [1.35, 1.15, 1.35]);
    if (x.helm !== false) addPlate(z, 'DEF-head', M.helm, M.armor, [0, .12, .02], [0.2, 0, 0], [1.45, .95, 1.4]);
  } else if (kind === 'spitter') {
    const bs = look.bellyS || 1;
    const belly = addPlate(z, 'DEF-spine.001', M.bellyGeo, M.belly, [0, .05, .05], [0.42, 0, 0], [1.45 * bs, .36 * bs, .62 * bs]);
    addPlate(z, 'DEF-spine.001', M.bellyGeo, M.belly, [0, -.02, .07], [0.55, 0, 0], [1.15 * bs, .28 * bs, .5 * bs]);
    z._belly = belly;
    const spr = new THREE.Sprite(M.flare.clone()); spr.scale.set(.22, .22, .22); spr.position.set(0, .04, .14); spr.visible = true;
    attachPart(z, 'DEF-head', spr); z._mouthGlow = spr; (z._kindMesh = z._kindMesh || []).push(spr);
  }
  dressVariety(z, look);
}

export function fxOf(scene) {
  if (!scene) return null;
  if (scene.userData._zedFx) return scene.userData._zedFx;
  const M = mats();
  const globs = [], puddles = [], rings = [];
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(M.globGeo, M.glob); m.visible = false; scene.add(m);
    globs.push({ m, v: V3(), life: 0, from: null });
  }
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(M.puddleGeo, M.puddle.clone()); m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 3; scene.add(m);
    puddles.push({ m, life: 0, max: 2.6, r: 1.15 });
  }
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(M.ringGeo, M.ring.clone()); m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 4; scene.add(m);
    rings.push({ m, life: 0, z: null });
  }
  const fx = { globs, puddles, rings, gi: 0, pi: 0, ri: 0 };
  scene.userData._zedFx = fx;
  return fx;
}

function showRing(fx, z, color, y = .05) {
  if (!fx) return null;
  const r = fx.rings[fx.ri = (fx.ri + 1) % fx.rings.length];
  r.m.visible = true; r.m.material.color.set(color); r.life = 1; r.z = z;
  const p = z.root.position; r.m.position.set(p.x, y, p.z); r.m.scale.setScalar(1.2);
  z._ring = r; return r;
}

function hideRing(z) { const r = z._ring; if (r) { r.m.visible = false; r.life = 0; r.z = null; z._ring = null; } }

export function spitAcid(scene, z, target, audio) {
  const fx = fxOf(scene); if (!fx) return;
  const g = fx.globs[fx.gi = (fx.gi + 1) % fx.globs.length];
  const origin = V3(); try { z.worldOf('DEF-head', origin); origin.y += .05; } catch (e) { origin.copy(z.root.position); origin.y += 1.5 * (z.scale || 1); }
  g.m.position.copy(origin); g.m.visible = true; g.life = 1.1; g.from = z;
  const tx = target.x - origin.x, tz = target.z - origin.z, dist = Math.hypot(tx, tz) || 1;
  const t = clamp(dist / 14, .45, .85);
  g.v.set(tx / t, ((target.y || 1.1) - origin.y) / t + 4.8, tz / t);
  if (audio && audio.acidSpit) audio.at ? audio.at(origin).acidSpit(.8) : audio.acidSpit(.8);
  else if (audio && audio.play) audio.play('acid_spit', { vol: .8, jit: .08 });
}

function dropPuddle(fx, x, z, audio) {
  const p = fx.puddles[fx.pi = (fx.pi + 1) % fx.puddles.length];
  p.m.position.set(x, .04, z); p.m.visible = true; p.life = p.max; p.m.scale.setScalar(1.3);
  p.m.rotation.z = Math.random() * 6;
  if (audio && audio.acidSizzle) audio.at ? audio.at(p.m.position).acidSizzle(.45) : audio.acidSizzle(.45);
}

export function tickKindFx(scene, dt, playerPos, onHurt, audio, driving) {
  const fx = scene && scene.userData && scene.userData._zedFx; if (!fx) return;
  for (const g of fx.globs) {
    if (!g.m.visible) continue;
    g.life -= dt; g.v.y -= 18 * dt;
    g.m.position.addScaledVector(g.v, dt);
    g.m.rotation.x += dt * 8; g.m.rotation.z += dt * 6;
    const p = g.m.position;
    let hit = p.y <= .08;
    if (!hit && playerPos && !driving) {
      const dx = p.x - playerPos.x, dy = p.y - (playerPos.y + 1.1), dz = p.z - playerPos.z;
      if (dx * dx + dy * dy + dz * dz < .55) hit = 'player';
    }
    if (hit || g.life <= 0) {
      g.m.visible = false;
      if (g.life > -1) {
        if (audio && audio.acidSplat) audio.at ? audio.at(p).acidSplat(.7) : audio.acidSplat(.7);
        dropPuddle(fx, p.x, p.z, audio);
      }
      if (hit === 'player' && onHurt) onHurt(10, p);
    }
  }
  for (const p of fx.puddles) {
    if (!p.m.visible) continue;
    p.life -= dt;
    const k = clamp(p.life / p.max, 0, 1);
    p.m.material.opacity = .25 + k * .65;
    p.m.scale.setScalar(1.1 + (1 - k) * .5);
    if (p.life <= 0) { p.m.visible = false; continue; }
    if (playerPos && !driving && onHurt) {
      const dx = p.m.position.x - playerPos.x, dz = p.m.position.z - playerPos.z;
      if (dx * dx + dz * dz < p.r * p.r) {
        p._tick = (p._tick || 0) - dt;
        if (p._tick <= 0) { p._tick = .35; onHurt(7, p.m.position); }
      }
    }
  }
  for (const r of fx.rings) {
    if (!r.m.visible) continue;
    r.life -= dt;
    if (r.z && r.z.root) r.m.position.set(r.z.root.position.x, .05, r.z.root.position.z);
    const pulse = 1.1 + Math.sin((r.life * 14)) * .15 + (1 - clamp(r.life, 0, 1)) * 1.4;
    r.m.scale.setScalar(pulse);
    r.m.material.opacity = clamp(r.life, 0, 1) * .85;
    if (r.life <= 0) { r.m.visible = false; r.z = null; }
  }
}

export function tickSpecialZed(z, dt, ctx) {
  if (!z || z.dead || z.raider || z.boss) return false;
  if (z.kind !== 'tank' && z.kind !== 'spitter') return false;
  const { d, toP, zp, driving, moveCollide, hurtPlayer, knock, toast, shake, audio, scene } = ctx;
  const fx = fxOf(scene);
  if (z.glowPulse) z.glowPulse(dt);
  if (z._mouthGlow) {
    const wind = z.mode === 'wind' && z.spitter;
    const s = wind ? .28 + Math.sin((z.mt || 0) * 22) * .1 : .16;
    z._mouthGlow.scale.setScalar(s);
    z._mouthGlow.material.opacity = wind ? .95 : .45;
  }

  const face = () => {
    const n = toP.lengthSq() > 1e-6 ? toP : V3(0, 0, 1);
    z.root.rotation.y = angLerp(z.root.rotation.y, Math.atan2(n.x, n.z), Math.min(1, dt * 7));
  };

  if (z.tank) {
    if (z.cd > 0 && z.mode !== 'charge' && z.mode !== 'wind') z.cd -= dt;
    if (z.mode === 'wind') {
      z.mt -= dt; face(); z.play('Idle_Loop');
      if (z.mt <= 0) {
        z.mode = 'charge'; z.mt = 1.15; z.hitP = false;
        z.play('Sprint_Loop', { force: true, speed: 1.15 });
        if (audio && audio.tankCharge) audio.tankCharge(z, .85);
        else if (audio && audio.roar) audio.roar(z);
        if (d < 11 && toast) toast('TANK CHARGE — ROLL!', .7);
      }
      return true;
    }
    if (z.mode === 'charge') {
      z.mt -= dt;
      z._stompT = (z._stompT || 0) - dt;
      if (z._stompT <= 0) { z._stompT = .32; if (audio && audio.tankStomp) audio.tankStomp(.7); }
      const f = V3(Math.sin(z.root.rotation.y), 0, Math.cos(z.root.rotation.y));
      const hit = moveCollide(f.x * 7.4 * dt, f.z * 7.4 * dt, .5);
      if (hit) {
        z.mode = null; z.stun = 1.0; z.cd = 3.4; z.mt = 0; hideRing(z);
        if (shake) shake(.45); if (audio && audio.crash) audio.crash();
        z.play('Hit_Chest', { once: true, force: true, cb: () => { z.curName = ''; } });
        return true;
      }
      if (d < 1.75 && !z.hitP && !driving) {
        z.hitP = true;
        if (hurtPlayer) hurtPlayer(22, zp);
        if (knock) knock(zp, 1.9);
        if (shake) shake(.35);
        if (audio && audio.thud) audio.thud();
      }
      if (z.mt <= 0) { z.mode = null; z.cd = 4.2; hideRing(z); z.play('Walk_Loop', { speed: .5 }); }
      else z.play('Sprint_Loop', { speed: 1.15 });
      return true;
    }
    // walk / melee / wind-up
    if (d < 1.2 && !driving) {
      face();
      if (z.cd <= 0) { z.cd = rnd(1.6, 2.1); z.play('Punch_Jab', { once: true, force: true, speed: .75, cb: () => { z.curName = ''; } }); z.hitAt = .4; }
      if (z.hitAt > 0) { z.hitAt -= dt; if (z.hitAt <= 0 && d < 1.6) { if (hurtPlayer) hurtPlayer(16, zp); if (knock) knock(zp, 1.0); } }
      if (!z.oneShot && !z.curName) z.play('Idle_Loop');
      return true;
    }
    if (d < 9.5 && d > 2.4 && z.cd <= 0 && !driving) {
      z.mode = 'wind'; z.mt = .85; showRing(fx, z, '#ff6a20'); face();
      z.play('Idle_Loop'); if (audio && audio.groan) audio.groan(.18, z);
      return true;
    }
    if (d > .2) {
      const n = toP.clone().normalize();
      moveCollide(n.x * z.speed * dt, n.z * z.speed * dt, .45);
      face();
      if (!z.oneShot) z.play('Walk_Loop', { speed: .48 });
    }
    return true;
  }

  if (z.spitter) {
    if (z.cd > 0 && z.mode !== 'wind') z.cd -= dt;
    if (z.mode === 'wind') {
      z.mt -= dt; face(); z.play('Idle_Loop');
      if (z.mt <= 0) {
        z.mode = null; z.cd = rnd(2.8, 3.8); hideRing(z);
        const tgt = V3(ctx.pp.x, 1.15, ctx.pp.z);
        spitAcid(scene, z, tgt, audio);
        z.play('Punch_Jab', { once: true, force: true, speed: 1.15, cb: () => { z.curName = ''; } });
        if (audio && audio.zAttack) audio.zAttack(.7, z);
      }
      return true;
    }
    if (d < 1.15 && !driving) {
      face();
      if (z.cd <= 0) { z.cd = rnd(1.3, 1.8); z.play('Punch_Jab', { once: true, force: true, speed: .9, cb: () => { z.curName = ''; } }); z.hitAt = .35; }
      if (z.hitAt > 0) { z.hitAt -= dt; if (z.hitAt <= 0 && d < 1.45 && hurtPlayer) hurtPlayer(9, zp); }
      if (!z.oneShot && !z.curName) z.play('Idle_Loop');
      return true;
    }
    const n = toP.lengthSq() > 1e-6 ? toP.clone().normalize() : V3(0, 0, 1);
    face();
    if (d < 5.2) {
      moveCollide(-n.x * z.speed * 1.05 * dt, -n.z * z.speed * 1.05 * dt, .3);
      if (!z.oneShot) z.play('Walk_Loop', { speed: .7 });
    } else if (d > 12.5) {
      moveCollide(n.x * z.speed * dt, n.z * z.speed * dt, .3);
      if (!z.oneShot) z.play('Walk_Loop', { speed: .62 });
    } else if (z.cd <= 0 && !driving && d < 16) {
      z.mode = 'wind'; z.mt = .7; showRing(fx, z, '#8fe24a');
      if (audio && audio.groan) audio.groan(.16, z);
    } else if (!z.oneShot) {
      z.play('Idle_Loop');
    }
    return true;
  }
  return false;
}

export function poseKindBones(z, t) {
  const b = z.bones; if (!b || z.dead) return;
  const runner = z.runner, tank = z.tank, spit = z.spitter;
  const armX = runner ? -.5 : tank ? -.55 : spit ? -.85 : -1.05;
  const armZ = tank ? .28 : .12;
  ['DEF-upper_arm.L', 'DEF-upper_arm.R'].forEach((n, k) => { const bn = b[n]; if (bn) { bn.rotateX(armX); bn.rotateZ((k ? -1 : 1) * armZ); } });
  if (b['DEF-head']) {
    const lol = spit ? .08 : .2;
    b['DEF-head'].rotateZ(Math.sin(t * 1.3 + z.id) * (spit ? .12 : .25) + lol);
    if (spit && z.mode === 'wind') b['DEF-head'].rotateX(-.45);
    else if (tank) b['DEF-head'].rotateX(.12);
  }
  if (b['DEF-spine.002']) b['DEF-spine.002'].rotateX(tank ? .28 : spit ? .32 : .18);
  if (spit && b['DEF-spine001']) b['DEF-spine001'].rotateX(.15);
}

export function kindMinimapColor(z) {
  if (z.tank) return '#8a90a0';
  if (z.spitter) return '#7cdb3a';
  if (z.runner) return '#e85a3a';
  return '#e33';
}

export function kindKillXP(z, o = {}) {
  if (z.boss) return 400;
  if (z.tank) return o.head ? 36 : 30;
  if (z.spitter) return o.head ? 22 : 16;
  return o.head ? 18 : 12;
}

export function knockFrom(moveCollide, playerPos, from, force) {
  const dx = playerPos.x - from.x, dz = playerPos.z - from.z;
  const l = Math.hypot(dx, dz) || 1;
  moveCollide(playerPos, (dx / l) * force, (dz / l) * force, .4);
}
