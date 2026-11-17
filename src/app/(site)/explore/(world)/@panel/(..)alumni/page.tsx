import Page from "@/app/(site)/alumni/page";
import { WorldPanel } from "@/components/explore/WorldPanel";

/** /alumni opened from the 3D world: the same page, on a panel over its district. */
export default function Panel() {
  return (
    <WorldPanel focus="sanctuary:in">
      <Page />
    </WorldPanel>
  );
}
