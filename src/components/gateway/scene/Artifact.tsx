"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Glow } from "./Glow";
import { COLORS, sub, useScene } from "./state";

/** World-space rest position of the artifact (between the Sentinel's hands). */
export const ARTIFACT_POS = new THREE.Vector3(0, 4.85, -0.5);

/**
 * The Nexus Artifact: a crystal conduit inside three precessing quantum
 * rings. Emissive materials + additive glow sprites, no post-processing.
 */
export function Artifact() {
  const { ch } = useScene();
  const root = useRef<THREE.Group>(null);
  const crystal = useRef<THREE.Mesh>(null);
  const crystalMat = useRef<THREE.MeshStandardMaterial>(null);
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const ringMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const light = useRef<THREE.PointLight>(null);
  const spin = useRef(0);

  const geo = useMemo(
    () => ({
      crystal: new THREE.OctahedronGeometry(0.62, 0),
      inner: new THREE.OctahedronGeometry(0.3, 0),
      ring: [1.45, 1.15, 0.92].map((r, i) => new THREE.TorusGeometry(r, i === 0 ? 0.035 : 0.028, 6, 96)),
    }),
    [],
  );

  const ringColors = [COLORS.ice, COLORS.cyan, COLORS.violet];
  const ringTilt: [number, number, number][] = [
    [Math.PI / 2.3, 0, 0],
    [Math.PI / 2, 0.9, 0],
    [Math.PI / 2, -0.9, 0.4],
  ];

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const c = ch.crystal;
    const lift = ch.lift;

    if (root.current) {
      root.current.position.set(
        ARTIFACT_POS.x,
        ARTIFACT_POS.y + lift * 1.15 + Math.sin(t * 1.3) * 0.08 * c,
        ARTIFACT_POS.z + lift * 0.35,
      );
    }
    if (crystal.current) {
      crystal.current.rotation.y = t * 0.6;
      crystal.current.scale.setScalar(0.85 + 0.15 * c + Math.sin(Math.PI * ch.pulse) * 0.25);
    }
    if (crystalMat.current) crystalMat.current.emissiveIntensity = 0.15 + c * 2.6;

    // Ring spin speeds up with the "rings" channel.
    spin.current += dt * (0.15 + ch.rings * 1.4);
    rings.current.forEach((m, i) => {
      if (!m) return;
      const dir = i % 2 ? -1 : 1;
      m.rotation.z = spin.current * dir * (1 + i * 0.35);
      m.rotation.x = ringTilt[i]![0] + Math.sin(spin.current * 0.4 + i) * 0.25 * ch.rings;
    });
    ringMats.current.forEach((m, i) => {
      if (m) m.opacity = sub(ch.rings, i * 0.15, 0.6 + i * 0.15) * 0.95;
    });

    if (light.current) light.current.intensity = c * 26 + Math.sin(Math.PI * ch.pulse) * 60;
  });

  return (
    <group ref={root} position={ARTIFACT_POS}>
      <pointLight ref={light} color={COLORS.cyan} intensity={0} distance={16} decay={2} />

      <mesh ref={crystal} geometry={geo.crystal} scale={[1, 1.75, 1]}>
        <meshStandardMaterial
          ref={crystalMat}
          color="#7feaff"
          emissive={COLORS.cyan}
          emissiveIntensity={0.15}
          metalness={0.2}
          roughness={0.08}
          flatShading
          transparent
          opacity={0.92}
        />
      </mesh>
      <mesh geometry={geo.inner} scale={[1, 1.8, 1]}>
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>

      {geo.ring.map((g, i) => (
        <group key={i} rotation={ringTilt[i]}>
          <mesh ref={(m) => void (rings.current[i] = m)} geometry={g}>
            <meshBasicMaterial
              ref={(m) => void (ringMats.current[i] = m)}
              color={ringColors[i]}
              transparent
              opacity={0}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}

      <Glow size={4.2} color={COLORS.cyan} intensity={(t) => ch.crystal * (0.75 + 0.2 * Math.sin(t * 2.2)) + Math.sin(Math.PI * ch.pulse) * 0.8} />
      <Glow size={9} color={COLORS.electric} intensity={() => ch.crystal * 0.35} />
    </group>
  );
}
