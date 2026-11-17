"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Glow } from "./Glow";
import { SENTINEL_K, SENTINEL_ORIGIN, SWORD, SWORD_HILT, SWORD_SOCKET, swordLift, turned } from "./motion";
import { COLORS, sub, useScene } from "./state";

/**
 * The lock the Sentinel's sword is planted in, and the energy it carries.
 *
 * The blade itself is part of the Sentinel model (its glow is in
 * SentinelModel's shader); this draws what surrounds it: a socket of light in
 * the platform, three rings that turn about the blade like the wards of a
 * lock, and the light the blade casts. Emissive materials and additive glow
 * sprites, no post-processing.
 */
const BLADE = SWORD_HILT.y - SWORD_SOCKET.y;
const RINGS = [
  { r: 0.95, y: 0.16, tilt: 0.16, color: COLORS.ice, metal: "#e8d39a", speed: 1 },
  { r: 0.74, y: 0.42, tilt: -0.22, color: COLORS.cyan, metal: "#c9a85a", speed: -1.35 },
  { r: 0.56, y: 0.66, tilt: 0.28, color: COLORS.violet, metal: "#d8b25e", speed: 1.7 },
] as const;

export function SwordKey() {
  const { ch } = useScene();
  const root = useRef<THREE.Group>(null);
  const rings = useRef<(THREE.Group | null)[]>([]);
  const light = useRef<THREE.PointLight>(null);
  const spin = useRef(0);

  const geo = useMemo(
    () => ({
      socket: new THREE.RingGeometry(0.32, 0.62, 48),
      rune: new THREE.RingGeometry(0.78, 0.86, 64, 1),
      band: RINGS.map((r) => new THREE.TorusGeometry(r.r, 0.035, 4, 96)),
      channel: RINGS.map((r) => new THREE.TorusGeometry(r.r - 0.04, 0.014, 5, 96)),
      node: new THREE.BoxGeometry(0.11, 0.11, 0.09),
    }),
    [],
  );

  const mats = useMemo(
    () => ({
      socket: new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.15, toneMapped: false, depthWrite: false, side: THREE.DoubleSide }),
      rune: new THREE.MeshBasicMaterial({ color: COLORS.ice, transparent: true, opacity: 0, toneMapped: false, depthWrite: false, side: THREE.DoubleSide }),
      band: RINGS.map((r) => new THREE.MeshStandardMaterial({ color: r.metal, emissive: r.color, emissiveIntensity: 0.05, metalness: 0.9, roughness: 0.3, flatShading: true, transparent: true, opacity: 0 })),
      channel: RINGS.map((r) => new THREE.MeshBasicMaterial({ color: r.color, transparent: true, opacity: 0, toneMapped: false })),
    }),
    [],
  );

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const c = ch.crystal;
    const flash = Math.sin(Math.PI * ch.pulse);
    const k = turned(ch);

    // The rings and the socket follow the blade as it is driven home and turned.
    if (root.current) {
      root.current.position.set(SWORD_SOCKET.x, SWORD_SOCKET.y - SWORD.sink * k * SENTINEL_K, SWORD_SOCKET.z);
      root.current.rotation.y = -SWORD.turn * k;
    }
    mats.socket.opacity = 0.15 + 0.55 * c + 0.3 * flash;
    mats.rune.opacity = (0.25 + 0.6 * k) * c * (0.8 + 0.2 * Math.sin(t * 2.2)) + flash * 0.3;

    // Rings appear as the blade charges, then spin up about it, slowly
    // levelling as the key is turned.
    spin.current += dt * (0.12 + ch.rings * 1.3);
    rings.current.forEach((g, i) => {
      if (!g) return;
      const r = RINGS[i]!;
      g.rotation.set(r.tilt * (1 - 0.7 * k) + Math.sin(spin.current * 0.4 + i * 2.1) * 0.12 * ch.rings, spin.current * r.speed, 0);
      const shown = sub(ch.rings, i * 0.15, 0.6 + i * 0.15);
      mats.band[i]!.opacity = Math.min(1, shown * 1.4);
      mats.band[i]!.emissiveIntensity = 0.05 + 0.6 * ch.rings;
      mats.channel[i]!.opacity = shown * (0.85 + 0.15 * Math.sin(t * 2.4 + i));
    });

    if (light.current) light.current.intensity = c * 22 + flash * 60;
  });

  return (
    <group ref={root} position={SWORD_SOCKET}>
      <pointLight ref={light} position={[0, BLADE * 0.45, 0.5]} color={COLORS.cyan} intensity={0} distance={14} decay={2} />

      {/* The socket and its warding circle, flush with the platform. */}
      <mesh geometry={geo.socket} material={mats.socket} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} />
      <mesh geometry={geo.rune} material={mats.rune} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]} />

      {RINGS.map((r, i) => (
        <group key={i} position={[0, BLADE * r.y, 0]}>
          <group ref={(g) => void (rings.current[i] = g)}>
            <group rotation={[Math.PI / 2, 0, 0]}>
              <mesh geometry={geo.band[i]} material={mats.band[i]} />
              <mesh geometry={geo.channel[i]} material={mats.channel[i]} />
              {[0, Math.PI].map((a) => (
                <mesh key={a} geometry={geo.node} material={mats.band[i]} position={[Math.cos(a) * r.r, Math.sin(a) * r.r, 0]} rotation={[0, 0, a]} />
              ))}
            </group>
          </group>
        </group>
      ))}

      {/* Light along the blade and a flare where it meets the lock. */}
      {[0.2, 0.5, 0.8].map((y) => (
        <Glow key={y} position={[0, BLADE * y, 0]} size={1.6} color={COLORS.cyan} intensity={(t) => ch.crystal * (0.3 + 0.1 * Math.sin(t * 2.2 + y * 6)) + Math.sin(Math.PI * ch.pulse) * 0.6} />
      ))}
      <Glow position={[0, 0.15, 0]} size={2.8} color={COLORS.electric} intensity={() => ch.crystal * 0.35 + Math.sin(Math.PI * ch.pulse) * 0.9} />
    </group>
  );
}

