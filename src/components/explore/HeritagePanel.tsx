"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { HERITAGE_GALLERIES, heritageGallery, type HeritageEntry } from "@/config/heritage";
import { mediaUrl } from "@/lib/supabase/env";
import { explore, useExplore } from "./store";

const GOLD = "#e8c46a";

function host(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * The Heritage Archive's content, beside the 3D building (or the 2D map):
 * three galleries, their exhibits, and each exhibit with its source.
 */
export function HeritagePanel({ entries, inside, can3d }: { entries: HeritageEntry[]; inside: boolean; can3d: boolean }) {
  const gallery = useExplore((s) => s.gallery);
  const exhibitId = useExplore((s) => s.exhibit);
  const g = heritageGallery(gallery);

  const list = useMemo(
    () => entries.filter((e) => e.gallery === gallery).sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999) || a.sort_order - b.sort_order),
    [entries, gallery],
  );
  const exhibit = exhibitId ? list.find((e) => e.id === exhibitId) ?? null : null;
  const img = exhibit ? mediaUrl(exhibit.image_path) : null;

  return (
    <aside
      aria-label="ACM Heritage Archive"
      className="absolute inset-x-3 bottom-16 z-20 max-h-[50%] overflow-y-auto border border-line bg-void/90 p-4 backdrop-blur-sm sm:bottom-20 lg:inset-x-auto lg:top-20 lg:right-16 lg:bottom-auto lg:max-h-[75%] lg:w-[22rem]"
      style={{ borderTopColor: GOLD }}
    >
      <p className="font-mono text-[0.62rem] tracking-[0.2em] uppercase" style={{ color: GOLD }}>
        Heritage · {inside ? "Inside the Archive" : "Three galleries"}
      </p>
      <h2 className="mt-2 font-display text-lg tracking-[0.08em] text-ice uppercase">ACM Heritage Archive</h2>
      {!inside && (
        <p className="mt-2 text-sm leading-relaxed text-silver">
          The history of ACM worldwide, of ACM India, and of the ACM MIT Student Chapter. Every exhibit names its source.
        </p>
      )}
      {!inside && (
        <div className="mt-3 flex flex-wrap gap-2">
          {can3d && (
            <Button size="sm" onClick={() => explore.go("archive")}>
              Enter the Archive
            </Button>
          )}
          <Button href="/heritage" variant="ghost" size="sm">
            Archive page
          </Button>
        </div>
      )}

      <div role="group" aria-label="Galleries" className="mt-4 grid grid-cols-3 gap-1">
        {HERITAGE_GALLERIES.map((v) => {
          const on = v.id === gallery;
          return (
            <button
              key={v.id}
              type="button"
              aria-pressed={on}
              onClick={() => explore.openGallery(v.id)}
              className={`border px-1.5 py-1.5 text-left font-mono text-[0.58rem] tracking-[0.12em] uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan ${
                on ? "bg-deep text-ice" : "border-line text-silver hover:border-line-strong hover:text-ice"
              }`}
              style={on ? { borderColor: v.accent } : undefined}
            >
              <span className="block" style={{ color: v.accent }}>
                {v.code}
              </span>
              {v.short}
            </button>
          );
        })}
      </div>

      {exhibit ? (
        <article className="mt-4" aria-live="polite">
          <button
            type="button"
            onClick={() => explore.showExhibit(null)}
            className="font-mono text-[0.6rem] tracking-[0.16em] text-mist uppercase underline-offset-4 hover:text-ice hover:underline"
          >
            ← {g.short} gallery
          </button>
          <p className="mt-3 font-mono text-[0.62rem] tracking-[0.18em] uppercase" style={{ color: g.accent }}>
            {exhibit.date_label || exhibit.year}
          </p>
          <h3 className="mt-1 font-display text-base text-ice">{exhibit.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-silver">{exhibit.summary}</p>
          {exhibit.body && <p className="mt-2 text-sm leading-relaxed text-muted">{exhibit.body}</p>}
          {img && (
            // eslint-disable-next-line @next/next/no-img-element -- stored media, sized by CSS
            <img src={img} alt={exhibit.image_alt} loading="lazy" className="mt-3 w-full border border-line object-cover" />
          )}
          <p className="mt-3 text-xs">
            <a href={exhibit.source_url} target="_blank" rel="noopener noreferrer" className="text-mist underline decoration-line-strong underline-offset-4 hover:text-ice">
              Source: {exhibit.source_label || host(exhibit.source_url)}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>
          {exhibit.link_url && (
            <p className="mt-2">
              <a
                href={exhibit.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[0.62rem] tracking-[0.14em] uppercase hover:text-ice"
                style={{ color: g.accent }}
              >
                {exhibit.link_label || "Explore"} ↗<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </p>
          )}
        </article>
      ) : (
        <div className="mt-4">
          <h3 className="font-display text-sm tracking-[0.06em] text-ice uppercase">{g.name}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">{g.intro}</p>
          {list.length > 0 ? (
            <ol className="mt-3 space-y-1" aria-label={`${g.name} exhibits`}>
              {list.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => explore.showExhibit(e.id)}
                    className="flex w-full gap-3 border border-transparent px-2 py-1.5 text-left transition-colors hover:border-line hover:bg-deep/60 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan"
                  >
                    <span className="w-11 shrink-0 font-mono text-[0.68rem] tracking-[0.08em]" style={{ color: g.accent }}>
                      {e.year ?? "Now"}
                    </span>
                    <span className="text-sm leading-snug text-silver">{e.title}</span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-3 border border-dashed border-line-strong px-3 py-4 text-sm leading-relaxed text-muted">
              This gallery is waiting for its first exhibit. The ACM MIT team publishes the chapter&apos;s history here — verified, sourced, and with consent for every
              photograph.
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
        {inside && (
          <Button variant="ghost" size="sm" onClick={() => explore.go("heritage")}>
            Step outside
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => explore.reset()}>
          Back to overview
        </Button>
      </div>
    </aside>
  );
}
