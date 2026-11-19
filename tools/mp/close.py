import json, sys, urllib.parse, subprocess
# close.py out base slot id color d cy ry [w h] [extra-json-patch]
out,base,slot,i,col,d,cy,ry=sys.argv[1:9]; w=int(sys.argv[9]) if len(sys.argv)>9 else 800; h=int(sys.argv[10]) if len(sys.argv)>10 else 800
sys.path.insert(0,'tools/mp'); from sheet import patch
js=[patch(slot,i,col)]
if len(sys.argv)>11: 
    for k,v in json.loads(sys.argv[11]).items(): js[0].setdefault('worn',{}); js[0]['worn'][k]=v
q=urllib.parse.urlencode({'k':base,'js':json.dumps(js),'v':'full','d':d,'gap':.5,'w':w,'h':h,'cy':cy,'ry':ry})
subprocess.run(['node','tools/mp/shot.mjs',f'http://127.0.0.1:5199/tools/mp/dtest.html?{q}',out,str(w),str(h)])
