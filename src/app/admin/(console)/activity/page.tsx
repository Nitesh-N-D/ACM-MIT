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
import { Badge, type BadgeTone } from "@/components/ui/Badge";
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

export const metadata = { title: "Activity log" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const TONE: Record<string, BadgeTone> = {
  insert: "success",
  update: "cyan",
  delete: "danger",
  export: "violet",
};

export default async function Page({ searchParams }: Props) {
  const { db } = await requireAdmin(ADMINS);
  const sp = await searchParams;
  const q = param(sp, "q");
  const { page, from, to } = pageOf(sp);

  let query = db
    .from("admin_activity_logs")
    .select("id, actor_email, action, entity, entity_id, summary, created_at");
  const term = searchTerm(q);
  if (term)
    query = query.or(
      ilikeAny(["actor_email", "action", "entity", "summary"], term),
    );
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);
  const rows = data ?? [];
  const more = rows.length > PAGE_SIZE;

  return (
    <>
      <AdminHeader
        title="Activity log"
        description="Every change made in the command centre, written by the database itself, so it cannot be edited or skipped."
        actions={<DownloadLink href="/admin/api/export/activity" />}
      />
      <Panel>
        <ListFilter q={q} />
        {error ? (
          <LoadError />
        ) : rows.length === 0 ? (
          <EmptyState
            title={q ? "Nothing matches" : "Nothing recorded yet"}
            description={
              q
                ? "Try a different search."
                : "Changes appear here as soon as they are made."
            }
          />
        ) : (
          <>
            <Table
              caption="Activity log"
              head={["When", "Who", "Action", "Area", "Summary"]}
            >
              {rows.slice(0, PAGE_SIZE).map((a) => {
                const action = String(a.action).toLowerCase();
                return (
                  <tr key={String(a.id)}>
                    <td className={td}>
                      <Cell value={a.created_at} kind="datetime" />
                    </td>
                    <td className={`${td} break-all`}>
                      {(a.actor_email as string) || "System"}
                    </td>
                    <td className={td}>
                      <Badge tone={TONE[action] ?? "neutral"}>{action}</Badge>
                    </td>
                    <td className={td}>
                      {String(a.entity).replace(/_/g, " ")}
                    </td>
                    <td className={`${td} text-muted`}>
                      <Cell value={a.summary} />
                    </td>
                  </tr>
                );
              })}
            </Table>
            <Pager
              page={page}
              more={more}
              path="/admin/activity"
              params={kept({ q })}
            />
          </>
        )}
      </Panel>
    </>
  );
}
