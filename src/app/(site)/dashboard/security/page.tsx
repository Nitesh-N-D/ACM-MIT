import { TotpChallenge, TotpRemove, TotpSetup } from "@/components/forms/AccountForms";
import { PageHeader } from "@/components/sections/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Container } from "@/components/ui/Container";
import { Notice } from "@/components/ui/States";
import { requireViewer } from "@/lib/auth/session";
import { pageMetadata } from "@/lib/seo";
import { formatDate, safeNext } from "@/lib/validate";

export const metadata = pageMetadata({ title: "Security", description: "Two-factor authentication for your NEXUS account.", path: "/dashboard/security", noIndex: true });

type Props = { searchParams: Promise<{ next?: string | string[] }> };

export default async function Page({ searchParams }: Props) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? safeNext(sp.next) : undefined;
  const { db } = await requireViewer(`/dashboard/security${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  const [{ data: factors, error }, { data: level }] = await Promise.all([db.auth.mfa.listFactors(), db.auth.mfa.getAuthenticatorAssuranceLevel()]);
  const totp = factors?.totp?.[0];
  const stepped = level?.currentLevel === "aal2";

  return (
    <>
      <PageHeader
        eyebrow="Members"
        title="Security"
        description="Protect your account with a code from an authenticator app. Required for the command centre when the chapter turns it on."
        breadcrumbs={[{ label: "NEXUS", href: "/" }, { label: "Dashboard", href: "/dashboard" }, { label: "Security" }]}
      />
      <Container className="py-12 sm:py-16">
        <div className="nexus-frame max-w-2xl space-y-6 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg text-ice">Two-factor authentication</h2>
            <Badge tone={totp ? "success" : "neutral"}>{totp ? "On" : "Off"}</Badge>
          </div>
          {error && <Notice tone="danger">Your security settings could not be loaded just now. Reload the page to try again.</Notice>}
          {next && !stepped && totp && <Notice tone="info">Enter a code from your authenticator app to continue.</Notice>}
          {next && !totp && <Notice tone="warning">The page you asked for needs two-factor authentication. Set it up below, then verify a code.</Notice>}

          {!totp ? (
            !error && <TotpSetup next={next} />
          ) : stepped ? (
            <div className="space-y-4">
              <p className="text-silver">An authenticator app is protecting this account (added {formatDate(totp.created_at)}). This session is verified.</p>
              <TotpRemove factorId={totp.id} />
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-silver">Verify a current code to secure this session{next ? " and continue" : ""}.</p>
              <TotpChallenge factorId={totp.id} next={next} />
            </div>
          )}
        </div>
      </Container>
    </>
  );
}
