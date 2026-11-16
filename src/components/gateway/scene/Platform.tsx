"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { ARTIFACT_POS } from "./Artifact";
import { glowTexture } from "./textures";
import { COLORS, sub, useScene } from "./state";

const RING_RADII = [1.9, 3.1, 4.4, 5.9, 8.4];

/** The Resonance Platform: a stepped disc whose rings ignite outward. */
export function Platform() {
  const { ch } = useScene();
  const ringMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const wave = useRef<THREE.Mesh>(null);
  const waveMat = useRef<THREE.MeshBasicMaterial>(null);
  const beamMat = useRef<THREE.MeshBasicMaterial>(null);
  const coreMat = useRef<THREE.MeshBasicMaterial>(null);
  const spokesMat = useRef<THREE.LineBasicMaterial>(null);

  const geo = useMemo(() => {
    const spokes: number[] = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const r0 = i % 2 ? 6.2 : 2.2;
      spokes.push(Math.cos(a) * r0, 0, Math.sin(a) * r0, Math.cos(a) * 8.9, 0, Math.sin(a) * 8.9);
    }
    const spokeGeo = new THREE.BufferGeometry();
    spokeGeo.setAttribute("position", new THREE.Float32BufferAttribute(spokes, 3));
    return {
      base: new THREE.CylinderGeometry(9.2, 9.8, 0.6, 72),
      step: new THREE.CylinderGeometry(6.6, 6.9, 0.3, 72),
      rings: RING_RADII.map((r, i) => new THREE.RingGeometry(r - (i === 4 ? 0.07 : 0.045), r, 128)),
      wave: new THREE.RingGeometry(0.92, 1, 96),
      beam: new THREE.CylinderGeometry(0.06, 0.22, 1, 12, 1, true),
      core: new THREE.PlaneGeometry(4, 4),
      spokes: spokeGeo,
    };
  }, []);

  const stone = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#0c1430", metalness: 0.7, roughness: 0.38, flatShading: true }),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const p = ch.platform;
    ringMats.current.forEach((m, i) => {
      if (!m) return;
      const on = sub(p, i * 0.14, i * 0.14 + 0.3);
      m.opacity = on * (0.55 + 0.25 * Math.sin(t * 1.4 - i * 0.8));
    });
    if (spokesMat.current) spokesMat.current.opacity = sub(p, 0.5, 1) * 0.22;
    if (coreMat.current) coreMat.current.opacity = p * (0.5 + 0.2 * Math.sin(t * 2));

    // Energy pulse: beam from artifact down + shockwave across the platform.
    const flash = Math.sin(Math.PI * ch.pulse);
    if (waveMat.current && wave.current) {
      waveMat.current.opacity = flash * 0.9;
      const s = 1 + ch.pulse * 8.6;
      wave.current.scale.set(s, s, 1);
    }
    if (beamMat.current) beamMat.current.opacity = flash * 0.85;
  });

  const beamTop = ARTIFACT_POS.y + 1.15;

  return (
    <group>
      <mesh geometry={geo.base} position={[0, -0.3, 0]} material={stone} />
      <mesh geometry={geo.step} position={[0, 0.15, -0.6]} material={stone} />

      <group position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        {geo.rings.map((g, i) => (
          <mesh key={i} geometry={g} position={[0, i < 4 ? 0.6 : 0, i < 4 ? 0.305 : 0]} renderOrder={2}>
            <meshBasicMaterial
              ref={(m) => void (ringMats.current[i] = m)}
              color={i === 4 ? COLORS.electric : COLORS.cyan}
              transparent
              opacity={0}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
        ))}
        <mesh ref={wave} geometry={geo.wave} position={[0, 0.6, 0.32]} renderOrder={3}>
          <meshBasicMaterial ref={waveMat} color={COLORS.ice} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
        <mesh geometry={geo.core} position={[0, 0.6, 0.32]} renderOrder={2}>
          <meshBasicMaterial ref={coreMat} map={glowTexture()} color={COLORS.cyan} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      </group>

      <lineSegments geometry={geo.spokes} position={[0, 0.02, 0]}>
        <lineBasicMaterial ref={spokesMat} color={COLORS.cyan} transparent opacity={0} depthWrite={false} toneMapped={false} />
      </lineSegments>

      <mesh geometry={geo.beam} position={[0, beamTop / 2, ARTIFACT_POS.z]} scale={[1, beamTop, 1]}>
        <meshBasicMaterial ref={beamMat} color={COLORS.ice} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
