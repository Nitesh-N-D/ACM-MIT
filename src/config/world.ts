import type { TerritoryId } from "./territories";

/**
 * How NEXUS is shown to a visitor.
 *
 * - "3d" (default): the website lives inside the 3D world. District pages
 *   open as holographic panels over their district, with the city behind.
 * - "2d": the whole website as plain pages, no WebGL anywhere.
 *
 * The choice is a cookie so the server (proxy) can route the first request
 * of a visit; it is not personal data and expires after a year.
 */
export type ViewMode = "3d" | "2d";
export const VIEW_COOKIE = "nexus-view";
export const VIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Where the camera goes when a page opens in the world. */
export type WorldFocus = `${TerritoryId}:in` | "archive";

/**
 * Pages that open inside the 3D world, and the interior they open in.
 * Legal pages, the accessibility statement, sign-in, the member dashboard and
 * the admin centre stay plain pages: they are tools, not places.
 */
const ROUTES: { path: string; focus: WorldFocus; nested?: boolean }[] = [
  { path: "/about", focus: "core:in" },
  { path: "/announcements", focus: "core:in" },
  { path: "/membership", focus: "core:in" },
  { path: "/contact", focus: "core:in" },
  { path: "/search", focus: "core:in" },
  { path: "/realms/intelligence", focus: "intelligence:in" },
  { path: "/learning", focus: "intelligence:in" },
  { path: "/realms/technology", focus: "frontier:in" },
  { path: "/events", focus: "colosseum:in", nested: true },
  { path: "/vault", focus: "vault:in", nested: true },
  { path: "/team", focus: "sanctuary:in" },
  { path: "/alumni", focus: "sanctuary:in" },
  { path: "/achievements", focus: "sanctuary:in" },
  { path: "/gallery", focus: "sanctuary:in" },
  { path: "/heritage", focus: "archive" },
];

/** The interior a path opens in, or null when the path is a plain page. */
export function worldFocus(pathname: string): WorldFocus | null {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  for (const r of ROUTES) {
    if (p === r.path) return r.focus;
    // One level of detail pages only (/events/<slug>), never deeper.
    if (r.nested && p.startsWith(r.path + "/") && !p.slice(r.path.length + 1).includes("/")) return r.focus;
  }
  return null;
}

/** A same-site path that is safe to open from `?open=` (no protocol, no `//`). */
export function safeWorldPath(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  const path = value.split(/[?#]/)[0] ?? "";
  return worldFocus(path) ? value : null;
}

/** The explore URL that opens `href` inside the world. */
export function worldUrl(href: string) {
  return `/explore?open=${encodeURIComponent(href)}`;
}
