#!/usr/bin/env python3
"""Trim silence, peak-normalize zombie vocals, write public/sfx + preview reel."""
import json, subprocess, re, hashlib, shutil
from pathlib import Path
from collections import defaultdict

RAW = Path('/tmp/zvo-raw')
if not (RAW / 'zvo_male_idle0.mp3').exists():
    RAW = Path('/workspace/atq-zvo/tools/zvo-raw')
OUT = Path('/workspace/atq-zvo/public/sfx')
PREV = Path('/workspace/atq-polish/preview-zombie-vo')
TMP = Path('/tmp/zvo-norm')
TMP.mkdir(parents=True, exist_ok=True)
PREV.mkdir(parents=True, exist_ok=True)

PEAK = {
    'idle': -8.0, 'alert': -4.0, 'attack': -1.5, 'hurt': -1.5,
    'death': -2.0, 'roar': -1.2, 'eat': -3.0, 'chew': -3.0,
}

def ff(*args, check=True):
    return subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', *args], check=check, capture_output=True, text=True)

def probe_vol(path):
    r = subprocess.run(['ffmpeg', '-i', str(path), '-af', 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True)
    mean = maxv = None
    for line in r.stderr.splitlines():
        if 'mean_volume' in line:
            mean = float(line.split('mean_volume:')[1].split('dB')[0].strip())
        if 'max_volume' in line:
            maxv = float(line.split('max_volume:')[1].split('dB')[0].strip())
    return mean, maxv

def duration(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)], capture_output=True, text=True)
    try:
        return float(r.stdout.strip())
    except Exception:
        return 0.0

def kind_of(name):
    # zvo_{profile}_{kind}{i}
    stem = Path(name).stem
    parts = stem.split('_')
    # last token ends with digits: idle0 / attack2 / roar1 / eat0
    last = parts[-1]
    m = re.match(r'([a-zA-Z]+)(\d+)$', last)
    return m.group(1) if m else 'idle'

def normalize_one(src: Path, dest: Path):
    kind = kind_of(src.name)
    target = PEAK.get(kind, -2.0)
    trimmed = TMP / (src.stem + '_trim.wav')
    # conservative trim; leave a little pad
    af = (
        'silenceremove=start_periods=1:start_duration=0.04:start_threshold=-38dB:start_silence=0.03:detection=peak,'
        'areverse,'
        'silenceremove=start_periods=1:start_duration=0.06:start_threshold=-38dB:start_silence=0.05:detection=peak,'
        'areverse'
    )
    ff('-i', str(src), '-af', af, '-ac', '1', '-ar', '44100', str(trimmed))
    d = duration(trimmed)
    if d < 0.18:
        # too aggressive; keep more of the original
        ff('-i', str(src), '-ac', '1', '-ar', '44100', str(trimmed))
        d = duration(trimmed)
    mean, maxv = probe_vol(trimmed)
    gain = 0.0
    if maxv is not None:
        # aim for target peak, but never boost more than +10 dB
        gain = target - maxv
        if gain > 10:
            gain = 10
        if gain < -12:
            gain = -12
    outwav = TMP / (src.stem + '_out.wav')
    ff('-i', str(trimmed), '-af', f'volume={gain}dB,alimiter=limit=0.89:attack=5:release=50', str(outwav))
    ff('-i', str(outwav), '-ac', '1', '-ar', '44100', '-b:a', '64k', str(dest))
    return {
        'file': dest.name,
        'kind': kind,
        'src_dur': round(duration(src), 3),
        'out_dur': round(duration(dest), 3),
        'src_mean': mean,
        'src_peak': maxv,
        'gain_db': round(gain, 2),
        'out_mean': probe_vol(dest)[0],
        'out_peak': probe_vol(dest)[1],
        'bytes': dest.stat().st_size,
        'md5': hashlib.md5(dest.read_bytes()).hexdigest(),
    }

def beep(path, freq=880, dur=0.18):
    ff('-f', 'lavfi', '-i', f'sine=frequency={freq}:duration={dur}', '-af', 'afade=t=in:st=0:d=0.01,afade=t=out:st=0.15:d=0.03,volume=-8dB', '-ac', '1', '-ar', '44100', str(path))

def silence(path, dur=0.35):
    ff('-f', 'lavfi', '-i', f'anullsrc=r=44100:cl=mono', '-t', str(dur), str(path))

