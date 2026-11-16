import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Signal lost" };

export default function NotFound() {
  return (
    <>
      <div className="nexus-atmosphere" aria-hidden="true" />
      <main id="main" className="grid min-h-dvh place-items-center px-4 py-16">
        <div className="flex max-w-xl flex-col items-center text-center">
          <Logo />
          <p className="eyebrow mt-14">Error 404 · Coordinates unknown</p>
          <h1 className="mt-4 font-display text-title font-semibold">Signal lost</h1>
          <p className="mt-6 text-muted">
            This location does not exist in the NEXUS civilization. It may have moved, or it was never built.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button href="/">Return to NEXUS</Button>
            <Button href="/search" variant="secondary">
              Search
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
