# v1.9.50 ambience + UI sounds, fully procedural (numpy/scipy) or derived from the game's own zombie vocals. No paid generation.
# run: python3 tools/make_ambience.py   -> public/sfx/amb_*_loop.mp3, public/sfx/ui_*.mp3
import glob, subprocess, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve
OUT = 'public/sfx'; SR = 44100; rng = np.random.default_rng(1950)
t = lambda d: np.arange(int(SR * d)) / SR
def filt(x, kind, f, order=2): return sosfilt(butter(order, f, btype=kind, fs=SR, output='sos'), x)
def enc(path, a, q='64k', peak=.89):
  a = np.asarray(a, np.float32); a = a / (np.max(np.abs(a)) or 1) * peak; sf.write('/tmp/_amb.wav', a, SR)
  subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', '/tmp/_amb.wav', '-ac', '1', '-ar', '44100', '-b:a', q, path], check=True)
def loopify(x, fade=1.0):  # seamless loop: crossfade the tail into the head
  n = int(SR * fade); h = x[:n] * np.linspace(0, 1, n) + x[-n:] * np.linspace(1, 0, n); return np.concatenate([h, x[n:-n]])
def load(path):
  r = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True); return np.frombuffer(r.stdout, np.float32).copy()
def verb(x, sec=2.4, wet=.7):
  n = int(SR * sec); ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * (6.9 / sec)); ir = filt(ir, 'low', 3500); y = fftconvolve(x, ir)[:len(x)]; y /= np.max(np.abs(y)) or 1; return x * (1 - wet) + y * wet

# 1) night crickets: a few insects at different pitches / rates + soft field air
D = 14.0; T = t(D + 1); x = filt(rng.standard_normal(len(T)), 'low', 900) * .05
for k in range(6):
  f = rng.uniform(3900, 5200); rate = rng.uniform(1.1, 2.4); pulses = rng.integers(2, 5); amp = rng.uniform(.25, 1.0) * (.5 if k > 2 else 1); ph = rng.uniform(0, 1)
  car = np.sin(2 * np.pi * f * T + .3 * np.sin(2 * np.pi * 31 * T)); env = np.zeros_like(T)
  for c0 in np.arange(ph / rate, D + 1, 1 / rate):
    if rng.random() < .12: continue
    for p in range(pulses):
      s = int((c0 + p * .032) * SR); e = s + int(.022 * SR)
      if e < len(T): env[s:e] += np.hanning(e - s)
  x += car * env * amp * .3
x = filt(x, 'high', 200); enc(f'{OUT}/amb_crickets_loop.mp3', loopify(x, 1.0)[:int(SR * D)])

# 2) distant horde: the game's own moans / idle vocals, pitched down, muffled, far reverb, over a low rumble
src = sorted(glob.glob(f'{OUT}/z_moan*.mp3') + glob.glob(f'{OUT}/zvo_*_idle*.mp3'))
D = 18.0; L = int(SR * (D + 2)); x = filt(rng.standard_normal(L), 'low', 120) * .08
for i in range(16):
  s = load(src[rng.integers(len(src))]); rate = rng.uniform(.78, .95); idx = np.arange(0, len(s) - 1, rate); s = np.interp(idx, np.arange(len(s)), s)
  s = filt(s, 'low', rng.uniform(600, 1000)) * rng.uniform(.15, .45); st = int(rng.uniform(0, D) * SR); e = min(L, st + len(s)); x[st:e] += s[:e - st]
x = verb(x, 2.8, .75); enc(f'{OUT}/amb_horde_loop.mp3', loopify(x, 1.5)[:int(SR * D)])

# 3) indoor room tone: air-handler rumble, faint mains hum and a slow fluorescent buzz swell
D = 12.0; T = t(D + 1); n = rng.standard_normal(len(T))
x = filt(n, 'low', 260, 4) * .6 + filt(n, 'band', [900, 1400]) * .03
hum = sum(np.sin(2 * np.pi * h * T) / (i + 1) for i, h in enumerate([60, 120, 180, 240])) * .05 * (1 + .2 * np.sin(2 * np.pi * .07 * T))
buzz = np.sign(np.sin(2 * np.pi * 120 * T)) * .012 * (.5 + .5 * np.sin(2 * np.pi * .11 * T)); x += hum + filt(buzz, 'low', 2500)
enc(f'{OUT}/amb_room_loop.mp3', loopify(x, 1.0)[:int(SR * D)])

# 4) UI: soft tap, confirm (two-note up), back (two-note down) — rounded sines with a tiny click
def blip(fs, dur=.07, gap=.06, vol=1.0):
  out = np.zeros(int(SR * (gap * len(fs) + dur + .05)))
  for i, f in enumerate(fs):
    T = t(dur); y = (np.sin(2 * np.pi * f * T) + .3 * np.sin(4 * np.pi * f * T)) * np.exp(-T * 45) * np.minimum(1, T / .002)
    s = int(i * gap * SR); out[s:s + len(y)] += y * vol
  out[:40] += rng.standard_normal(40) * .15; return filt(out, 'low', 6000)
enc(f'{OUT}/ui_tap.mp3', blip([1320], .05), peak=.5)
enc(f'{OUT}/ui_confirm.mp3', blip([880, 1320], .08, .07), peak=.55)
enc(f'{OUT}/ui_back.mp3', blip([990, 660], .07, .06), peak=.5)
print('ok')
