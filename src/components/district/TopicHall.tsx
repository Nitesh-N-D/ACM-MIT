import Link from "next/link";
import type { CSSProperties } from "react";
import { AchievementItem, CardGrid, EventCard, LearningCard, ProjectCard } from "@/components/content/Cards";
import { TerritoryGlyph } from "@/components/brand/TerritoryGlyph";
import { PageHeader } from "@/components/sections/PageHeader";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/States";
import { getTerritory, type TerritoryId } from "@/config/territories";
import { topicsOf, type TopicHall } from "@/config/topics";
import { hallContent } from "@/lib/data/halls";
import { DistrictNav, DistrictSection, SourceNotice } from "./District";

/**
 * A topic hall: one room off a district's reception (Hackathons in the Event
 * Colosseum, Generative AI in the Intelligence Realm…) listing everything the
 * chapter has published on that topic.
 */
export async function TopicHallPage({ id, hall }: { id: TerritoryId; hall: TopicHall }) {
  const t = getTerritory(id);
  const { source, sections, count } = await hallContent(id, hall);

  const body = sections.map((s) => (
    <DistrictSection key={s.id} id={s.id} eyebrow={s.eyebrow} title={s.title}>
      <CardGrid>
        {s.kind === "events" &&
          s.items.map((e) => (
            <li key={e.id}>
              <EventCard event={e} accent={t.accent} />
            </li>
          ))}
        {s.kind === "projects" &&
          s.items.map((p) => (
            <li key={p.id}>
              <ProjectCard project={p} accent={t.accent} />
            </li>
          ))}
        {s.kind === "learning" &&
          s.items.map((l) => (
            <li key={l.id}>
              <LearningCard item={l} accent={t.accent} />
            </li>
          ))}
        {s.kind === "achievements" &&
          s.items.map((a) => (
            <li key={a.id}>
              <AchievementItem item={a} />
            </li>
          ))}
      </CardGrid>
    </DistrictSection>
  ));

  const topics = topicsOf(id);
  const here = topics.find((x) => x.hall?.slug === hall.slug);

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
        <SourceNotice source={source} what={id === "colosseum" ? "events" : id === "vault" ? "projects" : "entries"} />
        {count > 0
          ? body
          : source !== "error" && (
              <EmptyState
                title={`Nothing in ${hall.name} yet`}
                description={`When the chapter publishes ${id === "colosseum" ? hall.name.toLowerCase() : `work on ${hall.name}`}, it appears in this hall automatically.`}
                action={
                  <Button href={t.href} variant="ghost" size="sm">
                    Back to {t.short} →
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
