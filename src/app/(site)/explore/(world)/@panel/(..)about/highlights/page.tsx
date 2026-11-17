import Page from "@/app/(site)/about/highlights/page";
import { WorldPanel } from "@/components/explore/WorldPanel";

/** The Highlights hall opened from the 3D world: the camera walks into the hall's room and the page waits, folded, beside it. */
export default function Panel() {
  return (
    <WorldPanel focus="core:hall" topic="highlights">
      <Page />
    </WorldPanel>
  );
}
