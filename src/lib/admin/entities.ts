import { CONTENT, EVENTS, STAFF, type Role } from "@/lib/auth/roles";

/**
 * Everything the command centre edits through its generic record editor is
 * described here: the table, who may change it, its fields and how it is
 * listed. The same description renders the form and validates the submission
 * on the server; Row Level Security enforces the roles again in the database.
 */

export type FieldType =
  | "text"
  | "textarea"
  | "slug"
  | "url"
  | "select"
  | "checkbox"
  | "datetime"
  | "date"
  | "number"
  | "tags"
  | "image"
  | "ref";

export type Option = { value: string; label: string };

export type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  max?: number;
  min?: number;
  options?: Option[];
  /** For "ref": which list supplies the options. */
  ref?: "events" | "albums";
  /** For "url": only https links are accepted. */
  https?: boolean;
  hint?: string;
  /** Spans the full form width. */
  wide?: boolean;
  /** Value for a new record. */
  initial?: string | boolean;
};

export type ColumnDef = {
  name: string;
  label: string;
  kind?: "text" | "date" | "datetime" | "status" | "bool";
};

export type EntityKey =
  | "events"
  | "projects"
  | "announcements"
  | "learning"
  | "achievements"
  | "team"
  | "heritage"
  | "albums";

export type EntityDef = {
  key: EntityKey;
  table: string;
  label: string;
  singular: string;
  description: string;
  roles: readonly Role[];
  fields: FieldDef[];
  columns: ColumnDef[];
  order: { column: string; ascending: boolean }[];
  /** Field used as the record's name. */
  title: string;
  /** Where the record appears on the public site, given its row. */
  publicPath?: (row: Record<string, unknown>) => string | null;
  /** Text searched by the list filter. */
  search: string[];
};

