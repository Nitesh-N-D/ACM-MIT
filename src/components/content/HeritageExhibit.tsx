import Image from "next/image";
import type { HeritageEntry } from "@/config/heritage";
import { mediaUrl } from "@/lib/supabase/env";

function host(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** One sourced exhibit of the Heritage Archive, as a timeline entry (an <li>). */
export function Exhibit({ entry, accent, id }: { entry: HeritageEntry; accent: string; id?: string }) {
  const img = mediaUrl(entry.image_path);
  return (
    <li id={id} className="relative scroll-mt-28 pl-8">
      <span aria-hidden="true" className="absolute top-1.5 left-[3px] size-2.5 rotate-45 border" style={{ borderColor: accent, background: `${accent}33` }} />
      <article className="nexus-frame p-5">
        <p className="font-mono text-[0.68rem] tracking-[0.2em] uppercase" style={{ color: accent }}>
          {entry.date_label || (entry.year ?? "")}
        </p>
        <h3 className="mt-2 font-display text-lg text-ice">{entry.title}</h3>
        <p className="mt-2 leading-relaxed text-silver">{entry.summary}</p>
        {entry.body && <p className="mt-3 text-sm leading-relaxed text-muted">{entry.body}</p>}
        {img && (
          <Image src={img} alt={entry.image_alt} width={640} height={400} className="mt-4 h-auto w-full max-w-md border border-line object-cover" sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
        )}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <a href={entry.source_url} target="_blank" rel="noopener noreferrer" className="text-mist underline decoration-line-strong underline-offset-4 hover:text-ice">
            Source: {entry.source_label || host(entry.source_url)}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          {entry.link_url && (
            <a href={entry.link_url} target="_blank" rel="noopener noreferrer" className="font-mono text-xs tracking-[0.14em] uppercase hover:text-ice" style={{ color: accent }}>
              {entry.link_label || "Explore"} ↗<span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </div>
      </article>
    </li>
  );
}
