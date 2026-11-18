import { revokeRole } from "@/app/actions/admin";
import { ConfirmAction, GrantRoleForm } from "@/components/admin/Controls";
import {
  AdminHeader,
  Cell,
  LoadError,
  Panel,
  Table,
  td,
} from "@/components/admin/Shell";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, Notice } from "@/components/ui/States";
import {
  ROLES,
  ROLE_LABEL,
  ROLE_SUMMARY,
  SUPER,
  type Role,
} from "@/lib/auth/roles";
import { adminAllowlist, requireAdmin } from "@/lib/auth/session";

export const metadata = { title: "Roles" };

const GRANTABLE = ROLES.filter((r) => r !== "member");

export default async function Page() {
  const { db, viewer } = await requireAdmin(SUPER);
  const { data, error } = await db
    .from("user_roles")
    .select("user_id, role, granted_at")
    .neq("role", "member")
    .order("granted_at", { ascending: false });
  const grants = data ?? [];
  const ids = [...new Set(grants.map((g) => g.user_id as string))];
  const { data: people } = ids.length
    ? await db.from("profiles").select("id, email, full_name").in("id", ids)
    : { data: [] };
  const byId = new Map((people ?? []).map((p) => [p.id as string, p]));
  const allowlisted = new Set(adminAllowlist());

  return (
    <>
      <AdminHeader
        title="Roles"
        description="Who can change what. Every role is checked again by the database, and each grant or removal is written to the activity log."
      />
      <Notice tone="info" className="mb-6">
        A role opens the command centre only for an account with a verified
        email (and two-step verification, when the server requires it). Accounts
        on the server&apos;s admin allowlist are made Super Admins
        automatically; that role is changed in the server settings, not here.
      </Notice>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Panel title="Staff accounts">
          {error ? (
            <LoadError />
          ) : grants.length === 0 ? (
            <EmptyState
              title="No staff roles yet"
              description="Grant the first role with the form beside this list."
            />
          ) : (
            <Table
              caption="Staff roles"
              head={[
                "Account",
                "Role",
                "Granted",
                <span key="a" className="sr-only">
                  Actions
                </span>,
              ]}
            >
              {grants.map((g) => {
                const p = byId.get(g.user_id as string);
                const role = g.role as Role;
                const self = g.user_id === viewer.id;
                const fixed =
                  role === "super_admin" &&
                  allowlisted.has(String(p?.email ?? "").toLowerCase());
                return (
                  <tr key={`${g.user_id}-${role}`}>
                    <td className={td}>
                      <p className="text-ice">
                        {(p?.full_name as string) ||
                          (p?.email as string) ||
                          "Unknown account"}
                      </p>
                      {p?.full_name ? (
                        <p className="text-xs break-all text-muted">
                          {p.email as string}
                        </p>
                      ) : null}
                    </td>
                    <td className={td}>
                      <Badge tone={role === "super_admin" ? "gold" : "cyan"}>
                        {ROLE_LABEL[role]}
                      </Badge>
                    </td>
                    <td className={td}>
                      <Cell value={g.granted_at} kind="date" />
                    </td>
                    <td className={`${td} text-right`}>
                      {self || fixed ? (
                        <span className="text-xs text-dim">
                          {self ? "You" : "Allowlisted"}
                        </span>
                      ) : (
                        <ConfirmAction
                          label="Remove"
                          variant="ghost"
                          title={`Remove ${ROLE_LABEL[role]}?`}
                          description={`${(p?.email as string) ?? "This account"} loses this role from their next page load.`}
                          confirm="Remove role"
                          action={revokeRole.bind(
                            null,
                            g.user_id as string,
                            role,
                          )}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </Table>
          )}
        </Panel>
        <div className="space-y-6">
          <Panel title="Grant a role">
            <GrantRoleForm
              roles={GRANTABLE.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
            />
          </Panel>
          <Panel title="What each role can do">
            <dl className="space-y-3 text-sm">
              {GRANTABLE.map((r) => (
                <div key={r}>
                  <dt className="text-ice">{ROLE_LABEL[r]}</dt>
                  <dd className="text-muted">{ROLE_SUMMARY[r]}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}
