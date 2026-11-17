import "server-only";
import type { TerritoryId } from "@/config/territories";
import { formatDate } from "@/lib/validate";
import { listAchievements, listAnnouncements, listEvents, listLearning, listProjects } from "./public";
import type { EventRow, LearningRow, Source } from "./types";

/** One line of live content shown on a district's displays and in the 3D HUD. */
export type DigestItem = { title: string; meta: string; href: string; external?: boolean };
export type DistrictDigest = { label: string; items: DigestItem[]; source: Source };
export type Digests = Record<TerritoryId, DistrictDigest>;

/** Upcoming first (soonest), then past (most recent), then undated. */
export function sortEvents(events: EventRow[], now = Date.now()) {
  const t = (e: EventRow) => (e.starts_at ? new Date(e.starts_at).getTime() : Number.NaN);
  const upcoming = events.filter((e) => t(e) >= now || (e.ends_at && new Date(e.ends_at).getTime() >= now)).sort((a, b) => t(a) - t(b));
  const past = events.filter((e) => !upcoming.includes(e) && !Number.isNaN(t(e))).sort((a, b) => t(b) - t(a));
  const undated = events.filter((e) => Number.isNaN(t(e)));
  return { upcoming, past, undated };
}

function learningItem(l: LearningRow): DigestItem {
  return { title: l.title, meta: [l.kind, l.level].filter(Boolean).join(" · "), href: l.url ?? "/learning", external: Boolean(l.url) };
}

/**
 * The latest published content of every district, read once per request.
 * Empty lists stay empty: the HUD then says so instead of inventing items.
 */
export async function districtDigests(): Promise<Digests> {
  const [announcements, learning, events, projects, achievements] = await Promise.all([
    listAnnouncements(),
    listLearning(),
    listEvents(),
    listProjects(),
    listAchievements(),
  ]);
  const { upcoming, past, undated } = sortEvents(events.items);
  const realm = (r: LearningRow["realm"]) =>
    learning.items
      .filter((l) => l.realm === r)
      .slice(0, 3)
      .map(learningItem);

  return {
    core: {
      label: "Latest transmissions",
      source: announcements.source,
      items: announcements.items.slice(0, 3).map((a) => ({ title: a.title, meta: formatDate(a.published_at ?? a.created_at), href: `/announcements#${a.slug}` })),
    },
    intelligence: { label: "Learning in this realm", source: learning.source, items: realm("intelligence") },
    frontier: { label: "Learning in this realm", source: learning.source, items: realm("technology") },
    colosseum: {
      label: upcoming.length ? "Upcoming events" : "Recent events",
      source: events.source,
      items: [...upcoming, ...past, ...undated].slice(0, 3).map((e) => ({ title: e.title, meta: formatDate(e.starts_at), href: `/events/${e.slug}` })),
    },
    vault: {
      label: "On display",
      source: projects.source,
      items: projects.items.slice(0, 3).map((p) => ({ title: p.title, meta: p.tags.slice(0, 3).join(" · ") || p.team, href: `/vault/${p.slug}` })),
    },
    sanctuary: {
      label: "Recent achievements",
      source: achievements.source,
      items: achievements.items.slice(0, 3).map((a) => ({ title: a.title, meta: a.achieved_on ? formatDate(a.achieved_on) : a.category, href: "/achievements" })),
    },
  };
}

/** 0..1 per district: how much published content it holds (drives the 3D glow). */
export function digestActivity(d: Digests): Partial<Record<TerritoryId, number>> {
  return Object.fromEntries(Object.entries(d).map(([id, v]) => [id, Math.min(1, v.items.length / 3)]));
}
