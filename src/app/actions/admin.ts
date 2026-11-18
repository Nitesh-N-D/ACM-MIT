"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ENTITIES, isEntityKey, type EntityKey } from "@/lib/admin/entities";
import { MEDIA_KINDS } from "@/lib/admin/media";
import { MAX_UPLOAD, MEDIA_REFS, checkImages, explain, isUuid, mediaUsage, parseRecord, sniffImage } from "@/lib/admin/server";
import { adminAccess } from "@/lib/auth/session";
import { ADMINS, CONTENT, EVENTS, ROLES, STAFF, SUPER, type Role } from "@/lib/auth/roles";
import { MEDIA_BUCKET } from "@/lib/supabase/env";
import { Form, slugify, type FormState } from "@/lib/validate";

/**
 * Every command-centre change goes through these actions. Each one checks the
 * visitor's role on the server first; Row Level Security checks it again in
 * the database, and triggers write the activity log. Public pages are
 * revalidated afterwards so the change appears straight away.
 */

const DENIED: FormState = { ok: false, message: "Your session or role no longer allows this. Sign in again, or ask a Super Admin." };

async function gate(roles: readonly Role[]) {
  const access = await adminAccess(roles);
  return access.ok ? access : null;
}

function refreshSite() {
  revalidatePath("/", "layout");
}

/* ------------------------------------------------------------------------ */
/* Records                                                                   */
/* ------------------------------------------------------------------------ */

export async function saveRecord(key: EntityKey, id: string | null, _prev: FormState, data: FormData): Promise<FormState> {
  if (!isEntityKey(key) || (id !== null && !isUuid(id))) return { ok: false, message: "Unknown record." };
  const def = ENTITIES[key];
  const access = await gate(def.roles);
  if (!access) return DENIED;
  const { db } = access;

  let existing: Record<string, unknown> | null = null;
  if (id) {
    const { data: row } = await db.from(def.table).select("*").eq("id", id).maybeSingle();
    if (!row) return { ok: false, message: "This record no longer exists. It may have been deleted." };
    existing = row;
  }

  const parsed = parseRecord(def, data, existing);
  if (!parsed.ok) return parsed.state;
  const imageErrors = await checkImages(db, def, parsed.payload);
  if (imageErrors) return { ok: false, message: "Please correct the highlighted fields.", errors: imageErrors, values: Object.fromEntries([...data.entries()].map(([k, v]) => [k, String(v)])) };

  const values = Object.fromEntries([...data.entries()].filter(([, v]) => typeof v === "string").map(([k, v]) => [k, String(v)]));
  if (id) {
    const { error } = await db.from(def.table).update(parsed.payload).eq("id", id);
    if (error) return { ok: false, message: explain(error), errors: error.code === "23505" ? { slug: "Already in use." } : undefined, values };
    refreshSite();
    return { ok: true, message: `Saved. ${def.publicPath?.({ ...existing, ...parsed.payload }) ? "The public page shows the change now." : "It is not visible to the public."}`, values };
  }

  const { data: created, error } = await db.from(def.table).insert(parsed.payload).select("id").single();
  if (error || !created) return { ok: false, message: explain(error), errors: error?.code === "23505" ? { slug: "Already in use." } : undefined, values };
  refreshSite();
  redirect(`/admin/${key}/${created.id}?created=1`);
}

export async function deleteRecord(key: EntityKey, id: string): Promise<FormState> {
  if (!isEntityKey(key) || !isUuid(id)) return { ok: false, message: "Unknown record." };
  const def = ENTITIES[key];
  const access = await gate(def.roles);
  if (!access) return DENIED;
  const { error } = await access.db.from(def.table).delete().eq("id", id);
  if (error) return { ok: false, message: explain(error, "The record") };
  refreshSite();
  redirect(`/admin/${key}?deleted=1`);
}

/* ------------------------------------------------------------------------ */
/* Media library                                                             */
/* ------------------------------------------------------------------------ */

// MEDIA_KINDS: see @/lib/admin/media.

export type UploadResult = { ok: true; id: string; message: string } | { ok: false; message: string };

async function readImage(data: FormData): Promise<{ bytes: Uint8Array; mime: string; ext: string } | string> {
  const file = data.get("file");
  if (!(file instanceof File) || file.size === 0) return "Choose an image file.";
  if (file.size > MAX_UPLOAD) return `${file.name} is larger than 5 MB. Export it smaller (about 2400 px wide is plenty) and try again.`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImage(bytes);
  if (!type) return `${file.name} is not a JPEG, PNG, WebP or AVIF image.`;
  return { bytes, ...type };
}

