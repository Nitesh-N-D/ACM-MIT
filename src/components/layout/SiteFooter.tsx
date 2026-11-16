import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { MailIcon, SocialIcon } from "@/components/brand/SocialIcon";
import { Container } from "@/components/ui/Container";
import { footerNav, site } from "@/config/site";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-24 border-t border-line bg-abyss/80">
      {/* Energy seam along the top edge */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 -top-px h-px bg-linear-to-r from-transparent via-cyan/60 to-transparent"
      />
      <Container
        size="wide"
        className="grid gap-12 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)]"
      >
        <div className="max-w-sm">
          <Logo />
          <p className="mt-6 text-sm leading-relaxed text-muted">
            {site.description}
          </p>
          <p className="eyebrow mt-6">{site.tagline}</p>
          <ul
            className="mt-8 flex flex-wrap gap-2"
            aria-label="Official channels"
          >
            {site.socials.map((s) => (
              <li key={s.href}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${s.label} (opens in a new tab)`}
                  className="flex size-10 items-center justify-center border border-line-strong text-silver transition-colors hover:border-cyan/60 hover:text-cyan"
                >
                  <SocialIcon label={s.label} className="size-[18px]" />
                </a>
              </li>
            ))}
            <li>
              <a
                href={`mailto:${site.chapter.email}`}
                aria-label={`Email ${site.chapter.email}`}
                className="flex size-10 items-center justify-center border border-line-strong text-silver transition-colors hover:border-cyan/60 hover:text-cyan"
              >
                <MailIcon className="size-[18px]" />
              </a>
            </li>
          </ul>
        </div>

        {footerNav.map((group) => (
          <nav key={group.heading} aria-label={group.heading}>
            <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.24em] text-dim">
              {group.heading}
            </h2>
            <ul className="mt-5 space-y-3">
              {group.items.map((item) => (
                <li key={item.href + item.label}>
                  <Link
                    href={item.href}
                    className="group flex items-baseline gap-2 text-sm text-silver transition-colors hover:text-cyan"
                  >
                    {item.code && (
                      <span className="font-mono text-[0.65rem] text-dim transition-colors group-hover:text-cyan/70">
                        {item.code}
                      </span>
                    )}
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>

      <Container
        size="wide"
        className="flex flex-col gap-3 border-t border-line py-6 text-xs text-dim sm:flex-row sm:items-center sm:justify-between"
      >
        <p>
          © {year} {site.chapter.fullName} ·{" "}
          <a
            href={site.chapter.institutionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted underline-offset-4 hover:text-cyan hover:underline"
          >
            {site.chapter.institution}
          </a>
          , {site.chapter.university}
        </p>
        <p className="font-mono uppercase tracking-[0.2em]">
          NEXUS · The Digital Civilization
        </p>
      </Container>
    </footer>
  );
}
