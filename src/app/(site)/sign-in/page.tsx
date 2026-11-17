import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/forms/AccountForms";
import { PageHeader } from "@/components/sections/PageHeader";
import { Container } from "@/components/ui/Container";
import { Notice } from "@/components/ui/States";
import { site } from "@/config/site";
import { getViewer } from "@/lib/auth/session";
import { pageMetadata } from "@/lib/seo";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { safeNext } from "@/lib/validate";

export const metadata = pageMetadata({ title: "Sign in", description: "Sign in to NEXUS with a one-time link sent to your email.", path: "/sign-in", noIndex: true });

const ERRORS: Record<string, string> = {
  link: "That sign-in link has expired or was already used. Request a new one below.",
  device: "Open the sign-in link in the same browser you requested it from, or request a new one here.",
  offline: "Accounts are not available yet: the chapter's database is not connected.",
};

type Props = { searchParams: Promise<{ next?: string | string[]; error?: string | string[] }> };

export default async function Page({ searchParams }: Props) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null);
  const configured = isSupabaseConfigured();
  // Without a backend the offline notice below already says it.
  const error = typeof sp.error === "string" && configured ? ERRORS[sp.error] : undefined;
  if (await getViewer()) redirect(next);

  return (
    <>
      <PageHeader
        eyebrow="Members"
        title="Sign in"
        description="Register for events, submit projects and follow your applications. New here? The same link creates your account."
        breadcrumbs={[{ label: "NEXUS", href: "/" }, { label: "Sign in" }]}
      />
      <Container className="py-12 sm:py-16">
        <div className="max-w-lg">
          {error && (
            <Notice tone="warning" className="mb-6">
              {error}
            </Notice>
          )}
          {configured ? (
            <div className="nexus-frame p-6 sm:p-8">
              <SignInForm next={next} />
            </div>
          ) : (
            <Notice tone="info">
              Member accounts open once the chapter connects its database. Meanwhile, write to <a href={`mailto:${site.chapter.email}`}>{site.chapter.email}</a>.
            </Notice>
          )}
          <p className="mt-6 text-sm text-muted">
            By signing in you agree to the{" "}
            <Link href="/terms" className="text-silver underline underline-offset-4 hover:text-ice">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-silver underline underline-offset-4 hover:text-ice">
              privacy policy
            </Link>
            . Admin access is granted by the chapter, never through sign-up.
          </p>
        </div>
      </Container>
    </>
  );
}
