import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
const q=new URLSearchParams(location.search); const key=q.get('k')||'genm', mode=q.get('m')||'tex', view=q.get('v')||'body';
const r=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true}); r.setSize(800,800); document.body.appendChild(r.domElement);
const sc=new THREE.Scene(); sc.background=new THREE.Color('#556'); sc.add(new THREE.HemisphereLight('#fff','#556',1.6)); const dl=new THREE.DirectionalLight('#fff',1.5); dl.position.set(2,3,4); sc.add(dl);
const g=await new GLTFLoader().loadAsync('/models/chars/'+key+'.glb'); sc.add(g.scene);
let skin; g.scene.traverse(o=>{if(o.isSkinnedMesh)skin=o;});
if(mode==='flat') skin.material=new THREE.MeshStandardMaterial({color:'#8a5a40',roughness:.6}); if(mode==='wire'){skin.material=new THREE.MeshBasicMaterial({color:'#fff',wireframe:true});}
g.scene.updateMatrixWorld(true); const box=new THREE.Box3().setFromObject(g.scene); const c=box.getCenter(new THREE.Vector3()), s=box.getSize(new THREE.Vector3());
const cam=new THREE.PerspectiveCamera(30,1,.01,100);
if(view==='body'){cam.position.set(c.x,c.y,c.z+s.y*2.6);cam.lookAt(c);} else {const h=new THREE.Vector3(0,box.max.y-s.y*.07,0); cam.position.set(+q.get('x')||0,h.y,s.y*(+q.get('d')||.55)); cam.lookAt(h);} 
r.render(sc,cam);
window.info={size:s.toArray(),box:box.min.toArray().concat(box.max.toArray()),verts:skin.geometry.attributes.position.count,tris:skin.geometry.index.count/3};
document.title='done';
