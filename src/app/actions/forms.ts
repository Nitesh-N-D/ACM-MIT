"use server";

import { getViewer } from "@/lib/auth/session";
import { getSettings } from "@/lib/data/public";
import { createClient } from "@/lib/supabase/server";
import { Form, type FormState } from "@/lib/validate";

/** Too fast to be a person (a form filled in under two seconds). */
function tooFast(data: FormData) {
  const started = Number(data.get("started"));
  return !Number.isFinite(started) || Date.now() - started < 2000;
}

/** Quietly accepted, never stored: nothing tells an automated sender it was caught. */
const DISCARDED: FormState = { ok: true, message: "Thank you — your message has been received." };

const OFFLINE: FormState = {
  ok: false,
  message: "The chapter's database is not connected yet, so this form cannot be sent. Please e-mail the chapter instead.",
};

export async function sendContact(_prev: FormState, data: FormData): Promise<FormState> {
  const f = new Form(data);
  if (f.isBot()) return DISCARDED;
  const name = f.text("name", { label: "Name", max: 120, required: true });
  const email = f.email("email");
  const subject = f.text("subject", { label: "Subject", max: 200 });
  const message = f.text("message", { label: "Message", max: 4000, required: true, min: 10 });
  if (!f.valid) return f.fail();
  if (tooFast(data)) return DISCARDED;

  const db = await createClient();
  if (!db) return { ...OFFLINE, values: f.values };
  const { error } = await db.from("contact_submissions").insert({ name, email, subject, message });
  if (error) return { ok: false, message: "Your message could not be sent just now. Please try again in a moment.", values: f.values };
  return { ok: true, message: "Thank you — your message has reached the ACM MIT team. We reply by e-mail." };
}

export async function applyForMembership(_prev: FormState, data: FormData): Promise<FormState> {
  const f = new Form(data);
  if (f.isBot()) return DISCARDED;
  const full_name = f.text("full_name", { label: "Full name", max: 120, required: true });
  const email = f.email("email");
  const department = f.text("department", { label: "Department", max: 120, required: true });
  const year_of_study = f.text("year_of_study", { label: "Year of study", max: 40, required: true });
  const motivation = f.text("motivation", { label: "Why you want to join", max: 2000 });
  if (!f.checked("agree")) f.errors.agree = "Please confirm that the chapter may contact you about your application.";
  if (!f.valid) return f.fail();
  if (tooFast(data)) return DISCARDED;

  const settings = await getSettings();
  if (settings.site.membershipOpen === false) return { ok: false, message: "Membership applications are closed at the moment.", values: f.values };

  const session = await getViewer();
  const db = session?.db ?? (await createClient());
  if (!db) return { ...OFFLINE, values: f.values };
  const { error } = await db.from("membership_applications").insert({ full_name, email, department, year_of_study, motivation, user_id: session?.viewer.id ?? null });
  if (error) return { ok: false, message: "Your application could not be sent just now. Please try again in a moment.", values: f.values };
  return {
    ok: true,
    message: session
      ? "Application received. You can follow its status on your dashboard."
      : "Application received. The chapter will reply by e-mail after reviewing it.",
  };
}
