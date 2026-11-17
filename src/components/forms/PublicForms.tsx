"use client";

import { useActionState } from "react";
import { applyForMembership, sendContact } from "@/app/actions/forms";
import type { FormState } from "@/lib/validate";
import { AreaField, BotTrap, CheckField, FormMessage, SelectField, Submit, TextField } from "./FormKit";

export const YEARS = [
  { value: "", label: "Select your year" },
  { value: "First year", label: "First year" },
  { value: "Second year", label: "Second year" },
  { value: "Third year", label: "Third year" },
  { value: "Fourth year", label: "Fourth year" },
  { value: "Postgraduate", label: "Postgraduate" },
  { value: "Research scholar", label: "Research scholar" },
  { value: "Other", label: "Other" },
];

export function ContactForm({ name = "", email = "" }: { name?: string; email?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(sendContact, {});
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} noValidate className="relative grid gap-5">
      <BotTrap />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="name" label="Name" state={state} defaultValue={name} required autoComplete="name" maxLength={120} />
        <TextField name="email" label="E-mail" type="email" state={state} defaultValue={email} required autoComplete="email" maxLength={254} />
      </div>
      <TextField name="subject" label="Subject" state={state} maxLength={200} />
      <AreaField name="message" label="Message" state={state} required minLength={10} maxLength={4000} hint="Between 10 and 4,000 characters." />
      <FormMessage state={state} />
      <div>
        <Submit pending={pending}>Send message</Submit>
      </div>
    </form>
  );
}

export function MembershipForm({ name = "", email = "", department = "", year = "" }: { name?: string; email?: string; department?: string; year?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(applyForMembership, {});
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} noValidate className="relative grid gap-5">
      <BotTrap />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="full_name" label="Full name" state={state} defaultValue={name} required autoComplete="name" maxLength={120} />
        <TextField name="email" label="E-mail" type="email" state={state} defaultValue={email} required autoComplete="email" maxLength={254} />
        <TextField name="department" label="Department" state={state} defaultValue={department} required maxLength={120} placeholder="e.g. Computer Technology" />
        <SelectField name="year_of_study" label="Year of study" state={state} defaultValue={year} required options={YEARS} />
      </div>
      <AreaField name="motivation" label="Why do you want to join?" state={state} maxLength={2000} hint="Optional — what you would like to learn, build or organise." />
      <CheckField name="agree" state={state} label="The chapter may contact me by e-mail about this application." />
      <FormMessage state={state} />
      <div>
        <Submit pending={pending}>Send application</Submit>
      </div>
    </form>
  );
}
