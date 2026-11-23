// Online-only mobility aid: a simple original wheelchair (no logos). Parent it to the avatar root so
// walking / rolling still uses the same town movement; the chair travels with the player.
import * as THREE from 'three';
import { animate } from './anim.js';

function mat(c, r = .55, mt = 0) { return new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt }); }

export function mountChair(av) {
  clearChair(av);
  const g = new THREE.Group(); g.name = 'chair';
  const frame = mat('#2a2e33', .45, .15), seat = mat('#3a3028', .8), wheel = mat('#1a1a1c', .5, .1), tire = mat('#111113', .9), chrome = mat('#c8ccd0', .3, .55);
  const seatM = new THREE.Mesh(new THREE.BoxGeometry(.34, .04, .32), seat); seatM.position.set(0, .5, -.02); g.add(seatM);
  const back = new THREE.Mesh(new THREE.BoxGeometry(.34, .36, .04), seat); back.position.set(0, .68, -.16); back.rotation.x = -.08; g.add(back);
  const pan = new THREE.Mesh(new THREE.BoxGeometry(.3, .03, .16), frame); pan.position.set(0, .28, .12); g.add(pan);
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(.28, .28, .04, 24), tire); w.rotation.z = Math.PI / 2; w.position.set(s * .22, .28, -.04); g.add(w);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, .045, 20), wheel); rim.rotation.z = Math.PI / 2; rim.position.copy(w.position); g.add(rim);
    const hub = new THREE.Mesh(new THREE.SphereGeometry(.03, 10, 8), chrome); hub.position.copy(w.position); g.add(hub);
    const cas = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .04, 14), wheel); cas.rotation.z = Math.PI / 2; cas.position.set(s * .1, .1, .18); g.add(cas);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(.04, .03, .22), frame); arm.position.set(s * .17, .58, 0); g.add(arm);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .28, 8), frame); post.position.set(s * .17, .44, -.14); g.add(post);
  }
  const handles = new THREE.Mesh(new THREE.TorusGeometry(.07, .01, 8, 16, Math.PI), chrome); handles.rotation.x = Math.PI / 2; handles.position.set(0, .86, -.2); g.add(handles);
  g.position.set(0, 0, -0.02);
  av.root.add(g); av._chair = g;
}

export function clearChair(av) {
  if (!av._chair) return;
  try { av.root.remove(av._chair); av._chair.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose) o.material.dispose(); }); } catch (e) { /* ignore */ }
  av._chair = null;
}

export function poseChair(av, t = 0) {
  if (!av || !av._chair) return;
  // Use the shared sit pose (world-axis deltas from rest). Do not write raw bone.rotation — that ignores bind pose and blows the legs out.
  animate(av, t, 0, 'sit');
}
