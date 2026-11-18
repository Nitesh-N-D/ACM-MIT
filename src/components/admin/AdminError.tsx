"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Error state of the command centre. Shows only a reference code, never the
 * error itself, and offers a retry (most failures are a database hiccup).
 */
export function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto max-w-xl border border-danger/40 bg-panel/60 p-6 sm:p-8">
      <p className="font-mono text-[10px] tracking-[0.24em] text-danger uppercase">Command centre · fault</p>
      <h1 className="mt-3 font-display text-xl text-ice">This section could not be loaded</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        The database may be briefly unavailable, or your session may have ended. Try again, or sign in once more if it keeps happening. Nothing you had already saved is lost.
      </p>
      {error.digest && <p className="mt-3 font-mono text-xs text-dim">Reference: {error.digest}</p>}
      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <button type="button" onClick={reset} className="bg-cyan px-4 py-2 font-medium text-void hover:bg-ice">
          Try again
        </button>
        <Link href="/admin" className="border border-line px-4 py-2 text-silver hover:border-cyan hover:text-cyan">
          Command centre home
        </Link>
        <Link href="/admin/sign-in" className="px-4 py-2 text-silver hover:text-cyan">
          Sign in
        </Link>
      </div>
    </div>
  );
}
