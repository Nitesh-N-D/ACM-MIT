import Image from "next/image";
import Link from "next/link";
import { MediaUploader } from "@/components/admin/MediaUploader";
import {
  AdminHeader,
  ListFilter,
  LoadError,
  Pager,
  Panel,
} from "@/components/admin/Shell";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, Notice } from "@/components/ui/States";
import { MEDIA_KIND_OPTIONS, mediaKindLabel } from "@/lib/admin/media";
import {
  PAGE_SIZE,
  ilikeAny,
  kept,
  pageOf,
  param,
  searchTerm,
} from "@/lib/admin/query";
import { isUuid, refOptions } from "@/lib/admin/server";
import { STAFF } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/session";
import { mediaUrl } from "@/lib/supabase/env";

export const metadata = { title: "Media library" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const CONSENT = [
  { value: "no", label: "Awaiting consent" },
  { value: "yes", label: "Published" },
];

const select = "h-10 border border-line-strong bg-abyss px-2 text-sm text-ice";

export default async function Page({ searchParams }: Props) {
  const { db } = await requireAdmin(STAFF);
  const sp = await searchParams;
  const q = param(sp, "q");
  const consent = param(sp, "consent");
  const kind = param(sp, "kind");
  const album = param(sp, "album");
  const { page, from, to } = pageOf(sp);

  let query = db
    .from("gallery_items")
    .select(
      "id, storage_path, kind, caption, alt, featured, consent_confirmed, width, height, album_id, created_at",
    );
  const term = searchTerm(q);
  if (term) query = query.or(ilikeAny(["caption", "alt", "description"], term));
  if (consent === "yes" || consent === "no")
    query = query.eq("consent_confirmed", consent === "yes");
  if (MEDIA_KIND_OPTIONS.some((o) => o.value === kind))
    query = query.eq("kind", kind);
  if (isUuid(album)) query = query.eq("album_id", album);
  const [{ data, error }, refs] = await Promise.all([
    query.order("created_at", { ascending: false }).range(from, to),
    refOptions(db),
  ]);
  const rows = data ?? [];
  const more = rows.length > PAGE_SIZE;
  const filtered = Boolean(q || consent || kind || album);

  return (
    <>
      <AdminHeader
        title="Media library"
        description="Every photograph, banner and poster the site uses. New uploads stay hidden from the public until you confirm that everyone in them agreed to be published."
      />
      {param(sp, "deleted") && (
        <Notice tone="success" className="mb-5">
          The image was deleted.
        </Notice>
      )}

      <Panel
        title="Upload"
        description="Drop several images at once. JPEG, PNG, WebP or AVIF, up to 5 MB each."
        className="mb-6"
      >
        <MediaUploader
          albums={refs.albums}
          events={refs.events}
          kinds={MEDIA_KIND_OPTIONS}
        />
      </Panel>

      <Panel title="Library">
        <ListFilter
          q={q}
          extra={
            <>
              <label className="flex flex-col gap-1.5 text-xs text-silver">
                <span className="font-mono tracking-[0.18em] uppercase">
                  Consent
                </span>
                <select
                  name="consent"
                  defaultValue={consent}
                  className={select}
                >
                  <option value="">All</option>
                  {CONSENT.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-silver">
                <span className="font-mono tracking-[0.18em] uppercase">
                  Kind
                </span>
                <select name="kind" defaultValue={kind} className={select}>
                  <option value="">All</option>
                  {MEDIA_KIND_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              {refs.albums.length > 0 && (
                <label className="flex flex-col gap-1.5 text-xs text-silver">
                  <span className="font-mono tracking-[0.18em] uppercase">
                    Album
                  </span>
                  <select
                    name="album"
                    defaultValue={album}
                    className={`${select} max-w-48`}
                  >
                    <option value="">All</option>
                    {refs.albums.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </>
          }
        />
        {error ? (
          <LoadError />
        ) : rows.length === 0 ? (
          <EmptyState
            title={filtered ? "Nothing matches" : "The library is empty"}
            description={
              filtered
                ? "Try a different search or clear the filters."
                : "Upload the first photographs above."
            }
          />
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              {rows.slice(0, PAGE_SIZE).map((m) => {
                const url = mediaUrl(m.storage_path as string);
                const label =
                  (m.caption as string) ||
                  (m.alt as string) ||
                  mediaKindLabel(m.kind as string);
                return (
                  <li key={m.id as string}>
                    <Link
                      href={`/admin/media/${m.id}`}
                      className="group block border border-line bg-abyss transition-colors hover:border-cyan/60"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-deep">
                        {url && (
                          <Image
                            src={url}
                            alt={(m.alt as string) || ""}
                            fill
                            sizes="(min-width: 1536px) 18vw, (min-width: 1024px) 22vw, (min-width: 640px) 30vw, 45vw"
                            className="object-cover transition-transform group-hover:scale-[1.03]"
                          />
                        )}
                        <span className="absolute top-2 left-2 flex flex-wrap gap-1">
                          {m.consent_confirmed ? (
                            <Badge tone="success">Published</Badge>
                          ) : (
                            <Badge tone="warning">Hidden</Badge>
                          )}
                          {m.featured ? (
                            <Badge tone="gold">Featured</Badge>
                          ) : null}
                        </span>
                      </div>
                      <p className="truncate px-3 py-2 text-xs text-silver group-hover:text-ice">
                        {label}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Pager
              page={page}
              more={more}
              path="/admin/media"
              params={kept({ q, consent, kind, album })}
            />
          </>
        )}
      </Panel>
    </>
  );
}
