import "server-only";
import type { TerritoryId } from "@/config/territories";
import type { HeritageEntry } from "@/config/heritage";
import { HALLS, hallHref, type TopicHall } from "@/config/topics";
import { formatDate } from "@/lib/validate";
import { sortEvents, type DigestItem } from "./districts";
import { getSettings, listAchievements, listAnnouncements, listEvents, listHeritage, listLearning, listProjects, listTeam } from "./public";
import type { AchievementRow, AnnouncementRow, EventRow, LearningRow, Loaded, ProjectRow, SettingsMap, Source, TeamRow } from "./types";

/**
 * What each topic hall holds. One source for both the hall's page and the
 * boards of its room in the 3D world, so the two always agree.
 */

type Section<K extends string, T> = { id: string; eyebrow: string; title: string; kind: K; items: T[] };
/** A statement published by the chapter (its mission or vision). */
export type HallText = { id: string; body: string };
export type HallSection =
  | Section<"events", EventRow>
  | Section<"projects", ProjectRow>
  | Section<"learning", LearningRow>
  | Section<"achievements", AchievementRow>
  | Section<"announcements", AnnouncementRow>
  | Section<"people", TeamRow>
  | Section<"milestones", HeritageEntry>
  | Section<"text", HallText>;
export type HallContent = { source: Source; sections: HallSection[]; count: number };

type Data = {
  events: Loaded<EventRow>;
  projects: Loaded<ProjectRow>;
  learning: Loaded<LearningRow>;
  achievements: Loaded<AchievementRow>;
  announcements: Loaded<AnnouncementRow>;
  team: Loaded<TeamRow>;
  milestones: Loaded<HeritageEntry>;
  settings: SettingsMap;
};

async function load(): Promise<Data> {
  const [events, projects, learning, achievements, announcements, team, heritage, settings] = await Promise.all([
    listEvents(),
    listProjects(),
    listLearning(),
    listAchievements(),
    listAnnouncements(),
    listTeam(),
    listHeritage(),
    getSettings(),
  ]);
  // The chapter's own gallery of the Heritage Archive. The reference set
  // (no backend) holds no chapter entries, so it is simply empty then.
  const milestones: Loaded<HeritageEntry> = {
    source: "live",
    items: heritage.items.filter((h) => h.gallery === "chapter").sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999) || a.sort_order - b.sort_order),
  };
  return { events, projects, learning, achievements, announcements, team, milestones, settings };
}

type Fed = { source: Source; sections: HallSection[] };

/** A hall that shows one kind of the chapter's content (the Committee, every project…). */
function feedOf(hall: TopicHall, data: Data): Fed | null {
  const people = (kind: TeamRow["group_kind"], eyebrow: string, title: string, activeOnly: boolean): Fed => ({
    source: data.team.source,
    sections: [{ id: `hall-${kind}`, eyebrow, title, kind: "people", items: data.team.items.filter((p) => p.group_kind === kind && (!activeOnly || p.active)) }],
  });
  const text = (key: "mission" | "vision", title: string): Fed => {
    const body = data.settings.districts.core?.[key]?.trim();
    return { source: "live", sections: [{ id: `hall-${key}`, eyebrow: "In the chapter's words", title, kind: "text", items: body ? [{ id: key, body }] : [] }] };
  };
  switch (hall.feed) {
    case "mission":
      return text("mission", "Our mission");
    case "vision":
      return text("vision", "Our vision");
    case "announcements":
      return { source: data.announcements.source, sections: [{ id: "hall-announcements", eyebrow: "Transmissions", title: "Latest announcements", kind: "announcements", items: data.announcements.items }] };
    case "projects":
      return { source: data.projects.source, sections: [{ id: "hall-projects", eyebrow: "On display", title: "Every project", kind: "projects", items: data.projects.items }] };
    case "committee":
      return people("committee", "Office bearers", "Committee", true);
    case "core-team":
      return people("core", "Builders", "Core team", true);
    case "alumni":
      return people("alumni", "Those before us", "Alumni", false);
    case "achievements":
      return { source: data.achievements.source, sections: [{ id: "hall-achievements", eyebrow: "Honours", title: "Achievements", kind: "achievements", items: data.achievements.items }] };
    case "milestones":
      return { source: data.milestones.source, sections: [{ id: "hall-milestones", eyebrow: "Chapter gallery", title: "Milestones", kind: "milestones", items: data.milestones.items }] };
    default:
      return null;
  }
}

/** Whole-word, case-insensitive match of any of the hall's words. */
function matcher(words: string[]) {
  if (words.length === 0) return () => false;
  const re = new RegExp(`\\b(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "i");
  return (...texts: (string | null | undefined)[]) => texts.some((t) => t && re.test(t));
}

const worst = (...s: Source[]): Source => (s.includes("error") ? "error" : s.includes("sample") ? "sample" : "live");

function contentOf(id: TerritoryId, hall: TopicHall, data: Data): HallContent {
  const fed = feedOf(hall, data);
  if (fed) {
    const filled = fed.sections.filter((s) => s.items.length > 0);
    return { source: fed.source, sections: filled, count: filled.reduce((n, s) => n + s.items.length, 0) };
  }
  const { events, projects, learning, achievements } = data;
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
export type HallBoard = {
  name: string;
  blurb: string;
  source: Source;
  count: number;
  items: (DigestItem & { kind: string })[];
  /** A statement the main display shows in full instead of tiles (Mission, Vision). */
  text?: string;
};
/** Keyed `${district}/${slug}`. */
export type HallBoards = Record<string, HallBoard>;

export const BOARD_ITEMS = 6;

/** Where an item with no page of its own opens: its card on the hall's page. */
const onHallPage = (page: string, anchor: string) => `${page}#${anchor}`;

function boardItems(content: HallContent, page: string): HallBoard["items"] {
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
          return s.items.map((a) => ({ kind: "Achievement", title: a.title, meta: a.achieved_on ? formatDate(a.achieved_on) : a.category, href: onHallPage(page, `achievement-${a.id}`) }));
        case "announcements":
          return s.items.map((a) => ({ kind: a.pinned ? "Pinned" : "Announcement", title: a.title, meta: formatDate(a.published_at ?? a.created_at), href: `/announcements#${a.slug}` }));
        case "people":
          return s.items.map((p) => ({ kind: p.position || "Member", title: p.name, meta: p.tenure, href: onHallPage(page, `person-${p.id}`) }));
        case "milestones":
          return s.items.map((m) => ({ kind: m.date_label || (m.year ? String(m.year) : "Milestone"), title: m.title, meta: m.source_label, href: onHallPage(page, `milestone-${m.id}`) }));
        case "text":
          return [];
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
      const text = content.sections.find((s) => s.kind === "text")?.items[0]?.body;
      out[`${id}/${hall.slug}`] = { name: hall.name, blurb: hall.blurb, source: content.source, count: content.count, items: boardItems(content, hallHref(id, hall.slug)), text };
    }
  }
  return out;
}
