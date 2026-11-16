"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { territories } from "@/config/territories";
import { Glow } from "./Glow";
import { GATE_Z } from "./Gate";
import { rng, windowsTexture } from "./textures";
import { COLORS, sub, useScene } from "./state";

/* ---------------------------------------------------------------------------
 * Energy bridge — shader-driven ribbon from the platform into the city.
 * ------------------------------------------------------------------------- */

const BRIDGE_START = -6.8;
const BRIDGE_END = -96;
const BRIDGE_LEN = BRIDGE_START - BRIDGE_END;

const bridgeVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const bridgeFrag = /* glsl */ `
  uniform float uProgress;
  uniform float uTime;
  uniform vec3 uCore;
  uniform vec3 uEdge;
  varying vec2 vUv;
  void main() {
    float along = vUv.y;                       // 0 at platform, 1 in the city
    if (along > uProgress) discard;
    float across = abs(vUv.x - 0.5) * 2.0;     // 0 centre, 1 edge
    float core = smoothstep(0.35, 0.0, across);
    float edge = smoothstep(0.75, 0.98, across) * (1.0 - smoothstep(0.98, 1.0, across));
    float flow = 0.5 + 0.5 * sin((along * 160.0) - uTime * 6.0);
    float head = smoothstep(uProgress - 0.04, uProgress, along);
    float fade = 1.0 - smoothstep(0.55, 1.0, along);
    vec3 col = uCore * (core * (0.55 + 0.45 * flow)) + uEdge * edge * 1.4 + vec3(1.0) * head * 1.5;
    float a = (core * 0.85 + edge + head) * (0.35 + 0.65 * fade);
    gl_FragColor = vec4(col, a);
  }
`;

export function Bridge() {
  const { ch } = useScene();
  const spark = useRef<THREE.Group>(null);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: bridgeVert,
        fragmentShader: bridgeFrag,
        uniforms: {
          uProgress: { value: 0 },
          uTime: { value: 0 },
          uCore: { value: new THREE.Color(COLORS.cyan) },
          uEdge: { value: new THREE.Color(COLORS.electric) },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );
  const geometry = useMemo(() => new THREE.PlaneGeometry(1.8, BRIDGE_LEN, 1, 1), []);

  useFrame(({ clock }) => {
    const p = ch.bridge;
    material.uniforms.uProgress!.value = p;
    material.uniforms.uTime!.value = clock.elapsedTime;
    if (spark.current) {
      spark.current.position.z = BRIDGE_START - p * BRIDGE_LEN;
      spark.current.visible = p > 0.001 && p < 0.999;
    }
  });

  return (
    <group>
      {/* Plane is rotated so uv.y runs from the platform (0) into the city (1). */}
      <mesh
        geometry={geometry}
        material={material}
        rotation={[-Math.PI / 2, 0, Math.PI]}
        position={[0, 0.04, BRIDGE_START - BRIDGE_LEN / 2]}
        renderOrder={4}
        frustumCulled={false}
      />
      <group ref={spark} position={[0, 0.4, BRIDGE_START]}>
        <Glow size={3.5} color={COLORS.ice} intensity={() => 1} />
      </group>
    </group>
  );
}

/* ---------------------------------------------------------------------------
 * The city beyond the gate — instanced towers + six territory beacons.
 * ------------------------------------------------------------------------- */

/** Beacon positions for the six territories (Phase 4 builds districts here). */
export const BEACONS: Record<string, [number, number]> = {
  core: [0, -70],
  intelligence: [-34, -54],
  frontier: [34, -54],
  colosseum: [-52, -96],
  vault: [52, -96],
  sanctuary: [0, -124],
};

