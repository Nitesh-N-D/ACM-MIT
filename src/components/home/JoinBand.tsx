import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export function JoinBand() {
  return (
    <section aria-labelledby="join-heading" className="py-24">
      <Container>
        <div className="nexus-frame relative overflow-hidden px-6 py-14 sm:px-14">
          <div
            aria-hidden="true"
            className="absolute -top-32 -right-24 size-96 rounded-full bg-[radial-gradient(circle,rgb(63_228_255/0.18),transparent_65%)]"
          />
          <p className="eyebrow">Citizenship</p>
          <h2 id="join-heading" className="mt-4 max-w-2xl font-display text-3xl font-semibold sm:text-4xl">
            Become a citizen of NEXUS.
          </h2>
          <p className="mt-4 max-w-xl leading-relaxed text-muted">
            Join the ACM MIT community — attend events, build projects and help shape the chapter.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/membership" size="lg">
              How to join
            </Button>
            <Button href="/contact" variant="ghost" size="lg">
              Contact the team →
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
