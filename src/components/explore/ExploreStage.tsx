"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, type ReactNode } from "react";
import type { HeritageEntry } from "@/config/heritage";
import type { TerritoryId } from "@/config/territories";
import { setHallBoards } from "@/components/world/hallBoards";
import type { Digests } from "@/lib/data/districts";
import type { HallBoards } from "@/lib/data/halls";
import { CityMap } from "./CityMap";
import { ExploreHud } from "./ExploreHud";
import { isFocusId, isHeritage, isTerritory } from "./destinations";
import type { Activity } from "./scene/ExploreScene";
import { explore, useExplore } from "./store";

const READY_TIMEOUT_MS = 9000;

function failAndRenderNothing() {
  explore.fail();
  return { default: () => null };
}

// Client-only and code-split: three.js never blocks the page.
const ExploreCanvas = dynamic(() => import("./ExploreCanvas").catch(failAndRenderNothing), { ssr: false, loading: () => null });

class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    if (process.env.NODE_ENV !== "production") console.warn("[explore] 3D world failed, using the 2D map.", error);
    explore.fail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const NO_ACTIVITY: Activity = {};
const NO_HERITAGE: HeritageEntry[] = [];

/**
 * The navigable NEXUS world. The 2D map is the baseline (and what renders
 * on the server); the WebGL world replaces it when the device can run it.
 */
export function ExploreStage({
  activity = NO_ACTIVITY,
  heritage = NO_HERITAGE,
  digests,
  boards,
}: {
  activity?: Activity;
  heritage?: HeritageEntry[];
  digests?: Digests;
  boards?: HallBoards;
}) {
  // The topic halls' boards, for the rooms inside the scene.
  useEffect(() => {
    if (boards) setHallBoards(boards);
  }, [boards]);
  const tier = useExplore((s) => s.tier);
  const ready = useExplore((s) => s.ready);
  const flat = useExplore((s) => s.flat);
  const focus = useExplore((s) => s.focus);
  const reducedMotion = useExplore((s) => s.reducedMotion);

  useEffect(() => {
    explore.boot();
    // Deep link: /explore?to=<destination> opens there (e.g. ?to=heritage, ?to=vault:in).
    const to = new URLSearchParams(window.location.search).get("to");
    if (to && isFocusId(to)) explore.go(to);
    return () => explore.dispose();
  }, []);

  const show3d = tier !== null && tier !== "fallback" && !flat;

  // A canvas that never draws (driver stall, blocked context) falls back.
  useEffect(() => {
    if (!show3d || ready) return;
    const id = window.setTimeout(() => {
      if (!explore.get().ready) explore.fail();
    }, READY_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [show3d, ready]);

  const selected: TerritoryId | null = isTerritory(focus) ? focus : null;
  const view = show3d ? (ready ? "3d" : "loading") : "map";

  return (
    <section aria-label="NEXUS world" data-explore-stage={view} className="relative h-[calc(100svh-4rem)] min-h-[36rem] overflow-hidden border-b border-line bg-void">
      {view !== "3d" && (
        <div className="absolute inset-0 flex items-center justify-center p-4 pt-16 pb-28 sm:p-10 sm:pt-20 lg:pr-[24rem]">
          <CityMap
            selected={selected}
            onSelect={(id) => explore.go(id)}
            heritageOn={isHeritage(focus)}
            onHeritage={() => explore.go("heritage")}
            className="max-h-full w-full max-w-4xl"
          />
        </div>
      )}
      {show3d && (
        <div className="absolute inset-0 transition-opacity duration-1000" style={{ opacity: ready ? 1 : 0 }}>
          <CanvasBoundary key={tier}>
            <ExploreCanvas tier={tier} activity={activity} heritage={heritage} reducedMotion={reducedMotion} onReady={explore.ready} onFail={explore.fail} />
          </CanvasBoundary>
        </div>
      )}
      <ExploreHud view={view} canUse3d={tier !== null && tier !== "fallback"} heritage={heritage} digests={digests} boards={boards} />
    </section>
  );
}
