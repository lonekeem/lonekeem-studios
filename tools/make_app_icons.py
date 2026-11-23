#!/usr/bin/env python3
"""Dev-only: build web + Android launcher icons from the approved game-based art.
Fills the pre-rounded black corners so OS masks can crop a full-bleed square.
Not imported by the game bundle.
"""
import os, sys, json
import numpy as np
import cv2
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('ATQ_ICON_SRC')
if not SRC:
    raise SystemExit('usage: make_app_icons.py /path/to/source.jpg')

LAN = Image.Resampling.LANCZOS


def fill_corners(rgb, radius=162):
    im = np.asarray(rgb.convert('RGB')).copy()
    h, w = im.shape[:2]
    lum = im[:, :, 0] * 0.299 + im[:, :, 1] * 0.587 + im[:, :, 2] * 0.114
    r = int(radius)
    mask = np.zeros((h, w), np.uint8)
    corners = [(r, r), (w - 1 - r, r), (r, h - 1 - r), (w - 1 - r, h - 1 - r)]
    quads = [(0, r, 0, r), (w - r, w, 0, r), (0, r, h - r, h), (w - r, w, h - r, h)]
    for (cx, cy), (qx0, qx1, qy0, qy1) in zip(corners, quads):
        sl = np.s_[qy0:qy1, qx0:qx1]
        Y, X = np.ogrid[qy0:qy1, qx0:qx1]
        mask[sl] = np.where(np.hypot(X - cx, Y - cy) > r, 255, mask[sl])
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
    dark = (lum < 28).astype(np.uint8) * 255
    mask = cv2.bitwise_or(mask, cv2.bitwise_and(cv2.dilate(mask, k), dark))
    out = cv2.inpaint(im, mask, 7, cv2.INPAINT_TELEA)
    out = cv2.inpaint(out, mask, 5, cv2.INPAINT_NS)
    return Image.fromarray(out)


def rmask(size, rad):
    m = Image.new('L', (size * 4, size * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size * 4 - 1, size * 4 - 1), radius=max(1, int(rad * 4)), fill=255)
    return m.resize((size, size), LAN)


def cmask(size):
    m = Image.new('L', (size * 4, size * 4), 0)
    ImageDraw.Draw(m).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    return m.resize((size, size), LAN)


def extend_pad(im, scale=0.80):
    """Scale the scene into the center `scale` of the canvas.
    The ring is a blurred, slightly darkened copy of the art (no mirrored clones).
    """
    from PIL import ImageFilter, ImageEnhance
    n = im.size[0]
    inner = max(1, int(round(n * scale)))
    pad = int(round((n - inner) / 2))
    # zoomed-in blur so the ring keeps the night sky / asphalt color without repeating figures
    bg = im.resize((n, n), LAN).filter(ImageFilter.GaussianBlur(radius=max(8, n * 0.045)))
    bg = ImageEnhance.Brightness(bg).enhance(0.72)
    bg = ImageEnhance.Color(bg).enhance(0.85)
    scene = im.resize((inner, inner), LAN)
    bg = bg.convert('RGB')
    bg.paste(scene, (pad, pad))
    return bg


def circle_icon(im, size):
    src = im.resize((size, size), LAN).convert('RGBA')
    src.putalpha(cmask(size))
    return src


def save(im, path, **kw):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if path.endswith('.png'):
        im.save(path, optimize=True, **kw)
    else:
        im.save(path, **kw)
    print('wrote', path, im.size, im.mode)


