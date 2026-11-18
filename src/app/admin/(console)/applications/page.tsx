import Link from "next/link";
import { ApplicationReview } from "@/components/admin/Controls";
import {
  AdminHeader,
  DownloadLink,
  ListFilter,
  LoadError,
  Pager,
  Panel,
  StatusBadge,
} from "@/components/admin/Shell";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import {
  PAGE_SIZE,
  ilikeAny,
  kept,
  pageOf,
  param,
  searchTerm,
} from "@/lib/admin/query";
import { ADMINS } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate } from "@/lib/validate";

export const metadata = { title: "Membership applications" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Declined" },
];

export default async function Page({ searchParams }: Props) {
  const { db } = await requireAdmin(ADMINS);
  const sp = await searchParams;
  const q = param(sp, "q");
  const status = param(sp, "status");
  const { page, from, to } = pageOf(sp);

  let query = db.from("membership_applications").select("*");
  const term = searchTerm(q);
  if (term)
    query = query.or(ilikeAny(["full_name", "email", "department"], term));
  if (STATUSES.some((s) => s.value === status))
    query = query.eq("status", status);
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);
  const rows = data ?? [];
  const more = rows.length > PAGE_SIZE;

  return (
    <>
      <AdminHeader
        title="Membership applications"
        description="Applications sent from the membership page. Record a decision and a note; contact applicants by email to welcome them."
        actions={
          <>
            <DownloadLink href="/admin/api/export/applications" />
            <Link
              href="/admin/settings"
              className={buttonClasses({ size: "sm", variant: "ghost" })}
            >
              Open or close applications
            </Link>
          </>
        }
      />
      <Panel>
        <ListFilter q={q} status={status} statuses={STATUSES} />
        {error ? (
          <LoadError />
        ) : rows.length === 0 ? (
          <EmptyState
            title={q || status ? "Nothing matches" : "No applications yet"}
            description={
              q || status
                ? "Try a different search or status."
                : "Applications from the membership page appear here."
            }
          />
        ) : (
          <>
            <ul className="space-y-4">
              {rows.slice(0, PAGE_SIZE).map((a) => (
                <li
                  key={a.id as string}
                  className="border border-line bg-abyss/60 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-display text-lg text-ice">
                        {a.full_name as string}
                      </h2>
                      <p className="mt-1 text-xs text-muted">
                        <a
                          href={`mailto:${a.email as string}`}
                          className="break-all text-cyan hover:underline"
                        >
                          {a.email as string}
                        </a>
                        {[a.department, a.year_of_study].filter(Boolean).length
                          ? ` · ${[a.department, a.year_of_study].filter(Boolean).join(" · ")}`
                          : ""}{" "}
                        · applied {formatDate(String(a.created_at), true)}
                      </p>
                    </div>
                    <StatusBadge status={a.status as string} />
                  </div>
                  {a.motivation ? (
                    <p className="mt-3 text-sm whitespace-pre-line text-silver">
                      {a.motivation as string}
                    </p>
                  ) : null}
                  <div className="mt-4 border-t border-line pt-4">
                    <ApplicationReview
                      id={a.id as string}
                      status={a.status as string}
                      note={(a.review_note as string) ?? ""}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <Pager
              page={page}
              more={more}
              path="/admin/applications"
              params={kept({ q, status })}
            />
          </>
        )}
      </Panel>
    </>
  );
}
