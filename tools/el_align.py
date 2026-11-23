#!/usr/bin/env python3
"""Fallback splitter: local faster-whisper word timestamps -> cut a batch at the line boundaries.
python3 tools/el_align.py <batch_id> [--write]"""
import json, re, sys, difflib
sys.path.insert(0, 'tools'); import el_batches as E
from faster_whisper import WhisperModel
VAD = False
M = WhisperModel('small.en', device='cpu', compute_type='int8')
norm = lambda w: re.sub(r'[^a-z0-9]', '', w.lower())
def run(bid, write):
  b = next(x for x in json.load(open(E.W / 'batches.json')) if x['id'] == bid); src = E.RAW / f'{bid}.mp3'
  import numpy as np; aud = np.frombuffer(E.dec(src, 16000), dtype=np.float32)
  segs, info = M.transcribe(aud, word_timestamps=True, language='en', vad_filter=VAD)
  T = [(norm(w.word), w.start, w.end, w.word) for s in segs for w in s.words if norm(w.word)]
  exp = [(norm(w), i) for i, ln in enumerate(b['lines']) for w in ln['text'].split() if norm(w)]
  sm = difflib.SequenceMatcher(None, [e[0] for e in exp], [t[0] for t in T], autojunk=False)
  first, last = {}, {}
  for a, bb, n in sm.get_matching_blocks():
    for k in range(n):
      li = exp[a + k][1]; t = T[bb + k]; first.setdefault(li, t[1]); last[li] = t[2]
  n = len(b['lines']); print(bid, 'heard:', ' '.join(t[3].strip() for t in T))
  miss = [i for i in range(n) if i not in first]
  if miss: print('  MISSING lines', miss); return False
  cov = sum(nn for _, _, nn in sm.get_matching_blocks()) / len(exp); print('  coverage', round(cov, 2))
  cuts = []
  for i in range(n):
    s = first[i] - .12 if i == 0 else (last[i - 1] + first[i]) / 2
    e = last[i] + .35 if i == n - 1 else (last[i] + first[i + 1]) / 2
    s = max(0, min(s, first[i] - .05)); e = max(e, last[i] + .05)
    if i < n - 1: e = min(e, first[i + 1] - .02)
    if i > 0: s = max(s, last[i - 1] + .02)
    cuts.append((s, e)); print(f'  {i}: {s:6.2f}-{e:6.2f}  {b["lines"][i]["text"][:60]}')
  if any(last[i] < first[i] for i in range(n)) or any(first[i] < last.get(i - 1, -1) for i in range(1, n)): print('  ORDER PROBLEM'); return False
  if cov < .8: print('  low coverage'); return False
  for i in range(n):
    cps = len(b['lines'][i]['text']) / max(.1, last[i] - first[i])
    if cps > 28 or (cps < 4 and len(b['lines'][i]['text']) > 14): print('  ODD span', i, round(last[i] - first[i], 2)); return False
  if write and '--tight' in sys.argv:  # noisy voice: keep only word spans, shrink long gaps, denoise
    import subprocess; sr = 44100; A = np.frombuffer(E.dec(src, sr), dtype=np.float32)
    for i, ln in enumerate(b['lines']):
      ws = [(t[1], t[2]) for t in T if t[1] >= first[i] - .01 and t[2] <= last[i] + .01]
      iv = []
      for a, e in ws:
        if iv and a - iv[-1][1] < .6: iv[-1][1] = e
        else: iv.append([a, e])
      parts = []
      for k, (a, e) in enumerate(iv):
        if k: parts.append(np.zeros(int(.38 * sr), np.float32))
        parts.append(A[int(max(0, a - .1) * sr):int((e + .28) * sr)])
      seg = np.concatenate(parts); wav = E.W / '_t.wav'; den = E.W / '_d.wav'
      subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'f32le', '-ar', str(sr), '-ac', '1', '-i', '-', str(wav)], input=seg.tobytes(), check=True)
      subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav), '-af', 'afftdn=nr=18:nf=-42:tn=1,agate=threshold=0.02:ratio=3:attack=5:release=120', str(den)], check=True)
      E.post(den, E.OUT / f"{ln['hash']}.mp3", 0, len(seg) / sr + 1)
    print('  written tight')
  elif write:
    for (s, e), ln in zip(cuts, b['lines']): E.post(src, E.OUT / f"{ln['hash']}.mp3", s, e)
    print('  written')
  return True
w = '--write' in sys.argv
for bid in [a for a in sys.argv[1:] if not a.startswith('--')]:
  for k in range(6):
    VAD = k % 2 == 1
    if run(bid, w): break
    print('  retry', k + 1)
