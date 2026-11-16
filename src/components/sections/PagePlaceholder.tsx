import type { Metadata } from "next";
import { PageHeader } from "@/components/sections/PageHeader";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { pages, type PageId } from "@/config/pages";

export function placeholderMetadata(id: PageId): Metadata {
  const page = pages[id];
  return { title: page.title, description: page.description };
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
