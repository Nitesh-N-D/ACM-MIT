import { LegalPage } from "@/components/sections/LegalPage";
import { site } from "@/config/site";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Privacy",
  description: "What NEXUS collects, why, where it is kept and how to ask for it to be changed or removed.",
  path: "/privacy",
});

const mail = site.chapter.email;

export default function Page() {
  return (
    <LegalPage
      title="Privacy"
      description={`How the ${site.chapter.fullName} handles information on NEXUS. In short: only what a form or account needs, never sold, never used for advertising.`}
      sections={[
        {
          id: "who",
          title: "Who is responsible",
          body: (
            <p>
              NEXUS is run by the {site.chapter.fullName}, {site.chapter.institution}. Questions about your information go to <a href={`mailto:${mail}`}>{mail}</a>.
            </p>
          ),
        },
        {
          id: "collect",
          title: "What is collected",
          body: (
            <>
              <p>Only what you send through a form or your account:</p>
              <ul>
                <li>
                  <strong>Account:</strong> your email address (used to send sign-in links) and, if you add them, your name, department, year of study and a short bio.
                </li>
                <li>
                  <strong>Event registrations:</strong> which events you registered for and the registration status.
                </li>
                <li>
                  <strong>Membership applications:</strong> the details you enter on the membership form.
                </li>
                <li>
                  <strong>Project submissions:</strong> the project details you submit for review.
                </li>
                <li>
                  <strong>Contact messages:</strong> your name, email address and message.
                </li>
              </ul>
              <p>NEXUS does not use analytics, advertising or tracking scripts.</p>
            </>
          ),
        },
        {
          id: "use",
          title: "How it is used",
          body: (
            <p>
              To run your account, manage event places, review applications and submissions, and reply to messages. Chapter office bearers with an admin role can see what
              is needed for those tasks. Your information is not sold or shared with third parties for marketing.
            </p>
          ),
        },
        {
          id: "storage",
          title: "Cookies and local storage",
          body: (
            <>
              <p>NEXUS uses a small number of strictly necessary items, and none for tracking:</p>
              <ul>
                <li>
                  <strong>Sign-in cookies</strong> (set by Supabase, only when you sign in) keep you signed in.
                </li>
                <li>
                  <strong>nexus-view</strong> cookie remembers whether you chose the 3D world or the 2D site.
                </li>
                <li>
                  <strong>Local storage</strong> remembers your sound, motion and graphics-quality preferences, and whether you have seen the introduction. It never
                  leaves your browser.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "photos",
          title: "Photographs of people",
          body: (
            <p>
              Photographs that show people are published only after the chapter has recorded their permission. If you appear in a photograph and want it removed, write to{" "}
              <a href={`mailto:${mail}`}>{mail}</a> and it will be taken down.
            </p>
          ),
        },
        {
          id: "where",
          title: "Where it is kept",
          body: (
            <p>
              Data is stored with Supabase, the hosted database and authentication service NEXUS is built on. Access is restricted by row-level security rules so members
              can only read their own records.
            </p>
          ),
        },
        {
          id: "rights",
          title: "Your choices",
          body: (
            <p>
              You can edit your profile from your dashboard at any time. To get a copy of your information, correct it, or delete your account and its records, write to{" "}
              <a href={`mailto:${mail}`}>{mail}</a> from the address on your account.
            </p>
          ),
        },
        {
          id: "changes",
          title: "Changes",
          body: <p>If this policy changes, the date at the top of the page is updated.</p>,
        },
      ]}
    />
  );
}
