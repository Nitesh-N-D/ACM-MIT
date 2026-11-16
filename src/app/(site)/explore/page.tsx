import type { Metadata } from "next";
import { ExploreStage } from "@/components/explore/ExploreStage";
import { TerritoryList } from "@/components/explore/TerritoryList";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { pages } from "@/config/pages";

export const metadata: Metadata = { title: pages.explore.title, description: pages.explore.description };

export default function Page() {
  return (
    <>
      <h1 className="sr-only">{pages.explore.title}</h1>
      <ExploreStage />
      <Container className="py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-[0.22em] text-cyan uppercase">{pages.explore.eyebrow}</p>
            <h2 className="mt-2 font-display text-2xl tracking-[0.06em] text-ice uppercase">The six territories</h2>
            <p className="mt-2 max-w-xl text-silver">The 3D world is optional. Every district can be reached directly from here.</p>
          </div>
          <Button href="/explore/map" variant="secondary" size="sm">
            Open the city map
          </Button>
        </div>
        <div className="mt-8">
          <TerritoryList />
        </div>
      </Container>
    </>
  );
}
