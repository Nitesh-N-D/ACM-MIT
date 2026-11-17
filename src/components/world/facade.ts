import * as THREE from "three";
import type { Part } from "./plan";

/**
 * Architectural facade material.
 *
 * One physically based material draws every ordinary building in NEXUS.
 * Each instance carries a facade family, a seed, a tint, a bay width and a
 * share of lit windows; the fragment shader lays out bays and storeys in
 * real units (one storey = one world unit) and shades frames, spandrels,
 * fins, balconies, shopfronts, parapets and roofs analytically. Because the
 * pattern is computed rather than sampled it stays sharp at any zoom, costs
 * no texture memory, and fades to its mean colour before it can shimmer.
 */

const VERT_PARS = /* glsl */ `
attribute vec4 aStyle; // seed (+2 when the volume stands on the ground), family, lit share, bay width
attribute vec3 aTint;
attribute float aFace; // width of this face in the unit geometry
varying vec4 vFacade;  // walls: xy = bay/storey coordinates, z = bays across, w = storeys. Roofs: xy = plan position
varying vec4 vStyle;   // seed, family, lit share, surface (0 wall, 1 roof, 2 soffit)
varying vec3 vTint;
varying vec3 vRoof;    // xy = plan half extents, z = ground flag
`;

const VERT_MAIN = /* glsl */ `
#ifdef USE_INSTANCING
  vec3 fSc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
#else
  vec3 fSc = vec3(1.0);
#endif
  vec3 fP = position * fSc;
  float fSeed = fract(aStyle.x);
  if (normal.y > 0.5) {
    vFacade = vec4(fP.x, fP.z, 0.0, 0.0);
    vStyle = vec4(fSeed, aStyle.y, aStyle.z, 1.0);
  } else if (normal.y < -0.5) {
    vFacade = vec4(0.0);
    vStyle = vec4(fSeed, aStyle.y, aStyle.z, 2.0);
  } else {
    vec3 fT = normalize(cross(vec3(0.0, 1.0, 0.0), normal));
    float fW = aFace * mix(fSc.x, fSc.z, normal.x * normal.x);
    float fBays = max(1.0, floor(fW / aStyle.w + 0.5));
    vFacade = vec4((dot(fP, fT) / fW + 0.5) * fBays, fP.y, fBays, fSc.y);
    vStyle = vec4(fSeed, aStyle.y, aStyle.z, 0.0);
  }
  vRoof = vec3(fSc.x * 0.5, fSc.z * 0.5, step(1.0, aStyle.x));
  vTint = aTint;
`;

const FRAG_PARS = /* glsl */ `
uniform float uLevel;
uniform float uEnv;
varying vec4 vFacade;
varying vec4 vStyle;
varying vec3 vTint;
varying vec3 vRoof;

float fHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
// Antialiased rectangle mask in cell space.
float fRect(vec2 f, vec2 lo, vec2 hi, vec2 px) {
  vec2 a = smoothstep(lo - px, lo + px, f) * (1.0 - smoothstep(hi - px, hi + px, f));
  return a.x * a.y;
}
`;

