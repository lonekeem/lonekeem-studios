#!/usr/bin/env python3
"""Check every generated line: transcribe public/sfx/v/<hash>.mp3 locally and compare with the script text."""
import json, re, sys, difflib, subprocess
import numpy as np
sys.path.insert(0, 'tools'); import el_batches as E
from faster_whisper import WhisperModel
M = WhisperModel('small.en', device='cpu', compute_type='int8')
n = lambda s: ' '.join(re.findall(r"[a-z0-9']+", s.lower().replace('forty-five', '45').replace('forty', '40')))
bad = 0
for b in json.load(open(E.W / 'batches.json')):
  if len(sys.argv) > 1 and b['id'] not in sys.argv[1:]: continue
  for ln in b['lines']:
    p = E.OUT / f"{ln['hash']}.mp3"
    if not p.exists(): print('MISSING', b['id'], ln['text'][:50]); bad += 1; continue
    a = np.frombuffer(E.dec(p, 16000), dtype=np.float32); a = np.concatenate([np.zeros(8000, np.float32), a, np.zeros(8000, np.float32)])
    best = 0; heard = ''
    for k in range(2):
      ss, _ = M.transcribe(a, language='en', vad_filter=bool(k), condition_on_previous_text=False, temperature=0)
      h = ' '.join(s.text for s in ss); r = difflib.SequenceMatcher(None, n(ln['text']), n(h)).ratio()
      if r > best: best, heard = r, h
      if best > .75: break
    flag = 'OK ' if best > .75 else 'BAD'; bad += best <= .75
    print(f'{flag} {best:.2f} {len(a)/16000-1:5.1f}s {b["id"]:10s} {ln["text"][:48]!r:52s} heard: {heard.strip()[:60]}')
print('BAD', bad)
