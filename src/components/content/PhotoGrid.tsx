"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

export type Photo = { id: string; src: string; alt: string; caption: string; width: number | null; height: number | null };

/**
 * A grid of photographs with a keyboard-friendly viewer: arrow keys move
 * between photographs, Escape closes, focus returns to the thumbnail.
 */
export function PhotoGrid({ photos, label }: { photos: Photo[]; label: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);

  const show = (i: number, el: HTMLButtonElement) => {
    opener.current = el;
    setOpen(i);
  };
  const close = useCallback(() => setOpen(null), []);
  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + photos.length) % photos.length)), [photos.length]);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open !== null && !el.open) el.showModal();
    if (open === null && el.open) {
      el.close();
      opener.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step]);

  const current = open === null ? null : photos[open];

  return (
    <>
      <ul aria-label={label} className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((p, i) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={(e) => show(i, e.currentTarget)}
              className="group block w-full overflow-hidden border border-line bg-deep focus-visible:outline-offset-2"
              aria-label={`Open photograph ${i + 1} of ${photos.length}${p.caption ? `: ${p.caption}` : ""}`}
            >
              <Image
                src={p.src}
                alt={p.alt}
                width={480}
                height={360}
                unoptimized
                className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        onClose={close}
        onClick={(e) => e.target === e.currentTarget && close()}
        aria-label={current ? current.caption || current.alt || "Photograph" : "Photograph"}
        className="m-auto max-h-[94svh] w-[min(72rem,94vw)] border border-line-strong bg-void p-0 text-ice backdrop:bg-black/85"
      >
        {current && (
          <figure className="flex max-h-[94svh] flex-col">
            <div className="relative min-h-0 flex-1 bg-black">
              <Image
                src={current.src}
                alt={current.alt}
                width={current.width ?? 1600}
                height={current.height ?? 1067}
                unoptimized
                className="mx-auto max-h-[78svh] w-auto object-contain"
              />
            </div>
            <figcaption className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3">
              <span className="font-mono text-[0.62rem] tracking-[0.18em] text-mist uppercase">
                {(open ?? 0) + 1} / {photos.length}
              </span>
              <span className="min-w-0 flex-1 text-sm text-silver">{current.caption}</span>
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => step(-1)}
                    className="border border-line px-3 py-1 font-mono text-[0.62rem] tracking-[0.16em] uppercase hover:border-line-strong"
                  >
                    ← Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => step(1)}
                    className="border border-line px-3 py-1 font-mono text-[0.62rem] tracking-[0.16em] uppercase hover:border-line-strong"
                  >
                    Next →
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={close}
                autoFocus
                className="border border-line px-3 py-1 font-mono text-[0.62rem] tracking-[0.16em] uppercase hover:border-line-strong"
              >
                Close ✕
              </button>
            </figcaption>
          </figure>
        )}
      </dialog>
    </>
  );
}
