import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { TerritoryGlyph } from "@/components/brand/TerritoryGlyph";
import { PageHeader } from "@/components/sections/PageHeader";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Notice } from "@/components/ui/States";
import { getTerritory, territories, type TerritoryId } from "@/config/territories";
import { topicsOf } from "@/config/topics";
import { districtDigests, type DistrictDigest } from "@/lib/data/districts";
import type { DistrictCopy, Source } from "@/lib/data/types";

/**
 * Shared frame of the six district pages: the territory header (with the
 * way into the 3D district and its interior), the 2D reception hall, an
 * optional notice set by the admin centre, the page content, and links to
 * the neighbouring districts.
 */
export async function DistrictPage({
  id,
  title,
  copy,
  crumbs,
  actions,
  children,
}: {
  id: TerritoryId;
  title: string;
  copy?: DistrictCopy;
  /** Extra breadcrumb between NEXUS and the page. */
  crumbs?: { label: string; href?: string }[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  const t = getTerritory(id);
  const digest = (await districtDigests())[id];
  return (
    <>
      <PageHeader
        eyebrow={`${t.code} · ${t.name}`}
        title={title}
        accent={t.accent}
        description={copy?.description || t.description}
        breadcrumbs={[{ label: "NEXUS", href: "/" }, ...(crumbs ?? []), { label: title }]}
        aside={
          <div className="flex flex-col items-start gap-4 lg:items-end">
            <TerritoryGlyph id={id} className="hidden size-20 lg:block" />
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Button href={`/explore?to=${id}`} variant="secondary" size="sm" className="world-hide">
                View in 3D
              </Button>
              <Button href="#reception" variant="ghost" size="sm" className="world-hide">
                Step inside ↓
              </Button>
            </div>
          </div>
        }
      >
        {actions && <div className="mt-8 flex flex-wrap gap-3">{actions}</div>}
      </PageHeader>

      <Container className="py-12 sm:py-16">
        {copy?.notice && (
          <Notice tone="info" title="Notice" className="mb-10 max-w-3xl">
            {copy.notice}
          </Notice>
        )}
        <Reception id={id} digest={digest} />
        {copy?.intro && <p className="mt-14 max-w-3xl text-lg leading-relaxed text-silver">{copy.intro}</p>}
        <div className="mt-14 in-[.world-page]:mt-0">{children}</div>
      </Container>

      <DistrictNav id={id} />
    </>
  );
}

/**
 * The district's reception hall in 2D: the same four walls as the 3D
 * interior (main display, exhibition, live displays, NEXUS directory) so the
 * visit works without WebGL, on any device, and with a screen reader.
 */
export function Reception({ id, digest }: { id: TerritoryId; digest: DistrictDigest }) {
  const t = getTerritory(id);
  const panel = "nexus-frame p-5 sm:p-6";
  const label = "font-mono text-[0.62rem] tracking-[0.2em] uppercase";
  return (
    <section id="reception" aria-labelledby="reception-title" className="scroll-mt-24" style={{ "--accent": t.accent } as CSSProperties}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4" style={{ borderBottomColor: `${t.accent}55` }}>
        <div className="flex items-center gap-3">
          <TerritoryGlyph id={id} className="size-9 shrink-0" />
          <div>
            <p className={label} style={{ color: t.accent }}>
              Reception · {t.code}
            </p>
            <h2 id="reception-title" className="mt-1 font-display text-xl text-ice sm:text-2xl">
              Welcome to {t.short}
            </h2>
          </div>
        </div>
        <Button href={`/explore?to=${id}:in`} variant="secondary" size="sm" className="world-hide">
          Walk through it in 3D →
        </Button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className={`${panel} lg:col-span-2`}>
          <p className={label} style={{ color: t.accent }}>
            Exhibition · What lives in {t.short}
          </p>
          <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {topicsOf(id).map((topic, i) => (
              <li key={topic.name}>
                <Link
                  href={topic.href}
                  className="group flex h-full flex-col border border-line bg-deep/50 px-3 py-2.5 transition-colors hover:border-(--accent)/60 hover:bg-deep"
                >
                  <span className="flex items-center justify-between font-mono text-[0.6rem] text-dim">
                    {String(i + 1).padStart(2, "0")}
                    <span aria-hidden="true" className="transition-colors group-hover:text-(--accent)">
                      →
                    </span>
                  </span>
                  <span className="mt-1 block text-sm leading-snug text-silver group-hover:text-ice">{topic.name}</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>

        <div className={panel}>
          <p className={label} style={{ color: t.accent }}>
            On the displays · {digest.label}
          </p>
          {digest.items.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {digest.items.map((item) => (
                <li key={item.href + item.title}>
                  <Link
                    href={item.href}
                    {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="group block border border-line bg-deep/50 px-3 py-2 transition-colors hover:border-(--accent)/60"
                  >
                    <span className="block text-sm text-ice group-hover:text-(--accent)">{item.title}</span>
                    {item.meta && <span className="mt-0.5 block font-mono text-[0.6rem] tracking-[0.12em] text-mist uppercase">{item.meta}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-muted">
              {digest.source === "error" ? "The displays could not be loaded right now." : "The displays light up as soon as the chapter publishes content here."}
            </p>
          )}
        </div>
      </div>

      <nav aria-label="NEXUS directory" className={`${panel} mt-4`}>
        <p className={label} style={{ color: t.accent }}>
          NEXUS directory
        </p>
        <ul className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {territories.map((d) => {
            const here = d.id === id;
            return (
              <li key={d.id}>
                <Link
                  href={here ? "#reception" : d.href}
                  aria-current={here ? "location" : undefined}
                  className="flex items-baseline gap-3 py-1.5 text-sm transition-colors hover:text-ice"
                >
                  <span className="font-mono text-[0.62rem] text-dim">{d.code}</span>
                  <span className={here ? "text-ice" : "text-silver"}>{d.short}</span>
                  {here && (
                    <span className="ml-auto font-mono text-[0.56rem] tracking-[0.16em] uppercase" style={{ color: t.accent }}>
                      You are here
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
          <li>
            <Link href="/heritage" className="flex items-baseline gap-3 py-1.5 text-sm text-silver transition-colors hover:text-ice">
              <span className="font-mono text-[0.62rem] text-dim">ARC</span>
              Heritage Archive
            </Link>
          </li>
        </ul>
      </nav>
    </section>
  );
}

/** Previous / next district, in territory order. */
export function DistrictNav({ id }: { id: TerritoryId }) {
  const i = territories.findIndex((t) => t.id === id);
  const prev = territories[(i + territories.length - 1) % territories.length]!;
  const next = territories[(i + 1) % territories.length]!;
  return (
    <nav aria-label="Other districts" className="border-t border-line">
      <Container className="grid gap-px py-0 sm:grid-cols-2">
        {[
          { t: prev, dir: "Previous district", arrow: "←" },
          { t: next, dir: "Next district", arrow: "→" },
        ].map(({ t, dir, arrow }, k) => (
          <Link
            key={dir}
            href={t.href}
            className={`group flex items-center gap-4 py-8 transition-colors hover:text-ice ${k === 1 ? "sm:flex-row-reverse sm:text-right" : ""}`}
          >
            <span aria-hidden="true" className="font-mono text-lg text-dim transition-colors group-hover:text-ice">
              {arrow}
            </span>
            <span>
              <span className="block font-mono text-[0.62rem] tracking-[0.2em] text-dim uppercase">
                {dir} · {t.code}
              </span>
              <span className="mt-1 block font-display text-lg text-silver group-hover:text-ice" style={{ textDecorationColor: t.accent }}>
                {t.name}
              </span>
            </span>
          </Link>
        ))}
      </Container>
    </nav>
  );
}

/** Honest state of a list: database unavailable, or no backend configured. */
export function SourceNotice({ source, what }: { source: Source; what: string }) {
  if (source === "error")
    return (
      <Notice tone="danger" title="Temporarily unavailable" className="mb-8 max-w-3xl">
        The {what} could not be loaded just now. Please refresh in a moment.
      </Notice>
    );
  if (source === "offline")
    return (
      <Notice tone="info" title="Not connected yet" className="mb-8 max-w-3xl">
        The {what} appear here once the site&apos;s database is connected. They are published from the ACM MIT admin centre.
      </Notice>
    );
  return null;
}

/** Section heading inside a district page. */
export function DistrictSection({
  id,
  title,
  eyebrow,
  description,
  action,
  children,
}: {
  id: string;
  title: string;
  eyebrow?: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mt-14 first:mt-0">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2 id={id} className="mt-2 scroll-mt-28 font-display text-2xl text-ice">
            {title}
          </h2>
          {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>}
        </div>
        {action}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}
