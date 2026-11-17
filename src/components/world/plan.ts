import type { TerritoryId } from "@/config/territories";
import { ARRIVAL, ARRIVAL_PLAZA, CHASM, CITY, DISTRICT_CLEARANCE, DISTRICT_POS, GRID } from "./layout";

/**
 * The city plan: a deterministic description of every block, building,
 * lamp and tree, derived from the street grid. It contains no three.js
 * objects, so the 3D fabric, the pedestrians and the tests all read the
 * same city.
 */

/** Facade families understood by the facade shader. */
export const FAMILY = { glass: 0, masonry: 1, panel: 2, residential: 3, fins: 4, solid: 5 } as const;
export type Family = (typeof FAMILY)[keyof typeof FAMILY];

export type Rgb = [number, number, number];
export type Rect = { x0: number; x1: number; z0: number; z1: number };

export type Block = Rect & {
  col: number;
  row: number;
  region: "city" | "arrival";
  /** 0 paved block, 1 park. */
  kind: 0 | 1;
};

/** One volume of a building: a box or an eight-sided prism. */
export type Part = {
  shape: "box" | "oct";
  x: number;
  z: number;
  w: number;
  d: number;
  /** Base height above the sidewalk and height of the volume, in storeys. */
  y: number;
  h: number;
  family: Family;
  seed: number;
  /** Share of windows that are lit. */
  lit: number;
  /** Target bay width in world units. */
  bay: number;
  tint: Rgb;
  ground: boolean;
};

export type Box = { x: number; y: number; z: number; w: number; h: number; d: number };
export type Lamp = { x: number; z: number; rot: number; twin: boolean };
export type Tree = { x: number; z: number; s: number; tone: number };
export type Bench = { x: number; z: number; rot: number };

export type Zone = TerritoryId | "outer" | "arrival";

export type Building = { x: number; z: number; w: number; d: number; h: number; zone: Zone; door: [number, number] };

export type Plan = {
  blocks: Block[];
  /** Raised strips: rim promenades (kind 0) and avenue medians (kind 2). */
  strips: (Rect & { kind: 0 | 2 })[];
  buildings: Building[];
  parts: Part[];
  /** Roof plant, canopies and other plain metal boxes. */
  equip: Box[];
  /** Roof masts with an obstruction light on top: [x, y, z, height]. */
  masts: [number, number, number, number][];
  skyline: Part[];
  lamps: Lamp[];
  trees: Tree[];
  benches: Bench[];
};

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

const GLASS: Rgb[] = [
  [0.5, 0.62, 0.74],
  [0.44, 0.64, 0.64],
  [0.7, 0.62, 0.5],
  [0.62, 0.65, 0.72],
  [0.4, 0.47, 0.66],
];
const STONE: Rgb[] = [
  [0.62, 0.58, 0.52],
  [0.46, 0.44, 0.42],
  [0.5, 0.34, 0.27],
  [0.7, 0.68, 0.64],
  [0.56, 0.52, 0.44],
];
const METAL: Rgb[] = [
  [0.62, 0.64, 0.68],
  [0.28, 0.3, 0.34],
  [0.78, 0.79, 0.8],
  [0.46, 0.36, 0.26],
];
const HOMES: Rgb[] = [
  [0.74, 0.72, 0.68],
  [0.6, 0.5, 0.42],
  [0.46, 0.48, 0.52],
  [0.56, 0.38, 0.32],
  [0.66, 0.62, 0.52],
];
const FINS: Rgb[] = [
  [0.2, 0.22, 0.26],
  [0.42, 0.33, 0.22],
  [0.52, 0.55, 0.6],
];
const TINTS: Record<Family, Rgb[]> = { 0: GLASS, 1: STONE, 2: METAL, 3: HOMES, 4: FINS, 5: METAL };

