/**
 * The six NEXUS territories — creative navigation concepts, not official
 * chapter departments. Shared by navigation, pages, the 3D city and admin.
 */

export type TerritoryId = "core" | "intelligence" | "frontier" | "colosseum" | "vault" | "sanctuary";

export type Territory = {
  id: TerritoryId;
  code: string;
  name: string;
  short: string;
  href: string;
  /** Accent colour (hex) — used for UI highlights and 3D emissive tint. */
  accent: string;
  purpose: string;
  description: string;
  topics: string[];
};

export const territories: Territory[] = [
  {
    id: "core",
    code: "T01",
    name: "The Central Core",
    short: "Central Core",
    href: "/about",
    accent: "#3fe4ff",
    purpose: "The heart of ACM MIT",
    description: "The chapter's mission, vision and latest transmissions — where every pathway in NEXUS begins.",
    topics: ["Mission", "Vision", "Announcements", "Highlights"],
  },
  {
    id: "intelligence",
    code: "T02",
    name: "The Intelligence Realm",
    short: "Intelligence Realm",
    href: "/realms/intelligence",
    accent: "#8a6bff",
    purpose: "AI and emerging technologies",
    description: "A research facility of floating data structures where machines learn to see, speak and reason.",
    topics: ["Machine Learning", "Deep Learning", "Generative AI", "NLP", "Computer Vision", "Data Science"],
  },
  {
    id: "frontier",
    code: "T03",
    name: "The Technology Frontier",
    short: "Technology Frontier",
    href: "/realms/technology",
    accent: "#4d8dff",
    purpose: "The technologies that build the future",
    description: "An interconnected metropolis of software, networks and infrastructure — engineered in the open.",
    topics: ["Software Engineering", "Web", "Cloud", "Cybersecurity", "Networking", "Blockchain", "IoT", "Open Source"],
  },
  {
    id: "colosseum",
    code: "T04",
    name: "The Event Colosseum",
    short: "Event Colosseum",
    href: "/events",
    accent: "#ff9d6b",
    purpose: "Every gathering of the chapter",
    description: "A colossal arena of portals — hackathons, workshops, competitions, talks and bootcamps.",
    topics: ["Hackathons", "Workshops", "Competitions", "Seminars", "Guest Lectures", "Bootcamps"],
  },
  {
    id: "vault",
    code: "T05",
    name: "The Innovation Vault",
    short: "Innovation Vault",
    href: "/vault",
    accent: "#3ee6c2",
    purpose: "Student innovation",
    description: "A sealed archive of holograms — the projects, prototypes and research built by the community.",
    topics: ["Projects", "Research", "Prototypes", "Open Source", "Challenges"],
  },
  {
    id: "sanctuary",
    code: "T06",
    name: "The Legacy Sanctuary",
    short: "Legacy Sanctuary",
    href: "/team",
    accent: "#d8b25e",
    purpose: "The people and history of ACM MIT",
    description: "A monumental archive where every member's contribution becomes a star in the constellation.",
    topics: ["Committee", "Core Team", "Teams", "Alumni", "Achievements", "Milestones"],
  },
];

export function getTerritory(id: TerritoryId): Territory {
  const t = territories.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown territory: ${id}`);
  return t;
}
