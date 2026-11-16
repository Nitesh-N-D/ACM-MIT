import type { TerritoryId } from "@/config/territories";

/**
 * World-space layout of the NEXUS city (x, z on the ground plane). Shared by
 * the gateway backdrop, the interactive Explore scene and the 2D map.
 */
export const GROUND_Y = -0.6;

export const DISTRICT_POS: Record<TerritoryId, [number, number]> = {
  core: [0, -70],
  intelligence: [-34, -54],
  frontier: [34, -54],
  colosseum: [-52, -96],
  vault: [52, -96],
  sanctuary: [0, -124],
};

/** Radius kept free of generic towers around each landmark. */
export const DISTRICT_CLEARANCE: Record<TerritoryId, number> = {
  core: 11,
  intelligence: 11,
  frontier: 11,
  colosseum: 15,
  vault: 13,
  sanctuary: 14,
};

/** The chasm between the gateway threshold and the city (z range). */
export const CHASM = { near: -14, far: -38 } as const;
export const CITY_EDGE = CHASM.far - 2;
export const CITY_DEPTH = 112;
export const CITY_HALF_WIDTH = 78;
export const AVENUE_HALF_WIDTH = 5.5;
