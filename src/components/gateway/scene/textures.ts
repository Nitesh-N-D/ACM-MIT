import * as THREE from "three";

/** Small procedural textures, generated once per page (no downloads). */

let glow: THREE.CanvasTexture | null = null;
let windows: THREE.CanvasTexture | null = null;
let fade: THREE.CanvasTexture | null = null;

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

/** Soft radial glow used for additive "fake bloom" sprites. */
export function glowTexture() {
  if (glow) return glow;
  const s = 128;
  const [c, g] = canvas(s, s);
  const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.18, "rgba(255,255,255,0.55)");
  grd.addColorStop(0.45, "rgba(255,255,255,0.14)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, s, s);
  glow = new THREE.CanvasTexture(c);
  glow.colorSpace = THREE.SRGBColorSpace;
  return glow;
}

/** Vertical fade (opaque at the bottom) for light spill planes. */
export function fadeTexture() {
  if (fade) return fade;
  const [c, g] = canvas(4, 128);
  const grd = g.createLinearGradient(0, 128, 0, 0);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 4, 128);
  fade = new THREE.CanvasTexture(c);
  fade.colorSpace = THREE.SRGBColorSpace;
  return fade;
}

/** Lit-window grid used as the emissive map of city towers. */
export function windowsTexture() {
  if (windows) return windows;
  const [c, g] = canvas(64, 128);
  g.fillStyle = "#000";
  g.fillRect(0, 0, 64, 128);
  let s = 11;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const tints = ["#3fe4ff", "#9fd8ff", "#eef4ff", "#8a6bff", "#d8b25e"];
  for (let y = 4; y < 128; y += 8) {
    for (let x = 4; x < 64; x += 8) {
      const r = rnd();
      if (r < 0.42) continue;
      g.globalAlpha = 0.25 + rnd() * 0.75;
      g.fillStyle = tints[Math.floor(rnd() * (r > 0.94 ? 5 : 3))]!;
      g.fillRect(x, y, 4, 3);
    }
  }
  windows = new THREE.CanvasTexture(c);
  windows.colorSpace = THREE.SRGBColorSpace;
  windows.wrapS = windows.wrapT = THREE.RepeatWrapping;
  return windows;
}

/** Deterministic PRNG so the scene is identical on every visit. */
export function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}
