#!/usr/bin/env python3
# contact sheet: python3 tools/sheet2124.py out.jpg img1 img2 ...  (4 per row, labelled)
import sys
from PIL import Image, ImageDraw
out, files = sys.argv[1], sys.argv[2:]
W, H, C = 560, 259, 4
R = (len(files) + C - 1) // C
S = Image.new('RGB', (W * C, (H + 16) * R), '#111')
d = ImageDraw.Draw(S)
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((W, H))
    x, y = (i % C) * W, (i // C) * (H + 16)
    S.paste(im, (x, y + 16)); d.text((x + 4, y + 2), f.split('/')[-1], fill='#ff0')
S.save(out, quality=82)