const STATUS: Option[] = [
  { value: "draft", label: "Draft (hidden)" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived (hidden)" },
];

const status = (
  hint = "Only published records appear on the public site.",
): FieldDef => ({
  name: "status",
  label: "Status",
  type: "select",
  options: STATUS,
  initial: "draft",
  required: true,
  hint,
});

const sort: FieldDef = {
  name: "sort_order",
  label: "Sort order",
  type: "number",
  min: -10000,
  max: 10000,
  initial: "0",
  hint: "Lower numbers come first.",
};

const published = (row: Record<string, unknown>) => row.status === "published";

export const ENTITIES: Record<EntityKey, EntityDef> = {
  events: {
    key: "events",
    table: "events",
    label: "Events",
    singular: "event",
    description:
      "Hackathons, workshops, competitions and talks in the Colosseum.",
    roles: EVENTS,
    title: "title",
    search: ["title", "summary", "venue", "category"],
    order: [{ column: "starts_at", ascending: false }],
    publicPath: (r) => (published(r) ? `/events/${r.slug}` : null),
    columns: [
      { name: "title", label: "Title" },
      { name: "category", label: "Category" },
      { name: "starts_at", label: "Starts", kind: "datetime" },
      { name: "registration_open", label: "Registration", kind: "bool" },
      { name: "status", label: "Status", kind: "status" },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true, max: 160 },
      {
        name: "slug",
        label: "Web address",
        type: "slug",
        hint: "Left empty, it is made from the title.",
      },
      {
        name: "category",
        label: "Category",
        type: "select",
        initial: "workshop",
        required: true,
        options: [
          { value: "hackathon", label: "Hackathon" },
          { value: "workshop", label: "Workshop" },
          { value: "competition", label: "Competition" },
          { value: "seminar", label: "Seminar" },
          { value: "guest-lecture", label: "Guest lecture" },
          { value: "bootcamp", label: "Bootcamp" },
          { value: "conference", label: "Conference" },
          { value: "other", label: "Other" },
        ],
      },
      { name: "venue", label: "Venue", type: "text", max: 200 },
      {
        name: "summary",
        label: "Summary",
        type: "textarea",
        max: 400,
        wide: true,
        hint: "One or two sentences shown on cards.",
      },
      {
        name: "description",
        label: "Full description",
        type: "textarea",
        max: 12000,
        wide: true,
      },
      {
        name: "starts_at",
        label: "Starts",
        type: "datetime",
        hint: "India Standard Time.",
      },
      { name: "ends_at", label: "Ends", type: "datetime" },
      {
        name: "registration_deadline",
        label: "Registration deadline",
        type: "datetime",
      },
      {
        name: "capacity",
        label: "Capacity",
        type: "number",
        min: 1,
        max: 100000,
        hint: "Empty for no limit. Beyond it, members join a waitlist.",
      },
      {
        name: "registration_open",
        label: "Registration is open",
        type: "checkbox",
      },
      { name: "featured", label: "Feature this event", type: "checkbox" },
      { name: "banner_path", label: "Banner image", type: "image" },
      { name: "poster_path", label: "Poster image", type: "image" },
      status(),
    ],
  },
  projects: {
    key: "projects",
    table: "projects",
    label: "Projects",
    singular: "project",
    description: "Work shown in the Innovation Vault.",
    roles: CONTENT,
    title: "title",
    search: ["title", "summary", "team"],
    order: [{ column: "created_at", ascending: false }],
    publicPath: (r) => (published(r) ? `/vault/${r.slug}` : null),
    columns: [
      { name: "title", label: "Title" },
      { name: "team", label: "Team" },
      { name: "featured", label: "Featured", kind: "bool" },
      { name: "status", label: "Status", kind: "status" },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true, max: 160 },
      {
        name: "slug",
        label: "Web address",
        type: "slug",
        hint: "Left empty, it is made from the title.",
      },
      {
        name: "team",
        label: "Team",
        type: "text",
        max: 400,
        hint: "Names as the team wishes to be credited.",
      },
      {
        name: "tags",
        label: "Tags",
        type: "tags",
        hint: "Comma separated, for example: web, open-source, research.",
      },
      {
        name: "summary",
        label: "Summary",
        type: "textarea",
        max: 400,
        wide: true,
      },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        max: 12000,
        wide: true,
      },
      { name: "repo_url", label: "Repository link", type: "url" },
      { name: "demo_url", label: "Demo link", type: "url" },
      { name: "image_path", label: "Image", type: "image" },
      { name: "featured", label: "Feature this project", type: "checkbox" },
      status(),
    ],
  },
  announcements: {
    key: "announcements",
    table: "announcements",
    label: "Announcements",
    singular: "announcement",
    description: "Transmissions from the Central Core.",
    roles: CONTENT,
    title: "title",
    search: ["title", "body"],
    order: [{ column: "created_at", ascending: false }],
    publicPath: (r) => (published(r) ? `/announcements#${r.slug}` : null),
    columns: [
      { name: "title", label: "Title" },
      { name: "pinned", label: "Pinned", kind: "bool" },
      { name: "published_at", label: "Published", kind: "date" },
      { name: "status", label: "Status", kind: "status" },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true, max: 160 },
      {
        name: "slug",
        label: "Anchor",
        type: "slug",
        hint: "Left empty, it is made from the title.",
      },
      {
        name: "body",
        label: "Message",
        type: "textarea",
        max: 12000,
        wide: true,
        required: true,
      },
      { name: "pinned", label: "Pin to the top", type: "checkbox" },
      status("Publishing stamps today's date unless one is already set."),
    ],
  },
  learning: {
    key: "learning",
    table: "learning_resources",
    label: "Learning",
    singular: "learning resource",
    description: "Paths, workshop material and resources for the realms.",
    roles: CONTENT,
    title: "title",
    search: ["title", "summary", "level"],
    order: [
      { column: "sort_order", ascending: true },
      { column: "created_at", ascending: false },
    ],
    publicPath: (r) =>
      published(r)
        ? r.realm === "general"
          ? "/learning"
          : `/learning?realm=${r.realm}`
        : null,
    columns: [
      { name: "title", label: "Title" },
      { name: "kind", label: "Kind" },
      { name: "realm", label: "Realm" },
      { name: "status", label: "Status", kind: "status" },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true, max: 200 },
      {
        name: "kind",
        label: "Kind",
        type: "select",
        initial: "resource",
        required: true,
        options: [
          { value: "resource", label: "Resource" },
          { value: "path", label: "Learning path" },
          { value: "workshop", label: "Workshop material" },
        ],
      },
      {
        name: "realm",
        label: "Realm",
        type: "select",
        initial: "general",
        required: true,
        options: [
          { value: "general", label: "General" },
          { value: "intelligence", label: "Intelligence Realm" },
          { value: "technology", label: "Technology Frontier" },
        ],
      },
      {
        name: "level",
        label: "Level",
        type: "text",
        max: 40,
        hint: "For example: Beginner, Intermediate.",
      },
      {
        name: "summary",
        label: "Summary",
        type: "textarea",
        max: 2000,
        wide: true,
      },
      { name: "url", label: "Link", type: "url" },
      sort,
      status(),
    ],
  },
  achievements: {
    key: "achievements",
    table: "achievements",
    label: "Achievements",
    singular: "achievement",
    description: "Awards and milestones in the Hall of Legacy.",
    roles: CONTENT,
    title: "title",
    search: ["title", "description", "category"],
    order: [{ column: "achieved_on", ascending: false }],
    publicPath: (r) => (published(r) ? "/achievements" : null),
    columns: [
      { name: "title", label: "Title" },
      { name: "category", label: "Category" },
      { name: "achieved_on", label: "Date", kind: "date" },
      { name: "status", label: "Status", kind: "status" },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true, max: 200 },
      {
        name: "category",
        label: "Category",
        type: "text",
        max: 80,
        hint: "For example: Hackathon, Research, Recognition.",
      },
      { name: "achieved_on", label: "Date", type: "date" },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        max: 4000,
        wide: true,
      },
      { name: "image_path", label: "Image", type: "image" },
      sort,
      status(),
    ],
  },
  team: {
    key: "team",
    table: "team_members",
    label: "Team",
    singular: "person",
    description: "Office bearers, core team, volunteers, faculty and alumni.",
    roles: CONTENT,
    title: "name",
    search: ["name", "position", "tenure"],
    order: [
      { column: "sort_order", ascending: true },
      { column: "name", ascending: true },
    ],
    publicPath: (r) =>
      r.visible && r.consent_confirmed
        ? r.group_kind === "alumni"
          ? "/alumni"
          : "/team"
        : null,
    columns: [
      { name: "name", label: "Name" },
      { name: "position", label: "Position" },
      { name: "group_kind", label: "Group" },
      { name: "consent_confirmed", label: "Consent", kind: "bool" },
      { name: "visible", label: "Shown", kind: "bool" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true, max: 120 },
      { name: "position", label: "Position", type: "text", max: 160 },
      {
        name: "group_kind",
        label: "Group",
        type: "select",
        initial: "committee",
        required: true,
        options: [
          { value: "committee", label: "Office bearers" },
          { value: "core", label: "Core team" },
          { value: "volunteer", label: "Volunteers" },
          { value: "faculty", label: "Faculty" },
          { value: "alumni", label: "Alumni" },
          { value: "member", label: "Member" },
        ],
      },
      {
        name: "tenure",
        label: "Tenure",
        type: "text",
        max: 60,
        hint: "For example: 2025–26.",
      },
      {
        name: "bio",
        label: "Short bio",
        type: "textarea",
        max: 2000,
        wide: true,
      },
      { name: "linkedin_url", label: "LinkedIn", type: "url", https: true },
      { name: "github_url", label: "GitHub", type: "url", https: true },
      { name: "website_url", label: "Website", type: "url", https: true },
      sort,
      {
        name: "active",
        label: "Currently active",
        type: "checkbox",
        initial: true,
      },
      {
        name: "consent_confirmed",
        label:
          "This person agreed to appear on the website, with the details and photograph above",
        type: "checkbox",
        wide: true,
        hint: "Required before the person can be shown or a photograph attached.",
      },
      { name: "visible", label: "Show on the website", type: "checkbox" },
      { name: "image_path", label: "Photograph", type: "image" },
    ],
  },
  heritage: {
    key: "heritage",
    table: "heritage_entries",
    label: "Heritage",
    singular: "exhibit",
    description:
      "The archive of ACM, ACM India and ACM MIT chapter history. Every exhibit cites its source.",
    roles: CONTENT,
    title: "title",
    search: ["title", "summary", "date_label", "source_label"],
    order: [
      { column: "gallery", ascending: true },
      { column: "year", ascending: true },
      { column: "sort_order", ascending: true },
    ],
    publicPath: (r) => (published(r) ? `/heritage#${r.gallery}` : null),
    columns: [
      { name: "title", label: "Title" },
      { name: "gallery", label: "Gallery" },
      { name: "date_label", label: "Date" },
      { name: "status", label: "Status", kind: "status" },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true, max: 200 },
      {
        name: "slug",
        label: "Identifier",
        type: "slug",
        hint: "Left empty, it is made from the title.",
      },
      {
        name: "gallery",
        label: "Gallery",
        type: "select",
        initial: "chapter",
        required: true,
        options: [
          { value: "global", label: "ACM (global)" },
          { value: "india", label: "ACM India" },
          { value: "chapter", label: "ACM MIT Student Chapter" },
        ],
      },
      { name: "year", label: "Year", type: "number", min: 1900, max: 2200 },
      {
        name: "date_label",
        label: "Date as shown",
        type: "text",
        max: 60,
        hint: "For example: 15 September 1947.",
      },
      {
        name: "summary",
        label: "Summary",
        type: "textarea",
        max: 600,
        required: true,
        wide: true,
      },
      {
        name: "body",
        label: "More detail",
        type: "textarea",
        max: 6000,
        wide: true,
      },
      {
        name: "source_url",
        label: "Source link",
        type: "url",
        https: true,
        required: true,
        hint: "Verified information only: every exhibit names where its facts come from.",
      },
      { name: "source_label", label: "Source name", type: "text", max: 200 },
      {
        name: "link_url",
        label: "Further reading link",
        type: "url",
        https: true,
      },
      {
        name: "link_label",
        label: "Further reading label",
        type: "text",
        max: 120,
      },
      { name: "image_path", label: "Photograph", type: "image" },
      {
        name: "image_alt",
        label: "Photograph description (alt text)",
        type: "text",
        max: 300,
      },
      {
        name: "image_rights_confirmed",
        label:
          "We have the right to publish this photograph, and anyone shown agreed",
        type: "checkbox",
        wide: true,
      },
      sort,
      status(),
    ],
  },
  albums: {
    key: "albums",
    table: "gallery_albums",
    label: "Albums",
    singular: "album",
    description: "Photo albums in the Sanctuary gallery.",
    roles: STAFF,
    title: "title",
    search: ["title", "description"],
    order: [
      { column: "sort_order", ascending: true },
      { column: "created_at", ascending: false },
    ],
    publicPath: (r) => (published(r) ? `/gallery/${r.slug}` : null),
    columns: [
      { name: "title", label: "Title" },
      { name: "created_at", label: "Created", kind: "date" },
      { name: "status", label: "Status", kind: "status" },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true, max: 160 },
      {
        name: "slug",
        label: "Web address",
        type: "slug",
        hint: "Left empty, it is made from the title.",
      },
      {
        name: "event_id",
        label: "Event",
        type: "ref",
        ref: "events",
        hint: "Optional: the event these photographs are from.",
      },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        max: 2000,
        wide: true,
      },
      sort,
      status(
        "Photographs inside appear only once their consent is confirmed in the media library.",
      ),
    ],
  },
};

