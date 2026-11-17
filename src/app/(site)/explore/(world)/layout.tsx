import type { ReactNode } from "react";
import { WorldMount } from "@/components/explore/WorldRouting";

/**
 * The 3D world and, in the `panel` slot, any website page opened inside it.
 * Links to world pages made from here are intercepted (`@panel/(..)…`), so
 * the city stays mounted while the page opens over its district. A direct
 * load of the same URL renders the plain page.
 */
export default function WorldLayout({ children, panel }: { children: ReactNode; panel: ReactNode }) {
  return (
    <>
      <WorldMount />
      {children}
      {panel}
    </>
  );
}
