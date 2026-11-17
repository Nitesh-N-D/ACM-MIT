"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/session";
import { siteUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { Form, safeNext, type FormState } from "@/lib/validate";

const OFFLINE: FormState = { ok: false, message: "Accounts are not available yet: the chapter's database is not connected." };

/* ------------------------------------------------------------------------ */
/* Sign-in by e-mail link                                                    */
/* ------------------------------------------------------------------------ */

/**
 * Sends a one-time sign-in link. The same answer is given whether or not an
 * account already exists, so the form cannot be used to discover members.
 */
export async function requestSignIn(_prev: FormState, data: FormData): Promise<FormState> {
  const f = new Form(data);
  const email = f.email("email");
  const next = safeNext(String(data.get("next") ?? ""));
  if (f.isBot()) return { ok: true, message: `If ${email || "that address"} can receive mail, a sign-in link is on its way.` };
  if (!f.valid) return f.fail();

  const db = await createClient();
  if (!db) return { ...OFFLINE, values: f.values };
  const { error } = await db.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) {
    const limited = error.status === 429 || /rate|seconds/i.test(error.message);
    return {
      ok: false,
      values: f.values,
      message: limited
        ? "Too many links were requested. Please wait a minute and try again."
        : "The sign-in link could not be sent just now. Please try again in a moment.",
    };
  }
  return { ok: true, message: `A sign-in link has been sent to ${email}. Open it on this device to continue. It expires after one hour.` };
}

export async function signOut() {
  const db = await createClient();
  if (db) await db.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

/* ------------------------------------------------------------------------ */
/* Profile and submissions                                                   */
/* ------------------------------------------------------------------------ */

export async function updateProfile(_prev: FormState, data: FormData): Promise<FormState> {
  const f = new Form(data);
  const full_name = f.text("full_name", { label: "Full name", max: 120, required: true });
  const department = f.text("department", { label: "Department", max: 120 });
  const year_of_study = f.text("year_of_study", { label: "Year of study", max: 40 });
  const bio = f.text("bio", { label: "About you", max: 1000 });
  if (!f.valid) return f.fail();

  const session = await getViewer();
  if (!session) return { ok: false, message: "Your session has ended. Please sign in again.", values: f.values };
  const { error } = await session.db
    .from("profiles")
    .update({ full_name, department, year_of_study, bio, updated_at: new Date().toISOString() })
    .eq("id", session.viewer.id);
  if (error) return { ok: false, message: "Your profile could not be saved just now. Please try again.", values: f.values };
  revalidatePath("/dashboard");
  return { ok: true, message: "Profile saved.", values: f.values };
}

export async function submitProject(_prev: FormState, data: FormData): Promise<FormState> {
  const f = new Form(data);
  const title = f.text("title", { label: "Project title", max: 160, required: true, min: 3 });
  const summary = f.text("summary", { label: "One-line summary", max: 400, required: true, min: 10 });
  const description = f.text("description", { label: "Description", max: 12000 });
  const team = f.text("team", { label: "Team", max: 400, required: true });
  const repo_url = f.url("repo_url", "Repository link");
  const demo_url = f.url("demo_url", "Demo link");
  if (!f.checked("own_work")) f.errors.own_work = "Please confirm the team made this project and agrees to it being shown.";
  if (!f.valid) return f.fail();

  const session = await getViewer();
  if (!session) return { ok: false, message: "Your session has ended. Please sign in again.", values: f.values };
  if (!session.viewer.emailVerified) return { ok: false, message: "Please verify your e-mail address before submitting.", values: f.values };

  const { count } = await session.db.from("project_submissions").select("id", { count: "exact", head: true }).eq("user_id", session.viewer.id).eq("status", "pending");
  if ((count ?? 0) >= 3) return { ok: false, message: "You already have three submissions waiting for review. Please wait for those first.", values: f.values };

  const { error } = await session.db.from("project_submissions").insert({ user_id: session.viewer.id, title, summary, description, team, repo_url, demo_url });
  if (error) return { ok: false, message: "Your project could not be submitted just now. Please try again.", values: f.values };
  revalidatePath("/dashboard");
  return { ok: true, message: "Submitted. The chapter reviews every project; you will see the decision on your dashboard." };
}

/* ------------------------------------------------------------------------ */
/* Two-factor authentication (TOTP)                                          */
/* ------------------------------------------------------------------------ */

export type Enrolment = { ok: true; factorId: string; qr: string; secret: string } | { ok: false; message: string };

/** Starts setting up an authenticator app. Unfinished earlier attempts are discarded first. */
export async function startTotp(): Promise<Enrolment> {
  const session = await getViewer();
  if (!session) return { ok: false, message: "Please sign in again." };
  const { data: factors } = await session.db.auth.mfa.listFactors();
  for (const f of factors?.all ?? []) {
    if (f.factor_type === "totp" && f.status === "unverified") await session.db.auth.mfa.unenroll({ factorId: f.id });
  }
  if ((factors?.totp ?? []).length > 0) return { ok: false, message: "An authenticator app is already set up for this account." };

  const { data, error } = await session.db.auth.mfa.enroll({ factorType: "totp", friendlyName: `NEXUS ${new Date().toISOString().slice(0, 10)}` });
  if (error || !data || data.type !== "totp") return { ok: false, message: "Two-factor setup could not start. Please try again." };
  return { ok: true, factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

const CODE = /^\d{6}$/;
const FACTOR = /^[0-9a-f-]{36}$/i;

/** Confirms a code from the app: finishes setup, or steps an existing session up to the second factor. */
export async function verifyTotp(_prev: FormState, data: FormData): Promise<FormState> {
  const factorId = String(data.get("factor") ?? "");
  const code = String(data.get("code") ?? "").replace(/\s+/g, "");
  if (!FACTOR.test(factorId)) return { ok: false, message: "Please start again." };
  if (!CODE.test(code)) return { ok: false, errors: { code: "Enter the 6-digit code from your app." }, message: "Please correct the highlighted field." };

  const session = await getViewer();
  if (!session) return { ok: false, message: "Please sign in again." };
  const { error } = await session.db.auth.mfa.challengeAndVerify({ factorId, code });
  if (error)
    return { ok: false, errors: { code: "That code did not match. Codes change every 30 seconds — try the current one." }, message: "The code was not accepted." };

  revalidatePath("/dashboard/security");
  const next = String(data.get("next") ?? "");
  if (next) redirect(safeNext(next, "/dashboard"));
  return { ok: true, message: "Verified. Your account is now protected by your authenticator app." };
}

export async function removeTotp(_prev: FormState, data: FormData): Promise<FormState> {
  const factorId = String(data.get("factor") ?? "");
  if (!FACTOR.test(factorId)) return { ok: false, message: "Please reload the page and try again." };
  const session = await getViewer();
  if (!session) return { ok: false, message: "Please sign in again." };
  const { error } = await session.db.auth.mfa.unenroll({ factorId });
  if (error) return { ok: false, message: "Verify a current code first, then remove the app." };
  revalidatePath("/dashboard/security");
  return { ok: true, message: "The authenticator app was removed." };
}
