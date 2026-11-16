import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient, type Db } from "@/lib/supabase/server";
import { ROLES, STAFF, hasAny, type Role } from "./roles";

export type Viewer = {
  id: string;
  email: string;
  emailVerified: boolean;
  roles: Role[];
  fullName: string;
};

/** Allowlist of Super Admin e-mails. Server-side only; never sent to the browser. */
export function adminAllowlist(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
}

async function readRoles(db: Db, userId: string): Promise<Role[]> {
  const { data } = await db.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r) => r.role as Role).filter((r) => ROLES.includes(r));
}

/**
 * The signed-in visitor, verified with the auth server on every request
 * (never trusted from the cookie alone), with roles read from the database.
 */
export const getViewer = cache(async (): Promise<{ viewer: Viewer; db: Db } | null> => {
  const db = await createClient();
  if (!db) return null;
  const { data, error } = await db.auth.getUser();
  const user = data?.user;
  if (error || !user?.email) return null;

  const emailVerified = Boolean(user.email_confirmed_at);
  let roles = await readRoles(db, user.id);

  // Secure first-admin provisioning: a verified, allowlisted e-mail is given
  // the Super Admin role by the server. Nothing the visitor submits can
  // influence this.
  if (emailVerified && !roles.includes("super_admin") && adminAllowlist().includes(user.email.toLowerCase())) {
    const service = createServiceClient();
    if (service) {
      const { error: grantError } = await service.from("user_roles").upsert({ user_id: user.id, role: "super_admin" }, { onConflict: "user_id,role" });
      if (!grantError) roles = [...roles, "super_admin"];
    }
  }

  const { data: profile } = await db.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  return { viewer: { id: user.id, email: user.email, emailVerified, roles, fullName: (profile?.full_name as string | undefined) ?? "" }, db };
});

/** Members-only pages. */
export async function requireViewer(next: string) {
  const session = await getViewer();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return session;
}

export type AdminDenial = "not-configured" | "no-allowlist" | "signed-out" | "unverified" | "forbidden" | "mfa";

/**
 * The single gate for everything under /admin. Access needs all of:
 * a configured allowlist, a signed-in account, a verified e-mail, a staff
 * role stored in the database and, when enabled, a second factor.
 * Row Level Security enforces the same roles again inside the database.
 */
export async function adminAccess(allowed: readonly Role[] = STAFF): Promise<{ ok: true; viewer: Viewer; db: Db } | { ok: false; reason: AdminDenial }> {
  const db = await createClient();
  if (!db) return { ok: false, reason: "not-configured" };
  if (adminAllowlist().length === 0) return { ok: false, reason: "no-allowlist" };
  const session = await getViewer();
  if (!session) return { ok: false, reason: "signed-out" };
  if (!session.viewer.emailVerified) return { ok: false, reason: "unverified" };
  if (!hasAny(session.viewer.roles, STAFF) || !hasAny(session.viewer.roles, allowed)) return { ok: false, reason: "forbidden" };
  if (process.env.ADMIN_REQUIRE_MFA === "true") {
    const { data } = await session.db.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data?.currentLevel !== "aal2") return { ok: false, reason: "mfa" };
  }
  return { ok: true, viewer: session.viewer, db: session.db };
}

/** For admin pages: returns the session or sends the visitor to the right place. */
export async function requireAdmin(allowed: readonly Role[] = STAFF) {
  const access = await adminAccess(allowed);
  if (access.ok) return access;
  if (access.reason === "signed-out") redirect("/sign-in?next=/admin");
  if (access.reason === "mfa") redirect("/dashboard/security?next=/admin");
  redirect(`/admin/denied?reason=${access.reason}`);
}

/** For server actions and route handlers: throws instead of redirecting. */
export async function assertAdmin(allowed: readonly Role[] = STAFF) {
  const access = await adminAccess(allowed);
  if (!access.ok) throw new Error("Not authorised");
  return access;
}
