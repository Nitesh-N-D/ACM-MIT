import * as THREE from "three";
import { clamp01, type Channels } from "./state";

/**
 * Motion shared between the Sentinel and the Artifact.
 *
 * The Artifact is held, not parked nearby: its position is computed in exactly
 * one place and both the crystal and the hands that carry it read it from
 * here, so they cannot drift apart.
 */

export const ease = (x: number) => x * x * (3 - 2 * x);

/**
 * World-space rest position of the Artifact: level with the Sentinel's
 * sternum, far enough forward for the rings to clear the chest plate, and
 * within reach of both arms.
 */
export const ARTIFACT_POS = new THREE.Vector3(0, 6.15, -0.49);
/** How far it travels when the Sentinel raises it. */
export const ARTIFACT_RISE = new THREE.Vector3(0, 0.6, 0.09);
/** Overall size of the Artifact: its outer ring fits between the palms. */
export const ARTIFACT_SCALE = 0.4;

/** Where the Artifact is this frame (world space). */
export function artifactPosition(ch: Channels, t: number, out: THREE.Vector3) {
  const lift = clamp01(ch.lift);
  return out.set(
    ARTIFACT_POS.x + lift * ARTIFACT_RISE.x,
    ARTIFACT_POS.y + lift * ARTIFACT_RISE.y + Math.sin(t * 1.3) * 0.035 * ch.crystal,
    ARTIFACT_POS.z + lift * ARTIFACT_RISE.z,
  );
}

/** Seconds between the Sentinel's occasional glances. */
const GLANCE_EVERY = 13;

/** 0 almost all of the time; eases to ±1 and back for an unhurried glance. */
export function glance(t: number) {
  const n = Math.floor(t / GLANCE_EVERY);
  const u = t / GLANCE_EVERY - n;
  const held = ease(clamp01(u / 0.1)) * (1 - ease(clamp01((u - 0.3) / 0.12)));
  return held * (n % 2 === 0 ? 1 : -1);
}
