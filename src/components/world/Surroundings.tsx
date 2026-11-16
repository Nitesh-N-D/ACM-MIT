"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { territories } from "@/config/territories";
import { rng, windowsTexture } from "@/components/gateway/scene/textures";
import { CHASM, DISTRICT_CLEARANCE, DISTRICT_POS, GROUND_Y } from "./layout";

/**
 * Everything that makes NEXUS a place you stand inside rather than a set
 * you look at: the arrival quarter behind and beside the gateway platform,
 * a skyline on every horizon, district plazas, and elevated routes.
 * Used by the free-exploration world only; the gateway intro never looks
 * this way, so it does not pay for it.
 */

const CITY_CENTRE: [number, number] = [0, -50];
const PLATFORM_CLEAR = 26;

type Props = { density: number; level: () => number };

/** Towers on the arrival side of the chasm, on stepped terraces. */
function ArrivalQuarter({ density, level }: Props) {
  const towers = useRef<THREE.InstancedMesh>(null);
  const terraces = useRef<THREE.InstancedMesh>(null);
  const count = Math.round(110 * density);

  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), []);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#0b1534", emissive: "#ffffff", emissiveMap: windowsTexture(), emissiveIntensity: 0, metalness: 0.55, roughness: 0.5 }),
    [],
  );
  const terraceMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#0c1638", metalness: 0.7, roughness: 0.45 }), []);

  useLayoutEffect(() => {
    const m = towers.current;
    const t = terraces.current;
    if (!m || !t) return;
    const r = rng(409);
    const o = new THREE.Object3D();
    let i = 0;
    let j = 0;
    let guard = 0;
    while (i < count && guard++ < count * 40) {
      const x = (r() * 2 - 1) * 120;
      const z = CHASM.near + 6 + r() * 120;
      const d = Math.hypot(x, z + 1);
      if (d < PLATFORM_CLEAR) continue;
      // Keep the approach to the gate and the view down the bridge open.
      if (Math.abs(x) < 20 && z < 4) continue;
      // A processional avenue leads away behind the Sentinel.
      if (Math.abs(x) < 7) continue;
      const far = Math.min(1, (d - PLATFORM_CLEAR) / 90);
      const w = 3 + r() * 5;
      const dp = 3 + r() * 5;
      const h = 4 + Math.pow(r(), 1.8) * (10 + far * 46);
      // Stepped ground: blocks further out stand on higher terraces.
      const step = Math.floor(far * 3) * 1.6;
      if (step > 0 && j < count) {
        o.position.set(x, GROUND_Y, z);
        o.scale.set(w + 4, step, dp + 4);
        o.rotation.y = 0;
        o.updateMatrix();
        t.setMatrixAt(j++, o.matrix);
      }
      o.position.set(x, GROUND_Y + step, z);
      o.scale.set(w, h, dp);
      o.rotation.y = r() < 0.18 ? Math.PI / 4 : 0;
      o.updateMatrix();
      m.setMatrixAt(i++, o.matrix);
    }
    m.count = i;
    t.count = j;
    m.instanceMatrix.needsUpdate = true;
    t.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    t.computeBoundingSphere();
  }, [count]);

  useFrame(({ clock }) => {
    material.emissiveIntensity = level() * (1.05 + 0.08 * Math.sin(clock.elapsedTime * 0.6 + 2));
  });

  return (
    <>
      <instancedMesh ref={towers} args={[box, material, count]} />
      <instancedMesh ref={terraces} args={[box, terraceMat, count]} />
    </>
  );
}

/** A ring of very tall, hazy megastructures on every horizon. */
function Skyline({ density, level }: Props) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = Math.round(90 * density);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), []);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#070e26", emissive: "#9fc4ff", emissiveMap: windowsTexture(), emissiveIntensity: 0, metalness: 0.4, roughness: 0.7 }),
    [],
  );

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const r = rng(733);
    const o = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (r() - 0.5) * 0.06;
      const rad = 200 + r() * 90;
      const w = 10 + r() * 16;
      o.position.set(CITY_CENTRE[0] + Math.sin(a) * rad, GROUND_Y, CITY_CENTRE[1] + Math.cos(a) * rad);
      o.scale.set(w, 40 + Math.pow(r(), 1.5) * 120, w * (0.6 + r() * 0.6));
      o.rotation.y = a;
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [count]);

  useFrame(() => {
    material.emissiveIntensity = level() * 0.55;
  });

  return <instancedMesh ref={ref} args={[box, material, count]} />;
}

