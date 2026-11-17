"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { Glow } from "./Glow";
import { artifactPosition, ease, glance } from "./motion";
import { COLORS, clamp01, sub, useScene } from "./state";

/**
 * The Nexus Sentinel as a rigged, skinned character.
 *
 * Model: public/models/sentinel.glb, supplied by the chapter (see
 * docs/ASSETS.md for provenance and licence notes).
 *
 * Every bone has exactly one owner:
 *
 *   - hips, spine, shoulders and legs  → the idle clip (calmed, see below)
 *   - neck and head                    → the head controller in this file
 *   - upper arms, forearms and hands   → the two-bone IK in this file,
 *                                        solved against the Artifact's own
 *                                        position (see motion.ts)
 *
 * The tracks of the bones owned here are removed from the clip, and the
 * procedural owners write absolute rotations derived from the bind pose, never
 * "current rotation plus a bit". Nothing can therefore accumulate from frame
 * to frame, whether or not the mixer happens to be running.
 */

export const SENTINEL_MODEL = "/models/sentinel.glb";

/** Scene height of the guardian (the model is authored ~1.9 m tall). */
const HEIGHT = 8.4;

/**
 * The hold, in Sentinel-local scene units relative to the Artifact's centre
 * (left-hand side; x mirrors): each palm sits just outside the outer ring and
 * a little below the crystal, fingers forward and slightly up, palm turned
 * inwards and up towards it.
 */
const PALM = new THREE.Vector3(0.76, -0.16, 0);
const FINGERS = new THREE.Vector3(-0.22, 0.3, 0.93).normalize();
const PALM_FACING = new THREE.Vector3(-0.92, 0.38, 0);
/** Wrist joint → centre of the palm. */
const PALM_REACH = 0.26;

/** Bones driven procedurally; their clip tracks are dropped. */
const OWNED = /^(Head|neck|(Left|Right)(Arm|ForeArm|Hand))\./;
/** How much of the clip's motion around its average pose is kept. */
const IDLE_AMOUNT = 0.4;
/** Eyes relative to the head joint, in scene units of the bind pose. */
const EYE_OFFSET = new THREE.Vector3(0, 0.41, 0.43);

type Arm = {
  upper: THREE.Bone;
  fore: THREE.Bone;
  hand: THREE.Bone;
  rest: [THREE.Quaternion, THREE.Quaternion, THREE.Quaternion];
  /** Bind-pose hand rotation relative to the model root. */
  handModel: THREE.Quaternion;
  /** Inverse of the bind-pose (fingers, palm) frame of this hand. */
  gripInv: THREE.Quaternion;
  side: 1 | -1;
};
/** A bone with its bind-pose rotation, locally and relative to the model root. */
type Joint = { bone: THREE.Bone; rest: THREE.Quaternion; model: THREE.Quaternion };

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
  artifact: new THREE.Vector3(),
  fingers: new THREE.Vector3(),
  palm: new THREE.Vector3(),
  cross: new THREE.Vector3(),
};
const basis = new THREE.Matrix4();
const q = {
  delta: new THREE.Quaternion(),
  world: new THREE.Quaternion(),
  parent: new THREE.Quaternion(),
  root: new THREE.Quaternion(),
  rootInv: new THREE.Quaternion(),
  offset: new THREE.Quaternion(),
  level: new THREE.Quaternion(),
};
const euler = new THREE.Euler();

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

/**
 * The model's idle loop, reduced to a calm stance: tracks of the bones owned
 * procedurally are removed, and what remains keeps only a fraction of its
 * movement around the clip's own average pose. The pose is unchanged; the
 * sway becomes breathing.
 */
function calmIdle(source: THREE.AnimationClip) {
  const a = new THREE.Quaternion();
  const b = new THREE.Quaternion();
  const mean = new THREE.Quaternion();
  const tracks: THREE.KeyframeTrack[] = [];
  for (const original of source.tracks) {
    if (OWNED.test(original.name)) continue;
    const track = original.clone();
    const values = track.values;
    if (track.ValueTypeName === "quaternion") {
      const sum = [0, 0, 0, 0];
      for (let i = 0; i < values.length; i += 4) {
        // q and -q are the same rotation: keep every key in one hemisphere.
        const sign = values[i]! * values[0]! + values[i + 1]! * values[1]! + values[i + 2]! * values[2]! + values[i + 3]! * values[3]! < 0 ? -1 : 1;
        for (let k = 0; k < 4; k++) sum[k]! += values[i + k]! * sign;
      }
      mean.set(sum[0]!, sum[1]!, sum[2]!, sum[3]!).normalize();
      for (let i = 0; i < values.length; i += 4) {
        a.fromArray(values, i);
        if (a.dot(mean) < 0) a.set(-a.x, -a.y, -a.z, -a.w);
        // Not a.slerpQuaternions(mean, a, …): that overwrites its own input.
        b.copy(mean).slerp(a, IDLE_AMOUNT).toArray(values, i);
      }
    } else if (track.name.endsWith(".position")) {
      const sum = [0, 0, 0];
      const n = values.length / 3;
      for (let i = 0; i < values.length; i++) sum[i % 3]! += values[i]! / n;
      for (let i = 0; i < values.length; i++) values[i] = sum[i % 3]! + (values[i]! - sum[i % 3]!) * IDLE_AMOUNT;
    }
    tracks.push(track);
  }
  return new THREE.AnimationClip(`${source.name}:calm`, source.duration, tracks);
}

