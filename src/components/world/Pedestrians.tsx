"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { cityWalkers, sample, type Pose, type Walker } from "./people";

declare global {
  interface Window {
    /** Read-only handle for automated QA. */
    __nexusPeople?: { mesh: THREE.InstancedMesh; walkers: Walker[] };
  }
}

/**
 * The people of the city: a few hundred procedural walkers in one instanced
 * mesh. Their routes come from `people.ts`; here each frame the routes are
 * sampled, walkers near the camera are packed into the instance buffer, and
 * the vertex shader swings arms and legs in step with the distance walked.
 */

/** Rig parts, written into each vertex so the shader knows what to swing. */
const PART = { body: 0, head: 1, legL: 2, legR: 3, armL: 4, armR: 5 } as const;
/** Which instance colour a vertex takes. */
const TONE = { skin: 0, top: 1, bottom: 2, dark: 3 } as const;

/** A full walking cycle (two steps), in world units walked. */
const STRIDE = 0.42;
/** People further than this from the camera are not drawn. */
const RANGE = 95;

function piece(g: THREE.BufferGeometry, part: number, tone: number, pivot: [number, number, number]) {
  const n = g.getAttribute("position").count;
  const rig = new Float32Array(n * 4);
  const tones = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    rig.set([pivot[0], pivot[1], pivot[2], part], i * 4);
    tones[i] = tone;
  }
  g.setAttribute("aRig", new THREE.BufferAttribute(rig, 4));
  g.setAttribute("aTone", new THREE.BufferAttribute(tones, 1));
  g.deleteAttribute("uv");
  return g;
}

/** A person about 0.48 units (1.7 m) tall, facing +z, feet at y = 0. */
function personGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    const x = side * 0.027;
    const leg = side < 0 ? PART.legL : PART.legR;
    const hip: [number, number, number] = [x, 0.235, 0];
    parts.push(piece(new THREE.CapsuleGeometry(0.021, 0.2, 2, 6).translate(x, 0.125, 0), leg, TONE.bottom, hip));
    parts.push(piece(new THREE.BoxGeometry(0.036, 0.022, 0.062).translate(x, 0.011, 0.012), leg, TONE.dark, hip));
    const ax = side * 0.066;
    const arm = side < 0 ? PART.armL : PART.armR;
    const shoulder: [number, number, number] = [ax, 0.37, 0];
    parts.push(piece(new THREE.CapsuleGeometry(0.015, 0.12, 2, 5).rotateZ(side * 0.08).translate(ax, 0.295, 0), arm, TONE.top, shoulder));
    parts.push(piece(new THREE.SphereGeometry(0.016, 5, 4).translate(ax + side * 0.006, 0.215, 0), arm, TONE.skin, shoulder));
  }
  parts.push(piece(new THREE.CapsuleGeometry(0.046, 0.1, 2, 8).scale(1.2, 1, 0.68).translate(0, 0.315, 0), PART.body, TONE.top, [0, 0, 0]));
  parts.push(piece(new THREE.CylinderGeometry(0.014, 0.016, 0.03, 6).translate(0, 0.4, 0), PART.head, TONE.skin, [0, 0, 0]));
  parts.push(piece(new THREE.SphereGeometry(0.036, 8, 6).scale(0.92, 1.08, 1).translate(0, 0.44, 0.002), PART.head, TONE.skin, [0, 0, 0]));
  // Hair: a cap over the back and top of the head.
  parts.push(
    piece(new THREE.SphereGeometry(0.038, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.42).scale(0.94, 1.06, 1.02).translate(0, 0.447, -0.004), PART.head, TONE.dark, [0, 0, 0]),
  );
  const merged = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  if (!merged) throw new Error("pedestrians: could not merge the person geometry");
  return merged;
}

const SKIN = ["#3b2219", "#5a3524", "#7a4a31", "#93603f", "#b07a55", "#c98f68", "#e0ab88", "#f0c8a8"];
const TOPS = ["#2b3340", "#4a5462", "#7a828e", "#aeb3bb", "#e4e6ea", "#f2efe6", "#33557a", "#5b86b0", "#8f3a42", "#b5763a", "#3f6b52", "#d2bd8e", "#a04d80", "#e0704a", "#3a92b8", "#e2c14a"];
const BOTTOMS = ["#1c2027", "#2a313c", "#3d4654", "#4d535e", "#2f4566", "#5e4c3a", "#767b84", "#8c7d68", "#c9c2b3"];
const HAIR = ["#0b0806", "#1a120c", "#2a1b10", "#3d2a1a", "#5b4a3a", "#8a8278"];

const SHADER_KEY = "nexus-pedestrians";

function patch(material: THREE.MeshStandardMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
attribute vec4 aRig;
attribute float aTone;
attribute vec2 aGait;
attribute vec3 aSkin;
attribute vec3 aTop;
attribute vec3 aBottom;
attribute vec3 aHair;
varying vec3 vTint;
float pedSwing() {
  float part = aRig.w;
  float s = sin(aGait.x) * aGait.y;
  if (part > 1.5 && part < 2.5) return s;
  if (part > 2.5 && part < 3.5) return -s;
  if (part > 3.5 && part < 4.5) return -s * 0.75;
  if (part > 4.5) return s * 0.75;
  return 0.0;
}
vec3 pedRotX(vec3 p, float a) {
  float c = cos(a), s = sin(a);
  return vec3(p.x, p.y * c - p.z * s, p.y * s + p.z * c);
}`,
      )
      .replace(
        "#include <beginnormal_vertex>",
        /* glsl */ `#include <beginnormal_vertex>
float pedA = pedSwing();
objectNormal = pedRotX(objectNormal, pedA);`,
      )
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `#include <begin_vertex>
transformed = pedRotX(transformed - aRig.xyz, pedA) + aRig.xyz;
// Body rises a little over each step, and leans into the walk.
transformed.y += abs(cos(aGait.x)) * aGait.y * 0.018;
transformed.z += transformed.y * aGait.y * 0.035;
vTint = aTone < 0.5 ? aSkin : aTone < 1.5 ? aTop : aTone < 2.5 ? aBottom : aHair;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vTint;")
      .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb *= vTint;")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += vTint * 0.16;");
  };
  material.customProgramCacheKey = () => SHADER_KEY;
  return material;
}

