"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition, type ReactNode } from "react";
import {
  grantRole,
  reviewApplication,
  reviewSubmission,
  saveDistrict,
  saveSettings,
  setMessageStatus,
  updateMedia,
  updateRegistration,
} from "@/app/actions/admin";
import { AreaField, CheckField, FormMessage, SelectField, Submit, TextField } from "@/components/forms/FormKit";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Notice } from "@/components/ui/States";
import type { Option } from "@/lib/admin/entities";
import type { FormState } from "@/lib/validate";

const initial: FormState = {};

/**
 * A button that asks before doing something that cannot be undone, then
 * runs a server action and shows its answer.
 */
export function ConfirmAction({
  action,
  label,
  title,
  description,
  confirm = label,
  size = "sm",
  variant = "secondary",
}: {
  action: () => Promise<FormState>;
  label: string;
  title: string;
  description: ReactNode;
  confirm?: string;
  size?: "sm" | "md";
  variant?: "secondary" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<FormState | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const run = () =>
    start(async () => {
      const r = await action();
      setResult(r);
      if (r.ok) {
        setOpen(false);
        router.refresh();
      }
    });

  return (
    <>
      <Button size={size} variant={variant} onClick={() => (setResult(null), setOpen(true))} className="text-danger hover:text-danger">
        {label}
      </Button>
      {result?.ok && <span className="sr-only" role="status">{result.message}</span>}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description={description}
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={run} disabled={pending} className="border-danger bg-danger hover:border-danger hover:bg-danger/80">
              {pending ? "Working…" : confirm}
            </Button>
          </>
        }
      >
        {result && !result.ok && <Notice tone="danger">{result.message}</Notice>}
      </Dialog>
    </>
  );
}

/** A small action that needs no confirmation (mark read, archive). */
export function QuickAction({ action, label }: { action: () => Promise<FormState>; label: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <span className="inline-flex items-center gap-2">
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await action();
            if (r.ok) {
              setError("");
              router.refresh();
            } else setError(r.message ?? "That did not work.");
          })
        }
      >
        {pending ? "…" : label}
      </Button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </span>
  );
}

/* ---------------------------------------------------------------- media -- */

export function MediaEditForm({
  id,
  values,
  albums,
  events,
  kinds,
}: {
  id: string;
  values: Record<string, string>;
  albums: Option[];
  events: Option[];
  kinds: Option[];
}) {
  const [state, action, pending] = useActionState(updateMedia.bind(null, id), { values } as FormState);
  return (
    <form action={action} noValidate className="space-y-5">
      <FormMessage state={state} />
      <TextField name="caption" label="Caption" maxLength={300} state={state} defaultValue={values.caption} hint="Shown under the photograph." />
      <TextField
        name="alt"
        label="Description (alt text)"
        maxLength={300}
        state={state}
        defaultValue={values.alt}
        hint="What the photograph shows, for people using screen readers. Required to publish."
      />
      <AreaField name="description" label="Notes" rows={3} maxLength={2000} state={state} defaultValue={values.description} />
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField name="kind" label="Kind" state={state} defaultValue={values.kind} options={kinds} required />
        <TextField name="sort_order" label="Sort order" type="number" inputMode="numeric" state={state} defaultValue={values.sort_order} />
        <SelectField name="album_id" label="Album" state={state} defaultValue={values.album_id} options={[{ value: "", label: "No album" }, ...albums]} />
        <SelectField name="event_id" label="Event" state={state} defaultValue={values.event_id} options={[{ value: "", label: "No event" }, ...events]} />
      </div>
      <CheckField name="featured" label="Featured photograph (shown first)" state={state} defaultChecked={values.featured === "on"} />
      <div className="border border-warning/30 bg-warning/5 p-4">
        <CheckField
          name="consent_confirmed"
          label="Everyone recognisable in this photograph agreed to it being published, and the chapter may use it."
          state={state}
          defaultChecked={values.consent_confirmed === "on"}
        />
        <p className="mt-2 pl-7 text-xs text-dim">Until this is ticked the photograph never appears on the public site.</p>
      </div>
      <Submit pending={pending} busy="Saving…">
        Save details
      </Submit>
    </form>
  );
}

