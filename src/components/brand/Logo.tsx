import Image from "next/image";
import Link from "next/link";
import { site } from "@/config/site";
import { cn } from "@/lib/cn";

type LogoProps = {
  className?: string;
  /** Hide the NEXUS wordmark (e.g. very narrow screens). */
  markOnly?: boolean;
};

/**
 * Chapter logo + NEXUS wordmark.
 *
 * The supplied logo is a JPEG on white, so it sits in a light tile to stay
 * faithful to the original. Swap for a transparent SVG/PNG when available.
 */
export function Logo({ className, markOnly = false }: LogoProps) {
  return (
    <Link
      href="/"
      className={cn("group flex items-center gap-3", className)}
      aria-label={`${site.chapter.fullName} — NEXUS home`}
    >
      <span className="relative block size-10 shrink-0 overflow-hidden bg-white ring-1 ring-line-strong transition-shadow duration-300 group-hover:shadow-[0_0_20px_-4px_rgb(63_228_255/0.8)] [clip-path:polygon(0_0,calc(100%-7px)_0,100%_7px,100%_100%,7px_100%,0_calc(100%-7px))]">
        <Image
          src={site.logo.src}
          alt=""
          width={site.logo.width}
          height={site.logo.height}
          sizes="40px"
          priority
          className="size-full scale-[1.3] object-contain"
        />
      </span>
      {!markOnly && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[0.95rem] font-semibold tracking-[0.32em] text-ice">NEXUS</span>
          <span className="mt-1 font-mono text-[0.6rem] tracking-[0.28em] text-muted">{site.chapter.shortName}</span>
        </span>
      )}
    </Link>
  );
}
