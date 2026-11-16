import type { ReactNode } from "react";
import { GatewayArt } from "@/components/brand/GatewayArt";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { site } from "@/config/site";

type HeroProps = {
  heading?: string;
  subheading?: string;
  tagline?: string;
  /** Replaces the static art; a custom visual owns its own layout (full bleed). */
  visual?: ReactNode;
  /** Layer above the visual (Gateway intro controls). */
  overlay?: ReactNode;
};

/**
 * "Welcome to NEXUS" hero. The static GatewayArt is the default visual and
 * the permanent fallback for the 3D experience.
 */
export function Hero({
  heading = "Welcome to NEXUS",
  subheading = "A new civilization of innovation",
  tagline = site.tagline,
  visual,
  overlay,
}: HeroProps) {
  const [lead, ...rest] = heading.split(" ");
  const last = rest.pop();

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate flex min-h-[calc(100svh-var(--spacing-header))] items-end overflow-hidden pb-16 sm:items-center sm:pb-0"
    >
      <div className="absolute inset-0 -z-10">
        {/* On wide screens the gateway sits right of the copy instead of behind it */}
        {visual ?? (
          <div className="absolute inset-0 lg:left-[28%]">
            <GatewayArt className="size-full" />
          </div>
        )}
        {/* Legibility scrims: left on desktop, bottom on mobile */}
        <div
          data-hero-scrim
          className="pointer-events-none absolute inset-0 bg-linear-to-t from-void via-void/60 to-transparent sm:bg-linear-to-r sm:from-void sm:via-void/50 sm:to-transparent lg:via-void/20"
        />
      </div>

      <Container className="relative py-16" data-hero-content>
        <p className="eyebrow">{site.chapter.fullName}</p>
        <h1 id="hero-heading" className="mt-6 max-w-3xl font-display text-display font-semibold tracking-tight">
          {lead} {rest.join(" ")} {last && <span className="text-cyan">{last}</span>}
        </h1>
        <p className="mt-6 max-w-xl font-display text-base tracking-[0.18em] text-silver uppercase sm:text-xl">
          {subheading}
        </p>
        <p className="mt-6 font-mono text-xs tracking-[0.32em] text-gold uppercase">{tagline}</p>

        <div className="mt-10 flex flex-col gap-3 xs:flex-row xs:flex-wrap">
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

      {/* Scroll cue */}
      <div data-hero-cue aria-hidden="true" className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 sm:flex">
        <span className="font-mono text-[0.6rem] tracking-[0.3em] text-dim uppercase">Descend</span>
        <span className="h-10 w-px bg-linear-to-b from-cyan/70 to-transparent" />
      </div>

      {overlay}
    </section>
  );
}