type Props = {
  count: number;
  reducedMotion: boolean;
  /** 0..1 arrival of the city: nobody is drawn before it appears. */
  level: () => number;
};

export function Pedestrians({ count, reducedMotion, level }: Props) {
  const walkers = useMemo(() => cityWalkers(count), [count]);

  const { mesh, attrs, colours } = useMemo(() => {
    const geometry = personGeometry();
    const n = Math.max(1, walkers.length);
    const make = (size: number) => {
      const a = new THREE.InstancedBufferAttribute(new Float32Array(n * size), size);
      a.setUsage(THREE.DynamicDrawUsage);
      return a;
    };
    const attrs = { aGait: make(2), aSkin: make(3), aTop: make(3), aBottom: make(3), aHair: make(3) };
    for (const [name, a] of Object.entries(attrs)) geometry.setAttribute(name, a);
    const material = patch(new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.82, metalness: 0 }));
    const mesh = new THREE.InstancedMesh(geometry, material, n);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Spread over the whole city: culled per person below instead.
    mesh.frustumCulled = false;
    mesh.count = 0;
    mesh.name = "pedestrians";

    const c = new THREE.Color();
    const rgb = (list: string[], u: number) => c.set(list[Math.floor(u * list.length) % list.length]!).toArray() as [number, number, number];
    const colours = walkers.map((w, i) => {
      const u = (k: number) => (Math.sin((i + 1) * 12.9898 + k * 78.233 + w.look * 43.1) * 43758.5453) % 1;
      const f = (k: number) => Math.abs(u(k));
      return { skin: rgb(SKIN, f(1)), top: rgb(TOPS, f(2)), bottom: rgb(BOTTOMS, f(3)), hair: rgb(HAIR, f(4)) };
    });
    return { mesh, attrs, colours };
  }, [walkers]);

  useEffect(() => {
    window.__nexusPeople = { mesh, walkers };
    return () => {
      delete window.__nexusPeople;
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      mesh.dispose();
    };
  }, [mesh, walkers]);

  const state = useMemo(() => {
    const n = walkers.length;
    return {
      heading: new Float32Array(n),
      amp: new Float32Array(n),
      slot: new Int32Array(n).fill(-1),
      pose: { x: 0, y: 0, z: 0, dist: 0, moving: false, hidden: false, heading: 0 } as Pose,
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      p: new THREE.Vector3(),
      s: new THREE.Vector3(),
      up: new THREE.Vector3(0, 1, 0),
      t: 0,
    };
  }, [walkers]);

  useFrame(({ camera }, dt) => {
    const lv = level();
    mesh.visible = lv > 0.05;
    if (!mesh.visible) return;
    // Reduced motion: everyone stands still where they are.
    if (!reducedMotion) state.t += Math.min(dt, 0.1);
    const { pose, m, q, p, s, up, heading, amp, slot } = state;
    const cx = camera.position.x;
    const cz = camera.position.z;
    const ease = 1 - Math.exp(-Math.min(dt, 0.1) * 6);
    let n = 0;
    let recolour = false;
    for (let i = 0; i < walkers.length; i++) {
      const w = walkers[i]!;
      sample(w.route, state.t + w.offset, pose);
      const near = Math.abs(pose.x - cx) < RANGE && Math.abs(pose.z - cz) < RANGE;
      if (pose.hidden || !near) {
        slot[i] = -1;
        continue;
      }
      if (!Number.isNaN(pose.heading)) {
        // Turn smoothly at corners rather than snapping.
        let d = pose.heading - heading[i]!;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        heading[i] = heading[i]! + d * (reducedMotion ? 1 : Math.min(1, ease * 1.6));
      }
      const goal = pose.moving && !reducedMotion ? 0.42 : 0;
      amp[i] = amp[i]! + (goal - amp[i]!) * ease;
      q.setFromAxisAngle(up, heading[i]!);
      const k = w.height / 0.48;
      s.set(k * (0.94 + w.look * 0.12), k, k);
      p.set(pose.x, pose.y, pose.z);
      m.compose(p, q, s);
      mesh.setMatrixAt(n, m);
      attrs.aGait.setXY(n, (pose.dist / STRIDE) * Math.PI * 2, amp[i]!);
      if (slot[i] !== n) {
        const c = colours[i]!;
        attrs.aSkin.setXYZ(n, ...c.skin);
        attrs.aTop.setXYZ(n, ...c.top);
        attrs.aBottom.setXYZ(n, ...c.bottom);
        attrs.aHair.setXYZ(n, ...c.hair);
        slot[i] = n;
        recolour = true;
      }
      n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    attrs.aGait.needsUpdate = true;
    // Colours are re-uploaded only when someone moved into a different slot.
    if (recolour) attrs.aSkin.needsUpdate = attrs.aTop.needsUpdate = attrs.aBottom.needsUpdate = attrs.aHair.needsUpdate = true;
  });

  return <primitive object={mesh} />;
}
