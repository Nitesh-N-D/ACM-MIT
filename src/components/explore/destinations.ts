import { territories, type TerritoryId } from "@/config/territories";
import { DISTRICT_POS, GROUND_Y } from "@/components/world/layout";

/**
 * Camera destinations of the NEXUS world. Each is an orbit: the camera looks
 * at `target` from `radius` away, at azimuth `az` (0 = from the arrival side,
 * looking toward the city) and polar angle `pol` (0 = straight down).
 */

export type PlaceId = "overview" | "sentinel" | "artifact" | "gateway" | "arrival" | "bridge";
export type FocusId = PlaceId | TerritoryId;

export type Destination = {
  id: FocusId;
  label: string;
  hint: string;
  target: [number, number, number];
  radius: number;
  az: number;
  pol: number;
  /** Zoom limits (distance from the target). */
  min: number;
  max: number;
};

/** Landmark heights, mirrored from world/landmarks (kept free of three.js). */
const HEIGHT: Record<TerritoryId, number> = { core: 54, intelligence: 22, frontier: 30, colosseum: 12, vault: 17, sanctuary: 27 };

const PLACES: Destination[] = [
  { id: "overview", label: "Overview", hint: "The whole civilization", target: [0, 6, -50], radius: 150, az: 0, pol: 1.0, min: 60, max: 240 },
  { id: "sentinel", label: "The Sentinel", hint: "Guardian of the gateway", target: [0, 6.2, -2.2], radius: 17, az: 0.35, pol: 1.38, min: 3.2, max: 60 },
  { id: "artifact", label: "Nexus Artifact", hint: "Crystal conduit and quantum rings", target: [0, 6.5, -0.45], radius: 5.2, az: -0.4, pol: 1.3, min: 1.8, max: 30 },
  { id: "gateway", label: "The Gateway", hint: "Threshold of NEXUS", target: [0, 8, -9.5], radius: 46, az: 0.5, pol: 1.28, min: 16, max: 120 },
  { id: "arrival", label: "Arrival Quarter", hint: "The city behind the gateway", target: [0, 6, 6], radius: 44, az: 3.5, pol: 1.3, min: 14, max: 120 },
  { id: "bridge", label: "NEXUS Bridge", hint: "The span across the chasm", target: [0, 2, -32], radius: 66, az: 1.05, pol: 1.16, min: 14, max: 140 },
];

const DISTRICTS: Destination[] = territories.map((t) => {
  const [x, z] = DISTRICT_POS[t.id];
  const h = HEIGHT[t.id];
  return {
    id: t.id,
    label: t.short,
    hint: t.purpose,
    target: [x, GROUND_Y + h * 0.4, z],
    radius: 36 + h * 0.95,
    az: 0,
    // Steep enough to see over the surrounding towers.
    pol: 0.92,
    min: 12 + h * 0.3,
    max: 170,
  };
});

export const DESTINATIONS: Destination[] = [...PLACES, ...DISTRICTS];
export const PLACE_IDS = PLACES.map((p) => p.id) as PlaceId[];
/** Order of the automatic cinematic tour. */
export const TOUR: FocusId[] = ["overview", "sentinel", "artifact", "gateway", "arrival", "bridge", ...territories.map((t) => t.id)];

const BY_ID = new Map(DESTINATIONS.map((d) => [d.id, d]));

export function destination(id: FocusId): Destination {
  return BY_ID.get(id) ?? PLACES[0]!;
}

export function isTerritory(id: FocusId): id is TerritoryId {
  return territories.some((t) => t.id === id);
}
