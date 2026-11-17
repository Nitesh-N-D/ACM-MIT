import Page from "@/app/(site)/heritage/page";
import { WorldPanel } from "@/components/explore/WorldPanel";

/** /heritage opened from the 3D world: the same page, on a panel over its district. */
export default function Panel() {
  return (
    <WorldPanel focus="archive">
      <Page />
    </WorldPanel>
  );
}
