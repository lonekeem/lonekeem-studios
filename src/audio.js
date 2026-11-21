// Procedural audio synthesized at runtime, plus (v1.3.2) a sample layer at the bottom of this file.
export class AudioSys {
  constructor(settings) { this.s = settings; this.ctx = null; }
  /** iOS Safari: Web Audio only starts from a touchend/click. Call from those events until it reports 'running' (state can also be 'interrupted' after a call/lock). `playback` = ignore the silent switch (multiplayer asks for it). */
  unlock(playback) {
    try { this.init(); const c = this.ctx; if (!c) return false; if (playback && navigator.audioSession) navigator.audioSession.type = 'playback';
      if (c.state !== 'running') { c.resume().catch(() => {}); const src = c.createBufferSource(); src.buffer = c.createBuffer(1, 1, 22050); src.connect(c.destination); src.start(0); }
      return c.state === 'running'; } catch (e) { return false; }
  }
  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const ctx = this.ctx = new C();
    this.master = ctx.createGain(); this.master.connect(ctx.destination);
    this.music = ctx.createGain(); this.music.connect(this.master);
    this.sfx = ctx.createGain(); this.sfx.connect(this.master);
    // reverb
    const len = ctx.sampleRate * 2.5, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    this.verb = ctx.createConvolver(); this.verb.buffer = ir; const vg = ctx.createGain(); vg.gain.value = 0.35; this.verb.connect(vg); vg.connect(this.master);
    // noise buffer
    const nb = this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const d = nb.getChannelData(0); let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    this.white = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const wd = this.white.getChannelData(0); for (let i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1;
    // wind bed
    const src = ctx.createBufferSource(); src.buffer = nb; src.loop = true;
    this.windF = ctx.createBiquadFilter(); this.windF.type = 'lowpass'; this.windF.frequency.value = 400;
    this.windG = ctx.createGain(); this.windG.gain.value = 0.15;
    src.connect(this.windF); this.windF.connect(this.windG); this.windG.connect(this.music); src.start();
    this.padG = ctx.createGain(); this.padG.gain.value = 0; this.padG.connect(this.music); this.padG.connect(this.verb);
    this.mode = this.mode || 'boot'; this.applyVolumes();
    this._tick = setInterval(() => this.ambientTick(), 1000);
    this.chordIdx = 0;
  }
  applyVolumes() { if (!this.ctx) return;
    if (!this.ctx) return;
    this.master.gain.value = this.s.vol; this.music.gain.value = this.s.music;
  }
  setMood(mode) { if (!this.ctx) return; this.mode = mode;
    const t = this.ctx.currentTime;
    const wind = { menu: 0.10, day: 0.07, evening: 0.14, night: 0.3, tense: 0.32, sad: 0.12, loading: 0.08 }[mode] ?? 0.15;
    this.windG.gain.setTargetAtTime(wind, t, 1.5);
    this.windF.frequency.setTargetAtTime(mode === 'day' ? 900 : 380, t, 1.5);
    if (mode === 'menu') this.playMenuTheme();
    else if (mode === 'loading') this.playLoadingLoop();
    else { this._stopTrack('menu', 0.8); this._stopTrack('loading', 0.45); }
  }
  // ---- v1.9.23 scored tracks (menu theme, intro sting, loading loop). They ride `this.music`, so the Music slider applies.
  async loadTracks() {
    if (this._tracksP) return this._tracksP;
    const base = (import.meta.env && import.meta.env.BASE_URL) || './';
    const files = { menu: 'music/atq-menu-theme.mp3', sting: 'music/atq-intro-sting.mp3', loading: 'music/atq-loading-loop.mp3' };
    this._tracksP = Promise.all(Object.entries(files).map(async ([k, rel]) => {
      try {
        const r = await fetch(base + rel);
        if (!r.ok) throw new Error(r.status);
        const ab = await r.arrayBuffer();
        this.init();
        const dec = this.ctx.decodeAudioData(ab.slice(0));
        const buf = dec && dec.then ? await dec : await new Promise((res, rej) => this.ctx.decodeAudioData(ab.slice(0), res, rej));
        this._tbuf = this._tbuf || {}; this._tbuf[k] = buf;
      } catch (e) { console.warn('scored track failed', k, e); }
    })).then(() => {
      if (this.mode === 'menu') this.playMenuTheme();
      else if (this.mode === 'loading') this.playLoadingLoop();
      return this._tbuf || {};
    });
    return this._tracksP;
  }
  _fadeGain(g, to, sec) {
    if (!this.ctx || !g) return;
    const t = this.ctx.currentTime, d = Math.max(0.02, sec);
    try { g.gain.cancelScheduledValues(t); } catch (e) { /* ignore */ }
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(to, t + d);
  }
  _startTrack(key, { loop = false, fade = 0.6, gain = 1 } = {}) {
    if (!this.ctx || !this._tbuf || !this._tbuf[key]) return null;
    this._stopTrack(key, 0.04);
    const src = this.ctx.createBufferSource();
    src.buffer = this._tbuf[key]; src.loop = !!loop;
    const g = this.ctx.createGain(); g.gain.value = 0;
    src.connect(g); g.connect(this.music);
    try { src.start(); } catch (e) { return null; }
    this._fadeGain(g, gain, fade);
    this._tplay = this._tplay || {};
    const rec = { src, g };
    this._tplay[key] = rec;
    src.onended = () => { if (this._tplay && this._tplay[key] === rec) delete this._tplay[key]; };
    return rec;
  }
  _stopTrack(key, fade = 0.5) {
    const rec = this._tplay && this._tplay[key]; if (!rec) return;
    delete this._tplay[key];
    this._fadeGain(rec.g, 0, fade);
    try { rec.src.stop(this.ctx.currentTime + Math.max(0.05, fade) + 0.05); } catch (e) { /* already stopped */ }
  }
  playSting() { this.init(); if (this._tbuf && this._tbuf.sting) this._startTrack('sting', { loop: false, fade: 0.06, gain: 1 }); else this.sting(); }
  playMenuTheme() { this.init(); if (this._tplay && this._tplay.menu) return; this._stopTrack('loading', 0.5); this._startTrack('menu', { loop: true, fade: 0.9, gain: 0.9 }); }
  playLoadingLoop() { this.init(); if (this._tplay && this._tplay.loading) return; this._stopTrack('menu', 0.45); this._startTrack('loading', { loop: true, fade: 0.5, gain: 0.85 }); }
  stopScored(fade = 0.6) { this._stopTrack('menu', fade); this._stopTrack('loading', fade); this._stopTrack('sting', Math.min(0.35, fade)); }
  tone(freq, dur, type = 'sine', vol = 0.05, dest, attack = 0.8) { if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g); g.connect(dest || this.padG); o.start(t); o.stop(t + dur + 0.1); return o;
  }
  ambientTick() { if (!this.ctx) return;
    if (!this.ctx || this.ctx.state !== 'running') return;
    const m = this.mode, t = this.ctx.currentTime;
    this.padG.gain.setTargetAtTime(m === 'tense' ? 0.5 : 0.8, t, 1);
    // music pad every 6s
    if (m === 'menu' && this._tplay && this._tplay.menu) return;
    if (m === 'loading' && this._tplay && this._tplay.loading) return;
    if ((this._n = (this._n || 0) + 1) % 6 === 0) {
      const sets = {
        day: [[261.6, 329.6, 392, 493.9], [220, 261.6, 329.6, 392], [174.6, 220, 261.6, 329.6], [196, 246.9, 293.7, 392]],
        evening: [[220, 261.6, 329.6], [174.6, 220, 261.6], [196, 233, 293.7], [164.8, 207.7, 246.9]],
        sad: [[220, 261.6, 329.6, 440], [174.6, 220, 261.6, 349.2], [130.8, 196, 261.6, 329.6], [146.8, 174.6, 220, 293.7]],
        night: [[55, 82.4, 116.5], [51.9, 77.8, 110]], tense: [[55, 58.3, 82.4], [49, 51.9, 73.4]], menu: [[55, 82.4, 98], [49, 73.4, 92.5]]
      }[m] || [];
      if (sets.length) { const ch = sets[this.chordIdx++ % sets.length]; ch.forEach(f => this.tone(f, 7, m === 'day' || m === 'sad' ? 'triangle' : 'sawtooth', m === 'day' ? 0.018 : 0.012, null, 2)); }
    }
    if (m === 'day' && Math.random() < 0.35) this.bird();
    if ((m === 'evening' || m === 'night' || m === 'menu') && Math.random() < 0.05) this.siren(0.02);
    if ((m === 'night' || m === 'tense') && Math.random() < 0.08) this.dog();
  }
  bird() { if (!this.ctx) return; const ctx = this.ctx, t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    const f = 2500 + Math.random() * 1500; o.frequency.setValueAtTime(f, t);
    for (let i = 0; i < 3; i++) { o.frequency.linearRampToValueAtTime(f * 1.3, t + i * 0.12 + 0.05); o.frequency.linearRampToValueAtTime(f, t + i * 0.12 + 0.1); }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.012, t + 0.02); g.gain.linearRampToValueAtTime(0, t + 0.4);
    o.connect(g); g.connect(this.music); g.connect(this.verb); o.start(); o.stop(t + 0.5); }
  siren(vol = 0.03, dur = 8) { if (!this.ctx) return; const ctx = this.ctx, t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 900;
    for (let i = 0; i < dur; i++) { o.frequency.setValueAtTime(650, t + i); o.frequency.linearRampToValueAtTime(950, t + i + 0.5); o.frequency.linearRampToValueAtTime(650, t + i + 1); }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 2); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(f); f.connect(g); g.connect(this.sfx); g.connect(this.verb); o.start(); o.stop(t + dur); }
  dog() { if (!this.ctx) return; for (let i = 0; i < 3; i++) setTimeout(() => this.noise(0.15, 500, 0.02, 'bandpass'), i * 350); }
  noise(dur, freq, vol, type = 'lowpass', q = 1) { if (!this.ctx) return; const ctx = this.ctx, t = ctx.currentTime, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = this.white; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfx); g.connect(this.verb); s.start(); s.stop(t + dur + 0.05); }
  glass() { if (!this.ctx) return; for (let i = 0; i < 8; i++) setTimeout(() => { this.noise(0.3, 3000 + Math.random() * 4000, 0.25, 'bandpass', 8); this.tone(2000 + Math.random() * 3000, 0.25, 'sine', 0.04, this.sfx, 0.005); }, i * 40 + Math.random() * 60); }
  hit() { if (!this.ctx) return; this.noise(0.15, 400, 0.6); this.tone(90, 0.2, 'sine', 0.4, this.sfx, 0.005); }
  swing() { if (!this.ctx) return; this.noise(0.18, 1200, 0.15, 'bandpass', 2); }
  hurt() { if (!this.ctx) return; this.tone(120, 0.4, 'sawtooth', 0.15, this.sfx, 0.01); this.noise(0.3, 300, 0.4); }
  groan(vol = 0.1) { if (!this.ctx) return; const ctx = this.ctx, t = ctx.currentTime, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; const b = 70 + Math.random() * 50; o.frequency.setValueAtTime(b, t); o.frequency.linearRampToValueAtTime(b * 0.7, t + 1.4);
    f.type = 'bandpass'; f.frequency.value = 500 + Math.random() * 300; f.Q.value = 3;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.3); g.gain.linearRampToValueAtTime(0, t + 1.5);
    o.connect(f); f.connect(g); g.connect(this.sfx); g.connect(this.verb); o.start(); o.stop(t + 1.6); }
  thud() { if (!this.ctx) return; this.tone(55, 0.6, 'sine', 0.6, this.sfx, 0.005); this.noise(0.4, 200, 0.5); }
  crash() { if (!this.ctx) return; this.noise(1.4, 800, 0.9); this.glass(); this.thud(); }
  heartbeat() { if (!this.ctx) return; this.tone(50, 0.15, 'sine', 0.4, this.sfx, 0.01); setTimeout(() => this.tone(45, 0.15, 'sine', 0.3, this.sfx, 0.01), 250); }
  staticBurst(dur = 1.5) { if (!this.ctx) return; this.noise(dur, 2500, 0.08, 'bandpass', 0.5); }
  sting() { if (!this.ctx) return; if (this._tbuf && this._tbuf.sting) { this.playSting(); return; } this.tone(55, 4, 'sawtooth', 0.08, this.sfx, 0.05); [110, 164.8, 220, 329.6].forEach((f, i) => setTimeout(() => this.tone(f, 3.5, 'triangle', 0.05, this.verb, 0.4), 200 + i * 120)); this.noise(2.5, 6000, 0.05, 'highpass'); }
  radioJingle() { if (!this.ctx) return; [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, 'square', 0.02, this.sfx, 0.01), i * 160)); }
  // narration files
  // trailer score: deep detuned drone + slow swells
  drone(on) { if (!this.ctx) return; const ctx = this.ctx, t = ctx.currentTime;
    if (on && !this._dr) { const g = ctx.createGain(); g.gain.value = 0; g.connect(this.music); g.connect(this.verb);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260; f.connect(g);
      this._dr = { g, os: [36.7, 36.9, 55, 73.4].map(fr => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.connect(f); o.start(); return o; }) };
      g.gain.linearRampToValueAtTime(0.09, t + 6); }
    if (!on && this._dr) { const d = this._dr; this._dr = null; d.g.gain.setTargetAtTime(0, t, 0.05); setTimeout(() => d.os.forEach(o => o.stop()), 800); } }
  boom() { if (!this.ctx) return; this.tone(32, 3, 'sine', 0.7, this.sfx, 0.01); this.noise(2.2, 120, 0.6); this.tone(65, 4, 'triangle', 0.06, this.verb, 0.05); }

  // action soundtrack: synthesized drum + bass loop (level 0 off, 1 groove, 2 full fight)
  beat(level) { if (!this.ctx) return; this._bl = level;
    if (level && !this._bt) { let step = 0; const ctx = this.ctx;
      this._bt = setInterval(() => { if (!this._bl || ctx.state !== 'running') return; const s = step++ % 16, L = this._bl;
        if (s % 4 === 0 || (L > 1 && s === 10)) { this.tone(52, 0.25, 'sine', 0.35, this.music, 0.003); }
        if (s === 4 || s === 12) this.noise(0.18, 1800, L > 1 ? 0.28 : 0.16, 'bandpass', 0.7);
        if (L > 1 && s % 2 === 1) this.noise(0.04, 8000, 0.05, 'highpass');
        const bass = [41.2, 41.2, 49, 36.7][Math.floor(step / 16) % 4];
        if (s % 4 === 2 || (L > 1 && s % 4 === 3)) this.tone(bass * 2, 0.14, 'sawtooth', 0.05, this.music, 0.005);
        if (L > 1 && s === 0 && Math.random() < .5) this.tone(bass * 4, 0.9, 'square', 0.015, this.verb, 0.05);
      }, 125); }
    if (!level && this._bt) { clearInterval(this._bt); this._bt = null; } }
  bonk() { if (!this.ctx) return; this.tone(660, 0.35, 'triangle', 0.25, this.sfx, 0.002); this.tone(990, 0.25, 'sine', 0.12, this.sfx, 0.002); this.noise(0.08, 2000, 0.4); }
  explode() { if (!this.ctx) return; this.boom(); this.noise(2.8, 500, 1.0); setTimeout(() => this.noise(1.5, 2500, 0.3, 'bandpass'), 200); }
  pickup() { if (!this.ctx) return; [784, 1175].forEach((f, i) => setTimeout(() => this.tone(f, 0.2, 'triangle', 0.08, this.sfx, 0.005), i * 90)); }
  bark() { if (!this.ctx) return; this.noise(0.12, 700, 0.35, 'bandpass', 3); this.tone(380, 0.1, 'square', 0.05, this.sfx, 0.005); }
  engine(on, rpm = 0) { if (!this.ctx) return; const ctx = this.ctx;
    if (on && !this._en) { const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 300; g.gain.value = 0.05; o.connect(f); f.connect(g); g.connect(this.sfx); o.start(); this._en = { o, g }; }
    if (this._en) { if (!on) { this._en.o.stop(); this._en = null; return; } this._en.o.frequency.setTargetAtTime(35 + rpm * 60, ctx.currentTime, 0.1); } }
  scream(vol = 0.12) { if (!this.ctx) return; const ctx = this.ctx, t = ctx.currentTime, o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o2.type = 'square'; const b = 600 + Math.random() * 300; o.frequency.setValueAtTime(b, t); o.frequency.linearRampToValueAtTime(b * 1.5, t + 0.25); o.frequency.linearRampToValueAtTime(b * 0.8, t + 1.3);
    o2.frequency.value = 7; const lg = ctx.createGain(); lg.gain.value = 40; o2.connect(lg); lg.connect(o.frequency);
    f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 2; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.08); g.gain.linearRampToValueAtTime(0, t + 1.4);
    o.connect(f); f.connect(g); g.connect(this.sfx); g.connect(this.verb); o.start(); o2.start(); o.stop(t + 1.5); o2.stop(t + 1.5); }
  shot(kind = 'pistol') { if (!this.ctx) return; const big = kind === 'shotgun' || kind === 'sniper' || kind === 'revolver';
    this.noise(big ? 0.5 : 0.22, big ? 900 : 1600, big ? 1.0 : 0.7); this.tone(big ? 60 : 110, 0.15, 'square', 0.25, this.sfx, 0.002); }
  click() { if (!this.ctx) return; this.tone(1800, 0.04, 'square', 0.05, this.sfx, 0.001); }
  splat() { if (!this.ctx) return; this.noise(0.25, 350, 0.5, 'lowpass', 2); this.noise(0.12, 900, 0.2, 'bandpass', 4); }
}

