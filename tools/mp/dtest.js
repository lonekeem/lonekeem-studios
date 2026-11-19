import * as THREE from 'three';
import { loadBase, Avatar } from '../../src/mp/avatar.js';
import { dress } from '../../src/mp/dress.js';
import { defaultLook, randomLook, normalize } from '../../src/mp/look.js';
const q=new URLSearchParams(location.search); const W=+q.get('w')||600,H=+q.get('h')||800; const view=q.get('v')||'full';
const r=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true}); r.setSize(W,H); r.setPixelRatio(1); document.body.appendChild(r.domElement); r.outputColorSpace=THREE.SRGBColorSpace;
const sc=new THREE.Scene(); sc.background=new THREE.Color('#4a4e5a'); sc.add(new THREE.HemisphereLight('#ffffff','#667',1.1)); const dl=new THREE.DirectionalLight('#fff',2.2); dl.position.set(1.5,2.5,3); sc.add(dl);
const keys=(q.get('k')||'mp_m1').split(','); const looks=[];
const cam=new THREE.PerspectiveCamera(30,W/H,.01,50);
let x0=-(keys.length-1)*.5*(+q.get('gap')||.9); window.errs=[];
for(let i=0;i<keys.length;i++){ const k=keys[i]; const tpl=await loadBase(k); const av=new Avatar(tpl); let L=q.get('seed')?randomLook(k,+q.get('seed')+i*77):defaultLook(k); if(q.get('skin')) L.skin.t=+q.get('skin'); if(q.get('j')) Object.assign(L,JSON.parse(q.get('j'))); if(q.get('js')){ const a=JSON.parse(q.get('js'))[i]; if(a){ for(const k in a){ if(a[k]&&typeof a[k]==='object'&&!Array.isArray(a[k])&&L[k]&&typeof L[k]==='object') Object.assign(L[k],a[k]); else L[k]=a[k]; } } }
 try{ dress(av,normalize(L)); }catch(e){ console.error(e.stack); window.errs.push(e.message); }
 av.root.position.x=x0+i*(+q.get('gap')||.9); sc.add(av.root); looks.push(av); }
window.avs=looks; if(q.get('nm')) looks.forEach(a=>{a.skin.material=new THREE.MeshMatcapMaterial({color:'#ddd'});});
const h0=looks[0].tpl.lm; const cy=(h0.chinY+h0.hh*.5);
if(view==='head'){ const t=looks[0]; cam.position.set(+q.get('x')||0,cy,(+q.get('d')||.7)); cam.lookAt(0,cy,0); }
else if(view==='hands'){ cam.position.set(.5,.95,1.0); cam.lookAt(.35,.85,0); }
else { const d=+q.get('d')||(keys.length>2?6.5:4.2); cam.position.set(0,+q.get('cy')||1.0,d); cam.lookAt(0,+q.get('cy')||.9,0); }
r.render(sc,cam); document.title='done'; window.info={err:window.errs};
