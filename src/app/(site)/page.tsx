import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { footerNav, site } from "@/config/site";

/**
 * Home — Phase 1 foundation.
 * The cinematic 3D Gateway replaces the hero in Phase 3; this 2D version
 * remains as the reduced-motion / no-WebGL fallback.
 */
export default function HomePage() {
  const territories = footerNav.find((g) => g.heading === "Territories")?.items ?? [];

  return (
    <>
      <section className="relative flex min-h-[calc(100dvh-var(--spacing-header))] items-center overflow-hidden py-20">
        <Container>
          <p className="eyebrow">{site.chapter.fullName}</p>
          <h1 className="mt-6 font-display text-display font-semibold tracking-tight">
            Welcome to <span className="text-cyan">NEXUS</span>
          </h1>
          <p className="mt-6 font-display text-lg tracking-[0.18em] text-silver uppercase sm:text-xl">
            A new civilization of innovation
          </p>
          <p className="mt-8 font-mono text-xs tracking-[0.32em] text-gold uppercase">{site.tagline}</p>

          <div className="mt-12 flex flex-wrap gap-3">
            <Button href="/explore" size="lg">
              Explore NEXUS
            </Button>
            <Button href="/about" variant="secondary" size="lg">
              Discover ACM MIT
            </Button>
            <Button href="/events" variant="secondary" size="lg">
              Explore Events
            </Button>
          </div>
        </Container>
      </section>

      <section aria-labelledby="territories-heading" className="border-t border-line py-20">
        <Container>
          <p className="eyebrow">The six territories</p>
          <h2 id="territories-heading" className="mt-4 font-display text-3xl font-semibold sm:text-4xl">
            Choose your destination
          </h2>
          <ol className="mt-12 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {territories.map((t) => (
              <li key={t.href} className="bg-void">
                <Link
                  href={t.href}
                  className="group flex h-full flex-col justify-between gap-10 p-8 transition-colors duration-300 hover:bg-deep"
                >
                  <span className="font-mono text-xs tracking-[0.24em] text-dim transition-colors group-hover:text-cyan">
                    {t.code}
                  </span>
                  <span className="flex items-end justify-between gap-4">
                    <span className="font-display text-xl text-ice">{t.label}</span>
                    <span
                      aria-hidden="true"
                      className="text-muted transition-transform duration-300 group-hover:translate-x-1 group-hover:text-cyan"
                    >
                      →
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </Container>
      </section>
    </>
  );
}
