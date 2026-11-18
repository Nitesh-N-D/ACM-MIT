import "server-only";
import type { Db } from "@/lib/supabase/server";

export type SettingsKey = "home" | "districts" | "site" | "experience";
type Flat = Record<string, string>;

/** A stored value as a form expects it: text as-is, true as "on", anything else empty. */
function flat(value: unknown): Flat {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [
      k,
      typeof v === "string"
        ? v
        : typeof v === "number"
          ? String(v)
          : v === true
            ? "on"
            : "",
    ]),
  );
}

/**
 * The stored website settings, read fresh (never cached) for the editors.
 * Returns null when the database could not be read, so a form is never
 * shown with empty values that would overwrite the real ones.
 */
export async function loadSettings(
  db: Db,
): Promise<{
  home: Flat;
  site: Flat;
  experience: Flat;
  districts: Record<string, Flat>;
} | null> {
  const { data, error } = await db
    .from("website_settings")
    .select("key, value");
  if (error) return null;
  const by = new Map(
    (data ?? []).map((r) => [r.key as SettingsKey, r.value as unknown]),
  );
  const districts = by.get("districts");
  return {
    home: flat(by.get("home")),
    site: flat(by.get("site")),
    experience: flat(by.get("experience")),
    districts: Object.fromEntries(
      Object.entries(
        districts && typeof districts === "object"
          ? (districts as Record<string, unknown>)
          : {},
      ).map(([k, v]) => [k, flat(v)]),
    ),
  };
}
