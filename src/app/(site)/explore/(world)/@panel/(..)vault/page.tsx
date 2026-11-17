import Page from "@/app/(site)/vault/page";
import { WorldPanel } from "@/components/explore/WorldPanel";

/** /vault opened from the 3D world: the same page, on a panel over its district. */
export default function Panel(props: Parameters<typeof Page>[0]) {
  return (
    <WorldPanel focus="vault:in">
      <Page {...props} />
    </WorldPanel>
  );
}
