import Link from "next/link";
import { LegalPage } from "@/components/sections/LegalPage";
import { site } from "@/config/site";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Terms of use",
  description: "The terms for using NEXUS, the website of the ACM MIT Campus Student Chapter.",
  path: "/terms",
});

const mail = site.chapter.email;

export default function Page() {
  return (
    <LegalPage
      title="Terms of use"
      description="The ground rules for using NEXUS, registering for events and submitting content."
      sections={[
        {
          id: "about",
          title: "About these terms",
          body: (
            <p>
              NEXUS is the website of the {site.chapter.fullName}, {site.chapter.institution}. By using it you agree to these terms. ACM and the ACM logo belong to the
              Association for Computing Machinery; the chapter uses them as a student chapter.
            </p>
          ),
        },
        {
          id: "accounts",
          title: "Accounts",
          body: (
            <ul>
              <li>Use your own email address and keep access to it secure: sign-in links are sent there.</li>
              <li>Keep your profile accurate. One account per person.</li>
              <li>Admin access is granted by the chapter, never through sign-up.</li>
            </ul>
          ),
        },
        {
          id: "events",
          title: "Event registrations",
          body: (
            <p>
              Registering reserves a place when one is available; full events may place you on a waiting list. Cancel if you cannot attend so the place can go to someone
              else. Organisers may change or cancel events, and will say so on the event page.
            </p>
          ),
        },
        {
          id: "content",
          title: "Things you submit",
          body: (
            <>
              <p>When you submit a project, application or message:</p>
              <ul>
                <li>it must be your own work, or work you have the right to share, with the team credited;</li>
                <li>it must not be unlawful, abusive, misleading or contain other people&apos;s personal information without their permission;</li>
                <li>you allow the chapter to review it and, if approved, display it on NEXUS with credit. You keep ownership.</li>
              </ul>
              <p>The chapter may decline, edit for length or remove submissions that do not meet these terms.</p>
            </>
          ),
        },
        {
          id: "conduct",
          title: "Acceptable use",
          body: (
            <p>
              Do not attempt to break, overload or gain unauthorised access to NEXUS, its accounts or its data, and do not use automated tools to submit forms. Report
              security problems to <a href={`mailto:${mail}`}>{mail}</a>.
            </p>
          ),
        },
        {
          id: "liability",
          title: "No warranty",
          body: (
            <p>
              NEXUS is run by student volunteers and provided as it is. Event details can change; the event page is the up-to-date source. The chapter is not responsible
              for external sites linked from NEXUS.
            </p>
          ),
        },
        {
          id: "privacy",
          title: "Privacy",
          body: (
            <p>
              How information is handled is described in the <Link href="/privacy">privacy policy</Link>.
            </p>
          ),
        },
        {
          id: "contact",
          title: "Contact",
          body: (
            <p>
              Questions about these terms: <a href={`mailto:${mail}`}>{mail}</a>.
            </p>
          ),
        },
      ]}
    />
  );
}
