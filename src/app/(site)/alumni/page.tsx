import { CardGrid, PersonCard } from "@/components/content/Cards";
import { DistrictPage, DistrictSection, SourceNotice } from "@/components/district/District";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { getTerritory } from "@/config/territories";
import { getSettings, listTeam } from "@/lib/data/public";
import type { TeamRow } from "@/lib/data/types";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata = pageMetadata({
  title: "Alumni",
  description: "Former office bearers and members of the ACM MIT Campus Student Chapter — those who built NEXUS before us.",
  path: "/alumni",
});

const accent = getTerritory("sanctuary").accent;

/** Groups alumni by their tenure label ("2022–23"), newest first; people without one go last. */
function byTenure(people: TeamRow[]) {
  const groups = new Map<string, TeamRow[]>();
  for (const p of people) {
    const key = p.tenure.trim() || "";
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  return [...groups.entries()].sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : b.localeCompare(a, "en", { numeric: true })));
}

export default async function Page() {
  const [settings, team] = await Promise.all([getSettings(), listTeam()]);
  const alumni = team.items.filter((p) => p.group_kind === "alumni" || (!p.active && p.group_kind !== "faculty"));

  return (
    <DistrictPage
      id="sanctuary"
      title="Alumni"
      copy={{ ...settings.districts.sanctuary, description: "Those who built the chapter before us: former office bearers, core team members and volunteers." }}
      crumbs={[{ label: "Team", href: "/team" }]}
    >
      <SourceNotice source={team.source} what="alumni profiles" />
      {alumni.length === 0
        ? team.source !== "error" && (
            <EmptyState
              title="The alumni wall is being prepared"
              description="Former members are added by the chapter only after each person has agreed to be listed. If you are an alumnus or alumna of the chapter, get in touch."
              action={
                <Button href="/contact" variant="ghost" size="sm">
                  Contact the chapter →
                </Button>
              }
            />
          )
        : byTenure(alumni).map(([tenure, people]) => (
            <DistrictSection key={tenure || "other"} id={`alumni-${tenure || "other"}`.replace(/[^a-z0-9-]+/gi, "-")} eyebrow="Tenure" title={tenure || "Earlier years"}>
              <CardGrid cols={4}>
                {people.map((p) => (
                  <li key={p.id}>
                    <PersonCard person={p} accent={accent} />
                  </li>
                ))}
              </CardGrid>
            </DistrictSection>
          ))}
    </DistrictPage>
  );
}
