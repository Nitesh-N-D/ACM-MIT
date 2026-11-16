"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Glow } from "./Glow";
import { COLORS, useScene } from "./state";

/**
 * The Nexus Sentinel — an original guardian built from faceted, tapered
 * prisms. ~40 meshes sharing three materials; flat shading gives the
 * carved-armour look without textures.
 */

type V3 = [number, number, number];

const UP = new THREE.Vector3(0, 1, 0);

function prism(rt: number, rb: number, h: number, seg: number) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1);
  if (seg === 4) g.rotateY(Math.PI / 4);
  return g;
}

/** A prism stretched between two points (limbs). */
function Segment({ from, to, rt, rb, seg = 5, material }: { from: V3; to: V3; rt: number; rb: number; seg?: number; material: THREE.Material }) {
  const { geometry, position, quaternion } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    const len = dir.length();
    return {
      geometry: prism(rt, rb, len, seg),
      position: a.clone().add(b).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()),
    };
  }, [from, to, rt, rb, seg]);
  return <mesh geometry={geometry} position={position} quaternion={quaternion} material={material} />;
}

function Part({ g, p, r, s, m }: { g: THREE.BufferGeometry; p: V3; r?: V3; s?: V3; m: THREE.Material }) {
  return <mesh geometry={g} position={p} rotation={r} scale={s} material={m} />;
}

// Mirror helper for symmetric parts.
const L = -1;
const R = 1;