// ---------- v1.3.2 sample layer ----------
// Recorded/rendered samples in public/sfx (Kenney CC0, procedurally synthesized, and Kokoro TTS voices — see CREDITS.md).
// Every method falls back to the synthesized version above if its sample has not loaded yet.
export const vhash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };
const BASE = (import.meta.env && import.meta.env.BASE_URL || '/') + 'sfx/';
const FAM = { gun_pistol: 3, gun_rifle: 3, gun_shotgun: 3, gun_revolver: 3, gun_smg: 3, gun_sniper: 3, thunder: 3, z_growl: 6, z_moan: 4, z_attack: 3, z_eat: 3, z_chew: 4, z_tear: 3, scream: 4,
  step_concrete: 5, step_grass: 5, step_wood: 5, punch: 5, bat: 5, flesh: 5, metal: 5, shell: 5, plank: 5, glass: 5, cloth: 2, step_mud: 5, step_asphalt: 5, z_shuffle: 4, breath: 4, jump: 2, land: 2, squelch: 3 };
const ONE = ['explosion', 'rain_loop', 'truck_loop', 'boss_roar', 'reload_out', 'reload_in', 'door_open', 'creak', 'knife', 'coins', 'chop', 'roll', 'alarm_loop', 'wind_loop', 'tire_loop'];
const P = AudioSys.prototype, O = {};
['init', 'applyVolumes', 'setMood', 'ambientTick', 'shot', 'hit', 'swing', 'hurt', 'groan', 'thud', 'crash', 'explode', 'pickup', 'engine', 'scream', 'click', 'splat', 'glass'].forEach(k => O[k] = P[k]);
P.init = function () { const first = !this.ctx; O.init.call(this); if (!first || !this.ctx) return;
  this.bufs = {}; this.loading = {}; this.voiceBus = this.ctx.createGain(); this.voiceBus.connect(this.master); this.amb = this.ctx.createGain(); this.amb.connect(this.music);
  this.lastBark = 0; this.applyVolumes();
  const names = ONE.slice(); for (const f in FAM) for (let i = 0; i < FAM[f]; i++) names.push(f + i);
  fetch(BASE + 'manifest.json').then(r => r.json()).then(m => { this.man = m; }).catch(() => {});
  let i = 0; const next = () => { if (i < names.length) this.load(names[i++]).finally(next); }; for (let k = 0; k < 4; k++) next();
};
P.applyVolumes = function () { O.applyVolumes.call(this); if (!this.ctx) return; this.sfx.gain.value = this.s.sfxVol ?? 1; if (this.voiceBus) this.voiceBus.gain.value = this.s.voices === false ? 0 : (this.s.voiceVol ?? 1); };
P.load = function (name) { if (this.bufs[name]) return Promise.resolve(this.bufs[name]); if (this.loading[name]) return this.loading[name];
  return this.loading[name] = fetch(BASE + name + '.mp3').then(r => { if (!r.ok || /html/.test(r.headers.get('content-type') || '')) throw 0; return r.arrayBuffer(); })
    .then(a => new Promise((res, rej) => { const q = this.ctx.decodeAudioData(a, res, rej); if (q && q.catch) q.catch(rej); })).then(b => (this.bufs[name] = b)).catch(() => null); };
