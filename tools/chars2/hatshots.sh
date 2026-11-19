#!/bin/bash
# usage: hatshots.sh <base> <outprefix> <views> <hat ids...>   (uses each hat's catalog default colours)
K=$1; OUT=$2; V=$3; shift 3
for H in "$@"; do
LK=$(node -e "import('/workspace/atqchar/src/mp/catalog.js').then(C=>{const d=C.HAT_DEFAULTS['$H']||['#c23b3b','#fff'];console.log(JSON.stringify({acc:{hat:{id:'$H',m:0,g:0,c:d[0],c2:d[1],p:0},glasses:null,earL:null,earR:null,pierce:[],neck:null,wristL:null,wristR:null,ringL:null,ringR:null,bag:null,belt:null}}))})")
node tools/chars2/shot.mjs "http://127.0.0.1:${PORT:-5262}/tools/chars2/av.html?k=$K&views=$V&w=1500&h=500&look=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$LK")" ${OUT}_$H.png 1500 500 >/dev/null
done
