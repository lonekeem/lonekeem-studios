// v1.9.27 opening cutscene ("Prologue"): plays the first time the game opens (after the warning and studio ident, before the title menu), and from Watch Intro. Skippable. New Game no longer replays it.
// Everything on screen is the real game: the Riverside map, the story rigs for Keem / Dad / Nia (+ Biscuit in her hoodie)
// and the in-game zombies, filmed with scripted cameras. Audio is one pre-mixed ElevenLabs track (narrator, character
// lines in their in-game voices, score, SFX): public/music/atq-prologue.mp3. Timeline + subtitles: src/data/prologue.json.
import * as THREE from 'three';
import PD from '../data/prologue.json';
import { giveHammer } from './hands.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const PI = Math.PI;
const face = (c, x, z) => { const p = c.root.position; c.root.rotation.y = Math.atan2(x - p.x, z - p.z); };
const ease = (k) => k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k);
const NAMES = { keem: 'Keem', marcus: 'Dad', nia: 'Nia' };

// camera moves: [fromCam, fromLook, toCam, toLook]
const SHOT = {
  town:   [V(-3, 11, 66), V(10, 1.5, 38), V(4.5, 4.2, 50), V(14, 1.8, 39)],
  sign:   [V(-0.6, 1.75, 11.2), V(-11, 1.3, 20.5), V(-2.4, 1.6, 13.2), V(-10.2, 1.2, 19.6)],
  board:  [V(17.9, 1.75, 39.4), V(13.4, 1.2, 42.6), V(17.0, 1.65, 39.9), V(13.3, 1.2, 42.7)],
  keemC:  [V(13.3, 1.56, 41.5), V(13.3, 1.48, 42.95), V(13.36, 1.55, 41.62), V(13.3, 1.48, 42.95)],
  dadC:   [V(14.3, 1.66, 42.05), V(12.8, 1.6, 42.5), V(14.2, 1.65, 42.1), V(12.8, 1.6, 42.5)],
  niaC:   [V(14.65, 1.08, 43.2), V(15.6, 0.95, 42.3), V(14.75, 1.07, 43.1), V(15.6, 0.95, 42.3)],
  board2: [V(16.6, 1.6, 40.6), V(13.6, 1.15, 42.8), V(16.3, 1.55, 40.9), V(13.6, 1.15, 42.8)],
  street: [V(3.2, 1.6, -7.5), V(-1, 1.6, -40), V(2.3, 1.5, -13.5), V(-1, 1.4, -40)],
  horde:  [V(1.3, 0.8, -30.5), V(0, 1.3, -42), V(1.0, 0.7, -32.4), V(0, 1.25, -42)],
  porch:  [V(7.6, 1.75, 40.2), V(11.1, 1.3, 36.7), V(8.1, 1.65, 39.6), V(11.1, 1.3, 36.7)],
  keemP:  [V(9.75, 1.66, 38.3), V(11.6, 1.5, 36.85), V(9.85, 1.65, 38.2), V(11.6, 1.5, 36.85)],
  niaP:   [V(11.05, 1.0, 37.6), V(10.3, 0.92, 37.45), V(11.0, 1.0, 37.65), V(10.3, 0.92, 37.45)],
  dadP:   [V(11.55, 1.62, 37.75), V(10.2, 1.62, 36.45), V(11.5, 1.62, 37.7), V(10.2, 1.62, 36.45)],
  leave:  [V(13.3, 1.7, 37.2), V(7, 1.2, 35.2), V(13.2, 1.7, 37.15), V(6, 1.1, 34.6)],
  alone:  [V(14.0, 2.0, 39.4), V(18.1, 0.95, 42.6), V(15.2, 1.7, 41), V(18.1, 0.9, 42.6)],
  title:  [V(15.2, 1.7, 41), V(18.1, 0.9, 42.6), V(15.2, 1.7, 41), V(18.1, 0.9, 42.6)],
};
// finer cut list than the json (which carries the main beats)
const CUTS = [['town', 0], ['sign', 6.5], ['board', 12.8], ['keemC', 15.3], ['dadC', 17.2], ['niaC', 22.8], ['board2', 25.4], ['street', 27.5], ['horde', 33.5],
  ['porch', 39.0], ['keemP', 45.2], ['niaP', 47.25], ['dadP', 50.55], ['leave', 52.3], ['alone', 54.6], ['title', 60.3]];

