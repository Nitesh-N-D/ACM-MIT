"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { getTerritory, type TerritoryId } from "@/config/territories";
import { Glow } from "@/components/gateway/scene/Glow";

/**
 * District landmarks — one distinct piece of architecture per territory.
 * Built from primitives sharing two materials each (structure + light), so
 * a landmark costs a handful of draw calls. `level` (0..1) drives how much
 * of its energy is lit; `focus` (0..1) adds a selection pulse.
 */

export type LandmarkProps = {
  id: TerritoryId;
  /** Energy level 0..1, read every frame. */
  level: () => number;
  /** Selection / hover emphasis 0..1, read every frame. */
  focus?: () => number;
};

type Mats = { body: THREE.MeshStandardMaterial; alt: THREE.MeshStandardMaterial; lit: THREE.MeshBasicMaterial; beam: THREE.MeshBasicMaterial };
type V3 = [number, number, number];

const HEIGHT: Record<TerritoryId, number> = { core: 54, intelligence: 22, frontier: 30, colosseum: 12, vault: 17, sanctuary: 27 };

export function landmarkHeight(id: TerritoryId) {
  return HEIGHT[id];
}

function B({ m, p, r, s, children }: { m: THREE.Material; p?: V3; r?: V3; s?: V3; children: ReactNode }) {
  return (
    <mesh material={m} position={p} rotation={r} scale={s}>
      {children}
    </mesh>
  );
}

/** N copies of a box arranged on a circle — one draw call. */
function RingOf({ count, radius, size, y, material, face = true }: { count: number; radius: number; size: V3; y: number; material: THREE.Material; face?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      o.position.set(Math.cos(a) * radius, y, Math.sin(a) * radius);
      o.rotation.y = face ? -a : 0;
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [count, radius, y, face]);
  return (
    <instancedMesh ref={ref} args={[undefined, material, count]}>
      <boxGeometry args={size} />
    </instancedMesh>
  );
}

function Core({ body, alt, lit }: Mats) {
  return (
    <>
      <B m={body} p={[0, 2, 0]}><cylinderGeometry args={[6, 7.5, 4, 8]} /></B>
      <B m={alt} p={[0, 4.6, 0]}><cylinderGeometry args={[4.6, 5.6, 1.2, 8]} /></B>
      <B m={body} p={[0, 20, 0]}><cylinderGeometry args={[1.9, 3.3, 30, 8]} /></B>
      <B m={alt} p={[0, 43, 0]}><cylinderGeometry args={[0.35, 1.7, 16, 8]} /></B>
      <B m={lit} p={[0, 52.5, 0]}><octahedronGeometry args={[1.1, 0]} /></B>
      {[0, 1, 2, 3].map((i) => (
        <B key={i} m={body} p={[Math.cos((i * Math.PI) / 2 + Math.PI / 4) * 4.2, 9, Math.sin((i * Math.PI) / 2 + Math.PI / 4) * 4.2]} r={[0, -(i * Math.PI) / 2 - Math.PI / 4, 0.16]}>
          <boxGeometry args={[1.1, 18, 0.5]} />
        </B>
      ))}
      {[
        [5.2, 16], [3.9, 27], [2.7, 37],
      ].map(([r, y]) => (
        <group key={y} position={[0, y!, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <B m={alt}><torusGeometry args={[r!, 0.22, 4, 48]} /></B>
          <B m={lit}><torusGeometry args={[r! - 0.24, 0.07, 5, 48]} /></B>
        </group>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <B key={`s${i}`} m={lit} p={[Math.cos((i * Math.PI) / 2) * 2.75, 19, Math.sin((i * Math.PI) / 2) * 2.75]} r={[0, -(i * Math.PI) / 2, 0]}>
          <boxGeometry args={[0.1, 24, 0.22]} />
        </B>
      ))}
    </>
  );
}

function Intelligence({ body, alt, lit }: Mats) {
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(6.6, 1)), []);
  const line = useMemo(() => new THREE.LineBasicMaterial({ transparent: true, toneMapped: false }), []);
  useFrame(() => {
    line.color.copy(lit.color);
    line.opacity = lit.opacity;
  });
  return (
    <>
      <B m={body} p={[0, 1.5, 0]}><cylinderGeometry args={[7.6, 8.6, 3, 24]} /></B>
      <B m={alt} p={[0, 3.3, 0]}><cylinderGeometry args={[6.9, 7.3, 0.6, 24]} /></B>
      <B m={body} p={[0, 9.6, 0]}><icosahedronGeometry args={[6.5, 1]} /></B>
      <lineSegments geometry={edges} material={line} position={[0, 9.6, 0]} />
      <B m={lit} p={[0, 17.4, 0]}><cylinderGeometry args={[0.12, 0.12, 5, 6]} /></B>
      <B m={lit} p={[0, 20.4, 0]}><icosahedronGeometry args={[0.7, 0]} /></B>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + 0.5;
        return (
          <group key={i} position={[Math.cos(a) * 9.4, 0, Math.sin(a) * 9.4]}>
            <B m={alt} p={[0, 4.5, 0]}><cylinderGeometry args={[0.3, 0.8, 9, 6]} /></B>
            <B m={lit} p={[0, 9.6, 0]}><icosahedronGeometry args={[0.6, 0]} /></B>
          </group>
        );
      })}
      <group position={[0, 3.7, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <B m={lit}><torusGeometry args={[7.05, 0.08, 5, 64]} /></B>
      </group>
    </>
  );
}

