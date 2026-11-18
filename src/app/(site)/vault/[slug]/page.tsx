import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SourceNotice } from "@/components/district/District";
import { PageHeader } from "@/components/sections/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { getTerritory } from "@/config/territories";
import { getProject, listProjects } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";
import { mediaUrl } from "@/lib/supabase/env";

type Props = { params: Promise<{ slug: string }> };

const accent = getTerritory("vault").accent;

export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { project } = await getProject(slug);
  if (!project) return { title: "Project not found", robots: { index: false } };
  return pageMetadata({ title: project.title, description: project.summary || "A project in the ACM MIT Innovation Vault.", path: `/vault/${project.slug}` });
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const { source, project } = await getProject(slug);
  if (!project) {
    // A failed read is not a missing page: let the error boundary offer a retry.
    if (source === "error") throw new Error("Projects are temporarily unavailable.");
    notFound();
  }

  const img = mediaUrl(project.image_path);
  const { items } = await listProjects();
  const related = items.filter((p) => p.id !== project.id && p.tags.some((t) => project.tags.includes(t))).slice(0, 3);
  const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

  return (
    <>
      <PageHeader
        eyebrow="T05 · Innovation Vault"
        title={project.title}
        accent={accent}
        description={project.summary}
        breadcrumbs={[{ label: "NEXUS", href: "/" }, { label: "Innovation Vault", href: "/vault" }, { label: project.title }]}
      >
        {project.tags.length > 0 && (
          <ul aria-label="Tags" className="mt-6 flex flex-wrap gap-2">
            {project.tags.map((t) => (
              <li key={t}>
                <Link
                  href={`/vault?tag=${encodeURIComponent(t)}`}
                  className="inline-block border border-line px-2.5 py-1 font-mono text-[0.62rem] tracking-[0.14em] text-silver uppercase hover:border-line-strong hover:text-ice"
                >
                  {t}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PageHeader>

      <Container className="py-12 sm:py-16">
        <SourceNotice source={source} what="projects" />
        <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
          <div className="min-w-0">
            {img && (
              <Image
                src={img}
                alt={`${project.title} screenshot`}
                width={1200}
                height={675}
                sizes="(min-width: 1024px) 66vw, 100vw"
                priority
                className="mb-8 aspect-video w-full border border-line object-cover"
              />
            )}
            <h2 className="sr-only">About this project</h2>
            {project.description ? (
              <div className="max-w-3xl space-y-4 text-lg leading-relaxed whitespace-pre-line text-silver">{project.description}</div>
            ) : (
              <p className="text-muted">The team has not published a full write-up yet.</p>
            )}
          </div>
          <aside aria-label="Project details" className="nexus-frame space-y-5 self-start p-6">
            {project.featured && <Badge tone="cyan">Featured project</Badge>}
            {project.team && (
              <div>
                <p className="font-mono text-[0.62rem] tracking-[0.2em] text-dim uppercase">Team</p>
                <p className="mt-1 text-silver">{project.team}</p>
              </div>
            )}
            <div className="flex flex-col gap-2">
              {project.demo_url && (
                <Button href={project.demo_url} {...ext} size="sm">
                  Live demo ↗<span className="sr-only"> (opens in a new tab)</span>
                </Button>
              )}
              {project.repo_url && (
                <Button href={project.repo_url} {...ext} variant="secondary" size="sm">
                  Source code ↗<span className="sr-only"> (opens in a new tab)</span>
                </Button>
              )}
              <Button href="/explore?to=vault:in" variant="ghost" size="sm" className="world-hide">
                See the Vault in 3D →
              </Button>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <section aria-labelledby="related" className="mt-16 border-t border-line pt-10">
            <h2 id="related" className="font-display text-xl text-ice">
              Related projects
            </h2>
            <ul className="mt-5 grid gap-4 md:grid-cols-3">
              {related.map((p) => (
                <li key={p.id}>
                  <Link href={`/vault/${p.slug}`} className="nexus-frame block h-full p-5 hover:border-line-strong">
                    <span className="font-display text-ice">{p.title}</span>
                    {p.summary && <span className="mt-2 block text-sm text-muted">{p.summary}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </Container>
    </>
  );
}
