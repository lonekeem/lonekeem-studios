#!/usr/bin/env python3
"""Generate Chapter 14 dialogue with the same Fal + ElevenLabs pipeline as ch12/13.
Reads FAL_KEY from the environment (or ~/.secrets/fal_key). Never prints the key.
Does not buy or upgrade anything. Skips hashes that already exist in public/sfx/v/.
"""
import json, os, re, subprocess, sys, time, urllib.request, urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'sfx' / 'v'
RAW = Path('/tmp/ch14-voices/raw')
LINES = Path('/tmp/ch14-voices/lines.json')
OUT.mkdir(parents=True, exist_ok=True)
RAW.mkdir(parents=True, exist_ok=True)

def load_key():
    k = os.environ.get('FAL_KEY') or os.environ.get('FAL_KEY_V2')
    if k: return k.strip()
    for p in (Path.home() / '.secrets' / 'fal_key', Path.home() / '.secrets' / 'fal_key_v2'):
        if p.exists():
            return p.read_text().strip()
    raise SystemExit('No FAL_KEY found')

# Same voices and endpoints used for earlier chapters (v5/v7 state + CHAPTERS_PLAN).
# Warden is new (female Harbor Authority); Alice is a default library voice, not a paid clone.
CAST = {
    'keem':   dict(ep='fal-ai/elevenlabs/tts/eleven-v3', voice='6OzrBCQf8cjERkYgzSg8', extra={'stability': 0.5, 'language_code': 'en'}),
    'marcus': dict(ep='fal-ai/elevenlabs/tts/multilingual-v2', voice='riqnCDqBJCxuKuDEeenv', extra={'stability': 0.5, 'similarity_boost': 0.75, 'language_code': 'en'}),
    'nia':    dict(ep='fal-ai/elevenlabs/tts/multilingual-v2', voice='H8BjWxFjrzNszTO74noq', extra={'stability': 0.75, 'similarity_boost': 0.75, 'style': 0.1, 'language_code': 'en'}),
    'vance':  dict(ep='fal-ai/elevenlabs/tts/multilingual-v2', voice='NQMJRVvPew6HsaebYnZj', extra={'stability': 0.5, 'similarity_boost': 0.75, 'language_code': 'en'}),
    'reyes':  dict(ep='fal-ai/elevenlabs/tts/multilingual-v2', voice='vzb1D7zjti0h5u8StSra', extra={'stability': 0.5, 'similarity_boost': 0.75, 'language_code': 'en'}),
    'dana':   dict(ep='fal-ai/elevenlabs/tts/eleven-v3', voice='XrExE9yKIg1WjnnlVkGX', extra={'stability': 0.5, 'language_code': 'en'}),
    'warden': dict(ep='fal-ai/elevenlabs/tts/eleven-v3', voice='Xb7hH8MSUJpSbSDYk0k2', extra={'stability': 0.45, 'language_code': 'en'}),
}

KEY = None

def fal(endpoint, payload, tries=3):
    body = json.dumps(payload).encode()
    last = None
    for i in range(tries):
        req = urllib.request.Request(
            f'https://fal.run/{endpoint}', data=body,
            headers={'Authorization': f'Key {KEY}', 'Content-Type': 'application/json'},
            method='POST')
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            err = e.read().decode('utf-8', 'replace')[:800]
            last = f'HTTP {e.code}: {err}'
            # rewrite once if the filter blocks a line
            if e.code in (400, 422, 500) and i < tries - 1:
                time.sleep(1.5 * (i + 1))
                continue
            raise RuntimeError(last) from None
        except Exception as e:
            last = str(e)
            time.sleep(1.5 * (i + 1))
    raise RuntimeError(last)

def audio_url(res):
    if not res: return None
    a = res.get('audio')
    if isinstance(a, str) and a.startswith('http'): return a
    if isinstance(a, dict):
        return a.get('url') or a.get('file') or a.get('path')
    return res.get('url') or res.get('audio_url')

def download(url, dest: Path):
    req = urllib.request.Request(url, headers={'User-Agent': 'atq-ch14-voices'})
    with urllib.request.urlopen(req, timeout=180) as r, open(dest, 'wb') as f:
        f.write(r.read())

def post(src: Path, dest: Path):
    """Trim, loudness-match to about -18 LUFS, mono 44.1 kHz 56k mp3 — same as ch12/13."""
    raw = subprocess.run(
        ['ffmpeg', '-loglevel', 'error', '-i', str(src), '-af', 'silenceremove=start_periods=1:start_threshold=-46dB:start_silence=0.04:detection=peak,areverse,silenceremove=start_periods=1:start_threshold=-46dB:start_silence=0.08:detection=peak,areverse',
         '-f', 'f32le', '-ac', '1', '-ar', '44100', '-'],
        capture_output=True, check=True).stdout
    tmp = Path('/tmp/ch14-voices/_ln.wav')
    subprocess.run(
        ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'f32le', '-ar', '44100', '-ac', '1', '-i', '-', str(tmp)],
        input=raw, check=True)
    # two-pass loudnorm
    probe = subprocess.run(
        ['ffmpeg', '-nostats', '-i', str(tmp), '-af', 'loudnorm=I=-18:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
        capture_output=True, text=True)
    blobs = re.findall(r'\{[^{}]+\}', probe.stderr)
    if not blobs:
        raise RuntimeError('loudnorm probe failed')
    j = json.loads(blobs[-1])
    af = (
        f"loudnorm=I=-18:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:"
        f"measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,"
        f"alimiter=limit=0.89:attack=2:release=40:level=disabled"
    )
    subprocess.run(
        ['ffmpeg', '-y', '-loglevel', 'error', '-i', str(tmp), '-af', af, '-ac', '1', '-ar', '44100', '-b:a', '56k', str(dest)],
        check=True)

def main():
    global KEY
    KEY = load_key()
    lines = json.loads(LINES.read_text())
    only = set(sys.argv[1:])  # optional hashes or speaker names to limit a test run
    ok = fail = skip = 0
    results = []
    for i, row in enumerate(lines):
        who, text, h = row['who'], row['text'], row['hash']
        if only and h not in only and who not in only:
            continue
        dest = OUT / f'{h}.mp3'
        if dest.exists() and dest.stat().st_size > 1000:
            skip += 1
            results.append({'who': who, 'hash': h, 'status': 'skip'})
            print(f'SKIP {who} {h}', flush=True)
            continue
        cfg = CAST[who]
        payload = dict(text=text, voice=cfg['voice'], **cfg['extra'])
        print(f'GEN  {who} {h} {text[:70]}', flush=True)
        try:
            res = fal(cfg['ep'], payload)
            url = audio_url(res)
            if not url:
                raise RuntimeError('no audio url in response keys=' + ','.join(res.keys()))
            raw = RAW / f'{h}.mp3'
            download(url, raw)
            post(raw, dest)
            ok += 1
            results.append({'who': who, 'hash': h, 'status': 'ok', 'bytes': dest.stat().st_size})
            print(f'OK   {who} {h} {dest.stat().st_size}b', flush=True)
        except Exception as e:
            fail += 1
            results.append({'who': who, 'hash': h, 'status': 'fail', 'error': str(e)[:400], 'text': text})
            print(f'FAIL {who} {h} {e}', flush=True)
        time.sleep(0.25)
    Path('/tmp/ch14-voices/results.json').write_text(json.dumps(results, indent=2))
    print(f'DONE ok={ok} fail={fail} skip={skip} total={ok+fail+skip}', flush=True)
    return 0 if fail == 0 else 1

if __name__ == '__main__':
    sys.exit(main())
