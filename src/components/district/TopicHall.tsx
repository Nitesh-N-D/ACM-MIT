import Link from "next/link";
import type { CSSProperties } from "react";
import { AchievementItem, AnnouncementItem, CardGrid, EventCard, LearningCard, PersonCard, ProjectCard } from "@/components/content/Cards";
import { Exhibit } from "@/components/content/HeritageExhibit";
import { TerritoryGlyph } from "@/components/brand/TerritoryGlyph";
import { PageHeader } from "@/components/sections/PageHeader";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/States";
import { getTerritory, type TerritoryId } from "@/config/territories";
import { topicsOf, type HallFeed, type TopicHall } from "@/config/topics";
import { hallContent, type HallSection } from "@/lib/data/halls";
import { DistrictNav, DistrictSection, SourceNotice } from "./District";

/** What the source notice and the empty state call a hall's items. */
const WHAT: Partial<Record<HallFeed, string>> = {
  announcements: "announcements",
  projects: "projects",
  committee: "team profiles",
  "core-team": "team profiles",
  teams: "team profiles",
  alumni: "alumni profiles",
  achievements: "achievements",
  milestones: "milestones",
};

/** Why a hall is empty, in words a visitor can act on. */
function emptyText(id: TerritoryId, hall: TopicHall) {
  switch (hall.feed) {
    case "mission":
    case "vision":
      return `The chapter has not published its ${hall.feed} here yet.`;
    case "committee":
    case "core-team":
    case "teams":
    case "alumni":
      return "Each profile is published only after that person has given permission, so this hall fills in as consent is recorded.";
    case undefined:
      return `When the chapter publishes ${id === "colosseum" ? hall.name.toLowerCase() : `work on ${hall.name}`}, it appears in this hall automatically.`;
    default:
      return `When the chapter publishes ${WHAT[hall.feed]}, they appear in this hall automatically.`;
  }
}

function Items({ section: s, accent }: { section: HallSection; accent: string }) {
  switch (s.kind) {
    case "events":
      return (
        <CardGrid>
          {s.items.map((e) => (
            <li key={e.id}>
              <EventCard event={e} accent={accent} />
            </li>
          ))}
        </CardGrid>
      );
    case "projects":
      return (
        <CardGrid>
          {s.items.map((p) => (
            <li key={p.id}>
              <ProjectCard project={p} accent={accent} />
            </li>
          ))}
        </CardGrid>
      );
    case "learning":
      return (
        <CardGrid>
          {s.items.map((l) => (
            <li key={l.id}>
              <LearningCard item={l} accent={accent} />
            </li>
          ))}
        </CardGrid>
      );
    case "achievements":
      return (
        <CardGrid>
          {s.items.map((a) => (
            <li key={a.id} id={`achievement-${a.id}`} className="scroll-mt-28">
              <AchievementItem item={a} />
            </li>
          ))}
        </CardGrid>
      );
    case "people":
      return (
        <CardGrid cols={4}>
          {s.items.map((p) => (
            <li key={p.id} id={`person-${p.id}`} className="scroll-mt-28">
              <PersonCard person={p} accent={accent} />
            </li>
          ))}
        </CardGrid>
      );
    case "announcements":
      return (
        <ul className="grid gap-5">
          {s.items.map((a) => (
            <li key={a.id}>
              <AnnouncementItem item={a} />
            </li>
          ))}
        </ul>
      );
    case "milestones":
      return (
        <ol className="relative grid gap-5 before:absolute before:top-2 before:bottom-2 before:left-[7px] before:w-px before:bg-line">
          {s.items.map((m) => (
            <Exhibit key={m.id} id={`milestone-${m.id}`} entry={m} accent={accent} />
          ))}
        </ol>
      );
    case "text":
      return (
        <div className="grid gap-5">
          {s.items.map((x) => (
            <blockquote key={x.id} className="nexus-frame max-w-3xl border-l-2 p-6 sm:p-8" style={{ borderLeftColor: accent }}>
              <p className="text-lg leading-relaxed whitespace-pre-line text-silver">{x.body}</p>
            </blockquote>
          ))}
        </div>
      );
  }
}

/**
 * A topic hall: one room off a district's reception (Hackathons in the Event
 * Colosseum, the Committee in the Legacy Sanctuary…) listing everything the
 * chapter has published on that topic.
 */
export async function TopicHallPage({ id, hall }: { id: TerritoryId; hall: TopicHall }) {
  const t = getTerritory(id);
  const { source, sections, count } = await hallContent(id, hall);
  const topics = topicsOf(id);
  const here = topics.find((x) => x.hall?.slug === hall.slug);
  const what = (hall.feed && WHAT[hall.feed]) ?? (id === "colosseum" ? "events" : id === "vault" ? "projects" : "entries");

  return (
    <div style={{ "--accent": t.accent } as CSSProperties}>
      <PageHeader
        eyebrow={`${t.code} · ${t.short} · Hall`}
        title={hall.name}
        accent={t.accent}
        description={hall.blurb}
        breadcrumbs={[{ label: "NEXUS", href: "/" }, { label: t.short, href: t.href }, { label: hall.name }]}
        aside={
          <div className="flex flex-col items-start gap-4 lg:items-end">
            <TerritoryGlyph id={id} className="hidden size-20 lg:block" />
            <Button href={`${t.href}#reception`} variant="secondary" size="sm">
              ← Back to reception
            </Button>
          </div>
        }
      />

      <Container className="py-12 sm:py-16">
        {/* An empty hall says so on its own; only a failed load adds a notice. */}
        <SourceNotice source={source === "offline" ? "live" : source} what={what} />
        {count > 0
          ? sections.map((s) => (
              <DistrictSection
                key={s.id}
                id={s.id}
                eyebrow={s.eyebrow}
                title={s.title}
                description={s.description}
                action={
                  hall.more && (
                    <Button href={hall.more.href} variant="ghost" size="sm">
                      {hall.more.label} →
                    </Button>
                  )
                }
              >
                <Items section={s} accent={t.accent} />
              </DistrictSection>
            ))
          : source !== "error" && (
              <EmptyState
                title={`Nothing in ${hall.name} yet`}
                description={emptyText(id, hall)}
                action={
                  <Button href={hall.more?.href ?? t.href} variant="ghost" size="sm">
                    {hall.more?.label ?? `Back to ${t.short}`} →
                  </Button>
                }
              />
            )}

        <nav aria-label={`Halls of ${t.short}`} className="mt-16 border-t border-line pt-8">
          <p className="font-mono text-[0.62rem] tracking-[0.2em] uppercase" style={{ color: t.accent }}>
            Other halls in {t.short}
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {topics.map((x) => (
              <li key={x.name}>
                <Link
                  href={x.href}
                  aria-current={x === here ? "page" : undefined}
                  className="block border border-line px-3 py-1.5 font-mono text-xs tracking-[0.14em] text-silver uppercase transition-colors hover:border-(--accent)/60 hover:text-ice aria-[current=page]:border-(--accent) aria-[current=page]:text-ice"
                >
                  {x.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>

      <DistrictNav id={id} />
    </div>
  );
}
