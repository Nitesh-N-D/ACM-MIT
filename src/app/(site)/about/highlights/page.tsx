import { TopicHallPage } from "@/components/district/TopicHall";
import { HALLS } from "@/config/topics";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 300;

const hall = HALLS.core[0]!;

export const metadata = pageMetadata({ title: "Highlights · Central Core", description: hall.blurb, path: "/about/highlights" });

export default function Page() {
  return <TopicHallPage id="core" hall={hall} />;
}
