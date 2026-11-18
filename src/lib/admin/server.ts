import "server-only";
import type { Db } from "@/lib/supabase/server";
import { Form, slugify, type FormState } from "@/lib/validate";
import { fromLocalInput, type EntityDef, type Option } from "./entities";

/**
 * Server side of the command centre's record editor: reads a submission
 * through the entity's field list (the browser's copy is never trusted),
 * applies the publishing rules and turns database refusals into plain words.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

/** A path inside the media bucket, as written by the uploader. */
const MEDIA_PATH = /^[a-z0-9][a-z0-9/_-]*\.(jpg|png|webp|avif)$/;

export type Parsed = { ok: true; payload: Record<string, unknown> } | { ok: false; state: FormState };

export function parseRecord(def: EntityDef, data: FormData, existing: Record<string, unknown> | null): Parsed {
  const f = new Form(data);
  const payload: Record<string, unknown> = {};

  for (const field of def.fields) {
    const { name, label, required } = field;
    switch (field.type) {
      case "text":
      case "textarea":
        payload[name] = f.text(name, { label, max: field.max ?? 500, required, min: field.min });
        break;
      case "slug": {
        const typed = f.text(name, { label, max: 80 });
        const slug = slugify(typed || String(data.get(def.title) ?? ""))
          .slice(0, 80)
          .replace(/-+$/, "");
        if (slug.length < 2) f.errors[name] = `${label} needs at least two letters or numbers.`;
        payload[name] = slug;
        f.values[name] = slug;
        break;
      }
      case "url": {
        const v = f.url(name, label, required);
        if (v && field.https && !v.startsWith("https://")) f.errors[name] = `${label} must start with https://.`;
        payload[name] = v;
        break;
      }
      case "select": {
        const v = f.text(name, { label, max: 60, required });
        if (v && !(field.options ?? []).some((o: Option) => o.value === v)) f.errors[name] = `Choose a ${label.toLowerCase()} from the list.`;
        payload[name] = v;
        break;
      }
      case "ref": {
        const v = f.text(name, { label, max: 36 });
        if (v && !isUuid(v)) f.errors[name] = `Choose a ${label.toLowerCase()} from the list.`;
        payload[name] = v || null;
        break;
      }
      case "checkbox":
        payload[name] = f.checked(name);
        f.values[name] = payload[name] ? "on" : "";
        break;
      case "datetime": {
        const v = f.text(name, { label, max: 20, required });
        const iso = v ? fromLocalInput(v) : null;
        if (v && !iso) f.errors[name] = `${label} is not a valid date and time.`;
        payload[name] = iso;
        break;
      }
      case "date": {
        const v = f.text(name, { label, max: 10, required });
        if (v && (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v)))) f.errors[name] = `${label} is not a valid date.`;
        payload[name] = v || null;
        break;
      }
      case "number": {
        const v = f.text(name, { label, max: 12, required });
        if (!v) {
          payload[name] = name === "sort_order" ? 0 : null;
          break;
        }
        const n = Number(v);
        if (!Number.isInteger(n)) f.errors[name] = `${label} must be a whole number.`;
        else if ((field.min !== undefined && n < field.min) || (field.max !== undefined && n > field.max))
          f.errors[name] = `${label} must be between ${field.min} and ${field.max}.`;
        payload[name] = n;
        break;
      }
      case "tags": {
        const v = f.text(name, { label, max: 400 });
        const tags = [
          ...new Set(
            v
              .split(",")
              .map((t) => t.trim().toLowerCase())
              .filter(Boolean),
          ),
        ];
        if (tags.length > 12) f.errors[name] = "Use at most 12 tags.";
        else if (tags.some((t) => t.length > 40)) f.errors[name] = "Each tag must be 40 characters or fewer.";
        payload[name] = tags.slice(0, 12);
        break;
      }
      case "image": {
        const v = f.text(name, { label, max: 300 });
        if (v && (!MEDIA_PATH.test(v) || v.includes(".."))) f.errors[name] = "Choose an image from the media library.";
        payload[name] = v || null;
        break;
      }
    }
  }

  // Rules that need more than one field.
  if (def.key === "events" && payload.starts_at && payload.ends_at && String(payload.ends_at) < String(payload.starts_at))
    f.errors.ends_at = "The event cannot end before it starts.";
  if (def.key === "team" && !payload.consent_confirmed && (payload.visible || payload.image_path))
    f.errors.consent_confirmed = "Record this person's consent before showing them or attaching a photograph.";
  if (def.key === "heritage" && payload.image_path) {
    if (!payload.image_rights_confirmed) f.errors.image_rights_confirmed = "Confirm the right to publish this photograph, or remove it.";
    if (!String(payload.image_alt ?? "").trim()) f.errors.image_alt = "Describe the photograph for people who cannot see it.";
  }
  if (def.key === "announcements" && payload.status === "published") payload.published_at = existing?.published_at ?? new Date().toISOString();

  if (!f.valid) return { ok: false, state: f.fail() };
  return { ok: true, payload };
}

