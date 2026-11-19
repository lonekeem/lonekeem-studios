#!/bin/bash
# usage: hairshot.sh <base mp_f1|mp_m1> <hairId> <out.png> [views] [colour] [c2] [w] [h]
K=$1; ID=$2; OUT=$3; V=${4:-front,q34,side,back}; C=${5:-#2a1a12}; C2=${6:-#5a3a26}; W=${7:-1600}; H=${8:-620}
LK="{\"hair\":{\"id\":\"$ID\",\"c\":\"$C\",\"c2\":\"$C2\",\"hl\":0.4}}"
node tools/chars2/shot.mjs "http://127.0.0.1:${PORT:-5263}/tools/chars2/av.html?k=$K&views=$V&w=$W&h=$H&look=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$LK")" $OUT $W $H >/dev/null
