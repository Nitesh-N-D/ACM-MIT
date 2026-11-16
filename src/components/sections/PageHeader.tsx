import type { CSSProperties, ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  breadcrumbs?: Crumb[];
  /** Territory accent (hex) tints the eyebrow and the horizon line. */
  accent?: string;
  aside?: ReactNode;
  children?: ReactNode;
};

/** Standard top-of-page heading block for 2D content pages. */
export function PageHeader({ eyebrow, title, description, breadcrumbs, accent, aside, children }: PageHeaderProps) {
  return (
    <section
      className="relative overflow-hidden border-b border-line pt-12 pb-14 sm:pt-16 sm:pb-20"
      style={accent ? ({ "--accent": accent } as CSSProperties) : undefined}
    >
      {/* Horizon glow in the territory accent */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-(--accent,var(--color-cyan))/50 to-transparent"
      />
      <Container className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
          <p className="eyebrow mt-8" style={accent ? { color: accent } : undefined}>
            {eyebrow}
          </p>
          <h1 className="mt-5 max-w-4xl font-display text-title font-semibold">{title}</h1>
          {description && <div className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">{description}</div>}
          {children}
        </div>
        {aside}
      </Container>
    </section>
  );
}
