"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { safeWorldPath, worldFocus, worldUrl } from "@/config/world";
import { readViewMode, writeViewCookie } from "@/lib/view-mode";

/**
 * Client half of 3D-first routing (the proxy handles full page loads).
 *
 * While the world (/explore) is mounted, links to world pages are
 * intercepted by Next.js and open as panels over the city. From anywhere
 * else, such a link first enters the world and opens the page there.
 */

let worldMounted = false;

/** Rendered by the explore layout: tells the link router the world is up. */
export function WorldMount() {
  useEffect(() => {
    worldMounted = true;
    return () => {
      worldMounted = false;
    };
  }, []);
  return null;
}

/** `/explore?open=<path>` (set by the proxy or the link router): open that page in the world. */
export function OpenFromQuery() {
  const router = useRouter();
  useEffect(() => {
    const open = safeWorldPath(new URLSearchParams(window.location.search).get("open"));
    if (open) router.replace(open, { scroll: false });
  }, [router]);
  return null;
}

/** One click listener for the whole site, mounted in the public layout. */
export function WorldLinkRouter() {
  const router = useRouter();
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.searchParams.get("view") === "2d") return;

      const go = (to: string) => {
        // Only the default is cancelled: the link's own onClick (closing a menu) still runs, and next/link skips its navigation.
        e.preventDefault();
        router.push(to);
      };
      if (readViewMode() === "2d") {
        if (url.pathname !== "/explore") return;
        // "View in 3D" from a 2D page is a request for the 3D world.
        if (url.searchParams.has("to")) {
          e.preventDefault();
          writeViewCookie("3d");
          window.location.assign(url.pathname + url.search);
        } else go("/explore/map");
        return;
      }
      if (!worldMounted && worldFocus(url.pathname)) go(worldUrl(url.pathname + url.search + url.hash));
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);
  return null;
}
