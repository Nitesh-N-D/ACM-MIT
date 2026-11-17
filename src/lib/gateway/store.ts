"use client";

import { useSyncExternalStore } from "react";
import { readViewMode } from "@/lib/view-mode";
import { prefs, type MotionPref } from "./prefs";
import { detectTier, resolveTier, type QualityPref, type Tier } from "./quality";

/**
 * Tiny external store shared by the gateway stage, the 3D canvas and the
 * hero controls (they live in different subtrees of a server component).
 */

export type GatewayPhase = "boot" | "intro" | "complete";

export type GatewayState = {
  phase: GatewayPhase;
  step: number;
  /** "3d" renders the WebGL scene; "static" renders the SVG art. */
  mode: "3d" | "static";
  detected: Tier;
  quality: QualityPref;
  tier: Tier;
  motion: MotionPref;
  /** Canvas has compiled and drawn its first frame. */
  ready: boolean;
  /** The intro is holding: the Sentinel waits, sword raised, for the visitor. */
  waiting: boolean;
  /** The visitor has given the word; the sword is struck into the lock. */
  struck: boolean;
  /** Incremented to request skip / replay from the scene director. */
  skipToken: number;
  replayToken: number;
};

const initial: GatewayState = {
  phase: "boot",
  step: 0,
  mode: "static",
  detected: "fallback",
  quality: "auto",
  tier: "fallback",
  motion: "full",
  ready: false,
  waiting: false,
  struck: false,
  skipToken: 0,
  replayToken: 0,
};

let state = initial;
const listeners = new Set<() => void>();

function set(patch: Partial<GatewayState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function html() {
  return document.documentElement;
}

function reveal() {
  html().removeAttribute("data-intro");
}

declare global {
  interface Window {
    __nexusGateway?: boolean;
  }
}

export const gateway = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },

  /** Decide mode/tier/phase once on the client. */
  boot() {
    if (state.phase !== "boot") return;
    window.__nexusGateway = true;
    const motion = prefs.motion();
    const quality = prefs.quality();
    const detected = detectTier();
    const tier = resolveTier(quality, detected);
    const wantsIntro = html().getAttribute("data-intro") === "play";
    const mode = tier === "fallback" || motion === "reduced" || readViewMode() === "2d" ? "static" : "3d";
    const phase: GatewayPhase = mode === "3d" && wantsIntro ? "intro" : "complete";
    if (phase === "complete") reveal();
    set({ motion, quality, detected, tier, mode, phase, step: phase === "complete" ? 14 : 0 });
  },

  setStep: (step: number) => set({ step }),
  setReady: (ready: boolean) => set({ ready }),

  /** The director reached the strike: hold until the visitor gives the word. */
  hold() {
    if (state.phase === "intro" && !state.struck) set({ waiting: true });
  },

  /** Enter (or the Strike button): drive the sword home and play on. */
  strike() {
    if (state.phase !== "intro" || state.struck || !state.waiting) return;
    set({ struck: true, waiting: false });
  },

  complete() {
    reveal();
    prefs.markIntroSeen();
    set({ phase: "complete", step: 14, waiting: false, struck: true });
  },

  skip() {
    if (state.phase !== "intro") return;
    // If the scene isn't up yet there is nothing to fast-forward.
    if (!state.ready) gateway.complete();
    else set({ skipToken: state.skipToken + 1 });
  },

  replay() {
    if (state.mode !== "3d") return;
    html().setAttribute("data-intro", "play");
    set({ phase: "intro", step: 0, waiting: false, struck: false, replayToken: state.replayToken + 1 });
  },

  /** 3D failed (no context, import error, timeout): fall back to static art. */
  fail() {
    reveal();
    set({ mode: "static", tier: "fallback", phase: "complete", ready: false, waiting: false });
  },

  setMotion(motion: MotionPref) {
    prefs.setMotion(motion);
    if (motion === "reduced") html().setAttribute("data-motion", "reduced");
    else html().removeAttribute("data-motion");
    const mode = motion === "reduced" || state.tier === "fallback" ? "static" : "3d";
    if (mode === "static") reveal();
    set({
      motion,
      mode,
      phase: mode === "static" ? "complete" : state.phase,
      waiting: mode === "static" ? false : state.waiting,
      step: 14,
      ready: mode === state.mode ? state.ready : false,
    });
  },

  setQuality(quality: QualityPref) {
    prefs.setQuality(quality);
    const tier = resolveTier(quality, state.detected);
    const mode = tier === "fallback" || state.motion === "reduced" ? "static" : "3d";
    // Only a real tier change remounts the canvas (and must re-signal ready).
    set({ quality, tier, mode, ready: tier === state.tier && mode === state.mode ? state.ready : false });
  },
};

export function useGateway<T>(selector: (s: GatewayState) => T): T {
  return useSyncExternalStore(
    gateway.subscribe,
    () => selector(state),
    () => selector(initial),
  );
}