const FRAG_MAIN = /* glsl */ `
  vec3 fCol = vTint;
  float fRough = 0.85;
  float fMetal = 0.0;
  vec3 fEmit = vec3(0.0);
  vec2 fJit = vec2(0.0);

  if (vStyle.w > 1.5) {
    fCol = vTint * 0.25;
  } else if (vStyle.w > 0.5) {
    // Roof: dark membrane with a pale coping around the edge.
    float fEdge = min(vRoof.x - abs(vFacade.x), vRoof.y - abs(vFacade.y));
    float fCoping = 1.0 - smoothstep(0.1, 0.16, fEdge);
    float fGrain = fHash(floor(vFacade.xy * 2.0) + vStyle.x * 31.0);
    fCol = mix(vec3(0.05, 0.053, 0.06) * (0.8 + 0.4 * fGrain), vec3(0.3, 0.3, 0.31), fCoping);
    fRough = 0.94;
  } else {
    int fFam = int(vStyle.y + 0.5);
    float fSeed = vStyle.x * 97.0;
    vec2 uv = vFacade.xy;
    vec2 cell = floor(uv);
    vec2 f = uv - cell;
    vec2 fw = fwidth(uv);
    vec2 px = fw * 0.75;
    // 1 where bays are too small on screen to resolve: use the mean instead.
    float fFar = smoothstep(0.32, 0.8, max(fw.x, fw.y));
    bool lobby = vRoof.z > 0.5 && uv.y < 1.0;
    bool office = fFam == 0 || fFam == 2 || fFam == 4;

    vec3 wallCol = vTint;
    float wallRough = 0.86;
    float wallMetal = 0.0;
    // Reflective glazing needs something to reflect; without an environment it is plain dark glass.
    vec3 glassCol = mix(vTint * 0.16 + 0.015, mix(vec3(0.42, 0.5, 0.6), vTint, 0.45) * 0.62, uEnv);
    float glassRough = mix(0.22, 0.07, uEnv);
    float glassMetal = mix(0.25, 0.94, uEnv);
    float win = 0.0;   // glazing mask
    float area = 0.3;  // mean share of glazing, for the far field
    float shade = 1.0; // darkening of the glass by its reveal

    if (fFam == 0) {
      // Curtain wall: glass from slab to slab, opaque spandrel, slim mullions.
      win = fRect(f, vec2(0.04, 0.25), vec2(0.96, 0.975), px);
      float spandrel = fRect(f, vec2(0.04, 0.03), vec2(0.96, 0.22), px);
      wallCol = mix(vec3(0.24, 0.25, 0.27), vTint * 0.28, spandrel);
      wallRough = mix(0.42, 0.2, spandrel);
      wallMetal = mix(0.85, 0.6, spandrel) * mix(0.4, 1.0, uEnv);
      area = 0.66;
    } else if (fFam == 1) {
      // Masonry: punched windows with a stone surround and a deep reveal.
      win = fRect(f, vec2(0.27, 0.22), vec2(0.73, 0.8), px);
      float surround = fRect(f, vec2(0.22, 0.17), vec2(0.78, 0.85), px) - win;
      float course = 1.0 - smoothstep(0.05, 0.07, f.y);
      wallCol = vTint * (0.9 + 0.2 * fHash(cell * 1.3 + fSeed)) * (1.0 + 0.18 * surround) * (1.0 - 0.22 * course);
      wallRough = 0.92;
      shade = 0.3 + 0.7 * smoothstep(0.8, 0.66, f.y) * smoothstep(0.27, 0.34, f.x);
      area = 0.27;
    } else if (fFam == 2) {
      // Metal panels with continuous ribbon windows.
      float ribbon = smoothstep(0.36 - px.y, 0.36 + px.y, f.y) * (1.0 - smoothstep(0.8 - px.y, 0.8 + px.y, f.y));
      float mull = 1.0 - fRect(f, vec2(0.03, -1.0), vec2(0.97, 2.0), px);
      win = ribbon * (1.0 - mull);
      float joint = max(1.0 - smoothstep(0.012, 0.03, min(f.x, 1.0 - f.x)), 1.0 - smoothstep(0.012, 0.03, f.y));
      wallCol = vTint * (0.92 + 0.14 * fHash(cell + fSeed)) * (1.0 - 0.45 * joint * (1.0 - ribbon));
      wallCol = mix(wallCol, vec3(0.06), ribbon * mull);
      wallRough = 0.4;
      wallMetal = mix(0.35, 0.88, uEnv);
      area = 0.4;
    } else if (fFam == 3) {
      // Residential: wide windows, and balconies on some bays.
      win = fRect(f, vec2(0.2, 0.2), vec2(0.8, 0.82), px);
      float balc = step(0.45, fHash(vec2(cell.x * 3.7, fSeed)));
      float slab = (1.0 - smoothstep(0.08, 0.1, f.y)) * balc;
      float rail = fRect(f, vec2(0.06, 0.1), vec2(0.94, 0.42), px) * balc;
      float under = smoothstep(0.86, 0.98, f.y) * balc;
      wallCol = vTint * (0.93 + 0.14 * fHash(cell * 2.1 + fSeed)) * (1.0 - 0.4 * under);
      wallCol = mix(wallCol, vec3(0.5, 0.5, 0.49), slab);
      wallCol = mix(wallCol, vec3(0.16, 0.19, 0.22), rail * 0.72);
      win *= 1.0 - rail * 0.72;
      win *= 1.0 - slab;
      wallRough = mix(0.88, 0.3, rail);
      shade = 0.45 + 0.55 * smoothstep(0.82, 0.7, f.y);
      area = 0.3;
    } else if (fFam == 4) {
      // Glass tower behind deep vertical fins.
      float fin = 1.0 - smoothstep(0.14 - px.x, 0.14 + px.x, f.x);
      float sp = 1.0 - smoothstep(0.1 - px.y, 0.1 + px.y, f.y);
      win = (1.0 - fin) * (1.0 - sp);
      wallCol = mix(vTint * 0.3, vTint * 1.15, fin);
      wallRough = mix(0.3, 0.34, fin);
      wallMetal = mix(0.5, 0.9, uEnv);
      shade = 0.5 + 0.5 * smoothstep(0.14, 0.4, f.x);
      area = 0.74;
    } else {
      // Plain cladding: cornices, crowns and plant floors.
      float joint = 1.0 - smoothstep(0.02, 0.05, min(f.x, 1.0 - f.x));
      wallCol = vTint * (1.0 - 0.25 * joint);
      wallRough = 0.55;
      wallMetal = mix(0.2, 0.55, uEnv);
      area = 0.0;
    }

    // The top of every volume ends in a solid band.
    float band = smoothstep(vFacade.w - 0.34, vFacade.w - 0.3, uv.y);
    if (fFam != 5) {
      win *= 1.0 - band;
      wallCol = mix(wallCol, vTint * 0.8, band * 0.6);
    }

    // Which windows are lit. Offices light in runs of bays, floor by floor.
    vec2 room = office ? vec2(floor(cell.x / 3.0), cell.y) : cell;
    float floorMood = 0.15 + 1.05 * fHash(vec2(cell.y * 1.7, fSeed));
    float lit = step(fHash(room + fSeed), vStyle.z * (office ? floorMood : 1.0));
    float tone = fHash(room * 1.9 + fSeed + 3.1);
    vec3 warm = vec3(1.0, 0.72, 0.4);
    vec3 neutral = vec3(1.0, 0.9, 0.72);
    vec3 cool = vec3(0.74, 0.87, 1.0);
    vec3 lamp = office ? (tone < 0.5 ? cool : tone < 0.9 ? neutral : warm) : (tone < 0.62 ? warm : tone < 0.9 ? neutral : cool);
    float bright = (0.45 + 1.1 * fHash(cell * 2.3 + fSeed + 9.7)) * (0.65 + 0.6 * smoothstep(0.3, 0.9, f.y));
    vec3 meanLamp = office ? vec3(0.87, 0.89, 0.86) : vec3(0.96, 0.78, 0.55);

    if (lobby) {
      // Street level: shopfronts and lobbies under a fascia with the odd sign.
      vec2 shop = vec2(floor(cell.x / 2.0), 0.0);
      win = fRect(f, vec2(0.05, 0.05), vec2(0.95, 0.78), px);
      float fascia = smoothstep(0.8, 0.82, f.y);
      wallCol = mix(wallCol * 0.7, vec3(0.045, 0.047, 0.052), fascia);
      lit = step(fHash(shop + fSeed + 5.5), 0.62);
      lamp = mix(warm, neutral, fHash(shop + fSeed + 1.2));
      bright = 0.95 + 0.5 * f.y;
      shade = 1.0;
      float hasSign = step(0.72, fHash(shop + fSeed + 8.8));
      float sign = fRect(vec2(fract(uv.x / 2.0), f.y), vec2(0.2, 0.85), vec2(0.8, 0.95), vec2(px.x * 0.5, px.y));
      float pickSign = fHash(shop + fSeed + 2.9);
      vec3 signCol = pickSign < 0.4 ? vec3(0.3, 0.85, 1.0) : pickSign < 0.7 ? vec3(1.0, 0.95, 0.85) : pickSign < 0.88 ? vec3(1.0, 0.62, 0.22) : vec3(0.62, 0.48, 1.0);
      fEmit += signCol * sign * hasSign * 1.5 * (1.0 - fFar);
      area = 0.55;
      meanLamp = vec3(1.0, 0.8, 0.55) * 0.62 / max(vStyle.z, 0.05);
    }

    vec3 nearCol = mix(wallCol, glassCol * shade, win);
    float nearRough = mix(wallRough, glassRough, win);
    float nearMetal = mix(wallMetal, glassMetal, win);
    vec3 nearEmit = lamp * bright * lit * win * shade * 0.95;

    fCol = mix(nearCol, mix(vTint * 0.9, glassCol, area), fFar);
    fRough = mix(nearRough, mix(wallRough, glassRough + 0.12, area), fFar);
    fMetal = mix(nearMetal, mix(wallMetal, glassMetal, area), fFar);
    fEmit += mix(nearEmit, meanLamp * vStyle.z * area * 0.62, fFar);
    // Panes of a real curtain wall are never perfectly coplanar.
    fJit = (vec2(fHash(cell + fSeed + 7.7), fHash(cell + fSeed + 4.1)) - 0.5) * win * (1.0 - fFar);
  }
  diffuseColor.rgb = fCol;
`;