/** Family weights per zone: [glass, masonry, panel, residential, fins]. */
const MIX: Record<Zone, [number, number, number, number, number]> = {
  core: [5, 0, 2, 0, 3],
  intelligence: [4, 0, 4, 1, 1],
  frontier: [2, 0, 5, 0, 3],
  colosseum: [2, 3, 1, 3, 0],
  vault: [1, 6, 2, 0, 0],
  sanctuary: [0, 7, 0, 2, 0],
  outer: [2, 3, 1, 5, 0],
  arrival: [3, 3, 2, 3, 1],
};
/** Preferred tint indices per zone and family, so districts keep a palette. */
const PALETTE: Partial<Record<Zone, Partial<Record<Family, number[]>>>> = {
  core: { 0: [0, 3, 4], 2: [0, 2], 4: [0, 2] },
  intelligence: { 0: [3, 4], 2: [2, 0], 4: [2] },
  frontier: { 0: [0, 4], 2: [1, 0, 3], 4: [0, 1] },
  colosseum: { 0: [2], 1: [2, 4], 3: [1, 3, 4] },
  vault: { 0: [1], 1: [1, 4], 2: [1, 3] },
  sanctuary: { 1: [0, 3], 3: [0, 4] },
};

const ZONE_RADIUS: Record<TerritoryId, number> = { core: 31, intelligence: 25, frontier: 25, colosseum: 29, vault: 27, sanctuary: 36 };
const DISTRICTS = Object.keys(DISTRICT_POS) as TerritoryId[];

export function zoneOf(x: number, z: number): Zone {
  if (z > CHASM.far) return "arrival";
  let best: Zone = "outer";
  let score = 1;
  for (const id of DISTRICTS) {
    const [dx, dz] = DISTRICT_POS[id];
    const s = Math.hypot(x - dx, z - dz) / ZONE_RADIUS[id];
    if (s < score) {
      score = s;
      best = id;
    }
  }
  return best;
}

function inDisc(r: Rect, cx: number, cz: number, rad: number) {
  const nx = Math.max(r.x0, Math.min(cx, r.x1));
  const nz = Math.max(r.z0, Math.min(cz, r.z1));
  return Math.hypot(nx - cx, nz - cz) < rad;
}

/** True where a plaza keeps the ground free of ordinary buildings and furniture. */
export function inPlaza(x: number, z: number, margin = 0) {
  if (Math.hypot(x - ARRIVAL_PLAZA.x, z - ARRIVAL_PLAZA.z) < ARRIVAL_PLAZA.r + margin) return true;
  for (const id of DISTRICTS) {
    const [dx, dz] = DISTRICT_POS[id];
    if (Math.hypot(x - dx, z - dz) < DISTRICT_CLEARANCE[id] + margin) return true;
  }
  return false;
}

function rectInPlaza(r: Rect, margin: number) {
  if (inDisc(r, ARRIVAL_PLAZA.x, ARRIVAL_PLAZA.z, ARRIVAL_PLAZA.r + margin)) return true;
  return DISTRICTS.some((id) => inDisc(r, DISTRICT_POS[id][0], DISTRICT_POS[id][1], DISTRICT_CLEARANCE[id] + margin));
}

function blocksOf(region: Rect, name: Block["region"], r: () => number): Block[] {
  const out: Block[] = [];
  const { px, pz, z0, road, avenue } = GRID;
  for (let k = Math.round((region.z0 - z0) / pz); z0 + pz * (k + 1) <= region.z1 + 0.01; k++) {
    for (let i = Math.round(region.x0 / px); (i + 1) * px <= region.x1 + 0.01; i++) {
      const b: Block = {
        x0: i * px + (i === 0 ? avenue : road),
        x1: (i + 1) * px - (i === -1 ? avenue : road),
        z0: z0 + pz * k + road,
        z1: z0 + pz * (k + 1) - road,
        col: i,
        row: k,
        region: name,
        kind: 0,
      };
      const roll = r();
      // A few blocks are left as parks; never beside a plaza, which is open already.
      if (roll < 0.075 && !rectInPlaza(b, 6)) b.kind = 1;
      out.push(b);
    }
  }
  return out;
}

