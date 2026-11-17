import Link from "next/link";
import { LegalPage } from "@/components/sections/LegalPage";
import { site } from "@/config/site";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Accessibility",
  description: "How NEXUS is built to be usable by everyone, the options it offers, and how to report a barrier.",
  path: "/accessibility",
});

const mail = site.chapter.email;

export default function Page() {
  return (
    <LegalPage
      title="Accessibility"
      description="NEXUS aims to be usable by everyone, whatever device, connection or assistive technology you use."
      sections={[
        {
          id: "goal",
          title: "Our aim",
          body: (
            <p>
              NEXUS is built to follow the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA. The 3D world is an optional layer: every piece of content is also
              available as an ordinary page.
            </p>
          ),
        },
        {
          id: "2d",
          title: "The 2D site",
          body: (
            <p>
              Use the <strong>2D</strong> switch in the header to leave the 3D world and browse NEXUS as a standard website. The choice is remembered. Every district,
              page and form works the same in both modes, and the <Link href="/explore/map">map</Link> lists every place in the world as links.
            </p>
          ),
        },
        {
          id: "options",
          title: "Built-in options",
          body: (
            <ul>
              <li>
                <strong>Reduced motion:</strong> NEXUS follows your system&apos;s reduced-motion setting, and you can also turn motion down at the gateway. Camera
                movement, shake and effects are then removed or softened.
              </li>
              <li>
                <strong>Flashing:</strong> the lightning strike at the gateway flashes at most three times, all within half a second and at partial brightness, which
                keeps it inside photosensitivity guidance. The gateway introduction can be skipped.
              </li>
              <li>
                <strong>Sound</strong> never starts on its own: browsers allow it only after you click or press a key, and the sound button mutes it. The choice is
                remembered.
              </li>
              <li>
                <strong>Graphics quality</strong> can be lowered for slower devices; NEXUS also lowers it automatically when frames drop.
              </li>
            </ul>
          ),
        },
        {
          id: "keyboard",
          title: "Keyboard and screen readers",
          body: (
            <ul>
              <li>Everything can be reached with a keyboard. A &quot;Skip to content&quot; link is the first item on each page and focus is always visible.</li>
              <li>In the 3D world, districts are listed as buttons as well as drawn in the scene; Escape closes panels and dialogs.</li>
              <li>Pages use headings, landmarks and labelled form fields; form errors are announced and linked to their fields.</li>
              <li>Photographs carry text alternatives written by the chapter.</li>
            </ul>
          ),
        },
        {
          id: "limits",
          title: "Known limitations",
          body: (
            <p>
              The 3D scene itself is visual and cannot be fully described to a screen reader; its content is available through the 2D site and the map. Older photographs
              may have shorter descriptions until they are reviewed.
            </p>
          ),
        },
        {
          id: "feedback",
          title: "Report a barrier",
          body: (
            <p>
              If something on NEXUS is hard or impossible to use, write to <a href={`mailto:${mail}`}>{mail}</a> or use the <Link href="/contact">contact form</Link>. Say
              which page and what happened, and the chapter will reply and fix it where it can.
            </p>
          ),
        },
      ]}
    />
  );
}
