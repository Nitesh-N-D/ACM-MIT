import "server-only";
import { cache } from "react";
import { HERITAGE_REFERENCE, type HeritageEntry } from "@/config/heritage";
import { createPublicClient } from "@/lib/supabase/server";
import { sampleAnnouncements, sampleEvents, sampleLearning, sampleProjects } from "./sample";
import type { AchievementRow, AlbumRow, AnnouncementRow, EventRow, LearningRow, Loaded, MediaRow, ProjectRow, SettingsMap, TeamRow, TeamUnitRow } from "./types";

/**
 * Read side of the public site. Only published rows are requested, and Row
 * Level Security enforces the same rule in the database. Without a backend
 * the lists fall back to labelled sample content (or nothing, for people).
 */

type Query<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

type PublicDb = NonNullable<ReturnType<typeof createPublicClient>>;

async function load<T>(sample: T[], run: (db: PublicDb) => Query<T>): Promise<Loaded<T>> {
  const db = createPublicClient();
  if (!db) return { source: "sample", items: sample };
  try {
    const { data, error } = await run(db);
    if (error) return { source: "error", items: [] };
    return { source: "live", items: data ?? [] };
  } catch {
    return { source: "error", items: [] };
  }
}

export const listEvents = cache(() =>
  load<EventRow>(sampleEvents, (db) => db.from("events").select("*").eq("status", "published").order("starts_at", { ascending: false, nullsFirst: true }).limit(200) as unknown as Query<EventRow>),
);

export async function getEvent(slug: string) {
  const { source, items } = await listEvents();
  return { source, event: items.find((e) => e.slug === slug) ?? null };
}

export const listProjects = cache(() =>
  load<ProjectRow>(sampleProjects, (db) => db.from("projects").select("*").eq("status", "published").order("featured", { ascending: false }).order("created_at", { ascending: false }).limit(200) as unknown as Query<ProjectRow>),
);

export async function getProject(slug: string) {
  const { source, items } = await listProjects();
  return { source, project: items.find((p) => p.slug === slug) ?? null };
}

export const listAnnouncements = cache(() =>
  load<AnnouncementRow>(sampleAnnouncements, (db) => db.from("announcements").select("*").eq("status", "published").order("pinned", { ascending: false }).order("published_at", { ascending: false, nullsFirst: false }).limit(100) as unknown as Query<AnnouncementRow>),
);

export const listLearning = cache(() =>
  load<LearningRow>(sampleLearning, (db) => db.from("learning_resources").select("*").eq("status", "published").order("sort_order").order("created_at", { ascending: false }).limit(300) as unknown as Query<LearningRow>),
);

/** People are never sampled: with no backend this is simply empty. */
export const listTeam = cache(() =>
  load<TeamRow>([], (db) => db.from("team_members").select("*").eq("visible", true).eq("consent_confirmed", true).order("sort_order").order("name").limit(500) as unknown as Query<TeamRow>),
);

/** The chapter's working teams (Event Management, Marketing…), as the command centre orders them. */
export const listTeams = cache(() =>
  load<TeamUnitRow>([], (db) => db.from("teams").select("*").eq("visible", true).order("sort_order").order("name").limit(100) as unknown as Query<TeamUnitRow>),
);

export const listAchievements = cache(() =>
  load<AchievementRow>([], (db) => db.from("achievements").select("*").eq("status", "published").order("achieved_on", { ascending: false, nullsFirst: false }).limit(200) as unknown as Query<AchievementRow>),
);

export const listAlbums = cache(() =>
  load<AlbumRow>([], (db) => db.from("gallery_albums").select("*").eq("status", "published").order("sort_order").order("created_at", { ascending: false }).limit(200) as unknown as Query<AlbumRow>),
);

/** Published photographs: consent recorded, and in a published album or event. */
export const listMedia = cache(() =>
  load<MediaRow>([], (db) => db.from("gallery_items").select("*").eq("consent_confirmed", true).order("featured", { ascending: false }).order("sort_order").order("created_at", { ascending: false }).limit(600) as unknown as Query<MediaRow>),
);

