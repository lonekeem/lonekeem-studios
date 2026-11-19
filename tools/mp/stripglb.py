#!/usr/bin/env python3
# Strip baked textures + animations from a Meshy rigged GLB (the creator paints skin/face procedurally); keeps mesh, skin weights, skeleton.
import json,struct,sys
def strip(src,dst):
    d=open(src,'rb').read(); jl=struct.unpack('<I',d[12:16])[0]; j=json.loads(d[20:20+jl]); off=20+jl+8; bl=struct.unpack('<I',d[20+jl:24+jl])[0]; binb=d[off:off+bl]
    keep=set()
    for m in j['meshes']:
        for p in m['primitives']:
            keep.add(p['indices']); keep.update(p['attributes'].values())
    for s in j.get('skins',[]): keep.add(s['inverseBindMatrices'])
    amap={}; na=[]; nbv=[]; nb=bytearray()
    for i in sorted(keep):
        a=dict(j['accessors'][i]); bv=j['bufferViews'][a['bufferView']]; start=bv.get('byteOffset',0)+a.get('byteOffset',0)
        esz={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]*{5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}[a['componentType']]
        if bv.get('byteStride') not in (None,esz): raise SystemExit('strided')
        ln=a['count']*esz
        while len(nb)%4: nb.append(0)
        o=len(nb); nb+=binb[start:start+ln]
        v={'buffer':0,'byteOffset':o,'byteLength':ln}
        if 'target' in bv: v['target']=bv['target']
        a['bufferView']=len(nbv); a.pop('byteOffset',None); nbv.append(v); amap[i]=len(na); na.append(a)
    for m in j['meshes']:
        for p in m['primitives']:
            p['indices']=amap[p['indices']]; p['attributes']={k:amap[v] for k,v in p['attributes'].items()}
    for s in j['skins']: s['inverseBindMatrices']=amap[s['inverseBindMatrices']]
    j['accessors']=na; j['bufferViews']=nbv; j['buffers']=[{'byteLength':len(nb)}]
    for k in ['animations','images','textures','samplers']: j.pop(k,None)
    j['materials']=[{'name':'Material_0','pbrMetallicRoughness':{'metallicFactor':0,'roughnessFactor':.6}}]
    js=json.dumps(j,separators=(',',':')).encode()
    while len(js)%4: js+=b' '
    while len(nb)%4: nb.append(0)
    out=struct.pack('<III',0x46546C67,2,12+8+len(js)+8+len(nb))+struct.pack('<II',len(js),0x4E4F534A)+js+struct.pack('<II',len(nb),0x004E4942)+bytes(nb)
    open(dst,'wb').write(out); print(dst,len(out))
for a in sys.argv[1:]:
    s,dd=a.split(':'); strip(s,dd)