// play a sample; returns the source node, or null if not loaded (caller then uses the synth fallback)
// v1.4.1 3D audio: audio.at(pos) tags the next sample(s) in this tick with a world position -> PannerNode (equalpower for phones),
// inverse distance falloff, distance low-pass, and a hard cap on simultaneous sounds (far/quiet ones are dropped first).
const DUMMY = { g: { gain: { value: 0, setTargetAtTime() {} } }, playbackRate: { setTargetAtTime() {} }, stop() {}, dummy: true };
const MOBILE = typeof navigator !== 'undefined' && /Android|iPhone|iPad/i.test(navigator.userAgent); const MAXV = MOBILE ? 18 : 30;
P.at = function (p) { if (!p) return this; this._at = { x: p.x, y: p.y ?? 1, z: p.z }; if (!this._atQ) { this._atQ = 1; queueMicrotask(() => { this._at = null; this._atQ = 0; }); } return this; };
P.listen = function (cam, indoors) { if (!this.ctx) return; const L = this.ctx.listener, e = cam.matrixWorld.elements, t = this.ctx.currentTime; const x = e[12], y = e[13], z = e[14];
  this.lpos = { x, y, z }; if (L.positionX) { L.positionX.setTargetAtTime(x, t, .02); L.positionY.setTargetAtTime(y, t, .02); L.positionZ.setTargetAtTime(z, t, .02); L.forwardX.setTargetAtTime(-e[8], t, .02); L.forwardY.setTargetAtTime(-e[9], t, .02); L.forwardZ.setTargetAtTime(-e[10], t, .02); L.upX.setTargetAtTime(e[4], t, .02); L.upY.setTargetAtTime(e[5], t, .02); L.upZ.setTargetAtTime(e[6], t, .02); }
  else { L.setPosition(x, y, z); L.setOrientation(-e[8], -e[9], -e[10], e[4], e[5], e[6]); }
  if (indoors !== this.indoors) { this.indoors = indoors; this.rain(this.rainOn !== false, indoors ? .05 : .16); this.wind(true, indoors ? .02 : .1); } };