function dimension(v: FormDataEntryValue | null): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n <= 20000 ? n : null;
}

export async function uploadMedia(data: FormData): Promise<UploadResult> {
  const access = await gate(STAFF);
  if (!access) return { ok: false, message: DENIED.message! };
  const image = await readImage(data);
  if (typeof image === "string") return { ok: false, message: image };

  const kindRaw = String(data.get("kind") ?? "photo");
  const kind = (MEDIA_KINDS as readonly string[]).includes(kindRaw) ? kindRaw : "photo";
  const album = String(data.get("album_id") ?? "");
  const event = String(data.get("event_id") ?? "");
  const path = `${kind}/${new Date().getFullYear()}/${randomUUID()}.${image.ext}`;

  const storage = access.db.storage.from(MEDIA_BUCKET);
  const { error: upError } = await storage.upload(path, image.bytes, { contentType: image.mime, cacheControl: "31536000", upsert: false });
  if (upError) return { ok: false, message: "The image could not be stored. Check your connection and try again." };

  const { data: row, error } = await access.db
    .from("gallery_items")
    .insert({
      storage_path: path,
      kind,
      album_id: isUuid(album) ? album : null,
      event_id: isUuid(event) ? event : null,
      width: dimension(data.get("width")),
      height: dimension(data.get("height")),
      consent_confirmed: false,
    })
    .select("id")
    .single();
  if (error || !row) {
    await storage.remove([path]);
    return { ok: false, message: explain(error, "The image") };
  }
  revalidatePath("/admin/media");
  return { ok: true, id: row.id as string, message: "Uploaded. It stays hidden until you confirm consent." };
}

export async function updateMedia(id: string, _prev: FormState, data: FormData): Promise<FormState> {
  if (!isUuid(id)) return { ok: false, message: "Unknown image." };
  const access = await gate(STAFF);
  if (!access) return DENIED;
  const { db } = access;
  const { data: item } = await db.from("gallery_items").select("storage_path, consent_confirmed").eq("id", id).maybeSingle();
  if (!item) return { ok: false, message: "This image no longer exists." };

  const f = new Form(data);
  const caption = f.text("caption", { label: "Caption", max: 300 });
  const alt = f.text("alt", { label: "Description (alt text)", max: 300 });
  const description = f.text("description", { label: "Notes", max: 2000 });
  const kindRaw = f.text("kind", { label: "Kind", max: 20, required: true });
  const album = f.text("album_id", { label: "Album", max: 36 });
  const event = f.text("event_id", { label: "Event", max: 36 });
  const sortRaw = f.text("sort_order", { label: "Sort order", max: 6 });
  const featured = f.checked("featured");
  const consent = f.checked("consent_confirmed");
  f.values.featured = featured ? "on" : "";
  f.values.consent_confirmed = consent ? "on" : "";

  if (!(MEDIA_KINDS as readonly string[]).includes(kindRaw)) f.errors.kind = "Choose a kind from the list.";
  if (album && !isUuid(album)) f.errors.album_id = "Choose an album from the list.";
  if (event && !isUuid(event)) f.errors.event_id = "Choose an event from the list.";
  const sort = sortRaw ? Number(sortRaw) : 0;
  if (!Number.isInteger(sort) || Math.abs(sort) > 10000) f.errors.sort_order = "Sort order must be a whole number.";
  if (consent && !alt) f.errors.alt = "Describe the photograph before publishing it, for people who cannot see it.";
  if (!consent && item.consent_confirmed) {
    const used = await mediaUsage(db, item.storage_path as string);
    if (used.length) f.errors.consent_confirmed = `This photograph is shown on: ${used.join(", ")}. Remove it there before withdrawing consent.`;
  }
  if (!f.valid) return f.fail();

  const { error } = await db
    .from("gallery_items")
    .update({
      caption,
      alt,
      description,
      kind: kindRaw,
      album_id: album || null,
      event_id: event || null,
      sort_order: sort,
      featured,
      consent_confirmed: consent,
    })
    .eq("id", id);
  if (error) return { ok: false, message: explain(error), values: f.values };
  refreshSite();
  return { ok: true, message: consent ? "Saved. The photograph is published." : "Saved. The photograph stays hidden from the public.", values: f.values };
}

