"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { rng, windowsTexture } from "@/components/gateway/scene/textures";
import { AVENUE_HALF_WIDTH, CHASM, CITY_DEPTH, CITY_EDGE, CITY_HALF_WIDTH, DISTRICT_CLEARANCE, DISTRICT_POS, GROUND_Y } from "./layout";
import type { TerritoryId } from "@/config/territories";

/* ---------------------------------------------------------------------------
 * Generic city fabric: instanced towers with setbacks and rooftop masts.
 * Two draw calls regardless of tower count.
 * ------------------------------------------------------------------------- */

export function CityBlocks({ count, level }: { count: number; level: () => number }) {
  const towers = useRef<THREE.InstancedMesh>(null);
  const masts = useRef<THREE.InstancedMesh>(null);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#0a1330",
        emissive: "#ffffff",
        emissiveMap: windowsTexture(),
        emissiveIntensity: 0,
        metalness: 0.55,
        roughness: 0.5,
      }),
    [],
  );
  const mastMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#44547f", metalness: 0.9, roughness: 0.3 }), []);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), []);

  // Each tower may add a setback tier, so reserve two instances per tower.
  const capacity = count * 2;

  useLayoutEffect(() => {
    const m = towers.current;
    const a = masts.current;
    if (!m || !a) return;
    const r = rng(101);
    const o = new THREE.Object3D();
    const districts = Object.entries(DISTRICT_POS) as [TerritoryId, [number, number]][];
    let placed = 0;
    let i = 0;
    let j = 0;
    let guard = 0;
    while (placed < count && guard++ < count * 30) {
      const x = (r() * 2 - 1) * CITY_HALF_WIDTH;
      const z = CITY_EDGE - r() * CITY_DEPTH;
      if (Math.abs(x) < AVENUE_HALF_WIDTH) continue;
      // Keep the corridor under the elevated ring road around the Core clear.
      if (Math.abs(Math.hypot(x - DISTRICT_POS.core[0], z - DISTRICT_POS.core[1]) - (DISTRICT_CLEARANCE.core + 14)) < 4.5) continue;
      if (districts.some(([id, [bx, bz]]) => Math.hypot(x - bx, z - bz) < DISTRICT_CLEARANCE[id] + 3)) continue;
      const dist = Math.min(1, (CHASM.far - z) / CITY_DEPTH);
      const w = 2.2 + r() * 3.6;
      const d = 2.2 + r() * 3.6;
      const h = 3 + Math.pow(r(), 2.2) * (12 + dist * 44);
      const rot = r() < 0.2 ? Math.PI / 4 : 0;
      o.position.set(x, GROUND_Y, z);
      o.scale.set(w, h, d);
      o.rotation.y = rot;
      o.updateMatrix();
      m.setMatrixAt(i++, o.matrix);
      placed++;
      if (h > 15) {
        const th = h * (0.18 + r() * 0.22);
        o.position.set(x, GROUND_Y + h, z);
        o.scale.set(w * 0.62, th, d * 0.62);
        o.updateMatrix();
        m.setMatrixAt(i++, o.matrix);
        if (h > 24 && j < count) {
          o.position.set(x, GROUND_Y + h + th, z);
          o.scale.set(0.14, 3 + r() * 6, 0.14);
          o.updateMatrix();
          a.setMatrixAt(j++, o.matrix);
        }
      }
    }
    m.count = i;
    a.count = j;
    m.instanceMatrix.needsUpdate = true;
    a.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    a.computeBoundingSphere();
  }, [count]);

  useFrame(({ clock }) => {
    material.emissiveIntensity = level() * (1.15 + 0.08 * Math.sin(clock.elapsedTime * 0.7));
  });

  return (
    <>
      <instancedMesh ref={towers} args={[box, material, capacity]} />
      <instancedMesh ref={masts} args={[box, mastMat, count]} />
    </>
  );
}

/* ---------------------------------------------------------------------------
 * Ground: two shader planes with a fading grid, split by the chasm, plus the
 * chasm walls glowing faintly at their rim.
 * ------------------------------------------------------------------------- */