P.dist = function (p) { const l = this.lpos; if (!l || !p) return 0; const dx = p.x - l.x, dy = (p.y ?? 1) - l.y, dz = p.z - l.z; return Math.sqrt(dx * dx + dy * dy + dz * dz); };
P.play = function (name, o = {}) { if (!this.ctx) return null; let n = name; if (FAM[name]) n = name + Math.floor(Math.random() * FAM[name]);
  const pos = o.pos || (o.flat ? null : this._at); const d = pos ? this.dist(pos) : 0; const maxD = o.maxD || 70;
  if (pos && d > maxD) return DUMMY; this.nAct = this.nAct || 0;
  if (this.nAct >= MAXV && !o.loop && (pos ? d > 6 : (o.vol ?? 1) < .4)) return DUMMY;
  const b = this.bufs[n]; if (!b) { this.load(n); return null; }
  const s = this.ctx.createBufferSource(), g = this.ctx.createGain(); s.buffer = b; s.loop = !!o.loop; s.playbackRate.value = (o.rate || 1) * (1 + (o.jit ?? .06) * (Math.random() * 2 - 1));
  g.gain.value = o.vol ?? 1; s.connect(g); let out = g;
  if (pos && this.ctx.createPanner) { const p = this.ctx.createPanner(); p.panningModel = 'equalpower'; p.distanceModel = 'inverse'; p.refDistance = o.ref || 2.5; p.maxDistance = maxD; p.rolloffFactor = o.roll ?? 1.1;
    if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y ?? 1; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y ?? 1, pos.z);
    if (d > 14) { const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = Math.max(700, 16000 / (1 + (d - 14) * .25)); out.connect(f); out = f; }
    out.connect(p); out = p; s.panner = p; }
  else if (o.pan && this.ctx.createStereoPanner) { const p = this.ctx.createStereoPanner(); p.pan.value = o.pan; g.connect(p); out = p; }
  out.connect(o.bus || this.sfx); if (o.verb || d > 20) g.connect(this.verb); if (!o.loop) { this.nAct++; s.onended = () => { this.nAct--; }; }
  s.start(this.ctx.currentTime + (o.delay || 0)); s.g = g; return s; };
