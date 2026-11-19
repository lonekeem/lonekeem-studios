import json, sys, urllib.parse, subprocess, concurrent.futures as cf
sys.path.insert(0,'.')
# usage: sheet.py name base slot ids...   slot: hair|hat|glasses|ear|neck|... builds patches
def patch(slot, i, extra=None):
    if slot=='hair': return {'hair':{'id':i,'c':'#2b1a10','c2':'#7a5230'}}
    if slot=='beard': return {'beard':{'id':i,'c':None,'len':.5,'dens':.9}}
    if slot=='stache': return {'stache':{'id':i,'c':None,'len':.5,'dens':.9},'beard':{'id':'none'}}
    if slot=='hat': return {'acc':{'hat':{'id':i,'m':0,'g':0,'c':'#c0392b','c2':'#17181b','p':0}}}
    if slot=='glasses': return {'acc':{'glasses':{'id':i,'m':3,'g':0,'c':'#000','c2':'#000','p':0}}}
    if slot=='earL': return {'acc':{'earL':{'id':i,'m':0,'g':1,'c':'#000','c2':'#000'},'earR':{'id':i,'m':1,'g':2,'c':'#000','c2':'#000'}}}
    if slot=='pierce': return {'acc':{'pierce':[i]}}
    if slot=='neck': return {'acc':{'neck':{'id':i,'m':0,'g':1,'c':'#c0392b','c2':'#fff'}}}
    if slot=='mask': return {'mask':{'id':i,'c':'#2a2f38','c2':'#fff'}}
    if slot=='bag': return {'acc':{'bag':{'id':i,'m':0,'g':0,'c':'#2f5d3a','c2':'#17181b'}}}
    if slot=='belt': return {'acc':{'belt':{'id':i,'m':0,'g':0,'c':'#5b3a24','c2':'#000'}}}
    if slot=='wristL': return {'acc':{'wristL':{'id':i,'m':0,'g':1,'c':'#222','c2':'#fff'},'wristR':{'id':i,'m':1,'g':2,'c':'#c0392b','c2':'#fff'}}}
    if slot=='ringL': return {'acc':{'ringL':{'id':i,'m':0,'g':1},'ringR':{'id':i,'m':1,'g':2}}}
    if slot in ('top','jacket','pants','shoes','gloves'): return {'worn':{slot:{'id':i,'c':extra or '#c0392b','c2':'#f2f2f0','p':0,'sole':'#f2f2f0'}}}
    raise SystemExit('slot '+slot)
def run(args):
    name, base, slot, ids, view, d, w, h, gap, cy, extra = args
    js=[patch(slot,i,extra) for i in ids]
    q=urllib.parse.urlencode({'k':','.join([base]*len(ids)),'js':json.dumps(js),'v':view,'d':d,'gap':gap,'w':w,'h':h,'cy':cy})
    out=f'/workspace/mp/q/{name}.png'
    subprocess.run(['node','tools/mp/shot.mjs',f'http://127.0.0.1:5199/tools/mp/dtest.html?{q}',out,str(w),str(h)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    return out
if __name__=='__main__':
    spec=json.load(open(sys.argv[1])); jobs=[tuple(j) for j in spec]
    with cf.ThreadPoolExecutor(3) as ex: [print(r) for r in ex.map(run,jobs)]
