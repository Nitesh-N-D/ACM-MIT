"use client";

import { useSyncExternalStore } from "react";
import type { HeritageGallery } from "@/config/heritage";
import type { TerritoryId } from "@/config/territories";
import { prefs } from "@/lib/gateway/prefs";
import { detectTier, resolveTier, type Tier } from "@/lib/gateway/quality";
import { GALLERY_AZ, districtOf, type FocusId } from "./destinations";

/**
 * cinematic — the camera tours the world by itself.
 * free      — the visitor steers (drag, zoom).
 * district  — a district is selected; its content panel is open.
 */
export type ExploreMode = "cinematic" | "free" | "district";

export type ExploreState = {
  mode: ExploreMode;
  focus: FocusId;
  hovered: TerritoryId | null;
  autoRotate: boolean;
  /** Incremented whenever the camera should travel to `focus`. */
  travel: number;
  /** null until the device has been inspected on the client. */
  tier: Tier | null;
  reducedMotion: boolean;
  /** The canvas has drawn its first frame. */
  ready: boolean;
  /** Visitor chose the 2D map over the 3D world. */
  flat: boolean;
  /** Camera azimuth for the next trip, overriding the destination's own. */
  travelAz: number | null;
  /** Heritage Archive: the open gallery and the exhibit shown in detail. */
  gallery: HeritageGallery;
  exhibit: string | null;
  /** The topic hall shown when the focus is a district's hall room. */
  hall: string | null;
};

const initial: ExploreState = {
  mode: "free",
  focus: "overview",
  hovered: null,
  autoRotate: false,
  travel: 0,
  tier: null,
  reducedMotion: false,
  ready: false,
  flat: false,
  travelAz: null,
  gallery: "global",
  exhibit: null,
  hall: null,
};

let state = initial;
const listeners = new Set<() => void>();

function set(patch: Partial<ExploreState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

/** One-shot camera nudges from the on-screen buttons, consumed by the rig. */
export const cameraInput = { zoom: 0, rotate: 0 };

export const explore = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },

  /** Inspects the device once the page is running in the browser. */
  boot() {
    if (state.tier !== null) return;
    set({ tier: resolveTier(prefs.quality(), detectTier()), reducedMotion: prefs.motion() === "reduced" });
  },
  ready() {
    if (!state.ready) set({ ready: true });
  },
  /** WebGL failed or never drew: fall back to the 2D map for good. */
  fail() {
    set({ tier: "fallback", ready: false });
  },
  setFlat(flat: boolean) {
    set({ flat, ready: flat ? false : state.ready });
  },

  /** Visitor picked a destination. */
  go(id: FocusId) {
    // Inside the Archive the camera faces the open gallery's wall.
    const travelAz = id === "archive" ? GALLERY_AZ[state.gallery] : null;
    set({ focus: id, mode: districtOf(id) ? "district" : "free", travel: state.travel + 1, travelAz, exhibit: null });
  },
  /** Walks into a topic hall of a district (changing topic inside the hall keeps the camera where it is). */
  enterHall(id: TerritoryId, slug: string) {
    const focus = `${id}:hall` as const;
    if (state.focus === focus) {
      if (state.hall !== slug) set({ hall: slug });
    } else set({ focus, hall: slug, mode: "district", travel: state.travel + 1, travelAz: null, exhibit: null });
  },
  /** Cinematic tour advances without leaving cinematic mode. */
  tour(id: FocusId) {
    set({ focus: id, travel: state.travel + 1, travelAz: id === "archive" ? GALLERY_AZ[state.gallery] : null });
  },
  /** Opens a gallery of the Heritage Archive; inside, the camera turns to its wall. */
  openGallery(gallery: HeritageGallery) {
    if (state.focus === "archive") set({ gallery, exhibit: null, mode: "free", travel: state.travel + 1, travelAz: GALLERY_AZ[gallery] });
    else set({ gallery, exhibit: null });
  },
  /** Shows one exhibit in detail (null returns to the gallery list). */
  showExhibit(id: string | null) {
    if (state.exhibit !== id) set({ exhibit: id });
  },
  setMode(mode: ExploreMode) {
    if (mode === "cinematic") set({ mode, focus: "overview", travel: state.travel + 1 });
    else if (mode === "district") set({ mode, focus: districtOf(state.focus) ? state.focus : "core", travel: state.travel + 1 });
    else set({ mode });
  },
  /** Any manual steering ends the automatic tour. */
  steer() {
    if (state.mode === "cinematic") set({ mode: "free" });
  },
  hover(id: TerritoryId | null) {
    if (state.hovered !== id) set({ hovered: id });
  },
  toggleAutoRotate() {
    set({ autoRotate: !state.autoRotate });
  },
  reset() {
    set({ mode: "free", focus: "overview", autoRotate: false, travel: state.travel + 1, travelAz: null, exhibit: null });
  },
  /** Called when the experience unmounts so a later visit starts fresh. */
  dispose() {
    state = initial;
    cameraInput.zoom = 0;
    cameraInput.rotate = 0;
  },
};

export function useExplore<T>(selector: (s: ExploreState) => T): T {
  return useSyncExternalStore(
    explore.subscribe,
    () => selector(state),
    () => selector(initial),
  );
}
