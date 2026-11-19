# creator spin proof sheet: real-drag spin frames 0/90/180/270 + face zoom, both bases
from PIL import Image, ImageDraw
D = 'docs/mp-chars-v2/creator/'; W = 420
rows = []
for who in ['guy', 'girl']:
    ims = [Image.open(D + f'{who}_spin_{a}.png').convert('RGB') for a in (0, 90, 180, 270)] + [Image.open(D + f'{who}_facezoom.png').convert('RGB')]
    ims = [i.crop((0, 0, int(i.width * 464 / 844), i.height)) for i in ims]; ims = [i.resize((W, int(i.height * W / i.width))) for i in ims]; h = ims[0].height  # stage area only
    row = Image.new('RGB', (W * 5, h + 22), '#202020'); d = ImageDraw.Draw(row)
    for k, (i, lab) in enumerate(zip(ims, ['0 deg', '90 deg', '180 deg', '270 deg', 'face zoom'])): row.paste(i, (k * W, 22)); d.text((k * W + 6, 5), f'{who} {lab}', fill='white')
    row.save(D + f'{who}_spin_sheet.png'); rows.append(row)
out = Image.new('RGB', (rows[0].width, sum(r.height for r in rows))); y = 0
for r in rows: out.paste(r, (0, y)); y += r.height
out.save(D + 'spin_both_sheet.png')
