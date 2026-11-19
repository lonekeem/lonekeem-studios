import * as THREE from 'three';
import { loadBase, Avatar } from '../../src/mp/avatar.js';
const q=new URLSearchParams(location.search); const key=q.get('k')||'mp_m1', view=q.get('v')||'head';
const W=+q.get('w')||600,H=+q.get('h')||600;
const r=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true}); r.setSize(W,H); r.setPixelRatio(1); document.body.appendChild(r.domElement); r.outputColorSpace=THREE.SRGBColorSpace;
const sc=new THREE.Scene(); sc.background=new THREE.Color('#4a4e5a'); sc.add(new THREE.HemisphereLight('#ffffff','#667',1.1)); const dl=new THREE.DirectionalLight('#fff',2.2); dl.position.set(1.5,2.5,3); sc.add(dl);
const tpl=await loadBase(key); const av=new Avatar(tpl); sc.add(av.root);
const U=av.U; U.uSkin.value.set(q.get('skin')?('#'+q.get('skin')):'#c98d63'); const L=tpl.lm; U.uLm.value.set(L.cx,L.chinY,L.hw,L.hw);
window.av=av; window.info={lm:L,P:Object.fromEntries(Object.entries(tpl.P).map(([k,v])=>[k,v.toArray().map(x=>+x.toFixed(3))]))};
const cam=new THREE.PerspectiveCamera(30,W/H,.01,50);
if(view==='head'){const cy=L.chinY+L.hh*.5; cam.position.set(+q.get('x')||0,cy,(+q.get('d')||.7)); cam.lookAt(0,cy,0);} else {cam.position.set(0,.9,4.2); cam.lookAt(0,.88,0);}
r.render(sc,cam); document.title='done';
