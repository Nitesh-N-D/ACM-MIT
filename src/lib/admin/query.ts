/** Reading list filters from the address bar, safely. */

export const PAGE_SIZE = 25;

type Params = Record<string, string | string[] | undefined>;

export const param = (sp: Params, key: string): string => {
  const v = sp[key];
  return (Array.isArray(v) ? v[0] : v)?.slice(0, 80) ?? "";
};

/** 1-based page number and the matching row range. */
export function pageOf(sp: Params) {
  const page = Math.min(
    Math.max(1, Number.parseInt(param(sp, "page"), 10) || 1),
    1000,
  );
  const from = (page - 1) * PAGE_SIZE;
  // One extra row tells us whether a next page exists.
  return { page, from, to: from + PAGE_SIZE };
}

/**
 * A search term safe to place inside a PostgREST `or=(...)` filter: the
 * characters that would change the filter's structure are removed.
 */
export function searchTerm(q: string): string {
  return q
    .replace(/[,()"'\%*:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

/** `a.ilike.%t%,b.ilike.%t%` for the given columns. */
export const ilikeAny = (columns: string[], term: string) =>
  columns.map((c) => `${c}.ilike.%${term}%`).join(",");

/** Keeps only the filters that are set, for building pager links. */
export const kept = (o: Record<string, string>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v));
