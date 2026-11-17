import { DistrictPage, DistrictSection } from "@/components/district/District";
import { MembershipForm } from "@/components/forms/PublicForms";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/States";
import { site } from "@/config/site";
import { getTerritory } from "@/config/territories";
import { getViewer } from "@/lib/auth/session";
import { getSettings } from "@/lib/data/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Membership",
  description: `How to join the ${site.chapter.fullName} and become part of NEXUS.`,
  path: "/membership",
});

const accent = getTerritory("core").accent;

/** What a member account does on this website — features that exist here, nothing promised beyond them. */
const PERKS = [
  { title: "Register for events", text: "One click to register for hackathons, workshops and talks, and see your registrations in one place." },
  { title: "Submit your projects", text: "Send your work to the Innovation Vault; the chapter reviews it and publishes it with your team's name." },
  { title: "Follow the chapter", text: "Announcements, learning paths and workshop resources curated by the team." },
];

const STEPS = ["Create a member account with your e-mail (no password needed).", "Send the application below.", "The chapter reviews it and replies by e-mail."];

export default async function Page() {
  const [settings, session] = await Promise.all([getSettings(), getViewer()]);
  const open = settings.site.membershipOpen !== false;
  const v = session?.viewer;

  return (
    <DistrictPage
      id="core"
      title="Membership"
      copy={{ description: "Join the ACM MIT Campus Student Chapter and become a citizen of NEXUS." }}
      crumbs={[{ label: "About", href: "/about" }]}
      actions={
        v ? (
          <Button href="/dashboard" variant="secondary">
            Your dashboard
          </Button>
        ) : (
          <Button href="/sign-in?next=/membership" variant="secondary">
            Sign in or create an account
          </Button>
        )
      }
    >
      {settings.site.membershipInfo && <p className="mb-12 max-w-3xl text-lg leading-relaxed whitespace-pre-line text-silver">{settings.site.membershipInfo}</p>}

      <DistrictSection id="membership-perks" eyebrow="Citizenship" title="What members can do here">
        <ul className="grid gap-4 md:grid-cols-3">
          {PERKS.map((p) => (
            <li key={p.title} className="nexus-frame p-5">
              <h3 className="font-display text-ice">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{p.text}</p>
            </li>
          ))}
        </ul>
      </DistrictSection>

      <div className="mt-14 grid gap-12 lg:grid-cols-[18rem_1fr]">
        <DistrictSection id="membership-steps" eyebrow="How it works" title="Three steps">
          <ol className="space-y-4">
            {STEPS.map((s, i) => (
              <li key={s} className="flex gap-4">
                <span className="font-mono text-sm" style={{ color: accent }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-sm leading-relaxed text-silver">{s}</span>
              </li>
            ))}
          </ol>
        </DistrictSection>

        <DistrictSection id="membership-apply" eyebrow="Apply" title="Membership application">
          {!open ? (
            <Notice tone="info" title="Applications closed" className="max-w-xl">
              The chapter is not accepting membership applications right now. Follow the announcements to hear when they reopen.
            </Notice>
          ) : (
            <>
              {!isSupabaseConfigured() && (
                <Notice tone="warning" title="Form offline" className="mb-6 max-w-xl">
                  The website&apos;s database is not connected yet, so applications cannot be sent from here. Please write to{" "}
                  {settings.site.contactEmail || site.chapter.email}.
                </Notice>
              )}
              <MembershipForm name={v?.fullName} email={v?.email} />
            </>
          )}
        </DistrictSection>
      </div>
    </DistrictPage>
  );
}
