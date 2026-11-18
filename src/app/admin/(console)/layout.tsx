import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/actions/account";
import { AdminNav } from "@/components/admin/AdminNav";
import { navFor } from "@/lib/admin/nav";
import { ROLE_LABEL } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/session";

export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const { viewer } = await requireAdmin();
  const groups = navFor(viewer.roles);
  const role = viewer.roles.filter((r) => r !== "member").map((r) => ROLE_LABEL[r]).join(", ");

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-panel focus:px-4 focus:py-2 focus:text-ice">
        Skip to content
      </a>
      <header className="border-b border-line bg-abyss/80">
        <div className="mx-auto flex max-w-[96rem] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/admin" className="flex items-baseline gap-3">
            <span className="font-display text-sm tracking-[0.2em] text-ice">NEXUS</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">Command centre</span>
          </Link>
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <span className="min-w-0 truncate text-muted" title={viewer.email}>
              {viewer.email}
              {role && <span className="text-dim"> · {role}</span>}
            </span>
            <Link href="/" className="text-silver hover:text-cyan">
              View site
            </Link>
            <form action={signOut}>
              <button type="submit" className="text-silver hover:text-danger">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[96rem] lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8 lg:px-6">
        <AdminNav groups={groups} />
        <main id="main" className="min-w-0 px-4 py-8 sm:px-6 lg:px-0 lg:py-10">
          {children}
        </main>
      </div>
    </>
  );
}
