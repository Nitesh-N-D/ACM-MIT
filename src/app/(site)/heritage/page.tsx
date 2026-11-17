import Image from "next/image";
import { PageHeader } from "@/components/sections/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState, Notice } from "@/components/ui/States";
import { HERITAGE_GALLERIES, type HeritageEntry, type HeritageGallery } from "@/config/heritage";
import { listHeritage } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";
import { mediaUrl } from "@/lib/supabase/env";

/** Re-read published heritage entries at most every five minutes. */
export const revalidate = 300;

export const metadata = pageMetadata({
  title: "ACM Heritage Archive",
  description:
    "The verified history of ACM worldwide, of ACM India, and of the ACM MIT Campus Student Chapter — three galleries, every exhibit sourced.",
  path: "/heritage",
});

function byGallery(items: HeritageEntry[], id: HeritageGallery) {
  // Dated milestones in order; undated ("today") entries close the gallery.
  return items
    .filter((i) => i.gallery === id)
    .sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999) || a.sort_order - b.sort_order);
}

function host(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Exhibit({ entry, accent }: { entry: HeritageEntry; accent: string }) {
  const img = mediaUrl(entry.image_path);
  return (
    <li className="relative pl-8">
      <span aria-hidden="true" className="absolute top-1.5 left-[3px] size-2.5 rotate-45 border" style={{ borderColor: accent, background: `${accent}33` }} />
      <article className="nexus-frame p-5">
        <p className="font-mono text-[0.68rem] tracking-[0.2em] uppercase" style={{ color: accent }}>
          {entry.date_label || (entry.year ?? "")}
        </p>
        <h3 className="mt-2 font-display text-lg text-ice">{entry.title}</h3>
        <p className="mt-2 leading-relaxed text-silver">{entry.summary}</p>
        {entry.body && <p className="mt-3 text-sm leading-relaxed text-muted">{entry.body}</p>}
        {img && (
          <Image src={img} alt={entry.image_alt} width={640} height={400} className="mt-4 h-auto w-full max-w-md border border-line object-cover" unoptimized />
        )}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <a href={entry.source_url} target="_blank" rel="noopener noreferrer" className="text-mist underline decoration-line-strong underline-offset-4 hover:text-ice">
            Source: {entry.source_label || host(entry.source_url)}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          {entry.link_url && (
            <a href={entry.link_url} target="_blank" rel="noopener noreferrer" className="font-mono text-xs tracking-[0.14em] uppercase hover:text-ice" style={{ color: accent }}>
              {entry.link_label || "Explore"} ↗<span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </div>
      </article>
    </li>
  );
}

export default async function Page() {
  const { source, items } = await listHeritage();

  return (
    <>
      <PageHeader
        eyebrow="NEXUS · Heritage"
        title="ACM Heritage Archive"
        description="Three galleries trace where the chapter comes from: ACM worldwide, ACM in India, and the ACM MIT Student Chapter itself. Every exhibit names its source."
        breadcrumbs={[{ label: "NEXUS", href: "/" }, { label: "Heritage Archive" }]}
        aside={
          <Button href="/explore?to=heritage" variant="secondary" size="sm" className="world-hide">
            Walk through it in 3D →
          </Button>
        }
      />

      <Container className="py-12">
        <nav aria-label="Galleries" className="flex flex-wrap gap-2">
          {HERITAGE_GALLERIES.map((g) => (
            <a key={g.id} href={`#${g.id}`} className="border border-line px-3 py-1.5 font-mono text-xs tracking-[0.16em] text-silver uppercase hover:border-line-strong hover:text-ice">
              <span aria-hidden="true" className="mr-2 inline-block size-1.5 rotate-45" style={{ background: g.accent }} />
              {g.code} · {g.short}
            </a>
          ))}
        </nav>

        {source === "reference" && (
          <Notice tone="info" title="Reference collection" className="mt-6 max-w-3xl">
            Showing the verified reference milestones shipped with NEXUS. The chapter archive appears here once it is published from the admin centre.
          </Notice>
        )}

        {HERITAGE_GALLERIES.map((g) => {
          const entries = byGallery(items, g.id);
          return (
            <section key={g.id} id={g.id} aria-labelledby={`${g.id}-title`} className="mt-16 scroll-mt-24 border-t pt-10" style={{ borderTopColor: `${g.accent}55` }}>
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone={g.id === "global" ? "cyan" : g.id === "india" ? "gold" : "violet"}>Gallery {g.code}</Badge>
                {entries.length > 0 && <span className="font-mono text-xs tracking-[0.16em] text-muted uppercase">{entries.length} exhibits</span>}
              </div>
              <h2 id={`${g.id}-title`} className="mt-3 font-display text-2xl tracking-[0.04em] text-ice sm:text-3xl">
                {g.name}
              </h2>
              <p className="mt-3 max-w-2xl leading-relaxed text-silver">{g.intro}</p>

              {entries.length > 0 ? (
                <ol className="relative mt-8 max-w-3xl space-y-5 before:absolute before:top-2 before:bottom-2 before:left-[7px] before:w-px before:bg-line" aria-label={`${g.name} timeline`}>
                  {entries.map((entry) => (
                    <Exhibit key={entry.id} entry={entry} accent={g.accent} />
                  ))}
                </ol>
              ) : (
                <EmptyState
                  className="mt-8 max-w-3xl"
                  title="This gallery is waiting for its first exhibit"
                  description="The chapter's founding, milestones, leadership, events and achievements will be published here by the ACM MIT team — verified, sourced and with consent for every photograph."
                  action={
                    <Button href="/contact" variant="ghost" size="sm">
                      Share chapter history →
                    </Button>
                  }
                />
              )}
            </section>
          );
        })}
      </Container>
    </>
  );
}