export type Facade = { material: THREE.MeshStandardMaterial; level: { value: number }; env: { value: number } };

export function facadeMaterial(): Facade {
  const level = { value: 0 };
  const env = { value: 0 };
  const material = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.8, metalness: 0 });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uLevel = level;
    shader.uniforms.uEnv = env;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${VERT_PARS}`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>\n${VERT_MAIN}`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAG_PARS}`)
      .replace("#include <color_fragment>", `#include <color_fragment>\n${FRAG_MAIN}`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n  roughnessFactor = fRough;")
      .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\n  metalnessFactor = fMetal;")
      .replace("#include <normal_fragment_maps>", "#include <normal_fragment_maps>\n  normal = normalize(normal + vec3(fJit, 0.0) * 0.05);")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n  totalEmissiveRadiance = fEmit * uLevel;");
  };
  material.customProgramCacheKey = () => "nexus-facade";
  return { material, level, env };
}

/** Unit volumes with their base on y = 0. `aFace` is the width of a wall face. */
function unitGeometry(shape: Part["shape"]) {
  let g: THREE.BufferGeometry;
  let face = 1;
  if (shape === "box") {
    g = new THREE.BoxGeometry(1, 1, 1);
  } else {
    // Eight-sided prism measuring one unit across its flats.
    const smooth = new THREE.CylinderGeometry(0.5 / Math.cos(Math.PI / 8), 0.5 / Math.cos(Math.PI / 8), 1, 8, 1).rotateY(Math.PI / 8);
    g = smooth.toNonIndexed();
    smooth.dispose();
    g.computeVertexNormals();
    face = 2 * 0.5 * Math.tan(Math.PI / 8);
  }
  g.translate(0, 0.5, 0);
  g.setAttribute("aFace", new THREE.BufferAttribute(new Float32Array(g.attributes.position!.count).fill(face), 1));
  return g;
}

/**
 * Builds one instanced mesh for all parts of a shape. `baseY` is the level
 * of the sidewalk the buildings stand on.
 */
export function facadeMesh(parts: Part[], shape: Part["shape"], material: THREE.Material, baseY: number, shadows: boolean) {
  const list = parts.filter((p) => p.shape === shape);
  const geometry = unitGeometry(shape);
  const style = new Float32Array(list.length * 4);
  const tint = new Float32Array(list.length * 3);
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, list.length));
  mesh.count = list.length;
  const o = new THREE.Object3D();
  list.forEach((p, i) => {
    o.position.set(p.x, baseY + p.y, p.z);
    o.scale.set(p.w, p.h, p.d);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
    style.set([p.seed * 0.999 + (p.ground ? 2 : 0), p.family, p.lit, p.bay], i * 4);
    tint.set(p.tint, i * 3);
  });
  geometry.setAttribute("aStyle", new THREE.InstancedBufferAttribute(style, 4));
  geometry.setAttribute("aTint", new THREE.InstancedBufferAttribute(tint, 3));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.castShadow = shadows;
  mesh.receiveShadow = shadows;
  return mesh;
}
