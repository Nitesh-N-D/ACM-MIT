import Page from "@/app/(site)/about/page";
import { WorldPanel } from "@/components/explore/WorldPanel";

/** /about opened from the 3D world: the same page, on a panel over its district. */
export default function Panel() {
  return (
    <WorldPanel focus="core:in">
      <Page />
    </WorldPanel>
  );
}
