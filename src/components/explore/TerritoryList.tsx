import Link from "next/link";
import { territories } from "@/config/territories";

/** Plain, server-rendered routes into every district. Needs no JavaScript. */
export function TerritoryList() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {territories.map((t) => (
        <li key={t.id}>
          <Link
            href={t.href}
            className="group block h-full border border-line bg-deep/40 p-5 transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
            style={{ borderTopColor: t.accent }}
          >
            <p className="font-mono text-[0.65rem] tracking-[0.2em] uppercase" style={{ color: t.accent }}>
              {t.code} · {t.purpose}
            </p>
            <h3 className="mt-2 font-display text-base tracking-[0.08em] text-ice uppercase">{t.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-silver">{t.description}</p>
            <p className="mt-3 font-mono text-[0.65rem] tracking-[0.16em] text-mist uppercase group-hover:text-cyan">Enter district →</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