/** Swaps the file behind a library entry; everything that uses it follows. */
export async function replaceMedia(id: string, data: FormData): Promise<UploadResult> {
  if (!isUuid(id)) return { ok: false, message: "Unknown image." };
  const access = await gate(STAFF);
  if (!access) return { ok: false, message: DENIED.message! };
  const { db } = access;
  const { data: item } = await db.from("gallery_items").select("storage_path, kind").eq("id", id).maybeSingle();
  if (!item) return { ok: false, message: "This image no longer exists." };

  const image = await readImage(data);
  if (typeof image === "string") return { ok: false, message: image };
  const old = item.storage_path as string;
  const used = await mediaUsage(db, old);
  // A new photograph may show different people: consent is asked for again.
  const consent = data.get("consent_confirmed") === "on";
  if (used.length && !consent) return { ok: false, message: `This image is shown on: ${used.join(", ")}. Confirm consent for the new photograph to replace it there.` };

  const path = `${item.kind}/${new Date().getFullYear()}/${randomUUID()}.${image.ext}`;
  const storage = db.storage.from(MEDIA_BUCKET);
  const { error: upError } = await storage.upload(path, image.bytes, { contentType: image.mime, cacheControl: "31536000", upsert: false });
  if (upError) return { ok: false, message: "The new image could not be stored. Please try again." };

  const { error } = await db
    .from("gallery_items")
    .update({ storage_path: path, width: dimension(data.get("width")), height: dimension(data.get("height")), consent_confirmed: consent })
    .eq("id", id);
  if (error) {
    await storage.remove([path]);
    return { ok: false, message: explain(error, "The image") };
  }
  await Promise.all(MEDIA_REFS.flatMap((ref) => ref.columns.map((col) => db.from(ref.table).update({ [col]: path }).eq(col, old))));
  await storage.remove([old]);
  refreshSite();
  return { ok: true, id, message: consent ? "Replaced and published." : "Replaced. Confirm consent to publish the new photograph." };
}

export async function deleteMedia(id: string): Promise<FormState> {
  if (!isUuid(id)) return { ok: false, message: "Unknown image." };
  const access = await gate(STAFF);
  if (!access) return DENIED;
  const { db } = access;
  const { data: item } = await db.from("gallery_items").select("storage_path").eq("id", id).maybeSingle();
  if (!item) redirect("/admin/media?deleted=1");
  const used = await mediaUsage(db, item.storage_path as string);
  if (used.length) return { ok: false, message: `This image is still shown on: ${used.join(", ")}. Remove it there first.` };
  const { error } = await db.from("gallery_items").delete().eq("id", id);
  if (error) return { ok: false, message: explain(error, "The image") };
  await db.storage.from(MEDIA_BUCKET).remove([item.storage_path as string]);
  refreshSite();
  redirect("/admin/media?deleted=1");
}

/* ------------------------------------------------------------------------ */
/* Registrations, submissions, applications, messages                        */
/* ------------------------------------------------------------------------ */

const REG_STATUS = ["registered", "waitlisted", "cancelled"];

export async function updateRegistration(id: string, _prev: FormState, data: FormData): Promise<FormState> {
  if (!isUuid(id)) return { ok: false, message: "Unknown registration." };
  const access = await gate(EVENTS);
  if (!access) return DENIED;
  const status = String(data.get("status") ?? "");
  if (!REG_STATUS.includes(status)) return { ok: false, message: "Choose a status." };
  const attended = data.get("attended") === "on";
  const { error } = await access.db.from("event_registrations").update({ status, attended }).eq("id", id);
  if (error) return { ok: false, message: explain(error) };
  revalidatePath("/admin/registrations");
  revalidatePath("/dashboard");
  return { ok: true, message: "Saved." };
}

