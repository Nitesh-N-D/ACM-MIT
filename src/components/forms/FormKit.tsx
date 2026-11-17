"use client";

import { useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input, Select, Textarea, describedBy } from "@/components/ui/Field";
import { Notice } from "@/components/ui/States";
import type { FormState } from "@/lib/validate";

/**
 * Small building blocks for the site's forms. Every value is validated
 * again on the server; these only show the server's answer next to the
 * field it concerns and keep what the visitor typed.
 */

type Base = { name: string; label: string; state: FormState; hint?: ReactNode; required?: boolean; defaultValue?: string; className?: string };

const pick = (state: FormState, name: string, fallback?: string) => state.values?.[name] ?? fallback ?? "";

export function TextField({
  name,
  label,
  state,
  hint,
  required,
  defaultValue,
  className,
  ...rest
}: Base & Omit<ComponentPropsWithoutRef<"input">, "name" | "defaultValue">) {
  const id = `f-${name}`;
  const error = state.errors?.[name];
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} required={required} className={className}>
      <Input id={id} name={name} required={required} defaultValue={pick(state, name, defaultValue)} {...describedBy(id, error, Boolean(hint))} {...rest} />
    </Field>
  );
}

export function AreaField({
  name,
  label,
  state,
  hint,
  required,
  defaultValue,
  className,
  ...rest
}: Base & Omit<ComponentPropsWithoutRef<"textarea">, "name" | "defaultValue">) {
  const id = `f-${name}`;
  const error = state.errors?.[name];
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} required={required} className={className}>
      <Textarea id={id} name={name} required={required} defaultValue={pick(state, name, defaultValue)} {...describedBy(id, error, Boolean(hint))} {...rest} />
    </Field>
  );
}

export function SelectField({ name, label, state, hint, required, defaultValue, className, options }: Base & { options: { value: string; label: string }[] }) {
  const id = `f-${name}`;
  const error = state.errors?.[name];
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} required={required} className={className}>
      <Select id={id} name={name} required={required} defaultValue={pick(state, name, defaultValue)} {...describedBy(id, error, Boolean(hint))}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}

export function CheckField({ name, label, state, defaultChecked }: { name: string; label: ReactNode; state: FormState; defaultChecked?: boolean }) {
  const error = state.errors?.[name];
  return (
    <div>
      <Checkbox
        name={name}
        label={label}
        defaultChecked={defaultChecked}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `f-${name}-error` : undefined}
      />
      {error && (
        <p id={`f-${name}-error`} className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Anti-spam fields: a honeypot people never see, and the time the form was opened. */
export function BotTrap() {
  const [started] = useState(() => Date.now());
  return (
    <>
      <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
        <label>
          Leave this empty
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <input type="hidden" name="started" value={started} />
    </>
  );
}

/** The server's overall answer, announced to screen readers. */
export function FormMessage({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <Notice tone={state.ok ? "success" : "danger"} className="max-w-xl">
      {state.message}
    </Notice>
  );
}

export function Submit({ pending, children, busy = "Sending…" }: { pending: boolean; children: ReactNode; busy?: string }) {
  return (
    <Button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? busy : children}
    </Button>
  );
}
