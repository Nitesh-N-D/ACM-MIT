"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { Glow } from "./Glow";
import { SENTINEL_HEIGHT, SENTINEL_ORIGIN, SWORD, SWORD_REST, ease, glance, makeSwordPose, nod, swordPose } from "./motion";
import { COLORS, clamp01, sub, useScene } from "./state";

/**
 * The Nexus Sentinel: a gilded knight standing guard before the Gateway, his
 * greatsword planted point-down in the platform's lock with both hands on the
 * hilt. The sword is the key: it charges, he drives it home and turns it, and
 * the Gateway answers.
 *
 * Model: public/models/sentinel.glb, built from the chapter-supplied scan by
 * scripts/build-sentinel.mjs (decimated, auto-skinned to 18 joints; see
 * docs/ASSETS.md). It has no animation clips, so every joint is driven here,
 * and always as an absolute rotation from the bind pose (where every joint
 * frame is the model's own axes), never "current rotation plus a bit":
 *
 *   - Hips, Spine, Chest  → a slow breath
 *   - neck, Head          → the head controller (bowed while dormant, glances, nods)
 *   - Sword               → planted and turned (motion.ts)
 *   - both arms           → two-bone IK onto the hilt
 *   - legs                → bind pose
 */

export const SENTINEL_MODEL = "/models/sentinel.glb";

/** The visor slit, relative to the Head joint (model metres); x and z are refined from the mesh. */
const VISOR = new THREE.Vector3(0, 0.05, 0.12);
/** Half the distance between the two eyes behind the visor (model metres). */
const EYE_SPREAD = 0.028;
/** Seconds between blinks. */
const BLINK_EVERY = 5.3;

/** 1 with the eyes open; a quick close and open every few seconds. */
function blink(t: number) {
  const u = t / BLINK_EVERY - Math.floor(t / BLINK_EVERY);
  return u < 0.035 ? 1 - Math.sin((u / 0.035) * Math.PI) : 1;
}
/** The two hands on the grip: the left one above the right. */
const LEFT_ABOVE = 0.095;
/** How far along the grip (from the grip centre towards the pommel) the right hand sits. */
const RIGHT_ALONG = -0.035;

const BLADE_GLSL_COMMON = /* glsl */ `
uniform float uSwordJoint;
varying float vSword;
varying float vAlong;
`;
/** Distance from the tip along the blade, in the authored (bind) pose. */
const BLADE_GLSL_VERTEX = /* glsl */ `
vSword = dot(vec4(equal(skinIndex, vec4(uSwordJoint))), skinWeight);
vAlong = dot(position - vec3(${SWORD_REST.tip.x.toFixed(4)}, ${SWORD_REST.tip.y.toFixed(4)}, ${SWORD_REST.tip.z.toFixed(4)}),
  normalize(vec3(${(SWORD_REST.pivot.x - SWORD_REST.tip.x).toFixed(4)}, ${(SWORD_REST.pivot.y - SWORD_REST.tip.y).toFixed(4)}, ${(SWORD_REST.pivot.z - SWORD_REST.tip.z).toFixed(4)})));
`;
const BLADE_GLSL_FRAGMENT_COMMON = /* glsl */ `
uniform float uEnergy;
uniform float uFlow;
uniform vec3 uEnergyColor;
varying float vSword;
varying float vAlong;
`;
/** Bands of light running down the blade into the lock; the hilt barely glows. */
const BLADE_GLSL_FRAGMENT = /* glsl */ `
{
  float blade = 1.0 - smoothstep(0.76, 0.82, vAlong);
  float bands = 0.55 + 0.45 * sin(vAlong * 34.0 + uFlow);
  float edge = smoothstep(0.0, 0.08, vAlong);
  totalEmissiveRadiance += uEnergyColor * uEnergy * vSword * (blade * bands * (0.6 + 0.4 * edge) + (1.0 - blade) * 0.12);
}
`;

type Arm = { upper: THREE.Bone; fore: THREE.Bone; hand: THREE.Bone; side: 1 | -1 };

