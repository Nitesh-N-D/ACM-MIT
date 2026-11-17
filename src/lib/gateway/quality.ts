/**
 * Adaptive quality tiers for the NEXUS Gateway.
 *
 * Detection is heuristic and conservative: when unsure, pick the cheaper
 * tier. The user can always override it from the gateway controls.
 */

export type Tier = "high" | "balanced" | "low" | "fallback";
export type QualityPref = "auto" | Exclude<Tier, "fallback">;

export type TierSettings = {
  dpr: [number, number];
  antialias: boolean;
  stars: number;
  motes: number;
  /** City fabric detail: 0 bare volumes, 1 cornices and roof plant, 2 full. */
  detail: 0 | 1 | 2;
  /** Procedural environment map for metallic reflections. */
  environment: boolean;
  /** Ambient frame-rate cap after the intro (0 = uncapped). */
  ambientFps: number;
  /** Most pedestrians in the free-exploration city. */
  people: number;
};

export const TIERS: Record<Exclude<Tier, "fallback">, TierSettings> = {
  high: { dpr: [1, 2], antialias: true, stars: 5000, motes: 520, detail: 2, environment: true, ambientFps: 0, people: 900 },
  balanced: { dpr: [1, 1.5], antialias: true, stars: 3000, motes: 300, detail: 2, environment: true, ambientFps: 0, people: 600 },
  low: { dpr: [1, 1], antialias: false, stars: 1400, motes: 110, detail: 1, environment: false, ambientFps: 30, people: 220 },
};

export const TIER_LABEL: Record<Tier, string> = {
  high: "High",
  balanced: "Balanced",
  low: "Low",
  fallback: "Static",
};

type NavigatorExtras = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

/** Detects the best tier for this device. Client-only. */
export function detectTier(): Tier {
  if (typeof window === "undefined") return "fallback";

  // Debug / QA override: ?gateway=high|balanced|low|fallback
  const forced = new URLSearchParams(window.location.search).get("gateway");
  if (forced === "high" || forced === "balanced" || forced === "low" || forced === "fallback") return forced;

  let renderer = "";
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) return "fallback";
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    if (info) renderer = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    return "fallback";
  }

  // Software rasterisers cannot run the scene smoothly.
  if (/swiftshader|llvmpipe|software|basic render/i.test(renderer)) return "fallback";

  const nav = navigator as NavigatorExtras;
  if (nav.connection?.saveData) return "low";

  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = window.innerWidth < 768;

  if (coarse || small || cores <= 4 || memory <= 2) return "low";
  if (/nvidia|geforce|rtx|radeon rx|apple m\d/i.test(renderer) && cores >= 8 && memory >= 8) return "high";
  return "balanced";
}

export function resolveTier(pref: QualityPref, detected: Tier): Tier {
  if (detected === "fallback") return "fallback";
  return pref === "auto" ? detected : pref;
}
