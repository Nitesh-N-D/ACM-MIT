import Link from "next/link";
import { AdminHeader, Panel, StatusBadge } from "@/components/admin/Shell";
import { Notice } from "@/components/ui/States";
import { ADMINS, CONTENT, EVENTS, STAFF, hasAny, type Role } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/session";
import type { Db } from "@/lib/supabase/server";
import { formatDate } from "@/lib/validate";

export const metadata = { title: "Dashboard" };

type Count = { label: string; href: string; roles: readonly Role[]; run: (db: Db) => PromiseLike<{ count: number | null; error: unknown }>; urgent?: boolean };

const head = { count: "exact", head: true } as const;

const COUNTS: Count[] = [
  { label: "Upcoming events", href: "/admin/events", roles: EVENTS, run: (db) => db.from("events").select("id", head).eq("status", "published").gte("starts_at", new Date().toISOString()) },
  { label: "Active registrations", href: "/admin/registrations", roles: EVENTS, run: (db) => db.from("event_registrations").select("id", head).neq("status", "cancelled") },
  { label: "Projects awaiting approval", href: "/admin/submissions", roles: CONTENT, urgent: true, run: (db) => db.from("project_submissions").select("id", head).eq("status", "pending") },
  { label: "Membership applications", href: "/admin/applications?status=pending", roles: ADMINS, urgent: true, run: (db) => db.from("membership_applications").select("id", head).eq("status", "pending") },
  { label: "New messages", href: "/admin/messages?status=new", roles: ADMINS, urgent: true, run: (db) => db.from("contact_submissions").select("id", head).eq("status", "new") },
  { label: "Photos awaiting consent", href: "/admin/media?consent=no", roles: STAFF, urgent: true, run: (db) => db.from("gallery_items").select("id", head).eq("consent_confirmed", false) },
  { label: "Published projects", href: "/admin/projects", roles: CONTENT, run: (db) => db.from("projects").select("id", head).eq("status", "published") },
  { label: "Member accounts", href: "/admin/members", roles: ADMINS, run: (db) => db.from("profiles").select("id", head) },
];

export default async function Page() {
  const { viewer, db } = await requireAdmin();
  const mine = COUNTS.filter((c) => hasAny(viewer.roles, c.roles));
  const admin = hasAny(viewer.roles, ADMINS);

  const [counts, activity] = await Promise.all([
    Promise.all(mine.map(async (c) => ({ ...c, result: await c.run(db) }))),
    admin ? db.from("admin_activity_logs").select("id, actor_email, action, entity, summary, created_at").order("created_at", { ascending: false }).limit(12) : null,
  ]);
  const failed = counts.some((c) => c.result.error) || Boolean(activity?.error);

  return (
    <>
      <AdminHeader title={viewer.fullName ? `Welcome back, ${viewer.fullName.split(" ")[0]}` : "Command centre"} description="Everything the chapter publishes on NEXUS is managed from here. Changes appear on the public site straight away." />
      {failed && (
        <Notice tone="warning" className="mb-6">
          Some figures could not be loaded just now. Reload the page in a moment.
        </Notice>
      )}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="At a glance">
        {counts.map((c) => {
          const n = c.result.error ? null : (c.result.count ?? 0);
          const attention = c.urgent && n !== null && n > 0;
          return (
            <li key={c.label}>
              <Link href={c.href} className="block h-full border border-line bg-deep/50 p-5 transition-colors hover:border-cyan/60">
                <p className={attention ? "font-display text-3xl text-warning" : "font-display text-3xl text-ice"}>{n ?? "—"}</p>
                <p className="mt-2 text-sm text-muted">{c.label}</p>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        {admin ? (
          <Panel title="Recent activity" action={<Link href="/admin/activity" className="text-xs text-cyan hover:underline">Full log →</Link>}>
            {activity?.data?.length ? (
              <ol className="divide-y divide-line">
                {activity.data.map((a) => (
                  <li key={a.id as number} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-baseline sm:gap-4">
                    <span className="shrink-0 text-xs text-dim sm:w-40">{formatDate(a.created_at as string, true)}</span>
                    <span className="min-w-0 text-silver">
                      <span className="text-ice">{(a.actor_email as string) || "System"}</span> {String(a.action).toLowerCase()} {String(a.entity).replace(/_/g, " ")}
                      {a.summary ? <span className="text-muted"> · {a.summary as string}</span> : null}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted">No changes recorded yet. Every edit made here will be listed.</p>
            )}
          </Panel>
        ) : (
          <Panel title="Your role">
            <p className="text-sm text-muted">You can manage the areas listed in the menu. Ask a Super Admin if you need access to more.</p>
          </Panel>
        )}
        <Panel title="Quick actions">
          <ul className="space-y-2 text-sm">
            {hasAny(viewer.roles, EVENTS) && <QuickLink href="/admin/events/new">Create an event</QuickLink>}
            {hasAny(viewer.roles, CONTENT) && <QuickLink href="/admin/announcements/new">Post an announcement</QuickLink>}
            {hasAny(viewer.roles, CONTENT) && <QuickLink href="/admin/projects/new">Add a project</QuickLink>}
            <QuickLink href="/admin/media">Upload photographs</QuickLink>
            {hasAny(viewer.roles, CONTENT) && <QuickLink href="/admin/content">Edit homepage text</QuickLink>}
            <QuickLink href="/admin/exports">Download a CSV</QuickLink>
          </ul>
          <div className="mt-5 border-t border-line pt-4 text-xs text-dim">
            Status key: <StatusBadge status="draft" /> <StatusBadge status="published" /> <StatusBadge status="pending" />
          </div>
        </Panel>
      </div>
    </>
  );
}

function QuickLink({ href, children }: { href: string; children: string }) {
  return (
    <li>
      <Link href={href} className="flex items-center justify-between border border-line px-3 py-2 text-silver hover:border-cyan/60 hover:text-ice">
        {children}
        <span aria-hidden="true">→</span>
      </Link>
    </li>
  );
}