const v = {
  a: new THREE.Vector3(),
  b: new THREE.Vector3(),
  c: new THREE.Vector3(),
  target: new THREE.Vector3(),
  dir: new THREE.Vector3(),
  pole: new THREE.Vector3(),
  elbow: new THREE.Vector3(),
  shoulder: new THREE.Vector3(),
  reach: new THREE.Vector3(),
  from: new THREE.Vector3(),
  to: new THREE.Vector3(),
  scale: new THREE.Vector3(),
  axis: new THREE.Vector3(),
};
const q = {
  delta: new THREE.Quaternion(),
  world: new THREE.Quaternion(),
  parent: new THREE.Quaternion(),
  root: new THREE.Quaternion(),
  rootInv: new THREE.Quaternion(),
  offset: new THREE.Quaternion(),
  hand: new THREE.Quaternion(),
  mirror: new THREE.Quaternion(),
};
const m = {
  world: new THREE.Matrix4(),
  local: new THREE.Matrix4(),
  parentInv: new THREE.Matrix4(),
};
const euler = new THREE.Euler();
const pose = makeSwordPose();

/** Rotates `bone` (in world space) so the direction bone→child points at `goal`. */
function aim(bone: THREE.Bone, child: THREE.Object3D, goal: THREE.Vector3) {
  bone.getWorldPosition(v.a);
  child.getWorldPosition(v.b);
  v.from.copy(v.b).sub(v.a).normalize();
  v.to.copy(goal).sub(v.a).normalize();
  q.delta.setFromUnitVectors(v.from, v.to);
  bone.getWorldQuaternion(q.world);
  bone.parent!.getWorldQuaternion(q.parent);
  bone.quaternion.copy(q.parent.invert()).multiply(q.delta).multiply(q.world);
}

/** Sets a bone's world rotation to root × `model` (a rotation in model space). */
function setModelRotation(bone: THREE.Bone, model: THREE.Quaternion) {
  q.world.copy(q.root).multiply(model);
  bone.parent!.getWorldQuaternion(q.parent);
  bone.quaternion.copy(q.parent.invert()).multiply(q.world);
}

/** Mirror image of a rotation across the model's YZ plane (left ↔ right). */
const mirrorX = (src: THREE.Quaternion, out: THREE.Quaternion) => out.set(src.x, -src.y, -src.z, src.w);

declare global {
  interface Window {
    /** Read-only handle on the Sentinel rig for automated QA. */
    __nexusSentinel?: { root: THREE.Object3D };
  }
}