/** A paved plaza with a lit rim under every district landmark. */
function Plazas({ level }: { level: () => number }) {
  const rims = useMemo(
    () => territories.map((t) => new THREE.MeshBasicMaterial({ color: t.accent, transparent: true, opacity: 0, toneMapped: false, depthWrite: false })),
    [],
  );
  const paving = useMemo(() => new THREE.MeshStandardMaterial({ color: "#0d1838", metalness: 0.75, roughness: 0.38 }), []);
  useFrame(() => {
    for (const m of rims) m.opacity = 0.75 * level();
  });
  return (
    <>
      {territories.map((t, i) => {
        const [x, z] = DISTRICT_POS[t.id];
        const r = DISTRICT_CLEARANCE[t.id];
        return (
          <group key={t.id} position={[x, GROUND_Y, z]}>
            <mesh material={paving} position={[0, 0.12, 0]}>
              <cylinderGeometry args={[r, r + 0.8, 0.24, 48]} />
            </mesh>
            <mesh material={rims[i]} position={[0, 0.26, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[r - 0.35, r - 0.1, 64]} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

/** Raised ring road around the Core with spokes to the outer districts. */
function ElevatedRoutes({ level }: { level: () => number }) {
  const HEIGHT = 9;
  const RING = DISTRICT_CLEARANCE.core + 14;
  const core = DISTRICT_POS.core;
  const deck = useMemo(() => new THREE.MeshStandardMaterial({ color: "#101c44", metalness: 0.85, roughness: 0.32, side: THREE.DoubleSide }), []);
  const pillar = useMemo(() => new THREE.MeshStandardMaterial({ color: "#0c1533", metalness: 0.8, roughness: 0.4 }), []);
  const light = useMemo(() => new THREE.MeshBasicMaterial({ color: "#3fe4ff", transparent: true, opacity: 0, toneMapped: false }), []);

  const spokes = useMemo(
    () =>
      territories
        .filter((t) => t.id !== "core")
        .map((t) => {
          const [x, z] = DISTRICT_POS[t.id];
          const dx = x - core[0];
          const dz = z - core[1];
          const dist = Math.hypot(dx, dz);
          const from = RING + 1.6;
          const to = dist - DISTRICT_CLEARANCE[t.id] - 1;
          const len = Math.max(0, to - from);
          const mid = (from + to) / 2;
          return { id: t.id, len, rot: Math.atan2(dx, dz), pos: [core[0] + (dx / dist) * mid, core[1] + (dz / dist) * mid] as [number, number], ux: dx / dist, uz: dz / dist, from, to };
        })
        .filter((s) => s.len > 4),
    [core, RING],
  );
  const pillars = useMemo(() => {
    const list: [number, number][] = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      list.push([core[0] + Math.sin(a) * RING, core[1] + Math.cos(a) * RING]);
    }
    for (const s of spokes) for (let d = s.from + 6; d < s.to - 2; d += 9) list.push([core[0] + s.ux * d, core[1] + s.uz * d]);
    return list;
  }, [core, RING, spokes]);

  useFrame(({ clock }) => {
    light.opacity = level() * (0.7 + 0.15 * Math.sin(clock.elapsedTime * 1.2));
  });

  return (
    <group>
      <group position={[core[0], GROUND_Y + HEIGHT, core[1]]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh material={deck}>
          <ringGeometry args={[RING - 1.6, RING + 1.6, 96]} />
        </mesh>
        <mesh material={light} position={[0, 0, 0.05]}>
          <ringGeometry args={[RING + 1.4, RING + 1.6, 96]} />
        </mesh>
        <mesh material={light} position={[0, 0, 0.05]}>
          <ringGeometry args={[RING - 1.6, RING - 1.4, 96]} />
        </mesh>
      </group>
      {spokes.map((s) => (
        <group key={s.id} position={[s.pos[0], GROUND_Y + HEIGHT, s.pos[1]]} rotation={[0, s.rot, 0]}>
          <mesh material={deck}>
            <boxGeometry args={[2.6, 0.3, s.len]} />
          </mesh>
          <mesh material={light} position={[1.25, 0.2, 0]}>
            <boxGeometry args={[0.08, 0.08, s.len]} />
          </mesh>
          <mesh material={light} position={[-1.25, 0.2, 0]}>
            <boxGeometry args={[0.08, 0.08, s.len]} />
          </mesh>
        </group>
      ))}
      {pillars.map(([x, z], i) => (
        <mesh key={i} material={pillar} position={[x, GROUND_Y + HEIGHT / 2, z]}>
          <cylinderGeometry args={[0.32, 0.5, HEIGHT, 8]} />
        </mesh>
      ))}
    </group>
  );
}

export function Surroundings({ density, level }: Props) {
  return (
    <>
      <ArrivalQuarter density={density} level={level} />
      <Skyline density={density} level={level} />
      <Plazas level={level} />
      <ElevatedRoutes level={level} />
    </>
  );
}
