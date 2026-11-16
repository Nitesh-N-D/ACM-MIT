import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/sections/PageHeader";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { pages, type PageId } from "@/config/pages";

/** Route of each registry entry, for canonical URLs. */
const PAGE_PATHS: Partial<Record<PageId, string>> = {
  map: "/explore/map",
  intelligence: "/realms/intelligence",
  technology: "/realms/technology",
};

export function placeholderMetadata(id: PageId): Metadata {
  return pageMetadata({ ...pages[id], path: PAGE_PATHS[id] ?? `/${id}` });
}

/**
 * Temporary page body for routes whose content arrives in a later phase.
 * Honest about its state — no invented chapter data.
 */
export function PagePlaceholder({ id }: { id: PageId }) {
  const page = pages[id];
  return (
    <>
      <PageHeader
        eyebrow={page.eyebrow}
        title={page.title}
        description={page.description}
        breadcrumbs={[{ label: "NEXUS", href: "/" }, { label: page.title }]}
      />
      <Container className="py-16">
        <div className="nexus-frame max-w-2xl p-8">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-gold">
            Territory under construction · Phase {page.phase}
          </p>
          <p className="mt-4 leading-relaxed text-silver">
            This section of NEXUS is being built. Chapter information will be added by the ACM MIT team.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/" variant="secondary" size="sm">
              Return to NEXUS
            </Button>
            <Button href="/explore" variant="ghost" size="sm">
              Explore territories →
            </Button>
          </div>
        </div>
      </Container>
    </>
  );
}
