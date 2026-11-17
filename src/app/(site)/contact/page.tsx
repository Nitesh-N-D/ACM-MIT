import { DistrictPage, DistrictSection } from "@/components/district/District";
import { ContactForm } from "@/components/forms/PublicForms";
import { Notice } from "@/components/ui/States";
import { site } from "@/config/site";
import { getTerritory } from "@/config/territories";
import { getViewer } from "@/lib/auth/session";
import { getSettings } from "@/lib/data/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Contact",
  description: `Reach the ${site.chapter.fullName} at ${site.chapter.institution}: e-mail, social channels and a contact form.`,
  path: "/contact",
});

const accent = getTerritory("core").accent;

export default async function Page() {
  const [settings, session] = await Promise.all([getSettings(), getViewer()]);
  const email = settings.site.contactEmail || site.chapter.email;
  const channels = [
    { label: "E-mail", value: email, href: `mailto:${email}` },
    ...site.socials.map((s) => ({ label: s.label, value: s.handle, href: s.href })),
    { label: "Institution", value: `${site.chapter.institution}, ${site.chapter.university}`, href: site.chapter.institutionUrl },
  ];

  return (
    <DistrictPage
      id="core"
      title="Contact"
      copy={{ description: "Questions, collaborations, sponsorships or a talk you would like to give — the team reads every message." }}
      crumbs={[{ label: "About", href: "/about" }]}
    >
      <div className="grid gap-12 lg:grid-cols-[1fr_22rem]">
        <DistrictSection id="contact-form" eyebrow="Signal" title="Send a message">
          {!isSupabaseConfigured() && (
            <Notice tone="warning" title="Form offline" className="mb-6 max-w-xl">
              The website&apos;s database is not connected yet, so messages cannot be sent from here. Please use the e-mail address beside this form.
            </Notice>
          )}
          <ContactForm name={session?.viewer.fullName} email={session?.viewer.email} />
        </DistrictSection>

        <DistrictSection id="contact-channels" eyebrow="Channels" title="Other ways to reach us">
          <ul className="space-y-3">
            {channels.map((c) => (
              <li key={c.label}>
                <a
                  href={c.href}
                  {...(c.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="nexus-frame block p-4 transition-colors hover:border-line-strong"
                >
                  <span className="block font-mono text-[0.62rem] tracking-[0.2em] uppercase" style={{ color: accent }}>
                    {c.label}
                  </span>
                  <span className="mt-1 block break-words text-ice">{c.value}</span>
                </a>
              </li>
            ))}
            {settings.site.address && (
              <li className="nexus-frame p-4">
                <span className="block font-mono text-[0.62rem] tracking-[0.2em] uppercase" style={{ color: accent }}>
                  Address
                </span>
                <address className="mt-1 text-sm leading-relaxed whitespace-pre-line text-silver not-italic">{settings.site.address}</address>
              </li>
            )}
          </ul>
        </DistrictSection>
      </div>
    </DistrictPage>
  );
}
