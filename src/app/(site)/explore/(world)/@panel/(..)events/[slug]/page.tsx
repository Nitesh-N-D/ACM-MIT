import Page from "@/app/(site)/events/[slug]/page";
import { WorldPanel } from "@/components/explore/WorldPanel";

/** /events/[slug] opened from the 3D world: the same page, on a panel over its district. */
export default function Panel(props: Parameters<typeof Page>[0]) {
  return (
    <WorldPanel focus="colosseum:in">
      <Page {...props} />
    </WorldPanel>
  );
}
