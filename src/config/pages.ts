/**
 * Registry of public routes that exist in the foundation but whose real
 * content arrives in a later phase. Each entry drives a consistent
 * placeholder page so navigation never dead-ends in a 404.
 */

export type PageEntry = {
  title: string;
  eyebrow: string;
  description: string;
  /** Development phase in which this page receives real content. */
  phase: number;
};

export const pages = {
  about: {
    eyebrow: "Territory 01 · The Central Core",
    title: "About ACM MIT",
    description: "The heart of the chapter — its mission, vision, and the story of the NEXUS civilization.",
    phase: 5,
  },
  explore: {
    eyebrow: "NEXUS · Exploration",
    title: "Explore NEXUS",
    description: "Six territories. One civilization. Choose where to begin.",
    phase: 4,
  },
  map: {
    eyebrow: "NEXUS · Cartography",
    title: "City Map",
    description: "An interactive map of every district in the NEXUS civilization.",
    phase: 4,
  },
  intelligence: {
    eyebrow: "Territory 02 · The Intelligence Realm",
    title: "Intelligence Realm",
    description: "Artificial intelligence, machine learning, data science and the emerging technologies shaping what comes next.",
    phase: 5,
  },
  technology: {
    eyebrow: "Territory 03 · The Technology Frontier",
    title: "Technology Frontier",
    description: "Software engineering, web, cloud, security, networking and open source — the technologies that build the future.",
    phase: 5,
  },
  events: {
    eyebrow: "Territory 04 · The Event Colosseum",
    title: "Events",
    description: "Hackathons, workshops, competitions, talks and every gathering of the chapter.",
    phase: 5,
  },
  vault: {
    eyebrow: "Territory 05 · The Innovation Vault",
    title: "Innovation Vault",
    description: "Student projects, research and experiments built by the NEXUS community.",
    phase: 5,
  },
  learning: {
    eyebrow: "NEXUS · Knowledge",
    title: "Workshops & Learning",
    description: "Learning paths, workshops and resources curated by the chapter.",
    phase: 5,
  },
  team: {
    eyebrow: "Territory 06 · The Legacy Sanctuary",
    title: "Team & Committee",
    description: "The people who build and guide the chapter.",
    phase: 5,
  },
  alumni: {
    eyebrow: "Territory 06 · The Legacy Sanctuary",
    title: "Alumni",
    description: "Those who built NEXUS before us.",
    phase: 5,
  },
  achievements: {
    eyebrow: "Territory 06 · The Legacy Sanctuary",
    title: "Achievements",
    description: "Milestones and recognitions of the chapter.",
    phase: 5,
  },
  gallery: {
    eyebrow: "NEXUS · Archive",
    title: "Gallery",
    description: "Moments captured across the chapter's events and activities.",
    phase: 5,
  },
  announcements: {
    eyebrow: "NEXUS · Transmissions",
    title: "Announcements",
    description: "The latest updates and news from the chapter.",
    phase: 5,
  },
  membership: {
    eyebrow: "NEXUS · Citizenship",
    title: "Membership",
    description: "How to join the chapter and become part of the NEXUS civilization.",
    phase: 5,
  },
  contact: {
    eyebrow: "NEXUS · Signal",
    title: "Contact",
    description: "Reach the ACM MIT team.",
    phase: 5,
  },
  search: {
    eyebrow: "NEXUS · Index",
    title: "Search",
    description: "Search events, projects, announcements and workshops across NEXUS.",
    phase: 5,
  },
  privacy: {
    eyebrow: "NEXUS · Policy",
    title: "Privacy Policy",
    description: "How this website collects, uses and protects your information.",
    phase: 5,
  },
  terms: {
    eyebrow: "NEXUS · Policy",
    title: "Terms & Conditions",
    description: "The terms that govern use of this website.",
    phase: 5,
  },
  accessibility: {
    eyebrow: "NEXUS · Policy",
    title: "Accessibility",
    description: "Our commitment to making NEXUS usable by everyone, and how to report a barrier.",
    phase: 5,
  },
} satisfies Record<string, PageEntry>;

export type PageId = keyof typeof pages;