/** Rotation whose x axis is the fingers and whose y axis is the palm's facing. */
function grip(fingers: THREE.Vector3, palm: THREE.Vector3, out: THREE.Quaternion) {
  v.palm.copy(palm).addScaledVector(fingers, -palm.dot(fingers)).normalize();
  v.cross.crossVectors(fingers, v.palm);
  return out.setFromRotationMatrix(basis.makeBasis(fingers, v.palm, v.cross));
}

declare global {
  interface Window {
    /** Read-only handle on the Sentinel rig for automated QA. */
    __nexusSentinel?: { root: THREE.Object3D; mixer: THREE.AnimationMixer };
  }
}

export function SentinelModel() {
  const { ch } = useScene();
  const group = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  // No Draco / Meshopt decoders: the file is uncompressed, nothing is fetched from a CDN.
  const gltf = useGLTF(SENTINEL_MODEL, false, false);

  const rig = useMemo(() => {
    const root = cloneSkinned(gltf.scene) as THREE.Group;
    // Measure the bind-pose geometry: a skinned mesh's posed bounds are not
    // reliable before its skeleton has been updated.
    const box = new THREE.Box3();
    const materials: THREE.Material[] = [];
    root.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh;
      if (!mesh.isMesh) return;
      mesh.geometry.computeBoundingBox();
      if (mesh.geometry.boundingBox) box.union(mesh.geometry.boundingBox);
      // Skinned bounds drift with the pose; the figure is always in view anyway.
      mesh.frustumCulled = false;
      const m = (mesh.material as THREE.MeshStandardMaterial).clone();
      m.envMapIntensity = 1.15;
      mesh.material = m;
      materials.push(m);
    });
    const scale = HEIGHT / Math.max(0.001, box.max.y - box.min.y);
    const bone = (name: string) => root.getObjectByName(name) as THREE.Bone | undefined;

    // Bind-pose references. The clone is still exactly as authored here.
    root.updateWorldMatrix(true, true);
    const rootInv = root.getWorldQuaternion(new THREE.Quaternion()).invert();
    const joint = (b: THREE.Bone | undefined): Joint | undefined =>
      b && { bone: b, rest: b.quaternion.clone(), model: rootInv.clone().multiply(b.getWorldQuaternion(new THREE.Quaternion())) };

    const arms: Arm[] = [];
    for (const [prefix, side] of [["Left", 1], ["Right", -1]] as const) {
      const upper = bone(`${prefix}Arm`);
      const fore = bone(`${prefix}ForeArm`);
      const hand = bone(`${prefix}Hand`);
      if (!upper || !fore || !hand) continue;
      // Bind pose: arms out to the sides, fingers pointing away from the body, palms down.
      const gripInv = grip(new THREE.Vector3(side, 0, 0), new THREE.Vector3(0, -1, 0), new THREE.Quaternion()).invert();
      const handModel = rootInv.clone().multiply(hand.getWorldQuaternion(new THREE.Quaternion()));
      arms.push({ upper, fore, hand, rest: [upper.quaternion.clone(), fore.quaternion.clone(), hand.quaternion.clone()], handModel, gripInv, side });
    }

    const source = gltf.animations.find((c) => /idle/i.test(c.name)) ?? gltf.animations[0];
    return {
      root,
      scale,
      minY: box.min.y,
      materials,
      arms,
      mixer: new THREE.AnimationMixer(root),
      idle: source ? calmIdle(source) : null,
      head: joint(bone("Head")),
      neck: joint(bone("neck")),
    };
  }, [gltf]);

  // The clip is started and stopped by the same effect, so an effect that is
  // torn down and run again (Strict Mode, a hidden then re-shown route) always
  // leaves it playing. Geometry and textures belong to the shared GLTF cache
  // and are left alone; the cloned materials are this component's to release.
  useEffect(() => {
    const action = rig.idle ? rig.mixer.clipAction(rig.idle) : null;
    action?.reset().play();
    window.__nexusSentinel = { root: rig.root, mixer: rig.mixer };
    return () => {
      rig.mixer.stopAllAction();
      rig.mixer.uncacheRoot(rig.root);
      for (const m of rig.materials) m.dispose();
      if (window.__nexusSentinel?.root === rig.root) delete window.__nexusSentinel;
    };
  }, [rig]);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const wake = ease(clamp01(ch.visor));
    const lift = ease(clamp01(ch.lift));

    // Body: the calmed idle, a slow breath; slower still while dormant.
    rig.mixer.update(Math.min(dt, 0.05) * (0.3 + 0.3 * wake));

    // Head and neck. The head is held level in the model's own frame, like a
    // person's: the torso may breathe underneath it, the gaze does not swim.
    // On top of that: bowed while dormant, raised on waking, and now and then
    // an unhurried glance to one side.
    const pitch = 0.4 * (1 - wake) + 0.04 * wake - 0.07 * lift;
    const yaw = glance(t) * 0.07 * wake;
    rig.root.getWorldQuaternion(q.root);
    q.rootInv.copy(q.root).invert();
    if (rig.neck) {
      const { bone, rest, model } = rig.neck;
      bone.parent!.getWorldQuaternion(q.parent);
      // Halfway between following the chest and staying level.
      q.world.copy(q.parent).multiply(rest);
      q.level.copy(q.root).multiply(model);
      q.world.slerp(q.level, 0.5);
      q.offset.setFromEuler(euler.set(pitch * 0.4, yaw * 0.4, 0, "YXZ"));
      q.world.premultiply(q.delta.copy(q.root).multiply(q.offset).multiply(q.rootInv));
      bone.quaternion.copy(q.parent.invert()).multiply(q.world);
    }
    if (rig.head) {
      const { bone, model } = rig.head;
      q.offset.setFromEuler(euler.set(pitch, yaw, 0, "YXZ"));
      q.world.copy(q.root).multiply(q.offset).multiply(model);
      bone.parent!.getWorldQuaternion(q.parent);
      bone.quaternion.copy(q.parent.invert()).multiply(q.world);

      // The eye glow rides on the head instead of hanging in the air.
      if (eyes.current && group.current) {
        bone.getWorldPosition(v.a);
        group.current.worldToLocal(v.a);
        eyes.current.position.copy(v.b.copy(EYE_OFFSET).applyQuaternion(q.offset)).add(v.a);
      }
    }

    // Arms: analytic two-bone IK that puts each palm beside the Artifact,
    // wherever the Artifact is this frame. Solved from the bind pose every
    // time, so the result depends only on the target.
    if (!group.current) return;
    artifactPosition(ch, t, v.artifact);
    group.current.worldToLocal(v.artifact);
    for (const arm of rig.arms) {
      arm.upper.quaternion.copy(arm.rest[0]);
      arm.fore.quaternion.copy(arm.rest[1]);
      arm.hand.quaternion.copy(arm.rest[2]);

      v.fingers.set(FINGERS.x * arm.side, FINGERS.y, FINGERS.z);
      v.target.set(PALM.x * arm.side, PALM.y, PALM.z).add(v.artifact).addScaledVector(v.fingers, -PALM_REACH);
      group.current.localToWorld(v.target);

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

      // Hand: fingers and palm set outright, relative to the model.
      grip(v.fingers, v.to.set(PALM_FACING.x * arm.side, PALM_FACING.y, PALM_FACING.z), q.offset).multiply(arm.gripInv);
      q.world.copy(q.root).multiply(q.offset).multiply(arm.handModel);
      arm.hand.parent!.getWorldQuaternion(q.parent);
      arm.hand.quaternion.copy(q.parent.invert()).multiply(q.world);
    }
  });

  return (
    <group ref={group} position={[0, 0.3, -2.2]}>
      <primitive object={rig.root} scale={rig.scale} position={[0, -rig.minY * rig.scale, 0]} />
      {/* Energy response: eyes and chest answer the artifact. */}
      <group ref={eyes} position={[0, 7.72, 0.62]}>
        <Glow size={1.5} color={COLORS.cyan} intensity={(t) => sub(ch.visor, 0.2, 1) * (0.34 + 0.08 * Math.sin(t * 3.1))} />
      </group>
      <Glow position={[0, 5.9, 0.95]} size={2.6} color={COLORS.cyan} intensity={() => clamp01(ch.crystal * 0.3 + Math.sin(Math.PI * ch.pulse) * 0.35)} />
    </group>
  );
}