def main():
    srcs = sorted(RAW.glob('zvo_*.mp3'))
    if len(srcs) != 114:
        print(f'WARN expected 114 raw clips, got {len(srcs)}')
    report = []
    for src in srcs:
        dest = OUT / src.name
        info = normalize_one(src, dest)
        report.append(info)
        print(f"{info['file']:28} dur {info['src_dur']:.2f}->{info['out_dur']:.2f}  peak {info['src_peak']:.1f}->{info['out_peak']:.1f}  gain {info['gain_db']:+.1f}")
    hashes = [r['md5'] for r in report]
    print('normalized', len(report), 'unique', len(set(hashes)))
    Path('/tmp/zvo-norm-report.json').write_text(json.dumps(report, indent=2))

    # preview reel
    beep_lo = TMP / 'beep_lo.wav'; beep(beep_lo, 660, 0.16)
    beep_hi = TMP / 'beep_hi.wav'; beep(beep_hi, 990, 0.16)
    gap = TMP / 'gap.wav'; silence(gap, 0.28)
    gap2 = TMP / 'gap2.wav'; silence(gap2, 0.55)

    old_dir = Path('/workspace/atq-zvo/public/sfx')
    old_files = [
        old_dir / 'z_growl0.mp3',
        old_dir / 'z_growl1.mp3',
        old_dir / 'z_moan0.mp3',
        old_dir / 'z_attack0.mp3',
        old_dir / 'z_eat0.mp3',
        old_dir / 'boss_roar.mp3',
    ]
    new_files = [
        OUT / 'zvo_male_idle0.mp3', OUT / 'zvo_male_alert0.mp3', OUT / 'zvo_male_attack0.mp3',
        OUT / 'zvo_female_idle0.mp3', OUT / 'zvo_female_alert0.mp3', OUT / 'zvo_female_attack0.mp3',
        OUT / 'zvo_elder_idle0.mp3', OUT / 'zvo_elder_attack0.mp3',
        OUT / 'zvo_brute_idle0.mp3', OUT / 'zvo_brute_attack0.mp3',
        OUT / 'zvo_gurgler_idle0.mp3', OUT / 'zvo_gurgler_attack0.mp3',
        OUT / 'zvo_teen_m_idle0.mp3', OUT / 'zvo_teen_m_attack0.mp3',
        OUT / 'zvo_teen_f_idle0.mp3', OUT / 'zvo_teen_f_attack0.mp3',
        OUT / 'zvo_boss_m_roar0.mp3', OUT / 'zvo_boss_f_roar0.mp3',
        OUT / 'zvo_feed_eat0.mp3', OUT / 'zvo_feed_chew0.mp3',
    ]
    concat = TMP / 'concat.txt'
    pieces = []
    def add(p):
        pieces.append(p)

    # section beep then old, section beep then new; small beep between items
    add(beep_lo); add(gap2)
    for p in old_files:
        add(p); add(gap)
    add(gap2); add(beep_hi); add(gap2)
    for p in new_files:
        add(p); add(gap)

    # write concat list with re-encodes to wav first for concat demuxer
    wavs = []
    for i, p in enumerate(pieces):
        w = TMP / f'c{i:03d}.wav'
        ff('-i', str(p), '-ac', '1', '-ar', '44100', str(w))
        wavs.append(w)
    concat.write_text(''.join(f"file '{w}'\n" for w in wavs))
    preview = PREV / 'zombie-vo-before-after.mp3'
    subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', str(concat), '-ac', '1', '-ar', '44100', '-b:a', '96k', str(preview)], check=True)
    print('preview', preview, 'dur', duration(preview), 'bytes', preview.stat().st_size)

    # also copy representative before/after folders
    bdir = PREV / 'before'; adir = PREV / 'after'
    bdir.mkdir(exist_ok=True); adir.mkdir(exist_ok=True)
    for p in old_files:
        shutil.copy2(p, bdir / p.name)
    for p in new_files:
        shutil.copy2(p, adir / p.name)

    # index.html
    groups = defaultdict(list)
    for r in report:
        # profile from filename zvo_{profile}_{kind}{i}
        name = r['file'][:-4]
        body = name[4:]  # strip zvo_
        # split kind at the end
        m = re.match(r'(.+)_([a-z]+)(\d+)$', body)
        prof, k, i = (m.group(1), m.group(2), m.group(3)) if m else ('?', '?', '0')
        groups[prof].append((k, int(i), r['file'], r['out_dur']))
    html = ['<!doctype html><meta charset=utf-8><title>Zombie VO preview</title>',
            '<style>body{font:16px/1.4 system-ui,sans-serif;max-width:860px;margin:2rem auto;padding:0 1rem;background:#111;color:#eee}h1,h2{font-weight:600}audio{width:100%;margin:.2rem 0}.row{display:flex;gap:1rem;align-items:center}label{min-width:8rem;color:#bbb}</style>',
            '<h1>After the Quiet — zombie voices</h1>',
            '<p>Low beep, then the old procedural synth bank. High beep, then the new ElevenLabs profiles (male, female, elder, brute, gurgler, teen, bosses, feeding).</p>',
            f'<p>Before/after reel ({duration(preview):.1f}s)</p>',
            '<audio controls src="zombie-vo-before-after.mp3"></audio>']
    html.append('<h2>New profiles</h2>')
    for prof, items in groups.items():
        html.append(f'<h3>{prof}</h3>')
        for k, i, fn, d in sorted(items):
            html.append(f'<div class=row><label>{k} {i} ({d:.2f}s)</label><audio controls preload=none src="after/{fn}"></audio></div>' if (PREV/'after'/fn).exists() else f'<div class=row><label>{k} {i} ({d:.2f}s)</label><audio controls preload=none src="../atq-zvo/public/sfx/{fn}"></audio></div>')
    # after/ only has representatives; point the rest at a local relative copy of all
    all_dir = PREV / 'all'
    all_dir.mkdir(exist_ok=True)
    for r in report:
        shutil.copy2(OUT / r['file'], all_dir / r['file'])
    # rewrite profile players to all/
    html = [l for l in html if not l.startswith('<h2>New') and not l.startswith('<h3>') and not l.startswith('<div')]
    html.append('<h2>New profiles</h2>')
    for prof, items in groups.items():
        html.append(f'<h3>{prof}</h3>')
        for k, i, fn, d in sorted(items):
            html.append(f'<div class=row><label>{k} {i} ({d:.2f}s)</label><audio controls preload=none src="all/{fn}"></audio></div>')
    (PREV / 'index.html').write_text('\n'.join(html))
    print('wrote', PREV / 'index.html')

if __name__ == '__main__':
    main()
