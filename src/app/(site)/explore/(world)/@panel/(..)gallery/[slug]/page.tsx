import Page from "@/app/(site)/gallery/[slug]/page";
import { WorldPanel } from "@/components/explore/WorldPanel";

/** /gallery/[slug] opened from the 3D world: the same page, on a panel over its district. */
export default function Panel(props: Parameters<typeof Page>[0]) {
  return (
    <WorldPanel focus="sanctuary:in">
      <Page {...props} />
    </WorldPanel>
  );
}
