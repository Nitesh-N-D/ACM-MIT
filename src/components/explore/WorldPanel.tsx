"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { TerritoryGlyph } from "@/components/brand/TerritoryGlyph";
import { getTerritory, type TerritoryId } from "@/config/territories";
import { getHall } from "@/config/topics";
import type { WorldFocus } from "@/config/world";
import { explore, useExplore } from "./store";

const FRAME =
  "fixed inset-x-0 bottom-0 top-[calc(var(--spacing-header)+30svh)] z-40 flex flex-col border-t bg-void/92 shadow-[0_0_60px_rgba(0,0,0,0.6)] backdrop-blur-md " +
  "md:top-(--spacing-header) md:left-auto md:w-[min(64rem,72vw)] md:border-t-0 md:border-l";

/** A topic hall's page, folded to a card so its room in the 3D world stays in view. */
const FOLDED =
  "fixed inset-x-3 bottom-[3.75rem] z-40 flex flex-col border bg-void/92 shadow-[0_0_40px_rgba(0,0,0,0.55)] backdrop-blur-md " +
  "md:inset-x-auto md:top-[calc(var(--spacing-header)+1rem)] md:right-16 md:bottom-auto md:w-80";

const noop = () => () => {};

/**
 * Panels are portalled to <body>: the page-enter transition wraps every page
 * in a transformed element, which would otherwise pin `fixed` to it.
 */
function Portal({ children }: { children: ReactNode }) {
  const client = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  return client ? createPortal(children, document.body) : null;
}

/**
 * A website page opened inside the 3D world: the camera travels into the
 * page's district and the page itself is shown on a holographic panel over
 * the live city. Escape, the close button, or the browser's Back button
 * return to the world; "Full page" opens the plain 2D page.
 *
 * A topic hall (`topic`) opens folded: the camera walks into the hall's own
 * room, whose boards show what the hall holds, and the page waits beside it.
 */
