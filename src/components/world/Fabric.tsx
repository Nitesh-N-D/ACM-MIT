"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { facadeMaterial, facadeMesh } from "./facade";
import { GRID, GROUND_Y } from "./layout";
import { cityPlan, type Box, type Plan } from "./plan";
import { LAMP_POOL_GLSL } from "./streets";

/**
 * The ordinary city: sidewalks and parks, every building of the plan with
 * the architectural facade material, roof plant, masts, street lamps,
 * trees and benches. Everything is instanced, so the whole fabric costs a
 * couple of dozen draw calls however many buildings it holds.
 */

const SIDEWALK = GROUND_Y + GRID.kerb;

/* ------------------------------------------------------------------------- */
/* Paving: slabs on sidewalks, grass in parks, both lit by the street lamps.  */
/* ------------------------------------------------------------------------- */

function pavingMaterial(kind: "paving" | "grass", level: { value: number }) {
  const m = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: kind === "grass" ? 0.95 : 0.82, metalness: 0 });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uLevel = level;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vPW;\nvarying float vUp;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
  vec4 pW = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    pW = instanceMatrix * pW;
  #endif
  vPW = (modelMatrix * pW).xyz;
  vUp = normal.y;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\nuniform float uLevel;\nvarying vec3 vPW;\nvarying float vUp;\n${LAMP_POOL_GLSL}`)
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
  vec2 sp = vPW.xz * ${kind === "grass" ? "3.0" : "1.6"};
  vec2 sc = floor(sp);
  vec2 sf = fract(sp);
  vec2 sw = fwidth(sp);
  float far = smoothstep(0.25, 0.7, max(sw.x, sw.y));
  float h1 = lpHash(sc);
  vec3 surf;
  ${
    kind === "grass"
      ? `surf = mix(vec3(0.03, 0.06, 0.035), vec3(0.05, 0.085, 0.045), h1 * (1.0 - far) + 0.5 * far);`
      : `float joint = 1.0 - smoothstep(0.0, sw.x * 1.5 + 0.02, min(sf.x, 1.0 - sf.x)) * smoothstep(0.0, sw.y * 1.5 + 0.02, min(sf.y, 1.0 - sf.y));
  surf = vec3(0.11, 0.112, 0.118) * (0.86 + 0.24 * h1) * (1.0 - 0.45 * joint * (1.0 - far));`
  }
  // Kerb faces are bright precast concrete.
  surf = mix(vec3(0.3, 0.3, 0.31), surf, step(0.5, vUp));
  diffuseColor.rgb = surf;`,
      )
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * lampPool(vPW.xz) * 0.9 * uLevel;");
  };
  m.customProgramCacheKey = () => `nexus-${kind}`;
  return m;
}

function boxesMesh(list: Box[], material: THREE.Material) {
  const geometry = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, list.length));
  mesh.count = list.length;
  const o = new THREE.Object3D();
  list.forEach((b, i) => {
    o.position.set(b.x, b.y, b.z);
    o.scale.set(b.w, b.h, b.d);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

/* ------------------------------------------------------------------------- */
/* Street furniture                                                           */
/* ------------------------------------------------------------------------- */

type Furniture = { meshes: THREE.Object3D[]; heads: THREE.MeshStandardMaterial; beacons: THREE.MeshBasicMaterial };

function furniture(plan: Plan): Furniture {
  const steel = new THREE.MeshStandardMaterial({ color: "#3a3f47", metalness: 0.8, roughness: 0.42 });
  const heads = new THREE.MeshStandardMaterial({ color: "#20242a", emissive: "#ffd9a0", emissiveIntensity: 0, roughness: 0.5 });
  const bark = new THREE.MeshStandardMaterial({ color: "#2a2018", roughness: 0.95 });
  const leaves = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9, flatShading: true });
  const wood = new THREE.MeshStandardMaterial({ color: "#5a4632", roughness: 0.8 });
  const beacons = new THREE.MeshBasicMaterial({ color: "#ff3a2a", toneMapped: false });

  const poles: Box[] = [];
  const arms: Box[] = [];
  const lampHeads: Box[] = [];
  for (const l of plan.lamps) {
    const y = SIDEWALK;
    poles.push({ x: l.x, y, z: l.z, w: 0.07, h: 1.65, d: 0.07 });
    const sides = l.twin ? [1, -1] : [1];
    for (const s of sides) {
      const dx = Math.sin(l.rot) * s;
      const dz = Math.cos(l.rot) * s;
      arms.push({ x: l.x + dx * 0.22, y: y + 1.6, z: l.z + dz * 0.22, w: Math.abs(dx) * 0.44 + 0.04, h: 0.04, d: Math.abs(dz) * 0.44 + 0.04 });
      lampHeads.push({ x: l.x + dx * 0.46, y: y + 1.56, z: l.z + dz * 0.46, w: Math.abs(dx) * 0.22 + 0.1, h: 0.06, d: Math.abs(dz) * 0.22 + 0.1 });
    }
  }

  const trunks: Box[] = [];
  for (const t of plan.trees) trunks.push({ x: t.x, y: SIDEWALK, z: t.z, w: 0.07 * t.s, h: 0.8 * t.s, d: 0.07 * t.s });
  const canopyGeo = new THREE.IcosahedronGeometry(1, 1);
  const canopy = new THREE.InstancedMesh(canopyGeo, leaves, Math.max(1, plan.trees.length));
  canopy.count = plan.trees.length;
  const o = new THREE.Object3D();
  const c = new THREE.Color();
  plan.trees.forEach((t, i) => {
    o.position.set(t.x, SIDEWALK + 0.8 * t.s + 0.42 * t.s, t.z);
    o.scale.set(0.55 * t.s, 0.62 * t.s, 0.55 * t.s);
    o.rotation.y = t.tone * 6.28;
    o.updateMatrix();
    canopy.setMatrixAt(i, o.matrix);
    canopy.setColorAt(i, c.setRGB(0.07 + t.tone * 0.05, 0.13 + t.tone * 0.07, 0.06 + t.tone * 0.02));
  });
  canopy.instanceMatrix.needsUpdate = true;
  if (canopy.instanceColor) canopy.instanceColor.needsUpdate = true;
  canopy.computeBoundingSphere();

  // Benches: a seat slab on two legs, with a back on the far side.
  const seats: Box[] = [];
  for (const b of plan.benches) {
    const across = Math.abs(Math.sin(b.rot)) > 0.5;
    const w = across ? 0.18 : 0.62;
    const d = across ? 0.62 : 0.18;
    seats.push({ x: b.x, y: SIDEWALK + 0.12, z: b.z, w, h: 0.035, d });
    const bx = Math.sin(b.rot) * 0.08;
    const bz = Math.cos(b.rot) * 0.08;
    seats.push({ x: b.x - bx, y: SIDEWALK + 0.15, z: b.z - bz, w: across ? 0.03 : 0.62, h: 0.13, d: across ? 0.62 : 0.03 });
  }

  // Masts and their obstruction lights.
  const masts: Box[] = plan.masts.map(([x, y, z, h]) => ({ x, y: SIDEWALK + y, z, w: 0.1, h, d: 0.1 }));
  const lights: Box[] = plan.masts.map(([x, y, z, h]) => ({ x, y: SIDEWALK + y + h, z, w: 0.22, h: 0.22, d: 0.22 }));

  const meshes: THREE.Object3D[] = [
    boxesMesh(poles, steel),
    boxesMesh(arms, steel),
    boxesMesh(lampHeads, heads),
    boxesMesh(trunks, bark),
    canopy,
    boxesMesh(seats, wood),
    boxesMesh(masts, steel),
    boxesMesh(lights, beacons),
  ];
  return { meshes, heads, beacons };
}

