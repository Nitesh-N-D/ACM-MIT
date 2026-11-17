"use client";

import { useActionState } from "react";
import { cancelRegistration, registerForEvent } from "@/app/actions/events";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/States";
import type { FormState } from "@/lib/validate";

export type MyRegistration = "registered" | "waitlisted" | "cancelled" | null;

/** Register / cancel for a signed-in member. Every rule is re-checked on the server. */
export function RegisterPanel({ eventId, slug, mine }: { eventId: string; slug: string; mine: MyRegistration }) {
  const [reg, register, registering] = useActionState<FormState, FormData>(registerForEvent, {});
  const [can, cancel, cancelling] = useActionState<FormState, FormData>(cancelRegistration, {});
  const last = can.message && (!reg.message || cancelling) ? can : reg;
  const active = mine === "registered" || mine === "waitlisted";

  return (
    <div className="space-y-4">
      {active ? (
        <form action={cancel}>
          <input type="hidden" name="event" value={eventId} />
          <input type="hidden" name="slug" value={slug} />
          <p className="mb-3 text-sm text-silver">{mine === "waitlisted" ? "You are on the waitlist for this event." : "You are registered for this event."}</p>
          <Button type="submit" variant="secondary" size="sm" disabled={cancelling}>
            {cancelling ? "Cancelling…" : "Cancel registration"}
          </Button>
        </form>
      ) : (
        <form action={register}>
          <input type="hidden" name="event" value={eventId} />
          <input type="hidden" name="slug" value={slug} />
          <Button type="submit" disabled={registering}>
            {registering ? "Registering…" : "Register now"}
          </Button>
        </form>
      )}
      {last.message && (
        <Notice tone={last.ok ? "success" : "danger"} className="max-w-md">
          {last.message}
        </Notice>
      )}
    </div>
  );
}
