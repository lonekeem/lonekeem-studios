#!/bin/bash
# usage: hairset.sh <base> <out.png> <ids...>  -> stacked close-up rows (hf,hq,hs,hb) per hair id
K=$1; OUT=$2; shift 2; T=$(mktemp -d); i=0
for ID in "$@"; do tools/chars2/hairshot.sh $K $ID $T/$i.png hf,hq,hs,hb '#2a1a12' '#5a3a26' 1600 480; i=$((i+1)); done
python3 - "$T" "$OUT" $i <<'PY'
import sys
from PIL import Image
t,out,n=sys.argv[1],sys.argv[2],int(sys.argv[3]); ims=[Image.open(f'{t}/{k}.png') for k in range(n)]
o=Image.new('RGB',(ims[0].width,sum(i.height for i in ims)));y=0
for i in ims:o.paste(i,(0,y));y+=i.height
o.save(out)
PY
