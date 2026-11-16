import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
};

/** Standard top-of-page heading block for 2D content pages. */
export function PageHeader({ eyebrow, title, description, children }: PageHeaderProps) {
  return (
    <section className="relative border-b border-line pt-16 pb-14 sm:pt-24 sm:pb-20">
      <Container>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-5 max-w-4xl font-display text-title font-semibold">{title}</h1>
        {description && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">{description}</p>}
        {children}
      </Container>
    </section>
  );
}
