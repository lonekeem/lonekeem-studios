#!/usr/bin/env python3
"""Generate brand-new ElevenLabs zombie vocals via the same Fal pipeline as Chapter 14.
Existing Fal credits only. Never prints the key. No purchases or upgrades.
"""
import json, os, re, subprocess, sys, time, urllib.request, urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'sfx'
RAW = Path('/tmp/atq-zvo-new/raw')
LOG = Path('/tmp/atq-zvo-new/results.json')
OUT.mkdir(parents=True, exist_ok=True)
RAW.mkdir(parents=True, exist_ok=True)

EP = 'fal-ai/elevenlabs/sound-effects/v2'

def load_key():
    k = os.environ.get('FAL_KEY') or os.environ.get('FAL_KEY_V2')
    if k: return k.strip()
    for p in (Path.home() / '.secrets' / 'fal_key', Path.home() / '.secrets' / 'fal_key_v2'):
        if p.exists():
            return p.read_text().strip()
    raise SystemExit('No FAL_KEY found')

KEY = None

# Stop immediately on billing / no-credit errors (do not buy anything).
BILLING_RE = re.compile(r'payment|billing|insufficient|no credits|credit.?balance|upgrade|purchase|out of credits|exceeded.?quota|402\b|payment[_ ]required', re.I)

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
            if BILLING_RE.search(last) or e.code in (402, 403) and 'credit' in last.lower():
                raise RuntimeError('BILLING_STOP ' + last) from None
            if e.code in (400, 422, 429, 500, 502, 503) and i < tries - 1:
                time.sleep(1.8 * (i + 1))
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
    req = urllib.request.Request(url, headers={'User-Agent': 'atq-zvo-variants'})
    with urllib.request.urlopen(req, timeout=180) as r, open(dest, 'wb') as f:
        f.write(r.read())

