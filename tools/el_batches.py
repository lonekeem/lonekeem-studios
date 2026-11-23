#!/usr/bin/env python3
"""Chapters 15-20 voices via Keem's ElevenLabs workspace (MCP creative_generate_speech, called by the agent).
step 1:  python3 tools/el_batches.py plan   -> /workspace/atq-ch1520-voices/batches.json (only lines with no mp3 yet)
step 2:  agent generates each batch (prompt text in the json), downloads it to raw/<batch>.mp3
step 3:  python3 tools/el_batches.py split  -> cuts each batch at the long pauses, trims, loudness-matches (-18 LUFS like ch12-14), writes public/sfx/v/<hash>.mp3
No keys are read or printed here."""
import json, os, re, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]; OUT = ROOT / 'public' / 'sfx' / 'v'; W = Path('/workspace/atq-ch1520-voices'); RAW = W / 'raw'; RAW.mkdir(parents=True, exist_ok=True)
CAST = {  # same voices as earlier chapters; danny (Sheldon - Quirky) + harlow are new library voices
  'keem': ('6OzrBCQf8cjERkYgzSg8', 'eleven_v3'), 'dana': ('XrExE9yKIg1WjnnlVkGX', 'eleven_v3'),
  'marcus': ('riqnCDqBJCxuKuDEeenv', 'eleven_multilingual_v2'), 'nia': ('H8BjWxFjrzNszTO74noq', 'eleven_multilingual_v2'),
  'reyes': ('vzb1D7zjti0h5u8StSra', 'eleven_multilingual_v2'), 'tuck': ('VlUmeC1Uzj3NnwiVR9K9', 'eleven_multilingual_v2'),
  'dube': ('oFoV1sxkPgfSMBqWZKyp', 'eleven_multilingual_v2'), 'vance': ('NQMJRVvPew6HsaebYnZj', 'eleven_multilingual_v2'),
  'radio': ('nJvj5shg2xu1GKGxqfkE', 'eleven_multilingual_v2'),
  'danny': ('ujcXHLWtGPYXnqBoMBgg', 'eleven_v3'), 'harlow': ('exurTFaGNF2gnRcPNH8I', 'eleven_v3'),
  'director': ('Xb7hH8MSUJpSbSDYk0k2', 'eleven_v3'),
}
def plan(maxn=8):
  subprocess.run(['node', 'tools/extract_lines.mjs'], cwd=ROOT, check=True, capture_output=True)
  L = json.load(open('/tmp/lines.json')); seen = set(); todo = {}
  for who, text, h in L:
    if h in seen or not re.search(r'[A-Za-z]', text): continue
    seen.add(h)
    if (OUT / f'{h}.mp3').exists(): continue
    todo.setdefault(who, []).append({'text': text, 'hash': h})
  B = []
  for who, items in todo.items():
    if who not in CAST: print('NO VOICE FOR', who, len(items)); continue
    v, model = CAST[who]
    for i in range(0, len(items), maxn):
      chunk = items[i:i + maxn]; sep = '\n\n[long pause]\n\n' if model == 'eleven_v3' else ' <break time="3.0s" /> '
      B.append({'id': f'{who}_{i // maxn:02d}', 'who': who, 'voice': v, 'model': model, 'lines': chunk, 'prompt': sep.join(x['text'] for x in chunk)})
  json.dump(B, open(W / 'batches.json', 'w'), indent=1); print(len(B), 'batches', sum(len(b['lines']) for b in B), 'lines')
def dec(p, sr=44100):
  return subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', str(p), '-f', 'f32le', '-ac', '1', '-ar', str(sr), '-'], capture_output=True, check=True).stdout
def silences(p, d):
  e = subprocess.run(['ffmpeg', '-i', str(p), '-af', f'silencedetect=noise=-42dB:d={d}', '-f', 'null', '-'], capture_output=True, text=True).stderr
  st = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', e)]; en = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', e)]
  dur = float(re.search(r'Duration: (\d+):(\d+):([\d.]+)', e).groups()[2]) + 60 * float(re.search(r'Duration: (\d+):(\d+):([\d.]+)', e).groups()[1])
  return list(zip(st, en + [dur] * (len(st) - len(en)))), dur
def post(src, dest, ss, to):
  tmp = W / '_seg.wav'
  subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{ss:.3f}', '-to', f'{to:.3f}', '-i', str(src), '-af', 'silenceremove=start_periods=1:start_threshold=-46dB:start_silence=0.04:detection=peak,areverse,silenceremove=start_periods=1:start_threshold=-46dB:start_silence=0.1:detection=peak,areverse', '-ac', '1', '-ar', '44100', str(tmp)], check=True)
  pr = subprocess.run(['ffmpeg', '-nostats', '-i', str(tmp), '-af', 'loudnorm=I=-18:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True)
  j = json.loads(re.findall(r'\{[^{}]+\}', pr.stderr)[-1])
  af = f"loudnorm=I=-18:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,alimiter=limit=0.89:attack=2:release=40:level=disabled"
  subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(tmp), '-af', af, '-ac', '1', '-ar', '44100', '-b:a', '56k', str(dest)], check=True)
  d = float(re.search(r'time=(\d+):(\d+):([\d.]+)', subprocess.run(['ffmpeg', '-i', str(dest), '-f', 'null', '-'], capture_output=True, text=True).stderr.split('\n')[-2] or 'time=0:0:0') .groups()[2]) if False else None
  return d
def split(only=None):
  B = json.load(open(W / 'batches.json')); rep = []
  for b in B:
    if only and b['id'] not in only: continue
    src = RAW / f"{b['id']}.mp3"
    if not src.exists(): rep.append((b['id'], 'missing raw')); continue
    n = len(b['lines']); ok = None
    for d in (1.8, 1.5, 2.2, 1.2, 2.6, 1.0, 0.8, 0.6):
      sil, dur = silences(src, d)
      inner = [s for s in sil if s[0] > .15 and s[1] < dur - .05]
      if len(inner) == n - 1: ok = (inner, dur); break
    if not ok: rep.append((b['id'], f'split mismatch: want {n - 1} gaps')); continue
    inner, dur = ok; cuts = [0.0] + [(a + e) / 2 for a, e in inner] + [dur]
    bad = []
    for i, ln in enumerate(b['lines']):
      seglen = cuts[i + 1] - cuts[i]; cps = len(ln['text']) / max(.1, seglen)
      if cps > 30 or (cps < 3 and len(ln['text']) > 12): bad.append((i, round(seglen, 2), round(cps, 1)))
    if bad: rep.append((b['id'], 'odd lengths', bad)); continue
    for i, ln in enumerate(b['lines']): post(src, OUT / f"{ln['hash']}.mp3", cuts[i], cuts[i + 1])
    rep.append((b['id'], 'ok', n))
  for r in rep: print(*r)
if __name__ == '__main__':
  {'plan': lambda: plan(), 'split': lambda: split(set(sys.argv[2:]) or None)}[sys.argv[1]]()