let BUF = null, BUFP = null;
export function preloadPrologue(audio) {
  if (BUFP) return BUFP; const base = (import.meta.env && import.meta.env.BASE_URL) || './';
  BUFP = fetch(base + 'music/atq-prologue.mp3').then(r => r.arrayBuffer()).then(ab => { audio.init(); return new Promise((res, rej) => { const p = audio.ctx.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); }); }).then(b => (BUF = b)).catch(e => { console.warn('prologue audio', e); return null; });
  return BUFP;
}

function overlay() {
  let el = document.getElementById('cine'); if (el) el.remove();
  el = document.createElement('div'); el.id = 'cine';
  el.innerHTML = '<div class="bar top"></div><div class="bar bot"></div><div class="cap"></div><div class="place"></div><div class="ttl"><div class="t1">AFTER THE QUIET</div><div class="t2">CHAPTER 1 · THE DAY BEFORE</div></div><div class="blk"></div><button class="skip" type="button">Skip ▸▸</button><div class="hint">Tap again to skip</div>';
  document.body.appendChild(el); return el;
}


export function runPrologue(g, done) {
  const A = g.audio, S = g.settings || {}; const el = overlay(); document.body.classList.add('cine');
  const cap = el.querySelector('.cap'), place = el.querySelector('.place'), ttl = el.querySelector('.ttl'), blk = el.querySelector('.blk'), hint = el.querySelector('.hint');
  const capture = !!window.__cutCapture;
  // ---- cast (real story rigs)
  const P0 = g.player; const dad = g.npc('pro_dad', 'marcus', 12.75, 42.5, -PI / 2, 'Idle_Loop'); const nia = g.npc('pro_nia', 'nia', 15.6, 42.3, -PI / 2 - .3, 'Idle_Talking_Loop', 0.62);
  const zs = []; [[-2.2, -40], [1.4, -41.5], [-0.3, -43.5], [3.1, -44.5], [-3.6, -45.5], [0.9, -47]].forEach(([x, z], i) => { const c = g.spawnZ(x, z, { idle: true, aggro: 0, det: .001, runner: false }); c.det = .001; c.aggro = 0; c.root.rotation.y = (i % 2 ? .12 : -.1); c.play('Walk_Loop', { speed: .55 + i * .03 }); zs.push(c); });
  const R = g.renderer, exp0 = R ? R.toneMappingExposure : 1; if (R) R.toneMappingExposure = exp0 * 1.4;
  (g.pickups || []).forEach(p => { p.mesh.visible = false; });
  const cut = g.cut = { anim: 'Idle_Loop', cam: V(0, 17, 80), look: V(0, 1, 22), snap: true, fov: 62, flash: false, noFace: true };
  // ---- audio
  let src = null, t0 = 0, t = 0, ended = false;
  const startAudio = () => { if (!BUF || !A.ctx) return; try { src = A.ctx.createBufferSource(); src.buffer = BUF; const gn = A.ctx.createGain(); gn.gain.value = 1; src.connect(gn); gn.connect(A.master); src.start(); try { A.holdSrc && A.holdSrc(src); } catch (e2) { } t0 = A.ctx.currentTime; } catch (e) { src = null; } };
  if (A.windG) { A._proWind = A.windG.gain.value; A.windG.gain.setTargetAtTime(0.06, A.ctx.currentTime, .5); }
  try { A.beginSession && A.beginSession('story'); } catch (e) { } if (A.rain) A.rain(true);
  startAudio();
  // ---- skip: Skip button = one tap, anywhere else = tap twice (so a stray tap does not throw the scene away), Esc/Enter/Space = skip
  let armed = 0;
  const skip = () => finish(true);
  const onTap = (e) => { if (e.target && e.target.closest && e.target.closest('.skip')) return; if (performance.now() - armed < 2200) { skip(); return; } armed = performance.now(); hint.classList.add('on'); setTimeout(() => hint.classList.remove('on'), 2200); };
  const onKey = (e) => { if (['Escape', 'Enter', ' ', 'Spacebar'].includes(e.key) || e.code === 'Space') { e.preventDefault(); e.stopImmediatePropagation(); skip(); } else { e.stopImmediatePropagation(); onTap(e); } };
  el.querySelector('.skip').addEventListener('click', (e) => { e.stopPropagation(); skip(); });
  el.addEventListener('pointerdown', onTap); addEventListener('keydown', onKey, true);
  // ---- shots
  let cur = -1;
  const P = P0.root.position;
  function enterShot(id) {
    blk.classList.remove('on');
    if (id === 'town' || id === 'sign' || id === 'street' || id === 'horde') { dad.root.visible = nia.root.visible = false; P0.root.visible = false; }
    if (id === 'board' || id === 'keemC' || id === 'dadC' || id === 'niaC' || id === 'board2') {
      dad.root.visible = nia.root.visible = true; P0.root.visible = true; g.setDoor(false);
      dad.root.position.set(12.75, 0, 42.5); P.set(13.35, 0, 42.95); nia.root.position.set(15.6, 0, 42.3);
      face(nia, 13.2, 42.9); dad.play('Interact'); cut.anim = 'Idle_Loop'; face(P0, 12.3, 42.4); nia.play('Idle_Loop');
      giveHammer(dad, id === 'board'); // hammer in his right hand; a spare board in the left only while he's nailing
      if (id === 'keemC') { cut.anim = 'Idle_Talking_Loop'; face(P0, 12.75, 42.5); }
      if (id === 'dadC') { face(dad, 13.45, 43.4); dad.play('Idle_Talking_Loop'); cut.anim = 'Idle_Loop'; face(P0, 12.75, 42.5); }
      if (id === 'niaC') { nia.play('Idle_Talking_Loop'); face(nia, 13.4, 43.0); cut.anim = 'Idle_Loop'; face(P0, 15.6, 42.3); face(dad, 15.6, 42.3); dad.play('Idle_Loop'); }
      if (id === 'board2') { face(dad, 15.6, 42.3); dad.play('Idle_Talking_Loop'); cut.anim = 'Idle_Loop'; face(P0, 12.75, 42.5); }
    }
    if (id === 'horde') zs.forEach((z, i) => { z.root.position.z = [-40, -41.5, -43.5, -44.5, -45.5, -47][i]; });
    if (id === 'porch' || id === 'keemP' || id === 'niaP' || id === 'dadP' || id === 'leave') {
      dad.root.visible = nia.root.visible = true; P0.root.visible = true; g.setDoor(true);
      if (dad._hammer) dad._hammer.visible = false; if (dad._plank) dad._plank.visible = false;
      if (id === 'porch') { P.set(11.6, 0, 36.85); dad.root.position.set(10.2, 0, 36.45); nia.root.position.set(10.3, 0, 37.45); }
      face(P0, 10.25, 36.95); face(dad, 11.6, 36.85); face(nia, 11.6, 36.85); cut.anim = 'Idle_Loop'; dad.play('Idle_Talking_Loop'); nia.play('Idle_Loop');
      if (id === 'keemP') { cut.anim = 'Idle_Talking_Loop'; dad.play('Idle_Loop'); }
      if (id === 'niaP') { nia.play('Idle_Talking_Loop'); dad.play('Idle_Loop'); }
      if (id === 'leave') { P.set(12.35, 0, 36.85); face(P0, 9, 36.2); cut.anim = 'Idle_Loop'; dad.play('Walk_Loop', { speed: .9 }); nia.play('Walk_Loop', { speed: 1.05 }); dad.walk = 1; nia.walk = 1; }
    }
    if (id === 'alone' || id === 'title') { dad.root.visible = nia.root.visible = false; P0.root.visible = true; g.setDoor(false); P.set(18.1, 0, 42.6); P0.root.rotation.y = -PI / 2; cut.anim = 'Sitting_Idle_Loop'; }
    if (id === 'title') { ttl.classList.add('on'); }
    place.classList.toggle('on', id === 'town'); if (id === 'town') place.textContent = 'RIVERSIDE, MAINE · THE NIGHT BEFORE';
  }
  function tick(dt) {
    if (ended) return; dt = Math.min(.1, Math.max(0, dt || 0));
    if (src && !capture) { const at = A.ctx.currentTime - t0; t = Math.max(t, at); } else t += dt;
    // which cut
    let ci = 0; for (let i = 0; i < CUTS.length; i++) if (t >= CUTS[i][1]) ci = i;
    if (ci !== cur) { cur = ci; enterShot(CUTS[ci][0]); }
    const [id, ts] = CUTS[ci], te = CUTS[ci + 1] ? CUTS[ci + 1][1] : PD.dur; const k = ease((t - ts) / Math.max(.1, te - ts));
    const s = SHOT[id]; cut.cam.lerpVectors(s[0], s[2], k); cut.look.lerpVectors(s[1], s[3], k);
    const portrait = innerHeight > innerWidth * 1.05; cut.fov = portrait ? 84 : 58;
    // actor motion
    if (id === 'horde') zs.forEach((z) => { z.root.position.z += dt * .75; });
    if (id === 'leave') { [dad, nia].forEach((c, i) => { const p = c.root.position; const tx = 6.5, tz = 34.2 + i * .6; const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz); if (d > .2) { p.x += dx / d * dt * 1.25; p.z += dz / d * dt * 1.25; c.root.rotation.y = Math.atan2(dx, dz); } }); }
    // fade to black just before hard location changes and at the very end
    const nextT = CUTS[ci + 1] ? CUTS[ci + 1][1] : 999; const fadeCut = ['street', 'porch', 'alone', 'title'].includes(CUTS[ci + 1] && CUTS[ci + 1][0]);
    blk.style.opacity = t < .6 ? String(1 - t / .6) : (fadeCut && nextT - t < .45 ? String(1 - (nextT - t) / .45) : (t > PD.dur - 1.2 ? String(Math.min(1, (t - (PD.dur - 1.2)) / 1.0)) : '0'));
    // subtitles
    if (S.subs !== false) { const L = PD.lines.find(l => t >= l.t && t < l.t + (l.b - l.a) + .25); const html = L ? (L.who === 'narrator' ? `<i>${L.text}</i>` : `<b class="w-${L.who}">${NAMES[L.who] || L.who}</b> ${L.text}`) : ''; if (cap._h !== html) { cap._h = html; cap.innerHTML = html; cap.classList.toggle('on', !!html); } }
    if (t >= PD.dur) finish(false);
  }
  function finish(skipped) {
    if (ended) return; ended = true; g.pro = null; if (R) R.toneMappingExposure = exp0; removeEventListener('keydown', onKey, true);
    try { (g.LS || localStorage).setItem('atq_prologue_seen', '1'); } catch (e) {}
    try { if (src) { const gn = A.ctx.createGain(); src.disconnect(); src.connect(gn); gn.connect(A.master); gn.gain.setValueAtTime(1, A.ctx.currentTime); gn.gain.linearRampToValueAtTime(0, A.ctx.currentTime + .5); setTimeout(() => { try { src.stop(); } catch (e) { } }, 600); } } catch (e) { }
    if (A.windG && A._proWind != null) A.windG.gain.setTargetAtTime(A._proWind, A.ctx.currentTime, 1);
    blk.style.transition = 'opacity .35s'; blk.style.opacity = '1';
    setTimeout(() => { el.classList.add('out'); document.body.classList.remove('cine'); dad.root.visible = nia.root.visible = true; P0.root.visible = true; done && done(skipped); setTimeout(() => el.remove(), 900); }, skipped ? 380 : 50);
  }
  g.pro = { tick, finish, get t() { return t; } };
  return g.pro;
}