function pick<T>(list: T[], r: () => number): T {
  return list[Math.floor(r() * list.length) % list.length]!;
}

function familyFor(zone: Zone, r: () => number): Family {
  const w = MIX[zone];
  let roll = r() * (w[0] + w[1] + w[2] + w[3] + w[4]);
  for (let f = 0; f < 5; f++) {
    roll -= w[f]!;
    if (roll <= 0) return f as Family;
  }
  return FAMILY.masonry;
}

function tintFor(zone: Zone, family: Family, r: () => number): Rgb {
  const all = TINTS[family];
  const pref = PALETTE[zone]?.[family];
  const base = pref && r() < 0.8 ? all[pick(pref, r)]! : pick(all, r);
  const k = 0.9 + r() * 0.2;
  return [base[0] * k, base[1] * k, base[2] * k];
}

/** Storeys for a building at (x, z). */
function heightAt(x: number, z: number, zone: Zone, r: () => number) {
  const roll = Math.pow(r(), 1.5);
  if (zone === "arrival") {
    const far = Math.min(1, Math.max(0, (Math.hypot(x, z) - ARRIVAL_PLAZA.r) / 80));
    return 4 + roll * (9 + far * 30);
  }
  const [cx, cz] = DISTRICT_POS.core;
  const core = Math.exp(-Math.pow(Math.hypot(x - cx, z - cz) / 42, 2));
  let h = 4 + (0.35 + roll * 0.9) * (6 + core * 40);
  // Around the low, wide landmarks the fabric stays low so they dominate.
  if (zone === "sanctuary") h = Math.min(h, 4 + roll * 5);
  if (zone === "colosseum") h = Math.min(h, 5 + roll * 8);
  if (zone === "vault") h = Math.min(h, 6 + roll * 12);
  if (zone === "intelligence") h = Math.min(h, 8 + roll * 14);
  if (zone === "outer") h = Math.min(h, 4 + roll * 16);
  return h;
}

const LIT: Record<Family, [number, number]> = { 0: [0.12, 0.28], 1: [0.15, 0.32], 2: [0.1, 0.24], 3: [0.2, 0.4], 4: [0.1, 0.22], 5: [0, 0] };
const BAY: Record<Family, [number, number]> = { 0: [0.85, 1.15], 1: [1.0, 1.35], 2: [1.2, 1.7], 3: [0.95, 1.25], 4: [1.0, 1.3], 5: [1, 1] };

function span([a, b]: [number, number], r: () => number) {
  return a + (b - a) * r();
}

