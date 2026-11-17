import * as THREE from "three";
import { clamp01, type Channels } from "./state";

/**
 * Motion shared between the Sentinel, his sword and the platform.
 *
 * The sword is planted point-down in a socket in the platform, like a key in
 * a lock. Where it stands is computed in exactly one place, and the blade, the
 * hands resting on its hilt, the socket and the light column all read it from
 * here, so they cannot drift apart.
 */

export const ease = (x: number) => x * x * (3 - 2 * x);

/** The Sentinel's feet, in world space. */
export const SENTINEL_ORIGIN = new THREE.Vector3(0, 0.3, -2.2);
/** Scene height of the guardian. */
export const SENTINEL_HEIGHT = 8.4;
/** Model metres → scene units (public/models/sentinel.glb is 1.901 m tall). */
export const SENTINEL_K = SENTINEL_HEIGHT / 1.901;

/**
 * The sword as authored in public/models/sentinel.glb (model metres, feet on
 * the origin): its grip centre (the Sword joint), its tip and its pommel.
 */
export const SWORD_REST = {
  // Measured from the rebuilt model: the Sword joint sits on the blade's axis.
  pivot: new THREE.Vector3(-0.311, 0.882, 0.063),
  tip: new THREE.Vector3(-0.636, 0.009, 0.225),
  pommel: new THREE.Vector3(-0.239, 1.074, 0.027),
};

/**
 * The centre of the Resonance Platform's raised dais (world space): the heart
 * of its rings, and the lock the sword is struck into.
 */
export const PLATFORM_CENTER = new THREE.Vector3(0, 0.3, -0.6);

/**
 * The sword, in model metres relative to his feet: a greatsword (scaled up
 * from the model's arming sword) held point-down on the centre line in front
 * of him. He holds it, raises it, and on the visitor's word drives it into
 * the lock at the platform's centre.
 */
export const SWORD = {
  /** Forward of his feet: exactly over the platform's centre. */
  z: (PLATFORM_CENTER.z - SENTINEL_ORIGIN.z) / SENTINEL_K,
  /** Tip height when struck home: just inside the socket. */
  tipY: -0.05,
  /** Tip height while he holds it, before the strike. */
  heldY: 0.2,
  /** Tip height raised, ready to strike. */
  raisedY: 0.4,
  scale: 1.35,
  /** How far it is driven home when he turns it. */
  sink: 0.05,
  /** And how far it turns, like a key (radians). */
  turn: 0.5,
};

const DOWN = new THREE.Vector3(0, -1, 0);
const UP = new THREE.Vector3(0, 1, 0);
const AXIS_REST = SWORD_REST.tip.clone().sub(SWORD_REST.pivot).normalize();
/** The model holds the sword with its crossguard fore and aft; planted, it runs across him. */
const FACE_FRONT = new THREE.Quaternion().setFromAxisAngle(UP, Math.PI / 2);
const scratch = new THREE.Vector3();

/** How far the sword has been driven home: 0 at rest, 1 turned. */
export const turned = (ch: Channels) => ease(clamp01(ch.lift));

export type SwordPose = {
  /** Rotation from the authored pose, before the key turn. */
  planted: THREE.Quaternion;
  /** The key turn: a rotation about the (vertical) blade. */
  turn: THREE.Quaternion;
  /** Grip centre (the Sword joint) and tip, in model metres. */
  pivot: THREE.Vector3;
  tip: THREE.Vector3;
};

export const makeSwordPose = (): SwordPose => ({
  planted: new THREE.Quaternion().setFromUnitVectors(AXIS_REST, DOWN).premultiply(FACE_FRONT),
  turn: new THREE.Quaternion(),
  pivot: new THREE.Vector3(),
  tip: new THREE.Vector3(),
});

/**
 * How far the tip is above its struck-home rest, in model metres: held, then
 * raised, then driven down by the strike (which may dip below 0 first: the
 * director eases it with a wind-up), then sunk a little as the key turns.
 */
export function swordLift(ch: Channels) {
  const held = SWORD.heldY + (SWORD.raisedY - SWORD.heldY) * ease(clamp01(ch.raise));
  const s = Math.min(1, ch.strike);
  return (held - SWORD.tipY) * (1 - s) - SWORD.sink * turned(ch);
}

/** Sword pose this frame, in model space. */
export function swordPose(ch: Channels, out: SwordPose) {
  const k = turned(ch);
  out.turn.setFromAxisAngle(UP, -SWORD.turn * k);
  out.tip.set(0, SWORD.tipY + swordLift(ch), SWORD.z);
  // The blade is vertical, so the turn does not move the grip.
  out.pivot.copy(out.tip).add(scratch.set(0, SWORD_REST.tip.distanceTo(SWORD_REST.pivot) * SWORD.scale, 0));
  return out;
}

/** Model space → world space (the Sentinel faces +Z and is not rotated). */
export const modelToWorld = (v: THREE.Vector3) => v.multiplyScalar(SENTINEL_K).add(SENTINEL_ORIGIN);

/** World-space point where the blade meets the socket (struck home). */
export const SWORD_SOCKET = modelToWorld(new THREE.Vector3(0, SWORD.tipY, SWORD.z));
/** World-space centre of the hilt (struck home), where the hands are. */
export const SWORD_HILT = modelToWorld(
  new THREE.Vector3(0, SWORD.tipY + SWORD_REST.tip.distanceTo(SWORD_REST.pivot) * SWORD.scale, SWORD.z),
);

/** Seconds between the Sentinel's occasional glances. */
const GLANCE_EVERY = 13;

/** 0 almost all of the time; eases to ±1 and back for an unhurried glance. */
export function glance(t: number) {
  const n = Math.floor(t / GLANCE_EVERY);
  const u = t / GLANCE_EVERY - n;
  const held = ease(clamp01(u / 0.1)) * (1 - ease(clamp01((u - 0.3) / 0.12)));
  return held * (n % 2 === 0 ? 1 : -1);
}

/** Seconds between the Sentinel's nods, out of step with the glances. */
const NOD_EVERY = 9.5;

/** 0 most of the time; a single soft dip and return, like a nod of welcome. */
export function nod(t: number) {
  const u = (t + 4) / NOD_EVERY - Math.floor((t + 4) / NOD_EVERY);
  return u < 0.16 ? Math.sin((u / 0.16) * Math.PI) ** 2 : 0;
}