P.move = function (src, p) { if (src && src.panner && p) { const q = src.panner; if (q.positionX) { q.positionX.value = p.x; q.positionY.value = p.y ?? 1; q.positionZ.value = p.z; } else q.setPosition(p.x, p.y ?? 1, p.z); } };
// loop emitter attached to an object (car alarm, burning car, engine of NPC cars)
P.loopAt = function (name, p, vol = .5, o = {}) { const s = this.play(name, Object.assign({ loop: true, pos: p, vol, jit: 0 }, o)); return s && !s.dummy ? s : null; };
P.wind = function (on, vol = .1) { if (!this.ctx) return; if (on && !this.windSrc) { this.windSrc = this.play('wind_loop', { loop: true, vol: 0, bus: this.amb, jit: 0, flat: true }); if (!this.windSrc) return; }
  if (this.windSrc) this.windSrc.g.gain.setTargetAtTime(on ? vol : 0, this.ctx.currentTime, 1.5); };
P.footstep = function (surf, p, vol = .35, who = 'p') { const k = who === 'z' ? (Math.random() < .6 ? 'z_shuffle' : 'step_' + surf) : 'step_' + surf; this.play(k, { pos: p, vol: who === 'z' ? vol * .9 : vol, jit: .12, ref: who === 'p' ? 4 : 2, maxD: 30, rate: who === 'z' ? .85 : 1 }); };
P.breathe = function (vol = .25) { if (this.noKeem) return; this.play('breath', { vol, jit: .08, flat: true }); };
P.jumpS = function () { this.play('jump', { vol: .45, flat: true }); };
P.land = function (vol = .6) { this.play('land', { vol, flat: true }); this.play('cloth', { vol: .25, flat: true }); };
P.rollS = function () { if (!this.play('roll', { vol: .6, flat: true })) this.swing(); this.play('cloth', { vol: .35, rate: .8, flat: true }); };
P.squelch = function (vol = .7) { if (!this.play('squelch', { vol, jit: .12 })) this.splat(); };
P.tires = function (on, amt = 0) { if (!this.ctx) return; if (on && !this.tireSrc) this.tireSrc = this.play('tire_loop', { loop: true, vol: 0, jit: 0, flat: true }); if (this.tireSrc) this.tireSrc.g.gain.setTargetAtTime(on ? Math.min(.5, amt) : 0, this.ctx.currentTime, .08); };
P.shot = function (kind = 'pistol') { kind = { saw: 'rifle', lever: 'sniper', auto12: 'shotgun', handcannon: 'revolver', crossbow: 'pistol', flamer: 'smg', launcher: 'shotgun', harpoon: 'sniper', minigun: 'rifle' }[kind] || kind; const k = FAM['gun_' + kind] ? kind : 'pistol';
  if (!this.play('gun_' + k, { vol: kind === 'smg' || kind === 'rifle' ? .75 : 1, verb: true, jit: .04 })) return O.shot.call(this, kind);
  if (kind !== 'shotgun') this.play('shell', { vol: .35, delay: .35 + Math.random() * .2 }); };