async function uniqueProjectSlug(db: NonNullable<Awaited<ReturnType<typeof gate>>>["db"], title: string) {
  const base = slugify(title).slice(0, 70).replace(/-+$/, "") || "project";
  for (const candidate of [base, `${base}-2`, `${base}-3`, `${base}-${randomUUID().slice(0, 6)}`]) {
    const { data } = await db.from("projects").select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${randomUUID().slice(0, 8)}`;
}

export async function reviewSubmission(id: string, _prev: FormState, data: FormData): Promise<FormState> {
  if (!isUuid(id)) return { ok: false, message: "Unknown submission." };
  const access = await gate(CONTENT);
  if (!access) return DENIED;
  const { db, viewer } = access;
  const decision = String(data.get("decision") ?? "");
  const note = String(data.get("note") ?? "")
    .trim()
    .slice(0, 1000);
  if (decision !== "approved" && decision !== "rejected") return { ok: false, message: "Choose approve or decline." };
  if (decision === "rejected" && !note) return { ok: false, message: "Add a short note so the team knows why.", errors: { note: "Required when declining." } };

  const { data: sub } = await db.from("project_submissions").select("*").eq("id", id).maybeSingle();
  if (!sub) return { ok: false, message: "This submission no longer exists." };
  if (sub.status !== "pending") return { ok: false, message: "This submission was already reviewed." };

  let projectId: string | null = null;
  if (decision === "approved") {
    const { data: project, error } = await db
      .from("projects")
      .insert({
        slug: await uniqueProjectSlug(db, sub.title as string),
        title: sub.title,
        summary: sub.summary,
        description: sub.description,
        team: sub.team,
        repo_url: sub.repo_url,
        demo_url: sub.demo_url,
        status: "draft",
      })
      .select("id")
      .single();
    if (error || !project) return { ok: false, message: explain(error, "The project") };
    projectId = project.id as string;
  }

  const { error } = await db
    .from("project_submissions")
    .update({ status: decision, review_note: note, reviewed_by: viewer.id, reviewed_at: new Date().toISOString(), project_id: projectId })
    .eq("id", id);
  if (error) return { ok: false, message: explain(error, "The review") };
  revalidatePath("/admin/submissions");
  if (projectId) redirect(`/admin/projects/${projectId}?from=submission`);
  return { ok: true, message: "Declined. The member sees your note on their dashboard." };
}

export async function reviewApplication(id: string, _prev: FormState, data: FormData): Promise<FormState> {
  if (!isUuid(id)) return { ok: false, message: "Unknown application." };
  const access = await gate(ADMINS);
  if (!access) return DENIED;
  const decision = String(data.get("decision") ?? "");
  const note = String(data.get("note") ?? "")
    .trim()
    .slice(0, 1000);
  if (decision !== "approved" && decision !== "rejected" && decision !== "pending") return { ok: false, message: "Choose a decision." };
  const { error } = await access.db
    .from("membership_applications")
    .update({ status: decision, review_note: note, reviewed_by: decision === "pending" ? null : access.viewer.id, reviewed_at: decision === "pending" ? null : new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, message: explain(error, "The decision") };
  revalidatePath("/admin/applications");
  return { ok: true, message: decision === "pending" ? "Moved back to pending." : `Marked ${decision}.` };
}

export async function setMessageStatus(id: string, status: "new" | "read" | "archived"): Promise<FormState> {
  if (!isUuid(id) || !["new", "read", "archived"].includes(status)) return { ok: false, message: "Unknown message." };
  const access = await gate(ADMINS);
  if (!access) return DENIED;
  const { error } = await access.db.from("contact_submissions").update({ status }).eq("id", id);
  if (error) return { ok: false, message: explain(error) };
  revalidatePath("/admin/messages");
  return { ok: true, message: "Updated." };
}

export async function deleteMessage(id: string): Promise<FormState> {
  if (!isUuid(id)) return { ok: false, message: "Unknown message." };
  const access = await gate(ADMINS);
  if (!access) return DENIED;
  const { error } = await access.db.from("contact_submissions").delete().eq("id", id);
  if (error) return { ok: false, message: explain(error, "The message") };
  revalidatePath("/admin/messages");
  return { ok: true, message: "Deleted." };
}

/* ------------------------------------------------------------------------ */
/* Roles (Super Admin only)                                                  */
/* ------------------------------------------------------------------------ */

const GRANTABLE = ROLES.filter((r) => r !== "member");

export async function grantRole(_prev: FormState, data: FormData): Promise<FormState> {
  const access = await gate(SUPER);
  if (!access) return DENIED;
  const f = new Form(data);
  const email = f.email("email", "Account email");
  const role = f.text("role", { label: "Role", max: 20, required: true }) as Role;
  if (role && !(GRANTABLE as string[]).includes(role)) f.errors.role = "Choose a role from the list.";
  if (!f.valid) return f.fail();
  if (email === access.viewer.email.toLowerCase()) return { ok: false, message: "You cannot change your own roles.", values: f.values };

  const { data: profile } = await access.db.from("profiles").select("id").ilike("email", email).maybeSingle();
  if (!profile) return { ok: false, message: "No account uses that email yet. Ask the person to sign in once, then try again.", values: f.values };
  const { error } = await access.db.from("user_roles").insert({ user_id: profile.id, role, granted_by: access.viewer.id });
  if (error?.code === "23505") return { ok: true, message: "That account already has this role." };
  if (error) return { ok: false, message: explain(error, "The role"), values: f.values };
  revalidatePath("/admin/roles");
  return { ok: true, message: `Granted. The role applies from their next page load.` };
}

export async function revokeRole(userId: string, role: Role): Promise<FormState> {
  if (!isUuid(userId) || !(GRANTABLE as string[]).includes(role)) return { ok: false, message: "Unknown role." };
  const access = await gate(SUPER);
  if (!access) return DENIED;
  if (userId === access.viewer.id) return { ok: false, message: "You cannot change your own roles." };
  const { error } = await access.db.from("user_roles").delete().eq("user_id", userId).eq("role", role);
  if (error) return { ok: false, message: explain(error, "The role") };
  revalidatePath("/admin/roles");
  return { ok: true, message: "Revoked." };
}

/* ------------------------------------------------------------------------ */
/* Website settings and district copy                                        */
/* ------------------------------------------------------------------------ */

type SettingsKey = "home" | "site" | "experience";

export async function saveSettings(key: SettingsKey, _prev: FormState, data: FormData): Promise<FormState> {
  const access = await gate(key === "home" ? CONTENT : ADMINS);
  if (!access) return DENIED;
  const f = new Form(data);
  let value: Record<string, unknown>;
  if (key === "home") {
    value = {
      heading: f.text("heading", { label: "Heading", max: 80 }),
      subheading: f.text("subheading", { label: "Subheading", max: 120 }),
      tagline: f.text("tagline", { label: "Tagline", max: 80 }),
      featuredNote: f.text("featuredNote", { label: "Featured note", max: 300 }),
    };
  } else if (key === "site") {
    const email = f.text("contactEmail", { label: "Contact email", max: 254 }).toLowerCase();
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) f.errors.contactEmail = "Enter a valid email address.";
    value = {
      contactEmail: email,
      address: f.text("address", { label: "Address", max: 300 }),
      membershipInfo: f.text("membershipInfo", { label: "Membership information", max: 600 }),
      membershipOpen: f.checked("membershipOpen"),
    };
    f.values.membershipOpen = value.membershipOpen ? "on" : "";
  } else if (key === "experience") {
    const q = f.text("maxQuality", { label: "Highest quality", max: 10 });
    if (q && !["high", "balanced", "low"].includes(q)) f.errors.maxQuality = "Choose a level from the list.";
    value = { introEnabled: f.checked("introEnabled"), autoRotate: f.checked("autoRotate"), maxQuality: q || "high" };
    f.values.introEnabled = value.introEnabled ? "on" : "";
    f.values.autoRotate = value.autoRotate ? "on" : "";
  } else return { ok: false, message: "Unknown settings." };
  if (!f.valid) return f.fail();

  // Empty text means "use the default", so it is not stored.
  const clean = Object.fromEntries(Object.entries(value).filter(([, v]) => v !== ""));
  const { error } = await access.db.from("website_settings").upsert({ key, value: clean, updated_by: access.viewer.id, updated_at: new Date().toISOString() });
  if (error) return { ok: false, message: explain(error, "The settings"), values: f.values };
  refreshSite();
  return { ok: true, message: "Saved. The website shows the change now.", values: f.values };
}

const DISTRICT_IDS = ["core", "intelligence", "frontier", "colosseum", "vault", "sanctuary"];

export async function saveDistrict(district: string, _prev: FormState, data: FormData): Promise<FormState> {
  if (!DISTRICT_IDS.includes(district)) return { ok: false, message: "Unknown district." };
  const access = await gate(CONTENT);
  if (!access) return DENIED;
  const f = new Form(data);
  const copy: Record<string, string> = {
    description: f.text("description", { label: "Description", max: 400 }),
    intro: f.text("intro", { label: "Building introduction", max: 600 }),
    notice: f.text("notice", { label: "Notice", max: 300 }),
  };
  if (district === "core") {
    copy.mission = f.text("mission", { label: "Mission", max: 600 });
    copy.vision = f.text("vision", { label: "Vision", max: 600 });
  }
  if (!f.valid) return f.fail();

  const { data: row, error: readError } = await access.db.from("website_settings").select("value").eq("key", "districts").maybeSingle();
  if (readError) return { ok: false, message: "The current text could not be loaded. Please try again.", values: f.values };
  const all = (row?.value && typeof row.value === "object" ? row.value : {}) as Record<string, unknown>;
  all[district] = Object.fromEntries(Object.entries(copy).filter(([, v]) => v !== ""));
  const { error } = await access.db.from("website_settings").upsert({ key: "districts", value: all, updated_by: access.viewer.id, updated_at: new Date().toISOString() });
  if (error) return { ok: false, message: explain(error, "The district text"), values: f.values };
  refreshSite();
  return { ok: true, message: "Saved. The district shows the new text now.", values: f.values };
}
