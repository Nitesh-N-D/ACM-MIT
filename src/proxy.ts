import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { VIEW_COOKIE, worldFocus, worldUrl } from "@/config/world";
import { supabaseEnv } from "@/lib/supabase/env";

/** Crawlers and link previews get the plain pages (same content, no redirect). */
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|lighthouse/i;

/**
 * 3D-first routing: a page that lives in the world, opened directly (a
 * typed URL, a bookmark, a shared link), is sent into the world, where it
 * opens over its district. Only full document loads are routed; in-app
 * navigation is handled on the client. `?view=2d` or the 2D switch skips it.
 */
function routeView(request: NextRequest): NextResponse | null {
  if (request.method !== "GET" || request.headers.get("sec-fetch-dest") !== "document") return null;
  const { pathname, search, searchParams } = request.nextUrl;
  const mode = request.cookies.get(VIEW_COOKIE)?.value === "2d" || searchParams.get("view") === "2d" ? "2d" : "3d";
  const url = request.nextUrl.clone();
  if (mode === "2d") {
    if (pathname !== "/explore") return null;
    url.pathname = "/explore/map";
    url.search = "";
    return NextResponse.redirect(url, 307);
  }
  if (!worldFocus(pathname) || BOT.test(request.headers.get("user-agent") ?? "")) return null;
  return NextResponse.redirect(new URL(worldUrl(pathname + search), request.url), 307);
}

/**
 * Keeps the Supabase session cookie fresh. This is not the authorisation
 * layer: every protected page and action re-checks the visitor on the server.
 */
export async function proxy(request: NextRequest) {
  const routed = routeView(request);
  if (routed) return routed;

  const env = supabaseEnv();
  if (!env) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|models/|.*\\.(?:png|jpg|jpeg|svg|webp|avif|ico|glb|gltf)$).*)"],
};
