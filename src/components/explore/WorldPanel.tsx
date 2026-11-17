"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { TerritoryGlyph } from "@/components/brand/TerritoryGlyph";
import { getTerritory, type TerritoryId } from "@/config/territories";
import type { WorldFocus } from "@/config/world";
import { explore } from "./store";

const FRAME =
  "fixed inset-x-0 bottom-0 top-[calc(var(--spacing-header)+30svh)] z-40 flex flex-col border-t bg-void/92 shadow-[0_0_60px_rgba(0,0,0,0.6)] backdrop-blur-md " +
  "md:top-(--spacing-header) md:left-auto md:w-[min(64rem,72vw)] md:border-t-0 md:border-l";

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
 */
export function WorldPanel({ focus, children }: { focus: WorldFocus; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const body = useRef<HTMLDivElement>(null);
  const id = focus === "archive" ? null : (focus.slice(0, -3) as TerritoryId);
  const t = id ? getTerritory(id) : null;
  const accent = t?.accent ?? "#d9b45a";

  useEffect(() => {
    if (explore.get().focus !== focus) explore.go(focus);
  }, [focus]);

  // New page: start at its top and move keyboard focus into the panel.
  useEffect(() => {
    body.current?.scrollTo({ top: 0 });
    body.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [pathname]);

  const close = useCallback(() => router.push("/explore", { scroll: false }), [router]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

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
