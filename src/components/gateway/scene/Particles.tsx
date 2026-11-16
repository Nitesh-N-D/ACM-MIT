"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { rng } from "./textures";
import { sub, useScene } from "./state";

/* ---------------------------------------------------------------------------
 * Starfield — one draw call; twinkle computed in the vertex shader.
 * ------------------------------------------------------------------------- */

const starVert = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vTw;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * (260.0 / -mv.z);
    vTw = 0.55 + 0.45 * sin(uTime * (0.6 + fract(aPhase) * 1.6) + aPhase * 6.2831);
  }
`;
const starFrag = /* glsl */ `
  uniform float uOpacity;
  varying float vTw;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vec3(0.86, 0.92, 1.0), a * vTw * uOpacity);
  }
`;

export function Starfield() {
  const { ch, tier } = useScene();
  const dpr = useThree((s) => s.viewport.dpr);
  const ref = useRef<THREE.Points>(null);

  const [geometry, material] = useMemo(() => {
    const r = rng(19);
    const n = tier.stars;
    const pos = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const phase = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      // Shell around the scene, biased to the upper hemisphere.
      const u = r() * 2 - 1;
      const t = r() * Math.PI * 2;
      const rad = 160 + r() * 260;
      const s = Math.sqrt(1 - u * u);
      pos[i * 3] = rad * s * Math.cos(t);
      pos[i * 3 + 1] = Math.abs(rad * u) * 0.9 - 20;
      pos[i * 3 + 2] = rad * s * Math.sin(t);
      size[i] = r() < 0.04 ? 3.2 + r() * 2 : 0.8 + r() * 1.6;
      phase[i] = r();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    g.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: starVert,
      fragmentShader: starFrag,
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uPixelRatio: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return [g, m] as const;
  }, [tier.stars]);

  useFrame(({ clock }) => {
    const u = material.uniforms;
    u.uTime!.value = clock.elapsedTime;
    u.uOpacity!.value = ch.stars;
    u.uPixelRatio!.value = dpr;
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.004;
  });

  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} />;
}

/* ---------------------------------------------------------------------------
 * Motes — energy particles rising from the resonance platform.
 * Motion is entirely in the shader (no per-frame CPU work).
 * ------------------------------------------------------------------------- */

const moteVert = /* glsl */ `
  attribute float aSpeed;
  uniform float uTime;
  uniform float uHeight;
  uniform float uPixelRatio;
  varying float vFade;
  void main() {
    vec3 p = position;
    p.y = mod(p.y + uTime * aSpeed, uHeight);
    p.x += sin(uTime * 0.6 + position.z) * 0.25;
    vFade = smoothstep(0.0, 1.2, p.y) * (1.0 - smoothstep(uHeight * 0.55, uHeight, p.y));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (2.0 + aSpeed * 2.4) * uPixelRatio * (24.0 / -mv.z);
  }
`;
const moteFrag = /* glsl */ `
  uniform float uOpacity;
  uniform vec3 uColor;
  varying float vFade;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor, a * vFade * uOpacity);
  }
`;

export function Motes() {
  const { ch, tier } = useScene();
  const dpr = useThree((s) => s.viewport.dpr);

  const [geometry, material] = useMemo(() => {
    const r = rng(53);
    const n = tier.motes;
    const pos = new Float32Array(n * 3);
    const speed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2;
      const rad = 1 + Math.sqrt(r()) * 8;
      pos[i * 3] = Math.cos(a) * rad;
      pos[i * 3 + 1] = r() * 14;
      pos[i * 3 + 2] = Math.sin(a) * rad - 1.5;
      speed[i] = 0.25 + r() * 0.9;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSpeed", new THREE.BufferAttribute(speed, 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: moteVert,
      fragmentShader: moteFrag,
      uniforms: {
        uTime: { value: 0 },
        uHeight: { value: 14 },
        uOpacity: { value: 0 },
        uPixelRatio: { value: 1 },
        uColor: { value: new THREE.Color("#7fefff") },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return [g, m] as const;
  }, [tier.motes]);

  useFrame(({ clock }) => {
    const u = material.uniforms;
    u.uTime!.value = clock.elapsedTime;
    u.uOpacity!.value = sub(ch.platform, 0.3, 1) * 0.9;
    u.uPixelRatio!.value = dpr;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
