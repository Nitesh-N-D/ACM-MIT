import { territories, type TerritoryId } from "@/config/territories";
import { DISTRICT_POS, GROUND_Y, HERITAGE, INTERIOR_Y } from "@/components/world/layout";

/**
 * Camera destinations of the NEXUS world. Each is an orbit: the camera looks
 * at `target` from `radius` away, at azimuth `az` (0 = from the arrival side,
 * looking toward the city) and polar angle `pol` (0 = straight down).
 */

export type PlaceId = "overview" | "sentinel" | "sword" | "gateway" | "arrival" | "bridge" | "heritage" | "archive";
/** Inside a district's landmark. */
export type InteriorId = `${TerritoryId}:in`;
export type FocusId = PlaceId | TerritoryId | InteriorId;

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
  /** Lowest camera height (defaults to just above the ground). */
  floor?: number;
};

/** Hall centre (local z) and eye height of the Archive interior, mirrored from world/heritage. */
const ARCHIVE_CENTRE_Z = -1;
const ARCHIVE_EYE = 3.1;

/** Landmark heights, mirrored from world/landmarks (kept free of three.js). */
const HEIGHT: Record<TerritoryId, number> = { core: 54, intelligence: 22, frontier: 30, colosseum: 12, vault: 17, sanctuary: 27 };

const PLACES: Destination[] = [
  { id: "overview", label: "Overview", hint: "The whole civilization", target: [0, 6, -50], radius: 150, az: 0, pol: 1.0, min: 60, max: 240 },
  { id: "sentinel", label: "The Sentinel", hint: "Guardian of the gateway", target: [0, 6.2, -2.2], radius: 17, az: 0.35, pol: 1.38, min: 3.2, max: 60 },
  { id: "sword", label: "The Sword Key", hint: "Planted in the lock of the platform", target: [0, 3.2, -0.6], radius: 6.4, az: -0.45, pol: 1.25, min: 1.8, max: 30 },
  { id: "gateway", label: "The Gateway", hint: "Threshold of NEXUS", target: [0, 8, -9.5], radius: 46, az: 0.5, pol: 1.28, min: 16, max: 120 },
  { id: "arrival", label: "Arrival Quarter", hint: "The city behind the gateway", target: [0, 6, 6], radius: 44, az: 3.5, pol: 1.3, min: 14, max: 120 },
  { id: "bridge", label: "NEXUS Bridge", hint: "The span across the chasm", target: [0, 2, -32], radius: 66, az: 1.05, pol: 1.16, min: 14, max: 140 },
  {
    id: "heritage",
    label: "Heritage Archive",
    hint: "The history of ACM, ACM India and the chapter",
    target: [HERITAGE.x, GROUND_Y + 6, HERITAGE.z],
    radius: 38,
    az: 0.38,
    pol: 1.17,
    min: 13,
    max: 150,
  },
  {
    // Inside the hall: the orbit centre is the monument, the camera stays
    // within the walls. Azimuth picks the gallery wall that is in view.
    id: "archive",
    label: "Inside the Archive",
    hint: "Walk the three galleries",
    target: [HERITAGE.x, GROUND_Y + ARCHIVE_EYE, HERITAGE.z + ARCHIVE_CENTRE_Z],
    radius: 3.8,
    az: 0,
    pol: 1.47,
    min: 1.4,
    max: 4.4,
  },
];

/** Camera azimuth that faces each gallery wall from inside the Archive. */
export const GALLERY_AZ = { global: Math.PI / 2, india: 0, chapter: -Math.PI / 2 } as const;

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


const INTERIORS: Destination[] = territories.map((t) => {
  const [x, z] = DISTRICT_POS[t.id];
  return {
    id: `${t.id}:in` as InteriorId,
    label: `Inside ${t.short}`,
    hint: `The reception and exhibition hall of ${t.name}`,
    // From just inside the entrance, slightly raised, looking down the hall
    // past the centrepiece to the main display on the far wall.
    target: [x, INTERIOR_Y + 2.9, z - 0.5],
    radius: 6,
    az: 0,
    pol: 1.454,
    min: 1.2,
    max: 6,
    floor: INTERIOR_Y + 0.5,
  };
});

/** Destinations offered in the destinations bar (interiors are entered from a district). */
export const DESTINATIONS: Destination[] = [...PLACES, ...DISTRICTS];
export const PLACE_IDS = PLACES.map((p) => p.id) as PlaceId[];
/** Order of the automatic cinematic tour. */
export const TOUR: FocusId[] = ["overview", "sentinel", "sword", "gateway", "arrival", "bridge", ...territories.map((t) => t.id), "heritage", "archive"];

const BY_ID = new Map([...DESTINATIONS, ...INTERIORS].map((d) => [d.id, d]));

/** Whether `id` names a destination (deep links), interiors included. */
export function isFocusId(id: string): id is FocusId {
  return BY_ID.has(id as FocusId);
}

export function destination(id: FocusId): Destination {
  return BY_ID.get(id) ?? PLACES[0]!;
}

/** The Heritage Archive, outside or in. */
export function isHeritage(id: FocusId): id is "heritage" | "archive" {
  return id === "heritage" || id === "archive";
}

export function isTerritory(id: FocusId): id is TerritoryId {
  return territories.some((t) => t.id === id);
}

export function isInterior(id: FocusId): id is InteriorId {
  return id.endsWith(":in");
}

export function interiorOf(id: TerritoryId): InteriorId {
  return `${id}:in`;
}

/** The district a focus belongs to, outside or in. */
export function districtOf(id: FocusId): TerritoryId | null {
  if (isTerritory(id)) return id;
  if (isInterior(id)) return id.slice(0, -3) as TerritoryId;
  return null;
}
