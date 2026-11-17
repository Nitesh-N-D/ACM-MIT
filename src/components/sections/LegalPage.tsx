import type { ReactNode } from "react";
import { PageHeader } from "@/components/sections/PageHeader";
import { Container } from "@/components/ui/Container";

export const LEGAL_UPDATED = "18 November 2026";

/** Long-form policy page: header, contents list and readable prose sections. */
export function LegalPage({ title, description, sections }: { title: string; description: string; sections: { id: string; title: string; body: ReactNode }[] }) {
  return (
    <>
      <PageHeader eyebrow="Policies" title={title} description={description} breadcrumbs={[{ label: "NEXUS", href: "/" }, { label: title }]} />
      <Container className="py-12 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-[14rem_1fr]">
          <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:self-start">
            <p className="font-mono text-[0.62rem] tracking-[0.2em] text-mist uppercase">On this page</p>
            <ol className="mt-3 space-y-2 text-sm">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-silver hover:text-ice">
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="max-w-3xl">
            <p className="font-mono text-[0.66rem] tracking-[0.18em] text-mist uppercase">Last updated {LEGAL_UPDATED}</p>
            {sections.map((s) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="mt-10 scroll-mt-24">
                <h2 id={`${s.id}-h`} className="font-display text-xl text-ice">
                  {s.title}
                </h2>
                <div className="mt-4 space-y-4 leading-relaxed text-silver [&_a]:text-ice [&_a]:underline [&_a]:underline-offset-4 [&_li]:mt-2 [&_strong]:text-ice [&_ul]:list-disc [&_ul]:pl-5">
                  {s.body}
                </div>
              </section>
            ))}
          </div>
        </div>
      </Container>
    </>
  );
}
