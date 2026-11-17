import Page from "@/app/(site)/realms/technology/[topic]/page";
import { WorldPanel } from "@/components/explore/WorldPanel";

/** A topic hall opened from the 3D world: the camera walks into the hall's room and the page waits, folded, beside it. */
export default async function Panel(props: Parameters<typeof Page>[0]) {
  const { topic } = await props.params;
  return (
    <WorldPanel focus="frontier:hall" topic={topic}>
      <Page {...props} />
    </WorldPanel>
  );
}