function Frontier({ body, alt, lit }: Mats) {
  const orbit = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (orbit.current) orbit.current.rotation.z += dt * 0.25;
  });
  return (
    <>
      <B m={body} p={[0, 1, 0]}><boxGeometry args={[16, 2, 14]} /></B>
      <B m={body} p={[-2.5, 14, 0]} r={[0, Math.PI / 4, 0]}><cylinderGeometry args={[1.4, 3, 24, 4]} /></B>
      <B m={alt} p={[-2.5, 27.5, 0]}><cylinderGeometry args={[0.08, 0.5, 5, 6]} /></B>
      <B m={body} p={[3.6, 10, 2.6]} r={[0, 0.3, 0]}><cylinderGeometry args={[1.5, 2.4, 16, 4]} /></B>
      <B m={alt} p={[3.2, 7, -3.4]} r={[0, 0.9, 0]}><cylinderGeometry args={[1.2, 2, 10, 4]} /></B>
      {/* Gantry between the towers */}
      <B m={alt} p={[0.6, 13, 1.3]} r={[0, -0.4, 0]}><boxGeometry args={[6.6, 0.5, 0.7]} /></B>
      <B m={lit} p={[0.6, 13.32, 1.3]} r={[0, -0.4, 0]}><boxGeometry args={[6.4, 0.08, 0.2]} /></B>
      {/* Dish */}
      <group position={[5.6, 2.6, -4.6]} rotation={[-0.7, 0.5, 0]}>
        <B m={alt}><sphereGeometry args={[2.2, 16, 8, 0, Math.PI * 2, 0, 0.9]} /></B>
        <B m={lit} p={[0, 2.5, 0]}><sphereGeometry args={[0.22, 8, 6]} /></B>
      </group>
      <B m={lit} p={[-2.5, 14, 2.18]} r={[0.066, 0, 0]}><boxGeometry args={[0.14, 22, 0.1]} /></B>
      <B m={lit} p={[3.6, 10, 4.65]} r={[0.056, 0.3, 0]}><boxGeometry args={[0.12, 14, 0.1]} /></B>
      <group position={[-2.5, 20, 0]} rotation={[1.15, 0.25, 0]}>
        <group ref={orbit}>
          <B m={alt}><torusGeometry args={[7.6, 0.14, 4, 64]} /></B>
          <B m={lit}><torusGeometry args={[7.44, 0.05, 5, 64]} /></B>
          <B m={lit} p={[7.6, 0, 0]}><octahedronGeometry args={[0.5, 0]} /></B>
        </group>
      </group>
    </>
  );
}

