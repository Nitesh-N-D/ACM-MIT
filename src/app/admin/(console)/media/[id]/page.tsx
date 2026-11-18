import Image from "next/image";
import { notFound } from "next/navigation";
import { deleteMedia } from "@/app/actions/admin";
import { ConfirmAction, MediaEditForm } from "@/components/admin/Controls";
import { ReplaceMedia } from "@/components/admin/MediaUploader";
import { AdminHeader, LoadError, Panel } from "@/components/admin/Shell";
import { Badge } from "@/components/ui/Badge";
import { MEDIA_KIND_OPTIONS, mediaKindLabel } from "@/lib/admin/media";
import { isUuid, mediaUsage, refOptions } from "@/lib/admin/server";
import { STAFF } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/session";
import { mediaUrl } from "@/lib/supabase/env";
import { formatDate } from "@/lib/validate";

export const metadata = { title: "Edit image" };

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { db } = await requireAdmin(STAFF);
  const { data: m, error } = await db
    .from("gallery_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return <LoadError />;
  if (!m) notFound();

  const path = m.storage_path as string;
  const [used, refs] = await Promise.all([
    mediaUsage(db, path),
    refOptions(db),
  ]);
  const url = mediaUrl(path);
  const title = (m.caption as string) || mediaKindLabel(m.kind as string);
  const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));

  return (
    <>
      <AdminHeader
        title={title}
        description={
          <>
            {m.consent_confirmed ? (
              <Badge tone="success">Published</Badge>
            ) : (
              <Badge tone="warning">Hidden until consent is confirmed</Badge>
            )}{" "}
            <span>Uploaded {formatDate(String(m.created_at), true)}</span>
          </>
        }
        back={{ href: "/admin/media", label: "Media library" }}
        actions={
          url ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-cyan hover:underline"
            >
              Open the original ↗
            </a>
          ) : undefined
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-6">
          <Panel>
            <div className="relative aspect-[4/3] overflow-hidden bg-deep">
              {url && (
                <Image
                  src={url}
                  alt={s(m.alt)}
                  fill
                  sizes="(min-width: 1280px) 40vw, 90vw"
                  className="object-contain"
                  priority
                />
              )}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <dt className="text-dim">Size</dt>
              <dd className="text-silver">
                {m.width && m.height
                  ? `${m.width} × ${m.height} px`
                  : "Unknown"}
              </dd>
              <dt className="text-dim">File</dt>
              <dd className="truncate font-mono text-silver" title={path}>
                {path}
              </dd>
            </dl>
          </Panel>
          <Panel
            title="Where it is used"
            description="Pages that show this image directly. Album and event photographs also appear in the gallery."
          >
            {used.length ? (
              <ul className="space-y-1.5 text-sm text-silver">
                {used.map((u) => (
                  <li key={u} className="first-letter:uppercase">
                    {u}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">
                Not attached to any event, project, person, achievement or
                exhibit.
              </p>
            )}
          </Panel>
          <Panel
            title="Replace the file"
            description="Keeps every place that uses the image and swaps in the new photograph."
          >
            <ReplaceMedia id={id} inUse={used.length > 0} />
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Details">
            <MediaEditForm
              id={id}
              albums={refs.albums}
              events={refs.events}
              kinds={MEDIA_KIND_OPTIONS}
              values={{
                caption: s(m.caption),
                alt: s(m.alt),
                description: s(m.description),
                kind: s(m.kind),
                album_id: s(m.album_id),
                event_id: s(m.event_id),
                sort_order: s(m.sort_order),
                featured: m.featured ? "on" : "",
                consent_confirmed: m.consent_confirmed ? "on" : "",
              }}
            />
          </Panel>
          <Panel
            title="Delete"
            description="Removes the image and its file for good."
            className="border-danger/20"
          >
            {used.length ? (
              <p className="text-sm text-muted">
                Remove it from the pages listed under “Where it is used” first.
              </p>
            ) : (
              <ConfirmAction
                label="Delete image"
                title="Delete this image?"
                description="The file is removed from storage. This cannot be undone."
                action={deleteMedia.bind(null, id)}
              />
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