/* -------------------------------------------------------- registrations -- */

export function RegistrationForm({ id, status, attended }: { id: string; status: string; attended: boolean }) {
  const [state, action, pending] = useActionState(updateRegistration.bind(null, id), initial);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <label className="sr-only" htmlFor={`reg-${id}`}>
        Status
      </label>
      <select id={`reg-${id}`} name="status" defaultValue={status} className="h-9 border border-line-strong bg-abyss px-2 text-sm text-ice">
        <option value="registered">Registered</option>
        <option value="waitlisted">Waitlist</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <label className="flex items-center gap-2 text-sm text-silver">
        <input type="checkbox" name="attended" defaultChecked={attended} className="size-4 accent-cyan" />
        Attended
      </label>
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? "…" : "Save"}
      </Button>
      {state.message && (
        <span role={state.ok ? "status" : "alert"} className={state.ok ? "text-xs text-success" : "text-xs text-danger"}>
          {state.message}
        </span>
      )}
    </form>
  );
}

/* -------------------------------------------------------------- reviews -- */

export function SubmissionReview({ id }: { id: string }) {
  const [state, action, pending] = useActionState(reviewSubmission.bind(null, id), initial);
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <AreaField name="note" label="Note to the team" rows={2} maxLength={1000} state={state} hint="Required when declining. They see it on their dashboard." />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" name="decision" value="approved" size="sm" disabled={pending}>
          Approve as draft project
        </Button>
        <Button type="submit" name="decision" value="rejected" size="sm" variant="secondary" disabled={pending}>
          Decline
        </Button>
      </div>
    </form>
  );
}

export function ApplicationReview({ id, status, note }: { id: string; status: string; note: string }) {
  const [state, action, pending] = useActionState(reviewApplication.bind(null, id), initial);
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <AreaField name="note" label="Internal note" rows={2} maxLength={1000} state={state} defaultValue={note} />
      <div className="flex flex-wrap gap-3">
        {status !== "approved" && (
          <Button type="submit" name="decision" value="approved" size="sm" disabled={pending}>
            Approve
          </Button>
        )}
        {status !== "rejected" && (
          <Button type="submit" name="decision" value="rejected" size="sm" variant="secondary" disabled={pending}>
            Decline
          </Button>
        )}
        {status !== "pending" && (
          <Button type="submit" name="decision" value="pending" size="sm" variant="ghost" disabled={pending}>
            Back to pending
          </Button>
        )}
      </div>
    </form>
  );
}

export function MessageStatus({ id, status }: { id: string; status: string }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {status !== "read" && <QuickAction label="Mark read" action={setMessageStatus.bind(null, id, "read")} />}
      {status !== "archived" && <QuickAction label="Archive" action={setMessageStatus.bind(null, id, "archived")} />}
      {status !== "new" && <QuickAction label="Mark new" action={setMessageStatus.bind(null, id, "new")} />}
    </span>
  );
}

/* ---------------------------------------------------------------- roles -- */

export function GrantRoleForm({ roles }: { roles: Option[] }) {
  const [state, action, pending] = useActionState(grantRole, initial);
  return (
    <form action={action} noValidate className="space-y-5">
      <FormMessage state={state} />
      <div className="grid gap-5 sm:grid-cols-[1fr_14rem]">
        <TextField name="email" label="Account email" type="email" autoComplete="off" required state={state} hint="The person must have signed in once." />
        <SelectField name="role" label="Role" required state={state} options={roles} />
      </div>
      <Submit pending={pending} busy="Granting…">
        Grant role
      </Submit>
    </form>
  );
}

/* ------------------------------------------------------------- settings -- */

