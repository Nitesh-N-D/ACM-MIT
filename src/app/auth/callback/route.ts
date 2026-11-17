import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/validate";

const TYPES: EmailOtpType[] = ["magiclink", "signup", "email", "recovery", "invite", "email_change"];

/**
 * Where sign-in links land. Handles both the PKCE `code` flow and the
 * `token_hash` flow, then sends the visitor on to a same-site destination.
 * Any failure goes back to the sign-in page with a plain explanation.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const fail = (reason: string) => NextResponse.redirect(new URL(`/sign-in?error=${reason}&next=${encodeURIComponent(next)}`, request.url));

  if (searchParams.get("error")) return fail("link");
  const db = await createClient();
  if (!db) return fail("offline");

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (code) {
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (error) return fail(/verifier/i.test(error.message) ? "device" : "link");
  } else if (tokenHash && type && TYPES.includes(type)) {
    const { error } = await db.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return fail("link");
  } else {
    return fail("link");
  }
  return NextResponse.redirect(new URL(next, request.url));
}
