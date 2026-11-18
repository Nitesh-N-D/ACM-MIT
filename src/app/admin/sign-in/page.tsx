import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminSignInForm } from "@/components/forms/AccountForms";
import { Notice } from "@/components/ui/States";
import { adminAccess } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata = { title: "Sign in" };

/** The command centre's door: the chapter's administrator account only. */
export default async function Page() {
  const configured = isSupabaseConfigured();
  if (configured && (await adminAccess()).ok) redirect("/admin");

  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-dim">NEXUS command centre</p>
      <h1 className="mt-4 font-display text-2xl text-ice sm:text-3xl">Administrator sign-in</h1>
      <p className="mt-4 leading-relaxed text-muted">
        For the chapter&rsquo;s administrators only. Members sign in from{" "}
        <Link href="/sign-in" className="text-silver underline underline-offset-4 hover:text-ice">
          the members&rsquo; page
        </Link>
        .
      </p>
      <div className="nexus-frame mt-8 p-6 sm:p-8">
        {configured ? (
          <AdminSignInForm />
        ) : (
          <Notice tone="info">The command centre opens once the chapter&rsquo;s database is connected (see .env.example).</Notice>
        )}
      </div>
      <p className="mt-6 text-sm text-muted">
        Other staff with a role can also use a{" "}
        <Link href="/sign-in?next=/admin" className="text-silver underline underline-offset-4 hover:text-ice">
          one-time email link
        </Link>
        .{" "}
        <Link href="/" className="text-silver underline underline-offset-4 hover:text-ice">
          Back to NEXUS
        </Link>
      </p>
    </main>
  );
}
