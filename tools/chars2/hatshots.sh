#!/bin/bash
# usage: hatshots.sh <base> <outprefix> <views> <hat ids...>
K=$1; OUT=$2; V=$3; shift 3
for H in "$@"; do
LK="{\"acc\":{\"hat\":{\"id\":\"$H\",\"m\":0,\"g\":0,\"c\":\"#c23b3b\",\"c2\":\"#f2f2f0\",\"p\":0},\"glasses\":null,\"earL\":null,\"earR\":null,\"pierce\":[],\"neck\":null,\"wristL\":null,\"wristR\":null,\"ringL\":null,\"ringR\":null,\"bag\":null,\"belt\":null}}"
node tools/chars2/shot.mjs "http://127.0.0.1:${PORT:-5262}/tools/chars2/av.html?k=$K&views=$V&w=1500&h=500&look=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$LK")" ${OUT}_$H.png 1500 500 >/dev/null
done