/* ------------------------------------------------------------------------- */

export type FabricProps = {
  /** 0 bare volumes, 1 cornices and roof plant, 2 full detail. */
  detail: 0 | 1 | 2;
  /** Include the arrival quarter and the far skyline (free exploration only). */
  arrival: boolean;
  /** Reflective glazing: only when the scene has an environment map. */
  environment: boolean;
  /** Share of lights switched on, 0..1, read every frame. */
  level: () => number;
};

export function Fabric({ detail, arrival, environment, level }: FabricProps) {
  const built = useMemo(() => {
    const plan = cityPlan(detail, arrival);
    const facade = facadeMaterial();
    facade.env.value = environment ? 1 : 0;
    const paveLevel = { value: 0 };
    const paving = pavingMaterial("paving", paveLevel);
    const grass = pavingMaterial("grass", paveLevel);
    const metal = new THREE.MeshStandardMaterial({ color: "#5d636c", metalness: 0.75, roughness: 0.45 });

    const group = new THREE.Group();
    group.name = "city-fabric";

    // Sidewalk slabs and parks.
    const paved: Box[] = [];
    const parks: Box[] = [];
    for (const b of plan.blocks) {
      const box = { x: (b.x0 + b.x1) / 2, y: GROUND_Y, z: (b.z0 + b.z1) / 2, w: b.x1 - b.x0, h: GRID.kerb, d: b.z1 - b.z0 };
      if (b.kind === 1) {
        parks.push(box);
        // A paved rim around the lawn.
        paved.push({ ...box, h: GRID.kerb - 0.01 });
      } else paved.push(box);
    }
    const grassBoxes = parks.map((p) => ({ ...p, w: p.w - 2.4, d: p.d - 2.4, h: GRID.kerb + 0.02 }));
    for (const s of plan.strips) {
      const box = { x: (s.x0 + s.x1) / 2, y: GROUND_Y, z: (s.z0 + s.z1) / 2, w: s.x1 - s.x0, h: GRID.kerb, d: s.z1 - s.z0 };
      (s.kind === 2 ? grassBoxes : paved).push(s.kind === 2 ? { ...box, h: GRID.kerb + 0.05 } : box);
    }
    group.add(boxesMesh(paved, paving), boxesMesh(grassBoxes, grass));

    // Buildings: boxes and octagonal towers, then the far skyline.
    group.add(facadeMesh(plan.parts, "box", facade.material, SIDEWALK, false));
    group.add(facadeMesh(plan.parts, "oct", facade.material, SIDEWALK, false));
    if (plan.skyline.length) group.add(facadeMesh(plan.skyline, "box", facade.material, GROUND_Y, false));
    group.add(boxesMesh(plan.equip.map((e) => ({ ...e, y: SIDEWALK + e.y })), metal));

    const furn = furniture(plan);
    group.add(...furn.meshes);

    const materials = [facade.material, paving, grass, metal, furn.heads, furn.beacons];
    return { group, facade, paveLevel, furn, materials };
  }, [detail, arrival, environment]);

  useEffect(
    () => () => {
      built.group.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const m = o.material as THREE.Material | THREE.Material[];
          (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose());
        }
      });
    },
    [built],
  );

  useFrame(({ clock }) => {
    const l = level();
    built.facade.level.value = l;
    built.paveLevel.value = l;
    built.furn.heads.emissiveIntensity = 2.2 * l;
    // Obstruction lights blink together, as real ones do.
    const on = Math.sin(clock.elapsedTime * 2.6) > 0.2 ? 1 : 0.12;
    built.furn.beacons.color.setRGB(1 * on * l + 0.05, 0.23 * on * l + 0.01, 0.16 * on * l + 0.01);
  });

  return <primitive object={built.group} />;
}