function Colosseum({ body, alt, lit }: Mats) {
  return (
    <>
      <B m={body} p={[0, 0.5, 0]}><cylinderGeometry args={[13.6, 14.4, 1, 40]} /></B>
      <B m={body} p={[0, 4.4, 0]}><cylinderGeometry args={[12, 12.6, 7, 40, 1, true]} /></B>
      <B m={alt} p={[0, 2.6, 0]}><cylinderGeometry args={[10.4, 8.2, 3.4, 40, 1, true]} /></B>
      <RingOf count={32} radius={12.75} size={[0.7, 8.4, 0.9]} y={5.1} material={alt} />
      <group position={[0, 8.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <B m={alt}><torusGeometry args={[12.3, 0.42, 4, 64]} /></B>
        <B m={lit} p={[0, 0, -0.44]}><torusGeometry args={[12.3, 0.1, 5, 64]} /></B>
      </group>
      <group position={[0, 1.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <B m={lit}><ringGeometry args={[6.9, 7.2, 48]} /></B>
        <B m={lit}><ringGeometry args={[2.4, 2.6, 32]} /></B>
      </group>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <group key={i} position={[Math.cos(a) * 13.4, 0, Math.sin(a) * 13.4]}>
            <B m={body} p={[0, 6, 0]}><cylinderGeometry args={[0.25, 0.6, 12, 6]} /></B>
            <B m={lit} p={[0, 12.2, 0]}><boxGeometry args={[1.5, 0.4, 0.5]} /></B>
          </group>
        );
      })}
    </>
  );
}

function Vault({ body, alt, lit }: Mats) {
  return (
    <>
      <B m={body} p={[0, 2, 0]}><boxGeometry args={[18, 4, 18]} /></B>
      <B m={alt} p={[0, 6, 0]}><boxGeometry args={[13.5, 4, 13.5]} /></B>
      <B m={body} p={[0, 10.5, 0]}><boxGeometry args={[9, 5, 9]} /></B>
      <B m={alt} p={[0, 14.2, 0]} r={[0, Math.PI / 4, 0]}><cylinderGeometry args={[0.4, 5.6, 2.6, 4]} /></B>
      <B m={lit} p={[0, 16.2, 0]}><octahedronGeometry args={[0.8, 0]} /></B>
      {/* Tier seams */}
      {[
        [4.04, 9.02], [8.04, 6.77], [13.04, 4.52],
      ].map(([y, h]) => (
        <B key={y} m={lit} p={[0, y!, 0]} r={[Math.PI / 2, 0, Math.PI / 4]}>
          <torusGeometry args={[h! * Math.SQRT2, 0.07, 4, 4]} />
        </B>
      ))}
      {/* Vault door facing the avenue (+z) */}
      <group position={[0, 2.5, 9.04]}>
        <B m={alt}><torusGeometry args={[1.9, 0.26, 6, 32]} /></B>
        <B m={lit} p={[0, 0, 0.05]}><ringGeometry args={[1.25, 1.45, 32]} /></B>
        <B m={lit} p={[0, 0, 0.05]}><circleGeometry args={[0.32, 16]} /></B>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <B key={i} m={lit} p={[0, 0, 0.05]} r={[0, 0, (i * Math.PI) / 3]}>
            <planeGeometry args={[0.07, 2.3]} />
          </B>
        ))}
      </group>
      {[-1, 1].flatMap((x) => [-1, 1].map((z) => (
        <group key={`${x}${z}`} position={[x * 10.2, 0, z * 10.2]}>
          <B m={body} p={[0, 4.5, 0]}><boxGeometry args={[1.2, 9, 1.2]} /></B>
          <B m={lit} p={[0, 9.3, 0]}><boxGeometry args={[0.7, 0.5, 0.7]} /></B>
        </group>
      )))}
    </>
  );
}

