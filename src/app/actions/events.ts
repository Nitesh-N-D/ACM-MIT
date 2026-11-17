"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth/session";
import type { FormState } from "@/lib/validate";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Database errors are mapped to plain sentences; raw messages never reach the browser. */
function explain(message: string): string {
  if (message.includes("closed")) return "Registration for this event is closed.";
  if (message.includes("deadline")) return "The registration deadline has passed.";
  if (message.includes("not found")) return "This event is no longer available.";
  if (message.includes("sign in")) return "Please sign in to register.";
  return "Registration could not be completed. Please try again.";
}

function ids(data: FormData) {
  const event = String(data.get("event") ?? "");
  const slug = String(data.get("slug") ?? "");
  return UUID.test(event) && SLUG.test(slug) ? { event, slug } : null;
}

/**
 * Register the signed-in member. Capacity, deadline and the open flag are
 * checked atomically inside the `register_for_event` database function.
 */
export async function registerForEvent(_prev: FormState, data: FormData): Promise<FormState> {
  const target = ids(data);
  if (!target) return { ok: false, message: "This event could not be found." };
  const session = await getViewer();
  if (!session) return { ok: false, message: "Please sign in to register." };
  if (!session.viewer.emailVerified) return { ok: false, message: "Please verify your e-mail address before registering." };

  const { data: status, error } = await session.db.rpc("register_for_event", { p_event: target.event });
  if (error) return { ok: false, message: explain(error.message ?? "") };
  revalidatePath(`/events/${target.slug}`);
  revalidatePath("/dashboard");
  return {
    ok: true,
    message: status === "waitlisted" ? "The event is full — you are on the waitlist and will be told if a place opens." : "You are registered. See you there!",
  };
}

export async function cancelRegistration(_prev: FormState, data: FormData): Promise<FormState> {
  const target = ids(data);
  if (!target) return { ok: false, message: "This event could not be found." };
  const session = await getViewer();
  if (!session) return { ok: false, message: "Please sign in first." };
  const { error } = await session.db.rpc("cancel_registration", { p_event: target.event });
  if (error) return { ok: false, message: "The registration could not be cancelled. Please try again." };
  revalidatePath(`/events/${target.slug}`);
  revalidatePath("/dashboard");
  return { ok: true, message: "Your registration has been cancelled." };
}