export function HomeSettingsForm({ values }: { values: Record<string, string> }) {
  const [state, action, pending] = useActionState(saveSettings.bind(null, "home"), { values } as FormState);
  return (
    <form action={action} noValidate className="space-y-5">
      <FormMessage state={state} />
      <div className="grid gap-5 md:grid-cols-2">
        <TextField name="heading" label="Heading" maxLength={80} state={state} defaultValue={values.heading} hint="Default: Welcome to NEXUS. The last word is highlighted." />
        <TextField name="subheading" label="Subheading" maxLength={120} state={state} defaultValue={values.subheading} hint="Default: A new civilization of innovation." />
        <TextField name="tagline" label="Tagline" maxLength={80} state={state} defaultValue={values.tagline} hint="Default: Discover. Connect. Innovate. Build." />
      </div>
      <AreaField
        name="featuredNote"
        label="Featured note"
        rows={3}
        maxLength={300}
        state={state}
        defaultValue={values.featuredNote}
        hint="Shown above featured events and projects on the home page. Mark records as featured in Events and Projects."
      />
      <Submit pending={pending} busy="Saving…">
        Save homepage
      </Submit>
    </form>
  );
}

export function SiteSettingsForm({ values }: { values: Record<string, string> }) {
  const [state, action, pending] = useActionState(saveSettings.bind(null, "site"), { values } as FormState);
  return (
    <form action={action} noValidate className="space-y-5">
      <FormMessage state={state} />
      <TextField name="contactEmail" label="Contact email" type="email" maxLength={254} state={state} defaultValue={values.contactEmail} hint="Shown on the contact and about pages." />
      <AreaField name="address" label="Address" rows={3} maxLength={300} state={state} defaultValue={values.address} />
      <AreaField name="membershipInfo" label="Membership information" rows={4} maxLength={600} state={state} defaultValue={values.membershipInfo} />
      <CheckField name="membershipOpen" label="Membership applications are open" state={state} defaultChecked={values.membershipOpen === "on"} />
      <Submit pending={pending} busy="Saving…">
        Save website settings
      </Submit>
    </form>
  );
}

export function ExperienceSettingsForm({ values }: { values: Record<string, string> }) {
  const [state, action, pending] = useActionState(saveSettings.bind(null, "experience"), { values } as FormState);
  return (
    <form action={action} noValidate className="space-y-5">
      <FormMessage state={state} />
      <CheckField name="introEnabled" label="Play the gateway intro for first-time visitors" state={state} defaultChecked={values.introEnabled === "on"} />
      <CheckField name="autoRotate" label="Slowly turn the city overview until the visitor takes control" state={state} defaultChecked={values.autoRotate === "on"} />
      <SelectField
        name="maxQuality"
        label="Highest 3D quality"
        state={state}
        defaultValue={values.maxQuality}
        hint="Caps the detail every visitor gets, whatever their device. Visitors can still choose lower."
        options={[
          { value: "high", label: "High (no cap)" },
          { value: "balanced", label: "Balanced" },
          { value: "low", label: "Low" },
        ]}
      />
      <Submit pending={pending} busy="Saving…">
        Save experience
      </Submit>
    </form>
  );
}

export function DistrictForm({ district, values, core }: { district: string; values: Record<string, string>; core: boolean }) {
  const [state, action, pending] = useActionState(saveDistrict.bind(null, district), { values } as FormState);
  return (
    <form action={action} noValidate className="space-y-5">
      <FormMessage state={state} />
      <AreaField name="description" label="Description" rows={2} maxLength={400} state={state} defaultValue={values.description} hint="Empty uses the built-in text." />
      <AreaField name="intro" label="Building introduction" rows={3} maxLength={600} state={state} defaultValue={values.intro} />
      <TextField name="notice" label="Notice" maxLength={300} state={state} defaultValue={values.notice} hint="A short highlighted message, for example a deadline." />
      {core && (
        <div className="grid gap-5 md:grid-cols-2">
          <AreaField name="mission" label="Mission" rows={3} maxLength={600} state={state} defaultValue={values.mission} />
          <AreaField name="vision" label="Vision" rows={3} maxLength={600} state={state} defaultValue={values.vision} />
        </div>
      )}
      <Submit pending={pending} busy="Saving…">
        Save district
      </Submit>
    </form>
  );
}
