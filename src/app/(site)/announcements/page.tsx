import { AnnouncementItem } from "@/components/content/Cards";
import { DistrictPage, DistrictSection, SourceNotice } from "@/components/district/District";
import { EmptyState } from "@/components/ui/States";
import { getSettings, listAnnouncements } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata = pageMetadata({
  title: "Announcements",
  description: "The latest news and updates from the ACM MIT Campus Student Chapter.",
  path: "/announcements",
});

export default async function Page() {
  const [settings, announcements] = await Promise.all([getSettings(), listAnnouncements()]);
  const pinned = announcements.items.filter((a) => a.pinned);
  const rest = announcements.items.filter((a) => !a.pinned);

  return (
    <DistrictPage
      id="core"
      title="Announcements"
      copy={{ ...settings.districts.core, description: "Transmissions from the Central Core: news, calls for participation and updates from the chapter." }}
      crumbs={[{ label: "About", href: "/about" }]}
    >
      <SourceNotice source={announcements.source} what="announcements" />
      {announcements.items.length === 0 ? (
        announcements.source !== "error" && (
          <EmptyState title="No announcements yet" description="News from the chapter appears here as soon as the team publishes it from the admin centre." />
        )
      ) : (
        <>
          {pinned.length > 0 && (
            <DistrictSection id="pinned" eyebrow="Pinned" title="Important">
              <ul className="grid gap-4">
                {pinned.map((a) => (
                  <li key={a.id}>
                    <AnnouncementItem item={a} />
                  </li>
                ))}
              </ul>
            </DistrictSection>
          )}
          {rest.length > 0 && (
            <DistrictSection id="latest" eyebrow="Transmissions" title={pinned.length ? "Latest" : "All announcements"}>
              <ul className="grid gap-4">
                {rest.map((a) => (
                  <li key={a.id}>
                    <AnnouncementItem item={a} />
                  </li>
                ))}
              </ul>
            </DistrictSection>
          )}
        </>
      )}
    </DistrictPage>
  );
}
