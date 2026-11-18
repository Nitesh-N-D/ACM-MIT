"use client";

import Image from "next/image";
import { useActionState, useState, useTransition } from "react";
import { adminSignIn, removeTotp, requestSignIn, startTotp, submitProject, updateProfile, verifyTotp, type Enrolment } from "@/app/actions/account";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/States";
import type { FormState } from "@/lib/validate";
import { AreaField, BotTrap, CheckField, FormMessage, SelectField, Submit, TextField } from "./FormKit";
import { YEARS } from "./PublicForms";

const initial: FormState = {};

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(requestSignIn, initial);
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} noValidate className="space-y-5">
      <BotTrap />
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} />
      <TextField
        name="email"
        label="Email address"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        state={state}
        hint="We send a one-time link; there is no password to remember."
      />
      <Submit pending={pending} busy="Sending link…">
        Email me a sign-in link
      </Submit>
    </form>
  );
}

export function ProfileForm({ profile }: { profile: { full_name: string; department: string; year_of_study: string; bio: string } }) {
  const [state, action, pending] = useActionState(updateProfile, initial);
  return (
    <form action={action} noValidate className="space-y-5">
      <FormMessage state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="full_name" label="Full name" autoComplete="name" required maxLength={120} state={state} defaultValue={profile.full_name} />
        <TextField name="department" label="Department" maxLength={120} state={state} defaultValue={profile.department} />
      </div>
      <SelectField
        name="year_of_study"
        label="Year of study"
        state={state}
        defaultValue={profile.year_of_study}
        options={[{ value: "", label: "Not set" }, ...YEARS.slice(1)]}
      />
      <AreaField name="bio" label="About you" rows={4} maxLength={1000} state={state} defaultValue={profile.bio} hint="Optional. Up to 1000 characters." />
      <Submit pending={pending} busy="Saving…">
        Save profile
      </Submit>
    </form>
  );
}

export function ProjectForm() {
  const [state, action, pending] = useActionState(submitProject, initial);
  if (state.ok)
    return (
      <div className="space-y-5">
        <FormMessage state={state} />
        <Button href="/dashboard" variant="secondary">
          Back to the dashboard
        </Button>
      </div>
    );
  return (
    <form action={action} noValidate className="space-y-5">
      <FormMessage state={state} />
      <TextField name="title" label="Project title" required maxLength={160} state={state} />
      <TextField name="summary" label="One-line summary" required maxLength={400} state={state} hint="What it does, in a sentence." />
      <AreaField name="description" label="Description" rows={7} maxLength={12000} state={state} hint="The problem, how it works, what you used and what you learned." />
      <TextField name="team" label="Team" required maxLength={400} state={state} hint="Names of everyone who built it, comma-separated." />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="repo_url" label="Repository link" type="url" inputMode="url" placeholder="https://github.com/…" state={state} />
        <TextField name="demo_url" label="Demo link" type="url" inputMode="url" placeholder="https://…" state={state} />
      </div>
      <CheckField name="own_work" state={state} label="The team built this project and agrees to it being shown on NEXUS with credit." />
      <Submit pending={pending} busy="Submitting…">
        Submit for review
      </Submit>
    </form>
  );
}

function CodeForm({ factorId, next, label }: { factorId: string; next?: string; label: string }) {
  const [state, action, pending] = useActionState(verifyTotp, initial);
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} noValidate className="space-y-4">
      <input type="hidden" name="factor" value={factorId} />
      {next && <input type="hidden" name="next" value={next} />}
      <FormMessage state={state} />
      <TextField
        name="code"
        label="6-digit code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        state={state}
        className="max-w-xs"
      />
      <Submit pending={pending} busy="Checking…">
        {label}
      </Submit>
    </form>
  );
}

/** Set up an authenticator app: QR code, manual key, then a first code. */
export function TotpSetup({ next }: { next?: string }) {
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [pending, start] = useTransition();
  if (enrolment?.ok)
    return (
      <div className="space-y-6">
        <ol className="list-decimal space-y-2 pl-5 text-silver">
          <li>Open an authenticator app (for example Google Authenticator, Microsoft Authenticator or 1Password).</li>
          <li>Scan this code, or enter the key by hand.</li>
          <li>Type the 6-digit code the app shows.</li>
        </ol>
        <div className="flex flex-wrap items-start gap-6">
          <Image src={enrolment.qr} alt="QR code for your authenticator app" width={176} height={176} unoptimized className="bg-white p-2" />
          <div className="min-w-0">
            <p className="font-mono text-[0.62rem] tracking-[0.18em] text-mist uppercase">Setup key</p>
            <code className="mt-1 block font-mono text-sm break-all text-ice select-all">{enrolment.secret}</code>
          </div>
        </div>
        <CodeForm factorId={enrolment.factorId} next={next} label="Turn on two-factor" />
      </div>
    );
  return (
    <div className="space-y-4">
      {enrolment && !enrolment.ok && <Notice tone="danger">{enrolment.message}</Notice>}
      <Button type="button" disabled={pending} onClick={() => start(async () => setEnrolment(await startTotp()))}>
        {pending ? "Starting…" : "Set up an authenticator app"}
      </Button>
    </div>
  );
}

/** Asks for a current code to raise this session to the second factor. */
export function TotpChallenge({ factorId, next }: { factorId: string; next?: string }) {
  return <CodeForm factorId={factorId} next={next} label="Verify" />;
}

export function TotpRemove({ factorId }: { factorId: string }) {
  const [state, action, pending] = useActionState(removeTotp, initial);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="factor" value={factorId} />
      <FormMessage state={state} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "Removing…" : "Remove authenticator app"}
      </Button>
    </form>
  );
}

/** The command centre's own sign-in: email and password, administrators only. */
export function AdminSignInForm() {
  const [state, action, pending] = useActionState(adminSignIn, initial);
  return (
    <form action={action} noValidate className="space-y-5">
      <BotTrap />
      <FormMessage state={state} />
      <TextField name="email" label="Email address" type="email" autoComplete="username" inputMode="email" required state={state} />
      <TextField name="password" label="Password" type="password" autoComplete="current-password" required maxLength={128} state={state} defaultValue="" />
      <Submit pending={pending} busy="Signing in…">
        Open the command centre
      </Submit>
    </form>
  );
}
