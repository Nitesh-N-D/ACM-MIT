import Link from "next/link";
import { CardGrid, EVENT_CATEGORY, EventCard } from "@/components/content/Cards";
import { DistrictPage, DistrictSection, SourceNotice } from "@/components/district/District";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { getTerritory } from "@/config/territories";
import { sortEvents } from "@/lib/data/districts";
import { getSettings, listEvents } from "@/lib/data/public";
import type { EventRow } from "@/lib/data/types";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Events",
  description: "Hackathons, workshops, competitions, seminars, guest lectures and bootcamps of the ACM MIT Student Chapter.",
  path: "/events",
});

const accent = getTerritory("colosseum").accent;

function Grid({ events }: { events: EventRow[] }) {
  return (
    <CardGrid>
      {events.map((e) => (
        <li key={e.id}>
          <EventCard event={e} accent={accent} />
        </li>
      ))}
    </CardGrid>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ category?: string | string[] }> }) {
  const sp = await searchParams;
  const raw = typeof sp.category === "string" ? sp.category : "";
  const category = raw in EVENT_CATEGORY ? raw : "";
  const [settings, events] = await Promise.all([getSettings(), listEvents()]);

  const present = Object.keys(EVENT_CATEGORY).filter((c) => events.items.some((e) => e.category === c));
  const filtered = category ? events.items.filter((e) => e.category === category) : events.items;
  const { upcoming, past, undated } = sortEvents(filtered);

  return (
    <DistrictPage id="colosseum" title="Events" copy={settings.districts.colosseum}>
      <SourceNotice source={events.source} what="events" />

      {present.length > 1 && (
        <nav aria-label="Filter by category" className="mb-10 flex flex-wrap gap-2">
          {["", ...present].map((c) => {
            const on = c === category;
            return (
              <Link
                key={c || "all"}
                href={c ? `/events?category=${c}` : "/events"}
                aria-current={on ? "page" : undefined}
                className={`border px-3 py-1.5 font-mono text-[0.66rem] tracking-[0.16em] uppercase transition-colors ${on ? "border-(--a) text-ice" : "border-line text-silver hover:border-line-strong hover:text-ice"}`}
                style={{ ["--a" as string]: accent }}
              >
                {c ? EVENT_CATEGORY[c] : "All events"}
              </Link>
            );
          })}
        </nav>
      )}

      {filtered.length === 0 && events.source !== "error" ? (
        <EmptyState
          title={category ? `No ${EVENT_CATEGORY[category]!.toLowerCase()} events published` : "No events published yet"}
          description="Events are announced here, with registration, as soon as the chapter publishes them."
          action={
            category ? (
              <Button href="/events" variant="ghost" size="sm">
                Show all events →
              </Button>
            ) : (
              <Button href="/announcements" variant="ghost" size="sm">
                Read announcements →
              </Button>
            )
          }
        />
      ) : (
        <>
          {upcoming.length > 0 && (
            <DistrictSection id="upcoming" eyebrow="In the arena" title="Upcoming">
              <Grid events={upcoming} />
            </DistrictSection>
          )}
          {undated.length > 0 && (
            <DistrictSection id="tba" eyebrow="Being scheduled" title="Date to be announced">
              <Grid events={undated} />
            </DistrictSection>
          )}
          {past.length > 0 && (
            <DistrictSection id="past" eyebrow="Archive" title="Past events">
              <Grid events={past} />
            </DistrictSection>
          )}
        </>
      )}
    </DistrictPage>
  );
}