P.hit = function () { if (!this.play(Math.random() < .5 ? 'punch' : 'bat', { vol: .9 })) O.hit.call(this); this.play('flesh', { vol: .5 }); };
P.swing = function () { if (!this.play('cloth', { vol: .5, rate: 1.4 })) O.swing.call(this); };
P.hurt = function () { O.hurt.call(this); this.play('punch', { vol: .6, rate: .8 }); if (Math.random() < .4) this.shout('keem_hurt'); };
P.groan = function (vol = .1) { const k = vol >= .2 ? 'z_attack' : Math.random() < .5 ? 'z_moan' : 'z_growl'; if (!this.play(k, { vol: Math.min(1, vol * 5), verb: true, rate: .92, jit: .12 })) O.groan.call(this, vol); };
P.zAttack = function (vol = .5) { this.play('z_attack', { vol, jit: .12 }); };
P.roar = function () { if (!this.play('boss_roar', { vol: 1, verb: true })) O.groan.call(this, .3); };
P.thud = function () { O.thud.call(this); this.play('plank', { vol: .7, rate: .8 }); };
P.crash = function () { if (!this.play('metal', { vol: 1, rate: .8 })) return O.crash.call(this); this.play('glass', { vol: .8 }); O.thud.call(this); };
P.glass = function () { if (!this.play('glass', { vol: .9 })) O.glass.call(this); };
P.explode = function () { if (!this.play('explosion', { vol: 1, verb: true, jit: 0 })) return O.explode.call(this); this.boom(); };
P.splat = function () { if (!this.play('flesh', { vol: .8, rate: .85 })) O.splat.call(this); };
P.click = function () { if (!this.play('reload_in', { vol: .7 })) O.click.call(this); };
P.reload = function () { this.play('reload_out', { vol: .7 }); this.play('cloth', { vol: .3, delay: .2 }); this.play('reload_in', { vol: .8, delay: .55 }); if (Math.random() < .35) this.shout('keem_reload'); };
P.step = function (surf = 'grass', vol = .35) { this.play('step_' + surf, { vol, jit: .1 }); };
P.knife = function () { this.play('knife', { vol: .8 }); };
P.door = function () { this.play('door_open', { vol: .8 }); };
P.pickup = function () { O.pickup.call(this); this.play('coins', { vol: .35 }); if (Math.random() < .2) this.shout('keem_pickup'); };
P.scream = function (vol = .12) { if (!this.play('scream', { vol: Math.min(1, vol * 6), verb: true })) O.scream.call(this, vol); };
P.victimScream = function (vol = .12) { this.scream(vol); if (Math.random() < .7) setTimeout(() => this.shout(Math.random() < .5 ? 'npcf_help' : 'npcm_help', true), 900); };
P.chew = function (vol = .3) { if (!this.play('z_chew', { vol, jit: .12 })) this.eat(vol * .8); };
P.tear = function (vol = .3) { if (!this.play('z_tear', { vol, jit: .1 })) this.splat(); };
P.eat = function (vol = .3) { this.play('z_eat', { vol, jit: .1 }); };
P.thunder = function (vol = .7) { if (!this.play('thunder', { vol, verb: true, jit: .1, delay: Math.random() * 1.5 })) this.boom(); };
P.rain = function (on, vol = .16) { if (!this.ctx) return; this.rainOn = on; const t = this.ctx.currentTime;
  if (on && !this.rainSrc) { this.rainSrc = this.play('rain_loop', { loop: true, vol: 0, bus: this.amb, jit: 0, flat: true }); this.wind(true, .1); if (!this.rainSrc) { setTimeout(() => this.rain(on, vol), 800); return; } }
  if (this.rainSrc) this.rainSrc.g.gain.setTargetAtTime(on ? vol : 0, t, 1.2); };
