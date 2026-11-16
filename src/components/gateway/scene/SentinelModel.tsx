"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { Glow } from "./Glow";
import { COLORS, clamp01, sub, useScene } from "./state";

/**
 * The Nexus Sentinel as a rigged, skinned character.
 *
 * Model: public/models/sentinel.glb, supplied by the chapter (see
 * docs/ASSETS.md for provenance and licence notes). The file's own idle clip
 * drives the body; on top of it the head is bowed while dormant and raised
 * on waking, and both arms are solved with two-bone IK so the hands cradle
 * the Nexus Artifact and lift it during activation.
 */

export const SENTINEL_MODEL = "/models/sentinel.glb";

/** Scene height of the guardian (the model is authored ~1.9 m tall). */
const HEIGHT = 8.4;

/** Hand targets in Sentinel-local scene units (right-hand side; x mirrors). */
const HAND_REST = new THREE.Vector3(0.78, 4.55, 1.2);
const HAND_LIFT = new THREE.Vector3(0.82, 5.15, 1.32);

const ease = (x: number) => x * x * (3 - 2 * x);

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
};
const q = { delta: new THREE.Quaternion(), world: new THREE.Quaternion(), parent: new THREE.Quaternion(), tmp: new THREE.Quaternion() };
const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);

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
  bone.updateWorldMatrix(false, true);
}

/** Applies a world-space rotation on top of whatever the clip set. */
function nudge(bone: THREE.Object3D, axis: THREE.Vector3, angle: number) {
  if (Math.abs(angle) < 1e-4) return;
  q.delta.setFromAxisAngle(axis, angle);
  bone.getWorldQuaternion(q.world);
  bone.parent!.getWorldQuaternion(q.parent);
  bone.quaternion.copy(q.parent.invert()).multiply(q.delta).multiply(q.world);
}

export function SentinelModel() {
  const { ch } = useScene();
  // No Draco / Meshopt decoders: the file is uncompressed, nothing is fetched from a CDN.
  const gltf = useGLTF(SENTINEL_MODEL, false, false);

  const rig = useMemo(() => {
    const root = cloneSkinned(gltf.scene) as THREE.Group;
    // Measure the bind-pose geometry: a skinned mesh's posed bounds are not
    // reliable before its skeleton has been updated.
    const box = new THREE.Box3();
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.computeBoundingBox();
      if (mesh.geometry.boundingBox) box.union(mesh.geometry.boundingBox);
    });
    const scale = HEIGHT / Math.max(0.001, box.max.y - box.min.y);
    const bone = (name: string) => root.getObjectByName(name) as THREE.Bone | undefined;

    root.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh;
      if (!mesh.isMesh) return;
      // Skinned bounds drift with the pose; the figure is always in view anyway.
      mesh.frustumCulled = false;
      const m = (mesh.material as THREE.MeshStandardMaterial).clone();
      m.envMapIntensity = 1.15;
      mesh.material = m;
    });

    const arms: Arm[] = [];
    for (const [prefix, side] of [["Left", 1], ["Right", -1]] as const) {
      const upper = bone(`${prefix}Arm`);
      const fore = bone(`${prefix}ForeArm`);
      const hand = bone(`${prefix}Hand`);
      if (upper && fore && hand) arms.push({ upper, fore, hand, side });
    }

    const mixer = new THREE.AnimationMixer(root);
    const idle = gltf.animations.find((c) => /idle/i.test(c.name)) ?? gltf.animations[0];
    if (idle) mixer.clipAction(idle).play();

    return { root, scale, minY: box.min.y, arms, mixer, head: bone("Head"), neck: bone("neck"), chest: bone("Spine") };
  }, [gltf]);

  useEffect(() => () => void rig.mixer.stopAllAction(), [rig]);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const wake = ease(clamp01(ch.visor));
    const lift = ease(clamp01(ch.lift));

    // The clip breathes and shifts weight; slower while dormant.
    rig.mixer.update(Math.min(dt, 0.05) * (0.45 + 0.55 * wake));
    rig.root.updateWorldMatrix(true, true);

    // Head: bowed while dormant, raised on waking, a little higher on the lift.
    const bow = 0.42 * (1 - wake) - 0.1 * lift;
    if (rig.neck) nudge(rig.neck, X_AXIS, bow * 0.45);
    if (rig.head) {
      nudge(rig.head, X_AXIS, bow * 0.55);
      nudge(rig.head, Y_AXIS, Math.sin(t * 0.31) * 0.05 * wake);
    }
    rig.root.updateWorldMatrix(false, true);

    // Arms: analytic two-bone IK to the cradle points under the artifact.
    for (const arm of rig.arms) {
      v.target.lerpVectors(HAND_REST, HAND_LIFT, lift);
      v.target.x *= arm.side;
      v.target.y += Math.sin(t * 1.3) * 0.03 * ch.crystal;
      rig.root.parent!.localToWorld(v.target);

      arm.upper.getWorldPosition(v.shoulder);
      arm.fore.getWorldPosition(v.b);
      arm.hand.getWorldPosition(v.c);
      const upperLen = v.shoulder.distanceTo(v.b);
      const foreLen = v.b.distanceTo(v.c);
      v.dir.copy(v.target).sub(v.shoulder);
      const d = Math.min(v.dir.length(), (upperLen + foreLen) * 0.985);
      v.dir.normalize();
      const along = (upperLen * upperLen - foreLen * foreLen + d * d) / (2 * d);
      const out = Math.sqrt(Math.max(0, upperLen * upperLen - along * along));
      // Elbows swing outwards, down and slightly back.
      v.pole.set(arm.side * 0.8, -0.6, -0.35);
      v.pole.addScaledVector(v.dir, -v.pole.dot(v.dir)).normalize();
      v.elbow.copy(v.shoulder).addScaledVector(v.dir, along).addScaledVector(v.pole, out);
      v.reach.copy(v.shoulder).addScaledVector(v.dir, d);
      aim(arm.upper, arm.fore, v.elbow);
      aim(arm.fore, arm.hand, v.reach);
    }
  });

  return (
    <group position={[0, 0.3, -2.2]}>
      <primitive object={rig.root} scale={rig.scale} position={[0, -rig.minY * rig.scale, 0]} />
      {/* Energy response: eyes and chest answer the artifact. */}
      <Glow position={[0, 7.72, 0.62]} size={1.5} color={COLORS.cyan} intensity={(t) => sub(ch.visor, 0.2, 1) * (0.34 + 0.08 * Math.sin(t * 3.1))} />
      <Glow position={[0, 5.9, 0.95]} size={2.6} color={COLORS.cyan} intensity={() => clamp01(ch.crystal * 0.3 + Math.sin(Math.PI * ch.pulse) * 0.35)} />
    </group>
  );
}
