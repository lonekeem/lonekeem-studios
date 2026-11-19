# usage: proof_sheet.py out.jpg cols scale prefix idx,idx,... (labels with frame index)
import sys
from PIL import Image, ImageDraw
out, cols, sc, pre = sys.argv[1], int(sys.argv[2]), float(sys.argv[3]), sys.argv[4]; idx = [int(i) for i in sys.argv[5].split(',')]
ims = [Image.open(f'{pre}_{i:02d}.png').convert('RGB') for i in idx]; w, h = int(ims[0].width * sc), int(ims[0].height * sc)
S = Image.new('RGB', (cols * w, ((len(ims) + cols - 1) // cols) * h)); d = ImageDraw.Draw(S)
for k, (i, im) in enumerate(zip(idx, ims)): S.paste(im.resize((w, h), Image.LANCZOS), ((k % cols) * w, (k // cols) * h)); d.text(((k % cols) * w + 4, (k // cols) * h + 4), str(i), fill=(255, 255, 0))
S.save(out, quality=88)
