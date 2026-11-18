export type Status = "draft" | "published" | "archived";

export type EventRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  venue: string;
  starts_at: string | null;
  ends_at: string | null;
  registration_deadline: string | null;
  registration_open: boolean;
  capacity: number | null;
  banner_path: string | null;
  poster_path: string | null;
  status: Status;
  featured: boolean;
};

export type ProjectRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  team: string;
  tags: string[];
  repo_url: string | null;
  demo_url: string | null;
  image_path: string | null;
  status: Status;
  featured: boolean;
};

export type AnnouncementRow = { id: string; slug: string; title: string; body: string; pinned: boolean; status: Status; published_at: string | null; created_at: string };

export type LearningRow = { id: string; title: string; summary: string; kind: "workshop" | "path" | "resource"; realm: "general" | "intelligence" | "technology"; level: string; url: string | null; status: Status };

export type TeamRow = {
  id: string;
  name: string;
  position: string;
  group_kind: "committee" | "core" | "volunteer" | "alumni" | "faculty" | "member";
  tenure: string;
  bio: string;
  image_path: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  website_url: string | null;
  /** The working team this person belongs to, if any (Event Management…). */
  team_id: string | null;
  active: boolean;
  visible: boolean;
  consent_confirmed: boolean;
};

/** A working team created in the command centre (Event Management, Marketing…). */
export type TeamUnitRow = { id: string; slug: string; name: string; description: string; sort_order: number; visible: boolean };

export type AchievementRow = { id: string; title: string; description: string; category: string; achieved_on: string | null; image_path: string | null; status: Status };

export type AlbumRow = { id: string; slug: string; title: string; description: string; event_id: string | null; status: Status };

export type MediaRow = {
  id: string;
  album_id: string | null;
  event_id: string | null;
  storage_path: string;
  kind: string;
  caption: string;
  description: string;
  alt: string;
  width: number | null;
  height: number | null;
  featured: boolean;
  consent_confirmed: boolean;
  created_at: string;
};

/**
 * Where a list came from. "offline" means no database is configured, so the
 * list is empty; "error" means the database could not be reached.
 */
export type Source = "live" | "offline" | "error";
export type Loaded<T> = { source: Source; items: T[] };

export type HomeSettings = { heading?: string; subheading?: string; tagline?: string; featuredNote?: string };
/** Per-district copy edited in the admin centre. `mission`/`vision` are used by the Central Core. */
export type DistrictCopy = { description?: string; notice?: string; intro?: string; mission?: string; vision?: string };
export type DistrictSettings = Partial<Record<string, DistrictCopy>>;
export type SiteSettings = { contactEmail?: string; membershipInfo?: string; membershipOpen?: boolean; address?: string };
export type ExperienceSettings = { introEnabled?: boolean; autoRotate?: boolean; maxQuality?: "high" | "balanced" | "low" };
export type SettingsMap = { home: HomeSettings; districts: DistrictSettings; site: SiteSettings; experience: ExperienceSettings };