/**
 * A plain greatsword built from primitives, planted like the model's, for the
 * fallback Sentinel (low tier, or while the model loads). Sentinel-local
 * coordinates (origin at his feet).
 */
export function ProceduralSword() {
  const { ch } = useScene();
  const group = useRef<THREE.Group>(null);
  const blade = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#c9d6ea", emissive: COLORS.cyan, emissiveIntensity: 0.1, metalness: 0.95, roughness: 0.2, flatShading: true }),
    [],
  );
  const gold = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c9a24f", metalness: 1, roughness: 0.3 }), []);
  const grip = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2a1d14", metalness: 0.2, roughness: 0.7 }), []);
  const len = BLADE;
  const socketY = SWORD_SOCKET.y - 0.3;

  useFrame(() => {
    const k = turned(ch);
    blade.emissiveIntensity = 0.1 + 1.4 * ch.crystal + 2 * Math.sin(Math.PI * ch.pulse);
    if (group.current) {
      group.current.position.y = socketY + swordLift(ch) * SENTINEL_K;
      group.current.rotation.y = -SWORD.turn * k;
    }
  });

  return (
    <group ref={group} position={[0, socketY, SWORD_SOCKET.z - SENTINEL_ORIGIN.z]}>
      <mesh material={blade} position={[0, len * 0.4, 0]} scale={[0.3, len * 0.8, 0.05]}>
        <boxGeometry />
      </mesh>
      <mesh material={gold} position={[0, len * 0.82, 0]} scale={[1.2, 0.14, 0.2]}>
        <boxGeometry />
      </mesh>
      <mesh material={grip} position={[0, len * 0.95, 0]} scale={[0.1, len * 0.2, 0.1]}>
        <cylinderGeometry args={[1, 1, 1, 10]} />
      </mesh>
      <mesh material={gold} position={[0, len * 1.08, 0]}>
        <sphereGeometry args={[0.14, 12, 10]} />
      </mesh>
    </group>
  );
}
