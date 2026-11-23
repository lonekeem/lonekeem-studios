// Sculpted v2 heads for Story Keem, Nia and Dad (primitive sphere-stack faces stay for everyone else).
import * as THREE from 'three';
import { headParams, makeSDF, landmarks, buildHeadGeometry, buildEarGeometry } from '../mp/v2/head.js';
import { faceOpts, skinMaterial, buildMouthGeos } from '../mp/v2/headrig.js';
import { paintFace } from '../mp/v2/facepaint.js';
import { skinToT } from '../mp/storeLook.js';
import { skinTone } from '../mp/shaders.js';
const H = { x: 0, y: 1.588, z: -0.022, rx: .078, ry: .096, rz: .088 };

function storyMpLook(L, g) {
  const smile = L.rig === 'keem' ? 3 : (L.rig === 'nia' ? 1 : 0); // Smile / Full / Neutral if catalog stays in this order
  return {
    base: g === 'f' ? 'mp_f1' : 'mp_m1',
    skin: { t: skinToT(L.skin || '#6a4430'), u: 0.12 },
    eyes: { s: 0, col: L.eyes || '#2a1608', size: Math.max(0, ((L.eyeK || 1) - 1) * 1.15), lash: g === 'f' ? 0.65 : 0.15 },
    brows: { s: 0, col: L.hairColor || '#0b0806' },
    mouth: { s: smile },
    makeup: {},
    hair: { c: L.hairColor || '#0b0806' },
    nose: { s: 0 },
    morph: {},
    beard: null,
  };
}

export function attachStoryV2Head(c, L, sk, sm) {
  const g = L.rig === 'nia' ? 'f' : 'm';
  const Hprm = headParams(g, {});
  const sdf = makeSDF(Hprm);
  const Lm = landmarks(Hprm, sdf);
  const s = (H.ry / Hprm.Ht) * 1.02;
  const look = storyMpLook(L, g);
  const fo = faceOpts(look, g, Lm, Hprm);
  const tex = paintFace(fo);
  const skc = skinTone(look.skin.t, look.skin.u);
  const U = { uSkin: { value: skc } };
  const mat = skinMaterial(U, tex);

  const toBone = (geo) => {
    geo.scale(s, s, s);
    geo.translate(H.x, H.y, H.z);
    const i = sk.bones.findIndex(b => b.name.replace(/[.]/g, '') === 'DEF-head'.replace(/[.]/g, '') || b.name === 'DEF-head' || b.name === 'DEF.head');
    if (i >= 0) geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(sk.boneInverses[i], sm.bindMatrix));
    return i;
  };

  const geo = buildHeadGeometry(Hprm, sdf);
  const p = geo.attributes.position, n = p.count, aF = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const z = p.getZ(i), y = p.getY(i);
    aF[i] = Math.min(1, Math.max(0, (z - .02) / .04)) * Math.min(1, Math.max(0, (y + .17) / .03));
  }
  geo.setAttribute('aF', new THREE.BufferAttribute(aF, 1));
  geo.setAttribute('aL', geo.attributes.position.clone());
  const iHead = toBone(geo);
  const bone = iHead >= 0 ? sk.bones[iHead] : c.model;
  const head = new THREE.Mesh(geo, mat);
  head.castShadow = true; head.frustumCulled = false; bone.add(head); c.parts.push(head);

  const earMat = skinMaterial(U, null);
  for (const sd of [1, -1]) {
    const e = buildEarGeometry(sd, Lm, Hprm);
    toBone(e);
    const m = new THREE.Mesh(e, earMat);
    m.castShadow = true; m.frustumCulled = false; bone.add(m); c.parts.push(m);
  }

  if (buildMouthGeos) {
    const lips = buildMouthGeos(Lm, Hprm, look, g);
    const lipM = new THREE.MeshStandardMaterial({ color: fo.lipCol, roughness: 0.44, metalness: 0 });
    const tthM = new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.28, metalness: 0 });
    const parts = [[lips.upper, lipM], [lips.lower, lipM]];
    if (lips.teeth) parts.push([lips.teeth, tthM]);
    for (const [geoL, m] of parts) {
      toBone(geoL);
      const mesh = new THREE.Mesh(geoL, m);
      mesh.castShadow = true; mesh.frustumCulled = false; bone.add(mesh); c.parts.push(mesh);
    }
  }
}
