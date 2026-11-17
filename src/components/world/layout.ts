import type { TerritoryId } from "@/config/territories";

/**
 * World-space layout of the NEXUS city (x, z on the ground plane). Shared by
 * the gateway backdrop, the interactive Explore scene and the 2D map.
 *
 * Scale: one world unit is roughly 3.5 m, so a storey is one unit tall and a
 * person stands about half a unit high. The Sentinel is a colossus.
 */
export const GROUND_Y = -0.6;

/**
 * The street grid. Streets running north-south sit on x = PX * i, streets
 * running east-west on z = Z0 + PZ * k. Every district plaza is centred on
 * an intersection, so streets lead straight to the landmarks.
 */
export const GRID = {
  px: 17,
  pz: 13,
  z0: -44,
  /** Half-width of an ordinary street (kerb to centre line). */
  road: 2.1,
  /** Half-width of the central avenue on x = 0 (two carriageways + median). */
  avenue: 6,
  /** Half-width of the planted median of the central avenue. */
  median: 1.3,
  /** Sidewalk depth between the kerb and the building line. */
  walk: 1.25,
  /** Height of the sidewalk above the carriageway. */
  kerb: 0.14,
} as const;

export const DISTRICT_POS: Record<TerritoryId, [number, number]> = {
  core: [0, -70],
  intelligence: [-34, -57],
  frontier: [34, -57],
  colosseum: [-51, -96],
  vault: [51, -96],
  sanctuary: [0, -122],
};

/** Radius of the plaza kept free of ordinary buildings around each landmark. */
export const DISTRICT_CLEARANCE: Record<TerritoryId, number> = {
  core: 11.5,
  intelligence: 11,
  frontier: 11,
  colosseum: 15,
  vault: 13,
  sanctuary: 19,
};

/** The chasm between the gateway threshold and the city (z range). */
export const CHASM = { near: -14, far: -38 } as const;

/** Built-up extents: the city proper beyond the chasm, the arrival quarter before it. */
export const CITY = { x0: -85, x1: 85, z0: -161, z1: -44 } as const;
export const ARRIVAL = { x0: -85, x1: 85, z0: -5, z1: 99 } as const;

/** The gateway platform stands in a round arrival plaza. */
export const ARRIVAL_PLAZA = { x: 0, z: -1, r: 25 } as const;