const groundVert = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const groundFrag = /* glsl */ `
  uniform float uGlow;
  uniform vec2 uCentre;
  uniform vec2 uChasm;
  varying vec3 vWorld;
  void main() {
    vec2 g = abs(fract(vWorld.xz / 4.0 - 0.5) - 0.5) / fwidth(vWorld.xz / 4.0);
    float line = 1.0 - min(min(g.x, g.y), 1.0);
    float d = length(vWorld.xz - uCentre);
    float fade = 1.0 - smoothstep(20.0, 120.0, d);
    float rim = exp(-abs(vWorld.z - uChasm.x) * 1.4) + exp(-abs(vWorld.z - uChasm.y) * 1.4);
    vec3 base = vec3(0.012, 0.02, 0.05);
    vec3 col = base + vec3(0.15, 0.6, 0.9) * (line * fade * (0.12 + uGlow * 0.3) + rim * (0.05 + uGlow * 0.3));
    gl_FragColor = vec4(col, 1.0);
  }
`;
const wallFrag = /* glsl */ `
  uniform float uGlow;
  varying vec3 vWorld;
  void main() {
    float depth = clamp(-(vWorld.y + 0.6) / 26.0, 0.0, 1.0);
    float strata = 0.5 + 0.5 * sin(vWorld.y * 2.2 + sin(vWorld.x * 0.21) * 1.5);
    float ribs = smoothstep(0.92, 1.0, abs(sin(vWorld.x * 0.26)));
    vec3 rock = vec3(0.02, 0.032, 0.075) * (0.55 + 0.45 * strata) + vec3(0.03, 0.05, 0.1) * ribs;
    vec3 glow = vec3(0.1, 0.55, 0.85) * exp(-depth * 9.0) * (0.12 + uGlow * 0.5);
    vec3 col = mix(rock + glow, vec3(0.006, 0.01, 0.026), smoothstep(0.0, 1.0, depth));
    gl_FragColor = vec4(col, 1.0);
  }
`;

const DEFAULT_CENTRE: [number, number] = [0, -20];

export function Ground({ glow, centre = DEFAULT_CENTRE, chasm = true }: { glow: () => number; centre?: [number, number]; chasm?: boolean }) {
  const mats = useMemo(() => {
    const uGlow = { value: 0 };
    return {
      uGlow,
      ground: new THREE.ShaderMaterial({
        vertexShader: groundVert,
        fragmentShader: groundFrag,
        uniforms: {
          uGlow,
          uCentre: { value: new THREE.Vector2(centre[0], centre[1]) },
          uChasm: { value: new THREE.Vector2(chasm ? CHASM.near : 9999, chasm ? CHASM.far : 9999) },
        },
      }),
      wall: new THREE.ShaderMaterial({ vertexShader: groundVert, fragmentShader: wallFrag, uniforms: { uGlow } }),
    };
  }, [centre, chasm]);

  useFrame(() => {
    mats.uGlow.value = glow();
  });

  if (!chasm) {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y - 0.01, -60]} material={mats.ground}>
        <planeGeometry args={[360, 360]} />
      </mesh>
    );
  }

  const nearDepth = 100 - CHASM.near;
  const farDepth = CHASM.far + 220;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y - 0.01, CHASM.near + nearDepth / 2]} material={mats.ground}>
        <planeGeometry args={[320, nearDepth]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y - 0.01, CHASM.far - farDepth / 2]} material={mats.ground}>
        <planeGeometry args={[320, farDepth]} />
      </mesh>
      {/* Chasm walls: near wall faces the city, far wall faces the gateway. */}
      <mesh rotation={[0, Math.PI, 0]} position={[0, GROUND_Y - 30, CHASM.near]} material={mats.wall}>
        <planeGeometry args={[320, 60]} />
      </mesh>
      <mesh position={[0, GROUND_Y - 30, CHASM.far]} material={mats.wall}>
        <planeGeometry args={[320, 60]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y - 60, (CHASM.near + CHASM.far) / 2]}>
        <planeGeometry args={[320, CHASM.near - CHASM.far]} />
        <meshBasicMaterial color="#01030a" fog={false} />
      </mesh>
    </group>
  );
}
