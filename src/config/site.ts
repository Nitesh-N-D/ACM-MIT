import { territories } from "@/config/territories";

/**
 * Global site configuration.
 *
 * Chapter-specific facts must come from the ACM MIT team. Anything not yet
 * confirmed is marked with `TODO(chapter)`.
 */

export const site = {
  name: "ACM MIT — NEXUS",
  title: "NEXUS: The Digital Civilization",
  tagline: "Discover. Connect. Innovate. Build.",
  description:
    "NEXUS — the digital civilization of the ACM MIT Campus Student Chapter, Madras Institute of Technology. Discover events, projects, learning and the people building the future.",
  chapter: {
    // Taken from the official logo supplied by the chapter.
    shortName: "ACM MIT",
    fullName: "ACM MIT Campus Student Chapter",
    institution: "Madras Institute of Technology",
    university: "Anna University",
    institutionUrl: "https://mitindia.edu/",
    // TODO(chapter): official chapter email and social links.
    email: null as string | null,
  },
  logo: {
    src: "/brand/acm-mit-logo.jpeg",
    width: 1254,
    height: 1254,
    alt: "ACM MIT Campus Student Chapter logo",
  },
} as const;

export type NavItem = {
  label: string;
  href: string;
  /** Short territory code shown in menus, e.g. "T04". */
  code?: string;
};

/** Primary navigation — kept short so it fits on laptop widths. */
export const primaryNav: NavItem[] = [
  { label: "Explore", href: "/explore", code: "MAP" },
  { label: "About", href: "/about", code: "T01" },
  { label: "Events", href: "/events", code: "T04" },
  { label: "Vault", href: "/vault", code: "T05" },
  { label: "Learning", href: "/learning", code: "LRN" },
  { label: "Team", href: "/team", code: "T06" },
];

export const ctaNav: NavItem = { label: "Join NEXUS", href: "/membership" };

export const footerNav: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Territories",
    items: territories.map((t) => ({ label: t.short, href: t.href, code: t.code })),
  },
  {
    heading: "Chapter",
    items: [
      { label: "Announcements", href: "/announcements" },
      { label: "Gallery", href: "/gallery" },
      { label: "Achievements", href: "/achievements" },
      { label: "Alumni", href: "/alumni" },
      { label: "Membership", href: "/membership" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    heading: "Navigate",
    items: [
      { label: "City Map", href: "/explore/map" },
      { label: "Search", href: "/search" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Accessibility", href: "/accessibility" },
    ],
  },
];

/** True when `pathname` is `href` or a descendant route of it. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
