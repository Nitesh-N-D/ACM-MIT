import "server-only";
import { ADMINS, CONTENT, EVENTS, type Role } from "@/lib/auth/roles";
import type { Db } from "@/lib/supabase/server";
import { isUuid } from "./server";

type Row = Record<string, unknown>;
type Column = { key: string; label: string };

export type ExportDef = {
  label: string;
  description: string;
  roles: readonly Role[];
  columns: Column[];
  load: (db: Db, opts: { event: string | null }) => Promise<Row[] | null>;
};

const one = <T>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

/** Emails and names of registrants come from their profiles (read allowed for event managers). */
async function profilesById(db: Db, ids: string[]) {
  const map = new Map<string, Row>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await db
      .from("profiles")
      .select("id, email, full_name, department, year_of_study")
      .in("id", ids.slice(i, i + 200));
    for (const p of data ?? []) map.set(p.id as string, p);
  }
  return map;
}

export const EXPORTS = {
  registrations: {
    label: "Event registrations",
    description:
      "Everyone registered for events, with status and attendance. Filter by one event from the registrations page.",
    roles: EVENTS,
    columns: [
      { key: "event", label: "Event" },
      { key: "starts_at", label: "Event starts" },
      { key: "full_name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "department", label: "Department" },
      { key: "year_of_study", label: "Year" },
      { key: "status", label: "Status" },
      { key: "attended", label: "Attended" },
      { key: "created_at", label: "Registered at" },
    ],
    async load(db, { event }) {
      let q = db
        .from("event_registrations")
        .select(
          "user_id, status, attended, created_at, events(title, starts_at)",
        )
        .order("created_at")
        .limit(10000);
      if (event && isUuid(event)) q = q.eq("event_id", event);
      const { data, error } = await q;
      if (error) return null;
      const people = await profilesById(db, [
        ...new Set((data ?? []).map((r) => r.user_id as string)),
      ]);
      return (data ?? []).map((r) => {
        const ev = one(r.events as Row | Row[] | null);
        const p = people.get(r.user_id as string) ?? {};
        return {
          ...p,
          event: ev?.title ?? "",
          starts_at: ev?.starts_at ?? "",
          status: r.status,
          attended: r.attended ? "yes" : "no",
          created_at: r.created_at,
        };
      });
    },
  },
  members: {
    label: "Member accounts",
    description: "Every account with its profile details and roles.",
    roles: ADMINS,
    columns: [
      { key: "full_name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "department", label: "Department" },
      { key: "year_of_study", label: "Year" },
      { key: "roles", label: "Roles" },
      { key: "created_at", label: "Joined" },
    ],
    async load(db) {
      const [{ data, error }, roles] = await Promise.all([
        db
          .from("profiles")
          .select("id, email, full_name, department, year_of_study, created_at")
          .order("created_at")
          .limit(10000),
        db.from("user_roles").select("user_id, role").limit(10000),
      ]);
      if (error) return null;
      const byUser = new Map<string, string[]>();
      for (const r of roles.data ?? [])
        byUser.set(r.user_id as string, [
          ...(byUser.get(r.user_id as string) ?? []),
          r.role as string,
        ]);
      return (data ?? []).map((p) => ({
        ...p,
        roles: (byUser.get(p.id as string) ?? ["member"]).join("; "),
      }));
    },
  },
  applications: {
    label: "Membership applications",
    description: "Applications with their decision and notes.",
    roles: ADMINS,
    columns: [
      { key: "full_name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "department", label: "Department" },
      { key: "year_of_study", label: "Year" },
      { key: "motivation", label: "Motivation" },
      { key: "status", label: "Status" },
      { key: "review_note", label: "Note" },
      { key: "created_at", label: "Applied at" },
    ],
    async load(db) {
      const { data, error } = await db
        .from("membership_applications")
        .select("*")
        .order("created_at")
        .limit(10000);
      return error ? null : (data ?? []);
    },
  },
  messages: {
    label: "Contact messages",
    description: "Messages sent through the contact form.",
    roles: ADMINS,
    columns: [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "subject", label: "Subject" },
      { key: "message", label: "Message" },
      { key: "status", label: "Status" },
      { key: "created_at", label: "Received at" },
    ],
    async load(db) {
      const { data, error } = await db
        .from("contact_submissions")
        .select("*")
        .order("created_at")
        .limit(10000);
      return error ? null : (data ?? []);
    },
  },
  submissions: {
    label: "Project submissions",
    description:
      "Projects members submitted for the Innovation Vault, with review outcomes.",
    roles: CONTENT,
    columns: [
      { key: "title", label: "Title" },
      { key: "team", label: "Team" },
      { key: "summary", label: "Summary" },
      { key: "repo_url", label: "Repository" },
      { key: "demo_url", label: "Demo" },
      { key: "status", label: "Status" },
      { key: "review_note", label: "Review note" },
      { key: "created_at", label: "Submitted at" },
    ],
    async load(db) {
      const { data, error } = await db
        .from("project_submissions")
        .select("*")
        .order("created_at")
        .limit(10000);
      return error ? null : (data ?? []);
    },
  },
  events: {
    label: "Events",
    description: "All events, including drafts and archived ones.",
    roles: EVENTS,
    columns: [
      { key: "title", label: "Title" },
      { key: "category", label: "Category" },
      { key: "venue", label: "Venue" },
      { key: "starts_at", label: "Starts" },
      { key: "ends_at", label: "Ends" },
      { key: "registration_deadline", label: "Registration deadline" },
      { key: "capacity", label: "Capacity" },
      { key: "status", label: "Status" },
    ],
    async load(db) {
      const { data, error } = await db
        .from("events")
        .select("*")
        .order("starts_at")
        .limit(10000);
      return error ? null : (data ?? []);
    },
  },
  activity: {
    label: "Activity log",
    description: "Who changed what, and when (most recent 10,000 entries).",
    roles: ADMINS,
    columns: [
      { key: "created_at", label: "When" },
      { key: "actor_email", label: "Who" },
      { key: "action", label: "Action" },
      { key: "entity", label: "Area" },
      { key: "entity_id", label: "Record" },
      { key: "summary", label: "Summary" },
    ],
    async load(db) {
      const { data, error } = await db
        .from("admin_activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10000);
      return error ? null : (data ?? []);
    },
  },
} satisfies Record<string, ExportDef>;

export type ExportKind = keyof typeof EXPORTS;
export const isExportKind = (k: string): k is ExportKind =>
  Object.hasOwn(EXPORTS, k);

/**
 * RFC 4180 CSV. Cells that a spreadsheet would run as a formula
 * (=, +, -, @, tab, carriage return) are prefixed with an apostrophe.
 */
export function toCsv(columns: Column[], rows: Row[]): string {
  const cell = (v: unknown) => {
    let s = v === null || v === undefined ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    columns.map((c) => cell(c.label)).join(","),
    ...rows.map((r) => columns.map((c) => cell(r[c.key])).join(",")),
  ];
  // BOM so spreadsheet apps read UTF-8 names correctly.
  return `${String.fromCharCode(0xfeff)}${lines.join("\r\n")}\r\n`;
}
