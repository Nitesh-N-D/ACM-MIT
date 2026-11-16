import { cn } from "@/lib/cn";

type NexusLoaderProps = {
  label?: string;
  className?: string;
};

/**
 * Lightweight CSS-only loader: a core inside two counter-rotating rings,
 * echoing the Nexus Artifact. No JS, no canvas.
 */
export function NexusLoader({ label = "Synchronising", className }: NexusLoaderProps) {
  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col items-center gap-5", className)}>
      <div className="relative size-16" aria-hidden="true">
        <span className="absolute inset-0 animate-orbit rounded-full border border-transparent border-t-cyan border-r-cyan/40" />
        <span className="absolute inset-2.5 animate-orbit-reverse rounded-full border border-transparent border-b-violet border-l-violet/40" />
        <span className="absolute inset-[42%] animate-pulse-core rotate-45 bg-cyan shadow-[0_0_18px_rgb(63_228_255/0.8)]" />
      </div>
      <p className="eyebrow text-muted!">{label}…</p>
    </div>
  );
}