export function SentinelModel() {
  const { ch, tier } = useScene();
  const reflections = tier.environment;
  const group = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  // How squarely the helm faces the camera (0 side-on or behind, 1 head-on):
  // the eyes are drawn over the helm, so they must only show from the front.
  const facing = useRef(0);
  const welcomeGlow = useRef(0);
  // No Draco / Meshopt decoders: the file is uncompressed, nothing is fetched from a CDN.
  const gltf = useGLTF(SENTINEL_MODEL, false, false);

  const rig = useMemo(() => {
    const root = cloneSkinned(gltf.scene) as THREE.Group;
    // Measure the bind-pose geometry: a skinned mesh's posed bounds are not
    // reliable before its skeleton has been updated.
    const box = new THREE.Box3();
    const materials: THREE.Material[] = [];
    const energy = { uEnergy: { value: 0 }, uFlow: { value: 0 }, uEnergyColor: { value: new THREE.Color(COLORS.cyan) }, uSwordJoint: { value: -1 } };
    root.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh;
      if (!mesh.isMesh) return;
      mesh.geometry.computeBoundingBox();
      if (mesh.geometry.boundingBox) box.union(mesh.geometry.boundingBox);
      // Skinned bounds drift with the pose; the figure is always in view anyway.
      mesh.frustumCulled = false;
      if (mesh.isSkinnedMesh) energy.uSwordJoint.value = mesh.skeleton.bones.findIndex((b) => b.name === "Sword");
      const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
      mat.envMapIntensity = 1.2;
      // Without an environment map (the low tier, i.e. most phones) polished
      // metal has nothing to reflect and renders black: let the lights shape it.
      if (!reflections) {
        mat.metalness = Math.min(mat.metalness, 0.35);
        mat.roughness = Math.max(mat.roughness, 0.55);
      }
      mat.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, energy);
        shader.vertexShader = shader.vertexShader
          .replace("#include <common>", `#include <common>\n${BLADE_GLSL_COMMON}`)
          .replace("#include <begin_vertex>", `#include <begin_vertex>\n${BLADE_GLSL_VERTEX}`);
        shader.fragmentShader = shader.fragmentShader
          .replace("#include <common>", `#include <common>\n${BLADE_GLSL_FRAGMENT_COMMON}`)
          .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\n${BLADE_GLSL_FRAGMENT}`);
      };
      mat.customProgramCacheKey = () => "sentinel-blade";
      mesh.material = mat;
      materials.push(mat);
    });
    const scale = SENTINEL_HEIGHT / Math.max(0.001, box.max.y - box.min.y);
    const bone = (name: string) => root.getObjectByName(name) as THREE.Bone | undefined;

    const arms: Arm[] = [];
    for (const [prefix, side] of [["Left", 1], ["Right", -1]] as const) {
      const upper = bone(`${prefix}Arm`);
      const fore = bone(`${prefix}ForeArm`);
      const hand = bone(`${prefix}Hand`);
      if (upper && fore && hand) arms.push({ upper, fore, hand, side });
    }
    // Every bind rotation is the identity; keep them anyway, should that change.
    const rest = new Map<THREE.Object3D, THREE.Quaternion>();
    root.traverse((o) => {
      if ((o as THREE.Bone).isBone) rest.set(o, o.quaternion.clone());
    });
    // Where the eyes sit: centred on the helm's face plate, measured from the
    // bind-pose vertices that ride on the head (model metres, head-relative).
    const visor = VISOR.clone();
    const headBone = bone("Head");
    root.updateWorldMatrix(true, true);
    root.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh;
      if (!mesh.isSkinnedMesh || !headBone) return;
      const hi = mesh.skeleton.bones.indexOf(headBone);
      if (hi < 0) return;
      mesh.skeleton.update();
      const si = mesh.geometry.attributes.skinIndex;
      const sw = mesh.geometry.attributes.skinWeight;
      if (!si || !sw) return;
      const headAt = headBone.getWorldPosition(new THREE.Vector3());
      const p = new THREE.Vector3();
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i < si.count; i++) {
        let w = 0;
        for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === hi) w += sw.getComponent(i, k);
        if (w < 0.5) continue;
        mesh.getVertexPosition(i, p);
        mesh.applyBoneTransform(i, p);
        pts.push(p.applyMatrix4(mesh.matrixWorld).sub(headAt).clone());
      }
      if (!pts.length) return;
      // The face plate: the front-most few centimetres, below any plume.
      const front = Math.max(...pts.filter((q) => q.y < 0.15).map((q) => q.z));
      const plate = pts.filter((q) => q.y < 0.15 && q.z > front - 0.04);
      if (plate.length < 8) return;
      const xs = plate.map((q) => q.x);
      visor.x = (Math.min(...xs) + Math.max(...xs)) / 2;
      visor.z = front - 0.01;
    });

    // The right hand's authored grip, relative to the sword (model metres).
    const rightWrist = new THREE.Vector3();
    const right = arms.find((a) => a.side === -1);
    root.updateWorldMatrix(true, true);
    if (right) {
      right.hand.getWorldPosition(rightWrist);
      root.worldToLocal(rightWrist).sub(SWORD_REST.pivot);
    }

    return {
      root,
      scale,
      minY: box.min.y,
      materials,
      energy,
      arms,
      rest,
      rightWrist,
      visor,
      hips: bone("Hips"),
      spine: bone("Spine"),
      chest: bone("Chest"),
      head: bone("Head"),
      neck: bone("neck"),
      sword: bone("Sword"),
    };
  }, [gltf, reflections]);

  // Geometry and textures belong to the shared GLTF cache and are left alone;
  // the cloned materials are this component's to release.
  useEffect(() => {
    window.__nexusSentinel = { root: rig.root };
    return () => {
      for (const mat of rig.materials) mat.dispose();
      if (window.__nexusSentinel?.root === rig.root) delete window.__nexusSentinel;
    };
  }, [rig]);

  // A warm key light on the helm: the city and the blade light him in cold
  // cyan from below, which flattens the gold.
  const keyLight = useMemo(() => {
    const l = new THREE.SpotLight("#ffe2c0", 0, 16, 0.42, 0.9, 2);
    l.position.set(1.2, 11.5, 6.2);
    l.target.position.set(0, 6.6, 0.4);
    return l;
  }, []);
  useEffect(() => () => keyLight.dispose(), [keyLight]);

  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    const wake = ease(clamp01(ch.visor));
    keyLight.intensity = 30 * (0.35 + 0.65 * wake);
    const flash = Math.sin(Math.PI * clamp01(ch.pulse));
    rig.energy.uEnergy.value = 0.15 * wake + 1.6 * clamp01(ch.crystal) + 3 * flash;
    rig.energy.uFlow.value = t * (1.5 + 4 * clamp01(ch.crystal));

    for (const [b, r] of rig.rest) b.quaternion.copy(r);
    rig.root.getWorldQuaternion(q.root);
    q.rootInv.copy(q.root).invert();

    // Breath: the chest rises and settles, slower while dormant.
    const breath = Math.sin(t * (0.8 + 0.3 * wake));
    rig.spine?.quaternion.setFromEuler(euler.set(-0.012 * breath, 0, 0));
    rig.chest?.quaternion.setFromEuler(euler.set(-0.016 * breath, 0, 0));

    // Head and neck, held level in the model's own frame so the gaze does not
    // swim with the breath: bowed over the sword while dormant, raised on
    // waking, now and then an unhurried glance aside or a nod of welcome.
    const welcome = nod(t) * wake;
    const pitch = 0.42 * (1 - wake) + 0.04 * wake + 0.06 * welcome + 0.05 * ease(clamp01(ch.lift)) * (1 - clamp01(ch.doors));
    const yaw = glance(t) * 0.08 * wake;
    if (rig.neck) {
      q.offset.setFromEuler(euler.set(pitch * 0.4, yaw * 0.4, 0, "YXZ"));
      setModelRotation(rig.neck, q.offset);
    }
    if (rig.head) {
      q.offset.setFromEuler(euler.set(pitch, yaw, 0, "YXZ"));
      setModelRotation(rig.head, q.offset);
    }
    rig.root.updateWorldMatrix(true, true);

    // The eyes glow through the visor and ride on the head.
    if (rig.head && eyes.current && group.current) {
      rig.head.getWorldPosition(v.a);
      group.current.worldToLocal(v.a);
      eyes.current.position.copy(v.b.copy(rig.visor).multiplyScalar(rig.scale).applyQuaternion(q.offset)).add(v.a);
      eyes.current.quaternion.copy(q.offset);
      eyes.current.updateWorldMatrix(true, false);
      eyes.current.getWorldPosition(v.c);
      v.dir.set(0, 0, 1).applyQuaternion(eyes.current.getWorldQuaternion(q.world));
      const toCamera = v.b.copy(camera.position).sub(v.c).normalize();
      facing.current = THREE.MathUtils.smoothstep(v.dir.dot(toCamera), 0.25, 0.65);
      // The eyes brighten as he nods, like a smile you can only see in them.
      welcomeGlow.current = welcome;
    }

    // The sword: planted, driven home and turned (model space → its joint).
    swordPose(ch, pose);
    if (rig.sword) {
      q.hand.copy(pose.turn).multiply(pose.planted);
      m.world.compose(pose.pivot, q.hand, v.scale.setScalar(SWORD.scale)).premultiply(rig.root.matrixWorld);
      m.parentInv.copy(rig.sword.parent!.matrixWorld).invert();
      m.local.multiplyMatrices(m.parentInv, m.world).decompose(rig.sword.position, rig.sword.quaternion, rig.sword.scale);
      rig.sword.updateWorldMatrix(false, true);
    }

    // Arms: analytic two-bone IK putting both hands on the grip, the right in
    // its authored grip, the left as its mirror image just above it. Solved
    // from the bind pose every frame, so the result depends only on the sword.
    for (const arm of rig.arms) {
      if (arm.side === -1) {
        q.hand.copy(pose.planted);
        v.target.copy(rig.rightWrist).applyQuaternion(pose.planted);
        v.target.y += RIGHT_ALONG;
      } else {
        mirrorX(pose.planted, q.hand);
        v.target.copy(rig.rightWrist).applyQuaternion(pose.planted);
        v.target.set(-v.target.x, v.target.y + RIGHT_ALONG + LEFT_ABOVE, v.target.z);
      }
      // The key turn carries both hands round the blade.
      v.target.applyQuaternion(pose.turn).add(pose.pivot);
      q.hand.premultiply(pose.turn);
      rig.root.localToWorld(v.target);

      arm.upper.getWorldPosition(v.shoulder);
      arm.fore.getWorldPosition(v.b);
      arm.hand.getWorldPosition(v.c);
      const upperLen = v.shoulder.distanceTo(v.b);
      const foreLen = v.b.distanceTo(v.c);
      v.dir.copy(v.target).sub(v.shoulder);
      const d = Math.min(v.dir.length(), (upperLen + foreLen) * 0.995);
      v.dir.normalize();
      const along = (upperLen * upperLen - foreLen * foreLen + d * d) / (2 * d);
      const out = Math.sqrt(Math.max(0, upperLen * upperLen - along * along));
      // Elbows out to the sides and a little down: a guard at rest.
      q.world.copy(q.root);
      v.pole.set(arm.side * 0.9, -0.45, -0.1).applyQuaternion(q.world);
      v.pole.addScaledVector(v.dir, -v.pole.dot(v.dir)).normalize();
      v.elbow.copy(v.shoulder).addScaledVector(v.dir, along).addScaledVector(v.pole, out);
      v.reach.copy(v.shoulder).addScaledVector(v.dir, d);
      aim(arm.upper, arm.fore, v.elbow);
      arm.upper.updateWorldMatrix(false, true);
      aim(arm.fore, arm.hand, v.reach);
      arm.fore.updateWorldMatrix(false, true);
      setModelRotation(arm.hand, q.hand);
    }
  });

  return (
    <group ref={group} position={SENTINEL_ORIGIN}>
      <primitive object={keyLight} />
      <primitive object={keyLight.target} />
      <primitive object={rig.root} scale={rig.scale} position={[0, -rig.minY * rig.scale, 0]} />
      {/* The eyes kindle behind the visor as he wakes, blink now and then,
          and warm a little with each nod of welcome. */}
      <group ref={eyes} position={[0, 7.6, 0.75]}>
        <Glow size={0.75} color={COLORS.cyan} intensity={(t) => sub(ch.visor, 0.2, 1) * (0.2 + 0.04 * Math.sin(t * 3.1))} />
        {[-1, 1].flatMap((side) =>
          // A bright core in a soft halo: two points of light, not one smear.
          ([[0.13, 1], [0.3, 0.45]] as const).map(([size, gain]) => (
            <Glow
              key={`${side}-${size}`}
              position={[side * EYE_SPREAD * rig.scale, 0, 0]}
              size={size}
              color={COLORS.cyan}
              depthTest={false}
              intensity={(t) => gain * sub(ch.visor, 0.2, 1) * facing.current * blink(t) * (0.85 + 0.15 * welcomeGlow.current)}
            />
          )),
        )}
      </group>
    </group>
  );
}
