import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
const key=new URLSearchParams(location.search).get('k')||'genm';
const g=await new GLTFLoader().loadAsync('/models/chars/'+key+'.glb'); let skin; g.scene.traverse(o=>{if(o.isSkinnedMesh)skin=o;}); g.scene.updateMatrixWorld(true); skin.skeleton.update();
const a=skin.geometry.attributes.position; let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9]; for(let i=0;i<a.count;i++){for(let k=0;k<3;k++){const v=a.array[i*a.itemSize+k]; mn[k]=Math.min(mn[k],v); mx[k]=Math.max(mx[k],v);}}
const t=new THREE.Vector3(); skin.applyBoneTransform(100,t);
window.info={itemSize:a.itemSize,norm:a.normalized,type:a.array.constructor.name,mn,mx,skinned100:t.toArray(),raw100:[a.getX(100),a.getY(100),a.getZ(100)], bindM:skin.bindMatrix.elements.slice(0,16).map(x=>+x.toFixed(5)),mw:skin.matrixWorld.elements.map(x=>+x.toFixed(5)),ibmHead:skin.skeleton.boneInverses[5].elements.map(x=>+x.toFixed(4))}; document.title='done';
