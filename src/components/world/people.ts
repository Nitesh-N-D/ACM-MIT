import type { TerritoryId } from "@/config/territories";
import { ARRIVAL, ARRIVAL_PLAZA, CHASM, CITY, DISTRICT_CLEARANCE, DISTRICT_POS, GRID, GROUND_Y, HERITAGE } from "./layout";
import { cityPlan, type Block, type Rect } from "./plan";

/**
 * Where the city's pedestrians walk. Every walker follows its own closed
 * route of straight legs and pauses, timed so that it repeats forever:
 *
 *   - round a block on the sidewalk, keeping to the right;
 *   - round a pair of blocks, crossing the street on the painted zebra
 *     crossings and waiting at the kerb before stepping off;
 *   - out of a building's door, along the street and back in again;
 *   - slowly round a district plaza, stopping to look at the landmark;
 *   - along the promenades on both rims of the chasm, and through parks.
 *
 * Pure data, no three.js: the renderer samples a route at a time.
 */

const SIDEWALK = GROUND_Y + GRID.kerb;
/** Top of the stone paving of a district plaza (see Surroundings). */
const PLAZA_Y = GROUND_Y + 0.23;
const { px, pz, z0: Z0, road, avenue, walk } = GRID;
const DISTRICTS = Object.keys(DISTRICT_POS) as TerritoryId[];
const GATEWAY_CLEAR = 11.5;

/** Distances from the kerb of the two sidewalk lanes. Both lie on the zebra. */
const KERB_LANE = 0.72;
const WALL_LANE = 1.0;

export type Leg = {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  /** Start time within the route, duration, distance walked before the leg. */
  t0: number;
  dur: number;
  d0: number;
  len: number;
  /** Inside a building: not drawn. */
  hidden: boolean;
  /** Facing while standing (NaN: keep the last heading). */
  face: number;
};
export type Route = { legs: Leg[]; period: number };
export type Pose = { x: number; y: number; z: number; dist: number; moving: boolean; hidden: boolean; heading: number };

/** Ground height under a point: sidewalks and promenades are a kerb above the street. */
export function surfaceY(x: number, z: number) {
  // District plazas are paved a step above the sidewalks.
  if (Math.hypot(x - HERITAGE.x, z - HERITAGE.z) < HERITAGE.r + 0.45) return PLAZA_Y;
  for (const id of DISTRICTS) {
    const [cx, cz] = DISTRICT_POS[id];
    if (Math.hypot(x - cx, z - cz) < DISTRICT_CLEARANCE[id] + 0.45) return PLAZA_Y;
  }
  const inX = x >= CITY.x0 - road && x <= CITY.x1 + road;
  if (inX && ((z >= CITY.z1 + road && z <= CHASM.far) || (z >= CHASM.near && z <= ARRIVAL.z0 - road))) return SIDEWALK;
  if (x < CITY.x0 || x > CITY.x1) return GROUND_Y;
  if (!((z >= CITY.z0 && z <= CITY.z1) || (z >= ARRIVAL.z0 && z <= ARRIVAL.z1))) return GROUND_Y;
  const i = Math.floor(x / px);
  const k = Math.floor((z - Z0) / pz);
  const bx0 = i * px + (i === 0 ? avenue : road);
  const bx1 = (i + 1) * px - (i === -1 ? avenue : road);
  const bz0 = Z0 + pz * k + road;
  const bz1 = Z0 + pz * (k + 1) - road;
  return x > bx0 && x < bx1 && z > bz0 && z < bz1 ? SIDEWALK : GROUND_Y;
}
const onSidewalk = (x: number, z: number) => surfaceY(x, z) > GROUND_Y + 0.01;

class Builder {
  legs: Leg[] = [];
  t = 0;
  d = 0;
  constructor(
    public x: number,
    public z: number,
    private speed: number,
    private r: () => number,
  ) {}

