import { CardGrid, LearningCard } from "@/components/content/Cards";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { getTerritory, type TerritoryId } from "@/config/territories";
import { getSettings, listLearning } from "@/lib/data/public";
import type { LearningRow } from "@/lib/data/types";
import { DistrictPage, DistrictSection, SourceNotice } from "./District";

const GROUPS: { kind: LearningRow["kind"]; title: string; eyebrow: string }[] = [
  { kind: "path", title: "Learning paths", eyebrow: "Guided routes" },
  { kind: "workshop", title: "Workshops", eyebrow: "Hands-on sessions" },
  { kind: "resource", title: "Resources", eyebrow: "Reading & tools" },
];

/** Intelligence Realm and Technology Frontier: topics plus the learning catalogue of that realm. */
export async function RealmPage({ id, realm, title }: { id: Extract<TerritoryId, "intelligence" | "frontier">; realm: "intelligence" | "technology"; title: string }) {
  const [settings, learning] = await Promise.all([getSettings(), listLearning()]);
  const t = getTerritory(id);
  // Sample entries are realm-agnostic; show them so the layout is reviewable.
  const items = learning.items.filter((l) => l.realm === realm || (learning.source === "sample" && l.realm === "general"));

  return (
    <DistrictPage
      id={id}
      title={title}
      copy={settings.districts[id]}
      actions={
        <>
          <Button href="/learning">All learning</Button>
          <Button href="/events?category=workshop" variant="secondary">
            Upcoming workshops
          </Button>
        </>
      }
    >
      <SourceNotice source={learning.source} what="learning resources" />
      {items.length === 0
        ? learning.source !== "error" && (
            <EmptyState
              title={`Nothing published in the ${t.short} yet`}
              description="Learning paths, workshops and resources for this realm are added by the chapter from the admin centre and appear here as soon as they are published."
              action={
                <Button href="/learning" variant="ghost" size="sm">
                  Browse all learning →
                </Button>
              }
            />
          )
        : GROUPS.map((g) => {
            const list = items.filter((i) => i.kind === g.kind);
            if (list.length === 0) return null;
            return (
              <DistrictSection key={g.kind} id={`${id}-${g.kind}`} eyebrow={g.eyebrow} title={g.title}>
                <CardGrid>
                  {list.map((item) => (
                    <li key={item.id}>
                      <LearningCard item={item} accent={t.accent} />
                    </li>
                  ))}
                </CardGrid>
              </DistrictSection>
            );
          })}
    </DistrictPage>
  );
}
