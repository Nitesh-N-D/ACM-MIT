"use client";

import { AdminError } from "@/components/admin/AdminError";

/** Failures before the console shell renders (for example, checking the session). */
export default function AdminRootError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4 py-16">
      <AdminError {...props} />
    </main>
  );
}
