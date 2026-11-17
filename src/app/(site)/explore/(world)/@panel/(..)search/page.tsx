import Page from "@/app/(site)/search/page";
import { WorldPanel } from "@/components/explore/WorldPanel";

/** /search opened from the 3D world: the same page, on a panel over its district. */
export default function Panel(props: Parameters<typeof Page>[0]) {
  return (
    <WorldPanel focus="core:in">
      <Page {...props} />
    </WorldPanel>
  );
}
