import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { Notice } from "@/components/ui/States";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/validate";

/** Page title row for every command-centre screen. */
export function AdminHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link
            href={back.href}
            className="mb-3 inline-block font-mono text-[11px] uppercase tracking-[0.2em] text-dim hover:text-cyan"
          >
            ← {back.label}
          </Link>
        )}
        <h1 className="font-display text-2xl text-ice sm:text-3xl">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>
      )}
    </header>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("border border-line bg-deep/50 p-5 sm:p-6", className)}
    >
      {(title || action) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && (
              <h2 className="font-display text-base text-ice">{title}</h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-muted">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const TONES: Record<string, { label: string; tone: BadgeTone }> = {
  draft: { label: "Draft", tone: "neutral" },
  published: { label: "Published", tone: "success" },
  archived: { label: "Archived", tone: "neutral" },
  pending: { label: "Pending", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Declined", tone: "danger" },
  registered: { label: "Registered", tone: "success" },
  waitlisted: { label: "Waitlist", tone: "warning" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  new: { label: "New", tone: "cyan" },
  read: { label: "Read", tone: "neutral" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = TONES[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

/** Renders a cell value by kind. */
export function Cell({ value, kind }: { value: unknown; kind?: string }) {
  if (kind === "status") return <StatusBadge status={String(value ?? "")} />;
  if (kind === "bool")
    return (
      <span className={value ? "text-success" : "text-dim"}>
        {value ? "Yes" : "No"}
      </span>
    );
  if (kind === "datetime")
    return (
      <span className="whitespace-nowrap">
        {value ? formatDate(String(value), true) : "—"}
      </span>
    );
  if (kind === "date")
    return (
      <span className="whitespace-nowrap">
        {value ? formatDate(String(value)) : "—"}
      </span>
    );
  const text = Array.isArray(value)
    ? value.join(", ")
    : value === null || value === undefined || value === ""
      ? "—"
      : String(value);
  return <>{text}</>;
}

/** A table that scrolls sideways on phones instead of breaking the layout. */
export function Table({
  head,
  children,
  caption,
}: {
  head: ReactNode[];
  children: ReactNode;
  caption: string;
}) {
  return (
    <div className="-mx-5 overflow-x-auto sm:mx-0">
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line-strong">
            {head.map((h, i) => (
              <th
                key={i}
                scope="col"
                className="px-3 py-2.5 font-mono text-[10px] font-normal uppercase tracking-[0.2em] text-dim first:pl-5 sm:first:pl-3"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line text-silver">{children}</tbody>
      </table>
    </div>
  );
}

export const td = "px-3 py-3 align-top first:pl-5 sm:first:pl-3";

/** Search box plus optional status filter, submitted as a GET form. */
export function ListFilter({
  q,
  status,
  statuses,
  extra,
}: {
  q: string;
  status?: string;
  statuses?: { value: string; label: string }[];
  extra?: ReactNode;
}) {
  return (
    <form
      method="get"
      role="search"
      className="mb-5 flex flex-wrap items-end gap-3"
    >
      <label className="flex min-w-0 flex-1 basis-56 flex-col gap-1.5 text-xs text-silver">
        <span className="font-mono uppercase tracking-[0.18em]">Search</span>
        <input
          name="q"
          defaultValue={q}
          type="search"
          maxLength={80}
          className="h-10 border border-line-strong bg-abyss px-3 text-sm text-ice placeholder:text-dim focus:border-cyan focus:outline-none"
          placeholder="Type and press Enter"
        />
      </label>
      {statuses && (
        <label className="flex flex-col gap-1.5 text-xs text-silver">
          <span className="font-mono uppercase tracking-[0.18em]">Status</span>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="h-10 border border-line-strong bg-abyss px-2 text-sm text-ice"
          >
            <option value="">All</option>
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {extra}
      <button
        type="submit"
        className="h-10 border border-line-strong bg-panel px-4 font-mono text-xs uppercase tracking-[0.18em] text-ice hover:border-cyan"
      >
        Filter
      </button>
    </form>
  );
}

/** Previous / next links that keep the other query parameters. */
export function Pager({
  page,
  more,
  params,
  path,
}: {
  page: number;
  more: boolean;
  params: Record<string, string>;
  path: string;
}) {
  if (page === 1 && !more) return null;
  const href = (p: number) =>
    `${path}?${new URLSearchParams({ ...params, page: String(p) })}`;
  const link =
    "border border-line-strong px-3 py-1.5 font-mono text-xs uppercase tracking-[0.18em] text-ice hover:border-cyan";
  return (
    <nav
      aria-label="Pages"
      className="mt-5 flex items-center gap-3 text-sm text-dim"
    >
      {page > 1 && (
        <Link className={link} href={href(page - 1)}>
          ← Previous
        </Link>
      )}
      <span>Page {page}</span>
      {more && (
        <Link className={link} href={href(page + 1)}>
          Next →
        </Link>
      )}
    </nav>
  );
}

export function LoadError() {
  return (
    <Notice tone="danger" title="Could not load">
      The database did not answer just now. Reload the page in a moment; nothing
      has been changed.
    </Notice>
  );
}

/** A CSV download: a plain link (never client navigation), styled as a button. */
export function DownloadLink({
  href,
  children = "Download CSV",
  variant = "secondary",
}: {
  href: string;
  children?: ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <a href={href} download className={buttonClasses({ size: "sm", variant })}>
      {children}
    </a>
  );
}
