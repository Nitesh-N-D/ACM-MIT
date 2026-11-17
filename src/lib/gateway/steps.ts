/** The 15-step NEXUS activation sequence (labels shown during the intro). */
export const ACTIVATION_STEPS = [
  "Signal acquired",
  "Crossing the void",
  "Gateway located",
  "The Sentinel awakens",
  "Resonance platform online",
  "The Sentinel raises the sword",
  "The sword strikes the lock",
  "The key is turned",
  "Energy descends",
  "Seal unlocking",
  "The Gateway opens",
  "Light of NEXUS",
  "Energy bridge forming",
  "Rising over the threshold",
  "Welcome to NEXUS",
] as const;

/** The step at which the intro holds for the visitor (sword raised). */
export const HOLD_STEP = 5;
/** The step the visitor's Enter starts: the strike. */
export const STRIKE_STEP = 6;
/** Seconds from the start of the strike to the blade hitting the lock. */
export const STRIKE_IMPACT = 0.62;
