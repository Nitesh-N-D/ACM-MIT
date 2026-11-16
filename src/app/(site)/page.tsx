import { GatewayControls } from "@/components/gateway/GatewayControls";
import { GatewayStage } from "@/components/gateway/GatewayStage";
import { Hero } from "@/components/home/Hero";
import { JoinBand } from "@/components/home/JoinBand";
import { Pillars } from "@/components/home/Pillars";
import { TerritoryGrid } from "@/components/home/TerritoryGrid";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  return (
    <>
      <Hero visual={<GatewayStage />} overlay={<GatewayControls />} />

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
