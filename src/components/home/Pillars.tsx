import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

const pillars = [
  { word: "Discover", line: "Explore computing beyond the syllabus — from first principles to the frontier." },
  { word: "Connect", line: "Meet the people who share your curiosity, across years and disciplines." },
  { word: "Innovate", line: "Turn ideas into experiments, and experiments into something real." },
  { word: "Build", line: "Ship projects, run events and leave something behind for those who follow." },
];

/** The four laws of NEXUS — the tagline, expanded. */
export function Pillars() {
  return (
    <section aria-labelledby="pillars-heading" className="relative border-t border-line py-24">
      <Container>
        <SectionHeading
          id="pillars-heading"
          eyebrow="The four laws of NEXUS"
          title="Not just a chapter. A civilization."
          description="NEXUS is the world the ACM MIT community builds together. Every territory inside it follows the same four laws."
        />
        <ol className="mt-14 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p, i) => (
            <li key={p.word} className="relative bg-void p-8">
              <span className="font-mono text-xs tracking-[0.24em] text-dim">0{i + 1}</span>
              <p className="mt-8 font-display text-2xl font-semibold text-ice">{p.word}.</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">{p.line}</p>
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-8 h-px w-12 bg-linear-to-r from-cyan to-transparent"
              />
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
