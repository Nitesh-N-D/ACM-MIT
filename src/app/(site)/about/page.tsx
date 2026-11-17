import Link from "next/link";
import { AnnouncementItem } from "@/components/content/Cards";
import { DistrictPage, DistrictSection, SourceNotice } from "@/components/district/District";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { site } from "@/config/site";
import { getTerritory } from "@/config/territories";
import { getSettings, listAnnouncements } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata = pageMetadata({
  title: "About ACM MIT",
  description: `The ${site.chapter.fullName} at ${site.chapter.institution}, ${site.chapter.university}: who we are, our mission, and the latest from the chapter.`,
  path: "/about",
});

const PATHS = [
  { href: "/heritage", label: "Heritage Archive", text: "The history of ACM, ACM India and the chapter, every exhibit sourced." },
  { href: "/events", label: "Events", text: "Hackathons, workshops, talks and competitions." },
  { href: "/team", label: "Team", text: "The committee and the people who run the chapter." },
  { href: "/membership", label: "Membership", text: "How to join and what members can do." },
];

export default async function Page() {
  const [settings, announcements] = await Promise.all([getSettings(), listAnnouncements()]);
  const copy = settings.districts.core;
  const accent = getTerritory("core").accent;
  const facts = [
    { k: "Chapter", v: site.chapter.fullName },
    { k: "Institution", v: site.chapter.institution, href: site.chapter.institutionUrl },
    { k: "University", v: site.chapter.university },
    { k: "Parent body", v: "ACM — Association for Computing Machinery", href: "https://www.acm.org/" },
    { k: "Contact", v: settings.site.contactEmail || site.chapter.email, href: `mailto:${settings.site.contactEmail || site.chapter.email}` },
  ];

  return (
    <DistrictPage
      id="core"
      title="About ACM MIT"
      copy={copy}
      actions={
        <>
          <Button href="/membership">Join the chapter</Button>
          <Button href="/contact" variant="secondary">
            Contact us
          </Button>
        </>
      }
    >
      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-10">
          {(copy?.mission || copy?.vision) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {copy.mission && (
                <section aria-labelledby="mission" className="nexus-frame p-6">
                  <h2 id="mission" className="eyebrow" style={{ color: accent }}>
                    Mission
                  </h2>
                  <p className="mt-3 leading-relaxed whitespace-pre-line text-silver">{copy.mission}</p>
                </section>
              )}
              {copy.vision && (
                <section aria-labelledby="vision" className="nexus-frame p-6">
                  <h2 id="vision" className="eyebrow" style={{ color: accent }}>
                    Vision
                  </h2>
                  <p className="mt-3 leading-relaxed whitespace-pre-line text-silver">{copy.vision}</p>
                </section>
              )}
            </div>
          )}

          <section aria-labelledby="who" className="max-w-2xl">
            <h2 id="who" className="font-display text-2xl text-ice">
              Who we are
            </h2>
            <p className="mt-4 leading-relaxed text-silver">
              ACM MIT is the {site.chapter.fullName} of the {site.chapter.institution}, {site.chapter.university}. It is a student chapter of ACM, the Association for
              Computing Machinery — the world&apos;s largest educational and scientific computing society.
            </p>
            <p className="mt-4 leading-relaxed text-muted">
              NEXUS is the chapter&apos;s website. Each of its six districts holds one part of chapter life — events, projects, learning and people — and every page is
              also reachable without the 3D world.
            </p>
          </section>
        </div>

        <aside aria-label="Chapter facts" className="nexus-frame self-start p-6">
          <dl className="space-y-4">
            {facts.map((f) => (
              <div key={f.k}>
                <dt className="font-mono text-[0.62rem] tracking-[0.2em] text-dim uppercase">{f.k}</dt>
                <dd className="mt-1 text-silver">
                  {f.href ? (
                    <a
                      href={f.href}
                      {...(f.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="break-words underline decoration-line-strong underline-offset-4 hover:text-ice"
                    >
                      {f.v}
                    </a>
                  ) : (
                    f.v
                  )}
                </dd>
              </div>
            ))}
            <div>
              <dt className="font-mono text-[0.62rem] tracking-[0.2em] text-dim uppercase">Channels</dt>
              <dd className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                {site.socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-silver underline decoration-line-strong underline-offset-4 hover:text-ice"
                  >
                    {s.label}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ))}
              </dd>
            </div>
          </dl>
        </aside>
      </div>

      <DistrictSection
        id="transmissions"
        eyebrow="Announcements"
        title="Latest transmissions"
        action={
          <Button href="/announcements" variant="ghost" size="sm">
            All announcements →
          </Button>
        }
      >
        <SourceNotice source={announcements.source} what="announcements" />
        {announcements.items.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {announcements.items.slice(0, 3).map((a) => (
              <AnnouncementItem key={a.id} item={a} />
            ))}
          </div>
        ) : (
          announcements.source === "live" && <EmptyState title="No announcements yet" description="News from the chapter is published here as it happens." />
        )}
      </DistrictSection>

      <DistrictSection id="paths" eyebrow="From the Core" title="Where to go next">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PATHS.map((p) => (
            <li key={p.href}>
              <Link href={p.href} className="nexus-frame block h-full p-5 transition-colors hover:border-line-strong">
                <span className="font-display text-ice">{p.label} →</span>
                <span className="mt-2 block text-sm leading-relaxed text-muted">{p.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </DistrictSection>
    </DistrictPage>
  );
}
