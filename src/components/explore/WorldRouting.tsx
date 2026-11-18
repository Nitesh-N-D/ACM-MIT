"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
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
  return (
    <Suspense fallback={null}>
      <OpenFromSearch />
    </Suspense>
  );
}

// Read from the router, not window.location: on a client navigation to
// /explore?open=… the address bar may not have changed yet when effects run.
function OpenFromSearch() {
  const router = useRouter();
  const open = safeWorldPath(useSearchParams().get("open"));
  useEffect(() => {
    if (open) router.replace(open, { scroll: false });
  }, [open, router]);
  return null;
}

const OPEN_EVENT = "nexus:open-page";

const REVEAL_EVENT = "nexus:reveal";
/** The card to show once the page being opened has loaded (`/team/topics/alumni#person-…`). */
let pendingAnchor: string | null = null;

/**
 * Opens a website page from inside the 3D scene (exhibition screens and the
 * like). With a `#card`, the panel opens unfolded at that card; if the page is
 * already open (folded beside its hall), it simply unfolds there.
 */
export function openWorldPage(href: string) {
  const [path = "", anchor] = href.split("#");
  if (anchor && path === window.location.pathname) {
    window.dispatchEvent(new CustomEvent<string>(REVEAL_EVENT, { detail: anchor }));
    return;
  }
  pendingAnchor = anchor || null;
  window.dispatchEvent(new CustomEvent<string>(OPEN_EVENT, { detail: href }));
}

/** The card a just-opened page should show, once (see openWorldPage). */
export function takePendingAnchor() {
  const a = pendingAnchor;
  pendingAnchor = null;
  return a;
}

/** Calls `fn` when a card of the open page is asked for; returns the unsubscribe. */
export function onReveal(fn: (anchor: string) => void) {
  const listener = (e: Event) => {
    const a = (e as CustomEvent<unknown>).detail;
    if (typeof a === "string") fn(a);
  };
  window.addEventListener(REVEAL_EVENT, listener);
  return () => window.removeEventListener(REVEAL_EVENT, listener);
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
    const onOpen = (e: Event) => {
      const href = (e as CustomEvent<unknown>).detail;
      if (typeof href !== "string" || !href.startsWith("/") || href.startsWith("//")) return;
      router.push(worldMounted || !worldFocus(href.split(/[?#]/)[0]!) ? href : worldUrl(href), { scroll: false });
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, [router]);
  return null;
}
