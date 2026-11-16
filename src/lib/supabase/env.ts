/** Public Supabase settings. Null until the chapter supplies a project. */
export function supabaseEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey || !/^https?:\/\//.test(url)) return null;
  return { url: url.replace(/\/$/, ""), anonKey };
}

export const isSupabaseConfigured = () => supabaseEnv() !== null;

export const MEDIA_BUCKET = "media";

/** Public URL of a stored image, or null when there is no backend. */
export function mediaUrl(path: string | null | undefined): string | null {
  const env = supabaseEnv();
  if (!env || !path) return null;
  return `${env.url}/storage/v1/object/public/${MEDIA_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000").replace(/\/$/, "");
}
