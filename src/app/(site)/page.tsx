import { GatewayControls } from "@/components/gateway/GatewayControls";
import { GatewayStage } from "@/components/gateway/GatewayStage";
import { Hero } from "@/components/home/Hero";
import { JoinBand } from "@/components/home/JoinBand";
import { Pillars } from "@/components/home/Pillars";
import { TerritoryGrid } from "@/components/home/TerritoryGrid";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { CardGrid, EventCard, ProjectCard } from "@/components/content/Cards";
import { getSettings, listEvents, listProjects } from "@/lib/data/public";

export default async function HomePage() {
  const [{ home }, events, projects] = await Promise.all([getSettings(), listEvents(), listProjects()]);
  // Only real chapter records are featured on the front page, never demonstration content.
  const featuredEvents = events.source === "live" ? events.items.filter((e) => e.featured).slice(0, 3) : [];
  const featuredProjects = projects.source === "live" ? projects.items.filter((p) => p.featured).slice(0, 3) : [];
  const featured = featuredEvents.length + featuredProjects.length > 0 || Boolean(home.featuredNote);

  return (
    <>
      <Hero heading={home.heading} subheading={home.subheading} tagline={home.tagline} visual={<GatewayStage />} overlay={<GatewayControls />} />

      {featured && (
        <section aria-labelledby="featured-heading" className="border-t border-line py-24">
          <Container>
            <SectionHeading id="featured-heading" eyebrow="Now in NEXUS" title="Featured" description={home.featuredNote || undefined} />
            {featuredEvents.length > 0 && (
              <div className="mt-12">
                <CardGrid>
                  {featuredEvents.map((e) => (
                    <EventCard key={e.id} event={e} />
                  ))}
                </CardGrid>
              </div>
            )}
            {featuredProjects.length > 0 && (
              <div className="mt-8">
                <CardGrid>
                  {featuredProjects.map((p) => (
                    <ProjectCard key={p.id} project={p} />
                  ))}
                </CardGrid>
              </div>
            )}
          </Container>
        </section>
      )}

      <section aria-labelledby="territories-heading" className="border-t border-line py-24">
        <Container>
          <SectionHeading
            id="territories-heading"
            eyebrow="The six territories"
            title="Choose your destination"
            description="Every part of ACM MIT lives in a territory of NEXUS. Enter one, or see the whole civilization from above."
            action={
              <Button href="/explore/map" variant="secondary" size="sm">
                Open city map
              </Button>
            }
          />
          <div className="mt-14">
            <TerritoryGrid />
          </div>
        </Container>
      </section>

      <Pillars />
      <JoinBand />
    </>
  );
}
