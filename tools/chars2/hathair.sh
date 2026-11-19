#!/bin/bash
# usage: hathair.sh <base> <hairId> <out.png> <hat ids...>  -> one row per hat (hf,hq,hs,hb) with that hair under the hat
K=$1; HID=$2; OUT=$3; shift 3; T=$(mktemp -d); i=0
for H in "$@"; do
LK=$(node -e "import('/workspace/atqhair/src/mp/catalog.js').then(C=>{const d=C.HAT_DEFAULTS['$H']||['#c23b3b','#fff'];console.log(JSON.stringify({hair:{id:'$HID',c:'${COL:-#2a1a12}',c2:'#5a3a26',hl:.4},acc:{hat:{id:'$H',m:0,g:0,c:d[0],c2:d[1],p:0},glasses:null,earL:null,earR:null,pierce:[],neck:null,wristL:null,wristR:null,ringL:null,ringR:null,bag:null,belt:null}}))})")
node tools/chars2/shot.mjs "http://127.0.0.1:${PORT:-5263}/tools/chars2/av.html?k=$K&views=hf,hq,hs,hb&w=1600&h=420&look=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$LK")" $T/$i.png 1600 420 >/dev/null; i=$((i+1)); done
python3 - "$T" "$OUT" $i <<'PY'
import sys
from PIL import Image
t,out,n=sys.argv[1],sys.argv[2],int(sys.argv[3]); ims=[Image.open(f'{t}/{k}.png') for k in range(n)]
o=Image.new('RGB',(ims[0].width,sum(i.height for i in ims)));y=0
for i in ims:o.paste(i,(0,y));y+=i.height
o.save(out)
PY
