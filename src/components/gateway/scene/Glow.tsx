"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { glowTexture } from "./textures";

type GlowProps = {
  position?: [number, number, number];
  size: number;
  color: string;
  /** Called each frame; returns opacity 0..1. */
  intensity: (t: number) => number;
};

/** Additive glow sprite — a cheap substitute for bloom post-processing. */
export function Glow({ position, size, color, intensity }: GlowProps) {
  const mat = useRef<THREE.SpriteMaterial>(null);
  const spr = useRef<THREE.Sprite>(null);
  useFrame(({ clock }) => {
    const o = intensity(clock.elapsedTime);
    if (mat.current) mat.current.opacity = o;
    if (spr.current) spr.current.visible = o > 0.003;
  });
  return (
    <sprite ref={spr} position={position} scale={[size, size, 1]} renderOrder={10}>
      <spriteMaterial
        ref={mat}
        map={glowTexture()}
        color={color}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
        fog={false}
      />
    </sprite>
  );
}