export const ENTITY_KEYS = Object.keys(ENTITIES) as EntityKey[];

export const isEntityKey = (k: string): k is EntityKey =>
  (ENTITY_KEYS as string[]).includes(k);

/** The serialisable part of a definition, for client components. */
export function fieldsOf(key: EntityKey): FieldDef[] {
  return ENTITIES[key].fields;
}

/* ------------------------------------------------------------------------ */
/* Dates: the chapter works in India Standard Time (UTC+05:30, no DST).     */
/* ------------------------------------------------------------------------ */

const IST_MS = 330 * 60 * 1000;

/** ISO timestamp → value for <input type="datetime-local">, in IST. */
export function toLocalInput(iso: unknown): string {
  if (typeof iso !== "string" || !iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() + IST_MS).toISOString().slice(0, 16);
}

/** <input type="datetime-local"> value, read as IST → ISO timestamp. */
export function fromLocalInput(v: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const d = new Date(`${v}:00+05:30`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** The current value of a field on a row, as the form shows it. */
export function formValue(
  field: FieldDef,
  row: Record<string, unknown> | null,
): string {
  if (!row) return typeof field.initial === "string" ? field.initial : "";
  const v = row[field.name];
  if (v === null || v === undefined) return "";
  if (field.type === "datetime") return toLocalInput(v);
  if (field.type === "date") return String(v).slice(0, 10);
  if (field.type === "tags") return Array.isArray(v) ? v.join(", ") : "";
  return String(v);
}

export function formChecked(
  field: FieldDef,
  row: Record<string, unknown> | null,
): boolean {
  if (!row) return field.initial === true;
  return row[field.name] === true;
}
