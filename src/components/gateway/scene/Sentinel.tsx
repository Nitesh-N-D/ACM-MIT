"use client";

import { useFrame } from "@react-three/fiber";
import { Component, Suspense, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { Glow } from "./Glow";
import { SentinelModel } from "./SentinelModel";
import { irisTexture } from "./textures";
import { SENTINEL_K, SENTINEL_ORIGIN, SWORD_HILT, ease, glance, swordLift } from "./motion";
import { ProceduralSword } from "./SwordKey";
import { COLORS, clamp01, sub, useScene } from "./state";

/**
 * The Nexus Sentinel.
 *
 * `Sentinel` renders the chapter's knight (SentinelModel) on every tier,
 * phones included. `ProceduralSentinel` below is the FALLBACK figure,
 * assembled from primitives: it is shown while the model file loads, if the
 * model fails to load, and to visitors who have asked their browser to save
 * data (the model is a ~6 MB download). It is not a sculpted character.
 * See docs/ASSETS.md.
 */

type V3 = [number, number, number];
const UP = new THREE.Vector3(0, 1, 0);
const sides = [-1, 1] as const;

/** Where the figure stands; the same origin as the rigged model. */
const ORIGIN = SENTINEL_ORIGIN;
/** Each hand relative to the hilt of the planted sword (right-hand side; x mirrors). */
const HAND_HOLD = new THREE.Vector3(0.08, 0, 0.14);
const SHOULDER = new THREE.Vector3(1.78, 6.28, 0);
const UPPER_LEN = 1.55;
const FORE_LEN = 1.5;


function Part({ g, p, r, s, m }: { g: THREE.BufferGeometry; p?: V3; r?: V3; s?: V3; m: THREE.Material }) {
  return <mesh geometry={g} position={p} rotation={r} scale={s} material={m} />;
}

/** Places a unit-height mesh so that it spans a → b. */
function span(mesh: THREE.Object3D | null, a: THREE.Vector3, b: THREE.Vector3, tmp: THREE.Vector3) {
  if (!mesh) return;
  tmp.copy(b).sub(a);
  const len = tmp.length();
  mesh.position.copy(a).addScaledVector(tmp, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, tmp.multiplyScalar(1 / len));
  mesh.scale.set(1, len, 1);
}

class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** The visitor has asked the browser to keep downloads small. */
function savingData() {
  if (typeof navigator === "undefined") return false;
  return Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
}

export function Sentinel() {
  const fallback = <ProceduralSentinel />;
  if (savingData()) return fallback;
  return (
    <ModelBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <SentinelModel />
      </Suspense>
    </ModelBoundary>
  );
}

export function ProceduralSentinel() {
  const { ch } = useScene();

  const upper = useRef<THREE.Group>(null);
  const chest = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const eyes = useRef<(THREE.Group | null)[]>([]);
  const lids = useRef<(THREE.Mesh | null)[]>([]);
  const arm = useRef<{ up: THREE.Mesh | null; fore: THREE.Mesh | null; elbow: THREE.Mesh | null; hand: THREE.Group | null }[]>([
    { up: null, fore: null, elbow: null, hand: null },
    { up: null, fore: null, elbow: null, hand: null },
  ]);

  const mats = useMemo(
    () => ({
      armor: new THREE.MeshStandardMaterial({ color: "#1c2c63", metalness: 0.86, roughness: 0.3 }),
      plate: new THREE.MeshStandardMaterial({ color: "#2b3f86", metalness: 0.9, roughness: 0.24, side: THREE.DoubleSide }),
      trim: new THREE.MeshStandardMaterial({ color: "#b3c1e6", metalness: 1, roughness: 0.2, side: THREE.DoubleSide }),
      dark: new THREE.MeshStandardMaterial({ color: "#090e22", metalness: 0.55, roughness: 0.58 }),
      face: new THREE.MeshStandardMaterial({ color: "#8f9cc0", metalness: 0.55, roughness: 0.36 }),
      sclera: new THREE.MeshStandardMaterial({ color: "#0b1126", metalness: 0.2, roughness: 0.15 }),
      iris: new THREE.MeshBasicMaterial({ map: irisTexture(), toneMapped: false }),
      cornea: new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: 0, roughness: 0.02, transparent: true, opacity: 0.16, depthWrite: false }),
      catch: new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, toneMapped: false }),
      energy: new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0, toneMapped: false }),
      reactor: new THREE.MeshBasicMaterial({ color: "#c9f6ff", transparent: true, opacity: 0, toneMapped: false }),
    }),
    [],
  );

  const geo = useMemo(() => {
    const torso = new THREE.LatheGeometry(
      [
        [0.84, 0], [0.98, 0.22], [1.3, 0.72], [1.5, 1.12], [1.44, 1.4], [1.02, 1.6], [0.42, 1.7],
      ].map(([r, y]) => new THREE.Vector2(r, y)),
      28,
    );
    const front = Math.PI / 2;
    return {
      torso,
      pec: new THREE.SphereGeometry(1, 20, 12, front - 0.85, 1.7, 0.45, 1.45),
      ab: new THREE.CylinderGeometry(0.88, 0.84, 0.25, 20),
      pelvis: new THREE.CylinderGeometry(0.9, 0.74, 0.58, 20),
      belt: new THREE.TorusGeometry(0.9, 0.07, 8, 28),
      tasset: new THREE.BoxGeometry(0.62, 0.95, 0.1),
      thigh: new THREE.CylinderGeometry(0.5, 0.4, 1.55, 16),
      thighPlate: new THREE.CylinderGeometry(0.56, 0.46, 1.2, 14, 1, true, -0.95, 1.9),
      knee: new THREE.SphereGeometry(0.36, 16, 12),
      shin: new THREE.CylinderGeometry(0.38, 0.3, 2.0, 16),
      greave: new THREE.CylinderGeometry(0.47, 0.37, 1.7, 14, 1, true, -1.05, 2.1),
      ankle: new THREE.CylinderGeometry(0.34, 0.4, 0.3, 14),
      foot: new THREE.BoxGeometry(0.8, 0.32, 1.4),
      toe: new THREE.CylinderGeometry(0.41, 0.41, 0.34, 12, 1, false, -Math.PI / 2, Math.PI),
      pauldron: new THREE.SphereGeometry(0.78, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      pauldronRim: new THREE.TorusGeometry(0.78, 0.05, 6, 24),
      limb: new THREE.CylinderGeometry(0.3, 0.25, 1, 14),
      bracer: new THREE.CylinderGeometry(0.33, 0.29, 1, 14),
      elbow: new THREE.SphereGeometry(0.31, 14, 10),
      palm: new THREE.BoxGeometry(0.4, 0.13, 0.44),
      finger: new THREE.BoxGeometry(0.075, 0.075, 0.2),
      gorget: new THREE.TorusGeometry(0.47, 0.11, 8, 24),
      neck: new THREE.CylinderGeometry(0.27, 0.33, 0.5, 14),
      skull: new THREE.SphereGeometry(0.4, 24, 18),
      helm: new THREE.SphereGeometry(0.5, 28, 18, front + 0.85, Math.PI * 2 - 1.7, 0, 2.05),
      forehead: new THREE.SphereGeometry(0.505, 14, 8, front - 0.86, 1.72, 0, 1.12),
      chin: new THREE.SphereGeometry(0.47, 14, 6, front - 0.8, 1.6, 2.0, 0.62),
      brow: new THREE.TorusGeometry(0.455, 0.05, 6, 20, 1.9),
      crest: new THREE.BoxGeometry(0.06, 0.34, 0.95),
      ear: new THREE.CylinderGeometry(0.11, 0.13, 0.08, 12),
      nose: new THREE.CylinderGeometry(0.012, 0.055, 0.2, 4),
      mouth: new THREE.BoxGeometry(0.15, 0.012, 0.02),
      eyeball: new THREE.SphereGeometry(0.075, 18, 14),
      iris: new THREE.CircleGeometry(0.052, 24),
      cornea: new THREE.SphereGeometry(0.079, 18, 14),
      lidUp: new THREE.SphereGeometry(0.083, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      lidLow: new THREE.SphereGeometry(0.083, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      catch: new THREE.CircleGeometry(0.011, 8),
      back: new THREE.BoxGeometry(2.5, 4.6, 0.14),
      wing: new THREE.BoxGeometry(1.05, 5.4, 0.1),
      line: new THREE.BoxGeometry(0.05, 1, 0.03),
      reactorRing: new THREE.TorusGeometry(0.2, 0.045, 8, 24),
      reactor: new THREE.CircleGeometry(0.16, 20),
    };
  }, []);

  const tmp = useMemo(
    () => ({
      target: new THREE.Vector3(),
      shoulder: new THREE.Vector3(),
      elbow: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      pole: new THREE.Vector3(),
      scratch: new THREE.Vector3(),
    }),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const wake = ease(clamp01(ch.visor));
    const lift = ease(clamp01(ch.lift));
    const breath = Math.sin(t * 1.05);

    // Breathing: the whole upper body rises a touch, the chest swells.
    if (upper.current) upper.current.position.y = breath * 0.022;
    if (chest.current) chest.current.scale.set(1 + breath * 0.008, 1, 0.7 * (1 + breath * 0.022));

    // Head: bowed while dormant, lifts as the eyes ignite, follows the lift.
    if (head.current) {
      head.current.rotation.x = 0.36 * (1 - wake) + 0.14 * wake - 0.12 * lift;
      head.current.rotation.y = glance(t) * 0.07 * wake;
    }

    // Eyes: lids open with the wake channel, periodic blink, small saccades.
    const blinkPhase = (t % 5.3) / 0.16;
    const blink = blinkPhase < 1 ? Math.sin(Math.PI * blinkPhase) : 0;
    const open = wake * (1 - blink);
    const sac = Math.sin(Math.floor(t * 0.7) * 12.9898) * 0.05;
    for (let i = 0; i < 2; i++) {
      const lid = lids.current[i];
      if (lid) lid.rotation.x = 0.58 - 1.16 * open;
      const eye = eyes.current[i];
      if (eye) {
        eye.rotation.x = 0.3 * (1 - lift) + 0.02;
        eye.rotation.y = sac * wake;
      }
    }
    const flicker = 0.9 + 0.1 * Math.sin(t * 3.1);
    mats.iris.color.setScalar(0.1 + 0.9 * wake * flicker);
    mats.catch.opacity = 0.25 + 0.75 * wake;
    mats.energy.opacity = ch.crystal * (0.62 + 0.3 * Math.sin(t * 1.7));
    mats.reactor.opacity = clamp01(ch.crystal * (0.75 + 0.2 * Math.sin(t * 2.1)) + Math.sin(Math.PI * ch.pulse) * 0.5);

    // Arms: two-bone IK from shoulder to the hilt of the planted sword.
    for (let i = 0; i < 2; i++) {
      const s = sides[i]!;
      const a = arm.current[i]!;
      tmp.target.copy(SWORD_HILT).sub(ORIGIN);
      tmp.target.y += swordLift(ch) * SENTINEL_K + (i === 0 ? 0 : 0.35);
      tmp.target.x += HAND_HOLD.x * s;
      tmp.target.y += HAND_HOLD.y;
      tmp.target.z += HAND_HOLD.z;
      tmp.shoulder.set(SHOULDER.x * s, SHOULDER.y, SHOULDER.z);
      tmp.dir.copy(tmp.target).sub(tmp.shoulder);
      const d = Math.min(tmp.dir.length(), UPPER_LEN + FORE_LEN - 0.01);
      tmp.dir.normalize();
      const along = (UPPER_LEN * UPPER_LEN - FORE_LEN * FORE_LEN + d * d) / (2 * d);
      const out = Math.sqrt(Math.max(0, UPPER_LEN * UPPER_LEN - along * along));
      // Elbows swing outwards and back.
      tmp.pole.set(s, -0.35, -0.55);
      tmp.pole.addScaledVector(tmp.dir, -tmp.pole.dot(tmp.dir)).normalize();
      tmp.elbow.copy(tmp.shoulder).addScaledVector(tmp.dir, along).addScaledVector(tmp.pole, out);
      span(a.up, tmp.shoulder, tmp.elbow, tmp.scratch);
      span(a.fore, tmp.elbow, tmp.target, tmp.scratch);
      a.elbow?.position.copy(tmp.elbow);
      if (a.hand) {
        a.hand.position.copy(tmp.target);
        a.hand.rotation.set(-0.18 - 0.1 * lift, -s * 0.95, 0);
      }
    }
  });

  return (
    <group position={ORIGIN}>
      <ProceduralSword />
      {/* ---------------------------------------------------------- legs */}
      {sides.map((s) => (
        <group key={`leg${s}`}>
          <Part g={geo.foot} p={[0.68 * s, 0.16, 0.12]} m={mats.dark} />
          <Part g={geo.toe} p={[0.68 * s, 0.17, 0.82]} m={mats.trim} />
          <Part g={geo.ankle} p={[0.68 * s, 0.42, 0]} m={mats.dark} />
          <Part g={geo.shin} p={[0.67 * s, 1.4, 0]} m={mats.armor} />
          <Part g={geo.greave} p={[0.67 * s, 1.42, 0.02]} m={mats.plate} />
          <Part g={geo.knee} p={[0.66 * s, 2.45, 0.2]} s={[1.05, 1.25, 0.95]} m={mats.trim} />
          <Part g={geo.thigh} p={[0.63 * s, 3.2, 0]} m={mats.armor} />
          <Part g={geo.thighPlate} p={[0.63 * s, 3.25, 0.02]} r={[0, 0.35 * s, 0]} m={mats.plate} />
          <Part g={geo.line} p={[0.67 * s, 1.42, 0.49]} s={[1, 1.15, 1]} m={mats.energy} />
          <Part g={geo.tasset} p={[0.78 * s, 3.78, 0.5]} r={[-0.18, 0.3 * s, 0.06 * s]} m={mats.plate} />
        </group>
      ))}

      {/* -------------------------------------------------------- pelvis */}
      <Part g={geo.pelvis} p={[0, 4.02, 0]} s={[1, 1, 0.74]} m={mats.dark} />
      <Part g={geo.belt} p={[0, 4.32, 0]} r={[Math.PI / 2, 0, 0]} s={[1, 0.74, 1]} m={mats.trim} />
      {[0, 1, 2].map((i) => (
        <Part key={i} g={geo.ab} p={[0, 4.52 + i * 0.27, 0]} s={[1 - i * 0.01, 1, 0.72]} m={i === 1 ? mats.armor : mats.dark} />
      ))}

      {/* Back mantle — keeps the monumental silhouette. */}
      <Part g={geo.back} p={[0, 4.4, -0.98]} r={[0.1, 0, 0]} m={mats.dark} />
      {sides.map((s) => (
        <Part key={`wing${s}`} g={geo.wing} p={[1.5 * s, 4.2, -1.08]} r={[0.08, 0.5 * s, 0.08 * s]} m={mats.dark} />
      ))}

      {/* ---------------------------------------------------- upper body */}
      <group ref={upper}>
        <group ref={chest} position={[0, 5.24, 0]} scale={[1, 1, 0.7]}>
          <mesh geometry={geo.torso} material={mats.armor} />
        </group>
        {sides.map((s) => (
          <Part key={`pec${s}`} g={geo.pec} p={[0.6 * s, 6.22, 0.6]} r={[0.1, 0.24 * s, 0]} s={[0.74, 0.66, 0.44]} m={mats.plate} />
        ))}
        <Part g={geo.reactorRing} p={[0, 5.92, 1.03]} m={mats.trim} />
        <Part g={geo.reactor} p={[0, 5.92, 1.035]} m={mats.reactor} />
        <Glow position={[0, 5.92, 1.3]} size={1.6} color={COLORS.cyan} intensity={() => ch.crystal * 0.55} />
        <Part g={geo.line} p={[0, 5.3, 0.74]} s={[1, 0.62, 1]} m={mats.energy} />
        {sides.map((s) => (
          <Part key={`ln${s}`} g={geo.line} p={[0.52 * s, 6.5, 0.9]} r={[0.2, 0, -0.95 * s]} s={[1, 0.7, 1]} m={mats.energy} />
        ))}
        <Part g={geo.gorget} p={[0, 6.92, 0]} r={[Math.PI / 2, 0, 0]} m={mats.trim} />

        {/* Shoulders and IK arms */}
        {sides.map((s, i) => (
          <group key={`arm${s}`}>
            <group position={[1.86 * s, 6.3, 0]} rotation={[0, 0, -0.5 * s]}>
              <Part g={geo.pauldron} s={[1, 0.92, 0.96]} m={mats.trim} />
              <Part g={geo.pauldronRim} r={[Math.PI / 2, 0, 0]} s={[1, 0.96, 1]} m={mats.armor} />
            </group>
            <Part g={geo.pauldron} p={[1.98 * s, 6.02, 0]} r={[0, 0, -0.78 * s]} s={[0.8, 0.7, 0.82]} m={mats.plate} />
            <mesh ref={(m) => void (arm.current[i]!.up = m)} geometry={geo.limb} material={mats.armor} />
            <mesh ref={(m) => void (arm.current[i]!.elbow = m)} geometry={geo.elbow} material={mats.trim} />
            <mesh ref={(m) => void (arm.current[i]!.fore = m)} geometry={geo.bracer} material={mats.plate} />
            <group ref={(g) => void (arm.current[i]!.hand = g)}>
              <Part g={geo.palm} m={mats.trim} />
              {[-0.15, -0.05, 0.05, 0.15].map((x, f) => (
                <group key={f} position={[x, 0, 0.22]} rotation={[-0.35, 0, 0]}>
                  <Part g={geo.finger} p={[0, 0, 0.1]} m={mats.dark} />
                  <Part g={geo.finger} p={[0, 0.07, 0.26]} r={[-0.8, 0, 0]} m={mats.trim} />
                </group>
              ))}
              <Part g={geo.finger} p={[0.24 * s, 0.03, 0.06]} r={[-0.3, 0.9 * s, 0]} m={mats.dark} />
            </group>
          </group>
        ))}

        {/* ---------------------------------------------------- head */}
        <Part g={geo.neck} p={[0, 6.95, 0]} m={mats.dark} />
        <group ref={head} position={[0, 7.05, 0]}>
          <Part g={geo.skull} p={[0, 0.58, 0.08]} s={[0.84, 1.05, 0.92]} m={mats.face} />
          <Part g={geo.helm} p={[0, 0.6, 0]} s={[0.94, 1.06, 1]} m={mats.armor} />
          <Part g={geo.forehead} p={[0, 0.6, 0]} s={[0.94, 1.06, 1]} m={mats.plate} />
          <Part g={geo.chin} p={[0, 0.62, 0]} s={[0.9, 1.04, 0.98]} m={mats.trim} />
          <group position={[0, 0.83, 0.01]} rotation={[Math.PI / 2, 0, 0]}>
            <Part g={geo.brow} r={[0, 0, Math.PI / 2 - 0.95]} m={mats.trim} />
          </group>
          <Part g={geo.crest} p={[0, 1.2, -0.1]} r={[-0.12, 0, 0]} m={mats.trim} />
          {sides.map((s) => (
            <Part key={`ear${s}`} g={geo.ear} p={[0.47 * s, 0.6, 0]} r={[0, 0, Math.PI / 2]} m={mats.trim} />
          ))}
          <Part g={geo.nose} p={[0, 0.52, 0.45]} r={[0.32, Math.PI / 4, 0]} m={mats.face} />
          <Part g={geo.mouth} p={[0, 0.4, 0.42]} m={mats.dark} />

          {sides.map((s, i) => (
            <group key={`eye${s}`} position={[0.152 * s, 0.63, 0.375]}>
              <group ref={(g) => void (eyes.current[i] = g)}>
                <mesh geometry={geo.eyeball} material={mats.sclera} />
                <mesh geometry={geo.iris} material={mats.iris} position={[0, 0, 0.0755]} />
                <mesh geometry={geo.cornea} material={mats.cornea} />
                <mesh geometry={geo.catch} material={mats.catch} position={[-0.02, 0.024, 0.08]} />
              </group>
              <mesh ref={(m) => void (lids.current[i] = m)} geometry={geo.lidUp} material={mats.face} rotation={[0.58, 0, 0]} />
              <mesh geometry={geo.lidLow} material={mats.face} rotation={[0.72, 0, 0]} />
              <Glow position={[0, 0, 0.14]} size={0.62} color={COLORS.cyan} intensity={(t) => sub(ch.visor, 0.2, 1) * (0.5 + 0.12 * Math.sin(t * 3.1))} />
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}