def main():
    raw = Image.open(SRC).convert('RGB')
    assert raw.size[0] == raw.size[1], raw.size
    master = fill_corners(raw, 162).resize((1024, 1024), LAN)
    # night color from upper sky (avoid the filled corner)
    sky = np.asarray(master)[80:160, 400:624]
    bg_rgb = tuple(int(round(v)) for v in np.median(sky.reshape(-1, 3), axis=0))
    print('bg', '#%02x%02x%02x' % bg_rgb)

    pub = os.path.join(ROOT, 'public')
    assets = os.path.join(ROOT, 'assets')
    res = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')

    # Capacitor sources
    save(master, os.path.join(assets, 'icon-only.png'))
    save(Image.new('RGB', (1024, 1024), bg_rgb), os.path.join(assets, 'icon-background.png'))
    # foreground: scene in the adaptive safe zone (~72/108), on transparent, so the
    # night background layer can fill the mask around it.
    fg = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    inner = extend_pad(master, 0.72).convert('RGBA')
    # use the padded scene itself as an opaque foreground (safe margin already inside)
    save(inner, os.path.join(assets, 'icon-foreground.png'))

    # Web
    save(master.resize((32, 32), LAN), os.path.join(pub, 'favicon-32.png'))
    save(master.resize((180, 180), LAN), os.path.join(pub, 'apple-touch-icon.png'))
    save(master.resize((192, 192), LAN), os.path.join(pub, 'icon-192.png'))
    save(master.resize((512, 512), LAN), os.path.join(pub, 'icon-512.png'))
    # Maskable: important art in the center 80% (W3C safe zone)
    for n in (192, 512):
        save(extend_pad(master, 0.70).resize((n, n), LAN), os.path.join(pub, f'icon-maskable-{n}.png'))

    # Manifest: include both maskable sizes
    man_path = os.path.join(pub, 'manifest.webmanifest')
    with open(man_path) as f:
        man = json.load(f)
    man['icons'] = [
        {'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
        {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
        {'src': 'icon-maskable-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'maskable'},
        {'src': 'icon-maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
    ]
    with open(man_path, 'w') as f:
        json.dump(man, f, indent=2)
        f.write('\n')
    print('updated', man_path)

    # Android densities. Legacy launcher icons are 48dp; adaptive layers are 108dp.
    dens = {'ldpi': 0.75, 'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
    padded = extend_pad(master, 0.72)
    for d, k in dens.items():
        folder = os.path.join(res, f'mipmap-{d}')
        L = max(1, round(48 * k))
        F = max(1, round(108 * k))
        # full-bleed square for pre-26 / shortcuts
        save(master.resize((L, L), LAN).convert('RGBA'), os.path.join(folder, 'ic_launcher.png'))
        save(circle_icon(master, L), os.path.join(folder, 'ic_launcher_round.png'))
        save(padded.resize((F, F), LAN).convert('RGBA'), os.path.join(folder, 'ic_launcher_foreground.png'))
        save(master.resize((F, F), LAN).convert('RGB'), os.path.join(folder, 'ic_launcher_background.png'))

    # Standard adaptive XML (no extra inset — padding is in the 108dp assets)
    xml = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
'''
    anydpi = os.path.join(res, 'mipmap-anydpi-v26')
    os.makedirs(anydpi, exist_ok=True)
    for name in ('ic_launcher.xml', 'ic_launcher_round.xml'):
        path = os.path.join(anydpi, name)
        with open(path, 'w') as f:
            f.write(xml)
        print('wrote', path)

    color_path = os.path.join(res, 'values', 'ic_launcher_background.xml')
    with open(color_path, 'w') as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#%02x%02x%02x</color>\n</resources>\n' % bg_rgb)
    print('wrote', color_path, '#%02x%02x%02x' % bg_rgb)

    # proof previews (not shipped)
    proof = os.environ.get('ATQ_ICON_PROOF', '/workspace/atq-icon/verify')
    os.makedirs(proof, exist_ok=True)
    save(master, os.path.join(proof, 'master-1024.png'))
    save(extend_pad(master, 0.70), os.path.join(proof, 'maskable-master.png'))
    # how it looks under common masks
    for label, fn in (('square', lambda s, n: s.resize((n, n), LAN)),
                      ('squircle', lambda s, n: (lambda im: (im.putalpha(rmask(n, int(n * 0.22))), im)[1])(s.resize((n, n), LAN).convert('RGBA'))),
                      ('circle', lambda s, n: circle_icon(s, n))):
        sheet = Image.new('RGB', (512 * 3 + 16, 512 + 8), (8, 14, 10))
        # just write individuals
        fn(master, 512).convert('RGB').save(os.path.join(proof, f'preview-{label}-512.png'))
    print('proof at', proof)


if __name__ == '__main__':
    main()
