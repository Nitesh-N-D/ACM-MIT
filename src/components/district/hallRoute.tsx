import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTerritory, type TerritoryId } from "@/config/territories";
import { HALL_BASE, HALLS, getHall } from "@/config/topics";
import { pageMetadata } from "@/lib/seo";
import { TopicHallPage } from "./TopicHall";

type Props = { params: Promise<{ topic: string }> };

/** Route exports shared by every `…/[topic]` hall page of a district. */
export function hallRoute(id: TerritoryId) {
  return {
    generateStaticParams: () => HALLS[id].map((h) => ({ topic: h.slug })),
    async generateMetadata({ params }: Props): Promise<Metadata> {
      const hall = getHall(id, (await params).topic);
      if (!hall) return {};
      return pageMetadata({ title: `${hall.name} · ${getTerritory(id).short}`, description: hall.blurb, path: `${HALL_BASE[id]}/${hall.slug}` });
    },
    async Page({ params }: Props) {
      const hall = getHall(id, (await params).topic);
      if (!hall) notFound();
      return <TopicHallPage id={id} hall={hall} />;
    },
  };
}
