import Link from "next/link";
import { TerritoryGlyph } from "@/components/brand/TerritoryGlyph";
import { Card } from "@/components/ui/Card";
import { territories } from "@/config/territories";

/** The six territories as navigable panels. Reused on Home and Explore. */
export function TerritoryGrid({ headingLevel = "h3" }: { headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {territories.map((t) => (
        <li key={t.id}>
          <Card accent={t.accent} interactive className="h-full">
            <Link href={t.href} className="flex h-full flex-col p-7 focus-visible:outline-offset-[-4px]">
              <div className="flex items-start justify-between">
                <TerritoryGlyph id={t.id} className="size-12 transition-transform duration-500 group-hover/card:scale-110" />
                <span className="font-mono text-xs tracking-[0.24em] text-dim">{t.code}</span>
              </div>
              <Heading className="mt-10 font-display text-xl font-semibold">{t.name}</Heading>
              <p className="mt-1 font-mono text-[0.68rem] tracking-[0.18em] uppercase" style={{ color: t.accent }}>
                {t.purpose}
              </p>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">{t.description}</p>
              <span className="mt-6 inline-flex items-center gap-2 font-mono text-[0.7rem] tracking-[0.2em] text-silver uppercase transition-colors group-hover/card:text-ice">
                Enter territory
                <span aria-hidden="true" className="transition-transform duration-300 group-hover/card:translate-x-1">
                  →
                </span>
              </span>
            </Link>
          </Card>
        </li>
      ))}
    </ul>
  );
}