  /** Walk straight to (x, z); optionally wait at the kerb before stepping into the street. */
  to(x: number, z: number, kerbWait = false): Builder {
    const len = Math.hypot(x - this.x, z - this.z);
    if (len < 1e-4) return this;
    if (kerbWait) {
      // Find where the leg leaves the sidewalk, if it does.
      const steps = Math.ceil(len / 0.05);
      let was = onSidewalk(this.x, this.z);
      for (let s = 1; s <= steps; s++) {
        const f = s / steps;
        const qx = this.x + (x - this.x) * f;
        const qz = this.z + (z - this.z) * f;
        const now = onSidewalk(qx, qz);
        if (was && !now) {
          const back = Math.max(0, f - 0.12 / len);
          const kx = this.x + (x - this.x) * back;
          const kz = this.z + (z - this.z) * back;
          const heading = Math.atan2(x - this.x, z - this.z);
          this.to(kx, kz);
          this.wait(0.4 + this.r() * 3, heading);
          // Step off the kerb, then carry on (waiting again at the next one).
          this.to(qx, qz);
          return this.to(x, z, true);
        }
        was = now;
      }
    }
    const dur = len / this.speed;
    this.legs.push({ x0: this.x, z0: this.z, x1: x, z1: z, t0: this.t, dur, d0: this.d, len, hidden: false, face: NaN });
    this.t += dur;
    this.d += len;
    this.x = x;
    this.z = z;
    return this;
  }

  wait(seconds: number, face = NaN, hidden = false) {
    this.legs.push({ x0: this.x, z0: this.z, x1: this.x, z1: this.z, t0: this.t, dur: seconds, d0: this.d, len: 0, hidden, face });
    this.t += seconds;
    return this;
  }

  done(): Route {
    return { legs: this.legs, period: this.t };
  }
}

/** Sample a route at time t (seconds); fills and returns `out`. */
export function sample(route: Route, t: number, out: Pose): Pose {
  const { legs, period } = route;
  const u = ((t % period) + period) % period;
  let lo = 0;
  let hi = legs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (legs[mid]!.t0 <= u) lo = mid;
    else hi = mid - 1;
  }
  const leg = legs[lo]!;
  const f = leg.dur > 0 ? Math.min(1, (u - leg.t0) / leg.dur) : 0;
  out.x = leg.x0 + (leg.x1 - leg.x0) * f;
  out.z = leg.z0 + (leg.z1 - leg.z0) * f;
  out.y = surfaceY(out.x, out.z);
  out.dist = leg.d0 + leg.len * f;
  out.moving = leg.len > 0;
  out.hidden = leg.hidden;
  out.heading = out.moving ? Math.atan2(leg.x1 - leg.x0, leg.z1 - leg.z0) : leg.face;
  return out;
}

/* ------------------------------------------------------------------------- */

/** Footprint of each district landmark: the plaza walkers circle just outside it. */
const LANDMARK: Record<TerritoryId, { hx: number; hz: number; rc: number }> = {
  core: { hx: 9.4, hz: 9.4, rc: 9.4 },
  intelligence: { hx: 10.7, hz: 10.7, rc: 10.7 },
  frontier: { hx: 8.9, hz: 7.9, rc: 1.6 },
  colosseum: { hx: 15.2, hz: 15.2, rc: 15.2 },
  vault: { hx: 9.45, hz: 9.45, rc: 0.5 },
  sanctuary: { hx: 12.3, hz: 11.9, rc: 3 },
};

function rectNear(r: Rect, cx: number, cz: number, rad: number) {
  const nx = Math.max(r.x0, Math.min(cx, r.x1));
  const nz = Math.max(r.z0, Math.min(cz, r.z1));
  return Math.hypot(nx - cx, nz - cz) < rad;
}
/** True if a sidewalk route around `r` would run into a landmark or the gateway plaza. */
function blocked(r: Rect) {
  // The gateway platform itself (radius ~9.8); the plaza's sidewalks around it are busy.
  if (rectNear(r, ARRIVAL_PLAZA.x, ARRIVAL_PLAZA.z, GATEWAY_CLEAR)) return true;
  // The Heritage Archive reaches about 10 units from its centre.
  if (rectNear(r, HERITAGE.x, HERITAGE.z, 11.2)) return true;
  return DISTRICTS.some((id) => {
    const [x, z] = DISTRICT_POS[id];
    const l = LANDMARK[id];
    return rectNear(r, x, z, Math.hypot(l.hx, l.hz) + 1.2);
  });
}

/** Corners of a sidewalk loop around `r`, in the order that keeps to the right. */
function loop(r: Rect, lane: number, kerbSide: boolean): [number, number][] {
  const a = r.x0 + lane;
  const b = r.x1 - lane;
  const c = r.z0 + lane;
  const d = r.z1 - lane;
  // Walking this way round, the kerb is on the walker's right.
  const pts: [number, number][] = [[a, d], [b, d], [b, c], [a, c]];
  return kerbSide ? pts : pts.reverse();
}

