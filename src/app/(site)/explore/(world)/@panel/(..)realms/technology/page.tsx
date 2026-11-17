import Page from "@/app/(site)/realms/technology/page";
import { WorldPanel } from "@/components/explore/WorldPanel";

/** /realms/technology opened from the 3D world: the same page, on a panel over its district. */
export default function Panel() {
  return (
    <WorldPanel focus="frontier:in">
      <Page />
    </WorldPanel>
  );
}
