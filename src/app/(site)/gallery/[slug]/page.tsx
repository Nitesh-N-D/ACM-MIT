import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PhotoGrid } from "@/components/content/PhotoGrid";
import { DistrictPage, DistrictSection, SourceNotice } from "@/components/district/District";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { getAlbum } from "@/lib/data/gallery";
import { listEvents } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { album } = await getAlbum(slug);
  if (!album) return { title: "Album not found", robots: { index: false } };
  return pageMetadata({
    title: album.title,
    description: album.description.slice(0, 160) || "A photograph album of the ACM MIT Campus Student Chapter.",
    path: `/gallery/${album.slug}`,
  });
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const { source, album, photos } = await getAlbum(slug);
  if (!album) {
    if (source === "error") return <SourceNotice source="error" what="album" />;
    notFound();
  }
  const event = album.event_id ? (await listEvents()).items.find((e) => e.id === album.event_id) : undefined;

  return (
    <DistrictPage
      id="sanctuary"
      title={album.title}
      copy={{ description: album.description || "A photograph album of the chapter." }}
      crumbs={[{ label: "Gallery", href: "/gallery" }]}
      actions={
        event ? (
          <Button href={`/events/${event.slug}`} variant="secondary">
            About the event: {event.title}
          </Button>
        ) : undefined
      }
    >
      <DistrictSection id="album-photos" eyebrow="Album" title={`${photos.length} ${photos.length === 1 ? "photograph" : "photographs"}`}>
        {photos.length === 0 ? (
          <EmptyState
            title="No photographs published in this album yet"
            description="Photographs appear once the chapter has confirmed permission from the people in them."
          />
        ) : (
          <PhotoGrid photos={photos} label={`Photographs in ${album.title}`} />
        )}
      </DistrictSection>
      <Button href="/gallery" variant="ghost" size="sm" className="mt-8">
        ← All albums
      </Button>
    </DistrictPage>
  );
}
