import Page from "@/app/(site)/realms/intelligence/page";
import { WorldPanel } from "@/components/explore/WorldPanel";

/** /realms/intelligence opened from the 3D world: the same page, on a panel over its district. */
export default function Panel() {
  return (
    <WorldPanel focus="intelligence:in">
      <Page />
    </WorldPanel>
  );
}
