import Link from "next/link";
import { AchievementItem, CardGrid, PersonCard } from "@/components/content/Cards";
import { DistrictPage, DistrictSection, SourceNotice } from "@/components/district/District";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { getTerritory } from "@/config/territories";
import { teamSections } from "@/lib/data/halls";
import { getSettings, listAchievements, listTeam, listTeams } from "@/lib/data/public";
import type { TeamRow } from "@/lib/data/types";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata = pageMetadata({
  title: "Team & Committee",
  description: "The faculty, committee and core team who guide and run the ACM MIT Student Chapter.",
  path: "/team",
});

const accent = getTerritory("sanctuary").accent;

const GROUPS: { kind: TeamRow["group_kind"]; title: string; eyebrow: string }[] = [
  { kind: "faculty", title: "Faculty", eyebrow: "Guidance" },
  { kind: "committee", title: "Committee", eyebrow: "Office bearers" },
  { kind: "core", title: "Core team", eyebrow: "Builders" },
  { kind: "volunteer", title: "Volunteers", eyebrow: "Crew" },
  { kind: "member", title: "Members", eyebrow: "Community" },
];

const WINGS = [
  { href: "/alumni", label: "Alumni", text: "Those who built the chapter before us." },
  { href: "/achievements", label: "Achievements", text: "Milestones and recognitions." },
  { href: "/heritage", label: "Heritage Archive", text: "The sourced history of ACM, ACM India and the chapter." },
];

export default async function Page() {
  const [settings, team, teams, achievements] = await Promise.all([getSettings(), listTeam(), listTeams(), listAchievements()]);
  const current = team.items.filter((p) => p.group_kind !== "alumni" && p.active);
  // Working teams (Event Management, Marketing…) with their members. People in
  // a team are listed there; faculty and office bearers keep their own sections too.
  const units = teamSections(teams.items, current);
  const teamOf = new Map(teams.items.map((t) => [t.id, t.name]));
  const inUnit = new Set(units.flatMap((u) => u.items.map((p) => p.id)));
  const leads = (kind: TeamRow["group_kind"]) => kind === "faculty" || kind === "committee";
  const section = (key: string, id: string, eyebrow: string, title: string, people: TeamRow[], description?: string, badge = true) => (
    <DistrictSection key={key} id={id} eyebrow={eyebrow} title={title} description={description}>
      <CardGrid cols={4}>
        {people.map((p) => (
          <li key={p.id} id={`person-${p.id}`} className="scroll-mt-28">
            <PersonCard person={p} accent={accent} team={badge && p.team_id ? teamOf.get(p.team_id) : undefined} />
          </li>
        ))}
      </CardGrid>
    </DistrictSection>
  );

  return (
    <DistrictPage id="sanctuary" title="Team & Committee" copy={settings.districts.sanctuary}>
      <SourceNotice source={team.source} what="team profiles" />

      {current.length === 0
        ? team.source !== "error" && (
            <EmptyState
              title="Team profiles are being prepared"
              description="Each member's profile is published by the chapter only after that person has given permission, so this list fills in as consent is recorded."
              action={
                <Button href="/contact" variant="ghost" size="sm">
                  Contact the chapter →
                </Button>
              }
            />
          )
        : (
            <>
              {GROUPS.filter((g) => leads(g.kind)).map((g) => {
                const people = current.filter((p) => p.group_kind === g.kind);
                return people.length > 0 && section(g.kind, `group-${g.kind}`, g.eyebrow, g.title, people);
              })}
              {units.length > 0 && (
                <div id="teams" className="scroll-mt-28">
                  {units.map((u) => section(u.id, u.id, "Team", u.title, u.items, u.description, false))}
                </div>
              )}
              {GROUPS.filter((g) => !leads(g.kind)).map((g) => {
                const people = current.filter((p) => p.group_kind === g.kind && !inUnit.has(p.id));
                return people.length > 0 && section(g.kind, `group-${g.kind}`, g.eyebrow, g.title, people);
              })}
            </>
          )}

      {achievements.items.length > 0 && (
        <DistrictSection
          id="recent-achievements"
          eyebrow="Honours"
          title="Recent achievements"
          action={
            <Button href="/achievements" variant="ghost" size="sm">
              All achievements →
            </Button>
          }
        >
          <CardGrid>
            {achievements.items.slice(0, 3).map((a) => (
              <li key={a.id}>
                <AchievementItem item={a} />
              </li>
            ))}
          </CardGrid>
        </DistrictSection>
      )}

      <DistrictSection id="sanctuary-wings" eyebrow="The Sanctuary" title="Other halls">
        <ul className="grid gap-4 sm:grid-cols-3">
          {WINGS.map((w) => (
            <li key={w.href}>
              <Link href={w.href} className="nexus-frame block h-full p-5 transition-colors hover:border-line-strong">
                <span className="font-display text-ice">{w.label} →</span>
                <span className="mt-2 block text-sm leading-relaxed text-muted">{w.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </DistrictSection>
    </DistrictPage>
  );
}
