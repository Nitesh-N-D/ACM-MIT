import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/actions/account";
import { ProfileForm } from "@/components/forms/AccountForms";
import { PageHeader } from "@/components/sections/PageHeader";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Notice } from "@/components/ui/States";
import { ROLE_LABEL, STAFF, hasAny } from "@/lib/auth/roles";
import { requireViewer } from "@/lib/auth/session";
import { pageMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/validate";

export const metadata = pageMetadata({
  title: "Dashboard",
  description: "Your NEXUS account: profile, registrations and submissions.",
  path: "/dashboard",
  noIndex: true,
});

type Status = { label: string; tone: BadgeTone };
const STATUS: Record<string, Status> = {
  registered: { label: "Registered", tone: "success" },
  waitlisted: { label: "Waitlist", tone: "warning" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  pending: { label: "In review", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Not accepted", tone: "danger" },
};

const status = (s: string, fallback: Status): Status => STATUS[s] ?? fallback;
const REGISTERED: Status = { label: "Registered", tone: "success" };
const REVIEW: Status = { label: "In review", tone: "warning" };

type EventRef = { title: string; slug: string; starts_at: string | null };
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

function Panel({ id, title, action, children }: { id: string; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="nexus-frame p-6 sm:p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 id={id} className="font-display text-lg text-ice">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}

export default async function Page() {
  const { viewer, db } = await requireViewer("/dashboard");
  const [profile, registrations, submissions, applications] = await Promise.all([
    db.from("profiles").select("full_name, department, year_of_study, bio").eq("id", viewer.id).maybeSingle(),
    db
      .from("event_registrations")
      .select("id, status, created_at, events(title, slug, starts_at)")
      .eq("user_id", viewer.id)
      .order("created_at", { ascending: false })
      .limit(50),
    db.from("project_submissions").select("id, title, status, review_note, created_at").eq("user_id", viewer.id).order("created_at", { ascending: false }).limit(50),
    db.from("membership_applications").select("id, status, created_at").eq("user_id", viewer.id).order("created_at", { ascending: false }).limit(10),
  ]);
  const failed = [profile, registrations, submissions, applications].some((r) => r.error);
  const p = profile.data ?? { full_name: "", department: "", year_of_study: "", bio: "" };
  const staff = hasAny(viewer.roles, STAFF);

  return (
    <>
      <PageHeader
        eyebrow="Members"
        title={viewer.fullName ? `Welcome, ${viewer.fullName.split(" ")[0]}` : "Your dashboard"}
        description={viewer.email}
        breadcrumbs={[{ label: "NEXUS", href: "/" }, { label: "Dashboard" }]}
      >
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {viewer.roles.map((r) => (
            <Badge key={r} tone={r === "member" ? "neutral" : "violet"}>
              {ROLE_LABEL[r]}
            </Badge>
          ))}
          {staff && (
            <Button href="/admin" size="sm">
              Command centre
            </Button>
          )}
          <Button href="/dashboard/security" variant="secondary" size="sm">
            Security
          </Button>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </PageHeader>

      <Container className="space-y-6 py-12 sm:py-16">
        {!viewer.emailVerified && (
          <Notice tone="warning">Your email address is not verified yet. Open the link we sent you to register for events and submit projects.</Notice>
        )}
        {failed && <Notice tone="danger">Some of your records could not be loaded just now. Reload the page to try again.</Notice>}

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel
            id="my-events"
            title="My registrations"
            action={
              <Button href="/events" variant="ghost" size="sm">
                Browse events →
              </Button>
            }
          >
            {(registrations.data ?? []).length === 0 ? (
              <Empty>You have not registered for any events yet.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {(registrations.data ?? []).map((r) => {
                  const ev = one(r.events as EventRef | EventRef[] | null);
                  const s = status(r.status, REGISTERED);
                  return (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        {ev ? (
                          <Link href={`/events/${ev.slug}`} className="text-ice hover:underline">
                            {ev.title}
                          </Link>
                        ) : (
                          <span className="text-muted">Event removed</span>
                        )}
                        <p className="text-xs text-muted">{formatDate(ev?.starts_at)}</p>
                      </div>
                      <Badge tone={s.tone}>{s.label}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel
            id="my-projects"
            title="My project submissions"
            action={
              <Button href="/dashboard/projects/new" variant="ghost" size="sm">
                Submit a project →
              </Button>
            }
          >
            {(submissions.data ?? []).length === 0 ? (
              <Empty>Built something? Submit it for the Innovation Vault.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {(submissions.data ?? []).map((s) => {
                  const st = status(s.status, REVIEW);
                  return (
                    <li key={s.id} className="py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-ice">{s.title}</span>
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </div>
                      <p className="text-xs text-muted">Submitted {formatDate(s.created_at)}</p>
                      {s.review_note && <p className="mt-2 text-sm text-silver">Reviewer: {s.review_note}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <Panel id="my-profile" title="Profile">
            <ProfileForm profile={p} />
          </Panel>
          <Panel id="my-membership" title="Membership">
            {(applications.data ?? []).length === 0 ? (
              <div className="space-y-4">
                <Empty>No membership application on this account.</Empty>
                <Button href="/membership" variant="secondary" size="sm">
                  Apply for membership
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {(applications.data ?? []).map((a) => {
                  const st = status(a.status, REVIEW);
                  return (
                    <li key={a.id} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-silver">Applied {formatDate(a.created_at)}</span>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      </Container>
    </>
  );
}