function closedRoute(pts: [number, number][], speed: number, r: () => number, kerbWait: boolean) {
  const b = new Builder(pts[0]![0], pts[0]![1], speed, r);
  for (let i = 1; i <= pts.length; i++) {
    const [x, z] = pts[i % pts.length]!;
    b.to(x, z, kerbWait);
  }
  return b.done();
}

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}
const pick = <T>(list: T[], r: () => number) => list[Math.floor(r() * list.length)]!;
const walkSpeed = (r: () => number) => 0.32 + r() * 0.14;

function blockLoop(block: Block, r: () => number) {
  const kerb = r() < 0.5;
  return closedRoute(loop(block, kerb ? KERB_LANE : WALL_LANE, kerb), walkSpeed(r), r, false);
}

function pairLoop([a, b]: [Block, Block], r: () => number) {
  const rect = { x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), z0: Math.min(a.z0, b.z0), z1: Math.max(a.z1, b.z1) };
  const kerb = r() < 0.5;
  return closedRoute(loop(rect, kerb ? KERB_LANE : WALL_LANE, kerb), walkSpeed(r), r, true);
}

function doorVisit(door: [number, number], block: Block, r: () => number) {
  const [dx, dz] = door;
  const speed = walkSpeed(r);
  // Door is 0.5 in front of the facade: start a step inside the wall.
  const inside = dz - 0.62;
  const b = new Builder(dx, inside, speed, r);
  // Heading +x along the street side of the block, the kerb is on the right.
  const east = r() < 0.5;
  const out = block.z1 - (east ? KERB_LANE : WALL_LANE);
  const back = block.z1 - (east ? WALL_LANE : KERB_LANE);
  const room = east ? block.x1 - 0.8 - dx : dx - (block.x0 + 0.8);
  const run = Math.max(0.6, Math.min(room, 2 + r() * 7));
  const end = dx + (east ? run : -run);
  b.wait(4 + r() * 14, 0, true);
  b.to(dx, out).to(end, out);
  if (r() < 0.4) b.wait(1 + r() * 4, 0);
  b.to(end, back).to(dx, back).to(dx, inside);
  return b.done();
}

/** Rounded rectangle round a landmark, walked slowly, with pauses to look at it. */
function plazaStroll(id: TerritoryId, r: () => number) {
  const [cx, cz] = DISTRICT_POS[id];
  const l = LANDMARK[id];
  // Anticlockwise from above (+angle) keeps the landmark on the right: inner lane.
  const ccw = r() < 0.5;
  // Stay on the paving (or just past its kerb) where the landmark leaves room.
  const reach = Math.hypot(l.hx - l.rc, l.hz - l.rc) + l.rc;
  const room = Math.max(0.3, DISTRICT_CLEARANCE[id] + 0.8 - reach);
  const off = Math.min(room, (ccw ? 0.25 : 0.75) + r() * 0.3);
  const hx = l.hx + off;
  const hz = l.hz + off;
  const rc = Math.min(l.rc + off, hx, hz);
  const pts: [number, number][] = [];
  const corners: [number, number, number][] = [[hx - rc, hz - rc, 0], [-(hx - rc), hz - rc, Math.PI / 2], [-(hx - rc), -(hz - rc), Math.PI], [hx - rc, -(hz - rc), Math.PI * 1.5]];
  const arc = rc > 3 ? 7 : 3;
  for (const [ox, oz, a0] of corners) {
    for (let k = 0; k <= arc; k++) {
      const a = a0 + (k / arc) * (Math.PI / 2);
      pts.push([cx + ox + Math.cos(a) * rc, cz + oz + Math.sin(a) * rc]);
    }
  }
  if (!ccw) pts.reverse();
  const b = new Builder(pts[0]![0], pts[0]![1], 0.24 + r() * 0.09, r);
  for (let i = 1; i <= pts.length; i++) {
    const [x, z] = pts[i % pts.length]!;
    b.to(x, z);
    if (r() < 0.06) b.wait(3 + r() * 6, Math.atan2(cx - x, cz - z));
  }
  return b.done();
}

