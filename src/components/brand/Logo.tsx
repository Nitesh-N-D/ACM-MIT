import Image from "next/image";
import Link from "next/link";
import { site } from "@/config/site";
import { cn } from "@/lib/cn";

type LogoProps = {
  className?: string;
  /** Hide the NEXUS wordmark (e.g. very narrow screens). */
  markOnly?: boolean;
};

/** Chapter logo (transparent, light variant) + NEXUS wordmark. */
export function Logo({ className, markOnly = false }: LogoProps) {
  return (
    <Link
      href="/"
      className={cn("group flex shrink-0 items-center gap-2 min-[360px]:gap-3", className)}
      aria-label={`${site.chapter.fullName} — NEXUS home`}
    >
      <Image
        src={site.logo.src}
        alt=""
        width={site.logo.width}
        height={site.logo.height}
        sizes="48px"
        priority
        className="h-10 w-auto shrink-0 transition-[filter] duration-300 group-hover:drop-shadow-[0_0_10px_rgb(63_228_255/0.7)]"
      />
      {!markOnly && (
        <span className="flex flex-col border-l border-line-strong pl-2 leading-none min-[360px]:pl-3">
          <span className="font-display text-[0.95rem] font-semibold tracking-[0.22em] text-ice min-[360px]:tracking-[0.32em]">NEXUS</span>
          <span className="mt-1 font-mono text-[0.6rem] tracking-[0.2em] text-muted min-[360px]:tracking-[0.28em]">{site.chapter.shortName}</span>
        </span>
      )}
    </Link>
  );
}