export function Sentinel() {
  const { ch } = useScene();
  const visor = useRef<THREE.MeshBasicMaterial>(null);

  const mats = useMemo(
    () => ({
      armor: new THREE.MeshStandardMaterial({ color: "#1b2a5c", metalness: 0.78, roughness: 0.32, flatShading: true }),
      trim: new THREE.MeshStandardMaterial({ color: "#a7b6dc", metalness: 0.92, roughness: 0.22, flatShading: true }),
      dark: new THREE.MeshStandardMaterial({ color: "#0a1028", metalness: 0.6, roughness: 0.5, flatShading: true }),
    }),
    [],
  );

  const geo = useMemo(
    () => ({
      foot: new THREE.BoxGeometry(0.9, 0.38, 1.45),
      greave: new THREE.BoxGeometry(0.62, 1.5, 0.22),
      knee: new THREE.OctahedronGeometry(0.36, 0),
      hip: prism(0.95, 1.05, 0.6, 6),
      abdomen: prism(1.1, 0.88, 0.95, 6),
      chest: prism(1.7, 1.1, 1.55, 6),
      sternum: prism(0.55, 0.22, 1.0, 4),
      pauldron: prism(0.48, 0.92, 0.75, 5),
      fin: new THREE.BoxGeometry(0.08, 0.5, 1.2),
      hand: new THREE.BoxGeometry(0.42, 0.42, 0.5),
      neck: prism(0.32, 0.38, 0.45, 6),
      head: prism(0.44, 0.56, 0.78, 6),
      crown: prism(0.04, 0.44, 0.5, 6),
      crest: new THREE.BoxGeometry(0.07, 0.6, 1.0),
      visor: new THREE.BoxGeometry(0.66, 0.085, 0.05),
      back: new THREE.BoxGeometry(2.7, 5.0, 0.14),
      wing: new THREE.BoxGeometry(1.1, 5.6, 0.1),
      line: new THREE.BoxGeometry(0.05, 1, 0.03),
    }),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (visor.current) visor.current.opacity = ch.visor * (0.85 + 0.15 * Math.sin(t * 3.1));
  });

  const sides = [L, R] as const;

  return (
    <group position={[0, 0.3, -2.2]}>
      {/* Legs */}
      {sides.map((s) => (
        <group key={`leg${s}`}>
          <Part g={geo.foot} p={[0.68 * s, 0.18, 0.18]} m={mats.dark} />
          <Segment from={[0.68 * s, 0.35, 0]} to={[0.64 * s, 2.35, 0.05]} rt={0.5} rb={0.38} seg={5} material={mats.armor} />
          <Part g={geo.greave} p={[0.67 * s, 1.35, 0.32]} r={[-0.05, 0, 0]} m={mats.dark} />
          <Part g={geo.knee} p={[0.66 * s, 2.4, 0.26]} s={[1.2, 1.3, 0.9]} m={mats.trim} />
          <Segment from={[0.64 * s, 2.45, 0]} to={[0.6 * s, 3.9, -0.02]} rt={0.62} rb={0.5} seg={6} material={mats.armor} />
        </group>
      ))}

      {/* Core body */}
      <Part g={geo.hip} p={[0, 4.05, 0]} s={[1, 1, 0.75]} m={mats.dark} />
      <Part g={geo.abdomen} p={[0, 4.78, 0]} s={[1, 1, 0.72]} m={mats.armor} />
      <Part g={geo.chest} p={[0, 5.98, 0]} s={[1, 1, 0.74]} m={mats.armor} />
      <Part g={geo.sternum} p={[0, 5.95, 0.82]} r={[0.12, 0, 0]} s={[1, 1, 0.5]} m={mats.trim} />

      {/* Energy channels on the armour */}
      {[
        { p: [0, 5.1, 0.84] as V3, r: [0, 0, 0] as V3, s: [1, 0.9, 1] as V3 },
        { p: [-0.45, 6.15, 0.93] as V3, r: [0, 0, 0.5] as V3, s: [1, 0.85, 1] as V3 },
        { p: [0.45, 6.15, 0.93] as V3, r: [0, 0, -0.5] as V3, s: [1, 0.85, 1] as V3 },
        { p: [-0.62, 1.4, 0.42] as V3, r: [0, 0, 0] as V3, s: [1, 1.2, 1] as V3 },
        { p: [0.62, 1.4, 0.42] as V3, r: [0, 0, 0] as V3, s: [1, 1.2, 1] as V3 },
      ].map((c, i) => (
        <EmissiveLine key={i} geometry={geo.line} {...c} />
      ))}

      {/* Shoulders + arms reaching to the artifact */}
      {sides.map((s) => (
        <group key={`arm${s}`}>
          <Part g={geo.pauldron} p={[1.9 * s, 6.55, 0]} r={[0, 0, -0.38 * s]} s={[1, 1, 0.9]} m={mats.trim} />
          <Part g={geo.fin} p={[2.05 * s, 7.0, -0.05]} r={[0.2, 0, -0.38 * s]} m={mats.armor} />
          <Segment from={[1.98 * s, 6.25, 0]} to={[2.18 * s, 4.95, 0.4]} rt={0.36} rb={0.3} seg={5} material={mats.armor} />
          <Segment from={[2.18 * s, 4.95, 0.4]} to={[1.0 * s, 4.35, 1.5]} rt={0.34} rb={0.26} seg={5} material={mats.armor} />
          <Part g={geo.hand} p={[0.92 * s, 4.32, 1.58]} r={[0, 0.5 * s, 0]} m={mats.trim} />
        </group>
      ))}

      {/* Head */}
      <Part g={geo.neck} p={[0, 6.92, 0]} m={mats.dark} />
      <Part g={geo.head} p={[0, 7.45, 0.02]} s={[1, 1, 1.05]} m={mats.armor} />
      <Part g={geo.crown} p={[0, 8.08, 0.02]} m={mats.trim} />
      <Part g={geo.crest} p={[0, 8.05, -0.12]} m={mats.trim} />
      <mesh geometry={geo.visor} position={[0, 7.48, 0.53]}>
        <meshBasicMaterial ref={visor} color={COLORS.cyan} transparent opacity={0} toneMapped={false} />
      </mesh>
      <Glow position={[0, 7.48, 0.75]} size={2.2} color={COLORS.cyan} intensity={(t) => ch.visor * (0.7 + 0.3 * Math.sin(t * 3.1))} />

      {/* Back plates / mantle — monumental silhouette */}
      <Part g={geo.back} p={[0, 4.3, -0.95]} r={[0.1, 0, 0]} m={mats.dark} />
      {sides.map((s) => (
        <Part key={`wing${s}`} g={geo.wing} p={[1.55 * s, 4.1, -1.05]} r={[0.08, 0.5 * s, 0.08 * s]} m={mats.dark} />
      ))}
    </group>
  );
}

function EmissiveLine({ geometry, p, r, s }: { geometry: THREE.BufferGeometry; p: V3; r: V3; s: V3 }) {
  const { ch } = useScene();
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (mat.current) mat.current.opacity = ch.crystal * (0.6 + 0.3 * Math.sin(clock.elapsedTime * 1.7 + p[1]));
  });
  return (
    <mesh geometry={geometry} position={p} rotation={r} scale={s}>
      <meshBasicMaterial ref={mat} color={COLORS.cyan} transparent opacity={0} toneMapped={false} />
    </mesh>
  );
}