/** Back and forth along a chasm promenade, keeping right, stopping to look over the edge. */
function promenade(city: boolean, r: () => number) {
  const side = r() < 0.5 ? -1 : 1;
  const [lo, hi] = city ? [11, 82] : [25, 82];
  const xa = side * (lo + r() * (hi - lo - 10));
  const xb = side * Math.min(hi, Math.abs(xa) + 8 + r() * 26);
  const [east, west] = city ? [CHASM.far - 1.6, CHASM.far - 2.9] : [CHASM.near + 2.6, CHASM.near + 1.8];
  const x0 = Math.min(xa, xb);
  const x1 = Math.max(xa, xb);
  const b = new Builder(x0, east, 0.26 + r() * 0.12, r);
  b.to(x1, east);
  if (r() < 0.6) b.wait(3 + r() * 7, city ? 0 : Math.PI);
  b.to(x1, west).to(x0, west).to(x0, east);
  return b.done();
}

/** Along the central path of a park, with a rest on a bench now and then. */
function parkWalk(block: Block, r: () => number) {
  const cz = (block.z0 + block.z1) / 2;
  const x0 = block.x0 + 0.7;
  const x1 = block.x1 - 0.7;
  const b = new Builder(x0, cz + 0.18, 0.24 + r() * 0.1, r);
  b.to(x1, cz + 0.18);
  if (r() < 0.5) b.wait(2 + r() * 6, Math.PI / 2);
  b.to(x1, cz - 0.18).to(x0, cz - 0.18).to(x0, cz + 0.18);
  return b.done();
}

export type Walker = { route: Route; offset: number; height: number; look: number };

const cache = new Map<number, Walker[]>();

/** `count` walkers spread over the free-exploration city, the same every visit. */
export function cityWalkers(count: number): Walker[] {
  const hit = cache.get(count);
  if (hit) return hit;
  const plan = cityPlan(1, true);
  const r = rng(31337);

  const paved = plan.blocks.filter((b) => b.kind === 0 && !blocked(b));
  const parks = plan.blocks.filter((b) => b.kind === 1 && !blocked(b));
  const byCell = new Map(plan.blocks.map((b) => [`${b.col}:${b.row}`, b]));
  const pairs: [Block, Block][] = [];
  for (const a of paved) {
    const east = byCell.get(`${a.col + 1}:${a.row}`);
    // Never across the central avenue: the bridge lands on it.
    if (east && east.kind === 0 && a.col !== -1 && !blocked(east)) pairs.push([a, east]);
    const north = byCell.get(`${a.col}:${a.row + 1}`);
    if (north && north.kind === 0 && north.region === a.region && !blocked(north)) pairs.push([a, north]);
  }
  const doors: [[number, number], Block][] = [];
  for (const bld of plan.buildings) {
    const block = byCell.get(`${Math.floor(bld.door[0] / px)}:${Math.floor((bld.door[1] - Z0) / pz)}`);
    if (!block || block.kind !== 0) continue;
    // Only doors that open onto the street, not onto a courtyard.
    const fromKerb = block.z1 - bld.door[1];
    if (fromKerb < walk - 0.6 || fromKerb > walk + 1.2) continue;
    if (!blocked({ x0: bld.door[0] - 3, x1: bld.door[0] + 3, z0: block.z1 - 2, z1: block.z1 })) doors.push([bld.door, block]);
  }

  const mix: [number, () => Route][] = [
    [0.33, () => blockLoop(pick(paved, r), r)],
    [0.24, () => pairLoop(pick(pairs, r), r)],
    [0.16, () => (doors.length ? doorVisit(...pick(doors, r), r) : blockLoop(pick(paved, r), r))],
    [0.12, () => plazaStroll(pick(DISTRICTS, r), r)],
    [0.09, () => promenade(r() < 0.6, r)],
    [0.06, () => (parks.length ? parkWalk(pick(parks, r), r) : promenade(true, r))],
  ];
  const walkers: Walker[] = [];
  for (let i = 0; i < count; i++) {
    let roll = r();
    let make = mix[0]![1];
    for (const [w, fn] of mix) {
      if (roll < w) {
        make = fn;
        break;
      }
      roll -= w;
    }
    const route = make();
    walkers.push({ route, offset: r() * route.period, height: 0.46 + r() * 0.08, look: r() });
  }
  cache.set(count, walkers);
  return walkers;
}