/** Breaks one building into volumes: podium, shaft, setbacks, crown, roof plant. */
function mass(plan: Plan, lot: Rect, storeys: number, zone: Zone, detail: number, r: () => number) {
  const family = familyFor(zone, r);
  const tint = tintFor(zone, family, r);
  const seed = r();
  const dark = r() < 0.12;
  const lit = span(LIT[family], r) * (dark ? 0.2 : 1);
  const bay = span(BAY[family], r);
  const cx = (lot.x0 + lot.x1) / 2;
  const cz = (lot.z0 + lot.z1) / 2;
  const w = lot.x1 - lot.x0;
  const d = lot.z1 - lot.z0;
  const h = Math.max(3, Math.round(storeys));
  const base = { family, seed, lit, bay, tint };
  const trim: Rgb = family === FAMILY.masonry || family === FAMILY.residential ? [tint[0] * 0.8, tint[1] * 0.8, tint[2] * 0.8] : [0.3, 0.32, 0.36];
  const solid = { family: FAMILY.solid, seed, lit: 0, bay: 1, tint: trim };

  const add = (shape: Part["shape"], x: number, z: number, pw: number, pd: number, y: number, ph: number, ground = false, style = base) => {
    plan.parts.push({ shape, x, z, w: pw, d: pd, y, h: ph, ground, ...style });
  };
  const cornice = (x: number, z: number, pw: number, pd: number, y: number) => {
    if (detail > 0) add("box", x, z, pw + 0.16, pd + 0.16, y - 0.05, 0.14, false, solid);
  };
  const plant = (x: number, z: number, pw: number, pd: number, y: number) => {
    if (detail === 0) return;
    const n = 1 + Math.floor(r() * (detail > 1 ? 3 : 2));
    for (let i = 0; i < n; i++) {
      const ew = 0.5 + r() * Math.min(1.3, pw * 0.3);
      const ed = 0.5 + r() * Math.min(1.3, pd * 0.3);
      plan.equip.push({ x: x + (r() - 0.5) * Math.max(0, pw - ew - 0.6), y, z: z + (r() - 0.5) * Math.max(0, pd - ed - 0.6), w: ew, h: 0.3 + r() * 0.55, d: ed });
    }
  };

  // The door faces the nearest street: the long side of the block the lot touches.
  plan.buildings.push({ x: cx, z: cz, w, d, h, zone, door: [cx, lot.z1 + 0.5] });

  if (h <= 7) {
    add("box", cx, cz, w, d, 0, h, true);
    cornice(cx, cz, w, d, h);
    if (r() < 0.4 && w > 4 && detail > 0) {
      // Roof pavilion on low buildings.
      add("box", cx + (r() - 0.5) * w * 0.3, cz, w * 0.45, d * 0.5, h, 1, false);
    }
    plant(cx, cz, w, d, h);
    return;
  }

  const podium = h > 14 ? 3 : 2;
  const inset = 0.25 + r() * 0.45;
  add("box", cx, cz, w, d, 0, podium, true);
  cornice(cx, cz, w, d, podium);

  const sw = w - inset * 2;
  const sd = d - inset * 2;
  if (h <= 18) {
    add("box", cx, cz, sw, sd, podium, h - podium);
    cornice(cx, cz, sw, sd, h);
    plant(cx, cz, sw, sd, h);
    return;
  }

  // Towers: a shaft with one or two setbacks, optionally eight-sided.
  const oct = (family === FAMILY.glass || family === FAMILY.fins) && r() < 0.3 && Math.min(sw, sd) > 3.4;
  const side = Math.min(sw, sd);
  const tw = oct ? side : sw;
  const td = oct ? side : sd;
  const shape: Part["shape"] = oct ? "oct" : "box";
  const cut = Math.round(podium + (h - podium) * (0.62 + r() * 0.2));
  add(shape, cx, cz, tw, td, podium, cut - podium);
  const k = 0.7 + r() * 0.14;
  const ox = oct ? 0 : (r() - 0.5) * tw * (1 - k) * 0.8;
  add(shape, cx + ox, cz, tw * k, td * k, cut, h - cut);
  if (!oct) {
    cornice(cx, cz, tw, td, cut);
    cornice(cx + ox, cz, tw * k, td * k, h);
  }
  // Crown: a plain mechanical storey, sometimes carrying a mast.
  const crown = 1 + Math.floor(r() * 2);
  add(shape, cx + ox, cz, tw * k * 0.62, td * k * 0.62, h, crown, false, solid);
  plant(cx + ox, cz, tw * k, td * k, h);
  if (r() < 0.45) plan.masts.push([cx + ox, h + crown, cz, 2.5 + r() * 5]);
}