export function City() {
  const { ch, tier } = useScene();
  const mesh = useRef<THREE.InstancedMesh>(null);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#0a1330",
        emissive: "#ffffff",
        emissiveMap: windowsTexture(),
        emissiveIntensity: 0,
        metalness: 0.5,
        roughness: 0.55,
      }),
    [],
  );
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), []);

  const count = tier.towers;
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const r = rng(101);
    const o = new THREE.Object3D();
    let i = 0;
    let guard = 0;
    while (i < count && guard++ < count * 20) {
      const x = (r() * 2 - 1) * 78;
      const z = GATE_Z - 14 - r() * 125;
      // Keep the central avenue (bridge) and beacon plazas clear.
      if (Math.abs(x) < 5.5) continue;
      if (Object.values(BEACONS).some(([bx, bz]) => Math.hypot(x - bx, z - bz) < 7)) continue;
      const dist = Math.min(1, (GATE_Z - z) / 120);
      const w = 2 + r() * 3.5;
      const h = 3 + Math.pow(r(), 2.2) * (10 + dist * 46);
      o.position.set(x, -0.6, z);
      o.scale.set(w, h, 2 + r() * 3.5);
      o.rotation.y = r() < 0.2 ? Math.PI / 4 : 0;
      o.updateMatrix();
      m.setMatrixAt(i++, o.matrix);
    }
    m.count = i;
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [count]);

  useFrame(({ clock }) => {
    material.emissiveIntensity = sub(ch.city, 0, 0.8) * (1.15 + 0.08 * Math.sin(clock.elapsedTime * 0.7));
  });

  return (
    <group>
      <instancedMesh ref={mesh} args={[box, material, count]} />
      {territories.map((t, i) => {
        const pos = BEACONS[t.id];
        return pos ? <Beacon key={t.id} x={pos[0]} z={pos[1]} color={t.accent} order={i} tall={t.id === "core"} /> : null;
      })}
    </group>
  );
}

function Beacon({ x, z, color, order, tall }: { x: number; z: number; color: string; order: number; tall: boolean }) {
  const { ch } = useScene();
  const beam = useRef<THREE.MeshBasicMaterial>(null);
  const h = tall ? 52 : 30 + order * 2;
  const geo = useMemo(
    () => ({
      spire: new THREE.CylinderGeometry(0.4, 3.2, h, 6, 1),
      beam: new THREE.CylinderGeometry(0.18, 0.18, 120, 6, 1, true),
    }),
    [h],
  );
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#0d1838", metalness: 0.7, roughness: 0.35, flatShading: true }), []);
  const on = () => sub(ch.city, 0.15 + order * 0.1, 0.55 + order * 0.08);

  useFrame(({ clock }) => {
    if (beam.current) beam.current.opacity = on() * (0.35 + 0.15 * Math.sin(clock.elapsedTime * 1.2 + order));
  });

  return (
    <group position={[x, -0.6, z]}>
      <mesh geometry={geo.spire} position={[0, h / 2, 0]} material={mat} />
      <mesh geometry={geo.beam} position={[0, h + 60, 0]}>
        <meshBasicMaterial ref={beam} color={color} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} />
      </mesh>
      <Glow position={[0, h + 0.5, 0]} size={tall ? 14 : 9} color={color} intensity={(t) => on() * (0.85 + 0.15 * Math.sin(t * 2 + order))} />
    </group>
  );
}

/* ---------------------------------------------------------------------------
 * Ground — a single shader plane with a fading grid.
 * ------------------------------------------------------------------------- */

const groundFrag = /* glsl */ `
  uniform float uGlow;
  varying vec3 vWorld;
  void main() {
    vec2 g = abs(fract(vWorld.xz / 4.0 - 0.5) - 0.5) / fwidth(vWorld.xz / 4.0);
    float line = 1.0 - min(min(g.x, g.y), 1.0);
    float d = length(vWorld.xz - vec2(0.0, -20.0));
    float fade = 1.0 - smoothstep(20.0, 120.0, d);
    vec3 base = vec3(0.012, 0.02, 0.05);
    vec3 col = base + vec3(0.15, 0.6, 0.9) * line * fade * (0.12 + uGlow * 0.3);
    gl_FragColor = vec4(col, 1.0);
  }
`;
const groundVert = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

export function Ground() {
  const { ch } = useScene();
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: groundVert,
        fragmentShader: groundFrag,
        uniforms: { uGlow: { value: 0 } },
      }),
    [],
  );
  useFrame(() => {
    material.uniforms.uGlow!.value = Math.max(ch.platform * 0.4, ch.city);
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.61, -60]} material={material}>
      <planeGeometry args={[320, 320]} />
    </mesh>
  );
}
