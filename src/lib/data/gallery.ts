import "server-only";
import type { Photo } from "@/components/content/PhotoGrid";
import { mediaUrl } from "@/lib/supabase/env";
import { listAlbums, listEvents, listMedia } from "./public";
import type { AlbumRow, EventRow, MediaRow, Source } from "./types";

export type AlbumCard = { album: AlbumRow; cover: string | null; count: number };
export type EventSet = { event: EventRow; cover: string | null; count: number };

export function toPhoto(m: MediaRow): Photo | null {
  const src = mediaUrl(m.storage_path);
  return src ? { id: m.id, src, alt: m.alt || m.caption, caption: m.caption, width: m.width, height: m.height } : null;
}

const cover = (items: MediaRow[]) => {
  const first = items.find((m) => m.featured) ?? items[0];
  return first ? mediaUrl(first.storage_path) : null;
};

/** Published albums and per-event photograph sets, each with a cover and a count. Consent is enforced by the query and RLS. */
export async function galleryIndex(): Promise<{ source: Source; albums: AlbumCard[]; events: EventSet[] }> {
  const [albums, media, events] = await Promise.all([listAlbums(), listMedia(), listEvents()]);
  const source: Source = [albums, media].some((l) => l.source === "error") ? "error" : albums.source === "live" ? "live" : "sample";
  const inAlbum = (id: string) => media.items.filter((m) => m.album_id === id);
  return {
    source,
    albums: albums.items.map((album) => {
      const items = inAlbum(album.id);
      return { album, cover: cover(items), count: items.length };
    }),
    events: events.items
      .map((event) => {
        const items = media.items.filter((m) => m.event_id === event.id && !m.album_id);
        return { event, cover: cover(items), count: items.length };
      })
      .filter((s) => s.count > 0),
  };
}

export async function getAlbum(slug: string): Promise<{ source: Source; album: AlbumRow | null; photos: Photo[] }> {
  const [albums, media] = await Promise.all([listAlbums(), listMedia()]);
  const album = albums.items.find((a) => a.slug === slug) ?? null;
  if (!album) return { source: albums.source, album: null, photos: [] };
  const photos = media.items
    .filter((m) => m.album_id === album.id)
    .map(toPhoto)
    .filter((p): p is Photo => p !== null);
  return { source: albums.source, album, photos };
}