function fill(plan: Plan, block: Block, detail: number, r: () => number) {
  const { walk } = GRID;
  const inner: Rect = { x0: block.x0 + walk, x1: block.x1 - walk, z0: block.z0 + walk, z1: block.z1 - walk };
  const width = inner.x1 - inner.x0;
  const roll = r();
  const lots = width < 7.5 ? (roll < 0.55 ? 1 : 2) : roll < 0.16 ? 1 : roll < 0.66 ? 2 : 3;
  // Lot boundaries, with a narrow alley between neighbours.
  const cuts = [0];
  for (let i = 1; i < lots; i++) cuts.push(i / lots + (r() - 0.5) * (0.5 / lots));
  cuts.push(1);
  for (let i = 0; i < lots; i++) {
    const x0 = inner.x0 + width * cuts[i]! + (i > 0 ? 0.2 : 0);
    const x1 = inner.x0 + width * cuts[i + 1]! - (i < lots - 1 ? 0.2 : 0);
    const halves = r() < 0.2 ? 2 : 1;
    for (let j = 0; j < halves; j++) {
      const depth = inner.z1 - inner.z0;
      const z0 = halves === 1 ? inner.z0 : inner.z0 + (depth / 2) * j + (j ? 0.2 : 0);
      const z1 = halves === 1 ? inner.z1 : inner.z0 + (depth / 2) * (j + 1) - (j ? 0 : 0.2);
      // Some buildings stand back from the street behind a forecourt.
      const back = halves === 1 && r() < 0.22 ? 0.6 + r() * 0.8 : 0;
      const lot: Rect = { x0, x1, z0: z0 + back * 0.4, z1: z1 - back };
      if (rectInPlaza(lot, 1.2)) continue;
      const cx = (lot.x0 + lot.x1) / 2;
      const cz = (lot.z0 + lot.z1) / 2;
      const zone = zoneOf(cx, cz);
      const scale = halves === 2 ? 0.6 : 1;
      mass(plan, lot, heightAt(cx, cz, zone, r) * scale, zone, detail, r);
    }
  }
}

function furnish(plan: Plan, block: Block, r: () => number) {
  const cx = (block.x0 + block.x1) / 2;
  const cz = (block.z0 + block.z1) / 2;
  const hx = (block.x1 - block.x0) / 2;
  const hz = (block.z1 - block.z0) / 2;
  const edge = 0.32;
  const lamps: Lamp[] = [
    { x: cx, z: block.z1 - edge, rot: 0, twin: false },
    { x: cx, z: block.z0 + edge, rot: Math.PI, twin: false },
    { x: block.x1 - edge, z: cz, rot: Math.PI / 2, twin: false },
    { x: block.x0 + edge, z: cz, rot: -Math.PI / 2, twin: false },
  ];
  for (const l of lamps) if (!inPlaza(l.x, l.z, 0.4)) plan.lamps.push(l);

  if (block.kind === 1) {
    // Park: a grove with benches along a central path.
    const n = 9 + Math.floor(r() * 5);
    for (let i = 0; i < n; i++) {
      const x = cx + (r() * 2 - 1) * (hx - 1.3);
      const z = cz + (r() * 2 - 1) * (hz - 1.3);
      if (Math.abs(z - cz) < 0.7) continue;
      plan.trees.push({ x, z, s: 0.85 + r() * 0.7, tone: r() });
    }
    plan.benches.push({ x: cx - hx * 0.4, z: cz + 0.55, rot: Math.PI }, { x: cx + hx * 0.4, z: cz - 0.55, rot: 0 });
    return;
  }
  // Street trees in pits along the long kerbs, clear of the lamps.
  for (const side of [-1, 1]) {
    for (const f of [-0.62, -0.28, 0.28, 0.62]) {
      if (r() < 0.25) continue;
      const x = cx + f * hx;
      const z = cz + side * (hz - 0.42);
      if (!inPlaza(x, z, 0.6)) plan.trees.push({ x, z, s: 0.7 + r() * 0.45, tone: r() });
    }
  }
  if (r() < 0.35) {
    const side = r() < 0.5 ? -1 : 1;
    const x = cx + (r() - 0.5) * hx;
    const z = cz + side * (hz - 0.85);
    if (!inPlaza(x, z, 0.6)) plan.benches.push({ x, z, rot: side > 0 ? 0 : Math.PI });
  }
}

