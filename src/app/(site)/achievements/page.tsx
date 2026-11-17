import Link from "next/link";
import { AchievementItem, CardGrid } from "@/components/content/Cards";
import { DistrictPage, DistrictSection, SourceNotice } from "@/components/district/District";
import { EmptyState } from "@/components/ui/States";
import { getTerritory } from "@/config/territories";
import { getSettings, listAchievements } from "@/lib/data/public";
import type { AchievementRow } from "@/lib/data/types";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Achievements",
  description: "Milestones, awards and recognitions of the ACM MIT Campus Student Chapter and its members.",
  path: "/achievements",
});

const accent = getTerritory("sanctuary").accent;

function byYear(items: AchievementRow[]) {
  const groups = new Map<string, AchievementRow[]>();
  for (const a of items) {
    const year = a.achieved_on ? String(new Date(a.achieved_on).getUTCFullYear()) : "";
    groups.set(year, [...(groups.get(year) ?? []), a]);
  }
  return [...groups.entries()].sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : Number(b) - Number(a)));
}

export default async function Page({ searchParams }: { searchParams: Promise<{ category?: string | string[] }> }) {
  const sp = await searchParams;
  const [settings, achievements] = await Promise.all([getSettings(), listAchievements()]);
  const categories = [...new Set(achievements.items.map((a) => a.category).filter(Boolean))].sort();
  const category = typeof sp.category === "string" && categories.includes(sp.category) ? sp.category : "";
  const list = category ? achievements.items.filter((a) => a.category === category) : achievements.items;

  return (
    <DistrictPage
      id="sanctuary"
      title="Achievements"
      copy={{ ...settings.districts.sanctuary, description: "Milestones, awards and recognitions earned by the chapter and its members." }}
      crumbs={[{ label: "Team", href: "/team" }]}
    >
      <SourceNotice source={achievements.source} what="achievements" />

      {categories.length > 1 && (
        <nav aria-label="Filter by category" className="mb-10 flex flex-wrap gap-2">
          {["", ...categories].map((c) => {
            const on = c === category;
            return (
              <Link
                key={c || "all"}
                href={c ? `/achievements?category=${encodeURIComponent(c)}` : "/achievements"}
                aria-current={on ? "page" : undefined}
                className={`border px-3 py-1.5 font-mono text-[0.66rem] tracking-[0.16em] uppercase transition-colors ${on ? "text-ice" : "border-line text-silver hover:border-line-strong hover:text-ice"}`}
                style={on ? { borderColor: accent } : undefined}
              >
                {c || "All"}
              </Link>
            );
          })}
        </nav>
      )}

      {list.length === 0
        ? achievements.source !== "error" && (
            <EmptyState
              title="No achievements recorded yet"
              description="Awards, milestones and recognitions are added by the chapter, each with its date and source, as they are confirmed."
            />
          )
        : byYear(list).map(([year, items]) => (
            <DistrictSection key={year || "undated"} id={`year-${year || "undated"}`} eyebrow="Year" title={year || "Undated"}>
              <CardGrid>
                {items.map((a) => (
                  <li key={a.id}>
                    <AchievementItem item={a} />
                  </li>
                ))}
              </CardGrid>
            </DistrictSection>
          ))}
    </DistrictPage>
  );
}
