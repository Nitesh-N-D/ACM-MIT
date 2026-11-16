"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surface in the console for debugging; never render raw error details.
    console.error(error);
  }, [error]);

  return (
    <Container className="grid min-h-[60dvh] place-items-center py-20">
      <div className="nexus-frame max-w-xl p-10 text-center">
        <p className="eyebrow text-danger!">Signal disrupted</p>
        <h1 className="mt-4 font-display text-2xl font-semibold sm:text-3xl">This territory failed to load</h1>
        <p className="mt-4 text-muted">
          Something went wrong while rendering this page. You can try again, or return to the NEXUS home.
        </p>
        {error.digest && <p className="mt-4 font-mono text-xs text-dim">Reference: {error.digest}</p>}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button href="/" variant="secondary">
            Return home
          </Button>
        </div>
      </div>
    </Container>
  );
}
