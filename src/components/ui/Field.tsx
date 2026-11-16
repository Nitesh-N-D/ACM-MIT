import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full border border-line-strong bg-abyss/80 px-3.5 py-2.5 text-sm text-ice placeholder:text-dim " +
  "transition-colors duration-200 hover:border-silver/40 focus:border-cyan focus:outline-none " +
  "focus-visible:outline-none focus:shadow-[0_0_0_3px_rgb(63_228_255/0.15)] " +
  "disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger";

export const controlClasses = control;

type FieldProps = {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
};

/** Label + control + hint/error wrapper. Wire `aria-describedby` via `fieldIds`. */
export function Field({ label, htmlFor, hint, error, required, children, className }: FieldProps) {
  const ids = fieldIds(htmlFor);
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={htmlFor} className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-silver">
        {label}
        {required && (
          <span className="ml-1 text-cyan" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={ids.hint} className="text-xs text-dim">
          {hint}
        </p>
      )}
      {error && (
        <p id={ids.error} className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function fieldIds(id: string) {
  return { hint: `${id}-hint`, error: `${id}-error` };
}

/** aria props for a control, given its id and current error. */
export function describedBy(id: string, error?: string, hasHint?: boolean) {
  const ids = fieldIds(id);
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? ids.error : hasHint ? ids.hint : undefined,
  } as const;
}

export function Input({ className, ...props }: ComponentPropsWithoutRef<"input">) {
  return <input {...props} className={cn(control, "h-11", className)} />;
}

export function Textarea({ className, ...props }: ComponentPropsWithoutRef<"textarea">) {
  return <textarea {...props} className={cn(control, "min-h-32 resize-y leading-relaxed", className)} />;
}

export function Select({ className, children, ...props }: ComponentPropsWithoutRef<"select">) {
  return (
    <select {...props} className={cn(control, "h-11 appearance-none bg-no-repeat pr-10", className)} style={selectArrow}>
      {children}
    </select>
  );
}

const selectArrow = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none' stroke='%238391b3' stroke-width='1.5'%3E%3Cpath d='m3 4.5 3 3 3-3'/%3E%3C/svg%3E\")",
  backgroundPosition: "right 0.9rem center",
} as const;

export function Checkbox({ label, className, ...props }: ComponentPropsWithoutRef<"input"> & { label: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 text-sm text-silver", className)}>
      <input type="checkbox" {...props} className="mt-0.5 size-4 shrink-0 accent-cyan" />
      <span>{label}</span>
    </label>
  );
}
