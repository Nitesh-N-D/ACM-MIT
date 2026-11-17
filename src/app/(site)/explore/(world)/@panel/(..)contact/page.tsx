import Page from "@/app/(site)/contact/page";
import { WorldPanel } from "@/components/explore/WorldPanel";

/** /contact opened from the 3D world: the same page, on a panel over its district. */
export default function Panel() {
  return (
    <WorldPanel focus="core:in">
      <Page />
    </WorldPanel>
  );
}
