/**
 * Small server-side form validation helpers. Everything a visitor submits is
 * read through these, trimmed and length-limited; the database repeats the
 * limits as check constraints.
 */

export type Errors = Record<string, string>;

export type FormState = { ok?: boolean; message?: string; errors?: Errors; values?: Record<string, string> };

export class Form {
  errors: Errors = {};
  values: Record<string, string> = {};
  constructor(private data: FormData) {}

  private raw(name: string) {
    const v = this.data.get(name);
    return typeof v === "string" ? v.replace(/\u0000/g, "").trim() : "";
  }

  text(name: string, opts: { label: string; max: number; required?: boolean; min?: number }) {
    const v = this.raw(name);
    this.values[name] = v;
    if (!v && opts.required) this.errors[name] = `${opts.label} is required.`;
    else if (v && opts.min && v.length < opts.min) this.errors[name] = `${opts.label} must be at least ${opts.min} characters.`;
    else if (v.length > opts.max) this.errors[name] = `${opts.label} must be ${opts.max} characters or fewer.`;
    return v;
  }

  email(name: string, label = "Email") {
    const v = this.text(name, { label, max: 254, required: true }).toLowerCase();
    if (v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) this.errors[name] = "Enter a valid email address.";
    return v;
  }

  url(name: string, label: string, required = false): string | null {
    const v = this.text(name, { label, max: 500, required });
    if (!v) return null;
    try {
      const u = new URL(v);
      if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
      return u.toString();
    } catch {
      this.errors[name] = `${label} must be a full http(s) link.`;
      return null;
    }
  }

  checked(name: string) {
    return this.data.get(name) === "on" || this.data.get(name) === "true";
  }

  /** A filled honeypot means an automated submission. */
  isBot(name = "website") {
    return this.raw(name) !== "";
  }

  get valid() {
    return Object.keys(this.errors).length === 0;
  }

  fail(message = "Please correct the highlighted fields."): FormState {
    return { ok: false, message, errors: this.errors, values: this.values };
  }
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

/** Only same-site relative paths are accepted as post-login destinations. */
export function safeNext(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\") || next.includes("://")) return fallback;
  return next;
}

export function formatDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return "Date to be announced";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Date to be announced";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", ...(withTime ? { timeStyle: "short" } : {}), timeZone: "Asia/Kolkata" }).format(d);
}
