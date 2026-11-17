import * as THREE from "three";

/** Text drawn into canvas textures (signs, screens, gallery walls). */
export const FONT = "system-ui, 'Segoe UI', sans-serif";

export function canvasTexture(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Word-wraps `text` into at most `lines` lines of `width` px, ending with an ellipsis if cut. */
export function wrap(x: CanvasRenderingContext2D, text: string, width: number, lines: number) {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (x.measureText(next).width > width && line) {
      out.push(line);
      line = w;
      if (out.length === lines) break;
    } else line = next;
  }
  if (out.length < lines && line) out.push(line);
  if (out.length === lines && words.join(" ") !== out.join(" ")) {
    let last = out[lines - 1]!;
    while (last && x.measureText(`${last}…`).width > width) last = last.slice(0, -1);
    out[lines - 1] = `${last.trimEnd()}…`;
  }
  return out;
}
