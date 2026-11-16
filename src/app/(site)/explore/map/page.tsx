import type { Metadata } from "next";
import { CityMap } from "@/components/explore/CityMap";
import { TerritoryList } from "@/components/explore/TerritoryList";
import { PageHeader } from "@/components/sections/PageHeader";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { pages } from "@/config/pages";

export const metadata: Metadata = { title: pages.map.title, description: pages.map.description };

export default function Page() {
  const page = pages.map;
  return (
    <>
      <PageHeader
        eyebrow={page.eyebrow}
        title={page.title}
        description={page.description}
        breadcrumbs={[{ label: "NEXUS", href: "/" }, { label: "Explore", href: "/explore" }, { label: page.title }]}
      />
      <Container className="py-12">
        <div className="nexus-frame p-3 sm:p-6">
          <CityMap className="mx-auto w-full max-w-4xl" />
        </div>
        <div className="mt-6">
          <Button href="/explore" variant="secondary" size="sm">
            Explore in 3D
          </Button>
        </div>
        <div className="mt-10">
          <TerritoryList />
        </div>
      </Container>
    </>
  );
}
