import Page from "@/app/(site)/team/page";
import { WorldPanel } from "@/components/explore/WorldPanel";

/** /team opened from the 3D world: the same page, on a panel over its district. */
export default function Panel() {
  return (
    <WorldPanel focus="sanctuary:in">
      <Page />
    </WorldPanel>
  );
}
