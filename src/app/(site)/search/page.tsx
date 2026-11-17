import Link from "next/link";
import { DistrictPage, DistrictSection, SourceNotice } from "@/components/district/District";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/States";
import { searchAll, type SearchHit } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Search",
  description: "Search events, projects, announcements and learning resources across NEXUS.",
  path: "/search",
});

const KINDS: { kind: SearchHit["kind"]; title: string; tone: BadgeTone }[] = [
  { kind: "Event", title: "Events", tone: "gold" },
  { kind: "Project", title: "Projects", tone: "cyan" },
  { kind: "Announcement", title: "Announcements", tone: "neutral" },
  { kind: "Learning", title: "Learning", tone: "violet" },
];

const SUGGEST = ["hackathon", "workshop", "machine learning", "web", "security"];

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 80);
  const { source, hits } = await searchAll(q);

  return (
    <DistrictPage id="core" title="Search" copy={{ description: "Search events, projects, announcements and learning resources across every district." }}>
      <form role="search" action="/search" className="flex max-w-2xl flex-col gap-3 sm:flex-row">
        <label htmlFor="search-q" className="sr-only">
          Search NEXUS
        </label>
        <Input
          id="search-q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Try “hackathon” or “machine learning”"
          minLength={2}
          maxLength={80}
          autoComplete="off"
          className="flex-1"
        />
        <Button type="submit">Search</Button>
      </form>

      <div className="mt-10">
        <SourceNotice source={source} what="search results" />
        {q.length < 2 ? (
          <div>
            <p className="text-sm text-muted">Type at least two characters, or start with one of these:</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {SUGGEST.map((s) => (
                <li key={s}>
                  <Link
                    href={`/search?q=${encodeURIComponent(s)}`}
                    className="border border-line px-3 py-1.5 font-mono text-[0.66rem] tracking-[0.16em] text-silver uppercase hover:border-line-strong hover:text-ice"
                  >
                    {s}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : hits.length === 0 ? (
          source !== "error" && (
            <EmptyState
              title={`Nothing found for “${q}”`}
              description="Try a shorter or different word. Search covers published events, projects, announcements and learning resources."
            />
          )
        ) : (
          <>
            <p role="status" className="mb-8 font-mono text-[0.68rem] tracking-[0.18em] text-mist uppercase">
              {hits.length} {hits.length === 1 ? "result" : "results"} for “{q}”
            </p>
            {KINDS.map((k) => {
              const list = hits.filter((h) => h.kind === k.kind);
              if (list.length === 0) return null;
              return (
                <DistrictSection key={k.kind} id={`results-${k.kind.toLowerCase()}`} title={`${k.title} (${list.length})`}>
                  <ul className="grid gap-3">
                    {list.map((h) => (
                      <li key={h.href + h.title}>
                        <Link href={h.href} className="nexus-frame block p-5 transition-colors hover:border-line-strong">
                          <Badge tone={k.tone}>{h.kind}</Badge>
                          <span className="mt-2 block font-display text-lg text-ice">{h.title}</span>
                          {h.summary && <span className="mt-1 line-clamp-2 block text-sm text-muted">{h.summary}</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </DistrictSection>
              );
            })}
          </>
        )}
      </div>
    </DistrictPage>
  );
}