/** Image fields may only use photographs whose consent is confirmed in the media library. */
export async function checkImages(db: Db, def: EntityDef, payload: Record<string, unknown>): Promise<FormState["errors"]> {
  const paths = def.fields.filter((x) => x.type === "image" && payload[x.name]).map((x) => [x.name, String(payload[x.name])] as const);
  if (paths.length === 0) return undefined;
  const { data } = await db
    .from("gallery_items")
    .select("storage_path, consent_confirmed")
    .in(
      "storage_path",
      paths.map((p) => p[1]),
    );
  const approved = new Set((data ?? []).filter((r) => r.consent_confirmed).map((r) => r.storage_path as string));
  const errors: Record<string, string> = {};
  for (const [name, path] of paths) if (!approved.has(path)) errors[name] = "Only approved photographs (consent confirmed in the media library) can be used.";
  return Object.keys(errors).length ? errors : undefined;
}

type DbError = { code?: string; message?: string } | null | undefined;

/** A database refusal, in words an editor can act on. */
export function explain(error: DbError, what = "The change"): string {
  if (!error) return `${what} could not be saved.`;
  if (error.code === "23505") return "Another record already uses that web address. Choose a different one.";
  if (error.code === "23514") return "A value is outside what the database allows. Check the lengths and links, then try again.";
  if (error.code === "23503") return "This record is linked to something that no longer exists. Reload the page and try again.";
  if (error.code === "42501" || /row-level security/i.test(error.message ?? "")) return "Your role does not allow this change.";
  return `${what} could not be saved just now. Please try again.`;
}

/** Tables that point at media by storage path. */
export const MEDIA_REFS = [
  { table: "events", columns: ["banner_path", "poster_path"], label: "event", title: "title" },
  { table: "projects", columns: ["image_path"], label: "project", title: "title" },
  { table: "team_members", columns: ["image_path"], label: "team member", title: "name" },
  { table: "achievements", columns: ["image_path"], label: "achievement", title: "title" },
  { table: "heritage_entries", columns: ["image_path"], label: "heritage exhibit", title: "title" },
] as const;

/** Where a stored image is used, as short labels ("event: Hack Night"). */
export async function mediaUsage(db: Db, path: string): Promise<string[]> {
  const found: string[] = [];
  await Promise.all(
    MEDIA_REFS.flatMap((ref) =>
      ref.columns.map(async (col) => {
        const { data } = await db.from(ref.table).select(ref.title).eq(col, path).limit(5);
        for (const row of (data ?? []) as unknown as Record<string, string>[]) found.push(`${ref.label}: ${row[ref.title]}`);
      }),
    ),
  );
  return found;
}

/** Options for event and album pickers. */
export async function refOptions(db: Db) {
  const [events, albums] = await Promise.all([
    db.from("events").select("id, title, starts_at").order("starts_at", { ascending: false, nullsFirst: true }).limit(300),
    db.from("gallery_albums").select("id, title").order("created_at", { ascending: false }).limit(300),
  ]);
  return {
    events: (events.data ?? []).map((e) => ({ value: e.id as string, label: e.title as string })),
    albums: (albums.data ?? []).map((a) => ({ value: a.id as string, label: a.title as string })),
  };
}

export type PickerImage = { path: string; url: string; label: string };

/** Approved photographs, newest first, for image fields. */
export async function approvedImages(db: Db, mediaUrl: (p: string) => string | null): Promise<PickerImage[]> {
  const { data } = await db
    .from("gallery_items")
    .select("storage_path, caption, alt, kind")
    .eq("consent_confirmed", true)
    .order("created_at", { ascending: false })
    .limit(400);
  return (data ?? []).flatMap((m) => {
    const url = mediaUrl(m.storage_path as string);
    return url ? [{ path: m.storage_path as string, url, label: (m.caption as string) || (m.alt as string) || (m.kind as string) }] : [];
  });
}

/** Detects the image type from the file's first bytes, never from its name. */
export function sniffImage(bytes: Uint8Array): { mime: string; ext: string } | null {
  const b = bytes;
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { mime: "image/png", ext: "png" };
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { mime: "image/webp", ext: "webp" };
  if (ascii(4, 8) === "ftyp" && /avi[fs]/.test(ascii(8, 12))) return { mime: "image/avif", ext: "avif" };
  return null;
}

export const MAX_UPLOAD = 5 * 1024 * 1024;