function skyline(plan: Plan, count: number, r: () => number) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + (r() - 0.5) * 0.05;
    const rad = 225 + r() * 95;
    const w = 12 + r() * 16;
    const d = w * (0.6 + r() * 0.5);
    const h = Math.round(36 + Math.pow(r(), 1.5) * 130);
    const family = r() < 0.6 ? FAMILY.glass : r() < 0.6 ? FAMILY.fins : FAMILY.panel;
    const part = { shape: "box" as const, x: Math.sin(a) * rad, z: -40 + Math.cos(a) * rad, family, seed: r(), lit: 0.1 + r() * 0.14, bay: 2.4, tint: pick(TINTS[family], r), ground: false };
    const cut = Math.round(h * (0.6 + r() * 0.25));
    plan.skyline.push({ ...part, w, d, y: 0, h: cut });
    plan.skyline.push({ ...part, w: w * 0.7, d: d * 0.7, y: cut, h: h - cut });
  }
}

const cache = new Map<string, Plan>();

/**
 * detail 0 = bare volumes, 1 = cornices and roof plant, 2 = full detail.
 * `arrival` adds the quarter on the near side of the chasm and the far skyline,
 * which only the free-exploration world can see.
 */
export function cityPlan(detail: 0 | 1 | 2, arrival: boolean): Plan {
  const key = `${detail}:${arrival}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const r = rng(2026);
  const plan: Plan = { blocks: [], strips: [], buildings: [], parts: [], equip: [], masts: [], skyline: [], lamps: [], trees: [], benches: [] };
  plan.blocks.push(...blocksOf(CITY, "city", r));
  if (arrival) plan.blocks.push(...blocksOf(ARRIVAL, "arrival", r));

  for (const block of plan.blocks) {
    // Each block draws from its own stream so tiers share the same city.
    const br = rng(7919 + (block.col + 20) * 131 + (block.row + 40) * 17);
    if (block.kind === 0) fill(plan, block, detail, br);
    furnish(plan, block, rng(104729 + (block.col + 20) * 37 + (block.row + 40) * 11));
  }

  // Promenades along both rims of the chasm.
  const { road, median, pz, z0 } = GRID;
  plan.strips.push({ x0: CITY.x0 - road, x1: CITY.x1 + road, z0: CITY.z1 + road, z1: CHASM.far, kind: 0 });
  if (arrival) plan.strips.push({ x0: ARRIVAL.x0 - road, x1: ARRIVAL.x1 + road, z0: CHASM.near, z1: ARRIVAL.z0 - road, kind: 0 });

  // Planted median of the central avenue, block by block.
  const rows = new Set(plan.blocks.map((b) => b.row));
  for (const k of rows) {
    const strip = { x0: -median, x1: median, z0: z0 + pz * k + road + 1.2, z1: z0 + pz * (k + 1) - road - 1.2, kind: 2 as const };
    const mid = (strip.z0 + strip.z1) / 2;
    // Not under the bridge landing, and not inside a plaza.
    if (mid < CHASM.far && mid > -60) continue;
    if (inPlaza(0, strip.z0) || inPlaza(0, strip.z1)) continue;
    plan.strips.push(strip);
    plan.lamps.push({ x: 0, z: mid, rot: Math.PI / 2, twin: true });
    for (const f of [-0.38, -0.14, 0.14, 0.38]) plan.trees.push({ x: 0, z: mid + f * (strip.z1 - strip.z0), s: 0.95 + r() * 0.3, tone: r() });
  }

  // Benches and trees along the promenades.
  for (let x = CITY.x0 + 6; x < CITY.x1; x += 8.5) {
    if (Math.abs(x) < 9) continue;
    plan.benches.push({ x, z: CHASM.far - 1.1, rot: 0 });
    plan.trees.push({ x: x + 3.4, z: CHASM.far - 2.3, s: 0.8 + r() * 0.3, tone: r() });
    if (arrival && !inPlaza(x, CHASM.near + 1.1, 1)) {
      plan.benches.push({ x, z: CHASM.near + 1.1, rot: Math.PI });
      plan.trees.push({ x: x + 3.4, z: CHASM.near + 3.4, s: 0.8 + r() * 0.3, tone: r() });
    }
  }

  if (arrival) skyline(plan, detail === 0 ? 36 : detail === 1 ? 60 : 84, r);

  cache.set(key, plan);
  return plan;
}
