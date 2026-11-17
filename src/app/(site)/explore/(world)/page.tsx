import type { Metadata } from "next";
import { ExploreStage } from "@/components/explore/ExploreStage";
import { TerritoryList } from "@/components/explore/TerritoryList";
import { OpenFromQuery } from "@/components/explore/WorldRouting";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { pages } from "@/config/pages";
import { digestActivity, districtDigests } from "@/lib/data/districts";
import { hallBoards } from "@/lib/data/halls";
import { listHeritage } from "@/lib/data/public";

/** Re-read published heritage entries at most every five minutes. */
export const revalidate = 300;

export const metadata: Metadata = { title: pages.explore.title, description: pages.explore.description };

export default async function Page() {
  const [{ items: heritage }, digests, boards] = await Promise.all([listHeritage(), districtDigests(), hallBoards()]);
  return (
    <>
      <h1 className="sr-only">{pages.explore.title}</h1>
      <OpenFromQuery />
      <ExploreStage heritage={heritage} digests={digests} boards={boards} activity={digestActivity(digests)} />
      <Container className="py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-[0.22em] text-cyan uppercase">{pages.explore.eyebrow}</p>
            <h2 className="mt-2 font-display text-2xl tracking-[0.06em] text-ice uppercase">The six territories</h2>
            <p className="mt-2 max-w-xl text-silver">
              Every district can also be reached from here, or switch the whole website to 2D with the 2D / 3D switch in the header.
            </p>
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
