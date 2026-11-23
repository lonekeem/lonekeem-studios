#!/usr/bin/env python3
"""Cut a batch at known times, then tighten each line to its spoken words (local faster-whisper on the short clip),
shrink long pauses and denoise. For voices with a noisy bed (Danny). python3 tools/el_clean.py <batch> t0 t1 ... tn"""
import json, re, subprocess, sys
import numpy as np
sys.path.insert(0, 'tools'); import el_batches as E
from faster_whisper import WhisperModel
M = WhisperModel('small.en', device='cpu', compute_type='int8'); SR = 44100
def clean(bid, cuts):
  b = next(x for x in json.load(open(E.W / 'batches.json')) if x['id'] == bid); src = E.RAW / f'{bid}.mp3'
  A = np.frombuffer(E.dec(src, SR), dtype=np.float32); assert len(cuts) == len(b['lines']) + 1, 'cut count'
  for i, ln in enumerate(b['lines']):
    seg = A[int(cuts[i] * SR):int(cuts[i + 1] * SR)]
    den = E.W / '_d.wav'; raw = E.W / '_r.wav'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-af', 'afftdn=nr=20:nf=-40:tn=1', str(den)], input=seg.tobytes(), check=True)
    D = np.frombuffer(E.dec(den, SR), dtype=np.float32); a16 = np.frombuffer(E.dec(den, 16000), dtype=np.float32)
    best = None
    for vad in (False, True, False):
      ss, _ = M.transcribe(a16, word_timestamps=True, language='en', vad_filter=vad)
      ws = [(w.start, w.end, w.word) for s in ss for w in s.words if re.search(r'\w', w.word)]
      heard = ' '.join(w[2].strip() for w in ws)
      nexp = len(re.findall(r"[\w']+", ln['text'])); ok = ws and .6 <= len(ws) / max(1, nexp) <= 1.6
      if ok: best = ws; break
    if best:
      iv = []
      for a, e, _ in best:
        if iv and a - iv[-1][1] < .6: iv[-1][1] = e
        else: iv.append([a, e])
      parts = []
      for k, (a, e) in enumerate(iv):
        if k: parts.append(np.zeros(int(.38 * SR), np.float32))
        parts.append(D[int(max(0, a - .12) * SR):int((e + .3) * SR)])
      out = np.concatenate(parts)
    else: out = D
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', str(raw)], input=out.tobytes(), check=True)
    E.post(raw, E.OUT / f"{ln['hash']}.mp3", 0, len(out) / SR + 1)
    print(f'  {bid}[{i}] {len(seg)/SR:5.1f}s -> {len(out)/SR:5.1f}s {"words" if best else "WHOLE"} | {ln["text"][:44]} | heard: {heard[:60]}')
if __name__ == '__main__':
  clean(sys.argv[1], [float(x) for x in sys.argv[2:]])
