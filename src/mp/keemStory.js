// v1.9.103: the real Story Keem model online, with colour edits (admin's "Lone Keem").
// Story Keem is ONE sculpted, textured mesh (cap, glasses, beard, varsity jacket, cargo pants and shoes are all part of it),
// so pieces can't be swapped like the regular bases. What CAN change without touching his shape: the colours of the jacket body,
// the sleeves, the pants, the shoes and the cap. Each colour only touches texels of that garment's own colour (black jacket panels,
// cream sleeves, grey pants...) inside that garment's body zone, keeping the stitching, folds and shading of the original texture.
// With no colours set, nothing here runs and he is pixel-for-pixel the Story Mode model.
import * as THREE from 'three';

export const KEEM_SKIN = 'skin.keem_story';
// garment key -> [label, story default colour (sRGB, for the swatch "Original")]
export const STORY_TINTS = [['jacket', 'Jacket', '#16161a'], ['sleeves', 'Sleeves', '#efe6cf'], ['pants', 'Pants', '#a2a6ac'], ['shoes', 'Shoes', '#17171a'], ['cap', 'Cap', '#26272b']];
export const STORY_SWATCHES = ['#16161a', '#efe6cf', '#a2a6ac', '#8a1a22', '#1e3a7a', '#2e5a34', '#5a3a22', '#d8b040', '#7b4fb0', '#e0782a', '#f4c2d4', '#3a3a3e', '#ecebe6', '#4a6a90', '#c0392b', '#0f6b6b'];
const HEX = /^#[0-9a-f]{6}$/i;

/** Clean the colour edits from a look document (only known keys, only #rrggbb). */
export function storyTints(look) {
  const s = look && look.sk; const out = {}; if (!s || typeof s !== 'object') return out;
  for (const [k] of STORY_TINTS) if (typeof s[k] === 'string' && HEX.test(s[k])) out[k] = s[k].toLowerCase();
  return out;
}
export const isStoryLook = (look) => !!(look && look.exclusive === KEEM_SKIN);

// per-vertex garment zones, computed once per (shared) geometry from the bind pose + skin weights
function zones(skin) {
  const g = skin.geometry; if (g.attributes.aLkZ) return;
  const S = skin.skeleton, pos = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, n = pos.count;
  const isArm = S.bones.map(b => /^(Left|Right)(Arm|ForeArm)$/.test(b.name)), isHead = S.bones.map(b => /^(Head|head_end|headfront)$/.test(b.name));
  const Z = new Float32Array(n * 4), C = new Float32Array(n), v = new THREE.Vector3();
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(skin.bindMatrix); const y = v.y;
    let arm = 0, head = 0; for (let k = 0; k < 4; k++) { const b = si.getComponent(i, k), w = sw.getComponent(i, k); if (isArm[b]) arm += w; if (isHead[b]) head += w; }
    const body = ss(.79, .83, y) * (1 - ss(1.3, 1.34, y)) * (1 - head);   // jacket: hips line up to the collar
    Z[i * 4] = body;
    Z[i * 4 + 1] = Math.min(1, arm * 1.4) * (1 - head);                   // sleeves: upper + fore arm
    Z[i * 4 + 2] = ss(.08, .11, y) * (1 - ss(.81, .85, y)) * (1 - Math.min(1, arm * 2)); // pants: ankle to waist (never the sleeve cuffs)
    Z[i * 4 + 3] = 1 - ss(.125, .15, y);                                  // shoes
    const capY = 1.585 + .2 * Math.max(0, v.z - .04); C[i] = head * Math.max(ss(capY - .007, capY + .007, y), (1 - ss(-.14, -.12, v.z)) * ss(1.42, 1.44, y), (1 - ss(-.09, -.07, v.z)) * ss(1.5, 1.515, y)); // crown + the brim (worn backwards, it hangs behind the neck) // cap: the crown sits lower at the back (worn backwards), the fringe at the front stays hair
  }
  g.setAttribute('aLkZ', new THREE.BufferAttribute(Z, 4)); g.setAttribute('aLkC', new THREE.BufferAttribute(C, 1));
}

