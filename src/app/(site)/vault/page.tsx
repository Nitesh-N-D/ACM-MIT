import Link from "next/link";
import { CardGrid, ProjectCard } from "@/components/content/Cards";
import { DistrictPage, DistrictSection, SourceNotice } from "@/components/district/District";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { getTerritory } from "@/config/territories";
import { getSettings, listProjects } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Innovation Vault",
  description: "Student projects, research and prototypes built by the ACM MIT community.",
  path: "/vault",
});

const accent = getTerritory("vault").accent;

export default async function Page({ searchParams }: { searchParams: Promise<{ tag?: string | string[] }> }) {
  const sp = await searchParams;
  const [settings, projects] = await Promise.all([getSettings(), listProjects()]);
  const tags = [...new Set(projects.items.flatMap((p) => p.tags))].sort();
  const tag = typeof sp.tag === "string" && tags.includes(sp.tag) ? sp.tag : "";
  const list = tag ? projects.items.filter((p) => p.tags.includes(tag)) : projects.items;
  const featured = list.filter((p) => p.featured);
  const rest = list.filter((p) => !p.featured);

  return (
    <DistrictPage
      id="vault"
      title="Innovation Vault"
      copy={settings.districts.vault}
      actions={
        <Button href="/dashboard/projects/new" variant="secondary">
          Submit a project
        </Button>
      }
    >
      <SourceNotice source={projects.source} what="projects" />

      {tags.length > 1 && (
        <nav aria-label="Filter by tag" className="mb-10 flex flex-wrap gap-2">
          {["", ...tags].map((t) => {
            const on = t === tag;
            return (
              <Link
                key={t || "all"}
                href={t ? `/vault?tag=${encodeURIComponent(t)}` : "/vault"}
                aria-current={on ? "page" : undefined}
                className={`border px-3 py-1.5 font-mono text-[0.66rem] tracking-[0.16em] uppercase transition-colors ${on ? "text-ice" : "border-line text-silver hover:border-line-strong hover:text-ice"}`}
                style={on ? { borderColor: accent } : undefined}
              >
                {t || "All projects"}
              </Link>
            );
          })}
        </nav>
      )}

      {list.length === 0 && projects.source !== "error" ? (
        <EmptyState
          title="The vault is waiting for its first project"
          description="Projects, research and prototypes by ACM MIT members are reviewed by the chapter and published here. Members can submit their own work from the dashboard."
          action={
            <Button href="/dashboard/projects/new" variant="ghost" size="sm">
              Submit a project →
            </Button>
          }
        />
      ) : (
        <>
          {featured.length > 0 && (
            <DistrictSection id="featured" eyebrow="Spotlight" title="Featured">
              <CardGrid cols={2}>
                {featured.map((p) => (
                  <li key={p.id}>
                    <ProjectCard project={p} accent={accent} />
                  </li>
                ))}
              </CardGrid>
            </DistrictSection>
          )}
          {rest.length > 0 && (
            <DistrictSection id="all" eyebrow="Archive" title={featured.length ? "More projects" : "Projects"}>
              <CardGrid>
                {rest.map((p) => (
                  <li key={p.id}>
                    <ProjectCard project={p} accent={accent} />
                  </li>
                ))}
              </CardGrid>
            </DistrictSection>
          )}
        </>
      )}
    </DistrictPage>
  );
}
