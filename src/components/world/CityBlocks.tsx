"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { CHASM, GROUND_Y } from "./layout";
import { ROAD_GLSL } from "./streets";

/* ---------------------------------------------------------------------------
 * Ground: two shader planes split by the chasm. Inside the built-up area
 * they carry the asphalt of the street grid (lane markings, zebra crossings,
 * lamp pools); beyond it a survey grid fades into the dark. The chasm walls
 * glow faintly at their rim. The buildings themselves live in Fabric.tsx.
 * ------------------------------------------------------------------------- */

const groundVert = /* glsl */ `
  #include <fog_pars_vertex>
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vec4 mvPosition = viewMatrix * w;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;
const groundFrag = /* glsl */ `
  #include <fog_pars_fragment>
  uniform float uGlow;
  uniform float uArrival;
  uniform vec2 uCentre;
  uniform vec2 uChasm;
  varying vec3 vWorld;
  ${ROAD_GLSL}
  void main() {
    vec4 s = street(vWorld.xz, uArrival);
    vec3 col;
    if (s.a > 0.5) {
      col = s.rgb;
    } else {
      vec2 g = abs(fract(vWorld.xz / 4.0 - 0.5) - 0.5) / fwidth(vWorld.xz / 4.0);
      float line = 1.0 - min(min(g.x, g.y), 1.0);
      float d = length(vWorld.xz - uCentre);
      float fade = 1.0 - smoothstep(20.0, 120.0, d);
      vec3 base = vec3(0.012, 0.02, 0.05);
      col = base + vec3(0.15, 0.6, 0.9) * line * fade * (0.12 + uGlow * 0.3);
    }
    float rim = exp(-abs(vWorld.z - uChasm.x) * 1.4) + exp(-abs(vWorld.z - uChasm.y) * 1.4);
    col += vec3(0.15, 0.6, 0.9) * rim * (0.05 + uGlow * 0.3);
    gl_FragColor = vec4(col, 1.0);
    #include <fog_fragment>
  }
`;
const wallVert = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
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

type GroundProps = {
  glow: () => number;
  centre?: [number, number];
  chasm?: boolean;
  /** Pave the arrival quarter on the near side of the chasm as well. */
  arrival?: boolean;
};

export function Ground({ glow, centre = DEFAULT_CENTRE, chasm = true, arrival = false }: GroundProps) {
  const mats = useMemo(() => {
    const uGlow = { value: 0 };
    return {
      uGlow,
      ground: new THREE.ShaderMaterial({
        vertexShader: groundVert,
        fragmentShader: groundFrag,
        fog: true,
        uniforms: {
          ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
          uGlow,
          uArrival: { value: arrival ? 1 : 0 },
          uCentre: { value: new THREE.Vector2(centre[0], centre[1]) },
          uChasm: { value: new THREE.Vector2(chasm ? CHASM.near : 9999, chasm ? CHASM.far : 9999) },
        },
      }),
      wall: new THREE.ShaderMaterial({ vertexShader: wallVert, fragmentShader: wallFrag, uniforms: { uGlow } }),
    };
  }, [centre, chasm, arrival]);

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

  const nearDepth = 120 - CHASM.near;
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
