import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import type { AdminDenial } from "@/lib/auth/session";

export const metadata = { title: "No access" };

const REASONS: Record<AdminDenial, { title: string; body: string; steps?: string[] }> = {
  "not-configured": {
    title: "The database is not connected",
    body: "The command centre needs the chapter's Supabase project. Until it is connected nobody can sign in here, which keeps it closed.",
    steps: [
      "Create a Supabase project and run the SQL files in supabase/migrations, in order.",
      "Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY on the server (see .env.example).",
      "Set ADMIN_EMAILS to the Super Admin's email, then restart the site.",
    ],
  },
  "no-allowlist": {
    title: "No administrators are configured",
    body: "ADMIN_EMAILS is empty, so the command centre stays closed to everyone.",
    steps: ["Set ADMIN_EMAILS on the server to the Super Admin's email (comma-separated for several), then restart the site."],
  },
  "signed-out": { title: "Please sign in", body: "Sign in with your chapter account to open the command centre." },
  unverified: {
    title: "Confirm your email first",
    body: "Your account's email address has not been confirmed. Open the confirmation link sent when you created the account, then sign in again.",
  },
  forbidden: {
    title: "Your account has no command-centre role",
    body: "This page needs a role your account does not have. A Super Admin can grant one from Roles.",
  },
  mfa: {
    title: "Two-step verification required",
    body: "The chapter requires a second factor for the command centre. Set it up, or verify with it, from your account's security page.",
  },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  const r = REASONS[(reason ?? "forbidden") as AdminDenial] ?? REASONS.forbidden;
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-16 sm:px-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-dim">NEXUS command centre</p>
      <h1 className="mt-4 font-display text-2xl text-ice sm:text-3xl">{r.title}</h1>
      <p className="mt-4 leading-relaxed text-muted">{r.body}</p>
      {r.steps && (
        <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm text-silver">
          {r.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        {reason === "signed-out" && (
          <Link className={buttonClasses()} href="/sign-in?next=/admin">
            Sign in
          </Link>
        )}
        {reason === "mfa" && (
          <Link className={buttonClasses()} href="/dashboard/security?next=/admin">
            Security settings
          </Link>
        )}
        <Link className={buttonClasses({ variant: "secondary" })} href="/dashboard">
          Your dashboard
        </Link>
        <Link className={buttonClasses({ variant: "ghost" })} href="/">
          Back to NEXUS
        </Link>
      </div>
    </main>
  );
}
