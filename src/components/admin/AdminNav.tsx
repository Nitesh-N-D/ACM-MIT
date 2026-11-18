"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import type { NavGroup } from "@/lib/admin/nav";
import { cn } from "@/lib/cn";

function Links({ groups, path }: { groups: NavGroup[]; path: string }) {
  return (
    <>
      {groups.map((g) => (
        <div key={g.label} className="mb-5">
          <p className="mb-1.5 px-3 font-mono text-[10px] uppercase tracking-[0.22em] text-dim">{g.label}</p>
          <ul>
            {g.items.map((item) => {
              const active = item.href === "/admin" ? path === "/admin" : path === item.href || path.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block border-l-2 px-3 py-1.5 text-sm transition-colors",
                      active ? "border-cyan bg-cyan/5 text-ice" : "border-transparent text-muted hover:border-line-strong hover:text-ice",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}

/** Sidebar on wide screens; a menu that folds away on phones and tablets. */
export function AdminNav({ groups }: { groups: NavGroup[] }) {
  const path = usePathname();
  const details = useRef<HTMLDetailsElement>(null);
  // Close the phone menu after navigating.
  useEffect(() => {
    if (details.current) details.current.open = false;
  }, [path]);

  return (
    <>
      <details ref={details} className="group border-b border-line lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-mono text-xs uppercase tracking-[0.2em] text-ice sm:px-6 [&::-webkit-details-marker]:hidden">
          Menu
          <span aria-hidden="true" className="transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        <nav aria-label="Command centre" className="max-h-[70dvh] overflow-y-auto px-2 pb-4 sm:px-4">
          <Links groups={groups} path={path} />
        </nav>
      </details>
      <nav aria-label="Command centre" className="sticky top-0 hidden max-h-dvh overflow-y-auto py-6 pr-2 lg:block">
        <Links groups={groups} path={path} />
      </nav>
    </>
  );
}