function Sanctuary({ body, alt, lit }: Mats) {
  const columns = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = columns.current;
    if (!m) return;
    const o = new THREE.Object3D();
    let i = 0;
    for (const z of [-4.6, 4.6]) {
      for (let c = 0; c < 8; c++) {
        o.position.set(-8.4 + c * 2.4, 6.3, z);
        o.updateMatrix();
        m.setMatrixAt(i++, o.matrix);
      }
    }
    for (const x of [-8.4, 8.4]) {
      for (const z of [-1.55, 1.55]) {
        o.position.set(x, 6.3, z);
        o.updateMatrix();
        m.setMatrixAt(i++, o.matrix);
      }
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, []);
  return (
    <>
      <B m={body} p={[0, 0.5, 0]}><boxGeometry args={[23, 1, 15]} /></B>
      <B m={alt} p={[0, 1.4, 0]}><boxGeometry args={[20.6, 0.8, 12.6]} /></B>
      <instancedMesh ref={columns} args={[undefined, alt, 20]}>
        <cylinderGeometry args={[0.52, 0.62, 9, 12]} />
      </instancedMesh>
      <B m={body} p={[0, 11.4, 0]}><boxGeometry args={[19.6, 1.2, 11.6]} /></B>
      <B m={lit} p={[0, 10.74, 5.82]}><boxGeometry args={[19.2, 0.08, 0.06]} /></B>
      {/* Pediment: a triangular prism along x */}
      <B m={body} p={[0, 13.3, 0]} r={[0, 0, Math.PI / 2]} s={[1, 1, 2.25]}>
        <cylinderGeometry args={[2.6, 2.6, 19.6, 3]} />
      </B>
      {/* Inner cella and the eternal light */}
      <B m={body} p={[0, 5.6, 0]}><boxGeometry args={[9, 7.6, 5]} /></B>
      <B m={lit} p={[0, 5, 2.52]}><planeGeometry args={[1.6, 5.4]} /></B>
      {/* Obelisk of legacy behind the temple */}
      <B m={alt} p={[0, 13, -9.6]} r={[0, Math.PI / 4, 0]}><cylinderGeometry args={[0.55, 1.5, 26, 4]} /></B>
      <B m={lit} p={[0, 26.7, -9.6]} r={[0, Math.PI / 4, 0]}><cylinderGeometry args={[0.02, 0.55, 1.5, 4]} /></B>
      {[-1, 1].map((x) => (
        <group key={x} position={[x * 13.4, 0, 6]}>
          <B m={alt} p={[0, 3.5, 0]} r={[0, Math.PI / 4, 0]}><cylinderGeometry args={[0.3, 0.7, 7, 4]} /></B>
          <B m={lit} p={[0, 7.4, 0]}><octahedronGeometry args={[0.45, 0]} /></B>
        </group>
      ))}
    </>
  );
}

const PARTS: Record<TerritoryId, (m: Mats) => ReactNode> = {
  core: Core,
  intelligence: Intelligence,
  frontier: Frontier,
  colosseum: Colosseum,
  vault: Vault,
  sanctuary: Sanctuary,
};

export function Landmark({ id, level, focus }: LandmarkProps) {
  const accent = getTerritory(id)?.accent ?? "#3fe4ff";
  const h = HEIGHT[id];

  const mats = useMemo<Mats>(
    () => ({
      body: new THREE.MeshStandardMaterial({ color: "#0d1838", metalness: 0.72, roughness: 0.36, flatShading: true, side: THREE.DoubleSide }),
      alt: new THREE.MeshStandardMaterial({ color: "#5b6c9e", metalness: 0.92, roughness: 0.28, flatShading: true, side: THREE.DoubleSide }),
      lit: new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0, toneMapped: false, side: THREE.DoubleSide }),
      beam: new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }),
    }),
    [accent],
  );
  const tint = useMemo(() => ({ base: new THREE.Color("#0d1838"), hot: new THREE.Color(accent) }), [accent]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const l = level();
    const f = focus?.() ?? 0;
    mats.lit.opacity = Math.min(1, l * (0.72 + 0.12 * Math.sin(t * 1.6 + h) + 0.3 * f));
    mats.beam.opacity = l * (0.26 + 0.1 * Math.sin(t * 1.2 + h) + 0.3 * f);
    // The structure itself picks up a little of its district colour.
    mats.body.emissive.copy(tint.hot).multiplyScalar(0.05 * l + 0.1 * f);
    mats.body.color.copy(tint.base).lerp(tint.hot, 0.06 * f);
  });

  const Parts = PARTS[id];
  const strong = id === "core";

  return (
    <group>
      <Parts {...mats} />
      <mesh material={mats.beam} position={[id === "frontier" ? -2.5 : 0, h + 60, id === "sanctuary" ? -9.6 : 0]}>
        <cylinderGeometry args={[strong ? 0.3 : 0.18, strong ? 0.3 : 0.18, 120, 6, 1, true]} />
      </mesh>
      <Glow
        position={[id === "frontier" ? -2.5 : 0, h + 0.4, id === "sanctuary" ? -9.6 : 0]}
        size={strong ? 15 : 9}
        color={accent}
        intensity={(t) => level() * (0.8 + 0.15 * Math.sin(t * 2 + h)) * (1 + 0.25 * (focus?.() ?? 0))}
      />
    </group>
  );
}
