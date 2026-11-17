import Link from "next/link";
import { CardGrid, LearningCard } from "@/components/content/Cards";
import { DistrictPage, DistrictSection, SourceNotice } from "@/components/district/District";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { getTerritory } from "@/config/territories";
import { getSettings, listLearning } from "@/lib/data/public";
import type { LearningRow } from "@/lib/data/types";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Workshops & Learning",
  description: "Workshops, learning paths and resources curated by the ACM MIT Campus Student Chapter.",
  path: "/learning",
});

const accent = getTerritory("intelligence").accent;

const KINDS: { kind: LearningRow["kind"]; title: string; eyebrow: string }[] = [
  { kind: "workshop", title: "Workshops", eyebrow: "Hands-on" },
  { kind: "path", title: "Learning paths", eyebrow: "Step by step" },
  { kind: "resource", title: "Resources", eyebrow: "Library" },
];

const REALMS: { value: "" | LearningRow["realm"]; label: string }[] = [
  { value: "", label: "Everything" },
  { value: "intelligence", label: "Intelligence Realm" },
  { value: "technology", label: "Technology Frontier" },
  { value: "general", label: "General" },
];

type Search = { realm?: string | string[]; kind?: string | string[] };

function filterHref(realm: string, kind: string) {
  const q = new URLSearchParams();
  if (realm) q.set("realm", realm);
  if (kind) q.set("kind", kind);
  const s = q.toString();
  return s ? `/learning?${s}` : "/learning";
}

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const [settings, learning] = await Promise.all([getSettings(), listLearning()]);
  const realm = REALMS.find((r) => r.value && r.value === sp.realm)?.value ?? "";
  const kind = KINDS.find((k) => k.kind === sp.kind)?.kind ?? "";
  const list = learning.items.filter((l) => (!realm || l.realm === realm) && (!kind || l.kind === kind));
  const chip = (on: boolean) =>
    `border px-3 py-1.5 font-mono text-[0.66rem] tracking-[0.16em] uppercase transition-colors ${on ? "text-ice" : "border-line text-silver hover:border-line-strong hover:text-ice"}`;

  return (
    <DistrictPage
      id="intelligence"
      title="Workshops & Learning"
      copy={{ ...settings.districts.intelligence, description: "Learning paths, workshop material and resources curated by the chapter, for every level." }}
      crumbs={[{ label: "Intelligence Realm", href: "/realms/intelligence" }]}
      actions={
        <Button href="/events/topics/workshops" variant="secondary">
          Upcoming workshops
        </Button>
      }
    >
      <SourceNotice source={learning.source} what="learning resources" />

      {learning.items.length > 0 && (
        <div className="mb-10 space-y-3">
          <nav aria-label="Filter by realm" className="flex flex-wrap gap-2">
            {REALMS.map((r) => (
              <Link
                key={r.value || "all"}
                href={filterHref(r.value, kind)}
                aria-current={r.value === realm ? "page" : undefined}
                className={chip(r.value === realm)}
                style={r.value === realm ? { borderColor: accent } : undefined}
              >
                {r.label}
              </Link>
            ))}
          </nav>
          <nav aria-label="Filter by kind" className="flex flex-wrap gap-2">
            {[{ kind: "" as const, title: "All kinds" }, ...KINDS].map((k) => (
              <Link
                key={k.kind || "all"}
                href={filterHref(realm, k.kind)}
                aria-current={k.kind === kind ? "page" : undefined}
                className={chip(k.kind === kind)}
                style={k.kind === kind ? { borderColor: accent } : undefined}
              >
                {k.title}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {list.length === 0
        ? learning.source !== "error" && (
            <EmptyState
              title={learning.items.length ? "Nothing matches these filters" : "The library is being stocked"}
              description={
                learning.items.length
                  ? "Try another realm or kind."
                  : "Workshop material, learning paths and resources appear here as the chapter publishes them from the admin centre."
              }
              action={
                learning.items.length ? (
                  <Button href="/learning" variant="ghost" size="sm">
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          )
        : KINDS.map((k) => {
            const items = list.filter((l) => l.kind === k.kind);
            if (items.length === 0) return null;
            return (
              <DistrictSection key={k.kind} id={`learning-${k.kind}`} eyebrow={k.eyebrow} title={`${k.title} (${items.length})`}>
                <CardGrid>
                  {items.map((l) => (
                    <li key={l.id}>
                      <LearningCard item={l} accent={accent} />
                    </li>
                  ))}
                </CardGrid>
              </DistrictSection>
            );
          })}
    </DistrictPage>
  );
}
