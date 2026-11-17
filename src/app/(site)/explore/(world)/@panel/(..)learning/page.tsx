import Page from "@/app/(site)/learning/page";
import { WorldPanel } from "@/components/explore/WorldPanel";

/** /learning opened from the 3D world: the same page, on a panel over its district. */
export default function Panel(props: Parameters<typeof Page>[0]) {
  return (
    <WorldPanel focus="intelligence:in">
      <Page {...props} />
    </WorldPanel>
  );
}
