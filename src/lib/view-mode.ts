"use client";

import { useSyncExternalStore } from "react";
import { VIEW_COOKIE, VIEW_COOKIE_MAX_AGE, worldFocus, type ViewMode } from "@/config/world";

/** Client side of the 2D / 3D switch (see config/world). */

export function readViewMode(): ViewMode {
  try {
    return document.cookie.split("; ").some((c) => c === `${VIEW_COOKIE}=2d`) ? "2d" : "3d";
  } catch {
    return "3d";
  }
}

const listeners = new Set<() => void>();

export function useViewMode(): ViewMode {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    readViewMode,
    () => "3d",
  );
}

/**
 * Switches the whole website and reloads the current page in the new mode
 * (a full load, so the proxy routes it and no 3D context is left running).
 */
export function writeViewCookie(mode: ViewMode) {
  document.cookie = `${VIEW_COOKIE}=${mode}; path=/; max-age=${VIEW_COOKIE_MAX_AGE}; samesite=lax`;
  listeners.forEach((l) => l());
}

/* eslint-disable @next/next/no-location-assign-relative-destination -- a full load is the point: the proxy routes it and the old mode's WebGL context is torn down. */
export function setViewMode(mode: ViewMode) {
  writeViewCookie(mode);
  const { pathname, search, hash } = window.location;
  if (mode === "2d") {
    // A page open inside the world becomes that page; the world becomes the 2D city map.
    if (pathname === "/explore") window.location.assign("/explore/map");
    else window.location.assign(pathname + search + hash);
  } else {
    if (pathname === "/explore/map") window.location.assign("/explore");
    else if (worldFocus(pathname)) window.location.assign(pathname + search + hash);
    else window.location.reload();
  }
}
/* eslint-enable @next/next/no-location-assign-relative-destination */