P.engine = function (on, rpm = 0) { if (!this.ctx) return; const t = this.ctx.currentTime;
  if (on && !this.truckSrc) this.truckSrc = this.play('truck_loop', { loop: true, vol: 0, jit: 0, flat: true });
  if (!this.truckSrc) return O.engine.call(this, on, rpm);
  this.truckSrc.g.gain.setTargetAtTime(on ? .45 + rpm * .35 : 0, t, .15); this.truckSrc.playbackRate.setTargetAtTime(.8 + rpm * .9, t, .2);
  if (!on) { const s = this.truckSrc; this.truckSrc = null; setTimeout(() => { try { s.stop(); } catch {} }, 600); } };
P.ambientTick = function () { O.ambientTick.call(this); if (!this.ctx || this.ctx.state !== 'running') return; if (this.lpos && Math.random() < .035) { const an = Math.random() * 6.283, d = 45 + Math.random() * 60, p = { x: this.lpos.x + Math.cos(an) * d, y: 2, z: this.lpos.z + Math.sin(an) * d }; if (Math.random() < .5) this.play('scream', { vol: .5, pos: p, maxD: 200 }); else { const n = 1 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) setTimeout(() => this.play(FAM.gun_rifle ? 'gun_rifle' : 'gun_pistol', { vol: .45, pos: p, maxD: 200 }), i * (120 + Math.random() * 200)); } }
  if ((this.mode === 'night' || this.mode === 'tense') && Math.random() < .035) this.thunder(.5 + Math.random() * .4); };
