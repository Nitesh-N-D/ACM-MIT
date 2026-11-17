"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Glow } from "./Glow";
import { ARTIFACT_POS, ARTIFACT_SCALE, artifactPosition } from "./motion";
import { COLORS, sub, useScene } from "./state";

/**
 * The Nexus Artifact: a faceted crystal conduit inside three quantum rings.
 * Each ring is a machined metal band carrying a luminous channel, turning on
 * its own axis. Emissive materials + additive glow sprites, no
 * post-processing.
 */
const RINGS = [
  { r: 1.42, tilt: [Math.PI / 2.3, 0, 0], color: COLORS.ice, metal: "#c3cfee", speed: 1 },
  { r: 1.14, tilt: [Math.PI / 2, 0.9, 0], color: COLORS.cyan, metal: "#8fa3d8", speed: -1.35 },
  { r: 0.9, tilt: [Math.PI / 2, -0.9, 0.4], color: COLORS.violet, metal: "#d8b25e", speed: 1.7 },
] as const;

export function Artifact() {
  const { ch } = useScene();
  const root = useRef<THREE.Group>(null);
  const crystal = useRef<THREE.Group>(null);
  const rings = useRef<(THREE.Group | null)[]>([]);
  const light = useRef<THREE.PointLight>(null);
  const spin = useRef(0);

  const geo = useMemo(() => {
    const profile = [
      [0, -1.12], [0.3, -0.62], [0.42, -0.08], [0.4, 0.3], [0.24, 0.78], [0, 1.12],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    return {
      crystal: new THREE.LatheGeometry(profile, 6),
      shard: new THREE.OctahedronGeometry(0.2, 0),
      core: new THREE.OctahedronGeometry(0.2, 0),
      // radialSegments 4 → a machined, diamond-section band.
      band: RINGS.map((r) => new THREE.TorusGeometry(r.r, 0.05, 4, 96)),
      channel: RINGS.map((r) => new THREE.TorusGeometry(r.r - 0.055, 0.02, 5, 96)),
      node: new THREE.BoxGeometry(0.16, 0.16, 0.13),
    };
  }, []);

  const mats = useMemo(
    () => ({
      crystal: new THREE.MeshPhysicalMaterial({
        color: "#8fefff",
        emissive: COLORS.cyan,
        emissiveIntensity: 0.12,
        metalness: 0.1,
        roughness: 0.06,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        flatShading: true,
        transparent: true,
        opacity: 0.9,
      }),
      shard: new THREE.MeshStandardMaterial({ color: "#bff6ff", emissive: COLORS.cyan, emissiveIntensity: 0.1, metalness: 0.2, roughness: 0.1, flatShading: true }),
      core: new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.2, toneMapped: false }),
      band: RINGS.map((r) => new THREE.MeshStandardMaterial({ color: r.metal, emissive: r.color, emissiveIntensity: 0.08, metalness: 0.9, roughness: 0.3, flatShading: true })),
      channel: RINGS.map((r) => new THREE.MeshBasicMaterial({ color: r.color, transparent: true, opacity: 0, toneMapped: false })),
    }),
    [],
  );

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const c = ch.crystal;
    const flash = Math.sin(Math.PI * ch.pulse);

    // The same position the Sentinel's hands are solved against.
    if (root.current) artifactPosition(ch, t, root.current.position);
    if (crystal.current) {
      crystal.current.rotation.y = t * 0.55;
      crystal.current.scale.setScalar(0.7 + 0.1 * c + flash * 0.2);
    }
    mats.crystal.emissiveIntensity = 0.12 + c * 1.1 + flash * 2;
    mats.shard.emissiveIntensity = 0.1 + c * 1.6;
    mats.core.opacity = 0.2 + 0.8 * c;

    // Rings rest at their tilt while dormant, then spin up on their own axes.
    spin.current += dt * (0.12 + ch.rings * 1.3);
    rings.current.forEach((g, i) => {
      if (!g) return;
      const r = RINGS[i]!;
      g.rotation.z = spin.current * r.speed;
      g.rotation.x = Math.sin(spin.current * 0.4 + i * 2.1) * 0.3 * ch.rings;
      g.rotation.y = Math.cos(spin.current * 0.33 + i) * 0.22 * ch.rings;
      mats.band[i]!.emissiveIntensity = 0.08 + 0.5 * ch.rings;
      mats.channel[i]!.opacity = sub(ch.rings, i * 0.15, 0.6 + i * 0.15) * (0.85 + 0.15 * Math.sin(t * 2.4 + i));
    });

    if (light.current) light.current.intensity = c * 26 + flash * 60;
  });

  return (
    <group ref={root} position={ARTIFACT_POS}>
      <pointLight ref={light} color={COLORS.cyan} intensity={0} distance={16} decay={2} />

      <group scale={ARTIFACT_SCALE}>
      <group ref={crystal}>
        <mesh geometry={geo.crystal} material={mats.crystal} />
        <mesh geometry={geo.core} material={mats.core} scale={[1, 2.6, 1]} />
        {/* Satellite shards growing from the main body. */}
        <mesh geometry={geo.shard} material={mats.shard} position={[0.3, -0.42, 0.1]} rotation={[0.2, 0.4, -0.5]} scale={[1, 2.1, 1]} />
        <mesh geometry={geo.shard} material={mats.shard} position={[-0.27, -0.5, -0.14]} rotation={[-0.2, 1.1, 0.55]} scale={[0.8, 1.7, 0.8]} />
        <mesh geometry={geo.shard} material={mats.shard} position={[-0.05, -0.6, 0.3]} rotation={[0.5, 0, 0.1]} scale={[0.6, 1.3, 0.6]} />
      </group>

      {RINGS.map((r, i) => (
        <group key={i} rotation={r.tilt as unknown as [number, number, number]}>
          <group ref={(g) => void (rings.current[i] = g)}>
            <mesh geometry={geo.band[i]} material={mats.band[i]} />
            <mesh geometry={geo.channel[i]} material={mats.channel[i]} />
            {[0, Math.PI].map((a) => (
              <mesh key={a} geometry={geo.node} material={mats.band[i]} position={[Math.cos(a) * r.r, Math.sin(a) * r.r, 0]} rotation={[0, 0, a]} />
            ))}
          </group>
        </group>
      ))}
      </group>

      <Glow size={2.6} color={COLORS.cyan} intensity={(t) => ch.crystal * (0.5 + 0.15 * Math.sin(t * 2.2)) + Math.sin(Math.PI * ch.pulse) * 0.8} />
      <Glow size={6.5} color={COLORS.electric} intensity={() => ch.crystal * 0.3} />
    </group>
  );
}
