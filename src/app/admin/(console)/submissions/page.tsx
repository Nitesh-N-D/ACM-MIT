import Link from "next/link";
import { SubmissionReview } from "@/components/admin/Controls";
import {
  AdminHeader,
  DownloadLink,
  ListFilter,
  LoadError,
  Pager,
  Panel,
  StatusBadge,
} from "@/components/admin/Shell";
import { EmptyState } from "@/components/ui/States";
import {
  PAGE_SIZE,
  ilikeAny,
  kept,
  pageOf,
  param,
  searchTerm,
} from "@/lib/admin/query";
import { CONTENT } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate } from "@/lib/validate";

export const metadata = { title: "Project approval" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Declined" },
];

/** Links submitted by members open safely, and only when they are web links. */
const safeLink = (v: unknown) =>
  typeof v === "string" && /^https?:\/\//.test(v) ? v : null;

export default async function Page({ searchParams }: Props) {
  const { db } = await requireAdmin(CONTENT);
  const sp = await searchParams;
  const q = param(sp, "q");
  // Pending first: that is the work waiting to be done.
  const status = sp.status === undefined ? "pending" : param(sp, "status");
  const { page, from, to } = pageOf(sp);

  let query = db.from("project_submissions").select("*");
  const term = searchTerm(q);
  if (term) query = query.or(ilikeAny(["title", "team", "summary"], term));
  if (STATUSES.some((s) => s.value === status))
    query = query.eq("status", status);
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);
  const rows = data ?? [];
  const more = rows.length > PAGE_SIZE;

  const ids = [...new Set(rows.map((r) => r.user_id as string))];
  const { data: people } = ids.length
    ? await db.from("profiles").select("id, email, full_name").in("id", ids)
    : { data: [] };
  const byId = new Map((people ?? []).map((p) => [p.id as string, p]));

  return (
    <>
      <AdminHeader
        title="Project approval"
        description="Projects submitted by members from their dashboard. Approving one creates a draft project you can polish and publish; declining sends your note back to the team."
        actions={<DownloadLink href="/admin/api/export/submissions" />}
      />
      <Panel>
        <ListFilter q={q} status={status} statuses={STATUSES} />
        {error ? (
          <LoadError />
        ) : rows.length === 0 ? (
          <EmptyState
            title={
              status === "pending" && !q
                ? "Nothing waiting for review"
                : "Nothing matches"
            }
            description={
              status === "pending" && !q
                ? "New submissions from members appear here."
                : "Try a different search or status."
            }
          />
        ) : (
          <>
            <ul className="space-y-4">
              {rows.slice(0, PAGE_SIZE).map((s) => {
                const who = byId.get(s.user_id as string);
                const repo = safeLink(s.repo_url);
                const demo = safeLink(s.demo_url);
                return (
                  <li
                    key={s.id as string}
                    className="border border-line bg-abyss/60 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="font-display text-lg text-ice">
                          {s.title as string}
                        </h2>
                        <p className="mt-1 text-xs text-muted">
                          {(who?.full_name as string) ||
                            (who?.email as string) ||
                            "A member"}{" "}
                          · submitted {formatDate(String(s.created_at), true)}
                          {s.team ? ` · team: ${s.team as string}` : ""}
                        </p>
                      </div>
                      <StatusBadge status={s.status as string} />
                    </div>
                    {s.summary ? (
                      <p className="mt-3 text-sm text-silver">
                        {s.summary as string}
                      </p>
                    ) : null}
                    {s.description ? (
                      <details className="mt-3 text-sm">
                        <summary className="cursor-pointer text-cyan">
                          Full description
                        </summary>
                        <p className="mt-2 whitespace-pre-line text-silver">
                          {s.description as string}
                        </p>
                      </details>
                    ) : null}
                    {(repo || demo) && (
                      <p className="mt-3 flex flex-wrap gap-4 text-sm">
                        {repo && (
                          <a
                            href={repo}
                            target="_blank"
                            rel="noreferrer nofollow"
                            className="break-all text-cyan hover:underline"
                          >
                            Repository ↗
                          </a>
                        )}
                        {demo && (
                          <a
                            href={demo}
                            target="_blank"
                            rel="noreferrer nofollow"
                            className="break-all text-cyan hover:underline"
                          >
                            Demo ↗
                          </a>
                        )}
                      </p>
                    )}
                    <div className="mt-4 border-t border-line pt-4">
                      {s.status === "pending" ? (
                        <SubmissionReview id={s.id as string} />
                      ) : (
                        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 text-sm text-muted">
                          <span>
                            Reviewed{" "}
                            {s.reviewed_at
                              ? formatDate(String(s.reviewed_at), true)
                              : ""}
                          </span>
                          {s.review_note ? (
                            <span>Note: {s.review_note as string}</span>
                          ) : null}
                          {s.project_id ? (
                            <Link
                              href={`/admin/projects/${s.project_id}`}
                              className="text-cyan hover:underline"
                            >
                              Open the project →
                            </Link>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <Pager
              page={page}
              more={more}
              path="/admin/submissions"
              params={kept({ q, status })}
            />
          </>
        )}
      </Panel>
    </>
  );
}
