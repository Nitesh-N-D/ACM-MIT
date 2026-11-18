import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createBareClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";

/**
 * Supabase client acting as the signed-in visitor (or anonymous). Every
 * query it makes is subject to Row Level Security. Null without a backend.
 */
export async function createClient() {
  const env = supabaseEnv();
  if (!env) return null;
  const store = await cookies();
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Server Components cannot set cookies; the proxy refreshes sessions.
        }
      },
    },
  });
}

export type Db = NonNullable<Awaited<ReturnType<typeof createClient>>>;

/**
 * Anonymous client with no cookies, for public pages. Reading published
 * content never depends on who is looking, so those pages stay cacheable and
 * are refreshed by revalidation when the command centre changes something.
 */
export function createPublicClient() {
  const env = supabaseEnv();
  if (!env) return null;
  return createBareClient(env.url, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