// ---- voices ----
P.voice = function (who, text, bleeps) { this.stopVoice(); if (this.noKeem && /keem/i.test(who)) return Promise.resolve(0); if (!this.ctx || this.s.voices === false || who === 'note') return Promise.resolve(0);
  const n = 'v/' + vhash(who + '|' + text); const tok = this.vTok = (this.vTok || 0) + 1;
  return this.load(n).then(b => { if (!b || tok !== this.vTok) return 0; this.vSrc = this.play(n, { bus: this.voiceBus, jit: 0 }); this.lastBark = performance.now(); this.vEnd = this.ctx.currentTime + b.duration;
    if (bleeps && bleeps.length && this.vSrc) { const t0 = this.ctx.currentTime + 0.05, sp = Math.max(.3, b.duration - .15), g0 = this.vSrc.g.gain.value;
      bleeps.forEach(([a, c]) => { const ta = t0 + a * sp - .04, tb = t0 + c * sp + .06; this.vSrc.g.gain.setValueAtTime(0.02, ta); this.vSrc.g.gain.setValueAtTime(g0, tb);
        const o = this.ctx.createOscillator(), og = this.ctx.createGain(); o.frequency.value = 1000; og.gain.value = 0; og.gain.setValueAtTime(.22, ta); og.gain.setValueAtTime(0, tb); o.connect(og); og.connect(this.voiceBus); o.start(ta); o.stop(tb + .05); }); }
    return b.duration; }); };
P.stopVoice = function () { this.vTok = (this.vTok || 0) + 1; if (this.vSrc) { try { this.vSrc.stop(); } catch {} this.vSrc = null; } };
P.shout = function (key, force, pos) { if (this.noKeem && /^keem/.test(key)) return; if (pos) this.at(pos); const at = this._at; if (!this.ctx || this.s.voices === false) return; const now = performance.now(); if (!force && now - this.lastBark < 4000) return;
  if (!force && this.ctx.currentTime < (this.vEnd || 0)) return; this.lastBark = now;
  if (this.s.lang !== 'clean' && this.s.lang !== 'bleep' && this.man && this.man.barks[key + '_x'] && Math.random() < .5) key = key + '_x';
  const n = (this.man && this.man.barks[key]) || 2; if (!force && /_chat/.test(key)) { this.chatCd = this.chatCd || {}; if (now - (this.chatCd[key] || -1e9) < 45000) return; this.chatCd[key] = now; }
  this.bag = this.bag || {}; let bg = this.bag[key]; if (!bg || !bg.length) { bg = this.bag[key] = [...Array(n).keys()].sort(() => Math.random() - .5); if (bg.length > 1 && bg[bg.length - 1] === this['last_' + key]) bg.unshift(bg.pop()); }
  const idx = bg.pop(); this['last_' + key] = idx; const name = 'v/' + key + idx; const s = this.play(name, { bus: this.voiceBus, jit: .02, vol: key.startsWith('npc') ? .8 : 1, pos: key.startsWith('keem') ? null : at, flat: key.startsWith('keem'), ref: 4, maxD: 60 });
  if (!s) { this.load(name); return; } if (s.dummy) return; const tx = this.man && this.man.texts && this.man.texts[key]; if (tx && this.onBark) { const i = +name.slice(name.lastIndexOf(key) + key.length); this.onBark(tx[0], tx[1][i] || ''); } };
