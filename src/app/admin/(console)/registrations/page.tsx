import Link from "next/link";
import { RegistrationForm } from "@/components/admin/Controls";
import {
  AdminHeader,
  DownloadLink,
  Cell,
  ListFilter,
  LoadError,
  Pager,
  Panel,
  Table,
  td,
} from "@/components/admin/Shell";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { PAGE_SIZE, kept, pageOf, param } from "@/lib/admin/query";
import { isUuid, refOptions } from "@/lib/admin/server";
import { EVENTS } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/session";

export const metadata = { title: "Registrations" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
type Row = Record<string, unknown>;

const STATUSES = [
  { value: "registered", label: "Registered" },
  { value: "waitlisted", label: "Waitlist" },
  { value: "cancelled", label: "Cancelled" },
];

const one = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

export default async function Page({ searchParams }: Props) {
  const { db } = await requireAdmin(EVENTS);
  const sp = await searchParams;
  const event = isUuid(param(sp, "event")) ? param(sp, "event") : "";
  const status = param(sp, "status");
  const q = param(sp, "q").toLowerCase();
  const { page, from, to } = pageOf(sp);

  let query = db
    .from("event_registrations")
    .select(
      "id, user_id, status, attended, created_at, events(title, starts_at)",
    );
  if (event) query = query.eq("event_id", event);
  if (STATUSES.some((s) => s.value === status))
    query = query.eq("status", status);
  const [{ data, error }, refs] = await Promise.all([
    query.order("created_at", { ascending: false }).range(from, to),
    refOptions(db),
  ]);
  const regs = (data ?? []) as Row[];

  const ids = [...new Set(regs.map((r) => r.user_id as string))];
  const { data: people } = ids.length
    ? await db
        .from("profiles")
        .select("id, email, full_name, department, year_of_study")
        .in("id", ids)
    : { data: [] };
  const byId = new Map((people ?? []).map((p) => [p.id as string, p as Row]));

  // The name/email search runs on the page shown; names live in profiles, not registrations.
  const rows = regs.slice(0, PAGE_SIZE).filter((r) => {
    if (!q) return true;
    const p = byId.get(r.user_id as string);
    return `${p?.full_name ?? ""} ${p?.email ?? ""}`.toLowerCase().includes(q);
  });
  const more = regs.length > PAGE_SIZE;
  const exportHref = `/admin/api/export/registrations${event ? `?event=${event}` : ""}`;

  return (
    <>
      <AdminHeader
        title="Registrations"
        description="Who registered for which event. Move people between the list and the waitlist, and record attendance after the event."
        actions={<DownloadLink href={exportHref} />}
      />
      <Panel>
        <ListFilter
          q={param(sp, "q")}
          status={status}
          statuses={STATUSES}
          extra={
            <label className="flex flex-col gap-1.5 text-xs text-silver">
              <span className="font-mono tracking-[0.18em] uppercase">
                Event
              </span>
              <select
                name="event"
                defaultValue={event}
                className="h-10 max-w-64 border border-line-strong bg-abyss px-2 text-sm text-ice"
              >
                <option value="">All events</option>
                {refs.events.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
            </label>
          }
        />
        {error ? (
          <LoadError />
        ) : rows.length === 0 ? (
          <EmptyState
            title={
              event || status || q ? "Nothing matches" : "No registrations yet"
            }
            description={
              event || status || q
                ? "Try a different filter."
                : "When members register for a published event, they appear here."
            }
            action={
              <Link
                href="/admin/events"
                className={buttonClasses({ size: "sm", variant: "ghost" })}
              >
                Go to events →
              </Link>
            }
          />
        ) : (
          <>
            <Table
              caption="Registrations"
              head={["Member", "Event", "Registered", "Status and attendance"]}
            >
              {rows.map((r) => {
                const p = byId.get(r.user_id as string);
                const ev = one(r.events as Row | Row[] | null);
                return (
                  <tr key={r.id as string}>
                    <td className={td}>
                      <p className="text-ice">
                        {(p?.full_name as string) || "Unnamed member"}
                      </p>
                      <p className="text-xs text-muted">
                        {(p?.email as string) ?? "Profile unavailable"}
                      </p>
                      {p?.department ? (
                        <p className="text-xs text-dim">
                          {p.department as string}
                          {p.year_of_study ? ` · ${p.year_of_study}` : ""}
                        </p>
                      ) : null}
                    </td>
                    <td className={td}>
                      <p className="text-silver">
                        {(ev?.title as string) ?? "—"}
                      </p>
                      <p className="text-xs text-dim">
                        <Cell value={ev?.starts_at} kind="datetime" />
                      </p>
                    </td>
                    <td className={td}>
                      <Cell value={r.created_at} kind="datetime" />
                    </td>
                    <td className={td}>
                      <RegistrationForm
                        id={r.id as string}
                        status={r.status as string}
                        attended={Boolean(r.attended)}
                      />
                    </td>
                  </tr>
                );
              })}
            </Table>
            <Pager
              page={page}
              more={more}
              path="/admin/registrations"
              params={kept({ q: param(sp, "q"), status, event })}
            />
          </>
        )}
      </Panel>
    </>
  );
}
