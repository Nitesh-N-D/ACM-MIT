import Link from "next/link";
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
import { Badge } from "@/components/ui/Badge";
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
import { ADMINS, ROLE_LABEL, SUPER, hasAny, type Role } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/session";

export const metadata = { title: "Members" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: Props) {
  const { db, viewer } = await requireAdmin(ADMINS);
  const sp = await searchParams;
  const q = param(sp, "q");
  const { page, from, to } = pageOf(sp);

  let query = db
    .from("profiles")
    .select("id, email, full_name, department, year_of_study, created_at");
  const term = searchTerm(q);
  if (term)
    query = query.or(ilikeAny(["email", "full_name", "department"], term));
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);
  const rows = data ?? [];
  const more = rows.length > PAGE_SIZE;

  const ids = rows.map((r) => r.id as string);
  const { data: roleRows } = ids.length
    ? await db.from("user_roles").select("user_id, role").in("user_id", ids)
    : { data: [] };
  const roles = new Map<string, Role[]>();
  for (const r of roleRows ?? [])
    roles.set(r.user_id as string, [
      ...(roles.get(r.user_id as string) ?? []),
      r.role as Role,
    ]);
  const superAdmin = hasAny(viewer.roles, SUPER);

  return (
    <>
      <AdminHeader
        title="Members"
        description="Everyone who has signed in to NEXUS. Profiles are filled in by the members themselves on their dashboard."
        actions={
          <>
            <DownloadLink href="/admin/api/export/members" />
            {superAdmin && (
              <Link
                href="/admin/roles"
                className={buttonClasses({ size: "sm" })}
              >
                Manage roles
              </Link>
            )}
          </>
        }
      />
      <Panel>
        <ListFilter q={q} />
        {error ? (
          <LoadError />
        ) : rows.length === 0 ? (
          <EmptyState
            title={q ? "Nothing matches" : "No members yet"}
            description={
              q
                ? "Try a different name or email."
                : "Accounts appear here after their first sign-in."
            }
          />
        ) : (
          <>
            <Table
              caption="Members"
              head={["Name", "Email", "Department", "Roles", "Joined"]}
            >
              {rows.slice(0, PAGE_SIZE).map((p) => {
                const mine = (roles.get(p.id as string) ?? []).filter(
                  (r) => r !== "member",
                );
                return (
                  <tr key={p.id as string}>
                    <td className={`${td} text-ice`}>
                      {(p.full_name as string) || (
                        <span className="text-dim">Not given</span>
                      )}
                    </td>
                    <td className={`${td} break-all`}>{p.email as string}</td>
                    <td className={td}>
                      <Cell
                        value={[p.department, p.year_of_study]
                          .filter(Boolean)
                          .join(" · ")}
                      />
                    </td>
                    <td className={td}>
                      {mine.length ? (
                        <span className="flex flex-wrap gap-1">
                          {mine.map((r) => (
                            <Badge
                              key={r}
                              tone={r === "super_admin" ? "gold" : "cyan"}
                            >
                              {ROLE_LABEL[r]}
                            </Badge>
                          ))}
                        </span>
                      ) : (
                        <span className="text-dim">Member</span>
                      )}
                    </td>
                    <td className={td}>
                      <Cell value={p.created_at} kind="date" />
                    </td>
                  </tr>
                );
              })}
            </Table>
            <Pager
              page={page}
              more={more}
              path="/admin/members"
              params={kept({ q })}
            />
          </>
        )}
      </Panel>
    </>
  );
}