export function WorldPanel({ focus, topic, children }: { focus: WorldFocus; topic?: string; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const body = useRef<HTMLDivElement>(null);
  const id = focus === "archive" ? null : (focus.split(":")[0] as TerritoryId);
  const t = id ? getTerritory(id) : null;
  const accent = t?.accent ?? "#d9b45a";
  const hall = id && topic ? getHall(id, topic) : undefined;

  // Without the 3D world (2D map, no WebGL) there is no room to look at: show the page.
  const roomVisible = useExplore((s) => !s.flat && s.tier !== "fallback");
  const foldable = Boolean(hall) && roomVisible;
  const [fold, setFold] = useState({ path: pathname, folded: foldable });
  if (fold.path !== pathname) setFold({ path: pathname, folded: foldable });
  const folded = fold.folded && foldable;

  useEffect(() => {
    const current = explore.get().focus;
    if (id && topic && focus.endsWith(":hall")) explore.enterHall(id, topic);
    // An item opened from a hall's board (an event in the Hackathons hall) is read where it was found.
    else if (id && current === `${id}:hall` && focus === `${id}:in` && pathname !== getTerritory(id).href) return;
    else if (current !== focus) explore.go(focus);
  }, [focus, id, topic, pathname]);

  // New page: start at its top and move keyboard focus into the panel.
  useEffect(() => {
    body.current?.scrollTo({ top: 0 });
    body.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [pathname]);

  const close = useCallback(() => router.push("/explore", { scroll: false }), [router]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A modal inside the page (a photograph viewer) closes first.
      if (e.key !== "Escape" || e.defaultPrevented || document.querySelector("dialog[open]")) return;
      if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);
  const toReception = () => {
    router.push("/explore", { scroll: false });
    if (id) explore.go(`${id}:in`);
  };
  const unfold = () => {
    setFold({ path: pathname, folded: false });
    requestAnimationFrame(() => body.current?.focus({ preventScroll: true }));
  };

  if (folded && hall && t) {
    return (
      <Portal>
        <div role="dialog" aria-modal="false" aria-label={`${hall.name}, a topic hall of ${t.short}`} className={FOLDED} style={{ borderColor: `${accent}66` }}>
          <div aria-hidden="true" className="h-0.5 shrink-0" style={{ background: accent }} />
          <div className="p-4">
            <p className="flex items-center gap-2 font-mono text-[0.6rem] tracking-[0.2em] uppercase" style={{ color: accent }}>
              <TerritoryGlyph id={t.id} className="size-5 shrink-0" />
              {t.code} · Topic hall
            </p>
            <h2 className="mt-2 font-display text-lg tracking-[0.08em] text-ice uppercase">{hall.name}</h2>
            <p className="mt-1.5 hidden text-sm leading-relaxed text-silver sm:block">{hall.blurb}</p>
            <p className="mt-1.5 font-mono text-[0.58rem] tracking-[0.14em] text-mist uppercase">Select a board in the hall to open it</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={unfold}
                className="border px-2.5 py-1 font-mono text-[0.6rem] tracking-[0.16em] text-ice uppercase hover:bg-deep"
                style={{ borderColor: accent }}
              >
                Read the page <span aria-hidden="true">▸</span>
              </button>
              <button
                type="button"
                onClick={toReception}
                className="border border-line px-2.5 py-1 font-mono text-[0.6rem] tracking-[0.16em] text-silver uppercase hover:border-line-strong hover:text-ice"
              >
                <span aria-hidden="true">←</span> Reception
              </button>
              <button
                type="button"
                onClick={close}
                className="border border-line px-2.5 py-1 font-mono text-[0.6rem] tracking-[0.16em] text-silver uppercase hover:border-line-strong hover:text-ice"
              >
                Close <span aria-hidden="true">✕</span>
                <span className="sr-only">and stay in the hall</span>
              </button>
            </div>
          </div>
          {/* The page stays loaded while folded, out of view and out of the tab order. */}
          <div hidden>{children}</div>
        </div>
      </Portal>
    );
  }

  return (
    <Portal>
      <div
        role="dialog"
        aria-modal="false"
        aria-label={`${t?.name ?? "Heritage Archive"}: page in the 3D world`}
        className={FRAME}
        style={{ borderColor: `${accent}66` }}
      >
        <div className="flex shrink-0 items-center gap-3 border-b px-4 py-2.5 sm:px-5" style={{ borderBottomColor: `${accent}40` }}>
          {id && <TerritoryGlyph id={id} className="size-6 shrink-0" />}
          <p className="min-w-0 flex-1 truncate font-mono text-[0.62rem] tracking-[0.2em] uppercase" style={{ color: accent }}>
            {t ? `${t.code} · ${t.name}` : "Heritage Archive"}
            <span className="hidden text-mist sm:inline"> · In the world</span>
          </p>
          {foldable && (
            <button
              type="button"
              onClick={() => setFold({ path: pathname, folded: true })}
              className="border border-line px-2.5 py-1 font-mono text-[0.6rem] tracking-[0.16em] text-silver uppercase hover:border-line-strong hover:text-ice"
            >
              View hall
            </button>
          )}
          <a
            href={`${pathname}?view=2d`}
            onClick={(e) => {
              const q = new URLSearchParams(window.location.search);
              q.set("view", "2d");
              e.currentTarget.href = `${pathname}?${q}`;
            }}
            className="hidden border border-line px-2.5 py-1 font-mono text-[0.6rem] tracking-[0.16em] text-silver uppercase hover:border-line-strong hover:text-ice sm:inline-block"
          >
            Full page
          </a>
          <button
            type="button"
            onClick={close}
            className="border border-line px-2.5 py-1 font-mono text-[0.6rem] tracking-[0.16em] text-silver uppercase hover:border-line-strong hover:text-ice"
          >
            Close <span aria-hidden="true">✕</span>
            <span className="sr-only">and return to the world</span>
          </button>
        </div>
        <div ref={body} tabIndex={-1} className="world-page min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none [&_.world-hide]:hidden">
          {children}
        </div>
      </div>
    </Portal>
  );
}

/** Shown while a page is being fetched for the panel. */
export function WorldPanelLoading() {
  return (
    <Portal>
      <div role="status" className={`${FRAME} items-center justify-center border-line`}>
        <span className="font-mono text-[0.66rem] tracking-[0.22em] text-cyan uppercase">Opening…</span>
      </div>
    </Portal>
  );
}
