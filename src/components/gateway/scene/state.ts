import { createContext, useContext } from "react";
import type { TierSettings } from "@/lib/gateway/quality";

/**
 * Mutable animation channels (0..1) written by the GSAP director and read
 * every frame by scene components. Plain numbers, no React re-renders.
 */
export type Channels = {
  stars: number;
  camA: number; // void → close-up of the Sentinel
  camB: number; // close-up → final hero framing
  gate: number;
  visor: number;
  platform: number;
  crystal: number;
  rings: number;
  lift: number;
  pulse: number; // transient flash: effect = sin(pi * pulse)
  seam: number;
  doors: number;
  flood: number;
  bridge: number;
  city: number;
  frame: number; // blend toward the off-centre hero framing
};

export const START: Channels = {
  stars: 0, camA: 0, camB: 0, gate: 0, visor: 0, platform: 0, crystal: 0, rings: 0,
  lift: 0, pulse: 0, seam: 0, doors: 0, flood: 0, bridge: 0, city: 0, frame: 0,
};

export const FINAL: Channels = {
  stars: 1, camA: 1, camB: 1, gate: 1, visor: 1, platform: 1, crystal: 1, rings: 1,
  lift: 1, pulse: 1, seam: 1, doors: 1, flood: 1, bridge: 1, city: 1, frame: 1,
};

export type SceneContext = { ch: Channels; tier: TierSettings };

export const SceneCtx = createContext<SceneContext | null>(null);

export function useScene(): SceneContext {
  const ctx = useContext(SceneCtx);
  if (!ctx) throw new Error("useScene must be used inside the gateway canvas");
  return ctx;
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Remaps channel v so that it runs 0→1 over [a, b]. */
export const sub = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));

export const COLORS = {
  void: "#03050d",
  fog: "#060b1d",
  cyan: "#3fe4ff",
  electric: "#2f6bff",
  violet: "#8a6bff",
  ice: "#eef4ff",
  gold: "#d8b25e",
} as const;
