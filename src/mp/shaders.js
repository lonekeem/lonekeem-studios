// Multiplayer character shaders (original, © Lone Keem Studios). Everything is analytic: skin tone, face painting, garment cuts/patterns and
// hair/beard shells are computed from the bind-pose position, so one body mesh can be re-dressed without any new textures.
import * as THREE from 'three';

export const GLSL_COMMON = /* glsl */`
varying vec3 vRest; varying vec3 vRestN; varying vec4 vR;
float h11(float n){ return fract(sin(n*127.1)*43758.5453); }
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float h31(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
float vn(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z); }
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0); return length(pa-ba*h); }
`;

// vertex hook shared by every character material: exposes the bind-pose position / normal / region data and applies a shell offset.
export function hookVertex(sh, extraVertex = '') {
  sh.uniforms.uOff = sh.uniforms.uOff || { value: 0 };
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nattribute vec4 aR; attribute vec3 aP0;\nuniform float uOff;\n' + GLSL_COMMON)
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = aP0; vRestN = normal; vR = aR; transformed += normalize(normal) * uOff;\n' + extraVertex);
}

export function skinTone(t, under = 0) { // t 0..1 light -> deep (sRGB stops), under -1 cool/rosy .. +1 warm/golden
  const S = ['#f7dcc9', '#f0c8a8', '#e2ad86', '#cf9468', '#b3774f', '#8f5a38', '#6d4128', '#4d2b1a', '#33190f'].map(h => new THREE.Color(h));
  const x = Math.min(0.9999, Math.max(0, t)) * (S.length - 1), i = Math.floor(x), f = x - i; const c = S[i].clone().lerp(S[i + 1], f);
  const hsl = {}; c.getHSL(hsl); c.setHSL(hsl.h + under * 0.012, Math.min(1, hsl.s * (1 + under * 0.12)), hsl.l); return c;
}
