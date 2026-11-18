import type { MetadataRoute } from "next";
import { HALL_BASE, hallsOf } from "@/config/topics";
import { territories } from "@/config/territories";
import { listAlbums, listEvents, listProjects } from "@/lib/data/public";
import { siteUrl } from "@/lib/supabase/env";

/** Rebuilt hourly, so newly published events and projects are listed. */
export const revalidate = 3600;

const PAGES: [path: string, priority: number][] = [
  ["/", 1],
  ["/about", 0.9],
  ["/events", 0.9],
  ["/vault", 0.8],
  ["/membership", 0.8],
  ["/team", 0.7],
  ["/realms/intelligence", 0.7],
  ["/realms/technology", 0.7],
  ["/announcements", 0.7],
  ["/achievements", 0.6],
  ["/gallery", 0.6],
  ["/learning", 0.6],
  ["/heritage", 0.6],
  ["/alumni", 0.5],
  ["/contact", 0.5],
  ["/explore/map", 0.4],
  ["/accessibility", 0.2],
  ["/privacy", 0.2],
  ["/terms", 0.2],
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const at = (
    path: string,
    priority: number,
  ): MetadataRoute.Sitemap[number] => ({
    url: `${base}${path}`,
    priority,
  });
  const [events, projects, albums] = await Promise.all([
    listEvents(),
    listProjects(),
    listAlbums(),
  ]);
  // Sample content (no database) is never offered to search engines.
  const live = <T>(l: { source: string; items: T[] }) =>
    l.source === "live" ? l.items : [];

  return [
    ...PAGES.map(([p, priority]) => at(p, priority)),
    ...territories.flatMap((t) =>
      hallsOf(t.id).map((h) => at(`${HALL_BASE[t.id]}/${h.slug}`, 0.5)),
    ),
    ...live(events).map((e) => at(`/events/${e.slug}`, 0.6)),
    ...live(projects).map((p) => at(`/vault/${p.slug}`, 0.5)),
    ...live(albums).map((a) => at(`/gallery/${a.slug}`, 0.4)),
  ];
}