const lin = (hex) => { const c = new THREE.Color(hex); return new THREE.Vector4(c.r, c.g, c.b, 1); }; // THREE.Color is linear in r152+ colour management
/** Apply (or clear) the colour edits on a Story Keem Char made by makeKeemChar(). Safe to call again with new colours. */
export function applyStoryTints(P, look) {
  const skin = P && P.skin; if (!skin || !skin.material) return false;
  const t = storyTints(look); const any = Object.keys(t).length > 0;
  if (!P._lkOrigMat) P._lkOrigMat = skin.material;
  if (!any) { if (skin.material !== P._lkOrigMat) { const m = skin.material; skin.material = P._lkOrigMat; m.dispose(); } return true; }
  zones(skin);
  let m = skin.material;
  if (m === P._lkOrigMat) {
    const o = P._lkOrigMat; m = o.clone(); // never edit the shared story material (Story Mode and other players use it)
    const U = { uLkT: { value: STORY_TINTS.map(() => new THREE.Vector4(0, 0, 0, 0)) } }; m.userData.lkU = U;
    const prev = o.onBeforeCompile; const key0 = o.customProgramCacheKey ? o.customProgramCacheKey() : '';
    m.onBeforeCompile = (sh, r) => { if (prev) prev.call(o, sh, r); sh.uniforms.uLkT = U.uLkT;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aLkZ; attribute float aLkC; varying vec4 vLkZ; varying float vLkC;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLkZ = aLkZ; vLkC = aLkC;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec4 uLkT[5]; varying vec4 vLkZ; varying float vLkC;\n' +
        'vec3 lkTint(vec3 c, vec4 t, float ref, float k){ float l = dot(c, vec3(.2126,.7152,.0722)); return t.rgb * mix(1.0, clamp(l / ref, .45, 2.2), k); }')
        .replace('#include <map_fragment>', `#include <map_fragment>
 { vec3 c = diffuseColor.rgb; float l = dot(c, vec3(.2126,.7152,.0722)); float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b)); float sat = (mx - mn) / max(mx, 1e-4);
   float grey = 1.0 - smoothstep(.22, .42, sat); float dark = (1.0 - smoothstep(.035, .075, l)) * (1.0 - smoothstep(.35, .6, sat)); float light = smoothstep(.36, .55, l) * (1.0 - smoothstep(.2, .4, sat)); float mid = grey * smoothstep(.07, .14, l) * (1.0 - smoothstep(.66, .8, l));
   float mj = vLkZ.x * dark * uLkT[0].a; float ms = vLkZ.y * light * uLkT[1].a; float mp = vLkZ.z * mid * uLkT[2].a; float mh = vLkZ.w * dark * uLkT[3].a; float capT = (1.0 - smoothstep(.1, .16, l)) * (1.0 - smoothstep(.35, .6, sat)); float mc = vLkC * capT * uLkT[4].a;
   c = mix(c, lkTint(diffuseColor.rgb, uLkT[0], .012, .55), mj); c = mix(c, lkTint(diffuseColor.rgb, uLkT[1], .62, .8), ms); c = mix(c, lkTint(diffuseColor.rgb, uLkT[2], .3, .85), mp);
   c = mix(c, lkTint(diffuseColor.rgb, uLkT[3], .012, .55), mh); c = mix(c, lkTint(diffuseColor.rgb, uLkT[4], .04, .6), mc); diffuseColor.rgb = c; }`)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance = emissive * diffuseColor.rgb;');
    };
    m.customProgramCacheKey = () => key0 + '|lkst'; m.needsUpdate = true; skin.material = m;
  }
  const U = m.userData.lkU; STORY_TINTS.forEach(([k], i) => { const v = U.uLkT.value[i]; if (t[k]) v.copy(lin(t[k])); else v.set(0, 0, 0, 0); });
  return true;
}
