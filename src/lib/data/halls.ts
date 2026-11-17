import "server-only";
import type { TerritoryId } from "@/config/territories";
import { HALLS, type TopicHall } from "@/config/topics";
import { formatDate } from "@/lib/validate";
import { sortEvents, type DigestItem } from "./districts";
import { listAchievements, listEvents, listLearning, listProjects } from "./public";
import type { AchievementRow, EventRow, LearningRow, Loaded, ProjectRow, Source } from "./types";

/**
 * What each topic hall holds. One source for both the hall's page and the
 * boards of its room in the 3D world, so the two always agree.
 */

type Section<K extends string, T> = { id: string; eyebrow: string; title: string; kind: K; items: T[] };
export type HallSection = Section<"events", EventRow> | Section<"projects", ProjectRow> | Section<"learning", LearningRow> | Section<"achievements", AchievementRow>;
export type HallContent = { source: Source; sections: HallSection[]; count: number };

type Data = { events: Loaded<EventRow>; projects: Loaded<ProjectRow>; learning: Loaded<LearningRow>; achievements: Loaded<AchievementRow> };

async function load(): Promise<Data> {
  const [events, projects, learning, achievements] = await Promise.all([listEvents(), listProjects(), listLearning(), listAchievements()]);
  return { events, projects, learning, achievements };
}

/** Whole-word, case-insensitive match of any of the hall's words. */
function matcher(words: string[]) {
  if (words.length === 0) return () => false;
  const re = new RegExp(`\\b(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "i");
  return (...texts: (string | null | undefined)[]) => texts.some((t) => t && re.test(t));
}

const worst = (...s: Source[]): Source => (s.includes("error") ? "error" : s.includes("sample") ? "sample" : "live");

function contentOf(id: TerritoryId, hall: TopicHall, { events, projects, learning, achievements }: Data): HallContent {
  const is = matcher(hall.match);
  const projectMatch = (p: ProjectRow) => is(p.title, p.summary, ...p.tags, ...p.tags.map((tag) => tag.replace(/-/g, " ")));
  const sections: HallSection[] = [];
  let source: Source;

  if (id === "colosseum") {
    source = events.source;
    const { upcoming, past, undated } = sortEvents(events.items.filter((e) => e.category === hall.category));
    sections.push(
      { id: "hall-upcoming", eyebrow: "In the arena", title: "Upcoming", kind: "events", items: upcoming },
      { id: "hall-tba", eyebrow: "Being scheduled", title: "Date to be announced", kind: "events", items: undated },
      { id: "hall-past", eyebrow: "Archive", title: `Past ${hall.name.toLowerCase()}`, kind: "events", items: past },
    );
  } else if (id === "vault") {
    source = projects.source;
    sections.push({ id: "hall-projects", eyebrow: "On display", title: "Projects", kind: "projects", items: projects.items.filter(projectMatch) });
  } else if (id === "core") {
    source = worst(events.source, projects.source, achievements.source);
    sections.push(
      { id: "hall-events", eyebrow: "From the Colosseum", title: "Featured events", kind: "events", items: events.items.filter((e) => e.featured).slice(0, 6) },
      { id: "hall-projects", eyebrow: "From the Vault", title: "Featured projects", kind: "projects", items: projects.items.filter((p) => p.featured).slice(0, 6) },
      { id: "hall-achievements", eyebrow: "From the Sanctuary", title: "Recent achievements", kind: "achievements", items: achievements.items.slice(0, 6) },
    );
  } else {
    // Intelligence Realm and Technology Frontier.
    const realm = id === "intelligence" ? "intelligence" : "technology";
    source = worst(learning.source, events.source, projects.source);
    const ev = sortEvents(events.items.filter((e) => is(e.title, e.summary, e.description)));
    sections.push(
      {
        id: "hall-learning",
        eyebrow: "Learn",
        title: "Paths, workshops & resources",
        kind: "learning",
        items: learning.items.filter((l) => (l.realm === realm || l.realm === "general") && is(l.title, l.summary)),
      },
      { id: "hall-events", eyebrow: "Take part", title: "Events", kind: "events", items: [...ev.upcoming, ...ev.undated, ...ev.past] },
      { id: "hall-projects", eyebrow: "Built by members", title: "Projects", kind: "projects", items: projects.items.filter(projectMatch) },
    );
  }

  const filled = sections.filter((s) => s.items.length > 0);
  return { source, sections: filled, count: filled.reduce((n, s) => n + s.items.length, 0) };
}

export async function hallContent(id: TerritoryId, hall: TopicHall): Promise<HallContent> {
  return contentOf(id, hall, await load());
}

/** A hall as its room's boards show it: name, blurb and its first items. */
export type HallBoard = { name: string; blurb: string; source: Source; count: number; items: (DigestItem & { kind: string })[] };
/** Keyed `${district}/${slug}`. */
export type HallBoards = Record<string, HallBoard>;

export const BOARD_ITEMS = 6;

function boardItems(content: HallContent): HallBoard["items"] {
  return content.sections
    .flatMap((s): HallBoard["items"] => {
      switch (s.kind) {
        case "events":
          return s.items.map((e) => ({ kind: e.category.replace(/-/g, " "), title: e.title, meta: formatDate(e.starts_at), href: `/events/${e.slug}` }));
        case "projects":
          return s.items.map((p) => ({ kind: "Project", title: p.title, meta: p.tags.slice(0, 3).join(" · ") || p.team, href: `/vault/${p.slug}` }));
        case "learning":
          return s.items.map((l) => ({ kind: l.kind, title: l.title, meta: l.level, href: l.url ?? "/learning", external: Boolean(l.url) }));
        case "achievements":
          return s.items.map((a) => ({ kind: "Achievement", title: a.title, meta: a.achieved_on ? formatDate(a.achieved_on) : a.category, href: "/achievements" }));
      }
    })
    .slice(0, BOARD_ITEMS);
}

/** Every topic hall's board, for the rooms of the 3D world. */
export async function hallBoards(): Promise<HallBoards> {
  const data = await load();
  const out: HallBoards = {};
  for (const [id, halls] of Object.entries(HALLS) as [TerritoryId, TopicHall[]][]) {
    for (const hall of halls) {
      const content = contentOf(id, hall, data);
      out[`${id}/${hall.slug}`] = { name: hall.name, blurb: hall.blurb, source: content.source, count: content.count, items: boardItems(content) };
    }
  }
  return out;
}