def post(src: Path, dest: Path):
    """Trim, loudness-match, small mono mp3 (22.05 kHz 32k) so phones stay light."""
    raw = subprocess.run(
        ['ffmpeg', '-loglevel', 'error', '-i', str(src), '-af',
         'silenceremove=start_periods=1:start_threshold=-46dB:start_silence=0.04:detection=peak,'
         'areverse,silenceremove=start_periods=1:start_threshold=-46dB:start_silence=0.06:detection=peak,areverse',
         '-f', 'f32le', '-ac', '1', '-ar', '22050', '-'],
        capture_output=True, check=True).stdout
    tmp = Path('/tmp/atq-zvo-new/_ln.wav')
    subprocess.run(
        ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'f32le', '-ar', '22050', '-ac', '1', '-i', '-', str(tmp)],
        input=raw, check=True)
    probe = subprocess.run(
        ['ffmpeg', '-nostats', '-i', str(tmp), '-af', 'loudnorm=I=-18:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
        capture_output=True, text=True)
    blobs = re.findall(r'\{[^{}]+\}', probe.stderr)
    if blobs:
        j = json.loads(blobs[-1])
        af = (
            f"loudnorm=I=-18:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:"
            f"measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,"
            f"alimiter=limit=0.89:attack=2:release=40:level=disabled"
        )
    else:
        af = 'loudnorm=I=-18:TP=-1.5:LRA=11,alimiter=limit=0.89:attack=2:release=40:level=disabled'
    subprocess.run(
        ['ffmpeg', '-y', '-loglevel', 'error', '-i', str(tmp), '-af', af, '-ac', '1', '-ar', '22050', '-b:a', '32k', str(dest)],
        check=True)

# 18 distinct cartoon-undead voice identities (original, no brand, non-gory).
VARIANTS = [
    ('rasp_m',  'middle-aged male',   'dry raspy gravelly throat'),
    ('rasp_f',  'middle-aged female', 'dry raspy worn throat'),
    ('gut_m',   'large adult male',   'deep guttural chesty rumble'),
    ('gut_f',   'adult female',       'low guttural hoarse chest'),
    ('moan_m',  'weary adult male',   'long tired moaning'),
    ('moan_f',  'weary adult female', 'long aching moaning'),
    ('wet_m',   'adult male',         'wet gurgling bubbling throat'),
    ('wet_f',   'adult female',       'wet gurgling dripping throat'),
    ('old_m',   'elderly male',       'thin shaky aged rasp'),
    ('old_f',   'elderly female',     'thin shaky aged rasp'),
    ('young_m', 'teenage male',       'cracking high restless'),
    ('young_f', 'teenage female',     'high thin restless'),
    ('shriek_m','adult male',         'sharp piercing shrieky'),
    ('shriek_f','adult female',       'sharp piercing shrieky'),
    ('hollow_m','gaunt adult male',   'hollow echoing breathy'),
    ('hag_m',   'exhausted adult male','haggard exhausted whisper-growl'),
    ('bark_m',  'stocky adult male',  'short sharp barking'),
    ('wheeze_f','frail adult female', 'wheezy panting wet'),
]

KIND_ACT = {
    'idle':   'a short idle groan or moan, 1 to 2 seconds, close and quiet, no words',
    'alert':  'an alert growl that notices someone, 1 second, rising, no words',
    'attack': 'an aggressive attack snarl or scream, under 1 second, no words',
    'hurt':   'a short pained grunt or yelp from a hit, under 1 second, no words',
    'death':  'a dying exhaling groan that fades out, 1 to 2 seconds, no words',
}

def prompt_for(vid, who, texture, act):
    return (
        f"Close-up cartoon video-game zombie vocalization, original creature sound, not a licensed character. "
        f"{who} with a {texture} voice. {KIND_ACT[act]}. "
        f"Dry studio recording, mono, no music, no words, no gore description."
    )

# Dedicated kind banks + action SFX
KIND_JOBS = []
for i, (who, tex, acts) in enumerate([
    ('fast skinny sprinter undead', 'high frantic shrieking',
     {'idle': 2, 'alert': 2, 'attack': 2, 'hurt': 2, 'death': 2}),
]):
    pass

def jobs():
    out = []
    for vid, who, tex in VARIANTS:
        for act in ('idle', 'alert', 'attack', 'hurt', 'death'):
            n = 2 if act in ('idle', 'attack') else 1  # 18* (2+1+2+1+1)=126? that's a lot.
            # Keep to 1 per category first = 90, plus kinds.
            out.append({
                'name': f'zvo_{vid}_{act}0',
                'dur': 1.6 if act in ('idle', 'death') else 1.0,
                'prompt': prompt_for(vid, who, tex, act),
            })
    # kind banks (2 takes each)
    kind_defs = [
        ('runner', 'a fast skinny sprinter undead', 'high frantic shrieking',
         {'idle': 2, 'alert': 2, 'attack': 2, 'hurt': 2, 'death': 2}),
        ('tank', 'a huge heavy lumbering undead', 'very deep booming roar',
         {'idle': 2, 'alert': 2, 'attack': 2, 'hurt': 2, 'death': 2, 'roar': 2}),
        ('spitter', 'a bloated sickly undead', 'wet bubbling gurgling',
         {'idle': 2, 'alert': 2, 'attack': 2, 'hurt': 2, 'death': 2}),
    ]
    kind_act_txt = dict(KIND_ACT)
    kind_act_txt['roar'] = 'a long deep roaring bellow, 2 seconds, no words'
    for kid, who, tex, cats in kind_defs:
        for act, n in cats.items():
            for i in range(n):
                out.append({
                    'name': f'zvo_{kid}_{act}{i}',
                    'dur': 2.0 if act == 'roar' else (1.6 if act in ('idle', 'death') else 1.0),
                    'prompt': (
                        f"Close-up cartoon video-game zombie vocalization, original creature sound, not a licensed character. "
                        f"{who} with a {tex} voice. {kind_act_txt[act]}. Variation {i+1}. "
                        f"Dry studio recording, mono, no music, no words, no gore description."
                    ),
                })
    # action SFX
    sfx = [
        ('tank_stomp0', 0.8, 'Heavy giant foot stomp on wet asphalt, deep thud, cartoon game sound, no music.'),
        ('tank_stomp1', 0.8, 'Heavy giant foot stomp on cracked concrete, slightly different, cartoon game sound, no music.'),
        ('tank_charge0', 1.4, 'Heavy charging rush of a huge creature, pounding steps approaching, cartoon game sound, no music.'),
        ('tank_charge1', 1.4, 'Heavy charging rush, low rumble and stomps, cartoon game sound, no music.'),
        ('acid_spit0', 0.7, 'Wet hock and spit of thick liquid leaving a mouth, cartoon game sound, no music.'),
        ('acid_spit1', 0.7, 'Wet throat hock then a short spit, cartoon game sound, no music.'),
        ('acid_sizzle0', 1.6, 'Acidic liquid sizzling on pavement, short fizz, cartoon game sound, no music.'),
        ('acid_sizzle1', 1.6, 'Green acid puddle bubbling and sizzling, cartoon game sound, no music.'),
        ('acid_splat0', 0.6, 'Wet splat of a thick glob hitting the ground, cartoon game sound, no music.'),
        ('acid_splat1', 0.6, 'Heavy wet splat impact, cartoon game sound, no music.'),
    ]
    for name, dur, prompt in sfx:
        out.append({'name': name, 'dur': dur, 'prompt': prompt})
    return out

def already_ok():
    done = set()
    if LOG.exists():
        try:
            data = json.loads(LOG.read_text())
            rows = data if isinstance(data, list) else data.get('results', [])
            for r in rows:
                if r.get('status') == 'ok':
                    done.add(r['name'])
        except Exception:
            pass
    # also treat a raw+dest pair from this campaign as done
    for raw in RAW.glob('*.mp3'):
        name = raw.stem
        dest = OUT / f'{name}.mp3'
        if dest.exists() and dest.stat().st_mtime >= raw.stat().st_mtime - 2:
            done.add(name)
    return done

def main():
    global KEY
    KEY = load_key()
    only = set(sys.argv[1:])
    all_jobs = jobs()
    if only:
        all_jobs = [j for j in all_jobs if j['name'] in only or j['name'].startswith(tuple(only))]
    done = already_ok()
    import threading
    from concurrent.futures import ThreadPoolExecutor, as_completed
    lock = threading.Lock()
    stop = {'billing': False}
    ok = fail = skip = 0
    results = []
    print(f'JOBS {len(all_jobs)} already={len(done)}', flush=True)

    def one(j):
        dest = OUT / f"{j['name']}.mp3"
        if j['name'] in done and dest.exists() and dest.stat().st_size > 800:
            return {'name': j['name'], 'status': 'skip'}
        if stop['billing']:
            return {'name': j['name'], 'status': 'skip', 'error': 'stopped'}
        payload = {
            'text': j['prompt'],
            'duration_seconds': j['dur'],
            'prompt_influence': 0.55,
            'output_format': 'mp3_44100_128',
        }
        print(f"GEN  {j['name']}", flush=True)
        try:
            res = fal(EP, payload)
            url = audio_url(res)
            if not url:
                raise RuntimeError('no audio url keys=' + ','.join(res.keys()))
            raw = RAW / f"{j['name']}.mp3"
            download(url, raw)
            post(raw, dest)
            rec = {'name': j['name'], 'status': 'ok', 'bytes': dest.stat().st_size}
            print(f"OK   {j['name']} {dest.stat().st_size}b", flush=True)
            return rec
        except Exception as e:
            msg = str(e)
            rec = {'name': j['name'], 'status': 'fail', 'error': msg[:500]}
            print(f"FAIL {j['name']} {msg[:300]}", flush=True)
            if msg.startswith('BILLING_STOP') or 'BILLING_STOP' in msg:
                stop['billing'] = True
            return rec

    workers = int(os.environ.get('ZVO_WORKERS', '2'))
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = [ex.submit(one, j) for j in all_jobs]
        for fut in as_completed(futs):
            rec = fut.result()
            results.append(rec)
            if rec.get('status') == 'ok':
                ok += 1
            elif rec.get('status') == 'skip':
                skip += 1
            else:
                fail += 1
            if stop['billing']:
                break
    LOG.write_text(json.dumps({'ok': ok, 'fail': fail, 'skip': skip, 'billing_stop': stop['billing'], 'results': results}, indent=2))
    print(f'DONE ok={ok} fail={fail} skip={skip} billing_stop={stop["billing"]}', flush=True)
    if stop['billing']:
        print('STOPPED: billing/credits error, no purchase attempted', flush=True)
        return 2
    return 0 if fail == 0 else 1

if __name__ == '__main__':
    sys.exit(main())
