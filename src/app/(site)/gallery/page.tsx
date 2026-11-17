import Image from "next/image";
import Link from "next/link";
import { CardGrid } from "@/components/content/Cards";
import { DistrictPage, DistrictSection, SourceNotice } from "@/components/district/District";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { getTerritory } from "@/config/territories";
import { galleryIndex } from "@/lib/data/gallery";
import { getSettings } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/validate";

export const revalidate = 300;

export const metadata = pageMetadata({
  title: "Gallery",
  description: "Photographs from the events and activities of the ACM MIT Campus Student Chapter.",
  path: "/gallery",
});

const accent = getTerritory("sanctuary").accent;

function Tile({ href, title, meta, cover, count }: { href: string; title: string; meta?: string; cover: string | null; count: number }) {
  return (
    <Card accent={accent} interactive className="h-full">
      <Link href={href} className="flex h-full flex-col focus-visible:outline-offset-[-4px]">
        {cover ? (
          <Image src={cover} alt="" width={640} height={420} unoptimized className="aspect-[3/2] w-full border-b border-line object-cover" />
        ) : (
          <div
            aria-hidden="true"
            className="grid aspect-[3/2] place-items-center border-b border-line bg-deep/60 font-mono text-[0.6rem] tracking-[0.2em] text-dim uppercase"
          >
            No photographs yet
          </div>
        )}
        <div className="flex flex-1 flex-col p-5">
          <h3 className="font-display text-lg text-ice">{title}</h3>
          {meta && <p className="mt-1 text-sm text-muted">{meta}</p>}
          <p className="mt-auto pt-4 font-mono text-[0.64rem] tracking-[0.18em] uppercase" style={{ color: accent }}>
            {count} {count === 1 ? "photograph" : "photographs"} →
          </p>
        </div>
      </Link>
    </Card>
  );
}

export default async function Page() {
  const [settings, gallery] = await Promise.all([getSettings(), galleryIndex()]);
  const empty = gallery.albums.length === 0 && gallery.events.length === 0;

  return (
    <DistrictPage
      id="sanctuary"
      title="Gallery"
      copy={{ ...settings.districts.sanctuary, description: "Moments captured across the chapter's events and activities." }}
      crumbs={[{ label: "Team", href: "/team" }]}
    >
      {gallery.source === "error" && <SourceNotice source="error" what="photographs" />}
      {empty ? (
        gallery.source !== "error" && (
          <EmptyState
            title="The gallery is being curated"
            description="Photographs are published only after the chapter has confirmed permission from the people in them, so albums appear here as consent is recorded."
          />
        )
      ) : (
        <>
          {gallery.albums.length > 0 && (
            <DistrictSection id="albums" eyebrow="Archive" title="Albums">
              <CardGrid>
                {gallery.albums.map(({ album, cover, count }) => (
                  <li key={album.id}>
                    <Tile href={`/gallery/${album.slug}`} title={album.title} meta={album.description.slice(0, 140)} cover={cover} count={count} />
                  </li>
                ))}
              </CardGrid>
            </DistrictSection>
          )}
          {gallery.events.length > 0 && (
            <DistrictSection id="event-photos" eyebrow="Event Colosseum" title="From the events">
              <CardGrid>
                {gallery.events.map(({ event, cover, count }) => (
                  <li key={event.id}>
                    <Tile href={`/events/${event.slug}#photographs`} title={event.title} meta={formatDate(event.starts_at)} cover={cover} count={count} />
                  </li>
                ))}
              </CardGrid>
            </DistrictSection>
          )}
        </>
      )}
    </DistrictPage>
  );
}