export async function registrationCount(eventId: string): Promise<number | null> {
  const db = createPublicClient();
  if (!db) return null;
  const { data, error } = await db.rpc("event_registration_count", { p_event: eventId });
  return error || typeof data !== "number" ? null : data;
}

export const getSettings = cache(async (): Promise<SettingsMap> => {
  const empty: SettingsMap = { home: {}, districts: {}, site: {}, experience: {} };
  const db = createPublicClient();
  if (!db) return empty;
  try {
    const { data } = await db.from("website_settings").select("key, value");
    for (const row of data ?? []) {
      if (row.key in empty && row.value && typeof row.value === "object") (empty as Record<string, unknown>)[row.key as string] = row.value;
    }
  } catch {
    // Defaults are fine.
  }
  return empty;
});

export type SearchHit = { kind: "Event" | "Project" | "Announcement" | "Learning"; title: string; summary: string; href: string };

export async function searchAll(query: string): Promise<{ source: Loaded<unknown>["source"]; hits: SearchHit[] }> {
  const q = query.trim().toLowerCase().slice(0, 80);
  const [events, projects, announcements, learning] = await Promise.all([listEvents(), listProjects(), listAnnouncements(), listLearning()]);
  const source = [events, projects, announcements, learning].some((l) => l.source === "sample") ? "sample" : events.source;
  if (q.length < 2) return { source, hits: [] };
  const has = (...parts: (string | null | undefined)[]) => parts.some((p) => p?.toLowerCase().includes(q));
  const hits: SearchHit[] = [
    ...events.items.filter((e) => has(e.title, e.summary, e.description, e.category, e.venue)).map((e) => ({ kind: "Event" as const, title: e.title, summary: e.summary, href: `/events/${e.slug}` })),
    ...projects.items.filter((p) => has(p.title, p.summary, p.description, p.team, p.tags.join(" "))).map((p) => ({ kind: "Project" as const, title: p.title, summary: p.summary, href: `/vault/${p.slug}` })),
    ...announcements.items.filter((a) => has(a.title, a.body)).map((a) => ({ kind: "Announcement" as const, title: a.title, summary: a.body.slice(0, 160), href: `/announcements#${a.slug}` })),
    ...learning.items.filter((l) => has(l.title, l.summary, l.level)).map((l) => ({ kind: "Learning" as const, title: l.title, summary: l.summary, href: "/learning" })),
  ];
  return { source, hits: hits.slice(0, 60) };
}

export type HeritageLoaded = {
  /** "reference": no backend (or it failed), showing the verified milestones shipped with the site. */
  source: "live" | "reference";
  items: HeritageEntry[];
};

/**
 * ACM Heritage Archive. Live rows when the database answers; otherwise the
 * verified reference milestones for ACM and ACM India (never chapter content).
 */
export const listHeritage = cache(async (): Promise<HeritageLoaded> => {
  const reference: HeritageLoaded = { source: "reference", items: HERITAGE_REFERENCE };
  const db = createPublicClient();
  if (!db) return reference;
  try {
    const { data, error } = await db
      .from("heritage_entries")
      .select("slug, gallery, year, date_label, title, summary, body, source_url, source_label, image_path, image_alt, image_rights_confirmed, link_url, link_label, sort_order")
      .eq("status", "published")
      .order("year", { ascending: true, nullsFirst: false })
      .order("sort_order")
      .limit(500);
    if (error || !data) return reference;
    const items: HeritageEntry[] = data.map((r) => ({
      id: r.slug as string,
      gallery: r.gallery as HeritageEntry["gallery"],
      year: (r.year as number | null) ?? null,
      date_label: (r.date_label as string) ?? "",
      title: r.title as string,
      summary: r.summary as string,
      body: (r.body as string) ?? "",
      source_url: r.source_url as string,
      source_label: (r.source_label as string) ?? "",
      // Only photographs with confirmed rights are ever shown.
      image_path: r.image_rights_confirmed ? ((r.image_path as string | null) ?? null) : null,
      image_alt: (r.image_alt as string) ?? "",
      link_url: (r.link_url as string | null) ?? null,
      link_label: (r.link_label as string) ?? "",
      sort_order: (r.sort_order as number) ?? 0,
    }));
    return { source: "live", items };
  } catch {
    return reference;
  }
});
