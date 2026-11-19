# ref-vs-model sheet: reference photo (not traced) | model front / 3/4 / face close-up
import sys
from PIL import Image, ImageDraw
ref, views, out = sys.argv[1:4]
H = 900; r = Image.open(ref).convert('RGB'); r = r.resize((int(r.width * H / r.height), H)); v = Image.open(views).convert('RGB'); v = v.resize((int(v.width * H / v.height), H))
im = Image.new('RGB', (r.width + v.width + 10, H + 34), '#202020'); im.paste(r, (0, 34)); im.paste(v, (r.width + 10, 34))
d = ImageDraw.Draw(im); d.text((8, 10), 'REFERENCE (not traced)', fill='white'); d.text((r.width + 18, 10), 'v2 model: front / 3/4 / face close-up  (original procedural model, no logos)', fill='white')
im.save(out)
