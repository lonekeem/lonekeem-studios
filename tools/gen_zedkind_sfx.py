#!/usr/bin/env python3
"""Build Runner / Tank / Spitter vocals from existing ElevenLabs zvo banks,
plus original synthesized spit / sizzle / charge stomp SFX.
Does not call ElevenLabs or spend credits.
"""
import os, subprocess, numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SFX = ROOT / 'public' / 'sfx'
OUT = SFX
SR = 44100
rng = np.random.default_rng(19250)

def ff(*args, check=True):
    return subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', *args], check=check, capture_output=True, text=True)

def enc(path, y, filt='loudnorm=I=-16'):
    wav = '/tmp/_zedkind.wav'
    y = np.clip(np.asarray(y, dtype=np.float32), -1, 1)
    import wave, struct
    with wave.open(wav, 'w') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((y * 32767).astype(np.int16).tobytes())
    ff('-i', wav, '-af', filt, '-ac', '1', '-ar', '44100', '-b:a', '64k', str(path))
    print('wrote', path.name)

def t(sec):
    return np.linspace(0, sec, int(SR * sec), endpoint=False)

def env_ad(T, a, d):
    return np.minimum(T / max(a, 1e-4), 1) * np.exp(-d * np.maximum(T - a, 0))

def lp(x, k):
    y = np.zeros_like(x); a = k
    acc = 0
    for i, v in enumerate(x):
        acc = acc * (1 - a) + v * a
        y[i] = acc
    return y

def bp(x, f, q):
    # crude resonant band via biquad-ish
    w0 = 2 * np.pi * f / SR
    c = np.cos(w0); s = np.sin(w0); alpha = s / (2 * max(q, .1))
    b0, b1, b2 = alpha, 0, -alpha
    a0, a1, a2 = 1 + alpha, -2 * c, 1 - alpha
    y = np.zeros_like(x); x1 = x2 = y1 = y2 = 0
    for i, v in enumerate(x):
        o = (b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0
        x2, x1, y2, y1 = x1, v, y1, o
        y[i] = o
    return y

# ---- process existing ElevenLabs banks ----
# runner <- teen_m (faster, thinner, higher)
# tank   <- brute  (heavier, darker) + roar from boss_m
# spitter<- gurgler (wetter)

MAP = {
    'runner':  dict(src='teen_m', kinds=['idle', 'alert', 'attack', 'hurt', 'death'], n=2,
                    af='asetrate=44100*1.14,aresample=44100,atempo=1.08,highpass=f=220,equalizer=f=1800:t=q:w=1.2:g=3,loudnorm=I=-16'),
    'tank':    dict(src='brute', kinds=['idle', 'alert', 'attack', 'hurt', 'death'], n=2,
                    af='asetrate=44100*0.84,aresample=44100,atempo=0.92,lowpass=f=2200,equalizer=f=120:t=q:w=1:g=4,loudnorm=I=-15'),
    'spitter': dict(src='gurgler', kinds=['idle', 'alert', 'attack', 'hurt', 'death'], n=2,
                    af='asetrate=44100*0.96,aresample=44100,aphaser=in_gain=0.4:out_gain=0.7:delay=2.2:decay=0.35:speed=0.4,equalizer=f=400:t=q:w=1:g=2,loudnorm=I=-16'),
}

for prof, cfg in MAP.items():
    for kind in cfg['kinds']:
        for i in range(cfg['n']):
            src = SFX / f"zvo_{cfg['src']}_{kind}{i}.mp3"
            # some banks have 3 of a kind; fall back to 0 if missing index
            if not src.exists():
                src = SFX / f"zvo_{cfg['src']}_{kind}0.mp3"
            dest = OUT / f"zvo_{prof}_{kind}{i}.mp3"
            if not src.exists():
                print('MISSING', src.name); continue
            ff('-i', str(src), '-af', cfg['af'], '-ac', '1', '-ar', '44100', '-b:a', '64k', str(dest))
            print('vo', dest.name)

# tank roar from boss_m roar, darker
for i in range(2):
    src = SFX / f'zvo_boss_m_roar{i}.mp3'
    dest = OUT / f'zvo_tank_roar{i}.mp3'
    if src.exists():
        ff('-i', str(src), '-af', 'asetrate=44100*0.80,aresample=44100,atempo=0.9,lowpass=f=1800,equalizer=f=90:t=q:w=1:g=5,loudnorm=I=-14',
           '-ac', '1', '-ar', '44100', '-b:a', '64k', str(dest))
        print('vo', dest.name)

# ---- synthesized action SFX ----
# acid spit: wet hawk + liquid burst
for v in range(2):
    T = t(.55)
    n = rng.standard_normal(len(T))
    hawk = bp(n, 1100 + v * 200, 3) * env_ad(T, .03, 14)
    glob = lp(n, .08) * env_ad(T, .01, 9) * 1.4
    drip = bp(n, 2400, 6) * env_ad(np.maximum(T - .12, 0), .01, 22) * .5
    y = hawk * .7 + glob * .9 + drip
    enc(OUT / f'acid_spit{v}.mp3', y, filt='highpass=f=80,lowpass=f=8000,loudnorm=I=-16')

# acid sizzle / puddle
for v in range(2):
    T = t(1.1)
    n = rng.standard_normal(len(T))
    hiss = (n - lp(n, .15)) * (0.35 + 0.2 * np.sin(2 * np.pi * (7 + v) * T))
    bubble = bp(n, 500 + v * 80, 4) * env_ad((T * 6) % 1, .02, 10) * .35
    y = hiss * env_ad(T, .05, 1.6) + bubble
    enc(OUT / f'acid_sizzle{v}.mp3', y, filt='highpass=f=200,lowpass=f=7000,loudnorm=I=-18')

# tank charge: heavy stomp + low roar body (no vocal words)
for v in range(2):
    T = t(.9)
    n = rng.standard_normal(len(T))
    stomp = lp(n, .04) * env_ad(T, .008, 7) * 2.2
    body = bp(n, 70 + v * 12, 2.2) * env_ad(T, .05, 3.2)
    rattle = bp(n, 280, 5) * env_ad(T, .02, 8) * .4
    y = stomp + body * 1.1 + rattle
    enc(OUT / f'tank_charge{v}.mp3', y, filt='lowpass=f=2500,loudnorm=I=-14')

print('done')
