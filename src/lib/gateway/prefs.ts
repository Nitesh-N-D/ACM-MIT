/**
 * Per-visitor experience preferences, stored in localStorage.
 * Every access is guarded: storage can be unavailable (private mode,
 * blocked site data) and the site must work without it.
 */

import type { QualityPref } from "./quality";

export const PREF_KEYS = {
  intro: "nexus:intro", // "seen"
  motion: "nexus:motion", // "full" | "reduced"
  quality: "nexus:quality", // QualityPref
} as const;

export type MotionPref = "full" | "reduced";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — preference simply isn't remembered */
  }
}

export const prefs = {
  introSeen: () => read(PREF_KEYS.intro) === "seen",
  markIntroSeen: () => write(PREF_KEYS.intro, "seen"),

  motion(): MotionPref {
    const v = read(PREF_KEYS.motion);
    if (v === "full" || v === "reduced") return v;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "reduced" : "full";
  },
  setMotion: (m: MotionPref) => write(PREF_KEYS.motion, m),

  quality(): QualityPref {
    const v = read(PREF_KEYS.quality);
    return v === "high" || v === "balanced" || v === "low" ? v : "auto";
  },
  setQuality: (q: QualityPref) => write(PREF_KEYS.quality, q === "auto" ? null : q),
};

/**
 * Inline boot script (runs before first paint, in <head>).
 * - Applies the visitor's motion preference to <html data-motion>.
 * - On the home page, marks <html data-intro="play"> when the intro should
 *   run, so hero copy starts hidden instead of flashing then disappearing.
 * - The chapter can switch the intro off for everyone (<html data-site-intro="off">).
 * - Failsafe: if the gateway never takes over (JS error, slow network),
 *   the hero is revealed after 9 s.
 */
export const bootScript = `(function(){try{var d=document.documentElement,s=localStorage,m=s.getItem("${PREF_KEYS.motion}");
var r=m==="reduced"||(m!=="full"&&matchMedia("(prefers-reduced-motion: reduce)").matches);
if(r)d.setAttribute("data-motion","reduced");
var c=navigator.connection;
if(location.pathname==="/"&&!r&&d.getAttribute("data-site-intro")!=="off"&&s.getItem("${PREF_KEYS.intro}")!=="seen"&&!(c&&c.saveData)&&!/[?&]intro=0/.test(location.search)){
d.setAttribute("data-intro","play");setTimeout(function(){if(!window.__nexusGateway)d.removeAttribute("data-intro")},9000);}
}catch(e){}})();`;
